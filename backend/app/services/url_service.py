"""
Download files from URLs — supports Google Drive, SharePoint, and direct links.
"""
import re
import httpx
from urllib.parse import urlparse, parse_qs, urlencode


# Max download size: 500 MB
MAX_DOWNLOAD_BYTES = 500 * 1024 * 1024

SUPPORTED_EXTENSIONS = {".docx", ".pptx", ".xlsx", ".pdf"}


def _resolve_google_drive_url(url: str) -> str | None:
    """
    Convert various Google Drive share URLs to direct-download URLs.
    Handles:
      - https://drive.google.com/file/d/FILE_ID/view?...
      - https://drive.google.com/open?id=FILE_ID
      - https://docs.google.com/spreadsheets/d/FILE_ID/edit?...
      - https://docs.google.com/document/d/FILE_ID/edit?...
      - https://docs.google.com/presentation/d/FILE_ID/edit?...
    """
    parsed = urlparse(url)
    host = parsed.hostname or ""

    # Google Docs/Sheets/Slides export
    if host == "docs.google.com":
        m = re.search(r"/(spreadsheets|document|presentation)/d/([a-zA-Z0-9_-]+)", url)
        if m:
            doc_type, file_id = m.group(1), m.group(2)
            export_map = {
                "spreadsheets": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "document": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "presentation": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            }
            mime = export_map.get(doc_type)
            if mime:
                return f"https://docs.google.com/{doc_type}/d/{file_id}/export?format={'xlsx' if doc_type == 'spreadsheets' else 'docx' if doc_type == 'document' else 'pptx'}"
        return None

    # Google Drive file links
    if host == "drive.google.com":
        # /file/d/FILE_ID/view
        m = re.search(r"/file/d/([a-zA-Z0-9_-]+)", url)
        if m:
            file_id = m.group(1)
            return f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t"

        # /open?id=FILE_ID
        qs = parse_qs(parsed.query)
        if "id" in qs:
            file_id = qs["id"][0]
            return f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t"

    return None


def _resolve_sharepoint_url(url: str) -> str | None:
    """
    Convert SharePoint / OneDrive share links to direct download.
    Handles:
      - https://*.sharepoint.com/:x:/...  (shared links)
      - https://onedrive.live.com/...
    """
    parsed = urlparse(url)
    host = parsed.hostname or ""

    if "sharepoint.com" in host:
        # SharePoint shared links — append download=1
        if "download=1" not in url:
            separator = "&" if "?" in url else "?"
            return f"{url}{separator}download=1"
        return url

    if "onedrive.live.com" in host or "1drv.ms" in host:
        # OneDrive personal links
        if "download=1" not in url:
            separator = "&" if "?" in url else "?"
            return f"{url}{separator}download=1"
        return url

    return None


def resolve_download_url(url: str) -> tuple[str, str]:
    """
    Given a user URL, resolve to a direct download URL.
    Returns (download_url, source_type).
    """
    parsed = urlparse(url)
    host = parsed.hostname or ""

    # Google Drive / Docs
    if "google.com" in host:
        resolved = _resolve_google_drive_url(url)
        if resolved:
            return resolved, "google_drive"

    # SharePoint / OneDrive
    if "sharepoint.com" in host or "onedrive.live.com" in host or "1drv.ms" in host:
        resolved = _resolve_sharepoint_url(url)
        if resolved:
            return resolved, "sharepoint"

    # Direct URL — assume it points to a downloadable file
    return url, "direct"


def _guess_filename_from_url(url: str, content_disposition: str | None = None) -> str:
    """Try to extract a filename from Content-Disposition header or URL path."""
    if content_disposition:
        m = re.search(r'filename[*]?=["\']?([^"\';\n]+)', content_disposition)
        if m:
            return m.group(1).strip()

    # Fall back to URL path
    parsed = urlparse(url)
    path = parsed.path.rstrip("/")
    if path:
        name = path.split("/")[-1]
        if "." in name:
            return name

    return "downloaded_file"


def _guess_extension_from_content_type(content_type: str | None) -> str:
    """Map content-type to file extension."""
    if not content_type:
        return ""
    ct = content_type.lower().split(";")[0].strip()
    mapping = {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
        "application/pdf": ".pdf",
        "application/vnd.ms-excel": ".xlsx",
        "application/msword": ".docx",
        "application/vnd.ms-powerpoint": ".pptx",
    }
    return mapping.get(ct, "")


async def download_file(url: str) -> tuple[bytes, str]:
    """
    Download a file from URL.
    Returns (file_bytes, filename).
    Raises ValueError on errors.
    """
    download_url, source_type = resolve_download_url(url)

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(connect=30, read=300, write=30, pool=30),
    ) as client:
        # Stream the download to handle large files
        async with client.stream("GET", download_url) as response:
            if response.status_code != 200:
                raise ValueError(
                    f"Failed to download file (HTTP {response.status_code}). "
                    f"Make sure the file is shared publicly or with 'Anyone with the link'."
                )

            # Check content length if available
            content_length = response.headers.get("content-length")
            if content_length and int(content_length) > MAX_DOWNLOAD_BYTES:
                raise ValueError(
                    f"File is too large ({int(content_length) / 1024 / 1024:.0f} MB). "
                    f"Maximum size is {MAX_DOWNLOAD_BYTES / 1024 / 1024:.0f} MB."
                )

            # Read in chunks
            chunks = []
            total = 0
            async for chunk in response.aiter_bytes(chunk_size=1024 * 1024):
                total += len(chunk)
                if total > MAX_DOWNLOAD_BYTES:
                    raise ValueError(
                        f"File exceeds maximum size of {MAX_DOWNLOAD_BYTES / 1024 / 1024:.0f} MB."
                    )
                chunks.append(chunk)

            file_bytes = b"".join(chunks)

            # Determine filename
            content_disposition = response.headers.get("content-disposition")
            content_type = response.headers.get("content-type")
            filename = _guess_filename_from_url(download_url, content_disposition)

            # If filename has no recognized extension, try content-type
            _, ext = (filename.rsplit(".", 1) if "." in filename else (filename, ""))
            if f".{ext}" not in SUPPORTED_EXTENSIONS:
                guessed_ext = _guess_extension_from_content_type(content_type)
                if guessed_ext:
                    filename = filename.split(".")[0] + guessed_ext
                elif source_type == "google_drive":
                    # Google Drive export — infer from URL
                    if "spreadsheets" in url:
                        filename = "spreadsheet.xlsx"
                    elif "document" in url:
                        filename = "document.docx"
                    elif "presentation" in url:
                        filename = "presentation.pptx"

    return file_bytes, filename

"""
Download files from URLs — supports Google Drive, SharePoint, and direct links.
"""
import re
import httpx
from urllib.parse import urlparse, parse_qs


# Max download size: 500 MB
MAX_DOWNLOAD_BYTES = 500 * 1024 * 1024

SUPPORTED_EXTENSIONS = {".docx", ".pptx", ".xlsx", ".pdf"}


def _extract_google_file_id(url: str) -> str | None:
    """Extract file ID from various Google Drive/Docs URLs."""
    parsed = urlparse(url)
    host = parsed.hostname or ""

    if host in ("drive.google.com", "docs.google.com"):
        # /file/d/FILE_ID/ or /d/FILE_ID/
        m = re.search(r"/d/([a-zA-Z0-9_-]+)", url)
        if m:
            return m.group(1)

        # ?id=FILE_ID
        qs = parse_qs(parsed.query)
        if "id" in qs:
            return qs["id"][0]

    return None


def _is_google_docs_export(url: str) -> tuple[str | None, str | None]:
    """Check if URL is a Google Docs/Sheets/Slides that needs export."""
    m = re.search(r"docs\.google\.com/(spreadsheets|document|presentation)/d/([a-zA-Z0-9_-]+)", url)
    if m:
        doc_type = m.group(1)
        file_id = m.group(2)
        format_map = {
            "spreadsheets": "xlsx",
            "document": "docx",
            "presentation": "pptx",
        }
        fmt = format_map.get(doc_type)
        if fmt:
            export_url = f"https://docs.google.com/{doc_type}/d/{file_id}/export?format={fmt}"
            return export_url, f"export.{fmt}"
    return None, None


def _resolve_sharepoint_url(url: str) -> str | None:
    """Convert SharePoint / OneDrive share links to direct download."""
    parsed = urlparse(url)
    host = parsed.hostname or ""

    if "sharepoint.com" in host or "onedrive.live.com" in host or "1drv.ms" in host:
        if "download=1" not in url:
            separator = "&" if "?" in url else "?"
            return f"{url}{separator}download=1"
        return url

    return None


def _guess_filename_from_url(url: str, content_disposition: str | None = None) -> str:
    """Try to extract a filename from Content-Disposition header or URL path."""
    if content_disposition:
        m = re.search(r'filename[*]?=["\']?([^"\';\n]+)', content_disposition)
        if m:
            return m.group(1).strip()

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


async def _download_google_drive_file(file_id: str, client: httpx.AsyncClient) -> tuple[bytes, str]:
    """
    Download a file from Google Drive, handling the virus-scan confirmation
    page that Google shows for large files.
    Uses the newer drive.usercontent.google.com endpoint.
    """
    # Try the newer usercontent endpoint first (works better for large files)
    urls_to_try = [
        f"https://drive.usercontent.google.com/download?id={file_id}&export=download&authuser=0&confirm=t",
        f"https://drive.google.com/uc?export=download&id={file_id}&confirm=t",
    ]

    last_error = None
    for download_url in urls_to_try:
        try:
            async with client.stream("GET", download_url) as response:
                # If we got HTML back, it's the virus-scan confirmation page
                content_type = response.headers.get("content-type", "")

                if response.status_code == 200 and "text/html" in content_type:
                    # Read the HTML to find the confirmation URL
                    html_bytes = await response.aread()
                    html = html_bytes.decode("utf-8", errors="ignore")

                    # Look for the download confirmation form action
                    confirm_match = re.search(
                        r'href="(/uc\?export=download[^"]+)"', html
                    )
                    if confirm_match:
                        confirm_url = "https://drive.google.com" + confirm_match.group(1).replace("&amp;", "&")
                        async with client.stream("GET", confirm_url) as confirm_response:
                            if confirm_response.status_code == 200:
                                return await _stream_response(confirm_response, download_url)
                            last_error = f"Confirmation download failed (HTTP {confirm_response.status_code})"
                            continue

                    # Also try looking for download form with id=download-form
                    form_match = re.search(r'action="([^"]+)"', html)
                    if form_match:
                        form_url = form_match.group(1).replace("&amp;", "&")
                        if not form_url.startswith("http"):
                            form_url = "https://drive.usercontent.google.com" + form_url
                        async with client.stream("GET", form_url) as form_response:
                            if form_response.status_code == 200:
                                return await _stream_response(form_response, download_url)

                    last_error = "Got HTML confirmation page but couldn't extract download URL"
                    continue

                if response.status_code != 200:
                    last_error = f"HTTP {response.status_code}"
                    continue

                return await _stream_response(response, download_url)

        except httpx.TimeoutException:
            last_error = "Download timed out"
            continue

    raise ValueError(
        f"Failed to download from Google Drive ({last_error}). "
        "Make sure the file is shared with 'Anyone with the link'. "
        "If the file is very large, try downloading it locally and uploading directly."
    )


async def _stream_response(response: httpx.Response, url: str) -> tuple[bytes, str]:
    """Stream and collect response bytes, determine filename."""
    content_length = response.headers.get("content-length")
    if content_length and int(content_length) > MAX_DOWNLOAD_BYTES:
        raise ValueError(
            f"File is too large ({int(content_length) / 1024 / 1024:.0f} MB). "
            f"Maximum size is {MAX_DOWNLOAD_BYTES / 1024 / 1024:.0f} MB."
        )

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

    content_disposition = response.headers.get("content-disposition")
    content_type = response.headers.get("content-type")
    filename = _guess_filename_from_url(url, content_disposition)

    # Fix extension if needed
    if "." in filename:
        _, ext = filename.rsplit(".", 1)
    else:
        ext = ""
    if f".{ext}" not in SUPPORTED_EXTENSIONS:
        guessed_ext = _guess_extension_from_content_type(content_type)
        if guessed_ext:
            filename = filename.split(".")[0] + guessed_ext

    return file_bytes, filename


async def download_file(url: str) -> tuple[bytes, str]:
    """
    Download a file from URL.
    Returns (file_bytes, filename).
    Raises ValueError on errors.
    """
    parsed = urlparse(url)
    host = parsed.hostname or ""

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(connect=30, read=300, write=30, pool=30),
    ) as client:

        # --- Google Docs/Sheets/Slides export ---
        export_url, export_name = _is_google_docs_export(url)
        if export_url:
            async with client.stream("GET", export_url) as response:
                if response.status_code != 200:
                    raise ValueError(
                        f"Failed to export Google Doc (HTTP {response.status_code}). "
                        "Make sure the document is shared with 'Anyone with the link'."
                    )
                file_bytes, filename = await _stream_response(response, export_url)
                if filename == "downloaded_file" and export_name:
                    filename = export_name
                return file_bytes, filename

        # --- Google Drive file download (handles large files) ---
        file_id = _extract_google_file_id(url)
        if file_id:
            file_bytes, filename = await _download_google_drive_file(file_id, client)
            # If no good extension, infer from original URL
            if "." not in filename or filename.endswith(".downloaded_file"):
                if "spreadsheet" in url.lower() or url.endswith(".xlsx"):
                    filename = "spreadsheet.xlsx"
            return file_bytes, filename

        # --- SharePoint / OneDrive ---
        if "sharepoint.com" in host or "onedrive.live.com" in host or "1drv.ms" in host:
            resolved = _resolve_sharepoint_url(url)
            download_url = resolved or url
        else:
            # --- Direct URL ---
            download_url = url

        async with client.stream("GET", download_url) as response:
            if response.status_code != 200:
                raise ValueError(
                    f"Failed to download file (HTTP {response.status_code}). "
                    f"Make sure the file is accessible."
                )
            return await _stream_response(response, download_url)

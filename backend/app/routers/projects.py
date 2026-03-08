import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from app.database import get_session, Workspace, ProjectModel, hash_passphrase

router = APIRouter()

MAX_PROJECTS = 20


# --- Request / Response models ---

class EnterWorkspaceRequest(BaseModel):
    passphrase: str


class ProjectResponse(BaseModel):
    id: str
    name: str
    createdAt: float  # JS-compatible timestamp (ms)
    result: Optional[dict] = None
    error: str = ""


class WorkspaceResponse(BaseModel):
    workspace_id: str
    projects: list[ProjectResponse]


class CreateProjectRequest(BaseModel):
    workspace_id: str
    name: str


class UpdateProjectRequest(BaseModel):
    workspace_id: str
    name: Optional[str] = None
    result: Optional[dict] = None
    error: Optional[str] = None


# --- Helpers ---

def project_to_response(p: ProjectModel) -> ProjectResponse:
    return ProjectResponse(
        id=p.id,
        name=p.name,
        createdAt=p.created_at.timestamp() * 1000,
        result=p.result_data,
        error=p.error or "",
    )


# --- Endpoints ---

@router.post("/api/auth/enter", response_model=WorkspaceResponse)
async def enter_workspace(req: EnterWorkspaceRequest, session: AsyncSession = Depends(get_session)):
    if not req.passphrase.strip():
        raise HTTPException(400, "Passphrase cannot be empty")

    ph = hash_passphrase(req.passphrase)

    # Look up existing workspace
    result = await session.execute(
        select(Workspace).where(Workspace.passphrase_hash == ph)
    )
    workspace = result.scalar_one_or_none()

    if not workspace:
        # Create new workspace with a default project
        workspace = Workspace(id=str(uuid.uuid4()), passphrase_hash=ph)
        session.add(workspace)

        default_project = ProjectModel(
            id=str(uuid.uuid4()),
            workspace_id=workspace.id,
            name="Project 1",
        )
        session.add(default_project)
        await session.commit()

    # Fetch all projects for this workspace
    result = await session.execute(
        select(ProjectModel)
        .where(ProjectModel.workspace_id == workspace.id)
        .order_by(ProjectModel.created_at)
    )
    projects = result.scalars().all()

    return WorkspaceResponse(
        workspace_id=workspace.id,
        projects=[project_to_response(p) for p in projects],
    )


@router.get("/api/projects", response_model=list[ProjectResponse])
async def list_projects(workspace_id: str, session: AsyncSession = Depends(get_session)):
    # Verify workspace exists
    ws_result = await session.execute(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    if not ws_result.scalar_one_or_none():
        raise HTTPException(404, "Workspace not found")

    result = await session.execute(
        select(ProjectModel)
        .where(ProjectModel.workspace_id == workspace_id)
        .order_by(ProjectModel.created_at)
    )
    projects = result.scalars().all()
    return [project_to_response(p) for p in projects]


@router.post("/api/projects", response_model=ProjectResponse)
async def create_project(req: CreateProjectRequest, session: AsyncSession = Depends(get_session)):
    # Check count
    count_result = await session.execute(
        select(func.count())
        .select_from(ProjectModel)
        .where(ProjectModel.workspace_id == req.workspace_id)
    )
    count = count_result.scalar()
    if count and count >= MAX_PROJECTS:
        raise HTTPException(400, f"Maximum {MAX_PROJECTS} projects allowed")

    project = ProjectModel(
        id=str(uuid.uuid4()),
        workspace_id=req.workspace_id,
        name=req.name,
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)

    return project_to_response(project)


@router.put("/api/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str, req: UpdateProjectRequest, session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(ProjectModel).where(
            ProjectModel.id == project_id,
            ProjectModel.workspace_id == req.workspace_id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")

    if req.name is not None:
        project.name = req.name.strip() or project.name
    if req.result is not None:
        project.result_data = req.result
    if req.error is not None:
        project.error = req.error

    project.updated_at = datetime.now(timezone.utc)

    await session.commit()
    await session.refresh(project)

    return project_to_response(project)


@router.delete("/api/projects/{project_id}")
async def delete_project(
    project_id: str, workspace_id: str, session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(ProjectModel).where(
            ProjectModel.id == project_id,
            ProjectModel.workspace_id == workspace_id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "Project not found")

    # Don't delete the last project
    count_result = await session.execute(
        select(func.count())
        .select_from(ProjectModel)
        .where(ProjectModel.workspace_id == workspace_id)
    )
    count = count_result.scalar()
    if count and count <= 1:
        raise HTTPException(400, "Cannot delete the last project")

    await session.delete(project)
    await session.commit()

    return {"ok": True}

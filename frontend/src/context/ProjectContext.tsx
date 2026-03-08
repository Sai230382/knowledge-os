"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Project, AnalysisResponse } from "@/lib/types";
import {
  enterWorkspace as enterWorkspaceAPI,
  fetchProjects as fetchProjectsAPI,
  createProjectAPI,
  updateProjectAPI,
  deleteProjectAPI,
} from "@/lib/api";
import PassphraseScreen from "@/components/auth/PassphraseScreen";

const WORKSPACE_KEY = "knowledge-os-workspace-id";
const MAX_PROJECTS = 20;

interface ProjectContextType {
  projects: Project[];
  activeProject: Project;
  activeProjectId: string;
  switchProject: (id: string) => void;
  addProject: (name?: string) => void;
  removeProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  setResult: (result: AnalysisResponse | null) => void;
  setError: (error: string) => void;
  canAddProject: boolean;
  signOut: () => void;
}

const ProjectContext = createContext<ProjectContextType>(null!);

// Fallback project for SSR / loading states
const EMPTY_PROJECT: Project = {
  id: "__loading__",
  name: "Loading...",
  createdAt: Date.now(),
  result: null,
  error: "",
};

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [authChecked, setAuthChecked] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // On mount: check for saved workspace and load projects
  useEffect(() => {
    const savedId = localStorage.getItem(WORKSPACE_KEY);
    if (savedId) {
      setWorkspaceId(savedId);
      fetchProjectsAPI(savedId)
        .then((loaded) => {
          if (loaded.length > 0) {
            setProjects(loaded);
            setActiveProjectId(loaded[0].id);
          } else {
            // Workspace exists but has no projects — shouldn't happen, but handle it
            localStorage.removeItem(WORKSPACE_KEY);
            setWorkspaceId(null);
          }
        })
        .catch(() => {
          // Invalid workspace — clear and show passphrase
          localStorage.removeItem(WORKSPACE_KEY);
          setWorkspaceId(null);
        })
        .finally(() => {
          setAuthChecked(true);
          setInitialLoading(false);
        });
    } else {
      setAuthChecked(true);
      setInitialLoading(false);
    }
  }, []);

  // --- Auth ---

  const handleEnterWorkspace = useCallback(async (passphrase: string) => {
    const { workspace_id, projects: loaded } = await enterWorkspaceAPI(passphrase);
    setWorkspaceId(workspace_id);
    localStorage.setItem(WORKSPACE_KEY, workspace_id);
    setProjects(loaded);
    setActiveProjectId(loaded[0]?.id || "");
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(WORKSPACE_KEY);
    setWorkspaceId(null);
    setProjects([]);
    setActiveProjectId("");
  }, []);

  // --- Project CRUD ---

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || EMPTY_PROJECT;

  const switchProject = useCallback((id: string) => {
    setActiveProjectId(id);
  }, []);

  const addProject = useCallback(
    (name?: string) => {
      if (!workspaceId) return;
      const projectName = name || `Project ${projects.length + 1}`;

      createProjectAPI(workspaceId, projectName)
        .then((newProject) => {
          setProjects((prev) => [...prev, newProject]);
          setActiveProjectId(newProject.id);
        })
        .catch((err) => console.error("Failed to create project:", err));
    },
    [workspaceId, projects.length],
  );

  const removeProject = useCallback(
    (id: string) => {
      if (!workspaceId || projects.length <= 1) return;

      deleteProjectAPI(workspaceId, id)
        .then(() => {
          setProjects((prev) => {
            const filtered = prev.filter((p) => p.id !== id);
            setActiveProjectId((current) =>
              current === id ? filtered[0].id : current,
            );
            return filtered;
          });
        })
        .catch((err) => console.error("Failed to delete project:", err));
    },
    [workspaceId, projects.length],
  );

  const renameProject = useCallback(
    (id: string, newName: string) => {
      if (!workspaceId) return;
      const trimmed = newName.trim();
      if (!trimmed) return;

      // Optimistic update
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
      );

      updateProjectAPI(workspaceId, id, { name: trimmed }).catch((err) =>
        console.error("Failed to rename project:", err),
      );
    },
    [workspaceId],
  );

  const setResult = useCallback(
    (result: AnalysisResponse | null) => {
      if (!workspaceId) return;

      // Optimistic update
      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProjectId ? { ...p, result, error: "" } : p,
        ),
      );

      // Persist to server
      updateProjectAPI(workspaceId, activeProjectId, {
        result,
        error: "",
      }).catch((err) => console.error("Failed to save result:", err));
    },
    [workspaceId, activeProjectId],
  );

  const setError = useCallback(
    (error: string) => {
      if (!workspaceId) return;

      // Optimistic update
      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProjectId ? { ...p, error } : p,
        ),
      );

      // Persist to server
      updateProjectAPI(workspaceId, activeProjectId, { error }).catch((err) =>
        console.error("Failed to save error:", err),
      );
    },
    [workspaceId, activeProjectId],
  );

  // --- Loading / Auth screens ---

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-slate-500 dark:text-slate-400">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (authChecked && !workspaceId) {
    return <PassphraseScreen onEnter={handleEnterWorkspace} />;
  }

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        activeProjectId,
        switchProject,
        addProject,
        removeProject,
        renameProject,
        setResult,
        setError,
        canAddProject: projects.length < MAX_PROJECTS,
        signOut,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProjects must be used within ProjectProvider");
  return ctx;
}

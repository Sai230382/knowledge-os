"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Project, AnalysisResponse } from "@/lib/types";

const STORAGE_KEY = "knowledge-os-projects";
const ACTIVE_KEY = "knowledge-os-active-project";
const MAX_PROJECTS = 5;

function generateId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createProject(name: string): Project {
  return {
    id: generateId(),
    name,
    createdAt: Date.now(),
    result: null,
    error: "",
  };
}

function loadProjects(): { projects: Project[]; activeId: string } {
  if (typeof window === "undefined") {
    const defaultProject = createProject("Project 1");
    return { projects: [defaultProject], activeId: defaultProject.id };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const savedActiveId = localStorage.getItem(ACTIVE_KEY);
    if (raw) {
      const projects: Project[] = JSON.parse(raw);
      if (projects.length > 0) {
        const activeId = savedActiveId && projects.find((p) => p.id === savedActiveId)
          ? savedActiveId
          : projects[0].id;
        return { projects, activeId };
      }
    }
  } catch {
    // Corrupted storage — start fresh
  }

  const defaultProject = createProject("Project 1");
  return { projects: [defaultProject], activeId: defaultProject.id };
}

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
}

const ProjectContext = createContext<ProjectContextType>(null!);

// Default project used for SSR / before hydration
const SSR_DEFAULT_PROJECT = createProject("Project 1");

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([SSR_DEFAULT_PROJECT]);
  const [activeProjectId, setActiveProjectId] = useState<string>(SSR_DEFAULT_PROJECT.id);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount (client only)
  useEffect(() => {
    const { projects: loaded, activeId } = loadProjects();
    setProjects(loaded);
    setActiveProjectId(activeId);
    setMounted(true);
  }, []);

  // Save to localStorage whenever projects change
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      localStorage.setItem(ACTIVE_KEY, activeProjectId);
    } catch {
      // Storage full or unavailable
    }
  }, [projects, activeProjectId, mounted]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || createProject("Project 1");

  const switchProject = useCallback((id: string) => {
    setActiveProjectId(id);
  }, []);

  const addProject = useCallback((name?: string) => {
    setProjects((prev) => {
      if (prev.length >= MAX_PROJECTS) return prev;
      const projectName = name || `Project ${prev.length + 1}`;
      const newProject = createProject(projectName);
      setActiveProjectId(newProject.id);
      return [...prev, newProject];
    });
  }, []);

  const removeProject = useCallback((id: string) => {
    setProjects((prev) => {
      if (prev.length <= 1) return prev;
      const filtered = prev.filter((p) => p.id !== id);
      setActiveProjectId((currentId) => {
        if (currentId === id) {
          return filtered[0].id;
        }
        return currentId;
      });
      return filtered;
    });
  }, []);

  const renameProject = useCallback((id: string, name: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p))
    );
  }, []);

  const setResult = useCallback((result: AnalysisResponse | null) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId ? { ...p, result, error: "" } : p
      )
    );
  }, [activeProjectId]);

  const setError = useCallback((error: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId ? { ...p, error } : p
      )
    );
  }, [activeProjectId]);

  const noop = useCallback(() => {}, []);

  return (
    <ProjectContext.Provider
      value={mounted ? {
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
      } : {
        projects,
        activeProject,
        activeProjectId,
        switchProject: noop,
        addProject: noop,
        removeProject: noop,
        renameProject: noop,
        setResult: noop,
        setError: noop,
        canAddProject: false,
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

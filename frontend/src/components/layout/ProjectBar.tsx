"use client";
import { useState, useRef, useEffect } from "react";
import { useProjects } from "@/context/ProjectContext";

export default function ProjectBar() {
  const {
    projects,
    activeProjectId,
    switchProject,
    addProject,
    removeProject,
    renameProject,
    canAddProject,
    signOut,
  } = useProjects();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const finishRename = () => {
    if (editingId) {
      renameProject(editingId, editName);
      setEditingId(null);
    }
  };

  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-2 h-9 flex-shrink-0">
      {/* Project tabs */}
      <div className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0">
        {projects.map((project) => {
          const isActive = project.id === activeProjectId;
          const hasResult = !!project.result;

          return (
            <div
              key={project.id}
              onClick={() => switchProject(project.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                startRename(project.id, project.name);
              }}
              className={`group flex items-center gap-1.5 px-3 py-1 rounded-t-md text-xs font-medium cursor-pointer transition-colors select-none max-w-[180px] ${
                isActive
                  ? "bg-white dark:bg-slate-950 text-slate-800 dark:text-white border-t border-x border-slate-200 dark:border-slate-700 -mb-px"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              }`}
            >
              {/* Status dot */}
              <div
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  hasResult
                    ? "bg-green-500"
                    : "bg-slate-300 dark:bg-slate-600"
                }`}
              />

              {/* Name (editable on double-click) */}
              {editingId === project.id ? (
                <input
                  ref={inputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={finishRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") finishRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="bg-transparent border-b border-blue-400 outline-none text-xs w-20 text-slate-800 dark:text-white"
                  maxLength={24}
                />
              ) : (
                <span className="truncate">{project.name}</span>
              )}

              {/* Close button (hidden for last project) */}
              {projects.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeProject(project.id);
                  }}
                  className={`ml-0.5 p-0.5 rounded hover:bg-slate-300/50 dark:hover:bg-slate-600/50 transition-colors flex-shrink-0 ${
                    isActive
                      ? "opacity-60 hover:opacity-100"
                      : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
                  }`}
                  title="Close project"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add project button */}
      {canAddProject && (
        <button
          onClick={() => addProject()}
          className="flex items-center justify-center w-6 h-6 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0 ml-1"
          title="New project"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Project count */}
      <div className="text-[10px] text-slate-400 dark:text-slate-500 ml-2 flex-shrink-0 tabular-nums">
        {projects.length}/{20}
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="flex items-center justify-center w-6 h-6 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0 ml-1"
        title="Sign out"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  );
}

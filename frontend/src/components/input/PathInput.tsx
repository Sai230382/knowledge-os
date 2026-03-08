"use client";
import { useState } from "react";

interface PathInputProps {
  onSubmit: (path: string) => void;
  isLoading: boolean;
}

export default function PathInput({ onSubmit, isLoading }: PathInputProps) {
  const [path, setPath] = useState("");

  const handleSubmit = () => {
    if (path.trim()) {
      onSubmit(path.trim());
      setPath("");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        File / Folder Path
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="/path/to/folder/or/file.docx"
          className="flex-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
          disabled={isLoading}
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !path.trim()}
          className="bg-slate-700 dark:bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          Analyze
        </button>
      </div>
    </div>
  );
}

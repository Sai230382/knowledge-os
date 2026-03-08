"use client";
import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import LeftPanel from "@/components/layout/LeftPanel";
import RightPanel from "@/components/layout/RightPanel";
import { useProjects } from "@/context/ProjectContext";

export default function Home() {
  const { activeProject, setResult, setError } = useProjects();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <MainLayout>
      <div className="w-[380px] min-w-[380px] border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <LeftPanel
          onResult={setResult}
          onError={setError}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          currentResult={activeProject.result}
        />
      </div>
      <div className="flex-1 min-w-0 bg-white dark:bg-slate-950">
        <RightPanel result={activeProject.result} error={activeProject.error} />
      </div>
    </MainLayout>
  );
}

"use client";
import ProjectBar from "./ProjectBar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-white dark:bg-slate-950">
      <ProjectBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

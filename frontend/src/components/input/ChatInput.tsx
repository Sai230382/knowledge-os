"use client";
import { useState } from "react";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSubmit, isLoading }: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Or paste text directly
      </label>
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste or type content to analyze... (Enter to send, Shift+Enter for newline)"
          rows={4}
          className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
          disabled={isLoading}
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !text.trim()}
          className="absolute bottom-2 right-2 bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
        >
          {isLoading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

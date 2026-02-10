"use client";

import { useState } from "react";
import type { ChatSource } from "@/types";

interface Props {
  sources: ChatSource[];
}

export default function SourceViewer({ sources }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!sources.length) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(expanded !== null ? null : 0)}
        className="text-xs text-primary hover:underline"
      >
        {expanded !== null ? "Hide" : "Show"} sources ({sources.length})
      </button>
      {expanded !== null && (
        <div className="mt-2 space-y-2">
          {sources.map((src, i) => (
            <div key={i} className="border border-border rounded-lg p-3 bg-surface text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-xs">
                  {src.fileName}
                  <span className="text-muted ml-2">chunk #{src.chunkIndex}</span>
                </span>
                <span className="text-xs text-muted">score: {src.score?.toFixed(4)}</span>
              </div>
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="text-xs text-primary hover:underline"
              >
                {expanded === i ? "Collapse" : "Expand"}
              </button>
              {expanded === i && (
                <p className="mt-1 text-xs text-muted whitespace-pre-wrap leading-relaxed">
                  {src.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

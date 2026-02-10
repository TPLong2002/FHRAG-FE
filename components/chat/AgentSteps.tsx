"use client";

import { useState } from "react";
import type { AgentStep } from "@/types";

interface Props {
  steps: AgentStep[];
}

export default function AgentSteps({ steps }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!steps.length) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(expanded !== null ? null : 0)}
        className="text-xs text-primary-text font-medium hover:underline"
      >
        {expanded !== null ? "Hide" : "Show"} agent steps ({steps.length})
      </button>
      {expanded !== null && (
        <div className="mt-2 space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="border border-border rounded-lg p-3 bg-surface text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-1.5 py-0.5 rounded bg-accent text-primary-text font-mono font-medium">
                  {step.tool}
                </span>
                <button
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="text-primary-text hover:underline"
                >
                  {expanded === i ? "Collapse" : "Expand"}
                </button>
              </div>
              {expanded === i && (
                <div className="mt-2 space-y-1">
                  <div>
                    <span className="text-muted">Input: </span>
                    <span className="font-mono">{step.input}</span>
                  </div>
                  <div>
                    <span className="text-muted">Result: </span>
                    <pre className="whitespace-pre-wrap text-foreground mt-1 p-2 rounded bg-background border border-border">
                      {step.result}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

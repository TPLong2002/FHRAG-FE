"use client";

import type { LLMProvider, ModelOption, ModelsMap } from "@/types";

interface Props {
  models: ModelsMap;
  provider: LLMProvider;
  model: string;
  onProviderChange: (p: LLMProvider) => void;
  onModelChange: (m: string) => void;
}

export default function ModelSelector({ models, provider, model, onProviderChange, onModelChange }: Props) {
  const providerModels: ModelOption[] = models[provider] || [];

  return (
    <div className="flex items-center gap-2">
      <select
        value={provider}
        onChange={(e) => {
          const p = e.target.value as LLMProvider;
          onProviderChange(p);
          const first = models[p]?.[0];
          if (first) onModelChange(first.id);
        }}
        className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="openai">OpenAI</option>
        <option value="google">Google</option>
        <option value="aistudio">AI Studio</option>
      </select>
      <select
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {providerModels.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}

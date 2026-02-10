const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function fetchModels(type: "llm" | "embedding") {
  const res = await fetch(`${API_BASE}/api/models/${type}`);
  if (!res.ok) throw new Error("Failed to fetch models");
  return res.json();
}

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE}/api/documents`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function uploadFiles(
  files: File[],
  embeddingProvider: string,
  embeddingModel: string
) {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  formData.append("embeddingProvider", embeddingProvider);
  formData.append("embeddingModel", embeddingModel);

  const res = await fetch(`${API_BASE}/api/documents/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error);
  }
  return res.json();
}

export async function deleteDocument(id: string) {
  const res = await fetch(`${API_BASE}/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete document");
  return res.json();
}

/** Chat with SSE streaming. Returns an abort controller. */
export function chatStream(
  question: string,
  provider: string,
  model: string,
  onChunk: (text: string) => void,
  onSources: (sources: unknown[]) => void,
  onDone: () => void,
  onError: (err: string) => void
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, provider, model }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Chat failed" }));
        onError(err.error);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();

          if (data === "[DONE]") {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "chunk") onChunk(parsed.content);
            else if (parsed.type === "sources") onSources(parsed.sources);
            else if (parsed.type === "error") onError(parsed.error);
          } catch {
            // ignore parse errors
          }
        }
      }
      onDone();
    })
    .catch((err) => {
      if (err.name !== "AbortError") onError(err.message);
    });

  return controller;
}

/** SQL Agent with SSE streaming. Emits tool steps + final answer. */
export function agentStream(
  question: string,
  provider: string,
  model: string,
  onStep: (step: { type: string; content: string }) => void,
  onSources: (sources: unknown[]) => void,
  onDone: () => void,
  onError: (err: string) => void
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/api/agent/sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, provider, model }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Agent failed" }));
        onError(err.error);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();

          if (data === "[DONE]") {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "step") onStep(parsed);
            else if (parsed.type === "sources") onSources(parsed.sources);
            else if (parsed.type === "error") onError(parsed.error);
          } catch {
            // ignore
          }
        }
      }
      onDone();
    })
    .catch((err) => {
      if (err.name !== "AbortError") onError(err.message);
    });

  return controller;
}

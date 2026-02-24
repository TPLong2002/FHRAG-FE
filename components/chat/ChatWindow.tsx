"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ModelSelector from "./ModelSelector";
import MessageBubble from "./MessageBubble";
import { chatStream, fetchModels } from "@/lib/api";
import type { ChatMessage, ChatSource, LLMProvider, ModelsMap } from "@/types";

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<LLMProvider>("openai");
  const [model, setModel] = useState("gpt-5.2-2025-12-11");
  const [models, setModels] = useState<ModelsMap>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchModels("llm").then((data) => setModels(data.models)).catch(console.error);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  const handleSend = () => {
    const q = input.trim();
    if (!q || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);

    let assistantContent = "";
    let sources: ChatSource[] = [];

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    abortRef.current = chatStream(
      q, provider, model,
      (chunk) => {
        assistantContent += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantContent };
          return updated;
        });
      },
      (srcList) => { sources = srcList as ChatSource[]; },
      () => {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantContent, sources };
          return updated;
        });
        setLoading(false);
      },
      (err) => {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: `Error: ${err}` };
          return updated;
        });
        setLoading(false);
      }
    );
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <h2 className="font-semibold">Chat</h2>
        <ModelSelector
          models={models}
          provider={provider}
          model={model}
          onProviderChange={setProvider}
          onModelChange={setModel}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            Upload documents and start chatting
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask a question about your documents..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            disabled={loading}
          />
          {loading ? (
            <button
              onClick={handleStop}
              className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm hover:bg-red-600 transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-text text-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

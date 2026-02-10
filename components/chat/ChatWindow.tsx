"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ModelSelector from "./ModelSelector";
import MessageBubble from "./MessageBubble";
import { chatStream, agentStream, fetchModels } from "@/lib/api";
import type { ChatMessage, ChatSource, AgentStep, LLMProvider, ChatMode, ModelsMap } from "@/types";

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<LLMProvider>("openai");
  const [model, setModel] = useState("gpt-4o-mini");
  const [models, setModels] = useState<ModelsMap>({});
  const [mode, setMode] = useState<ChatMode>("chat");
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

    if (mode === "sql-agent") {
      handleAgentSend(q);
    } else {
      handleChatSend(q);
    }
  };

  const handleChatSend = (q: string) => {
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

  const handleAgentSend = (q: string) => {
    const steps: AgentStep[] = [];
    let currentToolCall: { tool: string; input: string } | null = null;
    let answer = "";
    let sources: ChatSource[] = [];

    setMessages((prev) => [...prev, { role: "assistant", content: "Thinking...", steps: [] }]);

    abortRef.current = agentStream(
      q, provider, model,
      (step) => {
        if (step.type === "tool_call") {
          try {
            currentToolCall = JSON.parse(step.content);
          } catch {
            currentToolCall = { tool: "unknown", input: step.content };
          }
        } else if (step.type === "tool_result" && currentToolCall) {
          steps.push({
            tool: currentToolCall.tool,
            input: typeof currentToolCall.input === "string"
              ? currentToolCall.input
              : JSON.stringify(currentToolCall.input),
            result: step.content,
          });
          currentToolCall = null;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: `Running... (${steps.length} steps)`,
              steps: [...steps],
            };
            return updated;
          });
        } else if (step.type === "answer") {
          answer = step.content;
        }
      },
      (srcList) => { sources = srcList as ChatSource[]; },
      () => {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: answer,
            steps: [...steps],
            sources,
          };
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
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">Chat</h2>
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            <button
              onClick={() => setMode("chat")}
              className={`px-3 py-1 transition-colors ${
                mode === "chat" ? "bg-accent text-primary-text" : "bg-surface text-muted hover:bg-surface-hover"
              }`}
            >
              RAG
            </button>
            <button
              onClick={() => setMode("sql-agent")}
              className={`px-3 py-1 transition-colors ${
                mode === "sql-agent" ? "bg-accent text-primary-text" : "bg-surface text-muted hover:bg-surface-hover"
              }`}
            >
              SQL Agent
            </button>
          </div>
        </div>
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
            {mode === "sql-agent"
              ? "Upload schema docs, then ask SQL questions to validate"
              : "Upload documents and start chatting"}
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
            placeholder={
              mode === "sql-agent"
                ? "Ask about SQL: e.g. SELECT * FROM users WHERE..."
                : "Ask a question about your documents..."
            }
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

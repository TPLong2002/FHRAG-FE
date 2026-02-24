"use client";

import Markdown from "react-markdown";
import SourceViewer from "./SourceViewer";
import type { ChatMessage } from "@/types";

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-accent text-primary-text"
            : "bg-surface border border-border"
        }`}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
          <Markdown>{message.content}</Markdown>
        </div>
        {message.sources && <SourceViewer sources={message.sources} />}
      </div>
    </div>
  );
}

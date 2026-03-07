import { useEffect, useRef } from "react";
import type { ChatMessage } from "../ui-types";

interface TranscriptProps {
  messages: ChatMessage[];
  isPending: boolean;
}

function getSourceLabel(source: ChatMessage["source"]): string | null {
  if (source === "llm") return "LLM";
  if (source === "fallback") return "Fallback";
  return null;
}

export function Transcript({ messages, isPending }: TranscriptProps) {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = feedRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, isPending]);

  return (
    <div ref={feedRef} className="transcript">
      {messages.map(message => {
        const sourceLabel = getSourceLabel(message.source);

        return (
          <article
            key={message.id}
            className={`bubble ${message.role} ${message.variant !== "standard" ? message.variant : ""}`.trim()}
          >
            <div className="bubble-meta">
              <span>{message.speaker}</span>
              {sourceLabel ? <span className="source-tag">{sourceLabel}</span> : null}
            </div>
            <p>{message.content}</p>
          </article>
        );
      })}

      {isPending ? (
        <article className="bubble assistant thinking">
          <div className="bubble-meta">
            <span>Assistant</span>
          </div>
          <div className="thinking-row">
            <span className="spinner" aria-hidden="true" />
            <span>Thinking...</span>
          </div>
        </article>
      ) : null}
    </div>
  );
}

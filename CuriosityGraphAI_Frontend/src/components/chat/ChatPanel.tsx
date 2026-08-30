import { useState, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  BookMarked,
  Plus,
  MoreVertical,
  Sparkles,
} from "lucide-react";
import type { Message } from "../../types";

interface Props {
  messages: Message[];
  isLoading: boolean;
  onSend: (question: string) => void;
  onCitationClick: (page: number) => void;
  onNewThread: () => void;
  documentTitle: string | null;
}

export default function ChatPanel({
  messages,
  isLoading,
  onSend,
  onCitationClick,
  onNewThread,
  documentTitle,
}: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track the previous message count to detect NEW messages
  const prevMessagesLengthRef = useRef(messages.length);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    // Check if user is currently near the bottom (within 150px)
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      150;

    // Only force scroll to bottom if a new message arrived OR if the user is already near the bottom
    if (isNewMessage || isNearBottom) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: isNewMessage ? "smooth" : "auto",
      });
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="w-[410px] flex flex-col h-screen bg-[#0a111d] min-w-[410px]">
      {/* Header */}
      <div className="h-[62px] px-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-[15px] font-semibold">
          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#6945ff] to-[#8364ff]">
            <Sparkles size={14} className="text-white" />
          </div>
          Ask CuriosityGraphAI
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onNewThread}
            className="h-[34px] px-2.5 border border-border-light rounded-md text-[11px] hover:bg-[#151e2d] transition flex items-center gap-1"
          >
            <Plus size={12} /> New Thread
          </button>
          <button className="w-[34px] h-[34px] border border-border rounded-md flex items-center justify-center hover:bg-[#151e2d] transition">
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5"
      >
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-text-muted mt-20 text-sm">
            {documentTitle
              ? "Ask a question about this document."
              : "Select a document to begin."}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-bold ${
                  msg.role === "user"
                    ? "bg-[#6545cf] text-white"
                    : "bg-gradient-to-br from-[#ffad3c] to-[#ed7f32] text-white"
                }`}
              >
                {msg.role === "user" ? "U" : <Sparkles size={12} />}
              </div>
              <div className="text-xs font-semibold">
                {msg.role === "user" ? "You" : "CuriosityGraphAI"}
              </div>
              <div className="ml-auto text-[10px] text-[#667286]">
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            <div
              className={`p-3.5 border rounded-lg text-xs leading-[1.7] ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-[#5b42c9]/35 to-[#3f2e8b]/25 border-accent/20 text-[#d8deea]"
                  : "bg-panel border-border text-[#d8deea]"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {msg.role === "assistant" &&
                msg.sources &&
                msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-2 text-[#bfc7d7] text-[11px] font-semibold">
                      <BookMarked size={12} /> Sources
                      <span className="px-1.5 py-0.5 rounded-full bg-[#202a3b] text-[9px]">
                        {msg.sources.length}
                      </span>
                    </div>
                    {msg.sources.map((src, idx) => (
                      <button
                        key={idx}
                        onClick={() => onCitationClick(src.page)}
                        className="flex gap-2.5 p-2.5 mb-1.5 border border-border rounded-lg bg-[#0f1827] hover:border-[#35445d] transition w-full text-left"
                      >
                        <div className="w-7 h-8 flex-shrink-0 flex items-center justify-center rounded bg-accent/20 text-accent-light text-[10px] font-bold">
                          {src.page}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold text-text-main">
                            Page {src.page}
                          </div>
                          {src.snippet && (
                            <div className="text-[#78859a] text-[9px] mt-1 leading-snug line-clamp-2">
                              {src.snippet}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-text-muted text-xs p-3.5 bg-panel border border-border rounded-lg w-fit">
            <Loader2 className="animate-spin" size={14} /> Thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 pb-3 border-t border-border">
        <form
          onSubmit={handleSubmit}
          className="flex border border-accent rounded-lg overflow-hidden bg-panel shadow-[0_0_0_1px_rgba(112,76,255,0.08)]"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              documentTitle
                ? "Ask a question about this document..."
                : "Select a document first"
            }
            disabled={!documentTitle || isLoading}
            rows={2}
            className="flex-1 min-w-0 resize-none border-0 outline-0 bg-transparent text-white p-3.5 text-xs placeholder-[#69768b] disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || !documentTitle || isLoading}
            className="w-12 bg-gradient-to-br from-[#6948ee] to-[#7857ff] text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition"
          >
            <Send size={16} />
          </button>
        </form>
        <div className="text-center text-[#626e80] text-[9px] mt-2">
          AI answers may contain inaccuracies. Verify important information.
        </div>
      </div>
    </div>
  );
}

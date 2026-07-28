import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent } from "react";
import { Send, X } from "lucide-react";
import { AnalysisReport } from "../types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CopilotChatProps {
  report: AnalysisReport | null;
  userId: string;
  onClose?: () => void;
}

export default function CopilotChat({ report, userId, onClose }: CopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (report && userId) {
      const key = `reposense_copilot_history_${userId}_${report.owner}_${report.repo}`;
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          setMessages(JSON.parse(saved));
        } else {
          setMessages([]);
        }
      } catch {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [report?.owner, report?.repo, userId]);

  useEffect(() => {
    if (report && userId && messages.length > 0) {
      const key = `reposense_copilot_history_${userId}_${report.owner}_${report.repo}`;
      localStorage.setItem(key, JSON.stringify(messages));
    }
  }, [messages, report?.owner, report?.repo, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isStreaming || !report) return;

    const userMessage = inputValue.trim();
    setInputValue("");

    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsStreaming(true);
    setStreamingText("");

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
          report,
        }),
      });

      if (!response.ok) {
        let errorMsg = `Server error (${response.status})`;
        try {
          const errBody = await response.json();
          errorMsg = errBody.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream")) {
        const text = await response.text();
        throw new Error(`Unexpected response: ${text.substring(0, 200)}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);

          try {
            const parsed = JSON.parse(payload);
            if (parsed.type === "chunk" && parsed.content) {
              fullText += parsed.content;
              setStreamingText(fullText);
            } else if (parsed.type === "done") {
            } else if (parsed.type === "error") {
              throw new Error(parsed.message || "AI error occurred.");
            }
          } catch (e: any) {
            if (e.message && e.message !== "AI error occurred.") continue;
            throw e;
          }
        }
      }

      if (fullText) {
        setMessages((prev) => [...prev, { role: "assistant", content: fullText }]);
      }
    } catch (err: any) {
      console.error("[Copilot] Error:", err);
      const msg = err?.message || "Connection error. Please try again.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: msg },
      ]);
    } finally {
      setIsStreaming(false);
      setStreamingText("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  if (!report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3 px-6">
        <img src="/logo.svg" alt="CoPilot" className="w-12 h-12 opacity-40" />
        <p className="text-center text-xs leading-relaxed">
          Analyze a repository to start chatting.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="CoPilot" className="w-8 h-8 rounded-lg" />
          <div>
            <h2 className="text-white font-semibold text-sm">CoPilot</h2>
            <p className="text-gray-500 text-[10px]">{report.owner}/{report.repo}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 text-xs text-center">
              Ask anything about <span className="text-[#7A5C1E] font-medium">{report.repo}</span>
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div
                  className="max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13px] text-white leading-relaxed"
                  style={{ background: "rgba(27, 42, 107, 0.55)", border: "1px solid rgba(27, 42, 107, 0.4)" }}
                >
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="flex gap-2.5 items-start">
                <img src="/logo.svg" alt="CoPilot" className="flex-shrink-0 w-7 h-7 rounded-lg mt-0.5" />
                <div
                  className="max-w-[80%] rounded-xl rounded-tl-md px-3.5 py-2.5 text-[13px] text-gray-200 leading-relaxed"
                  style={{
                    background: "rgba(30, 30, 40, 0.9)",
                    border: "1px solid rgba(75, 85, 99, 0.25)",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingText && (
          <div className="flex gap-2.5 items-start">
            <img src="/logo.svg" alt="CoPilot" className="flex-shrink-0 w-7 h-7 rounded-lg mt-0.5" />
            <div
              className="max-w-[80%] rounded-xl rounded-tl-md px-3.5 py-2.5 text-[13px] text-gray-200 leading-relaxed"
              style={{
                background: "rgba(30, 30, 40, 0.9)",
                border: "1px solid rgba(75, 85, 99, 0.25)",
              }}
            >
              {streamingText}<span className="animate-pulse text-[#F5EBD3]">|</span>
            </div>
          </div>
        )}

        {/* Streaming placeholder */}
        {isStreaming && !streamingText && (
          <div className="flex gap-2.5 items-start">
            <img src="/logo.svg" alt="CoPilot" className="flex-shrink-0 w-7 h-7 rounded-lg mt-0.5" />
            <div
              className="rounded-xl rounded-tl-md px-3.5 py-2.5 text-[13px]"
              style={{
                background: "rgba(30, 30, 40, 0.9)",
                border: "1px solid rgba(75, 85, 99, 0.25)",
              }}
            >
              <span className="animate-pulse text-[#F5EBD3]">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-3 pb-3 pt-1 shrink-0">
        <div
          className="flex items-end rounded-xl overflow-hidden"
          style={{
            background: "rgba(30, 30, 40, 0.8)",
            border: "1px solid rgba(75, 85, 99, 0.25)",
          }}
        >
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-white text-[13px] px-3.5 py-2.5 resize-none outline-none placeholder-gray-600 disabled:opacity-50"
            style={{ maxHeight: "100px" }}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isStreaming}
            className="px-3 py-2.5 text-[#F5EBD3] hover:text-white disabled:text-gray-700 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

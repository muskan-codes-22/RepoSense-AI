import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent } from "react";
import { motion } from "motion/react";
import { MessageCircle, Send } from "lucide-react";
import { AnalysisReport } from "../types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CopilotChatProps {
  report: AnalysisReport | null;
  userId: string;
}

export default function CopilotChat({ report, userId }: CopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history from localStorage when report changes
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

  // Save chat history to localStorage when messages change
  useEffect(() => {
    if (report && userId && messages.length > 0) {
      const key = `reposense_copilot_history_${userId}_${report.owner}_${report.repo}`;
      localStorage.setItem(key, JSON.stringify(messages));
    }
  }, [messages, report?.owner, report?.repo, userId]);

  // Auto-scroll to bottom when messages or streaming text changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isStreaming || !report) return;

    const userMessage = inputValue.trim();
    setInputValue("");

    // Add user message
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
              // Done streaming
            } else if (parsed.type === "error") {
              throw new Error(parsed.message || "AI error occurred.");
            }
          } catch (e: any) {
            if (e.message && e.message !== "AI error occurred.") continue;
            throw e;
          }
        }
      }

      // Finalize the message
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

  // Auto-resize textarea
  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  if (!report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4 px-8">
        <MessageCircle className="w-16 h-16 opacity-30" />
        <p className="text-center text-sm leading-relaxed">
          Analyze a repository first to start chatting with the copilot.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-5 h-5 text-purple-400" />
          <div>
            <h2 className="text-white font-semibold text-base">RepoSense CoPilot Ask</h2>
            <p className="text-gray-500 text-xs">Workspace contextual vector models</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {messages.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 text-sm">
              Ask anything about <span className="text-purple-400 font-medium">{report.owner}/{report.repo}</span>
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "user" ? (
              /* User message - right aligned purple bubble */
              <div className="flex justify-end">
                <div
                  className="max-w-[65%] rounded-2xl rounded-br-md px-4 py-3 text-sm text-white"
                  style={{ background: "rgba(124, 58, 237, 0.35)", border: "1px solid rgba(124, 58, 237, 0.3)" }}
                >
                  &ldquo;{msg.content}&rdquo;
                </div>
              </div>
            ) : (
              /* Assistant message - left aligned with avatar */
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600/80 flex items-center justify-center text-white text-xs font-semibold mt-1">
                  R
                </div>
                <div className="max-w-[75%] space-y-1">
                  <span className="text-purple-400 text-sm font-semibold">Answer:</span>
                  <div
                    className="rounded-xl px-4 py-3 text-sm text-gray-200 leading-relaxed"
                    style={{
                      background: "rgba(17, 17, 24, 0.8)",
                      border: "1px solid rgba(75, 85, 99, 0.3)",
                    }}
                  >
                    &ldquo;{msg.content}&rdquo;
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingText && (
          <div className="flex gap-3 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600/80 flex items-center justify-center text-white text-xs font-semibold mt-1">
              R
            </div>
            <div className="max-w-[75%] space-y-1">
              <span className="text-purple-400 text-sm font-semibold">Answer:</span>
              <div
                className="rounded-xl px-4 py-3 text-sm text-gray-200 leading-relaxed"
                style={{
                  background: "rgba(17, 17, 24, 0.8)",
                  border: "1px solid rgba(75, 85, 99, 0.3)",
                }}
              >
                &ldquo;{streamingText}<span className="animate-pulse text-purple-400">|</span>&rdquo;
              </div>
            </div>
          </div>
        )}

        {/* Streaming placeholder */}
        {isStreaming && !streamingText && (
          <div className="flex gap-3 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600/80 flex items-center justify-center text-white text-xs font-semibold mt-1">
              R
            </div>
            <div className="max-w-[75%] space-y-1">
              <span className="text-purple-400 text-sm font-semibold">Answer:</span>
              <div
                className="rounded-xl px-4 py-3 text-sm text-gray-200"
                style={{
                  background: "rgba(17, 17, 24, 0.8)",
                  border: "1px solid rgba(75, 85, 99, 0.3)",
                }}
              >
                <span className="animate-pulse text-purple-400">|</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 pb-4 pt-2">
        <div
          className="flex items-center rounded-xl overflow-hidden"
          style={{
            background: "rgba(17, 17, 24, 0.6)",
            border: "1px solid rgba(75, 85, 99, 0.3)",
          }}
        >
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask CoPilot any code question..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-white text-sm px-4 py-3 resize-none outline-none placeholder-gray-600 disabled:opacity-50"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isStreaming}
            className="px-3 py-3 text-purple-400 hover:text-purple-300 disabled:text-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

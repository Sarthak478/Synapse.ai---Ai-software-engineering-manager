import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, AppState } from "../types";
import {
  MessageSquare,
  Sparkles,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  Loader2,
  Trash,
  HelpCircle
} from "lucide-react";
import { motion } from "motion/react";
import ApiKeyRequiredModal from "./ApiKeyRequiredModal";

interface PMAssistantProps {
  state: AppState;
  onSaveState: (updated: AppState) => Promise<void>;
  goToTab?: (tab: string) => void;
}

export default function PMAssistant({ state, onSaveState, goToTab }: PMAssistantProps) {
  const [inputText, setInputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Suggested prompts
  const suggestions = [
    { label: "Analyze sprint bottlenecks", text: "Explain active project bottlenecks, critical paths, and blocked tasks in detail." },
    { label: "Report team workload allocations", text: "List the workload allocation points, velocities, and capacities for all developers." },
    { label: "Summarize active sprint health", text: "Are we on track to complete the active sprint? Provide a health review and suggestions." }
  ];

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chats]);

  // Send message
  const handleSendMessage = async (rawText: string) => {
    if (!rawText.trim() || isLoading) return;
    // API key guard: show modal instead of silently falling back to mock data
    if (!state.settings?.hasGeminiApiKey) {
      setShowApiKeyModal(true);
      return;
    }

    const userMsg: ChatMessage = {
      id: `chat-${Date.now()}-user`,
      role: "user",
      text: rawText,
      timestamp: new Date().toISOString()
    };

    const updatedChatsWithUser = [...state.chats, userMsg];
    await onSaveState({
      ...state,
      chats: updatedChatsWithUser
    });

    setInputText("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("synapse-session-token");
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          ...(state.settings?.geminiApiKey ? { "x-gemini-api-key": state.settings.geminiApiKey } : {})
        },
        body: JSON.stringify({
          message: rawText,
          history: state.chats
        })
      });

      if (!response.ok) throw new Error("Chat request failed");
      const data = await response.json();

      const modelMsg: ChatMessage = {
        id: `chat-${Date.now()}-model`,
        role: "model",
        text: data.text || "I was unable to retrieve context for that question.",
        timestamp: new Date().toISOString()
      };

      await onSaveState({
        ...state,
        chats: [...updatedChatsWithUser, modelMsg]
      });
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `chat-${Date.now()}-error`,
        role: "model",
        text: "My neural connection is temporarily restricted. Here is a status overview:\n\n- **Alice Vance** is currently unblocking **Charlie's stepper dashboard (Task-3)** by implementing **Redis locking mechanisms**.\n- **Bob Forrester** is secure webhook authenticator auditing code.\n\nCould I help re-run planning charts or verify secure rules?",
        timestamp: new Date().toISOString()
      };
      await onSaveState({
        ...state,
        chats: [...updatedChatsWithUser, errorMsg]
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Clear chat logs
  const handleClearChatHistory = async () => {
    const defaultChat: ChatMessage[] = [
      {
        id: "chat-default",
        role: "model",
        text: "Chat telemetry reset. I am your engineering assistant. What would you like to review now?",
        timestamp: new Date().toISOString()
      }
    ];

    await onSaveState({
      ...state,
      chats: defaultChat
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-left animate-fade-in font-sans">
      <ApiKeyRequiredModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onGoToSettings={() => goToTab?.("settings")}
        featureName="AI PM Assistant Chat"
      />
      
      {/* Suggestions pane */}
      <div className="flex flex-col gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200/50 shadow-xs text-left flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit className="h-5 w-5 text-indigo-650" />
              <h3 className="font-sans font-bold text-slate-900 text-sm">AI PM Inquiries</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed font-sans">
              Ask questions about developer allocations, active sprint risks, delay percentages, technical blocks, or stack requirements.
            </p>

            <div className="flex flex-col gap-2 font-sans">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(sug.text)}
                  className="w-full text-xs p-3 hover:bg-slate-50/80 rounded-lg border border-slate-150 text-left transition-colors font-medium text-slate-700 flex items-center justify-between group cursor-pointer animate-fade-in font-sans"
                >
                  <span className="truncate pr-2">{sug.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-indigo-600 transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-150 pt-4 mt-6">
            <button
              onClick={handleClearChatHistory}
              className="w-full flex items-center justify-center gap-2 p-2.5 border border-slate-200 hover:bg-red-50 hover:border-red-100 hover:text-red-700 rounded-lg text-[11px] text-slate-500 font-bold transition-colors cursor-pointer font-sans"
            >
              <Trash className="h-3.5 w-3.5" />
              Clear Dialogue Logs
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Thread Window */}
      <div className="lg:col-span-3 bg-white border border-slate-200/50 shadow-xs rounded-lg flex flex-col justify-between h-[550px] relative font-sans">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
              <MessageSquare className="h-4.5 w-4.5 text-indigo-400" />
            </div>
            <div className="text-left leading-none">
              <span className="font-bold text-slate-800 text-xs">AI Project Lead</span>
              <div className="flex items-center gap-1.5 mt-1 leading-none">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-650 animate-pulse"></span>
                <span className="text-[9px] font-mono font-bold uppercase text-slate-400">Context active</span>
              </div>
            </div>
          </div>
          
          <span className="text-[10px] font-mono text-slate-400 font-bold">GEMINI-2.5-FLASH</span>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 font-sans">
          {state.chats?.map((msg: any, i: number) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id || i}
                className={`flex gap-3 max-w-[85%] ${isUser ? "self-end flex-row-reverse" : "self-start"}`}
              >
                {/* Short visual avatar */}
                <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold leading-none ${
                  isUser ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {isUser ? "U" : "AI"}
                </div>

                <div className="flex flex-col gap-1 text-left">
                  <div className={`p-3.5 rounded-lg text-xs leading-relaxed ${
                    isUser
                      ? "bg-indigo-600 text-white font-medium rounded-tr-none"
                      : "bg-slate-50/70 border border-slate-150 text-slate-700 rounded-tl-none whitespace-pre-wrap font-sans block"
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 self-end">
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ""}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="self-start flex gap-3 font-sans">
              <div className="h-8 w-8 rounded-lg bg-slate-100 shrink-0 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
              </div>
              <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-400 italic font-sans">
                AI is auditing active velocities...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input typings */}
        <div className="p-4 border-t border-slate-100 flex gap-2 font-sans">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && inputText.trim()) {
                handleSendMessage(inputText);
              }
            }}
            placeholder="Review active sprint health or list who is carrying high workload..."
            className="flex-grow text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 bg-slate-50/50 font-sans"
          />
          <button
            onClick={() => handleSendMessage(inputText)}
            disabled={isLoading || !inputText.trim()}
            className="py-3 px-5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white leading-none duration-150 text-xs font-bold rounded-lg shrink-0 flex items-center gap-1 cursor-pointer font-sans"
          >
            Send
          </button>
        </div>
      </div>

    </div>
  );
}

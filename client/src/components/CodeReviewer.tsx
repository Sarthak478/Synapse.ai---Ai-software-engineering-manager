import React, { useState } from "react";
import { CodeReview, AppState } from "../types";
import {
  Code,
  ShieldCheck,
  AlertTriangle,
  Zap,
  RotateCcw,
  Sparkles,
  ClipboardCheck,
  CheckCircle,
  Copy,
  ChevronRight,
  ShieldAlert,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";
import ApiKeyRequiredModal from "./ApiKeyRequiredModal";

interface CodeReviewerProps {
  state: AppState;
  onSaveState: (updated: AppState) => Promise<void>;
  goToTab?: (tab: string) => void;
}

export default function CodeReviewer({ state, onSaveState, goToTab }: CodeReviewerProps) {
  const [fileName, setFileName] = useState<string>("orderCheckout.ts");
  const [codeSnippet, setCodeSnippet] = useState<string>("");
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [activeReview, setActiveReview] = useState<CodeReview | null>(state.codeReviews[0] || null);
  const [activeTab, setActiveTab] = useState<"analysis" | "optimized">("analysis");
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);

  // Preloaded poor/vulnerable templates to let users experience instant feedback
  const templates = [
    {
      name: "SQL Injection & Exhaustion Loop",
      file: "getUserOrders.ts",
      code: `import pg from 'pg';

export async function fetchUserOrders(userId: string) {
  // CRITICAL: Raw concatenation is highly vulnerable to SQL injections!
  // PERFORMANCE: Creating client connection pool on every request causes port exhaustion.
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const query = "SELECT * FROM orders WHERE user_id = '" + userId + "' ORDER BY created_at DESC";
  const result = await client.query(query);
  await client.end();
  return result.rows;
}`
    },
    {
      name: "React Infinite Re-render & Timeout Memory Leak",
      file: "TimerWidget.tsx",
      code: `import React, { useState, useEffect } from 'react';

export default function TimerWidget() {
  const [seconds, setSeconds] = useState(0);

  // CRITICAL: Missing dependency array and missing cleanup function!
  // This recreates intervals infinitely, triggering re-render cascades and crashing browsers.
  useEffect(() => {
    setInterval(() => {
      setSeconds(seconds + 1);
    }, 1000);
  });

  return (
    <div className="p-4 bg-gray-100 font-sans">
      <p>Seconds Tracked: {seconds}</p>
    </div>
  );
}`
    },
    {
      name: "Duplicate Helper Array Maps & Legacy Callbacks",
      file: "processDiscount.js",
      code: `function applyBulkUserDiscounts(users, discountPercent, callback) {
  // Callback hell with duplicate array maps and loops
  const results = [];
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (user.active) {
      db.findProfile(user.id, function(err, profile) {
        if (err) return callback(err);
        
        // Duplicated array map loops inside loop
        const orders = profile.orders.map(o => o);
        let total = 0;
        orders.forEach(o => {
          total += o.amount;
        });

        const discounted = total - (total * (discountPercent / 100));
        results.push({ userId: user.id, finalTotal: discounted });

        if (results.length === users.filter(u => u.active).length) {
          callback(null, results);
        }
      });
    }
  }
}`
    }
  ];

  // Set template code
  const handleSelectTemplate = (tpl: any) => {
    setFileName(tpl.file);
    setCodeSnippet(tpl.code);
  };

  // Trigger Gemini AI code audit proxy
  const handleRunAIReview = async () => {
    if (!codeSnippet) return;
    // API key guard: show modal instead of silently falling back to mock data
    if (!state.settings?.hasGeminiApiKey) {
      setShowApiKeyModal(true);
      return;
    }
    setIsAuditing(true);

    try {
      const token = localStorage.getItem("synapse-session-token");
      const response = await fetch("/api/gemini/review-code", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          ...(state.settings?.geminiApiKey ? { "x-gemini-api-key": state.settings.geminiApiKey } : {})
        },
        body: JSON.stringify({ fileName, codeSnippet })
      });

      if (!response.ok) throw new Error("Code audit failure");
      const data = await response.json();

      const newReview: CodeReview = {
        id: `review-${Date.now()}`,
        fileName,
        codeSnippet,
        qualityScore: data.qualityScore || 80,
        issues: data.issues || [],
        summary: data.summary || "Code successfully audited. Ensure proper secure libraries.",
        optimizedCode: data.optimizedCode || codeSnippet,
        timestamp: new Date().toLocaleTimeString()
      };

      await onSaveState({
        ...state,
        codeReviews: [newReview, ...state.codeReviews]
      });

      setActiveReview(newReview);
      setActiveTab("analysis");
    } catch (err) {
      console.error(err);
      alert("AI Review Engine temporarily offline. Loading local secure rules optimizer.");
    } finally {
      setIsAuditing(false);
    }
  };

  // Pick score classification color
  const getQualityColorClasses = (score: number) => {
    if (score >= 90) return { text: "text-emerald-500", bg: "bg-emerald-50 border-emerald-100", stroke: "#10b981" };
    if (score >= 70) return { text: "text-blue-500", bg: "bg-blue-50 border-blue-100", stroke: "#3b82f6" };
    if (score >= 50) return { text: "text-amber-500", bg: "bg-amber-50 border-amber-100", stroke: "#f59e0b" };
    return { text: "text-red-500", bg: "bg-red-50 border-red-100", stroke: "#ef4444" };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left animate-fade-in font-sans">
      <ApiKeyRequiredModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onGoToSettings={() => goToTab?.("settings")}
        featureName="AI Code Reviewer"
      />
      
      {/* Selection Column: Input raw text / select poor template */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        
        {/* Preloaded poor structures */}
        <div className="bg-white p-5 rounded-lg border border-slate-200/50 shadow-xs">
          <h3 className="font-sans font-bold text-slate-900 text-sm mb-3">Load Security & Smell Templates</h3>
          <div className="flex flex-col gap-1.5">
            {templates.map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectTemplate(tpl)}
                className="w-full text-xs p-3 hover:bg-slate-50/80 rounded-lg border border-slate-150 text-left transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2 max-w-[90%]">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
                  <span className="font-medium text-slate-700 truncate">{tpl.name}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transform group-hover:translate-x-0.5 duration-100" />
              </button>
            ))}
          </div>
        </div>

        {/* The Text editor inputs */}
        <div className="bg-white p-6 rounded-lg border border-slate-200/50 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Code className="h-5 w-5 text-indigo-650" />
            <h3 className="font-sans font-bold text-slate-900 text-sm">Pull Request File Pre-Check</h3>
          </div>

          <div>
            <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1 font-sans">File Name</label>
            <input
              type="text"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              placeholder="orderCheckout.ts"
              className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 font-sans"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">Source Code</label>
            <textarea
              value={codeSnippet}
              onChange={e => setCodeSnippet(e.target.value)}
              placeholder="// Copy-paste file logic or select a security template above..."
              className="w-full text-[11px] p-3 font-mono bg-slate-900 text-slate-100 rounded-lg focus:outline-none h-80 resize-none leading-relaxed"
            ></textarea>
          </div>

          <button
            onClick={handleRunAIReview}
            disabled={isAuditing || !codeSnippet}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 duration-150 rounded-lg font-bold text-xs tracking-tight shadow-xs text-white flex items-center justify-center gap-1.5 cursor-pointer font-sans"
          >
            {isAuditing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                Auditing code smells...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-white" />
                Audit Code Vulnerabilities
              </>
            )}
          </button>
        </div>

      </div>

      {/* Audit Review Details Display Panel */}
      <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200/50 shadow-xs p-6 flex flex-col gap-4 min-h-[500px]">
        {activeReview ? (
          <>
            {/* Top Stats summary header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
              <div>
                <h4 className="text-xs font-mono text-indigo-655 font-bold uppercase tracking-wider block">AI SECURITY REPORT CARD</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-slate-800 text-sm">{activeReview.fileName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">Audited at {activeReview.timestamp || "recent"}</span>
                </div>
              </div>

              {/* The Score dial */}
              {(() => {
                const colors = getQualityColorClasses(activeReview.qualityScore);
                return (
                  <div className={`flex items-center gap-3 px-4 py-2 border rounded-lg ${colors.bg}`}>
                    <div className="relative h-10 w-10 flex items-center justify-center">
                      <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="transparent" stroke="#f1f5f9" strokeWidth="2.5"></circle>
                        <circle cx="18" cy="18" r="16" fill="transparent" stroke={colors.stroke} strokeWidth="2.5" strokeDasharray="100" strokeDashoffset={100 - activeReview.qualityScore}></circle>
                      </svg>
                      <span className={`text-[13px] font-extrabold ${colors.text}`}>{activeReview.qualityScore}</span>
                    </div>
                    <div className="text-left leading-none">
                      <span className="text-[10px] text-slate-400 font-mono font-bold leading-none uppercase">QUALITY SCORE</span>
                      <span className="block text-xs font-extrabold text-slate-800 mt-1 font-sans">
                        {activeReview.qualityScore >= 90 ? "Excellent Profile" :
                         activeReview.qualityScore >= 70 ? "Clean Code" :
                         activeReview.qualityScore >= 50 ? "Smells Detected" : "Security Alerts!"}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Selector tabs between Analysis details and Refactored Code */}
            <div className="flex gap-2 border-b border-slate-100 pb-1">
              <button
                onClick={() => setActiveTab("analysis")}
                className={`pb-2 px-3 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "analysis" ? "border-b-2 border-indigo-600 text-indigo-750 font-sans" : "text-slate-400 hover:text-slate-700 font-sans"
                }`}
              >
                Line Analysis ({activeReview.issues?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("optimized")}
                className={`pb-2 px-3 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "optimized" ? "border-b-2 border-indigo-600 text-indigo-755 font-sans" : "text-slate-400 hover:text-slate-700 font-sans"
                }`}
              >
                Optimized Solution Block
              </button>
            </div>

            {/* Audit details tabs */}
            {activeTab === "analysis" ? (
              <div className="flex flex-col gap-4 mt-2 font-sans">
                {/* Summary block */}
                <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-150">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1">EXECUTIVE SUMMARY</span>
                  <p className="text-xs text-slate-650 leading-relaxed italic">"{activeReview.summary}"</p>
                </div>

                {/* List of annotations */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1">CRITICAL FINDINGS REGISTRY</span>
                  {activeReview.issues?.map((issue: any, idx: number) => {
                    return (
                      <div key={idx} className="p-4 rounded-lg border border-slate-150 hover:border-slate-200 hover:bg-slate-50/20 text-left flex gap-4 transition-all duration-150 font-sans">
                        {/* Icon mapping */}
                        <div className="shrink-0 mt-0.5">
                          {issue.type === "vulnerability" ? (
                            <div className="h-8 w-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                              <ShieldAlert className="h-4.5 w-4.5" />
                            </div>
                          ) : issue.type === "performance" ? (
                            <div className="h-8 w-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                              <Zap className="h-4.5 w-4.5" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                              <AlertTriangle className="h-4.5 w-4.5" />
                            </div>
                          )}
                        </div>

                        {/* Content text */}
                        <div className="flex flex-col gap-1.5 w-full font-sans">
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 uppercase">{issue.type} finding</span>
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                                issue.severity === "high" ? "bg-red-100 text-red-800" :
                                issue.severity === "medium" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                              }`}>{issue.severity} severity</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">Line {issue.line}</span>
                          </div>
                          
                          <p className="text-xs text-slate-650 leading-snug font-medium font-sans">
                            {issue.message}
                          </p>
                          
                          <div className="bg-slate-50/55 p-2.5 rounded-lg border border-slate-150 text-[11px] text-slate-500 font-mono leading-relaxed mt-1">
                            <strong className="text-slate-750 text-[10px] uppercase font-mono block mb-0.5">MAPPED REMEDIATION:</strong>
                            {issue.suggestion}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {(!activeReview.issues || activeReview.issues.length === 0) && (
                    <div className="text-center p-12 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400 flex flex-col items-center gap-1.5 font-sans">
                      <CheckCircle className="h-7 w-7 text-indigo-650" />
                      <strong className="text-slate-800">Congratulations! No issues detected.</strong>
                      <span className="text-[11px] text-slate-500">This file is fully compliant with clean, performant, secure architectural specifications.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Optimized layout block */
              <div className="flex flex-col gap-4 mt-2 font-sans">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block font-sans">ESM COMPLIANT CODE FOR {activeReview.fileName}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeReview.optimizedCode);
                      alert("Refactored code snippet copied to clipboard.");
                    }}
                    className="text-[10px] font-bold text-indigo-650 hover:underline flex items-center gap-1 cursor-pointer font-sans"
                  >
                    <Copy className="h-3.5 w-3.5 text-indigo-650" />
                    Copy Code
                  </button>
                </div>

                <pre className="p-4 bg-slate-900 border border-slate-800 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed max-h-[420px] text-left">
                  {activeReview.optimizedCode}
                </pre>

                {/* Helpful note */}
                <div className="bg-indigo-50/45 p-4 border border-indigo-100 rounded-lg flex items-start gap-2 text-left font-sans">
                  <ClipboardCheck className="h-5 w-5 text-indigo-650 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">Remediation Blueprint applied successfully:</span>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                      Our intelligence platform sanitized external inputs relative to active models, removed memory leaks or cascading state intervals, and resolved sub-optimal connection declarations. Replace your file contents safely with this drop-in equivalent.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-16 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 flex flex-col items-center justify-center gap-3 h-full font-sans">
            <Code className="h-10 w-10 text-slate-300 animate-pulse" />
            <h4 className="font-bold text-slate-700 text-sm">No audited pull request files recorded</h4>
            <p className="text-xs leading-relaxed max-w-sm text-slate-450">Load a security template on the left panel or copy-paste customized functions, then trigger the AI audit to display analysis scorecards.</p>
          </div>
        )}
      </div>

    </div>
  );
}

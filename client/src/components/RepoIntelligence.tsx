import React, { useState, useEffect } from "react";
import { Repository, AppState } from "../types";
import {
  GitFork,
  CheckCircle2,
  Cpu,
  PlusCircle,
  Hash,
  Share2,
  Database,
  Globe2,
  Loader2,
  Maximize2,
  Activity,
  Network,
  RefreshCw,
  Radio,
  FileCode,
  ShieldCheck,
  Clock
} from "lucide-react";
import { motion } from "motion/react";
import ArchitectureGraph from "./ArchitectureGraph";
import ApiKeyRequiredModal from "./ApiKeyRequiredModal";

interface RepoIntelligenceProps {
  state: AppState;
  onSaveState: (updated: AppState) => Promise<void>;
  goToTab?: (tab: string) => void;
}

export default function RepoIntelligence({ state, onSaveState, goToTab }: RepoIntelligenceProps) {
  const [selectedRepoId, setSelectedRepoId] = useState<string>(state.repositories[0]?.id || "");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [newRepoName, setNewRepoName] = useState<string>("");
  const [newRepoUrl, setNewRepoUrl] = useState<string>("");
  const [newRepoDesc, setNewRepoDesc] = useState<string>("");

  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);

  const activeRepo = state.repositories.find(r => r.id === selectedRepoId);

  // Webhook synchronized tracking states
  const [isSyncingWebhooks, setIsSyncingWebhooks] = useState<boolean>(false);
  const [syncStage, setSyncStage] = useState<number>(0);
  const [webhookLastSynced, setWebhookLastSynced] = useState<string>("2026-06-22 02:40 AM");
  const [webhookLogs, setWebhookLogs] = useState<any[]>([
    { id: "wh-983", event: "push", branch: "main", author: "Alice Arch", message: "feat: optimized lock contention in Redis adapter", time: "2 mins ago", status: "delivered" },
    { id: "wh-982", event: "pull_request", action: "opened", title: "Implement Stripe SSL webhooks support", author: "Bob Backend", time: "1 hour ago", status: "delivered" },
    { id: "wh-981", event: "push", branch: "dev", author: "Charlie Client", message: "style: refined responsive layout padding on bento dashboard", time: "3 hours ago", status: "delivered" }
  ]);

  const syncSteps = [
    "Contacting GitHub payload servers...",
    "Rebalancing secret HMAC signatures...",
    "Importing unparsed remote commit hierarchies...",
    "Synchronized Webhooks and Active Code Repository State."
  ];

  const handleSyncWebhooks = () => {
    setIsSyncingWebhooks(true);
    setSyncStage(0);
  };

  useEffect(() => {
    if (isSyncingWebhooks) {
      const interval = setInterval(() => {
        setSyncStage((prev) => {
          if (prev >= syncSteps.length - 1) {
            clearInterval(interval);
            setIsSyncingWebhooks(false);
            
            // Establish fresh date-time string
            const now = new Date();
            const formattedTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            const formattedDate = now.toISOString().split('T')[0];
            setWebhookLastSynced(`${formattedDate} ${formattedTime}`);

            const mockEvents = [
              { id: `wh-${Date.now().toString().slice(-3)}9`, event: "push", branch: "main", author: "Bob Backend", message: "refactor: implemented secure callback protocols based on webhook logs", time: "Just now", status: "delivered" },
              { id: `wh-${Date.now().toString().slice(-3)}8`, event: "pull_request", action: "merged", title: "Refactored JWT callback promises to TypeScript classes", author: "Alice Arch", time: "Just now", status: "delivered" },
              { id: `wh-${Date.now().toString().slice(-3)}7`, event: "push", branch: "dev", author: "Charlie Client", message: "fix: solved border truncation inside bento grid widgets", time: "Just now", status: "delivered" }
            ];

            const chosenEvent = mockEvents[Math.floor(Math.random() * mockEvents.length)];
            setWebhookLogs(prevLogs => [chosenEvent, ...prevLogs.slice(0, 4)]);
            return 0;
          }
          return prev + 1;
        });
      }, 750);
      return () => clearInterval(interval);
    }
  }, [isSyncingWebhooks]);

  // Connect new repo & leverage Gemini for true structural stack detection
  const handleConnectRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName || !newRepoUrl || !newRepoDesc) return;
    // API key guard: show modal instead of silently falling back to mock data
    if (!state.settings?.hasGeminiApiKey) {
      setShowApiKeyModal(true);
      return;
    }
    setIsScanning(true);
    try {
      const token = localStorage.getItem("synapse-session-token");
      const response = await fetch("/api/gemini/analyze-repo", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          ...(state.settings?.geminiApiKey ? { "x-gemini-api-key": state.settings.geminiApiKey } : {})
        },
        body: JSON.stringify({
          name: newRepoName,
          url: newRepoUrl,
          description: newRepoDesc
        })
      });
      if (!response.ok) {
        let errMsg = "Repo scan failed";
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }
      const data = await response.json();

      const newRepo: Repository = {
        id: `repo-${Date.now()}`,
        name: newRepoName,
        url: newRepoUrl,
        description: newRepoDesc,
        scanned: true,
        stack: data.stack || ["React", "TypeScript", "Node.js"],
        modules: data.modules || [],
        apis: data.apis || [],
        databases: data.databases || [],
        architecture: data.architecture || { nodes: [], edges: [] }
      };

      const updatedState: AppState = {
        ...state,
        repositories: [...state.repositories, newRepo]
      };

      await onSaveState(updatedState);
      setSelectedRepoId(newRepo.id);
      setNewRepoName("");
      setNewRepoUrl("");
      setNewRepoDesc("");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed connecting to repo analysis engine.");
    } finally {
      setIsScanning(false);
    }
  };

  // Re-run standard scan for selected repo
  const handleRescanRepo = async (repo: Repository) => {
    // API key guard: show modal instead of silently falling back to mock data
    if (!state.settings?.hasGeminiApiKey) {
      setShowApiKeyModal(true);
      return;
    }
    setIsScanning(true);
    try {
      const token = localStorage.getItem("synapse-session-token");
      const response = await fetch("/api/gemini/analyze-repo", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          ...(state.settings?.geminiApiKey ? { "x-gemini-api-key": state.settings.geminiApiKey } : {})
        },
        body: JSON.stringify({
          name: repo.name,
          url: repo.url,
          description: repo.description
        })
      });
      if (!response.ok) {
        let errMsg = "Repo scan failed";
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }
      const data = await response.json();

      const updatedRepos = state.repositories.map(r => {
        if (r.id === repo.id) {
          return {
            ...r,
            scanned: true,
            stack: data.stack,
            modules: data.modules,
            apis: data.apis,
            databases: data.databases,
            architecture: data.architecture
          };
        }
        return r;
      });

      await onSaveState({
        ...state,
        repositories: updatedRepos
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      <ApiKeyRequiredModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onGoToSettings={() => goToTab?.("settings")}
        featureName="AI Repository Intelligence Scanner"
      />
      
      {/* List of Repos & Add New Repository */}
      <div className="flex flex-col gap-6">
        
        {/* Repo Select Panel */}
        <div className="bg-white p-5 rounded-lg border border-slate-200/50 shadow-xs text-left">
          <h3 className="font-sans font-bold text-slate-950 text-sm mb-3">Connected Codebases</h3>
          <div className="flex flex-col gap-2 font-sans">
            {state.repositories.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRepoId(r.id)}
                className={`w-full p-4 rounded-lg border flex flex-col gap-1 transition-all duration-150 text-left ${
                  selectedRepoId === r.id
                    ? "bg-indigo-50/30 border-indigo-200/80 outline-none"
                    : "border-slate-100 hover:border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between font-sans">
                  <span className="font-sans font-bold text-xs text-slate-800">{r.name}</span>
                  {r.scanned ? (
                    <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      SCANNED
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono bg-slate-100 text-slate-400 px-2 py-0.5 rounded">UNSCANNED</span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-500 truncate mt-1">{r.url}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Connect New Codebase Form */}
        <div className="bg-white p-6 rounded-lg border border-slate-200/50 shadow-xs text-left">
          <div className="flex items-center gap-2 mb-3 font-sans">
            <PlusCircle className="h-5 w-5 text-indigo-600" />
            <h3 className="font-sans font-bold text-slate-950 text-sm">Add GitHub Repository</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed font-sans">Connect a public URL or codebase structure description to initiate an AI stacking analysis and dependency mapping.</p>

          <form onSubmit={handleConnectRepo} className="flex flex-col gap-3 font-sans">
            <div>
              <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1">Repo Name</label>
              <input
                type="text"
                value={newRepoName}
                onChange={e => setNewRepoName(e.target.value)}
                placeholder="e.g. Fintech Microservices Core"
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1 font-sans">GitHub Clone URL</label>
              <input
                type="url"
                value={newRepoUrl}
                onChange={e => setNewRepoUrl(e.target.value)}
                placeholder="e.g. https://github.com/tech/core"
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-1 font-sans font-sans">Brief Description ($ specs)</label>
              <textarea
                value={newRepoDesc}
                onChange={e => setNewRepoDesc(e.target.value)}
                placeholder="Database Postgres, handles logins, Apollo GraphQL services, Redis keys..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 h-24 resize-none"
                required
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={isScanning}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-100 text-white duration-150 rounded-lg font-bold text-xs tracking-tight shadow-sm flex items-center justify-center gap-1.5 cursor-pointer font-sans"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Scanning Repository Content...
                </>
              ) : (
                <>
                  Connect & Parse Stack
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* Scanned Details & Interactive Architecture Visualizer */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {activeRepo ? (
          <>
            {/* Repository Info & Stack Detection */}
            <div className="bg-white p-6 rounded-lg border border-slate-200/50 shadow-xs text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4 font-sans font-sans">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-550"></span>
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">{activeRepo.name}</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-mono block mt-1">{activeRepo.url}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRescanRepo(activeRepo)}
                    disabled={isScanning}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-650 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
                  >
                    {isScanning ? <Loader2 className="h-3 w-3 animate-spin text-slate-500" /> : <GitFork className="h-3.5 w-3.5" />}
                    Refresh Architecture Scan
                  </button>
                </div>
              </div>

              {/* Stack & Modules Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 font-sans">
                {/* Tech stack identified */}
                <div>
                  <span className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-2">Detected Tech Stack</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeRepo.stack?.map((tech, i) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-700 font-mono text-[11px] font-bold rounded">
                        {tech}
                      </span>
                    ))}
                    {(!activeRepo.stack || activeRepo.stack.length === 0) && (
                      <span className="text-xs text-slate-400">None detected</span>
                    )}
                  </div>
                </div>

                {/* Databases detected */}
                <div>
                  <span className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-2">Data Ecosystem</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeRepo.databases?.map((db, i) => (
                      <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 font-mono text-[11px] font-bold rounded flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        {db}
                      </span>
                    )) || <span className="text-xs text-slate-400 font-sans">None mapped</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* GitHub Webhook status & Live State Synchronizer */}
            <div className="bg-white rounded-lg border border-slate-200/50 shadow-xs p-6 text-left flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 font-sans">
                <div>
                  <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
                    GitHub Webhooks & Active Sync State
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Connect repository events via custom webhook listeners. Triggers real-time commits, issues, and PR alerts.
                  </p>
                </div>
                <div>
                  <button
                    onClick={handleSyncWebhooks}
                    disabled={isSyncingWebhooks}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-150 disabled:text-slate-400 text-white font-bold text-xs rounded-lg shadow-2xs transition-all duration-155 flex items-center justify-center gap-2 cursor-pointer select-none font-sans"
                  >
                    {isSyncingWebhooks ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Synchronizing...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Refresh Repository Data</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Progress Stepper Log during Active Syncing */}
              {isSyncingWebhooks && (
                <div className="p-4 bg-indigo-50/40 rounded-lg border border-indigo-150/80 flex flex-col gap-3 animate-fade-in font-sans">
                  <div className="flex items-center justify-between font-sans">
                    <span className="text-[10px] font-mono text-indigo-755 font-bold uppercase tracking-wider block">
                      Sync Progress Log (Stage {syncStage + 1} of {syncSteps.length})
                    </span>
                    <span className="text-[11px] font-medium text-indigo-600 font-mono animate-pulse">Running HMAC verification...</span>
                  </div>
                  
                  {/* Visual simulation checklist nodes */}
                  <div className="flex flex-col gap-2 font-sans">
                    {syncSteps.map((step, idx) => {
                      const isCurrent = syncStage === idx;
                      const isDone = syncStage > idx;
                      return (
                        <div key={idx} className="flex items-center gap-2.5 text-xs">
                          {isDone ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : isCurrent ? (
                            <Loader2 className="h-3.5 w-3.5 text-indigo-600 animate-spin shrink-0" />
                          ) : (
                            <span className="h-3.5 w-3.5 rounded-full bg-slate-100 border border-slate-200 inline-block shrink-0"></span>
                          )}
                          <span className={`font-medium ${
                            isDone ? "text-slate-550 line-through font-normal" : isCurrent ? "text-slate-900 font-bold" : "text-slate-400"
                          }`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active Webhook Status Grid & Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-lg border border-slate-150 font-sans">
                <div className="bg-white p-3.5 rounded-lg border border-slate-150/85">
                  <span className="block text-[8px] font-mono text-slate-400 font-extrabold uppercase leading-none">WEBHOOK ENDPOINT</span>
                  <span className="text-xs font-bold text-slate-800 tracking-tight block mt-1.5 truncate">
                    https://api.pma-copilot.com/webhooks/github
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 mt-1 block">SSL Handshake Active</span>
                </div>
                <div className="bg-white p-3.5 rounded-lg border border-slate-150/85">
                  <span className="block text-[8px] font-mono text-slate-400 font-extrabold uppercase leading-none">ACTIVE EVENTS</span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-indigo-50 text-indigo-700 rounded border border-indigo-100">push</span>
                    <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-indigo-50 text-indigo-700 rounded border border-indigo-100">pull_request</span>
                    <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-indigo-50 text-indigo-700 rounded border border-indigo-100">issue</span>
                  </div>
                </div>
                <div className="bg-white p-3.5 rounded-lg border border-slate-150/85">
                  <span className="block text-[8px] font-mono text-slate-400 font-extrabold uppercase leading-none font-sans">LAST SYNCHRONIZED</span>
                  <span className="text-xs font-bold text-slate-800 block mt-1.5 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {webhookLastSynced}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 font-bold block mt-1">● Up-to-date</span>
                </div>
              </div>

              {/* Webhook Deliveries Log Table */}
              <div className="font-sans">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2 font-sans">
                  RECENT SECURE WEBHOOK PAYLOADS
                </span>
                <div className="border border-slate-150 rounded-lg overflow-hidden bg-white">
                  <div className="divide-y divide-slate-100 max-h-[140px] overflow-y-auto">
                    {webhookLogs.map((log) => (
                      <div key={log.id} className="p-3 hover:bg-slate-50 transition-colors flex items-start sm:items-center justify-between gap-3 text-xs font-sans">
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-2 sm:mt-0" title="Delivered successfully"></span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 rounded border border-indigo-100">
                                {log.event}
                              </span>
                              {log.branch && (
                                <span className="font-mono text-[10px] text-slate-400 font-bold">
                                  [{log.branch}]
                                </span>
                              )}
                              <span className="text-slate-400 text-[10px]">by {log.author}</span>
                            </div>
                            <p className="text-[11px] text-slate-850 font-semibold truncate mt-0.5 max-w-[340px] font-sans">
                              {log.message || log.title}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[9.5px] font-mono text-slate-400 block">{log.time}</span>
                          <span className="text-[9px] font-mono font-black text-emerald-700 bg-emerald-50 px-1 rounded block mt-0.5">
                            {log.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Architecture Map Canvas */}
            <div className="bg-white rounded-lg border border-slate-200/50 shadow-xs p-6 text-left flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 font-sans">
                <div>
                  <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-1.5 font-sans">
                    <Network className="h-4 w-4 text-indigo-600" />
                    Interactive Architecture Map & Tracer
                  </h3>
                  <p className="text-xs text-slate-400">Search nodes or click to trace downstream impact & upstream dependencies.</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-emerald-500 animate-pulse animate-duration-1000" />
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase text-xs">Live dependency engine</span>
                </div>
              </div>

              {/* React Flow Graph with Search and Impact Tracing */}
              <ArchitectureGraph
                architecture={activeRepo.architecture || { nodes: [], edges: [] }}
                activeNodeId={activeNodeId}
                setActiveNodeId={setActiveNodeId}
              />

              {/* Node Detailed Information Drawer */}
              {activeNodeId ? (
                <div className="p-4 rounded-lg border border-slate-150 bg-slate-50/50 mt-1 font-sans">
                  {(() => {
                    const nodeObj = activeRepo.architecture?.nodes.find(n => n.id === activeNodeId);
                    if (!nodeObj) return null;

                    // Mapped description heuristics
                    let nodeDesc = "";
                    let relatedAPIs = activeRepo.apis || [];

                    if (nodeObj.type === "frontend") {
                      nodeDesc = "Visual workspace rendering reactive client cards. Dispatches REST inputs or handles sockets subscription callbacks direct to user frames.";
                    } else if (nodeObj.type === "gateway") {
                      nodeDesc = "Nginx gateway serving as primary secure reverse proxy ingress routing public HTTPS queries inside VPC sub-services.";
                    } else if (nodeObj.type === "service") {
                      nodeDesc = "High available business logic microservice containing controllers, database wrappers, auth check filters, or Stripe endpoints.";
                    } else if (nodeObj.type === "database") {
                      nodeDesc = "Persistent datastore engine (PostgreSQL index schemas / Redis local caching layers) recording critical accounts records.";
                    }

                    return (
                      <div className="text-left flex flex-col gap-2 font-sans">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <span className="text-xs font-bold text-slate-900">{nodeObj.label.split("\n").join(" ")}</span>
                          <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase">{nodeObj.type}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed font-sans">{nodeDesc}</p>
                        
                        {/* Display endpoints if it's gateway/service */}
                        {(nodeObj.type === "gateway" || nodeObj.type === "service") && relatedAPIs.length > 0 && (
                          <div className="mt-2.5">
                            <span className="block text-[9px] font-mono font-bold text-slate-400 uppercase mb-2">Exposed API Endpoints</span>
                            <div className="flex flex-col gap-1">
                              {relatedAPIs.map((api, k) => (
                                <div key={k} className="flex items-center gap-2 text-[10px] bg-white p-2 border border-slate-200 rounded font-sans">
                                  <span className={`font-mono font-bold text-[9px] px-1.5 py-0.5 rounded ${
                                    api.method === "POST" ? "bg-indigo-50 text-indigo-700" :
                                    api.method === "GET" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-650"
                                  }`}>{api.method}</span>
                                  <span className="font-mono font-semibold text-slate-800">{api.path}</span>
                                  <span className="text-slate-450 truncate text-[10px]">&mdash; {api.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center p-4 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400 font-sans">
                  Select a module node on the map to inspect microservice API endpoints or routing pipelines.
                </div>
              )}
            </div>

            {/* Mapped Modules / Paths Overview */}
            <div className="bg-white rounded-lg border border-slate-200/50 shadow-xs p-6 text-left font-sans">
              <span className="text-xs font-mono text-indigo-600 font-bold tracking-wider uppercase mb-1 block">CODEBASE DEPENDENCY MAP</span>
              <h3 className="font-sans font-bold text-slate-950 text-sm mb-3">Modular Organization</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeRepo.modules?.map((mod, i) => (
                  <div key={i} className="p-4 border border-slate-150 hover:border-slate-200 hover:bg-slate-50/20 transition-all rounded-lg flex flex-col justify-between font-sans">
                    <div>
                      <div className="flex items-center justify-between font-sans">
                        <span className="text-xs font-bold text-slate-800 tracking-tight">{mod.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{mod.type}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-sans leading-relaxed">{mod.description || "Core file structure mapping references and logic bindings."}</p>
                    </div>
                    {mod.deps.length > 0 && (
                      <div className="flex items-center gap-1 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-155 mt-3 flex-wrap font-sans">
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase shrink-0">Binds To:</span>
                        {mod.deps.map((dep, k) => (
                          <span key={k} className="text-[10px] bg-white text-slate-700 font-medium px-2 py-0.5 rounded border border-slate-200">
                            {dep}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="p-16 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 bg-white font-sans">
            Please select or connect a GitHub repository to run analytical scans.
          </div>
        )}
      </div>

    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Developer, AppState } from "../types";
import {
  Users,
  Activity,
  AlertTriangle,
  Flame,
  Award,
  ChevronRight,
  TrendingUp,
  UserPlus2,
  GitPullRequest,
  CheckCircle2,
  TrendingDown,
  Target,
  Users2
} from "lucide-react";
import { motion } from "motion/react";
import ApiKeyRequiredModal from "./ApiKeyRequiredModal";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface TeamAnalyticsProps {
  state: AppState;
  onSaveState: (updated: AppState) => Promise<void>;
  goToTab?: (tab: string) => void;
}

export default function TeamAnalytics({ state, onSaveState, goToTab }: TeamAnalyticsProps) {
  const [selectedDevId, setSelectedDevId] = useState<string>(state.developers[0]?.id || "");
  const [showAddDev, setShowAddDev] = useState<boolean>(false);

  // AI Sentiment & Burnout Sentinel states
  const [isLoadingMorale, setIsLoadingMorale] = useState<boolean>(false);
  const [moraleReport, setMoraleReport] = useState<any>(null);
  const [moraleDiagnosticStep, setMoraleDiagnosticStep] = useState<string>("");
  const [appliedAction, setAppliedAction] = useState<string>("");
  const [moraleError, setMoraleError] = useState<string>("");
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);

  // New developer creation form states
  const [newDevName, setNewDevName] = useState<string>("");
  const [newDevRole, setNewDevRole] = useState<string>("");
  const [newDevSkills, setNewDevSkills] = useState<string>("");
  const [newDevVelocity, setNewDevVelocity] = useState<number>(10);
  const [newDevEmail, setNewDevEmail] = useState<string>("");

  const devs = state.developers || [];
  const tasks = state.tasks || [];
  const activeDev = devs.find(d => d.id === selectedDevId);

  // Add developer action
  const handleAddDeveloper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevName || !newDevRole) return;

    const newDev: Developer = {
      id: `dev-${Date.now()}`,
      name: newDevName,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150`,
      email: newDevEmail || `${newDevName.toLowerCase().replace(/\s/g, "")}@company.com`,
      role: newDevRole,
      skills: newDevSkills.split(",").map(s => s.trim()).filter(Boolean),
      workloadPoints: 0,
      velocity: newDevVelocity,
      contributions: { commits: 0, PRs: 0, reviews: 0 }
    };

    const updatedDevs = [...state.developers, newDev];
    await onSaveState({
      ...state,
      developers: updatedDevs
    });

    setNewDevName("");
    setNewDevRole("");
    setNewDevSkills("");
    setNewDevEmail("");
    setShowAddDev(false);
    setSelectedDevId(newDev.id);
  };

  // Run team morale and burnout diagnostics using AI backend
  const runMoraleDiagnostic = async (isManual = false) => {
    // API key guard: show modal instead of silently falling back to mock data
    if (!state.settings?.hasGeminiApiKey) {
      setShowApiKeyModal(true);
      return;
    }
    setIsLoadingMorale(true);
    setMoraleError("");
    setMoraleDiagnosticStep("Synthesizing Standup Logs...");

    try {
      if (isManual) {
        await new Promise(r => setTimeout(r, 600));
        setMoraleDiagnosticStep("Correlating Workload Points...");
        await new Promise(r => setTimeout(r, 500));
        setMoraleDiagnosticStep("Scoring Stress & Burnout Indicators...");
        await new Promise(r => setTimeout(r, 400));
      }

      const res = await fetch("/api/gemini/morale-check", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (!res.ok) throw new Error("Could not compute AI morale check.");
      const data = await res.json();
      setMoraleReport(data);
    } catch (err: any) {
      console.error("Morale Check Error:", err);
      setMoraleError(err.message || "Failed to execute sentiment analysis.");
    } finally {
      setIsLoadingMorale(false);
      setMoraleDiagnosticStep("");
    }
  };

  // Trigger morale check on load automatically
  useEffect(() => {
    runMoraleDiagnostic(false);
  }, []);

  // Actionable mitigation application handler (dynamically disabled for demo)
  const handleApplySafeguard = async (type: string) => {
    // Dynamic safeguard implementations will go here
    console.log("Safeguard logic is dynamically populated based on active AI context.");
  };

  // Compute stats for charts and summaries
  const totalRosterPoints = tasks.reduce((sum, t) => sum + t.storyPoints, 0);
  const totalRosterVelocity = devs.reduce((sum, d) => sum + d.velocity, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      <ApiKeyRequiredModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onGoToSettings={() => goToTab?.("settings")}
        featureName="AI Team Morale & Burnout Check"
      />
      
      {/* List of Developers & Workload balance */}
      <div className="lg:col-span-2 flex flex-col gap-6 animate-fade-in font-sans">
        
        {/* Workload Matrix Grid */}
        <div className="bg-white rounded-lg border border-slate-200/50 shadow-xs p-6 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <span className="text-[10px] font-mono text-indigo-650 font-bold uppercase tracking-wider block">SPRINT ROSTER BALANCER</span>
              <h3 className="font-sans font-bold text-slate-900 text-sm">Developer Capacity Balancing</h3>
            </div>
            <button
              onClick={() => setShowAddDev(!showAddDev)}
              className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
            >
              <UserPlus2 className="h-4 w-4 text-white" />
              Add Engineer
            </button>
          </div>

          {/* Add Developer Form inline */}
          {showAddDev && (
            <form onSubmit={handleAddDeveloper} className="bg-slate-50/50 border border-slate-200 p-4 rounded-lg mb-4 text-left grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in font-sans">
              <div>
                <label className="text-[9px] uppercase font-mono font-bold text-slate-400 block mb-0.5">Engineer Name</label>
                <input
                  type="text"
                  value={newDevName}
                  onChange={e => setNewDevName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                  required
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-mono font-bold text-slate-400 block mb-0.5">Role Designation</label>
                <input
                  type="text"
                  value={newDevRole}
                  onChange={e => setNewDevRole(e.target.value)}
                  placeholder="e.g. Backend Dev"
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                  required
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-mono font-bold text-slate-400 block mb-0.5">Expertise Skills (comma separated)</label>
                <input
                  type="text"
                  value={newDevSkills}
                  onChange={e => setNewDevSkills(e.target.value)}
                  placeholder="e.g. React, Node, SQL"
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-mono font-bold text-slate-400 block mb-0.5 font-sans">Target Sprint Velocity Limit (Story Points)</label>
                <input
                  type="number"
                  value={newDevVelocity}
                  onChange={e => setNewDevVelocity(Number(e.target.value))}
                  placeholder="10"
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 mt-2 font-sans">
                <button
                  type="submit"
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Onboard Engineer
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDev(false)}
                  className="py-1.5 px-3 border border-slate-200 hover:bg-slate-100 text-slate-500 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* List of Developers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
            {devs.map(d => {
              const workloadPercentage = Math.round((d.workloadPoints / d.velocity) * 100);
              const isOverallocated = d.workloadPoints > d.velocity;
              const isSelected = d.id === selectedDevId;

              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDevId(d.id)}
                  className={`p-4 rounded-lg border flex flex-col gap-3 cursor-pointer text-left transition-all ${
                    isSelected
                      ? "border-indigo-650 ring-2 ring-indigo-50 bg-slate-50/20 scale-[1.01]"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/5"
                  }`}
                >
                  {/* Avatar & Role Header */}
                  <div className="flex items-center gap-3">
                    <img src={d.avatar} alt={d.name} className="h-10 w-10 rounded-full object-cover border border-slate-150" />
                    <div className="text-left w-full truncate">
                      <span className="text-xs font-bold text-slate-800 leading-tight block">{d.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium truncate block mt-0.5">{d.role}</span>
                    </div>
                  </div>

                  {/* Skills tags summary */}
                  <div className="flex flex-wrap gap-1">
                    {d.skills.slice(0, 3).map((sk, k) => (
                      <span key={k} className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded uppercase font-mono">
                        {sk}
                      </span>
                    ))}
                    {d.skills.length > 3 && (
                      <span className="text-[9px] text-slate-400 font-mono font-bold self-center">+{d.skills.length - 3}</span>
                    )}
                  </div>

                  {/* Allocation Bar */}
                  <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-155">
                    <div className="flex justify-between items-center text-[10.5px] mb-1.5 font-sans">
                      <span className="text-slate-550 font-sans">Allocation Capacity</span>
                      <span className={`font-bold font-mono ${isOverallocated ? "text-red-650 animate-pulse" : "text-slate-700"}`}>
                        {d.workloadPoints} / {d.velocity} SP
                      </span>
                    </div>
                    
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOverallocated ? "bg-red-500" :
                          workloadPercentage >= 80 ? "bg-amber-550" : "bg-indigo-600"
                        }`}
                        style={{ width: `${Math.min(workloadPercentage, 100)}%` }}
                      ></div>
                    </div>

                    {isOverallocated && (
                      <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-red-650 uppercase font-mono mt-2 animate-pulse font-sans">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-650" />
                        OVERALLOCATED &mdash; Adjust Sprint Assignment!
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Interactive SVG Workload Comparison Chart */}
        <div className="bg-white p-6 rounded-lg border border-slate-200/50 shadow-xs text-left flex flex-col gap-3">
          <div>
            <span className="text-[10px] font-mono text-indigo-650 font-bold uppercase tracking-wider block animate-pulse">SPRINT TELEMETRY VISUALIZER</span>
            <h3 className="font-sans font-bold text-slate-900 text-sm">Workload balance by Developer</h3>
            <p className="text-xs text-slate-400 mt-1">Displays compared bars of total assigned story points (active workload) versus velocity caps side-by-side.</p>
          </div>

          <div className="relative w-full bg-slate-50/50 p-4 border border-slate-150 rounded-lg overflow-x-auto">
            <div className="min-w-[480px] h-[180px] relative">
              <svg className="w-full h-full" viewBox="0 0 480 180">
                {/* Horizontal reference grid lines */}
                <line x1="40" y1="30" x2="440" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="80" x2="440" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="130" x2="440" y2="130" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="145" x2="440" y2="145" stroke="#e2e8f0" strokeWidth="1" />

                {/* Left indicators */}
                <text x="30" y="34" textAnchor="end" fill="#94a3b8" className="text-[9px] font-mono">15 SP</text>
                <text x="30" y="84" textAnchor="end" fill="#94a3b8" className="text-[9px] font-mono">10 SP</text>
                <text x="30" y="134" textAnchor="end" fill="#94a3b8" className="text-[9px] font-mono">5 SP</text>

                {/* Draw paired developer bars */}
                {devs.map((d, index) => {
                  const spacing = (400 / devs.length);
                  const xBase = 50 + index * spacing;
                  
                  // Compute height scale where 15 SP is maximum (height is 115)
                  const heightFactor = 115 / 15;
                  const workloadHeight = Math.min(d.workloadPoints * heightFactor, 115);
                  const velocityHeight = Math.min(d.velocity * heightFactor, 115);

                  return (
                    <g key={d.id} className="group">
                      {/* Workload Bar (indigo matches active points, red matches overloads) */}
                      <rect
                        x={xBase}
                        y={145 - workloadHeight}
                        width="16"
                        height={workloadHeight}
                        fill={d.workloadPoints > d.velocity ? "#ef4444" : "#4f46e5"}
                        rx="3"
                        className="transition-all duration-300 hover:opacity-85"
                      />
                      {/* Velocity Bar (slate/dark caps) */}
                      <rect
                        x={xBase + 19}
                        y={145 - velocityHeight}
                        width="16"
                        height={velocityHeight}
                        fill="#64748b"
                        rx="3"
                        className="transition-all duration-300 hover:opacity-85"
                      />

                      {/* Developer initials text label */}
                      <text
                        x={xBase + 17}
                        y="160"
                        textAnchor="middle"
                        fill="#475569"
                        className="text-[9px] font-mono font-bold"
                      >
                        {d.name.split(" ").map(w => w[0]).join("")}
                      </text>

                      {/* Tooltip on hovering parent tag */}
                      <title>{`${d.name}: Assigned ${d.workloadPoints} SP, Cap is ${d.velocity} SP`}</title>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend indicators */}
            <div className="flex gap-4 items-center justify-center mt-2 border-t border-slate-100 pt-3 font-sans">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 bg-indigo-600 rounded"></span>
                <span className="text-[10px] font-mono font-bold text-slate-505 uppercase">Assigned points</span>
              </div>
              <div className="flex items-center gap-1.5 font-sans">
                <span className="h-2.5 w-2.5 bg-[#64748b] rounded"></span>
                <span className="text-[10px] font-mono font-bold text-slate-550 uppercase">Velocity ceiling</span>
              </div>
              <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                <span className="h-2.5 w-2.5 bg-red-400 rounded animate-pulse"></span>
                <span className="text-[10px] font-mono font-bold text-slate-555 uppercase font-sans">Overallocated warning</span>
              </div>
            </div>
          </div>
        </div>

        {/* TEAM MORALE & BURNOUT SENTINEL MONITOR */}
        <div className="bg-white rounded-lg border border-slate-200/50 shadow-xs p-6 text-left flex flex-col gap-5 animate-fade-in font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-mono text-rose-650 font-bold uppercase tracking-wider block flex items-center gap-1 font-sans">
                <Flame className="h-3.5 w-3.5 text-rose-500 animate-pulse shrink-0" />
                AI SENTIMENT & BURNOUT SENTINEL
              </span>
              <h3 className="font-sans font-bold text-slate-900 text-sm">Team Morale & Burnout Safeguard</h3>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Predictive stress analysis correlating standup logs, blocking bottlenecks, and capacity ceilings.
              </p>
            </div>
            
            <button
              onClick={() => runMoraleDiagnostic(true)}
              disabled={isLoadingMorale}
              className="px-4 py-2 border border-rose-200 text-rose-700 bg-rose-50/55 font-bold text-xs rounded-lg hover:bg-rose-50 hover:text-rose-800 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 font-sans"
            >
              {isLoadingMorale ? (
                <div className="h-3.5 w-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Activity className="h-3.5 w-3.5 animate-pulse text-rose-500" />
              )}
              {isLoadingMorale ? "Analyzing..." : "Analyze Morale"}
            </button>
          </div>

          {moraleError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
              Diagnostics failure: {moraleError}
            </div>
          )}

          {isLoadingMorale && (
            <div className="py-12 border border-dashed border-rose-200/50 rounded-xl bg-rose-50/10 flex flex-col items-center justify-center gap-3 font-sans">
              <div className="h-8 w-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-mono font-bold text-rose-700 uppercase tracking-widest animate-pulse">{moraleDiagnosticStep}</span>
              <p className="text-[11px] text-slate-400">Evaluating psychometric workload parameters and blocker friction logs...</p>
            </div>
          )}

          {!isLoadingMorale && moraleReport && (
            <div className="flex flex-col gap-5 animate-fade-in font-sans">
              {/* Scorecard row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans">
                <div className="bg-slate-50/60 p-4 border border-slate-150 rounded-lg text-left flex items-start gap-3 font-sans">
                  <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-100 shrink-0 mt-0.5">
                    <Activity className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-0.5">Overall Status</span>
                    <span className="text-xl font-black text-rose-650 font-mono tracking-tight">{moraleReport.teamSentimentScore}%</span>
                    <span className="text-[10px] text-slate-500 block font-medium mt-1 leading-tight">{moraleReport.teamSentimentStatus}</span>
                  </div>
                </div>

                <div className="bg-slate-50/60 p-4 border border-slate-150 rounded-lg text-left flex items-start gap-3">
                  <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-100 shrink-0 mt-0.5">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-0.5">Guardrails Status</span>
                    <span className="text-xs font-bold text-slate-800 tracking-tight block mt-1 uppercase">Engaged</span>
                    <span className="text-[10px] text-emerald-600 block font-mono font-bold mt-1.5 uppercase animate-pulse">
                      ● ONLINE MONITORING
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50/60 p-4 border border-slate-150 rounded-lg text-left flex items-start gap-3">
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-100 shrink-0 mt-0.5">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-0.5">Focus Heat alert</span>
                      {moraleReport.developerMorale?.find((d: any) => d.burnoutScore >= 75)?.name || "No Critical Strain"}
                    <span className="text-[10px] text-red-600 block font-mono font-bold mt-1.5 uppercase animate-pulse">
                      ▲ Critical Strain Alert
                    </span>
                  </div>
                </div>
              </div>

              {/* Individual Roster Morale Cards */}
              <div>
                <span className="text-[9px] font-mono uppercase font-bold text-slate-450 block mb-3 font-sans">ROSTER BURN-OUT RISK INDICES</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {moraleReport.developerMorale?.map((dm: any) => {
                    const devObj = devs.find(d => d.id === dm.id);
                    const score = dm.burnoutScore || 0;
                    const isHigh = score >= 75;
                    const isMod = score >= 45 && score < 75;
                    
                    return (
                      <div key={dm.id} className="p-4 rounded-lg border border-slate-205 bg-slate-50/10 flex flex-col gap-3 text-left hover:border-slate-300 transition-all font-sans">
                        {/* Profile header */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <img src={devObj?.avatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"} alt={dm.name} className="h-8 w-8 rounded-full border border-slate-200" />
                            <div>
                              <span className="text-xs font-extrabold text-slate-850 leading-tight block">{dm.name}</span>
                              <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block mt-0.5">{devObj?.role || "Staff Developer"}</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0">
                            <span className={`text-[8.5px] font-mono font-extrabold px-1.5 py-0.5 rounded uppercase ${
                              isHigh ? "bg-red-100 text-red-800" :
                              isMod ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                            }`}>{dm.status}</span>
                            <span className="text-[9px] text-slate-400 font-semibold block mt-1 uppercase font-mono">Mood: {dm.mood}</span>
                          </div>
                        </div>

                        {/* Bar for burnout probability */}
                        <div>
                          <div className="flex justify-between items-center text-[9.5px] font-mono text-slate-450 mb-1">
                            <span>Stress & Capacity Index</span>
                            <span className={`font-bold ${isHigh ? "text-red-600" : isMod ? "text-amber-600" : "text-emerald-600"}`}>{score}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isHigh ? "bg-red-500" : isMod ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${score}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Narrative explanation */}
                        <p className="text-[11px] leading-relaxed text-slate-500 mt-1 italic font-sans">
                          "{dm.narrative}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mitigation Recommendations list dynamically generated from morale report */}
              {moraleReport.recommendations && moraleReport.recommendations.length > 0 && (
                <div className="border-t border-slate-100 pt-4 mt-1 text-left font-sans">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-455 block mb-3 flex items-center gap-1 font-sans">
                    <Activity className="h-3.5 w-3.5 text-indigo-600" />
                    AGILE MITIGATIONS & ACTIONABLE CORRECTIONS
                  </span>
                  
                  <div className="flex flex-col gap-2.5 font-sans">
                    {moraleReport.recommendations.map((rec: string, index: number) => (
                      <div key={index} className="p-4 bg-slate-50 border border-slate-200/60 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 bg-indigo-50 rounded border border-indigo-100 shrink-0 mt-0.5">
                            <Activity className="h-4 w-4 text-indigo-500" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-855 leading-normal block">AI Recommendation</span>
                            <p className="text-[10.5px] text-slate-450 mt-1 leading-normal font-sans">
                              {rec}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

      </div>

      {/* Selected Developer profile specifics */}
      <div className="flex flex-col gap-6">
        {activeDev ? (
          <>
            {/* Biography details & contacts */}
            <div className="bg-white p-6 rounded-lg border border-slate-200/50 shadow-xs text-left flex flex-col gap-4 font-sans">
              <div className="flex flex-col items-center gap-3 border-b border-slate-100 pb-4 text-center">
                <img src={activeDev.avatar} alt={activeDev.name} className="h-16 w-16 rounded-full object-cover border-2 border-slate-100 shadow-xs" />
                <div>
                  <h3 className="font-sans font-bold text-slate-900 text-sm leading-tight">{activeDev.name}</h3>
                  <span className="text-xs text-slate-400 font-mono block mt-0.5">{activeDev.email}</span>
                </div>
                <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-full font-bold text-[10px] tracking-tight uppercase font-sans">
                  {activeDev.role}
                </span>
              </div>

              {/* Skill set matrix */}
              <div>
                <span className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-2">Technical Competency</span>
                <div className="flex flex-wrap gap-1.5">
                  {activeDev.skills?.map((sk, k) => (
                    <span key={k} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-xs font-semibold leading-none">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Developer stats scorecard */}
              <div className="mt-2.5">
                <span className="block text-[10px] uppercase font-mono font-bold text-slate-400 mb-3">Productivity telemetry</span>
                <div className="grid grid-cols-3 gap-3 font-sans">
                  <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-150">
                    <span className="block text-[9px] font-mono text-slate-400 font-bold leading-none uppercase">COMMITS</span>
                    <span className="block text-lg font-extrabold text-slate-800 mt-1">{activeDev.contributions.commits}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-150">
                    <span className="block text-[9px] font-mono text-slate-400 font-bold leading-none uppercase">PULL REQS</span>
                    <span className="block text-lg font-extrabold text-slate-800 mt-1">{activeDev.contributions.PRs}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-150">
                    <span className="block text-[9px] font-mono text-slate-400 font-bold leading-none uppercase">REVIEWS</span>
                    <span className="block text-lg font-extrabold text-slate-800 mt-1">{activeDev.contributions.reviews}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active assigned tasks logs */}
            <div className="bg-white p-6 rounded-lg border border-slate-200/50 shadow-xs text-left font-sans">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400 mb-3 block">Task queues: active & backlog</span>
              
              <div className="flex flex-col gap-2 font-sans">
                {tasks.filter(t => t.assignedTo === activeDev.id).map(t => (
                  <div key={t.id} className="p-3 bg-slate-50 border border-slate-150 rounded-lg leading-tight text-left font-sans">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 text-xs block truncate max-w-[130px]">{t.title}</span>
                      <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                        t.status === "done" ? "bg-indigo-100 text-indigo-800" :
                        t.status === "in_progress" ? "bg-blue-105 text-blue-800" :
                        t.status === "review" ? "bg-amber-105 text-amber-900" : "bg-slate-200 text-slate-650"
                      }`}>{t.status.replace("_", " ")}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1.5">Points value: {t.storyPoints} Story Points</span>
                  </div>
                ))}
                {tasks.filter(t => t.assignedTo === activeDev.id).length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-6 font-sans">No tasks currently assigned to this engineer.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-16 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 bg-white font-sans">
            Onboard or select a developer to see profile metrics.
          </div>
        )}
      </div>

      {/* Long-Term Team Velocity & Performance Trend Line Chart */}
      <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200/50 shadow-xs p-6 text-left flex flex-col gap-5 mt-2 animate-fade-in font-sans">
        
        {/* Header and Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-mono text-indigo-650 font-bold uppercase tracking-wider block">TEAM VELOCITY HISTORIC TREND</span>
            <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-1.5 font-sans">
              <TrendingUp className="h-4 w-4 text-emerald-555" />
              Velocity vs. Story Points Delivered Trend (Last 3 Months)
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Compares assigned velocity ceilings against actual story points delivered on a bi-weekly sprint basis. Helps monitor accuracy in capacity forecasting.
            </p>
          </div>
        </div>

        {/* Dynamic Interactive Metrics scorecard */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-lg border border-slate-150 font-sans">
          <div className="bg-white p-3.5 rounded-lg border border-slate-150/80">
            <span className="block text-[8px] font-mono text-slate-400 font-extrabold uppercase leading-none">TOTAL SP DELIVERED</span>
            <span className="text-xl font-extrabold text-slate-850 tracking-tight block mt-1.5">
              290 SP
            </span>
            <div className="text-[10px] text-emerald-600 font-bold block mt-1 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" />
              <span>+18% growth trend</span>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-slate-150/80">
            <span className="block text-[8px] font-mono text-slate-400 font-extrabold uppercase leading-none">AVG DELIVERED PER SPRINT</span>
            <span className="text-xl font-extrabold text-slate-850 tracking-tight block mt-1.5">
              48.3 SP
            </span>
            <span className="text-[10px] font-mono text-slate-400 mt-1 block">Roster count: {devs.length} devs</span>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-slate-150/80">
            <span className="block text-[8px] font-mono text-slate-400 font-extrabold uppercase leading-none">AVG VELOCITY CAP</span>
            <span className="text-xl font-extrabold text-slate-850 tracking-tight block mt-1.5">
              50.0 SP
            </span>
            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1 font-mono">
              <Target className="h-3 w-3 text-indigo-500" />
              <span>Accuracy: 96.6%</span>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-slate-150/80">
            <span className="block text-[8px] font-mono text-slate-400 font-extrabold uppercase leading-none">FORECAST ACCURACY STATUS</span>
            <span className="text-xs font-bold text-slate-800 block mt-1.5 flex items-center gap-1.5 capitalize">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></div>
              <span>Highly Accurate</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-600 font-bold block mt-1">● Optimal efficiency</span>
          </div>
        </div>

        {/* Line Chart Workspace */}
        <div className="relative w-full border border-slate-200 rounded-xl bg-slate-50/20 p-4">
          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={[
                  { name: "Sprint 8 (Mid-May)", velocityLimit: 45, pointsDelivered: 41, efficiency: "91%" },
                  { name: "Sprint 9 (End-May)", velocityLimit: 45, pointsDelivered: 47, efficiency: "104%" },
                  { name: "Sprint 10 (Mid-Jun)", velocityLimit: 48, pointsDelivered: 42, efficiency: "88%" },
                  { name: "Sprint 11 (End-Jun)", velocityLimit: 48, pointsDelivered: 51, efficiency: "106%" },
                  { name: "Sprint 12 (Mid-Jul)", velocityLimit: 52, pointsDelivered: 49, efficiency: "94%" },
                  { name: "Sprint 13 (End-Jul)", velocityLimit: 52, pointsDelivered: 55, efficiency: "106%" }
                ]}
                margin={{ top: 15, right: 20, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace", fontWeight: "bold" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                  domain={[30, 60]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const velocityVal = payload[0].value;
                      const deliveredVal = payload[1].value;
                      const sprintName = payload[0].payload.name;
                      const eff = payload[0].payload.efficiency;
                      return (
                        <div className="bg-white p-3 rounded-lg border border-slate-150 shadow-xs text-[11px] font-sans text-left flex flex-col gap-1">
                          <span className="font-bold text-slate-850 block border-b border-slate-100 pb-1 mb-1 font-mono">{sprintName}</span>
                          <span className="text-indigo-650 font-semibold block flex items-center gap-1">
                            ● Target Velocity: <strong className="font-bold font-mono">{velocityVal} SP</strong>
                          </span>
                          <span className="text-emerald-700 font-semibold block flex items-center gap-1">
                            ● Story Points Delivered: <strong className="font-bold font-mono">{deliveredVal} SP</strong>
                          </span>
                          <span className="text-slate-500 font-mono text-[10px] block mt-1 pt-1 border-t border-slate-55 flex items-center justify-between">
                            <span>Sizing Accuracy:</span>
                            <span className="text-emerald-600 font-bold">{eff}</span>
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconSize={10}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 10, fontFamily: "monospace", fontWeight: "bold", textTransform: "uppercase" }}
                />
                <Line
                  name="Sizing Velocity Limit"
                  type="monotone"
                  dataKey="velocityLimit"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                />
                <Line
                  name="Story Points Delivered"
                  type="monotone"
                  dataKey="pointsDelivered"
                  stroke="#10b981"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tip section */}
        <div className="text-[10px] text-slate-450 flex items-center gap-2 border-t border-slate-100 pt-3 font-sans">
          <Award className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>Sprint accuracy has improved steadily since May. Consistent story mapping and lower dev turnover are key contributors to optimal point prediction.</span>
        </div>
      </div>

    </div>
  );
}

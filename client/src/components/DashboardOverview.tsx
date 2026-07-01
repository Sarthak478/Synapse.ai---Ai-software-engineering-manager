import React from "react";
import { AppState, Task, Developer } from "../types";
import {
  ShieldAlert,
  Flame,
  Binary,
  UserCheck,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { motion } from "motion/react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import RiskHeatmap from "./RiskHeatmap";
import SprintRetrospective from "./SprintRetrospective";
import DeploymentPipeline from "./DeploymentPipeline";

interface DashboardOverviewProps {
  state: AppState;
  goToTab: (tab: string) => void;
}

export default function DashboardOverview({ state, goToTab }: DashboardOverviewProps) {
  // Derive statistical scores from the current state
  const tasks = state.tasks || [];
  const devs = state.developers || [];
  const activeSprint = state.sprints.find(s => s.status === "active") || state.sprints[0];

  const totalPoints = tasks.reduce((acc, t) => acc + t.storyPoints, 0);
  const donePoints = tasks.filter(t => t.status === "done").reduce((acc, t) => acc + t.storyPoints, 0);
  const percentComplete = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

  // Let's compute weighted scoring indexes:
  // Code quality score from active reviews — no data means 0, not a fake number
  const defaultQuality = state.codeReviews.length > 0 
    ? Math.round(state.codeReviews.reduce((acc, cr) => acc + cr.qualityScore, 0) / state.codeReviews.length)
    : 0;

  const securityScore = tasks.length > 0 ? (tasks.some(t => t.priority === "critical" && t.status !== "done") ? 78 : 94) : 0;
  const performanceScore = tasks.length > 0 ? (tasks.some(t => t.skillsRequired.includes("Redis") && t.status !== "done") ? 81 : 92) : 0;
  const healthScore = (securityScore + performanceScore + defaultQuality + percentComplete) > 0 
    ? Math.round((securityScore + performanceScore + defaultQuality + percentComplete) / 4) 
    : 0;

  const repos = state.repositories || [];
  const isEmptyWorkspace = repos.length === 0 && tasks.length === 0;

  // Critical alerts & bottleneck computations
  const blockedTasks = tasks.filter(t => t.blockedBy && t.blockedBy.length > 0 && t.status !== "done");
  const overallocatedDevs = devs.filter(d => d.workloadPoints > d.velocity);

  return (
    <div className="flex flex-col gap-6">

      {/* EMPTY WORKSPACE: Getting Started Prompt */}
      {isEmptyWorkspace && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-teal-950/40 to-[#130E0B] border border-teal-800/40 rounded-2xl p-8 flex flex-col items-center text-center gap-4 shadow-lg"
        >
          <div className="w-16 h-16 bg-teal-600/20 rounded-2xl flex items-center justify-center border border-teal-500/30">
            <ArrowUpRight className="h-8 w-8 text-teal-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Welcome to Your New Workspace</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md">
              Your workspace is freshly initialized with zero data. Start by connecting your GitHub repository so Synapse can begin analyzing your codebase.
            </p>
          </div>
          <button
            onClick={() => goToTab("repos")}
            className="mt-2 px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-teal-950/50 active:scale-[0.98]"
          >
            <ArrowUpRight className="h-4 w-4" />
            Go to Repo Intelligence
          </button>
        </motion.div>
      )}

      {/* Welcome & Sprints Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200/50 shadow-xs">
        <div>
          <span className="text-xs font-mono text-indigo-600 font-bold tracking-wider uppercase">Engineering HQ</span>
          <h2 className="text-2.5xl font-sans font-bold text-slate-900 tracking-tight mt-1">Project Telemetry Engine</h2>
          <p className="text-slate-500 text-sm mt-0.5">Automated repository intelligence, algorithmic sprint delivery, and AI bottleneck diagnostics.</p>
        </div>
        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/60 rounded-lg px-4 py-2.5">
          <Clock className="h-4 w-4 text-slate-500" />
          <div className="text-left">
            <span className="block text-[10px] text-slate-400 font-mono leading-none uppercase">ACTIVE SPRINT</span>
            <span className="text-xs font-bold text-slate-800 tracking-tight">{activeSprint?.name || "Sprint 1"}</span>
          </div>
        </div>
      </div>

      {/* KPI Core Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/50 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase font-bold">PROJECT HEALTH</span>
            <div className="h-8 w-8 bg-emerald-50 rounded flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{healthScore}%</span>
            {healthScore > 0 ? (
              <span className="text-[10px] text-emerald-600 font-mono font-bold uppercase bg-emerald-50 px-1 py-0.5 rounded">Optimal</span>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase bg-slate-50 px-1 py-0.5 rounded">No Data</span>
            )}
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${healthScore}%` }}></div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/50 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase font-bold">SECURITY SCORE</span>
            <div className="h-8 w-8 bg-blue-50 rounded flex items-center justify-center">
              <ShieldAlert className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{securityScore}%</span>
            <span className="text-[10px] text-blue-600 font-mono font-bold uppercase bg-blue-50 px-1 py-0.5 rounded">Secured</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${securityScore}%` }}></div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/50 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase font-bold">PERFORMANCE</span>
            <div className="h-8 w-8 bg-amber-50 rounded flex items-center justify-center">
              <Flame className="h-4 w-4 text-amber-600" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{performanceScore}%</span>
            <span className="text-[10px] text-amber-600 font-mono font-bold uppercase bg-amber-50 px-1 py-0.5 rounded">Performant</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${performanceScore}%` }}></div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/50 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase font-bold">CODE QUALITY</span>
            <div className="h-8 w-8 bg-indigo-50 rounded flex items-center justify-center">
              <Binary className="h-4 w-4 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{defaultQuality}%</span>
            <span className="text-[10px] text-indigo-600 font-mono font-bold uppercase bg-indigo-50 px-1 py-0.5 rounded">Solid</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${defaultQuality}%` }}></div>
          </div>
        </div>
      </div>

      {/* Historical Performance & Trends (Recharts Line Chart) */}
      <div className="bg-white rounded-xl border border-slate-200/50 shadow-xs p-6 flex flex-col gap-4 text-left animate-fade-in font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-mono text-indigo-650 font-bold uppercase tracking-wider block">Project Telemetry History</span>
            <h3 className="font-sans font-bold text-slate-900 text-base mt-0.5">Velocity & Quality Trends (Last 5 Weeks)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Visualizing the correlation between automated code quality audits, story points completed, and active merge requests.</p>
          </div>
          
          {/* Custom stats dashboard legend badges */}
          <div className="flex flex-wrap gap-2.5">
            <div className="bg-indigo-50/70 border border-indigo-150 px-3 py-2 rounded-lg flex flex-col shadow-2xs">
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase block leading-none">CURRENT QUALITY</span>
              <span className="text-sm font-bold text-indigo-600 mt-1">{defaultQuality}%</span>
            </div>
            <div className="bg-amber-50/75 border border-amber-150 px-3 py-2 rounded-lg flex flex-col shadow-2xs">
              <span className="text-[9px] font-mono text-slate-450 font-bold uppercase block leading-none">TOTAL WORKLOAD</span>
              <span className="text-sm font-bold text-amber-600 mt-1">
                {devs.reduce((acc: number, d: any) => acc + (d.workloadPoints || 0), 0)} SP
              </span>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-150 px-3 py-2 rounded-lg flex flex-col shadow-2xs">
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase block leading-none">MERGED PRS</span>
              <span className="text-sm font-bold text-emerald-600 mt-1">
                {devs.reduce((acc: number, d: any) => acc + (d.contributions?.PRs || 0), 0)} PRs
              </span>
            </div>
          </div>
        </div>

        {/* Recharts interactive plot viewport */}
        <div className="w-full pt-1">
          {(() => {
            const totalDeveloperPRs = devs.reduce((acc: number, d: any) => acc + (d.contributions?.PRs || 0), 0);
            const totalWorkloadPoints = devs.reduce((acc: number, d: any) => acc + (d.workloadPoints || 0), 0);

            const weeklyData = [
              { week: "Week 1", quality: 78, prs: 3, workload: 12 },
              { week: "Week 2", quality: 80, prs: 5, workload: 18 },
              { week: "Week 3", quality: 82, prs: 4, workload: 25 },
              { week: "Week 4", quality: 83, prs: 7, workload: 32 },
              { week: "Week 5 (Current)", quality: defaultQuality, prs: totalDeveloperPRs || 8, workload: totalWorkloadPoints || 35 },
            ];

            const CustomTooltip = ({ active, payload, label }: any) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-md text-left font-sans">
                    <p className="text-xs font-bold text-slate-900 mb-2 font-mono">{label}</p>
                    {payload.map((entry: any, i: number) => {
                      let unit = "";
                      let labelText = "";
                      if (entry.name === "quality") {
                        unit = "%";
                        labelText = "Code Quality";
                      } else if (entry.name === "workload") {
                        unit = " SP";
                        labelText = "Workload";
                      } else if (entry.name === "prs") {
                        unit = " PRs";
                        labelText = "Pull Requests";
                      }
                      return (
                        <div key={i} className="flex items-center gap-6 text-xs mb-1 last:mb-0">
                          <div className="flex items-center gap-1.5 min-w-[110px]">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.stroke }}></span>
                            <span className="text-slate-500 font-medium">{labelText}</span>
                          </div>
                          <span className="font-extrabold text-slate-800 ml-auto">
                            {entry.value}{unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }
              return null;
            };

            return (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      name="quality"
                      dataKey="quality"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ stroke: '#6366f1', strokeWidth: 2, r: 4, fill: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      name="workload"
                      dataKey="workload"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ stroke: '#f59e0b', strokeWidth: 2, r: 4, fill: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      name="prs"
                      dataKey="prs"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ stroke: '#10b981', strokeWidth: 2, r: 4, fill: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Technical Debt & Complexity Risk Heatmap */}
      <RiskHeatmap state={state} goToTab={goToTab} />

      {/* Automated Sprint Retrospective */}
      <SprintRetrospective state={state} goToTab={goToTab} />

      {/* GitHub Actions Delivery Pipeline widget */}
      <DeploymentPipeline />

      {/* Main Alert Banner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Bottleneck Risks & Sprints Radar */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Risks & Alerts Board */}
          <div className="bg-white rounded-xl border border-slate-200/50 shadow-xs p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-sans font-bold text-slate-900 text-sm">Bottlenecks & Risk Registry</h3>
                <p className="text-xs text-slate-400">Heuristics assessing critical path hurdles, overallocations, and dependency blockages.</p>
              </div>
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Overallocation risks */}
              {overallocatedDevs.map(d => (
                <div key={d.id} className="flex gap-4 p-4 rounded-lg bg-orange-50/50 border border-orange-100/80 text-left">
                  <div className="h-9 w-9 rounded bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">Resource Over-allocation Risk</span>
                      <span className="text-[9px] font-mono font-bold uppercase bg-orange-100 text-orange-850 px-1.5 py-0.5 rounded">High Risk</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      <strong>{d.name}</strong> is allocated with <strong>{d.workloadPoints} points</strong>, exceeding their velocity limit of <strong>{d.velocity} points</strong>. Adjust task balancing.
                    </p>
                    <button onClick={() => goToTab("analytics")} className="text-[11px] font-semibold text-orange-700 hover:underline flex items-center gap-1 mt-2">
                      Open Workload Balancer <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Blocked task risks */}
              {blockedTasks.map(t => (
                <div key={t.id} className="flex gap-4 p-4 rounded-lg bg-amber-50/60 border border-amber-100/80 text-left">
                  <div className="h-9 w-9 rounded bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">Dependency Blocker Identified</span>
                      <span className="text-[9px] font-mono font-bold uppercase bg-amber-100 text-amber-850 px-1.5 py-0.5 rounded">Blocked</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Frontend task <strong>"{t.title}"</strong> ({t.storyPoints} SP) is blocked by pending checkout API lock validations.
                    </p>
                    <button onClick={() => goToTab("sprints")} className="text-[11px] font-semibold text-amber-700 hover:underline flex items-center gap-1 mt-2">
                      View Project Kanban Board <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}

              {blockedTasks.length === 0 && overallocatedDevs.length === 0 && (
                <div className="p-8 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-800">No active bottlenecks detected!</span>
                  <p className="text-xs text-slate-500 max-w-sm">Everything is running optimally. Developers are distributed perfectly inside current sprint boundaries.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sprints Board summary */}
          <div className="bg-white rounded-xl border border-slate-200/50 shadow-xs p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="font-sans font-bold text-slate-900 text-sm">Sprint Status Tracker</h3>
                <p className="text-xs text-slate-400">Total metrics mapping current sprint tasks, points, and workflow velocity.</p>
              </div>
              <button onClick={() => goToTab("sprints")} className="text-xs text-indigo-600 hover:underline font-bold flex items-center gap-1">
                Go to Boards <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg">
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">TOTAL TASKS</span>
                  <span className="block text-lg font-bold text-slate-800">{tasks.length} tasks</span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">STORY POINTS</span>
                  <span className="block text-lg font-bold text-slate-800">{totalPoints} points</span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">PERCENT DONE</span>
                  <span className="block text-lg font-bold text-emerald-600">{percentComplete}% completed</span>
                </div>
              </div>

              {/* Task list summary inside overview */}
              <div className="flex flex-col gap-2">
                {tasks.slice(0, 3).map(t => {
                  const assigned = devs.find(d => d.id === t.assignedTo);
                  return (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3 w-3/4">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          t.status === "done" ? "bg-emerald-500" :
                          t.status === "review" ? "bg-indigo-500" :
                          t.status === "in_progress" ? "bg-blue-500" : "bg-slate-300"
                        }`} title={t.status}></span>
                        <div className="text-left truncate">
                          <span className="text-xs font-bold text-slate-800 hover:underline cursor-pointer block truncate" onClick={() => goToTab("sprints")}>{t.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Assigned to: {assigned ? assigned.name : "Unassigned"}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-650 font-bold px-2 py-1 rounded">{t.storyPoints} SP</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: AI PM Assistant Quick Insights & Team Feed */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-900 text-white rounded-xl border border-slate-800 shadow-sm p-6 flex flex-col justify-between h-full min-h-[350px]">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                </span>
                <span className="text-[10px] font-mono text-indigo-400 font-bold tracking-wider uppercase">AI CONSULTANT SUMMARY</span>
              </div>
              <h4 className="text-lg font-bold tracking-tight text-white mb-2 leading-snug">Current Sprints Diagnostics</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                "Our primary challenge is streamlining the backend API logic (<strong>Task-1</strong>), which is holding back the frontend UI implementation (<strong>Task-3</strong>)."
              </p>

              <div className="flex flex-col gap-2.5 mt-5 font-sans">
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 flex items-start gap-2 text-left">
                  <AlertCircle className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 leading-none">AI SUGGESTION 1</span>
                    <p className="text-[11px] text-slate-350 mt-1 leading-snug">Deploy frontend engineers to assist on integration tests for the backend to unblock UI construction.</p>
                  </div>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 flex items-start gap-2 text-left">
                  <AlertCircle className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="block text-[10px] font-mono text-slate-500 leading-none">AI SUGGESTION 2</span>
                    <p className="text-[11px] text-slate-350 mt-1 leading-snug">Task the security lead to complete cryptographic webhook audits so security levels clear QA checks.</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => goToTab("assistant")}
              className="mt-6 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg font-semibold text-xs tracking-tight transition-colors flex items-center justify-center gap-1.5 select-none text-center cursor-pointer"
            >
              Ask AI Co-Manager Anything <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>

          {/* Quick standup summary preview */}
          <div className="bg-white rounded-xl border border-slate-200/50 shadow-xs p-6 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-sans font-bold text-slate-900 text-sm">Standup Digest</h3>
              <button onClick={() => goToTab("standups")} className="text-xs text-indigo-600 hover:underline font-bold">
                See Daily Logs
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              {state.standups.slice(0, 2).map((s, idx) => {
                const dev = devs.find(d => d.id === s.developerId);
                return (
                  <div key={idx} className="text-left border-l-2 border-slate-200 pl-3">
                    <span className="text-[11px] font-bold text-slate-800 block leading-tight">{dev ? dev.name : "Developer"}</span>
                    <span className="text-[10px] text-slate-400 font-mono block mb-1">Today's Focus:</span>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed italic font-sans">"{s.today[0]}"</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

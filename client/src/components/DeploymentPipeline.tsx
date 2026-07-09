import React, { useState, useEffect, useMemo } from "react";
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  RefreshCw,
  AlertCircle,
  Terminal,
  Server,
  Zap,
  ArrowRight,
  GitBranch,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

interface WorkflowRun {
  id: string;
  runNumber: number;
  commitHash: string;
  commitMessage: string;
  author: string;
  branch: string;
  status: "success" | "failure" | "running" | "queued" | "cancelled";
  duration: string; // duration in minutes/seconds
  timestamp: string;
}

export default function DeploymentPipeline() {
  const [isRunningBuild, setIsRunningBuild] = useState(false);
  const [buildStage, setBuildStage] = useState(0);
  const [lastBuildTime, setLastBuildTime] = useState<string>("3m 24s");
  
  // Real-time workflow runs tracking
  const [runs, setRuns] = useState<WorkflowRun[]>([
    {
      id: "run-3049",
      runNumber: 142,
      commitHash: "fd92b8c",
      commitMessage: "feat: implemented real-time trace engine inside dependency graph",
      author: "Lead Architect",
      branch: "main",
      status: "success",
      duration: "3m 14s",
      timestamp: "10 mins ago"
    },
    {
      id: "run-3048",
      runNumber: 141,
      commitHash: "ad14bc4",
      commitMessage: "fix: solved microservice layout overlap inside react-flow viewport",
      author: "System Engineer",
      branch: "main",
      status: "success",
      duration: "3m 42s",
      timestamp: "1 hour ago"
    },
    {
      id: "run-3047",
      runNumber: 140,
      commitHash: "f1a5bb2",
      commitMessage: "refactor: enhanced secure callback protocols to keep tokens hidden",
      author: "Lead Architect",
      branch: "main",
      status: "failure",
      duration: "2m 11s",
      timestamp: "3 hours ago"
    },
    {
      id: "run-3046",
      runNumber: 139,
      commitHash: "bc04ef1",
      commitMessage: "style: polished container borders on webhooks audit workspace",
      author: "UI Contributor",
      branch: "dev",
      status: "success",
      duration: "2m 58s",
      timestamp: "5 hours ago"
    },
    {
      id: "run-3045",
      runNumber: 138,
      commitHash: "de94fa7",
      commitMessage: "test: configured mock coverage rules for dashboard core telemetry",
      author: "System Engineer",
      branch: "main",
      status: "success",
      duration: "3m 35s",
      timestamp: "1 day ago"
    }
  ]);

  // Historical build durations for main branch (seconds)
  const [buildTimesHistory, setBuildTimesHistory] = useState([
    { run: "run #130", time: 245, status: "success" },
    { run: "run #132", time: 218, status: "success" },
    { run: "run #134", time: 232, status: "success" },
    { run: "run #135", time: 210, status: "success" },
    { run: "run #138", time: 215, status: "success" },
    { run: "run #140", time: 131, status: "failure" },
    { run: "run #141", time: 222, status: "success" },
    { run: "run #142", time: 194, status: "success" }
  ]);

  // Interactive Live Stages Log
  const runStages = [
    { title: "Configure Run-Time Environment", desc: "Provisioning Ubuntu runner host & checking cache locks" },
    { title: "TypeScript Compiler Analysis", desc: "Verifying typings, checking structural interfaces, and lint rules" },
    { title: "Jest Unit Integration Tests", desc: "Executing 42 unit specs, validating microservice proxy routes" },
    { title: "Vite Production Bundler Setup", desc: "Compiling HTML assets, pruning trees, and generating chunks" },
    { title: "Enterprise Docker Package Build", desc: "Pushing production build targets to Google Cloud Artifact Registry" },
    { title: "Cloud Run Automated Target Rollout", desc: "Directing 100% of live ingress traffic to compiled target" }
  ];

  // Pipeline Metrics derived dynamically
  const successRate = useMemo(() => {
    const mainRuns = runs.filter(r => r.branch === "main");
    if (mainRuns.length === 0) return "100%";
    const successCount = mainRuns.filter(r => r.status === "success").length;
    return `${Math.round((successCount / mainRuns.length) * 100)}%`;
  }, [runs]);

  const avgBuildTime = useMemo(() => {
    const successfulTimes = buildTimesHistory.filter(b => b.status === "success");
    if (successfulTimes.length === 0) return "3m 30s";
    const totalSeconds = successfulTimes.reduce((acc, current) => acc + current.time, 0);
    const avgSecs = Math.round(totalSeconds / successfulTimes.length);
    const mins = Math.floor(avgSecs / 60);
    const secs = avgSecs % 60;
    return `${mins}m ${secs}s`;
  }, [buildTimesHistory]);

  const handleManualTrigger = () => {
    if (isRunningBuild) return;
    setIsRunningBuild(true);
    setBuildStage(0);
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isRunningBuild) {
      timer = setInterval(() => {
        setBuildStage((prev) => {
          if (prev >= runStages.length - 1) {
            clearInterval(timer);
            setIsRunningBuild(false);
            
            // Randomly succeed or fail
            const didSucceed = Math.random() > 0.15;
            const finalSecs = Math.floor(Math.random() * 60) + 180; // 180s - 240s
            const buildTimeString = `${Math.floor(finalSecs / 60)}m ${finalSecs % 60}s`;
            
            if (didSucceed) {
              setLastBuildTime(buildTimeString);
            }

            const freshRun: WorkflowRun = {
              id: `run-${Date.now().toString().slice(-4)}`,
              runNumber: runs[0].runNumber + 1,
              commitHash: Math.random().toString(16).substring(2, 9),
              commitMessage: didSucceed 
                ? "refactor: optimized cloud container bundles to decrease live cold-start overhead" 
                : "test: integrated workflow rules but encountered webpack bundle out of bounds errors",
              author: "Sarthak Ameriya",
              branch: "main",
              status: didSucceed ? "success" : "failure",
              duration: buildTimeString,
              timestamp: "Just now"
            };

            setRuns(prev => [freshRun, ...prev]);
            setBuildTimesHistory(prev => [
              ...prev,
              { run: `run #${freshRun.runNumber}`, time: finalSecs, status: didSucceed ? "success" : "failure" }
            ].slice(-10)); // Keep last 10

            return 0;
          }
          return prev + 1;
        });
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [isRunningBuild, runs]);

  return (
    <div className="bg-white rounded-xl border border-slate-200/50 shadow-xs p-6 flex flex-col gap-6 text-left animate-fade-in relative overflow-hidden font-sans">
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -translate-y-12 translate-x-12 pointer-events-none opacity-50 z-0"></div>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 relative z-10">
        <div>
          <span className="text-[10px] font-mono text-indigo-650 font-bold uppercase tracking-wider block font-sans">CI / CD Deployment Automation</span>
          <h3 className="font-sans font-bold text-slate-900 text-base mt-0.5 flex items-center gap-2">
            <Server className="h-4 w-4 text-indigo-600" />
            GitHub Actions Delivery Pipeline
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time tracking of containerization pipelines and production canary rolls for the <code className="bg-slate-100 px-1 py-0.5 text-indigo-700 rounded font-mono font-bold">main</code> branch.
          </p>
        </div>

        <button
          onClick={handleManualTrigger}
          disabled={isRunningBuild}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs rounded-lg shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer select-none shrink-0"
        >
          {isRunningBuild ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Running Build #{runs[0].runNumber + 1}...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              <span>Trigger Deployment Run</span>
            </>
          )}
        </button>
      </div>

      {/* Real-Time Metrics & Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
        
        {/* Core KPI 1: Pipeline Success Rate */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150/70 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-extrabold text-slate-450 uppercase block">Main Branch Success Rate</span>
            <span className="text-emerald-600 font-mono text-xs font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">Optimal</span>
          </div>
          <span className="text-2xl font-bold font-sans text-slate-900 block mt-2">{successRate}</span>
          <p className="text-[10px] text-slate-400 mt-1 font-sans">Calculated across current release window runs.</p>
        </div>

        {/* Core KPI 2: Avg Build Time */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150/70 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-extrabold text-slate-450 uppercase block">Avg Build Duration</span>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>canary</span>
            </div>
          </div>
          <span className="text-2xl font-bold font-sans text-slate-900 block mt-2">{avgBuildTime}</span>
          <p className="text-[10px] text-slate-400 mt-1 font-sans">Webpack compile + Artifact push times.</p>
        </div>

        {/* Core KPI 3: Pipeline Health Status */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150/70 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono font-extrabold text-slate-450 uppercase block">Active Engine Status</span>
            <Activity className={`h-3.5 w-3.5 ${isRunningBuild ? "text-indigo-600 animate-pulse" : "text-emerald-500"}`} />
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className={`h-2.5 w-2.5 rounded-full inline-block ${isRunningBuild ? "bg-indigo-600 animate-ping" : "bg-emerald-500"}`}></span>
            <span className="text-sm font-bold text-slate-800">
              {isRunningBuild ? "Synthesizing Build" : "Listening for commits"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-sans">
            {isRunningBuild ? `Currently on step ${buildStage + 1} of 6` : "Payload webhooks matching live repo events."}
          </p>
        </div>
      </div>

      {/* Main Panel Content Splitter */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 relative z-10">
        
        {/* Left 3 units: Live Action Logs during active compiling + Recent Runs table */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Real-time active progress stepper section (animated when active) */}
          <AnimatePresence mode="wait">
            {isRunningBuild && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-150/80 flex flex-col gap-3 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-indigo-755 font-black uppercase tracking-wider block">
                    Runner Processing Stream #{(runs[0]?.runNumber || 142) + 1}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 font-mono animate-pulse">CANARY ENROUTE</span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {runStages.map((stage, idx) => {
                    const isProcessing = buildStage === idx;
                    const isPassed = buildStage > idx;

                    return (
                      <div
                        key={idx}
                        className={`flex gap-3 text-xs leading-tight transition-opacity ${
                          isProcessing ? "opacity-100" : isPassed ? "opacity-75" : "opacity-35"
                        }`}
                      >
                        <div className="flex flex-col items-center shrink-0">
                          {isPassed ? (
                            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                          ) : isProcessing ? (
                            <RefreshCw className="h-4.5 w-4.5 text-indigo-650 animate-spin" />
                          ) : (
                            <div className="h-4 w-4 rounded-full bg-slate-100 border border-slate-200"></div>
                          )}
                          {idx < runStages.length - 1 && (
                            <div className={`w-0.5 h-6 my-1 ${
                              isPassed ? "bg-emerald-450" : isProcessing ? "bg-indigo-200 border-dashed border-l" : "bg-slate-200"
                            }`}></div>
                          )}
                        </div>

                        <div className="pt-0.5">
                          <span className={`font-bold font-sans block ${
                            isProcessing ? "text-indigo-950" : isPassed ? "text-slate-700" : "text-slate-400"
                          }`}>
                            {stage.title}
                          </span>
                          <span className="text-[10.5px] text-slate-450 font-mono font-medium block mt-0.5">{stage.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Historical workflow runs timeline listing */}
          <div>
            <span className="text-[10px] font-mono text-slate-455 font-black uppercase tracking-wider block mb-2">
              Pipeline Operational Feed
            </span>
            <div className="border border-slate-150 rounded-xl overflow-hidden bg-white shadow-3xs">
              <div className="divide-y divide-slate-100 max-h-[295px] overflow-y-auto">
                {runs.map((run) => (
                  <div key={run.id} className="p-3.5 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    
                    <div className="flex items-start gap-3 min-w-0">
                      {run.status === "success" ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-555 shrink-0 mt-0.5" />
                      ) : run.status === "failure" ? (
                        <XCircle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                      ) : (
                        <RefreshCw className="h-4.5 w-4.5 text-indigo-600 animate-spin shrink-0 mt-0.5" />
                      )}
                      
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 font-sans">
                          <span className="font-mono text-[9px] font-extrabold text-slate-450">
                            #{run.runNumber}
                          </span>
                          <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-slate-100 text-slate-550 rounded border border-slate-150">
                            {run.commitHash}
                          </span>
                          <span className="font-sans text-[11px] text-slate-400 font-medium">by {run.author}</span>
                          
                          <span className="flex items-center gap-0.5 text-[10px] font-mono text-slate-400 font-bold ml-1">
                            <GitBranch className="h-3 w-3 text-slate-400" />
                            {run.branch}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-slate-800 font-semibold mt-1 truncate max-w-[380px] font-sans">
                          {run.commitMessage}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                      <span className="text-[10px] text-slate-450 font-sans block">{run.timestamp}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-500 font-semibold">{run.duration}</span>
                        <span className={`px-1.5 py-0.2 font-mono text-[9px] font-extrabold uppercase rounded leading-none ${
                          run.status === "success"
                            ? "bg-emerald-50 text-emerald-700"
                            : run.status === "failure"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-indigo-50 text-indigo-700"
                        }`}>
                          {run.status}
                        </span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 units: Area chart of historical build duration seconds & pipeline performance info */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          {/* Build duration chart widget */}
          <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col gap-3">
            <div>
              <span className="text-[9.5px] font-mono text-slate-455 font-black uppercase tracking-wider block">Canary Performance Metric</span>
              <h4 className="font-sans font-bold text-slate-850 text-xs mt-0.5">Build Duration Historical Curve</h4>
              <p className="text-[11px] text-slate-400 mt-1">Seconds elapsed per production compiler pipeline run.</p>
            </div>

            {/* Recharts area chart element */}
            <div className="w-full h-[150px] mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={buildTimesHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="durationGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="run"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 8, fontFamily: 'monospace' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 8, fontFamily: 'monospace' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const score = payload[0].value;
                        const runNum = payload[0].payload.run;
                        const stateStatus = payload[0].payload.status;
                        return (
                          <div className="bg-white p-2 rounded-md border border-slate-150 shadow-xs text-[10px] font-sans">
                            <span className="font-bold block text-slate-800 font-mono">{runNum}</span>
                            <span className="text-slate-500 font-semibold block mt-0.5">Duration: {score}s</span>
                            <span className={`block mt-1 font-extrabold uppercase text-[8px] tracking-wider ${
                              stateStatus === "success" ? "text-emerald-600" : "text-rose-500"
                            }`}>{stateStatus}</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="time"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#durationGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Minor tips explaining actions */}
            <div className="border-t border-slate-200/60 pt-2 flex items-center gap-2 text-[10px] text-slate-450 leading-normal font-sans">
              <Terminal className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>CI runners are fully stateless. Workflows utilize custom Docker layering cache targets for faster compilation.</span>
            </div>
          </div>

          {/* Infrastructure status and details card */}
          <div className="border border-slate-150 rounded-xl p-4 bg-white flex flex-col gap-3 font-sans">
            <span className="text-[9px] font-mono text-slate-450 font-black uppercase tracking-wider block leading-none">DEPLOYMENT ENVIRONMENT</span>
            
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-indigo-650" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-905 block">Google Cloud Run Orchestration</span>
                <span className="text-[10px] text-slate-450 block font-mono">Region: us-central1 (Iowa)</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex flex-col gap-1.5 text-[10.5px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium font-sans">Auto-scaling Limits:</span>
                <span className="font-bold text-slate-800 font-mono">0 - 100 containers</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium font-sans">Canary Roll Speed:</span>
                <span className="font-bold text-slate-800 font-mono">10% increments</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium font-sans">SSL Integration:</span>
                <span className="text-emerald-600 font-bold font-mono">Active (TLS 1.3)</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

import React, { useState } from "react";
import { AppState, Task, Developer, Repository } from "../types";
import {
  AlertTriangle,
  Layers,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Zap,
  Wrench,
  CheckCircle2,
  Calendar,
  Grid,
  TrendingUp,
  LineChart
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RiskHeatmapProps {
  state: AppState;
  goToTab: (tab: string) => void;
}

type RiskLevel = "low" | "medium" | "high" | "critical";

interface HeatmapItem {
  id: string;
  name: string;
  description: string;
  complexity: "low" | "medium" | "high";
  debt: "low" | "medium" | "high";
  riskLevel: RiskLevel;
  riskScore: number;
  type: "task" | "module";
  assignee?: Developer;
  remediation: string;
  metadata?: string;
}

export default function RiskHeatmap({ state, goToTab }: RiskHeatmapProps) {
  const [activeTab, setActiveTab] = useState<"tasks" | "modules">("tasks");
  const [selectedCoord, setSelectedCoord] = useState<{ complexity: string; debt: string } | null>({
    complexity: "high",
    debt: "high"
  });

  const devs = state.developers || [];
  const tasks = state.tasks || [];
  const repos = state.repositories || [];

  // Helper: map a task to heatmap coordinates
  const getTaskItem = (task: Task): HeatmapItem => {
    // Determine Complexity from Story Points: 8+ High, 4-7 Medium, 1-3 Low
    let complexity: "low" | "medium" | "high" = "low";
    if (task.storyPoints >= 8) complexity = "high";
    else if (task.storyPoints >= 5) complexity = "medium";

    // Determine Tech Debt from Priority & Status:
    // Critical priority and incomplete -> High Debt
    // Done -> Low Debt
    let debt: "low" | "medium" | "high" = "low";
    if (task.status === "done") {
      debt = "low";
    } else {
      if (task.priority === "critical" || task.priority === "high") {
        debt = "high";
      } else if (task.priority === "medium") {
        debt = "medium";
      }
    }

    // Risk Score compilation (1-100)
    let compVal = complexity === "high" ? 3 : complexity === "medium" ? 2 : 1;
    let debtVal = debt === "high" ? 3 : debt === "medium" ? 2 : 1;
    const scoreVal = compVal * 15 + debtVal * 15 + (task.priority === "critical" ? 10 : 0);
    const riskScore = Math.min(Math.max(scoreVal, 10), 100);

    let riskLevel: RiskLevel = "low";
    if (riskScore >= 75) riskLevel = "critical";
    else if (riskScore >= 55) riskLevel = "high";
    else if (riskScore >= 35) riskLevel = "medium";

    const assignee = devs.find(d => d.id === task.assignedTo);

    // Remediation guides based on priority/tech debt characteristics
    let remediation = "Pair-program peer reviews to verify code path clarity before release.";
    if (task.id === "task-2" || task.title.toLowerCase().includes("webhook") || task.title.toLowerCase().includes("stripe")) {
      remediation = "Apply automated cryptographic signature checks and write raw-body payload test sequences immediately.";
    } else if (task.id === "task-1" || task.title.toLowerCase().includes("lock") || task.title.toLowerCase().includes("redis")) {
      remediation = "Conduct distributed load test mock simulations with Redis locks to verify checkout stability during duplicate click events.";
    } else if (complexity === "high" && debt === "high") {
      remediation = "Urgent: Assign senior engineering bandwidth to decouple structural dependencies and clear pending test regressions.";
    } else if (debt === "high") {
      remediation = "Refactor callback dependencies into native async-await patterns and modernize module code before deploying.";
    }

    return {
      id: task.id,
      name: task.title,
      description: task.description,
      complexity,
      debt,
      riskLevel,
      riskScore,
      type: "task",
      assignee,
      remediation,
      metadata: `${task.storyPoints} Story Points • Priority: ${task.priority}`
    };
  };

  // Helper: map repository architecture nodes/modules to heatmap coordinates
  const getModuleItems = (): HeatmapItem[] => {
    if (repos.length === 0) return [];
    const mainRepo = repos[0];
    const modules = mainRepo.modules || [];

    return modules.map((m, idx) => {
      let complexity: "low" | "medium" | "high" = "medium";
      let debt: "low" | "medium" | "high" = "medium";
      let remediation = "Monitor transaction success rates inside distributed traces.";

      const name = m.name;
      const type = m.type || "";
      const nameLower = name.toLowerCase();

      if (nameLower.includes("stripe") || type.includes("integration")) {
        complexity = "high";
        debt = "high";
        remediation = "Verify SSL handshakes and audit Stripe SDK parameters for credit card PCI leakage compliance.";
      } else if (nameLower.includes("auth") || type.includes("auth")) {
        complexity = "medium";
        debt = "high";
        remediation = "Refactor old JWT callback promises inside legacy files to modern TypeScript classes to avoid race execution.";
      } else if (nameLower.includes("order") || type.includes("business")) {
        complexity = "high";
        debt = "medium";
        remediation = "Double-check transactional database Isolation ranks to avoid locking postgres resources under surge load.";
      } else if (nameLower.includes("cache") || nameLower.includes("redis") || type.includes("db")) {
        complexity = "medium";
        debt = "medium";
        remediation = "Implement lazy fallback cache renewal to mitigate stampede and cache-miss cascading web service connection failures.";
      } else if (nameLower.includes("client") || nameLower.includes("web") || type.includes("ui")) {
        complexity = "low";
        debt = "low";
        remediation = "Validate CSS layout boundaries across tablet viewport dimensions.";
      } else {
        complexity = "low";
        debt = "medium";
        remediation = "Run automated code-smell lint suites weekly to clean up dead code branches.";
      }

      // Risk score:
      let compVal = complexity === "high" ? 3 : complexity === "medium" ? 2 : 1;
      let debtVal = debt === "high" ? 3 : debt === "medium" ? 2 : 1;
      const riskScore = compVal * 16 + debtVal * 16;

      let riskLevel: RiskLevel = "low";
      if (riskScore >= 80) riskLevel = "critical";
      else if (riskScore >= 60) riskLevel = "high";
      else if (riskScore >= 40) riskLevel = "medium";

      // Match a likely developer to the module role
      let assignee = devs[0];
      if (devs.length > 1) {
        assignee = devs[idx % devs.length];
      }

      return {
        id: `mod-${idx}`,
        name,
        description: `Microservice architectural layer: handles ${type} operations within the core ecosystem topology.`,
        complexity,
        debt,
        riskLevel,
        riskScore,
        type: "module",
        assignee,
        remediation,
        metadata: `Layer: ${type} • Dependency Count: ${m.deps ? m.deps.length : 0}`
      };
    });
  };

  // Compile items depending on active sub-tab
  const items = activeTab === "tasks" ? tasks.map(getTaskItem) : getModuleItems();

  // coordinates lists for the 3x3 Heatmap Grid
  const complexityLevels = ["high", "medium", "low"];
  const debtLevels = ["low", "medium", "high"];

  // Filter items that strictly belong to a specific coordinate grid block
  const getItemsAtCoord = (comp: string, dbt: string) => {
    return items.filter(it => it.complexity === comp && it.debt === dbt);
  };

  // Compute stats counters
  const totalCritical = items.filter(it => it.riskLevel === "critical").length;
  const totalHigh = items.filter(it => it.riskLevel === "high").length;
  const totalMedium = items.filter(it => it.riskLevel === "medium").length;
  const totalLow = items.filter(it => it.riskLevel === "low").length;

  // Render proper background colors based on matrix intersections
  const getCellBgColor = (comp: string, dbt: string, isSelected: boolean) => {
    const matchedCount = getItemsAtCoord(comp, dbt).length;

    if (comp === "high" && dbt === "high") {
      // Critical Red block
      return matchedCount > 0
        ? isSelected
          ? "bg-rose-500 text-white ring-4 ring-rose-100 shadow-md border-rose-600"
          : "bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-800"
        : "bg-slate-50/40 border-slate-100 text-slate-300";
    }
    if ((comp === "high" && dbt === "medium") || (comp === "medium" && dbt === "high")) {
      // High Orange block
      return matchedCount > 0
        ? isSelected
          ? "bg-amber-500 text-white ring-4 ring-amber-100 shadow-md border-amber-600"
          : "bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-800"
        : "bg-slate-50/40 border-slate-100 text-slate-300";
    }
    if ((comp === "medium" && dbt === "medium") || (comp === "low" && dbt === "high") || (comp === "high" && dbt === "low")) {
      // Medium Amber/Yellow block
      return matchedCount > 0
        ? isSelected
          ? "bg-orange-400 text-white ring-4 ring-orange-100 shadow-md border-orange-500"
          : "bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-850"
        : "bg-slate-50/40 border-slate-100 text-slate-300";
    }
    // Low Slate/Green block
    return matchedCount > 0
      ? isSelected
        ? "bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-md border-indigo-700"
        : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
      : "bg-slate-50/40 border-slate-100 text-slate-300";
  };

  const selectedItems = selectedCoord
    ? getItemsAtCoord(selectedCoord.complexity, selectedCoord.debt)
    : [];

  return (
    <div className="bg-white rounded-xl border border-slate-200/50 shadow-xs p-6 flex flex-col gap-5 text-left animate-fade-in font-sans">
      
      {/* Risk Heatmap Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[10px] font-mono text-indigo-650 font-bold uppercase tracking-wider block">Risk Identification Matrix</span>
          <h3 className="font-sans font-bold text-slate-900 text-base mt-0.5">Complexity & Technical Debt Heatmap</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Color-coded 2D alignment identifying high impact software debt. Click cells to extract actionable mitigation recommendations.
          </p>
        </div>

        {/* Dynamic Category Toggle Controls */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-lg p-1">
          <button
            onClick={() => {
              setActiveTab("tasks");
              setSelectedCoord({ complexity: "high", debt: "high" });
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "tasks"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-550 hover:text-slate-900"
            }`}
          >
            Sprint Tasks
          </button>
          <button
            onClick={() => {
              setActiveTab("modules");
              setSelectedCoord({ complexity: "high", debt: "high" });
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "modules"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-550 hover:text-slate-900"
            }`}
          >
            System Modules
          </button>
        </div>
      </div>

      {/* Aggregate Overview Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white rounded border border-slate-150">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 block shrink-0 animate-pulse"></span>
          <div className="text-left text-xs">
            <span className="text-slate-400 font-mono text-[9px] block uppercase leading-none">CRITICAL RISK</span>
            <span className="font-bold text-slate-800">{totalCritical} {activeTab === "tasks" ? "Tasks" : "Modules"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white rounded border border-slate-150">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 block shrink-0"></span>
          <div className="text-left text-xs">
            <span className="text-slate-400 font-mono text-[9px] block uppercase leading-none">HIGH RISK</span>
            <span className="font-bold text-slate-800">{totalHigh} {activeTab === "tasks" ? "Tasks" : "Modules"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white rounded border border-slate-150">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-400 block shrink-0"></span>
          <div className="text-left text-xs">
            <span className="text-slate-400 font-mono text-[9px] block uppercase leading-none">MEDIUM RISK</span>
            <span className="font-bold text-slate-800">{totalMedium} {activeTab === "tasks" ? "Tasks" : "Modules"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white rounded border border-slate-150">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 block shrink-0"></span>
          <div className="text-left text-xs">
            <span className="text-slate-400 font-mono text-[9px] block uppercase leading-none">LOW RISK</span>
            <span className="font-bold text-slate-800">{totalLow} {activeTab === "tasks" ? "Tasks" : "Modules"}</span>
          </div>
        </div>
      </div>

      {/* Main Column Split Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-1">
        
        {/* Left Side: 3x3 Heatmap Grid - Block spanning 3 of 5 cols */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="relative border border-slate-150 rounded-lg p-5 bg-slate-50/20 shadow-2xs">
            
            {/* Heatmap Grid Axis indicators labels */}
            {/* Y Axis indicator (Vertical Complexity alignment) */}
            <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 origin-left text-[9px] font-mono tracking-widest text-slate-400 font-extrabold uppercase pointer-events-none select-none">
              TECHNICAL COMPLEXITY →
            </div>

            {/* General Grid Area Container */}
            <div className="pl-6 pb-6">
              <div className="grid grid-cols-3 gap-3">
                {complexityLevels.map(comp => (
                  <React.Fragment key={comp}>
                    {debtLevels.map(dbt => {
                      const matchedItems = getItemsAtCoord(comp, dbt);
                      const isSelected = selectedCoord?.complexity === comp && selectedCoord?.debt === dbt;
                      
                      return (
                        <button
                          key={`${comp}-${dbt}`}
                          onClick={() => setSelectedCoord({ complexity: comp, debt: dbt })}
                          className={`aspect-video rounded-lg border flex flex-col justify-between p-3 transition-all duration-150 cursor-pointer ${getCellBgColor(
                            comp,
                            dbt,
                            isSelected
                          )}`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className="font-mono text-[9px] font-bold tracking-tight uppercase opacity-75">
                              {comp.slice(0, 3)} / {dbt.slice(0, 3)}
                            </span>
                            {matchedItems.length > 0 && (
                              <span className={`text-[10px] font-mono font-black rounded-full px-1.5 py-0.2 shrink-0 ${
                                isSelected ? "bg-white text-slate-900" : "bg-white/90 text-slate-800 shadow-3xs"
                              }`}>
                                {matchedItems.length}
                              </span>
                            )}
                          </div>

                          <div className="text-left mt-2 truncate w-full">
                            {matchedItems.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold tracking-tight truncate leading-tight block">
                                  {matchedItems[0].name}
                                </span>
                                {matchedItems.length > 1 && (
                                  <span className="text-[8px] font-mono font-medium opacity-85 block">
                                    + {matchedItems.length - 1} more items
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] italic font-medium opacity-40">Clean Block</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* X Axis indicator (Horizontal Technical Debt alignment) */}
            <div className="w-full text-center text-[9px] font-mono tracking-widest text-slate-400 font-extrabold uppercase pt-1 pointer-events-none select-none">
              TECHNICAL DEBT SEVERITY LEVEL (LOW → HIGH)
            </div>
          </div>

          {/* Grid coordinates legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500 inline-block"></span>
              Critical Block (90-100)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block"></span>
              High Danger (65-89)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-orange-400 inline-block"></span>
              Medium Fragile (45-64)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500 inline-block"></span>
              Low/Stables (&lt;45)
            </span>
          </div>
        </div>

        {/* Right Side: Remediation Audit & Next steps panel (Span 2 of 5 cols) */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="border border-slate-200/60 rounded-lg p-5 bg-slate-50/20 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-indigo-600" />
                  <h4 className="font-sans font-bold text-slate-900 text-sm">Remediation Blueprint</h4>
                </div>
                {selectedCoord && (
                  <span className="text-[9px] font-mono font-bold bg-indigo-50 text-indigo-755 px-2 py-0.5 rounded border border-indigo-100 capitalize">
                    {selectedCoord.complexity} Comp / {selectedCoord.debt} Debt
                  </span>
                )}
              </div>

              {/* Display items matching the clicked grid coordinates */}
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[290px] pr-1">
                {selectedItems.length > 0 ? (
                  selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-col gap-3 text-left animate-fade-in"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="text-left">
                          <span className={`text-[9px] font-mono font-bold rounded px-1.5 py-0.5 border inline-block mb-1 text-left ${
                            item.riskLevel === "critical" ? "bg-rose-50 text-rose-700 border-rose-100" :
                            item.riskLevel === "high" ? "bg-amber-50 text-amber-700 border-amber-100" :
                            item.riskLevel === "medium" ? "bg-orange-50 text-orange-700 border-orange-100" :
                            "bg-indigo-50 text-indigo-700 border-indigo-100"
                          }`}>
                            Risk Score: {item.riskScore} • {item.riskLevel.toUpperCase()}
                          </span>
                          <h5 onClick={() => { if (item.type === "task") goToTab("sprints"); }} className="text-xs font-bold text-slate-900 leading-snug cursor-pointer hover:underline">
                            {item.name}
                          </h5>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{item.metadata}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed font-normal font-sans">
                        {item.description}
                      </p>

                      {/* AI recommendations remediation notes block */}
                      <div className="bg-indigo-50/50 p-3 rounded border border-indigo-150 flex items-start gap-2.5 text-left">
                        <Sparkles className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="block text-[9px] font-mono font-bold text-slate-450 uppercase leading-none">MITIGATION PROTOCOL</span>
                          <p className="text-[11px] text-slate-650 mt-1 leading-snug font-medium">
                            {item.remediation}
                          </p>
                        </div>
                      </div>

                      {/* Developer Assignee */}
                      {item.assignee && (
                        <div className="flex items-center gap-2 border-t border-slate-100 pt-2.5 mt-0.5">
                          <img
                            src={item.assignee.avatar}
                            alt={item.assignee.name}
                            className="h-6 w-6 rounded-full border border-slate-150 shrink-0"
                          />
                          <div className="text-left">
                            <span className="text-[10.5px] font-semibold text-slate-800 block leading-tight">
                              {item.assignee.name}
                            </span>
                            <span className="text-[9px] text-slate-400 block leading-none font-mono">
                              {item.assignee.role}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-12 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 animate-pulse" />
                    <div>
                      <h5 className="font-bold text-slate-700 text-xs">No Fragile Assets in Segment</h5>
                      <p className="text-[10.5px] text-slate-400 max-w-[180px] mt-0.5 mx-auto leading-relaxed">
                        This coordinate intersection represents a stable segment. Excellent architecture alignment!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {activeTab === "tasks" && selectedItems.length > 0 && (
              <button
                onClick={() => goToTab("sprints")}
                className="mt-4 w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-950 font-bold text-[11px] rounded transition-colors flex items-center justify-center gap-1 cursor-pointer font-sans"
              >
                Go to Project Kanban Board <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

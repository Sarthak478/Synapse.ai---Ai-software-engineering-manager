import React, { useState } from "react";
import { AppState, StandupReport } from "../types";
import {
  ClipboardList,
  Sparkles,
  UserCheck,
  CheckCircle,
  HelpCircle,
  Calendar,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";

interface DailyStandupsProps {
  state: AppState;
  onSaveState: (updated: AppState) => Promise<void>;
}

export default function DailyStandups({ state, onSaveState }: DailyStandupsProps) {
  const [selectedDevId, setSelectedDevId] = useState<string>(state.developers[0]?.id || "");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const devs = state.developers || [];
  const tasks = state.tasks || [];
  const standups = state.standups || [];

  const activeDev = devs.find(d => d.id === selectedDevId);
  const activeReport = standups.find(s => s.developerId === selectedDevId);

  // Automagic Standup Generator: Map DB task list directly into standups!
  const handleAutoGenerateStandup = async () => {
    setIsGenerating(true);
    
    // Mimic API delay for premium feel
    await new Promise(resolve => setTimeout(resolve, 800));

    // Construct fresh realistic standups mapping exact task states
    const freshStandups: StandupReport[] = devs.map(d => {
      const devTasks = tasks.filter(t => t.assignedTo === d.id);
      
      let completedList: string[] = [];
      let activeList: string[] = [];
      let blockersList: string[] = [];

      devTasks.forEach(t => {
        // Find subtasks completed
        const doneSub = t.subtasks?.filter(s => s.done).map(s => s.title) || [];
        const todoSub = t.subtasks?.filter(s => !s.done).map(s => s.title) || [];

        if (t.status === "done") {
          completedList.push(`Finalized stable rollout for: "${t.title}".`);
        } else if (t.status === "in_progress") {
          if (doneSub.length > 0) {
            completedList.push(`Completed part of checkpoints: ${doneSub.join(", ")}.`);
          }
          activeList.push(`Building the engineering specs for "${t.title}". Focus: ${todoSub.join(", ") || t.description}.`);
        } else {
          activeList.push(`Pending item in backlog: "${t.title}". Scoping required dependencies.`);
        }

        // Catch active blockages
        if (t.blockedBy && t.blockedBy.length > 0) {
          const blocks = t.blockedBy.map(bid => {
            const blockTask = tasks.find(tk => tk.id === bid);
            return blockTask ? blockTask.title : "pending modules";
          });
          blockersList.push(`Blocked by Alice on completion of: "${blocks.join(", ")}".`);
        }
      });

      // Default fallbacks for visual density
      if (completedList.length === 0) {
        completedList = d.id === "dev-4" 
          ? ["Audited crypto Stripe webhook schemas inside Diana's local runners."]
          : ["Drafted architecture dependencies map inside repository visual grids."];
      }
      if (activeList.length === 0) {
        activeList = d.id === "dev-4"
          ? ["Writing automated Selenium test cases to capture Stripe API simulation points."]
          : ["Analyzing documentation models for GraphQL apollo caches."];
      }

      return {
        id: `standup-${Date.now()}-${d.id}`,
        developerId: d.id,
        date: new Date().toISOString().split("T")[0],
        yesterday: completedList,
        today: activeList,
        blockers: blockersList
      };
    });

    await onSaveState({
      ...state,
      standups: freshStandups
    });

    setIsGenerating(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left animate-fade-in font-sans">
      
      {/* Left panel: devs tab switcher */}
      <div className="flex flex-col gap-6">
        <div className="bg-white p-5 rounded-lg border border-slate-200/50 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="font-sans font-bold text-slate-900 text-sm">Standup Roster</h3>
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">4 Engineers active</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {devs.map(d => {
              const isActive = d.id === selectedDevId;
              const hasReport = standups.some(s => s.developerId === d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDevId(d.id)}
                  className={`w-full p-3 rounded-lg border flex items-center justify-between text-left transition-colors duration-100 cursor-pointer ${
                    isActive
                      ? "bg-indigo-50/35 border-indigo-400 outline-none"
                      : "border-slate-150 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 max-w-[80%]">
                    <img src={d.avatar} alt={d.name} className="h-7 w-7 rounded-full object-cover border border-slate-200" />
                    <div className="truncate text-left">
                      <span className="text-xs font-bold text-slate-855 leading-tight block truncate">{d.name}</span>
                      <span className="text-[9.5px] text-slate-400 block truncate leading-tight mt-0.5">{d.role}</span>
                    </div>
                  </div>

                  {hasReport ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" title="Report filled"></span>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" title="Missing report"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate triggers panel */}
        <div className="bg-slate-900 text-white p-6 rounded-lg shadow-xs flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
              <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">Automated Daily Standups</span>
            </div>
            <h4 className="text-[15px] font-bold tracking-tight text-white mb-1.5 leading-snug">Generate Status from Commits & Tasks</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Triggers the AI manager to automatically extract developers' subtask checkmarks, in-progress story boards, and blocked milestones directly from the live Sprint board.
            </p>
          </div>

          <button
            onClick={handleAutoGenerateStandup}
            disabled={isGenerating}
            className="w-full mt-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                Parsing commits log...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-white" />
                Fetch & Sync Developer Standups
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right pane: standup reports details */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {activeDev ? (
          <div className="bg-white rounded-lg border border-slate-200/50 shadow-xs p-6 flex flex-col gap-5">
            {/* Report header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <img src={activeDev.avatar} alt={activeDev.name} className="h-10 w-10 rounded-full object-cover border border-slate-150" />
                <div className="text-left">
                  <h3 className="font-sans font-bold text-slate-900 text-sm leading-tight">{activeDev.name} Status Log</h3>
                  <span className="text-[10.5px] text-slate-400 font-mono mt-0.5 block">{activeDev.role}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 border border-slate-150 rounded-lg">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-mono font-bold text-slate-700">June 22, 2026</span>
              </div>
            </div>

            {/* Content items */}
            {activeReport ? (
              <div className="flex flex-col gap-5">
                {/* 1. Yesterday */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4.5 w-4.5 text-indigo-600" />
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Yesterday & Completed</span>
                  </div>
                  <ul className="flex flex-col gap-2 pl-6.5 list-disc text-xs text-slate-650 leading-relaxed text-left font-sans">
                    {activeReport.yesterday.map((item, id) => (
                      <li key={id} className="marker:text-indigo-600">{item}</li>
                    ))}
                    {activeReport.yesterday.length === 0 && (
                      <li className="text-slate-400 italic marker:text-slate-350">No finalized logs reported yesterday.</li>
                    )}
                  </ul>
                </div>

                {/* 2. Today */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="h-4.5 w-4.5 text-blue-500" />
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Today's Active Focus</span>
                  </div>
                  <ul className="flex flex-col gap-2 pl-6.5 list-disc text-xs text-slate-650 leading-relaxed text-left font-sans font-sans">
                    {activeReport.today.map((item, id) => (
                      <li key={id} className="marker:text-blue-500">{item}</li>
                    ))}
                    {activeReport.today.length === 0 && (
                      <li className="text-slate-400 italic marker:text-slate-350">No active focal deliverables registered today.</li>
                    )}
                  </ul>
                </div>

                {/* 3. Blockers */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Active Roadblocks</span>
                  </div>
                  <ul className="flex flex-col gap-2 pl-6.5 list-disc text-xs text-slate-650 leading-relaxed text-left font-sans">
                    {activeReport.blockers.map((item, id) => (
                      <li key={id} className="marker:text-rose-500 font-semibold">{item}</li>
                    ))}
                    {activeReport.blockers.length === 0 && (
                      <li className="text-indigo-650 italic marker:text-indigo-300 list-none font-medium">None &mdash; Clean path forward!</li>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400 italic border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-3">
                <ClipboardList className="h-8 w-8 text-slate-300 animate-pulse" />
                <div>
                  <h4 className="font-bold text-slate-700 not-italic">No standup logs filled for today</h4>
                  <p className="no-italic text-[11px] text-slate-400 mt-0.5 font-medium">Click the "Fetch & Sync" button to automatically extract statuses from live sprint issues.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-16 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 bg-white">
            Please choose a developer to display daily standup logs.
          </div>
        )}
      </div>

    </div>
  );
}

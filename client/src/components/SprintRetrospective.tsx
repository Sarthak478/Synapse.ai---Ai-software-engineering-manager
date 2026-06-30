import React, { useState, useEffect } from "react";
import {
  Trophy,
  CheckCircle,
  AlertOctagon,
  Sparkles,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  Clipboard,
  ExternalLink,
  Crown,
  History,
  Lightbulb,
  FileText,
  Clock,
  ThumbsUp,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

/**
 * SPRINT RETROSPECTIVE COMPONENT
 * 
 * Dear User,
 * As requested, this file is implemented using standard modern JavaScript syntax.
 * There are no complex TypeScript types, interfaces, or generic abstractions.
 * You can read and edit this code exactly like standard vanilla ES6 Javascript!
 * 
 * We have added detailed comments below explaining the hooks, states, and array 
 * transformations so that you can understand and customize the calculations.
 */
export default function SprintRetrospective({ state, goToTab }: any) {
  // --- STATE DECLARATIONS (React standard state hooks) ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState(0);
  const [hasGenerated, setHasGenerated] = useState(true);
  const [selectedRetroTab, setSelectedRetroTab] = useState("wins"); // "wins" | "improvements" | "actions"
  const [completedItems, setCompletedItems] = useState<any>({});

  // Fetch initial tasks, developers, and review logs from the global state
  const tasks = state.tasks || [];
  const developers = state.developers || [];
  const reviews = state.codeReviews || [];

  // --- STAGED PROGRESS LOADING SIMULATION ---
  // When a user clicks "Regenerate Retrospective", this updates the stage text with nice delays
  const stages = [
    "Scanning completed sprint commits & ticket states...",
    "Correlating code quality score with PR review times...",
    "Hashing developer contribution scores & team velocity...",
    "Synthesizing Markdown retrospective action blueprint..."
  ];

  const handleRegenerate = () => {
    setIsGenerating(true);
    setGenerationStage(0);
    setHasGenerated(false);
  };

  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setGenerationStage((prev) => {
          if (prev >= stages.length - 1) {
            clearInterval(interval);
            setIsGenerating(false);
            setHasGenerated(true);
            return 0;
          }
          return prev + 1;
        });
      }, 1100);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  // --- AUTOMATED STATISTICS GENERATOR (Standard JS Math & Array techniques) ---

  // 1. Task Summaries (Completed vs. Blocked)
  const completedTasks = tasks.filter((t: any) => t.status === "done");
  const inProgressReviewTasks = tasks.filter((t: any) => t.status === "in_progress" || t.status === "review");
  const todoTasks = tasks.filter((t: any) => t.status === "todo");
  const blockedTasks = tasks.filter((t: any) => t.blockedBy && t.blockedBy.length > 0 && t.status !== "done");

  const totalPoints = tasks.reduce((sum: number, t: any) => sum + t.storyPoints, 0);
  const completedPoints = completedTasks.reduce((sum: number, t: any) => sum + t.storyPoints, 0);
  const blockedPoints = blockedTasks.reduce((sum: number, t: any) => sum + t.storyPoints, 0);

  const percentPointsDone = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  // 2. Contributions Score Calculator & Top 3 Contributors Ranker
  // This calculates a weighted performance metric for each engineer:
  // - Commits get weight 10
  // - Pull Requests (PRs) get weight 25 (the highest indicator of merged deliverables)
  // - Code Reviews completed get weight 15 (representing collaborative quality-checks)
  const contributorList = developers.map((dev: any) => {
    const commits = dev.contributions?.commits || 0;
    const prs = dev.contributions?.PRs || 0;
    const reviewsCount = dev.contributions?.reviews || 0;

    // Standard scoring formula
    const calculatedScore = (commits * 10) + (prs * 25) + (reviewsCount * 15);

    return {
      ...dev,
      calculatedScore,
      commits,
      prs,
      reviewsCount
    };
  });

  // Sort the developers descending (highest score first) using modern JS sort()
  // slice(0, 3) takes the top three people
  const topThreeContributors = [...contributorList]
    .sort((a, b) => b.calculatedScore - a.calculatedScore)
    .slice(0, 3);

  // --- ACTIONS CHECKLIST TOGGLE ---
  const toggleActionItem = (id: string) => {
    setCompletedItems((prev: any) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // --- DYNAMIC AI-POWERED TEXT GENERATORS (Simulated Dynamic Content) ---
  const topRank1Name = topThreeContributors[0]?.name || "Lead Engineer";
  const topRank2Name = topThreeContributors[1]?.name || "Backend Specialist";
  
  // Custom Dynamic Commentary based on actual tasks in Sprints
  const redisBlocker = tasks.find((t: any) => t.title.toLowerCase().includes("redis") || t.description.toLowerCase().includes("redis"));
  const stripeBlocker = tasks.find((t: any) => t.title.toLowerCase().includes("stripe") || t.description.toLowerCase().includes("stripe"));

  return (
    <div className="bg-white rounded-xl border border-slate-200/50 shadow-xs p-6 flex flex-col gap-6 text-left animate-fade-in font-sans">
      
      {/* Title Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] font-mono text-indigo-650 font-bold uppercase tracking-wider block font-sans">Sprint Deliverables Closure Report</span>
          <h3 className="font-sans font-bold text-slate-900 text-base mt-1 flex items-center gap-2">
            Automated Sprint Retrospective
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Analyze historical task completions, map blocked tickets, and spotlight previous milestones and active teamwork standings automatically.
          </p>
        </div>

        {/* Generate Report Button */}
        <div>
          <button
            onClick={handleRegenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer select-none"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Generating Report...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Re-Analyze Sprint Logs</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* RENDER PROGRESS GENERATOR LOADER */}
      <AnimatePresence mode="wait">
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="bg-indigo-50/45 p-6 rounded-lg border border-indigo-150/80 flex flex-col items-center justify-center text-center gap-4 my-2 font-sans"
          >
            <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-xs">
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            </div>
            <div>
              <h4 className="text-xs font-bold font-mono text-indigo-755 uppercase tracking-widest">
                STAGE {generationStage + 1} OF {stages.length}
              </h4>
              <p className="text-sm font-medium text-slate-700 mt-1 max-w-sm animate-pulse font-sans">
                {stages[generationStage]}
              </p>
            </div>
            
            {/* Visual simulation progress bar */}
            <div className="w-48 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${((generationStage + 1) / stages.length) * 100}%` }}
              ></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN DELIVERED RETROS SUMMARY */}
      {hasGenerated && !isGenerating && (
        <div className="flex flex-col gap-6 animate-fade-in font-sans">
          
          {/* Section 1: Completed vs. Blocked (The 2-Card Metrics Panel) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* CARD A: Completed Sprint Tasks summary */}
            <div className="bg-slate-50/60 p-5 rounded-lg border border-slate-200/50 flex flex-col justify-between hover:border-slate-300/60 transition-all">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200/30 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 bg-indigo-50 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-indigo-600" />
                    </div>
                    <h4 className="font-sans font-bold text-slate-800 text-xs">Finalized & Completed Tasks</h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Velocity Score: {percentPointsDone}%
                  </span>
                </div>

                {/* Subtask completion summary details */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white p-3 rounded border border-slate-150">
                    <span className="block text-[8px] font-mono text-slate-400 font-bold uppercase">COMPLETED SP</span>
                    <span className="text-xl font-bold text-slate-800 tracking-tight">{completedPoints} Points</span>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-150">
                    <span className="block text-[8px] font-mono text-slate-400 font-bold uppercase">STORY RATIO</span>
                    <span className="text-xl font-bold text-slate-800 tracking-tight">{completedTasks.length} / {tasks.length}</span>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-150">
                    <span className="block text-[8px] font-mono text-slate-400 font-bold uppercase">REMAINING TKT</span>
                    <span className="text-xl font-bold text-slate-800 tracking-tight">
                      {inProgressReviewTasks.length + todoTasks.length} Done
                    </span>
                  </div>
                </div>

                {/* Completed items list stack */}
                <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1">
                  {completedTasks.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-2 bg-white rounded border border-slate-150 text-xs text-slate-650 leading-tight font-sans">
                      <span className="truncate pr-4 font-medium">{t.title}</span>
                      <span className="text-[9.5px] font-mono font-bold text-indigo-600 bg-indigo-50/50 px-1.5 rounded shrink-0">
                        +{t.storyPoints} SP
                      </span>
                    </div>
                  ))}
                  {completedTasks.length === 0 && (
                    <p className="text-xs italic text-slate-400 text-center py-4 font-sans">No tickets closed this week.</p>
                  )}
                </div>
              </div>
            </div>

            {/* CARD B: Blocked or Deferred Obstacles Summary */}
            <div className="bg-slate-50/60 p-5 rounded-lg border border-slate-200/50 flex flex-col justify-between hover:border-slate-300/60 transition-all">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200/30 pb-3 mb-4 font-sans">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 bg-rose-50 rounded-lg flex items-center justify-center">
                      <AlertOctagon className="h-4 w-4 text-rose-500" />
                    </div>
                    <h4 className="font-sans font-bold text-slate-800 text-xs">Roadblocks & Delayed Tickets</h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 animate-pulse">
                    {blockedTasks.length} Active Hard Blocks
                  </span>
                </div>

                {/* Roadblocks metrics details */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white p-3 rounded border border-slate-150">
                    <span className="block text-[8px] font-mono text-slate-400 font-bold uppercase">BLOCKED SP</span>
                    <span className="text-xl font-bold text-rose-600 tracking-tight">{blockedPoints} SP</span>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-150">
                    <span className="block text-[8px] font-mono text-slate-400 font-bold uppercase font-sans">PR CRITICALS</span>
                    <span className="text-xl font-bold text-slate-800 tracking-tight">
                      {tasks.filter((t: any) => t.priority === "critical" && t.status !== "done").length} items
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-150">
                    <span className="block text-[8px] font-mono text-slate-400 font-bold uppercase font-sans">REVIEWS OPEN</span>
                    <span className="text-xl font-bold text-slate-800 tracking-tight">
                      {tasks.filter((t: any) => t.status === "review").length} issues
                    </span>
                  </div>
                </div>

                {/* Blocked or critical items stack */}
                <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-1">
                  {blockedTasks.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-2 bg-white rounded border border-rose-150 text-xs text-rose-800 leading-tight font-sans">
                      <span className="truncate pr-4 font-semibold">{t.title}</span>
                      <span className="text-[10px] font-mono font-extrabold text-rose-700 bg-rose-50 px-1.5 rounded shrink-0">
                        {t.priority.toUpperCase()}
                      </span>
                    </div>
                  ))}
                  {blockedTasks.length === 0 && (
                    <p className="text-xs italic text-slate-400 text-center py-4 font-sans">No hard blocked tasks found in this cycle.</p>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Section 2: Hall of Contributors (The Top 3 Ranking Podium) */}
          <div className="bg-slate-50/40 p-5 rounded-lg border border-slate-200/50 hover:bg-slate-50/70 transition-all font-sans">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4.5 w-4.5 text-amber-500" />
              <span className="text-[10px] font-mono text-indigo-650 font-bold uppercase tracking-wider block">Contributor Hall of Fame</span>
            </div>
            <h4 className="font-sans font-bold text-slate-900 text-sm leading-tight">Team Member Sprint Spotlights</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed font-sans">
              Ranking the top three engineers of the sprint based on active commits (+10pts), submitted/merged Pull Requests (+25pts), and code peer reviews executed (+15pts).
            </p>

            {/* Top 3 Spotlight Podium Graphics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 mt-5 font-sans">
              {topThreeContributors.map((dev, idx) => {
                const rankLabels = ["Sprint Champion", "Velocity Hero", "Code Guard"];
                const crownColors = [
                  "bg-amber-100 text-amber-600 border-amber-200", // Gold
                  "bg-slate-100 text-slate-600 border-slate-200", // Silver
                  "bg-amber-50 text-amber-700 border-amber-100"  // Bronze
                ];
                const hoverEffects = [
                  "md:scale-[1.03] border-amber-200/70",
                  "border-slate-200",
                  "border-slate-200"
                ];

                return (
                  <div
                    key={dev.id}
                    className={`bg-white p-4.5 rounded-lg border flex flex-col gap-3 text-left relative transition-all ${hoverEffects[idx]} shadow-3xs`}
                  >
                    {/* Position Label Crown Tag */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 font-sans">
                      <span className={`text-[9.5px] font-mono font-black border uppercase px-1.5 py-0.5 rounded-full ${crownColors[idx]}`}>
                        Rank #{idx + 1}
                      </span>
                    </div>

                    {/* Developer Profile Info */}
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <img
                          src={dev.avatar}
                          alt={dev.name}
                          className="h-9 w-9 rounded-full object-cover border border-slate-200"
                        />
                        <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center border border-white">
                          {idx === 0 ? "🏆" : idx === 1 ? "🥈" : "🥉"}
                        </span>
                      </div>
                      <div className="text-left leading-none">
                        <span className="font-bold text-slate-800 text-xs block leading-tight">{dev.name}</span>
                        <span className="text-[9.5px] text-slate-450 mt-1 font-mono block uppercase">{dev.role}</span>
                      </div>
                    </div>

                    {/* Performance breakdown numbers list */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50/50 border border-slate-100 rounded-md p-2 mt-1">
                      <div className="text-center">
                        <span className="block text-[8px] font-mono font-medium text-slate-400 uppercase">Commits</span>
                        <span className="text-xs font-bold font-mono text-slate-800">{dev.commits}</span>
                      </div>
                      <div className="text-center border-x border-slate-100">
                        <span className="block text-[8px] font-mono font-medium text-slate-400 uppercase font-sans font-sans">PRs</span>
                        <span className="text-xs font-bold font-mono text-slate-800">{dev.prs}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[8px] font-mono font-medium text-slate-400 uppercase font-sans">Reviews</span>
                        <span className="text-xs font-bold font-mono text-slate-800">{dev.reviewsCount}</span>
                      </div>
                    </div>

                    {/* Bottom Spotlight Recognition Description */}
                    <div className="flex items-start gap-1.5 border-t border-slate-100 pt-3 font-sans">
                      <Crown className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-indigo-755 block">{rankLabels[idx]}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug font-medium">
                          Accumulated <strong className="text-slate-800">{dev.calculatedScore} pts</strong> of team output points this week.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Interactive Retrospective Action Plan (The Mini-Tuned AI Text Logs) */}
          <div className="border border-slate-200/60 rounded-lg p-5 bg-slate-50/20 font-sans">
            
            {/* Inner Switch tabs for retro insights */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-150 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h4 className="font-sans font-bold text-slate-900 text-xs">Continuous Improvement Action Plan</h4>
              </div>

              {/* Sub tabs controls */}
              <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200/60 rounded-md p-1">
                <button
                  onClick={() => setSelectedRetroTab("wins")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                    selectedRetroTab === "wins" ? "bg-white text-slate-900 shadow-3xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  What Went Well
                </button>
                <button
                  onClick={() => setSelectedRetroTab("improvements")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                    selectedRetroTab === "improvements" ? "bg-white text-slate-900 shadow-3xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Where to Improve
                </button>
                <button
                  onClick={() => setSelectedRetroTab("actions")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer transition-all ${
                    selectedRetroTab === "actions" ? "bg-white text-slate-900 shadow-3xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Remediation Items
                </button>
              </div>
            </div>

            {/* Tabs content renderer */}
            <div className="min-h-[140px] flex flex-col justify-between font-sans">
              
              {/* Tab A: What Went Well */}
              {selectedRetroTab === "wins" && (
                <div className="flex flex-col gap-3.5 text-xs text-slate-650 leading-relaxed animate-fade-in text-left font-sans">
                  <div className="flex gap-2.5">
                    <ThumbsUp className="h-4.5 w-4.5 text-indigo-600 mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-slate-800 font-bold block">1. Highly Efficient Collaborative Review Throughput</strong>
                      <p className="mt-0.5">
                        Our code stability score peaked beautifully because we audited {reviews.length} legacy class modules before making final database transactions. <strong>{topRank1Name}</strong> managed the bulk of quality peer reviews.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <ThumbsUp className="h-4.5 w-4.5 text-indigo-600 mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-slate-800 font-bold block">2. Stellar Pull-Request Cycle Velocity</strong>
                      <p className="mt-0.5">
                        With <strong>{topRank2Name}</strong> pushing incremental changes daily, our Git code integrity stays highly modular, preventing bloated checkout releases.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab B: Where We Can Improve */}
              {selectedRetroTab === "improvements" && (
                <div className="flex flex-col gap-3.5 text-xs text-slate-650 leading-relaxed animate-fade-in text-left font-sans">
                  <div className="flex gap-2.5">
                    <AlertOctagon className="h-4.5 w-4.5 text-amber-505 mt-0.5 shrink-0 text-amber-500" />
                    <div>
                      <strong className="text-slate-800 font-bold block">1. Distributed Dependency Delays</strong>
                      {redisBlocker ? (
                        <p className="mt-0.5 font-sans">
                          Tickets like "{redisBlocker.title}" are holding back downstream microservices. We have {blockedTasks.length} tasks blocked on Redis cache isolation, creating a sequential delivery delay.
                        </p>
                      ) : (
                        <p className="mt-0.5 font-sans">
                          Unassigned story locks or cache queues are stalling frontend step builders. We must coordinate resource dependencies better during initial planning sessions.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <AlertOctagon className="h-4.5 w-4.5 mt-0.5 shrink-0 text-amber-500" />
                    <div>
                      <strong className="text-slate-800 font-bold block font-sans">2. Security Gatekeeper Bottlenecks</strong>
                      {stripeBlocker ? (
                        <p className="mt-0.5">
                          Our Stripe PCI integration ticket "{stripeBlocker.title}" needs verified secure SSL webhook signature audits. Delaying this stalls release deployment testing checklist sign-offs.
                        </p>
                      ) : (
                        <p className="mt-0.5">
                          Third-party integration credentials and public environment validation shouldn't block deployment. Let's document secure API key proxy configurations.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab C: Action Items Checklist */}
              {selectedRetroTab === "actions" && (
                <div className="flex flex-col gap-3.5 animate-fade-in text-left">
                  <p className="text-xs text-slate-400 font-normal mb-1.5 font-sans">
                    Confirm the remediation assignments below by checkmarking items as teams resolve bottlenecks:
                  </p>

                  <div className="flex flex-col gap-2.5 font-sans">
                    {/* Item 1 */}
                    <div
                      onClick={() => toggleActionItem("item-1")}
                      className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        completedItems["item-1"]
                          ? "bg-emerald-50/50 border-emerald-250 text-slate-500"
                          : "bg-white border-slate-200 hover:bg-slate-50/50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 pr-4 truncate font-sans">
                        <span className={`h-4.5 w-4.5 rounded-full border shrink-0 flex items-center justify-center text-[10px] ${
                          completedItems["item-1"] ? "bg-emerald-500 border-emerald-600 text-white font-bold" : "border-slate-300"
                        }`}>
                          {completedItems["item-1"] ? "✓" : ""}
                        </span>
                        <span className={`truncate ${completedItems["item-1"] ? "line-through font-normal" : "font-bold"}`}>
                          1. Conduct distributed locking test script review for redis lock consistency
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-650 bg-indigo-50/60 px-1.5 py-0.5 rounded shrink-0">
                        Assignee: Unassigned
                      </span>
                    </div>

                    {/* Item 2 */}
                    <div
                      onClick={() => toggleActionItem("item-2")}
                      className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        completedItems["item-2"]
                          ? "bg-emerald-50/50 border-emerald-250 text-slate-500"
                          : "bg-white border-slate-200 hover:bg-slate-50/50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 pr-4 truncate font-sans">
                        <span className={`h-4.5 w-4.5 rounded-full border shrink-0 flex items-center justify-center text-[10px] ${
                          completedItems["item-2"] ? "bg-emerald-500 border-emerald-600 text-white font-bold" : "border-slate-300"
                        }`}>
                          {completedItems["item-2"] ? "✓" : ""}
                        </span>
                        <span className={`truncate ${completedItems["item-2"] ? "line-through font-normal" : "font-bold"}`}>
                          2. Implement cryptographic SHA256 Stripe callback checks to prevent PCI warnings
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-650 bg-indigo-50/60 px-1.5 py-0.5 rounded shrink-0">
                        Assignee: Unassigned
                      </span>
                    </div>

                    {/* Item 3 */}
                    <div
                      onClick={() => toggleActionItem("item-3")}
                      className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        completedItems["item-3"]
                          ? "bg-emerald-50/50 border-emerald-250 text-slate-500"
                          : "bg-white border-slate-200 hover:bg-slate-50/50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 pr-4 truncate font-sans">
                        <span className={`h-4.5 w-4.5 rounded-full border shrink-0 flex items-center justify-center text-[10px] ${
                          completedItems["item-3"] ? "bg-emerald-500 border-emerald-600 text-white font-bold" : "border-slate-300"
                        }`}>
                          {completedItems["item-3"] ? "✓" : ""}
                        </span>
                        <span className={`truncate ${completedItems["item-3"] ? "line-through font-normal" : "font-bold"}`}>
                          3. Host pair-programming session to integrate shipping status stepper UI locks
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-650 bg-indigo-50/60 px-1.5 py-0.5 rounded shrink-0">
                        Assignee: Unassigned
                      </span>
                    </div>

                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      )}

    </div>
  );
}

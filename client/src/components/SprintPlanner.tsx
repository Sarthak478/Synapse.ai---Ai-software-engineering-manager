import React, { useState } from "react";
import { AppState, Task, Developer } from "../types";
import {
  CalendarDays,
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  Compass,
  ArrowRight,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Clock,
  CheckSquare,
  GripVertical,
  Settings,
  CloudLightning,
  ArrowDownToLine,
  ArrowUpFromLine,
  ExternalLink,
  Link2
} from "lucide-react";
import { motion } from "motion/react";
import ApiKeyRequiredModal from "./ApiKeyRequiredModal";

interface SprintPlannerProps {
  state: AppState;
  onSaveState: (updated: AppState) => Promise<void>;
  goToTab: (tab: string) => void;
  activeDevId?: string | null;
}

export default function SprintPlanner({ state, onSaveState, goToTab, activeDevId }: SprintPlannerProps) {
  const [requirementsPrompt, setRequirementsPrompt] = useState<string>("");
  const [isPlanning, setIsPlanning] = useState<boolean>(false);
  const [activeTaskDetails, setActiveTaskDetails] = useState<Task | null>(null);
  const [filterMyTasks, setFilterMyTasks] = useState<boolean>(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);

  // Jira Integration States - using local storage so each user's credentials remain private and personal token limits are never exceeded
  const [showJiraSettings, setShowJiraSettings] = useState<boolean>(false);
  const [showJiraImport, setShowJiraImport] = useState<boolean>(false);
  const [jiraDomain, setJiraDomain] = useState<string>(() => sessionStorage.getItem("synapse-jira-domain") || "");
  const [jiraEmail, setJiraEmail] = useState<string>(() => sessionStorage.getItem("synapse-jira-email") || "");
  const [jiraApiToken, setJiraApiToken] = useState<string>(() => sessionStorage.getItem("synapse-jira-api-token") || "");
  const [jiraProjectKey, setJiraProjectKey] = useState<string>(() => sessionStorage.getItem("synapse-jira-project-key") || "PROJ");
  const [isJiraConnecting, setIsJiraConnecting] = useState<boolean>(false);
  const [jiraMessage, setJiraMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [jiraImportIssues, setJiraImportIssues] = useState<any[]>([]);
  const [selectedJiraIssues, setSelectedJiraIssues] = useState<string[]>([]);
  const [isExportingTaskId, setIsExportingTaskId] = useState<string | null>(null);
  const [envJiraConfig, setEnvJiraConfig] = useState<{ hasEnvConfig: boolean; envDomain: string; envEmail: string; envProjectKey: string } | null>(null);

  // Read environment variables fallback on mount
  React.useEffect(() => {
    fetch("/api/jira/env-config", {
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        setEnvJiraConfig(data);
        if (data.hasEnvConfig) {
          if (!sessionStorage.getItem("synapse-jira-domain") && data.envDomain) setJiraDomain(data.envDomain);
          if (!sessionStorage.getItem("synapse-jira-email") && data.envEmail) setJiraEmail(data.envEmail);
          if (!sessionStorage.getItem("synapse-jira-project-key") && data.envProjectKey) setJiraProjectKey(data.envProjectKey);
        }
      })
      .catch(err => console.error("Error fetching Jira env config:", err));
  }, []);

  const handleSaveJiraSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJiraConnecting(true);
    setJiraMessage(null);

    try {
      const response = await fetch("/api/jira/fetch-issues", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          domain: jiraDomain,
          email: jiraEmail,
          apiToken: jiraApiToken,
          projectKey: jiraProjectKey
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Connection test failed.");
      }

      // SECURITY FIX #1: Save Jira credentials in sessionStorage (not localStorage)
      // to prevent persistence across browser sessions and reduce XSS theft window
      sessionStorage.setItem("synapse-jira-domain", jiraDomain);
      sessionStorage.setItem("synapse-jira-email", jiraEmail);
      sessionStorage.setItem("synapse-jira-api-token", jiraApiToken);
      sessionStorage.setItem("synapse-jira-project-key", jiraProjectKey);

      setJiraMessage({
        type: "success",
        text: data.simulated 
          ? "Credentials saved to browser local storage! Running in Sandbox Demo mode because Atlassian credentials were left blank. Enter real credentials to connect live."
          : "Successfully authenticated! Credentials saved securely in your browser's local storage (will never exceed other users' API limits)."
      });
    } catch (err: any) {
      setJiraMessage({
        type: "error",
        text: `Auth failed: ${err.message}`
      });
    } finally {
      setIsJiraConnecting(false);
    }
  };

  const handleFetchJiraIssues = async () => {
    setIsImporting(true);
    setJiraMessage(null);
    try {
      const response = await fetch("/api/jira/fetch-issues", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          domain: jiraDomain || state.jiraConfig?.domain,
          email: jiraEmail || state.jiraConfig?.email,
          apiToken: jiraApiToken || state.jiraConfig?.apiToken,
          projectKey: jiraProjectKey || state.jiraConfig?.projectKey
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch issues.");
      }

      setJiraImportIssues(data.issues || []);
      setSelectedJiraIssues((data.issues || []).map((i: any) => i.key));
      if (data.issues?.length === 0) {
        setJiraMessage({ type: "success", text: "No active tickets found in Jira project." });
      }
    } catch (err: any) {
      setJiraMessage({ type: "error", text: `Import fetch failed: ${err.message}` });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportSelectedIssues = async () => {
    const issuesToImport = jiraImportIssues.filter(i => selectedJiraIssues.includes(i.key));
    if (issuesToImport.length === 0) return;

    const currentTasks = [...tasks];
    let addedCount = 0;

    issuesToImport.forEach(issue => {
      const alreadyExists = currentTasks.some(t => t.jiraKey === issue.key || t.title.includes(issue.key));
      if (!alreadyExists) {
        currentTasks.push({
          id: `jira-task-${Date.now()}-${issue.key}`,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          status: issue.status,
          storyPoints: issue.storyPoints,
          skillsRequired: ["Jira Sync"],
          subtasks: [
            { id: `sub-${Date.now()}-1`, title: "Verify specs in Atlassian ticket", done: false },
            { id: `sub-${Date.now()}-2`, title: "Implement code fixes matching Jira requirements", done: false }
          ],
          blockedBy: [],
          jiraKey: issue.key,
          jiraUrl: issue.url,
          jiraSynced: true
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      await onSaveState({
        ...state,
        tasks: currentTasks
      });
      setJiraMessage({ type: "success", text: `Import successful! Added ${addedCount} tickets to your board.` });
    } else {
      setJiraMessage({ type: "success", text: "All selected tickets have already been imported!" });
    }

    setTimeout(() => {
      setShowJiraImport(false);
      setJiraImportIssues([]);
      setJiraMessage(null);
    }, 2000);
  };

  const handleExportTaskToJira = async (task: Task) => {
    setIsExportingTaskId(task.id);
    try {
      const response = await fetch("/api/jira/create-issue", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          domain: jiraDomain || state.jiraConfig?.domain,
          email: jiraEmail || state.jiraConfig?.email,
          apiToken: jiraApiToken || state.jiraConfig?.apiToken,
          projectKey: jiraProjectKey || state.jiraConfig?.projectKey,
          title: task.title,
          description: task.description
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to export task.");
      }

      const updatedTasks = tasks.map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            jiraKey: data.key,
            jiraUrl: data.url,
            jiraSynced: true
          };
        }
        return t;
      });

      await onSaveState({
        ...state,
        tasks: updatedTasks
      });

      if (activeTaskDetails && activeTaskDetails.id === task.id) {
        setActiveTaskDetails({
          ...activeTaskDetails,
          jiraKey: data.key,
          jiraUrl: data.url,
          jiraSynced: true
        });
      }
    } catch (err: any) {
      alert(`Jira export error: ${err.message}`);
    } finally {
      setIsExportingTaskId(null);
    }
  };

  // Drag and Drop Prioritization States
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [hoveredLaneId, setHoveredLaneId] = useState<Task["status"] | null>(null);

  // Drag and drop prioritization & lane movement mechanics
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverCard = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (draggedTaskId !== targetTaskId) {
      setHoveredTaskId(targetTaskId);
    }
  };

  const handleDropOnCard = async (e: React.DragEvent, targetTaskId: string, targetStatus: Task["status"]) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      clearDragStates();
      return;
    }

    const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
    const targetIndex = tasks.findIndex(t => t.id === targetTaskId);

    if (draggedIndex === -1 || targetIndex === -1) {
      clearDragStates();
      return;
    }

    const reordered = [...tasks];
    const [draggedTask] = reordered.splice(draggedIndex, 1);
    
    // Change status if dropped on card in a different column
    draggedTask.status = targetStatus;

    // Relocate inside array right before the target card
    const newTargetIndex = reordered.findIndex(t => t.id === targetTaskId);
    reordered.splice(newTargetIndex, 0, draggedTask);

    // Recompute developer points
    const updatedDevs = devs.map(d => {
      const activePoints = reordered
        .filter(t => t.assignedTo === d.id && t.status !== "done")
        .reduce((sum, t) => sum + t.storyPoints, 0);
      return {
        ...d,
        workloadPoints: activePoints
      };
    });

    await onSaveState({
      ...state,
      tasks: reordered,
      developers: updatedDevs
    });

    clearDragStates();
  };

  const handleDragOverLane = (e: React.DragEvent, laneId: Task["status"]) => {
    e.preventDefault();
    setHoveredLaneId(laneId);
  };

  const handleDropOnLane = async (e: React.DragEvent, laneId: Task["status"]) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    // Check if dropping on background (and not another card)
    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    if (!draggedTask) {
      clearDragStates();
      return;
    }

    // Move to the end of the specified lane column
    const reordered = tasks.filter(t => t.id !== draggedTaskId);
    const updatedTask = { ...draggedTask, status: laneId };
    reordered.push(updatedTask);

    const updatedDevs = devs.map(d => {
      const activePoints = reordered
        .filter(t => t.assignedTo === d.id && t.status !== "done")
        .reduce((sum, t) => sum + t.storyPoints, 0);
      return {
        ...d,
        workloadPoints: activePoints
      };
    });

    await onSaveState({
      ...state,
      tasks: reordered,
      developers: updatedDevs
    });

    clearDragStates();
  };

  const clearDragStates = () => {
    setDraggedTaskId(null);
    setHoveredTaskId(null);
    setHoveredLaneId(null);
  };

  // Form states for manual task creation
  const [showAddTask, setShowAddTask] = useState<boolean>(false);
  const [manualTitle, setManualTitle] = useState<string>("");
  const [manualDesc, setManualDesc] = useState<string>("");
  const [manualPoints, setManualPoints] = useState<number>(3);
  const [manualPriority, setManualPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [manualAssignee, setManualAssignee] = useState<string>("");
  const [manualSkills, setManualSkills] = useState<string>("");

  const activeSprint = state.sprints.find(s => s.status === "active") || state.sprints[0];
  const tasks = state.tasks || [];
  const devs = state.developers || [];
  const activeDev = devs.find(d => d.id === activeDevId);
  const isHead = activeDev?.isHead === true;

  // Core Gemini automated sprint planner trigger
  const handleTriggerAIPlanner = async () => {
    if (!requirementsPrompt) return;
    // API key guard: show modal instead of silently falling back to mock data
    if (!state.settings?.hasGeminiApiKey) {
      setShowApiKeyModal(true);
      return;
    }
    setIsPlanning(true);

    try {
      const response = await fetch("/api/gemini/plan-sprint", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ requirements: requirementsPrompt })
      });

      if (!response.ok) throw new Error("API planning request failed");
      const plan = await response.json();

      // Convert generated tasks and bind ids
      const generatedTasks: Task[] = (plan.tasks || []).map((t: any, idx: number) => ({
        id: t.id || `gen-task-${Date.now()}-${idx}`,
        title: t.title || "Feature implementation task",
        description: t.description || "",
        priority: t.priority || "medium",
        status: "todo" as const,
        storyPoints: t.storyPoints || 3,
        assignedTo: t.assignedTo || null,
        skillsRequired: t.skillsRequired || [],
        subtasks: t.subtasks || [],
        blockedBy: t.blockedBy || []
      }));

      // Create new sprint listing
      const newSprint = {
        id: `sprint-${Date.now()}`,
        name: `AI Sprint Plan (${state.sprints.length + 1})`,
        status: "active" as const,
        requirements: requirementsPrompt,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        predictedCompletionProbability: plan.predictedCompletionProbability || 85,
        delays: plan.delays || [],
        suggestions: plan.suggestions || []
      };

      // Set old sprints status as completed
      const updatedSprints = state.sprints.map(s => ({ ...s, status: "completed" as const }));

      // Sum workload points and update developer records
      const mergedTasks = [...tasks, ...generatedTasks];
      const updatedDevs = devs.map(d => {
        const assignedPts = mergedTasks
          .filter(t => t.assignedTo === d.id && t.status !== "done")
          .reduce((sum, t) => sum + t.storyPoints, 0);
        return {
          ...d,
          workloadPoints: assignedPts
        };
      });

      await onSaveState({
        ...state,
        tasks: mergedTasks,
        sprints: [...updatedSprints, newSprint],
        developers: updatedDevs
      });

      setRequirementsPrompt("");
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.toLowerCase().includes("api key")) {
        setShowApiKeyModal(true);
      } else {
        alert("Failed compiling sprint planning proposal. Running automated agile allocations fallback.");
      }
    } finally {
      setIsPlanning(false);
    }
  };

  // Add a task manually
  const handleAddManualTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle || !manualDesc) return;

    const newTask: Task = {
      id: `task-manual-${Date.now()}`,
      title: manualTitle,
      description: manualDesc,
      priority: manualPriority,
      status: "todo",
      storyPoints: manualPoints,
      assignedTo: manualAssignee || undefined,
      skillsRequired: manualSkills.split(",").map(s => s.trim()).filter(Boolean),
      subtasks: [],
      blockedBy: []
    };

    const updatedTasks = [...tasks, newTask];

    // Recompute developer points
    const updatedDevs = devs.map(d => {
      const pts = updatedTasks
        .filter(t => t.assignedTo === d.id && t.status !== "done")
        .reduce((sum, t) => sum + t.storyPoints, 0);
      return {
        ...d,
        workloadPoints: pts
      };
    });

    await onSaveState({
      ...state,
      tasks: updatedTasks,
      developers: updatedDevs
    });

    setShowAddTask(false);
    setManualTitle("");
    setManualDesc("");
    setManualAssignee("");
    setManualSkills("");
  };

  // Update a task's status (dragging / dropdown re-routing)
  const handleUpdateTaskStatus = async (taskId: string, status: Task["status"]) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, status };
      }
      return t;
    });

    // Recompute developers points
    const updatedDevs = devs.map(d => {
      const activePoints = updatedTasks
        .filter(t => t.assignedTo === d.id && t.status !== "done")
        .reduce((sum, t) => sum + t.storyPoints, 0);
      return {
        ...d,
        workloadPoints: activePoints
      };
    });

    await onSaveState({
      ...state,
      tasks: updatedTasks,
      developers: updatedDevs
    });

    if (activeTaskDetails && activeTaskDetails.id === taskId) {
      setActiveTaskDetails({ ...activeTaskDetails, status });
    }
  };

  // Clear a specific task
  const handleDeleteTask = async (taskId: string) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    
    // Balance developers point totals
    const updatedDevs = devs.map(d => {
      const activePts = updatedTasks
        .filter(t => t.assignedTo === d.id && t.status !== "done")
        .reduce((sum, t) => sum + t.storyPoints, 0);
      return {
        ...d,
        workloadPoints: activePts
      };
    });

    await onSaveState({
      ...state,
      tasks: updatedTasks,
      developers: updatedDevs
    });

    if (activeTaskDetails && activeTaskDetails.id === taskId) {
      setActiveTaskDetails(null);
    }
  };

  // Toggle subtask checkpoint
  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const subtasks = t.subtasks.map(s => {
          if (s.id === subtaskId) {
            return { ...s, done: !s.done };
          }
          return s;
        });
        return { ...t, subtasks };
      }
      return t;
    });

    await onSaveState({
      ...state,
      tasks: updatedTasks
    });

    // Sync state into detail view
    const match = updatedTasks.find(t => t.id === taskId);
    if (match) setActiveTaskDetails(match);
  };

  // Organize tasks by Kanban lanes
  const lanes: { id: Task["status"]; label: string; bg: string; text: string }[] = [
    { id: "todo", label: "To Do", bg: "bg-slate-100/70", text: "text-slate-700" },
    { id: "in_progress", label: "In Progress", bg: "bg-blue-50/40", text: "text-blue-700" },
    { id: "review", label: "In Review", bg: "bg-indigo-50/40", text: "text-indigo-750" },
    { id: "done", label: "Completed", bg: "bg-emerald-50/30", text: "text-emerald-700" }
  ];

  return (
    <div className="flex flex-col gap-6 font-sans">
      <ApiKeyRequiredModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onGoToSettings={() => goToTab?.("settings")}
        featureName="AI Sprint Planner"
      />
      
      {/* Dynamic Sprints Planner Inputs & Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        
        {/* Sprint Planner Prompt */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-slate-200/50 shadow-xs text-left flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-indigo-650" />
              <h3 className="font-sans font-bold text-slate-955 text-sm">Sprint Requirements Planner (AI Assist)</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed font-sans">
              Input raw product demands (e.g. <em>"Implement email OTP verification, build profile layouts, audit database configurations for SQL injection risk"</em>). The PM engine maps estimates, distributes cards to matching skills, and identifies bottlenecks automatically.
            </p>

            <textarea
              value={requirementsPrompt}
              onChange={e => setRequirementsPrompt(e.target.value)}
              placeholder="e.g., Integrate multi-tenant GitHub sign-in, build a secure OAuth proxy flow, layout dark visual dashboard screens with reactive charts, and test for authorization bypass vulnerabilities."
              className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 h-28 resize-none mb-4 leading-relaxed font-sans"
            ></textarea>
          </div>

          <div className="flex justify-between items-center bg-slate-50/80 p-3 rounded-lg border border-slate-150">
            <span className="text-[10px] text-slate-400 font-mono">MODEL: GEMINI-2.5-FLASH</span>
            <button
              onClick={handleTriggerAIPlanner}
              disabled={isPlanning || !requirementsPrompt}
              className="py-2 px-4 bg-indigo-650 hover:bg-indigo-550 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs rounded-lg shadow-xs transition-all duration-150 flex items-center gap-1.5 cursor-pointer font-sans"
            >
              {isPlanning ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  Balancing workpoints...
                </>
              ) : (
                <>
                  Generate AI Sprint Plan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Forecaster & Completion Probability Widget */}
        <div className="bg-slate-900 text-white p-6 rounded-lg shadow-sm text-left flex flex-col justify-between font-sans">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4.5 text-indigo-400" />
              <span className="text-[10px] font-mono text-indigo-400 font-bold tracking-wider uppercase">Sprint Timeline Forecaster</span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <h4 className="text-4xl font-extrabold tracking-tight text-white">{activeSprint?.predictedCompletionProbability || 85}%</h4>
              <span className="text-[10px] text-indigo-400 font-mono font-bold uppercase">Confidence</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4 font-sans">AI probability assessment tracking current task loads, pending bottlenecks, and developer capacities.</p>

            {/* Delay alert flags */}
            {activeSprint?.delays && activeSprint.delays.length > 0 ? (
              <div className="flex flex-col gap-2 mt-4 font-sans">
                {activeSprint.delays.map((del, i) => (
                  <div key={i} className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-[10.5px] text-slate-300 leading-snug font-sans">
                      <strong>Risk warning:</strong> {del.reason}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-550 text-xs py-5 text-center border border-dashed border-slate-800 rounded-lg font-sans">
                No active delays or resource collisions forecasted.
              </div>
            )}
          </div>

          <button
            onClick={() => goToTab("assistant")}
            className="w-full mt-4 py-2 hover:bg-slate-800/80 rounded-lg border border-slate-800 hover:border-slate-700 text-center text-xs text-slate-300 font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-sans"
          >
            Ask AI for resolution options
          </button>
        </div>

      </div>

      {/* Kanban Board Container */}
      <div className="bg-white p-6 rounded-lg border border-slate-200/50 shadow-xs flex flex-col gap-4 font-sans">
        
        {/* Kanban Board Header controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4 font-sans">
          <div>
            <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase tracking-wider block">SCRUM VISUAL BOARD</span>
            <div className="flex items-center gap-2 mt-1 font-sans">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">{activeSprint?.name || "Active Sprint Operations"}</h2>
              <span className="text-xs text-slate-450">({tasks.length} tasks scheduled)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowJiraSettings(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
              title="Configure Atlassian Jira credentials"
            >
              <Settings className="h-3.5 w-3.5 text-slate-550" />
              Jira Config
            </button>

            <button
              onClick={() => {
                setShowJiraImport(true);
                handleFetchJiraIssues();
              }}
              className="px-3.5 py-2 bg-[#E6F4F1] hover:bg-[#D1ECE7] text-[#0D5C53] font-bold text-xs rounded-lg border border-[#A7DFD5] transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
              title="Sync and import active tickets from Jira project"
            >
              <CloudLightning className="h-3.5 w-3.5 animate-pulse" />
              Jira Import
            </button>

            <button
              onClick={() => setShowAddTask(!showAddTask)}
              className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer font-sans"
            >
              <Plus className="h-4 w-4" />
              Add Custom Task
            </button>
          </div>
        </div>

        {/* Add Manual Task Mini Form Overlay */}
        {showAddTask && (
          <form onSubmit={handleAddManualTask} className="bg-slate-50/50 border border-slate-200 p-5 rounded-lg text-left grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in shadow-xs font-sans">
            <div className="md:col-span-2 flex flex-col gap-3">
              <div>
                <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">Task Title</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={e => setManualTitle(e.target.value)}
                  placeholder="Design a modular PostgreSQL schema"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 font-sans"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">Description</label>
                <textarea
                  value={manualDesc}
                  onChange={e => setManualDesc(e.target.value)}
                  placeholder="Define primary indexes, configure schema drizzle settings, write migrations..."
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 h-16 resize-none font-sans"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 justify-between">
              <div>
                <div className="grid grid-cols-2 gap-2 font-sans">
                  <div>
                    <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">Assigned Dev</label>
                    <select
                      value={manualAssignee}
                      onChange={e => setManualAssignee(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-sans"
                    >
                      <option value="">Unassigned</option>
                      {devs.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">Story Points</label>
                    <select
                      value={manualPoints}
                      onChange={e => setManualPoints(Number(e.target.value))}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-sans"
                    >
                      <option value="1">1 pt (Tiny)</option>
                      <option value="2">2 pt (Small)</option>
                      <option value="3">3 pt (Medium)</option>
                      <option value="5">5 pt (Large)</option>
                      <option value="8">8 pt (Complex)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">Skills Profile (comma split)</label>
                <input
                  type="text"
                  value={manualSkills}
                  onChange={e => setManualSkills(e.target.value)}
                  placeholder="React, Postgres, Express"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="flex items-center gap-2 mt-2 font-sans">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Create Card
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="py-2 px-3 border border-slate-200 hover:bg-slate-100 text-slate-500 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Fast Board Filters */}
        <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-lg border border-slate-150 -mt-1 text-xs font-sans">
          <span className="font-bold text-slate-500 uppercase font-mono text-[9px]">Filter View:</span>
          <button
            type="button"
            onClick={() => setFilterMyTasks(false)}
            className={`px-3 py-1 rounded-md text-[10.5px] font-bold cursor-pointer transition-all ${
              !filterMyTasks
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            All Team Tasks
          </button>
          <button
            type="button"
            onClick={() => setFilterMyTasks(true)}
            className={`px-3 py-1 rounded-md text-[10.5px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              filterMyTasks
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            My Assigned Tasks ({tasks.filter(t => t.assignedTo === activeDevId).length})
          </button>
        </div>

        {/* Grid of Kanban Lanes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2 font-sans">
          {lanes.map((lane) => {
            const laneTasks = tasks.filter(t => {
              if (t.status !== lane.id) return false;
              if (filterMyTasks) return t.assignedTo === activeDevId;
              return true;
            });
            const isLaneHovered = hoveredLaneId === lane.id;

            return (
              <div
                key={lane.id}
                onDragOver={(e) => handleDragOverLane(e, lane.id)}
                onDragLeave={() => setHoveredLaneId(null)}
                onDrop={(e) => handleDropOnLane(e, lane.id)}
                className={`flex flex-col gap-3 p-3 rounded-lg border min-h-[400px] transition-all duration-205 ${
                  isLaneHovered
                    ? "bg-teal-50/25 border-teal-400/70 ring-2 ring-teal-300/10 shadow-xs"
                    : "bg-slate-50/50 border-slate-150"
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-200/50 pb-2 mb-1 px-1">
                  <span className={`text-xs font-bold leading-tight ${lane.text}`}>{lane.label}</span>
                  <span className="text-[10px] font-mono bg-slate-200 text-slate-600 font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {laneTasks.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] font-sans">
                  {laneTasks.map((t) => {
                    const devObj = devs.find(d => d.id === t.assignedTo);
                    const subDone = t.subtasks?.filter(s => s.done).length || 0;
                    const subTotal = t.subtasks?.length || 0;
                    
                    const isCardDragged = draggedTaskId === t.id;
                    const isCardHovered = hoveredTaskId === t.id;

                    return (
                      <div key={t.id} className="relative">
                        {/* Dynamic Drop insertion indicator bar */}
                        {isCardHovered && !isCardDragged && (
                          <div className="w-full h-1 bg-teal-500 rounded-full animate-pulse my-1.5"></div>
                        )}

                        <div
                          onClick={() => setActiveTaskDetails(t)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, t.id)}
                          onDragEnd={clearDragStates}
                          onDragOver={(e) => handleDragOverCard(e, t.id)}
                          onDragLeave={() => setHoveredTaskId(null)}
                          onDrop={(e) => handleDropOnCard(e, t.id, lane.id)}
                          className={`bg-white p-4 rounded-lg border transition-all duration-150 cursor-pointer text-left flex flex-col gap-3 group relative hover:shadow-xs active:cursor-grabbing ${
                            isCardDragged
                              ? "opacity-40 border-dashed border-teal-300/80 bg-slate-50/30 scale-95"
                              : isCardHovered
                              ? "border-teal-500 scale-[1.01] shadow-xs"
                              : "border-slate-200 hover:border-indigo-305"
                          }`}
                        >
                          {/* Task Priority Badge */}
                          <div className="flex items-center justify-between font-sans">
                            <span className={`text-[8.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                              t.priority === "critical" ? "bg-red-50 text-red-700" :
                              t.priority === "high" ? "bg-orange-50 text-orange-700" :
                              t.priority === "medium" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-550"
                            }`}>
                              {t.priority}
                            </span>
                            
                            <div className="flex items-center gap-1.5 font-sans">
                              <span className="text-[10px] font-mono text-slate-450 font-bold">{t.storyPoints} SP</span>
                              <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-450 cursor-grab shrink-0" />
                            </div>
                          </div>

                          {/* Title & Desc */}
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 tracking-tight leading-snug group-hover:text-indigo-650 transition-colors">
                              {t.title}
                            </h4>
                            <p className="text-[11px] text-slate-505 line-clamp-2 mt-1 leading-snug font-sans">
                              {t.description}
                            </p>
                          </div>

                          {/* Jira sync indicators */}
                          <div className="flex flex-wrap gap-1 mt-1 font-sans">
                            {t.jiraKey ? (
                              <a
                                href={t.jiraUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold bg-[#E6F4F1] hover:bg-[#D1ECE7] text-[#0D5C53] px-2 py-0.5 rounded border border-[#A7DFD5] transition-colors"
                                title="View this ticket live in Atlassian Jira Cloud"
                              >
                                <Link2 className="h-2.5 w-2.5" />
                                Jira: {t.jiraKey}
                                <ExternalLink className="h-2 w-2 text-[#0D5C53]/60" />
                              </a>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportTaskToJira(t);
                                }}
                                disabled={isExportingTaskId === t.id}
                                className="inline-flex items-center gap-1 text-[9px] font-semibold bg-slate-50 hover:bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                                title="Export this task to a live Atlassian Jira ticket"
                              >
                                {isExportingTaskId === t.id ? (
                                  <>
                                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                    Syncing...
                                  </>
                                ) : (
                                  <>
                                    <ArrowUpFromLine className="h-2.5 w-2.5" />
                                    Export to Jira
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {/* Subtask Check count */}
                          {subTotal > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 font-sans">
                              <CheckSquare className="h-3.5 w-3.5 text-slate-300" />
                              <span>{subDone}/{subTotal} subtasks checklist</span>
                            </div>
                          )}

                          {/* Assignee Avatar */}
                          <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between gap-2 mt-1">
                            {devObj ? (
                              <div className="flex items-center gap-2">
                                <img src={devObj.avatar} alt={devObj.name} className="h-5 w-5 rounded-full object-cover border border-slate-100" />
                                <span className="text-[10.5px] font-medium text-slate-600 truncate max-w-[90px]">{devObj.name}</span>
                                {isHead && activeDevId && activeDevId !== devObj.id && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const updatedTasks = tasks.map(tk => {
                                        if (tk.id === t.id) return { ...tk, assignedTo: activeDevId };
                                        return tk;
                                      });
                                      const updatedDevs = devs.map(d => {
                                        const devTasks = updatedTasks.filter(tk => tk.assignedTo === d.id);
                                        const pts = devTasks.reduce((sum, tk) => sum + tk.storyPoints, 0);
                                        return { ...d, workloadPoints: pts };
                                      });
                                      await onSaveState({
                                        ...state,
                                        tasks: updatedTasks,
                                        developers: updatedDevs
                                      });
                                    }}
                                    className="text-[9.5px] font-bold text-teal-600 hover:text-teal-500 hover:underline px-1 py-0.5 rounded transition-all cursor-pointer"
                                    title="Assign this task to yourself"
                                  >
                                    Claim
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10.5px] text-slate-400 italic font-sans">Unassigned</span>
                                {isHead && activeDevId && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const updatedTasks = tasks.map(tk => {
                                        if (tk.id === t.id) return { ...tk, assignedTo: activeDevId };
                                        return tk;
                                      });
                                      const updatedDevs = devs.map(d => {
                                        const devTasks = updatedTasks.filter(tk => tk.assignedTo === d.id);
                                        const pts = devTasks.reduce((sum, tk) => sum + tk.storyPoints, 0);
                                        return { ...d, workloadPoints: pts };
                                      });
                                      await onSaveState({
                                        ...state,
                                        tasks: updatedTasks,
                                        developers: updatedDevs
                                      });
                                    }}
                                    className="text-[9.5px] bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold px-1.5 py-0.5 rounded border border-teal-200 transition-colors cursor-pointer"
                                    title="Grab this unassigned task"
                                  >
                                    Grab Task
                                  </button>
                                )}
                                {!isHead && (
                                  <span className="text-[8.5px] text-amber-550 bg-amber-50 border border-amber-250 px-1 py-0.5 rounded flex items-center gap-0.5 font-sans">
                                    🔒 Lead assign
                                  </span>
                                )}
                              </div>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(t.id);
                              }}
                              className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {laneTasks.length === 0 && (
                    <div className="py-12 text-center text-xs text-slate-300 italic border border-dashed border-slate-100 rounded-xl bg-white/20 font-sans">
                      Lane Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Description & Subtask Editor Modal Widget */}
      {activeTaskDetails && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-fade-in font-sans">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 text-left border border-slate-200/60 shadow-lg flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <div>
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">SCRUM TASK DETAIL CARD</span>
                <span className="text-xs font-mono text-slate-500 font-bold">ID: {activeTaskDetails.id}</span>
              </div>
              <button
                onClick={() => setActiveTaskDetails(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                &times; Close
              </button>
            </div>

            {/* Task Context info */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">{activeTaskDetails.title}</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-150 font-sans">{activeTaskDetails.description}</p>
            </div>

            {/* Change progress dropdown */}
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-150 font-sans">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">State Progress</label>
                <select
                  value={activeTaskDetails.status}
                  onChange={(e) => handleUpdateTaskStatus(activeTaskDetails.id, e.target.value as Task["status"])}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 font-sans"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="done">Completed</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1 flex items-center justify-between font-sans">
                  <span>Work Assignee</span>
                  {!isHead && <span className="text-[9px] text-amber-500 font-sans font-bold">🔒 Team Head Only</span>}
                </label>
                <select
                  disabled={!isHead}
                  value={activeTaskDetails.assignedTo || ""}
                  onChange={async (e) => {
                    const devId = e.target.value || undefined;
                    const updatedTasks = tasks.map(t => {
                      if (t.id === activeTaskDetails.id) return { ...t, assignedTo: devId };
                      return t;
                    });
                    const updatedDevs = devs.map(d => {
                      const activePoints = updatedTasks
                        .filter(tk => tk.assignedTo === d.id && tk.status !== "done")
                        .reduce((sum, tk) => sum + tk.storyPoints, 0);
                      return { ...d, workloadPoints: activePoints };
                    });
                    await onSaveState({ ...state, tasks: updatedTasks, developers: updatedDevs });
                    setActiveTaskDetails({ ...activeTaskDetails, assignedTo: devId });
                  }}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed font-sans"
                >
                  <option value="">Unassigned</option>
                  {devs.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.role})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Required skill points */}
            {activeTaskDetails.skillsRequired.length > 0 && (
              <div className="font-sans">
                <span className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1.5">Target Skills Required</span>
                <div className="flex flex-wrap gap-1">
                  {activeTaskDetails.skillsRequired.map((sk, k) => (
                    <span key={k} className="text-[10px] bg-slate-100 text-slate-650 px-2 py-0.5 rounded font-mono font-semibold">{sk}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Subtasks checklists toggle updates */}
            <div>
              <span className="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-2">Detailed Task Subtasks checklist ({activeTaskDetails.subtasks?.length || 0})</span>
              <div className="flex flex-col gap-1.5 font-sans">
                {activeTaskDetails.subtasks?.map((sub) => (
                  <label key={sub.id} className="flex items-center gap-2.5 p-2 bg-slate-50/50 rounded-lg hover:bg-slate-100/45 cursor-pointer border border-slate-150 font-sans">
                    <input
                      type="checkbox"
                      checked={sub.done}
                      onChange={() => handleToggleSubtask(activeTaskDetails.id, sub.id)}
                      className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-550 h-3.5 w-3.5"
                    />
                    <span className={`text-xs ${sub.done ? "line-through text-slate-400" : "text-slate-700"}`}>
                      {sub.title}
                    </span>
                  </label>
                ))}
                {(!activeTaskDetails.subtasks || activeTaskDetails.subtasks.length === 0) && (
                  <p className="text-[11px] text-slate-400 italic font-sans">No subtask checkpoints configured for this card.</p>
                )}
              </div>
            </div>

            <div className="mt-2 text-right">
              <button
                onClick={() => setActiveTaskDetails(null)}
                className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg cursor-pointer font-sans"
              >
                Done Editing Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jira Settings Config Modal Overlay */}
      {showJiraSettings && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-xl max-w-md w-full p-6 text-left border border-slate-200 shadow-xl flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-teal-650 uppercase tracking-wider block">ATLASSIAN INTEGRATION</span>
                <h3 className="text-sm font-bold text-slate-900">Jira Sync configuration</h3>
              </div>
              <button
                onClick={() => {
                  setShowJiraSettings(false);
                  setJiraMessage(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                &times; Close
              </button>
            </div>

            <form onSubmit={handleSaveJiraSettings} className="flex flex-col gap-3 font-sans">
              <div>
                <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">
                  Jira Cloud Domain
                </label>
                <input
                  type="text"
                  value={jiraDomain}
                  onChange={(e) => setJiraDomain(e.target.value)}
                  placeholder="e.g. synapse-team.atlassian.net"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 font-sans"
                />
                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">Without https:// prefix</p>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">
                  Atlassian Email
                </label>
                <input
                  type="email"
                  value={jiraEmail}
                  onChange={(e) => setJiraEmail(e.target.value)}
                  placeholder="e.g. developer@company.com"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">
                  Atlassian API Token
                </label>
                <input
                  type="password"
                  value={jiraApiToken}
                  onChange={(e) => setJiraApiToken(e.target.value)}
                  placeholder="••••••••••••••••••••••••"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 font-sans"
                />
                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">Generate in Atlassian Account Security settings</p>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">
                  Jira Project Key
                </label>
                <input
                  type="text"
                  value={jiraProjectKey}
                  onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
                  placeholder="e.g. PROJ"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 font-sans"
                />
              </div>

              {/* Status indicator */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 text-[10.5px] text-slate-600 leading-snug font-sans">
                {envJiraConfig?.hasEnvConfig ? (
                  <span className="text-teal-600 font-semibold block">✓ System Env Preconfigured</span>
                ) : (
                  <span>Sandbox Fallback active. If credentials are left blank, simulated responses will run automatically.</span>
                )}
              </div>

              {jiraMessage && (
                <div className={`p-3 rounded-lg border text-xs ${
                  jiraMessage.type === "success" 
                    ? "bg-[#E6F4F1] border-[#A7DFD5] text-[#0D5C53]" 
                    : "bg-red-50 border-red-200 text-red-700"
                }`}>
                  {jiraMessage.text}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-2 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    setShowJiraSettings(false);
                    setJiraMessage(null);
                  }}
                  className="py-2 px-4 border border-slate-200 hover:bg-slate-100 text-slate-650 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJiraConnecting}
                  className="py-2 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-1.5 shadow-sm font-sans"
                >
                  {isJiraConnecting ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
                      Testing Auth...
                    </>
                  ) : (
                    "Save & Connect"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Jira Import Modal Overlay */}
      {showJiraImport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 text-left border border-slate-200 shadow-xl flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-teal-600 uppercase tracking-wider block">SCRUM IMPORT MECHANISM</span>
                <h3 className="text-sm font-bold text-slate-900">Import Jira Cloud Tickets ({jiraProjectKey || "PROJ"})</h3>
              </div>
              <button
                onClick={() => {
                  setShowJiraImport(false);
                  setJiraImportIssues([]);
                  setJiraMessage(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                &times; Close
              </button>
            </div>

            {jiraMessage && (
              <div className={`p-3 rounded-lg border text-xs ${
                jiraMessage.type === "success" 
                  ? "bg-[#E6F4F1] border-[#A7DFD5] text-[#0D5C53]" 
                  : "bg-red-50 border-red-200 text-red-700"
              }`}>
                {jiraMessage.text}
              </div>
            )}

            {isImporting ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 font-sans">
                <Loader2 className="h-8 w-8 animate-spin text-teal-650" />
                <p className="text-xs font-mono">Querying Atlassian JQL endpoint...</p>
              </div>
            ) : jiraImportIssues.length > 0 ? (
              <div className="flex flex-col gap-3 font-sans">
                <p className="text-xs text-slate-505 font-sans">
                  Select the tickets to bring over to your Synapse Scrum visual board.
                </p>

                <div className="max-h-[300px] overflow-y-auto border border-slate-150 rounded-lg p-2.5 flex flex-col gap-2 bg-slate-50/50">
                  {jiraImportIssues.map((issue) => {
                    const isSelected = selectedJiraIssues.includes(issue.key);
                    const isAlreadyImported = tasks.some(t => t.jiraKey === issue.key);

                    return (
                      <label 
                        key={issue.key}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                          isAlreadyImported 
                            ? "bg-slate-100/50 border-slate-200 opacity-60 cursor-not-allowed"
                            : isSelected
                            ? "bg-[#E6F4F1]/30 border-[#A7DFD5]"
                            : "bg-white border-slate-150 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={isAlreadyImported}
                          checked={isSelected && !isAlreadyImported}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedJiraIssues(selectedJiraIssues.filter(k => k !== issue.key));
                            } else {
                              setSelectedJiraIssues([...selectedJiraIssues, issue.key]);
                            }
                          }}
                          className="rounded border-slate-300 text-teal-650 focus:ring-teal-500 h-4 w-4 shrink-0 mt-0.5"
                        />
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between gap-2 font-sans">
                            <span className="text-[10.5px] font-mono font-bold text-teal-700">
                              {issue.key}
                            </span>
                            <span className={`text-[8.5px] uppercase px-1.5 py-0.5 rounded font-mono font-bold ${
                              issue.priority === "critical" ? "bg-red-50 text-red-700" :
                              issue.priority === "high" ? "bg-orange-50 text-orange-700" :
                              issue.priority === "medium" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-550"
                            }`}>
                              {issue.priority}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 leading-snug mt-1 font-sans">
                            {issue.title}
                          </h4>
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-sans">
                            {issue.description}
                          </p>
                          {isAlreadyImported && (
                            <span className="inline-block text-[9.5px] font-semibold text-teal-650 mt-1">
                              ✓ Already on board
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center mt-2 font-sans">
                  <button
                    onClick={handleFetchJiraIssues}
                    className="text-xs text-teal-605 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    Refresh Tickets
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowJiraImport(false);
                        setJiraImportIssues([]);
                        setJiraMessage(null);
                      }}
                      className="py-2 px-4 border border-slate-200 hover:bg-slate-100 text-slate-650 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImportSelectedIssues}
                      disabled={selectedJiraIssues.filter(key => !tasks.some(t => t.jiraKey === key)).length === 0}
                      className="py-2 px-4 bg-teal-600 hover:bg-teal-550 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-1.5 shadow-sm font-sans"
                    >
                      Import Selected ({selectedJiraIssues.filter(key => !tasks.some(t => t.jiraKey === key)).length})
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 italic flex flex-col items-center justify-center gap-3 font-sans">
                <CloudLightning className="h-8 w-8 text-slate-300 animate-pulse" />
                <p>No issues loaded. Connect with credentials or click below to pull mock sandbox data.</p>
                <button
                  onClick={handleFetchJiraIssues}
                  className="mt-2 py-1.5 px-4 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-lg cursor-pointer font-sans"
                >
                  Pull Jira Tickets
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

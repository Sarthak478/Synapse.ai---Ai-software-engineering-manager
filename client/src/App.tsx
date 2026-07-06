import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import LoginScreen from "./components/LoginScreen";
import DashboardOverview from "./components/DashboardOverview";
import RepoIntelligence from "./components/RepoIntelligence";
import SprintPlanner from "./components/SprintPlanner";
import CodeReviewer from "./components/CodeReviewer";
import TeamAnalytics from "./components/TeamAnalytics";
import PMAssistant from "./components/PMAssistant";
import DailyStandups from "./components/DailyStandups";
import { AppState } from "./types";
import { RefreshCw, LayoutDashboard, SlidersHorizontal, Info, Sun, Moon } from "lucide-react";
import { motion } from "motion/react";
import { defaultProjectData } from "./defaultProjectData";

// Helper to cryptographically hash raw api keys (one-way SHA-256) client-side
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Helper to fetch/save project-specific states purely client-side for zero-knowledge compliance
// DATA ISOLATION: Each user gets their own scoped localStorage key partitioned by workspaceId and devId.
function getProjectDataKey(workspaceId: string | null, devId: string | null) {
  if (!workspaceId || !devId) return "";
  return `synapse-project-data-${workspaceId}-${devId}`;
}

function loadLocalProjectData(workspaceId: string | null, devId: string | null) {
  if (!workspaceId || !devId) return { ...defaultProjectData };

  // Purge old global key on first scoped load to prevent data leakage
  if (localStorage.getItem("synapse-project-data")) {
    localStorage.removeItem("synapse-project-data");
  }
  if (localStorage.getItem("synapse-shared-gemini-key")) {
    localStorage.removeItem("synapse-shared-gemini-key");
  }

  const stored = localStorage.getItem(getProjectDataKey(workspaceId, devId));
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse stored project data:", e);
    }
  }
  // First login for this user — start with a completely clean slate
  return { ...defaultProjectData };
}

function saveLocalProjectData(workspaceId: string | null, devId: string | null, state: any) {
  if (!workspaceId || !devId) return;
  const toSave = {
    repositories: state.repositories || [],
    tasks: state.tasks || [],
    codeReviews: state.codeReviews || [],
    standups: state.standups || [],
    chats: state.chats || [],
    sprints: state.sprints || []
  };
  localStorage.setItem(getProjectDataKey(workspaceId, devId), JSON.stringify(toSave));
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active developer profile state - requiring secure authentication
  const [activeDevId, setActiveDevId] = useState<string | null>(() => {
    return localStorage.getItem("synapse-active-dev-id") || sessionStorage.getItem("synapse-active-dev-id") || null;
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    return localStorage.getItem("synapse-active-workspace-id") || sessionStorage.getItem("synapse-active-workspace-id") || null;
  });

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return localStorage.getItem("synapse-session-token") || sessionStorage.getItem("synapse-session-token") || null;
  });

  const [publicDevs, setPublicDevs] = useState<any[]>([]);

  const handleLogout = () => {
    setActiveDevId(null);
    setSessionToken(null);
    setActiveWorkspaceId(null);
    localStorage.removeItem("synapse-active-dev-id");
    sessionStorage.removeItem("synapse-active-dev-id");
    localStorage.removeItem("synapse-session-token");
    sessionStorage.removeItem("synapse-session-token");
    localStorage.removeItem("synapse-active-workspace-id");
    sessionStorage.removeItem("synapse-active-workspace-id");
    setState(null);
  };

  const handleSetActiveDevId = (id: string | null, rememberMe: boolean = false) => {
    setActiveDevId(id);
    if (id) {
      if (rememberMe) {
        localStorage.setItem("synapse-active-dev-id", id);
      } else {
        sessionStorage.setItem("synapse-active-dev-id", id);
      }
    }
  };

  const handleSetActiveWorkspaceId = (workspaceId: string | null, rememberMe: boolean = false) => {
    setActiveWorkspaceId(workspaceId);
    if (workspaceId) {
      if (rememberMe) {
        localStorage.setItem("synapse-active-workspace-id", workspaceId);
      } else {
        sessionStorage.setItem("synapse-active-workspace-id", workspaceId);
      }
    }
  };

  const handleSetSessionToken = (token: string | null, rememberMe: boolean = false) => {
    setSessionToken(token);
    if (token) {
      if (rememberMe) {
        localStorage.setItem("synapse-session-token", token);
      } else {
        sessionStorage.setItem("synapse-session-token", token);
      }
    }
  };

  const handleAddDeveloperFromApp = async (newDev: any) => {
    if (!state) return;
    const updatedDevs = [...state.developers, newDev];
    await handleSaveState({
      ...state,
      developers: updatedDevs
    });
    // Head registers teammate - keep activeDevId as the Head! No automatic session switching.
  };

  const handleUpdateProfileAndSettings = async (updatedDev: any, rawGeminiKey?: string) => {
    if (!state) return;
    
    // Process Developer
    const updatedDevs = state.developers.map(d => d.id === updatedDev.id ? updatedDev : d);
    let newState = { ...state, developers: updatedDevs };

    // Process Gemini Key if provided
    let rawKeyToSend = undefined;
    if (rawGeminiKey !== undefined) {
      if (rawGeminiKey && rawGeminiKey !== "configured (masked for security)") {
        const hash = await hashApiKey(rawGeminiKey);
        newState = {
          ...newState,
          settings: {
            ...newState.settings,
            hasGeminiApiKey: true,
            geminiApiKeyHash: hash
          } as any
        };
        rawKeyToSend = rawGeminiKey;
      } else if (rawGeminiKey === "") {
        newState = {
          ...newState,
          settings: {
            ...newState.settings,
            hasGeminiApiKey: false,
            geminiApiKeyHash: ""
          } as any
        };
        rawKeyToSend = "";
      }
    }

    await handleSaveState(newState, rawKeyToSend);
  };

  const handleRemoveDeveloperFromApp = async (devId: string) => {
    if (!state) return;
    const updatedDevs = state.developers.filter(d => d.id !== devId);
    const updatedTasks = (state.tasks || []).map(t => {
      if (t.assignedTo === devId) {
        return { ...t, assignedTo: undefined };
      }
      return t;
    });
    await handleSaveState({
      ...state,
      developers: updatedDevs,
      tasks: updatedTasks
    });
    if (activeDevId === devId) {
      handleSetActiveDevId(null);
    }
  };

  // Elegant Coffee Espresso Dark mode state persisting to local storage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("workspace-theme") === "dark";
  });

  useEffect(() => {
    if (isDarkMode) {
      localStorage.setItem("workspace-theme", "dark");
    } else {
      localStorage.setItem("workspace-theme", "light");
    }
  }, [isDarkMode]);

  // Fetch compiled server DB states on mount
  const fetchState = async (tokenToUse?: string) => {
    const token = tokenToUse || sessionToken;
    if (!token) return;
    setIsSyncing(true);
    try {
      const response = await fetch("/api/state", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.status === 401 || response.status === 403) {
        handleLogout();
        return;
      }
      if (!response.ok) throw new Error("Could not contact persistent state server");
      const data = await response.json();

      // Load local project state and merge with server state (scoped to this user and workspace)
      const currentDevId = activeDevId;
      const localProject = loadLocalProjectData(activeWorkspaceId, currentDevId);
      const merged = {
        ...data,
        ...localProject,
        settings: {
          ...data.settings,
          hasGeminiApiKey: data.settings?.hasGeminiApiKey
        }
      };
      setState(merged);
      setErrorMessage(null);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Fullstack database disconnected. Retrying in background...");
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchPublicDevs = async () => {
    // Developers list is now queried dynamically per workspace if needed, 
    // but since we removed the quick roster it's mostly unused.
    if (!activeWorkspaceId) return;
    try {
      const response = await fetch(`/api/auth/developers?workspaceId=${encodeURIComponent(activeWorkspaceId)}`);
      if (response.ok) {
        const data = await response.json();
        setPublicDevs(data);
      }
    } catch (err) {
      console.error("Error fetching public developers list:", err);
    }
  };

  useEffect(() => {
    if (sessionToken) {
      fetchState(sessionToken);
    } else {
      fetchPublicDevs();
    }
  }, [sessionToken, activeWorkspaceId]);

  // Synchronize state changes to server JSON DB securely
  const handleSaveState = async (updatedState: AppState, rawGeminiKeyToSend?: string) => {
    // 1. Save project-specific fields strictly to local storage (zero-knowledge, user-scoped)
    saveLocalProjectData(activeWorkspaceId, activeDevId, updatedState);

    // 2. Perform instant optimistic local state update for responsiveness
    setState(updatedState);

    if (!sessionToken) return;
    setIsSyncing(true);
    try {
      // Prepare sanitized body to send to server
      const payload: any = {
        developers: updatedState.developers,
        settings: {
          geminiApiKeyHash: updatedState.settings?.geminiApiKeyHash || "",
          notifications: updatedState.settings?.notifications || [],
          recoveryPasscodes: updatedState.settings?.recoveryPasscodes || []
        }
      };

      if (rawGeminiKeyToSend !== undefined) {
        payload.settings.geminiApiKeyEncrypted = rawGeminiKeyToSend;
      }

      const response = await fetch("/api/state/save", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify(payload)
      });
      if (response.status === 401 || response.status === 403) {
        handleLogout();
        throw new Error("Session expired. Please log in again.");
      }
      if (!response.ok) throw new Error("Could not sync state to server");
      const data = await response.json();
      if (data.state) {
        const localProject = loadLocalProjectData(activeWorkspaceId, activeDevId);
        const merged = {
          ...data.state,
          ...localProject,
          settings: {
            ...data.state.settings,
            hasGeminiApiKey: data.state.settings?.hasGeminiApiKey
          }
        };
        setState(merged);
      }
    } catch (err) {
      console.error("State synchronization failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Reset database state — clears all project data
  const handleResetDatabase = async () => {
    if (!window.confirm("Are you sure you want to clear all sprint plans, repositories, tasks, and logs? This cannot be undone.")) return;
    if (!sessionToken) return;
    setIsSyncing(true);
    try {
      // 1. Reset client-side project data for this user
      if (activeDevId) {
        localStorage.removeItem(getProjectDataKey(activeWorkspaceId, activeDevId));
      }

      const response = await fetch("/api/state/reset", { 
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sessionToken}`
        }
      });
      if (response.status === 401 || response.status === 403) {
        handleLogout();
        throw new Error("Session expired. Please log in again.");
      }
      if (!response.ok) throw new Error("Could not reset");
      const data = await response.json();
      
      const merged = {
        ...data.state,
        ...defaultProjectData,
        settings: {
          hasGeminiApiKey: false
        }
      };
      setState(merged);
      setCurrentTab("dashboard");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to reset database.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoToTab = (tab: string) => {
    if (tab === "settings") {
      setShowProfileModal(true);
    } else {
      setCurrentTab(tab);
    }
  };

  // ENFORCE AUTHENTICATION: Show LoginScreen if not authenticated
  if (!sessionToken || !activeDevId || !activeWorkspaceId) {
    return (
      <LoginScreen
        developers={publicDevs}
        onLoginSuccess={(token, devId, rememberMe, workspaceId) => {
          handleSetSessionToken(token, rememberMe);
          handleSetActiveDevId(devId, rememberMe);
          handleSetActiveWorkspaceId(workspaceId, rememberMe);
        }}
      />
    );
  }

  if (!state) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-neutral-950 text-white gap-3">
        <LoaderComponent />
        <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest animate-pulse">Initializing Secured AI PM workspace...</span>
      </div>
    );
  }

  const loggedInDev = state.developers.find(d => d.id === activeDevId);
  if (!loggedInDev) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-neutral-950 text-white gap-3">
        <button onClick={handleLogout} className="px-4 py-2 bg-teal-600 text-white rounded-lg">
          Session Error: Re-Authenticate
        </button>
      </div>
    );
  }

  // Derive simple progress rates
  const sprintTasks = state.tasks || [];
  const completedTasksCount = sprintTasks.filter(t => t.status === "done").length;
  const totalTasksCount = sprintTasks.length;
  const completionScore = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const unreadNotifications = state.settings?.notifications?.filter((n: any) => !n.readBy.includes(activeDevId)) || [];
  const activePasscodes = state.settings?.recoveryPasscodes?.filter((rp: any) => rp.expiresAt > Date.now()) || [];

  const handleDismissNotification = async (notifId: string) => {
    const updatedNotifs = state.settings?.notifications?.map((n: any) => {
      if (n.id === notifId) return { ...n, readBy: [...n.readBy, activeDevId] };
      return n;
    }) || [];
    await handleSaveState({ ...state, settings: { ...state.settings, notifications: updatedNotifs } as any });
  };

  const handleDismissPasscode = async (passcodeVal: string) => {
    const updatedPasscodes = state.settings?.recoveryPasscodes?.filter((rp: any) => rp.passcode !== passcodeVal) || [];
    await handleSaveState({ ...state, settings: { ...state.settings, recoveryPasscodes: updatedPasscodes } as any });
  };

  return (
    <div className={`flex bg-beige-50 min-h-screen text-coffee-800 antialiased font-sans transition-colors duration-200 ${isDarkMode ? "dark bg-[#150E0A] text-[#ECE4DE]" : ""}`}>
      
      {/* GLOBAL OVERLAYS — always-visible toasts with solid opaque backdrop */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {unreadNotifications.map((n: any) => (
          <div
            key={n.id}
            className="bg-[#0F1F1A] border border-teal-500 p-3 rounded-xl shadow-2xl max-w-sm pointer-events-auto flex items-start gap-3 animate-in slide-in-from-right-8 backdrop-blur-md"
          >
            <Info className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-teal-300 mb-0.5">New Member Announcement</h4>
              <p className="text-[10px] text-slate-300 leading-snug">{n.message}</p>
            </div>
            <button
              onClick={() => handleDismissNotification(n.id)}
              className="text-[9px] font-bold text-teal-400 hover:text-white bg-teal-900/60 hover:bg-teal-700 px-2 py-1 rounded transition-colors shrink-0"
            >
              Dismiss
            </button>
          </div>
        ))}

        {loggedInDev.isHead && activePasscodes.map((rp: any) => (
          <div
            key={rp.passcode}
            className="bg-[#1F1500] border border-amber-500 p-3 rounded-xl shadow-2xl max-w-sm pointer-events-auto flex items-start gap-3 animate-in slide-in-from-right-8 backdrop-blur-md"
          >
            <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-amber-300 mb-0.5">🔑 Passcode Request</h4>
              <p className="text-[10px] text-amber-200 mb-1.5">
                Password reset requested for: <strong className="text-white">{rp.userId}</strong>
              </p>
              <p className="text-xs font-mono font-bold bg-amber-900/60 border border-amber-700 text-amber-200 px-2 py-1 rounded-lg inline-block tracking-widest">
                {rp.passcode}
              </p>
            </div>
            <button
              onClick={() => handleDismissPasscode(rp.passcode)}
              className="text-[9px] font-bold text-amber-900 bg-amber-400 hover:bg-amber-300 px-2 py-1 rounded transition-colors shrink-0"
            >
              Done
            </button>
          </div>
        ))}

        {loggedInDev.passwordChangedAt === null && (
          <div
            className="bg-[#1A0F00] border-2 border-amber-500 p-3.5 rounded-xl shadow-2xl max-w-sm pointer-events-auto flex items-start gap-3 animate-in slide-in-from-right-8 backdrop-blur-md"
          >
            <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Info className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-amber-300 mb-0.5">⚠️ Security Reminder</h4>
              <p className="text-[10px] text-amber-100/80 leading-snug">
                You are using the <span className="text-amber-300 font-bold">default password</span>. Update it in Settings to secure your account.
              </p>
              <button
                onClick={() => setShowProfileModal(true)}
                className="mt-1.5 text-[9px] font-bold text-amber-900 bg-amber-400 hover:bg-amber-300 px-2.5 py-1 rounded-md transition-colors"
              >
                Open Settings →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Structural Sidebar Drawer */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onReset={handleResetDatabase}
        isSyncing={isSyncing}
        completionScore={completionScore}
        developers={state.developers}
        activeDevId={activeDevId}
        onSetActiveDevId={handleSetActiveDevId}
        onAddDeveloper={handleAddDeveloperFromApp}
        onRemoveDeveloper={handleRemoveDeveloperFromApp}
        onUpdateProfileAndSettings={handleUpdateProfileAndSettings}
        settings={state.settings}
        showProfileModal={showProfileModal}
        setShowProfileModal={setShowProfileModal}
      />

      {/* Main viewport area */}
      <main className="flex-grow pl-72 pr-8 py-6 flex flex-col gap-6 ml-0 w-full min-h-screen relative">
        
        {/* Top Header navbar banner */}
        <header className="flex justify-between items-center bg-white/90 px-6 py-4 rounded-xl border border-beige-200 shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
            </span>
            <span className="text-[10.5px] font-mono bg-beige-100 text-coffee-850 font-extrabold uppercase py-0.5 px-2 rounded border border-beige-200">SYNAPSE SECURE</span>
            <span className="text-slate-300 font-light text-xs">&mdash;</span>
            <span className="text-xs font-bold text-coffee-600 capitalize tracking-tight">{currentTab.replace("-", " ")} Workspace</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Syncing indicator spinner */}
            {isSyncing && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-teal-700 font-bold">
                <RefreshCw className="h-3 w-3 animate-spin text-teal-600" />
                <span>SYNCING LEDGER...</span>
              </div>
            )}

            {/* Error notifications */}
            {errorMessage && (
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg text-[10.5px] font-mono text-red-600 font-bold">
                <Info className="h-3.5 w-3.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Elegant Dark / Light Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 bg-beige-100 hover:bg-beige-250 dark:bg-[#2D2018] dark:hover:bg-[#3D2D23] text-coffee-800 dark:text-amber-500 rounded-lg border border-beige-200/60 transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="Toggle Espresso Dark Mode"
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : (
                <Moon className="h-4 w-4 text-coffee-600" />
              )}
            </button>

            {/* Account identifier */}
            <div className="flex items-center gap-2.5 bg-beige-50 hover:bg-beige-100 transition-colors pointer-events-none px-3 py-1.5 rounded-lg border border-beige-200">
              <div className="h-6 w-6 bg-teal-600 text-white flex items-center justify-center font-bold text-[10px] rounded-full">
                S
              </div>
              <span className="text-xs font-bold text-coffee-800 leading-none">sarthakameriya@gmail.com</span>
            </div>
          </div>
        </header>

        {/* View content panel Router with frame animations */}
        <div className="flex-1 w-full relative">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.16 }}
            className="w-full"
          >
            {currentTab === "dashboard" && <DashboardOverview state={state} goToTab={handleGoToTab} />}
            {currentTab === "repos" && <RepoIntelligence state={state} onSaveState={handleSaveState} goToTab={handleGoToTab} />}
            {currentTab === "sprints" && <SprintPlanner state={state} onSaveState={handleSaveState} goToTab={handleGoToTab} activeDevId={activeDevId} />}
            {currentTab === "reviewer" && <CodeReviewer state={state} onSaveState={handleSaveState} goToTab={handleGoToTab} />}
            {currentTab === "analytics" && <TeamAnalytics state={state} onSaveState={handleSaveState} goToTab={handleGoToTab} />}
            {currentTab === "assistant" && <PMAssistant state={state} onSaveState={handleSaveState} goToTab={handleGoToTab} />}
            {currentTab === "standups" && <DailyStandups state={state} onSaveState={handleSaveState} />}
          </motion.div>
        </div>

        {/* Custom minimalist footer */}
        <footer className="mt-8 flex justify-between items-center text-[10.5px] text-slate-400 font-mono border-t border-slate-200/60 pt-5 pr-2">
          <span>SYNAPSE AI ENGINE &mdash; SUITE V2.5</span>
          <span>JUNE 2026 WORKSPACE</span>
        </footer>

      </main>
    </div>
  );
}

// Inline custom loader spinner for pre-load states
function LoaderComponent() {
  return (
    <div className="relative h-10 w-10 flex items-center justify-center">
      <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full"></div>
      <div className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

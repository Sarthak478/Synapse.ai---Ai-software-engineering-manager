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
function loadLocalProjectData() {
  const stored = localStorage.getItem("synapse-project-data");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse stored project data:", e);
    }
  }
  localStorage.setItem("synapse-project-data", JSON.stringify(defaultProjectData));
  return defaultProjectData;
}

function saveLocalProjectData(state: any) {
  const toSave = {
    repositories: state.repositories || [],
    tasks: state.tasks || [],
    codeReviews: state.codeReviews || [],
    standups: state.standups || [],
    chats: state.chats || [],
    sprints: state.sprints || []
  };
  localStorage.setItem("synapse-project-data", JSON.stringify(toSave));
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active developer profile state - requiring secure authentication
  const [activeDevId, setActiveDevId] = useState<string | null>(() => {
    return localStorage.getItem("synapse-active-dev-id") || null; // Require login first time
  });

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return localStorage.getItem("synapse-session-token") || null;
  });

  const [publicDevs, setPublicDevs] = useState<any[]>([]);

  const handleLogout = () => {
    setActiveDevId(null);
    setSessionToken(null);
    localStorage.removeItem("synapse-active-dev-id");
    localStorage.removeItem("synapse-session-token");
    setState(null);
  };

  const handleSetActiveDevId = (id: string | null) => {
    setActiveDevId(id);
    if (id) {
      localStorage.setItem("synapse-active-dev-id", id);
    } else {
      handleLogout();
    }
  };

  const handleSetSessionToken = (token: string | null) => {
    setSessionToken(token);
    if (token) {
      localStorage.setItem("synapse-session-token", token);
    } else {
      localStorage.removeItem("synapse-session-token");
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

  const handleUpdateDeveloper = async (updatedDev: any) => {
    if (!state) return;
    const updatedDevs = state.developers.map(d => d.id === updatedDev.id ? updatedDev : d);
    await handleSaveState({
      ...state,
      developers: updatedDevs
    });
  };

  const handleUpdateSettings = async (updatedSettings: { geminiApiKey: string }) => {
    if (!state) return;
    const rawKey = updatedSettings.geminiApiKey;
    if (rawKey && rawKey !== "configured (masked for security)") {
      localStorage.setItem("synapse-shared-gemini-key", rawKey);
      const hash = await hashApiKey(rawKey);
      await handleSaveState({
        ...state,
        settings: {
          ...state.settings,
          hasGeminiApiKey: true,
          geminiApiKeyHash: hash,
          geminiApiKey: rawKey
        } as any
      });
    } else if (rawKey === "") {
      localStorage.removeItem("synapse-shared-gemini-key");
      await handleSaveState({
        ...state,
        settings: {
          ...state.settings,
          hasGeminiApiKey: false,
          geminiApiKeyHash: "",
          geminiApiKey: ""
        } as any
      });
    }
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

      // Load local project state and merge with server state
      const localProject = loadLocalProjectData();
      const merged = {
        ...data,
        ...localProject,
        settings: {
          hasGeminiApiKey: data.settings?.hasGeminiApiKey || !!localStorage.getItem("synapse-shared-gemini-key"),
          geminiApiKey: localStorage.getItem("synapse-shared-gemini-key") || ""
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
    try {
      const response = await fetch("/api/auth/developers");
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
  }, [sessionToken]);

  // Synchronize state changes to server JSON DB securely
  const handleSaveState = async (updatedState: AppState) => {
    // 1. Save project-specific fields strictly to local storage (zero-knowledge)
    saveLocalProjectData(updatedState);

    // 2. Perform instant optimistic local state update for responsiveness
    setState(updatedState);

    if (!sessionToken) return;
    setIsSyncing(true);
    try {
      // Prepare sanitized body to send to server (only developers roster and key hash status)
      const payload = {
        developers: updatedState.developers,
        settings: {
          geminiApiKeyHash: updatedState.settings?.geminiApiKeyHash || ""
        }
      };

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
        const localProject = loadLocalProjectData();
        const merged = {
          ...data.state,
          ...localProject,
          settings: {
            hasGeminiApiKey: data.state.settings?.hasGeminiApiKey || !!localStorage.getItem("synapse-shared-gemini-key"),
            geminiApiKey: localStorage.getItem("synapse-shared-gemini-key") || ""
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

  // Reset database state totally back to initial parameters
  const handleResetDatabase = async () => {
    if (!window.confirm("Are you sure you want to reset all sprint plans, repositories, and logs back to default demo logs?")) return;
    if (!sessionToken) return;
    setIsSyncing(true);
    try {
      // 1. Reset client-side project data to default mock
      localStorage.setItem("synapse-project-data", JSON.stringify(defaultProjectData));
      localStorage.removeItem("synapse-shared-gemini-key");

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
          hasGeminiApiKey: false,
          geminiApiKey: ""
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
  if (!sessionToken || !activeDevId) {
    return (
      <LoginScreen
        developers={publicDevs}
        onLoginSuccess={(token, devId) => {
          handleSetSessionToken(token);
          handleSetActiveDevId(devId);
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

  return (
    <div className={`flex bg-beige-50 min-h-screen text-coffee-800 antialiased font-sans transition-colors duration-200 ${isDarkMode ? "dark bg-[#150E0A] text-[#ECE4DE]" : ""}`}>
      
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
        onUpdateDeveloper={handleUpdateDeveloper}
        settings={state.settings}
        onUpdateSettings={handleUpdateSettings}
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

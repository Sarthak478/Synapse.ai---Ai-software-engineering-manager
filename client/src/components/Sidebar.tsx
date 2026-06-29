import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  GitBranch,
  CalendarCheck,
  Code2,
  Users2,
  MessageSquare,
  ClipboardList,
  RefreshCw,
  ShieldAlert,
  UserPlus2,
  UserCheck,
  User,
  PlusCircle,
  X,
  Sparkles,
  Copy,
  Check,
  Crown,
  Trash2,
  Settings,
  AlertCircle
} from "lucide-react";
import { Developer } from "../types";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onReset: () => void;
  isSyncing: boolean;
  completionScore: number;
  developers: Developer[];
  activeDevId: string | null;
  onSetActiveDevId: (id: string | null) => void;
  onAddDeveloper: (dev: Developer) => Promise<void>;
  onRemoveDeveloper: (devId: string) => Promise<void>;
  onUpdateDeveloper: (dev: Developer) => Promise<void>;
  settings?: any;
  onUpdateSettings?: (updatedSettings: any) => Promise<void>;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  onReset,
  isSyncing,
  completionScore,
  developers = [],
  activeDevId,
  onSetActiveDevId,
  onAddDeveloper,
  onRemoveDeveloper,
  onUpdateDeveloper,
  settings,
  onUpdateSettings
}: SidebarProps) {
  const projectPulseTabs = [
    { id: "dashboard", label: "Overview Dashboard", icon: LayoutDashboard },
    { id: "repos", label: "Repo Intelligence", icon: GitBranch },
    { id: "sprints", label: "Sprint Planner", icon: CalendarCheck },
    { id: "reviewer", label: "AI Code Review", icon: Code2 },
    { id: "standups", label: "Daily Standups", icon: ClipboardList }
  ];

  const analyticsTabs = [
    { id: "analytics", label: "Team Velocity", icon: Users2 },
    { id: "assistant", label: "AI PM Assistant", icon: MessageSquare }
  ];

  // Dynamic profile states
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [profileTab, setProfileTab] = useState<"claim" | "register">("claim"); // "claim" will be "My Session"
  
  // Registration state
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newSkills, setNewSkills] = useState("");
  const [registerAsHead, setRegisterAsHead] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newPassword, setNewPassword] = useState("password123");

  // Edit profile state (for self-editing active dev credentials & password)
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSkills, setEditSkills] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editJiraDomain, setEditJiraDomain] = useState("");
  const [editApiToken, setEditApiToken] = useState("");
  const [editGithubToken, setEditGithubToken] = useState("");
  const [editCustomEndpoint, setEditCustomEndpoint] = useState("");

  // Toast notifications for Clipboard & Actions
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeDev = developers.find(d => d.id === activeDevId);
  const isHead = activeDev?.isHead === true;

  // Sync self-edit states with activeDev profile when modal or dev changes
  useEffect(() => {
    if (activeDev) {
      setEditName(activeDev.name);
      setEditRole(activeDev.role);
      setEditEmail(activeDev.email || "");
      setEditSkills(activeDev.skills?.join(", ") || "");
      setEditPassword(activeDev.password || "password123");
      setEditJiraDomain(activeDev.personalCredentials?.jiraDomain || "");
      setEditApiToken(activeDev.personalCredentials?.apiToken || "");
      setEditGithubToken(activeDev.personalCredentials?.githubToken || "");
      setEditCustomEndpoint(activeDev.personalCredentials?.customEndpoint || "");
    }
  }, [activeDev, showProfileModal]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handle invitation link copying
  const handleCopyInviteLink = () => {
    const inviteText = `Join my Synapse AI workspace: ${window.location.origin}/`;
    navigator.clipboard.writeText(inviteText)
      .then(() => showToast("✓ Shared Invitation Link Copied!"))
      .catch(() => showToast("Failed to copy link"));
  };

  // Handle register a completely new developer profile (only Team Head can do this)
  const handleRegisterDeveloper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRole.trim() || !newUserId.trim() || !newPassword.trim()) return;

    if (!isHead) {
      showToast("Access Denied: Only a Team Head can add members.");
      return;
    }

    const cleanUserId = newUserId.trim().toLowerCase().replace(/\s+/g, "");
    
    // Check for duplicate userId
    const isDuplicate = developers.some(d => d.userId?.toLowerCase() === cleanUserId);
    if (isDuplicate) {
      showToast("Error: This User ID is already taken! Choose a unique identifier.");
      return;
    }

    const newDevObj: Developer = {
      id: `dev-${Date.now()}`,
      name: newName.trim(),
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150`,
      email: newEmail.trim() || `${cleanUserId}@company.com`,
      role: newRole.trim(),
      skills: newSkills.split(",").map(s => s.trim()).filter(Boolean),
      workloadPoints: 0,
      velocity: 10,
      isHead: registerAsHead,
      userId: cleanUserId,
      password: newPassword.trim(),
      personalCredentials: {},
      contributions: { commits: 0, PRs: 0, reviews: 0 }
    };

    await onAddDeveloper(newDevObj);
    setNewName("");
    setNewRole("");
    setNewEmail("");
    setNewSkills("");
    setNewUserId("");
    setNewPassword("password123");
    setRegisterAsHead(false);
    setShowProfileModal(false);
    showToast(`✓ Member ${newDevObj.name} registered with User ID: ${cleanUserId}!`);
  };

  // Handle saving teammate self-updates
  const handleSaveSelfEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDev) return;

    const updatedDevObj: Developer = {
      ...activeDev,
      name: editName.trim(),
      role: editRole.trim(),
      email: editEmail.trim(),
      password: editPassword.trim(),
      skills: editSkills.split(",").map(s => s.trim()).filter(Boolean),
      personalCredentials: {
        jiraDomain: editJiraDomain.trim(),
        apiToken: editApiToken.trim(),
        githubToken: editGithubToken.trim(),
        customEndpoint: editCustomEndpoint.trim()
      }
    };

    await onUpdateDeveloper(updatedDevObj);
    setShowProfileModal(false);
    showToast("✓ Personal Profile & Keys Saved!");
  };

  const handleRemoveProfile = async (e: React.MouseEvent, devId: string, devName: string) => {
    e.stopPropagation();
    if (!isHead) {
      showToast("Only Team Head can remove profiles.");
      return;
    }
    if (devId === activeDevId) {
      showToast("Cannot delete your own active session profile!");
      return;
    }
    if (window.confirm(`Are you sure you want to remove ${devName} from this workspace?`)) {
      await onRemoveDeveloper(devId);
      showToast(`✓ Profile ${devName} removed.`);
    }
  };

  return (
    <aside className="w-64 bg-[#251A13] border-r border-[#3D2E24] text-slate-300 flex flex-col justify-between h-screen fixed top-0 left-0 z-20 font-sans">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* App Branding consistent with Professional Polish design Σ */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-600 rounded flex items-center justify-center text-white font-bold text-lg select-none">
            Σ
          </div>
          <div className="text-left">
            <span className="text-white font-bold text-base tracking-tight leading-none block">SYNAPSE AI</span>
            <span className="text-[9px] font-mono text-teal-300 font-bold uppercase tracking-widest mt-0.5 block">Engineering Suite</span>
          </div>
        </div>

        {/* Global Standby Indicator */}
        <div className="px-6 mb-4">
          <div className="bg-[#18110D]/60 rounded-lg p-3 border border-[#3D2E24]/70 flex flex-col gap-1.5 animate-fade-in font-sans">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500">STATUS</span>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500"></span>
                </span>
                <span className="text-teal-400 font-extrabold font-mono">ONLINE</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500">SPRINT COMP.</span>
              <span className="text-white font-bold font-mono">{completionScore}%</span>
            </div>
          </div>
        </div>

        {/* Invite Teammates Card with Link Clipboard support */}
        <div className="px-6 mb-4">
          <div className="bg-[#2D2018]/40 rounded-xl p-3 border border-dashed border-[#4D3D33] text-left">
            <h4 className="text-[11px] font-bold text-white mb-1 flex items-center gap-1.5">
              <Users2 className="h-3 w-3 text-teal-400" />
              Invite Your Team
            </h4>
            <p className="text-[10px] text-slate-400 leading-snug mb-2.5">
              Teammates can claim seats or build profiles in real-time.
            </p>
            <button
              onClick={handleCopyInviteLink}
              className="w-full py-1.5 px-2 bg-teal-600 hover:bg-teal-550 text-white font-bold text-[10px] rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm font-sans"
            >
              <Copy className="h-3 w-3" />
              Copy Invitation Link
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 px-4 space-y-4">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Project Pulse</div>
            <div className="space-y-1">
              {projectPulseTabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id)}
                    className={`flex items-center gap-3 px-3 py-2 text-slate-300 rounded-md text-sm transition-all duration-150 text-left w-full cursor-pointer ${
                      isActive
                        ? "text-white font-bold bg-[#3D2E24] border-l-2 border-teal-500"
                        : "hover:bg-[#3D2E24]/50 hover:text-white"
                    }`}
                  >
                    <IconComponent className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Analytics & AI</div>
            <div className="space-y-1 font-sans">
              {analyticsTabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id)}
                    className={`flex items-center gap-3 px-3 py-2 text-slate-300 rounded-md text-sm transition-all duration-150 text-left w-full cursor-pointer ${
                       isActive
                        ? "text-white font-bold bg-[#3D2E24] border-l-2 border-teal-500"
                        : "hover:bg-[#3D2E24]/50 hover:text-white"
                    }`}
                  >
                    <IconComponent className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {/* Sync Status and Custom Actions */}
      <div className="p-4 border-t border-[#3D2E24] bg-[#18110D]/30 flex flex-col gap-2 font-sans">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-2 font-bold">
          <span>REPOSITORIES DB</span>
          {isSyncing ? (
            <span className="text-teal-400 animate-spin flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
            </span>
          ) : (
            <span className="text-slate-400 uppercase">Synced (0.4s)</span>
          )}
        </div>
        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 border border-[#3D2E24] bg-[#251A13]/40 rounded hover:bg-[#3D2E24] transition-colors duration-150 text-[10.5px] text-slate-400 hover:text-white font-bold cursor-pointer font-sans"
        >
          <RefreshCw className="h-2.5 w-2.5" />
          Reset Demo Logs
        </button>
      </div>

      {/* Profile Bar - Beautifully interactive for Session Settings & Keys */}
      <div 
        onClick={() => setShowProfileModal(true)}
        className="p-4 bg-[#18110D] border-t border-[#3D2E24] text-left hover:bg-[#1D140F] transition-all duration-150 cursor-pointer group relative font-sans"
        title="View session details, edit password, and configure API integrations"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeDev ? (
              <img
                src={activeDev.avatar}
                alt={activeDev.name}
                referrerPolicy="no-referrer"
                className={`w-8 h-8 rounded-full border object-cover shrink-0 ${activeDev.isHead ? "border-amber-400 ring-1 ring-amber-400/30" : "border-teal-500"}`}
              />
            ) : (
              <div className="w-8 h-8 rounded bg-[#3D2E24] flex items-center justify-center text-slate-400 text-xs border border-[#3D2E24]">
                <User className="h-4 w-4" />
              </div>
            )}
            <div className="text-xs">
              <div className="text-white font-bold leading-none flex items-center gap-1">
                {activeDev ? activeDev.name : "Unauthenticated"}
                {activeDev?.isHead && <Crown className="h-3 w-3 text-amber-400" title="Team Head / Lead" />}
                <span className="h-1.5 w-1.5 bg-teal-400 rounded-full animate-pulse"></span>
              </div>
              <div className="text-slate-500 font-mono mt-1 leading-none text-[10px] flex items-center gap-1">
                {activeDev ? activeDev.role : "Sign In to Access"}
              </div>
            </div>
          </div>
          <span className="text-[9px] font-bold font-mono text-teal-400 bg-teal-950/40 px-1.5 py-0.5 rounded border border-teal-900 opacity-65 group-hover:opacity-100 transition-opacity">
            SETTINGS
          </span>
        </div>
      </div>

      {/* Team Profile Claim & Register Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 text-left border border-slate-200 shadow-2xl flex flex-col gap-4 animate-scale-up dark:bg-[#1A120C] dark:border-[#3D2E24] text-slate-800 dark:text-[#ECE4DE]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-[#3D2E24]/50">
              <div>
                <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">TEAM SESSION & SECURITY</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#ECE4DE]">Profile Configurations & API Keys</h3>
              </div>
              <button
                onClick={() => {
                  setShowProfileModal(false);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer dark:text-[#A38F82]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-150 dark:border-[#3D2E24]">
              <button
                onClick={() => setProfileTab("claim")}
                className={`flex-1 py-2 text-center text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  profileTab === "claim"
                    ? "border-teal-500 text-teal-600 dark:text-teal-400"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:text-[#A38F82]"
                }`}
              >
                My Profile & API Tokens
              </button>
              <button
                onClick={() => setProfileTab("register")}
                className={`flex-1 py-2 text-center text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  profileTab === "register"
                    ? "border-teal-500 text-teal-600 dark:text-teal-400"
                    : "border-transparent text-slate-400 hover:text-slate-600 dark:text-[#A38F82]"
                }`}
              >
                Add New Teammate (Head Only)
              </button>
            </div>

            {profileTab === "claim" ? (
              <form onSubmit={handleSaveSelfEdit} className="flex flex-col gap-3.5 max-h-[460px] overflow-y-auto pr-1">
                <div className="bg-teal-950/20 border border-teal-900/30 rounded-lg p-3 text-xs text-teal-400 flex items-center justify-between">
                  <div className="leading-snug">
                    <span className="font-bold block text-white">Active Session: {activeDev?.name}</span>
                    Authorized with role-based dashboard layout. Configure your secure credentials below.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileModal(false);
                      onSetActiveDevId(null);
                    }}
                    className="py-1.5 px-3 bg-red-950/50 border border-red-900/40 hover:bg-red-900/40 text-red-300 font-mono font-bold text-[10px] rounded transition-all cursor-pointer shrink-0"
                  >
                    Logout Session
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  {/* Left Column: Personal info */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-mono font-black text-teal-400 uppercase tracking-wider border-b border-[#3D2E24]/50 pb-1">
                      Personal Information
                    </h4>
                    
                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full text-xs p-2.5 bg-[#251A13] border border-[#3D2E24] rounded-lg focus:outline-none focus:border-teal-500 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-1">
                        Role / Designation
                      </label>
                      <input
                        type="text"
                        required
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full text-xs p-2.5 bg-[#251A13] border border-[#3D2E24] rounded-lg focus:outline-none focus:border-teal-500 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full text-xs p-2.5 bg-[#251A13] border border-[#3D2E24] rounded-lg focus:outline-none focus:border-teal-500 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-1">
                        Skills (Comma separated)
                      </label>
                      <input
                        type="text"
                        value={editSkills}
                        onChange={(e) => setEditSkills(e.target.value)}
                        className="w-full text-xs p-2.5 bg-[#251A13] border border-[#3D2E24] rounded-lg focus:outline-none focus:border-teal-500 text-white"
                      />
                    </div>
                  </div>

                  {/* Right Column: Secure credentials & password */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-mono font-black text-teal-400 uppercase tracking-wider border-b border-[#3D2E24]/50 pb-1">
                      Credentials & API Access
                    </h4>

                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1">
                        User ID <span className="text-[8px] text-red-400 font-normal lowercase">(cannot be changed)</span>
                      </label>
                      <input
                        type="text"
                        disabled
                        value={activeDev?.userId || ""}
                        className="w-full text-xs p-2.5 bg-[#1C130E] border border-[#2D2018] text-slate-500 rounded-lg cursor-not-allowed font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-1">
                        Change Password
                      </label>
                      <input
                        type="password"
                        required
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full text-xs p-2.5 bg-[#251A13] border border-[#3D2E24] rounded-lg focus:outline-none focus:border-teal-500 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-1">
                        Jira Server Domain
                      </label>
                      <input
                        type="text"
                        value={editJiraDomain}
                        onChange={(e) => setEditJiraDomain(e.target.value)}
                        placeholder="company.atlassian.net"
                        className="w-full text-xs p-2.5 bg-[#251A13] border border-[#3D2E24] rounded-lg focus:outline-none focus:border-teal-500 text-white font-mono placeholder-slate-700"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] font-mono font-bold text-slate-400 uppercase block mb-1">
                        Jira API Token
                      </label>
                      <input
                        type="password"
                        value={editApiToken}
                        onChange={(e) => setEditApiToken(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full text-xs p-2.5 bg-[#251A13] border border-[#3D2E24] rounded-lg focus:outline-none focus:border-teal-500 text-white font-mono placeholder-slate-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#3D2E24]/50 pt-3 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onSetActiveDevId(null);
                      setShowProfileModal(false);
                    }}
                    className="py-2 px-4 mr-auto border border-red-900/40 hover:bg-red-950/20 text-red-400 font-bold text-xs rounded-lg transition-colors cursor-pointer font-sans"
                  >
                    Log Out Session
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="py-2 px-4 border border-[#3D2E24] hover:bg-[#251A13] text-slate-400 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 bg-teal-600 hover:bg-teal-550 text-white font-bold text-xs rounded-lg transition-all cursor-pointer shadow-md font-sans"
                  >
                    Save Changes & Keys
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegisterDeveloper} className="flex flex-col gap-3 font-sans">
                {/* Permissions Warning Block */}
                {!isHead ? (
                  <div className="p-3 bg-red-950/40 border border-red-900/40 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                    <div className="text-left font-sans">
                      <span className="font-bold block text-white">Access Denied (Requires Team Head)</span>
                      Only users with active Team Head credentials (such as **Alice Vance**) can register new members to prevent arbitrary seat creation. Log in as a Team Head to access.
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-slate-400 text-left font-sans">
                      Configure and register a new team member. The User ID is their permanent handle used to log in.
                    </p>

                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div className="space-y-3">
                        <div>
                          <label className="text-[9.5px] font-mono font-bold text-slate-400 uppercase block mb-1">
                            Teammate Full Name
                          </label>
                          <input
                            type="text"
                            required
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="e.g. Sarthak Ameriya"
                            className="w-full text-xs p-2.5 bg-[#251A13] border border-[#3D2E24] text-white rounded-lg focus:outline-none focus:border-teal-500"
                          />
                        </div>

                        <div>
                          <label className="text-[9.5px] font-mono font-bold text-slate-400 uppercase block mb-1">
                            Role Designation
                          </label>
                          <input
                            type="text"
                            required
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            placeholder="e.g. Senior Frontend Engineer"
                            className="w-full text-xs p-2.5 bg-[#251A13] border border-[#3D2E24] text-white rounded-lg focus:outline-none focus:border-teal-500"
                          />
                        </div>

                        <div>
                          <label className="text-[9.5px] font-mono font-bold text-slate-400 uppercase block mb-1 font-sans">
                            Core Skills (Comma separated)
                          </label>
                          <input
                            type="text"
                            value={newSkills}
                            onChange={(e) => setNewSkills(e.target.value)}
                            placeholder="e.g. React, Docker, Python"
                            className="w-full text-xs p-2.5 bg-[#251A13] border border-[#3D2E24] text-white rounded-lg focus:outline-none focus:border-teal-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 font-sans">
                        <div>
                          <label className="text-[9.5px] font-mono font-bold text-slate-400 uppercase block mb-1">
                            Custom User ID (Locked once saved)
                          </label>
                          <input
                            type="text"
                            required
                            value={newUserId}
                            onChange={(e) => setNewUserId(e.target.value)}
                            placeholder="e.g. sarthak"
                            className="w-full text-xs p-2.5 bg-[#251A13] border border-[#3D2E24] text-white rounded-lg focus:outline-none focus:border-teal-500 font-mono placeholder-slate-700"
                          />
                        </div>

                        <div>
                          <label className="text-[9.5px] font-mono font-bold text-slate-400 uppercase block mb-1">
                            Initial Password
                          </label>
                          <input
                            type="text"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full text-xs p-2.5 bg-[#251A13] border border-[#3D2E24] text-white rounded-lg focus:outline-none focus:border-teal-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[9.5px] font-mono font-bold text-slate-400 uppercase block mb-1">
                            Company Email (Optional)
                          </label>
                          <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="e.g. sarthak@company.com"
                            className="w-full text-xs p-2.5 bg-[#251A13] border border-[#3D2E24] text-white rounded-lg focus:outline-none focus:border-teal-500"
                          />
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 p-2.5 bg-amber-950/20 border border-amber-900/30 rounded-lg cursor-pointer mt-1 text-left">
                      <input
                        type="checkbox"
                        checked={registerAsHead}
                        onChange={(e) => setRegisterAsHead(e.target.checked)}
                        className="rounded border-amber-800 text-amber-500 focus:ring-amber-500 h-4 w-4"
                      />
                      <div>
                        <span className="text-[10.5px] font-bold text-amber-400 block leading-tight">
                          Grant Team Head / Admin privileges
                        </span>
                        <span className="text-[9px] text-amber-600 block leading-none mt-0.5 font-sans">
                          Allows member to add/remove profiles, allocate work and configure sprint analyses.
                        </span>
                      </div>
                    </label>

                    <button
                      type="submit"
                      className="w-full py-2.5 mt-2 bg-teal-600 hover:bg-teal-550 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md font-sans"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Register & Save Member Profile
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* Elegant floating notification toast */}
      {toastMessage && (
        <div className="fixed bottom-4 left-4 bg-teal-900 border border-teal-700 text-white font-bold px-4 py-2.5 rounded-lg shadow-xl text-xs flex items-center gap-2 animate-bounce z-[99999]">
          <Check className="h-4 w-4 text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </aside>
  );
}

import React, { useState } from "react";
import { Shield, KeyRound, User, ChevronRight, AlertCircle, Sparkles, Server, Terminal, Lock, UserPlus, Crown, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Developer } from "../types";

interface LoginScreenProps {
  developers: any[];
  onLoginSuccess: (token: string, devId: string, rememberMe: boolean, workspaceId: string) => void;
}

export default function LoginScreen({ developers, onLoginSuccess }: LoginScreenProps) {
  const [workspaceId, setWorkspaceId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tabs: "enter" | "initialize"
  const [activeTab, setActiveTab] = useState<"enter" | "initialize">("enter");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [passcode, setPasscode] = useState("");

  // Master Recovery Key states
  const [masterRecoveryKey, setMasterRecoveryKey] = useState<string | null>(null);
  const [showMasterKeyModal, setShowMasterKeyModal] = useState(false);
  const [pendingLoginParams, setPendingLoginParams] = useState<any>(null);
  const [isTeamHeadRecovery, setIsTeamHeadRecovery] = useState(false);
  const [recoveryKeyInput, setRecoveryKeyInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");

  // Registration fields
  const [regName, setRegName] = useState("");
  const [regUserId, setRegUserId] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regRole, setRegRole] = useState("Team Head");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) {
      setError("Workspace ID is required.");
      return;
    }
    if (!username) return;
    if (!isForgotPassword && !password) return;
    if (isForgotPassword && !passcode) return;

    setError(null);
    setLoading(true);

    try {
      const payload = { 
        workspaceId,
        username, 
        password: isForgotPassword ? passcode : password 
      };

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Session authentication failed.");
      }

      onLoginSuccess(data.token, data.devId, rememberMe, data.workspaceId);
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message || "Failed to establish secure session connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!workspaceId) {
      setError("Please enter your Workspace ID first.");
      return;
    }
    if (!username) {
      setError("Please enter your Developer Username ID first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, userId: username })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to request password reset.");
      setSuccessMsg(data.message);
      setIsForgotPassword(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) {
      setError("Workspace ID is required to initialize workspace.");
      return;
    }
    if (!regName || !regUserId || !regPassword) return;
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: regName,
          userId: regUserId,
          password: regPassword,
          email: regEmail,
          role: regRole
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      if (data.masterRecoveryKey) {
        setMasterRecoveryKey(data.masterRecoveryKey);
        setShowMasterKeyModal(true);
        setPendingLoginParams([data.token, data.devId, true, data.workspaceId]);
      } else {
        onLoginSuccess(data.token, data.devId, true, data.workspaceId);
      }
    } catch (err: any) {
      console.error("Registration Error:", err);
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleMasterRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !username || !recoveryKeyInput || !newPasswordInput) {
      setError("All fields are required.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/recover-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          userId: username,
          masterRecoveryKey: recoveryKeyInput,
          newPassword: newPasswordInput
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Master recovery failed.");
      
      setSuccessMsg("Password successfully reset! You can now log in with your new password.");
      setIsTeamHeadRecovery(false);
      setIsForgotPassword(false);
      setRecoveryKeyInput("");
      setNewPasswordInput("");
      setPassword("");
    } catch (err: any) {
      console.error("Recovery Error:", err);
      setError(err.message || "Failed to recover account.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (dev: any) => {
    setUsername(dev.userId || "");
    setPassword("");
    setError(null);
    setActiveTab("enter");
    setIsForgotPassword(false);
    setIsTeamHeadRecovery(false);
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#0C0806] text-[#ECE4DE] px-4 font-sans relative overflow-hidden select-none">
      
      {/* Dynamic Security Grid lines */}
      <div className="absolute inset-0 bg-[radial-gradient(#1A120C_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>

      {/* Abstract warm ambient glows */}
      <div className="absolute top-[-25%] left-[-15%] w-[60%] h-[60%] bg-teal-900/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-25%] right-[-15%] w-[60%] h-[60%] bg-[#4A3225]/15 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-md w-full flex flex-col gap-6 relative z-10 font-sans mt-8 mb-8">
        
        {/* Animated Brand Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center flex flex-col items-center"
        >
          <div className="relative mb-4 group">
            <div className="absolute inset-0 bg-teal-500/20 blur-xl rounded-2xl group-hover:bg-teal-500/30 transition-all duration-300"></div>
            <div className="relative w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl border border-teal-400/20 transform hover:rotate-3 transition-transform duration-300">
              Σ
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase font-sans">
            SYNAPSE<span className="text-teal-400 font-extrabold font-sans">.AI</span>
          </h1>
          <p className="text-[10px] font-mono text-teal-400/80 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
            <Terminal className="h-3 w-3" /> SECURE AGENTIC PM WORKSPACE GATEWAY
          </p>
        </motion.div>

        {/* Floating Satin Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="bg-[#130E0B]/95 border border-[#30231B] rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md flex flex-col gap-5 relative"
        >
          {/* Top subtle visual indicator bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-500/20 via-teal-500 to-teal-500/20 rounded-t-2xl"></div>

          {/* Mode Selector Tabs */}
          <div className="flex p-1 bg-[#1A120C] rounded-xl border border-[#2C1F18]">
            <button
              onClick={() => { setActiveTab("enter"); setError(null); setSuccessMsg(null); setIsForgotPassword(false); }}
              className={`flex-1 py-2 text-xs font-bold font-mono tracking-wider rounded-lg transition-all ${
                activeTab === "enter" 
                ? "bg-[#2C1F18] text-teal-400 shadow-sm" 
                : "text-[#7A675C] hover:text-white"
              }`}
            >
              ENTER WORKSPACE
            </button>
            <button
              onClick={() => { setActiveTab("initialize"); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold font-mono tracking-wider rounded-lg transition-all ${
                activeTab === "initialize" 
                ? "bg-[#2C1F18] text-teal-400 shadow-sm" 
                : "text-[#7A675C] hover:text-white"
              }`}
            >
              INITIALIZE WORKSPACE
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "initialize" ? (
              /* ===================== INITIALIZE WORKSPACE ===================== */
              <motion.div
                key="initialize"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1 text-left pb-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                      <Crown className="h-4 w-4 text-teal-400" /> Initialize Workspace
                    </h2>
                    <span className="text-[9px] font-mono bg-teal-950/60 text-teal-400 border border-teal-900/50 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                      <Sparkles className="h-2.5 w-2.5" /> NEW
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#A38F82] leading-relaxed">
                    Register as the Team Head to initialize a new isolated workspace.
                  </p>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-950/40 border border-red-900/40 text-red-300 rounded-xl text-xs flex items-start gap-2.5"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400 animate-pulse" />
                    <span className="leading-snug">{error}</span>
                  </motion.div>
                )}

                <form onSubmit={handleRegister} className="flex flex-col gap-3.5 text-left font-sans">
                  <div>
                    <label className="text-[9px] font-mono font-bold text-[#A38F82] uppercase tracking-wider block mb-1.5">
                      Workspace ID
                    </label>
                    <div className="relative">
                      <Server className="absolute left-3.5 top-3 h-4 w-4 text-[#7A675C]" />
                      <input
                        type="text"
                        required
                        value={workspaceId}
                        onChange={(e) => setWorkspaceId(e.target.value.trim().toLowerCase())}
                        placeholder="e.g. team-alpha"
                        className="w-full text-xs py-3 pl-10 pr-4 bg-[#1C1410] border border-[#3D2E24] text-white rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all font-medium placeholder-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-mono font-bold text-[#A38F82] uppercase tracking-wider block mb-1.5">
                      Your Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-[#7A675C]" />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Sarthak Kumar"
                        className="w-full text-xs py-3 pl-10 pr-4 bg-[#1C1410] border border-[#3D2E24] text-white rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all font-medium placeholder-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-mono font-bold text-[#A38F82] uppercase tracking-wider block mb-1.5">
                        Username ID
                      </label>
                      <input
                        type="text"
                        required
                        value={regUserId}
                        onChange={(e) => setRegUserId(e.target.value)}
                        placeholder="e.g. sarthak"
                        className="w-full text-xs py-3 px-3.5 bg-[#1C1410] border border-[#3D2E24] text-white rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all font-medium placeholder-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono font-bold text-[#A38F82] uppercase tracking-wider block mb-1.5">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        autoComplete="new-password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs py-3 px-3.5 bg-[#1C1410] border border-[#3D2E24] text-white rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all font-medium placeholder-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-mono font-bold text-[#A38F82] uppercase tracking-wider block mb-1.5">
                        Role / Title
                      </label>
                      <input
                        type="text"
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value)}
                        placeholder="e.g. Engineer"
                        className="w-full text-xs py-3 px-3.5 bg-[#1C1410] border border-[#3D2E24] text-white rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all font-medium placeholder-slate-700"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-mono font-bold text-[#A38F82] uppercase tracking-wider block mb-1.5">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full text-xs py-3 px-3.5 bg-[#1C1410] border border-[#3D2E24] text-white rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all font-medium placeholder-slate-700"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 mt-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-950/50 active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Crown className="h-4 w-4" />
                        <span className="uppercase tracking-widest font-bold">
                          Initialize Workspace
                        </span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              /* ===================== NORMAL LOGIN ===================== */
              <motion.div
                key="enter"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1 text-left pb-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                      <Shield className="h-4 w-4 text-teal-400" />
                      Sign In to Your Seat
                    </h2>
                    <span className="text-[9px] font-mono bg-teal-950/60 text-teal-400 border border-teal-900/50 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                      <Lock className="h-2.5 w-2.5" /> ROLE-BASED
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[#A38F82] leading-relaxed">
                    Enter your designated credentials. Contact your Team Head if you need access.
                  </p>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-950/40 border border-red-900/40 text-red-300 rounded-xl text-xs flex items-start gap-2.5"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400 animate-pulse" />
                    <span className="leading-snug">{error}</span>
                  </motion.div>
                )}

                {successMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-teal-950/40 border border-teal-900/40 text-teal-300 rounded-xl text-xs flex items-start gap-2.5"
                  >
                    <Info className="h-4 w-4 shrink-0 mt-0.5 text-teal-400" />
                    <span className="leading-snug">{successMsg}</span>
                  </motion.div>
                )}

                <form onSubmit={isTeamHeadRecovery ? handleMasterRecovery : handleLogin} className="flex flex-col gap-4 text-left font-sans">
                  <div>
                    <label className="text-[9px] font-mono font-bold text-[#A38F82] uppercase tracking-wider block mb-1.5">
                      Workspace ID
                    </label>
                    <div className="relative">
                      <Server className="absolute left-3.5 top-3.5 h-4 w-4 text-[#7A675C]" />
                      <input
                        type="text"
                        required
                        value={workspaceId}
                        onChange={(e) => setWorkspaceId(e.target.value.trim().toLowerCase())}
                        placeholder="e.g. team-alpha"
                        className="w-full text-xs py-3.5 pl-10 pr-4 bg-[#1C1410] border border-[#3D2E24] text-white rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all font-medium placeholder-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-mono font-bold text-[#A38F82] uppercase tracking-wider block mb-1.5">
                      Developer Username ID
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 h-4 w-4 text-[#7A675C]" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Your username"
                        className="w-full text-xs py-3.5 pl-10 pr-4 bg-[#1C1410] border border-[#3D2E24] text-white rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all font-medium placeholder-slate-700"
                      />
                    </div>
                  </div>

                  {isTeamHeadRecovery ? (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-wider block flex items-center gap-1">
                          <Crown className="h-3 w-3" /> Master Recovery
                        </label>
                        <button 
                          type="button" 
                          onClick={() => { setIsTeamHeadRecovery(false); setSuccessMsg(null); setError(null); }}
                          className="text-[9px] text-[#A38F82] hover:text-white font-mono transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="relative">
                          <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-amber-600" />
                          <input
                            type="text"
                            required
                            value={recoveryKeyInput}
                            onChange={(e) => setRecoveryKeyInput(e.target.value)}
                            placeholder="Enter 16-char Master Key"
                            className="w-full text-xs py-3.5 pl-10 pr-4 bg-[#1C1410] border border-amber-900/50 text-white rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-medium placeholder-slate-700"
                          />
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-amber-600" />
                          <input
                            type="password"
                            required
                            value={newPasswordInput}
                            onChange={(e) => setNewPasswordInput(e.target.value)}
                            placeholder="New Password"
                            className="w-full text-xs py-3.5 pl-10 pr-4 bg-[#1C1410] border border-amber-900/50 text-white rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-medium placeholder-slate-700"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ) : !isForgotPassword ? (
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[9px] font-mono font-bold text-[#A38F82] uppercase tracking-wider block">
                          Workspace Password
                        </label>
                        <div className="flex items-center gap-2">
                          <button 
                            type="button" 
                            onClick={() => { setIsTeamHeadRecovery(true); setError(null); setSuccessMsg(null); }}
                            className="text-[9px] text-amber-500 hover:text-amber-400 font-mono transition-colors border-r border-[#3D2E24] pr-2"
                          >
                            Team Head Recovery
                          </button>
                          <button 
                            type="button" 
                            onClick={handleForgotPassword}
                            className="text-[9px] text-teal-500 hover:text-teal-400 font-mono transition-colors"
                          >
                            Forgot Password?
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-[#7A675C]" />
                        <input
                          type="password"
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full text-xs py-3.5 pl-10 pr-4 bg-[#1C1410] border border-[#3D2E24] text-white rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all font-medium placeholder-slate-700"
                        />
                      </div>
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[9px] font-mono font-bold text-teal-400 uppercase tracking-wider block">
                          6-Digit Passcode
                        </label>
                        <button 
                          type="button" 
                          onClick={() => { setIsForgotPassword(false); setSuccessMsg(null); setError(null); }}
                          className="text-[9px] text-[#A38F82] hover:text-white font-mono transition-colors"
                        >
                          Use Password Instead
                        </button>
                      </div>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-teal-600" />
                        <input
                          type="text"
                          required
                          value={passcode}
                          onChange={(e) => setPasscode(e.target.value)}
                          placeholder="123456"
                          maxLength={6}
                          className="w-full text-xs py-3.5 pl-10 pr-4 bg-[#1C1410] border border-teal-900/50 text-white rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all font-medium placeholder-slate-700 tracking-widest"
                        />
                      </div>
                    </motion.div>
                  )}

                  <div className="flex items-center gap-2 py-1">
                    <input 
                      type="checkbox" 
                      id="rememberMe" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-[#3D2E24] bg-[#1C1410] text-teal-500 focus:ring-teal-500/50 h-3.5 w-3.5 cursor-pointer"
                    />
                    <label htmlFor="rememberMe" className="text-[10.5px] text-[#A38F82] cursor-pointer hover:text-white transition-colors select-none">
                      Remember me for 7 days
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 mt-1 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-950/50 active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className="uppercase tracking-widest font-bold">
                          {isTeamHeadRecovery ? "Reset Password" : "Secure Access Node"}
                        </span>
                        {!isTeamHeadRecovery && <ChevronRight className="h-4 w-4" />}
                      </>
                    )}
                  </button>
                </form>


              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Master Recovery Key Modal (Shows only once on registration) */}
        <AnimatePresence>
          {showMasterKeyModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-[#1C1410] border-2 border-amber-500/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden flex flex-col items-center text-center"
              >
                {/* Warning header */}
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4 border border-amber-500/30">
                  <AlertCircle className="h-6 w-6 text-amber-500" />
                </div>
                
                <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Save Your Master Key</h3>
                
                <p className="text-xs text-[#A38F82] mb-4">
                  As the Team Head, you hold the master controls. If you forget your password, you will be permanently locked out unless you provide this Master Recovery Key. 
                  <strong className="text-amber-400 block mt-2">Store it securely in a password manager. It will never be shown again.</strong>
                </p>

                <div className="w-full bg-[#130E0B] border border-[#3D2E24] p-4 rounded-xl mb-6 relative group">
                  <p className="font-mono text-lg font-black tracking-[0.2em] text-white select-all break-all">
                    {masterRecoveryKey}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setShowMasterKeyModal(false);
                    if (pendingLoginParams) {
                      onLoginSuccess(pendingLoginParams[0], pendingLoginParams[1], pendingLoginParams[2], pendingLoginParams[3]);
                    }
                  }}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-all uppercase tracking-widest shadow-lg shadow-amber-900/50"
                >
                  I have saved it securely
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Secure Footer Info */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-[9px] text-[#5C4B40] font-mono text-center tracking-wider"
        >
          SYNAPSE ENTERPRISE GATEWAY SECURITY &bull; COMPLIANT NODE 2.5
        </motion.p>
      </div>
    </div>
  );
}


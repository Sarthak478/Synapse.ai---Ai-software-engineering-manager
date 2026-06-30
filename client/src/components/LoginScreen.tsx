import React, { useState } from "react";
import { Shield, KeyRound, User, ChevronRight, AlertCircle, Sparkles, Server, Terminal, Lock, UserPlus, Crown } from "lucide-react";
import { motion } from "motion/react";
import { Developer } from "../types";

interface LoginScreenProps {
  developers: any[];
  onLoginSuccess: (token: string, devId: string) => void;
}

export default function LoginScreen({ developers, onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isFirstTimeSetup = !developers || developers.length === 0;

  // Toggle state
  const [isRegistering, setIsRegistering] = useState(isFirstTimeSetup);

  // Registration fields
  const [regName, setRegName] = useState("");
  const [regUserId, setRegUserId] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regRole, setRegRole] = useState(isFirstTimeSetup ? "Team Head" : "Engineer");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Session authentication failed.");
      }

      onLoginSuccess(data.token, data.devId);
    } catch (err: any) {
      console.error("Login Error:", err);
      setError(err.message || "Failed to establish secure session connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regUserId || !regPassword) return;
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

      onLoginSuccess(data.token, data.devId);
    } catch (err: any) {
      console.error("Registration Error:", err);
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (dev: any) => {
    setUsername(dev.userId || "");
    setPassword("");
    setError(null);
    setIsRegistering(false);
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#0C0806] text-[#ECE4DE] px-4 font-sans relative overflow-hidden select-none">
      
      {/* Dynamic Security Grid lines */}
      <div className="absolute inset-0 bg-[radial-gradient(#1A120C_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>

      {/* Abstract warm ambient glows */}
      <div className="absolute top-[-25%] left-[-15%] w-[60%] h-[60%] bg-teal-900/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-25%] right-[-15%] w-[60%] h-[60%] bg-[#4A3225]/15 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-md w-full flex flex-col gap-6 relative z-10 font-sans">
        
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
          className="bg-[#130E0B]/95 border border-[#30231B] rounded-2xl p-8 shadow-2xl backdrop-blur-md flex flex-col gap-6 relative"
        >
          {/* Top subtle visual indicator bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-500/20 via-teal-500 to-teal-500/20 rounded-t-2xl"></div>

          {isRegistering ? (
            /* ===================== REGISTRATION ===================== */
            <>
              <div className="flex flex-col gap-1 text-left border-b border-[#2C1F18] pb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                    {isFirstTimeSetup ? (
                      <><Crown className="h-4 w-4 text-amber-400" /> Create Your Workspace</>
                    ) : (
                      <><UserPlus className="h-4 w-4 text-amber-400" /> Register New Account</>
                    )}
                  </h2>
                  <span className="text-[9px] font-mono bg-amber-950/60 text-amber-400 border border-amber-900/50 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                    <Sparkles className="h-2.5 w-2.5" /> NEW
                  </span>
                </div>
                <p className="text-[10.5px] text-[#A38F82] leading-relaxed">
                  {isFirstTimeSetup 
                    ? "No team exists yet. Register as the Team Head to initialize your workspace." 
                    : "Create a new account to join this workspace ecosystem."}
                </p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3.5 bg-red-950/40 border border-red-900/40 text-red-300 rounded-xl text-xs flex items-start gap-2.5"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400 animate-pulse" />
                  <span className="leading-snug">{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleRegister} className="flex flex-col gap-3.5 text-left font-sans">
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
                  className="w-full py-3.5 mt-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950/50 active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      {isFirstTimeSetup ? <Crown className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                      <span className="uppercase tracking-widest font-bold">
                        {isFirstTimeSetup ? "Initialize Workspace" : "Register Account"}
                      </span>
                    </>
                  )}
                </button>
              </form>
              
              {!isFirstTimeSetup && (
                <div className="text-center mt-3">
                  <button 
                    onClick={() => { setError(null); setIsRegistering(false); }}
                    className="text-[10px] text-[#A38F82] hover:text-white transition-colors cursor-pointer"
                  >
                    Already have an account? <span className="text-amber-400 font-bold underline">Login</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* ===================== NORMAL LOGIN ===================== */
            <>
              <div className="flex flex-col gap-1 text-left border-b border-[#2C1F18] pb-4">
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
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3.5 bg-red-950/40 border border-red-900/40 text-red-300 rounded-xl text-xs flex items-start gap-2.5"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400 animate-pulse" />
                  <span className="leading-snug">{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleLogin} className="flex flex-col gap-4 text-left font-sans">
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

                <div>
                  <label className="text-[9px] font-mono font-bold text-[#A38F82] uppercase tracking-wider block mb-1.5">
                    Workspace Password
                  </label>
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 mt-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-teal-950/50 active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="uppercase tracking-widest font-bold">Secure Access Node</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center mt-3">
                <button 
                  onClick={() => { setError(null); setIsRegistering(true); }}
                  className="text-[10px] text-[#A38F82] hover:text-white transition-colors cursor-pointer"
                >
                  Need an account? <span className="text-teal-400 font-bold underline">Register</span>
                </button>
              </div>

              {/* Quick access team roster */}
              {developers && developers.length > 0 && (
                <div className="flex flex-col gap-2.5 pt-4 mt-2 border-t border-[#2C1F18] font-sans">
                  <span className="text-[9px] font-mono font-bold text-[#7A675C] uppercase tracking-wider flex items-center gap-1">
                    <Server className="h-3 w-3 text-teal-400" /> Team Members
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {developers.map((dev) => {
                      const isSelected = username.toLowerCase() === dev.userId?.toLowerCase();
                      return (
                        <button
                          key={dev.id}
                          type="button"
                          onClick={() => handleQuickLogin(dev)}
                          className={`flex items-center gap-2.5 p-2.5 bg-[#17100D] border rounded-xl text-left transition-all group cursor-pointer ${
                            isSelected 
                              ? "border-teal-500 ring-1 ring-teal-500/20 bg-[#221712]" 
                              : "border-[#2D211A] hover:border-[#4A3529] hover:bg-[#1D1411]"
                          }`}
                        >
                          <img
                            src={dev.avatar}
                            alt={dev.name}
                            className="w-8 h-8 rounded-full object-cover border border-[#2D211A] shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="truncate text-[10px] flex-1">
                            <span className="font-bold text-white block group-hover:text-teal-400 transition-colors truncate">
                              {dev.name.split(" ")[0]} {dev.isHead ? "👑" : ""}
                            </span>
                            <span className="text-[#A38F82] font-mono text-[8px] uppercase tracking-tight block truncate">
                              {dev.role}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>

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


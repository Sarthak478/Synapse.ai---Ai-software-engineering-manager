import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { KeyRound, X, Settings, Sparkles, AlertTriangle } from "lucide-react";

interface ApiKeyRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToSettings: () => void;
  featureName?: string;
}

/**
 * ApiKeyRequiredModal
 *
 * Shown whenever the user tries to invoke a Gemini AI feature without
 * a configured API key. Guides them to the Settings panel to add one.
 *
 * ⚠️ TESTING PHASE REMINDER (Finding #4): When no key is present the backend
 * currently returns hardcoded mock data. This modal replaces silent mock usage
 * with an explicit user prompt. Before production: remove mock fallbacks from
 * server/routes/gemini.ts and make the API key mandatory.
 */
export default function ApiKeyRequiredModal({
  isOpen,
  onClose,
  onGoToSettings,
  featureName = "this AI feature"
}: ApiKeyRequiredModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4"
          >
            <div className="pointer-events-auto bg-white dark:bg-[#1C1410] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#3D2D23] w-full max-w-md overflow-hidden">

              {/* Header stripe */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <KeyRound className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold text-white text-sm tracking-tight">API Key Required</span>
                </div>
                <button
                  onClick={onClose}
                  className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 flex flex-col gap-5">
                <div className="flex gap-4 items-start">
                  <div className="shrink-0 h-10 w-10 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                      Gemini API Key not configured
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      To use <span className="font-semibold text-slate-700 dark:text-slate-300">{featureName}</span>, a valid Gemini API key must be set by the Project Head in the team Settings panel.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-[#2A1F18] border border-slate-200 dark:border-[#3D2D23] rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    How to activate AI features
                  </div>
                  <ol className="list-decimal list-inside flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-1">
                    <li>Open the <strong className="text-slate-700 dark:text-slate-300">Settings</strong> panel from the sidebar.</li>
                    <li>Paste your <strong className="text-slate-700 dark:text-slate-300">Gemini API Key</strong> (get one at <span className="text-indigo-500 font-mono">aistudio.google.com</span>).</li>
                    <li>Save — the key is hashed and shared with your team session.</li>
                  </ol>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#3D2D23] rounded-lg hover:bg-slate-50 dark:hover:bg-[#2A1F18] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => { onClose(); onGoToSettings(); }}
                    className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Go to Settings
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

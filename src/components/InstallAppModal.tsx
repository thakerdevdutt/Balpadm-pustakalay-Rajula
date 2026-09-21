import React from 'react';
import { X, Download, Smartphone, Monitor, CheckCircle, ExternalLink, HelpCircle } from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onTriggerInstall: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onTriggerInstall,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-800 px-5 py-3.5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Install App / એપ ઇન્સ્ટોલ કરો</h2>
              <p className="text-[11px] text-slate-400">બાલપદ્મ પુસ્તકાલય - રાજુલા (PWA Mobile & PC)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Quick Install Button if supported */}
          {deferredPrompt && (
            <div className="bg-blue-950/70 border border-blue-500/50 p-4 rounded-xl text-center space-y-2.5">
              <div className="text-sm font-semibold text-blue-200">
                🚀 બ્રાઉઝર ઇન્સ્ટોલ ડાયલોગ તૈયાર છે
              </div>
              <p className="text-xs text-blue-300/80">
                નીચે આપેલા બટન પર ક્લિક કરીને સીધી એપ તમારા ફોન કે કમ્પ્યુટરમાં ઇન્સ્ટોલ કરો:
              </p>
              <button
                type="button"
                onClick={onTriggerInstall}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg hover:shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>હમણાં જ Install કરો (Install Now)</span>
              </button>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <span>૧. મોબાઈલ Chrome (Android) માં ઇન્સ્ટોલ કરવાની રીત:</span>
            </h3>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3.5 space-y-2 text-slate-300 text-xs">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">1</span>
                <span>Chrome બ્રાઉઝરમાં ઉપર જમણી બાજુ આવેલ <strong>ત્રણ ટપકાં (⋮)</strong> મેનૂ પર ક્લિક કરો.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">2</span>
                <span>મેનૂમાં <strong>"Install app"</strong> અથવા <strong>"Add to Home screen" (હોમ સ્ક્રીન પર ઉમેરો)</strong> વિકલ્પ પસંદ કરો.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">3</span>
                <span>તમારા મોબાઇલની હોમ સ્ક્રીન પર <strong>બાલપદ્મ પુસ્તકાલય</strong> આઇકોન આવી જશે.</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-emerald-400" />
              <span>૨. કમ્પ્યુટર / લેપટોપ (PC Chrome & Edge) માં:</span>
            </h3>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-3.5 space-y-2 text-slate-300 text-xs">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">1</span>
                <span>બ્રાઉઝરની એડ્રેસ બાર (URL) ની જમણી બાજુએ <strong>🖥️ ⬇️ (Install App)</strong> આઇકોન પર ક્લિક કરો.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">2</span>
                <span>અથવા Chrome મેનૂ <strong>⋮ ➜ Save and share ➜ "Install બાલપદ્મ પુસ્તકાલય..."</strong> પર ક્લિક કરો.</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg p-3 text-[11px] text-slate-400 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>ઇન્સ્ટોલ કર્યા પછી આ એપ એકદમ નેટિવ એપની જેમ ફૂલ સ્ક્રીનમાં ચાલશે અને ફાસ્ટ લોડ થશે.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-800/60 px-5 py-3 border-t border-slate-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            સમજાય ગયું (Got it)
          </button>
        </div>
      </div>
    </div>
  );
};

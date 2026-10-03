import React from 'react';
import { X, Smartphone, CheckCircle, Apple, Globe, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isIOS, isInstalled, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleOneClickInstall = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-2.5 sm:pt-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#202520] text-[#2D3436] dark:text-[#E2DFD6] rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#E5E1D3] dark:border-[#353D35] overflow-hidden mt-1 sm:my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E1D3] dark:border-[#353D35] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1D5299] text-white flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif-guj">મોબાઇલમાં એપ ઇન્સ્ટોલ કરો</h3>
              <p className="text-xs text-[#7A7566] dark:text-[#9A9483]">પ્લે સ્ટોર વગર સીધા હોમ સ્ક્રીન પર લાવો</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A7566] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs sm:text-sm">
          
          {/* Official App Icon Showcase */}
          <div className="p-4 rounded-2xl bg-radial from-[#24442E]/10 to-transparent border border-[#24442E]/25 flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src="/pwa-192x192.png"
                alt="લેખ સંગ્રહ સત્તાવાર એપ આઇકન (DT)"
                className="w-16 h-16 rounded-2xl shadow-lg border-2 border-amber-300/60 object-cover bg-[#1B3322]"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#24442E] text-amber-200 rounded-full flex items-center justify-center text-[10px] shadow border border-amber-300/60">
                ✓
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold font-serif-guj text-sm sm:text-base text-[#1C1917] dark:text-[#F5F5F4]">
                લેખ સંગ્રહ સત્તાવાર એપ આઇકન
              </h4>
              <p className="text-xs text-[#555044] dark:text-[#B5B0A4] mt-0.5 leading-relaxed">
                મોબાઇલમાં install કર્યા પછી તમારી હોમ-સ્ક્રીન પર આ સુંદર 'DT' મોનોગ્રામ અને સોનેરી દીપક વાળો આઇકન દેખાશે.
              </p>
            </div>
          </div>

          {/* Direct 1-Click Install Button if supported by browser */}
          {isInstallable && !isInstalled && (
            <button
              onClick={handleOneClickInstall}
              className="w-full py-3 px-4 rounded-xl bg-[#1D5299] hover:bg-[#16417A] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>હમણાં જ સીધી એપ ઇન્સ્ટોલ કરો</span>
            </button>
          )}

          {/* Android Guide */}
          <div className="p-4 rounded-xl border border-[#E5E1D3] dark:border-[#353D35] bg-[#FAF8F5] dark:bg-[#252B25] space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-[#1D5299] text-sm">
              <Globe className="w-4 h-4" />
              <span>એન્ડ્રોઇડ ફોન (Google Chrome) માટે:</span>
            </div>
            <ol className="space-y-1.5 list-decimal list-inside text-[#555044] dark:text-[#B5B0A4] leading-relaxed">
              <li>તમારા મોબાઇલ બ્રાઉઝરમાં ઉપર જમણી બાજુ રહેલા <span className="font-semibold text-black dark:text-white">૩ ટપકાં (Menu)</span> પર ક્લિક કરો.</li>
              <li>મેનુમાં નીચે <span className="font-semibold text-[#1D5299]">"Add to Home screen"</span> અથવા <span className="font-semibold text-[#1D5299]">"Install app"</span> પસંદ કરો.</li>
              <li>પછી <span className="font-semibold text-black dark:text-white">"Install"</span> પર ટેપ કરો. એપ તમારા ફોનમાં આ આઇકન સાથે આવી જશે!</li>
            </ol>
          </div>

          {/* iPhone / iPad Guide */}
          <div className="p-4 rounded-xl border border-[#E5E1D3] dark:border-[#353D35] bg-[#FAF8F5] dark:bg-[#252B25] space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-[#8C6239] text-sm">
              <Apple className="w-4 h-4" />
              <span>આઇફોન / આઇપેડ (Safari Browser) માટે:</span>
            </div>
            <ol className="space-y-1.5 list-decimal list-inside text-[#555044] dark:text-[#B5B0A4] leading-relaxed">
              <li>સફારી બ્રાઉઝરમાં નીચે વચ્ચે આપેલા <span className="font-semibold text-black dark:text-white">Share (શેર)</span> આઇકન પર ક્લિક કરો.</li>
              <li>મેનુને સહેજ નીચે સ્ક્રોલ કરીને <span className="font-semibold text-[#8C6239]">"Add to Home Screen"</span> પર ક્લિક કરો.</li>
              <li>ઉપર જમણી બાજુ <span className="font-semibold text-black dark:text-white">"Add"</span> દબાવો.</li>
            </ol>
          </div>

          <div className="p-3.5 rounded-xl bg-[#5B8260]/10 flex items-start gap-2.5 text-xs text-[#355A38] dark:text-[#C5DAC8]">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#5B8260]" />
            <span>
              ઇન્સ્ટોલ કર્યા પછી આ એપ એકદમ નેટિવ એપની જેમ પૂર્ણ સ્ક્રીનમાં ખુલશે અને ઇન્ટરનેટ વગર પણ તમારા લેખો સચવાયેલા રહેશે.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E5E1D3] dark:border-[#353D35] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1D5299] text-white text-xs font-semibold hover:bg-[#16417A] transition cursor-pointer"
          >
            સમજી ગયો
          </button>
        </div>

      </div>
    </div>
  );
};

import React from 'react';
import { 
  BookOpen, 
  Search, 
  Bookmark, 
  PlusCircle, 
  Smartphone, 
  Sun, 
  Moon, 
  Coffee,
  X,
  Database,
  BarChart2,
  RefreshCw
} from 'lucide-react';
import { ReadingTheme, FontSizeLevel } from '../types';
import { APP_VERSION } from '../version';

interface NavbarProps {
  readingTheme: ReadingTheme;
  setReadingTheme: (theme: ReadingTheme) => void;
  fontSize: FontSizeLevel;
  setFontSize: (size: FontSizeLevel) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  bookmarksCount: number;
  onOpenBookmarks: () => void;
  onOpenAddIssue: () => void;
  onOpenBackup: () => void;
  onOpenInstallModal: () => void;
  onOpenStatistics: () => void;
  totalArticlesCount: number;
  onGoHome?: () => void;
  cloudSyncStatus?: 'connected' | 'syncing' | 'offline';
  readingProgress?: number;
  isStandalone?: boolean;
  onPullFromCloud?: () => void;
  isPullingCloud?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  readingTheme,
  setReadingTheme,
  fontSize,
  setFontSize,
  searchQuery,
  setSearchQuery,
  bookmarksCount,
  onOpenBookmarks,
  onOpenAddIssue,
  onOpenBackup,
  onOpenInstallModal,
  onOpenStatistics,
  totalArticlesCount,
  onGoHome,
  cloudSyncStatus,
  readingProgress,
  isStandalone = false,
  onPullFromCloud,
  isPullingCloud = false,
}) => {
  const FONT_LEVELS: FontSizeLevel[] = ['small', 'normal', 'large', 'xlarge'];

  const decreaseFontSize = () => {
    const currentIndex = FONT_LEVELS.indexOf(fontSize);
    if (currentIndex > 0) {
      setFontSize(FONT_LEVELS[currentIndex - 1]);
    }
  };

  const increaseFontSize = () => {
    const currentIndex = FONT_LEVELS.indexOf(fontSize);
    if (currentIndex < FONT_LEVELS.length - 1) {
      setFontSize(FONT_LEVELS[currentIndex + 1]);
    }
  };

  const themes: { id: ReadingTheme; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: 'લાઇટ', icon: <Sun className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> },
    { id: 'sepia', label: 'સેપિયા', icon: <Coffee className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> },
    { id: 'dark', label: 'ડાર્ક', icon: <Moon className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> },
  ];

  const fontSizes: { id: FontSizeLevel; label: string }[] = [
    { id: 'small', label: 'A-' },
    { id: 'normal', label: 'A' },
    { id: 'large', label: 'A+' },
    { id: 'xlarge', label: 'A++' },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 border-b transition-colors shadow-xs w-full ${
      readingTheme === 'dark'
        ? 'border-[#2D342D] bg-[#1A1D1A]'
        : readingTheme === 'sepia'
        ? 'border-[#C8B892] bg-[#E2D4B6]'
        : 'border-[#E5E1D3] bg-white'
    }`}>
      <div className="max-w-6xl mx-auto px-2 sm:px-6 py-1.5 sm:py-3">
        {/* Main Row: Logo on Left, Controls on Right (and Search in center on desktop) */}
        <div className="flex items-center justify-between gap-1 sm:gap-4">
          
          {/* Brand Logo & Name */}
          <div 
            onClick={isStandalone ? undefined : onGoHome}
            className={`flex items-center gap-1.5 sm:gap-3 shrink-0 select-none ${
              isStandalone 
                ? 'cursor-default' 
                : 'group cursor-pointer'
            }`}
            title={isStandalone ? 'લેખ સંગ્રહ' : 'મુખ્ય પૃષ્ઠ પર જાઓ (બધા લેખો જુઓ)'}
          >
            <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-white shadow-xs border border-black/10 dark:border-white/10 flex items-center justify-center ${
              !isStandalone ? 'group-hover:scale-105 transition-transform' : ''
            }`}>
              <img 
                src="/icon.svg" 
                alt="લેખ સંગ્રહ લોગો" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className={`font-serif-guj text-xs sm:text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4] leading-tight whitespace-nowrap ${
                !isStandalone ? 'group-hover:text-[#1D5299] transition' : ''
              }`}>
                લેખ સંગ્રહ
              </h1>
              <button 
                type="button"
                id="app-version-badge"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPullFromCloud) {
                    onPullFromCloud();
                  } else {
                    if (typeof caches !== 'undefined') {
                      caches.keys().then((keys) => Promise.all(keys.map(k => caches.delete(k)))).then(() => {
                        window.location.reload();
                      }).catch(() => {
                        window.location.reload();
                      });
                    } else {
                      window.location.reload();
                    }
                  }
                }}
                disabled={isPullingCloud}
                title={`એપ્લિકેશન વર્ઝન: ${APP_VERSION} (નવું વર્ઝન અને ક્લાઉડમાંથી લેખો તાજા કરવા માટે ક્લિક કરો)`}
                className="px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-mono font-bold tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-2xs select-none cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-900 transition active:scale-95 flex items-center gap-1 shrink-0"
              >
                {isPullingCloud && <RefreshCw className="w-2.5 h-2.5 animate-spin text-emerald-700 dark:text-emerald-300" />}
                <span>{APP_VERSION}</span>
              </button>
            </div>
          </div>

          {/* Desktop Search Bar (Hidden in Standalone mode or mobile) */}
          {!isStandalone && (
            <div className="hidden sm:block flex-1 max-w-xs md:max-w-sm relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7566] dark:text-[#9A9483]" />
              <input
                type="text"
                placeholder="શોધો..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border focus:border-[#7B8E7E] focus:outline-none transition ${
                  readingTheme === 'dark'
                    ? 'bg-[#252A25] text-[#F5F5F4] placeholder-[#767F76] border-transparent'
                    : readingTheme === 'sepia'
                    ? 'bg-[#D2C3A2] text-[#241C11] placeholder-[#6C5B42] border-[#C4B48E]'
                    : 'bg-[#F4F1EA] text-[#1C1917] placeholder-[#8A8576] border-transparent'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A8576] hover:text-[#1C1917] dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Action Tools (Optimized for Mobile and Desktop) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            
            {/* Theme Selector Pill */}
            <div className={`flex items-center p-0.5 rounded-lg sm:rounded-xl border ${
              readingTheme === 'dark'
                ? 'bg-[#252A25] border-[#353D35]'
                : readingTheme === 'sepia'
                ? 'bg-[#D2C3A2] border-[#C4B48E]'
                : 'bg-[#F2EFE6] border-[#E5E1D3]'
            }`}>
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setReadingTheme(t.id)}
                  title={t.label}
                  className={`p-1 sm:px-2 sm:py-1 rounded-md sm:rounded-lg text-xs flex items-center justify-center transition cursor-pointer ${
                    readingTheme === t.id
                      ? readingTheme === 'sepia'
                        ? 'bg-[#EDE1C7] text-[#241C11] shadow-xs font-semibold'
                        : 'bg-white dark:bg-[#323932] text-[#1C1917] dark:text-[#F5F5F4] shadow-xs font-semibold'
                      : readingTheme === 'sepia'
                      ? 'text-[#5E4F39] hover:text-[#241C11]'
                      : 'text-[#7A7566] dark:text-[#9A9483] hover:text-[#1C1917]'
                  }`}
                >
                  {t.icon}
                </button>
              ))}
            </div>

            {/* Mobile Font Size Stepper (Compact: A- and A+) */}
            <div 
              className={`flex sm:hidden items-center p-0.5 rounded-lg border ${
                readingTheme === 'dark'
                  ? 'bg-[#252A25] border-[#353D35]'
                : readingTheme === 'sepia'
                  ? 'bg-[#D2C3A2] border-[#C4B48E]'
                  : 'bg-[#F2EFE6] border-[#E5E1D3]'
              }`}
              title="અક્ષરો નાના/મોટા કરો"
            >
              <button
                onClick={decreaseFontSize}
                disabled={fontSize === 'small'}
                title="અક્ષર નાના કરો"
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  fontSize === 'small' ? 'opacity-35 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                A-
              </button>
              <span className="text-[9px] px-0.5 font-bold text-[#1D5299] dark:text-[#88B4E8]">
                {fontSize === 'small' ? '1' : fontSize === 'normal' ? '2' : fontSize === 'large' ? '3' : '4'}
              </span>
              <button
                onClick={increaseFontSize}
                disabled={fontSize === 'xlarge'}
                title="અક્ષર મોટા કરો"
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  fontSize === 'xlarge' ? 'opacity-35 cursor-not-allowed' : 'hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                A+
              </button>
            </div>

            {/* Desktop Font Size Selector (Full: A-, A, A+, A++) */}
            <div 
              className={`hidden sm:flex items-center p-0.5 rounded-xl border ${
                readingTheme === 'dark'
                  ? 'bg-[#252A25] border-[#353D35]'
                : readingTheme === 'sepia'
                  ? 'bg-[#D2C3A2] border-[#C4B48E]'
                  : 'bg-[#F2EFE6] border-[#E5E1D3]'
              }`}
              title="અક્ષરો નાના/મોટા કરો"
            >
              {fontSizes.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFontSize(f.id)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    fontSize === f.id
                      ? readingTheme === 'sepia'
                        ? 'bg-[#EDE1C7] text-[#241C11] shadow-xs'
                        : 'bg-white dark:bg-[#323932] text-[#1C1917] dark:text-[#F5F5F4] shadow-xs'
                      : readingTheme === 'sepia'
                      ? 'text-[#5E4F39] hover:text-[#241C11]'
                      : 'text-[#7A7566] dark:text-[#9A9483] hover:text-[#1C1917]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Bookmarks, Statistics, Backup, New Article, Install - Hidden in Standalone mode */}
            {!isStandalone && (
              <>
                {/* Bookmarks Counter Button (Hidden on Mobile because it is in the bottom bar) */}
                <button
                  onClick={onOpenBookmarks}
                  title="સાચવેલા લેખો"
                  className="hidden sm:flex p-1.5 sm:p-2 rounded-xl text-[#7A7566] dark:text-[#9A9483] hover:bg-[#F2EFE6] dark:hover:bg-[#252A25] relative transition cursor-pointer"
                >
                  <Bookmark className="w-4 h-4" />
                  {bookmarksCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#8C6239] text-white text-[10px] font-bold flex items-center justify-center">
                      {bookmarksCount}
                    </span>
                  )}
                </button>

                {/* Statistics / Analysis Button (PC Icon) */}
                <button
                  onClick={onOpenStatistics}
                  title="આંકડાકીય વિશ્લેષણ અને સ્ટેટેક્સ્ટિક્સ"
                  className="hidden sm:flex p-1.5 sm:p-2 rounded-xl text-[#1D5299] dark:text-[#88B4E8] hover:bg-[#1D5299]/10 transition cursor-pointer shrink-0"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>

                {/* Database & Backup Button */}
                <button
                  onClick={onOpenBackup}
                  title="Backup & Sync (બેકઅપ અને સિંક મેનેજમેન્ટ)"
                  className="p-1 sm:p-2 rounded-lg sm:rounded-xl text-[#5B8260] dark:text-[#A8BDAA] hover:bg-[#5B8260]/10 transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline text-[11px] font-medium font-serif-guj whitespace-nowrap">Backup & Sync</span>
                </button>

                {/* New Article / Edit Button */}
                <button
                  onClick={onOpenAddIssue}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7B8E7E] hover:bg-[#687A6B] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                  title="નવો લેખ ઉમેરો / સુધારો (એડમિન)"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>નવો લેખ / સુધારો</span>
                </button>

                {/* Install Guide Button */}
                <button
                  onClick={onOpenInstallModal}
                  title="મોબાઇલમાં ઇન્સ્ટોલ કરો"
                  className="hidden sm:flex p-2 rounded-xl text-[#7B8E7E] dark:text-[#A8BDAA] hover:bg-[#7B8E7E]/10 transition cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </>
            )}

          </div>

        </div>

        {/* Mobile-Only Search Bar (Clean, full width row directly underneath, hidden in standalone) */}
        {!isStandalone && (
          <div className="mt-2 sm:hidden relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7566] dark:text-[#9A9483]" />
            <input
              type="text"
              placeholder="લેખ કે વિષય શોધો..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border focus:border-[#7B8E7E] focus:outline-none transition ${
                readingTheme === 'dark'
                  ? 'bg-[#252A25] text-[#F5F5F4] placeholder-[#767F76] border-[#353D35]'
                  : readingTheme === 'sepia'
                  ? 'bg-[#D2C3A2] text-[#241C11] placeholder-[#6C5B42] border-[#C4B48E]'
                  : 'bg-[#F4F1EA] text-[#1C1917] placeholder-[#8A8576] border-[#E5E1D3]'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A8576] hover:text-[#1C1917] dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reading Progress Bar attached seamlessly at the very bottom edge of Navbar */}
      {typeof readingProgress === 'number' && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/10 dark:bg-white/10 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <div 
            className={`h-full transition-all duration-150 ease-out ${
              readingTheme === 'dark'
                ? 'bg-[#60A5FA]'
                : readingTheme === 'sepia'
                ? 'bg-[#8B5A2B]'
                : 'bg-[#1D5299]'
            }`}
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      )}
    </header>
  );
};

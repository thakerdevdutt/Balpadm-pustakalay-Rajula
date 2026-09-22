import React from 'react';
import { Download, Upload, Database, BarChart3, User, ShieldCheck, UserCheck, LogOut, Key, Sun, Moon, BookOpen, Smartphone, Trash2 } from 'lucide-react';
import { AppUser, AppTheme } from '../types';

interface HeaderProps {
  languageMode: 'en' | 'gu' | 'both';
  setLanguageMode: (mode: 'en' | 'gu' | 'both') => void;
  onOpenVBA: () => void;
  onExportExcel: () => void;
  onImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportJSON?: () => void;
  onImportJSON?: (file: File) => void;
  onSyncGoogleSheet?: () => void;
  onResetCatalog?: () => void;
  onClearAll?: () => void;
  onOpenBackups: () => void;
  onOpenStats?: () => void;
  onOpenInstallModal?: () => void;
  isFirestoreConnected?: boolean;
  localDirectory?: string;
  totalBooksCount: number;
  currentUser?: AppUser | null;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
  theme?: AppTheme;
  onToggleTheme?: () => void;
  onSelectTheme?: (theme: AppTheme) => void;
}

export const Header: React.FC<HeaderProps> = ({
  languageMode,
  setLanguageMode,
  onOpenVBA,
  onExportExcel,
  onImportExcel,
  onExportJSON,
  onImportJSON,
  onSyncGoogleSheet,
  onResetCatalog,
  onClearAll,
  onOpenBackups,
  onOpenStats,
  onOpenInstallModal,
  localDirectory = 'D:\\My Books\\My Books',
  totalBooksCount,
  currentUser,
  onOpenLoginModal,
  onLogout,
  theme = 'dark',
  onToggleTheme,
  onSelectTheme,
}) => {
  const handleJSONFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportJSON) {
      onImportJSON(file);
      e.target.value = '';
    }
  };

  const cleanName = currentUser?.name ? currentUser.name.replace(/\s*\((admin|user)\)/gi, '').trim() : '';

  const isLight = theme === 'light';
  const isSepia = theme === 'sepia';

  return (
    <header
      id="main-header"
      className={`px-4 sm:px-6 py-3 flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 border-b gap-3 transition-colors duration-150 ${
        isLight
          ? 'bg-white text-slate-900 border-slate-200 shadow-xs'
          : isSepia
          ? 'bg-[#f7efe1] text-[#3d2b1f] border-[#dfd0b8] shadow-xs'
          : 'bg-slate-800 text-white border-slate-700'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 flex items-center justify-center rounded shadow-inner font-bold text-lg text-white shrink-0">
          <span className="font-bold text-xs">બપ</span>
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase flex items-center flex-wrap gap-1.5">
            <span
              id="header-app-title"
              className={
                isLight
                  ? 'text-slate-900 font-extrabold'
                  : isSepia
                  ? 'text-[#2e2015] font-extrabold'
                  : 'text-white font-extrabold'
              }
            >
              બાલપદ્મ પુસ્તકાલય - રાજુલા
            </span>
          </h1>
          <div
            className={`text-[11px] uppercase tracking-wider flex items-center gap-2 flex-wrap ${
              isLight ? 'text-slate-600 font-medium' : isSepia ? 'text-[#7c634e] font-medium' : 'text-slate-400'
            }`}
          >
            <span>• લાઈબ્રેરી મેનેજમેન્ટ સિસ્ટમ</span>
            <span>•</span>
            <span
              className={
                isLight
                  ? 'text-blue-700 font-mono font-bold'
                  : isSepia
                  ? 'text-[#7c502b] font-mono font-bold'
                  : 'text-blue-300 font-mono font-bold'
              }
            >
              કુલ પુસ્તકો: {totalBooksCount}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">

        {/* User Role Badge & Switch User */}
        {currentUser && currentUser.id !== 'guest_user' ? (
          <div
            onClick={onOpenLoginModal}
            className={`flex items-center gap-1.5 border rounded-lg p-1 px-2.5 cursor-pointer transition-colors ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                : isSepia
                ? 'bg-[#ede1cc] hover:bg-[#e4d6be] border-[#dfd0b8] text-[#3d2b1f]'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-100'
            }`}
            title="ક્લિક કરીને યુઝર બદલો અથવા લોગિન કરો (Click to switch user)"
          >
            {currentUser.role === 'Admin' ? (
              <span className={`flex items-center gap-1 border px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                isLight
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : isSepia
                  ? 'bg-[#dfebf7] text-blue-900 border-blue-300'
                  : 'bg-blue-950 text-blue-300 border-blue-500/50'
              }`}>
                <ShieldCheck className={`w-3.5 h-3.5 ${isLight ? 'text-blue-700' : isSepia ? 'text-blue-800' : 'text-blue-400'}`} />
                <span>ADMIN</span>
              </span>
            ) : currentUser.role === 'Super User' ? (
              <span className={`flex items-center gap-1 border px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                isLight
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : isSepia
                  ? 'bg-[#fef3c7] text-amber-900 border-amber-300'
                  : 'bg-amber-950 text-amber-300 border-amber-500/50'
              }`}>
                <ShieldCheck className={`w-3.5 h-3.5 ${isLight ? 'text-amber-700' : isSepia ? 'text-amber-800' : 'text-amber-400'}`} />
                <span>SUPER USER</span>
              </span>
            ) : (
              <span className={`flex items-center gap-1 border px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                isLight
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : isSepia
                  ? 'bg-[#ecfdf5] text-emerald-900 border-emerald-300'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
              }`}>
                <UserCheck className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : isSepia ? 'text-emerald-800' : 'text-emerald-400'}`} />
                <span>USER</span>
              </span>
            )}

            <div className={`text-xs font-semibold px-1 truncate max-w-[140px] ${
              isLight ? 'text-slate-900' : isSepia ? 'text-[#3d2b1f]' : 'text-slate-100'
            }`} title={`Logged in as: ${cleanName}`}>
              {cleanName}
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLogout();
                }}
                className={`p-1 rounded transition-colors cursor-pointer ml-0.5 ${
                  isLight
                    ? 'text-slate-500 hover:text-rose-600 hover:bg-slate-200'
                    : isSepia
                    ? 'text-[#7c634e] hover:text-rose-700 hover:bg-[#dfd0b8]'
                    : 'text-slate-400 hover:text-rose-400 hover:bg-slate-700/60'
                }`}
                title="લૉગઆઉટ (Log out)"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] px-2 py-1 rounded font-medium border hidden sm:inline-flex items-center gap-1 ${
              isLight ? 'bg-slate-100 text-slate-600 border-slate-300' : isSepia ? 'bg-[#ede1cc] text-[#7c634e] border-[#dfd0b8]' : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              👀 Guest (View-Only)
            </span>
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-blue-400 shadow"
              title="સંચાલક તરીકે લૉગિન કરો (Admin Login)"
            >
              <Key className="w-3.5 h-3.5" />
              <span>ADMIN LOGIN</span>
            </button>
          </div>
        )}

        {/* Theme (Light / Sepia / Dark) Toggle */}
        {(onSelectTheme || onToggleTheme) && (
          <div
            id="theme-selector-group"
            className={`flex items-center p-0.5 rounded border shrink-0 gap-0.5 ${
              isLight
                ? 'bg-slate-100 border-slate-300'
                : isSepia
                ? 'bg-[#ede1cc] border-[#dfd0b8]'
                : 'bg-slate-900/60 border-slate-700'
            }`}
            title={`થીમ પસંદ કરો: ${theme === 'light' ? 'લાઈટ (Light)' : theme === 'sepia' ? 'સેપિયા (Sepia)' : 'ડાર્ક (Dark)'}`}
          >
            {/* 1. Light Theme Button */}
            <button
              id="btn-theme-light"
              type="button"
              onClick={() => onSelectTheme ? onSelectTheme('light') : onToggleTheme?.()}
              className={`p-1.5 rounded transition-all cursor-pointer flex items-center justify-center ${
                theme === 'light'
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  : isSepia
                  ? 'text-[#7c634e] hover:text-[#3d2b1f] hover:bg-[#dfd0b8]'
                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-700/60'
              }`}
              title="લાઈટ થીમ (Light Mode)"
              aria-label="Light Theme"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>

            {/* 2. Sepia Theme Button */}
            <button
              id="btn-theme-sepia"
              type="button"
              onClick={() => onSelectTheme ? onSelectTheme('sepia') : onToggleTheme?.()}
              className={`p-1.5 rounded transition-all cursor-pointer flex items-center justify-center ${
                theme === 'sepia'
                  ? 'bg-[#d8c5a8] text-[#3d2b1f] font-bold shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  : isSepia
                  ? 'text-[#7c634e] hover:text-[#3d2b1f] hover:bg-[#dfd0b8]'
                  : 'text-slate-400 hover:text-amber-200 hover:bg-slate-700/60'
              }`}
              title="સેપિયા થીમ (Sepia / Reading Mode)"
              aria-label="Sepia Theme"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>

            {/* 3. Dark Theme Button */}
            <button
              id="btn-theme-dark"
              type="button"
              onClick={() => onSelectTheme ? onSelectTheme('dark') : onToggleTheme?.()}
              className={`p-1.5 rounded transition-all cursor-pointer flex items-center justify-center ${
                theme === 'dark'
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  : isSepia
                  ? 'text-[#7c634e] hover:text-[#3d2b1f] hover:bg-[#dfd0b8]'
                  : 'text-slate-400 hover:text-indigo-300 hover:bg-slate-700/60'
              }`}
              title="ડાર્ક થીમ (Dark Mode)"
              aria-label="Dark Theme"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Excel Import */}
        <label
          id="lbl-import-excel"
          onClick={(e) => {
            if (currentUser?.role !== 'Admin') {
              e.preventDefault();
              alert('⚠️ મનાઈ (Permission Denied): Excel Import કરવાની સુવિધા ફક્ત Admin માટે જ ઉપલબ્ધ છે.');
            }
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs uppercase font-medium transition-colors border ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              : isSepia
              ? 'bg-[#ede1cc] hover:bg-[#e4d6be] text-[#3d2b1f] border-[#dfd0b8]'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
          } ${
            currentUser?.role !== 'Admin' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          title={currentUser?.role !== 'Admin' ? 'Admin permission required' : 'Import external Excel file (.xlsx) into system'}
        >
          <Upload className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : isSepia ? 'text-[#7c502b]' : 'text-blue-400'}`} />
          <span>IMPORT .XLSX</span>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={onImportExcel}
            className="hidden"
            disabled={currentUser?.role !== 'Admin'}
          />
        </label>

        {/* Clear Database (Strictly Admin Only) */}
        {currentUser?.role === 'Admin' && onClearAll && (
          <button
            id="btn-header-clear-database"
            type="button"
            onClick={onClearAll}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs uppercase font-medium transition-colors border cursor-pointer ${
              isLight
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-sm'
                : isSepia
                ? 'bg-[#f8e6e2] hover:bg-[#f1d5cf] text-[#8e2920] border-[#e2bdb5] shadow-sm'
                : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-800/60 shadow-sm'
            }`}
            title="લાઈબ્રેરીનો તમામ ડેટા સાફ કરી 0 પુસ્તકો કરો (Clear Database) - ફક્ત Admin માટે"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>CLEAR DATA</span>
          </button>
        )}
        {onOpenStats && (
          <button
            id="btn-open-stats-modal"
            onClick={onOpenStats}
            className="flex items-center gap-1 bg-cyan-700 hover:bg-cyan-600 text-white px-2.5 py-1 rounded text-xs font-medium uppercase transition-colors cursor-pointer border border-cyan-500/40"
            title="Open Statistical Data Analysis & Catalog Metrics"
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyan-200" />
            <span>STATISTICS</span>
          </button>
        )}

        {/* Backups & Directory Modal */}
        <button
          id="btn-open-backups-modal"
          onClick={onOpenBackups}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs uppercase font-medium transition-colors cursor-pointer border ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              : isSepia
              ? 'bg-[#ede1cc] hover:bg-[#e4d6be] text-[#3d2b1f] border-[#dfd0b8]'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
          }`}
          title="Open Backup Directory & Logs"
        >
          <Database className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : isSepia ? 'text-[#7c502b]' : 'text-blue-400'}`} />
          <span>BACKUPS FOLDER</span>
        </button>

        {/* Install App Button (PWA for Mobile & PC) */}
        {onOpenInstallModal && (
          <button
            id="btn-install-pwa-app"
            type="button"
            onClick={onOpenInstallModal}
            className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-2.5 py-1 rounded text-xs font-bold uppercase transition-all shadow cursor-pointer border border-blue-400/50"
            title="Install Our Book Collection App on Mobile or PC"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-200" />
            <span>INSTALL APP</span>
          </button>
        )}

        {/* Contact Info */}
        <div className={`text-right pl-2 border-l hidden lg:block ${
          isLight ? 'border-slate-300' : isSepia ? 'border-[#dfd0b8]' : 'border-slate-700'
        }`}>
          <div className={`text-[11px] font-mono font-semibold ${
            isLight ? 'text-slate-800' : isSepia ? 'text-[#3d2b1f]' : 'text-slate-300'
          }`}>7878413535</div>
          <div className={`text-[10px] ${
            isLight ? 'text-slate-500' : isSepia ? 'text-[#7c634e]' : 'text-slate-400'
          }`}>thakerdevduttyuppai@gmail.com</div>
        </div>
      </div>
    </header>
  );
};


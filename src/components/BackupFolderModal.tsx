import React, { useState } from 'react';
import { FolderCheck, X, HardDrive, AlertCircle, ExternalLink } from 'lucide-react';

interface BackupFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderPath: string;
  onSelectFolder: (path: string) => void;
}

export const BackupFolderModal: React.FC<BackupFolderModalProps> = ({
  isOpen,
  onClose,
  folderPath,
  onSelectFolder,
}) => {
  const [currentPath, setCurrentPath] = useState(folderPath || 'D:\\Balpadm_Backups\\');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">બેકઅપ ફોલ્ડર સેટિંગ</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">ઓટો-બેકઅપ સેવ થવાનું લોકેશન</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              સ્થાનિક પાથ (Local Directory Path)
            </label>
            <div className="relative">
              <input
                type="text"
                value={currentPath}
                onChange={(e) => setCurrentPath(e.target.value)}
                placeholder="દા.ત. D:\Balpadm_Backups\"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl flex gap-3 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              બ્રાઉઝર સુરક્ષા મર્યાદાઓને કારણે, ફાઈલો આપમેળે તમારા કમ્પ્યુટરના "Downloads" ફોલ્ડરમાં સેવ થશે. તમે અહીં સંદર્ભ માટે પાથ રાખી શકો છો.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
          >
            રદ કરો
          </button>
          <button
            onClick={() => {
              onSelectFolder(currentPath);
              onClose();
            }}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow transition-all flex items-center gap-2"
          >
            <FolderCheck className="w-4 h-4" />
            સાચવો
          </button>
        </div>
      </div>
    </div>
  );
};

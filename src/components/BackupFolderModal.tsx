import React, { useRef } from 'react';
import { BackupItem, PDFExportItem, AppUser } from '../types';
import { X, Download, Upload, Trash2, RotateCcw, FileSpreadsheet, FileJson, Clock, Database, AlertTriangle } from 'lucide-react';

interface BackupFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  backups: BackupItem[];
  pdfExports: PDFExportItem[];
  onDownloadDatabase: () => void;
  onClearDatabase: () => void;
  onExportJSON: () => void;
  onImportJSON: (file: File) => void;
  currentUser?: AppUser;
}

export const BackupFolderModal: React.FC<BackupFolderModalProps> = ({
  isOpen,
  onClose,
  backups,
  pdfExports,
  onDownloadDatabase,
  onClearDatabase,
  onExportJSON,
  onImportJSON,
  currentUser,
}) => {
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJSON(file);
      if (jsonFileInputRef.current) {
        jsonFileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">બેકઅપ અને ડેટાબેઝ વ્યવસ્થાપન</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Backup, Restore & Export Database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => {
                onDownloadDatabase();
              }}
              className="flex items-start gap-4 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 transition-all text-left group"
            >
              <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-emerald-900 dark:text-emerald-200">Excel બેકઅપ ડાઉનલોડ</h3>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1">બધા પુસ્તકો અને ઈસ્યુ લિસ્ટને Excel ફાઈલ (.xlsx) માં સાચવો.</p>
              </div>
            </button>

            <button
              onClick={() => {
                onExportJSON();
              }}
              className="flex items-start gap-4 p-4 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/60 transition-all text-left group"
            >
              <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                <FileJson className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-200">JSON બેકઅપ ડાઉનલોડ</h3>
                <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-1">સંપૂર્ણ ડેટાબેઝનું ઝડપી ડિજિટલ JSON બેકઅપ સાચવો.</p>
              </div>
            </button>

            <div>
              <input
                ref={jsonFileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => jsonFileInputRef.current?.click()}
                className="w-full flex items-start gap-4 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/60 transition-all text-left group"
              >
                <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-indigo-900 dark:text-indigo-200">JSON બેકઅપ રીસ્ટોર</h3>
                  <p className="text-xs text-indigo-700/80 dark:text-indigo-400/80 mt-1">અગાઉ સેવ કરેલી JSON ફાઈલ અપલોડ કરીને ડેટા પાછો લાવો.</p>
                </div>
              </button>
            </div>

          </div>

          {/* Danger Zone (Admin Only) */}
          {currentUser?.role === 'Admin' && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-red-900 dark:text-red-200">બધો ડેટા સાફ કરો (Clear Database)</h4>
                  <p className="text-xs text-red-700 dark:text-red-400">ડેટાબેઝમાંથી બધા પુસ્તકો ડિલીટ થઈ જશે. આ ક્રિયા પૂર્વવત થઈ શકતી નથી.</p>
                </div>
              </div>
              <button
                onClick={onClearDatabase}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                ખાલી કરો
              </button>
            </div>
          )}

          {/* Backup History */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> તાજેતરના બેકઅપ હિસ્ટ્રી ({backups.length})
            </h4>
            {backups.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                હજુ સુધી કોઈ બેકઅપ હિસ્ટ્રી નથી.
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto">
                {backups.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{item.filename}</span>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {item.timestamp} • પુસ્તકો: {item.bookCount}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {item.type || 'backup'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-medium transition-colors"
          >
            બંધ કરો
          </button>
        </div>
      </div>
    </div>
  );
};

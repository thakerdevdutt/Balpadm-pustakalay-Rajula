import React from 'react';
import { Save, FileText, RotateCcw, SlidersHorizontal, Download, Lock } from 'lucide-react';

interface ActionButtonsProps {
  onSaveUpdate: () => void;
  onExportExcel?: () => void;
  onPDFLandscape: () => void;
  onPDFPortrait: () => void;
  onPDFFolder: () => void;
  onReset: () => void;
  onBackup?: () => void;
  onMaster: () => void;
  isEditing: boolean;
  canExport?: boolean;
  canSave?: boolean;
  canManageMaster?: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onSaveUpdate,
  onExportExcel,
  onPDFLandscape,
  onPDFPortrait,
  onPDFFolder,
  onReset,
  onBackup,
  onMaster,
  isEditing,
  canExport = true,
  canSave = true,
  canManageMaster = true,
}) => {
  return (
    <div
      id="action-command-buttons"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 shrink-0 my-3 w-full"
    >
      {/* 1. BTN_Save_Update_Click - Emerald Green */}
      <button
        id="BTN_Save_Update_Click"
        onClick={canSave ? onSaveUpdate : undefined}
        disabled={!canSave}
        className={`w-full font-bold py-2.5 px-3 rounded shadow-md text-xs uppercase transition-all flex items-center justify-center gap-1.5 ${
          canSave
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95 border border-emerald-500/50'
            : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 cursor-not-allowed opacity-55 shadow-none'
        }`}
        title={canSave ? 'Save or update record in Database' : 'માત્ર Admin અને Super User ઉમેરી શકે (Guest/User માટે માત્ર જોવાની સુવિધા છે)'}
      >
        {canSave ? <Save className="w-4 h-4 shrink-0" /> : <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
        <span className="truncate">{isEditing ? 'Update Record' : 'Save / Update'}</span>
      </button>

      {/* 2. BTN_Export_Excel - Teal/Emerald */}
      {onExportExcel && (
        <button
          id="BTN_Export_Excel"
          onClick={canExport ? onExportExcel : undefined}
          disabled={!canExport}
          className={`w-full font-bold py-2.5 px-3 rounded text-xs uppercase transition-all flex items-center justify-center gap-1.5 ${
            canExport
              ? 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-md cursor-pointer active:scale-95 border border-emerald-600/50'
              : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 cursor-not-allowed opacity-55 shadow-none'
          }`}
          title={canExport ? 'Export Database.xlsx file' : 'માત્ર Admin અને Super User વાપરી શકે (User માટે ડિસેબલ છે)'}
        >
          {canExport ? (
            <Download className="w-4 h-4 shrink-0" />
          ) : (
            <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          )}
          <span className="truncate">Export Excel</span>
        </button>
      )}

      {/* 3. BTN_PDF_Landscape - Indigo / Purple */}
      <button
        id="BTN_PDF_Landscape"
        onClick={canExport ? onPDFLandscape : undefined}
        disabled={!canExport}
        className={`w-full font-bold py-2.5 px-3 rounded text-xs uppercase transition-all flex items-center justify-center gap-1.5 ${
          canExport
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md cursor-pointer active:scale-95 border border-indigo-500/50'
            : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 cursor-not-allowed opacity-55 shadow-none'
        }`}
        title={canExport ? 'Export landscape PDF document' : 'માત્ર Admin અને Super User વાપરી શકે (User માટે ડિસેબલ છે)'}
      >
        {canExport ? (
          <FileText className="w-4 h-4 shrink-0" />
        ) : (
          <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        )}
        <span className="truncate">PDF Landscape</span>
      </button>

      {/* 4. BTN_PDF_Portrait - Teal / Cyan */}
      <button
        id="BTN_PDF_Portrait"
        onClick={canExport ? onPDFPortrait : undefined}
        disabled={!canExport}
        className={`w-full font-bold py-2.5 px-3 rounded text-xs uppercase transition-all flex items-center justify-center gap-1.5 ${
          canExport
            ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-md cursor-pointer active:scale-95 border border-teal-500/50'
            : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 cursor-not-allowed opacity-55 shadow-none'
        }`}
        title={canExport ? 'Export portrait PDF document' : 'માત્ર Admin અને Super User વાપરી શકે (User માટે ડિસેબલ છે)'}
      >
        {canExport ? (
          <FileText className="w-4 h-4 shrink-0" />
        ) : (
          <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        )}
        <span className="truncate">PDF Portrait</span>
      </button>

      {/* 5. BTN_Reset - Amber / Orange */}
      <button
        id="BTN_Reset"
        onClick={onReset}
        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-3 rounded shadow-md text-xs uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-amber-400/50"
        title="Clear fields and reset focus"
      >
        <RotateCcw className="w-4 h-4 shrink-0" />
        <span className="truncate">Reset</span>
      </button>

      {/* 6. BTN_Master - Purple / Magenta */}
      <button
        id="BTN_Master"
        onClick={canManageMaster ? onMaster : undefined}
        disabled={!canManageMaster}
        className={`w-full font-bold py-2.5 px-3 rounded shadow-md text-xs uppercase transition-all flex items-center justify-center gap-1.5 ${
          canManageMaster
            ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer active:scale-95 border border-purple-500/50'
            : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 cursor-not-allowed opacity-55 shadow-none'
        }`}
        title={canManageMaster ? 'Open Master list management utilities' : 'માત્ર Admin માટે ઉપલબ્ધ છે'}
      >
        {canManageMaster ? <SlidersHorizontal className="w-4 h-4 shrink-0" /> : <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
        <span className="truncate">Master</span>
      </button>
    </div>
  );
};

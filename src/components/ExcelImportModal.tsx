import React from 'react';
import { X, FileSpreadsheet, ArrowDownToLine, RefreshCw, Layers, AlertCircle } from 'lucide-react';
import { Book, BorrowerRecord } from '../types';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  parsedBooks: Book[];
  parsedBorrowers: BorrowerRecord[];
  currentBooksCount: number;
  nextBookId: string;
  onAppend: () => void;
  onReplace: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  fileName,
  parsedBooks,
  parsedBorrowers,
  currentBooksCount,
  nextBookId,
  onAppend,
  onReplace,
}) => {
  if (!isOpen) return null;

  const newCount = parsedBooks.length;
  const startIdNum = parseInt(nextBookId, 10) || 1;
  const endIdNum = startIdNum + newCount - 1;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Excel ડેટા ઈમ્પોર્ટ વિકલ્પ (Import Options)</h3>
              <p className="text-xs text-slate-400 truncate max-w-[280px]">{fileName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 bg-slate-50">
          
          {/* Summary Box */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-around text-center divide-x divide-slate-100">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">હાલના પુસ્તકો</div>
              <div className="text-lg font-extrabold text-slate-800">{currentBooksCount}</div>
            </div>
            <div className="pl-3">
              <div className="text-[11px] text-slate-500 font-medium">Excel માંથી મળેલા</div>
              <div className="text-lg font-extrabold text-emerald-600">+{newCount}</div>
            </div>
            <div className="pl-3">
              <div className="text-[11px] text-slate-500 font-medium">કુલ પુસ્તકો થશે</div>
              <div className="text-lg font-extrabold text-blue-600">{currentBooksCount + newCount}</div>
            </div>
          </div>

          <div className="text-xs text-slate-600 font-medium px-1">
            આ Excel ફાઈલનો ડેટા લાઈબ્રેરીમાં કઈ રીતે ગોઠવવો છે તે પસંદ કરો:
          </div>

          {/* Option 1: Append Below Existing Data (User's primary requirement!) */}
          <button
            id="btn-confirm-append-excel"
            type="button"
            onClick={onAppend}
            className="w-full text-left p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 hover:bg-emerald-100/80 transition-all cursor-pointer group shadow-xs active:scale-[0.99]"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <ArrowDownToLine className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-emerald-950">
                    હાલના ડેટાની નીચે ગોઠવો (Append Below)
                  </span>
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    ભલામણ કરેલ
                  </span>
                </div>
                <p className="text-xs text-emerald-900/80 mt-1 leading-relaxed">
                  હાલના <strong>{currentBooksCount} પુસ્તકો સચવાઈ રહેશે</strong> અને આ નવા {newCount} પુસ્તકો <strong>ક્રમ #{startIdNum} થી #{endIdNum}</strong> તરીકે નીચે ઉમેરાશે. જૂનો ડેટા ડિલીટ નહીં થાય.
                </p>
              </div>
            </div>
          </button>

          {/* Option 2: Replace All (Clear existing & import fresh) */}
          <button
            id="btn-confirm-replace-excel"
            type="button"
            onClick={onReplace}
            className="w-full text-left p-4 rounded-xl border border-slate-300 bg-white hover:bg-rose-50/60 hover:border-rose-300 transition-all cursor-pointer group shadow-2xs active:scale-[0.99]"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-200 text-slate-700 group-hover:bg-rose-500 group-hover:text-white rounded-lg shrink-0 mt-0.5 transition-colors">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-slate-900 group-hover:text-rose-900">
                  જૂનો ડેટા સાફ કરી નવો ઈમ્પોર્ટ કરો (Replace All)
                </div>
                <p className="text-xs text-slate-500 group-hover:text-rose-800/80 mt-1 leading-relaxed">
                  હાલના તમામ {currentBooksCount} પુસ્તકો સાફ થઈ જશે અને માત્ર આ Excel ફાઈલના <strong>{newCount} પુસ્તકો</strong> રહેશે.
                </p>
              </div>
            </div>
          </button>

        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            રદ કરો (Cancel)
          </button>
        </div>

      </div>
    </div>
  );
};

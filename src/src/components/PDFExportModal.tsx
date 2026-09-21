import React, { useState, useMemo } from 'react';
import { Book, AppTheme } from '../types';
import { FileText, Users, User, X, Printer, Sparkles } from 'lucide-react';
import { openCatalogPrintView } from '../utils/pdfExport';

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orientation: 'Landscape' | 'Portrait';
  books: Book[];
  isAdmin: boolean;
  onSuccess: (fileName: string, count: number) => void;
  theme?: AppTheme;
}

export const PDFExportModal: React.FC<PDFExportModalProps> = ({
  isOpen,
  onClose,
  orientation,
  books,
  isAdmin,
  onSuccess,
  theme = 'dark',
}) => {
  const [selectedUser, setSelectedUser] = useState<string>('ALL');

  const isLight = theme === 'light';
  const isSepia = theme === 'sepia';

  // Group books and count per user
  const userStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of books) {
      let u = (b.createdBy || '').trim();
      if (!u || u.toLowerCase() === 'admin') {
        u = 'Devdutt Thaker';
      }
      map.set(u, (map.get(u) || 0) + 1);
    }
    const list = Array.from(map.entries()).map(([name, count]) => ({
      name,
      count,
    }));
    list.sort((a, b) => {
      if (a.name.toLowerCase().includes('devdutt')) return -1;
      if (b.name.toLowerCase().includes('devdutt')) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [books]);

  if (!isOpen) return null;

  const totalFilteredBooks =
    selectedUser === 'ALL'
      ? books.length
      : userStats.find((u) => u.name === selectedUser)?.count || 0;

  const handlePrint = () => {
    try {
      openCatalogPrintView(books, orientation, isAdmin, selectedUser);
      const dateStr = new Date().toISOString().slice(0, 10);
      const userTag = selectedUser === 'ALL' ? 'AllUsers' : selectedUser.replace(/\s+/g, '_');
      const filename = `Our_Book_Collection_${orientation}_${userTag}_${dateStr}.pdf`;
      onSuccess(filename, totalFilteredBooks);
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('પ્રિન્ટ વિન્ડો ખોલવામાં ક્ષતિ આવી.');
    }
  };

  return (
    <div
      id="pdf-export-selector-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col ${
          isLight
            ? 'bg-white border-blue-300 text-slate-900 shadow-slate-300/40'
            : isSepia
            ? 'bg-[#fdfaf3] border-[#dfd0b8] text-[#3d2b1f] shadow-[#dfd0b8]/40'
            : 'bg-slate-900 border-slate-700 text-slate-100 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          isLight
            ? 'bg-gradient-to-r from-blue-50 via-slate-50 to-blue-100 border-slate-200 text-slate-900'
            : isSepia
            ? 'bg-gradient-to-r from-[#f4ecd8] via-[#ede1cc] to-[#e6d5b8] border-[#dfd0b8] text-[#3d2b1f]'
            : 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border-blue-800/60 text-white'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${
              isLight
                ? 'bg-blue-100 border border-blue-200 text-blue-700'
                : isSepia
                ? 'bg-[#ede1cc] border border-[#dfd0b8] text-[#7c502b]'
                : 'bg-blue-600/30 border border-blue-400/40 text-blue-300'
            }`}>
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : isSepia ? 'text-[#3d2b1f]' : 'text-white'
              }`}>
                PDF કૅટેલોગ એક્સપોર્ટ ({orientation})
              </h2>
              <p className={`text-xs ${
                isLight ? 'text-blue-700 font-semibold' : isSepia ? 'text-[#7c502b]' : 'text-blue-200'
              }`}>
                User મુજબ પેજવાળી PDF તૈયાર કરો
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isLight ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100' : isSepia ? 'text-[#7c634e] hover:text-[#3d2b1f] hover:bg-[#ede1cc]' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-sm">
          {/* Info pill */}
          <div className={`rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-xs border ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-800'
              : isSepia
              ? 'bg-[#f6ede0] border-[#dfd0b8] text-[#3d2b1f]'
              : 'bg-slate-800/80 border-slate-700/80 text-slate-300'
          }`}>
            <span>
              ઓરિએન્ટેશન: <strong className={isLight ? 'text-indigo-700 font-bold' : isSepia ? 'text-[#7c502b] font-bold' : 'text-indigo-300 font-semibold'}>{orientation}</strong>
            </span>
            <span>
              પસંદ કરેલ પુસ્તકો: <strong className={isLight ? 'text-emerald-700 font-bold' : isSepia ? 'text-[#2e7d32] font-bold' : 'text-emerald-400 font-bold'}>{totalFilteredBooks} Books</strong>
            </span>
            <span className="text-xs">
              {isAdmin ? (
                <span className={`px-2 py-0.5 rounded font-medium border ${
                  isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : isSepia ? 'bg-[#ede1cc] text-[#78350f] border-[#fcd34d]' : 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                }`}>
                  Admin View (પ્રકાશક અને કિંમત સાથે)
                </span>
              ) : (
                <span className={`px-2 py-0.5 rounded font-medium border ${
                  isLight ? 'bg-blue-100 text-blue-900 border-blue-300' : isSepia ? 'bg-[#ede1cc] text-[#1e2e42] border-[#93c5fd]' : 'bg-blue-950/80 text-blue-300 border-blue-800/60'
                }`}>
                  User View (પ્રકાશક અને કિંમત વગર)
                </span>
              )}
            </span>
          </div>

          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
              isLight ? 'text-slate-700' : isSepia ? 'text-[#3d2b1f]' : 'text-slate-300'
            }`}>
              યુઝર પસંદ કરો (Select User for PDF)
            </label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {/* Option: All Users */}
              <label
                onClick={() => setSelectedUser('ALL')}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedUser === 'ALL'
                    ? isLight
                      ? 'bg-blue-50 border-2 border-blue-500 text-blue-950 shadow-xs'
                      : isSepia
                      ? 'bg-[#e8ecf4] border-2 border-blue-600 text-[#1e2e42] shadow-xs'
                      : 'bg-indigo-950/70 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                    : isLight
                    ? 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                    : isSepia
                    ? 'bg-[#fffdf8] border-[#dfd0b8] hover:bg-[#ede1cc] text-[#3d2b1f]'
                    : 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="userOption"
                    value="ALL"
                    checked={selectedUser === 'ALL'}
                    onChange={() => setSelectedUser('ALL')}
                    className="accent-indigo-600 w-4 h-4"
                  />
                  <div className="flex items-center gap-2 font-medium">
                    <Users className={`w-4 h-4 ${isLight ? 'text-indigo-600' : isSepia ? 'text-[#7c502b]' : 'text-indigo-400'}`} />
                    <span>All Users (બધા યુઝર્સ - દરેક માટે અલગ નવું પેજ)</span>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                  isLight
                    ? 'bg-slate-100 text-slate-800 border-slate-300'
                    : isSepia
                    ? 'bg-[#ede1cc] text-[#3d2b1f] border-[#dfd0b8]'
                    : 'bg-slate-700/90 text-slate-200 border-slate-600'
                }`}>
                  {books.length} Books
                </span>
              </label>

              {/* Individual Users */}
              {userStats.map((u) => {
                const isChecked = selectedUser === u.name;
                return (
                  <label
                    key={u.name}
                    onClick={() => setSelectedUser(u.name)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      isChecked
                        ? isLight
                          ? 'bg-blue-50 border-2 border-blue-500 text-blue-950 shadow-xs'
                          : isSepia
                          ? 'bg-[#e8ecf4] border-2 border-blue-600 text-[#1e2e42] shadow-xs'
                          : 'bg-blue-950/70 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50'
                        : isLight
                        ? 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                        : isSepia
                        ? 'bg-[#fffdf8] border-[#dfd0b8] hover:bg-[#ede1cc] text-[#3d2b1f]'
                        : 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="userOption"
                        value={u.name}
                        checked={isChecked}
                        onChange={() => setSelectedUser(u.name)}
                        className="accent-blue-600 w-4 h-4"
                      />
                      <div className="flex items-center gap-2 font-medium">
                        <User className={`w-4 h-4 ${isLight ? 'text-blue-600' : isSepia ? 'text-[#7c502b]' : 'text-blue-400'}`} />
                        <span>{u.name}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${
                      isLight
                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                        : isSepia
                        ? 'bg-[#ede1cc] text-[#1e2e42] border-[#93c5fd]'
                        : 'bg-blue-950/80 text-blue-300 border-blue-800/60'
                    }`}>
                      {u.count} Books
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className={`rounded-lg p-3 text-xs flex items-start gap-2.5 border ${
            isLight
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : isSepia
              ? 'bg-[#eaf2e7] border-[#86efac] text-[#183d16]'
              : 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200/90'
          }`}>
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Instant Fast PDF:</strong> <strong>"Print"</strong> બટન દબાવતાં જ માત્ર ૧ સેકન્ડમાં બુક લિસ્ટ તૈયાર થઈ જશે, જ્યાંથી તમે તરત જ <strong>Save as PDF</strong> કરી શકશો.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`px-5 py-3.5 border-t flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : isSepia ? 'bg-[#f6ede0] border-[#dfd0b8]' : 'bg-slate-950 border-slate-800'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
              isLight
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                : isSepia
                ? 'bg-[#fffdf8] border-[#dfd0b8] text-[#3d2b1f] hover:bg-[#ede1cc]'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            Cancel (રદ કરો)
          </button>
          
          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};

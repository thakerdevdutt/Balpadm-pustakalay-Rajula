import React, { useState, useMemo, useEffect } from 'react';
import { Book, BorrowerRecord, AppTheme } from '../types';
import { UserCheck, BookOpenCheck, ListOrdered, Eraser, Calendar, Phone, MapPin, User, CheckCircle2 } from 'lucide-react';
import { formatDateToDDMMYYYY, toInputDateFormat, isDateOverdue, addDaysToDate } from '../utils/dateUtils';

interface FrameBorrowerInfoProps {
  selectedBook: Book | null;
  onIssueBook: (borrowerData: Omit<BorrowerRecord, 'issueId' | 'status'>) => void;
  onOpenIssueList: () => void;
  languageMode: 'en' | 'gu' | 'both';
  totalIssuedCount: number;
  canIssue?: boolean;
  borrowers?: BorrowerRecord[];
  onReturnBook?: (issueId: string) => void;
  theme?: AppTheme;
}

export const FrameBorrowerInfo: React.FC<FrameBorrowerInfoProps> = ({
  selectedBook,
  onIssueBook,
  onOpenIssueList,
  languageMode,
  totalIssuedCount,
  canIssue = true,
  borrowers = [],
  onReturnBook,
  theme = 'dark',
}) => {
  const [borrowerName, setBorrowerName] = useState('');
  const [address, setAddress] = useState('');
  const [mobile, setMobile] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [remark, setRemark] = useState('');

  // Check if the currently selected book is already issued
  const activeBorrower = useMemo(() => {
    if (!selectedBook?.bookId) return null;
    const cleanId = String(selectedBook.bookId).trim();
    if (borrowers && Array.isArray(borrowers)) {
      const found = borrowers.find(
        (b) => String(b.bookId).trim() === cleanId && b.status === 'Issued'
      );
      if (found) return found;
    }
    if (selectedBook.isIssued || selectedBook.status === 'Issued' || selectedBook.currentBorrowerName) {
      return {
        issueId: 'ISS-ACTIVE',
        bookId: selectedBook.bookId,
        bookName: selectedBook.bookName,
        borrowerName: selectedBook.currentBorrowerName || 'ઉધાર લેનાર',
        address: '',
        mobile: '',
        issueDate: '',
        dueDate: selectedBook.currentIssueDueDate || '',
        status: 'Issued' as const,
        remark: '',
        remarks: '',
      };
    }
    return null;
  }, [selectedBook, borrowers]);

  // When selected book changes: if it is issued, auto-fill all borrower fields; otherwise clear them.
  useEffect(() => {
    if (activeBorrower) {
      setBorrowerName(activeBorrower.borrowerName || '');
      setAddress(activeBorrower.address || '');
      setMobile(activeBorrower.mobile || '');
      setIssueDate(toInputDateFormat(activeBorrower.issueDate) || new Date().toISOString().slice(0, 10));
      setDueDate(toInputDateFormat(activeBorrower.dueDate) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
      setRemark(activeBorrower.remark || (activeBorrower as any).remarks || '');
    } else {
      setBorrowerName('');
      setAddress('');
      setMobile('');
      setIssueDate(new Date().toISOString().slice(0, 10));
      setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
      setRemark('');
    }
  }, [activeBorrower, selectedBook?.bookId]);

  const handleClear = () => {
    setBorrowerName('');
    setAddress('');
    setMobile('');
    setIssueDate(new Date().toISOString().slice(0, 10));
    setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setRemark('');
  };

  const handleIssueDateChange = (newVal: string) => {
    setIssueDate(newVal);
    if (newVal) {
      setDueDate(addDaysToDate(newVal, 30));
    }
  };

  const handleSetDueDays = (days: number) => {
    setDueDate(addDaysToDate(issueDate, days));
  };

  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) {
      alert('Please select a book from Frame 2 ListBox first! (મહેરબાની કરીને યાદીમાંથી પુસ્તક પસંદ કરો!)');
      return;
    }
    if (!borrowerName.trim()) {
      alert('Please enter Borrower Name! (ઉધાર લેનારનું નામ દાખલ કરો!)');
      return;
    }

    onIssueBook({
      bookId: selectedBook.bookId,
      bookName: selectedBook.bookName,
      borrowerName: borrowerName.trim(),
      address: address.trim(),
      mobile: mobile.trim(),
      issueDate: formatDateToDDMMYYYY(issueDate) || issueDate,
      dueDate: formatDateToDDMMYYYY(dueDate) || dueDate,
      remark: remark.trim(),
    });

    handleClear();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    // Ignore Enter key during IME composition (e.g. Gujarati/Indic typing on macOS or Windows)
    if (e.nativeEvent.isComposing) {
      return;
    }
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
        e.preventDefault();
        const container = e.currentTarget;
        const focusables = Array.from(
          container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>(
            'input:not([readonly]):not([disabled]), select:not([disabled]), button[type="submit"]'
          )
        );
        const index = focusables.indexOf(target as any);
        if (index >= 0 && index < focusables.length - 1) {
          (focusables[index + 1] as HTMLElement).focus();
        }
      }
    }
  };

  return (
    <section
      id="frame-3-borrower-info"
      className="bg-slate-800 text-white rounded shadow-lg p-4 border-t-2 border-indigo-500 my-3 transition-all"
      onKeyDown={handleKeyDown}
    >
      {/* Frame 3 Header */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
        <h2 className="text-xs font-bold text-indigo-300 uppercase flex items-center gap-2">
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
          <span>Borrower & Issue Details</span>
        </h2>
        <div className="text-[10px] text-slate-400 uppercase font-mono">
          Active Issues: {totalIssuedCount}
        </div>
      </div>

      {/* Active Issued Status Banner */}
      {activeBorrower && (() => {
        const isOverdue = isDateOverdue(activeBorrower.dueDate);
        return (
          <div className={`mb-3 px-3 py-2 border rounded-lg text-xs flex flex-wrap items-center justify-between gap-2 animate-in fade-in ${
            isOverdue
              ? 'bg-rose-500/20 border-rose-500/80 text-rose-200'
              : 'bg-amber-500/20 border-amber-500/60 text-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              <BookOpenCheck className={`w-4 h-4 shrink-0 ${isOverdue ? 'text-rose-400 animate-bounce' : 'text-amber-400 animate-bounce'}`} />
              <span>
                <strong className={isOverdue ? 'text-rose-300 font-extrabold' : ''}>
                  {isOverdue ? '🚨 અવધિ પૂરી થઈ ગઈ છે (મુદત વીતી ગઈ છે / Overdue):' : '⚠️ આ પુસ્તક હાજરમાં નથી (ઈશ્યુ થયેલ છે):'}
                </strong>{' '}
                ઉધાર લેનાર: <strong className="text-white underline">{activeBorrower.borrowerName}</strong>
                {activeBorrower.mobile ? ` • Mo: ${activeBorrower.mobile}` : ''}
                {activeBorrower.issueDate ? ` • Issue Date: ${formatDateToDDMMYYYY(activeBorrower.issueDate)}` : ''}
                {activeBorrower.dueDate ? (
                  <span className={`ml-1.5 px-2 py-0.5 rounded font-bold ${
                    isOverdue ? 'bg-rose-950 text-rose-200 border border-rose-500/80 shadow-xs' : 'bg-amber-950/70 text-amber-300'
                  }`}>
                    • Due Date: {formatDateToDDMMYYYY(activeBorrower.dueDate)}
                  </span>
                ) : ''}
              </span>
            </div>
            {onReturnBook && activeBorrower.issueId && activeBorrower.issueId !== 'ISS-ACTIVE' && (
              <button
                type="button"
                onClick={() => onReturnBook(activeBorrower.issueId)}
                className={`px-3 py-1 text-white rounded font-bold text-xs cursor-pointer shadow transition-all flex items-center gap-1 shrink-0 ${
                  isOverdue ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
                title="પુસ્તક પરત જમા કરો"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>પુસ્તક જમા કરો (Return Book)</span>
              </button>
            )}
          </div>
        );
      })()}

      <form onSubmit={handleIssueSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5 mb-3">
          
          {/* Selected Book */}
          <div className="col-span-1">
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Selected Book</label>
            <input
              type="text"
              readOnly
              value={selectedBook ? `${selectedBook.bookName} (#${selectedBook.bookId})` : 'None Selected'}
              className="w-full bg-slate-700 border border-slate-600 px-2 py-1.5 rounded text-xs text-white truncate outline-none font-medium"
            />
          </div>

          {/* Borrower Name */}
          <div className="col-span-1">
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
              Borrower Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="txt_BorrowerName"
              type="text"
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-xs text-blue-100 outline-none focus:border-blue-500"
              placeholder="Enter name..."
              required
            />
          </div>

          {/* Address */}
          <div className="col-span-1">
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Address</label>
            <input
              id="txt_BorrowerAddress"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-xs text-slate-200 outline-none focus:border-blue-500"
              placeholder="Location..."
            />
          </div>

          {/* Mobile No. */}
          <div className="col-span-1">
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Mobile No.</label>
            <input
              id="txt_BorrowerMobile"
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-xs font-mono text-slate-200 outline-none focus:border-blue-500"
              placeholder="+91..."
            />
          </div>

          {/* Issue Date */}
          <div className="col-span-1">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Issue Date</label>
              <span className="text-[9px] font-mono text-indigo-400 font-semibold" title="DD-MM-YYYY Format">
                {formatDateToDDMMYYYY(issueDate)}
              </span>
            </div>
            <input
              id="txt_IssueDate"
              type="date"
              value={toInputDateFormat(issueDate)}
              onChange={(e) => handleIssueDateChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-xs font-mono text-slate-200 outline-none focus:border-blue-500"
              title="ઇશ્યુ તારીખ"
            />
          </div>

          {/* Due Date (Selectable with 1-month default & quick adjustments for big books) */}
          <div className="col-span-1">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase" title="પરત કરવાની નિયત તારીખ">
                Due Date (પરત તારીખ)
              </label>
              <span className="text-[9px] font-mono text-emerald-400 font-semibold" title="DD-MM-YYYY Format">
                {formatDateToDDMMYYYY(dueDate)}
              </span>
            </div>
            <input
              id="txt_DueDate"
              type="date"
              value={toInputDateFormat(dueDate)}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-xs font-mono text-emerald-300 outline-none focus:border-emerald-500"
              title="પરત કરવાની તારીખ (વધુ કે ઓછી કરી શકો છો)"
            />
            {/* Quick Adjustment Chips for large or small books */}
            <div className="flex items-center gap-1 mt-1 justify-between">
              <button
                type="button"
                onClick={() => handleSetDueDays(15)}
                className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-[8px] font-mono text-slate-300 rounded border border-slate-700 cursor-pointer"
                title="૧૫ દિવસ"
              >
                15d
              </button>
              <button
                type="button"
                onClick={() => handleSetDueDays(30)}
                className="px-1 py-0.5 bg-indigo-900/70 hover:bg-indigo-800 text-[8px] font-mono text-indigo-200 rounded border border-indigo-700/60 font-bold cursor-pointer"
                title="૩૦ દિવસ (૧ મહિનો - બાય ડિફોલ્ટ)"
              >
                30d (1Mo)
              </button>
              <button
                type="button"
                onClick={() => handleSetDueDays(45)}
                className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-[8px] font-mono text-slate-300 rounded border border-slate-700 cursor-pointer"
                title="૪૫ દિવસ"
              >
                45d
              </button>
              <button
                type="button"
                onClick={() => handleSetDueDays(60)}
                className="px-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-[8px] font-mono text-slate-300 rounded border border-slate-700 cursor-pointer"
                title="૬૦ દિવસ (૨ મહિના - મોટી પુસ્તક માટે)"
              >
                60d (2Mo)
              </button>
            </div>
          </div>

          {/* Return Remark / Notes */}
          <div className="col-span-1">
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Remark / નોંધ</label>
            <input
              id="txt_IssueRemark"
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-xs text-slate-200 outline-none focus:border-blue-500"
              placeholder="Optional remark..."
            />
          </div>

        </div>

        {/* Bottom Bar: Version Badge below Selected Book column & Action Buttons opposite on right */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-2.5 border-t border-slate-700">
          {/* Version badge: Positioned below Selected Book (None Selected) and facing Issue Book */}
          <div className="flex items-center">
            <div
              className={`inline-flex items-center justify-center px-3.5 py-1 rounded-full text-xs font-mono font-bold tracking-wider select-none shadow-sm border-2 ${
                theme === 'light'
                  ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-blue-200/50'
                  : theme === 'sepia'
                  ? 'bg-[#f4ebd0] border-[#b07d3b] text-[#4a2e12] shadow-[#cbb68d]/50'
                  : 'bg-sky-950/80 border-sky-400 text-sky-200 shadow-sky-950/60'
              }`}
              title="Application Version: BP 1.0.0"
            >
              BP 1.0.0
            </div>
          </div>

          {/* Action Buttons on right */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={!canIssue}
              className={`px-4 py-1.5 rounded text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                canIssue
                  ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
              }`}
              title={canIssue ? 'Issue selected book' : 'પુસ્તક ઈશ્યુ કરવા સંચાલક તરીકે લૉગિન કરો'}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Issue Book</span>
            </button>
            <button
              type="button"
              onClick={onOpenIssueList}
              className="px-4 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <ListOrdered className="w-3.5 h-3.5 text-blue-300" />
              <span>Issue Book List</span>
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-1.5 border border-slate-600 hover:bg-slate-700 rounded text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 text-slate-300"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Clear Issue</span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};

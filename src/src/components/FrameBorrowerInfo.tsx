import React, { useState } from 'react';
import { Book, BorrowerRecord } from '../types';
import { UserCheck, BookOpenCheck, ListOrdered, Eraser, Calendar, Phone, MapPin, User } from 'lucide-react';

interface FrameBorrowerInfoProps {
  selectedBook: Book | null;
  onIssueBook: (borrowerData: Omit<BorrowerRecord, 'issueId' | 'status'>) => void;
  onOpenIssueList: () => void;
  languageMode: 'en' | 'gu' | 'both';
  totalIssuedCount: number;
}

export const FrameBorrowerInfo: React.FC<FrameBorrowerInfoProps> = ({
  selectedBook,
  onIssueBook,
  onOpenIssueList,
  languageMode,
  totalIssuedCount,
}) => {
  const [borrowerName, setBorrowerName] = useState('');
  const [address, setAddress] = useState('');
  const [mobile, setMobile] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [remark, setRemark] = useState('');

  const handleClear = () => {
    setBorrowerName('');
    setAddress('');
    setMobile('');
    setIssueDate(new Date().toISOString().slice(0, 10));
    setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setRemark('');
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
      issueDate,
      dueDate,
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
      className="bg-slate-800 text-white rounded shadow-lg p-4 border-t-2 border-indigo-500 my-3"
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

      <form onSubmit={handleIssueSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-3">
          
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
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Issue Date</label>
            <input
              id="txt_IssueDate"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-xs font-mono text-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          {/* Return Remark / Due Date */}
          <div className="col-span-1">
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Return Remark</label>
            <input
              id="txt_IssueRemark"
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-xs text-slate-200 outline-none focus:border-blue-500"
              placeholder="Due in 30 days"
            />
          </div>

        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-slate-700">
          <button
            type="submit"
            className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 rounded text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Issue Book</span>
          </button>
          <button
            type="button"
            onClick={onOpenIssueList}
            className="px-4 py-1.5 bg-slate-600 hover:bg-slate-500 rounded text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
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
      </form>
    </section>
  );
};

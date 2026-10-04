import React, { useState } from 'react';
import { BorrowerRecord, UserRole, AppUser } from '../types';
import {
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  BookCheck,
  Clock,
  Trash2,
  Printer,
  FileDown,
  LayoutGrid,
  Table as TableIcon,
  Phone,
  User,
  Calendar,
  Loader2,
} from 'lucide-react';
import { formatDateToDDMMYYYY, parseDate } from '../utils/dateUtils';
import { printIssueListA4, downloadIssueListPdf } from '../utils/issueListPrintPdf';

interface IssueListModalProps {
  isOpen: boolean;
  onClose: () => void;
  borrowers: BorrowerRecord[];
  onReturnBook: (issueId: string) => void;
  onDeleteIssue?: (issueId: string) => void;
  currentUser?: AppUser | null;
  currentUserRole?: UserRole;
}

export const IssueListModal: React.FC<IssueListModalProps> = ({
  isOpen,
  onClose,
  borrowers,
  onReturnBook,
  onDeleteIssue,
  currentUser,
  currentUserRole,
}) => {
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Issued' | 'Returned'>('All');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [permissionWarning, setPermissionWarning] = useState<string | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<'cards' | 'table'>('cards');

  if (!isOpen) return null;

  const roleLower = (currentUser?.role || currentUserRole || '').toLowerCase().trim();
  const userLower = (currentUser?.username || '').toLowerCase().trim();
  const canDelete =
    roleLower === 'admin' ||
    roleLower === 'super user' ||
    roleLower === 'superuser' ||
    userLower === 'admin' ||
    userLower === 'devdutt thaker';

  const filtered = borrowers.filter((b) => {
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    const query = filterText.toLowerCase();
    const matchesText =
      b.borrowerName.toLowerCase().includes(query) ||
      b.bookName.toLowerCase().includes(query) ||
      b.mobile.includes(query) ||
      b.bookId.includes(query) ||
      b.issueId.toLowerCase().includes(query);

    return matchesStatus && matchesText;
  });

  const handlePrint = () => {
    printIssueListA4(filtered, { status: statusFilter, search: filterText });
  };

  const handlePdfDownload = () => {
    downloadIssueListPdf(filtered, { status: statusFilter, search: filterText }, setIsPdfGenerating);
  };

  const getDaysKept = (issueDateStr?: string, returnDateStr?: string, status?: string): number => {
    const start = parseDate(issueDateStr);
    if (!start) return 0;
    const end = (status === 'Returned' && returnDateStr) ? parseDate(returnDateStr) || new Date() : new Date();
    const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return Math.max(0, Math.round((endMidnight - startMidnight) / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-[96vw] xl:max-w-7xl 2xl:max-w-[1440px] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        
        {/* Header */}
        <div className="bg-purple-900 text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <BookCheck className="w-6 h-6 text-purple-300 shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg font-bold leading-tight">
                Issue Book List (ઇશ્યૂ થયેલ પુસ્તકોની યાદી)
              </h3>
              <p className="text-[11px] sm:text-xs text-purple-200">
                Track borrowed books, due dates, and record returns
              </p>
            </div>
          </div>

          {/* Action buttons in header (Print, PDF, Close) */}
          <div className="flex items-center gap-2">
            {/* Print Button (A4) */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="A4 સાઈઝમાં પ્રિન્ટ કરો (Ctrl + P)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print (A4)</span>
            </button>

            {/* PDF Download Button */}
            <button
              type="button"
              onClick={handlePdfDownload}
              disabled={isPdfGenerating}
              className="px-2.5 sm:px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-400 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="PDF રિપોર્ટ ડાઉનલોડ કરો"
            >
              {isPdfGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{isPdfGenerating ? 'PDF...' : 'PDF'}</span>
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="text-purple-200 hover:text-white p-1.5 rounded-lg hover:bg-purple-800 transition-all cursor-pointer ml-1"
              title="બંધ કરો (Close)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Permission Warning Banner */}
        {permissionWarning && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs font-semibold text-amber-900 flex items-center justify-between animate-fadeIn shrink-0">
            <span>{permissionWarning}</span>
            <button
              onClick={() => setPermissionWarning(null)}
              className="text-amber-700 hover:text-amber-950 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-slate-100 p-3 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter by borrower, book, mobile, ID..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          {/* Status Tabs & Mobile View Switcher */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('All')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all cursor-pointer text-[11px] sm:text-xs ${
                  statusFilter === 'All' ? 'bg-purple-800 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300'
                }`}
              >
                All ({borrowers.length})
              </button>
              <button
                onClick={() => setStatusFilter('Issued')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all cursor-pointer text-[11px] sm:text-xs ${
                  statusFilter === 'Issued' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300'
                }`}
              >
                Active ({borrowers.filter((b) => b.status === 'Issued').length})
              </button>
              <button
                onClick={() => setStatusFilter('Returned')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all cursor-pointer text-[11px] sm:text-xs ${
                  statusFilter === 'Returned' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300'
                }`}
              >
                Returned ({borrowers.filter((b) => b.status === 'Returned').length})
              </button>
            </div>

            {/* Mobile View Toggle: Cards vs Table */}
            <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl text-xs font-semibold md:hidden">
              <button
                type="button"
                onClick={() => setMobileViewMode('cards')}
                className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] ${
                  mobileViewMode === 'cards' ? 'bg-purple-800 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300'
                }`}
                title="કાર્ડ વ્યુ (Mobile Friendly Cards)"
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode('table')}
                className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] ${
                  mobileViewMode === 'table' ? 'bg-purple-800 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300'
                }`}
                title="ટેબલ વ્યુ (Full Table)"
              >
                <TableIcon className="w-3 h-3" />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 bg-slate-50">
          
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500 italic bg-white rounded-xl border border-slate-200">
              કોઈ ઈશ્યુ રેકોર્ડ મળ્યો નથી (No borrower records found).
            </div>
          ) : (
            <>
              {/* 1. Mobile Cards View (Active by default on small screens) */}
              <div className={`${mobileViewMode === 'cards' ? 'block md:hidden' : 'hidden'} space-y-3`}>
                {filtered.map((b) => {
                  const dueDateObj = parseDate(b.dueDate);
                  const isOverdue = b.status === 'Issued' && !!dueDateObj && dueDateObj < new Date();

                  return (
                    <div
                      key={b.issueId}
                      className={`bg-white rounded-xl border p-3.5 shadow-xs transition-all ${
                        isOverdue
                          ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/20'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Top Row: Issue ID, Book info & Status badge */}
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                              {b.issueId}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                              #{b.bookId}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                            {b.bookName}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {b.status === 'Returned' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Returned
                            </span>
                          ) : isOverdue ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1 animate-pulse">
                              <AlertCircle className="w-3 h-3" />
                              Overdue
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Row: Borrower Details */}
                      <div className="grid grid-cols-2 gap-2 py-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div className="truncate">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Borrower</span>
                            <span className="font-semibold text-slate-800 truncate block">{b.borrowerName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Mobile</span>
                            <span className="font-mono text-slate-700 whitespace-nowrap">{b.mobile || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Dates Box - Clean horizontal layout, NEVER wrapped awkwardly */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 font-semibold block">ઇશ્યૂ તારીખ (Issue):</span>
                          <span className="font-mono font-bold text-slate-800 whitespace-nowrap text-xs">
                            {formatDateToDDMMYYYY(b.issueDate) || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-semibold block">પરત તારીખ (Due):</span>
                          <span className={`font-mono font-bold whitespace-nowrap text-xs ${
                            isOverdue ? 'text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200' : 'text-emerald-700'
                          }`}>
                            {formatDateToDDMMYYYY(b.dueDate) || '—'}
                          </span>
                        </div>
                        {b.returnDate && (
                          <div>
                            <span className="text-[10px] text-slate-500 font-semibold block">જમા તારીખ (Ret):</span>
                            <span className="font-mono font-bold text-emerald-700 whitespace-nowrap text-xs">
                              {formatDateToDDMMYYYY(b.returnDate)}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] text-slate-500 font-semibold block">દિવસ (Days):</span>
                          <span className="font-mono font-bold text-slate-800 whitespace-nowrap text-xs">
                            {getDaysKept(b.issueDate, b.returnDate, b.status)} દિવસ
                          </span>
                        </div>
                      </div>

                      {/* Actions Row */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
                        {b.status === 'Issued' ? (
                          <button
                            type="button"
                            onClick={() => onReturnBook(b.issueId)}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>પુસ્તક જમા કરો (Return)</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">પરત જમા થયેલ છે (Returned)</span>
                        )}

                        {/* Delete action for admin */}
                        {canDelete && (
                          confirmDeleteId === b.issueId ? (
                            <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 px-2 py-1 rounded-lg">
                              <span className="text-[10px] font-bold text-rose-700">Delete?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDeleteId(null);
                                  onDeleteIssue?.(b.issueId);
                                }}
                                className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                હા
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] cursor-pointer"
                              >
                                ના
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(b.issueId)}
                              className="p-1.5 rounded-lg text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 cursor-pointer transition-all"
                              title="Delete issue record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 2. Full Data Table (Visible on Desktop OR when Table View chosen on mobile) */}
              <div className={`${mobileViewMode === 'table' ? 'block' : 'hidden md:block'} overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs`}>
                <table className="min-w-[760px] w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-800 text-white font-bold select-none">
                    <tr>
                      <th className="py-2.5 px-2.5 w-16 text-center">Issue ID</th>
                      <th className="py-2.5 px-3 min-w-[170px]">Book (ID & Title)</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Borrower Name</th>
                      <th className="py-2.5 px-2.5 w-28">Mobile</th>
                      <th className="py-2.5 px-2.5 w-36 text-center">Issue / Due Date</th>
                      <th className="py-2.5 px-2 w-20 text-center">દિવસ (Days)</th>
                      <th className="py-2.5 px-2 w-24 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right w-36">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filtered.map((b) => {
                      const dueDateObj = parseDate(b.dueDate);
                      const isOverdue =
                        b.status === 'Issued' && !!dueDateObj && dueDateObj < new Date();

                      return (
                        <tr key={b.issueId} className="hover:bg-purple-50/50 transition-colors">
                          <td className="py-2 px-2.5 font-mono font-bold text-slate-700 text-center">
                            {b.issueId}
                          </td>
                          <td className="py-2 px-3 text-slate-900 font-semibold">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded mr-1 text-slate-600">
                              #{b.bookId}
                            </span>
                            {b.bookName}
                          </td>
                          <td className="py-2 px-3 text-slate-800 font-medium">
                            {b.borrowerName}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-slate-700 whitespace-nowrap">
                            {b.mobile || '—'}
                          </td>
                          <td className="py-2 px-2.5 text-slate-600 font-mono text-center">
                            <div className="whitespace-nowrap">
                              Iss: <span className="font-bold text-slate-800">{formatDateToDDMMYYYY(b.issueDate) || '—'}</span>
                            </div>
                            <div className={`whitespace-nowrap ${isOverdue ? 'text-rose-600 font-bold bg-rose-50 px-1 rounded' : ''}`}>
                              Due: <span>{formatDateToDDMMYYYY(b.dueDate) || '—'}</span>
                            </div>
                            {b.returnDate && (
                              <div className="text-[10px] text-emerald-700 font-semibold whitespace-nowrap">
                                Ret: {formatDateToDDMMYYYY(b.returnDate)}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap font-mono text-xs font-bold text-slate-800">
                            {getDaysKept(b.issueDate, b.returnDate, b.status)} દિવસ
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            {b.status === 'Returned' ? (
                              <span className="font-bold text-emerald-700 text-xs inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Returned
                              </span>
                            ) : isOverdue ? (
                              <span className="font-bold text-rose-600 text-xs inline-flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                                Overdue
                              </span>
                            ) : (
                              <span className="font-bold text-amber-700 text-xs inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Return Book button slot */}
                              {b.status === 'Issued' && (
                                <button
                                  type="button"
                                  onClick={() => onReturnBook(b.issueId)}
                                  className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-[11px] shadow-xs transition-all cursor-pointer whitespace-nowrap"
                                  title="પુસ્તક જમા કરો (Return Book)"
                                  id={`btn-return-issue-${b.issueId}`}
                                >
                                  Return Book
                                </button>
                              )}

                              {/* Delete button slot */}
                              <div className="shrink-0">
                                {confirmDeleteId === b.issueId ? (
                                  <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-lg shadow-xs">
                                    <span className="text-[11px] font-bold text-rose-700 whitespace-nowrap">ડીલીટ?</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteId(null);
                                        onDeleteIssue?.(b.issueId);
                                      }}
                                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer transition-all shadow-xs"
                                      title="હા, આ એન્ટ્રી ડિલીટ કરો"
                                      id={`confirm-yes-delete-${b.issueId}`}
                                    >
                                      હા
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteId(null);
                                      }}
                                      className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] cursor-pointer transition-all"
                                      title="રદ કરો"
                                      id={`confirm-no-delete-${b.issueId}`}
                                    >
                                      ના
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!canDelete) {
                                        setPermissionWarning(
                                          `⚠️ મનાઈ: એન્ટ્રી #${b.issueId} ડિલીટ કરવાની પરમિશન ફક્ત Admin પાસે છે.`
                                        );
                                        setTimeout(() => setPermissionWarning(null), 4000);
                                        return;
                                      }
                                      setConfirmDeleteId(b.issueId);
                                    }}
                                    className={`p-1.5 rounded-lg transition-all flex items-center justify-center ${
                                      canDelete
                                        ? 'text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 cursor-pointer shadow-2xs'
                                        : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-45'
                                    }`}
                                    title={
                                      canDelete
                                        ? `આ એન્ટ્રી ડિલીટ કરો (#${b.issueId})`
                                        : 'મનાઈ: ફક્ત Admin જ આ એન્ટ્રી ડિલીટ કરી શકે છે'
                                    }
                                    id={`btn-delete-issue-${b.issueId}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap justify-between items-center gap-3 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-3">
            <span>
              Total Records: <strong>{filtered.length}</strong> (કુલ {borrowers.length} માંથી)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Footer Print button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
              title="A4 પ્રિન્ટ કરો"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {/* Footer PDF button */}
            <button
              type="button"
              onClick={handlePdfDownload}
              disabled={isPdfGenerating}
              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 disabled:bg-rose-400 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
              title="PDF ડાઉનલોડ કરો"
            >
              {isPdfGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{isPdfGenerating ? 'PDF...' : 'PDF'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl cursor-pointer ml-1"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

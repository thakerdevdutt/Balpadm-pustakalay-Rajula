import React, { useState } from 'react';
import { BorrowerRecord, UserRole, AppUser } from '../types';
import { X, Search, CheckCircle2, AlertCircle, BookCheck, Clock, UserCheck, Trash2 } from 'lucide-react';

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

  if (!isOpen) return null;

  const roleLower = (currentUser?.role || currentUserRole || '').toLowerCase().trim();
  const userLower = (currentUser?.username || '').toLowerCase().trim();
  const canDelete = roleLower === 'admin' || roleLower === 'super user' || roleLower === 'superuser' || userLower === 'admin' || userLower === 'devdutt thaker';

  const filtered = borrowers.filter((b) => {
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    const query = filterText.toLowerCase();
    const matchesText =
      b.borrowerName.toLowerCase().includes(query) ||
      b.bookName.toLowerCase().includes(query) ||
      b.mobile.includes(query) ||
      b.bookId.includes(query);

    return matchesStatus && matchesText;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-purple-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BookCheck className="w-6 h-6 text-purple-300" />
            <div>
              <h3 className="text-lg font-bold">Issue Book List (ઇશ્યૂ થયેલ પુસ્તકોની યાદી)</h3>
              <p className="text-xs text-purple-200">
                Track borrowed books, due dates, and record returns
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-purple-200 hover:text-white p-1 rounded-lg hover:bg-purple-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission Warning Banner */}
        {permissionWarning && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs font-semibold text-amber-900 flex items-center justify-between animate-fadeIn">
            <span>{permissionWarning}</span>
            <button onClick={() => setPermissionWarning(null)} className="text-amber-700 hover:text-amber-950 p-1 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filter Controls */}
        <div className="bg-slate-100 p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter by borrower, book, mobile, ID..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setStatusFilter('All')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'All' ? 'bg-purple-800 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300'
              }`}
            >
              All ({borrowers.length})
            </button>
            <button
              onClick={() => setStatusFilter('Issued')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'Issued' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300'
              }`}
            >
              Active Issued ({borrowers.filter((b) => b.status === 'Issued').length})
            </button>
            <button
              onClick={() => setStatusFilter('Returned')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'Returned' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300'
              }`}
            >
              Returned ({borrowers.filter((b) => b.status === 'Returned').length})
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-50">
          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-800 text-white font-bold">
                <tr>
                  <th className="py-2.5 px-3">Issue ID</th>
                  <th className="py-2.5 px-3">Book (ID & Title)</th>
                  <th className="py-2.5 px-3">Borrower Name</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Issue / Due Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right w-48">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                      No borrower records found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((b) => {
                    const isOverdue =
                      b.status === 'Issued' && new Date(b.dueDate) < new Date();

                    return (
                      <tr key={b.issueId} className="hover:bg-purple-50/50 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-slate-700">
                          {b.issueId}
                        </td>
                        <td className="py-2 px-3 text-slate-900 font-semibold max-w-xs truncate">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded mr-1">
                            #{b.bookId}
                          </span>
                          {b.bookName}
                        </td>
                        <td className="py-2 px-3 text-slate-800 font-medium">
                          {b.borrowerName}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-700">
                          {b.mobile || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-mono">
                          <div>Iss: {b.issueDate}</div>
                          <div className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                            Due: {b.dueDate}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          {b.status === 'Returned' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Returned
                            </span>
                          ) : isOverdue ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Overdue
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Active Issued
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Return Book button slot */}
                            <div className="w-24 flex justify-end">
                              {b.status === 'Issued' && (
                                <button
                                  type="button"
                                  onClick={() => onReturnBook(b.issueId)}
                                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-[11px] shadow-xs transition-all cursor-pointer whitespace-nowrap"
                                  title="પુસ્તક જમા કરો (Return Book)"
                                  id={`btn-return-issue-${b.issueId}`}
                                >
                                  Return Book
                                </button>
                              )}
                            </div>

                            {/* Delete icon slot - ALWAYS strictly right-aligned with fixed width for 100% vertical alignment */}
                            <div className="w-28 flex justify-end shrink-0">
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
                                      setPermissionWarning(`⚠️ મનાઈ (Permission Denied): એન્ટ્રી #${b.issueId} ડિલીટ કરવાની પરમિશન ફક્ત Admin અને Super User પાસે છે.`);
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
                                      : 'મનાઈ: ફક્ત Admin અને Super User જ આ એન્ટ્રી ડિલીટ કરી શકે છે'
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex justify-between items-center text-xs text-slate-500">
          <span>Total Borrower Records: {filtered.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

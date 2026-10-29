import React, { useState } from 'react';
import { generateVBAUserFormCode, generateVBAModuleBackupPDFCode } from '../utils/vbaCodeGenerator';
import { X, Copy, Download, Check, Code2, FileCode, Terminal } from 'lucide-react';

interface VBACodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VBACodeModal: React.FC<VBACodeModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'frm' | 'bas_backup' | 'instructions'>('frm');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const userFormCode = generateVBAUserFormCode();
  const backupModuleCode = generateVBAModuleBackupPDFCode();

  const getActiveCode = () => {
    if (activeTab === 'frm') return userFormCode;
    if (activeTab === 'bas_backup') return backupModuleCode;
    return setupInstructions;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const code = getActiveCode();
    let ext = '.bas';
    let name = 'Module1.bas';
    if (activeTab === 'frm') {
      ext = '.frm';
      name = 'UserForm1.frm';
    } else if (activeTab === 'bas_backup') {
      ext = '.bas';
      name = 'mod_BackupPDF.bas';
    } else {
      ext = '.txt';
      name = 'Excel_VBA_Setup_Instructions.txt';
    }

    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="dark-modal bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Excel VBA Code Generator & Specifications</span>
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                  Production VBA
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Full source code for "My Book Collection.xlsm" & "Database.xlsx" system
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls & Copy / Download Buttons */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('frm')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'frm'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>UserForm1.frm</span>
            </button>

            <button
              onClick={() => setActiveTab('bas_backup')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'bas_backup'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>mod_BackupPDF.bas</span>
            </button>

            <button
              onClick={() => setActiveTab('instructions')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'instructions'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Setup Guide</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>

        </div>

        {/* Code View Area */}
        <div className="flex-1 p-4 bg-slate-950 overflow-auto font-mono text-xs text-slate-300 leading-relaxed select-all">
          <pre className="whitespace-pre-wrap">{getActiveCode()}</pre>
        </div>

      </div>
    </div>
  );
};

const setupInstructions = `
================================================================================
MY BOOK COLLECTION - EXCEL VBA DEPLOYMENT GUIDE
Author & Developer Contact: 7878413535 | thakerdevduttyuppai@gmail.com
================================================================================

1. FILE SYSTEM ARCHITECTURE:
--------------------------------------------------------------------------------
Place both files in the EXACT SAME directory:
- Folder: C:\\MyBookCollection\\
   |-- My Book Collection.xlsm (Frontend Workbook containing UserForm)
   |-- Database.xlsx           (Backend Sheet named "Database")

2. CREATING DATABASE.XLSX:
--------------------------------------------------------------------------------
Create a standard Excel workbook named "Database.xlsx" with a sheet named "Database".
Column Headers in Row 1:
A1: Book ID      B1: Book Name    C1: Author         D1: Category
E1: Edition      F1: Year         G1: Translator     H1: Language
I1: ISBN         J1: Publisher    K1: Book Type      L1: Rate
M1: Remarks1

Create a second sheet named "Borrowers":
A1: Issue ID     B1: Book ID      C1: Book Name      D1: Borrower Name
E1: Address      F1: Mobile       G1: Issue Date     H1: Due Date
I1: Status       J1: Return Date  K1: Remark

3. IMPORTING VBA MODULES INTO MY BOOK COLLECTION.XLSM:
--------------------------------------------------------------------------------
a. Open "My Book Collection.xlsm" in Excel.
b. Press ALT + F11 to open Visual Basic Editor.
c. Click Insert -> UserForm. Rename it to "UserForm1".
d. Right-click UserForm1 -> View Code -> Paste contents of UserForm1.frm.
e. Click Insert -> Module. Rename it to "mod_BackupPDF".
f. Paste contents of mod_BackupPDF.bas into mod_BackupPDF.
g. Double click "ThisWorkbook" in Project Explorer and add:

   Private Sub Workbook_Open()
       UserForm1.Show
   End Sub

4. GUJARATI UNICODE SUPPORT:
--------------------------------------------------------------------------------
To display Gujarati characters seamlessly in Excel UserForms:
- Set UserForm Control Fonts to "Shruti", "Nirmala UI", or "Arial Unicode MS".
- Windows language pack for Gujarati recommended for IME input typing.
`;

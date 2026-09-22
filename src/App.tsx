import React, { useState, useEffect, useCallback } from 'react';
import { Book, BorrowerRecord, MasterData, SearchCriterion, BackupItem, PDFExportItem, AppUser, AppTheme } from './types';
import { INITIAL_BOOKS, SAMPLE_BOOKS, INITIAL_BORROWERS, INITIAL_MASTERS, resolveBookCreatedBy } from './initialData';
import { exportDatabaseToExcel, parseExcelFile, parseGoogleSheetUrl, fixGarbledText, cleanBookTitle } from './utils/excelExport';

// Inlined file path helpers for local file links
function isMacSystem(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.platform || '';
  const userAgent = navigator.userAgent || '';
  return /Mac|iPhone|iPad|iPod/i.test(platform) || /Mac|iPhone|iPad|iPod/i.test(userAgent);
}

function getBookFileName(book: Book | null): string {
  if (!book || !book.bookName) return 'SampleBook.pdf';
  const rawTitle = book.bookName.trim();
  const ext = book.bookType?.toLowerCase().includes('epub') ? '.epub' : '.pdf';
  if (rawTitle.toLowerCase().endsWith('.pdf') || rawTitle.toLowerCase().endsWith('.epub')) {
    return rawTitle;
  }
  const bookIdStr = String(book.bookId || '').trim();
  if (bookIdStr) {
    const idPrefixRegex = new RegExp(`^${bookIdStr}[\\s\\-_.]+`, 'i');
    if (idPrefixRegex.test(rawTitle)) {
      return `${rawTitle}${ext}`;
    }
  }
  return `${book.bookId} - ${rawTitle}${ext}`;
}

function getWinPath(book: Book | null, localDirectory: string, wrapInQuotes: boolean = false): string {
  let normDir = (localDirectory || 'D:\\My Books\\My Books').trim().replace(/^["']+|["']+$/g, '');
  if (normDir.startsWith('/') || normDir.startsWith('~')) {
    normDir = 'D:\\My Books\\My Books';
  }
  normDir = normDir.replace(/[/\\]+$/, '');
  const fileName = getBookFileName(book);
  const fullPath = `${normDir}\\${fileName}`;
  return wrapInQuotes ? `"${fullPath}"` : fullPath;
}

function getMacPath(book: Book | null, localDirectory: string, wrapInQuotes: boolean = true, includeOpenCmd: boolean = true): string {
  let normDir = (localDirectory || '/Volumes/D-My Works/My Books/My Books').trim().replace(/^["']+|["']+$/g, '');
  if (/^[a-zA-Z]:/.test(normDir) || normDir.includes('\\')) {
    const driveMatch = normDir.match(/^([a-zA-Z]):/);
    if (driveMatch) {
      const driveLetter = driveMatch[1].toUpperCase();
      const driveMap: Record<string, string> = {
        'C': '/Volumes/C-Windows11',
        'D': '/Volumes/D-My Works',
        'E': '/Volumes/E-Backup',
        'F': '/Volumes/F-All in On',
        'G': '/Volumes/G-Movies',
      };
      const macVolume = driveMap[driveLetter] || `/Volumes/${driveLetter}-Drive`;
      const restOfPath = normDir.replace(/^[a-zA-Z]:/, '').replace(/\\/g, '/');
      normDir = `${macVolume}${restOfPath}`;
    } else {
      normDir = normDir.replace(/\\/g, '/');
    }
  }
  if (!normDir.startsWith('/') && !normDir.startsWith('~')) {
    normDir = `/Volumes/D-My Works/${normDir}`;
  }
  normDir = normDir.replace(/\/+$/, '');
  const fileName = getBookFileName(book);
  const fullPath = `${normDir}/${fileName}`;
  if (includeOpenCmd) return `open "${fullPath}"`;
  return wrapInQuotes ? `"${fullPath}"` : fullPath;
}

function getPCPath(book: Book | null, localDirectory: string, osType?: 'win' | 'mac', wrapInQuotes: boolean = true, includeOpenCmd: boolean = true): string {
  const targetOS = osType || (isMacSystem() ? 'mac' : 'win');
  if (targetOS === 'mac') {
    return getMacPath(book, localDirectory, wrapInQuotes, includeOpenCmd);
  } else {
    return getWinPath(book, localDirectory, wrapInQuotes);
  }
}
import {
  subscribeBooksFromFirestore,
  saveBookToFirestore,
  deleteBookFromFirestore,
  bulkSaveBooksToFirestore,
  subscribeMasterDataFromFirestore,
  saveMasterDataToFirestore,
  subscribeBorrowersFromFirestore,
  issueBookInFirestore,
  returnBookInFirestore,
  deleteBorrowerInFirestore,
  clearAllBooksInFirestore,
  subscribeUsersFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  setOnQuotaExceededListener
} from './firebase';

import { Header } from './components/Header';
import { FrameBookEntry } from './components/FrameBookEntry';
import { ActionButtons } from './components/ActionButtons';
import { FrameSearchList } from './components/FrameSearchList';
import { FrameBorrowerInfo } from './components/FrameBorrowerInfo';
import { MasterManagementModal } from './components/MasterManagementModal';
import { VBACodeModal } from './components/VBACodeModal';
import { IssueListModal } from './components/IssueListModal';
import { BackupFolderModal } from './components/BackupFolderModal';
import { LoginModal } from './components/LoginModal';
import { InstallAppModal } from './components/InstallAppModal';
import { PDFExportModal } from './components/PDFExportModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { CheckCircle2, Info, FileSpreadsheet, AlertTriangle, Trash2 } from 'lucide-react';

export default function App() {
  // Helper to sanitize any garbled UTF-8 strings and standardize creator name:
  // - Sr No 01 to 17 = Devdutt Thaker
  // - Sr No 18 to 107 = Jignesh Upadhyay
  // - Sr No 108 to 163 = Devdutt Thaker
  const sanitizeBook = (b: Book): Book => {
    return {
      ...b,
      bookName: cleanBookTitle(b.bookName || ''),
      author: fixGarbledText(b.author || ''),
      category: fixGarbledText(b.category || ''),
      translator: fixGarbledText(b.translator || ''),
      language: fixGarbledText(b.language || ''),
      publisher: fixGarbledText(b.publisher || ''),
      bookType: fixGarbledText(b.bookType || ''),
      remarks1: fixGarbledText(b.remarks1 || ''),
      createdBy: resolveBookCreatedBy(b.bookId, b.createdBy),
    };
  };

  // Key for local persistence - strictly for user's custom saved database
  const CURRENT_STORAGE_KEY = 'my_book_collection_user_books_v5000_clean';

  // Persistence state in localStorage - returns 0 if cleared, or user saved books
  const getAllLocalBooks = (): Book[] => {
    if (localStorage.getItem('my_book_collection_is_cleared') === 'true') {
      return [];
    }
    try {
      const raw = localStorage.getItem(CURRENT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(sanitizeBook);
        }
      }
    } catch (e) {
      console.error('Error recovering local books:', e);
    }
    return [];
  };

  const [books, setBooks] = useState<Book[]>(() => {
    return getAllLocalBooks();
  });

  const [borrowers, setBorrowers] = useState<BorrowerRecord[]>(() => {
    const saved = localStorage.getItem('my_book_collection_borrowers');
    return saved ? JSON.parse(saved) : INITIAL_BORROWERS;
  });

  const [masters, setMasters] = useState<MasterData>(() => {
    localStorage.removeItem('my_book_collection_masters');
    localStorage.removeItem('my_book_collection_masters_v2');
    localStorage.removeItem('my_book_collection_masters_v5');

    const saved = localStorage.getItem('my_book_collection_masters_v10');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            authors: Array.isArray(parsed.authors) ? parsed.authors : INITIAL_MASTERS.authors,
            categories: Array.isArray(parsed.categories) ? parsed.categories : INITIAL_MASTERS.categories,
            translators: Array.isArray(parsed.translators) ? parsed.translators : INITIAL_MASTERS.translators,
            languages: Array.isArray(parsed.languages) ? parsed.languages : INITIAL_MASTERS.languages,
            publishers: Array.isArray(parsed.publishers) ? parsed.publishers : INITIAL_MASTERS.publishers,
            bookTypes: Array.isArray(parsed.bookTypes) ? parsed.bookTypes : INITIAL_MASTERS.bookTypes,
          };
        }
      } catch (e) {
        console.error('Error parsing masters from localStorage:', e);
      }
    }
    
    localStorage.setItem('my_book_collection_masters_v10', JSON.stringify(INITIAL_MASTERS));
    return INITIAL_MASTERS;
  });

  const [backups, setBackups] = useState<BackupItem[]>(() => {
    const saved = localStorage.getItem('my_book_collection_backups');
    return saved ? JSON.parse(saved) : [];
  });

  const [pdfExports, setPdfExports] = useState<PDFExportItem[]>(() => {
    const saved = localStorage.getItem('my_book_collection_pdf_exports');
    return saved ? JSON.parse(saved) : [];
  });

  const [localDirectory, setLocalDirectory] = useState<string>(() => {
    const saved = localStorage.getItem('my_book_collection_local_dir');
    return saved || 'D:\\My Books\\My Books';
  });

  // Helper to preserve user roles assigned by Admin
  const sanitizeUserRole = (u: AppUser): AppUser => {
    if (!u) return u;
    const key = (u.username || u.id || '').toLowerCase().trim();
    if (key === 'admin' || key === 'devdutt thaker' || key === 'devduttthaker') {
      return { ...u, role: 'Admin' };
    }
    return u;
  };

  // User Authentication & Role State
  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    const saved = localStorage.getItem('my_book_collection_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return sanitizeUserRole(parsed);
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
    return {
      id: 'admin_user',
      username: 'admin',
      name: 'Devdutt Thaker (Admin)',
      role: 'Admin',
    };
  });

  const [allUsers, setAllUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('my_book_collection_all_users');
    if (saved) {
      try {
        const parsed: AppUser[] = JSON.parse(saved);
        return parsed.map(sanitizeUserRole);
      } catch (e) {
        console.error('Error parsing saved users:', e);
      }
    }
    return [];
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('my_book_collection_user');
    return !saved; // Open Login Modal automatically on any new PC or browser session!
  });

  // UI state
  const [languageMode, setLanguageMode] = useState<'en' | 'gu' | 'both'>('both');
  const [searchCriterion, setSearchCriterion] = useState<SearchCriterion>('Author');
  const [searchValue, setSearchValue] = useState<string>('');
  const [selectedBookForIssue, setSelectedBookForIssue] = useState<Book | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Theme state (light / sepia / dark mode toggle)
  const [theme, setTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('my_book_collection_theme');
    return (saved === 'light' || saved === 'sepia' || saved === 'dark') ? (saved as AppTheme) : 'dark';
  });

  const handleSelectTheme = (newTheme: AppTheme) => {
    setTheme(newTheme);
    localStorage.setItem('my_book_collection_theme', newTheme);
  };

  const handleToggleTheme = () => {
    const themeCycle: Partial<Record<AppTheme, AppTheme>> = {
      light: 'sepia',
      sepia: 'dark',
      dark: 'light',
    };
    const nextTheme = themeCycle[theme] || 'dark';
    handleSelectTheme(nextTheme);
  };

  // Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync user state to localStorage and update default createdBy operator name
  useEffect(() => {
    if (currentUser && currentUser.name) {
      localStorage.setItem('my_book_collection_user', JSON.stringify(currentUser));
      setFormData((prev) => {
        if (!isEditing || !prev.createdBy || prev.createdBy === 'Admin') {
          return { ...prev, createdBy: currentUser.name };
        }
        return prev;
      });
    }
  }, [currentUser, isEditing]);

  // Quota exceeded notification state (remember dismissal for current session)
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    setOnQuotaExceededListener(() => {
      if (sessionStorage.getItem('my_book_collection_dismiss_quota') !== 'true') {
        setQuotaExceeded(true);
      }
    });
  }, []);

  const handleDismissQuota = () => {
    sessionStorage.setItem('my_book_collection_dismiss_quota', 'true');
    setQuotaExceeded(false);
  };

  // Modal States
  const [isVBAModalOpen, setIsVBAModalOpen] = useState(false);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [isIssueListOpen, setIsIssueListOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [bookToDeleteId, setBookToDeleteId] = useState<string | null>(null);
  const [pdfModalOrientation, setPdfModalOrientation] = useState<'Landscape' | 'Portrait' | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Pending Excel Import Data for Append / Replace Dialog
  const [pendingExcelData, setPendingExcelData] = useState<{
    fileName: string;
    parsedBooks: Book[];
    parsedBorrowers: BorrowerRecord[];
  } | null>(null);

  // Clear Database Confirmation Dialog State
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearingInProgress, setIsClearingInProgress] = useState(false);

  // Capture PWA beforeinstallprompt event on mobile and PC
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          showToast('✅ બાલપદ્મ પુસ્તકાલય - રાજુલા સફળતાપૂર્વક ઇન્સ્ટોલ થઈ ગયું!');
        }
        setDeferredPrompt(null);
        setIsInstallModalOpen(false);
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    }
  };

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('my_book_collection_local_dir', localDirectory);
  }, [localDirectory]);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(books));
    } catch (e) {
      console.error('Error saving books to localStorage:', e);
    }
  }, [books]);

  useEffect(() => {
    localStorage.setItem('my_book_collection_borrowers', JSON.stringify(borrowers));
  }, [borrowers]);

  useEffect(() => {
    localStorage.setItem('my_book_collection_masters_v10', JSON.stringify(masters));
    localStorage.setItem('my_book_collection_masters', JSON.stringify(masters));
  }, [masters]);

  useEffect(() => {
    localStorage.setItem('my_book_collection_backups', JSON.stringify(backups));
  }, [backups]);

  useEffect(() => {
    localStorage.setItem('my_book_collection_pdf_exports', JSON.stringify(pdfExports));
  }, [pdfExports]);

  useEffect(() => {
    localStorage.setItem('my_book_collection_all_users', JSON.stringify(allUsers));
  }, [allUsers]);

  // Keep logged in user's role synchronized in real-time and sanitize non-admin roles
  useEffect(() => {
    if (currentUser && currentUser.id && currentUser.id !== 'guest_user') {
      const sanitized = sanitizeUserRole(currentUser);
      if (sanitized.role !== currentUser.role) {
        setCurrentUser(sanitized);
        localStorage.setItem('my_book_collection_user', JSON.stringify(sanitized));
      } else {
        const match = allUsers.find((u) => u.id === currentUser.id || u.username === currentUser.username);
        if (match && match.role !== currentUser.role) {
          const updated = { ...currentUser, role: match.role };
          setCurrentUser(updated);
          localStorage.setItem('my_book_collection_user', JSON.stringify(updated));
        }
      }
    }
  }, [allUsers, currentUser]);

  // Real-time Firestore synchronization
  useEffect(() => {
    const unsubBooks = subscribeBooksFromFirestore((cloudBooks) => {
      // If user has explicitly cleared the database, maintain 0 books until user imports or adds new books
      if (localStorage.getItem('my_book_collection_is_cleared') === 'true') {
        setBooks([]);
        return;
      }

      const localBooks = getAllLocalBooks();
      let merged: Book[] = [];

      if (Array.isArray(cloudBooks) && cloudBooks.length > 0) {
        localStorage.removeItem('my_book_collection_is_cleared');
        const bookMap = new Map<string, Book>();

        localBooks.forEach((b) => {
          if (b && b.bookId) {
            bookMap.set(String(b.bookId), sanitizeBook(b));
          }
        });

        cloudBooks.forEach((b) => {
          if (b && b.bookId) {
            bookMap.set(String(b.bookId), sanitizeBook(b));
          }
        });

        merged = Array.from(bookMap.values());
        localStorage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(merged));
      } else {
        merged = localBooks.map(sanitizeBook);
      }

      setBooks(sortBooksIndependently(merged));
    });

    const unsubMasters = subscribeMasterDataFromFirestore((cloudMasters) => {
      if (cloudMasters && typeof cloudMasters === 'object') {
        setMasters(cloudMasters);
      } else {
        setMasters(INITIAL_MASTERS);
      }
    });

    const unsubBorrowers = subscribeBorrowersFromFirestore((cloudBorrowers) => {
      if (cloudBorrowers && Array.isArray(cloudBorrowers)) {
        setBorrowers(cloudBorrowers);
      }
    });

    const unsubUsers = subscribeUsersFromFirestore((cloudUsers) => {
      if (cloudUsers && Array.isArray(cloudUsers)) {
        const userMap = new Map<string, AppUser>();
        const defaultAdmin: AppUser = {
          id: 'admin',
          username: 'admin',
          name: 'Devdutt Thaker',
          role: 'Admin',
          password: 'Malvee@0911',
          secondaryPassword: '0911',
        };
        userMap.set('admin', defaultAdmin);

        // Populate cloud users from Firestore (source of truth)
        cloudUsers.forEach((u) => {
          if (u && (u.id || u.username) && u.id !== 'guest_user') {
            const key = (u.username || u.id).toLowerCase();
            const validPass = (u.password && u.password.trim() !== '') ? u.password.trim() : '1234';

            if (key === 'admin') {
              userMap.set('admin', { ...defaultAdmin, ...u, role: 'Admin', password: u.password || defaultAdmin.password });
            } else {
              const sanitized = {
                ...sanitizeUserRole(u),
                password: validPass
              };
              userMap.set(key, sanitized);
            }
          }
        });

        const finalUsers = Array.from(userMap.values());
        setAllUsers(finalUsers);
        localStorage.setItem('my_book_collection_all_users', JSON.stringify(finalUsers));
      }
    });

    return () => {
      unsubBooks();
      unsubMasters();
      unsubBorrowers();
      unsubUsers();
    };
  }, []);

  // Generate Next Sequential Book ID
  const generateNextBookID = useCallback((currentBooks: Book[]): string => {
    if (!Array.isArray(currentBooks) || currentBooks.length === 0) return '1';
    const numericIds = currentBooks
      .filter((b) => b && typeof b === 'object' && b.bookId)
      .map((b) => parseInt(String(b.bookId).replace(/\D/g, ''), 10))
      .filter((num) => !isNaN(num));

    if (numericIds.length === 0) return '1';
    const maxId = Math.max(...numericIds);
    return String(maxId + 1);
  }, []);

  // Frame 1 Form State
  const [formData, setFormData] = useState<Book>({
    bookId: generateNextBookID(books),
    bookName: '',
    author: '',
    category: '',
    edition: '',
    yearPublished: '',
    translator: '',
    language: '',
    isbn: '',
    publisher: '',
    bookType: '',
    rate: '',
    remarks1: '',
  });

  // Keep form Book ID synchronized to next ID when creating new entries
  useEffect(() => {
    if (!isEditing) {
      const nextId = generateNextBookID(books);
      setFormData((prev) => {
        if (prev.bookId !== nextId) {
          return { ...prev, bookId: nextId };
        }
        return prev;
      });
    }
  }, [books, isEditing, generateNextBookID]);

  // 1. BTN_Reset Action
  const handleReset = useCallback((targetBooks?: Book[]) => {
    const booksToUse = Array.isArray(targetBooks) ? targetBooks : (Array.isArray(books) ? books : []);
    const nextId = generateNextBookID(booksToUse);
    setFormData({
      bookId: nextId,
      bookName: '',
      author: '',
      category: '',
      edition: '',
      yearPublished: '',
      translator: '',
      language: '',
      isbn: '',
      publisher: '',
      bookType: '',
      rate: '',
      remarks1: '',
      createdBy: currentUser?.name || 'Devdutt Thaker',
    });
    setIsEditing(false);
    setSelectedBookForIssue(null);

    // Set focus back to txt_BookName as required by specs
    setTimeout(() => {
      const el = document.getElementById('txt_BookName');
      if (el) el.focus();
    }, 50);
  }, [books, generateNextBookID, currentUser]);

  // Independent Sorting Function: Column A (BookID) and Column D (Category) as specified
  const sortBooksIndependently = (arr: Book[]): Book[] => {
    if (!Array.isArray(arr)) return [];
    return [...arr].sort((a, b) => {
      if (!a || !b) return 0;
      // Primary sort: Book ID numeric
      const idA = parseInt(String(a.bookId || '').replace(/\D/g, ''), 10) || 0;
      const idB = parseInt(String(b.bookId || '').replace(/\D/g, ''), 10) || 0;
      if (idA !== idB) return idA - idB;

      // Secondary sort: Category / Column D
      return (a.category || '').localeCompare(b.category || '');
    });
  };

  // 2. BTN_Save_Update_Click Action
  const handleSaveUpdate = () => {
    if (currentUser?.role === 'User') {
      alert('⚠️ મનાઈ (Permission Denied): ફક્ત Admin અને Super User ને જ પુસ્તકો ઉમેરવા અને સુધારવા (Save/Update) ની પરમિશન છે.');
      return;
    }

    if (!formData.bookName.trim()) {
      alert('Please enter Book Name! (મહેરબાની કરીને પુસ્તકનું નામ દાખલ કરો!)');
      const el = document.getElementById('txt_BookName');
      if (el) el.focus();
      return;
    }

    const rawCreator = formData.createdBy?.trim() || currentUser?.name || 'Devdutt Thaker';
    const recordToSave: Book = {
      ...formData,
      createdBy: resolveBookCreatedBy(formData.bookId, rawCreator, currentUser?.name),
    };

    // Auto-add newly entered master options (e.g. Author, Category, Publisher, Language, Translator, BookType)
    let newMasters = { ...masters };
    let masterChanged = false;

    const checkAndAddMaster = (key: keyof MasterData, value: string) => {
      const val = value.trim();
      if (val && !newMasters[key].includes(val)) {
        newMasters[key] = [...newMasters[key], val];
        masterChanged = true;
      }
    };

    checkAndAddMaster('authors', recordToSave.author);
    checkAndAddMaster('translators', recordToSave.author);
    checkAndAddMaster('categories', recordToSave.category);
    checkAndAddMaster('publishers', recordToSave.publisher);
    checkAndAddMaster('translators', recordToSave.translator);
    checkAndAddMaster('authors', recordToSave.translator);
    checkAndAddMaster('languages', recordToSave.language);
    checkAndAddMaster('bookTypes', recordToSave.bookType);

    if (masterChanged) {
      setMasters(newMasters);
      localStorage.setItem('my_book_collection_masters_v10', JSON.stringify(newMasters));
      saveMasterDataToFirestore(newMasters).catch((err) => console.warn('Firestore save masters error:', err));
    }

    let updatedBooks: Book[] = [];
    const exists = books.some((b) => b.bookId === recordToSave.bookId);

    if (exists) {
      // Update existing record
      updatedBooks = books.map((b) => (b.bookId === recordToSave.bookId ? { ...recordToSave } : b));
      showToast(`Record #${recordToSave.bookId} updated successfully! (Entry By: ${recordToSave.createdBy})`);
    } else {
      // Append new record
      updatedBooks = [...books, { ...recordToSave }];
      showToast(`New book #${recordToSave.bookId} saved successfully! (Entry By: ${recordToSave.createdBy})`);
    }

    // Save book to Firestore collection
    saveBookToFirestore(recordToSave).catch((err) => console.warn('Firestore save book error:', err));

    // Perform independent sorting on Column A and Column D as per specification
    const sorted = sortBooksIndependently(updatedBooks);
    setBooks(sorted);

    // Clear search filter so saved/updated book is immediately visible in live list
    setSearchValue('');

    // Auto-Save simulation and reset form with next sequential ID
    handleReset(sorted);
  };

  // 3. Select Book from ListBox1
  const handleSelectBook = (book: Book, shouldScrollToForm = false) => {
    setFormData({
      ...book,
      createdBy: resolveBookCreatedBy(book.bookId, book.createdBy),
    });
    setIsEditing(true);
    setSelectedBookForIssue(book);
    if (shouldScrollToForm) {
      const bookNameInput = document.getElementById('txt_BookName') as HTMLInputElement;
      if (bookNameInput) {
        bookNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          bookNameInput.focus();
        }, 150);
      }

      // Automatically copy local PC file path to clipboard on double-click
      const pcPath = getPCPath(book, localDirectory);

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pcPath).then(
          () => {
            showToast(`પુસ્તક #${book.bookId} ઓપન થયું + PC પાથ કોપી થઈ ગયો! (${pcPath})`);
          },
          () => {
            showToast(`પુસ્તક #${book.bookId} (${book.bookName}) એડિટ કરવા માટે ફોર્મમાં ઓપન થયું!`);
          }
        );
      } else {
        showToast(`પુસ્તક #${book.bookId} (${book.bookName}) એડિટ કરવા માટે ફોર્મમાં ઓપન થયું!`);
      }
    }
  };

  // 4. Delete Book Record
  const handleDeleteBook = (bookId: string) => {
    if (currentUser?.role !== 'Admin') {
      showToast('⚠️ મનાઈ (Permission Denied): લાઈબ્રેરીમાંથી પુસ્તકો Delete કરવાનો અધિકાર ફક્ત મુખ્ય Admin (Devdutt Thaker) પાસે જ છે.');
      return;
    }
    setBookToDeleteId(bookId);
  };

  const handleConfirmDeleteBook = () => {
    if (!bookToDeleteId) return;
    const targetId = bookToDeleteId;
    const remaining = books.filter((b) => b.bookId !== targetId);
    setBooks(remaining);
    deleteBookFromFirestore(targetId).catch((err) => console.warn('Firestore delete book error:', err));
    handleReset(remaining);
    showToast(`🗑️ Book ID #${targetId} સફળતાપૂર્વક ડિલીટ કરવામાં આવ્યું.`);
    setBookToDeleteId(null);
  };

  const handleMaster = () => {
    if (currentUser?.role === 'User') {
      alert('⚠️ મનાઈ (Permission Denied): માસ્ટર ડેટા મેનેજ કરવા Admin અથવા Super User Rights હોવા જરૂરી છે.');
      return;
    }
    setIsMasterModalOpen(true);
  };

  // 5. BTN_PDF_Landscape
  const handlePDFLandscape = () => {
    if (currentUser?.role === 'User') {
      alert('⚠️ મનાઈ (Permission Denied): PDF Export કરવાનો અધિકાર ફક્ત Admin અને Super User પાસે છે.');
      return;
    }
    setPdfModalOrientation('Landscape');
  };

  // 6. BTN_PDF_Portrait
  const handlePDFPortrait = () => {
    if (currentUser?.role === 'User') {
      alert('⚠️ મનાઈ (Permission Denied): PDF Export કરવાનો અધિકાર ફક્ત Admin અને Super User પાસે છે.');
      return;
    }
    setPdfModalOrientation('Portrait');
  };

  // 7. BTN_Backup Action (FSO Backup simulation)
  const handleTriggerBackup = () => {
    if (currentUser?.role !== 'Admin') {
      alert('⚠️ મનાઈ (Permission Denied): બેકઅપ ફોલ્ડર ક્રિએટ કરવાનો અધિકાર ફક્ત મુખ્ય Admin પાસે છે.');
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const newBackup: BackupItem = {
      id: 'BK-' + Date.now(),
      timestamp: new Date().toLocaleString(),
      fileName: `My_Book_Collection_Backup_${timestamp}.xlsm`,
      bookCount: books.length,
      borrowerCount: borrowers.length,
      fileSize: '1.2 MB',
    };

    setBackups((prev) => [newBackup, ...prev]);
    showToast(`Automated FSO Backup created in \\Backups\\ folder: ${newBackup.fileName}`);
    setIsBackupModalOpen(true);
  };

  // 7.1 Export All-In-One JSON Database Backup (Books + Masters + Borrowers + Settings)
  const handleExportJSON = () => {
    if (currentUser?.role !== 'Admin') {
      alert('⚠️ મનાઈ (Permission Denied): ડેટાબેઝ ઓલ-ઇન-વન બેકઅપ ડાઉનલોડ કરવાની પરમિશન ફક્ત મુખ્ય Admin પાસે છે.');
      return;
    }
    const data = {
      appName: 'My Book Collection',
      version: '4.2',
      exportDate: new Date().toISOString(),
      summary: {
        totalBooks: books.length,
        totalBorrowers: borrowers.length,
        totalMasters: {
          authors: masters.authors?.length || 0,
          categories: masters.categories?.length || 0,
          translators: masters.translators?.length || 0,
          languages: masters.languages?.length || 0,
          publishers: masters.publishers?.length || 0,
          bookTypes: masters.bookTypes?.length || 0,
        },
      },
      books,
      masters,
      borrowers,
      localDirectory,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Full_Library_Backup_AllInOne_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`ઓલ-ઇન-વન બેકઅપ ડાઉનલોડ થયો! (${books.length} Books, Masters & Borrowers)`);
  };

  // 7.2 Import All-In-One JSON Database Backup
  const handleImportJSON = (file: File) => {
    if (currentUser?.role !== 'Admin') {
      alert('⚠️ મનાઈ (Permission Denied): ડેટા Restore કરવાનો અધિકાર ફક્ત મુખ્ય Admin પાસે છે.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed) {
          alert('અમાન્ય બેકઅપ ફાઈલ.');
          return;
        }

        let restoredBooksCount = 0;
        let restoredBorrowersCount = 0;
        let restoredMastersMsg = '';
        let cleanBooksToSave: Book[] = [];

        // 1. Restore Books
        if (Array.isArray(parsed.books)) {
          cleanBooksToSave = parsed.books.map(sanitizeBook);
        } else if (Array.isArray(parsed)) {
          cleanBooksToSave = parsed.map(sanitizeBook);
        }

        if (cleanBooksToSave.length > 0) {
          const sorted = sortBooksIndependently(cleanBooksToSave);
          setBooks(sorted);
          restoredBooksCount = sorted.length;
          localStorage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(sorted));
          // Save all restored books to Firestore database immediately
          bulkSaveBooksToFirestore(sorted).catch((err) => console.warn('Firestore bulkSave error:', err));
        }

        // 2. Restore Masters
        if (parsed.masters && typeof parsed.masters === 'object') {
          const m = parsed.masters;
          const updatedMasters: MasterData = {
            authors: Array.isArray(m.authors) ? m.authors : INITIAL_MASTERS.authors,
            categories: Array.isArray(m.categories) ? m.categories : INITIAL_MASTERS.categories,
            translators: Array.isArray(m.translators) ? m.translators : INITIAL_MASTERS.translators,
            languages: Array.isArray(m.languages) ? m.languages : INITIAL_MASTERS.languages,
            publishers: Array.isArray(m.publishers) ? m.publishers : INITIAL_MASTERS.publishers,
            bookTypes: Array.isArray(m.bookTypes) ? m.bookTypes : INITIAL_MASTERS.bookTypes,
          };
          setMasters(updatedMasters);
          localStorage.setItem('my_book_collection_masters_v10', JSON.stringify(updatedMasters));
          saveMasterDataToFirestore(updatedMasters).catch((err) => console.warn('Firestore save masters error:', err));
          restoredMastersMsg = `, Masters`;
        }

        // 3. Restore Borrowers & Issues
        if (Array.isArray(parsed.borrowers)) {
          setBorrowers(parsed.borrowers);
          localStorage.setItem('my_book_collection_borrowers', JSON.stringify(parsed.borrowers));
          restoredBorrowersCount = parsed.borrowers.length;
        }

        // 4. Restore local directory if present
        if (parsed.localDirectory && typeof parsed.localDirectory === 'string') {
          setLocalDirectory(parsed.localDirectory);
          localStorage.setItem('my_book_collection_local_dir', parsed.localDirectory);
        }

        showToast(
          `સંપૂર્ણ Restore સફળ! (${restoredBooksCount} પુસ્તકો${restoredMastersMsg}, ${restoredBorrowersCount} ઇશ્યૂ રેકોર્ડ્સ)`
        );
      } catch (err) {
        console.error(err);
        alert('બેકઅપ ફાઈલ ઓપન કરવામાં ભૂલ આવી.');
      }
    };
    reader.readAsText(file);
  };

  // 7.3 Load Sample Literary Books Option
  const handleRestoreDefaultBooks = () => {
    if (currentUser?.role !== 'Admin') {
      alert('⚠️ મનાઈ (Permission Denied): Sample Books લોડ કરવાનો અધિકાર ફક્ત મુખ્ય Admin પાસે છે.');
      return;
    }
    const cleanDefault = SAMPLE_BOOKS.map(sanitizeBook);
    setBooks(cleanDefault);
    bulkSaveBooksToFirestore(cleanDefault).catch((err) => console.warn('Firestore bulk save sample books:', err));
    showToast(`૧૦૦ નમૂનાના સાહિત્યિક પુસ્તકો લોડ થયા છે (${cleanDefault.length} Sample Books)`);
  };

  const handleOpenBackups = () => {
    if (currentUser?.role !== 'Admin') {
      alert('⚠️ મનાઈ (Permission Denied): બેકઅપ ફોલ્ડર અને લોગ્સ જોવાનો અધિકાર ફક્ત મુખ્ય Admin પાસે છે.');
      return;
    }
    setIsBackupModalOpen(true);
  };

  // 8. Issue Book Handler
  const handleIssueBook = async (borrowerData: Omit<BorrowerRecord, 'issueId' | 'status'>) => {
    if (currentUser?.role === 'User') {
      alert('⚠️ મનાઈ (Permission Denied): પુસ્તક ઇશ્યૂ કરવાની પરમિશન ફક્ત Admin અને Super User પાસે છે.');
      return;
    }

    const issueId = 'ISS-' + String(borrowers.length + 101).padStart(3, '0');
    const newRecord: BorrowerRecord = {
      ...borrowerData,
      issueId,
      status: 'Issued',
    };

    setBorrowers((prev) => [newRecord, ...prev]);
    setBooks((prev) =>
      prev.map((b) =>
        b.bookId === borrowerData.bookId
          ? {
              ...b,
              isIssued: true,
              currentBorrowerName: borrowerData.borrowerName,
              currentIssueDueDate: borrowerData.dueDate,
            }
          : b
      )
    );

    try {
      await issueBookInFirestore(newRecord);
    } catch (err) {
      console.warn('Firestore issueBook error:', err);
    }

    showToast(`Book #${borrowerData.bookId} issued to ${borrowerData.borrowerName} (${issueId})`);
  };

  // 9. Return Book Handler
  const handleReturnBook = async (issueId: string) => {
    if (currentUser?.role === 'User') {
      alert('⚠️ મનાઈ (Permission Denied): પુસ્તક જમા (Return) કરવાની પરમિશન ફક્ત Admin અને Super User પાસે છે.');
      return;
    }

    const targetBorrower = borrowers.find((b) => b.issueId === issueId);
    setBorrowers((prev) =>
      prev.map((b) =>
        b.issueId === issueId
          ? { ...b, status: 'Returned', returnDate: new Date().toISOString().slice(0, 10) }
          : b
      )
    );

    if (targetBorrower) {
      setBooks((prev) =>
        prev.map((b) =>
          b.bookId === targetBorrower.bookId
            ? { ...b, isIssued: false, currentBorrowerName: '', currentIssueDueDate: '' }
            : b
        )
      );
    }

    try {
      await returnBookInFirestore(issueId, targetBorrower?.bookId);
    } catch (err) {
      console.warn('Firestore returnBook error:', err);
    }

    showToast(`Book return recorded for Issue ID #${issueId}`);
  };

  // 9.1 Delete Borrower Record Handler (Admin & Super User only)
  const handleDeleteBorrowerRecord = async (issueId: string) => {
    const roleLower = (currentUser?.role || '').toLowerCase().trim();
    const userLower = (currentUser?.username || '').toLowerCase().trim();
    const isAllowed = roleLower === 'admin' || roleLower === 'super user' || roleLower === 'superuser' || userLower === 'admin' || userLower === 'devdutt thaker';
    if (!isAllowed) {
      alert('⚠️ મનાઈ (Permission Denied): આ એન્ટ્રી ડિલીટ કરવાની પરમિશન ફક્ત Admin અને Super User પાસે જ છે. User આ એન્ટ્રી ડિલીટ કરી શકતા નથી.');
      return;
    }

    const targetBorrower = borrowers.find((b) => b.issueId === issueId);
    if (!targetBorrower) return;

    const wasIssued = targetBorrower.status === 'Issued';
    const bookId = targetBorrower.bookId;

    // Remove from local borrowers state and localStorage
    setBorrowers((prev) => {
      const updated = prev.filter((b) => b.issueId !== issueId);
      localStorage.setItem('my_book_collection_borrowers', JSON.stringify(updated));
      return updated;
    });

    // If the book was currently issued under this record, release it back to available
    if (wasIssued && bookId) {
      setBooks((prev) => {
        const updated = prev.map((b) =>
          b.bookId === bookId
            ? { ...b, isIssued: false, currentBorrowerName: '', currentIssueDueDate: '' }
            : b
        );
        localStorage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }

    try {
      await deleteBorrowerInFirestore(issueId, bookId, wasIssued);
    } catch (err) {
      console.warn('Firestore deleteBorrower error:', err);
    }

    showToast(`🗑️ Issue એન્ટ્રી #${issueId} (${targetBorrower.borrowerName}) ડિલીટ થઈ ગઈ છે.`);
  };

  // 10. Export Excel Database file
  const handleExportDatabaseExcel = () => {
    if (currentUser?.role === 'User') {
      alert('⚠️ મનાઈ (Permission Denied): Excel Export ડાઉનલોડ કરવાનો અધિકાર ફક્ત Admin અને Super User પાસે છે.');
      return;
    }
    exportDatabaseToExcel(books, borrowers, currentUser?.role === 'Admin');
    showToast('Database.xlsx ફાઈલ સફળતાપૂર્વક ડાઉનલોડ થઈ ગઈ છે.');
  };

  // Synchronize new master options from imported books
  const syncMastersFromNewBooks = (newBooks: Book[]) => {
    let newMasters = { ...masters };
    let changed = false;

    const addUnique = (key: keyof MasterData, val: string | undefined) => {
      const trimmed = (val || '').trim();
      if (trimmed && !newMasters[key].includes(trimmed)) {
        newMasters[key] = [...newMasters[key], trimmed];
        changed = true;
      }
    };

    newBooks.forEach((b) => {
      addUnique('authors', b.author);
      addUnique('categories', b.category);
      addUnique('publishers', b.publisher);
      addUnique('translators', b.translator);
      addUnique('languages', b.language);
      addUnique('bookTypes', b.bookType);
    });

    if (changed) {
      setMasters(newMasters);
      localStorage.setItem('my_book_collection_masters_v10', JSON.stringify(newMasters));
      saveMasterDataToFirestore(newMasters).catch((err) => console.warn('Firestore save masters error:', err));
    }
  };

  // 10.1 Fresh Import (when database is empty, or when user chooses Replace)
  const handleExecuteFreshImport = (importedBooks: Book[], importedBorrowers: BorrowerRecord[], fileName: string) => {
    localStorage.removeItem('my_book_collection_is_cleared');
    let autoId = 1;
    const sanitizedBooks = importedBooks.map((b) => {
      const sanitized = sanitizeBook(b);
      const cleanId = (sanitized.bookId || '').trim();
      return {
        ...sanitized,
        bookId: cleanId ? cleanId : String(autoId++),
      };
    });
    const sorted = sortBooksIndependently(sanitizedBooks);
    setBooks(sorted);
    localStorage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(sorted));
    bulkSaveBooksToFirestore(sorted).catch((err) => console.warn('Firestore import Excel error:', err));
    syncMastersFromNewBooks(sorted);

    if (importedBorrowers && importedBorrowers.length > 0) {
      setBorrowers(importedBorrowers);
      localStorage.setItem('my_book_collection_borrowers', JSON.stringify(importedBorrowers));
    }

    setSearchValue('');
    handleReset(sorted);
    showToast(`✅ સફળતાપૂર્વક ${sorted.length} પુસ્તકોનો નવો ડેટાબેઝ ઈમ્પોર્ટ થયો! (${fileName})`);
  };

  // 10.2 Append Import: Arranges imported books BELOW existing data with sequential IDs
  const handleExecuteAppendImport = (importedBooks: Book[], importedBorrowers: BorrowerRecord[], fileName: string) => {
    localStorage.removeItem('my_book_collection_is_cleared');

    // Find highest numeric ID in existing books
    const maxExistingId = books.reduce((max, b) => {
      const num = parseInt(String(b.bookId || '').replace(/\D/g, ''), 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);

    let nextSeqId = maxExistingId + 1;
    const newBooksFormatted = importedBooks.map((rawB) => {
      const sanitized = sanitizeBook(rawB);
      const assignedId = String(nextSeqId++);
      return {
        ...sanitized,
        bookId: assignedId,
      };
    });

    const combinedBooks = [...books, ...newBooksFormatted];
    const sorted = sortBooksIndependently(combinedBooks);
    setBooks(sorted);
    localStorage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(sorted));

    // Save only the newly appended books to Firestore
    bulkSaveBooksToFirestore(newBooksFormatted).catch((err) => console.warn('Firestore append Excel error:', err));
    syncMastersFromNewBooks(newBooksFormatted);

    if (importedBorrowers && importedBorrowers.length > 0) {
      const combinedBorrowers = [...borrowers, ...importedBorrowers];
      setBorrowers(combinedBorrowers);
      localStorage.setItem('my_book_collection_borrowers', JSON.stringify(combinedBorrowers));
    }

    setSearchValue('');
    handleReset(sorted);
    setPendingExcelData(null);
    showToast(`✅ ${newBooksFormatted.length} નવા પુસ્તકો હાલના ડેટા નીચે (#${maxExistingId + 1} થી #${nextSeqId - 1}) ઉમેરાયા! (હવે કુલ: ${sorted.length} પુસ્તકો)`);
  };

  // 10.3 Replace Import Confirmation Execution
  const handleExecuteReplaceImport = async (importedBooks: Book[], importedBorrowers: BorrowerRecord[], fileName: string) => {
    setPendingExcelData(null);
    showToast('જૂનો ડેટા સાફ થઈ રહ્યો છે અને નવી ફાઈલ સેટ થઈ રહી છે...');
    await clearAllBooksInFirestore(books);
    handleExecuteFreshImport(importedBooks, importedBorrowers, fileName);
  };

  // 10.4 Import Excel Database file
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentUser?.role !== 'Admin') {
      alert('⚠️ મનાઈ (Permission Denied): Excel Import કરવાની સુવિધા ફક્ત Admin માટે જ ઉપલબ્ધ છે.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset file input so user can re-select same file if needed
    e.target.value = '';

    try {
      showToast(`Excel ફાઈલ તપાસાઈ રહી છે: ${file.name}...`);
      const parsed = await parseExcelFile(file);
      if (!parsed.books || parsed.books.length === 0) {
        alert('આ Excel ફાઈલમાં કોઈ પુસ્તકનો ડેટા મળ્યો નથી. કૃપા કરીને પ્રથમ હરોળમાં હેડર (Book Name, Author વગેરે) તપાસો.');
        return;
      }

      // If library currently has 0 books, directly import as fresh database
      if (books.length === 0) {
        handleExecuteFreshImport(parsed.books, parsed.borrowers, file.name);
      } else {
        // Library already has books: open modal to ask whether to Append below existing data or Replace
        setPendingExcelData({
          fileName: file.name,
          parsedBooks: parsed.books,
          parsedBorrowers: parsed.borrowers,
        });
      }
    } catch (err) {
      alert('Excel ફાઈલ ઈમ્પોર્ટમાં ભૂલ: ' + (err as Error).message);
    }
  };

  // 11. Google Sheet Link Sync Handler
  const handleSyncGoogleSheet = async () => {
    if (currentUser?.role === 'User') {
      alert('⚠️ મનાઈ (Permission Denied): Google Sheet Sync કરવાની પરમિશન ફક્ત Admin પાસે છે.');
      return;
    }
    const url = prompt(
      'ગુગલ શીટ લિંક પેસ્ટ કરો (Paste Google Sheet Link or Published CSV Link):\n\nનોંધ: ગૂગલ શીટની શૅરિંગ સેટિંગ્સ "Anyone with the link can view" હોવી જોઇએ.',
      ''
    );
    if (!url || !url.trim()) return;

    try {
      showToast('ગૂગલ શીટમાંથી સાચો ડેટા લોડ થઈ રહ્યો છે... (Loading from Google Sheet...)');
      const parsed = await parseGoogleSheetUrl(url);
      if (parsed.books.length > 0) {
        localStorage.removeItem('my_book_collection_is_cleared');
        const sorted = sortBooksIndependently(parsed.books);
        setBooks(sorted);
        if (parsed.borrowers.length > 0) {
          setBorrowers(parsed.borrowers);
        }
        bulkSaveBooksToFirestore(sorted).catch((err) => console.warn('Firestore sync Google Sheet error:', err));
        showToast(`ગૂગલ શીટમાંથી કુલ ${parsed.books.length} પુસ્તકો સફળતાપૂર્વક લોડ થઈ ગયા!`);
      } else {
        alert('Google Sheet માં કોઈ પુસ્તક રેકોર્ડ મળ્યા નથી. કૃપા કરીને કોલમ ચેક કરો.');
      }
    } catch (err) {
      alert('Google Sheet લોડ કરવામાં ભૂલ: ' + (err as Error).message);
    }
  };

  const handleClearAllBooks = () => {
    if (currentUser?.role !== 'Admin') {
      showToast('⚠️ મનાઈ (Permission Denied): ડેટાબેઝ ક્લિયર કરવાની પરવાનગી ફક્ત Admin પાસે જ છે.');
      return;
    }
    setIsClearConfirmOpen(true);
  };

  const handleExecuteClearDatabase = async () => {
    if (currentUser?.role !== 'Admin') {
      showToast('⚠️ મનાઈ (Permission Denied): ડેટાબેઝ ક્લિયર કરવાની પરવાનગી ફક્ત Admin પાસે જ છે.');
      setIsClearConfirmOpen(false);
      return;
    }
    setIsClearingInProgress(true);
    try {
      localStorage.setItem('my_book_collection_is_cleared', 'true');
      localStorage.removeItem(CURRENT_STORAGE_KEY);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('my_book_collection_user_books') || key.startsWith('my_book_collection_books'))) {
          localStorage.removeItem(key);
        }
      }
      setBooks([]);
      handleReset([]);
      showToast('🗑️ તમામ પુસ્તકો સાફ થઈ રહ્યા છે...');
      await clearAllBooksInFirestore(books);
      showToast('✅ લાઈબ્રેરીનો તમામ ડેટા સાફ થઈ ગયો છે (કુલ પુસ્તકો: 0). હવે તમે નવી Excel ફાઈલ આસાનીથી ઈમ્પોર્ટ કરી શકો છો.');
    } catch (err) {
      console.warn('Clear database error:', err);
      showToast('⚠️ ડેટા સાફ કરવામાં મુશ્કેલી આવી.');
    } finally {
      setIsClearingInProgress(false);
      setIsClearConfirmOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('my_book_collection_user');
    const userRole: AppUser = {
      id: 'guest_user',
      username: 'user',
      name: 'User',
      role: 'User',
    };
    setCurrentUser(userRole);
    setIsLoginModalOpen(true);
    showToast('Logged out successfully. Select an account to log in.');
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-200 ${
      theme === 'light'
        ? 'theme-light bg-slate-100 text-slate-900'
        : theme === 'sepia'
        ? 'theme-sepia bg-[#f4ecd8] text-[#3d2b1f]'
        : 'bg-slate-900 text-slate-100'
    }`}>
      
      {/* Firebase Free Quota Exceeded Warning Banner */}
      {quotaExceeded && (
        <div className="bg-amber-950/95 border-b-2 border-amber-500 text-amber-200 px-4 py-3 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-2xl z-50 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 animate-bounce" />
            <div>
              <strong className="text-amber-300 font-bold text-sm block">
                ⚠️ ફાયરબેઝ ફ્રી કોટા લિમિટ પૂરી થઈ છે (Firebase Free Daily Quota Limit Exceeded)
              </strong>
              <p className="text-xs text-amber-200/90 leading-relaxed mt-0.5">
                તમે બનાવેલા નવા યુઝર્સ અથવા ફેરફારો તમારા આ બ્રાઉઝરના <strong>Local Storage</strong> માં સુરક્ષિત સેવ થયેલ છે. પરંતુ ફાયરબેઝ સર્વરની ફ્રી ડેઇલી લીમીટ પૂરી થઈ હોવાથી ફાયરબેઝ ક્લાઉડ અને બીજા ડિવાઇસ / પબ્લિશ લિંક પર તે અત્યારે Synchronize નહીં થાય. (24 કલાકમાં Firebase ફ્રી કોટા રિસેટ થતાં ક્લાઉડમાં અપડેટ થઈ શકશે.)
              </p>
            </div>
          </div>
          <button
            onClick={handleDismissQuota}
            className="text-amber-300 hover:text-white font-bold px-3 py-1.5 rounded bg-amber-900/80 border border-amber-500/60 cursor-pointer text-xs shrink-0 shadow"
          >
            સમજાઈ ગયું ✕
          </button>
        </div>
      )}

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-800 text-white px-4 py-2.5 rounded shadow-xl border border-slate-700 flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-200 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Application Master Header */}
      <Header
        languageMode={languageMode}
        setLanguageMode={setLanguageMode}
        onOpenVBA={() => setIsVBAModalOpen(true)}
        onExportExcel={handleExportDatabaseExcel}
        onImportExcel={handleImportExcel}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onResetCatalog={handleRestoreDefaultBooks}
        onClearAll={handleClearAllBooks}
        onOpenBackups={handleOpenBackups}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        localDirectory={localDirectory}
        totalBooksCount={books.length}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onSelectTheme={handleSelectTheme}
      />


      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 space-y-3">
        
        {/* FRAME 1: Book Entry Information */}
        <FrameBookEntry
          formData={formData}
          setFormData={setFormData}
          masters={masters}
          existingBooks={books}
          languageMode={languageMode}
          isEditing={isEditing}
          isAdmin={currentUser?.role === 'Admin'}
          canEditBookType={true}
          onSelectBook={(book) => handleSelectBook(book, true)}
        />

        {/* Action Command Buttons Row */}
        <ActionButtons
          onSaveUpdate={handleSaveUpdate}
          onExportExcel={handleExportDatabaseExcel}
          onPDFLandscape={handlePDFLandscape}
          onPDFPortrait={handlePDFPortrait}
          onPDFFolder={handleOpenBackups}
          onReset={handleReset}
          onBackup={handleTriggerBackup}
          onMaster={handleMaster}
          isEditing={isEditing}
          canExport={currentUser?.role === 'Admin' || currentUser?.role === 'Super User'}
        />

        {/* FRAME 2: Search & List Window */}
        <FrameSearchList
          books={books}
          searchCriterion={searchCriterion}
          setSearchCriterion={setSearchCriterion}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          onSelectBook={handleSelectBook}
          onDeleteBook={handleDeleteBook}
          onQuickIssue={(book) => {
            setSelectedBookForIssue(book);
            const el = document.getElementById('txt_BorrowerName');
            if (el) el.focus();
          }}
          onOpenLocalFile={(book) => handleSelectBook(book, true)}
          selectedBookId={formData.bookId}
          languageMode={languageMode}
          isAdmin={currentUser?.role === 'Admin'}
        />

        {/* FRAME 3: Borrower Information */}
        <FrameBorrowerInfo
          selectedBook={selectedBookForIssue || (isEditing ? formData : null)}
          onIssueBook={handleIssueBook}
          onOpenIssueList={() => setIsIssueListOpen(true)}
          languageMode={languageMode}
          totalIssuedCount={borrowers.filter((b) => b.status === 'Issued').length}
        />

      </main>

      {/* Bento Grid Status Footer */}
      <footer className="bg-slate-200 text-slate-500 px-4 py-1.5 text-[9px] flex flex-wrap justify-between items-center uppercase tracking-tighter shrink-0 border-t border-slate-300 font-mono mt-auto gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span>Status: <span className="text-green-600 font-bold">System Ready</span></span>
          <span>Sync: <span className="text-blue-600 font-bold">Connected</span></span>
        </div>
        <div className="text-slate-500">
          Press ALT+S to Quick Save • Devdutt Thaker (7878413535)
        </div>
      </footer>

      {/* Modals */}
      <MasterManagementModal
        isOpen={isMasterModalOpen}
        onClose={() => setIsMasterModalOpen(false)}
        masters={masters}
        setMasters={setMasters}
        currentUser={currentUser}
        allUsers={allUsers}
        onAddUser={async (rawUser) => {
          const nu = sanitizeUserRole(rawUser);
          setAllUsers((prev) => {
            const keyNew = (nu.username || nu.id).toLowerCase();
            const exists = prev.some(
              (u) => (u.username || u.id).toLowerCase() === keyNew || u.id.toLowerCase() === nu.id.toLowerCase()
            );
            let updated;
            if (exists) {
              updated = prev.map((u) =>
                (u.username || u.id).toLowerCase() === keyNew || u.id.toLowerCase() === nu.id.toLowerCase()
                  ? nu
                  : u
              );
            } else {
              updated = [...prev, nu];
            }
            localStorage.setItem('my_book_collection_all_users', JSON.stringify(updated));
            return updated;
          });
          const saveRes = await saveUserToFirestore(nu);
          if (saveRes && saveRes.quotaExceeded) {
            setQuotaExceeded(true);
          }
          showToast(`નવો યુઝર/એકાઉન્ટ સેવ થયો: ${nu.name} (${nu.role})`);
          return saveRes;
        }}
        onDeleteUser={(du) => {
          deleteUserFromFirestore(du.id, du.username).catch((err) => console.warn('Firestore delete user error:', err));
          setAllUsers((prev) => {
            const duId = (du.id || '').trim().toLowerCase();
            const duUsername = (du.username || du.id || '').trim().toLowerCase();
            const updated = prev.filter((u) => {
              const uId = (u.id || '').trim().toLowerCase();
              const uUsername = (u.username || u.id || '').trim().toLowerCase();
              return uId !== duId && uUsername !== duUsername && uId !== duUsername && uUsername !== duId;
            });
            localStorage.setItem('my_book_collection_all_users', JSON.stringify(updated));
            return updated;
          });
          showToast(`સફળતાપૂર્વક યુઝર ખાતું ડિલીટ થયું: ${du.name}`);
        }}
        onUpdateUserRole={(rawUser) => {
          const uu = sanitizeUserRole(rawUser);
          saveUserToFirestore(uu).catch((err) => console.warn('Firestore update user role error:', err));
          setAllUsers((prev) => {
            const updated = prev.map((u) =>
              u.id.toLowerCase() === uu.id.toLowerCase() ||
              u.username.toLowerCase() === uu.username.toLowerCase()
                ? uu
                : u
            );
            localStorage.setItem('my_book_collection_all_users', JSON.stringify(updated));
            return updated;
          });
          showToast(`✅ ${uu.name} ની વિગતો અપડેટ થઈ!`);
        }}
        showToast={showToast}
      />

      <VBACodeModal
        isOpen={isVBAModalOpen}
        onClose={() => setIsVBAModalOpen(false)}
      />

      <IssueListModal
        isOpen={isIssueListOpen}
        onClose={() => setIsIssueListOpen(false)}
        borrowers={borrowers}
        onReturnBook={handleReturnBook}
        onDeleteIssue={handleDeleteBorrowerRecord}
        currentUser={currentUser}
        currentUserRole={currentUser?.role}
      />

      <BackupFolderModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        backups={backups}
        pdfExports={pdfExports}
        onDownloadDatabase={() => exportDatabaseToExcel(books, borrowers, currentUser?.role === 'Admin')}
        onClearDatabase={handleClearAllBooks}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        currentUser={currentUser}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        allUsers={allUsers}
        theme={theme}
        onLogin={(u) => {
          setCurrentUser(u);
          setFormData((prev) => ({ ...prev, createdBy: u.name }));
          showToast(`લૉગિન સફળ! [${u.role}] - ${u.name}`);
        }}
        onAddUser={async (rawUser) => {
          const nu = sanitizeUserRole(rawUser);
          setAllUsers((prev) => {
            const keyNew = (nu.username || nu.id).toLowerCase();
            const exists = prev.some(
              (u) => (u.username || u.id).toLowerCase() === keyNew || u.id.toLowerCase() === nu.id.toLowerCase()
            );
            let updated;
            if (exists) {
              updated = prev.map((u) =>
                (u.username || u.id).toLowerCase() === keyNew || u.id.toLowerCase() === nu.id.toLowerCase()
                  ? nu
                  : u
              );
            } else {
              updated = [...prev, nu];
            }
            localStorage.setItem('my_book_collection_all_users', JSON.stringify(updated));
            return updated;
          });
          const saveRes = await saveUserToFirestore(nu);
          if (saveRes && saveRes.quotaExceeded) {
            setQuotaExceeded(true);
          }
          showToast(`નવો યુઝર/એકાઉન્ટ ઉમેરાયો: ${nu.name} (${nu.role})`);
          return saveRes;
        }}
        onDeleteUser={(du) => {
          deleteUserFromFirestore(du.id, du.username).catch((err) => console.warn('Firestore delete user error:', err));
          setAllUsers((prev) => {
            const duId = (du.id || '').trim().toLowerCase();
            const duUsername = (du.username || du.id || '').trim().toLowerCase();
            const updated = prev.filter((u) => {
              const uId = (u.id || '').trim().toLowerCase();
              const uUsername = (u.username || u.id || '').trim().toLowerCase();
              return uId !== duId && uUsername !== duUsername && uId !== duUsername && uUsername !== duId;
            });
            localStorage.setItem('my_book_collection_all_users', JSON.stringify(updated));
            return updated;
          });
          showToast(`સફળતાપૂર્વક યુઝર ખાતું ડિલીટ થયું: ${du.name}`);
        }}
        onUpdateUserRole={(rawUser) => {
          const uu = sanitizeUserRole(rawUser);
          saveUserToFirestore(uu).catch((err) => console.warn('Firestore update user role error:', err));
          setAllUsers((prev) => {
            const updated = prev.map((u) =>
              u.id.toLowerCase() === uu.id.toLowerCase() ||
              u.username.toLowerCase() === uu.username.toLowerCase()
                ? uu
                : u
            );
            localStorage.setItem('my_book_collection_all_users', JSON.stringify(updated));
            return updated;
          });
          showToast(`✅ ${uu.name} નો રોલ બદલાઈને "${uu.role}" થયો!`);
        }}
      />

      {/* PWA Install App Modal for Mobile & Desktop */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onTriggerInstall={handleTriggerInstall}
      />

      {/* Delete Book Confirmation Dialog (Iframe & Mobile Safe) */}
      {bookToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-500/50 flex items-center justify-center mx-auto text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">પુસ્તક ડીલીટ કરવું છે?</h3>
              <p className="text-xs text-slate-300">
                શું આપ ખરેખર Book ID <span className="font-mono font-bold text-amber-400">#{bookToDeleteId}</span> ને લાઈબ્રેરી અને Firestore માંથી ડિલીટ કરવા માંગો છો?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBookToDeleteId(null)}
                className="flex-1 py-2 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-all"
              >
                રદ કરો (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBook}
                className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/30 cursor-pointer transition-all"
              >
                હા, ડીલીટ કરો
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instant PDF Export Modal with User / All Filter */}
      {pdfModalOrientation && (
        <PDFExportModal
          isOpen={!!pdfModalOrientation}
          onClose={() => setPdfModalOrientation(null)}
          orientation={pdfModalOrientation}
          books={books}
          isAdmin={currentUser?.role === 'Admin'}
          theme={theme}
          onSuccess={(fileName, count) => {
            const newExport: PDFExportItem = {
              id: 'PDF-' + Date.now(),
              fileName,
              orientation: pdfModalOrientation,
              createdAt: new Date().toLocaleString(),
              recordsCount: count,
            };
            setPdfExports((prev) => [newExport, ...prev]);
            showToast(`✅ ${pdfModalOrientation} PDF તૈયાર થઈ ગઈ! (${count} Books)`);
          }}
        />
      )}

      {/* Excel Import Dialog (Append below existing data or Replace) */}
      {pendingExcelData && (
        <ExcelImportModal
          isOpen={!!pendingExcelData}
          onClose={() => setPendingExcelData(null)}
          fileName={pendingExcelData.fileName}
          parsedBooks={pendingExcelData.parsedBooks}
          parsedBorrowers={pendingExcelData.parsedBorrowers}
          currentBooksCount={books.length}
          nextBookId={generateNextBookID(books)}
          onAppend={() => handleExecuteAppendImport(pendingExcelData.parsedBooks, pendingExcelData.parsedBorrowers, pendingExcelData.fileName)}
          onReplace={() => handleExecuteReplaceImport(pendingExcelData.parsedBooks, pendingExcelData.parsedBorrowers, pendingExcelData.fileName)}
        />
      )}

      {/* Clear All Database Confirmation Dialog (Iframe & Mobile Safe) */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-rose-950/80 border border-rose-500/50 flex items-center justify-center mx-auto text-rose-400 shadow-lg shadow-rose-900/30">
              <Trash2 className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">લાઈબ્રેરીનો તમામ ડેટા સાફ કરવો છે?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                શું આપ ખરેખર લાઈબ્રેરીમાંથી હાજર તમામ <span className="font-bold text-amber-400 font-mono text-sm">{books.length}</span> પુસ્તકો હટાવવા માંગો છો?
              </p>
              <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-left text-xs text-rose-200/90 space-y-1">
                <p className="font-semibold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  મહત્વની સૂચના:
                </p>
                <p>
                  આનાથી લાઈબ્રેરી સાફ થઈને 0 પુસ્તકો થઈ જશે, જેથી તમે તમારી સાચી Excel ફાઈલ આસાનીથી અપલોડ કરી શકશો.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isClearingInProgress}
                onClick={() => setIsClearConfirmOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                રદ કરો (Cancel)
              </button>
              <button
                type="button"
                disabled={isClearingInProgress}
                onClick={handleExecuteClearDatabase}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isClearingInProgress ? (
                  <span>સાફ થઈ રહ્યું છે...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>હા, બધો ડેટા સાફ કરો</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

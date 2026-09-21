import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Book, MasterData, BorrowerRecord, AppUser } from './types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with ignoreUndefinedProperties enabled
let firestoreDb;
try {
  firestoreDb = firebaseConfig.firestoreDatabaseId 
    ? initializeFirestore(app, { ignoreUndefinedProperties: true }, firebaseConfig.firestoreDatabaseId)
    : initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch (e) {
  firestoreDb = firebaseConfig.firestoreDatabaseId 
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
}

export const db = firestoreDb;

// Firestore Collections & Doc IDs
export const BOOKS_COLLECTION = 'Books';
export const MASTER_COLLECTION = 'MasterData';
export const MASTER_DOC_ID = 'main';
export const BORROWERS_COLLECTION = 'Borrowers';
export const USERS_COLLECTION = 'Users';

/**
 * Helper to strip undefined fields from objects before sending to Firestore
 */
const sanitizePayload = <T>(data: T): T => {
  if (!data) return data;
  return JSON.parse(JSON.stringify(data));
};

// Global Quota Listener
let globalQuotaExceededHandler: (() => void) | null = null;

export const setOnQuotaExceededListener = (handler: () => void) => {
  globalQuotaExceededHandler = handler;
};

export const isQuotaError = (err: any): boolean => {
  if (!err) return false;
  const code = String(err.code || '').toLowerCase();
  const msg = String(err.message || err || '').toLowerCase();
  return code.includes('resource-exhausted') || msg.includes('quota limit exceeded') || msg.includes('quota exceeded') || msg.includes('resource-exhausted');
};

export const notifyQuotaExceeded = (err?: any) => {
  if (isQuotaError(err)) {
    console.warn('⚡ FIREBASE FREE DAILY QUOTA EXCEEDED DETECTED');
    if (globalQuotaExceededHandler) {
      globalQuotaExceededHandler();
    }
  }
};

/**
 * Real-time listener for Books collection in Firestore
 */
export const subscribeBooksFromFirestore = (
  onUpdate: (books: Book[]) => void, 
  onError?: (err: Error) => void
) => {
  const booksRef = collection(db, BOOKS_COLLECTION);
  return onSnapshot(booksRef, (snapshot) => {
    const booksList: Book[] = [];
    snapshot.forEach((docSnap) => {
      booksList.push(docSnap.data() as Book);
    });
    // Sort books numerically by bookId
    booksList.sort((a, b) => {
      const numA = parseInt(String(a.bookId || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(String(b.bookId || '').replace(/\D/g, ''), 10) || 0;
      return numA !== numB ? numA - numB : String(a.bookId || '').localeCompare(String(b.bookId || ''));
    });
    onUpdate(booksList);
  }, (err) => {
    console.error('Firestore Books subscription error:', err);
    notifyQuotaExceeded(err);
    if (onError) onError(err);
  });
};

/**
 * Save or update a single book in Firestore
 */
export const saveBookToFirestore = async (book: Book) => {
  if (!book || !book.bookId) return;
  try {
    const bookRef = doc(db, BOOKS_COLLECTION, String(book.bookId));
    await setDoc(bookRef, sanitizePayload(book), { merge: true });
  } catch (err) {
    console.warn('Firestore saveBookToFirestore notice:', err);
    notifyQuotaExceeded(err);
  }
};

/**
 * Delete a book from Firestore
 */
export const deleteBookFromFirestore = async (bookId: string) => {
  if (!bookId) return;
  try {
    const bookRef = doc(db, BOOKS_COLLECTION, String(bookId));
    await deleteDoc(bookRef);
  } catch (err) {
    console.warn('Firestore deleteBookFromFirestore notice:', err);
    notifyQuotaExceeded(err);
  }
};

/**
 * Bulk save books to Firestore (batch write in chunks of 200)
 */
export const bulkSaveBooksToFirestore = async (books: Book[]) => {
  if (!books || !Array.isArray(books) || books.length === 0) return;
  const BATCH_SIZE = 200;
  for (let i = 0; i < books.length; i += BATCH_SIZE) {
    try {
      const batch = writeBatch(db);
      const chunk = books.slice(i, i + BATCH_SIZE);
      let count = 0;
      chunk.forEach((b) => {
        if (b && b.bookId) {
          const ref = doc(db, BOOKS_COLLECTION, String(b.bookId));
          batch.set(ref, sanitizePayload(b), { merge: true });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
        console.log(`Successfully committed batch starting at ${i} (${count} books)`);
      }
    } catch (err) {
      console.warn(`Firestore bulk save batch error at index ${i}:`, err);
      notifyQuotaExceeded(err);
      break;
    }
  }
};

/**
 * Real-time listener for MasterData in Firestore
 */
export const subscribeMasterDataFromFirestore = (
  onUpdate: (data: MasterData) => void,
  onError?: (err: Error) => void
) => {
  const masterRef = doc(db, MASTER_COLLECTION, MASTER_DOC_ID);
  return onSnapshot(masterRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data() as MasterData);
    }
  }, (err) => {
    console.error('Firestore MasterData subscription error:', err);
    notifyQuotaExceeded(err);
    if (onError) onError(err);
  });
};

/**
 * Save or update MasterData in Firestore
 */
export const saveMasterDataToFirestore = async (masterData: MasterData) => {
  if (!masterData) return;
  try {
    const masterRef = doc(db, MASTER_COLLECTION, MASTER_DOC_ID);
    await setDoc(masterRef, sanitizePayload(masterData));
  } catch (err) {
    console.warn('Firestore saveMasterDataToFirestore notice:', err);
    notifyQuotaExceeded(err);
  }
};

/**
 * Real-time listener for BorrowerRecords in Firestore
 */
export const subscribeBorrowersFromFirestore = (
  onUpdate: (borrowers: BorrowerRecord[]) => void,
  onError?: (err: Error) => void
) => {
  const borrowersRef = collection(db, BORROWERS_COLLECTION);
  return onSnapshot(borrowersRef, (snapshot) => {
    const list: BorrowerRecord[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as BorrowerRecord);
    });
    onUpdate(list);
  }, (err) => {
    console.error('Firestore Borrowers subscription error:', err);
    notifyQuotaExceeded(err);
    if (onError) onError(err);
  });
};

/**
 * Issue book & update both Borrowers collection and Book status in Books collection
 */
export const issueBookInFirestore = async (issueRecord: BorrowerRecord) => {
  if (!issueRecord.issueId) return;
  try {
    const issueRef = doc(db, BORROWERS_COLLECTION, String(issueRecord.issueId));
    await setDoc(issueRef, sanitizePayload(issueRecord), { merge: true });

    if (issueRecord.bookId) {
      const bookRef = doc(db, BOOKS_COLLECTION, String(issueRecord.bookId));
      await setDoc(bookRef, {
        isIssued: true,
        currentBorrowerName: issueRecord.borrowerName,
        currentIssueDueDate: issueRecord.dueDate
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore issueBookInFirestore notice:', err);
    notifyQuotaExceeded(err);
  }
};

/**
 * Return book & update both Borrowers collection and Book status in Books collection
 */
export const returnBookInFirestore = async (issueId: string, bookId?: string) => {
  if (!issueId) return;
  try {
    const returnDate = new Date().toISOString().slice(0, 10);
    const issueRef = doc(db, BORROWERS_COLLECTION, String(issueId));
    await setDoc(issueRef, { status: 'Returned', returnDate }, { merge: true });

    if (bookId) {
      const bookRef = doc(db, BOOKS_COLLECTION, String(bookId));
      await setDoc(bookRef, {
        isIssued: false,
        currentBorrowerName: '',
        currentIssueDueDate: ''
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore returnBookInFirestore notice:', err);
    notifyQuotaExceeded(err);
  }
};

/**
 * Delete borrower record from Firestore & restore book status if was issued
 */
export const deleteBorrowerInFirestore = async (issueId: string, bookId?: string, wasIssued?: boolean) => {
  if (!issueId) return;
  try {
    const issueRef = doc(db, BORROWERS_COLLECTION, String(issueId));
    await deleteDoc(issueRef);

    if (wasIssued && bookId) {
      const bookRef = doc(db, BOOKS_COLLECTION, String(bookId));
      await setDoc(bookRef, {
        isIssued: false,
        currentBorrowerName: '',
        currentIssueDueDate: ''
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore deleteBorrowerInFirestore notice:', err);
    notifyQuotaExceeded(err);
  }
};

/**
 * Clear all books from Firestore
 */
export const clearAllBooksInFirestore = async (currentBooks?: Book[]) => {
  try {
    const snapshot = await getDocs(collection(db, BOOKS_COLLECTION));
    const docIds = new Set<string>();
    snapshot.forEach((d) => {
      if (d.id) docIds.add(d.id);
    });
    if (currentBooks && Array.isArray(currentBooks)) {
      currentBooks.forEach((b) => {
        if (b && b.bookId) docIds.add(String(b.bookId));
      });
    }

    const idsList = Array.from(docIds);
    if (idsList.length === 0) return;

    const BATCH_SIZE = 400;
    for (let i = 0; i < idsList.length; i += BATCH_SIZE) {
      try {
        const batch = writeBatch(db);
        const chunk = idsList.slice(i, i + BATCH_SIZE);
        chunk.forEach((id) => {
          const ref = doc(db, BOOKS_COLLECTION, id);
          batch.delete(ref);
        });
        await batch.commit();
      } catch (batchErr) {
        console.warn('Batch delete error:', batchErr);
        notifyQuotaExceeded(batchErr);
        break;
      }
    }
  } catch (err) {
    console.warn('Firestore clearAllBooksInFirestore error:', err);
    notifyQuotaExceeded(err);
  }
};

/**
 * Real-time listener for Users collection in Firestore
 */
export const subscribeUsersFromFirestore = (
  onUpdate: (users: AppUser[]) => void,
  onError?: (err: Error) => void
) => {
  const usersRef = collection(db, USERS_COLLECTION);
  return onSnapshot(usersRef, (snapshot) => {
    const list: AppUser[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as AppUser);
    });
    onUpdate(list);
  }, (err) => {
    console.error('Firestore Users subscription error:', err);
    notifyQuotaExceeded(err);
    if (onError) onError(err);
  });
};

/**
 * Save user to Firestore using canonical lowercase username as document key
 */
export const saveUserToFirestore = async (user: AppUser): Promise<{ success: boolean; quotaExceeded?: boolean; error?: string }> => {
  if (!user || (!user.id && !user.username)) return { success: false, error: 'Invalid payload' };
  try {
    const canonicalId = (user.username || user.id).toLowerCase();
    const ref = doc(db, USERS_COLLECTION, canonicalId);
    
    const payload: AppUser = sanitizePayload({
      ...user,
      id: user.id || canonicalId,
      username: user.username || canonicalId,
      password: user.password && user.password.trim() !== '' ? user.password.trim() : (user.role === 'Admin' ? 'Malvee@0911' : '1234')
    });

    await setDoc(ref, payload, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.warn('Firestore saveUserToFirestore notice:', err);
    notifyQuotaExceeded(err);
    return { success: false, quotaExceeded: isQuotaError(err), error: err?.message || 'Error saving user' };
  }
};

/**
 * Delete user from Firestore
 */
export const deleteUserFromFirestore = async (userId: string, username?: string) => {
  if (!userId) return;
  try {
    const idsToDelete = new Set<string>();
    idsToDelete.add(String(userId));
    idsToDelete.add(String(userId).toLowerCase());
    if (username) {
      idsToDelete.add(String(username));
      idsToDelete.add(String(username).toLowerCase());
    }

    for (const docId of idsToDelete) {
      const ref = doc(db, USERS_COLLECTION, docId);
      await deleteDoc(ref).catch(() => {});
    }

    // Scan USERS_COLLECTION to clean up any remaining match
    const snapshot = await getDocs(collection(db, USERS_COLLECTION));
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as AppUser;
      if (data) {
        const uId = (data.id || '').toLowerCase();
        const uName = (data.username || '').toLowerCase();
        const targetId = String(userId).toLowerCase();
        const targetUsername = (username || userId).toLowerCase();

        if (uId === targetId || uName === targetUsername || uId === targetUsername || uName === targetId) {
          deleteDoc(doc(db, USERS_COLLECTION, docSnap.id)).catch(() => {});
        }
      }
    });
  } catch (err) {
    console.error('Error deleting user from Firestore:', err);
  }
};



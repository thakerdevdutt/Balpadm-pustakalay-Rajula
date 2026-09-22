export type LanguageMode = 'en' | 'gu' | 'both';
export type AppTheme = 'light' | 'dark' | 'sepia' | 'corporate-navy' | 'classic' | 'emerald' | 'crimson' | 'slate' | 'amber';
export type UserRole = 'Admin' | 'Member' | 'Viewer' | 'Super User' | 'User';

export interface Book {
  bookId: string;
  bookName: string;
  author: string;
  translator?: string;
  publisher?: string;
  category?: string;
  language?: string;
  edition?: string;
  yearPublished?: string;
  isbn?: string;
  rate?: number | string;
  bookType?: string;
  remarks1?: string;
  remarks2?: string;
  addedDate?: string;
  createdBy?: string;
  status?: 'Available' | 'Issued';
  currentBorrower?: string;
}

export interface BorrowerRecord {
  issueId: string;
  bookId: string;
  bookName: string;
  borrowerName: string;
  address?: string;
  mobile?: string;
  issueDate: string;
  dueDate?: string;
  returnDate?: string;
  status: 'Issued' | 'Returned';
  remarks?: string;
  remark?: string;
}

export interface MasterData {
  authors: string[];
  categories: string[];
  translators: string[];
  languages: string[];
  publishers: string[];
  bookTypes: string[];
}

export type SearchCriterion =
  | 'Book ID'
  | 'Book Name'
  | 'Author'
  | 'Publisher'
  | 'Category'
  | 'Language'
  | 'Book Type'
  | 'Entry By'
  | 'All Fields'
  | 'All';

export interface BackupItem {
  id: string;
  timestamp: string;
  filename?: string;
  fileName?: string;
  bookCount: number;
  borrowerCount: number;
  size?: string;
  fileSize?: string;
  type?: 'excel' | 'json';
}

export interface PDFExportItem {
  id: string;
  timestamp?: string;
  filename?: string;
  fileName?: string;
  pageCount?: number;
  filterUsed?: string;
  bookCount?: number;
  orientation?: string;
  createdAt?: string;
  recordsCount?: number;
}

export interface AppUser {
  id: string;
  name: string;
  username?: string;
  password?: string;
  secondaryPassword?: string;
  email?: string;
  role: UserRole;
  pin?: string;
  createdAt?: string;
}

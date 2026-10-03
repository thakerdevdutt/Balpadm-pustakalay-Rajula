export type ReadingTheme = 'light' | 'dark' | 'sepia';

export type FontSizeLevel = 'small' | 'normal' | 'large' | 'xlarge';

export const DEFAULT_SUBJECT_CATEGORIES = [
  'We the Readers',
  'વિસ્મય',
  'વિવર્તન',
  'ન્યુઝ વોચ',
  'ન્યુઝ ફોકસ',
  'રાજુલા',
  'લેખ',
  'Facebook',
  'નવલકથા',
  'કવિતા',
  'ઈતિહાસ',
  'પ્રવાસ',
  'જ્યોતિષ શાસ્ત્ર / ખગોળ શાસ્ત્ર',
  'અન્ય',
] as const;

export const SUBJECT_CATEGORIES = [...DEFAULT_SUBJECT_CATEGORIES];

export type SubjectCategory = string;

export interface Article {
  id: string;
  title: string;
  author: string;
  date?: string;
  summary: string;
  content: string;
  tags?: string[];
  readingTimeMinutes?: number;
  imageUrl?: string;
  category?: string;
  isPasswordProtected?: boolean;
  password?: string;
  oneTimePasscodes?: string[];
  orderIndex?: number;
  copyEnable?: boolean; // When true, readers can copy article text; default is false (disabled)
  isSavedInCloud?: boolean; // When true, confirmed existing in Firebase Cloud database
  isDeleted?: boolean; // When true, tombstone marker indicating article was deleted across devices
  isHidden?: boolean; // When true, article is hidden from main page for readers but visible in admin modal
  updatedAt?: number; // Epoch timestamp (ms) of last modification to ensure cross-device consistency
}

export interface WeeklyIssue {
  id: string;
  issueNumber: number;
  date: string;
  themeTitle: string;
  themeDescription?: string;
  coverImage?: string;
  articles: Article[];
}


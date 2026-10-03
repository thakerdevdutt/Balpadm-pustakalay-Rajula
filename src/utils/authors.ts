import { Article, WeeklyIssue } from '../types';
import { saveCustomAuthorsToCloud } from '../services/firebaseService';

export const DEFAULT_AUTHORS = [
  'ધૈવત ત્રિવેદી',
  'શાંડિલ્ય ત્રિવેદી',
  'આર.પી.જોશી',
  'સંપાદકીય',
];

export const CUSTOM_AUTHORS_STORAGE_KEY = 'lekh_sangrah_custom_authors';
export const LAST_AUTHOR_STORAGE_KEY = 'lekh_sangrah_last_author';
export const LAST_CATEGORY_STORAGE_KEY = 'lekh_sangrah_last_category';

/**
 * Loads custom authors stored in localStorage.
 */
export const loadCustomAuthors = (): string[] => {
  try {
    const saved = localStorage.getItem(CUSTOM_AUTHORS_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return parsed.filter((a): a is string => typeof a === 'string' && a.trim().length > 0);
    }
    return [];
  } catch {
    return [];
  }
};

/**
 * Saves a new custom author permanently in localStorage and syncs with Cloud Firestore.
 * Returns the updated list of custom authors.
 */
export const saveCustomAuthor = (name: string): string[] => {
  const clean = name.trim();
  if (!clean || clean === 'અન્ય' || clean === 'અન્ય (નવો લેખક ઉમેરો)') {
    return loadCustomAuthors();
  }

  // If it's already in the default authors, don't add to custom
  const isDefault = DEFAULT_AUTHORS.some(
    (a) => a.toLowerCase() === clean.toLowerCase()
  );
  if (isDefault) return loadCustomAuthors();

  const current = loadCustomAuthors();
  const alreadyExists = current.some(
    (a) => a.toLowerCase() === clean.toLowerCase()
  );

  if (!alreadyExists) {
    const updated = [...current, clean];
    try {
      localStorage.setItem(CUSTOM_AUTHORS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    saveCustomAuthorsToCloud(updated).catch(() => {});
    return updated;
  }

  return current;
};

/**
 * Merges and saves a batch of authors permanently (e.g. from cloud or articles)
 */
export const saveCustomAuthorsBatch = (authors: string[]): string[] => {
  const current = loadCustomAuthors();
  let hasChanges = false;
  const merged = [...current];

  authors.forEach((author) => {
    const clean = author.trim();
    if (!clean || clean === 'અન્ય' || clean === 'અન્ય (નવો લેખક ઉમેરો)') return;
    const isDefault = DEFAULT_AUTHORS.some((d) => d.toLowerCase() === clean.toLowerCase());
    const exists = merged.some((c) => c.toLowerCase() === clean.toLowerCase());
    if (!isDefault && !exists) {
      merged.push(clean);
      hasChanges = true;
    }
  });

  if (hasChanges) {
    try {
      localStorage.setItem(CUSTOM_AUTHORS_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
    saveCustomAuthorsToCloud(merged).catch(() => {});
  }

  return merged;
};

/**
 * Extract all unique authors present in articles or issues
 */
export const extractAuthorsFromArticles = (
  items?: Array<Article | WeeklyIssue | string | undefined | null>
): string[] => {
  if (!items || !Array.isArray(items)) return [];
  const found = new Set<string>();

  items.forEach((item) => {
    if (!item) return;
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed) found.add(trimmed);
      return;
    }
    if ('articles' in item && Array.isArray(item.articles)) {
      item.articles.forEach((art) => {
        if (art && art.author && typeof art.author === 'string') {
          const trimmed = art.author.trim();
          if (trimmed) found.add(trimmed);
        }
      });
    } else if ('author' in item && item.author && typeof item.author === 'string') {
      const trimmed = item.author.trim();
      if (trimmed) found.add(trimmed);
    }
  });

  return Array.from(found);
};

/**
 * Returns full deduplicated authors list with default authors, custom authors,
 * authors discovered from articles/issues, and 'અન્ય' option at the end.
 */
export const getFullAuthorsList = (options?: {
  customAuthors?: string[];
  cloudAuthors?: string[];
  articles?: Article[];
  issues?: WeeklyIssue[];
}): string[] => {
  const custom = options?.customAuthors ?? loadCustomAuthors();
  const cloud = options?.cloudAuthors ?? [];
  const extractedFromArticles = extractAuthorsFromArticles(options?.articles);
  const extractedFromIssues = extractAuthorsFromArticles(options?.issues);

  const seen = new Set<string>();
  const result: string[] = [];

  const addAuthor = (author: string) => {
    const trimmed = author.trim();
    if (!trimmed || trimmed === 'અન્ય' || trimmed === 'અન્ય (નવો લેખક ઉમેરો)') return;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(trimmed);
    }
  };

  // 1. Add Default Authors first
  DEFAULT_AUTHORS.forEach(addAuthor);

  // 2. Add Saved Custom Authors & Cloud Authors
  custom.forEach(addAuthor);
  cloud.forEach(addAuthor);

  // 3. Add Authors from articles/issues
  extractedFromArticles.forEach(addAuthor);
  extractedFromIssues.forEach(addAuthor);

  // 4. Finally append 'અન્ય' option at the end
  result.push('અન્ય');

  return result;
};

/**
 * Get the last used author from previous entry
 */
export const getLastUsedAuthor = (): string => {
  try {
    const saved = localStorage.getItem(LAST_AUTHOR_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // ignore
  }
  return DEFAULT_AUTHORS[0]; // 'ધૈવત ત્રિવેદી'
};

/**
 * Set the last used author so the next entry pre-fills it
 */
export const setLastUsedAuthor = (author: string): void => {
  const clean = author.trim();
  if (!clean || clean === 'અન્ય') return;
  try {
    localStorage.setItem(LAST_AUTHOR_STORAGE_KEY, clean);
  } catch {
    // ignore
  }
};

/**
 * Get the last used category from previous entry
 */
export const getLastUsedCategory = (): string => {
  try {
    const saved = localStorage.getItem(LAST_CATEGORY_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // ignore
  }
  return 'વિસ્મય';
};

/**
 * Set the last used category so the next entry pre-fills it
 */
export const setLastUsedCategory = (category: string): void => {
  const clean = category.trim();
  if (!clean || clean === 'અન્ય') return;
  try {
    localStorage.setItem(LAST_CATEGORY_STORAGE_KEY, clean);
  } catch {
    // ignore
  }
};

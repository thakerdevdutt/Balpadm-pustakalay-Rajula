import { DEFAULT_SUBJECT_CATEGORIES, Article, WeeklyIssue } from '../types';
import { saveCustomCategoriesToCloud } from '../services/firebaseService';

export const CUSTOM_CATEGORIES_STORAGE_KEY = 'lekh_sangrah_custom_categories';

// List of categories explicitly removed by user that should never appear in dropdown
export const REMOVED_LEGACY_CATEGORIES = new Set([
  'અંદાઝ-એ-બયાં',
  'વિવરણ',
  'ઇન્ટરવ્યુ',
  'ગુજરાત સમાચાર રવિપૂર્તિ',
  'સાર્થક જલસો',
  'News 360',
  'ધાર્મિક / આધ્યાત્મિક',
  'સત્યઘટના',
  'નાટક / નાટકો',
  'મેગેઝીન',
  'પોઝીટીવ એટીટ્યુડ',
  'વાર્તા / વાર્તાઓ',
  'કોમ્પ્યુટર / ટેકનોલોજી / વિજ્ઞાન',
  'ફિલ્મ જગત / સંગીત જગત',
  'આયુર્વેદ અને મેડીકલ સાયન્સ',
  'આત્મકથા / જીવન ચરિત્ર',
  'ફિકશન',
  'ભાષા / ભણતર / એજ્યુકેશન',
]);

/**
 * Loads custom categories stored in localStorage.
 */
export const loadCustomCategories = (): string[] => {
  try {
    const saved = localStorage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter(
        (c): c is string =>
          typeof c === 'string' &&
          c.trim().length > 0 &&
          !REMOVED_LEGACY_CATEGORIES.has(c.trim())
      );
      if (filtered.length !== parsed.length) {
        localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(filtered));
      }
      return filtered;
    }
    return [];
  } catch {
    return [];
  }
};

/**
 * Saves a new custom category permanently in localStorage and syncs with Cloud Firestore.
 * Returns the updated list of custom categories.
 */
export const saveCustomCategory = (name: string): string[] => {
  const clean = name.trim();
  if (!clean || clean === 'અન્ય') return loadCustomCategories();

  // If it's already in the default categories, don't add to custom
  const isDefault = DEFAULT_SUBJECT_CATEGORIES.some(
    (cat) => cat.toLowerCase() === clean.toLowerCase()
  );
  if (isDefault) return loadCustomCategories();

  const current = loadCustomCategories();
  const alreadyExists = current.some(
    (c) => c.toLowerCase() === clean.toLowerCase()
  );

  if (!alreadyExists) {
    const updated = [...current, clean];
    try {
      localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    // Asynchronously sync to Cloud Firestore
    saveCustomCategoriesToCloud(updated).catch(() => {});
    return updated;
  }

  return current;
};

/**
 * Merges and saves a batch of categories permanently (e.g. from cloud or articles)
 */
export const saveCustomCategoriesBatch = (categories: string[]): string[] => {
  const current = loadCustomCategories();
  const defaultWithoutOther = DEFAULT_SUBJECT_CATEGORIES.filter((c) => c !== 'અન્ય');
  let hasChanges = false;
  const merged = [...current];

  categories.forEach((cat) => {
    const clean = cat.trim();
    if (!clean || clean === 'અન્ય') return;
    const isDefault = defaultWithoutOther.some((d) => d.toLowerCase() === clean.toLowerCase());
    const exists = merged.some((c) => c.toLowerCase() === clean.toLowerCase());
    if (!isDefault && !exists) {
      merged.push(clean);
      hasChanges = true;
    }
  });

  if (hasChanges) {
    try {
      localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
    saveCustomCategoriesToCloud(merged).catch(() => {});
  }

  return merged;
};

/**
 * Extract all unique categories present in articles or issues
 */
export const extractCategoriesFromArticles = (
  items?: Array<Article | WeeklyIssue | string | undefined | null>
): string[] => {
  if (!items || !Array.isArray(items)) return [];
  const found = new Set<string>();

  items.forEach((item) => {
    if (!item) return;
    if (typeof item === 'string') {
      const clean = item.trim();
      if (clean && clean !== 'અન્ય') found.add(clean);
    } else if ('articles' in item && Array.isArray((item as WeeklyIssue).articles)) {
      (item as WeeklyIssue).articles.forEach((art) => {
        if (art && art.category && typeof art.category === 'string') {
          const clean = art.category.trim();
          if (clean && clean !== 'અન્ય') found.add(clean);
        }
      });
    } else if ('category' in item && typeof (item as Article).category === 'string') {
      const clean = (item as Article).category?.trim();
      if (clean && clean !== 'અન્ય') found.add(clean);
    }
  });

  return Array.from(found);
};

/**
 * Returns the complete ordered categories list:
 * 1. Default categories (excluding 'અન્ય')
 * 2. Only user-created custom categories (excluding removed legacy categories)
 * 3. 'અન્ય' (Other / Custom entry option)
 */
export const getFullCategoriesList = (
  customList?: string[],
  _existingSources?: Array<Article | WeeklyIssue | string | undefined | null>
): string[] => {
  const customs = customList || loadCustomCategories();
  const defaultWithoutOther = DEFAULT_SUBJECT_CATEGORIES.filter((c) => c !== 'અન્ય');

  const extrasMap = new Map<string, string>();

  // Only add user-typed custom categories that are not removed and not default
  customs.forEach((cat) => {
    const clean = cat.trim();
    if (!clean || clean === 'અન્ય' || REMOVED_LEGACY_CATEGORIES.has(clean)) return;
    const isDefault = defaultWithoutOther.some(
      (d) => d.toLowerCase() === clean.toLowerCase()
    );
    if (!isDefault && !extrasMap.has(clean.toLowerCase())) {
      extrasMap.set(clean.toLowerCase(), clean);
    }
  });

  const uniqueExtras = Array.from(extrasMap.values());

  return [
    ...defaultWithoutOther,
    ...uniqueExtras,
    'અન્ય',
  ];
};

export interface CategoryTabItem {
  id: string;
  label: string;
  count: number;
}

export interface CategoryTabsResult {
  tabs: CategoryTabItem[];
  qualifyingKeys: Set<string>;
  totalArticles: number;
  matchCategory: (target: string, cat: string) => boolean;
}

export const matchCategory = (target: string, cat: string): boolean => {
  const t = target.toLowerCase().trim();
  const c = (cat || '').toLowerCase().trim();
  if (!c) return false;
  if (t === c) return true;
  if ((t === 'વિવર્તન' || t === 'વિવર્તનમ') && (c === 'વિવર્તન' || c === 'વિવર્તનમ')) return true;
  if (t === 'we the readers' && c === 'we the readers') return true;
  return false;
};

export const computeCategoryTabsData = (articles: Article[]): CategoryTabsResult => {
  const totalCount = articles.length;

  // User's core priority categories
  const priorityCategories = [
    { id: 'વિવર્તન', label: 'વિવર્તન' },
    { id: 'વિસ્મય', label: 'વિસ્મય' },
    { id: 'રાજુલા', label: 'રાજુલા' },
    { id: 'We the readers', label: 'We the readers' },
  ];

  const rawCounts = new Map<string, number>();
  const originalNameMap = new Map<string, string>();

  articles.forEach((art) => {
    let rawCat = (art.category || '').trim();
    if (!rawCat) return;

    if (REMOVED_LEGACY_CATEGORIES.has(rawCat) || rawCat === 'અન્ય' || rawCat === 'સામાન્ય') {
      return;
    }

    let key = rawCat.toLowerCase();
    if (key === 'વિવર્તનમ') {
      key = 'વિવર્તન';
      rawCat = 'વિવર્તન';
    }
    if (key === 'we the readers') {
      key = 'we the readers';
      rawCat = 'We the readers';
    }

    rawCounts.set(key, (rawCounts.get(key) || 0) + 1);
    if (!originalNameMap.has(key)) {
      originalNameMap.set(key, rawCat);
    }
  });

  const candidateMap = new Map<string, { id: string; label: string; count: number }>();

  // 1. Core priority categories (kept even if count is low)
  priorityCategories.forEach((p) => {
    let count = 0;
    articles.forEach((art) => {
      if (matchCategory(p.id, art.category || '')) {
        count++;
      }
    });
    if (count > 0 || totalCount < 10) {
      candidateMap.set(p.id.toLowerCase(), { id: p.id, label: p.label, count });
    }
  });

  // 2. Any other category with substantial articles
  rawCounts.forEach((count, key) => {
    if (candidateMap.has(key)) return;
    if (count >= 5) {
      const label = originalNameMap.get(key) || key;
      candidateMap.set(key, { id: label, label, count });
    }
  });

  const sortedCandidates = Array.from(candidateMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const qualifyingKeys = new Set(sortedCandidates.map((c) => c.id));

  let otherCount = 0;
  articles.forEach((art) => {
    const cat = (art.category || '').trim();
    let matched = false;
    for (const qId of qualifyingKeys) {
      if (matchCategory(qId, cat)) {
        matched = true;
        break;
      }
    }
    if (!matched) {
      otherCount++;
    }
  });

  const tabs: CategoryTabItem[] = [
    { id: 'ALL', label: 'ALL', count: totalCount },
    ...sortedCandidates,
    { id: 'અન્ય', label: 'અન્ય', count: otherCount },
  ];

  return { tabs, qualifyingKeys, totalArticles: totalCount, matchCategory };
};

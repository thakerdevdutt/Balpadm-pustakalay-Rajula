import { WeeklyIssue, Article } from '../types';

export function getArticleTimestamp(id: string): number {
  const match = (id || '').match(/art-(\d+)/);
  if (match) {
    const val = parseInt(match[1], 10);
    // Real timestamps are millisecond epochs (> 10 billion)
    if (val > 10000000000) return val;
  }
  return 0;
}

export function compareArticlesStrict(a: { id: string; orderIndex?: number }, b: { id: string; orderIndex?: number }): number {
  const tsA = getArticleTimestamp(a.id);
  const tsB = getArticleTimestamp(b.id);

  // 1. Immutable Creation Order:
  // Every user article ID has its creation timestamp (art-1789...).
  // Newer articles stay at top, older stay at bottom.
  // Editing an article NEVER changes its ID/creation timestamp, so its position NEVER moves!
  if (tsA > 0 && tsB > 0) {
    if (tsA !== tsB) return tsB - tsA;
    return a.id.localeCompare(b.id);
  }

  // 2. Real timestamped articles always come before dummy sample templates
  if (tsA > 0 && tsB === 0) return -1;
  if (tsA === 0 && tsB > 0) return 1;

  // 3. Fallback for sample templates without millisecond timestamps (e.g. art-vismay-01)
  const ordA = a.orderIndex !== undefined && a.orderIndex !== null ? a.orderIndex : 999999;
  const ordB = b.orderIndex !== undefined && b.orderIndex !== null ? b.orderIndex : 999999;
  if (ordA !== ordB) return ordA - ordB;

  return a.id.localeCompare(b.id);
}

export const DELETED_ARTICLES_STORAGE_KEY = 'lekh_sangrah_deleted_article_ids';

export function getDeletedArticleIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_ARTICLES_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function addDeletedArticleId(id: string): void {
  try {
    const current = getDeletedArticleIds();
    current.add(id);
    localStorage.setItem(DELETED_ARTICLES_STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch {
    // ignore
  }
}

export function syncDeletedArticleIds(idsFromCloud: string[]): Set<string> {
  try {
    const current = getDeletedArticleIds();
    let changed = false;
    idsFromCloud.forEach((id) => {
      if (!current.has(id)) {
        current.add(id);
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(DELETED_ARTICLES_STORAGE_KEY, JSON.stringify(Array.from(current)));
    }
    return current;
  } catch {
    return getDeletedArticleIds();
  }
}

export function removeDeletedArticleId(id: string): void {
  try {
    const current = getDeletedArticleIds();
    if (current.has(id)) {
      current.delete(id);
      localStorage.setItem(DELETED_ARTICLES_STORAGE_KEY, JSON.stringify(Array.from(current)));
    }
  } catch {
    // ignore
  }
}

const DUMMY_SAMPLE_IDS = new Set(['art-301', 'art-302', 'art-303', 'art-304', 'art-305']);

/**
 * Safely merges local issues with cloud issues in a 100% PURE manner.
 * Strictly free of side-effects: NEVER performs network writes or mutations.
 * Guarantees that:
 * 1. Any locally created article that hasn't synced to the cloud yet is NEVER erased.
 * 2. Deleted articles are never brought back from the cloud.
 * 3. Cloud articles take precedence unless a strictly newer local edit timestamp exists.
 * 4. Dummy sample articles do not contaminate real user articles from cloud.
 */
export function mergeIssuesSafely(
  localIssues: WeeklyIssue[],
  cloudIssues: WeeklyIssue[],
  deletedIds: Set<string>
): WeeklyIssue[] {
  if (!cloudIssues || cloudIssues.length === 0) {
    if (!localIssues || localIssues.length === 0) return [];
    return localIssues.map(li => ({
      ...li,
      articles: (li.articles || []).filter(a => !deletedIds.has(a.id)),
    }));
  }

  if (!localIssues || localIssues.length === 0) {
    // Filter out any locally deleted articles from cloud issues
    return cloudIssues.map(ci => ({
      ...ci,
      articles: (ci.articles || []).filter(a => !deletedIds.has(a.id)),
    }));
  }

  const cloudMap = new Map<string, WeeklyIssue>();
  cloudIssues.forEach(ci => cloudMap.set(ci.id, ci));

  const result: WeeklyIssue[] = [];
  const processedArticleIds = new Set<string>();

  for (const cIssue of cloudIssues) {
    // Find matching local issue by id, or fallback to first local issue if there is only one
    const lIssue = localIssues.find(li => li.id === cIssue.id) || (localIssues.length === 1 ? localIssues[0] : undefined);

    const cloudArticleMap = new Map<string, Article>();
    (cIssue.articles || []).forEach(a => {
      if (!deletedIds.has(a.id)) {
        cloudArticleMap.set(a.id, a);
      }
    });

    const hasRealCloudArticles = cloudArticleMap.size > 0;

    // Check for any local articles that are NOT in cloud yet and NOT deleted
    const unsyncedArticles: Article[] = [];
    if (lIssue && lIssue.articles) {
      lIssue.articles.forEach(localArt => {
        if (deletedIds.has(localArt.id)) return;
        // Ignore dummy sample articles if cloud already has real articles
        if (hasRealCloudArticles && DUMMY_SAMPLE_IDS.has(localArt.id)) return;

        if (!cloudArticleMap.has(localArt.id)) {
          // Cross-PC delete sync: If this article was previously saved in the cloud (isSavedInCloud === true)
          // or marked deleted, and the cloud has real articles but does NOT have this article:
          // it means it was DELETED from another PC! Do NOT resurrect it!
          if (hasRealCloudArticles && (localArt.isSavedInCloud === true || localArt.isDeleted === true)) {
            addDeletedArticleId(localArt.id);
            deletedIds.add(localArt.id);
            return;
          }

          // Keep brand-new offline user-created local drafts in local state safely
          unsyncedArticles.push(localArt);
          processedArticleIds.add(localArt.id);
        } else {
          // Both local and cloud have this article.
          // Cloud Firestore is the primary multi-device source of truth.
          const cloudArt = cloudArticleMap.get(localArt.id)!;
          const isPendingLocalOnlyEdit = localArt.isSavedInCloud === false && (localArt.updatedAt || 0) > (cloudArt.updatedAt || 0);

          if (isPendingLocalOnlyEdit) {
            cloudArticleMap.set(localArt.id, {
              ...cloudArt,
              ...localArt,
              // Cloud Firestore is the absolute authority for security & protection:
              // Stale phone cache can NEVER remove protection if Cloud has it locked!
              isPasswordProtected: Boolean(cloudArt.isPasswordProtected || localArt.isPasswordProtected),
              password: cloudArt.isPasswordProtected ? (cloudArt.password || '') : (localArt.password || ''),
              oneTimePasscodes: Array.isArray(cloudArt.oneTimePasscodes) && cloudArt.oneTimePasscodes.length > 0
                ? cloudArt.oneTimePasscodes
                : (Array.isArray(localArt.oneTimePasscodes) ? localArt.oneTimePasscodes : []),
              copyEnable: cloudArt.copyEnable !== undefined ? Boolean(cloudArt.copyEnable) : (localArt.copyEnable !== undefined ? Boolean(localArt.copyEnable) : true),
              isHidden: cloudArt.isHidden !== undefined ? Boolean(cloudArt.isHidden) : Boolean(localArt.isHidden),
            });
          } else {
            cloudArticleMap.set(localArt.id, {
              ...localArt,
              ...cloudArt,
              // Always guarantee cloud's security flags are strictly applied on all devices
              isPasswordProtected: Boolean(cloudArt.isPasswordProtected),
              password: cloudArt.isPasswordProtected ? (cloudArt.password || '') : '',
              oneTimePasscodes: Array.isArray(cloudArt.oneTimePasscodes) ? cloudArt.oneTimePasscodes : [],
              copyEnable: cloudArt.copyEnable !== undefined ? Boolean(cloudArt.copyEnable) : (localArt.copyEnable !== undefined ? Boolean(localArt.copyEnable) : true),
              isHidden: cloudArt.isHidden !== undefined ? Boolean(cloudArt.isHidden) : Boolean(localArt.isHidden),
              isSavedInCloud: true,
            });
          }
          processedArticleIds.add(localArt.id);
        }
      });
    }

    // Mark cloud article IDs as processed
    cloudArticleMap.forEach((_, id) => processedArticleIds.add(id));

    // Merge: combine unsynced local articles and cloud articles, sorted deterministically
    const mergedArticles = [...unsyncedArticles, ...Array.from(cloudArticleMap.values())];
    mergedArticles.sort(compareArticlesStrict);

    result.push({
      ...cIssue,
      articles: mergedArticles,
    });
  }

  // Check any local issues with different IDs that might have user articles not yet in result
  if (!cloudIssues.some(ci => (ci.articles || []).length > 0)) {
    for (const lIssue of localIssues) {
      if (!cloudMap.has(lIssue.id) && lIssue.articles && lIssue.articles.length > 0) {
        const leftoverArticles = lIssue.articles.filter(
          a => !deletedIds.has(a.id) && !DUMMY_SAMPLE_IDS.has(a.id) && !processedArticleIds.has(a.id)
        );
        if (leftoverArticles.length > 0 && result.length > 0) {
          result[0].articles = [...leftoverArticles, ...result[0].articles];
          leftoverArticles.forEach(art => processedArticleIds.add(art.id));
        }
      }
    }
  }

  return result;
}

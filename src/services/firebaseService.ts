import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  writeBatch, 
  arrayUnion, 
  arrayRemove, 
  updateDoc, 
  increment,
  disableNetwork,
  query,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { WeeklyIssue, Article } from '../types';
import { 
  cleanAndNormalizeCode, 
  generateSmartArticleOtp, 
  verifySmartArticleOtp, 
  burnOtpLocally, 
  isOtpBurnedLocally 
} from './otpService';
import { getDeletedArticleIds, syncDeletedArticleIds, mergeIssuesSafely } from '../utils/storage';

const ISSUES_COLLECTION = 'weekly_issues';
const ARTICLES_COLLECTION = 'articles';

interface FirestoreArticleDoc extends Article {
  issueId: string;
  orderIndex?: number;
}

interface FirestoreIssueMetadata {
  id: string;
  issueNumber: number;
  date: string;
  themeTitle: string;
  themeDescription?: string;
  coverImage?: string;
}

// In-memory cache of confirmed Cloud Firestore article IDs
const confirmedCloudArticleIds = new Set<string>();
const cloudIdListeners = new Set<(idsSet: Set<string>) => void>();

export function isArticleInCloud(articleId: string): boolean {
  return confirmedCloudArticleIds.has(articleId);
}

const QUOTA_STORAGE_KEY = 'lekh_firestore_quota_exceeded';

function checkStoredQuotaExceeded(): boolean {
  try {
    const val = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(QUOTA_STORAGE_KEY) : null;
    if (val) {
      const time = parseInt(val, 10);
      // Cache quota limit for only 5 minutes so it auto-recovers as soon as reset occurs
      if (!isNaN(time) && Date.now() - time < 5 * 60 * 1000) {
        return true;
      } else if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(QUOTA_STORAGE_KEY);
      }
    }
  } catch {}
  return false;
}

let quotaExceededDetected = checkStoredQuotaExceeded();

export function hasQuotaExceeded(): boolean {
  if (quotaExceededDetected) {
    // Verify if 5-minute cooldown has expired
    try {
      if (typeof sessionStorage !== 'undefined') {
        const stored = sessionStorage.getItem(QUOTA_STORAGE_KEY);
        if (stored) {
          const ts = parseInt(stored, 10);
          if (Date.now() - ts < 5 * 60 * 1000) {
            return true;
          } else {
            sessionStorage.removeItem(QUOTA_STORAGE_KEY);
            quotaExceededDetected = false;
            return false;
          }
        }
      }
    } catch {}
    quotaExceededDetected = false;
    return false;
  }
  return false;
}

export function clearQuotaExceeded(): void {
  quotaExceededDetected = false;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(QUOTA_STORAGE_KEY);
    }
  } catch {}
}

export function markQuotaExceeded(): void {
  quotaExceededDetected = true;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(QUOTA_STORAGE_KEY, Date.now().toString());
    }
  } catch {}
}

export function isQuotaExceededError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || error).toLowerCase();
  const code = String(error.code || '').toLowerCase();
  // Strictly detect real Firebase resource exhaustion, NOT transient network timeouts
  const matched =
    code.includes('resource-exhausted') ||
    code.includes('quota-exceeded') ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('free daily write units');
  if (matched) {
    markQuotaExceeded();
  }
  return matched;
}

/**
 * Convert a Firebase/Firestore error into a clear, actionable Gujarati message that includes the real error code.
 */
export function describeCloudError(error: any): string {
  const code = String(error?.code || '').replace('firestore/', '');
  const raw = String(error?.message || error || '');
  if (code === 'permission-denied' || /missing or insufficient permissions|permission/i.test(raw)) {
    return 'Firebase Rules એ Cloud માં લખવાની પરવાનગી નકારી [permission-denied]. Firebase Console → Firestore → Rules તપાસો (Rules ની તારીખ પૂરી થઈ ગઈ હોઈ શકે).';
  }
  if (code === 'resource-exhausted' || /quota/i.test(raw)) {
    return 'Firebase નો દૈનિક Quota પૂરો થયો છે [resource-exhausted]. Firebase Console → Firestore → Usage તપાસો.';
  }
  if (/timeout/i.test(raw)) {
    return 'ઇન્ટરનેટ ધીમું હોવાથી Cloud એ સમયસર જવાબ ન આપ્યો [timeout]. આ ટૅબ બંધ/રિફ્રેશ ન કરો, નેટ આવતા જ સેવ થશે.';
  }
  if (code === 'unavailable' || code === 'failed-precondition' || /offline|network|unavailable/i.test(raw)) {
    return `Cloud સાથે કનેક્શન થતું નથી [${code || 'network'}]. ઇન્ટરનેટ તપાસો.`;
  }
  return `Cloud error [${code || 'unknown'}]: ${raw}`;
}

function notifyCloudIdListeners() {
  const currentSet = new Set(confirmedCloudArticleIds);
  cloudIdListeners.forEach((listener) => {
    try {
      listener(currentSet);
    } catch {}
  });
}

export function subscribeToCloudArticleIds(onUpdate: (idsSet: Set<string>) => void) {
  cloudIdListeners.add(onUpdate);
  // Send current set immediately
  onUpdate(new Set(confirmedCloudArticleIds));

  return () => {
    cloudIdListeners.delete(onUpdate);
  };
}

/**
 * Remove any undefined values from objects before writing to Firestore.
 * Firestore strictly rejects documents that contain undefined properties.
 */
function cleanForFirestore(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = cleanForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Reassemble issues with their articles
 */
function assembleIssues(
  issueMetaList: FirestoreIssueMetadata[],
  articleList: FirestoreArticleDoc[]
): WeeklyIssue[] {
  // If no issues defined yet, create default
  if (issueMetaList.length === 0 && articleList.length > 0) {
    return [{
      id: 'collection-main',
      issueNumber: 1,
      date: new Date().toISOString().split('T')[0],
      themeTitle: 'સંપૂર્ણ લેખ સંગ્રહ',
      themeDescription: 'ગુજરાતી સાહિત્ય, લેખો અને વાર્તાઓ',
      articles: articleList,
    }];
  }

  // Group articles by issueId
  const articlesByIssue: Record<string, Article[]> = {};
  articleList.forEach((art) => {
    const issueId = art.issueId || issueMetaList[0]?.id || 'collection-main';
    if (!articlesByIssue[issueId]) {
      articlesByIssue[issueId] = [];
    }
    const cleanArt: Article = { ...art };
    delete (cleanArt as any).issueId;
    delete (cleanArt as any).orderIndex;
    articlesByIssue[issueId].push(cleanArt);
  });

  return issueMetaList.map((meta) => ({
    ...meta,
    articles: articlesByIssue[meta.id] || [],
  })).sort((a, b) => (b.issueNumber || 0) - (a.issueNumber || 0));
}

/**
 * Updates the cloud version timestamp in system_meta/sync_version.
 * This notifies all other client instances that an update occurred,
 * while allowing them to use local cache (0 reads) when no updates exist.
 */
export async function touchCloudSyncVersion(totalArticles?: number): Promise<void> {
  if (hasQuotaExceeded()) return;
  try {
    const now = Date.now();
    const versionRef = doc(db, 'system_meta', 'sync_version');
    const payload: any = {
      lastModified: now,
      updatedAt: new Date().toISOString(),
    };
    if (typeof totalArticles === 'number' && totalArticles > 0) {
      payload.totalArticles = totalArticles;
    }
    await setDoc(versionRef, payload, { merge: true });
    try {
      localStorage.setItem('lekh_sangrah_cached_version', String(now));
      localStorage.setItem('lekh_sangrah_last_sync_check', String(now));
    } catch {}
  } catch (e) {
    if (isQuotaExceededError(e)) markQuotaExceeded();
  }
}

/**
 * Lightweight check to verify if the local device is already up-to-date with Cloud Firestore.
 * Costs only 1 single read! Prevents redownloading 200+ articles if already updated.
 */
export async function checkCloudSyncStatus(localArticleCount: number): Promise<{
  isUpToDate: boolean;
  cloudArticleCount?: number;
  cloudVersion?: number;
}> {
  if (hasQuotaExceeded()) {
    return { isUpToDate: true };
  }
  try {
    const versionRef = doc(db, 'system_meta', 'sync_version');
    const versionSnap = await getDoc(versionRef);
    if (!versionSnap.exists()) {
      return { isUpToDate: false };
    }
    const data = versionSnap.data();
    const cloudVersion = Number(data?.lastModified || 0);
    const cloudTotalArticles = Number(data?.totalArticles || 0);

    const cachedVersionStr = typeof localStorage !== 'undefined' ? localStorage.getItem('lekh_sangrah_cached_version') : null;
    const cachedVersion = cachedVersionStr ? parseInt(cachedVersionStr, 10) : 0;

    // If device has full articles (> 3) and local cached version is greater than or equal to cloud version:
    if (localArticleCount > 3 && cloudVersion > 0 && cloudVersion <= cachedVersion) {
      return { isUpToDate: true, cloudArticleCount: cloudTotalArticles || localArticleCount, cloudVersion };
    }

    // If cloud knows totalArticles and local has at least that many and cached recently
    if (localArticleCount > 3 && cloudTotalArticles > 0 && localArticleCount >= cloudTotalArticles) {
      return { isUpToDate: true, cloudArticleCount: cloudTotalArticles, cloudVersion };
    }

    return { isUpToDate: false, cloudArticleCount: cloudTotalArticles, cloudVersion };
  } catch (err) {
    console.warn('checkCloudSyncStatus check error:', err);
    return { isUpToDate: false };
  }
}

/**
 * Force fetch all issues and articles from Cloud Firestore,
 * bypassing any local cache timestamps, and update the cache.
 */
export async function forceSyncIssuesFromCloud(): Promise<WeeklyIssue[]> {
  if (hasQuotaExceeded()) {
    throw new Error('Firebase દૈનિક ક્વોટા પૂરો થયો છે. સ્થાનિક ડેટા સુરક્ષિત છે.');
  }
  const freshIssues = await fetchIssuesFromCloud();
  if (freshIssues && freshIssues.length > 0) {
    let currentLocal: WeeklyIssue[] = [];
    try {
      const raw = localStorage.getItem('lekh_sangrah_issues');
      if (raw) currentLocal = JSON.parse(raw);
    } catch {}

    const merged = mergeIssuesSafely(currentLocal, freshIssues, getDeletedArticleIds());
    const now = Date.now();
    try {
      localStorage.setItem('lekh_sangrah_issues', JSON.stringify(merged));
      localStorage.setItem('lekh_sangrah_cached_version', String(now));
      localStorage.setItem('lekh_sangrah_last_sync_check', String(now));
    } catch {}
    return merged;
  }
  return [];
}

/**
 * Merges delta (newly modified/added) articles and deletes into local issues.
 * Only modified or newly added articles are updated; all other articles remain untouched.
 */
export function applyDeltaToLocalIssues(
  currentIssues: WeeklyIssue[],
  deltaArticles: Article[],
  deletedIds: string[]
): WeeklyIssue[] {
  const deletedSet = new Set(deletedIds);
  // Add any delta article marked with isDeleted: true into deletedSet
  deltaArticles.forEach((art) => {
    if (art.isDeleted) {
      deletedSet.add(art.id);
    }
  });

  const deltaMap = new Map<string, Article>();
  deltaArticles.forEach((art) => {
    if (!art.isDeleted && !deletedSet.has(art.id)) {
      deltaMap.set(art.id, art);
    }
  });

  if (deltaMap.size === 0 && deletedSet.size === 0) {
    return currentIssues;
  }

  const updatedIssues = currentIssues.map((issue) => {
    let issueArticles = (issue.articles || []).filter((a) => !deletedSet.has(a.id));

    issueArticles = issueArticles.map((art) => {
      if (deltaMap.has(art.id)) {
        const fresh = deltaMap.get(art.id)!;
        deltaMap.delete(art.id);
        return {
          ...art,
          ...fresh,
          // Preserve original orderIndex so editing never causes article to jump to the top
          orderIndex: art.orderIndex !== undefined ? art.orderIndex : fresh.orderIndex,
          isPasswordProtected: Boolean(fresh.isPasswordProtected),
          password: fresh.isPasswordProtected ? (fresh.password || '') : '',
          oneTimePasscodes: Array.isArray(fresh.oneTimePasscodes) ? fresh.oneTimePasscodes : [],
          copyEnable: fresh.copyEnable !== undefined ? Boolean(fresh.copyEnable) : (art.copyEnable !== undefined ? Boolean(art.copyEnable) : true),
          isHidden: fresh.isHidden !== undefined ? Boolean(fresh.isHidden) : Boolean(art.isHidden),
          isSavedInCloud: true,
        };
      }
      return art;
    });

    return {
      ...issue,
      articles: issueArticles,
    };
  });

  // Any remaining delta articles are brand new articles! Add them to the top of their issue
  if (deltaMap.size > 0 && updatedIssues.length > 0) {
    deltaMap.forEach((newArt) => {
      const targetIssueId = (newArt as any).issueId || updatedIssues[0].id;
      let targetIssue = updatedIssues.find((iss) => iss.id === targetIssueId) || updatedIssues[0];
      if (targetIssue) {
        if (!targetIssue.articles) targetIssue.articles = [];
        // Insert new article at the top
        targetIssue.articles.unshift(newArt);
      }
    });
  }

  // Preserve existing articles order in place without shuffling edited articles to the top
  return updatedIssues;
}

/**
 * Query Firestore for ONLY articles where updatedAt > sinceTimestamp.
 * This reads only the specific documents that changed, consuming minimal reads.
 */
export async function fetchDeltaArticlesFromCloud(sinceTimestamp: number): Promise<Article[]> {
  if (hasQuotaExceeded()) return [];
  try {
    const q = query(
      collection(db, ARTICLES_COLLECTION),
      where('updatedAt', '>', sinceTimestamp)
    );
    const snap = await getDocs(q);
    const results: Article[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as FirestoreArticleDoc;
      results.push({
        ...data,
        id: docSnap.id,
      });
    });
    return results;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
      return [];
    }
    console.warn('Delta articles fetch warning (continuing with cached data):', error);
    return [];
  }
}

/**
 * Cache-First synchronization for all issues and articles with INCREMENTAL DELTA SYNC:
 * 1. Instantly loads and renders 200+ articles from LocalStorage (0 reads, 0ms latency).
 * 2. Checks a single lightweight version document (1 read instead of 200 reads).
 * 3. If versions match: ZERO article reads! Local cache remains active.
 * 4. If version is newer: Performs INCREMENTAL DELTA SYNC fetching ONLY modified articles
 *    via `where("updatedAt", ">", cachedVersion)`. (1-2 reads instead of 200 reads!)
 * 5. Automatically detects multi-device modifications on window focus or 60s live poll.
 */
export function subscribeToIssues(
  onData: (issues: WeeklyIssue[]) => void,
  onError?: (error: Error) => void
): () => void {
  let isCancelled = false;

  // 1. Immediately emit local cache if available (0 Firestore reads)
  try {
    const raw = localStorage.getItem('lekh_sangrah_issues');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const deletedIds = getDeletedArticleIds();
        const filtered = parsed.map((iss: WeeklyIssue) => ({
          ...iss,
          articles: (iss.articles || []).filter((a: Article) => !deletedIds.has(a.id)),
        }));
        if (filtered.some((iss: WeeklyIssue) => (iss.articles || []).length > 0)) {
          onData(filtered);
        }
      }
    }
  } catch (e) {
    console.warn('Could not read initial local cache:', e);
  }

  // 2. If quota is exceeded, do not attempt cloud operations
  if (hasQuotaExceeded()) {
    return () => {};
  }

  // 3. Multi-tab synchronization without network calls
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'lekh_sangrah_issues' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onData(parsed);
        }
      } catch {}
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageChange);
  }

  // 4. Smart Cache-First + Incremental Delta Cloud Sync Check
  const checkCloudAndSync = async () => {
    if (isCancelled || hasQuotaExceeded()) return;
    try {
      const now = Date.now();
      const lastCheck = Number(localStorage.getItem('lekh_sangrah_last_sync_check') || '0');
      const cachedVersion = Number(localStorage.getItem('lekh_sangrah_cached_version') || '0');
      const hasLocalData = Boolean(localStorage.getItem('lekh_sangrah_issues'));

      // If the user arrived via a direct link to read a single article, do NOT download the full collection
      const isDirectArticleLink = typeof window !== 'undefined' && Boolean(new URLSearchParams(window.location.search).get('article'));
      if (isDirectArticleLink && !hasLocalData) {
        return;
      }

      // Throttle network checks to at least 30 seconds apart
      if (hasLocalData && cachedVersion > 0 && (now - lastCheck < 30 * 1000)) {
        return;
      }

      // Check single lightweight document: system_meta/sync_version (1 read!)
      const versionRef = doc(db, 'system_meta', 'sync_version');
      const versionSnap = await getDoc(versionRef);
      if (isCancelled) return;

      let cloudVersion = 0;
      if (versionSnap.exists()) {
        cloudVersion = Number(versionSnap.data()?.lastModified || 0);
      }

      // If cloud version matches local version and we have local articles:
      // ZERO article reads needed! Local cache is 100% current!
      if (cloudVersion > 0 && cloudVersion <= cachedVersion && hasLocalData) {
        try {
          localStorage.setItem('lekh_sangrah_last_sync_check', String(now));
        } catch {}
        return;
      }

      // INCREMENTAL DELTA SYNC:
      // If we already have local data and a previous sync version,
      // fetch ONLY the articles modified after cachedVersion!
      if (hasLocalData && cachedVersion > 0) {
        const [deltaArticles, deletedIds] = await Promise.all([
          fetchDeltaArticlesFromCloud(cachedVersion),
          fetchCloudDeletedArticleIds(),
        ]);
        if (isCancelled) return;

        // Persist cloud deletions into this device's localStorage so local deletedIds is always updated
        const allDeletedIds = new Set<string>(deletedIds || []);
        deltaArticles.forEach((art) => {
          if (art.isDeleted) {
            allDeletedIds.add(art.id);
          }
        });
        if (allDeletedIds.size > 0) {
          syncDeletedArticleIds(Array.from(allDeletedIds));
        }

        let currentLocal: WeeklyIssue[] = [];
        try {
          const raw = localStorage.getItem('lekh_sangrah_issues');
          if (raw) currentLocal = JSON.parse(raw);
        } catch {}

        const updated = applyDeltaToLocalIssues(currentLocal, deltaArticles, Array.from(allDeletedIds));

        try {
          localStorage.setItem('lekh_sangrah_issues', JSON.stringify(updated));
          localStorage.setItem('lekh_sangrah_cached_version', String(cloudVersion || now));
          localStorage.setItem('lekh_sangrah_last_sync_check', String(now));
        } catch {}

        onData(updated);
        return;
      }

      // First time visiting on this device (no local data): fetch full collection once
      const cloudIssues = await fetchIssuesFromCloud();
      if (isCancelled) return;

      if (cloudIssues && cloudIssues.length > 0) {
        let currentLocal: WeeklyIssue[] = [];
        try {
          const raw = localStorage.getItem('lekh_sangrah_issues');
          if (raw) currentLocal = JSON.parse(raw);
        } catch {}

        const merged = mergeIssuesSafely(currentLocal, cloudIssues, getDeletedArticleIds());

        try {
          localStorage.setItem('lekh_sangrah_issues', JSON.stringify(merged));
          localStorage.setItem('lekh_sangrah_cached_version', String(cloudVersion || now));
          localStorage.setItem('lekh_sangrah_last_sync_check', String(now));
        } catch {}

        onData(merged);
      }
    } catch (err: any) {
      if (isQuotaExceededError(err)) {
        markQuotaExceeded();
      } else {
        console.warn('Cloud sync check notice (continuing with local cache):', err);
      }
      if (onError) onError(err);
    }
  };

  // Perform background sync check immediately
  checkCloudAndSync();

  // 5. Automatic live sync when user returns to the tab or every 60s
  const handleFocus = () => {
    checkCloudAndSync();
  };
  const handleVisibility = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      checkCloudAndSync();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleVisibility);
  }
  const syncInterval = setInterval(checkCloudAndSync, 60 * 1000);

  return () => {
    isCancelled = true;
    clearInterval(syncInterval);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleVisibility);
    }
  };
}

/**
 * Fetch deleted article IDs recorded in cloud tombstones
 */
export async function fetchCloudDeletedArticleIds(): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, 'system_meta', 'deleted_articles'));
    if (snap.exists()) {
      const data = snap.data();
      return Array.isArray(data.ids) ? data.ids : [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetch all issues once from Cloud Firestore
 */
export async function fetchIssuesFromCloud(): Promise<WeeklyIssue[]> {
  try {
    const [issuesSnap, articlesSnap, deletedIds] = await Promise.all([
      getDocs(collection(db, ISSUES_COLLECTION)),
      getDocs(collection(db, ARTICLES_COLLECTION)),
      fetchCloudDeletedArticleIds(),
    ]);

    if (deletedIds && deletedIds.length > 0) {
      syncDeletedArticleIds(deletedIds);
    }

    const deletedSet = new Set(deletedIds);

    const metaList: FirestoreIssueMetadata[] = [];
    issuesSnap.forEach((docSnap) => {
      const data = docSnap.data();
      metaList.push({
        id: docSnap.id,
        issueNumber: data.issueNumber ?? 1,
        date: data.date ?? '',
        themeTitle: data.themeTitle ?? 'લેખ સંગ્રહ',
        themeDescription: data.themeDescription ?? '',
        coverImage: data.coverImage ?? '',
      });
    });

    const articlesList: FirestoreArticleDoc[] = [];
    articlesSnap.forEach((docSnap) => {
      if (deletedSet.has(docSnap.id)) return;
      const data = docSnap.data() as FirestoreArticleDoc;
      if (data.isDeleted) {
        deletedSet.add(docSnap.id);
        return;
      }
      articlesList.push({
        ...data,
        id: docSnap.id,
        isSavedInCloud: true,
      });
    });
    articlesList.sort(compareArticlesStrict);

    return assembleIssues(metaList, articlesList);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return [];
    }
    console.error('Error fetching issues from cloud:', error);
    throw error;
  }
}

/**
 * Fetch a single article by ID directly from Cloud Firestore
 */
export async function fetchSingleArticleFromCloud(articleId: string): Promise<Article | null> {
  try {
    const artSnap = await getDoc(doc(db, ARTICLES_COLLECTION, articleId));
    if (artSnap.exists()) {
      const data = artSnap.data() as FirestoreArticleDoc;
      return {
        ...data,
        id: artSnap.id,
      };
    }

    // Fallback: check issues collection if article was stored in legacy array format
    const issuesSnap = await getDocs(collection(db, ISSUES_COLLECTION));
    for (const docSnap of issuesSnap.docs) {
      const data = docSnap.data();
      if (Array.isArray(data.articles)) {
        const found = data.articles.find((a: any) => a.id === articleId);
        if (found) return found;
      }
    }

    return null;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return null;
    }
    console.error('Error fetching single article from cloud:', error);
    return null;
  }
}

/**
 * Helper to extract creation timestamp from an article ID (e.g. "art-1789144654168")
 */
export function getArticleTimestamp(id: string): number {
  const match = (id || '').match(/art-(\d+)/);
  if (match) {
    const val = parseInt(match[1], 10);
    // Real timestamps are millisecond epochs (> 10 billion)
    if (val > 10000000000) return val;
  }
  return 0;
}

/**
 * Compare two articles to maintain strict immutable order:
 * 1. Articles with creation timestamps (art-{timestamp}) are strictly and permanently ordered by creation date (newest first, oldest last).
 *    Editing an article NEVER changes its creation timestamp/ID, so its position NEVER moves!
 * 2. Real timestamped articles always come before sample templates without timestamps.
 * 3. Fallback for sample templates without millisecond timestamps.
 */
export function compareArticlesStrict(a: { id: string; orderIndex?: number }, b: { id: string; orderIndex?: number }): number {
  const tsA = getArticleTimestamp(a.id);
  const tsB = getArticleTimestamp(b.id);

  // 1. Immutable Creation Order:
  if (tsA > 0 && tsB > 0) {
    if (tsA !== tsB) return tsB - tsA; // Newest timestamp at the top, oldest at the bottom
    return a.id.localeCompare(b.id);
  }

  // 2. Real timestamped articles always come before dummy sample templates
  if (tsA > 0 && tsB === 0) return -1;
  if (tsA === 0 && tsB > 0) return 1;

  // 3. Fallback for sample templates without millisecond timestamps
  const ordA = a.orderIndex !== undefined && a.orderIndex !== null ? a.orderIndex : 999999;
  const ordB = b.orderIndex !== undefined && b.orderIndex !== null ? b.orderIndex : 999999;
  if (ordA !== ordB) return ordA - ordB;

  return a.id.localeCompare(b.id);
}

export async function saveBatchOfArticlesToCloud(
  items: { issueId: string; article: Article; explicitOrderIndex?: number }[]
): Promise<string[]> {
  if (!items || items.length === 0) return [];
  const chunkSize = 25;
  const savedIds: string[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    chunk.forEach((item, idx) => {
      const artDocRef = doc(db, ARTICLES_COLLECTION, item.article.id);
      const finalOrderIndex = item.explicitOrderIndex !== undefined ? item.explicitOrderIndex : item.article.orderIndex;
      const artData: Partial<FirestoreArticleDoc> = {
        ...item.article,
        issueId: item.issueId,
        updatedAt: typeof item.article.updatedAt === 'number' && item.article.updatedAt > 0 ? item.article.updatedAt : Date.now(),
      };
      if (finalOrderIndex !== undefined) {
        artData.orderIndex = finalOrderIndex;
      }
      batch.set(artDocRef, cleanForFirestore(artData), { merge: true });
    });

    try {
      await Promise.race([
        batch.commit(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Batch commit timeout')), 15000)),
      ]);
      chunk.forEach((c) => savedIds.push(c.article.id));
    } catch (batchErr: any) {
      if (isQuotaExceededError(batchErr)) {
        markQuotaExceeded();
        break; // Stop immediately; do not spam Firebase with parallel retries
      }
      console.warn('Batch commit failed (articles preserved locally):', batchErr);
    }
  }

  if (savedIds.length > 0) {
    touchCloudSyncVersion().catch(() => {});
  }

  return savedIds;
}

/**
 * Save a single article directly to Firestore
 */
export async function saveSingleArticleToCloud(issueId: string, article: Article, explicitOrderIndex?: number): Promise<void> {
  if (hasQuotaExceeded()) {
    console.warn('Firebase quota currently reached; article safely preserved in local storage.');
    return;
  }
  try {
    const artDocRef = doc(db, ARTICLES_COLLECTION, article.id);
    
    // Determine orderIndex:
    // 1. If explicitly passed, use it
    // 2. If article already has orderIndex, keep it
    // 3. Otherwise leave undefined so merge doesn't overwrite existing Firestore orderIndex
    let finalOrderIndex: number | undefined = explicitOrderIndex !== undefined ? explicitOrderIndex : article.orderIndex;

    const isProt = Boolean(article.isPasswordProtected);
    const pass = isProt && article.password ? article.password.trim() : '';
    const copyEn = Boolean(article.copyEnable);

    const modificationTimestamp = Date.now();
    article.updatedAt = modificationTimestamp;

    const artData: Partial<FirestoreArticleDoc> = {
      ...article,
      issueId,
      isPasswordProtected: isProt,
      password: pass,
      copyEnable: copyEn,
      isSavedInCloud: true,
      updatedAt: modificationTimestamp,
    };
    if (finalOrderIndex !== undefined) {
      artData.orderIndex = finalOrderIndex;
    }

    const cleaned = cleanForFirestore(artData);
    await Promise.race([
      setDoc(artDocRef, cleaned, { merge: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Article save timeout')), 15000)),
    ]);

    // Immediately mark confirmed in Cloud and broadcast to all UI indicators
    if (article.id) {
      confirmedCloudArticleIds.add(article.id);
      notifyCloudIdListeners();
    }
    touchCloudSyncVersion().catch(() => {});
  } catch (error: any) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
      console.warn('Firebase daily quota reached or timed out; article is safely saved locally.');
      return;
    }
    console.warn('Error saving single article to cloud (safely kept in local storage):', error);
    throw new Error(describeCloudError(error));
  }
}

/**
 * Delete a single article from Firestore
 */
export async function deleteArticleFromCloud(articleId: string): Promise<void> {
  if (hasQuotaExceeded()) return;
  try {
    const artDocRef = doc(db, ARTICLES_COLLECTION, articleId);
    const now = Date.now();
    // 1. Mark isDeleted: true with updatedAt so incremental delta sync queries on other active devices pick it up instantly
    try {
      await setDoc(artDocRef, {
        isDeleted: true,
        updatedAt: now,
      }, { merge: true });
    } catch (e) {
      if (isQuotaExceededError(e)) return;
      console.warn('Could not mark article as deleted in cloud:', e);
    }

    // 2. Also record tombstone in system_meta/deleted_articles so all devices recognize this article as deleted
    try {
      const tombstoneRef = doc(db, 'system_meta', 'deleted_articles');
      await setDoc(tombstoneRef, { ids: arrayUnion(articleId) }, { merge: true });
    } catch (e) {
      if (isQuotaExceededError(e)) return;
      console.warn('Could not record cloud tombstone:', e);
    }
    // 3. Await touchCloudSyncVersion so cloud version increments and all other devices detect the deletion!
    await touchCloudSyncVersion();
  } catch (error) {
    if (isQuotaExceededError(error)) return;
    console.error('Error deleting article from cloud:', error);
    throw error;
  }
}

/**
 * Save ONLY issue metadata to Firestore (does NOT rewrite 200+ articles).
 * Used when adding, toggling or editing a single article to avoid queue exhaustion.
 */
export async function saveIssueMetadataToCloud(issue: WeeklyIssue): Promise<void> {
  if (hasQuotaExceeded()) return;
  try {
    const issueMeta: FirestoreIssueMetadata = {
      id: issue.id,
      issueNumber: issue.issueNumber,
      date: issue.date,
      themeTitle: issue.themeTitle,
      themeDescription: issue.themeDescription || '',
      coverImage: issue.coverImage || '',
    };
    await setDoc(doc(db, ISSUES_COLLECTION, issue.id), cleanForFirestore(issueMeta), { merge: true });
    touchCloudSyncVersion().catch(() => {});
  } catch (error) {
    if (isQuotaExceededError(error)) return;
    console.error('Error saving issue metadata to cloud:', error);
    throw error;
  }
}

/**
 * Save or update a single issue and its articles in Firestore
 */
export async function saveIssueToCloud(
  issue: WeeklyIssue,
  onArticleProgress?: (syncedSoFar: number) => void
): Promise<void> {
  if (hasQuotaExceeded()) return;
  try {
    // 1. Save articles in small batches of 15 for lightning-fast commits & to prevent payload limits
    if (issue.articles && issue.articles.length > 0) {
      const chunkSize = 15;
      let completedArticles = 0;

      for (let i = 0; i < issue.articles.length; i += chunkSize) {
        const chunk = issue.articles.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((art, idx) => {
          const artDocRef = doc(db, ARTICLES_COLLECTION, art.id);
          const artData: FirestoreArticleDoc = {
            ...art,
            issueId: issue.id,
            orderIndex: i + idx,
            updatedAt: typeof art.updatedAt === 'number' && art.updatedAt > 0 ? art.updatedAt : Date.now(),
          };
          batch.set(artDocRef, cleanForFirestore(artData), { merge: true });
        });

        // 30-second timeout per batch to avoid hanging on slow/spotty connections
        try {
          await Promise.race([
            batch.commit(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Batch commit timeout')), 30000)),
          ]);
        } catch (batchErr) {
          console.warn('Batch commit failed or timed out, saving chunk individually:', batchErr);
          // Fallback: save individually
          await Promise.all(
            chunk.map((art, idx) => {
              const artDocRef = doc(db, ARTICLES_COLLECTION, art.id);
              const artData: FirestoreArticleDoc = {
                ...art,
                issueId: issue.id,
                orderIndex: i + idx,
                updatedAt: typeof art.updatedAt === 'number' && art.updatedAt > 0 ? art.updatedAt : Date.now(),
              };
              return setDoc(artDocRef, cleanForFirestore(artData), { merge: true }).catch(() => {});
            })
          );
        }

        completedArticles += chunk.length;
        if (onArticleProgress) {
          onArticleProgress(completedArticles);
        }
      }
    }

    // 2. Save issue metadata after articles have been committed
    const issueMeta: FirestoreIssueMetadata = {
      id: issue.id,
      issueNumber: issue.issueNumber,
      date: issue.date,
      themeTitle: issue.themeTitle,
      themeDescription: issue.themeDescription || '',
      coverImage: issue.coverImage || '',
    };
    await Promise.race([
      setDoc(doc(db, ISSUES_COLLECTION, issue.id), cleanForFirestore(issueMeta), { merge: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Issue meta timeout')), 20000)),
    ]).catch((err) => {
      console.warn('Issue metadata save timed out:', err);
    });
    touchCloudSyncVersion().catch(() => {});
  } catch (error) {
    console.error('Error saving issue to cloud:', error);
    throw error;
  }
}

/**
 * Delete an issue and its articles from Firestore
 */
export async function deleteIssueFromCloud(issueId: string): Promise<void> {
  if (hasQuotaExceeded()) return;
  try {
    await deleteDoc(doc(db, ISSUES_COLLECTION, issueId));
    
    // Find all articles with this issueId and delete
    const articlesSnap = await getDocs(collection(db, ARTICLES_COLLECTION));
    const batch = writeBatch(db);
    let count = 0;
    articlesSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.issueId === issueId) {
        batch.delete(docSnap.ref);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
    touchCloudSyncVersion().catch(() => {});
  } catch (error) {
    if (isQuotaExceededError(error)) return;
    console.error('Error deleting issue from cloud:', error);
    throw error;
  }
}

/**
 * Upload/Sync all issues to Firestore in small batches with progress callback
 * Each article is stored in its own document so size limit (1MB) is never exceeded!
 */
export async function saveAllIssuesToCloud(
  issues: WeeklyIssue[],
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  if (hasQuotaExceeded()) {
    throw new Error('ક્લાઉડ ક્વોટા મર્યાદા પૂરી થઈ ગઈ છે.');
  }
  try {
    const totalArticles = issues.reduce((acc, iss) => acc + (iss.articles?.length || 0), 0);
    let overallCompleted = 0;

    for (const issue of issues) {
      let lastReported = 0;
      await saveIssueToCloud(issue, (chunkCompleted) => {
        const delta = chunkCompleted - lastReported;
        lastReported = chunkCompleted;
        overallCompleted += delta;
        if (onProgress) {
          onProgress(overallCompleted, totalArticles);
        }
      });
    }
  } catch (error) {
    console.error('Error syncing all issues to cloud:', error);
    throw error;
  }
}

const METADATA_COLLECTION = 'app_metadata';
const CATEGORIES_DOC_ID = 'custom_categories';
const AUTHORS_DOC_ID = 'custom_authors';

/**
 * Save custom categories to Firestore so they persist across devices, Netlify, and browsers
 */
export async function saveCustomCategoriesToCloud(categories: string[]): Promise<void> {
  try {
    const docRef = doc(db, METADATA_COLLECTION, CATEGORIES_DOC_ID);
    await setDoc(docRef, cleanForFirestore({ list: categories, updatedAt: new Date().toISOString() }), { merge: true });
  } catch (error) {
    console.warn('Error saving custom categories to cloud:', error);
  }
}

/**
 * Load custom categories from Cloud Firestore (optimized single fetch with cache fallback)
 */
export function subscribeToCustomCategories(
  onData: (categories: string[]) => void
): () => void {
  // First, provide local cached categories immediately
  let hasCache = false;
  try {
    const raw = localStorage.getItem('lekh_sangrah_categories');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        onData(parsed);
        hasCache = true;
      }
    }
  } catch {}

  const lastFetch = Number(localStorage.getItem('lekh_categories_last_fetch') || '0');
  const now = Date.now();
  // If cache exists and checked within last 12 hours, do zero network reads!
  if (hasCache && (now - lastFetch < 12 * 60 * 60 * 1000)) {
    return () => {};
  }

  if (hasQuotaExceeded()) return () => {};

  try {
    const docRef = doc(db, METADATA_COLLECTION, CATEGORIES_DOC_ID);
    getDoc(docRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data?.list) && data.list.length > 0) {
            onData(data.list);
            try {
              localStorage.setItem('lekh_sangrah_categories', JSON.stringify(data.list));
              localStorage.setItem('lekh_categories_last_fetch', String(Date.now()));
            } catch {}
          }
        }
      })
      .catch((err) => {
        if (isQuotaExceededError(err)) markQuotaExceeded();
      });
  } catch (e) {
    if (isQuotaExceededError(e)) markQuotaExceeded();
  }

  return () => {};
}

/**
 * Save custom authors to Firestore so they persist across devices, Netlify, and browsers
 */
export async function saveCustomAuthorsToCloud(authors: string[]): Promise<void> {
  if (hasQuotaExceeded()) return;
  try {
    const docRef = doc(db, METADATA_COLLECTION, AUTHORS_DOC_ID);
    await setDoc(docRef, cleanForFirestore({ list: authors, updatedAt: new Date().toISOString() }), { merge: true });
  } catch (error) {
    if (isQuotaExceededError(error)) return;
    console.warn('Error saving custom authors to cloud:', error);
  }
}

/**
 * Load custom authors from Cloud Firestore (optimized single fetch with cache fallback)
 */
export function subscribeToCustomAuthors(
  onData: (authors: string[]) => void
): () => void {
  // First, provide local cached authors immediately
  let hasCache = false;
  try {
    const raw = localStorage.getItem('lekh_sangrah_authors');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        onData(parsed);
        hasCache = true;
      }
    }
  } catch {}

  const lastFetch = Number(localStorage.getItem('lekh_authors_last_fetch') || '0');
  const now = Date.now();
  // If cache exists and checked within last 12 hours, do zero network reads!
  if (hasCache && (now - lastFetch < 12 * 60 * 60 * 1000)) {
    return () => {};
  }

  if (hasQuotaExceeded()) return () => {};

  try {
    const docRef = doc(db, METADATA_COLLECTION, AUTHORS_DOC_ID);
    getDoc(docRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data?.list) && data.list.length > 0) {
            onData(data.list);
            try {
              localStorage.setItem('lekh_sangrah_authors', JSON.stringify(data.list));
              localStorage.setItem('lekh_authors_last_fetch', String(Date.now()));
            } catch {}
          }
        }
      })
      .catch((err) => {
        if (isQuotaExceededError(err)) markQuotaExceeded();
      });
  } catch (e) {
    if (isQuotaExceededError(e)) markQuotaExceeded();
  }

  return () => {};
}

/**
 * Generate a new secure 6-digit One-Time Passcode (OTP) for an article.
 * Uses the Smart Algorithmic generator so it works cross-device without cloud dependency,
 * while also committing to Firestore for multi-device cloud visibility when available.
 */
export async function generateArticleOtpInCloud(articleId: string, customOtp?: string): Promise<{ otp: string; cloudSaved: boolean }> {
  const otp = (customOtp && customOtp.trim()) 
    ? cleanAndNormalizeCode(customOtp) 
    : generateSmartArticleOtp(articleId);

  if (hasQuotaExceeded()) {
    return { otp, cloudSaved: false };
  }

  try {
    const artDocRef = doc(db, ARTICLES_COLLECTION, articleId);
    await Promise.race([
      setDoc(artDocRef, { oneTimePasscodes: arrayUnion(otp) }, { merge: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 15000))
    ]);
    console.log(`[OTP] Generated and saved OTP ${otp} to Firestore for article ${articleId}`);
    return { otp, cloudSaved: true };
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return { otp, cloudSaved: false };
    }
    console.warn('Article OTP cloud sync note (background save continuing):', error);
    return { otp, cloudSaved: false };
  }
}

/**
 * Live verify an entered passcode or OTP directly.
 * 1. Checks if already burned locally.
 * 2. Checks Smart Algorithmic OTP (works across all devices instantly!).
 * 3. Falls back to Cloud Firestore for custom OTPs or cloud passcodes.
 */
export async function verifyAndBurnArticleOtpInCloud(
  articleId: string,
  candidateCode: string
): Promise<{
  success: boolean;
  isPermanentPassword?: boolean;
  isOtp?: boolean;
  burnedOtp?: string;
  error?: string;
}> {
  const cleanInput = cleanAndNormalizeCode(candidateCode);
  if (!cleanInput) {
    return { success: false, error: 'પાસવર્ડ અથવા OTP દાખલ કરો' };
  }

  // 1. Check if already burned locally on this device
  if (isOtpBurnedLocally(articleId, cleanInput)) {
    return { success: false, error: 'આ વન-ટાઈમ OTP પહેલેથી જ વપરાઈ ગયેલો છે!' };
  }

  // 2. Check Smart Algorithmic OTP (Infallible, works on any mobile phone!)
  const smartCheck = verifySmartArticleOtp(articleId, cleanInput);
  if (smartCheck.valid) {
    burnOtpLocally(articleId, cleanInput);
    burnArticleOtpInCloud(articleId, cleanInput).catch(() => {});
    return { success: true, isOtp: true, burnedOtp: cleanInput };
  } else if (smartCheck.reason === 'burned') {
    return { success: false, error: 'આ વન-ટાઈમ OTP પહેલેથી જ વપરાઈ ગયેલો છે!' };
  }

  // 3. If quota is exceeded, don't stall with network timeout
  if (hasQuotaExceeded()) {
    return { success: false, error: 'ખોટો પાસવર્ડ અથવા વપરાઈ ગયેલો/અમાન્ય વન-ટાઈમ OTP!' };
  }

  try {
    const artDocRef = doc(db, ARTICLES_COLLECTION, articleId);
    // Fetch live doc from Firestore with 15-second timeout
    const snap = await Promise.race([
      getDoc(artDocRef),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Cloud verification timeout')), 15000)),
    ]);

    if (!snap.exists()) {
      return { success: false, error: 'લેખ ક્લાઉડમાં મળ્યો નથી' };
    }

    const data = snap.data();

    // 1. Check permanent password from cloud
    if (data.password && typeof data.password === 'string' && cleanAndNormalizeCode(data.password) === cleanInput) {
      return { success: true, isPermanentPassword: true };
    }

    // 2. Check oneTimePasscodes from cloud
    const otps: string[] = Array.isArray(data.oneTimePasscodes) ? data.oneTimePasscodes : [];
    const matchingOtp = otps.find((o) => typeof o === 'string' && cleanAndNormalizeCode(o) === cleanInput);

    if (matchingOtp) {
      burnOtpLocally(articleId, matchingOtp);
      // Burn immediately in Firestore so it can never be used again on any device
      try {
        await Promise.race([
          setDoc(artDocRef, { oneTimePasscodes: arrayRemove(matchingOtp) }, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Burn timeout')), 15000)),
        ]);
        console.log(`[OTP Security] Successfully verified and burned OTP ${matchingOtp} for article ${articleId}`);
      } catch (burnErr) {
        console.warn('Burn OTP in cloud warning (proceeding with unlock):', burnErr);
      }
      return { success: true, isOtp: true, burnedOtp: matchingOtp };
    }

    return { success: false, error: 'ખોટો પાસવર્ડ અથવા વપરાઈ ગયેલો/અમાન્ય વન-ટાઈમ OTP!' };
  } catch (err) {
    if (isQuotaExceededError(err)) {
      return { success: false, error: 'ખોટો પાસવર્ડ અથવા વપરાઈ ગયેલો/અમાન્ય વન-ટાઈમ OTP!' };
    }
    console.warn('Live cloud OTP verification error:', err);
    return { success: false, error: 'ખોટો પાસવર્ડ અથવા વપરાઈ ગયેલો/અમાન્ય વન-ટાઈમ OTP!' };
  }
}

/**
 * Burn (permanently remove) a used One-Time Passcode (OTP) from Firestore & local storage.
 * Ensures the OTP can NEVER be reused or leaked.
 */
export async function burnArticleOtpInCloud(articleId: string, usedOtp: string): Promise<void> {
  const cleanOtp = cleanAndNormalizeCode(usedOtp);
  if (!cleanOtp) return;
  burnOtpLocally(articleId, cleanOtp);
  if (hasQuotaExceeded()) return;

  try {
    const artDocRef = doc(db, ARTICLES_COLLECTION, articleId);
    await Promise.race([
      setDoc(artDocRef, { oneTimePasscodes: arrayRemove(cleanOtp) }, { merge: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 5000))
    ]);
    console.log(`[OTP Security] Successfully burned one-time passcode for article ${articleId}`);
  } catch (error) {
    if (isQuotaExceededError(error)) return;
    console.warn('Error burning article OTP in cloud:', error);
  }
}

/**
 * Manually revoke/delete an unused OTP for an article
 */
export async function removeArticleOtpInCloud(articleId: string, otpToRemove: string): Promise<void> {
  const cleanOtp = otpToRemove.trim();
  if (!cleanOtp) return;
  if (hasQuotaExceeded()) return;

  try {
    const artDocRef = doc(db, ARTICLES_COLLECTION, articleId);
    await Promise.race([
      setDoc(artDocRef, { oneTimePasscodes: arrayRemove(cleanOtp) }, { merge: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 6000))
    ]);
  } catch (error) {
    if (isQuotaExceededError(error)) return;
    console.warn('Error removing article OTP in cloud:', error);
  }
}

/**
 * Manually delete all unused OTPs for an article in cloud
 */
export async function removeAllArticleOtpsInCloud(articleId: string): Promise<void> {
  if (hasQuotaExceeded()) return;
  try {
    const artDocRef = doc(db, ARTICLES_COLLECTION, articleId);
    await Promise.race([
      setDoc(artDocRef, { oneTimePasscodes: [] }, { merge: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 6000))
    ]);
    console.log(`[OTP Security] Cleared all OTPs for article ${articleId}`);
  } catch (error) {
    if (isQuotaExceededError(error)) return;
    console.warn('Error removing all article OTPs in cloud:', error);
  }
}

/**
 * Track site visits and get total visitor count without holding open permanent listeners
 */
export function subscribeToVisitorCount(
  onCount: (count: number) => void
): () => void {
  // 1. Immediately provide cached visitor count from localStorage
  let hasCache = false;
  try {
    const saved = localStorage.getItem('lekh_visitor_count');
    if (saved) {
      onCount(parseInt(saved, 10));
      hasCache = true;
    }
  } catch {}

  const lastFetch = Number(localStorage.getItem('lekh_visitor_count_last_fetch') || '0');
  const now = Date.now();
  // If cache exists and fetched in the last 30 minutes, skip network read!
  if (hasCache && (now - lastFetch < 30 * 60 * 1000)) {
    return () => {};
  }

  if (hasQuotaExceeded()) return () => {};

  // 2. Fetch once with getDoc (served from local IndexedDB cache when possible)
  try {
    const statsRef = doc(db, 'site_analytics', 'general_stats');
    getDoc(statsRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const count = data.totalVisitors || 1;
          onCount(count);
          try {
            localStorage.setItem('lekh_visitor_count', count.toString());
            localStorage.setItem('lekh_visitor_count_last_fetch', String(Date.now()));
          } catch {}
        }
      })
      .catch((err) => {
        if (isQuotaExceededError(err)) markQuotaExceeded();
      });
  } catch (e) {
    if (isQuotaExceededError(e)) markQuotaExceeded();
  }

  return () => {};
}

export async function recordVisitorHit(): Promise<void> {
  if (hasQuotaExceeded()) return;
  try {
    // Only record once per day per browser/device to preserve Firebase Spark tier writes
    const today = new Date().toISOString().slice(0, 10);
    const dayKey = `lekh_visited_${today}`;
    if (localStorage.getItem(dayKey)) {
      return; // Already counted today
    }
    localStorage.setItem(dayKey, '1');
    const statsRef = doc(db, 'site_analytics', 'general_stats');
    await setDoc(statsRef, {
      totalVisitors: increment(1),
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    if (isQuotaExceededError(e)) markQuotaExceeded();
  }
}

/**
 * Subscribe to the Admin Contact Phone number from Cloud Firestore & local cache.
 * Any update by admin is instantly pushed to all readers requesting OTP.
 * Supports primary phone (default: 7878413535) and optional secondary phone.
 */
export function subscribeToAdminContactPhone(
  onPhone: (phone: string, secondaryPhone?: string) => void
): () => void {
  const DEFAULT_PHONE = '7878413535';

  // 1. Immediately provide local cached phone
  try {
    let cached = localStorage.getItem('lekh_admin_contact_phone');
    const secondaryCached = localStorage.getItem('lekh_admin_secondary_phone') || '';
    // Migrate legacy default if present
    if (!cached || cached.trim() === '9428967656' || !cached.trim()) {
      cached = DEFAULT_PHONE;
      localStorage.setItem('lekh_admin_contact_phone', DEFAULT_PHONE);
    }
    onPhone(cached.trim(), secondaryCached.trim());
  } catch {
    onPhone(DEFAULT_PHONE, '');
  }

  if (hasQuotaExceeded()) return () => {};

  // 2. Fetch from Cloud Firestore
  try {
    const contactDocRef = doc(db, 'system_meta', 'admin_contact');
    getDoc(contactDocRef)
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          let cloudPhone = data?.phone;
          const cloudSecondary = data?.secondaryPhone;
          
          // Auto-upgrade legacy default in cloud if still 9428967656
          if (!cloudPhone || typeof cloudPhone !== 'string' || !cloudPhone.trim() || cloudPhone.trim() === '9428967656') {
            cloudPhone = DEFAULT_PHONE;
            setDoc(contactDocRef, {
              phone: DEFAULT_PHONE,
              updatedAt: new Date().toISOString()
            }, { merge: true }).catch(() => {});
          }

          const cleanPhone = cloudPhone.trim();
          const cleanSecondary = typeof cloudSecondary === 'string' ? cloudSecondary.trim() : '';
          onPhone(cleanPhone, cleanSecondary);
          try {
            localStorage.setItem('lekh_admin_contact_phone', cleanPhone);
            if (cleanSecondary) {
              localStorage.setItem('lekh_admin_secondary_phone', cleanSecondary);
            } else {
              localStorage.removeItem('lekh_admin_secondary_phone');
            }
          } catch {}
        } else {
          // Initialize doc in cloud with 7878413535
          setDoc(contactDocRef, {
            phone: DEFAULT_PHONE,
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(() => {});
          onPhone(DEFAULT_PHONE, '');
        }
      })
      .catch((err) => {
        if (isQuotaExceededError(err)) markQuotaExceeded();
      });
  } catch (e) {
    if (isQuotaExceededError(e)) markQuotaExceeded();
  }

  return () => {};
}

/**
 * Save the Admin Contact Phone number to both Cloud Firestore and local device storage.
 * Supports primary phone and optional secondary phone.
 */
export async function saveAdminContactPhoneToCloud(phone: string, secondaryPhone?: string): Promise<void> {
  const cleanPhone = phone.replace(/[^0-9]/g, '').trim() || '7878413535';
  const cleanSecondary = secondaryPhone ? secondaryPhone.replace(/[^0-9]/g, '').trim() : '';

  // 1. Save locally immediately
  try {
    localStorage.setItem('lekh_admin_contact_phone', cleanPhone);
    if (cleanSecondary) {
      localStorage.setItem('lekh_admin_secondary_phone', cleanSecondary);
    } else {
      localStorage.removeItem('lekh_admin_secondary_phone');
    }
  } catch {}

  if (hasQuotaExceeded()) return;

  // 2. Persist to Cloud Firestore
  try {
    const contactDocRef = doc(db, 'system_meta', 'admin_contact');
    await setDoc(contactDocRef, {
      phone: cleanPhone,
      secondaryPhone: cleanSecondary,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Failed to save admin phone in cloud:', err);
    if (isQuotaExceededError(err)) markQuotaExceeded();
  }
}

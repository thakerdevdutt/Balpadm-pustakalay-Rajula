/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  PlusCircle, 
  Lightbulb, 
  Bookmark, 
  Share2, 
  Search, 
  BookOpen, 
  Database, 
  Smartphone,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Users,
  BarChart2,
  Lock,
  Phone,
  MessageCircle,
  AlertCircle,
  RefreshCw,
  Check
} from 'lucide-react';

import { Article, WeeklyIssue, ReadingTheme, FontSizeLevel } from './types';
import { APP_VERSION } from './version';
import { INITIAL_ISSUES } from './data/sampleIssues';
import { Navbar } from './components/Navbar';
// Removed bulky IssueHero and IssueSelector as requested
import { ArticleCard } from './components/ArticleCard';
import { ArticleReader } from './components/ArticleReader';
import { AddIssueModal } from './components/AddIssueModal';
import { InstallGuideModal } from './components/InstallGuideModal';
import { BookmarksDrawer } from './components/BookmarksDrawer';
import { BackupModal } from './components/BackupModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { StatisticsModal } from './components/StatisticsModal';
import { 
  subscribeToIssues, 
  saveIssueToCloud, 
  saveIssueMetadataToCloud,
  saveSingleArticleToCloud,
  saveAllIssuesToCloud,
  subscribeToCustomCategories,
  subscribeToCustomAuthors,
  subscribeToVisitorCount,
  recordVisitorHit,
  fetchSingleArticleFromCloud,
  burnArticleOtpInCloud,
  verifyAndBurnArticleOtpInCloud,
  hasQuotaExceeded,
  subscribeToAdminContactPhone,
  fetchIssuesFromCloud,
  checkCloudSyncStatus
} from './services/firebaseService';
import { 
  cleanAndNormalizeCode, 
  verifySmartArticleOtp, 
  burnOtpLocally 
} from './services/otpService';
import { 
  extractCategoriesFromArticles, 
  saveCustomCategoriesBatch,
  REMOVED_LEGACY_CATEGORIES,
  computeCategoryTabsData
} from './utils/categories';
import { 
  saveCustomAuthorsBatch 
} from './utils/authors';
import {
  getDeletedArticleIds,
  mergeIssuesSafely
} from './utils/storage';
import { getTabColorClasses } from './utils/categoryColors';
import { getAdminOtpUrl } from './utils/share';

// Helper to prevent unnecessary re-renders when issues are structurally identical
function areIssuesEqual(a: WeeklyIssue[], b: WeeklyIssue[]): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const issA = a[i];
    const issB = b[i];
    if (issA.id !== issB.id) return false;
    const artsA = issA.articles || [];
    const artsB = issB.articles || [];
    if (artsA.length !== artsB.length) return false;
    for (let j = 0; j < artsA.length; j++) {
      const artA = artsA[j];
      const artB = artsB[j];
      if (
        artA.id !== artB.id ||
        (artA.updatedAt || 0) !== (artB.updatedAt || 0) ||
        artA.title !== artB.title ||
        artA.content !== artB.content ||
        Boolean(artA.isPasswordProtected) !== Boolean(artB.isPasswordProtected) ||
        (artA.password || '') !== (artB.password || '') ||
        Boolean(artA.copyEnable) !== Boolean(artB.copyEnable) ||
        (artA.oneTimePasscodes || []).length !== (artB.oneTimePasscodes || []).length ||
        (artA.oneTimePasscodes || []).join(',') !== (artB.oneTimePasscodes || []).join(',')
      ) {
        return false;
      }
    }
  }
  return true;
}

export default function App() {
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'connected' | 'syncing' | 'offline'>('connected');

  // Local storage loaded state - preserved faithfully so F5 never loses newly added articles
  const [issues, setIssues] = useState<WeeklyIssue[]>(() => {
    try {
      const saved = localStorage.getItem('lekh_sangrah_issues');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deletedIds = getDeletedArticleIds();
          const cleaned = parsed
            .filter((iss: WeeklyIssue) => iss && typeof iss === 'object' && iss.id !== 'issue-1' && iss.id !== 'issue-2')
            .map((iss: WeeklyIssue) => ({
              ...iss,
              articles: (iss.articles || []).filter((a: Article) => a && typeof a === 'object' && a.id && !deletedIds.has(a.id)),
            }));
          if (cleaned.length > 0 && cleaned.some(iss => (iss.articles || []).length > 0)) {
            return cleaned;
          }
        }
      }
    } catch (e) {
      console.error('Error loading saved issues:', e);
    }
    return INITIAL_ISSUES;
  });

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);

  const [selectedIssueId, setSelectedIssueId] = useState<string>(() => {
    return issues[0]?.id || 'collection-main';
  });

  // Ensure selected issue ID is always in sync with valid issues
  useEffect(() => {
    if (issues.length > 0 && !issues.some(i => i.id === selectedIssueId)) {
      setSelectedIssueId(issues[0].id);
    }
  }, [issues, selectedIssueId]);

  const [activeArticle, setActiveArticle] = useState<Article | null>(null);

  const [readingTheme, setReadingTheme] = useState<ReadingTheme>(() => {
    return (localStorage.getItem('lekh_reading_theme') as ReadingTheme) || 'light';
  });

  const [fontSize, setFontSize] = useState<FontSizeLevel>(() => {
    return (localStorage.getItem('lekh_font_size') as FontSizeLevel) || 'normal';
  });

  const [bookmarkedArticleIds, setBookmarkedArticleIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lekh_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeReadingProgress, setActiveReadingProgress] = useState<number>(0);

  // Standalone mode state for shared articles (via link copy, etc.)
  const [isStandaloneMode, setIsStandaloneMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('standalone') === 'true' || !!params.get('article');
    }
    return false;
  });

  const handleExitStandalone = () => {
    setIsStandaloneMode(false);
    setActiveArticle(null);
    setSearchQuery('');
    setActiveReadingProgress(0);
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState(null, '', cleanUrl);
    }
  };

  const [sharedArticleId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('article');
    }
    return null;
  });

  const [urlOtpParam] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('otp');
    }
    return null;
  });

  const [targetSharedArticle, setTargetSharedArticle] = useState<Article | null>(null);
  const [isSharedArticleFetching, setIsSharedArticleFetching] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return !!params.get('article');
    }
    return false;
  });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdminPasswordOpen, setIsAdminPasswordOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [pendingAdminAction, setPendingAdminAction] = useState<'add' | 'backup' | 'article_unlock' | null>(null);
  const [pendingTargetArticle, setPendingTargetArticle] = useState<Article | null>(null);
  const [pendingTargetIssueId, setPendingTargetIssueId] = useState<string | undefined>(undefined);
  const [openOtpManagerDirectly, setOpenOtpManagerDirectly] = useState(false);
  const [adminContactPhone, setAdminContactPhone] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('lekh_admin_contact_phone');
      if (saved && saved.trim() && saved.trim() !== '9428967656') return saved.trim();
    } catch {}
    return '7878413535';
  });
  const [adminSecondaryPhone, setAdminSecondaryPhone] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('lekh_admin_secondary_phone');
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    return '';
  });

  // Subscribe to Admin Contact Phone updates from Cloud
  useEffect(() => {
    const unsub = subscribeToAdminContactPhone((phone, secondary) => {
      if (phone && phone.trim()) {
        setAdminContactPhone(phone.trim());
      }
      setAdminSecondaryPhone(secondary ? secondary.trim() : '');
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Clear any legacy session unlock cache
  useEffect(() => {
    try {
      sessionStorage.removeItem('lekh_unlocked_articles');
    } catch {}
  }, []);

  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isStatisticsOpen, setIsStatisticsOpen] = useState(false);
  const [cloudCategories, setCloudCategories] = useState<string[]>([]);
  const [cloudAuthors, setCloudAuthors] = useState<string[]>([]);
  const [isPullingFromCloud, setIsPullingFromCloud] = useState(false);
  const [pullToast, setPullToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const lastPullTimestampRef = useRef<number>(0);

  // Directly pull all articles from Cloud Firestore and check for app updates (triggered by clicking version badge)
  const handlePullFromCloud = async () => {
    if (isPullingFromCloud) return;

    setIsPullingFromCloud(true);
    setPullToast({ message: 'લેખોની સ્થિતિ તપાસી રહ્યું છે...' });

    // Check for Service Worker updates in background
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          reg.update().catch(() => {});
        }
      }).catch(() => {});
    }

    const currentTotalCount = (issues || []).reduce((acc, issue) => acc + (issue?.articles?.length || 0), 0);
    const now = Date.now();

    // 2. Anti-spam / Cooldown Guard: If clicked within 45 seconds and already has complete articles
    if (currentTotalCount > 3 && (now - lastPullTimestampRef.current < 45 * 1000)) {
      setIsPullingFromCloud(false);
      setPullToast({ message: `✓ ઍપ વર્ઝન (${APP_VERSION}) અને તમામ ${currentTotalCount} લેખો એકદમ અદ્યતન છે!` });
      setTimeout(() => setPullToast(null), 3500);
      return;
    }

    // 3. Smart Lightweight Check (Costs ONLY 1 single read instead of 200+ reads!)
    if (currentTotalCount > 3) {
      try {
        const syncStatus = await checkCloudSyncStatus(currentTotalCount);
        if (syncStatus.isUpToDate) {
          lastPullTimestampRef.current = now;
          setIsPullingFromCloud(false);
          setPullToast({ message: `✓ ઍપ વર્ઝન (${APP_VERSION}) અને તમામ ${currentTotalCount} લેખો એકદમ અદ્યતન છે!` });
          setTimeout(() => setPullToast(null), 3500);
          return;
        }
      } catch {
        // Fallback to fetch if check encounters unexpected network issue
      }
    }

    setPullToast({ message: 'ક્લાઉડમાંથી તમામ લેખો લાવી રહ્યું છે...' });

    // Clear stale PWA service worker caches
    if (typeof caches !== 'undefined') {
      caches.keys().then((keys) => Promise.all(keys.map(k => caches.delete(k)))).catch(() => {});
    }

    try {
      const cloudIssues = await fetchIssuesFromCloud();
      if (cloudIssues && cloudIssues.length > 0) {
        lastPullTimestampRef.current = Date.now();
        setIssues(cloudIssues);
        if (!cloudIssues.some(i => i.id === selectedIssueId)) {
          setSelectedIssueId(cloudIssues[0].id);
        }
        try {
          localStorage.setItem('lekh_sangrah_issues', JSON.stringify(cloudIssues));
          localStorage.setItem('lekh_sangrah_cached_version', String(Date.now()));
          localStorage.setItem('lekh_sangrah_last_sync_check', String(Date.now()));
        } catch (e) {
          console.error('Failed to store cloud issues locally:', e);
        }
        const freshCount = cloudIssues.reduce((acc, issue) => acc + (issue?.articles?.length || 0), 0);
        setPullToast({ message: `✓ ક્લાઉડમાંથી તમામ ${freshCount} લેખો સફળતાપૂર્વક મેળવી લીધા!` });
        setTimeout(() => setPullToast(null), 4000);
      } else {
        setPullToast({ message: 'ક્લાઉડમાં કોઈ લેખો મળ્યા નથી.', isError: true });
        setTimeout(() => setPullToast(null), 4000);
      }
    } catch (err: any) {
      console.error('Pull from cloud failed:', err);
      setPullToast({ message: 'ક્લાઉડમાંથી ડેટા મેળવવામાં ક્ષતિ આવી. ફરી પ્રયાસ કરો.', isError: true });
      setTimeout(() => setPullToast(null), 4000);
    } finally {
      setIsPullingFromCloud(false);
    }
  };
  const [visitorCount, setVisitorCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('lekh_visitor_count');
      return saved ? parseInt(saved, 10) : 108;
    } catch {
      return 108;
    }
  });

  useEffect(() => {
    recordVisitorHit();
    const unsub = subscribeToVisitorCount((count) => {
      if (typeof count === 'number' && count > 0) {
        setVisitorCount(count);
        try {
          localStorage.setItem('lekh_visitor_count', count.toString());
        } catch {
          // ignore
        }
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Update article OTPs in local issues state, active article state, and pendingTargetArticle - and sync to Cloud
  const handleUpdateArticleOtps = (articleId: string, updatedOtps: string[]) => {
    setIssues((prevIssues) =>
      prevIssues.map((iss) => ({
        ...iss,
        articles: (iss.articles || []).map((art) => {
          if (art.id === articleId) {
            return {
              ...art,
              oneTimePasscodes: updatedOtps,
            };
          }
          return art;
        }),
      }))
    );

    if (activeArticle && activeArticle.id === articleId) {
      setActiveArticle((prev) => (prev ? { ...prev, oneTimePasscodes: updatedOtps } : null));
    }
    if (pendingTargetArticle && pendingTargetArticle.id === articleId) {
      setPendingTargetArticle((prev) => (prev ? { ...prev, oneTimePasscodes: updatedOtps } : null));
    }

    // Directly sync updated OTPs to Cloud Firestore
    const targetArt = (issues || []).flatMap((iss) => iss.articles || []).find((a) => a.id === articleId);
    if (targetArt) {
      saveSingleArticleToCloud('collection-main', { ...targetArt, oneTimePasscodes: updatedOtps }).catch((err) => {
        console.warn('Failed to sync updated OTPs to cloud:', err);
      });
    }
  };

  const handleProgressChange = useCallback((prog: number) => {
    setActiveReadingProgress((prev) => (prev === prog ? prev : prog));
  }, []);

  const totalArticlesCount = useMemo(() => {
    return (issues || []).reduce((acc, issue) => acc + (issue?.articles || []).filter((a) => !a.isHidden).length, 0);
  }, [issues]);

  const handleSelectArticle = (article: Article, issueId?: string) => {
    if (issueId) {
      setSelectedIssueId(issueId);
    }
    // Always prompt for password if the article is password protected
    if (article.isPasswordProtected) {
      setPendingTargetArticle(article);
      setPendingTargetIssueId(issueId);
      setPendingAdminAction('article_unlock');
      setIsAdminPasswordOpen(true);
      return;
    }
    setActiveArticle(article);
  };

  // Keep activeArticle in sync with updated issues (e.g. when fresh content arrives from Cloud)
  useEffect(() => {
    if (!activeArticle) return;
    for (const issue of issues) {
      const fresh = (issue.articles || []).find((a) => a.id === activeArticle.id);
      if (fresh) {
        const isDifferent =
          fresh.content !== activeArticle.content ||
          fresh.title !== activeArticle.title ||
          (fresh.updatedAt || 0) !== (activeArticle.updatedAt || 0) ||
          fresh.author !== activeArticle.author ||
          Boolean(fresh.isPasswordProtected) !== Boolean(activeArticle.isPasswordProtected) ||
          Boolean(fresh.copyEnable) !== Boolean(activeArticle.copyEnable);
        if (isDifferent) {
          setActiveArticle(fresh);
        }
        break;
      }
    }
  }, [issues, activeArticle?.id, activeArticle?.updatedAt]);

  // Track if shared article has already been auto-opened to prevent continuous loop
  const handledSharedArticleIdRef = useRef<string | null>(null);
  const handledAdminOtpArticleIdRef = useRef<string | null>(null);

  // Auto-open Admin OTP generator if admin arrived via WhatsApp request link
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const adminOtpArticleId = searchParams.get('adminOtpArticleId');
    if (!adminOtpArticleId) return;
    if (handledAdminOtpArticleIdRef.current === adminOtpArticleId) return;
    handledAdminOtpArticleIdRef.current = adminOtpArticleId;

    // Clean up query param from URL so refresh is clean
    try {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('adminOtpArticleId');
      window.history.replaceState(null, '', cleanUrl.toString());
    } catch {}

    const openForArticle = (art: Article, issueId?: string) => {
      setPendingTargetArticle(art);
      if (issueId) setPendingTargetIssueId(issueId);
      setPendingAdminAction('article_unlock');
      setOpenOtpManagerDirectly(true);
      setIsAdminPasswordOpen(true);
    };

    let foundArt: Article | undefined;
    let foundIssId: string | undefined;

    for (const iss of issues) {
      const art = (iss.articles || []).find((a) => a.id === adminOtpArticleId);
      if (art) {
        foundArt = art;
        foundIssId = iss.id;
        break;
      }
    }

    if (foundArt) {
      openForArticle(foundArt, foundIssId);
    } else {
      fetchSingleArticleFromCloud(adminOtpArticleId)
        .then((cloudArt) => {
          if (cloudArt) {
            openForArticle(cloudArt);
          }
        })
        .catch((err) => {
          console.warn('Could not fetch article for admin OTP link:', err);
        });
    }
  }, [issues]);

  // Auto-open shared article (e.g. from WhatsApp link)
  useEffect(() => {
    if (!sharedArticleId) return;
    if (handledSharedArticleIdRef.current === sharedArticleId) return;
    // Set ref immediately to block duplicate execution while async fetch is in progress
    handledSharedArticleIdRef.current = sharedArticleId;

    let foundArticle: Article | undefined;
    let foundIssueId: string | undefined;

    for (const iss of issues) {
      const art = (iss.articles || []).find((a) => a.id === sharedArticleId);
      if (art) {
        foundArticle = art;
        foundIssueId = iss.id;
        break;
      }
    }

    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlOtp = searchParams ? searchParams.get('otp') : null;

    const tryUnlockWithUrlOtp = async (art: Article): Promise<boolean> => {
      if (!urlOtp || !art.isPasswordProtected) return false;
      const cleanUrlOtp = cleanAndNormalizeCode(urlOtp);
      const smartCheck = verifySmartArticleOtp(art.id, cleanUrlOtp);
      const isLocalOtp = (art.oneTimePasscodes || []).some(o => cleanAndNormalizeCode(o) === cleanUrlOtp);
      const isPassword = !!(art.password && cleanAndNormalizeCode(art.password) === cleanUrlOtp);
      if (smartCheck.valid || isLocalOtp || isPassword) {
        if (smartCheck.valid || isLocalOtp) {
          burnOtpLocally(art.id, cleanUrlOtp);
          burnArticleOtpInCloud(art.id, cleanUrlOtp).catch(() => {});
        }
        setActiveArticle(art);
        try {
          const cleanUrl = window.location.origin + window.location.pathname + '?article=' + encodeURIComponent(art.id);
          window.history.replaceState(null, '', cleanUrl);
        } catch {}
        return true;
      }

      // If local/smart check doesn't match yet, check live Cloud Firestore directly!
      try {
        const cloudResult = await verifyAndBurnArticleOtpInCloud(art.id, cleanUrlOtp);
        if (cloudResult.success) {
          setActiveArticle(art);
          try {
            const cleanUrl = window.location.origin + window.location.pathname + '?article=' + encodeURIComponent(art.id);
            window.history.replaceState(null, '', cleanUrl);
          } catch {}
          return true;
        }
      } catch (err) {
        console.warn('URL OTP cloud verification note:', err);
      }

      return false;
    };

    if (foundArticle) {
      setTargetSharedArticle(foundArticle);
      setIsSharedArticleFetching(false);
      if (foundIssueId) setSelectedIssueId(foundIssueId);
      tryUnlockWithUrlOtp(foundArticle).then((unlocked) => {
        if (!unlocked) {
          handleSelectArticle(foundArticle!, foundIssueId);
        }
      });
    } else {
      fetchSingleArticleFromCloud(sharedArticleId)
        .then(async (cloudArt) => {
          setIsSharedArticleFetching(false);
          if (cloudArt) {
            setTargetSharedArticle(cloudArt);
            const unlocked = await tryUnlockWithUrlOtp(cloudArt);
            if (!unlocked) {
              handleSelectArticle(cloudArt);
            }
          }
        })
        .catch((err) => {
          setIsSharedArticleFetching(false);
          console.warn('Could not load shared article from cloud:', err);
        });
    }
  }, [sharedArticleId, issues]);

  // In standalone mode, lock history so clicking browser back does not exit to main page
  useEffect(() => {
    if (isStandaloneMode && (activeArticle || targetSharedArticle)) {
      window.history.pushState(null, '', window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, '', window.location.href);
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isStandaloneMode, activeArticle, targetSharedArticle]);

  const handleOpenAddArticle = () => {
    if (isAdminAuthenticated) {
      setIsAddModalOpen(true);
    } else {
      setPendingAdminAction('add');
      setIsAdminPasswordOpen(true);
    }
  };

  const handleOpenBackup = () => {
    // Always require admin password for opening Backup & Database modal
    setPendingAdminAction('backup');
    setIsAdminPasswordOpen(true);
  };

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('lekh_sangrah_issues', JSON.stringify(issues));
  }, [issues]);

  // Real-time synchronization with Google Cloud Firestore
  useEffect(() => {
    let isInitial = true;
    const unsubscribe = subscribeToIssues(
      (cloudIssues) => {
        setIsInitialLoading(false);
        if (cloudIssues && cloudIssues.length > 0) {
          const cloudArtsMap = new Map<string, Article>();
          cloudIssues.forEach((iss) => {
            (iss.articles || []).forEach((a) => cloudArtsMap.set(a.id, a));
          });

          setIssues((prevIssues) => {
            const deletedIds = getDeletedArticleIds();
            const merged = mergeIssuesSafely(prevIssues, cloudIssues, deletedIds);
            if (areIssuesEqual(prevIssues, merged)) {
              return prevIssues; // Bails out to prevent render loops
            }
            try {
              localStorage.setItem('lekh_sangrah_issues', JSON.stringify(merged));
            } catch (e) {
              console.error('Failed to cache cloud issues locally:', e);
            }
            return merged;
          });

          // If the reader currently has an article open that was deleted from another device, safely return to list
          setActiveArticle((currentActive) => {
            if (!currentActive) return null;
            const deletedSet = getDeletedArticleIds();
            if (deletedSet.has(currentActive.id)) return null;
            return currentActive;
          });

          setCloudSyncStatus('connected');
        } else {
          setCloudSyncStatus('connected');
        }
        isInitial = false;
      },
      (err) => {
        setIsInitialLoading(false);
        console.warn('Firestore subscription notice (running local mode):', err);
        setCloudSyncStatus('offline');
      }
    );

    // Also subscribe to custom categories from Cloud Firestore in real time
    const unsubCategories = subscribeToCustomCategories((cloudCats) => {
      if (cloudCats && cloudCats.length > 0) {
        setCloudCategories((prev) => {
          if (prev.length === cloudCats.length && prev.every((c, i) => c === cloudCats[i])) return prev;
          return cloudCats;
        });
        saveCustomCategoriesBatch(cloudCats);
      }
    });

    // Also subscribe to custom authors from Cloud Firestore in real time
    const unsubAuthors = subscribeToCustomAuthors((cloudAuths) => {
      if (cloudAuths && cloudAuths.length > 0) {
        setCloudAuthors((prev) => {
          if (prev.length === cloudAuths.length && prev.every((a, i) => a === cloudAuths[i])) return prev;
          return cloudAuths;
        });
        saveCustomAuthorsBatch(cloudAuths);
      }
    });

    return () => {
      unsubscribe();
      unsubCategories();
      unsubAuthors();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('lekh_reading_theme', readingTheme);
    // Apply dark or theme-sepia class to document root
    if (readingTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('theme-sepia');
    } else if (readingTheme === 'sepia') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('theme-sepia');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.remove('theme-sepia');
    }
  }, [readingTheme]);

  useEffect(() => {
    localStorage.setItem('lekh_font_size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('lekh_bookmarks', JSON.stringify(bookmarkedArticleIds));
  }, [bookmarkedArticleIds]);

  // Current selected issue
  const currentIssue = useMemo(() => {
    return issues.find(i => i.id === selectedIssueId) || issues[0];
  }, [issues, selectedIssueId]);

  // Toggle bookmark handler
  const handleToggleBookmark = (articleId: string) => {
    setBookmarkedArticleIds(prev => 
      prev.includes(articleId) ? prev.filter(id => id !== articleId) : [...prev, articleId]
    );
  };

  // Add or update weekly issue handler
  // syncMode: 'meta-only' (when individual articles already saved via saveSingleArticleToCloud) | 'full' (when new issue created or reordering) | 'local-only'
  const handleSaveNewIssue = (newIssue: WeeklyIssue, syncMode: 'meta-only' | 'full' | 'local-only' = 'meta-only') => {
    const safeIssue: WeeklyIssue = {
      ...newIssue,
      id: newIssue.id || 'collection-main',
    };
    setIssues(prev => {
      const exists = prev.some(i => i.id === safeIssue.id);
      const updated = exists
        ? prev.map(i => i.id === safeIssue.id ? safeIssue : i)
        : [safeIssue, ...prev.filter(i => i.id !== 'collection-main')];
      // CRITICAL: Synchronously save to localStorage immediately so F5 never loses data
      try {
        localStorage.setItem('lekh_sangrah_issues', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to sync to localStorage:', err);
      }
      return updated;
    });
    setSelectedIssueId(safeIssue.id);
    if (activeArticle) {
      const updatedActive = safeIssue.articles.find(a => a.id === activeArticle.id);
      if (updatedActive) setActiveArticle(updatedActive);
    }

    setCloudSyncStatus('syncing');
    const cloudPromise = syncMode === 'full' 
      ? saveIssueToCloud(safeIssue)
      : saveIssueMetadataToCloud(safeIssue);

    cloudPromise
      .then(() => setCloudSyncStatus('connected'))
      .catch((err) => {
        console.error('Failed to sync issue to cloud:', err);
        setCloudSyncStatus('offline');
      });
  };

  // Reset to default sample issues
  const handleResetToDefaults = () => {
    setIssues(INITIAL_ISSUES);
    setSelectedIssueId(INITIAL_ISSUES[0].id);
    setActiveArticle(null);
  };

  // Helper to count occurrences of a query word in text
  const countOccurrences = (text: string, query: string): number => {
    if (!text || !query.trim()) return 0;
    try {
      const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      const matches = text.match(regex);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  };

  // Search results across all issues with occurrence count per article
  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return null;

    const results: { 
      issue: WeeklyIssue; 
      article: Article; 
      matchCount: number;
    }[] = [];

    (issues || []).forEach(issue => {
      (issue.articles || []).forEach(article => {
        if (article.isHidden) return; // Hidden articles do not appear in reader search
        const titleCount = countOccurrences(article?.title, q);
        const contentCount = countOccurrences(article?.content, q);
        const summaryCount = countOccurrences(article?.summary, q);
        const authorCount = countOccurrences(article?.author, q);
        const tagsCount = Array.isArray(article?.tags)
          ? article.tags.reduce((acc, tag) => acc + countOccurrences(tag, q), 0)
          : 0;

        const totalCount = titleCount + contentCount + summaryCount + authorCount + tagsCount;

        if (totalCount > 0) {
          results.push({ 
            issue, 
            article, 
            matchCount: totalCount 
          });
        }
      });
    });

    // Sort by matchCount descending so articles with highest occurrences appear first
    results.sort((a, b) => b.matchCount - a.matchCount);

    return results;
  }, [issues, searchQuery]);

  // Total occurrences across all matching articles
  const totalSearchOccurrences = useMemo(() => {
    if (!Array.isArray(searchResults)) return 0;
    return searchResults.reduce((acc, item) => acc + (item?.matchCount || 0), 0);
  }, [searchResults]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.trim() && activeArticle) {
      setActiveArticle(null);
    }
  };

  // Active Category Tab for main list (e.g. ALL, Top Topics by count, અન્ય)
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('ALL');

  // Compute dynamic category tabs:
  // 1. ALL is mandatory (always first) with total count.
  // 2. Core priority topics requested by user: 'વિવર્તન', 'વિસ્મય', 'રાજુલા', 'We the readers'
  // 3. Dynamic active topics (e.g. NEWS360, XYZ) with significant articles
  // 4. Removed legacy categories (e.g. 'ગુજરાત સમાચાર રવિપૂર્તિ') and minor categories are NOT given separate tabs — they belong in 'અન્ય'!
  // 5. Sorted strictly descending by article count so active topics bubble up automatically!
  // 6. 'અન્ય' is strictly MANDATORY and ALWAYS LAST ("છેલ્લે અન્ય રાખવાનું ફરજીયાત છે")
  const categoryTabsData = useMemo(() => {
    const rawArticles = currentIssue?.articles || [];
    const visibleArticles = rawArticles.filter((art) => !art.isHidden);
    return computeCategoryTabsData(visibleArticles);
  }, [currentIssue]);

  // Filtered articles based on selected category tab
  const displayedArticles = useMemo(() => {
    const rawArticles = currentIssue?.articles || [];
    const articles = rawArticles.filter((art) => !art.isHidden);
    if (selectedCategoryTab === 'ALL') return articles;

    if (selectedCategoryTab === 'અન્ય') {
      return articles.filter((art) => {
        const cat = (art.category || '').trim();
        for (const qId of categoryTabsData.qualifyingKeys) {
          if (categoryTabsData.matchCategory(qId, cat)) {
            return false;
          }
        }
        return true;
      });
    }

    return articles.filter((art) => {
      const cat = (art.category || '').trim();
      return categoryTabsData.matchCategory(selectedCategoryTab, cat);
    });
  }, [currentIssue, selectedCategoryTab, categoryTabsData]);

  return (
    <div className={`min-h-screen w-full max-w-full overflow-x-hidden transition-colors duration-200 pt-28 sm:pt-20 ${
      readingTheme === 'dark' 
        ? 'bg-[#1A1D1A] text-[#E2DFD6]' 
        : readingTheme === 'sepia' 
        ? 'bg-[#DFD1B3] text-[#241C11]' 
        : 'bg-[#F9F7F2] text-[#3D3D3D]'
    } pb-20 sm:pb-12`}>
      
      {/* Navigation Header - Always visible so user can adjust font size and theme anytime */}
      <Navbar
        readingTheme={readingTheme}
        setReadingTheme={setReadingTheme}
        fontSize={fontSize}
        setFontSize={setFontSize}
        searchQuery={searchQuery}
        setSearchQuery={handleSearchChange}
        bookmarksCount={bookmarkedArticleIds.length}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        onOpenAddIssue={handleOpenAddArticle}
        onOpenBackup={handleOpenBackup}
        onOpenInstallModal={() => setIsInstallGuideOpen(true)}
        onOpenStatistics={() => setIsStatisticsOpen(true)}
        totalArticlesCount={totalArticlesCount}
        cloudSyncStatus={cloudSyncStatus}
        readingProgress={activeArticle ? activeReadingProgress : undefined}
        isStandalone={isStandaloneMode}
        onPullFromCloud={handlePullFromCloud}
        isPullingCloud={isPullingFromCloud}
        onGoHome={() => {
          if (isStandaloneMode) {
            // In standalone mode, prevent navigating to main article collection
            return;
          }
          setActiveArticle(null);
          setSearchQuery('');
          setActiveReadingProgress(0);
        }}
      />

      {/* Floating Cloud Pull Notification Toast */}
      {pullToast && (
        <div 
          role="status"
          aria-live="polite"
          className={`fixed top-20 sm:top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold transition-all duration-300 max-w-[90vw] ${
            pullToast.isError 
              ? 'bg-red-700 text-white border border-red-600 shadow-red-900/20' 
              : isPullingFromCloud
              ? 'bg-indigo-700 text-white border border-indigo-600 shadow-indigo-900/20'
              : 'bg-emerald-700 text-white border border-emerald-600 shadow-emerald-900/20'
          }`}
        >
          {isPullingFromCloud ? (
            <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-white" />
          ) : pullToast.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-white" />
          ) : (
            <Check className="w-4 h-4 shrink-0 text-white" />
          )}
          <span className="font-serif-guj leading-tight">{pullToast.message}</span>
          {!isPullingFromCloud && (
            <button
              onClick={() => setPullToast(null)}
              className="ml-1 text-white/80 hover:text-white cursor-pointer font-bold px-1"
              title="બંધ કરો"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Firebase દૈનિક લિમિટ / Quota Exceeded Banner */}
      {hasQuotaExceeded() && (
        <div className="bg-red-700 text-white px-4 py-3 text-center text-xs sm:text-sm font-semibold shadow-md flex items-center justify-center gap-2 border-b border-red-800 animate-pulse">
          <AlertCircle className="w-5 h-5 shrink-0 text-white" />
          <span>
            ⚠️ Firebase દૈનિક ક્વોટા લિમિટ પૂરી થઈ છે: આજે હવે કોઈ નવા ફેરફાર કે અખતરા ન કરવા અને પોરો ખાવો. આવતીકાલે ક્વોટા આપોઆપ રીસેટ થઈ જશે!
          </span>
        </div>
      )}

      {/* Reader View or Main Article List View */}
      {activeArticle ? (
        <ArticleReader
          article={activeArticle}
          issue={currentIssue || {
            id: 'collection-main',
            issueNumber: 1,
            date: activeArticle.date || 'વાંચન સંગ્રહ',
            themeTitle: 'વાંચન સંગ્રહ',
            articles: [activeArticle],
          }}
          isStandalone={isStandaloneMode}
          onBack={() => {
            if (isStandaloneMode) {
              // In standalone mode, back navigation is disabled
              return;
            }
            setActiveArticle(null);
            setActiveReadingProgress(0);
          }}
          onSelectArticle={(art) => {
            handleSelectArticle(art);
            setActiveReadingProgress(0);
          }}
          isBookmarked={bookmarkedArticleIds.includes(activeArticle.id)}
          onToggleBookmark={handleToggleBookmark}
          readingTheme={readingTheme}
          fontSize={fontSize}
          onProgressChange={handleProgressChange}
        />
      ) : isStandaloneMode ? (
        // In standalone mode, if article is password protected or loading, provide clean state without exposing catalog
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          {isSharedArticleFetching ? (
            <>
              <div className="w-12 h-12 rounded-full border-4 border-[#7B8E7E]/30 border-t-[#7B8E7E] animate-spin mb-4" />
              <p className="font-serif-guj text-base text-[#57534E] dark:text-[#A8A29E]">
                શેર કરેલ લેખ ખૂલી રહ્યો છે... કૃપા કરીને રાહ જુઓ.
              </p>
            </>
          ) : targetSharedArticle?.isPasswordProtected ? (
            <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#252A25] border border-amber-500/30 shadow-lg text-center w-full">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7" />
              </div>
              <h2 className="font-serif-guj text-lg sm:text-xl font-bold text-[#1C1917] dark:text-[#F5F5F4] mb-2">
                આ લેખ પાસવર્ડથી સુરક્ષિત છે
              </h2>
              <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#A8A29E] mb-5">
                આ લેખ વાંચવા માટે પાસવર્ડ અથવા વન-ટાઈમ OTP દાખલ કરવો જરૂરી છે.
              </p>

              <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200">
                <p className="font-semibold mb-2 flex items-center justify-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-600" />
                  <span>પાસવર્ડ મેળવવા માટે સંચાલકનો સંપર્ક:</span>
                </p>
                <div className="space-y-2 pt-1 w-full max-w-sm mx-auto">
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <a
                      href={`https://wa.me/91${adminContactPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `નમસ્તે, મારે "${targetSharedArticle?.title || 'લેખ'}" વાંચવા માટે OTP પાસવર્ડ જોઈએ છે.\n\n👉 એડમિન માટે સીધો OTP બનાવવાની લિંક:\n${targetSharedArticle ? getAdminOtpUrl(targetSharedArticle.id) : ''}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer text-center w-full"
                    >
                      <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{adminSecondaryPhone ? 'WhatsApp (મુખ્ય)' : 'WhatsApp પર માંગો'}</span>
                    </a>
                    <a
                      href={`tel:${adminContactPhone.replace(/[^0-9]/g, '')}`}
                      className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-stone-200 dark:bg-[#333A33] hover:bg-stone-300 dark:hover:bg-[#3F473F] text-stone-800 dark:text-stone-100 font-bold text-xs transition cursor-pointer text-center w-full"
                    >
                      <Phone className="w-3.5 h-3.5 shrink-0 text-[#7B8E7E]" />
                      <span className="font-mono">{adminContactPhone}</span>
                    </a>
                  </div>

                  {adminSecondaryPhone ? (
                    <div className="grid grid-cols-2 gap-2 w-full pt-1.5 border-t border-amber-500/20">
                      <a
                        href={`https://wa.me/91${adminSecondaryPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `નમસ્તે, મારે "${targetSharedArticle?.title || 'લેખ'}" વાંચવા માટે OTP પાસવર્ડ જોઈએ છે.\n\n👉 એડમિન માટે સીધો OTP બનાવવાની લિંક:\n${targetSharedArticle ? getAdminOtpUrl(targetSharedArticle.id) : ''}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-emerald-700/90 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs cursor-pointer text-center w-full"
                      >
                        <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">WhatsApp (બીજો નંબર)</span>
                      </a>
                      <a
                        href={`tel:${adminSecondaryPhone.replace(/[^0-9]/g, '')}`}
                        className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-stone-200 dark:bg-[#333A33] hover:bg-stone-300 dark:hover:bg-[#3F473F] text-stone-800 dark:text-stone-100 font-bold text-xs transition cursor-pointer text-center w-full"
                      >
                        <Phone className="w-3.5 h-3.5 shrink-0 text-[#7B8E7E]" />
                        <span className="font-mono">{adminSecondaryPhone}</span>
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (targetSharedArticle) {
                    handleSelectArticle(targetSharedArticle);
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-[#7B8E7E] hover:bg-[#687A6B] text-white font-semibold text-sm transition shadow-xs cursor-pointer"
              >
                પાસવર્ડ દાખલ કરો
              </button>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-white dark:bg-[#252A25] border border-black/10 dark:border-white/10 text-center w-full">
              <p className="font-serif-guj text-base text-[#57534E] dark:text-[#A8A29E]">
                શેર કરેલ લેખ મળી શક્યો નથી અથવા તે દૂર કરવામાં આવ્યો છે.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Main Container */
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        
        {/* Search Results Mode */}
        {searchResults !== null ? (
          <div className="space-y-6">
            {/* Search Summary Header */}
            <div className="py-3 px-4 sm:py-3.5 sm:px-5 rounded-xl bg-white dark:bg-[#252A25] border border-[#E5E1D3] dark:border-[#353D35] shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <h2 className="text-base sm:text-lg font-bold font-serif-guj text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-1.5">
                  શબ્દ શોધ: <span className="text-[#5B8260] dark:text-[#A3D9A5]">"{searchQuery.trim()}"</span>
                </h2>
                <span className="px-3 py-0.5 rounded-lg text-base sm:text-lg font-bold font-serif-guj bg-[#E8F1E9] dark:bg-[#2F3E31] text-[#2D4530] dark:text-[#C5DAC8] border border-[#5B8260]/20">
                  {searchResults.length} લેખ મળ્યા
                </span>
                {totalSearchOccurrences > 0 && (
                  <span className="px-3 py-0.5 rounded-lg text-base sm:text-lg font-bold font-serif-guj bg-[#FAF2E9] dark:bg-[#3D3325] text-[#8C6239] dark:text-[#E0C3A5] border border-[#8C6239]/20">
                    કુલ {totalSearchOccurrences} વખત ઉલ્લેખ
                  </span>
                )}
              </div>

              <button
                onClick={() => setSearchQuery('')}
                className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm bg-[#F2EFE6] dark:bg-[#202520] hover:bg-[#E5E1D3] dark:hover:bg-[#2D342D] text-[#1C1917] dark:text-[#F5F5F4] border border-[#D6D3D1] dark:border-[#353D35] font-semibold transition cursor-pointer shrink-0"
              >
                શોધ સાફ કરો
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-[#252A25] rounded-2xl border border-[#E5E1D3] dark:border-[#353D35] shadow-xs">
                <p className="text-[#7A7566] dark:text-[#9A9483] text-sm">આ શબ્દ માટે કોઈ લેખ મળ્યો નથી.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {searchResults.map(({ issue, article, matchCount }, idx) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    index={idx}
                    readingTheme={readingTheme}
                    searchKeyword={searchQuery.trim()}
                    searchMatchCount={matchCount}
                    onRead={() => handleSelectArticle(article, issue.id)}
                    isBookmarked={bookmarkedArticleIds.includes(article.id)}
                    onToggleBookmark={() => handleToggleBookmark(article.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Articles Collection Section */}
            {isInitialLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-9 h-9 border-3 border-[#7B8E7E] border-t-transparent rounded-full animate-spin"></div>
                <div className="space-y-1">
                  <p className="text-base font-semibold font-serif-guj text-[#1C1917] dark:text-[#F5F5F4]">
                    લેખ સંગ્રહ લોડ થઈ રહ્યો છે...
                  </p>
                  <p className="text-xs text-[#7A7566] dark:text-[#9A9483]">
                    કૃપા કરીને થોડી ક્ષણ રાહ જુઓ
                  </p>
                </div>
              </div>
            ) : currentIssue && (
              <section className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-xl sm:text-2xl font-bold font-serif-guj text-[#1C1917] dark:text-[#F5F5F4]">
                        વિસ્મય તથા અન્ય લેખ
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#44403C] dark:text-[#A8A29E] mt-1">
                      કેન્દ્રીય વિષય: <span className="font-semibold text-[#1C1917] dark:text-[#F5F5F4]">{currentIssue.themeTitle}</span>
                    </p>
                  </div>
                </div>

                {/* Category Filter Tabs: Placed right here in this section, sticky on scroll */}
                {categoryTabsData.tabs.length > 1 && (
                  <div className="sticky top-[58px] sm:top-[68px] z-20 py-2 -mx-2 px-2 bg-[#F9F7F2]/95 dark:bg-[#1A1D1A]/95 backdrop-blur-md border-b border-[#E5E1D3]/80 dark:border-[#353D35]/80 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-max pb-0.5 pr-4">
                      {categoryTabsData.tabs.map((tab) => {
                        const isSelected = selectedCategoryTab === tab.id;
                        const tabTheme = getTabColorClasses(tab.id);
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSelectedCategoryTab(tab.id)}
                            className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 select-none whitespace-nowrap shadow-xs ${
                              isSelected
                                ? tabTheme.active
                                : tabTheme.inactive
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[10px] sm:text-[11px] font-bold ${
                                isSelected
                                  ? tabTheme.badgeActive
                                  : tabTheme.badgeInactive
                              }`}
                            >
                              {tab.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Articles Grid (2 columns layout) */}
                {displayedArticles.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-[#252A25] rounded-2xl border border-[#E5E1D3] dark:border-[#353D35] p-6 space-y-2">
                    <p className="text-base font-medium font-serif-guj text-[#1C1917] dark:text-[#F5F5F4]">
                      {selectedCategoryTab === 'ALL'
                        ? 'હજુ સુધી કોઈ લેખ મળ્યો નથી.'
                        : `"${selectedCategoryTab}" વિષયમાં કોઈ લેખ મળ્યો નથી.`}
                    </p>
                    <p className="text-xs text-[#7A7566] dark:text-[#9A9483]">
                      {selectedCategoryTab !== 'ALL' ? (
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryTab('ALL')}
                          className="text-[#5B8260] font-semibold underline cursor-pointer"
                        >
                          બધા લેખો (ALL) જોવા અહીં ક્લિક કરો
                        </button>
                      ) : (
                        'ઉપર આપેલા "નવો લેખ ઉમેરો" બટન દ્વારા નવો લેખ ઉમેરી શકો છો.'
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {displayedArticles.map((article, index) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        index={index}
                        readingTheme={readingTheme}
                        onRead={() => handleSelectArticle(article)}
                        isBookmarked={bookmarkedArticleIds.includes(article.id)}
                        onToggleBookmark={() => handleToggleBookmark(article.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Practical Advice Banner for Readers & Creators */}
            <section className="rounded-2xl p-6 border border-[#E5E1D3] dark:border-[#353D35] bg-white dark:bg-[#252A25] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-[#A67C52]/15 text-[#8C6239] dark:text-[#E0C3A5] shrink-0">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#2D3436] dark:text-[#E2DFD6]">
                    તમારા મોબાઇલની હોમ સ્ક્રીન પર આ એપ મૂકો
                  </h4>
                  <p className="text-xs text-[#7A7566] dark:text-[#9A9483] mt-0.5 max-w-xl">
                    કોઈ પ્લે સ્ટોર વગર તમારા બ્રાઉઝરમાંથી "Add to Home Screen" કરીને બધા લેખો સીધા તમારા ફોનમાં જ સરળતાથી ખોલો.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsInstallGuideOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#7B8E7E] hover:bg-[#687A6B] text-white text-xs font-semibold transition shadow-xs cursor-pointer"
                >
                  ઇન્સ્ટોલ કરવાની રીત જુઓ
                </button>
              </div>
            </section>

            {/* Site Total Visitors & Statistics Bottom Card */}
            <footer className="mt-10 pt-6 pb-20 sm:pb-8 border-t border-[#E5E1D3] dark:border-[#353D35] text-center">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-xs sm:text-sm">
                
                {/* Total Articles Counter */}
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#252A25] border border-[#E5E1D3] dark:border-[#353D35] shadow-xs">
                  <BookOpen className="w-4 h-4 text-[#1D5299] dark:text-[#88B4E8]" />
                  <span className="text-[#6B7280] dark:text-[#9CA3AF]">કુલ સંગ્રહિત લેખો:</span>
                  <span className="font-bold text-[#1D5299] dark:text-[#88B4E8] font-sans text-sm">
                    {totalArticlesCount}
                  </span>
                </div>

                {/* Total Visitors Counter */}
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#252A25] border border-[#E5E1D3] dark:border-[#353D35] shadow-xs">
                  <Users className="w-4 h-4 text-[#5B8260] dark:text-[#A8BDAA]" />
                  <span className="text-[#6B7280] dark:text-[#9CA3AF]">કુલ વિઝિટર:</span>
                  <span className="font-bold text-[#5B8260] dark:text-[#A8BDAA] font-sans text-sm">
                    {visitorCount.toLocaleString('gu-IN')}
                  </span>
                </div>

                {/* Detailed Analysis Button */}
                <button
                  onClick={() => setIsStatisticsOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1D5299]/10 hover:bg-[#1D5299]/20 text-[#1D5299] dark:text-[#88B4E8] border border-[#1D5299]/25 transition cursor-pointer font-semibold text-xs shadow-xs"
                  title="લેખોનું આંકડાકીય વિશ્લેષણ જુઓ"
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>આંકડાકીય વિશ્લેષણ</span>
                </button>
              </div>

              <p className="text-[11px] text-[#8C857B] dark:text-[#9CA3AF] mt-3 font-serif-guj flex items-center justify-center gap-1.5">
                <span>લેખ સંગ્રહ • શ્રેષ્ઠ વિચારો અને સાહિત્યનો અખૂટ ભંડાર</span>
                <button
                  type="button"
                  onClick={handlePullFromCloud}
                  disabled={isPullingFromCloud}
                  title="ક્લાઉડમાંથી તમામ લેખો ખેંચવા / Pull from Cloud કરવા ક્લિક કરો"
                  className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-emerald-100 hover:text-emerald-800 dark:hover:bg-emerald-950 dark:hover:text-emerald-300 transition cursor-pointer inline-flex items-center gap-1"
                >
                  {isPullingFromCloud && <RefreshCw className="w-2.5 h-2.5 animate-spin text-emerald-700 dark:text-emerald-300" />}
                  <span>{APP_VERSION}</span>
                </button>
              </p>
            </footer>
          </>
        )}

      </main>
      )}

      {/* Mobile Bottom Quick Navigation Bar (Touch-friendly for phones, hidden in standalone) */}
      {!isStandaloneMode && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 w-full max-w-full overflow-hidden bg-white/95 dark:bg-[#1A1D1A]/95 backdrop-blur-md border-t border-[#E5E1D3] dark:border-[#2D342D] px-4 py-2.5 flex items-center justify-around text-[10px] font-medium text-[#7A7566] dark:text-[#9A9483] shadow-lg">
          <button
            onClick={() => setIsStatisticsOpen(true)}
            className="flex flex-col items-center gap-1 text-[#1D5299] dark:text-[#88B4E8] font-bold"
            title="આંકડાકીય વિશ્લેષણ અને સ્ટેટેક્સ્ટિક્સ"
          >
            <BarChart2 className="w-4 h-4" />
            <span>સ્ટેટેક્સ્ટિક્સ</span>
          </button>

          <button
            onClick={() => setIsBookmarksOpen(true)}
            className="flex flex-col items-center gap-1 hover:text-[#3D3D3D] dark:hover:text-white relative"
          >
            <Bookmark className="w-4 h-4" />
            <span>સાચવેલા ({bookmarkedArticleIds.length})</span>
          </button>

          <button
            onClick={handleOpenAddArticle}
            className="flex flex-col items-center gap-1 hover:text-[#3D3D3D] dark:hover:text-white"
            title="નવો લેખ ઉમેરો / સુધારો (એડમિન)"
          >
            <PlusCircle className="w-4 h-4 text-[#7B8E7E]" />
            <span>નવો લેખ / સુધારો</span>
          </button>

          <button
            onClick={() => setIsInstallGuideOpen(true)}
            className="flex flex-col items-center gap-1 hover:text-[#3D3D3D] dark:hover:text-white"
          >
            <Smartphone className="w-4 h-4 text-[#7B8E7E]" />
            <span>ઇન્સ્ટોલ</span>
          </button>
        </div>
      )}

      {/* Modals & Drawers */}
      {isAdminPasswordOpen && (
        <AdminPasswordModal
          isOpen={isAdminPasswordOpen}
          actionType={pendingAdminAction || 'add'}
          targetArticle={pendingTargetArticle}
          targetIssueId={pendingTargetIssueId}
          initialPassword={urlOtpParam || ''}
          onUpdateArticleOtps={handleUpdateArticleOtps}
          openOtpManagerDirectly={openOtpManagerDirectly}
          isAdminAuthenticated={isAdminAuthenticated}
          adminContactPhone={adminContactPhone}
          adminSecondaryPhone={adminSecondaryPhone}
          onUpdateAdminContactPhone={(primary, secondary) => {
            setAdminContactPhone(primary);
            if (secondary !== undefined) {
              setAdminSecondaryPhone(secondary);
            }
          }}
          onClose={() => {
            setIsAdminPasswordOpen(false);
            setPendingAdminAction(null);
            setPendingTargetArticle(null);
            setPendingTargetIssueId(undefined);
            setOpenOtpManagerDirectly(false);
          }}
          onSuccess={(usedOtp) => {
            if (pendingAdminAction === 'article_unlock' && pendingTargetArticle) {
              if (usedOtp) {
                handleUpdateArticleOtps(
                  pendingTargetArticle.id,
                  (pendingTargetArticle.oneTimePasscodes || []).filter((o) => o !== usedOtp)
                );
              }
              setActiveArticle(pendingTargetArticle);
            } else {
              setIsAdminAuthenticated(true);
              if (pendingAdminAction === 'backup') {
                setIsBackupModalOpen(true);
              } else {
                setIsAddModalOpen(true);
              }
            }
            setIsAdminPasswordOpen(false);
            setPendingAdminAction(null);
            setPendingTargetArticle(null);
          }}
        />
      )}

      {isAddModalOpen && (
        <AddIssueModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSaveIssue={handleSaveNewIssue}
          currentIssuesCount={issues.length}
          currentIssue={currentIssue}
          allIssues={issues}
          cloudCategories={cloudCategories}
          cloudAuthors={cloudAuthors}
        />
      )}

      {isInstallGuideOpen && (
        <InstallGuideModal
          isOpen={isInstallGuideOpen}
          onClose={() => setIsInstallGuideOpen(false)}
        />
      )}

      {isBookmarksOpen && (
        <BookmarksDrawer
          isOpen={isBookmarksOpen}
          onClose={() => setIsBookmarksOpen(false)}
          issues={issues}
          bookmarkedArticleIds={bookmarkedArticleIds}
          onSelectArticle={(issue, article) => {
            handleSelectArticle(article, issue.id);
          }}
          onRemoveBookmark={handleToggleBookmark}
        />
      )}

      {isBackupModalOpen && (
        <BackupModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          issues={issues}
          onImportIssues={(imported) => {
            setIssues(imported);
            if (imported.length > 0) setSelectedIssueId(imported[0].id);
            setCloudSyncStatus('syncing');
            saveAllIssuesToCloud(imported)
              .then(() => setCloudSyncStatus('connected'))
              .catch((err) => {
                console.error('Failed to sync imported issues to cloud:', err);
                setCloudSyncStatus('offline');
              });
          }}
          onResetToDefaults={handleResetToDefaults}
        />
      )}

      {isStatisticsOpen && (
        <StatisticsModal
          isOpen={isStatisticsOpen}
          onClose={() => setIsStatisticsOpen(false)}
          issues={issues}
          bookmarkedCount={bookmarkedArticleIds.length}
          onSelectArticle={(issue, article) => {
            handleSelectArticle(article, issue.id);
          }}
          onSearchWord={(word) => {
            setIsStatisticsOpen(false);
            setActiveArticle(null);
            setSearchQuery(word);
          }}
        />
      )}

      {/* PWA Smart Instant Update Prompt */}
    </div>
  );
}

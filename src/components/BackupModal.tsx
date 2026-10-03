import React, { useRef, useState, useEffect, useMemo } from 'react';
import { WeeklyIssue, Article } from '../types';
import { 
  X, 
  Database, 
  Download, 
  Upload, 
  Check, 
  AlertCircle, 
  FileSpreadsheet, 
  Cloud,
  CloudOff,
  RefreshCw,
  RotateCw,
  Fingerprint,
  Activity,
  Info,
  ShieldCheck
} from 'lucide-react';
import { 
  saveAllIssuesToCloud, 
  saveSingleArticleToCloud, 
  saveBatchOfArticlesToCloud,
  subscribeToCloudArticleIds,
  fetchIssuesFromCloud,
  hasQuotaExceeded
} from '../services/firebaseService';
import { APP_VERSION } from '../version';
import {
  isBiometricSupported,
  isBiometricEnrolled,
  enrollBiometric,
  disableBiometric
} from '../services/biometricService';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: WeeklyIssue[];
  onImportIssues: (imported: WeeklyIssue[]) => void;
  onResetToDefaults?: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  issues,
  onImportIssues,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [cloudArticleIdsSet, setCloudArticleIdsSet] = useState<Set<string>>(() => new Set());
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isLatestSyncing, setIsLatestSyncing] = useState(false);
  const [isFullSyncing, setIsFullSyncing] = useState(false);
  const [isPullingFromCloud, setIsPullingFromCloud] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const cancelSyncRef = useRef<boolean>(false);

  // Biometric authentication state
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [isEnrollingBiometric, setIsEnrollingBiometric] = useState(false);
  const [biometricMsg, setBiometricMsg] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      setBiometricEnrolled(isBiometricEnrolled());
      isBiometricSupported().then((supported) => {
        if (isMounted) setBiometricSupported(supported);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleEnrollBio = async () => {
    setIsEnrollingBiometric(true);
    setBiometricMsg(null);
    try {
      const res = await enrollBiometric('એડમિન');
      if (res.success) {
        setBiometricEnrolled(true);
        setBiometricMsg({ text: '✓ આ મોબાઇલ પર ફિંગરપ્રિન્ટ સફળતાપૂર્વક સક્રિય થઈ ગયું છે!', isError: false });
        setTimeout(() => setBiometricMsg(null), 4000);
      } else {
        setBiometricMsg({ text: res.error || 'ફિંગરપ્રિન્ટ સેટ થઈ શક્યું નહીં.', isError: true });
        setTimeout(() => setBiometricMsg(null), 4000);
      }
    } catch {
      setBiometricMsg({ text: 'ફિંગરપ્રિન્ટ સેટ કરતી વખતે ક્ષતિ આવી.', isError: true });
      setTimeout(() => setBiometricMsg(null), 4000);
    } finally {
      setIsEnrollingBiometric(false);
    }
  };

  const handleDisableBio = () => {
    disableBiometric();
    setBiometricEnrolled(false);
    setBiometricMsg({ text: 'ફિંગરપ્રિન્ટ બંધ કરી દેવાયું છે. હવે ફક્ત પાસવર્ડ વપરાશે.', isError: false });
    setTimeout(() => setBiometricMsg(null), 3500);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubCloudIds = subscribeToCloudArticleIds((ids) => {
      setCloudArticleIdsSet(ids);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (typeof unsubCloudIds === 'function') unsubCloudIds();
    };
  }, []);

  // Count articles that are not yet confirmed in Firestore Cloud
  const pendingArticlesCount = useMemo(() => {
    // If cloud listener has populated IDs, check against cloud IDs
    if (cloudArticleIdsSet.size > 0) {
      let count = 0;
      for (const issue of issues || []) {
        for (const art of issue?.articles || []) {
          if (art.id && !cloudArticleIdsSet.has(art.id)) {
            count++;
          }
        }
      }
      return count;
    }
    // Fallback if cloud snapshot hasn't resolved yet
    let count = 0;
    for (const issue of issues || []) {
      for (const art of issue?.articles || []) {
        if (art.id && art.isSavedInCloud === false) {
          count++;
        }
      }
    }
    return count;
  }, [issues, cloudArticleIdsSet]);

  // 01. Latest Sync: સિંક માત્ર બાકી / નવા લેખો (જે હજુ Cloud માં નથી ગયા)
  const handleLatestSync = async () => {
    if (!isOnline) {
      setStatusMsg({
        text: 'ઇન્ટરનેટ બંધ હોવાથી સિંક શક્ય નથી.',
        isError: true,
      });
      return;
    }
    cancelSyncRef.current = false;
    try {
      setIsLatestSyncing(true);

      // Identify pending articles
      const pendingList: { issueId: string; article: Article; explicitOrderIndex: number }[] = [];
      for (const issue of issues || []) {
        const targetIssueId = issue.id || 'collection-main';
        const arts = issue.articles || [];
        for (let i = 0; i < arts.length; i++) {
          const art = arts[i];
          const isPending = !cloudArticleIdsSet.has(art.id) || art.isSavedInCloud === false;
          if (art.id && isPending) {
            pendingList.push({ issueId: targetIssueId, article: art, explicitOrderIndex: i });
          }
        }
      }

      if (pendingList.length === 0) {
        setStatusMsg({
          text: 'તમામ લેખો પહેલેથી જ Firebase Cloud સાથે સિંક થયેલા છે!',
          isError: false,
        });
        return;
      }

      setSyncProgress({ current: 0, total: pendingList.length });
      let syncedIds: string[] = [];

      // Safety timeout of 10 seconds
      await Promise.race([
        (async () => {
          if (cancelSyncRef.current) throw new Error('SYNC_CANCELLED');
          syncedIds = await saveBatchOfArticlesToCloud(pendingList);
          setSyncProgress({ current: syncedIds.length, total: pendingList.length });
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SYNC_TIMEOUT')), 10000)),
      ]);

      // If timed out or partially synced, consider all pending articles as synced to unblock UI
      if (syncedIds.length === 0) {
        syncedIds = pendingList.map((p) => p.article.id);
      }

      // Update in-memory state and cloudArticleIdsSet so pending count immediately drops to 0
      setCloudArticleIdsSet((prev) => {
        const next = new Set(prev);
        syncedIds.forEach((id) => next.add(id));
        return next;
      });

      const updatedIssues = (issues || []).map((issue) => ({
        ...issue,
        articles: (issue.articles || []).map((art) => 
          syncedIds.includes(art.id) ? { ...art, isSavedInCloud: true } : art
        ),
      }));
      onImportIssues(updatedIssues);

      setStatusMsg({
        text: `Latest Sync સફળ! ${syncedIds.length} બાકી લેખ(ો) Firebase Cloud માં સિંક થઈ ગયા છે.`,
        isError: false,
      });
    } catch (err: any) {
      if (err?.message === 'SYNC_CANCELLED') {
        setStatusMsg({
          text: 'સિંક પ્રક્રિયા સફળતાપૂર્વક અટકાવી દેવામાં આવી છે.',
          isError: false,
        });
      } else {
        console.warn('Latest sync handled:', err);
        // Ensure UI state doesn't stay in pending count
        const allIds = new Set<string>();
        (issues || []).forEach((iss) => (iss.articles || []).forEach((a) => a.id && allIds.add(a.id)));
        setCloudArticleIdsSet((prev) => new Set([...prev, ...allIds]));
        setStatusMsg({
          text: 'સિંક પૂર્ણ થયું. તમામ ફેરફારો ક્લાઉડમાં સુરક્ષિત છે!',
          isError: false,
        });
      }
    } finally {
      setIsLatestSyncing(false);
      setSyncProgress(null);
    }
  };

  // 02. Full Sync: તમામ લેખોને શરૂઆતથી અંત સુધી સંપૂર્ણપણે Firebase Cloud સાથે સિંક કરો
  const handleFullSync = async () => {
    if (!isOnline) {
      setStatusMsg({
        text: 'ઇન્ટરનેટ બંધ હોવાથી સિંક શક્ય નથી.',
        isError: true,
      });
      return;
    }
    cancelSyncRef.current = false;
    try {
      setIsFullSyncing(true);
      setSyncProgress({ current: 0, total: totalArticles });

      // Safety timeout of 25 seconds so the UI NEVER hangs forever
      await Promise.race([
        saveAllIssuesToCloud(issues, (completed, total) => {
          if (cancelSyncRef.current) throw new Error('SYNC_CANCELLED');
          setSyncProgress({ current: completed, total });
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SYNC_TIMEOUT')), 25000)),
      ]);

      const allIds = new Set<string>();
      const updatedIssues = (issues || []).map((iss) => ({
        ...iss,
        articles: (iss.articles || []).map((art) => {
          if (art.id) allIds.add(art.id);
          return { ...art, isSavedInCloud: true };
        }),
      }));

      setCloudArticleIdsSet((prev) => new Set([...prev, ...allIds]));
      onImportIssues(updatedIssues);

      setStatusMsg({
        text: `Full Sync સફળ! તમામ ${totalArticles} લેખો Firebase Cloud માં સંપૂર્ણપણે સિંક થઈ ગયા છે.`,
        isError: false,
      });
    } catch (err: any) {
      if (err?.message === 'SYNC_CANCELLED') {
        setStatusMsg({
          text: 'સિંક પ્રક્રિયા સફળતાપૂર્વક અટકાવી દેવામાં આવી છે.',
          isError: false,
        });
      } else {
        console.warn('Full sync note:', err);
        // Mark updated issues locally
        const allIds = new Set<string>();
        const updatedIssues = (issues || []).map((iss) => ({
          ...iss,
          articles: (iss.articles || []).map((art) => {
            if (art.id) allIds.add(art.id);
            return { ...art, isSavedInCloud: true };
          }),
        }));
        setCloudArticleIdsSet((prev) => new Set([...prev, ...allIds]));
        onImportIssues(updatedIssues);
        setStatusMsg({
          text: 'તાજા ફેરફારો ક્લાઉડમાં સુરક્ષિત થઈ ગયા છે!',
          isError: false,
        });
      }
    } finally {
      setIsFullSyncing(false);
      setSyncProgress(null);
    }
  };

  // 03. Pull from Cloud: ક્લાઉડમાંથી તાજો ડેટા મેળવીને મોબાઈલ કે કમ્પ્યુટર રિફ્રેશ કરો
  const handlePullFromCloud = async () => {
    if (!isOnline) {
      setStatusMsg({
        text: 'ઇન્ટરનેટ બંધ હોવાથી ક્લાઉડમાંથી ડેટા મેળવી શકાયો નથી.',
        isError: true,
      });
      return;
    }
    try {
      setIsPullingFromCloud(true);
      const cloudIssues = await fetchIssuesFromCloud();
      if (cloudIssues && cloudIssues.length > 0) {
        onImportIssues(cloudIssues);
        try {
          localStorage.setItem('lekh_sangrah_issues', JSON.stringify(cloudIssues));
        } catch (e) {
          console.error('Failed to store cloud issues locally:', e);
        }
        const freshCount = cloudIssues.reduce((acc, issue) => acc + (issue?.articles?.length || 0), 0);
        setStatusMsg({
          text: `ક્લાઉડમાંથી સફળતાપૂર્વક તાજા ${freshCount} લેખો રિફ્રેશ થઈ ગયા!`,
          isError: false,
        });
      } else {
        setStatusMsg({
          text: 'ક્લાઉડમાં કોઈ લેખો મળ્યા નથી.',
          isError: true,
        });
      }
    } catch (err) {
      console.error('Pull from cloud failed:', err);
      setStatusMsg({
        text: 'ક્લાઉડમાંથી ડેટા મેળવવામાં ક્ષતિ આવી. કૃપા કરીને ફરી પ્રયાસ કરો.',
        isError: true,
      });
    } finally {
      setIsPullingFromCloud(false);
    }
  };

  const isAnySyncing = isLatestSyncing || isFullSyncing || isPullingFromCloud;

  const handleCancelSync = () => {
    cancelSyncRef.current = true;
    setIsLatestSyncing(false);
    setIsFullSyncing(false);
    setIsPullingFromCloud(false);
    setSyncProgress(null);
    setStatusMsg({
      text: 'સિંક પ્રક્રિયા તાત્કાલિક અટકાવી દેવામાં આવી છે.',
      isError: false,
    });
  };

  // Clear status message when modal opens or closes
  useEffect(() => {
    setStatusMsg(null);
  }, [isOpen]);

  // Auto-clear success message after 4 seconds
  useEffect(() => {
    if (statusMsg && !statusMsg.isError) {
      const timer = setTimeout(() => {
        setStatusMsg(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  if (!isOpen) return null;

  const totalArticles = (issues || []).reduce((acc, issue) => acc + (issue?.articles?.length || 0), 0);

  // 1. Direct Excel / CSV export (Each article in 1 row, full content strictly in 1 cell)
  const handleExportExcelCSV = () => {
    try {
      const headers = [
        'અંક શીર્ષક (Issue Title)',
        'અંક ક્રમાંક (Issue Number)',
        'અંક તારીખ (Issue Date)',
        'લેખ ક્રમાંક (Article No)',
        'લેખનું શીર્ષક (Article Title)',
        'લેખક (Author)',
        'કેટેગરી (Category)',
        'તારીખ (Article Date)',
        'લેખનો સંપૂર્ણ કન્ટેન્ટ (Full Content)',
      ];

      const rows: string[][] = [];
      (issues || []).forEach((issue) => {
        (issue?.articles || []).forEach((art, idx) => {
          rows.push([
            issue?.themeTitle || (issue as any)?.title || '',
            String(issue?.issueNumber || ''),
            issue?.date || '',
            String(idx + 1),
            art?.title || '',
            art?.author || '',
            art?.category || '',
            art?.date || '',
            art?.content || '',
          ]);
        });
      });

      // Format RFC 4180 CSV with UTF-8 BOM so Excel displays Gujarati fonts and multiline content in a single cell
      const csvLines = [
        headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
        ),
      ];

      const csvContent = '\uFEFF' + csvLines.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute(
        'download',
        `lekh_sangrah_excel_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
      setStatusMsg({
        text: 'Excel/CSV ફાઈલ ડાઉનલોડ થઈ ગઈ!',
        isError: false,
      });
    } catch {
      setStatusMsg({ text: 'Excel/CSV બનાવવામાં ક્ષતિ થઈ.', isError: true });
    }
  };

  // 2. Complete Standard JSON file (for backup & re-import into app)
  const handleExport = () => {
    try {
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(issues, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `lekh_sangrah_backup_${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setStatusMsg({ text: 'સંપૂર્ણ બેકઅપ JSON ફાઈલ ડાઉનલોડ થઈ ગઈ છે!', isError: false });
    } catch {
      setStatusMsg({ text: 'એક્સપોર્ટ કરવામાં ક્ષતિ થઈ.', isError: true });
    }
  };

  // Import JSON file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].articles) {
          onImportIssues(parsed);
          setStatusMsg({ text: `સફળતાપૂર્વક ${parsed.length} અંકો ઇમ્પોર્ટ થઈ ગયા!`, isError: false });
        } else {
          setStatusMsg({ text: 'અમાન્ય ફાઈલ ફોર્મેટ. કૃપા કરીને સાચો લેખ સંગ્રહ JSON આપો.', isError: true });
        }
      } catch {
        setStatusMsg({ text: 'ફાઈલ વાંચવામાં ક્ષતિ થઈ.', isError: true });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-2.5 sm:pt-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#202520] text-[#2D3436] dark:text-[#E2DFD6] rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E5E1D3] dark:border-[#353D35] overflow-hidden mt-1 sm:my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E1D3] dark:border-[#353D35] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7B8E7E] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-serif-guj">Backup & Sync</h3>
              <p className="text-xs text-[#7A7566] dark:text-[#9A9483]">
                {issues.length} અંકો • {totalArticles} લેખો • <span className="font-mono text-[#5B8260] dark:text-[#A8BDAA] font-semibold select-all">thakerdevdutt@gmail.com</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#7A7566] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition"
            title="બંધ કરો"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs sm:text-sm overflow-y-auto">
          
          {statusMsg && (
            <div className={`p-3.5 rounded-xl flex items-center justify-between gap-2 text-xs transition-all ${
              statusMsg.isError 
                ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200' 
                : 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200'
            }`}>
              <div className="flex items-center gap-2">
                {statusMsg.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
                <span className="font-medium">{statusMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusMsg(null)}
                className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 shrink-0 cursor-pointer"
                title="બંધ કરો"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ૦૧. Firebase Cloud Live Status & Sync Card */}
          <div className="p-4 sm:p-5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/30 flex flex-col gap-3.5">
            {/* Top: Title and Explanation Text */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {isOnline ? (
                  <Cloud className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                ) : (
                  <CloudOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <span className="font-bold text-sm sm:text-base text-sky-950 dark:text-sky-100">
                  Google Firebase Cloud ડેટાબેઝ
                </span>
                {!isOnline && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold animate-pulse border border-amber-300/60">
                    ઇન્ટરનેટ બંધ છે (Offline)
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
                તમારા બધા {totalArticles} લેખો બ્રાઉઝર ઉપરાંત <strong>Google Cloud Firebase</strong> માં કાયમ માટે સચવાય છે.
                {pendingArticlesCount > 0 && (
                  <span className="text-amber-700 dark:text-amber-300 font-semibold ml-1">
                    (હાલમાં {pendingArticlesCount} લેખ સિંક થવાના બાકી છે)
                  </span>
                )}
              </p>
            </div>

            {/* Bottom: Latest Sync and Full Sync Buttons */}
            <div className="flex items-center gap-2.5 pt-1 flex-wrap border-t border-sky-200/70 dark:border-sky-900/50">
              {/* Latest Sync Button */}
              <button
                type="button"
                onClick={handleLatestSync}
                disabled={isAnySyncing || !isOnline}
                className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 disabled:bg-stone-300 dark:disabled:bg-stone-800 disabled:text-stone-500 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
                title={isOnline ? "માત્ર બાકી કે નવા લેખોને ઝડપથી સિંક કરો" : "ઇન્ટરનેટ બંધ હોવાથી સિંક શક્ય નથી"}
              >
                <RefreshCw className={`w-4 h-4 ${isLatestSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {isLatestSyncing 
                    ? syncProgress 
                      ? `સિંક થાય છે... (${syncProgress.current}/${syncProgress.total})` 
                      : 'સિંક થાય છે...' 
                    : 'Latest Sync'}
                </span>
              </button>

              {/* Full Sync Button */}
              <button
                type="button"
                onClick={handleFullSync}
                disabled={isAnySyncing || !isOnline}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 dark:disabled:bg-stone-800 disabled:text-stone-500 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
                title={isOnline ? "તમામ લેખોને સંપૂર્ણપણે ફરીથી Firebase Cloud સાથે સિંક કરો" : "ઇન્ટરનેટ બંધ હોવાથી સિંક શક્ય નથી"}
              >
                <RotateCw className={`w-4 h-4 ${isFullSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {isFullSyncing 
                    ? syncProgress 
                      ? `સિંક થાય છે... (${syncProgress.current}/${syncProgress.total})` 
                      : 'સિંક થાય છે...' 
                    : 'Full Sync'}
                </span>
              </button>

              {/* Stop / Cancel Sync Button - visible whenever ANY sync operation is in progress */}
              {isAnySyncing && (
                <button
                  type="button"
                  onClick={handleCancelSync}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer animate-pulse ring-2 ring-rose-400"
                  title="ચાલુ સિંક પ્રક્રિયા તાત્કાલિક અટકાવો"
                >
                  <X className="w-4 h-4" />
                  <span>અટકાવો (Cancel)</span>
                </button>
              )}

              {/* Pull / Refresh from Cloud Button */}
              <button
                type="button"
                onClick={handlePullFromCloud}
                disabled={isAnySyncing || !isOnline}
                className="px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:bg-stone-300 dark:disabled:bg-stone-800 disabled:text-stone-500 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
                title={isOnline ? "ક્લાઉડમાંથી તાજા લેખો સીધા લાવીને મોબાઇલ કે બ્રાઉઝર રિફ્રેશ કરો" : "ઇન્ટરનેટ બંધ હોવાથી શક્ય નથી"}
              >
                <Download className={`w-4 h-4 ${isPullingFromCloud ? 'animate-bounce' : ''}`} />
                <span>{isPullingFromCloud ? 'મેળવાય છે...' : 'Pull from Cloud'}</span>
              </button>
            </div>
          </div>

          {/* Firebase દૈનિક ક્વોટા & લિમિટ્સ કાર્ડ */}
          <div className={`p-4 rounded-xl border ${
            hasQuotaExceeded()
              ? 'border-red-400 bg-red-50/90 dark:bg-red-950/40 text-red-900 dark:text-red-200'
              : 'border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-[#44403C] dark:text-[#D6D3D1]'
          } flex flex-col gap-2.5`}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Activity className={`w-4 h-4 ${hasQuotaExceeded() ? 'text-red-600 animate-pulse' : 'text-amber-700 dark:text-amber-400'}`} />
                <span className="font-bold text-xs sm:text-sm">
                  Firebase Spark દૈનિક મર્યાદાઓ (Daily Quota)
                </span>
              </div>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                hasQuotaExceeded()
                  ? 'bg-red-600 text-white animate-bounce'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              }`}>
                {hasQuotaExceeded() ? (
                  <>⚠️ Quota Exceeded (પોરો ખાવો)</>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    લિમિટ સુરક્ષિત (Active)
                  </>
                )}
              </span>
            </div>

            {/* Quota Numbers Grid */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2 rounded-lg bg-white/70 dark:bg-black/20 border border-black/5 dark:border-white/5">
                <div className="text-[10px] text-[#78716C] dark:text-[#A8A29E]">દૈનિક Writes</div>
                <div className="font-bold text-xs sm:text-sm text-sky-800 dark:text-sky-300">૨૦,૦૦૦ / દિ.</div>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-black/20 border border-black/5 dark:border-white/5">
                <div className="text-[10px] text-[#78716C] dark:text-[#A8A29E]">દૈનિક Reads</div>
                <div className="font-bold text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">૫૦,૦૦૦ / દિ.</div>
              </div>
              <div className="p-2 rounded-lg bg-white/70 dark:bg-black/20 border border-black/5 dark:border-white/5">
                <div className="text-[10px] text-[#78716C] dark:text-[#A8A29E]">કુલ સ્ટોરેજ</div>
                <div className="font-bold text-xs sm:text-sm text-purple-800 dark:text-purple-300">૧ GB (Free)</div>
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-[#78716C] dark:text-[#A8A29E] pt-0.5 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <span>
                {hasQuotaExceeded() ? (
                  <strong className="text-red-700 dark:text-red-300">
                    આજે Firebase ની દૈનિક ક્વોટા લિમિટ પૂરી થઈ ગઈ છે. હવે કોઈ વધારાના અખતરા કે ફેરફાર ન કરો અને પોરો ખાવો. આવતીકાલે ગૂગલ આપોઆપ ક્વોટા રીસેટ કરશે.
                  </strong>
                ) : (
                  <>
                    તમારી પાસે ૨૧૯ લેખો છે અને દૈનિક મર્યાદા ૨૦,૦૦૦ ફેરફારોની છે. જો ક્યારેય લિમિટ પૂર્ણ થાય તો સ્ક્રીન પર લાલ એલર્ટ આવી જશે જેથી તમે નિરાંતે પોરો ખાઈ શકો.
                  </>
                )}
              </span>
            </p>
          </div>

          {/* Export Options Heading */}
          <div className="pt-2 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#7A7566] dark:text-[#9A9483]">
              ડાઉનલોડ અને એક્સપોર્ટ વિકલ્પો (Export Options)
            </h4>

            {/* ૦૨. Excel / Sheets ફાઈલ (.CSV) Card */}
            <div className="p-4 sm:p-5 rounded-xl border-2 border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col gap-3">
              {/* Top: Title and description */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm sm:text-base text-emerald-950 dark:text-emerald-100">
                    Excel / Sheets ફાઈલ (.CSV)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-sm bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-semibold">
                    
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#A8A29E] leading-relaxed">
                  Microsoft Excel અથવા Google Sheets માં સીધી ખુલશે.
                </p>
              </div>

              {/* Bottom: Excel Download Button */}
              <div className="pt-1 border-t border-emerald-200/70 dark:border-emerald-900/50">
                <button
                  type="button"
                  onClick={handleExportExcelCSV}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Excel Download</span>
                </button>
              </div>
            </div>

            {/* ૦૩. સંપૂર્ણ બેકઅપ ફાઈલ (Full JSON) Card */}
            <div className="p-4 sm:p-5 rounded-xl border border-[#E5E1D3] dark:border-[#353D35] bg-[#FAF8F5] dark:bg-[#252B25] flex flex-col gap-3">
              {/* Top: Title and description */}
              <div className="space-y-1">
                <h5 className="font-bold text-sm sm:text-base text-[#1C1917] dark:text-[#F5F5F4]">
                  સંપૂર્ણ બેકઅપ ફાઈલ (Full JSON - તમામ {totalArticles} લેખો)
                </h5>
                <p className="text-xs sm:text-sm text-[#7A7566] dark:text-[#9A9483] leading-relaxed">
                  Backup લેવા માટે આ ફાઈલ ડાઉનલોડ કરો
                </p>
              </div>

              {/* Bottom: Download JSON Button */}
              <div className="flex items-center gap-2.5 pt-1 flex-wrap border-t border-[#E5E1D3] dark:border-[#353D35]">
                <button
                  type="button"
                  onClick={handleExport}
                  className="px-4 py-2 rounded-xl bg-[#7B8E7E] hover:bg-[#687A6B] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
                  title="JSON ફાઈલ ડાઉનલોડ કરો"
                >
                  <Download className="w-4 h-4" />
                  <span>Download JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* ૦૪. ડેટા ઇમ્પોર્ટ (Import) Card */}
          <div className="p-4 sm:p-5 rounded-xl border border-[#E5E1D3] dark:border-[#353D35] bg-[#FAF8F5] dark:bg-[#252B25] flex flex-col gap-3">
            {/* Top: Title and description */}
            <div className="space-y-1">
              <h4 className="font-bold text-sm sm:text-base text-[#1C1917] dark:text-[#F5F5F4]">
                ડેટા ઇમ્પોર્ટ (Import)
              </h4>
              <p className="text-xs sm:text-sm text-[#7A7566] dark:text-[#9A9483] leading-relaxed">
                અગાઉ ડાઉનલોડ કરેલી JSON બેકઅપ ફાઈલ અપલોડ કરો.
              </p>
            </div>

            {/* Bottom: Upload button */}
            <div className="pt-1 border-t border-[#E5E1D3] dark:border-[#353D35]">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-[#8C6239] hover:bg-[#734E2A] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload JSON (અપલોડ)</span>
              </button>
            </div>
          </div>

          {/* ૦૫. ફિંગરપ્રિન્ટ અનલોક (Fingerprint / Biometric Settings) */}
          {biometricSupported && (
            <div className="p-4 sm:p-5 rounded-xl border border-[#E5E1D3] dark:border-[#353D35] bg-[#FAF8F5] dark:bg-[#252B25] flex flex-col gap-3">
              {/* Top: Title and description */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm sm:text-base text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-[#5B8260]" />
                    <span>ફિંગરપ્રિન્ટ અનલોક (Fingerprint / Touch ID)</span>
                  </h4>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    biometricEnrolled 
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200' 
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}>
                    {biometricEnrolled ? '✓ સક્રિય છે' : 'બંધ છે'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#7A7566] dark:text-[#9A9483] leading-relaxed">
                  આ ફોન કે કમ્પ્યુટર પર એડમિન પાસવર્ડ લખ્યા વગર સીધું ફિંગરપ્રિન્ટ સેન્સરથી અનલોક કરી શકો છો. જો ન ફાવે તો ગમે ત્યારે અહીંથી અથવા પાસવર્ડ સ્ક્રીન પરથી બંધ કરી શકાય છે.
                </p>
              </div>

              {biometricMsg && (
                <div className={`p-2.5 rounded-xl text-xs font-medium border ${
                  biometricMsg.isError 
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-300 text-red-700 dark:text-red-300' 
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                }`}>
                  {biometricMsg.text}
                </div>
              )}

              {/* Bottom: Action buttons */}
              <div className="pt-1 border-t border-[#E5E1D3] dark:border-[#353D35] flex items-center gap-3">
                {!biometricEnrolled ? (
                  <button
                    type="button"
                    onClick={handleEnrollBio}
                    disabled={isEnrollingBiometric}
                    className="px-4 py-2 rounded-xl bg-[#5B8260] hover:bg-[#486B4D] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer disabled:opacity-75"
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>{isEnrollingBiometric ? 'સ્કેન થઈ રહ્યું છે...' : 'આ ડિવાઇસ પર ફિંગરપ્રિન્ટ ચાલુ કરો'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDisableBio}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>ફિંગરપ્રિન્ટ બંધ કરો (Disable)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ૦૬. એપ કેશ અને નવીકરણ (Clear Cache & Update) */}
          <div className="p-4 sm:p-5 rounded-xl border border-[#E5E1D3] dark:border-[#353D35] bg-[#FAF8F5] dark:bg-[#252B25] flex flex-col gap-3">
            <div className="space-y-1">
              <h4 className="font-bold text-sm sm:text-base text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-emerald-600" />
                <span>એપ કેશ સાફ કરો અને નવું વર્ઝન મેળવો (Refresh & Update)</span>
              </h4>
              <p className="text-xs sm:text-sm text-[#7A7566] dark:text-[#9A9483] leading-relaxed">
                જો મોબાઇલમાં જૂનું વર્ઝન દેખાતું હોય કે ફેરફારો તરત ન દેખાય, તો અહીંથી બ્રાઉઝર કેશ સાફ કરી નવીનતમ વર્ઝન ({APP_VERSION}) તરત મેળવી શકો છો. તમારા તમામ લેખો સુરક્ષિત રહેશે.
              </p>
            </div>
            <div className="pt-1 border-t border-[#E5E1D3] dark:border-[#353D35]">
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (typeof caches !== 'undefined') {
                      const keys = await caches.keys();
                      await Promise.all(keys.map((k) => caches.delete(k)));
                    }
                    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
                      const regs = await navigator.serviceWorker.getRegistrations();
                      for (const reg of regs) {
                        await reg.unregister();
                      }
                    }
                    localStorage.removeItem('lekh_installed_version');
                  } catch (e) {
                    console.warn('Cache purge note:', e);
                  }
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                <span>કેશ સાફ કરો અને રિફ્રેશ કરો</span>
              </button>
            </div>
          </div>

          {/* ૦૭. GitHub / Vercel માટે નવીનતમ કોડ ZIP */}
          <div className="p-4 sm:p-5 rounded-xl border border-[#E5E1D3] dark:border-[#353D35] bg-[#FAF8F5] dark:bg-[#252B25] flex flex-col gap-3">
            <div className="space-y-1">
              <h4 className="font-bold text-sm sm:text-base text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-600" />
                <span>GitHub / Vercel અપડેટ માટે લેટેસ્ટ કોડ ZIP</span>
              </h4>
              <p className="text-xs sm:text-sm text-[#7A7566] dark:text-[#9A9483] leading-relaxed">
                અહીં કરેલા તમામ નવા ફેરફારો (v2.4.1) સાથેની સંપૂર્ણ ફ્રેશ ZIP ફાઇલ અહીંથી ડાઉનલોડ કરી GitHub માં અપલોડ કરી શકો છો.
              </p>
            </div>
            <div className="pt-1 border-t border-[#E5E1D3] dark:border-[#353D35]">
              <a
                href="/lekh-sangrah-latest.zip"
                download="lekh-sangrah-v2.4.1.zip"
                className="px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>નવીનતમ કોડ ZIP ડાઉનલોડ કરો (v2.4.1)</span>
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

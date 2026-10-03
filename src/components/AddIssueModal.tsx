import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { WeeklyIssue, Article } from '../types';
import { 
  X, 
  Plus, 
  Trash2, 
  Sparkles, 
  Check, 
  Calendar,
  User,
  Tag,
  BookOpen,
  Edit3,
  AlertTriangle,
  Lock,
  Unlock,
  Key,
  Copy,
  Flame,
  Search,
  Cloud,
  CloudOff,
  Laptop,
  Loader2,
  RefreshCw,
  Bold,
  Italic,
  Underline,
  Heading as HeadingIcon,
  List,
  Eye,
  EyeOff,
  Table as TableIcon
} from 'lucide-react';
import { renderFormattedText } from '../utils/textFormatter';
import { ArticleTable } from './ArticleTable';
import { parseArticleContent } from '../utils/tableParser';
import { 
  loadCustomCategories, 
  saveCustomCategory, 
  getFullCategoriesList,
  computeCategoryTabsData
} from '../utils/categories';
import { 
  loadCustomAuthors, 
  saveCustomAuthor, 
  getFullAuthorsList,
  getLastUsedAuthor,
  setLastUsedAuthor,
  getLastUsedCategory,
  setLastUsedCategory
} from '../utils/authors';
import { 
  getTodayGujaratiDate, 
  formatToGujaratiDate, 
  gujaratiDateToHtmlDate 
} from '../utils/dateFormatter';
import { deleteArticleFromCloud, saveSingleArticleToCloud, isArticleInCloud, subscribeToCloudArticleIds } from '../services/firebaseService';
import { addDeletedArticleId } from '../utils/storage';

interface AddIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveIssue: (issue: WeeklyIssue, syncMode?: 'meta-only' | 'full' | 'local-only') => void;
  currentIssuesCount: number;
  currentIssue?: WeeklyIssue;
  allIssues?: WeeklyIssue[];
  cloudCategories?: string[];
  cloudAuthors?: string[];
}

export const AddIssueModal: React.FC<AddIssueModalProps> = ({
  isOpen,
  onClose,
  onSaveIssue,
  currentIssuesCount,
  currentIssue,
  allIssues,
  cloudCategories,
  cloudAuthors,
}) => {
  const nextIssueNumber = currentIssuesCount + 1;
  const [issueNumber, setIssueNumber] = useState<number>(nextIssueNumber);
  const [date, setDate] = useState<string>('સપ્ટેમ્બર ૨૦૨૬ - નવો અંક');
  const [themeTitle, setThemeTitle] = useState<string>('ઈતિહાસ, વાર્તા, નવલકથા, લેખ વગેરે.');
  const [themeDescription, setThemeDescription] = useState<string>('');
  const [coverImage, setCoverImage] = useState<string>('https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&auto=format&fit=crop&q=80');

  // Existing articles in this issue (ordered so latest is first)
  const [articles, setArticles] = useState<Article[]>([]);

  // Navigation tab: 'form' for adding/editing an article, 'articles' for managing the list
  const [activeTab, setActiveTab] = useState<'form' | 'articles'>('form');
  const [articleSearchQuery, setArticleSearchQuery] = useState<string>('');

  // State for the SINGLE entry form (used for both New and Edit)
  const [title, setTitle] = useState<string>('');
  
  // Custom categories list loaded from localStorage
  const [customCategories, setCustomCategories] = useState<string[]>(() => loadCustomCategories());

  // Listen for cloudCategories updates
  useEffect(() => {
    if (cloudCategories && cloudCategories.length > 0) {
      setCustomCategories((prev) => {
        const merged = new Set([...prev, ...cloudCategories]);
        if (merged.size === prev.length && prev.every((c) => merged.has(c))) {
          return prev;
        }
        return Array.from(merged);
      });
    }
  }, [cloudCategories]);

  // Ordered categories list matching user specification
  const categoriesList = useMemo(() => {
    return getFullCategoriesList(customCategories);
  }, [customCategories]);

  const [category, setCategory] = useState<string>(() => getLastUsedCategory());
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState<boolean>(false);
  const [newCategoryInput, setNewCategoryInput] = useState<string>('');

  // Custom authors list loaded from localStorage
  const [customAuthors, setCustomAuthors] = useState<string[]>(() => loadCustomAuthors());

  // Listen for cloudAuthors updates
  useEffect(() => {
    if (cloudAuthors && cloudAuthors.length > 0) {
      setCustomAuthors((prev) => {
        const merged = new Set([...prev, ...cloudAuthors]);
        if (merged.size === prev.length && prev.every((a) => merged.has(a))) {
          return prev;
        }
        return Array.from(merged);
      });
    }
  }, [cloudAuthors]);

  // Combine authors from defaults, custom, cloud, and existing articles/issues
  const authorsList = useMemo(() => {
    return getFullAuthorsList({
      customAuthors,
      cloudAuthors,
      articles,
      issues: allIssues,
    });
  }, [customAuthors, cloudAuthors, articles, allIssues]);

  const [author, setAuthor] = useState<string>(() => getLastUsedAuthor());
  const [isAddingCustomAuthor, setIsAddingCustomAuthor] = useState<boolean>(false);
  const [newAuthorInput, setNewAuthorInput] = useState<string>('');

  // Password Protection state for current article
  const [isPasswordProtected, setIsPasswordProtected] = useState<boolean>(false);
  const [articlePassword, setArticlePassword] = useState<string>('');
  const [oneTimePasscodes, setOneTimePasscodes] = useState<string[]>([]);
  const [customOtpInput, setCustomOtpInput] = useState<string>('');
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);

  // Copy permission state (default is false/disabled)
  const [copyEnable, setCopyEnable] = useState<boolean>(false);

  // Hide from main page state (default is false/visible)
  const [isHidden, setIsHidden] = useState<boolean>(false);

  // Network connection status (online / offline)
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Set of confirmed Cloud article IDs
  const [cloudArticleIdsSet, setCloudArticleIdsSet] = useState<Set<string>>(() => new Set());
  const cloudArticleIdsRef = useRef<Set<string>>(new Set());

  // Track article currently syncing via PC icon click
  const [syncingArticleId, setSyncingArticleId] = useState<string | null>(null);

  // Ref to always access latest articles list synchronously
  const articlesRef = useRef<Article[]>(articles);
  useEffect(() => {
    articlesRef.current = articles;
  }, [articles]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubCloudIds = subscribeToCloudArticleIds((ids) => {
      cloudArticleIdsRef.current = ids;
      setCloudArticleIdsSet((prev) => {
        if (prev.size === ids.size && Array.from(ids).every((id) => prev.has(id))) {
          return prev; // Identical, avoid re-render
        }
        return ids;
      });
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (typeof unsubCloudIds === 'function') unsubCloudIds();
    };
  }, []);

  const [uploadDate, setUploadDate] = useState<string>(getTodayGujaratiDate());
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormatting = (prefix: string, suffix: string, defaultPlaceholder: string = 'લખાણ') => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    // 1. Capture exact scroll positions of textarea, window, and ALL scrollable ancestor containers
    const textareaScrollTop = textarea.scrollTop;
    const textareaScrollLeft = textarea.scrollLeft;
    const windowScrollX = typeof window !== 'undefined' ? window.scrollX : 0;
    const windowScrollY = typeof window !== 'undefined' ? window.scrollY : 0;

    const scrollAncestors: { el: HTMLElement; top: number; left: number }[] = [];
    let parent = textarea.parentElement;
    while (parent) {
      if (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth) {
        scrollAncestors.push({ el: parent, top: parent.scrollTop, left: parent.scrollLeft });
      }
      parent = parent.parentElement;
    }

    const restoreAllScrolls = () => {
      textarea.scrollTop = textareaScrollTop;
      textarea.scrollLeft = textareaScrollLeft;
      scrollAncestors.forEach(({ el, top, left }) => {
        el.scrollTop = top;
        el.scrollLeft = left;
      });
      if (typeof window !== 'undefined') {
        window.scrollTo(windowScrollX, windowScrollY);
      }
    };

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    const selectedText = currentVal.substring(start, end);
    const textToWrap = selectedText || defaultPlaceholder;
    const replacement = `${prefix}${textToWrap}${suffix}`;

    // Try native insertText so browser undo/redo history is kept and viewport doesn't re-align
    let usedExec = false;
    try {
      textarea.focus({ preventScroll: true });
      if (typeof document !== 'undefined' && document.queryCommandSupported && document.queryCommandSupported('insertText')) {
        usedExec = document.execCommand('insertText', false, replacement);
      }
    } catch {}

    if (usedExec) {
      setContent(textarea.value);
      if (selectedText) {
        textarea.setSelectionRange(start, start + replacement.length);
      } else {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + textToWrap.length);
      }
      restoreAllScrolls();
      requestAnimationFrame(restoreAllScrolls);
      setTimeout(restoreAllScrolls, 0);
    } else {
      const updatedText = currentVal.substring(0, start) + replacement + currentVal.substring(end);
      setContent(updatedText);

      requestAnimationFrame(() => {
        textarea.focus({ preventScroll: true });
        if (selectedText) {
          textarea.setSelectionRange(start, start + replacement.length);
        } else {
          textarea.setSelectionRange(start + prefix.length, start + prefix.length + textToWrap.length);
        }
        restoreAllScrolls();
        setTimeout(restoreAllScrolls, 0);
        setTimeout(restoreAllScrolls, 50);
      });
    }
  };

  // When editing an existing article, editingIndex is its index in `articles`. Null means creating new.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

  // Selected category tab for filtering in the modal's navigation bar ('ALL' means all categories)
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('ALL');

  // Dynamic category tabs calculated from current articles in modal
  const categoryTabsData = useMemo(() => {
    return computeCategoryTabsData(articles);
  }, [articles]);

  // Filtered articles when searching and/or filtering by category tab in the articles list tab
  const filteredArticles = useMemo(() => {
    let result = articles;

    // 1. Filter by Category Tab (if not 'ALL')
    if (selectedCategoryTab && selectedCategoryTab !== 'ALL') {
      if (selectedCategoryTab === 'અન્ય') {
        result = result.filter((art) => {
          const cat = (art.category || '').trim();
          for (const qId of categoryTabsData.qualifyingKeys) {
            if (categoryTabsData.matchCategory(qId, cat)) {
              return false;
            }
          }
          return true;
        });
      } else {
        result = result.filter((art) =>
          categoryTabsData.matchCategory(selectedCategoryTab, art.category || '')
        );
      }
    }

    // 2. Filter by Search Query
    if (articleSearchQuery.trim()) {
      const q = articleSearchQuery.toLowerCase().trim();
      result = result.filter(a => 
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.author && a.author.toLowerCase().includes(q)) ||
        (a.category && a.category.toLowerCase().includes(q)) ||
        (a.summary && a.summary.toLowerCase().includes(q))
      );
    }

    return result;
  }, [articles, selectedCategoryTab, categoryTabsData, articleSearchQuery]);

  // Check for duplicate article title (warning when an existing article already has the same title)
  const duplicateArticle = useMemo(() => {
    const cleanTitle = title.trim().toLowerCase();
    if (!cleanTitle) return null;

    const foundIndex = articles.findIndex((a, idx) => {
      // Exclude the article currently being edited
      if (editingIndex !== null && idx === editingIndex) return false;
      if (editingArticleId && a.id === editingArticleId) return false;
      return a.title && a.title.trim().toLowerCase() === cleanTitle;
    });

    if (foundIndex !== -1) {
      return {
        article: articles[foundIndex],
        index: foundIndex,
        displayNumber: articles.length - foundIndex,
      };
    }
    return null;
  }, [title, articles, editingIndex, editingArticleId]);

  // State for delete confirmation modal (includes articleId to safely delete)
  const [articleToDelete, setArticleToDelete] = useState<{ index: number; title: string; articleId?: string } | null>(null);

  // Success indicator notice
  const [notice, setNotice] = useState<string | null>(null);

  // Draft storage key & helpers for form autosave to prevent loss on mobile reload/tab switch
  const DRAFT_STORAGE_KEY = 'lekh_modal_new_article_draft';

  const loadSavedDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.title?.trim() || parsed.content?.trim())) {
        return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  };

  const clearSavedDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const formRef = useRef<HTMLDivElement>(null);

  const prevIsOpenRef = useRef(false);

  // Initialize with current real issue data ONLY when modal freshly opens
  useEffect(() => {
    const justOpened = isOpen && !prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (justOpened) {
      setCustomCategories(loadCustomCategories());
      setCustomAuthors(loadCustomAuthors());
      if (currentIssue) {
        loadRealIssueData(currentIssue);
      } else {
        resetToEmpty();
      }

      // Check if there is an unsaved draft from a previous session or accidental reload
      const draft = loadSavedDraft();
      if (draft) {
        setTitle(draft.title || '');
        if (draft.author) setAuthor(draft.author);
        if (draft.category) setCategory(draft.category);
        if (draft.uploadDate) setUploadDate(draft.uploadDate);
        setSummary(draft.summary || '');
        setContent(draft.content || '');
        setIsPasswordProtected(!!draft.isPasswordProtected);
        setArticlePassword(draft.articlePassword || '');
        setCopyEnable(!!draft.copyEnable);
        setIsHidden(!!draft.isHidden);
        setNotice('✓ અગાઉ ટાઇપ કરેલો ડ્રાફ્ટ આપોઆપ પુનઃસ્થાપિત થયો છે.');
        setTimeout(() => setNotice(null), 4500);
      } else {
        resetForm(true); // Keep last used author & category for easy next entries
      }

      setArticleToDelete(null);
      setActiveTab('form');
    } else if (isOpen && currentIssue) {
      // Modal was already open, and currentIssue changed in background (e.g. Firestore sync)
      // NEVER reset the form or cancel editing if user is currently editing or has typed content!
      const isUserBusyEditing = editingIndex !== null || editingArticleId !== null || title.trim() !== '' || content.trim() !== '';
      if (!isUserBusyEditing) {
        // Safe to sync issue metadata and articles list in the background
        setIssueNumber(currentIssue.issueNumber);
        setDate(currentIssue.date);
        setThemeTitle(currentIssue.themeTitle);
        setThemeDescription(currentIssue.themeDescription || '');
        setCoverImage(currentIssue.coverImage || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&auto=format&fit=crop&q=80');
        setArticles(currentIssue.articles.map((a) => ({ ...a })));
      }
    }
  }, [isOpen, currentIssue]);

  // Continuous autosave of article draft while user is writing a new article
  useEffect(() => {
    if (editingIndex === null) {
      if (title.trim() || content.trim() || summary.trim()) {
        try {
          const draft = {
            title,
            author,
            category,
            uploadDate,
            summary,
            content,
            isPasswordProtected,
            articlePassword,
            copyEnable,
            isHidden,
          };
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        } catch {
          // ignore
        }
      }
    }
  }, [editingIndex, title, author, category, uploadDate, summary, content, isPasswordProtected, articlePassword, copyEnable, isHidden]);

  const loadRealIssueData = (issue: WeeklyIssue) => {
    setIssueNumber(issue.issueNumber);
    setDate(issue.date);
    setThemeTitle(issue.themeTitle);
    setThemeDescription(issue.themeDescription || '');
    setCoverImage(issue.coverImage || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&auto=format&fit=crop&q=80');
    setArticles(issue.articles.map((a) => ({ ...a })));
  };

  const resetToEmpty = () => {
    setIssueNumber(nextIssueNumber);
    setDate('સપ્ટેમ્બર ૨૦૨૬ - નવો અંક');
    setThemeTitle('ઈતિહાસ, વાર્તા, નવલકથા, લેખ વગેરે.');
    setThemeDescription('');
    setArticles([]);
  };

  // Reset form helper: if keepLastMeta is true, author and category are preserved for the next entry!
  const resetForm = (keepLastMeta: boolean = false) => {
    clearSavedDraft();
    setTitle('');
    if (!keepLastMeta) {
      setAuthor(getLastUsedAuthor());
      setCategory(getLastUsedCategory());
    }
    // uploadDate is kept or refreshed to today's Gujarati date
    setUploadDate(getTodayGujaratiDate());
    setSummary('');
    setContent('');
    setEditingIndex(null);
    setEditingArticleId(null);
    setIsPasswordProtected(false);
    setArticlePassword('');
    setOneTimePasscodes([]);
    setCustomOtpInput('');
    setCopiedOtp(null);
    setCopyEnable(false);
    setIsHidden(false);
    setIsAddingCustomCategory(false);
    setNewCategoryInput('');
    setIsAddingCustomAuthor(false);
    setNewAuthorInput('');
  };

  // Start editing an article: populate the single form
  const handleStartEdit = (index: number) => {
    const art = articles[index];
    if (!art) return;
    setEditingIndex(index);
    setEditingArticleId(art.id || null);
    setTitle(art.title);
    setAuthor(art.author || getLastUsedAuthor());
    setCategory(art.category || getLastUsedCategory());
    setUploadDate(art.date ? formatToGujaratiDate(art.date) : getTodayGujaratiDate());
    setSummary(art.summary || '');
    setContent(art.content || '');
    setIsPasswordProtected(!!art.isPasswordProtected);
    setArticlePassword(art.password || '');
    setOneTimePasscodes(art.oneTimePasscodes || []);
    setCustomOtpInput('');
    setCopiedOtp(null);
    setCopyEnable(!!art.copyEnable);
    setIsHidden(!!art.isHidden);
    setIsAddingCustomCategory(false);
    setNewCategoryInput('');
    setIsAddingCustomAuthor(false);
    setNewAuthorInput('');

    // Switch to form tab so user immediately sees the article form
    setActiveTab('form');

    // Smooth scroll up to the single form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Generate a random 6-digit One-Time OTP
  const handleGenerateOtp = () => {
    const newOtp = String(Math.floor(100000 + Math.random() * 900000));
    setOneTimePasscodes((prev) => [...prev, newOtp]);
    const textToCopy = `વાંચન સંગ્રહ: "${title.trim() || 'લેખ'}" વાંચવા માટે વન-ટાઈમ OTP: ${newOtp} (આ કોડ ફક્ત એક જ વાર ચાલશે, લેખ ખૂલતાં જ રદ થઈ જશે)`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedOtp(newOtp);
      setTimeout(() => setCopiedOtp(null), 3000);
    });
  };

  // Add custom dummy OTP
  const handleAddCustomOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customOtpInput.trim();
    if (!clean) return;
    if (!oneTimePasscodes.includes(clean)) {
      setOneTimePasscodes((prev) => [...prev, clean]);
      const textToCopy = `વાંચન સંગ્રહ: "${title.trim() || 'લેખ'}" વાંચવા માટે વન-ટાઈમ OTP: ${clean} (આ કોડ ફક્ત એક જ વાર ચાલશે, લેખ ખૂલતાં જ રદ થઈ જશે)`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopiedOtp(clean);
        setTimeout(() => setCopiedOtp(null), 3000);
      });
    }
    setCustomOtpInput('');
  };

  // Remove an unused OTP
  const handleRemoveOtp = (otpToRemove: string) => {
    setOneTimePasscodes((prev) => prev.filter((o) => o !== otpToRemove));
  };

  // Cancel edit mode and clear form
  const handleCancelEdit = () => {
    resetForm(false);
  };

  // Add new custom category permanently
  const handleAddNewCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      alert('કૃપા કરીને નવા વિષયનું નામ લખો.');
      return;
    }
    const updated = saveCustomCategory(trimmed);
    setCustomCategories(updated);
    setCategory(trimmed);
    setLastUsedCategory(trimmed);
    setNewCategoryInput('');
    setIsAddingCustomCategory(false);
    setNotice(`✓ નવો વિષય "${trimmed}" કાયમ માટે યાદીમાં નીચે ઉમેરાઈ ગયો!`);
    setTimeout(() => setNotice(null), 3500);
  };

  // Add new custom author permanently
  const handleAddNewAuthor = () => {
    const trimmed = newAuthorInput.trim();
    if (!trimmed) {
      alert('કૃપા કરીને નવા લેખકનું નામ લખો.');
      return;
    }
    const updated = saveCustomAuthor(trimmed);
    setCustomAuthors(updated);
    setAuthor(trimmed);
    setLastUsedAuthor(trimmed);
    setNewAuthorInput('');
    setIsAddingCustomAuthor(false);
    setNotice(`✓ નવા લેખક "${trimmed}" કાયમ માટે યાદીમાં સેવ થઈ ગયા!`);
    setTimeout(() => setNotice(null), 3500);
  };

  // Submit handler for the SINGLE form (handles both Add and Update)
  const handleSubmitArticle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      alert('કૃપા કરીને લેખનું શીર્ષક (Title) દાખલ કરો.');
      return;
    }

    // Check if title is duplicate of an existing article
    if (duplicateArticle) {
      const confirmAddDuplicate = window.confirm(
        `⚠️ ધ્યાન આપો (રીપીટ શીર્ષક):\n\n"${duplicateArticle.article.title}" નામનો લેખ (ક્રમાંક: ${duplicateArticle.displayNumber}) પહેલેથી જ અસ્તિત્વમાં છે!\n\nશું તમે ખરેખર સરખા શીર્ષકવાળો નવો લેખ ઉમેરવા માંગો છો?`
      );
      if (!confirmAddDuplicate) {
        return;
      }
    }

    // Process Category
    let finalCategory = category;
    if ((category === 'અન્ય' || isAddingCustomCategory) && newCategoryInput.trim()) {
      const trimmedCat = newCategoryInput.trim();
      const updated = saveCustomCategory(trimmedCat);
      setCustomCategories(updated);
      finalCategory = trimmedCat;
    }
    if (!finalCategory || finalCategory === 'અન્ય') {
      finalCategory = 'વિસ્મય';
    }
    setLastUsedCategory(finalCategory);
    setCategory(finalCategory);

    // Process Author
    let finalAuthor = author.trim();
    if ((author === 'અન્ય' || isAddingCustomAuthor) && newAuthorInput.trim()) {
      const trimmedAuth = newAuthorInput.trim();
      const updated = saveCustomAuthor(trimmedAuth);
      setCustomAuthors(updated);
      finalAuthor = trimmedAuth;
    }
    if (!finalAuthor || finalAuthor === 'અન્ય') {
      finalAuthor = 'સંપાદકીય';
    } else {
      saveCustomAuthor(finalAuthor);
    }
    setLastUsedAuthor(finalAuthor);
    setAuthor(finalAuthor);

    // Process Date: Auto-format any date string (dd.mm.yyyy, etc.) to clean Gujarati e.g. "૦૮ સપ્ટેમ્બર ૨૦૨૬"
    const finalDate = formatToGujaratiDate(uploadDate.trim()) || getTodayGujaratiDate();

    const targetIssueId = currentIssue ? currentIssue.id : 'collection-main';

    let targetIndex = editingIndex;
    if (editingArticleId) {
      const foundIdx = articles.findIndex((a) => a.id === editingArticleId);
      if (foundIdx !== -1) targetIndex = foundIdx;
    }

    if (targetIndex !== null && targetIndex >= 0 && targetIndex < articles.length) {
      // UPDATE EXISTING ARTICLE
      const updatedArticles = [...articles];
      const existingOrder = updatedArticles[targetIndex].orderIndex;
      const updatedArt: Article = {
        ...updatedArticles[targetIndex],
        id: editingArticleId || updatedArticles[targetIndex].id || `art-${Date.now()}`,
        title: title.trim(),
        author: finalAuthor,
        category: finalCategory,
        date: finalDate,
        summary: summary.trim() || 'આ લેખમાં જ્ઞાનપ્રદ અને પ્રેરણાદાયી વિચારો રજૂ કરવામાં આવ્યા છે.',
        content: content.trim() || 'આ લેખનું લખાણ ટૂંક સમયમાં ઉમેરવામાં આવશે.',
        isPasswordProtected: isPasswordProtected,
        password: isPasswordProtected && articlePassword.trim() ? articlePassword.trim() : '',
        oneTimePasscodes: isPasswordProtected ? oneTimePasscodes : [],
        copyEnable: copyEnable,
        isHidden: isHidden,
        isSavedInCloud: true,
        updatedAt: Date.now(),
        orderIndex: existingOrder,
      };
      updatedArticles[targetIndex] = updatedArt;

      articlesRef.current = updatedArticles;
      setArticles(updatedArticles);

      const updatedIssue: WeeklyIssue = {
        ...(currentIssue || {}),
        id: targetIssueId,
        issueNumber,
        date: date || 'સપ્ટેમ્બર ૨૦૨૬',
        themeTitle: themeTitle || 'ઈતિહાસ, વાર્તા, નવલકથા, લેખ વગેરે.',
        themeDescription: themeDescription || '',
        coverImage: coverImage.trim() || undefined,
        articles: updatedArticles,
      };
      onSaveIssue(updatedIssue, 'meta-only');

      // Directly update in Firestore Cloud with visual feedback
      setSyncingArticleId(updatedArt.id);
      try {
        await saveSingleArticleToCloud(targetIssueId, updatedArt);
        setCloudArticleIdsSet((prev) => new Set([...prev, updatedArt.id]));
        setNotice('✓ લેખમાં ફેરફાર સફળતાપૂર્વક Cloud માં સાચવાઈ ગયા!');
      } catch (err: any) {
        console.warn('Cloud sync error for updated article:', err);
        setNotice(`⚠️ લેખ PC પર સેવ થયો, Cloud સિંક: ${err?.message || 'બાકી છે'}`);
      } finally {
        setSyncingArticleId(null);
        setTimeout(() => setNotice(null), 3500);
      }

      resetForm(true); // Keep author and category for next entry!
    } else {
      // ADD NEW ARTICLE (Add to the very top of articles list)
      const newArt: Article = {
        id: `art-${Date.now()}`,
        title: title.trim(),
        author: finalAuthor,
        category: finalCategory,
        date: finalDate,
        summary: summary.trim() || 'આ લેખમાં જ્ઞાનપ્રદ અને પ્રેરણાદાયી વિચારો રજૂ કરવામાં આવ્યા છે.',
        content: content.trim() || 'આ લેખનું લખાણ ટૂંક સમયમાં ઉમેરવામાં આવશે.',
        isPasswordProtected: isPasswordProtected,
        password: isPasswordProtected && articlePassword.trim() ? articlePassword.trim() : '',
        oneTimePasscodes: isPasswordProtected ? oneTimePasscodes : [],
        copyEnable: copyEnable,
        isHidden: isHidden,
        isSavedInCloud: true,
        updatedAt: Date.now(),
      };

      const updatedArticles = [newArt, ...articles];
      articlesRef.current = updatedArticles;
      setArticles(updatedArticles);

      const updatedIssue: WeeklyIssue = {
        ...(currentIssue || {}),
        id: targetIssueId,
        issueNumber,
        date: date || 'સપ્ટેમ્બર ૨૦૨૬',
        themeTitle: themeTitle || 'ઈતિહાસ, વાર્તા, નવલકથા, લેખ વગેરે.',
        themeDescription: themeDescription || '',
        coverImage: coverImage.trim() || undefined,
        articles: updatedArticles,
      };
      onSaveIssue(updatedIssue, 'meta-only');

      // Directly push new article to Firebase Cloud with visual feedback
      setSyncingArticleId(newArt.id);
      try {
        await saveSingleArticleToCloud(targetIssueId, newArt);
        setCloudArticleIdsSet((prev) => new Set([...prev, newArt.id]));
        setArticles((prev) =>
          prev.map((a) => (a.id === newArt.id ? { ...a, isSavedInCloud: true } : a))
        );
        setNotice(`✓ નવો લેખ Cloud માં સફળતાપૂર્વક ઉમેરાઈ ગયો! (હવે પછીના લેખ માટે વિષય "${finalCategory}" અને લેખક "${finalAuthor}" સેટ રહ્યા છે)`);
      } catch (err: any) {
        console.warn('Failed to sync new article to cloud:', err);
        setNotice(`⚠️ નવો લેખ PC પર સેવ થયો, Cloud સિંક: ${err?.message || 'બાકી છે'}`);
      } finally {
        setSyncingArticleId(null);
        setTimeout(() => setNotice(null), 3500);
      }

      clearSavedDraft();
      resetForm(true); // Retain author and category for next entry!
    }
  };

  // Trigger delete confirmation
  const handlePromptDelete = (index: number) => {
    const art = articles[index];
    if (art) {
      setArticleToDelete({ index, title: art.title, articleId: art.id });
    }
  };

  // Confirm delete handler
  const handleConfirmDelete = () => {
    if (!articleToDelete) return;
    const indexToRemove = articleToDelete.index;
    const deletedArticleId = articleToDelete.articleId || articles[indexToRemove]?.id;
    if (!deletedArticleId) {
      setArticleToDelete(null);
      return;
    }

    // 1. Immediately register in deleted article IDs so background sync or refresh never brings it back
    addDeletedArticleId(deletedArticleId);

    // 2. Remove from articles state & ref
    const updated = articles.filter((art, i) => i !== indexToRemove && art.id !== deletedArticleId);
    articlesRef.current = updated;
    setArticles(updated);

    // 3. Delete from Firestore cloud collection immediately
    deleteArticleFromCloud(deletedArticleId).catch((err) => {
      console.warn('Could not delete article from Firestore:', err);
    });

    // 4. Update the issue state and localStorage via onSaveIssue
    const targetIssueId = currentIssue ? currentIssue.id : 'collection-main';
    const updatedIssue: WeeklyIssue = {
      ...(currentIssue || {}),
      id: targetIssueId,
      issueNumber,
      date: date || (currentIssue ? currentIssue.date : 'સપ્ટેમ્બર ૨૦૨૬'),
      themeTitle: themeTitle || (currentIssue ? currentIssue.themeTitle : 'ઈતિહાસ, વાર્તા, નવલકથા, લેખ વગેરે.'),
      themeDescription: themeDescription || (currentIssue ? currentIssue.themeDescription : ''),
      coverImage: coverImage.trim() || undefined,
      articles: updated,
    };
    onSaveIssue(updatedIssue, 'meta-only');

    // If we were editing the deleted article, reset the form
    if (editingIndex === indexToRemove) {
      resetForm();
    } else if (editingIndex !== null && editingIndex > indexToRemove) {
      setEditingIndex(editingIndex - 1);
    }

    setArticleToDelete(null);
    setNotice('✓ લેખ સફળતાપૂર્વક Delete થઈ ગયો!');
    setTimeout(() => setNotice(null), 3000);
  };

  // Quick toggle lock for an article in the list - IMMEDIATELY PERSISTS to Cloud Firestore & onSaveIssue
  const handleToggleArticleLock = async (index: number) => {
    const updated = [...articles];
    const target = updated[index];
    if (!target) return;
    const newStatus = !target.isPasswordProtected;
    const updatedArt: Article = {
      ...target,
      isPasswordProtected: newStatus,
      password: newStatus ? (target.password || '') : '',
      isSavedInCloud: true,
      updatedAt: Date.now(),
    };
    updated[index] = updatedArt;
    articlesRef.current = updated;
    setArticles(updated);

    const targetIssueId = currentIssue ? currentIssue.id : 'collection-main';

    // Save immediately so changes persist to localStorage and App.tsx state without triggering full batch rewrite
    const updatedIssue: WeeklyIssue = {
      ...(currentIssue || {}),
      id: targetIssueId,
      issueNumber,
      date: date || 'સપ્ટેમ્બર ૨૦૨૬',
      themeTitle: themeTitle || 'ઈતિહાસ, વાર્તા, નવલકથા, લેખ વગેરે.',
      themeDescription,
      coverImage: coverImage.trim() || undefined,
      articles: updated,
    };
    onSaveIssue(updatedIssue, 'meta-only');

    // Direct Cloud sync for the single article immediately with visual spinner
    setSyncingArticleId(target.id);
    try {
      await saveSingleArticleToCloud(targetIssueId, updatedArt);
      setCloudArticleIdsSet((prev) => new Set([...prev, target.id]));
      setNotice(
        newStatus
          ? `🔒 "${target.title || 'લેખ'}" Password Protected થયો અને Cloud માં તાત્કાલિક સાચવાઈ ગયો! ✓`
          : `🔓 "${target.title || 'લેખ'}" અનલોક થયો અને Cloud માં તાત્કાલિક સાચવાઈ ગયો! ✓`
      );
    } catch (err: any) {
      console.error('Cloud sync error toggling lock:', err);
      setNotice(`❌ Cloud સિંક નિષ્ફળ: ${err?.message || 'કનેક્શન તપાસો'}`);
    } finally {
      setSyncingArticleId(null);
      setTimeout(() => setNotice(null), 3500);
    }
  };

  // Quick toggle copy permission for an article in the list - IMMEDIATELY PERSISTS to Cloud Firestore & onSaveIssue
  const handleToggleArticleCopy = async (index: number) => {
    const updated = [...articles];
    const target = updated[index];
    if (!target) return;
    const newStatus = !target.copyEnable;
    const updatedArt: Article = {
      ...target,
      copyEnable: newStatus,
      isSavedInCloud: true,
      updatedAt: Date.now(),
    };
    updated[index] = updatedArt;
    articlesRef.current = updated;
    setArticles(updated);

    const targetIssueId = currentIssue ? currentIssue.id : 'collection-main';

    // Save immediately so changes persist to localStorage and App.tsx state without triggering full batch rewrite
    const updatedIssue: WeeklyIssue = {
      ...(currentIssue || {}),
      id: targetIssueId,
      issueNumber,
      date: date || 'સપ્ટેમ્બર ૨૦૨૬',
      themeTitle: themeTitle || 'ઈતિહાસ, વાર્તા, નવલકથા, લેખ વગેરે.',
      themeDescription,
      coverImage: coverImage.trim() || undefined,
      articles: updated,
    };
    onSaveIssue(updatedIssue, 'meta-only');

    // Direct Cloud sync for the single article immediately with visual spinner
    setSyncingArticleId(target.id);
    try {
      await saveSingleArticleToCloud(targetIssueId, updatedArt);
      setCloudArticleIdsSet((prev) => new Set([...prev, target.id]));
      setNotice(
        newStatus
          ? `📋 "${target.title || 'લેખ'}" માટે Copy Enable: ON — Cloud માં તાત્કાલિક સાચવાઈ ગયું! ✓`
          : `📋 "${target.title || 'લેખ'}" માટે Copy Enable: OFF — Cloud માં તાત્કાલિક સાચવાઈ ગયું! ✓`
      );
    } catch (err: any) {
      console.error('Cloud sync error toggling copy permission:', err);
      setNotice(`❌ Cloud સિંક નિષ્ફળ: ${err?.message || 'કનેક્શન તપાસો'}`);
    } finally {
      setSyncingArticleId(null);
      setTimeout(() => setNotice(null), 3500);
    }
  };

  // Quick toggle Hide / Unhide for an article from the main reading page - IMMEDIATELY PERSISTS to Cloud Firestore & onSaveIssue
  const handleToggleArticleHide = async (index: number) => {
    const updated = [...articles];
    const target = updated[index];
    if (!target) return;
    const newHideStatus = !target.isHidden;
    const updatedArt: Article = {
      ...target,
      isHidden: newHideStatus,
      isSavedInCloud: true,
      updatedAt: Date.now(),
    };
    updated[index] = updatedArt;
    articlesRef.current = updated;
    setArticles(updated);

    const targetIssueId = currentIssue ? currentIssue.id : 'collection-main';

    const updatedIssue: WeeklyIssue = {
      ...(currentIssue || {}),
      id: targetIssueId,
      issueNumber,
      date: date || 'સપ્ટેમ્બર ૨૦૨૬',
      themeTitle: themeTitle || 'ઈતિહાસ, વાર્તા, નવલકથા, લેખ વગેરે.',
      themeDescription,
      coverImage: coverImage.trim() || undefined,
      articles: updated,
    };
    onSaveIssue(updatedIssue, 'meta-only');

    setSyncingArticleId(target.id);
    try {
      await saveSingleArticleToCloud(targetIssueId, updatedArt);
      setCloudArticleIdsSet((prev) => new Set([...prev, target.id]));
      setNotice(
        newHideStatus
          ? `👁️‍🗨️ "${target.title || 'લેખ'}" મેઈન પેઈજ પરથી Hide (છુપાવી) દેવાયો છે! ✓`
          : `👁️ "${target.title || 'લેખ'}" મેઈન પેઈજ પર ફરી દેખાતો (Unhide) થઈ ગયો છે! ✓`
      );
    } catch (err: any) {
      console.error('Cloud sync error toggling hide status:', err);
      setNotice(`❌ Cloud સિંક નિષ્ફળ: ${err?.message || 'કનેક્શન તપાસો'}`);
    } finally {
      setSyncingArticleId(null);
      setTimeout(() => setNotice(null), 3500);
    }
  };

  // 1-Click Sync single article to Firebase Cloud (clicking the PC icon or re-syncing)
  const handleSyncSingleArticle = async (articleToSync: Article, targetIdx: number) => {
    if (!articleToSync || !articleToSync.id) return;
    if (syncingArticleId) return; // Prevent concurrent clicks

    setSyncingArticleId(articleToSync.id);
    const targetIssueId = currentIssue ? currentIssue.id : 'collection-main';

    try {
      // 1. Send this single article to Firestore
      await saveSingleArticleToCloud(targetIssueId, articleToSync);

      // 2. Mark as saved in local state and confirmed cloud IDs set
      setCloudArticleIdsSet((prev) => new Set([...prev, articleToSync.id]));

      const updatedArticles = articlesRef.current.map((a) =>
        a.id === articleToSync.id ? { ...a, isSavedInCloud: true } : a
      );
      articlesRef.current = updatedArticles;
      setArticles(updatedArticles);

      // 3. Persist updated status
      const updatedIssue: WeeklyIssue = {
        ...(currentIssue || {}),
        id: targetIssueId,
        issueNumber,
        date: date || 'સપ્ટેમ્બર ૨૦૨૬',
        themeTitle: themeTitle || 'ઈતિહાસ, વાર્તા, નવલકથા, લેખ વગેરે.',
        themeDescription,
        coverImage: coverImage.trim() || undefined,
        articles: updatedArticles,
      };
      onSaveIssue(updatedIssue, 'local-only');

      setNotice(`✓ "${articleToSync.title || 'લેખ'}" Firebase Cloud માં સફળતાપૂર્વક સિંક થઈ ગયો!`);
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      console.error('Failed to sync article on PC icon click:', err);
      setNotice(`❌ Cloud સિંક નિષ્ફળ: ${err?.message || 'ઇન્ટરનેટ કનેક્શન તપાસો'}`);
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setSyncingArticleId(null);
    }
  };

  // Ensure any current changes in articles are persisted when the modal closes
  const handleCloseModal = () => {
    const targetIssueId = currentIssue ? currentIssue.id : 'collection-main';
    let finalArticles = [...articlesRef.current];

    // If user was actively editing an existing article, persist those edits on modal close
    if (title.trim() && editingIndex !== null && editingIndex >= 0 && editingIndex < finalArticles.length) {
      let finalCategory = category;
      const trimmedCat = newCategoryInput.trim();
      if (isAddingCustomCategory && trimmedCat) {
        finalCategory = trimmedCat;
        saveCustomCategory(trimmedCat);
      }
      let finalAuthor = author;
      const trimmedAuth = newAuthorInput.trim();
      if (isAddingCustomAuthor && trimmedAuth) {
        finalAuthor = trimmedAuth;
        saveCustomAuthor(trimmedAuth);
      }
      if (!finalAuthor || finalAuthor === 'અન્ય') {
        finalAuthor = 'સંપાદકીય';
      }
      const finalDate = formatToGujaratiDate(uploadDate.trim()) || getTodayGujaratiDate();

      const updatedArt: Article = {
        ...finalArticles[editingIndex],
        title: title.trim(),
        author: finalAuthor,
        category: finalCategory,
        date: finalDate,
        summary: summary.trim() || 'આ લેખમાં જ્ઞાનપ્રદ અને પ્રેરણાદાયી વિચારો રજૂ કરવામાં આવ્યા છે.',
        content: content.trim() || 'આ લેખનું લખાણ ટૂંક સમયમાં ઉમેરવામાં આવશે.',
        isPasswordProtected: isPasswordProtected,
        password: isPasswordProtected && articlePassword.trim() ? articlePassword.trim() : '',
        oneTimePasscodes: isPasswordProtected ? oneTimePasscodes : [],
        copyEnable: copyEnable,
        updatedAt: Date.now(),
      };
      finalArticles[editingIndex] = updatedArt;
      saveSingleArticleToCloud(targetIssueId, updatedArt).catch(() => {});
    }

    const updatedIssue: WeeklyIssue = {
      ...(currentIssue || {}),
      id: targetIssueId,
      issueNumber,
      date: date || (currentIssue ? currentIssue.date : 'સપ્ટેમ્બર ૨૦૨૬'),
      themeTitle: themeTitle || (currentIssue ? currentIssue.themeTitle : 'ઈતિહાસ, વાર્તા, નવલકથા, લેખ વગેરે.'),
      themeDescription: themeDescription || (currentIssue ? currentIssue.themeDescription : ''),
      coverImage: coverImage.trim() || undefined,
      articles: finalArticles,
    };
    onSaveIssue(updatedIssue, 'meta-only');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-5 pt-2.5 sm:pt-5 overflow-y-auto">
      <div className="bg-white dark:bg-[#1B201B] text-[#1C1917] dark:text-[#F5F5F4] rounded-2xl max-w-5xl xl:max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-[#E5E1D3] dark:border-[#353D35] overflow-hidden mt-1 sm:my-auto relative">
        
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#E5E1D3] dark:border-[#353D35] flex items-center justify-between bg-[#FAF8F5] dark:bg-[#222822]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#5B8260] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif-guj">લેખ સંચાલન</h3>
              <p className="text-xs text-[#57534E] dark:text-[#A8A29E]">
                સંચાલક એકાઉન્ટ: <span className="font-mono font-medium text-[#244227] dark:text-[#A8BDAA]">thakerdevdutt@gmail.com</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-[#44403C] dark:text-[#D6D3D1] font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer border border-[#E5E1D3] dark:border-[#353D35]"
            title="વિન્ડો બંધ કરો"
          >
            <X className="w-4 h-4" />
            <span>બંધ કરો</span>
          </button>
        </div>

        {/* Quick Toolbar: Shows article count and central theme */}
        <div className="px-5 sm:px-6 py-2.5 bg-[#F2EFE6] dark:bg-[#161B16] border-b border-[#E5E1D3] dark:border-[#2F382F] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-[#44403C] dark:text-[#D6D3D1]">
            <span>કુલ લેખ: <strong>{articles.length}</strong></span>
            {themeTitle && (
              <>
                <span>•</span>
                <span className="text-[#78716C] dark:text-[#A8A29E] hidden md:inline truncate max-w-[280px]">
                  {themeTitle}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Main Navigation Bar: +Add New Article, 📚 બધા લેખોની યાદી, Category Tabs, and Search Bar */}
        <div className="border-b border-[#E5E1D3] dark:border-[#353D35] bg-[#FAF8F5] dark:bg-[#1E241E] px-3 sm:px-4 shrink-0 flex items-center justify-between gap-1.5 sm:gap-2 py-1.5 min-h-[48px]">
          {/* Scrollable Tabs Area */}
          <div 
            className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* 1. Add / Edit Article Button */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('form');
                if (editingIndex !== null || activeTab !== 'form') {
                  resetForm(false);
                }
              }}
              className={`py-1.5 px-2 sm:px-2.5 text-xs font-bold rounded-lg border flex items-center gap-1 cursor-pointer transition shrink-0 whitespace-nowrap ${
                activeTab === 'form'
                  ? 'border-[#5B8260] text-[#5B8260] dark:text-[#A8BDAA] bg-white dark:bg-[#252C25] shadow-xs'
                  : 'border-transparent text-[#78716C] dark:text-[#A8A29E] hover:bg-stone-200/50 dark:hover:bg-stone-800'
              }`}
              title={editingIndex !== null ? 'હાલ સંપાદિત થઈ રહેલો લેખ' : 'નવો લેખ ઉમેરવા માટે ફોર્મ ખોલો'}
            >
              {editingIndex !== null ? (
                <>
                  <Edit3 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-amber-700 dark:text-amber-400 font-sans">EDIT (#{articles.length - editingIndex})</span>
                </>
              ) : (
                <span>+Add New Article</span>
              )}
            </button>

            {/* 2. All Articles List Button */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('articles');
                setSelectedCategoryTab('ALL');
              }}
              className={`py-1.5 px-2 sm:px-2.5 text-xs font-bold rounded-lg border flex items-center gap-1 cursor-pointer transition shrink-0 whitespace-nowrap ${
                activeTab === 'articles' && selectedCategoryTab === 'ALL'
                  ? 'border-[#1D5299] text-[#1D5299] dark:text-[#7EA5D9] bg-white dark:bg-[#252C25] shadow-xs'
                  : 'border-transparent text-[#78716C] dark:text-[#A8A29E] hover:bg-stone-200/50 dark:hover:bg-stone-800'
              }`}
              title="બધા લેખોની સંપૂર્ણ યાદી જુઓ"
            >
              <span>📚 બધા લેખોની યાદી</span>
            </button>

            {/* Subtle Divider */}
            {categoryTabsData.tabs.length > 2 && (
              <div className="h-4 w-[1px] bg-[#D5CFBE] dark:bg-[#353D35] shrink-0 mx-0.5" />
            )}

            {/* 3. Category Tabs (વિવર્તન, વિસ્મય, રાજુલા, We the readers, ... અન્ય) */}
            {categoryTabsData.tabs
              .filter((tab) => tab.id !== 'ALL')
              .map((tab) => {
                const isSelected = activeTab === 'articles' && selectedCategoryTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryTab(tab.id);
                      setActiveTab('articles');
                    }}
                    className={`py-1 px-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'border-[#1D5299] bg-[#1D5299] text-white shadow-xs'
                        : 'border-[#D5CFBE]/70 dark:border-[#353D35] bg-white/70 dark:bg-[#252C25]/70 hover:bg-stone-200/60 dark:hover:bg-stone-800 text-[#555044] dark:text-[#C5C0B3]'
                    }`}
                    title={`${tab.label} શ્રેણીના ${tab.count} લેખો જુઓ`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1 py-0.2 rounded-full font-sans font-bold ${
                        isSelected
                          ? 'bg-white/25 text-white'
                          : 'bg-black/8 dark:bg-white/10 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
          </div>

          {/* 4. Compact Search Bar */}
          {articles.length > 0 && (
            <div className="relative w-32 sm:w-40 md:w-48 shrink-0">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A7566] dark:text-[#9A9483] pointer-events-none" />
              <input
                type="text"
                placeholder="સર્ચ..."
                value={articleSearchQuery}
                onFocus={() => {
                  if (activeTab !== 'articles') {
                    setActiveTab('articles');
                  }
                }}
                onChange={(e) => {
                  setArticleSearchQuery(e.target.value);
                  if (activeTab !== 'articles') {
                    setActiveTab('articles');
                  }
                }}
                className="w-full pl-7 pr-7 py-1 text-xs rounded-lg border border-[#D5CFBE] dark:border-[#353D35] bg-white dark:bg-[#121913] text-[#1C1917] dark:text-[#F5F5F4] focus:border-[#5B8260] focus:ring-1 focus:ring-[#5B8260]/30 focus:outline-none transition shadow-2xs"
              />
              {articleSearchQuery && (
                <button
                  type="button"
                  onClick={() => setArticleSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  title="શોધ સાફ કરો"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* ============================================================ */}
          {/* THE SINGLE ENTRY FORM (Used for both Adding & Editing)       */}
          {/* ============================================================ */}
          {activeTab === 'form' && (
          <div 
            ref={formRef}
            className={`p-5 rounded-2xl border-2 shadow-md space-y-4 transition-all ${
              editingIndex !== null
                ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-500/80'
                : 'bg-[#EEF7EF] dark:bg-[#18291C] border-[#5B8260]'
            }`}
          >
            {/* Form Title Bar: Unified Single-Line Toolbar with Distinct Colors */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#5B8260]/30 pb-3">
              {/* All Action Buttons & Badges in One Cohesive Row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* ✕ રદ કરો Button (Rose Red) */}
                {editingIndex !== null && (
                  <button
                    type="button"
                    onClick={() => resetForm(false)}
                    className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1"
                    title="એડિટિંગ રદ કરી નવો લેખ લખો"
                  >
                    <span>✕ રદ કરો</span>
                  </button>
                )}

                {/* Lock / Unlock Toggle Button (Amber) */}
                <button
                  type="button"
                  onClick={() => setIsPasswordProtected(!isPasswordProtected)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                    isPasswordProtected
                      ? 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700 shadow-amber-500/20'
                      : 'bg-white dark:bg-[#1E271F] text-[#78350F] dark:text-[#FCD34D] border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                  }`}
                  title={isPasswordProtected ? 'આ લેખ પાસવર્ડથી સુરક્ષિત છે (Locked). અનલોક કરવા ક્લિક કરો' : 'આ લેખને પાસવર્ડથી સુરક્ષિત (લોક) કરવા ક્લિક કરો'}
                >
                  {isPasswordProtected ? (
                    <>
                      <Lock className="w-4 h-4 text-white" />
                      <span>Lock / Unlock</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Lock / Unlock</span>
                    </>
                  )}
                </button>

                {/* Copy Enable Toggle Button (Sky Blue) */}
                <button
                  type="button"
                  onClick={() => setCopyEnable(!copyEnable)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                    copyEnable
                      ? 'bg-sky-600 text-white border-sky-700 hover:bg-sky-700 shadow-sky-500/20'
                      : 'bg-white dark:bg-[#1E271F] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                  title={copyEnable ? 'કોપી કરવાની છૂટ ચાલુ છે (ON). બંધ કરવા ક્લિક કરો' : 'વાચકને લખાણ કોપી કરવાની છૂટ આપવા માટે ક્લિક કરો (Default: OFF)'}
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Enable: {copyEnable ? 'ON' : 'OFF'}</span>
                </button>

                {/* Hide / Unhide Toggle Button (Purple) */}
                <button
                  type="button"
                  onClick={() => setIsHidden(!isHidden)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                    isHidden
                      ? 'bg-purple-600 text-white border-purple-700 hover:bg-purple-700 shadow-purple-500/20'
                      : 'bg-white dark:bg-[#1E271F] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                  title={isHidden ? 'આ લેખ મેઈન પેઈજ પરથી છુપાયેલો (Hide) રહેશે. ફરી દેખાડવા ક્લિક કરો' : 'આ લેખને મેઈન પેઈજ પરથી છુપાવવા (Hide) માટે ક્લિક કરો'}
                >
                  {isHidden ? <EyeOff className="w-4 h-4 text-white" /> : <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                  <span>Hide: {isHidden ? 'ON (છુપાયેલ)' : 'OFF'}</span>
                </button>

                {/* Password Protected Count Badge (Purple) */}
                <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800 flex items-center gap-1.5 shadow-2xs">
                  <Lock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>{articles.filter(a => a.isPasswordProtected).length} લેખ Password Protected</span>
                </span>

                {/* Copy Enable Count Badge (Teal) */}
                <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-100 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-800 flex items-center gap-1.5 shadow-2xs">
                  <Copy className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>{articles.filter(a => a.copyEnable).length} લેખ Copy Enable</span>
                </span>

                {notice && (
                  <span className="text-xs font-bold text-[#206328] dark:text-[#78E085] bg-white dark:bg-[#203824] px-2.5 py-1 rounded-xl border border-[#5B8260]/40 shadow-xs animate-pulse">
                    {notice}
                  </span>
                )}
              </div>

              {/* Right Side: EDIT સાચવો / + આ નવો લેખ ઉમેરો (Emerald / Forest Green) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSubmitArticle}
                  className={`px-4 py-1.5 rounded-xl text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition ${
                    editingIndex !== null
                      ? 'bg-emerald-600 hover:bg-emerald-700 border border-emerald-700'
                      : 'bg-[#5B8260] hover:bg-[#486B4D] border border-[#486B4D]'
                  }`}
                >
                  {editingIndex !== null ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>EDIT સાચવો</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>આ નવો લેખ ઉમેરો</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Password Protection Info Box when article is password protected (Ultra-Compact 2-Line Design) */}
            {isPasswordProtected && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-400/60 space-y-2 text-xs sm:text-sm animate-fadeIn">
                {/* Line 1: Password Protection Status + Permanent Password input */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      આ લેખ <strong>પાસવર્ડ સુરક્ષિત</strong> રહેશે. સંચાલક તરીકે તમે તમારા એડમિન પાસવર્ડથી આ લેખ હંમેશા ખોલી શકશો.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-amber-800 dark:text-amber-300 whitespace-nowrap">કાયમી પાસવર્ડ (વૈકલ્પિક):</span>
                    <input
                      type="text"
                      placeholder="દા.ત. 12345 (ખાલી રાખી શકાય)"
                      value={articlePassword}
                      onChange={(e) => setArticlePassword(e.target.value)}
                      className="px-2.5 py-1 rounded-lg text-xs sm:text-sm bg-white dark:bg-[#182019] text-[#1C1917] dark:text-white border border-amber-500/50 focus:outline-none w-48 sm:w-56 font-medium"
                    />
                  </div>
                </div>

                {/* Line 2: One-Time OTP Generator & Custom OTP inline */}
                <div className="pt-2 border-t border-amber-300/60 dark:border-amber-800/60 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-1 whitespace-nowrap">
                    <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>વન-ટાઈમ OTP:</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleGenerateOtp}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs transition whitespace-nowrap"
                    title="રેન્ડમ 6-અંકનો OTP બનાવો"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>⚡ + નવો 6-અંકનો OTP બનાવો</span>
                  </button>

                  <div className="flex items-center gap-1 flex-1 min-w-[200px] max-w-sm">
                    <input
                      type="text"
                      placeholder="અથવા કસ્ટમ પાસકોડ (દા.ત. Reader99)..."
                      value={customOtpInput}
                      onChange={(e) => setCustomOtpInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomOtp();
                        }
                      }}
                      className="flex-1 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-[#182019] text-[#1C1917] dark:text-white border border-amber-400/60 focus:outline-none font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCustomOtp()}
                      disabled={!customOtpInput.trim()}
                      className="px-2.5 py-1 rounded-lg bg-[#5B8260] hover:bg-[#486B4D] text-white text-xs font-bold flex items-center gap-0.5 cursor-pointer transition disabled:opacity-50 whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" />
                      <span>ઉમેરો</span>
                    </button>
                  </div>
                </div>

                {/* Line 3: Active unused OTP chips with the explanation right beside them! */}
                {oneTimePasscodes.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-amber-900/90 dark:text-amber-200/90 flex items-center gap-1">
                      સક્રિય OTP (અણવપરાયેલ):
                    </span>
                    {oneTimePasscodes.map((otp, idx) => {
                      const isCopied = copiedOtp === otp;
                      return (
                        <div
                          key={`${otp}-${idx}`}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white dark:bg-[#182019] border border-amber-300 dark:border-amber-700 text-xs shadow-2xs"
                        >
                          <span className="font-mono font-bold text-amber-900 dark:text-amber-200 tracking-wider">
                            {otp}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const textToCopy = `વાંચન સંગ્રહ: "${title.trim() || 'લેખ'}" વાંચવા માટે વન-ટાઈમ OTP: ${otp} (આ કોડ ફક્ત એક જ વાર ચાલશે, લેખ ખૂલતાં જ રદ થઈ જશે)`;
                              navigator.clipboard.writeText(textToCopy).then(() => {
                                setCopiedOtp(otp);
                                setTimeout(() => setCopiedOtp(null), 3000);
                              });
                            }}
                            className={`p-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer ${
                              isCopied ? 'text-emerald-600' : 'text-amber-700 dark:text-amber-300 hover:text-amber-900'
                            }`}
                            title="કોપી કરો"
                          >
                            {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'કૉપી થયું!' : 'કૉપી'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveOtp(otp)}
                            className="p-0.5 text-red-500 hover:text-red-700 cursor-pointer"
                            title="રદ કરો"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                    <span className="text-[11px] text-amber-800/90 dark:text-amber-300/90 italic ml-1">
                      ← (વાચક લેખ ખોલતાં જ આ OTP આપોઆપ રદ થશે)
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 italic pt-0.5">
                    હજુ કોઈ OTP બનાવેલ નથી. વાચકને આપવા માટે ઉપરના બટનથી નવો OTP બનાવી શકો છો.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-start">
              {/* વિષય Dropdown & Custom Category Input */}
              <div>
                <div className="h-8 flex items-center justify-between mb-1.5">
                  <label className="text-sm sm:text-[15px] font-bold text-[#244227] dark:text-[#C5DAC8] flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-[#5B8260] shrink-0" />
                    <span>વિષય</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomCategory(!isAddingCustomCategory)}
                    className="text-xs sm:text-sm font-bold text-[#355E3B] dark:text-[#A3D9A5] hover:underline flex items-center gap-1 cursor-pointer bg-[#5B8260]/10 dark:bg-[#5B8260]/20 hover:bg-[#5B8260]/20 px-2.5 py-1 rounded-lg transition shrink-0"
                    title="યાદીમાં ન હોય તેવો નવો વિષય લખીને કાયમ માટે નીચે ઉમેરો"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ નવો વિષય લખો</span>
                  </button>
                </div>
                <select
                  value={category}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategory(val);
                    if (val === 'અન્ય') {
                      setIsAddingCustomCategory(true);
                    }
                  }}
                  className="w-full h-11 sm:h-12 text-sm sm:text-base px-3.5 rounded-xl bg-white dark:bg-[#121913] text-[#1C1917] dark:text-[#F5F5F4] border border-[#5B8260]/50 focus:border-[#5B8260] focus:ring-1 focus:ring-[#5B8260] focus:outline-none cursor-pointer font-medium"
                >
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                {/* Input for writing new category name, saving it permanently at the bottom */}
                {(isAddingCustomCategory || category === 'અન્ય') && (
                  <div className="mt-2.5 p-3 rounded-xl bg-[#5B8260]/10 border border-[#5B8260]/40 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#244227] dark:text-[#C5DAC8]">
                      <span>નવો વિષય લખો (કાયમ માટે નીચે ઉમેરાશે):</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustomCategory(false);
                          if (category === 'અન્ય') setCategory(categoriesList[0] || 'વિસ્મય');
                        }}
                        className="text-xs text-red-500 hover:underline cursor-pointer font-semibold"
                      >
                        બંધ કરો
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewCategory();
                          }
                        }}
                        placeholder="દા.ત. બાળ સાહિત્ય, વિજ્ઞાન કથા..."
                        className="flex-1 text-sm px-3 py-2 rounded-lg bg-white dark:bg-[#121913] text-[#1C1917] dark:text-[#F5F5F4] border border-[#5B8260] focus:outline-none font-medium"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddNewCategory}
                        className="px-3 py-2 rounded-lg bg-[#5B8260] text-white text-xs sm:text-sm font-bold hover:bg-[#486B4D] transition cursor-pointer shrink-0 shadow-xs"
                      >
                        ઉમેરો
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* લેખકનું નામ (Author Dropdown + New Author Adder) */}
              <div>
                <div className="h-8 flex items-center justify-between mb-1.5">
                  <label className="text-sm sm:text-[15px] font-bold text-[#244227] dark:text-[#C5DAC8] flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#5B8260] shrink-0" />
                    <span>લેખકનું નામ</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomAuthor(!isAddingCustomAuthor)}
                    className="text-xs sm:text-sm font-bold text-[#355E3B] dark:text-[#A3D9A5] hover:underline flex items-center gap-1 cursor-pointer bg-[#5B8260]/10 dark:bg-[#5B8260]/20 hover:bg-[#5B8260]/20 px-2.5 py-1 rounded-lg transition shrink-0"
                    title="યાદીમાં ન હોય તેવો નવો લેખક ઉમેરો"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ નવો લેખક</span>
                  </button>
                </div>
                <select
                  value={author}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAuthor(val);
                    if (val === 'અન્ય') {
                      setIsAddingCustomAuthor(true);
                    }
                  }}
                  className="w-full h-11 sm:h-12 text-sm sm:text-base px-3.5 rounded-xl bg-white dark:bg-[#121913] text-[#1C1917] dark:text-[#F5F5F4] border border-[#5B8260]/50 focus:border-[#5B8260] focus:ring-1 focus:ring-[#5B8260] focus:outline-none cursor-pointer font-medium"
                >
                  {authorsList.map((auth) => (
                    <option key={auth} value={auth}>
                      {auth === 'અન્ય' ? '+ અન્ય (નવો લેખક ઉમેરો)' : auth}
                    </option>
                  ))}
                </select>

                {/* Input for writing new author name, saving it permanently */}
                {(isAddingCustomAuthor || author === 'અન્ય') && (
                  <div className="mt-2.5 p-3 rounded-xl bg-[#5B8260]/10 border border-[#5B8260]/40 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#244227] dark:text-[#C5DAC8]">
                      <span>નવા લેખકનું નામ લખો (કાયમ યાદીમાં સેવ થશે):</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustomAuthor(false);
                          if (author === 'અન્ય') setAuthor(authorsList[0] || 'ધૈવત ત્રિવેદી');
                        }}
                        className="text-xs text-red-500 hover:underline cursor-pointer font-semibold"
                      >
                        બંધ કરો
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newAuthorInput}
                        onChange={(e) => setNewAuthorInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewAuthor();
                          }
                        }}
                        placeholder="દા.ત. ગુણવંત શાહ / કાજલ ઓઝા વૈદ્ય..."
                        className="flex-1 text-sm px-3 py-2 rounded-lg bg-white dark:bg-[#121913] text-[#1C1917] dark:text-[#F5F5F4] border border-[#5B8260] focus:outline-none font-medium"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddNewAuthor}
                        className="px-3 py-2 rounded-lg bg-[#5B8260] text-white text-xs sm:text-sm font-bold hover:bg-[#486B4D] transition cursor-pointer shrink-0 shadow-xs"
                      >
                        સેવ કરો
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* અપલોડ તારીખ (Date with auto-conversion to Gujarati format) */}
              <div>
                <div className="h-8 flex items-center justify-between mb-1.5">
                  <label className="text-sm sm:text-[15px] font-bold text-[#244227] dark:text-[#C5DAC8] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#5B8260] shrink-0" />
                    <span>અપલોડ તારીખ</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setUploadDate(getTodayGujaratiDate())}
                    className="text-xs font-semibold text-[#355E3B] dark:text-[#A3D9A5] hover:underline cursor-pointer"
                    title="આજની તારીખ સેટ કરો"
                  >
                    આજની તારીખ
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="દા.ત. 08.09.2026 અથવા ૦૮ સપ્ટેમ્બર ૨૦૨૬"
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    onBlur={() => {
                      if (uploadDate.trim()) {
                        const formatted = formatToGujaratiDate(uploadDate);
                        setUploadDate(formatted);
                      }
                    }}
                    className="w-full h-11 sm:h-12 text-sm sm:text-base pl-3.5 pr-10 rounded-xl bg-white dark:bg-[#121913] text-[#1C1917] dark:text-[#F5F5F4] border border-[#5B8260]/50 focus:border-[#5B8260] focus:outline-none font-medium"
                  />
                  <label
                    htmlFor="article-date-picker"
                    onClick={(e) => {
                      try {
                        if (dateInputRef.current && typeof dateInputRef.current.showPicker === 'function') {
                          e.preventDefault();
                          dateInputRef.current.showPicker();
                        }
                      } catch {
                        // Fallback automatically opens via label htmlFor
                      }
                    }}
                    className="absolute right-3 cursor-pointer p-1 text-[#5B8260] hover:text-[#355E3B] dark:hover:text-[#A3D9A5] transition flex items-center justify-center"
                    title="તારીખિયું ખોલો (વર્ષ, મહિનો અને તારીખ પસંદ કરો)"
                  >
                    <Calendar className="w-5 h-5 pointer-events-none" />
                  </label>
                  <input
                    ref={dateInputRef}
                    id="article-date-picker"
                    type="date"
                    className="absolute right-3 opacity-0 w-6 h-6 cursor-pointer pointer-events-auto"
                    value={gujaratiDateToHtmlDate(uploadDate)}
                    onChange={(e) => {
                      if (e.target.value) {
                        const formatted = formatToGujaratiDate(e.target.value);
                        setUploadDate(formatted);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* લેખનું શીર્ષક */}
            <div>
              <label className="block text-sm sm:text-[15px] font-bold mb-1.5 text-[#244227] dark:text-[#C5DAC8] flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#5B8260]" />
                <span>લેખનું શીર્ષક (Title) *</span>
              </label>
              <input
                type="text"
                placeholder="દા.ત. સંબંધોની મીઠાશ અને ક્ષમાભાવનું વિજ્ઞાન"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full text-base sm:text-lg font-bold font-serif-guj px-4 py-3 rounded-xl bg-white dark:bg-[#121913] text-[#1C1917] dark:text-[#F5F5F4] border focus:outline-none transition ${
                  duplicateArticle
                    ? 'border-amber-500 focus:border-amber-600 ring-2 ring-amber-500/20'
                    : 'border-[#5B8260]/50 focus:border-[#5B8260]'
                }`}
              />

              {/* Duplicate Title Warning Message */}
              {duplicateArticle && (
                <div className="mt-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-100 text-xs sm:text-sm flex items-start gap-2.5 shadow-xs animate-fadeIn">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="font-bold flex flex-wrap items-center gap-2">
                      <span>⚠️ સાવચેતી: આ શીર્ષકવાળો લેખ પહેલેથી જ મોજૂદ છે!</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 text-[11px] font-bold">
                        લેખ ક્રમાંક {duplicateArticle.displayNumber}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      હાલના લેખનું શીર્ષક: <strong>"{duplicateArticle.article.title}"</strong>
                      {duplicateArticle.article.author && ` (લેખક: ${duplicateArticle.article.author})`}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(duplicateArticle.index)}
                        className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer transition flex items-center gap-1 shadow-2xs"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>આ જૂના લેખને જ EDIT કરો</span>
                      </button>
                      <span className="text-amber-700 dark:text-amber-300">અથવા નવા લેખ માટે શીર્ષક બદલો</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ટૂંકો સારાંશ / મુખ્ય મુદ્દાઓ */}
            <div>
              <label className="block text-sm sm:text-[15px] font-bold mb-1.5 text-[#244227] dark:text-[#C5DAC8]">
                Summary / Highlights <span className="text-xs sm:text-sm font-normal text-[#555044] dark:text-[#A8A29E]">- તમે જેટલી લાઈન લખશો તેટલી જ લાઈનમાં લેખમાં દેખાશે</span>
              </label>
              <textarea
                rows={4}
                placeholder="દા.ત.&#10;સાંઠ વર્ષનો સવાલ : ઘરવાલેકો અચ્છા નહિ લગા...&#10;હાજીપીર: સક્કરપારા ખાઈને જીત્યું...&#10;તાશ્કંદ કરાર અને ભુજના કાંતિલાલની પ્રાર્થના..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full text-sm sm:text-base leading-relaxed font-sans-guj p-3.5 rounded-xl bg-white dark:bg-[#121913] text-[#1C1917] dark:text-[#F5F5F4] border border-[#5B8260]/50 focus:border-[#5B8260] focus:outline-none"
              />
            </div>

            {/* સંપૂર્ણ લખાણ (Content) with Formatting Toolbar */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label className="text-sm sm:text-[15px] font-bold text-[#244227] dark:text-[#C5DAC8] flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#5B8260]" />
                  <span>લેખનું સંપૂર્ણ લખાણ (Content)</span>
                </label>

                {/* Rich Formatting Toolbar Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 dark:bg-stone-800/90 p-1 rounded-xl border border-stone-300 dark:border-stone-700 shadow-2xs">
                  {/* Bold Button */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyFormatting('**', '**', 'ઘાટા અક્ષરો')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-600 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    title="બોલ્ડ (Bold) - લખાણ પસંદ કરીને ક્લિક કરો અથવા **લખાણ** લખો"
                  >
                    <Bold className="w-3.5 h-3.5" />
                    <span>બોલ્ડ</span>
                  </button>

                  {/* Italic Button */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyFormatting('*', '*', 'ત્રાંસા અક્ષરો')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-600 flex items-center gap-1 transition cursor-pointer shadow-2xs italic font-serif"
                    title="ઇટાલિક (Italic) - લખાણ પસંદ કરીને ક્લિક કરો અથવા *લખાણ* લખો"
                  >
                    <Italic className="w-3.5 h-3.5" />
                    <span>ઇટાલિક</span>
                  </button>

                  {/* Bold + Italic Button */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyFormatting('***', '***', 'ઘાટા અને ત્રાંસા અક્ષરો')}
                    className="px-2.5 py-1 rounded-lg text-xs font-black bg-white dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-600 flex items-center gap-1 transition cursor-pointer shadow-2xs italic font-serif"
                    title="બોલ્ડ + ઇટાલિક (Bold & Italic) - લખાણ પસંદ કરીને ક્લિક કરો અથવા ***લખાણ*** લખો"
                  >
                    <span className="font-extrabold not-italic">B</span>
                    <span className="text-[10px] opacity-60 not-italic">+</span>
                    <span className="font-bold italic">I</span>
                    <span className="text-[11px] font-bold">બોલ્ડ+ઇટાલિક</span>
                  </button>

                  {/* Underline Button */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyFormatting('<u>', '</u>', 'લીટીવાળા અક્ષરો')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-600 flex items-center gap-1 transition cursor-pointer shadow-2xs underline"
                    title="અન્ડરલાઇન (Underline) - લખાણ પસંદ કરીને ક્લિક કરો અથવા <u>લખાણ</u> લખો"
                  >
                    <Underline className="w-3.5 h-3.5" />
                    <span>અન્ડરલાઇન</span>
                  </button>

                  {/* Subheading Button */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyFormatting('\n### ', '\n', 'મુખ્ય પેટા-શીર્ષક')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-600 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    title="પેટા-શીર્ષક (Subheading) - નવી લાઈનમાં ### શીર્ષક લખાશે"
                  >
                    <HeadingIcon className="w-3.5 h-3.5" />
                    <span>હેડિંગ</span>
                  </button>

                  {/* Bullet List Button */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyFormatting('\n• ', '', 'મુદ્દો')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-600 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    title="મુદ્દો (Bullet Point) - નવી લાઈનમાં • ઉમેરાશે"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>મુદ્દો</span>
                  </button>

                  {/* Table Button */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const sampleTable = 'દેશ\tકુલ સૈનિકો\tમૃત્યુ\tઘાયલ\tકેદી-ગુમ\tનુકસાન (%)\nરશિયા\t૧,૨૦,૦૦,૦૦૦\t૧૭,૦૦,૦૦૦\t૪૯,૫૦,૦૦૦\t૨૫,૦૦,૦૦૦\t૭૬.૩\nકુલ\t૧,૨૦,૦૦,૦૦૦\t૧૭,૦૦,૦૦૦\t૪૯,૫૦,૦૦૦\t૨૫,૦૦,૦૦૦\t૭૬.૩';
                      applyFormatting('\n[table]\n', '\n[/table]\n', sampleTable);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-600 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    title="કોષ્ટક / ટેબલ: લખાણ પસંદ કરીને આ બટન દબાવો જેથી [table] ... [/table] લાગી જશે"
                  >
                    <TableIcon className="w-3.5 h-3.5 text-[#5B8260]" />
                    <span>ટેબલ</span>
                  </button>

                  <div className="h-4 w-px bg-stone-300 dark:bg-stone-600 mx-0.5" />

                  {/* Live Preview Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs border ${
                      isPreviewMode
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-600 hover:bg-stone-200'
                    }`}
                    title="પૂર્વાવલોકન (Live Preview) - વાંચતી વખતે કેવું દેખાશે તે જુઓ"
                  >
                    {isPreviewMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{isPreviewMode ? 'એડિટર મોડ' : 'પૂર્વાવલોકન'}</span>
                  </button>
                </div>
              </div>

              {/* Textarea or Live Preview */}
              {isPreviewMode ? (
                <div className="w-full p-4 rounded-xl bg-white dark:bg-[#121913] text-[#1C1917] dark:text-[#F5F5F4] border border-emerald-500/60 min-h-[160px] max-h-[380px] overflow-y-auto space-y-4 font-serif-guj text-base leading-relaxed">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                    <Eye className="w-3.5 h-3.5" />
                    <span>લાઇવ પૂર્વાવલોકન: વાચકને લેખ આ રીતે ફોર્મેટેડ દેખાશે:</span>
                  </div>
                  {content.trim() ? (
                    parseArticleContent(content).map((block, bIdx) => {
                      if (block.type === 'header') {
                        return (
                          <h4 key={bIdx} className="font-bold text-lg text-emerald-800 dark:text-emerald-300 my-2 flex items-center gap-1.5">
                            <span>▸</span>
                            <span>{renderFormattedText(block.text)}</span>
                          </h4>
                        );
                      }
                      if (block.type === 'table') {
                        return (
                          <ArticleTable
                            key={bIdx}
                            headers={block.headers}
                            rows={block.rows}
                            raw={block.raw}
                            allowCopy={true}
                          />
                        );
                      }
                      const displayText = block.text.includes('\t')
                        ? block.text.replace(/\t+/g, ' \u00A0\u00A0 ')
                        : block.text;
                      return (
                        <p key={bIdx} className="leading-relaxed">
                          {renderFormattedText(displayText)}
                        </p>
                      );
                    })
                  ) : (
                    <p className="text-stone-400 italic text-sm">હજુ સુધી કોઈ લખાણ લખેલું નથી...</p>
                  )}
                </div>
              ) : (
                <textarea
                  ref={contentTextareaRef}
                  rows={6}
                  placeholder="અહીં લેખનું સંપૂર્ણ લખાણ લખો. બોલ્ડ માટે **શબ્દ**, ઇટાલિક માટે *શબ્દ*, અન્ડરલાઇન માટે <u>શબ્દ</u> અથવા ઉપર આપેલા બટનો વાપરો..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const textarea = contentTextareaRef.current;
                      if (!textarea) return;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const val = textarea.value;
                      const nextVal = val.substring(0, start) + '\t' + val.substring(end);
                      setContent(nextVal);
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + 1, start + 1);
                      }, 0);
                    }
                  }}
                  className="w-full text-base sm:text-[16.5px] leading-relaxed font-sans-guj p-4 rounded-xl bg-white dark:bg-[#121913] text-[#1C1917] dark:text-[#F5F5F4] border border-[#5B8260]/50 focus:border-[#5B8260] focus:outline-none min-h-[160px]"
                />
              )}

              {/* Quick Helper hint below textarea */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-[#78716C] dark:text-[#A8A29E] mt-1.5 px-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span>💡 બોલ્ડ: <strong>**લખાણ**</strong></span>
                  <span>•</span>
                  <span>ઇટાલિક: <em>*લખાણ*</em></span>
                  <span>•</span>
                  <span>બોલ્ડ+ઇટાલિક: <strong><em>***લખાણ***</em></strong></span>
                  <span>•</span>
                  <span>અન્ડરલાઇન: <u>&lt;u&gt;લખાણ&lt;/u&gt;</u></span>
                  <span>•</span>
                  <span>હેડિંગ: <strong>### શીર્ષક</strong></span>
                  <span>•</span>
                  <span>કોષ્ટક: લખાણ પસંદ કરી <strong>"ટેબલ"</strong> દબાવો (અથવા <strong>[table]...[/table]</strong> લખો)</span>
                </span>
                <span className="italic">
                  (શબ્દ પસંદ કરીને ઉપરનું બટન દબાવો)
                </span>
              </div>
            </div>

            {/* Form Actions (Only shown when editing to cancel edit) */}
            {editingIndex !== null && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-[#44403C] dark:text-[#D6D3D1] font-bold text-xs sm:text-sm transition cursor-pointer"
                >
                  ✕ EDIT રદ કરો
                </button>
                <span className="text-xs text-[#78716C]">
                  (EDIT રદ કરી નવો લેખ ઉમેરી શકો છો)
                </span>
              </div>
            )}
          </div>
          )}

          {/* ============================================================ */}
          {/* EXISTING ARTICLES LIST TAB (Responsive, clear, wide cards)   */}
          {/* ============================================================ */}
          {activeTab === 'articles' && (
          <div className="space-y-4">
            {/* Header & Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E1D3] dark:border-[#353D35]">
              <div>
                <h4 className="text-sm sm:text-base font-bold font-serif-guj flex items-center gap-2">
                  <span>હાલના લેખોની યાદી</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1D5299] text-white">
                    કુલ {articles.length} લેખ
                  </span>
                </h4>
                <p className="text-xs text-[#78716C] dark:text-[#A8A29E] mt-0.5">
                  લેખમાં ફેરફાર કરવા 'EDIT' અથવા કાઢી નાખવા 'Delete' બટન દબાવો.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetForm(false);
                  setActiveTab('form');
                }}
                className="px-4 py-2 rounded-xl bg-[#5B8260] hover:bg-[#486B4D] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ નવો લેખ ઉમેરો</span>
              </button>
            </div>

            {/* Category / Search filter results feedback for articles */}
            {articles.length > 0 && (selectedCategoryTab !== 'ALL' || articleSearchQuery) && (
              <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-[#FAF8F5] dark:bg-[#1E241E] rounded-xl border border-[#E5E1D3] dark:border-[#353D35] text-[#555044] dark:text-[#C5C0B3] flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedCategoryTab !== 'ALL' && (
                    <span className="inline-flex items-center gap-1">
                      <span>શ્રેણી:</span>
                      <strong className="text-[#1D5299] dark:text-[#7EA5D9] bg-sky-50 dark:bg-sky-950/50 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">
                        {selectedCategoryTab}
                      </strong>
                    </span>
                  )}
                  {articleSearchQuery && (
                    <span className="inline-flex items-center gap-1">
                      <span>શોધ:</span>
                      <strong>"{articleSearchQuery}"</strong>
                    </span>
                  )}
                  <span className="text-[#78716C] dark:text-[#A8A29E]">
                    (<strong>{filteredArticles.length}</strong> પરિણામ મળ્યા, કુલ {articles.length} માંથી)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryTab('ALL');
                    setArticleSearchQuery('');
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer shrink-0"
                >
                  બધા લેખ ફરી જુઓ
                </button>
              </div>
            )}

            {articles.length === 0 ? (
              <div className="text-center py-12 px-4 bg-[#F9F7F2] dark:bg-[#252C25] rounded-2xl border border-dashed border-[#D5CFBE] dark:border-[#404D40] space-y-3">
                <BookOpen className="w-8 h-8 mx-auto text-[#78716C] dark:text-[#A8A29E] opacity-50" />
                <div className="text-xs sm:text-sm font-semibold text-[#555044] dark:text-[#C5C0B3]">
                  હાલ આ અંકમાં કોઈ લેખ ઉમેરેલો નથી.
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className="px-4 py-2 rounded-xl bg-[#5B8260] text-white text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>પ્રથમ લેખ ઉમેરો</span>
                </button>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-8 bg-[#F9F7F2] dark:bg-[#252C25] rounded-xl border border-dashed border-[#D5CFBE] dark:border-[#404D40] text-xs text-[#78716C] dark:text-[#A8A29E] space-y-2">
                <p>પસંદ કરેલ શ્રેણી અથવા શોધમાં કોઈ લેખ મળ્યો નથી.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryTab('ALL');
                    setArticleSearchQuery('');
                  }}
                  className="text-xs text-[#1D5299] dark:text-[#7EA5D9] hover:underline font-bold cursor-pointer inline-block"
                >
                  બધા લેખો ફરી જુઓ
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredArticles.map((art) => {
                  const realIndex = articles.findIndex((a) => a === art || (art.id && a.id === art.id));
                  const targetIndex = realIndex !== -1 ? realIndex : 0;
                  const articleDisplayNum = articles.length - targetIndex;
                  const isCurrentlyEditing = (art.id && editingArticleId === art.id) || editingIndex === targetIndex;

                  return (
                    <div 
                      key={art.id || targetIndex}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrentlyEditing
                          ? 'border-amber-400 bg-amber-50/60 dark:bg-amber-950/20 shadow-xs ring-1 ring-amber-400'
                          : 'border-[#E5E1D3] dark:border-[#353D35] bg-[#FDFCF9] dark:bg-[#222722] hover:border-[#7B8E7E]/60 shadow-2xs'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Top Metadata Badges with Cloud/PC Storage Status Indicator */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#7B8E7E] text-white shrink-0">
                              લેખ {articleDisplayNum}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#E5E1D3] dark:bg-[#353D35] text-[#555044] dark:text-[#C5C0B3]">
                              {art.category || 'સામાન્ય'}
                            </span>
                            <span className="text-[11px] text-[#78716C] dark:text-[#A8A29E] font-medium">
                              {art.author || 'સંપાદકીય'}
                            </span>
                            {art.date && (
                              <span className="text-[11px] text-[#78716C] dark:text-[#A8A29E]">
                                • {art.date}
                              </span>
                            )}
                            {art.isHidden && (
                              <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1 shrink-0">
                                <EyeOff className="w-3 h-3" />
                                <span>Hidden (મુખ્ય પેજ પર અદ્રશ્ય)</span>
                              </span>
                            )}
                          </div>

                          {/* Storage Indicator: Firebase Cloud vs Local PC only (Interactive 1-Click Sync) */}
                          {(() => {
                            const isSavedInFirebase = Boolean(
                              art.id && (cloudArticleIdsSet.has(art.id) || art.isSavedInCloud === true)
                            );
                            const isSyncingThis = syncingArticleId === art.id;

                            if (isSyncingThis) {
                              return (
                                <button
                                  type="button"
                                  disabled
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 text-xs font-semibold shrink-0 cursor-wait shadow-2xs animate-pulse"
                                  title="Firebase Cloud સાથે સિંક થઈ રહ્યો છે..."
                                >
                                  <Loader2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 animate-spin" />
                                  <span className="text-[10px]">સિંક થાય છે...</span>
                                </button>
                              );
                            }

                            if (isSavedInFirebase) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleSyncSingleArticle(art, targetIndex)}
                                  className="group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100/90 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/80 shrink-0 transition-all cursor-pointer shadow-2xs active:scale-95"
                                  title="Google Firebase Cloud માં સેવ થયેલ છે (ફરીથી તાજું સિંક કરવા ક્લિક કરી શકો છો)"
                                >
                                  <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                                  <span className="text-[10px] font-bold">Cloud ✓</span>
                                </button>
                              );
                            }

                            return (
                              <button
                                type="button"
                                onClick={() => handleSyncSingleArticle(art, targetIndex)}
                                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-200 border-2 border-amber-400 dark:border-amber-600 shrink-0 transition-all cursor-pointer shadow-xs active:scale-95 hover:shadow-md animate-pulse"
                                title="આ લેખ હજુ માત્ર PC પર છે. Firebase Cloud માં સિંક કરવા અહીં ક્લિક કરો!"
                              >
                                <Laptop className="w-4 h-4 text-amber-700 dark:text-amber-300 group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold underline decoration-amber-500 underline-offset-2">Cloud માં સિંક કરો ⬆</span>
                              </button>
                            );
                          })()}
                        </div>

                        {/* Title - Full width, prominent display */}
                        <h5 className="text-sm sm:text-base font-bold font-serif-guj text-[#1C1917] dark:text-[#F5F5F4] break-words leading-snug">
                          {art.title || 'શીર્ષક વગરનો લેખ'}
                        </h5>

                        {/* Summary */}
                        {art.summary && (
                          <p className="text-xs text-[#78716C] dark:text-[#A8A29E] line-clamp-2 leading-relaxed">
                            {art.summary}
                          </p>
                        )}

                        {/* Bottom Row Actions - Separated cleanly, completely responsive */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#E5E1D3]/80 dark:border-[#353D35]/80">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={Boolean(syncingArticleId)}
                              onClick={() => handleToggleArticleLock(targetIndex)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                                syncingArticleId === art.id
                                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 cursor-wait opacity-80'
                                  : art.isPasswordProtected
                                    ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-xs ring-1 ring-amber-400/50'
                                    : 'bg-white dark:bg-[#1E241E] text-[#555044] dark:text-[#C5C0B3] border-[#D5CFBE] dark:border-[#353D35] hover:bg-gray-100 dark:hover:bg-[#2A332A]'
                              }`}
                              title={art.isPasswordProtected ? 'આ લેખ Locked છે. UNLOCK કરવા ક્લિક કરો' : 'આ લેખને પાસવર્ડ સુરક્ષિત (લોક) કરવા ક્લિક કરો'}
                            >
                              {syncingArticleId === art.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                  <span>Cloud માં...</span>
                                </>
                              ) : art.isPasswordProtected ? (
                                <>
                                  <Lock className="w-3.5 h-3.5 text-white shrink-0" />
                                  <span>Locked</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span>Lock / Unlock</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={Boolean(syncingArticleId)}
                              onClick={() => handleToggleArticleCopy(targetIndex)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                                syncingArticleId === art.id
                                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 cursor-wait opacity-80'
                                  : art.copyEnable
                                    ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs'
                                    : 'bg-white dark:bg-[#1E241E] text-[#555044] dark:text-[#C5C0B3] border-[#D5CFBE] dark:border-[#353D35] hover:bg-gray-100 dark:hover:bg-[#2A332A]'
                              }`}
                              title={art.copyEnable ? 'કોપી કરવાની છૂટ ચાલુ છે (ON). બંધ કરવા ક્લિક કરો' : 'કોપી કરવાની છૂટ બંધ છે (OFF). ચાલુ કરવા ક્લિક કરો'}
                            >
                              {syncingArticleId === art.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                  <span>Cloud માં...</span>
                                </>
                              ) : (
                                <>
                                  <Copy className={`w-3.5 h-3.5 ${art.copyEnable ? 'text-white' : 'text-gray-400'} shrink-0`} />
                                  <span>Copy Enable: {art.copyEnable ? 'ON' : 'OFF'}</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Hide Button (EDIT ની બરાબર પહેલાં) */}
                            <button
                              type="button"
                              disabled={Boolean(syncingArticleId)}
                              onClick={() => handleToggleArticleHide(targetIndex)}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                                syncingArticleId === art.id
                                  ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 cursor-wait opacity-80'
                                  : art.isHidden
                                    ? 'bg-purple-600 text-white border-purple-700 hover:bg-purple-700 shadow-xs'
                                    : 'bg-white dark:bg-[#1E241E] text-[#555044] dark:text-[#C5C0B3] border border-[#D5CFBE] dark:border-[#353D35] hover:bg-gray-100 dark:hover:bg-[#2A332A]'
                              }`}
                              title={art.isHidden ? 'આ લેખ હાલ મેઈન પેઈજ પરથી છુપાયેલો (Hide) છે. પાછો દેખાડવા (Unhide) ક્લિક કરો' : 'આ લેખને મેઈન પેઈજ પરથી Hide (છુપાવવા) માટે ક્લિક કરો'}
                            >
                              {syncingArticleId === art.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                  <span>Cloud માં...</span>
                                </>
                              ) : art.isHidden ? (
                                <>
                                  <EyeOff className="w-3.5 h-3.5 text-white shrink-0" />
                                  <span>Hidden</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 shrink-0" />
                                  <span>Hide</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEdit(targetIndex)}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                isCurrentlyEditing
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-[#1E241E] text-[#555044] dark:text-[#C5C0B3] border border-[#D5CFBE] dark:border-[#353D35] hover:bg-gray-100 dark:hover:bg-[#2A332A]'
                              }`}
                              title="આ લેખમાં EDIT કરો"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>EDIT</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePromptDelete(targetIndex)}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/40 cursor-pointer flex items-center gap-1.5 transition"
                              title="આ લેખ Delete કરો"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}

        </div>

        {/* ============================================================ */}
        {/* DELETE CONFIRMATION MODAL DIALOG (કોન્ફર્મેશન બોક્સ)         */}
        {/* ============================================================ */}
        {articleToDelete && (
          <div className="absolute inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1E241E] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-red-200 dark:border-red-900/50 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[#1C1917] dark:text-[#F5F5F4] font-serif-guj">
                    લેખ કાઢી નાખવાની ખાતરી (Delete Confirmation)
                  </h4>
                  <p className="text-xs text-[#78716C] dark:text-[#A8A29E] mt-1">
                    શું તમે ખરેખર આ લેખ કાઢી નાખવા (Delete કરવા) માંગો છો? આ ક્રિયા પાછી વાળી શકાશે નહીં.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/40 text-xs">
                <span className="text-[#78716C] dark:text-[#A8A29E] block text-[11px] mb-0.5">
                  કાઢી નખાનાર લેખનું શીર્ષક:
                </span>
                <span className="font-bold text-red-950 dark:text-red-200 text-sm font-serif-guj">
                  {articleToDelete.title || 'શીર્ષક વગરનો લેખ'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setArticleToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#57534E] dark:text-[#D6D3D1] hover:bg-gray-100 dark:hover:bg-[#2A332A] transition cursor-pointer"
                >
                  ના, રદ કરો
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>હા, Delete કરો</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};


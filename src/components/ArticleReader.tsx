import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Article, WeeklyIssue, ReadingTheme, FontSizeLevel } from '../types';
import { 
  ArrowLeft, 
  Bookmark, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen,
  Calendar,
  Lock,
  Copy,
  Check,
  Link
} from 'lucide-react';
import { copyArticleWebLink, getArticleWhatsAppShareUrl } from '../utils/share';
import { renderFormattedText } from '../utils/textFormatter';
import { ArticleTable } from './ArticleTable';
import { parseArticleContent } from '../utils/tableParser';

// WhatsApp icon SVG component
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.311.045-.698.067-2.001-.476-1.503-.626-2.55-2.094-2.628-2.197-.074-.105-.626-.833-.626-1.589 0-.756.396-1.127.536-1.282.14-.155.307-.193.41-.193.102 0 .205.001.295.006.096.005.224-.037.35.265.13.313.443 1.077.481 1.155.039.078.065.17.013.273-.052.103-.078.169-.156.26-.078.091-.163.204-.233.273-.078.077-.16.16-.069.316.091.156.403.664.865 1.075.594.528 1.095.691 1.251.769.156.078.248.065.339-.039.091-.104.391-.455.495-.611.104-.156.208-.13.349-.078.14.052.886.417 1.039.493.153.076.255.114.293.179.039.065.039.378-.105.783z" />
    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.98-1.399A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.697 0-3.275-.515-4.6-1.398l-.33-.221-3.045.855.823-3.007-.222-.338A8.128 8.128 0 013.833 12c0-4.503 3.664-8.167 8.167-8.167 4.503 0 8.167 3.664 8.167 8.167 0 4.503-3.664 8.167-8.167 8.167z" />
  </svg>
);

interface ArticleReaderProps {
  article: Article;
  issue: WeeklyIssue;
  onBack: () => void;
  onSelectArticle: (article: Article) => void;
  isBookmarked: boolean;
  onToggleBookmark: (articleId: string) => void;
  readingTheme: ReadingTheme;
  fontSize: FontSizeLevel;
  onProgressChange?: (progress: number) => void;
  isStandalone?: boolean;
}

export const ArticleReader: React.FC<ArticleReaderProps> = ({
  article,
  issue,
  onBack,
  onSelectArticle,
  isBookmarked,
  onToggleBookmark,
  readingTheme,
  fontSize,
  onProgressChange,
  isStandalone = false,
}) => {
  const [readingProgress, setReadingProgress] = useState<number>(0);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Copy direct standalone browser web link helper
  const handleCopyWebLink = async () => {
    await copyArticleWebLink(article);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const onProgressChangeRef = useRef(onProgressChange);
  useEffect(() => {
    onProgressChangeRef.current = onProgressChange;
  }, [onProgressChange]);

  const lastProgressRef = useRef<number>(-1);

  // Track scroll position to update reading progress percentage
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? Math.min(100, Math.max(0, Math.round((scrollY / docHeight) * 100))) : 0;
      if (percent !== lastProgressRef.current) {
        lastProgressRef.current = percent;
        setReadingProgress(percent);
        onProgressChangeRef.current?.(percent);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [article.id]);

  // Scroll to top on article change and attach copy/print protection
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    lastProgressRef.current = 0;
    setReadingProgress(0);
    onProgressChangeRef.current?.(0);

    // Block keyboard shortcuts for printing (Ctrl+P, Cmd+P), copying (Ctrl+C, Cmd+C), and select-all (Ctrl+A, Cmd+A)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Block Print (Ctrl+P / Cmd+P)
      if (isModifier && key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Copy (Ctrl+C / Cmd+C) only if copying is disabled
      if (!article.copyEnable && isModifier && key === 'c') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Select All (Ctrl+A / Cmd+A) only if copying is disabled
      if (!article.copyEnable && isModifier && key === 'a') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block View Source / Inspect (Ctrl+U)
      if (isModifier && key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Block beforeprint event
    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('beforeprint', handleBeforePrint);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [article.id, article.copyEnable]);

  // Copy full article text helper when copyEnable is active
  const handleCopyArticleText = () => {
    if (!article.copyEnable) return;
    const text = `${article.title}\n${article.author ? `લેખક: ${article.author}\n\n` : '\n'}${article.content || article.summary}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    });
  };

  // Split summary into lines if user formatted it with multiple sub-points
  const summaryLines = useMemo(() => {
    if (!article.summary) return [];
    return article.summary
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
  }, [article.summary]);

  // Normalize text helper for matching
  const normalize = (s: string) => 
    s.replace(/^[\s•▸\-\*0-9\.:"'\u201C\u201D\u2018\u2019]+/, '').replace(/[\s\u200B\u00A0]+/g, ' ').trim().toLowerCase();

  // Check if a line in content is a sub-article / section header that should stay permanently highlighted
  const isSectionHeader = (lineText: string): boolean => {
    // Only apply if the user intentionally defined multiple sub-points (>= 2) in summary
    if (summaryLines.length < 2) return false;
    const trimmed = lineText.trim();
    // Headings are concise, not long narrative paragraphs
    if (!trimmed || trimmed.length > 180 || trimmed.length < 4) return false;

    const norm = normalize(trimmed);
    if (!norm || norm.length < 4) return false;

    return summaryLines.some(sLine => {
      const sNorm = normalize(sLine);
      if (!sNorm || sNorm.length < 4) return false;

      // 1. Exact match
      if (norm === sNorm) {
        return true;
      }

      // 2. High mutual inclusion (shorter must be at least 70% of longer)
      if (norm.includes(sNorm) || sNorm.includes(norm)) {
        const minLen = Math.min(norm.length, sNorm.length);
        const maxLen = Math.max(norm.length, sNorm.length);
        if (minLen / maxLen >= 0.70) {
          return true;
        }
      }

      // 3. High word match (at least 80% of words must match)
      const sWords = sNorm.split(' ').filter(w => w.length > 2);
      const nWords = norm.split(' ').filter(w => w.length > 2);
      if (sWords.length >= 3 && nWords.length >= 3) {
        const matchInNorm = sWords.filter(w => norm.includes(w)).length;
        if (matchInNorm / sWords.length >= 0.80) {
          return true;
        }
      }

      return false;
    });
  };

  const contentBlocks = useMemo(() => {
    return parseArticleContent(article.content || '', isSectionHeader);
  }, [article.content, summaryLines]);

  // Clean jump to specific line/sub-section in article when clicked
  const handleJumpToLine = (line: string) => {
    const clean = line.trim();
    if (!clean) return;

    const container = document.getElementById('article-content-container');
    if (!container) return;

    const targetNorm = normalize(clean);
    if (!targetNorm) return;

    const elements = Array.from(container.querySelectorAll<HTMLElement>('[data-article-line]'));
    let targetEl: HTMLElement | null = null;

    // 1. Exact match first
    for (const el of elements) {
      const elNorm = normalize(el.textContent || '');
      if (elNorm === targetNorm) {
        targetEl = el;
        break;
      }
    }

    // 2. Substantial inclusion match
    if (!targetEl) {
      for (const el of elements) {
        const elNorm = normalize(el.textContent || '');
        if (!elNorm) continue;
        if (elNorm.includes(targetNorm) || targetNorm.includes(elNorm)) {
          const minLen = Math.min(elNorm.length, targetNorm.length);
          const maxLen = Math.max(elNorm.length, targetNorm.length);
          if (minLen / maxLen >= 0.70) {
            targetEl = el;
            break;
          }
        }
      }
    }

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (targetEl.getAttribute('data-is-header') === 'true') {
        targetEl.classList.add('ring-4', 'ring-[#5B8260]', 'scale-[1.01]', 'brightness-110');
        setTimeout(() => {
          targetEl?.classList.remove('ring-4', 'scale-[1.01]', 'brightness-110');
        }, 2500);
      } else {
        targetEl.classList.add('bg-[#FFE58F]/70', 'dark:bg-[#786315]/70', 'ring-2', 'ring-[#5B8260]', 'rounded-lg', 'transition-all', 'duration-500');
        setTimeout(() => {
          targetEl?.classList.remove('bg-[#FFE58F]/70', 'dark:bg-[#786315]/70', 'ring-2', 'ring-[#5B8260]');
        }, 3000);
      }
    }
  };

  // Find index of current article
  const currentIndex = issue.articles.findIndex((a) => a.id === article.id);
  const prevArticle = currentIndex > 0 ? issue.articles[currentIndex - 1] : null;
  const nextArticle = currentIndex < issue.articles.length - 1 ? issue.articles[currentIndex + 1] : null;

  // Font size classes
  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'small':
        return 'text-base leading-relaxed';
      case 'normal':
        return 'text-lg leading-loose';
      case 'large':
        return 'text-xl leading-loose';
      case 'xlarge':
        return 'text-2xl leading-loose';
      default:
        return 'text-lg leading-loose';
    }
  };

  return (
    <div 
      className={`min-h-screen transition-colors duration-200 relative ${
        article.copyEnable ? 'select-text' : 'select-none no-select'
      } ${
        readingTheme === 'dark' 
          ? 'bg-[#181B18] text-[#E0DDD5]' 
          : readingTheme === 'sepia' 
          ? 'bg-[#DFD1B3] text-[#241C11]' 
          : 'bg-[#FCFAF7] text-[#2C2C2C]'
      } pb-24`}
      onContextMenu={(e) => {
        if (!article.copyEnable) e.preventDefault();
      }}
      onCopy={(e) => {
        if (!article.copyEnable) e.preventDefault();
      }}
    >
      
      {/* Reader Article Body - Same width as home page (max-w-6xl) */}
      <main 
        className={`max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 ${
          article.copyEnable ? 'select-text' : 'select-none no-select'
        }`}
        onContextMenu={(e) => {
          if (!article.copyEnable) e.preventDefault();
        }}
        onCopy={(e) => {
          if (!article.copyEnable) e.preventDefault();
        }}
      >

        {/* Top Navigation & Action Row */}
        <div className="flex items-center justify-between gap-2 pb-5 border-b border-black/5 dark:border-white/5 mb-6">
          {isStandalone ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/5 dark:bg-white/5 text-[11px] font-medium text-[#7B8E7E] dark:text-[#A8BDAA] whitespace-nowrap">
              <span>વાંચન મોડ</span>
            </div>
          ) : (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#7B8E7E] hover:text-[#5E6F61] transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>પાછા જાઓ</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Direct Browser Web Link Copy Button */}
            <button
              type="button"
              onClick={handleCopyWebLink}
              className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-2xs border cursor-pointer whitespace-nowrap ${
                copiedLink
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border-stone-300 dark:border-stone-700'
              }`}
              title="આ લેખની સીધી બ્રાઉઝર લિંક કોપી કરો"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-100 shrink-0" /> : <Link className="w-3.5 h-3.5 shrink-0" />}
              <span>
                {copiedLink ? (
                  'કૉપી થઈ!'
                ) : (
                  <>
                    <span className="sm:hidden">લિંક</span>
                    <span className="hidden sm:inline">Copy Link</span>
                  </>
                )}
              </span>
            </button>

            {/* Direct WhatsApp Share Button */}
            <a
              href={getArticleWhatsAppShareUrl(article)}
              target="whatsapp_share"
              onClick={(e) => {
                e.preventDefault();
                window.open(getArticleWhatsAppShareUrl(article), 'whatsapp_share');
              }}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition shadow-2xs border border-emerald-700 cursor-pointer whitespace-nowrap"
              title="આ લેખ WhatsApp પર શેર કરો"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
              <span>WhatsApp</span>
            </a>

            {/* If copyEnable is ON, show Copy Article text button */}
            {article.copyEnable && (
              <button
                type="button"
                onClick={handleCopyArticleText}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold transition shadow-2xs border border-blue-500/25 cursor-pointer whitespace-nowrap"
                title="આ લેખનું લખાણ ક્લિપબોર્ડમાં કોપી કરો"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                <span>
                  {copiedText ? (
                    'કૉપી થઈ!'
                  ) : (
                    <>
                      <span className="sm:hidden">લખાણ</span>
                      <span className="hidden sm:inline">Copy Article</span>
                    </>
                  )}
                </span>
              </button>
            )}

            {/* Reading progress indicator badge */}
            <div 
              className={`text-[11px] font-medium font-sans px-2 py-0.5 rounded-full border transition-opacity hidden sm:inline-block ${
                readingProgress > 2 ? 'opacity-100' : 'opacity-0'
              } ${
                readingTheme === 'dark'
                  ? 'bg-[#252A25] border-[#384238] text-[#A3B8A5]'
                  : readingTheme === 'sepia'
                  ? 'bg-[#D2C3A2] border-[#C4B48E] text-[#4A3B2C]'
                  : 'bg-[#F0ECE1] border-[#E2DDD0] text-[#556B58]'
              }`}
              title="લેખ વાંચન પ્રગતિ"
            >
              {readingProgress}% વંચાયું
            </div>

            {/* Bookmark button - Hidden in Standalone mode */}
            {!isStandalone && (
              <button
                onClick={() => onToggleBookmark(article.id)}
                title={isBookmarked ? 'સાચવેલા લેખમાંથી દૂર કરો' : 'લેખ સાચવો'}
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  isBookmarked ? 'text-[#8C6239] bg-[#A67C52]/15' : 'hover:bg-black/5 dark:hover:bg-white/5 text-stone-500'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Article Metadata & Header */}
        <div className="space-y-4 pb-8 border-b border-black/10 dark:border-white/10">

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-serif-guj leading-tight">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm opacity-80 pt-1">
            <span className="flex items-center gap-1.5 font-semibold">
              <User className="w-4 h-4 text-[#7B8E7E]" />
              {article.author}
            </span>
            {article.date && (
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-[#7B8E7E]" />
                {article.date}
              </span>
            )}
            {article.category && (
              <span className="px-2.5 py-0.5 rounded-md bg-[#7B8E7E]/15 text-[#244227] dark:text-[#C5DAC8] font-semibold text-xs">
                વિષય: {article.category}
              </span>
            )}
          </div>

          {article.imageUrl && (
            <div className="rounded-2xl overflow-hidden mt-4 shadow-sm max-h-[380px]">
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {/* Key Summary / Sub-points Block */}
          {article.summary && (
            <div className="p-4 sm:p-5 rounded-xl bg-black/5 dark:bg-white/5 border-l-4 border-[#7B8E7E] text-sm sm:text-base font-serif-guj leading-relaxed">
              {summaryLines.length >= 2 ? (
                <div className="space-y-1.5">
                  {summaryLines.map((line, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleJumpToLine(line)}
                      className="group flex items-start gap-2 py-1 px-2 -mx-2 rounded-lg hover:bg-[#5B8260]/15 dark:hover:bg-[#5B8260]/25 transition-all cursor-pointer select-none"
                      title="આ લાઈન પર જવા માટે ક્લિક કરો"
                    >
                      <span className="text-[#5B8260] dark:text-[#A3D9A5] text-xs mt-1 shrink-0 group-hover:translate-x-1 transition-transform font-bold">
                        ▸
                      </span>
                      <span className="flex-1 text-[#244227] dark:text-[#D1E0D3] font-medium group-hover:underline group-hover:text-[#18301B] dark:group-hover:text-white transition-colors">
                        {renderFormattedText(line)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="italic text-[#292524] dark:text-[#D6D3D1]">
                  "{renderFormattedText(article.summary)}"
                </p>
              )}
            </div>
          )}

        </div>

        {/* Article Full Prose Content */}
        <article 
          id="article-content-container" 
          className={`pt-8 ${getFontSizeClass()} font-serif-guj space-y-4 text-justify select-none no-select article-protected`}
          onContextMenu={(e) => !article.copyEnable && e.preventDefault()}
          onCopy={(e) => !article.copyEnable && e.preventDefault()}
        >
          {contentBlocks.map((block, idx) => {
            if (block.type === 'header') {
              return (
                <div
                  key={idx}
                  data-article-line
                  data-is-header="true"
                  className="my-5 p-3.5 sm:p-4 rounded-xl bg-[#FFF9E6] dark:bg-[#2C2618] border-l-4 border-[#5B8260] ring-1 ring-[#E8DCB8]/60 dark:ring-[#473E24]/60 shadow-xs text-[#1C1917] dark:text-[#FDFBF7] font-bold text-base sm:text-lg transition-all duration-500 leading-snug flex items-start gap-2.5"
                >
                  <span className="text-[#5B8260] dark:text-[#A3D9A5] text-sm mt-0.5 shrink-0 select-none">
                    ▸
                  </span>
                  <span className="flex-1 font-serif-guj">
                    {renderFormattedText(block.text)}
                  </span>
                </div>
              );
            }

            if (block.type === 'table') {
              return (
                <ArticleTable
                  key={idx}
                  headers={block.headers}
                  rows={block.rows}
                  raw={block.raw}
                  allowCopy={Boolean(article.copyEnable)}
                />
              );
            }

            const displayText = block.text.includes('\t')
              ? block.text.replace(/\t+/g, ' \u00A0\u00A0 ')
              : block.text;

            return (
              <p
                key={idx}
                data-article-line
                className="leading-relaxed transition-all duration-500 rounded px-1 -mx-1"
              >
                {renderFormattedText(displayText)}
              </p>
            );
          })}
        </article>

        {/* Article End Sharing Strip */}
        <div className="mt-8 p-3.5 sm:p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-[#57534E] dark:text-[#A8A29E]">
            આ લેખ બીજા સાથે શેર કરો:
          </span>
          <div className="flex items-center gap-2">
            <a
              href={getArticleWhatsAppShareUrl(article)}
              target="whatsapp_share"
              onClick={(e) => {
                e.preventDefault();
                window.open(getArticleWhatsAppShareUrl(article), 'whatsapp_share');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
              title="WhatsApp પર શેર કરો"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
              <span>WhatsApp શેર</span>
            </a>
            <button
              type="button"
              onClick={handleCopyWebLink}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs border cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700'
              }`}
              title="આ લેખની સીધી લિંક કૉપી કરો"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Link className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Bottom Next/Prev Article Navigation (Hidden in Standalone view) */}
        {!isStandalone && (prevArticle || nextArticle) && (
          <nav className="mt-14 pt-8 border-t border-black/10 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prevArticle ? (
              <button
                onClick={() => onSelectArticle(prevArticle)}
                className="p-4 rounded-xl border border-black/10 dark:border-white/10 text-left hover:border-[#7B8E7E] transition group cursor-pointer"
              >
                <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>અગાઉનો લેખ</span>
                  {prevArticle.isPasswordProtected && (
                    <span className="ml-1 inline-flex items-center text-amber-700 dark:text-amber-400" title="પાસવર્ડ સુરક્ષિત">
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <p className="font-serif-guj font-bold text-sm sm:text-base group-hover:text-[#7B8E7E] transition truncate">
                  {prevArticle.title}
                </p>
                <p className="text-xs opacity-70 mt-0.5">{prevArticle.author}</p>
              </button>
            ) : (
              <div />
            )}

            {nextArticle ? (
              <button
                onClick={() => onSelectArticle(nextArticle)}
                className="p-4 rounded-xl border border-black/10 dark:border-white/10 text-right hover:border-[#7B8E7E] transition group cursor-pointer"
              >
                <div className="flex items-center justify-end gap-1 text-xs opacity-70 mb-1">
                  {nextArticle.isPasswordProtected && (
                    <span className="mr-1 inline-flex items-center text-amber-700 dark:text-amber-400" title="પાસવર્ડ સુરક્ષિત">
                      <Lock className="w-3 h-3" />
                    </span>
                  )}
                  <span>આગળનો લેખ</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
                <p className="font-serif-guj font-bold text-sm sm:text-base group-hover:text-[#7B8E7E] transition truncate">
                  {nextArticle.title}
                </p>
                <p className="text-xs opacity-70 mt-0.5">{nextArticle.author}</p>
              </button>
            ) : (
              <div />
            )}
          </nav>
        )}

        {/* Back to Issues overview button (Hidden in Standalone view) */}
        {!isStandalone ? (
          <div className="text-center mt-8">
            <button
              onClick={onBack}
              className="px-6 py-2.5 rounded-xl bg-[#7B8E7E] text-white font-semibold text-xs sm:text-sm hover:bg-[#687A6B] transition shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>બધા લેખો જુઓ</span>
            </button>
          </div>
        ) : (
          <div className="text-center mt-8 pt-6 border-t border-black/10 dark:border-white/10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-xs text-[#7B8E7E] dark:text-[#A8BDAA]">
              <BookOpen className="w-4 h-4" />
              <span>તમે આ લેખ સીધા શેર કરેલી લિંક દ્વારા વાંચી રહ્યા છો</span>
            </div>
          </div>
        )}

      </main>

    </div>
  );
};

import React from 'react';
import { WeeklyIssue, Article } from '../types';
import { X, Bookmark, Trash2, ArrowRight, BookOpen } from 'lucide-react';

interface BookmarksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  issues: WeeklyIssue[];
  bookmarkedArticleIds: string[];
  onSelectArticle: (issue: WeeklyIssue, article: Article) => void;
  onRemoveBookmark: (articleId: string) => void;
}

export const BookmarksDrawer: React.FC<BookmarksDrawerProps> = ({
  isOpen,
  onClose,
  issues,
  bookmarkedArticleIds,
  onSelectArticle,
  onRemoveBookmark,
}) => {
  if (!isOpen) return null;

  // Find all bookmarked articles with their respective issue
  const bookmarkedItems: { issue: WeeklyIssue; article: Article }[] = [];
  (issues || []).forEach((issue) => {
    (issue?.articles || []).forEach((article) => {
      if (article?.id && bookmarkedArticleIds.includes(article.id)) {
        bookmarkedItems.push({ issue, article });
      }
    });
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white dark:bg-[#1E231E] text-[#2D3436] dark:text-[#E2DFD6] w-full max-w-md h-full flex flex-col shadow-2xl border-l border-[#E5E1D3] dark:border-[#353D35] animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-[#E5E1D3] dark:border-[#353D35] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#8C6239] text-white flex items-center justify-center">
              <Bookmark className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif-guj">સાચવેલા લેખો</h3>
              <p className="text-xs text-[#7A7566] dark:text-[#9A9483]">
                {bookmarkedItems.length} લેખ બુકમાર્ક થયેલ છે
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A7566] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {bookmarkedItems.length === 0 ? (
            <div className="text-center py-20 px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#F2EFE6] dark:bg-[#2A312A] text-[#7A7566] dark:text-[#9A9483] mx-auto flex items-center justify-center">
                <Bookmark className="w-6 h-6" />
              </div>
              <h4 className="font-serif-guj font-bold text-sm">કોઈ લેખ સાચવેલો નથી</h4>
              <p className="text-xs text-[#7A7566] dark:text-[#9A9483] max-w-xs mx-auto">
                તમને ગમતા લેખની નીચે આપેલા બુકમાર્ક આઇકન પર ક્લિક કરીને તમે અહીં લેખો સાચવી શકો છો.
              </p>
            </div>
          ) : (
            bookmarkedItems.map(({ issue, article }) => (
              <div
                key={article.id}
                onClick={() => {
                  onSelectArticle(issue, article);
                  onClose();
                }}
                className="p-3.5 rounded-xl border border-[#E5E1D3] dark:border-[#353D35] bg-[#FAF8F5] dark:bg-[#252B25] hover:border-[#7B8E7E] transition cursor-pointer group flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] text-[#7A7566] dark:text-[#9A9483]">
                  <span className="font-semibold px-2 py-0.5 rounded bg-black/5 dark:bg-white/5">
                    {article.category || 'લેખ'}
                  </span>
                  <span>{article.author}</span>
                </div>

                <h4 className="text-sm font-bold font-serif-guj group-hover:text-[#7B8E7E] transition leading-snug">
                  {article.title}
                </h4>

                <p className="text-xs text-[#7A7566] dark:text-[#9A9483] line-clamp-2">
                  {article.summary}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-xs">
                  <span className="text-[#7B8E7E] font-semibold flex items-center gap-1">
                    <span>વાંચો</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveBookmark(article.id);
                    }}
                    className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                    title="બુકમાર્કમાંથી દૂર કરો"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

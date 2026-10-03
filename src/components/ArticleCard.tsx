import React from 'react';
import { Article, ReadingTheme } from '../types';
import { User, Search, Calendar, Lock } from 'lucide-react';
import { getCategoryColorStyle } from '../utils/categoryColors';

interface ArticleCardProps {
  article: Article;
  index: number;
  onRead: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  searchKeyword?: string;
  searchMatchCount?: number;
  readingTheme?: ReadingTheme;
  isUnlocked?: boolean;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onRead,
  searchKeyword,
  searchMatchCount,
  readingTheme = 'light',
}) => {
  const colorStyle = getCategoryColorStyle(article.category, readingTheme);

  return (
    <div 
      onClick={onRead}
      style={readingTheme === 'sepia' && colorStyle.sepiaBg ? { backgroundColor: colorStyle.sepiaBg } : undefined}
      className={`group flex flex-col justify-between rounded-2xl border ${colorStyle.cardBorder} ${colorStyle.leftBorder} border-l-4 ${colorStyle.cardBg} p-5 shadow-xs hover:shadow-md transition-all cursor-pointer ${colorStyle.cardHover}`}
    >
      <div className="space-y-2.5">
        {/* Search Match Count Badge */}
        {searchMatchCount !== undefined && searchMatchCount > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E8F1E9] dark:bg-[#2A3E2D] text-[#244227] dark:text-[#C5DAC8] text-xs font-semibold w-fit border border-[#7B8E7E]/30">
            <Search className="w-3.5 h-3.5 text-[#7B8E7E]" />
            <span>
              આ લેખમાં {searchKeyword ? `"${searchKeyword}" ` : ''}શબ્દ <strong>{searchMatchCount} વખત</strong> છે
            </span>
          </div>
        )}

        {/* Title */}
        <h4 className="text-base sm:text-lg font-bold font-serif-guj text-[#1C1917] dark:text-[#F5F5F4] leading-snug group-hover:text-[#7B8E7E] dark:group-hover:text-[#A8BDAA] transition-colors">
          {article.title}
        </h4>

        {/* Author & Date & Category & Password Lock */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E] dark:text-[#A8A29E]">
          <span className="flex items-center gap-1 font-medium">
            <User className="w-3.5 h-3.5 text-[#7B8E7E]" />
            {article.author}
          </span>
          {article.date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#7B8E7E]" />
              {article.date}
            </span>
          )}
          {article.category && (
            <span className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-colors ${colorStyle.badge}`}>
              {article.category}
            </span>
          )}
          {article.isPasswordProtected && (
            <span 
              className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md text-amber-800 dark:text-amber-300 bg-amber-500/10" 
              title="આ લેખ સુરક્ષિત છે"
            >
              <Lock className="w-3 h-3" />
              <span>Protected</span>
            </span>
          )}
        </div>

        {/* Summary */}
        <p className="text-xs sm:text-sm text-[#292524] dark:text-[#D6D3D1] line-clamp-3 leading-relaxed whitespace-pre-line">
          {article.summary}
        </p>
      </div>
    </div>
  );
};



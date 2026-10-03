import React from 'react';
import { WeeklyIssue } from '../types';
import { BookOpen, Calendar, Sparkles, ArrowRight } from 'lucide-react';

interface IssueHeroProps {
  issue: WeeklyIssue;
  onStartReading: () => void;
}

export const IssueHero: React.FC<IssueHeroProps> = ({ issue, onStartReading }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#E5E1D3] dark:border-[#353D35] bg-white dark:bg-[#252A25] shadow-xs">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 items-center">
        
        {/* Left textual column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#7B8E7E] text-white flex items-center gap-1 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              સાપ્તાહિક અંક {issue.issueNumber}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F2EFE6] dark:bg-[#2F362F] text-[#7A7566] dark:text-[#C5DAC8] flex items-center gap-1 border border-[#E5E1D3] dark:border-[#3E473E]">
              <Calendar className="w-3.5 h-3.5" />
              {issue.date}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#A67C52]/15 text-[#8C6239] dark:text-[#E0C3A5]">
              {issue.articles.length} લેખોનો સંચય
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif-guj text-[#2D3436] dark:text-[#E2DFD6] leading-tight">
            {issue.themeTitle}
          </h2>

          {issue.themeDescription && (
            <p className="text-sm sm:text-base text-[#615B4F] dark:text-[#B5B0A4] leading-relaxed max-w-xl">
              {issue.themeDescription}
            </p>
          )}

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onStartReading}
              className="px-5 py-2.5 rounded-xl bg-[#7B8E7E] hover:bg-[#687A6B] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-sm cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>પ્રથમ લેખથી વાચન શરૂ કરો</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        {/* Right visual cover column */}
        {issue.coverImage && (
          <div className="lg:col-span-5">
            <div className="relative h-56 sm:h-64 rounded-xl overflow-hidden shadow-xs border border-[#E5E1D3] dark:border-[#353D35]">
              <img
                src={issue.coverImage}
                alt={issue.themeTitle}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                <p className="text-white text-xs font-serif-guj italic line-clamp-2">
                  "સાહિત્ય એ જીવનનું પ્રતિબિંબ છે અને વિચાર એ પ્રગતિનું બીજ છે."
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

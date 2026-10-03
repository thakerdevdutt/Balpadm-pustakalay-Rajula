import React from 'react';
import { WeeklyIssue } from '../types';
import { Calendar, Layers } from 'lucide-react';

interface IssueSelectorProps {
  issues: WeeklyIssue[];
  selectedIssueId: string;
  onSelectIssue: (id: string) => void;
}

export const IssueSelector: React.FC<IssueSelectorProps> = ({
  issues,
  selectedIssueId,
  onSelectIssue,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-[#7A7566] dark:text-[#9A9483] flex items-center gap-1.5 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-[#7B8E7E]" />
          સાપ્તાહિક અંકોની યાદી
        </span>
        <span className="text-xs text-[#7A7566] dark:text-[#9A9483]">
          કુલ {issues.length} અંકો ઉપલબ્ધ
        </span>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {issues.map((issue) => {
          const isSelected = issue.id === selectedIssueId;
          return (
            <button
              key={issue.id}
              onClick={() => onSelectIssue(issue.id)}
              className={`shrink-0 px-4 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-[#252A25] border-[#7B8E7E] shadow-sm ring-1 ring-[#7B8E7E]'
                  : 'bg-[#F2EFE6]/70 dark:bg-[#202520]/70 border-[#E5E1D3] dark:border-[#353D35] hover:bg-white dark:hover:bg-[#252A25]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  isSelected 
                    ? 'bg-[#7B8E7E] text-white' 
                    : 'bg-[#E5E1D3] dark:bg-[#353D35] text-[#555044] dark:text-[#C5C0B3]'
                }`}>
                  અંક {issue.issueNumber}
                </span>
                <span className="text-[11px] text-[#7A7566] dark:text-[#9A9483] flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {issue.date}
                </span>
              </div>
              <p className={`text-xs font-semibold mt-1 font-serif-guj truncate max-w-[200px] ${
                isSelected ? 'text-[#2D3436] dark:text-[#E2DFD6]' : 'text-[#555044] dark:text-[#B0ABA0]'
              }`}>
                {issue.themeTitle}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

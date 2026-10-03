import React, { useMemo } from 'react';
import { isTotalRow, getColumnAlignments } from '../utils/tableParser';
import { renderFormattedText } from '../utils/textFormatter';

interface ArticleTableProps {
  headers: string[];
  rows: string[][];
  raw?: string;
  allowCopy?: boolean;
}

export const ArticleTable: React.FC<ArticleTableProps> = ({
  headers,
  rows,
}) => {
  const alignments = useMemo(() => {
    return getColumnAlignments(headers, rows);
  }, [headers, rows]);

  return (
    <div
      data-article-line
      className="my-5 rounded-xl sm:rounded-2xl border border-[#E5E1D3] dark:border-[#353D35] bg-white dark:bg-[#1C221D] shadow-xs overflow-hidden select-text transition-all"
    >
      {/* Responsive Horizontal Scroll Container */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse text-left font-serif-guj text-sm sm:text-base min-w-full">
          <thead>
            <tr className="bg-[#EAE6DB] dark:bg-[#2C342C] border-b-2 border-[#5B8260]/60 text-[#1C1917] dark:text-[#FDFBF7]">
              {headers.map((header, idx) => {
                const align = alignments[idx] || 'left';
                return (
                  <th
                    key={idx}
                    scope="col"
                    className={`py-3 px-3.5 sm:px-4 font-bold text-xs sm:text-sm tracking-wide whitespace-nowrap ${
                      align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {renderFormattedText(header)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E1D3]/80 dark:divide-[#353D35]/80">
            {rows.map((row, rIdx) => {
              const isTotal = isTotalRow(row);
              return (
                <tr
                  key={rIdx}
                  className={`transition-colors ${
                    isTotal
                      ? 'bg-[#5B8260]/12 dark:bg-[#5B8260]/25 font-bold border-t-2 border-[#5B8260]/60 text-[#1C1917] dark:text-[#FDFBF7]'
                      : rIdx % 2 === 1
                      ? 'bg-[#FAF8F5]/80 dark:bg-[#202720]/80 hover:bg-[#5B8260]/8 dark:hover:bg-[#5B8260]/15'
                      : 'bg-white dark:bg-[#1C221D] hover:bg-[#5B8260]/8 dark:hover:bg-[#5B8260]/15'
                  }`}
                >
                  {row.map((cell, cIdx) => {
                    const align = alignments[cIdx] || 'left';
                    return (
                      <td
                        key={cIdx}
                        className={`py-2.5 px-3.5 sm:px-4 whitespace-nowrap text-xs sm:text-sm ${
                          align === 'right' ? 'text-right font-mono-nums' : 'text-left'
                        } ${
                          isTotal
                            ? 'font-bold text-[#1C1917] dark:text-[#FDFBF7]'
                            : 'text-[#292524] dark:text-[#E7E5E4]'
                        }`}
                      >
                        {renderFormattedText(cell)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

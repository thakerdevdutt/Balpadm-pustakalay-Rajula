import React from 'react';

export interface TableBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
  raw: string;
}

export interface HeaderBlock {
  type: 'header';
  text: string;
  level: number;
}

export interface ParagraphBlock {
  type: 'paragraph';
  text: string;
}

export type ArticleContentBlock = TableBlock | HeaderBlock | ParagraphBlock;

/**
 * Checks whether a given row is a summary / total row
 * (e.g. starts with "કુલ", "Total", "સરવાળો", etc.)
 */
export function isTotalRow(row: string[]): boolean {
  if (!row || row.length === 0) return false;
  const first = (row[0] || '').trim().toLowerCase();
  return (
    first === 'કુલ' ||
    first.startsWith('કુલ') ||
    first === 'total' ||
    first.startsWith('total') ||
    first === 'સરવાળો' ||
    first.startsWith('સરવાળો') ||
    first === 'સરેરાશ'
  );
}

/**
 * Checks whether a column consists predominantly of numeric data
 * (numbers, commas, periods, percentages, currency symbols, +/-).
 * If numeric, it should be right-aligned just like in MS Word / Excel.
 */
export function getColumnAlignments(headers: string[], rows: string[][]): ('left' | 'right')[] {
  const colCount = Math.max(headers.length, ...rows.map((r) => r.length));
  const alignments: ('left' | 'right')[] = [];

  for (let c = 0; c < colCount; c++) {
    let numericCount = 0;
    let totalCount = 0;

    for (const row of rows) {
      if (c < row.length) {
        const val = (row[c] || '').trim();
        if (val) {
          totalCount++;
          // Clean standard numeric formats including 12,000,000, 76.3%, ₹500, +5, etc.
          const clean = val.replace(/[,%₹$€¥\s+]/g, '').trim();
          if (clean !== '' && !isNaN(Number(clean))) {
            numericCount++;
          }
        }
      }
    }

    // If at least 50% of values in this column are numeric, align right
    alignments.push(totalCount > 0 && numericCount / totalCount >= 0.5 ? 'right' : 'left');
  }

  return alignments;
}

/**
 * Parses article prose into structured blocks:
 * - Table blocks: ONLY parsed when explicitly enclosed between [table] and [/table] (or [કોષ્ટક] ... [/કોષ્ટક])
 * - Header blocks: Markdown ### / ## or custom section headings
 * - Paragraph blocks: Regular prose lines (including numbered lists like "01.   લખાણ")
 */
export function parseArticleContent(
  content: string,
  isCustomHeader?: (line: string) => boolean
): ArticleContentBlock[] {
  if (!content) return [];
  const lines = content.split('\n');
  const blocks: ArticleContentBlock[] = [];

  let inTable = false;
  let tableLines: string[] = [];

  const flushTableBlock = () => {
    if (tableLines.length >= 2) {
      const parsedRows = tableLines
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return [];

          // 1. Tab separated (MS Word / Excel)
          if (line.includes('\t')) {
            return line
              .split(/\t+/)
              .map((c) => c.trim())
              .filter((c, idx, arr) => !(idx === arr.length - 1 && c === ''));
          }

          // 2. Markdown pipe table
          if (trimmed.startsWith('|') || trimmed.includes('|')) {
            const clean = trimmed.replace(/^\|/, '').replace(/\|$/, '');
            return clean.split('|').map((c) => c.trim());
          }

          // 3. Multi-space separated
          return trimmed.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
        })
        .filter((row) => row.length > 0 && !row.every((c) => /^[-: ]+$/.test(c)));

      if (parsedRows.length >= 2) {
        const headers = parsedRows[0];
        const rawRows = parsedRows.slice(1);
        const maxCols = Math.max(headers.length, ...rawRows.map((r) => r.length));

        // Pad headers and rows
        const paddedHeaders = [...headers];
        while (paddedHeaders.length < maxCols) {
          paddedHeaders.push('');
        }

        const paddedRows = rawRows.map((row) => {
          const copy = [...row];
          while (copy.length < maxCols) {
            copy.push('');
          }
          return copy;
        });

        blocks.push({
          type: 'table',
          headers: paddedHeaders,
          rows: paddedRows,
          raw: tableLines.join('\n'),
        });
      } else if (tableLines.length > 0) {
        // Fallback to paragraphs if not enough rows
        for (const tLine of tableLines) {
          if (tLine.trim()) {
            blocks.push({ type: 'paragraph', text: tLine });
          }
        }
      }
    } else if (tableLines.length === 1) {
      blocks.push({ type: 'paragraph', text: tableLines[0] });
    }
    tableLines = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check for [table] or [કોષ્ટક] start tag
    if (/^\[(table|કોષ્ટક)\]/i.test(trimmed)) {
      if (inTable) flushTableBlock();
      inTable = true;
      tableLines = [];
      continue;
    }

    // Check for [/table] or [/કોષ્ટક] end tag
    if (/^\[\/(table|કોષ્ટક)\]/i.test(trimmed)) {
      if (inTable) {
        flushTableBlock();
      }
      continue;
    }

    // Inside table mode, collect rows
    if (inTable) {
      if (trimmed) {
        tableLines.push(rawLine);
      }
      continue;
    }

    // Outside table: check empty line
    if (!trimmed) {
      continue;
    }

    // Check headers
    const isMdHeader = trimmed.startsWith('### ') || trimmed.startsWith('## ');
    const isCustomH = isCustomHeader ? isCustomHeader(trimmed) : false;

    if (isMdHeader || isCustomH) {
      const hText = isMdHeader ? trimmed.replace(/^#{2,3}\s+/, '') : trimmed;
      blocks.push({
        type: 'header',
        text: hText,
        level: trimmed.startsWith('## ') ? 2 : 3,
      });
      continue;
    }

    // Normal paragraph (including lists like "01.   લખાણ")
    blocks.push({
      type: 'paragraph',
      text: rawLine,
    });
  }

  if (inTable) {
    flushTableBlock();
  }

  return blocks;
}

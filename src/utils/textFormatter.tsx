import React from 'react';

/**
 * Parses and renders inline formatting for Gujarati and English article text:
 * - Bold: **text** or <b>text</b> or <strong>text</strong>
 * - Italic: *text* or _text_ or <i>text</i> or <em>text</em>
 * - Underline: <u>text</u> or __text__
 * - Strikethrough: ~~text~~ or <s>text</s> or <del>text</del>
 */
export function renderFormattedText(text: string): React.ReactNode {
  if (!text) return null;

  // Regex matches in strict order of specificity:
  // 1. Bold + Italic: ***...***, ___...___, **_..._**, _**...**_
  // 2. <u>...</u> or __...__ (underline)
  // 3. <b>...</b> or <strong>...</strong> or **...** (bold)
  // 4. <i>...</i> or <em>...</em> or *...* or _..._ (italic)
  // 5. <s>...</s> or <del>...</del> or ~~...~~ (strikethrough)
  const regex = /(\*\*\*[\s\S]*?\*\*\*|___[\s\S]*?___|\*\*_\S[\s\S]*?_\*\*|_\*\*[\s\S]*?\*\*_|<u>[\s\S]*?<\/u>|__[\s\S]*?__|<b>[\s\S]*?<\/b>|<strong>[\s\S]*?<\/strong>|\*\*[\s\S]*?\*\*|<i>[\s\S]*?<\/i>|<em>[\s\S]*?<\/em>|\*[\s\S]*?\*|_[\s\S]*?_|<s>[\s\S]*?<\/s>|<del>[\s\S]*?<\/del>|~~[\s\S]*?~~)/g;

  const parts = text.split(regex);
  if (parts.length === 1) return text;

  return parts.map((part, index) => {
    if (!part) return null;

    // 1. Bold + Italic (Combined)
    if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
      const inner = part.slice(3, -3);
      return (
        <strong key={index} className="font-extrabold text-[#111827] dark:text-[#F9FAFB]">
          <em className="italic font-serif-guj">
            {renderFormattedText(inner)}
          </em>
        </strong>
      );
    }
    if (part.startsWith('___') && part.endsWith('___') && part.length >= 6) {
      const inner = part.slice(3, -3);
      return (
        <strong key={index} className="font-extrabold text-[#111827] dark:text-[#F9FAFB]">
          <em className="italic font-serif-guj">
            {renderFormattedText(inner)}
          </em>
        </strong>
      );
    }
    if (part.startsWith('**_') && part.endsWith('_**') && part.length >= 6) {
      const inner = part.slice(3, -3);
      return (
        <strong key={index} className="font-extrabold text-[#111827] dark:text-[#F9FAFB]">
          <em className="italic font-serif-guj">
            {renderFormattedText(inner)}
          </em>
        </strong>
      );
    }
    if (part.startsWith('_**') && part.endsWith('**_') && part.length >= 6) {
      const inner = part.slice(3, -3);
      return (
        <strong key={index} className="font-extrabold text-[#111827] dark:text-[#F9FAFB]">
          <em className="italic font-serif-guj">
            {renderFormattedText(inner)}
          </em>
        </strong>
      );
    }

    // 2. Underline
    if (part.startsWith('<u>') && part.endsWith('</u>')) {
      const inner = part.slice(3, -4);
      return (
        <u key={index} className="underline underline-offset-3 decoration-1 decoration-current">
          {renderFormattedText(inner)}
        </u>
      );
    }
    if (part.startsWith('__') && part.endsWith('__') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <u key={index} className="underline underline-offset-3 decoration-1 decoration-current">
          {renderFormattedText(inner)}
        </u>
      );
    }

    // Bold
    if (part.startsWith('<b>') && part.endsWith('</b>')) {
      const inner = part.slice(3, -4);
      return (
        <strong key={index} className="font-extrabold text-[#111827] dark:text-[#F9FAFB]">
          {renderFormattedText(inner)}
        </strong>
      );
    }
    if (part.startsWith('<strong>') && part.endsWith('</strong>')) {
      const inner = part.slice(8, -9);
      return (
        <strong key={index} className="font-extrabold text-[#111827] dark:text-[#F9FAFB]">
          {renderFormattedText(inner)}
        </strong>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4 && !part.startsWith('***')) {
      const inner = part.slice(2, -2);
      return (
        <strong key={index} className="font-extrabold text-[#111827] dark:text-[#F9FAFB]">
          {renderFormattedText(inner)}
        </strong>
      );
    }

    // Italic
    if (part.startsWith('<i>') && part.endsWith('</i>')) {
      const inner = part.slice(3, -4);
      return (
        <em key={index} className="italic font-serif-guj">
          {renderFormattedText(inner)}
        </em>
      );
    }
    if (part.startsWith('<em>') && part.endsWith('</em>')) {
      const inner = part.slice(4, -5);
      return (
        <em key={index} className="italic font-serif-guj">
          {renderFormattedText(inner)}
        </em>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
      const inner = part.slice(1, -1);
      return (
        <em key={index} className="italic font-serif-guj">
          {renderFormattedText(inner)}
        </em>
      );
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length >= 2 && !part.startsWith('__')) {
      const inner = part.slice(1, -1);
      return (
        <em key={index} className="italic font-serif-guj">
          {renderFormattedText(inner)}
        </em>
      );
    }

    // Strikethrough
    if (part.startsWith('<s>') && part.endsWith('</s>')) {
      const inner = part.slice(3, -4);
      return (
        <del key={index} className="line-through opacity-75">
          {renderFormattedText(inner)}
        </del>
      );
    }
    if (part.startsWith('<del>') && part.endsWith('</del>')) {
      const inner = part.slice(5, -6);
      return (
        <del key={index} className="line-through opacity-75">
          {renderFormattedText(inner)}
        </del>
      );
    }
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <del key={index} className="line-through opacity-75">
          {renderFormattedText(inner)}
        </del>
      );
    }

    return part;
  });
}

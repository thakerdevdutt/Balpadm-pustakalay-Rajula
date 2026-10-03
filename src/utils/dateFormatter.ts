/**
 * Gujarati Date Formatting Utility
 * Converts dates typed in any common format (e.g., dd.mm.yyyy, dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd)
 * or Gujarati digits into the clean Gujarati display format: "૦૮ સપ્ટેમ્બર ૨૦૨૬"
 */

export const GUJARATI_MONTHS = [
  'જાન્યુઆરી',
  'ફેબ્રુઆરી',
  'માર્ચ',
  'એપ્રિલ',
  'મે',
  'જૂન',
  'જુલાઈ',
  'ઓગસ્ટ',
  'સપ્ટેમ્બર',
  'ઓક્ટોબર',
  'નવેમ્બર',
  'ડિસેમ્બર',
] as const;

export const GUJARATI_DIGITS = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];

/**
 * Converts English digits (0-9) to Gujarati digits (૦-૯)
 */
export const toGujaratiDigits = (val: string | number): string => {
  return String(val).replace(/[0-9]/g, (d) => GUJARATI_DIGITS[Number(d)] ?? d);
};

/**
 * Converts Gujarati digits (૦-૯) back to English digits (0-9)
 */
export const toEnglishDigits = (val: string): string => {
  return String(val).replace(/[૦-૯]/g, (d) => {
    const idx = GUJARATI_DIGITS.indexOf(d);
    return idx !== -1 ? String(idx) : d;
  });
};

/**
 * Returns today's date formatted in Gujarati, e.g. "૦૮ સપ્ટેમ્બર ૨૦૨૬"
 */
export const getTodayGujaratiDate = (): string => {
  const now = new Date();
  const day = toGujaratiDigits(String(now.getDate()).padStart(2, '0'));
  const month = GUJARATI_MONTHS[now.getMonth()];
  const year = toGujaratiDigits(now.getFullYear());
  return `${day} ${month} ${year}`;
};

/**
 * Robustly parses almost any date input and converts it to Gujarati format:
 * e.g., "08.09.2026" -> "૦૮ સપ્ટેમ્બર ૨૦૨૬"
 *       "8.9.2026"  -> "૦૮ સપ્ટેમ્બર ૨૦૨૬"
 *       "08/09/2026" -> "૦૮ સપ્ટેમ્બર ૨૦૨૬"
 *       "2026-09-08" -> "૦૮ સપ્ટેમ્બર ૨૦૨૬"
 *       "૦૮.૦૯.૨૦૨૬" -> "૦૮ સપ્ટેમ્બર ૨૦૨૬"
 */
export const formatToGujaratiDate = (rawInput?: string | null): string => {
  if (!rawInput || !rawInput.trim()) {
    return getTodayGujaratiDate();
  }

  const trimmed = rawInput.trim();

  // If it already matches "DD <GujaratiMonth> YYYY" (e.g. ૦૮ સપ્ટેમ્બર ૨૦૨૬ or 08 સપ્ટેમ્બર 2026)
  for (const monthName of GUJARATI_MONTHS) {
    if (trimmed.includes(monthName)) {
      // Ensure digits are converted to Gujarati numerals with 2-digit day
      const parts = trimmed.split(/\s+/);
      if (parts.length === 3) {
        const engDay = parseInt(toEnglishDigits(parts[0]), 10);
        const engYear = parseInt(toEnglishDigits(parts[2]), 10);
        if (!isNaN(engDay) && !isNaN(engYear)) {
          const dayGuj = toGujaratiDigits(String(engDay).padStart(2, '0'));
          const yearGuj = toGujaratiDigits(String(engYear));
          return `${dayGuj} ${monthName} ${yearGuj}`;
        }
      }
      return trimmed;
    }
  }

  // Convert any Gujarati numerals in input to English digits for regex parsing
  const norm = toEnglishDigits(trimmed);

  // 1. Match dd.mm.yyyy, dd/mm/yyyy, dd-mm-yyyy, dd mm yyyy
  const dmyMatch = norm.match(/^(\d{1,2})[\.\/\-\s]+(\d{1,2})[\.\/\-\s]+(\d{2,4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) {
      year += 2000;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const dayGuj = toGujaratiDigits(String(day).padStart(2, '0'));
      const monthGuj = GUJARATI_MONTHS[month - 1];
      const yearGuj = toGujaratiDigits(String(year));
      return `${dayGuj} ${monthGuj} ${yearGuj}`;
    }
  }

  // 2. Match yyyy-mm-dd, yyyy.mm.dd, yyyy/mm/dd (ISO / HTML date picker)
  const ymdMatch = norm.match(/^(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const dayGuj = toGujaratiDigits(String(day).padStart(2, '0'));
      const monthGuj = GUJARATI_MONTHS[month - 1];
      const yearGuj = toGujaratiDigits(String(year));
      return `${dayGuj} ${monthGuj} ${yearGuj}`;
    }
  }

  // 3. Fallback: Native Date.parse for text dates like "Sep 8, 2026"
  const parsed = new Date(norm);
  if (!isNaN(parsed.getTime()) && /[a-zA-Z]/.test(norm)) {
    const dayGuj = toGujaratiDigits(String(parsed.getDate()).padStart(2, '0'));
    const monthGuj = GUJARATI_MONTHS[parsed.getMonth()];
    const yearGuj = toGujaratiDigits(String(parsed.getFullYear()));
    return `${dayGuj} ${monthGuj} ${yearGuj}`;
  }

  // If completely unparsable, return trimmed original
  return trimmed;
};

/**
 * Converts a Gujarati date string (or any date string) to HTML5 input value "YYYY-MM-DD"
 * so an HTML date picker can display the corresponding date.
 */
export const gujaratiDateToHtmlDate = (gujDate: string): string => {
  if (!gujDate) return '';
  const norm = toEnglishDigits(gujDate).trim();

  // If already yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(norm)) return norm;

  // Check if it has a Gujarati month name
  for (let i = 0; i < GUJARATI_MONTHS.length; i++) {
    const mName = GUJARATI_MONTHS[i];
    if (gujDate.includes(mName)) {
      const parts = gujDate.split(/\s+/);
      if (parts.length === 3) {
        const day = parseInt(toEnglishDigits(parts[0]), 10);
        const year = parseInt(toEnglishDigits(parts[2]), 10);
        if (!isNaN(day) && !isNaN(year)) {
          const mStr = String(i + 1).padStart(2, '0');
          const dStr = String(day).padStart(2, '0');
          return `${year}-${mStr}-${dStr}`;
        }
      }
    }
  }

  // Check dd.mm.yyyy
  const dmyMatch = norm.match(/^(\d{1,2})[\.\/\-\s]+(\d{1,2})[\.\/\-\s]+(\d{4})$/);
  if (dmyMatch) {
    const dStr = String(parseInt(dmyMatch[1], 10)).padStart(2, '0');
    const mStr = String(parseInt(dmyMatch[2], 10)).padStart(2, '0');
    const yStr = dmyMatch[3];
    return `${yStr}-${mStr}-${dStr}`;
  }

  return '';
};

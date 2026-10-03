import { ReadingTheme } from '../types';

export interface CategoryColorStyle {
  // 4px left accent border
  leftBorder: string;
  // Subtle card outer border tint
  cardBorder: string;
  // Subtle card background tint for Light, Dark, and Sepia
  cardBg: string;
  // Card hover highlight
  cardHover: string;
  // Category badge tag styling
  badge: string;
  // Distinct accent hex color
  accentHex: string;
  // Specific inline style for sepia mode background if needed
  sepiaBg?: string;
}

interface PaletteDefinition {
  name: string;
  accentHex: string;
  leftBorder: string;
  cardBorder: string;
  cardHover: string;
  badge: string;
  lightBg: string;
  darkBg: string;
  sepiaBg: string;
}

export const CATEGORY_PALETTES: Record<string, PaletteDefinition> = {
  // ૧. વિસ્મય - Sky Blue / Cyan (આકાશી વાદળી)
  'વિસ્મય': {
    name: 'વિસ્મય',
    accentHex: '#0284c7',
    leftBorder: 'border-l-sky-500 dark:border-l-sky-400',
    cardBorder: 'border-sky-200/80 dark:border-sky-800/60',
    cardHover: 'hover:border-sky-400 dark:hover:border-sky-400 hover:shadow-sky-500/10',
    badge: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200 border border-sky-300 dark:border-sky-700',
    lightBg: 'bg-[#F0F8FE]',
    darkBg: 'dark:bg-[#162230]',
    sepiaBg: '#DFE9F0',
  },

  // ૨. વિવર્તન - Royal Purple / Violet (શાહી જાંબલી)
  'વિવર્તન': {
    name: 'વિવર્તન',
    accentHex: '#8b5cf6',
    leftBorder: 'border-l-purple-500 dark:border-l-purple-400',
    cardBorder: 'border-purple-200/80 dark:border-purple-800/60',
    cardHover: 'hover:border-purple-400 dark:hover:border-purple-400 hover:shadow-purple-500/10',
    badge: 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-700',
    lightBg: 'bg-[#FAF5FF]',
    darkBg: 'dark:bg-[#23182E]',
    sepiaBg: '#E9E0F0',
  },

  // ૩. ધાર્મિક / આધ્યાત્મિક - Sacred Saffron / Amber Gold (કેસરી / સોનેરી)
  'ધાર્મિક / આધ્યાત્મિક': {
    name: 'ધાર્મિક / આધ્યાત્મિક',
    accentHex: '#d97706',
    leftBorder: 'border-l-amber-500 dark:border-l-amber-400',
    cardBorder: 'border-amber-200/80 dark:border-amber-800/60',
    cardHover: 'hover:border-amber-400 dark:hover:border-amber-400 hover:shadow-amber-500/10',
    badge: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700',
    lightBg: 'bg-[#FFFBEB]',
    darkBg: 'dark:bg-[#272014]',
    sepiaBg: '#ECE2C5',
  },

  // ૪. પોઝીટીવ એટીટ્યુડ - Vivid Emerald Green (તાજો લીલો)
  'પોઝીટીવ એટીટ્યુડ': {
    name: 'પોઝીટીવ એટીટ્યુડ',
    accentHex: '#059669',
    leftBorder: 'border-l-emerald-500 dark:border-l-emerald-400',
    cardBorder: 'border-emerald-200/80 dark:border-emerald-800/60',
    cardHover: 'hover:border-emerald-400 dark:hover:border-emerald-400 hover:shadow-emerald-500/10',
    badge: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700',
    lightBg: 'bg-[#F0FDF4]',
    darkBg: 'dark:bg-[#15281C]',
    sepiaBg: '#DFECE1',
  },

  // ૫. ઈતિહાસ - Warm Copper / Terracotta (તાંબડી / બ્રોન્ઝ)
  'ઈતિહાસ': {
    name: 'ઈતિહાસ',
    accentHex: '#c2410c',
    leftBorder: 'border-l-orange-600 dark:border-l-orange-500',
    cardBorder: 'border-orange-200/80 dark:border-orange-800/60',
    cardHover: 'hover:border-orange-500 dark:hover:border-orange-400 hover:shadow-orange-500/10',
    badge: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200 border border-orange-300 dark:border-orange-700',
    lightBg: 'bg-[#FFF7ED]',
    darkBg: 'dark:bg-[#2A1E16]',
    sepiaBg: '#EBE0D2',
  },

  // ૬. વાર્તા / વાર્તાઓ - Warm Coral Rose (મૃદુ ગુલાબી / રોઝ)
  'વાર્તા / વાર્તાઓ': {
    name: 'વાર્તા / વાર્તાઓ',
    accentHex: '#e11d48',
    leftBorder: 'border-l-rose-500 dark:border-l-rose-400',
    cardBorder: 'border-rose-200/80 dark:border-rose-800/60',
    cardHover: 'hover:border-rose-400 dark:hover:border-rose-400 hover:shadow-rose-500/10',
    badge: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-700',
    lightBg: 'bg-[#FFF1F2]',
    darkBg: 'dark:bg-[#2B181E]',
    sepiaBg: '#EEDDD8',
  },
  'વાર્તા': {
    name: 'વાર્તા',
    accentHex: '#e11d48',
    leftBorder: 'border-l-rose-500 dark:border-l-rose-400',
    cardBorder: 'border-rose-200/80 dark:border-rose-800/60',
    cardHover: 'hover:border-rose-400 dark:hover:border-rose-400 hover:shadow-rose-500/10',
    badge: 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-700',
    lightBg: 'bg-[#FFF1F2]',
    darkBg: 'dark:bg-[#2B181E]',
    sepiaBg: '#EEDDD8',
  },

  // ૭. કવિતા - Vibrant Magenta / Fuchsia (મેજન્ટા / લાલગુલાબી)
  'કવિતા': {
    name: 'કવિતા',
    accentHex: '#c026d3',
    leftBorder: 'border-l-fuchsia-500 dark:border-l-fuchsia-400',
    cardBorder: 'border-fuchsia-200/80 dark:border-fuchsia-800/60',
    cardHover: 'hover:border-fuchsia-400 dark:hover:border-fuchsia-400 hover:shadow-fuchsia-500/10',
    badge: 'bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950 dark:text-fuchsia-200 border border-fuchsia-300 dark:border-fuchsia-700',
    lightBg: 'bg-[#FDF4FF]',
    darkBg: 'dark:bg-[#29172B]',
    sepiaBg: '#ECDCED',
  },

  // ૮. કોમ્પ્યુટર / ટેકનોલોજી / વિજ્ઞાન - Modern Teal (મોરપીંછ / ટીલ)
  'કોમ્પ્યુટર / ટેકનોલોજી / વિજ્ઞાન': {
    name: 'કોમ્પ્યુટર / ટેકનોલોજી / વિજ્ઞાન',
    accentHex: '#0d9488',
    leftBorder: 'border-l-teal-500 dark:border-l-teal-400',
    cardBorder: 'border-teal-200/80 dark:border-teal-800/60',
    cardHover: 'hover:border-teal-400 dark:hover:border-teal-400 hover:shadow-teal-500/10',
    badge: 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200 border border-teal-300 dark:border-teal-700',
    lightBg: 'bg-[#F0FDFA]',
    darkBg: 'dark:bg-[#132726]',
    sepiaBg: '#DEEDE8',
  },

  // ૯. ન્યુઝ વોચ - Deep Indigo / Cobalt (રોયલ ઈન્ડિગો)
  'ન્યુઝ વોચ': {
    name: 'ન્યુઝ વોચ',
    accentHex: '#4f46e5',
    leftBorder: 'border-l-indigo-500 dark:border-l-indigo-400',
    cardBorder: 'border-indigo-200/80 dark:border-indigo-800/60',
    cardHover: 'hover:border-indigo-400 dark:hover:border-indigo-400 hover:shadow-indigo-500/10',
    badge: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700',
    lightBg: 'bg-[#EEF2FF]',
    darkBg: 'dark:bg-[#1A1E34]',
    sepiaBg: '#DFE3F0',
  },

  // ૯.૧. ન્યુઝ ફોકસ - Deep Blue / Navy (ન્યુઝ ફોકસ)
  'ન્યુઝ ફોકસ': {
    name: 'ન્યુઝ ફોકસ',
    accentHex: '#2563eb',
    leftBorder: 'border-l-blue-600 dark:border-l-blue-400',
    cardBorder: 'border-blue-200/80 dark:border-blue-800/60',
    cardHover: 'hover:border-blue-400 dark:hover:border-blue-400 hover:shadow-blue-500/10',
    badge: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-700',
    lightBg: 'bg-[#EFF6FF]',
    darkBg: 'dark:bg-[#172033]',
    sepiaBg: '#DFE8F2',
  },

  // ૧૦. પ્રવાસ - Turquoise / Ocean Cyan (એક્વા / સાગરી)
  'પ્રવાસ': {
    name: 'પ્રવાસ',
    accentHex: '#0891b2',
    leftBorder: 'border-l-cyan-500 dark:border-l-cyan-400',
    cardBorder: 'border-cyan-200/80 dark:border-cyan-800/60',
    cardHover: 'hover:border-cyan-400 dark:hover:border-cyan-400 hover:shadow-cyan-500/10',
    badge: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200 border border-cyan-300 dark:border-cyan-700',
    lightBg: 'bg-[#ECFEFF]',
    darkBg: 'dark:bg-[#13262D]',
    sepiaBg: '#DCEDEE',
  },

  // ૧૧. આયુર્વેદ અને મેડીકલ સાયન્સ - Fresh Lime / Olive (પોપટી / હર્બલ લીલો)
  'આયુર્વેદ અને મેડીકલ સાયન્સ': {
    name: 'આયુર્વેદ અને મેડીકલ સાયન્સ',
    accentHex: '#65a30d',
    leftBorder: 'border-l-lime-500 dark:border-l-lime-400',
    cardBorder: 'border-lime-200/80 dark:border-lime-800/60',
    cardHover: 'hover:border-lime-400 dark:hover:border-lime-400 hover:shadow-lime-500/10',
    badge: 'bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-200 border border-lime-300 dark:border-lime-700',
    lightBg: 'bg-[#F7FEE7]',
    darkBg: 'dark:bg-[#202914]',
    sepiaBg: '#E7ECD3',
  },

  // ૧૨. સત્યઘટના - Ruby Crimson Red (લાલ)
  'સત્યઘટના': {
    name: 'સત્યઘટના',
    accentHex: '#dc2626',
    leftBorder: 'border-l-red-500 dark:border-l-red-400',
    cardBorder: 'border-red-200/80 dark:border-red-800/60',
    cardHover: 'hover:border-red-400 dark:hover:border-red-400 hover:shadow-red-500/10',
    badge: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200 border border-red-300 dark:border-red-700',
    lightBg: 'bg-[#FEF2F2]',
    darkBg: 'dark:bg-[#2A1717]',
    sepiaBg: '#EBDCDD',
  },

  // ૧૩. નાટક / નાટકો - Deep Amethyst (જાંબુડી)
  'નાટક / નાટકો': {
    name: 'નાટક / નાટકો',
    accentHex: '#6d28d9',
    leftBorder: 'border-l-violet-600 dark:border-l-violet-400',
    cardBorder: 'border-violet-200/80 dark:border-violet-800/60',
    cardHover: 'hover:border-violet-400 dark:hover:border-violet-400 hover:shadow-violet-500/10',
    badge: 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200 border border-violet-300 dark:border-violet-700',
    lightBg: 'bg-[#F5F3FF]',
    darkBg: 'dark:bg-[#20182E]',
    sepiaBg: '#E5DEF0',
  },

  // ૧૪. ફિલ્મ જગત / સંગીત જગત - Pink Magenta (ગુલાબી)
  'ફિલ્મ જગત / સંગીત જગત': {
    name: 'ફિલ્મ જગત / સંગીત જગત',
    accentHex: '#db2777',
    leftBorder: 'border-l-pink-500 dark:border-l-pink-400',
    cardBorder: 'border-pink-200/80 dark:border-pink-800/60',
    cardHover: 'hover:border-pink-400 dark:hover:border-pink-400 hover:shadow-pink-500/10',
    badge: 'bg-pink-100 text-pink-900 dark:bg-pink-950 dark:text-pink-200 border border-pink-300 dark:border-pink-700',
    lightBg: 'bg-[#FDF2F8]',
    darkBg: 'dark:bg-[#2A1623]',
    sepiaBg: '#EADCE3',
  },

  // ૧૫. નવલકથા - Tangerine Orange (નારંગી)
  'નવલકથા': {
    name: 'નવલકથા',
    accentHex: '#ea580c',
    leftBorder: 'border-l-orange-500 dark:border-l-orange-400',
    cardBorder: 'border-orange-200/80 dark:border-orange-800/60',
    cardHover: 'hover:border-orange-400 dark:hover:border-orange-400 hover:shadow-orange-500/10',
    badge: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200 border border-orange-300 dark:border-orange-700',
    lightBg: 'bg-[#FFF7ED]',
    darkBg: 'dark:bg-[#281D14]',
    sepiaBg: '#ECE1CD',
  },

  // ૧૬. ભાષા / ભણતર / એજ્યુકેશન - Royal Blue (વાદળી)
  'ભાષા / ભણતર / એજ્યુકેશન': {
    name: 'ભાષા / ભણતર / એજ્યુકેશન',
    accentHex: '#2563eb',
    leftBorder: 'border-l-blue-500 dark:border-l-blue-400',
    cardBorder: 'border-blue-200/80 dark:border-blue-800/60',
    cardHover: 'hover:border-blue-400 dark:hover:border-blue-400 hover:shadow-blue-500/10',
    badge: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-700',
    lightBg: 'bg-[#EFF6FF]',
    darkBg: 'dark:bg-[#152033]',
    sepiaBg: '#DFE5EE',
  },

  // ૧૭. આત્મકથા / જીવન ચરિત્ર - Warm Stone (પથ્થર / સેન્ડસ્ટોન)
  'આત્મકથા / જીવન ચરિત્ર': {
    name: 'આત્મકથા / જીવન ચરિત્ર',
    accentHex: '#78716c',
    leftBorder: 'border-l-stone-500 dark:border-l-stone-400',
    cardBorder: 'border-stone-300/80 dark:border-stone-700/60',
    cardHover: 'hover:border-stone-400 dark:hover:border-stone-400 hover:shadow-stone-500/10',
    badge: 'bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700',
    lightBg: 'bg-[#FAF8F5]',
    darkBg: 'dark:bg-[#222120]',
    sepiaBg: '#E8E1D3',
  },

  // ૧૮. સામાન્ય લેખ
  'લેખ': {
    name: 'લેખ',
    accentHex: '#556b57',
    leftBorder: 'border-l-[#7B8E7E] dark:border-l-[#A8BDAA]',
    cardBorder: 'border-[#E5E1D3] dark:border-[#353D35]',
    cardHover: 'hover:border-[#7B8E7E]',
    badge: 'bg-[#7B8E7E]/15 text-[#204224] dark:text-[#C5DAC8] border border-[#7B8E7E]/30',
    lightBg: 'bg-[#F8FAF8]',
    darkBg: 'dark:bg-[#202520]',
    sepiaBg: '#E4EAE0',
  },
};

// 10 distinct, non-clashing palettes for any user-added custom categories
const FALLBACK_LIST: PaletteDefinition[] = [
  CATEGORY_PALETTES['વિવર્તન'],                  // 1. Purple
  CATEGORY_PALETTES['પોઝીટીવ એટીટ્યુડ'],          // 2. Emerald Green
  CATEGORY_PALETTES['વિસ્મય'],                    // 3. Sky Blue
  CATEGORY_PALETTES['સત્યઘટના'],                  // 4. Ruby Red
  CATEGORY_PALETTES['ધાર્મિક / આધ્યાત્મિક'],     // 5. Saffron Amber
  CATEGORY_PALETTES['કોમ્પ્યુટર / ટેકનોલોજી / વિજ્ઞાન'], // 6. Teal
  CATEGORY_PALETTES['વાર્તા / વાર્તાઓ'],          // 7. Coral Rose
  CATEGORY_PALETTES['ન્યુઝ વોચ'],                 // 8. Deep Indigo
  CATEGORY_PALETTES['આયુર્વેદ અને મેડીકલ સાયન્સ'], // 9. Fresh Lime
  CATEGORY_PALETTES['કવિતા'],                     // 10. Magenta
];

/**
 * Returns the exact color styling for an article card.
 * @param category - Category name (Gujarati)
 * @param readingTheme - Current reading theme ('light' | 'dark' | 'sepia')
 * @param isEnabled - Master toggle for subject colors (defaults to true)
 */
export const getCategoryColorStyle = (
  category?: string,
  readingTheme: string = 'light',
  isEnabled: boolean = true
): CategoryColorStyle => {
  // If feature is disabled by the user, return the neutral default theme style
  if (!isEnabled || !category || !category.trim()) {
    return {
      leftBorder: 'border-l-[#E5E1D3] dark:border-l-[#353D35]',
      cardBorder: 'border-[#E5E1D3] dark:border-[#353D35]',
      cardBg: 'bg-white dark:bg-[#252A25]',
      cardHover: 'hover:border-[#7B8E7E]',
      badge: 'bg-[#7B8E7E]/10 text-[#244227] dark:text-[#C5DAC8]',
      accentHex: '#7B8E7E',
    };
  }

  const clean = category.trim();
  let palette = CATEGORY_PALETTES[clean];

  if (!palette) {
    for (const [key, p] of Object.entries(CATEGORY_PALETTES)) {
      if (clean.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(clean.toLowerCase())) {
        palette = p;
        break;
      }
    }
  }

  if (!palette) {
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = (hash + clean.charCodeAt(i) * 31) % FALLBACK_LIST.length;
    }
    palette = FALLBACK_LIST[Math.abs(hash)] || CATEGORY_PALETTES['વિવર્તન'];
  }

  // Choose appropriate background based on reading theme
  let cardBgClass = palette.lightBg;
  if (readingTheme === 'dark') {
    cardBgClass = palette.darkBg;
  }

  return {
    leftBorder: palette.leftBorder,
    cardBorder: palette.cardBorder,
    cardBg: cardBgClass,
    cardHover: palette.cardHover,
    badge: palette.badge,
    accentHex: palette.accentHex,
    sepiaBg: readingTheme === 'sepia' ? palette.sepiaBg : undefined,
  };
};

export interface TabColorStyle {
  active: string;
  inactive: string;
  badgeActive: string;
  badgeInactive: string;
}

/**
 * Returns distinct, elegant, WCAG-compliant colors for each category filter tab
 */
export const getTabColorClasses = (tabId: string): TabColorStyle => {
  const id = tabId.toLowerCase().trim();

  // 1. ALL - Forest Green
  if (id === 'all') {
    return {
      active: 'bg-[#2D5A34] text-white shadow-sm ring-1 ring-[#2D5A34]/60',
      inactive: 'bg-[#EAF3EB] dark:bg-[#1C2C1F] text-[#244529] dark:text-[#A3D9A5] border border-[#BBD7BF] dark:border-[#2C4830] hover:bg-[#DCECE0] dark:hover:bg-[#253A29]',
      badgeActive: 'bg-white/25 text-white',
      badgeInactive: 'bg-[#2D5A34]/15 dark:bg-[#A3D9A5]/20 text-[#244529] dark:text-[#C5DAC8]',
    };
  }

  // 2. વિવર્તન / વિવર્તનમ - Royal Purple
  if (id === 'વિવર્તન' || id === 'વિવર્તનમ') {
    return {
      active: 'bg-[#7C3AED] text-white shadow-sm ring-1 ring-[#7C3AED]/60',
      inactive: 'bg-[#F5F3FF] dark:bg-[#231535] text-[#6D28D9] dark:text-[#D8B4FE] border border-[#DDD6FE] dark:border-[#4C1D95] hover:bg-[#EDE9FE] dark:hover:bg-[#2E1065]',
      badgeActive: 'bg-white/25 text-white',
      badgeInactive: 'bg-[#7C3AED]/15 dark:bg-[#D8B4FE]/20 text-[#5B21B6] dark:text-[#E9D5FF]',
    };
  }

  // 3. વિસ્મય - Sky Blue / Azure
  if (id === 'વિસ્મય') {
    return {
      active: 'bg-[#0284C7] text-white shadow-sm ring-1 ring-[#0284C7]/60',
      inactive: 'bg-[#F0F9FF] dark:bg-[#102436] text-[#0369A1] dark:text-[#7DD3FC] border border-[#BAE6FD] dark:border-[#075985] hover:bg-[#E0F2FE] dark:hover:bg-[#0C4A6E]',
      badgeActive: 'bg-white/25 text-white',
      badgeInactive: 'bg-[#0284C7]/15 dark:bg-[#7DD3FC]/20 text-[#075985] dark:text-[#BAE6FD]',
    };
  }

  // 4. રાજુલા - Warm Radiant Amber
  if (id === 'રાજુલા') {
    return {
      active: 'bg-[#D97706] text-white shadow-sm ring-1 ring-[#D97706]/60',
      inactive: 'bg-[#FFFBEB] dark:bg-[#33220A] text-[#B45309] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#78350F] hover:bg-[#FEF3C7] dark:hover:bg-[#451A03]',
      badgeActive: 'bg-white/25 text-white',
      badgeInactive: 'bg-[#D97706]/15 dark:bg-[#FCD34D]/20 text-[#92400E] dark:text-[#FDE68A]',
    };
  }

  // 5. We the readers - Teal / Peacock Blue
  if (id === 'we the readers') {
    return {
      active: 'bg-[#0D9488] text-white shadow-sm ring-1 ring-[#0D9488]/60',
      inactive: 'bg-[#F0FDFA] dark:bg-[#0E2825] text-[#0F766E] dark:text-[#5EEAD4] border border-[#99F6E4] dark:border-[#115E59] hover:bg-[#CCFBF1] dark:hover:bg-[#134E4A]',
      badgeActive: 'bg-white/25 text-white',
      badgeInactive: 'bg-[#0D9488]/15 dark:bg-[#5EEAD4]/20 text-[#115E59] dark:text-[#99F6E4]',
    };
  }

  // 6. અન્ય - Warm Stone / Neutral
  if (id === 'અન્ય') {
    return {
      active: 'bg-[#57534E] text-white shadow-sm ring-1 ring-[#57534E]/60',
      inactive: 'bg-[#F5F5F4] dark:bg-[#242322] text-[#57534E] dark:text-[#D6D3D1] border border-[#E7E5E4] dark:border-[#44403C] hover:bg-[#E7E5E4] dark:hover:bg-[#2E2C2B]',
      badgeActive: 'bg-white/25 text-white',
      badgeInactive: 'bg-[#57534E]/15 dark:bg-[#D6D3D1]/20 text-[#44403C] dark:text-[#E7E5E4]',
    };
  }

  // Dynamic fallback for any additional categories (e.g. NEWS360, XYZ, etc.)
  const dynamicPalettes: TabColorStyle[] = [
    {
      active: 'bg-[#059669] text-white shadow-sm ring-1 ring-[#059669]/60',
      inactive: 'bg-[#ECFDF5] dark:bg-[#0E291C] text-[#047857] dark:text-[#6EE7B7] border border-[#A7F3D0] dark:border-[#065F46] hover:bg-[#D1FAE5]',
      badgeActive: 'bg-white/25 text-white',
      badgeInactive: 'bg-[#059669]/15 dark:bg-[#6EE7B7]/20 text-[#065F46] dark:text-[#A7F3D0]',
    },
    {
      active: 'bg-[#E11D48] text-white shadow-sm ring-1 ring-[#E11D48]/60',
      inactive: 'bg-[#FFF1F2] dark:bg-[#311117] text-[#BE123C] dark:text-[#FDA4AF] border border-[#FECDD3] dark:border-[#881337] hover:bg-[#FFE4E6]',
      badgeActive: 'bg-white/25 text-white',
      badgeInactive: 'bg-[#E11D48]/15 dark:bg-[#FDA4AF]/20 text-[#9F1239] dark:text-[#FECDD3]',
    },
    {
      active: 'bg-[#4F46E5] text-white shadow-sm ring-1 ring-[#4F46E5]/60',
      inactive: 'bg-[#EEF2FF] dark:bg-[#1A1E38] text-[#4338CA] dark:text-[#A5B4FC] border border-[#C7D2FE] dark:border-[#3730A3] hover:bg-[#E0E7FF]',
      badgeActive: 'bg-white/25 text-white',
      badgeInactive: 'bg-[#4F46E5]/15 dark:bg-[#A5B4FC]/20 text-[#3730A3] dark:text-[#C7D2FE]',
    },
    {
      active: 'bg-[#EA580C] text-white shadow-sm ring-1 ring-[#EA580C]/60',
      inactive: 'bg-[#FFF7ED] dark:bg-[#301B0E] text-[#C2410C] dark:text-[#FDBA74] border border-[#FFEDD5] dark:border-[#9A3412] hover:bg-[#FFEDD5]',
      badgeActive: 'bg-white/25 text-white',
      badgeInactive: 'bg-[#EA580C]/15 dark:bg-[#FDBA74]/20 text-[#9A3412] dark:text-[#FFEDD5]',
    },
    {
      active: 'bg-[#C026D3] text-white shadow-sm ring-1 ring-[#C026D3]/60',
      inactive: 'bg-[#FDF4FF] dark:bg-[#2E1236] text-[#A21CAF] dark:text-[#F0ABFC] border border-[#F5D0FE] dark:border-[#701A75] hover:bg-[#FAE8FF]',
      badgeActive: 'bg-white/25 text-white',
      badgeInactive: 'bg-[#C026D3]/15 dark:bg-[#F0ABFC]/20 text-[#701A75] dark:text-[#F5D0FE]',
    },
    {
      active: 'bg-[#0891B2] text-white shadow-sm ring-1 ring-[#0891B2]/60',
      inactive: 'bg-[#ECFEFF] dark:bg-[#0E2833] text-[#0E7490] dark:text-[#67E8F9] border border-[#A5F3FC] dark:border-[#155E75] hover:bg-[#CFFAFE]',
      badgeActive: 'bg-white/25 text-white',
      badgeInactive: 'bg-[#0891B2]/15 dark:bg-[#67E8F9]/20 text-[#155E75] dark:text-[#A5F3FC]',
    },
  ];

  let hash = 0;
  for (let i = 0; i < tabId.length; i++) {
    hash = (hash + tabId.charCodeAt(i) * 19) % dynamicPalettes.length;
  }
  return dynamicPalettes[Math.abs(hash)];
};


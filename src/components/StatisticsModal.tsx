import React, { useMemo, useState } from 'react';
import { 
  X, 
  BarChart3, 
  FileText, 
  Clock, 
  AlignLeft, 
  TrendingUp, 
  User, 
  Bookmark, 
  Tag, 
  Award,
  BookOpen,
  Search,
  Hash,
  Sparkles,
  Layers
} from 'lucide-react';
import { WeeklyIssue, Article } from '../types';

// Comprehensive Gujarati Stop Words set (Common functional, auxiliary, pronoun, and conversational words to exclude from keyword frequency)
const GUJARATI_STOP_WORDS = new Set([
  // Auxiliary verbs & Forms of 'to be' / 'to do' / 'to happen' / 'to go' / 'to give' / 'to take'
  'છે', 'છો', 'છું', 'છીએ', 'હતો', 'હતી', 'હતું', 'હતા', 'હતાં', 'હોય', 'હોત', 'હોવું', 'હોવા', 'હોવાનું', 'હોવાની', 'હશે', 'હશો',
  'થાય', 'થઈ', 'થયો', 'થયું', 'થયા', 'થયાં', 'થવા', 'થતી', 'થતો', 'થતાં', 'થશે', 'થવાનું', 'થવાની', 'થવાનો', 'થયેલ', 'થયેલા', 'થયેલી', 'થયેલું', 'થયેલો', 'થઈને', 'થવામાં',
  'કરે', 'કરી', 'કર્યો', 'કર્યું', 'કર્યા', 'કર્યાં', 'કરતાં', 'કરતો', 'કરતી', 'કરવું', 'કરશે', 'કરીને', 'કરવા', 'કરવાની', 'કરવાનો', 'કરવાનું', 'કરનાર', 'કરનારા', 'કરનારી', 'કરો', 'કરીએ', 'કરવામાં',
  'રહ્યા', 'રહી', 'રહ્યો', 'રહ્યું', 'રહે', 'રહેશે', 'રહેતા', 'રહેતી', 'રહેતો', 'રહેવું', 'રહેવા', 'રહેલા', 'રહેલી', 'રહેલું', 'રહેલો',
  'આવે', 'આવી', 'આવ્યો', 'આવ્યું', 'આવ્યા', 'આવવા', 'આવેલ', 'આવેલા', 'આવેલી', 'આવેલો', 'આવતા', 'આવતી', 'આવશે',
  'ગયા', 'ગઈ', 'ગયો', 'ગયું', 'જવું', 'જાય', 'જતાં', 'જવા', 'જવાનું', 'ગયેલા', 'ગયેલી', 'ગયેલું', 'ગયેલો',
  'લીધું', 'લીધી', 'લીધો', 'લીધા', 'લેવું', 'લે', 'લઈ', 'લઇ', 'લઈને', 'લેવા', 'લેતા', 'લેતી', 'લેશે',
  'દીધું', 'દીધી', 'દીધો', 'દીધા', 'દેવું', 'દે', 'દેવા', 'દેશે',
  'આપ્યો', 'આપી', 'આપ્યું', 'આપ્યા', 'આપવું', 'આપે', 'આપેલ', 'આપેલા', 'આપેલી', 'આપેલો', 'આપતા', 'આપતી', 'આપવા', 'આપવાનું', 'આપશે',
  'જોયું', 'જોયા', 'જોઈ', 'જોયો', 'જોવું', 'જોવા', 'જોઈને', 'જુઓ', 'જોતા', 'જોતી', 'જોશે', 'જોઈએ', 'જોઈશે',
  'કહ્યું', 'કહે', 'કહી', 'કહેવાય', 'કહેતા', 'કહેતી', 'કહેવું', 'કહેવા', 'બોલ્યા', 'બોલી', 'બોલવું', 'બોલતા', 'બોલવા',
  'લાગે', 'લાગ્યું', 'લાગ્યો', 'લાગી', 'લાગ્યા', 'લાગશે', 'લાગવા',
  'શકાય', 'શકે', 'શકશે', 'શક્યા', 'શક્ય',
  'પડે', 'પડી', 'પડ્યો', 'પડ્યું', 'પડ્યા', 'પાડી', 'પાડ્યો', 'પાડ્યા', 'પડશે', 'પડતા', 'પાડવા',
  'બની', 'બન્યો', 'બન્યું', 'બન્યા', 'બને', 'બનશે', 'બનવા', 'બનાવી', 'બનાવ્યો', 'બનાવ્યા', 'બનાવવું',
  'મળે', 'મળી', 'મળ્યો', 'મળ્યું', 'મળ્યા', 'મળશે', 'મળવા', 'મેળવી', 'મેળવ્યો', 'મેળવવા',
  'લખ્યું', 'લખી', 'લખ્યો', 'લખ્યા', 'લખવું', 'લખવા', 'વાંચવું', 'વાંચવા', 'વાંચી',
  'મૂક્યો', 'મૂકી', 'મૂક્યું', 'મૂક્યા', 'મૂકવું', 'મૂકવા', 'રાખ્યો', 'રાખી', 'રાખ્યું', 'રાખ્યા', 'રાખવું', 'રાખે', 'રાખવા',
  'ગણાય', 'મનાય', 'સમજાય', 'જણાય', 'જણાયું', 'માનવામાં', 'ઓળખાય', 'જાણે', 'જાણી', 'જાણવા',
  'માંડી', 'માંડ', 'માંડ્યા', 'બેઠા', 'બેઠી', 'બેઠો', 'બેઠું', 'બેસવા', 'ચાલ્યા', 'ચાલી', 'ચાલ્યો', 'ચાલ્યું', 'ચાલે',

  // Conjunctions, Particles & Discourse Markers
  'અને', 'ને', 'પણ', 'તો', 'કે', 'જો', 'જ', 'ય', 'ત્યારે', 'જ્યારે', 'તેથી', 'એટલે', 'એટલેકે', 'એટલેજ', 'તેજ', 'એજ', 'કારણ', 'કારણકે', 'કારણે',
  'પરંતુ', 'છતાં', 'તેમછતાં', 'જોકે', 'તોય', 'અથવા', 'યા', 'માટે', 'વાસ્તે', 'વિશે', 'તરફ', 'દ્વારા', 'સાથે', 'સાથોસાથ', 'વગર', 'સિવાય',
  'વગેરે', 'તથા', 'તેમજ', 'જેમ', 'તેમ', 'જેમકે', 'આમ', 'એમ', 'અહીં', 'ત્યાં', 'ક્યાં', 'જ્યાં', 'ક્યારે', 'ક્યારેક', 'ક્યાંક', 'ક્યાંય',
  'હવે', 'પછી', 'પહેલાં', 'પહેલા', 'અગાઉ', 'ફરી', 'ફરીથી', 'વળી', 'માત્ર', 'ફક્ત', 'કેવળ', 'ખુદ', 'પોતે', 'જાતે',
  'પરથી', 'તરીકે', 'લીધે', 'બદલે', 'હેઠળ', 'મુજબ', 'પ્રમાણે', 'પેઠે', 'અંગે', 'બાબતે', 'વખતે', 'સમયે', 'દરમિયાન', 'ઉપરાંત',

  // Pronouns & Demonstratives
  'આ', 'એ', 'તે', 'હું', 'તું', 'તમે', 'અમે', 'આપણે', 'તેઓ',
  'મારું', 'મારી', 'મારા', 'મારો', 'મને', 'મેં', 'મારે',
  'તારું', 'તારી', 'તારા', 'તારો', 'તને', 'તેં', 'તારે', 'તમને', 'તમારી', 'તમારા', 'તમારો',
  'તેમનું', 'તેમની', 'તેમના', 'તેમનો', 'તેમને', 'તેમણે',
  'આપણું', 'આપણી', 'આપણા', 'આપણો', 'આપણને',
  'અમારું', 'અમારી', 'અમારા', 'અમારો', 'અમને',
  'એનું', 'એની', 'એના', 'એનો', 'એને', 'એણે', 'એમને', 'એમણે', 'એમની', 'એમના', 'એમનો', 'એમાં',
  'તેનું', 'તેની', 'તેના', 'તેનો', 'તેને', 'તેણે', 'તેમાં', 'તેનાં',
  'પોતાનું', 'પોતાની', 'પોતાના', 'પોતાનો', 'પોતાને',
  'જે', 'જેણે', 'જેને', 'જેનું', 'જેની', 'જેના', 'જેનો', 'જેમાં', 'જેમના', 'જેમને', 'જેવા', 'જેવી', 'જેવું', 'જેવો', 'જેવાં',
  'કોઈ', 'કોઈક', 'કોઇ', 'કોઇક', 'કોઈને', 'કોઈપણ', 'કોણ', 'શું', 'શા', 'શાને', 'શા માટે', 'કેમ', 'કેવી', 'કેવો', 'કેવું', 'કેવા',
  'કંઈ', 'કંઈક', 'કઇ', 'કઇક', 'કશું', 'કશી',
  'બધા', 'બધાં', 'બધું', 'સહુ', 'સૌ', 'દરેક', 'અન્ય', 'બીજું', 'બીજી', 'બીજા', 'બીજો', 'બંને',
  'આવા', 'આવી', 'આવું', 'આવો', 'આવાં', 'તેવા', 'તેવી', 'તેવું', 'તેવો', 'તેવાં', 'એવા', 'એવી', 'એવું', 'એવો', 'એવાં',
  'કેટલાક', 'કેટલીક', 'કેટલું', 'કેટલા', 'કેટલો', 'કેટલાંક',

  // Postpositions, Prepositions & Case Markers
  'માં', 'પર', 'થી', 'ની', 'નો', 'ના', 'નું', 'ને', 'વડે', 'કાજે',
  'અંદર', 'બહાર', 'ઉપર', 'નીચે', 'આગળ', 'પાછળ', 'વચ્ચે', 'સામે', 'પાસે', 'સુધી', 'લગી', 'તક', 'છેક',

  // Adverbs, Modifiers, Conversational Fillers, Common Meta Words
  'ખૂબ', 'બહુ', 'થોડું', 'થોડા', 'થોડી', 'વધારે', 'ઓછું', 'ઓછા', 'ઓછી', 'વધુ', 'સૌથી', 'સાવ', 'જરાક', 'જરા',
  'નથી', 'ના', 'નહિ', 'નહીં', 'વિના', 'હજુ', 'હજી', 'કદાચ', 'લગભગ', 'હંમેશા', 'હંમેશાં', 'કદી', 'ક્યારેય', 'કાયમ', 'સતત',
  'સાચે', 'ખરેખર', 'ચોક્કસ', 'નક્કી', 'બરાબર', 'સ્પષ્ટ', 'આખરે', 'છેવટે', 'તરત', 'રોજ', 'હાલ',
  'એટલું', 'એટલી', 'એટલો', 'એટલા', 'કેટલું', 'આટલું', 'આટલી', 'આટલો', 'આટલા', 'તેટલું',
  'મોટા', 'મોટી', 'મોટો', 'મોટું', 'નાના', 'નાની', 'નાનો', 'નાનું', 'નવી', 'નવો', 'નવું', 'નવા', 'જૂની', 'જૂનો', 'જૂનું', 'જૂના',
  'ખાસ', 'મુખ્ય', 'સામાન્ય', 'અલગ', 'તમામ', 'સમગ્ર', 'અનેક', 'ભારે',
  'આજ', 'આજના', 'આજનાં', 'આજે', 'કાલ', 'ગઈકાલે', 'આવતીકાલે',
  'સમય', 'સમયે', 'સમયો', 'લોકો', 'વાત', 'વાતો', 'રીતે', 'રીત', 'રીતો', 'વર્ષ', 'વર્ષો', 'દિવસ', 'દિવસે', 'દિવસો', 'વાર', 'વખત', 'નામ', 'નામે', 'નામના', 'કામ', 'કામો', 'ખબર', 'જવાબ', 'જવાબો',
  'હાથ', 'હાથમાં', 'મન', 'મનમાં', 'નજર', 'અવાજ', 'ચહેરા', 'પગ', 'ભાઈ', 'બસ', 'ચા', 'ફોન', 'ઓફ', 'હૈ',
  'ધૈવત', 'ત્રિવેદી', 'ધૈવતભાઈ', 'લેખક', 'લેખ', 'લેખો', 'ભાગ', 'ભાગો', 'અંક', 'અંકો', 'વાંચો', 'વાંચન',
  'શરૂ', 'શરૂઆત', 'યાદ', 'દૂર', 'નજીક', 'તૈયાર', 'મૂળ', 'મૂળે', 'સવાલ', 'સવાલો', 'શબ્દ', 'શબ્દો', 'ઘર', 'ઘરે', 'આંખ', 'આંખો',
  'ગામ', 'ગામો', 'ભૂમિ', 'વિસ્તાર', 'વિસ્તારો',

  // Numbers in words
  'એક', 'બે', 'ત્રણ', 'ચાર', 'પાંચ', 'છ', 'સાત', 'આઠ', 'નવ', 'દસ', 'વીસ', 'ત્રીસ', 'ચાલીસ', 'પચાસ', 'સો', 'હજાર', 'લાખ', 'કરોડ',
  'પ્રથમ', 'પહેલી', 'પહેલો', 'પહેલું', 'બીજા', 'ત્રીજા', 'ચોથા'
]);

// Helper to normalize and strip Gujarati punctuation, case endings, and plural suffixes
function normalizeGujaratiWord(raw: string): string | null {
  if (!raw) return null;
  // Remove leading/trailing non-alphanumeric punctuation
  let w = raw.replace(/^[^\u0A80-\u0AFFa-zA-Z0-9]+|[^\u0A80-\u0AFFa-zA-Z0-9]+$/g, '').trim();
  if (w.length < 3) return null;
  if (/^\d+$/.test(w) || /^[\u0AE6-\u0AEF]+$/.test(w)) return null;
  if (GUJARATI_STOP_WORDS.has(w)) return null;

  // Stage 1: Case marker suffix strip ("માં", "થી", "નો", "ની", "ના", "નું", "ને")
  const caseSuffixes = ['માં', 'થી', 'નો', 'ની', 'ના', 'નું', 'ને'];
  for (const suf of caseSuffixes) {
    if (w.endsWith(suf) && w.length - suf.length >= 2) {
      const stem = w.slice(0, -suf.length);
      if (GUJARATI_STOP_WORDS.has(stem)) return null;
      w = stem;
      break;
    }
  }

  // Stage 2: Plural / inflected suffix strip ("ઓ", "ો", "ે")
  const pluralSuffixes = ['ઓ', 'ો', 'ે'];
  for (const suf of pluralSuffixes) {
    if (w.endsWith(suf) && w.length - suf.length >= 2) {
      const stem = w.slice(0, -suf.length);
      if (GUJARATI_STOP_WORDS.has(stem)) return null;
      w = stem;
      break;
    }
  }

  return GUJARATI_STOP_WORDS.has(w) ? null : w;
}

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: WeeklyIssue[];
  bookmarkedCount: number;
  onSelectArticle?: (issue: WeeklyIssue, article: Article) => void;
  onSearchWord?: (word: string) => void;
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({
  isOpen,
  onClose,
  issues,
  bookmarkedCount,
  onSelectArticle,
  onSearchWord,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [wordLimit, setWordLimit] = useState<number>(15);
  const [chartMode, setChartMode] = useState<'bars' | 'cloud'>('bars');

  // Compute all statistics efficiently
  const stats = useMemo(() => {
    // Flatten all articles
    const allArticles: { article: Article; issue: WeeklyIssue }[] = [];
    (issues || []).forEach((issue) => {
      (issue?.articles || []).forEach((article) => {
        if (article) {
          allArticles.push({ article, issue });
        }
      });
    });

    const totalArticles = allArticles.length;

    // Word counts and reading time estimation
    let totalWords = 0;
    let longestArticle: { article: Article; issue: WeeklyIssue; words: number } | null = null;
    let shortestArticle: { article: Article; issue: WeeklyIssue; words: number } | null = null;

    // Category distribution
    const categoryMap: Record<string, number> = {};
    
    // Author distribution
    const authorMap: Record<string, { count: number; articles: string[] }> = {};

    // Word frequency analysis (excluding stop words)
    const wordFrequencyMap: Record<string, { count: number; articleCount: number }> = {};

    // Articles detailed breakdown list
    const articlesAnalysis = allArticles.map(({ article, issue }, index) => {
      const text = `${article.title || ''} ${article.summary || ''} ${article.content || ''}`;
      const rawTokens = text.trim().split(/\s+/).filter(Boolean);
      const words = rawTokens.length;
      const readingMinutes = Math.max(1, Math.round(words / 190));
      totalWords += words;

      if (!longestArticle || words > longestArticle.words) {
        longestArticle = { article, issue, words };
      }
      if (!shortestArticle || words < shortestArticle.words) {
        shortestArticle = { article, issue, words };
      }

      // Categories
      const cat = article.category?.trim() || 'સામાન્ય';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;

      // Authors
      const auth = article.author?.trim() || 'ધૈવત ત્રિવેદી';
      if (!authorMap[auth]) {
        authorMap[auth] = { count: 0, articles: [] };
      }
      authorMap[auth].count += 1;
      authorMap[auth].articles.push(article.title);

      // Extract frequent words
      const seenInThisArticle = new Set<string>();
      rawTokens.forEach((token) => {
        const cleaned = normalizeGujaratiWord(token);
        if (cleaned) {
          if (!wordFrequencyMap[cleaned]) {
            wordFrequencyMap[cleaned] = { count: 0, articleCount: 0 };
          }
          wordFrequencyMap[cleaned].count += 1;
          if (!seenInThisArticle.has(cleaned)) {
            seenInThisArticle.add(cleaned);
            wordFrequencyMap[cleaned].articleCount += 1;
          }
        }
      });

      return {
        index: index + 1,
        article,
        issue,
        words,
        readingMinutes,
      };
    });

    // Average reading time (assuming ~180-200 words per minute)
    const totalReadingMinutes = Math.max(1, Math.round(totalWords / 190));
    const avgWordsPerArticle = totalArticles > 0 ? Math.round(totalWords / totalArticles) : 0;

    // Sorted categories
    const sortedCategories = Object.entries(categoryMap)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalArticles > 0 ? Math.round((count / totalArticles) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Sorted authors
    const sortedAuthors = Object.entries(authorMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        articles: data.articles,
        percentage: totalArticles > 0 ? Math.round((data.count / totalArticles) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Sorted frequent words
    const sortedFrequentWords = Object.entries(wordFrequencyMap)
      .map(([word, data]) => ({
        word,
        count: data.count,
        articleCount: data.articleCount,
      }))
      .sort((a, b) => b.count - a.count);

    const maxWordFrequency = sortedFrequentWords.length > 0 ? sortedFrequentWords[0].count : 1;
    const totalUniqueKeywords = sortedFrequentWords.length;

    return {
      totalArticles,
      totalWords,
      totalReadingMinutes,
      avgWordsPerArticle,
      longestArticle,
      shortestArticle,
      sortedCategories,
      sortedAuthors,
      articlesAnalysis,
      allArticles,
      sortedFrequentWords,
      maxWordFrequency,
      totalUniqueKeywords,
    };
  }, [issues]);

  if (!isOpen) return null;

  // Filter articles if category is clicked
  const filteredArticles = selectedCategory
    ? stats.allArticles.filter((item) => (item.article.category || 'સામાન્ય') === selectedCategory)
    : stats.allArticles;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4 pt-2.5 sm:pt-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#1E231E] text-[#2D3436] dark:text-[#E2DFD6] rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E5E1D3] dark:border-[#353D35] overflow-hidden mt-1 sm:my-auto">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#E5E1D3] dark:border-[#353D35] flex items-center justify-between bg-[#FAF8F5] dark:bg-[#252B25]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1D5299] text-white flex items-center justify-center shadow-md shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-serif-guj text-[#1C1917] dark:text-white">
                  લેખોનું આંકડાકીય વિશ્લેષણ
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#1D5299]/15 text-[#1D5299] dark:text-[#88B4E8] text-[11px] font-bold">
                  Statistics
                </span>
              </div>
              <p className="text-xs text-[#7A7566] dark:text-[#9A9483]">
                ધૈવત ત્રિવેદીના લેખ સંગ્રહની સંપૂર્ણ આંકડાકીય માહિતી
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A7566] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition"
            title="બંધ કરો"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
          
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            
            {/* Total Articles */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-[#1D5299]/25 bg-[#1D5299]/5 dark:bg-[#1D5299]/10">
              <div className="flex items-center justify-between text-[#1D5299] dark:text-[#88B4E8] mb-1">
                <FileText className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold tracking-wider">કુલ લેખો</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-serif-guj text-[#1C1917] dark:text-white">
                {stats.totalArticles}
              </div>
              <div className="text-[11px] text-[#7A7566] dark:text-[#9A9483] mt-0.5">
                સંગ્રહિત લેખો
              </div>
            </div>

            {/* Total Words */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-[#8C6239]/25 bg-[#8C6239]/5 dark:bg-[#8C6239]/10">
              <div className="flex items-center justify-between text-[#8C6239] dark:text-[#E0B589] mb-1">
                <AlignLeft className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold tracking-wider">શબ્દો</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-serif-guj text-[#1C1917] dark:text-white">
                {stats.totalWords.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-[#7A7566] dark:text-[#9A9483] mt-0.5">
                કુલ શબ્દ સંખ્યા
              </div>
            </div>

            {/* Total Reading Time */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-purple-500/25 bg-purple-500/5 dark:bg-purple-500/10">
              <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold tracking-wider">વાચન સમય</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-serif-guj text-[#1C1917] dark:text-white">
                ~{stats.totalReadingMinutes}
              </div>
              <div className="text-[11px] text-[#7A7566] dark:text-[#9A9483] mt-0.5">
                મિનિટ વાચન
              </div>
            </div>

            {/* Average Words Per Article */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/10">
              <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold tracking-wider">સરેરાશ લંબાઈ</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-serif-guj text-[#1C1917] dark:text-white">
                ~{stats.avgWordsPerArticle}
              </div>
              <div className="text-[11px] text-[#7A7566] dark:text-[#9A9483] mt-0.5">
                શબ્દો પ્રતિ લેખ
              </div>
            </div>

            {/* Bookmarked Count */}
            <div className="p-3 sm:p-3.5 rounded-xl border border-rose-500/25 bg-rose-500/5 dark:bg-rose-500/10">
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
                <Bookmark className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold tracking-wider">બુકમાર્ક</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-serif-guj text-[#1C1917] dark:text-white">
                {bookmarkedCount}
              </div>
              <div className="text-[11px] text-[#7A7566] dark:text-[#9A9483] mt-0.5">
                સાચવેલા લેખ
              </div>
            </div>

          </div>

          {/* Most Frequent Words Graphical Chart Section */}
          <div className="p-4 sm:p-5 rounded-xl border border-[#E5E1D3] dark:border-[#353D35] bg-[#FAF8F5] dark:bg-[#252B25] shadow-xs">
            {/* Header with Title and Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-black/5 dark:border-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <h4 className="font-serif-guj font-bold text-sm sm:text-base text-[#1C1917] dark:text-white flex items-center gap-2">
                    સૌથી વધુ વપરાયેલા મુખ્ય શબ્દો (Word Frequency Chart)
                  </h4>
                </div>
                <p className="text-[11px] text-[#7A7566] dark:text-[#9A9483] mt-1 font-serif-guj">
                  સામાન્ય/જોડાક્ષર શબ્દો (અને, છે, તો, હવે, આમ, હતો, હતી વગેરે) સિવાયના મુખ્ય વિષયવસ્તુના શબ્દોનો ચાર્ટ
                </p>
              </div>

              {/* View Mode & Count Selector */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {/* 15 vs 30 limit */}
                <div className="flex items-center bg-black/5 dark:bg-white/10 p-0.5 rounded-lg text-xs font-serif-guj">
                  <button
                    type="button"
                    onClick={() => setWordLimit(15)}
                    className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                      wordLimit === 15
                        ? 'bg-white dark:bg-[#1E231E] text-[#1C1917] dark:text-white shadow-xs font-bold'
                        : 'text-[#7A7566] dark:text-[#9A9483] hover:text-[#1C1917]'
                    }`}
                  >
                    ટોચના ૧૫
                  </button>
                  <button
                    type="button"
                    onClick={() => setWordLimit(30)}
                    className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                      wordLimit === 30
                        ? 'bg-white dark:bg-[#1E231E] text-[#1C1917] dark:text-white shadow-xs font-bold'
                        : 'text-[#7A7566] dark:text-[#9A9483] hover:text-[#1C1917]'
                    }`}
                  >
                    ટોચના ૩૦
                  </button>
                </div>

                {/* View Mode Toggle: Bars vs Cloud */}
                <div className="flex items-center bg-black/5 dark:bg-white/10 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setChartMode('bars')}
                    title="બાર ચાર્ટ (Bar Chart)"
                    className={`p-1.5 rounded-md transition cursor-pointer ${
                      chartMode === 'bars'
                        ? 'bg-white dark:bg-[#1E231E] text-[#1D5299] dark:text-[#88B4E8] shadow-xs'
                        : 'text-[#7A7566] dark:text-[#9A9483]'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode('cloud')}
                    title="શબ્દ વાદળ (Word Cloud)"
                    className={`p-1.5 rounded-md transition cursor-pointer ${
                      chartMode === 'cloud'
                        ? 'bg-white dark:bg-[#1E231E] text-[#1D5299] dark:text-[#88B4E8] shadow-xs'
                        : 'text-[#7A7566] dark:text-[#9A9483]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Chart Body */}
            {stats.sortedFrequentWords.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#7A7566] dark:text-[#9A9483] font-serif-guj">
                કોઈ શબ્દ વિશ્લેષણ ઉપલબ્ધ નથી.
              </div>
            ) : chartMode === 'bars' ? (
              <div className="space-y-2.5">
                {stats.sortedFrequentWords.slice(0, wordLimit).map((item, idx) => {
                  const percentageOfMax = Math.max(8, Math.round((item.count / stats.maxWordFrequency) * 100));
                  return (
                    <div 
                      key={item.word} 
                      className="p-2 sm:p-2.5 rounded-lg bg-white/70 dark:bg-[#1E231E]/70 border border-black/5 dark:border-white/5 hover:border-[#1D5299]/30 transition group"
                    >
                      <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5 font-serif-guj">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold font-sans ${
                            idx === 0 
                              ? 'bg-amber-500 text-white shadow-xs' 
                              : idx === 1 
                              ? 'bg-slate-400 text-white shadow-xs' 
                              : idx === 2 
                              ? 'bg-amber-700 text-white shadow-xs' 
                              : 'bg-black/5 dark:bg-white/10 text-[#7A7566] dark:text-[#9A9483]'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-[#1C1917] dark:text-white text-sm sm:text-base tracking-wide">
                            {item.word}
                          </span>
                          <span className="text-[11px] text-[#7A7566] dark:text-[#9A9483] font-sans">
                            ({item.articleCount} લેખ)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-bold font-sans text-xs sm:text-sm text-[#1D5299] dark:text-[#88B4E8]">
                            {item.count.toLocaleString('en-IN')} <span className="font-serif-guj font-normal text-xs text-[#7A7566] dark:text-[#9A9483]">વખત</span>
                          </span>
                          {onSearchWord && (
                            <button
                              type="button"
                              onClick={() => {
                                onSearchWord(item.word);
                                onClose();
                              }}
                              title={`આ લેખોમાં "${item.word}" સર્ચ કરો`}
                              className="px-2 py-0.5 rounded text-[11px] font-serif-guj bg-[#1D5299]/10 hover:bg-[#1D5299] text-[#1D5299] hover:text-white transition flex items-center gap-1 cursor-pointer"
                            >
                              <Search className="w-2.5 h-2.5" />
                              <span>શોધો</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Visual Graphic Bar with smooth gradient */}
                      <div className="w-full h-2.5 sm:h-3 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden p-[1px]">
                        <div
                          className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#1D5299] via-[#2E72CC] to-[#5B8260]"
                          style={{ width: `${percentageOfMax}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Word Cloud View */
              <div className="p-4 rounded-xl bg-white/70 dark:bg-[#1E231E]/70 border border-black/5 dark:border-white/5 flex flex-wrap gap-2 sm:gap-2.5 items-center justify-center min-h-[160px]">
                {stats.sortedFrequentWords.slice(0, wordLimit).map((item, idx) => {
                  const scaleRatio = item.count / stats.maxWordFrequency;
                  const fontSize = Math.max(12, Math.min(22, Math.round(12 + scaleRatio * 10)));
                  return (
                    <button
                      key={item.word}
                      type="button"
                      onClick={() => {
                        if (onSearchWord) {
                          onSearchWord(item.word);
                          onClose();
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5 hover:border-[#1D5299]/40 hover:bg-[#1D5299]/10 transition cursor-pointer flex items-center gap-1.5 font-serif-guj group"
                      title={`${item.word}: ${item.count} વખત (${item.articleCount} લેખોમાં)`}
                    >
                      <span 
                        style={{ fontSize: `${fontSize}px` }} 
                        className={`font-bold transition-colors ${
                          idx < 3 ? 'text-[#1D5299] dark:text-[#88B4E8]' : 'text-[#1C1917] dark:text-[#F5F5F4]'
                        }`}
                      >
                        {item.word}
                      </span>
                      <span className="text-[10px] font-sans px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#7A7566] dark:text-[#9A9483]">
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category Distribution Section */}
          <div className="p-4 sm:p-5 rounded-xl border border-[#E5E1D3] dark:border-[#353D35] bg-[#FAF8F5] dark:bg-[#252B25]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#1D5299]" />
                <h4 className="font-serif-guj font-bold text-sm sm:text-base text-[#1C1917] dark:text-white">
                  શ્રેણી મુજબ લેખોનું વર્ગીકરણ (Categories)
                </h4>
              </div>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-[#1D5299] hover:underline font-medium cursor-pointer"
                >
                  બધી શ્રેણી જુઓ
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {stats.sortedCategories.map((cat, idx) => {
                const isSelected = selectedCategory === cat.name;
                return (
                  <div 
                    key={idx}
                    onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
                    className={`p-2 rounded-lg transition cursor-pointer border ${
                      isSelected 
                        ? 'bg-[#1D5299]/15 border-[#1D5299]/40' 
                        : 'hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1 font-serif-guj">
                      <span className="font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#1D5299]" />
                        {cat.name}
                      </span>
                      <span className="text-[#7A7566] dark:text-[#9A9483] font-sans">
                        <strong className="text-[#1C1917] dark:text-white">{cat.count}</strong> લેખ ({cat.percentage}%)
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#1D5299] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, cat.percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Authors & Highlights Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Authors Breakdown */}
            <div className="p-4 sm:p-5 rounded-xl border border-[#E5E1D3] dark:border-[#353D35] bg-[#FAF8F5] dark:bg-[#252B25]">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-[#8C6239]" />
                <h4 className="font-serif-guj font-bold text-sm sm:text-base text-[#1C1917] dark:text-white">
                  લેખક વિગત (Author)
                </h4>
              </div>
              <div className="space-y-2">
                {stats.sortedAuthors.map((author, idx) => (
                  <div 
                    key={idx}
                    className="p-2.5 rounded-lg bg-white dark:bg-[#1E231E] border border-black/5 dark:border-white/5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-6 h-6 rounded-full bg-[#8C6239]/15 text-[#8C6239] dark:text-[#E0B589] flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold font-serif-guj text-[#1C1917] dark:text-[#F5F5F4] truncate">
                        {author.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#8C6239]/10 text-[#8C6239] dark:text-[#E0B589] shrink-0 font-sans">
                      {author.count} લેખ ({author.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reading Insights & Highlights */}
            <div className="p-4 sm:p-5 rounded-xl border border-[#E5E1D3] dark:border-[#353D35] bg-[#FAF8F5] dark:bg-[#252B25] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-[#5B8260]" />
                  <h4 className="font-serif-guj font-bold text-sm sm:text-base text-[#1C1917] dark:text-white">
                    વાચન આંકડા (Reading Highlights)
                  </h4>
                </div>

                <div className="space-y-2.5 text-xs">
                  {stats.longestArticle && (
                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#1E231E] border border-black/5 dark:border-white/5">
                      <div className="text-[11px] text-[#5B8260] dark:text-[#A3D9A5] font-bold uppercase">
                        સૌથી વિસ્તૃત લેખ (Longest Article)
                      </div>
                      <div className="font-serif-guj font-semibold text-[#1C1917] dark:text-white mt-0.5 truncate">
                        {stats.longestArticle.article.title}
                      </div>
                      <div className="text-[11px] text-[#7A7566] dark:text-[#9A9483] mt-0.5">
                        ~{stats.longestArticle.words.toLocaleString('en-IN')} શબ્દો • લેખક: {stats.longestArticle.article.author}
                      </div>
                    </div>
                  )}

                  {stats.shortestArticle && (
                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#1E231E] border border-black/5 dark:border-white/5">
                      <div className="text-[11px] text-[#1D5299] dark:text-[#88B4E8] font-bold uppercase">
                        ઝડપી વાચન લેખ (Quick Read)
                      </div>
                      <div className="font-serif-guj font-semibold text-[#1C1917] dark:text-white mt-0.5 truncate">
                        {stats.shortestArticle.article.title}
                      </div>
                      <div className="text-[11px] text-[#7A7566] dark:text-[#9A9483] mt-0.5">
                        ~{stats.shortestArticle.words.toLocaleString('en-IN')} શબ્દો • લેખક: {stats.shortestArticle.article.author}
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#1E231E] border border-black/5 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[#555044] dark:text-[#B5B0A4] font-serif-guj">
                      સરેરાશ શબ્દો પ્રતિ લેખ:
                    </span>
                    <span className="font-bold text-[#1C1917] dark:text-white font-sans">
                      ~{stats.avgWordsPerArticle.toLocaleString('en-IN')} શબ્દો
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* All Articles Breakdown Table (Replaced Issues Breakdown) */}
          <div className="p-4 sm:p-5 rounded-xl border border-[#E5E1D3] dark:border-[#353D35] bg-[#FAF8F5] dark:bg-[#252B25]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#1D5299]" />
                <h4 className="font-serif-guj font-bold text-sm sm:text-base text-[#1C1917] dark:text-white">
                  તમામ લેખોની યાદી અને વિશ્લેષણ (All Articles Analysis)
                </h4>
              </div>
              <span className="text-xs text-[#7A7566] dark:text-[#9A9483] font-serif-guj">
                કુલ <strong className="text-[#1C1917] dark:text-white">{stats.totalArticles}</strong> લેખો
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-serif-guj">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/10 text-[#7A7566] dark:text-[#9A9483]">
                    <th className="py-2 px-2.5 font-bold w-10 text-center">ક્રમ</th>
                    <th className="py-2 px-2.5 font-bold">લેખનું શીર્ષક</th>
                    <th className="py-2 px-2.5 font-bold">શ્રેણી</th>
                    <th className="py-2 px-2.5 font-bold text-right">શબ્દો</th>
                    <th className="py-2 px-2.5 font-bold text-right">વાચન</th>
                    <th className="py-2 px-2.5 font-bold text-center">વાંચો</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {stats.articlesAnalysis.map((item) => (
                    <tr 
                      key={item.article.id} 
                      onClick={() => {
                        if (onSelectArticle) {
                          onSelectArticle(item.issue, item.article);
                          onClose();
                        }
                      }}
                      className="hover:bg-[#1D5299]/10 dark:hover:bg-[#1D5299]/20 transition cursor-pointer group"
                    >
                      <td className="py-2.5 px-2.5 text-center font-bold text-[#7A7566] dark:text-[#9A9483] font-sans">
                        {item.index}
                      </td>
                      <td className="py-2.5 px-2.5 font-medium text-[#1C1917] dark:text-white group-hover:text-[#1D5299] dark:group-hover:text-[#88B4E8] transition-colors">
                        {item.article.title}
                      </td>
                      <td className="py-2.5 px-2.5 text-[#555044] dark:text-[#B5B0A4]">
                        <span className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[11px]">
                          {item.article.category || 'વિસ્મય'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-sans text-[#7A7566] dark:text-[#9A9483]">
                        ~{item.words.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-sans text-[#7A7566] dark:text-[#9A9483]">
                        ~{item.readingMinutes} મિ.
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <span className="text-[11px] font-semibold text-[#1D5299] dark:text-[#88B4E8] group-hover:underline">
                          વાંચો →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Category Articles List (If filtered) */}
          {selectedCategory && (
            <div className="p-4 rounded-xl border border-[#1D5299]/30 bg-white dark:bg-[#1E231E]">
              <div className="flex items-center justify-between mb-2.5">
                <h5 className="font-serif-guj font-bold text-sm text-[#1D5299] dark:text-[#88B4E8]">
                  "{selectedCategory}" શ્રેણીના લેખો ({filteredArticles.length})
                </h5>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs text-[#7A7566] hover:text-black dark:hover:text-white cursor-pointer"
                >
                  બંધ કરો ✕
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                {filteredArticles.map(({ article, issue }, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (onSelectArticle) {
                        onSelectArticle(issue, article);
                        onClose();
                      }
                    }}
                    className="p-2 rounded-lg bg-[#FAF8F5] dark:bg-[#252B25] hover:bg-[#1D5299]/10 transition flex items-center justify-between cursor-pointer group"
                  >
                    <div className="truncate mr-2 font-serif-guj">
                      <span className="font-semibold group-hover:text-[#1D5299] dark:group-hover:text-[#88B4E8] transition-colors">
                        {article.title}
                      </span>
                      <span className="text-[11px] text-[#7A7566] dark:text-[#9A9483] ml-2">
                        — {article.author}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#1D5299] dark:text-[#88B4E8] group-hover:underline">
                      વાંચો →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-[#E5E1D3] dark:border-[#353D35] bg-[#FAF8F5] dark:bg-[#252B25] flex items-center justify-between">
          <div className="text-xs text-[#7A7566] dark:text-[#9A9483] font-serif-guj">
            કુલ સંગ્રહિત: <strong className="text-[#1C1917] dark:text-white">{stats.totalArticles}</strong> લેખો • લેખક: <strong className="text-[#1C1917] dark:text-white">ધૈવત ત્રિવેદી</strong>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1D5299] text-white text-xs font-semibold hover:bg-[#16417A] transition cursor-pointer shadow-xs"
          >
            સમજી ગયો (બંધ કરો)
          </button>
        </div>

      </div>
    </div>
  );
};


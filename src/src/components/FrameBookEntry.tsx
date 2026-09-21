import React, { useMemo } from 'react';
import { Book, MasterData } from '../types';
import { AlertTriangle, Edit3, MousePointerClick } from 'lucide-react';
import { AutocompleteInput } from './AutocompleteInput';

interface FrameBookEntryProps {
  formData: Book;
  setFormData: React.Dispatch<React.SetStateAction<Book>>;
  masters: MasterData;
  existingBooks: Book[];
  languageMode: 'en' | 'gu' | 'both';
  isEditing: boolean;
  isAdmin?: boolean;
  canEditBookType?: boolean;
  onSelectBook?: (book: Book) => void;
}

export const FrameBookEntry: React.FC<FrameBookEntryProps> = ({
  formData,
  setFormData,
  masters,
  existingBooks,
  languageMode,
  isEditing,
  isAdmin = false,
  canEditBookType = false,
  onSelectBook,
}) => {

  // Smart duplicate and exact word-level matching detection (Only for NEW entries)
  const duplicateAlert = useMemo(() => {
    // If editing or viewing an already saved book, do not show matching word alert
    if (isEditing) return null;
    if (!formData.bookName || formData.bookName.trim().length < 2) return null;
    const query = formData.bookName.trim().toLowerCase();

    // Helper to tokenize text into distinct normalized words
    const extractWords = (text: string) => {
      return text
        .toLowerCase()
        .split(/[\s,–—()\[\]{}:;."'`\/\\!?+*=<>|]+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 2);
    };

    // 1. Check exact match (excluding currently editing book ID)
    const exactMatch = (existingBooks || []).find(
      (b) => b && b.bookId !== formData.bookId && (b.bookName || '').trim().toLowerCase() === query
    );
    if (exactMatch) {
      return {
        type: 'exact' as const,
        matchedWord: formData.bookName.trim(),
        message: `આ આખું નામ ધરાવતું પુસ્તક પહેલેથી જ ડેટાબેઝમાં મોજૂદ છે!`,
        books: [exactMatch],
      };
    }

    // 2. Check exact word-level match (whole word matching only)
    const typedWords = extractWords(formData.bookName);

    if (typedWords.length > 0) {
      const matchedMap = new Map<string, Book[]>();

      for (const b of existingBooks || []) {
        if (!b || b.bookId === formData.bookId || !b.bookName) continue;
        const bWords = extractWords(b.bookName);

        for (const tw of typedWords) {
          if (bWords.includes(tw)) {
            if (!matchedMap.has(tw)) {
              matchedMap.set(tw, []);
            }
            matchedMap.get(tw)!.push(b);
          }
        }
      }

      if (matchedMap.size > 0) {
        const matchedWordsList = Array.from(matchedMap.keys());
        const allMatchedBooks: { word: string; book: Book }[] = [];

        matchedMap.forEach((bList, word) => {
          bList.forEach((b) => {
            if (!allMatchedBooks.some((item) => item.book.bookId === b.bookId)) {
              allMatchedBooks.push({ word, book: b });
            }
          });
        });

        return {
          type: 'word' as const,
          matchedWords: matchedWordsList,
          booksWithWords: allMatchedBooks,
        };
      }
    }

    return null;
  }, [formData.bookName, formData.bookId, existingBooks, isEditing]);

  const handleChange = (field: keyof Book, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    // Ignore Enter key during IME composition (e.g. Gujarati/Indic typing on macOS or Windows)
    if (e.nativeEvent.isComposing) {
      return;
    }
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
        e.preventDefault();
        const container = e.currentTarget;
        const focusables = Array.from(
          container.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
            'input:not([readonly]):not([disabled]), select:not([disabled])'
          )
        );
        const index = focusables.indexOf(target as any);
        if (index >= 0 && index < focusables.length - 1) {
          (focusables[index + 1] as HTMLElement).focus();
        } else {
          const saveBtn = document.getElementById('BTN_Save_Update_Click');
          if (saveBtn) {
            saveBtn.focus();
          }
        }
      }
    }
  };

  return (
    <section
      id="frame-1-book-entry"
      className="bg-slate-800 text-white rounded shadow-lg p-4 border-t-2 border-indigo-500 my-3"
      onKeyDown={handleKeyDown}
    >
      {/* Frame 1 Header */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-2">
        <h2 className="text-xs font-bold text-indigo-300 uppercase flex items-center gap-2">
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
          <span>Book Entry Information</span>
          {isEditing && (
            <span className="text-[10px] text-indigo-300 bg-slate-700 px-1.5 py-0.5 rounded border border-slate-600 normal-case font-normal">
              Editing #{formData.bookId}
            </span>
          )}
        </h2>
      </div>

      {/* Duplicate / Word Match Smart Alert Banner */}
      {duplicateAlert && (
        <div
          id="duplicate-series-alert"
          className={`mb-3 p-3 rounded border flex items-start gap-2.5 text-xs transition-all ${
            duplicateAlert.type === 'exact'
              ? 'bg-rose-950/90 border-rose-700 text-rose-200'
              : 'bg-amber-950/90 border-amber-700 text-amber-200'
          }`}
        >
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-400" />
          <div className="w-full">
            <span className="font-bold uppercase text-[11px] tracking-wider block mb-1">
              {duplicateAlert.type === 'exact'
                ? 'Exact Duplicate Alert (આ આખું નામ પહેલેથી હાજર છે)'
                : `Matching Word Alert (સમાન શબ્દ પકડાયો: "${duplicateAlert.matchedWords?.join(', ')}")`}
            </span>

            {duplicateAlert.type === 'exact' ? (
              <div
                onClick={() => onSelectBook && onSelectBook(duplicateAlert.books[0])}
                className="flex items-center justify-between gap-2 flex-wrap cursor-pointer p-1.5 rounded hover:bg-rose-900/60 transition-colors border border-rose-800/40"
                title="ક્લિક કરીને આ પુસ્તક એડિટ કરવા માટે ફોર્મમાં ભરો"
              >
                <div className="flex items-center gap-2">
                  <Edit3 className="w-3.5 h-3.5 text-rose-300" />
                  <p>
                    આ નામનું પુસ્તક પહેલેથી મોજૂદ છે:{' '}
                    <strong className="text-white underline">
                      #{duplicateAlert.books[0].bookId} - {duplicateAlert.books[0].bookName}
                    </strong>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] bg-rose-900/80 text-rose-300 px-1.5 py-0.5 rounded shrink-0">
                    Author: {duplicateAlert.books[0].author || 'N/A'}
                  </span>
                  <span className="text-[10px] bg-rose-900/80 text-rose-300 px-1.5 py-0.5 rounded shrink-0">
                    User: {duplicateAlert.books[0].createdBy || 'N/A'}
                  </span>
                  <span className="text-[10px] bg-rose-700 text-white font-bold px-2 py-0.5 rounded shrink-0 flex items-center gap-1 shadow-xs">
                    <MousePointerClick className="w-3 h-3" />
                    ક્લિક કરી એડિટ કરો
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-medium">
                    તમે લખેલા શબ્દ <strong>"{duplicateAlert.matchedWords?.join('", "')}"</strong> ધરાવતા નીચે મુજબના <strong>{duplicateAlert.booksWithWords?.length}</strong> પુસ્તક(ો) મળી આવ્યા છે:
                  </p>
                  <span className="text-[10px] text-amber-300 bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700/60 shrink-0">
                    💡 એડિટ કરવા માટે નીચેના પુસ્તક પર ક્લિક કરો
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 bg-black/40 p-1.5 rounded border border-amber-800/50 text-[11px] font-mono">
                  {duplicateAlert.booksWithWords?.map(({ word, book }) => (
                    <div
                      key={book.bookId}
                      onClick={() => onSelectBook && onSelectBook(book)}
                      className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-amber-900/70 hover:border-amber-600 transition-all cursor-pointer border border-transparent border-b-amber-900/30 group"
                      title="ક્લિક કરીને આ પુસ્તકની વિગત ફોર્મમાં લાવો અને સુધારો"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Edit3 className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                        <span className="text-amber-100 truncate group-hover:text-white">
                          <strong className="text-amber-400">#{book.bookId}</strong>: {book.bookName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] bg-amber-900/80 text-amber-300 px-1.5 py-0.5 rounded shrink-0">
                          Author: {book.author || 'N/A'}
                        </span>
                        <span className="text-[10px] bg-amber-900/80 text-amber-300 px-1.5 py-0.5 rounded shrink-0">
                          User: {book.createdBy || 'N/A'}
                        </span>
                        <span className="text-[10px] bg-amber-900/80 text-amber-300 px-1.5 py-0.5 rounded shrink-0">
                          મેચ: {word}
                        </span>
                        <span className="text-[10px] bg-blue-600 group-hover:bg-blue-500 text-white font-bold px-2 py-0.5 rounded shrink-0 flex items-center gap-1 shadow-xs">
                          <MousePointerClick className="w-3 h-3" />
                          Edit
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Fields Grid - Rearranged to User Specified Sequence */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-x-4 gap-y-3">
        
        {/* ROW 1: Book ID & Book Name */}
        {/* Book ID */}
        <div className="sm:col-span-3 lg:col-span-2">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Book ID</label>
          <input
            id="txt_BookID"
            type="text"
            readOnly
            value={formData.bookId}
            className="w-full bg-slate-700 border border-slate-600 px-2 py-1.5 rounded text-sm font-mono text-slate-300 outline-none"
          />
        </div>

        {/* Book Name */}
        <div className="sm:col-span-9 lg:col-span-10">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Book Name / પુસ્તક નામ</label>
          <input
            id="txt_BookName"
            type="text"
            value={formData.bookName}
            onChange={(e) => handleChange('bookName', e.target.value)}
            className={`w-full bg-slate-900 border px-2 py-1.5 rounded text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-medium transition-all ${
              duplicateAlert
                ? duplicateAlert.type === 'exact'
                  ? 'border-rose-500 ring-1 ring-rose-500'
                  : 'border-amber-500 ring-1 ring-amber-500'
                : 'border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }`}
            placeholder=""
            autoFocus
          />
        </div>

        {/* ROW 2: Author, Translator & Publisher */}
        {/* Author */}
        <div className="sm:col-span-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Author / લેખક</label>
          <AutocompleteInput
            id="cmb_Author"
            options={masters.authors}
            value={formData.author}
            onChange={(val) => handleChange('author', val)}
            placeholder=""
          />
        </div>

        {/* Translator */}
        <div className="sm:col-span-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Translator / અનુવાદક</label>
          <AutocompleteInput
            id="cmb_Translator"
            options={masters.translators}
            value={formData.translator}
            onChange={(val) => handleChange('translator', val)}
            placeholder=""
          />
        </div>

        {/* Publisher */}
        <div className="sm:col-span-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Publisher / પ્રકાશક</label>
          <AutocompleteInput
            id="cmb_Publisher"
            options={masters.publishers}
            value={formData.publisher}
            onChange={(val) => handleChange('publisher', val)}
            placeholder=""
          />
        </div>

        {/* ROW 3: Category, Language & Book Type (Open for all) */}
        {/* Category */}
        <div className="sm:col-span-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category / વિભાગ</label>
          <AutocompleteInput
            id="cmb_NovelEtc"
            options={masters.categories}
            value={formData.category}
            onChange={(val) => handleChange('category', val)}
            placeholder=""
          />
        </div>

        {/* Language */}
        <div className="sm:col-span-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Language / ભાષા</label>
          <AutocompleteInput
            id="cmb_Language"
            options={masters.languages}
            value={formData.language}
            onChange={(val) => handleChange('language', val)}
            placeholder=""
          />
        </div>

        {/* Book Type / સ્વરૂપ */}
        <div className="sm:col-span-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Book Type / સ્વરૂપ</label>
          <AutocompleteInput
            id="cmb_BookType"
            options={masters.bookTypes}
            value={formData.bookType}
            onChange={(val) => handleChange('bookType', val)}
            placeholder=""
          />
        </div>

        {/* ROW 4: Edition / Year, ISBN & Rate */}
        {/* Edition / Year */}
        <div className="sm:col-span-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Edition / Year</label>
          <div className="flex gap-1">
            <input
              id="txt_Edition"
              type="text"
              placeholder=""
              value={formData.edition}
              onChange={(e) => handleChange('edition', e.target.value)}
              className="w-1/2 bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <input
              id="txt_YearPublished"
              type="text"
              placeholder=""
              value={formData.yearPublished}
              onChange={(e) => handleChange('yearPublished', e.target.value)}
              className="w-1/2 bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-sm font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* ISBN */}
        <div className="sm:col-span-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">ISBN</label>
          <input
            id="txt_ISBN"
            type="text"
            value={formData.isbn}
            onChange={(e) => handleChange('isbn', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-sm font-mono text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            placeholder=""
          />
        </div>

        {/* Rate (₹) */}
        <div className="sm:col-span-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rate (₹)</label>
          <input
            id="txt_Rate"
            type="text"
            value={formData.rate}
            onChange={(e) => handleChange('rate', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-sm font-mono text-right text-emerald-400 font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            placeholder=""
          />
        </div>

        {/* ROW 5: Remarks & Entry By Operator */}
        <div className="sm:col-span-8">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Remarks / વિશેષ નોંધ</label>
          <input
            id="txt_Remarks1"
            type="text"
            value={formData.remarks1}
            onChange={(e) => handleChange('remarks1', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 px-3 py-1.5 rounded text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            placeholder=""
          />
        </div>

        {/* Entry By / એન્ટ્રી કરનાર */}
        <div className="sm:col-span-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center justify-between">
            <span>Entry By / એન્ટ્રી કરનાર</span>
            <span className="text-[9px] text-slate-500 font-normal font-mono">(Read Only)</span>
          </label>
          <input
            id="txt_CreatedBy"
            type="text"
            disabled
            readOnly
            value={formData.createdBy || ''}
            className="w-full bg-slate-800/90 border border-slate-700 px-2 py-1.5 rounded text-sm text-slate-300 font-semibold focus:outline-none cursor-not-allowed select-none opacity-80"
            placeholder="ઓપરેટરનું નામ"
          />
        </div>

      </div>
    </section>
  );
};

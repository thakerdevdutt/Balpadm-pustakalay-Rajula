import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Book, SearchCriterion } from '../types';
import { Search, Monitor, Apple, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Maximize2, Minimize2, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, ListFilter, Trash2 } from 'lucide-react';

type SortField = 'Book ID' | 'Book Name' | 'Author' | 'Category' | 'Language' | 'Book Type' | 'Entry By';
type SortDirection = 'asc' | 'desc';

interface FrameSearchListProps {
  books: Book[];
  searchCriterion: SearchCriterion;
  setSearchCriterion: (c: SearchCriterion) => void;
  searchValue: string;
  setSearchValue: (v: string) => void;
  onSelectBook: (book: Book, shouldScrollToForm?: boolean) => void;
  onDeleteBook: (bookId: string) => void;
  onQuickIssue: (book: Book) => void;
  onOpenLocalFile?: (book: Book) => void;
  selectedBookId?: string;
  languageMode: 'en' | 'gu' | 'both';
  isAdmin?: boolean;
}

export const FrameSearchList: React.FC<FrameSearchListProps> = ({
  books = [],
  searchCriterion,
  setSearchCriterion,
  searchValue,
  setSearchValue,
  onSelectBook,
  onDeleteBook,
  onQuickIssue,
  onOpenLocalFile,
  selectedBookId,
  languageMode,
  isAdmin = false,
}) => {
  const safeBooks = Array.isArray(books) ? books : [];

  // OS Mode binding simulator (Windows RowSource vs Mac Variant Array)
  const [osMode, setOsMode] = useState<'Windows' | 'Mac'>('Windows');
  const [pageSize, setPageSize] = useState<number | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isExpandedHeight, setIsExpandedHeight] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sorting state - Default is sorted on Book ID
  const [sortField, setSortField] = useState<SortField>('Book ID');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // KeyCode = 13 (Enter) handler on cmb_SearchValue as per specification
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) {
      return;
    }
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      // Shift focus to BTN_Reset as explicitly specified
      const resetBtn = document.getElementById('BTN_Reset');
      if (resetBtn) {
        resetBtn.focus();
      }
    }
  };

  // Filter books dynamically based on cmb_search and cmb_SearchValue
  const filteredBooks = useMemo(() => {
    if (!searchValue.trim()) return safeBooks;
    const query = searchValue.trim().toLowerCase();

    return safeBooks.filter((book) => {
      if (searchCriterion === 'All Fields') {
        return (
          (book.bookId && book.bookId.toLowerCase().includes(query)) ||
          (book.bookName && book.bookName.toLowerCase().includes(query)) ||
          (book.author && book.author.toLowerCase().includes(query)) ||
          (book.category && book.category.toLowerCase().includes(query)) ||
          (book.publisher && book.publisher.toLowerCase().includes(query)) ||
          (book.language && book.language.toLowerCase().includes(query)) ||
          (book.bookType && book.bookType.toLowerCase().includes(query)) ||
          (book.remarks1 && book.remarks1.toLowerCase().includes(query)) ||
          (book.createdBy && book.createdBy.toLowerCase().includes(query))
        );
      }

      let fieldValue = '';
      switch (searchCriterion) {
        case 'Book ID':
          fieldValue = book.bookId;
          break;
        case 'Book Name':
          fieldValue = book.bookName;
          break;
        case 'Author':
          fieldValue = book.author;
          break;
        case 'Publisher':
          fieldValue = book.publisher;
          break;
        case 'Category':
          fieldValue = book.category;
          break;
        case 'Language':
          fieldValue = book.language;
          break;
        case 'Book Type':
          fieldValue = book.bookType || '';
          break;
        case 'Entry By':
          fieldValue = book.createdBy || '';
          break;
        default:
          fieldValue = book.bookName;
      }
      return (fieldValue || '').toLowerCase().includes(query);
    });
  }, [safeBooks, searchCriterion, searchValue]);

  // Sort books dynamically
  const sortedBooks = useMemo(() => {
    const list = [...filteredBooks];
    list.sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'Book ID') {
        const numA = parseInt(a.bookId || '0', 10);
        const numB = parseInt(b.bookId || '0', 10);
        if (!isNaN(numA) && !isNaN(numB) && numA > 0 && numB > 0) {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }
        valA = a.bookId || '';
        valB = b.bookId || '';
      } else if (sortField === 'Book Name') {
        valA = a.bookName || '';
        valB = b.bookName || '';
      } else if (sortField === 'Author') {
        valA = a.author || '';
        valB = b.author || '';
      } else if (sortField === 'Category') {
        valA = a.category || '';
        valB = b.category || '';
      } else if (sortField === 'Language') {
        valA = a.language || '';
        valB = b.language || '';
      } else if (sortField === 'Book Type') {
        valA = a.bookType || '';
        valB = b.bookType || '';
      } else if (sortField === 'Entry By') {
        valA = (a.createdBy && a.createdBy.toLowerCase() !== 'admin') ? a.createdBy : 'Devdutt Thaker';
        valB = (b.createdBy && b.createdBy.toLowerCase() !== 'admin') ? b.createdBy : 'Devdutt Thaker';
      }

      const comp = valA.localeCompare(valB, 'gu', { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? comp : -comp;
    });
    return list;
  }, [filteredBooks, sortField, sortDirection]);

  // Reset page to 1 when search query, criterion or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, searchCriterion, pageSize, sortField, sortDirection]);

  const totalRecords = sortedBooks.length;
  const effectivePageSize = pageSize === 'ALL' ? (totalRecords || 1) : pageSize;
  const totalPages = Math.ceil(totalRecords / effectivePageSize) || 1;

  const paginatedBooks = useMemo(() => {
    if (pageSize === 'ALL') return sortedBooks;
    const startIdx = (currentPage - 1) * effectivePageSize;
    return sortedBooks.slice(startIdx, startIdx + effectivePageSize);
  }, [sortedBooks, currentPage, effectivePageSize, pageSize]);

  const startRecordNum = totalRecords === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1;
  const endRecordNum = pageSize === 'ALL' ? totalRecords : Math.min(currentPage * effectivePageSize, totalRecords);

  // Column header click helper
  const handleColumnHeaderClick = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Generate dynamic search suggestions dropdown
  const searchSuggestions = useMemo(() => {
    if (!searchValue) return [];
    const setVals = new Set<string>();
    safeBooks.forEach((b) => {
      let val = '';
      if (searchCriterion === 'Author') val = b.author;
      else if (searchCriterion === 'Publisher') val = b.publisher;
      else if (searchCriterion === 'Category') val = b.category;
      else if (searchCriterion === 'Language') val = b.language;
      else if (searchCriterion === 'Book Type') val = b.bookType || '';
      else if (searchCriterion === 'Entry By') val = (b.createdBy && b.createdBy.toLowerCase() !== 'admin') ? b.createdBy : 'Devdutt Thaker';
      else val = b.bookName;

      if (val && val.toLowerCase().includes(searchValue.toLowerCase())) {
        setVals.add(val);
      }
    });
    return Array.from(setVals).slice(0, 10);
  }, [safeBooks, searchCriterion, searchValue]);

  return (
    <section
      id="frame-2-search-list"
      className="bg-slate-800 text-white rounded shadow-lg flex flex-col overflow-hidden my-3 border-t-2 border-indigo-500"
    >
      {/* Frame 2 Header & Criteria Bar */}
      <div className="p-3 border-b border-slate-700 flex items-center justify-between gap-4 flex-wrap bg-slate-800">
        <h2 className="text-xs font-bold text-indigo-300 uppercase flex items-center gap-2">
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
          <span>Search & List Window</span>
        </h2>

        <div className="flex items-center gap-2 flex-1 max-w-2xl flex-wrap sm:flex-nowrap">
          <select
            id="cmb_search"
            value={searchCriterion}
            onChange={(e) => setSearchCriterion(e.target.value as SearchCriterion)}
            className="bg-slate-900 border border-slate-700 px-2.5 py-1 rounded text-xs font-medium text-slate-100 outline-none focus:border-indigo-500 shrink-0 cursor-pointer"
          >
            <option value="All Fields">All Fields (બધાજ ફીલ્ડ્સ)</option>
            <option value="Book Name">Book Name (પુસ્તકનું નામ)</option>
            <option value="Book ID">Book ID (આઈડી)</option>
            <option value="Author">Author (લેખક)</option>
            <option value="Publisher">Publisher (પ્રકાશક)</option>
            <option value="Category">Category (વિભાગ/પ્રકાર)</option>
            <option value="Language">Language (ભાષા)</option>
            <option value="Book Type">Book Type (પુસ્તક પ્રકાર / સ્વરૂપ)</option>
            <option value="Entry By">Entry By (એન્ટ્રી કરનાર)</option>
          </select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              id="cmb_SearchValue"
              ref={searchInputRef}
              type="text"
              list="search-suggestions"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-slate-900 border border-slate-700 pl-8 pr-7 py-1 rounded text-xs outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500"
              placeholder={`Search records by ${searchCriterion}...`}
            />
            {searchValue && (
              <button
                onClick={() => setSearchValue('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
                title="Clear Search"
              >
                ✕
              </button>
            )}
            <datalist id="search-suggestions">
              {searchSuggestions.map((s, idx) => (
                <option key={idx} value={s} />
              ))}
            </datalist>
          </div>

          <span id="lbl_TotalBooks" className="text-[10px] font-bold text-indigo-300 px-3 py-1 bg-slate-900 rounded-full border border-slate-700 uppercase shrink-0">
            TOTAL BOOKS: {filteredBooks.length}
          </span>
        </div>
      </div>

      {/* View Height, Sort Controls & Pagination Bar */}
      <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-700 text-[10px] text-slate-400 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-indigo-300 uppercase flex items-center gap-1">
              <ListFilter className="w-3 h-3 text-indigo-400" />
              <span>Rows Per View (જોવા માટે):</span>
            </span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="bg-slate-800 border border-indigo-500/50 rounded px-2 py-0.5 text-[10px] font-bold text-indigo-200 outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value="15">15 Rows (૧૫ પુસ્તકો)</option>
              <option value="25">25 Rows</option>
              <option value="50">50 Rows</option>
              <option value="100">100 Rows</option>
              <option value="ALL">All ({totalRecords} Records - No Limit)</option>
            </select>
          </div>

          <div className="h-3 w-[1px] bg-slate-700 hidden sm:block"></div>

          {/* Sort Controls */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-indigo-300 uppercase flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-indigo-400" />
              <span>Sort By (ગોઠવવું):</span>
            </span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-slate-800 border border-indigo-500/50 rounded px-2 py-0.5 text-[10px] font-bold text-indigo-200 outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value="Book ID">Book ID (ડિફૉલ્ટ - આઈડી)</option>
              <option value="Book Name">Book Name (પુસ્તકનું નામ)</option>
              <option value="Author">Author (લેખક)</option>
              <option value="Category">Category (પ્રકાર)</option>
              <option value="Language">Language (ભાષા)</option>
              {isAdmin && <option value="Book Type">Book Type (પુસ્તક પ્રકાર)</option>}
              <option value="Entry By">Entry By (એન્ટ્રી કરનાર)</option>
            </select>

            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded text-[10px] transition-colors cursor-pointer"
              title={`Switch order (${sortDirection === 'asc' ? 'Ascending A-Z' : 'Descending Z-A'})`}
            >
              {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />}
              <span>{sortDirection.toUpperCase()}</span>
            </button>

            {sortField !== 'Book ID' && (
              <button
                onClick={() => {
                  setSortField('Book ID');
                  setSortDirection('asc');
                }}
                className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded text-[10px] transition-colors cursor-pointer"
                title="Reset order to default Book ID"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Reset (Book ID)</span>
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsExpandedHeight(!isExpandedHeight)}
          className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 font-bold rounded text-[10px] transition-colors cursor-pointer"
          title={isExpandedHeight ? "Compact view" : "Expand full table view"}
        >
          {isExpandedHeight ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          <span>{isExpandedHeight ? 'Compact Height' : 'Expand Height'}</span>
        </button>
      </div>

      {/* ListBox Data Table */}
      <div 
        id="ListBox1-container" 
        className={`flex-1 overflow-y-auto overflow-x-hidden border-t border-slate-700 transition-all ${
          isExpandedHeight ? 'max-h-[600px] min-h-[350px]' : 'max-h-[460px] min-h-[300px]'
        }`}
      >
        <table id="ListBox1" className="w-full text-left border-collapse table-fixed">
          <thead className="sticky top-0 bg-slate-900 text-slate-300 uppercase text-xs font-semibold tracking-tight border-b border-slate-700 z-10 select-none">
            <tr>
              <th
                onClick={() => handleColumnHeaderClick('Book ID')}
                className={`px-2 py-2 border-r border-slate-700 ${isAdmin ? 'w-[7%]' : 'w-[8%]'} text-center cursor-pointer hover:bg-slate-800 transition-colors ${sortField === 'Book ID' ? 'text-indigo-300 bg-slate-800/80 font-bold' : ''}`}
                title="Click to sort by Book ID"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>BOOK ID</span>
                  {sortField === 'Book ID' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400 shrink-0" /> : <ArrowDown className="w-3 h-3 text-indigo-400 shrink-0" />)}
                </div>
              </th>

              <th
                onClick={() => handleColumnHeaderClick('Book Name')}
                className={`px-2.5 py-2 border-r border-slate-700 ${isAdmin ? 'w-[27%]' : 'w-[29%]'} cursor-pointer hover:bg-slate-800 transition-colors ${sortField === 'Book Name' ? 'text-indigo-300 bg-slate-800/80 font-bold' : ''}`}
                title="Click to sort by Book Name"
              >
                <div className="flex items-center justify-between gap-1">
                  <span>BOOK NAME (પુસ્તકનું નામ)</span>
                  {sortField === 'Book Name' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400 shrink-0" /> : <ArrowDown className="w-3 h-3 text-indigo-400 shrink-0" />)}
                </div>
              </th>

              <th
                onClick={() => handleColumnHeaderClick('Author')}
                className={`px-2.5 py-2 border-r border-slate-700 ${isAdmin ? 'w-[18%]' : 'w-[19%]'} cursor-pointer hover:bg-slate-800 transition-colors ${sortField === 'Author' ? 'text-indigo-300 bg-slate-800/80 font-bold' : ''}`}
                title="Click to sort by Author"
              >
                <div className="flex items-center justify-between gap-1">
                  <span>AUTHOR (લેખક)</span>
                  {sortField === 'Author' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400 shrink-0" /> : <ArrowDown className="w-3 h-3 text-indigo-400 shrink-0" />)}
                </div>
              </th>

              <th
                onClick={() => handleColumnHeaderClick('Category')}
                className={`px-2.5 py-2 border-r border-slate-700 ${isAdmin ? 'w-[14%]' : 'w-[15%]'} cursor-pointer hover:bg-slate-800 transition-colors ${sortField === 'Category' ? 'text-indigo-300 bg-slate-800/80 font-bold' : ''}`}
                title="Click to sort by Category"
              >
                <div className="flex items-center justify-between gap-1">
                  <span>CATEGORY (પ્રકાર)</span>
                  {sortField === 'Category' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400 shrink-0" /> : <ArrowDown className="w-3 h-3 text-indigo-400 shrink-0" />)}
                </div>
              </th>

              <th
                onClick={() => handleColumnHeaderClick('Language')}
                className={`px-2 py-2 border-r border-slate-700 w-[8%] cursor-pointer hover:bg-slate-800 transition-colors ${sortField === 'Language' ? 'text-indigo-300 bg-slate-800/80 font-bold' : ''}`}
                title="Click to sort by Language"
              >
                <div className="flex items-center justify-between gap-1">
                  <span>LANGUAGE</span>
                  {sortField === 'Language' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400 shrink-0" /> : <ArrowDown className="w-3 h-3 text-indigo-400 shrink-0" />)}
                </div>
              </th>

              <th
                onClick={() => handleColumnHeaderClick('Book Type')}
                className={`px-2 py-2 border-r border-slate-700 w-[11%] text-center cursor-pointer hover:bg-slate-800 transition-colors ${sortField === 'Book Type' ? 'text-indigo-300 bg-slate-800/80 font-bold' : ''}`}
                title="Click to sort by Book Type"
              >
                <div className="flex items-center justify-center gap-0.5">
                  <span>TYPE</span>
                  {sortField === 'Book Type' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400 shrink-0" /> : <ArrowDown className="w-3 h-3 text-indigo-400 shrink-0" />)}
                </div>
              </th>

              <th
                onClick={() => handleColumnHeaderClick('Entry By')}
                className={`px-2 py-2 ${isAdmin ? 'w-[10%] border-r border-slate-700' : 'w-[10%]'} text-slate-300 cursor-pointer hover:bg-slate-800 transition-colors ${sortField === 'Entry By' ? 'text-indigo-300 bg-slate-800/80 font-bold' : ''}`}
                title="Click to sort by Entry By"
              >
                <div className="flex items-center justify-between gap-1">
                  <span>ENTRY BY (એન્ટ્રી કરનાર)</span>
                  {sortField === 'Entry By' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400 shrink-0" /> : <ArrowDown className="w-3 h-3 text-indigo-400 shrink-0" />)}
                </div>
              </th>

              {isAdmin && (
                <th
                  className="px-2 py-2 w-[5%] text-center text-slate-300 font-semibold"
                  title="Delete Book Record (Admin Only)"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>DEL</span>
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="text-sm">
            {books.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 6} className="px-4 py-12 text-center text-slate-300 font-sans bg-slate-900 space-y-2">
                  <div className="text-base font-bold text-slate-100">હાલમાં કોઈ પુસ્તક ડેટા નથી (0 Books)</div>
                  <div className="text-xs text-slate-400 max-w-md mx-auto">
                    તમારો પોતાનો સાચો Excel ડેટા લોડ કરવા માટે ઉપરના હેડરમાં આવેલા 
                    <span className="font-bold text-indigo-400 mx-1">"IMPORT .XLSX"</span> અથવા 
                    <span className="font-bold text-emerald-400 mx-1">"GOOGLE SHEET SYNC"</span> બટન પર ક્લિક કરો.
                  </div>
                </td>
              </tr>
            ) : paginatedBooks.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 6} className="px-4 py-8 text-center text-slate-400 italic font-sans bg-slate-900">
                  કોઈ પુસ્તક મળ્યું નથી matching "{searchValue}". (શોધ સાફ કરવા ✕ બટન પર ક્લિક કરો)
                </td>
              </tr>
            ) : (
              paginatedBooks.map((book) => {
                const isSelected = book.bookId === selectedBookId;
                return (
                  <tr
                    key={book.bookId}
                    onClick={() => onSelectBook(book, false)}
                    onDoubleClick={() => onSelectBook(book, true)}
                    title="સિંગલ-ક્લિક: પસંદ કરો | ડબલ-ક્લિક: ફોર્મમાં એડિટ કરો + PC પાથ Auto-Copy કરો"
                    className={`listbox-data-row cursor-pointer border-b transition-colors ${
                      isSelected
                        ? 'is-selected bg-indigo-600 text-white border-b border-indigo-700 font-sans font-semibold'
                        : 'border-slate-700/40'
                    }`}
                  >
                    <td className={`px-2 py-2 font-mono text-center truncate text-[13px] ${isSelected ? 'text-white' : 'font-semibold'}`}>
                      {book.bookId}
                    </td>
                    <td className="px-2.5 py-2 font-sans font-semibold text-[14.5px] leading-snug tracking-wide truncate">
                      {book.bookName}
                    </td>
                    <td className="px-2.5 py-2 font-sans text-[14px] leading-snug truncate">
                      {book.author}
                    </td>
                    <td className="px-2.5 py-2 font-sans text-[13.5px] leading-snug truncate">
                      {book.category}
                    </td>
                    <td className="px-2 py-2 font-sans text-[13.5px] leading-snug truncate">
                      {book.language}
                    </td>
                    <td className="px-2 py-2 font-sans text-center text-xs truncate">
                      {book.bookType || 'Digital PDF'}
                    </td>
                    <td className={`px-2 py-2 font-sans text-xs truncate ${isSelected ? 'text-white' : 'opacity-90'}`}>
                      {(book.createdBy && book.createdBy.toLowerCase() !== 'admin') ? book.createdBy : 'Devdutt Thaker'}
                    </td>
                    {isAdmin && (
                      <td
                        className="px-1 py-1.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteBook(book.bookId);
                          }}
                          className={`p-1 rounded ${
                            isSelected
                              ? 'bg-indigo-800/80 hover:bg-slate-900 text-slate-200 hover:text-white border border-indigo-400/50'
                              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600'
                          } transition-all inline-flex items-center justify-center cursor-pointer shadow-sm`}
                          title={`પુસ્તક #${book.bookId} (${book.bookName}) Delete કરો`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Controls */}
      <div className="bg-slate-900 px-3 py-1.5 border-t border-slate-700 flex items-center justify-between text-[11px] font-sans flex-wrap gap-2 text-slate-400">
        <div className="font-semibold text-slate-300 flex items-center gap-2">
          <span>Showing records <strong className="text-indigo-400 font-mono">{startRecordNum}</strong> to <strong className="text-indigo-400 font-mono">{endRecordNum}</strong> of <strong className="text-indigo-400 font-mono">{totalRecords}</strong> total</span>
          {pageSize === 'ALL' && (
            <span className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider border border-emerald-800">
              100% Full Catalog Displayed
            </span>
          )}
        </div>

        {pageSize !== 'ALL' && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            
            <span className="px-2.5 py-0.5 font-bold font-mono text-slate-200 bg-slate-800 border border-slate-700 rounded text-[11px]">
              Page {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

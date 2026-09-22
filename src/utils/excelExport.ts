import * as XLSX from 'xlsx';
import { Book, BorrowerRecord } from '../types';

/**
 * Clean cell string: removes UTF-8 BOM, trims whitespace, handles null/undefined
 */
export function cleanCellString(str: any): string {
  if (str === null || str === undefined) return '';
  let s = String(str);
  // Remove UTF-8 BOM if present
  s = s.replace(/^[\uFEFF\uFFFE]+/, '').replace(/^ï»¿/, '');
  return s.trim();
}

/**
 * Cleans the book title by removing leading sequence numbers or numbering prefixes,
 * such as "98 - સફર" -> "સફર", "99 - સ્મરણ રેખા" -> "સ્મરણ રેખા", "100. પૃથ્વી વલ્લભ" -> "પૃથ્વી વલ્લભ",
 * while strictly preserving all actual book name characters (including any numbers that might belong to the title like ભાગ ૧).
 */
export function cleanBookTitle(name: string): string {
  if (!name) return '';
  let cleaned = fixGarbledText(name).trim();

  // Strip leading English or Gujarati digits followed by delimiter (dash, dot, colon, slash, space)
  // e.g., "98 - ", "98-", "98. ", "98: ", "૧૦૦ - "
  cleaned = cleaned.replace(/^[0-9\u0AE6-\u0AEF]+(?:\s*[-–—.:/)]+\s*|\s+)/, '');

  return cleaned.trim();
}

/**
 * Fixes garbled text caused by UTF-8 bytes being interpreted as Latin1/CP1252 (Mojibake).
 * If the string already contains valid Gujarati characters (U+0A80 to U+0AFF), it is returned untouched.
 */
export function fixGarbledText(str: string): string {
  if (!str) return str;
  str = cleanCellString(str);
  
  // If string already contains proper Gujarati characters (U+0A80 to U+0AFF), return as is
  if (/[\u0A80-\u0AFF]/.test(str)) {
    return str;
  }

  // Check if it contains typical UTF-8 -> Latin1 mojibake signatures
  if (/à[ª«µ®¯°±²³´µ¶·¸¹º»¼½¾¿]/.test(str) || /àª|à«|Ã|Â|ï»¿/.test(str)) {
    try {
      const bytes = new Uint8Array(str.length);
      let isValidBytes = true;
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code > 255) {
          isValidBytes = false;
          break;
        }
        bytes[i] = code;
      }
      if (isValidBytes) {
        const decoded = new TextDecoder('utf-8').decode(bytes);
        if (/[\u0A80-\u0AFF]/.test(decoded) || !decoded.includes('\uFFFD')) {
          return decoded;
        }
      }
    } catch (e) {
      // fallback
    }

    try {
      const decoded = decodeURIComponent(escape(str));
      if (decoded && !decoded.includes('%')) return decoded;
    } catch (e) {
      // fallback
    }
  }

  return str;
}

export function exportDatabaseToExcel(
  books: Book[] = [],
  borrowers: BorrowerRecord[] = [],
  isAdminOrFileName: boolean | string = true,
  optionalFileName: string = 'Database.xlsx'
) {
  const isAdmin = typeof isAdminOrFileName === 'boolean' ? isAdminOrFileName : true;
  const fileName = typeof isAdminOrFileName === 'string' ? isAdminOrFileName : optionalFileName;
  const safeBooks = Array.isArray(books) ? books : [];
  const safeBorrowers = Array.isArray(borrowers) ? borrowers : [];

  // Sheet 1: Database (Books)
  const bookHeaders = [
    'Book ID',
    'Book Name',
    'Author',
    'Category',
    'Edition',
    'Year Published',
    'Translator',
    'Language',
    'ISBN',
    'Publisher',
    'Book Type',
    'Rate (INR)',
    'Remarks',
  ];

  const bookRows = safeBooks.map((b) => [
    b.bookId,
    b.bookName,
    b.author,
    b.category,
    b.edition,
    b.yearPublished,
    b.translator,
    b.language,
    b.isbn,
    b.publisher,
    b.bookType || '',
    b.rate,
    b.remarks1,
  ]);

  const wsBooks = XLSX.utils.aoa_to_sheet([bookHeaders, ...bookRows]);

  // Set column widths
  wsBooks['!cols'] = [
    { wch: 10 },
    { wch: 38 },
    { wch: 28 },
    { wch: 22 },
    { wch: 12 },
    { wch: 14 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
    { wch: 20 },
    { wch: 12 },
    { wch: 30 },
  ];

  // Sheet 2: Borrowers
  const borrowerHeaders = [
    'Issue ID',
    'Book ID',
    'Book Name',
    'Borrower Name',
    'Address',
    'Mobile',
    'Issue Date',
    'Due Date',
    'Status',
    'Return Date',
    'Remark',
  ];

  const borrowerRows = safeBorrowers.map((b) => [
    b.issueId,
    b.bookId,
    b.bookName,
    b.borrowerName,
    b.address,
    b.mobile,
    b.issueDate,
    b.dueDate,
    b.status,
    b.returnDate || '',
    b.remark,
  ]);

  const wsBorrowers = XLSX.utils.aoa_to_sheet([borrowerHeaders, ...borrowerRows]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsBooks, 'Database');
  XLSX.utils.book_append_sheet(wb, wsBorrowers, 'Borrowers');

  XLSX.writeFile(wb, fileName);
}

/**
 * Common workbook parser that handles all rows without truncation and sanitizes text encoding
 */
export function parseWorkbook(workbook: XLSX.WorkBook): { books: Book[]; borrowers: BorrowerRecord[] } {
  const importedBooks: Book[] = [];
  const importedBorrowers: BorrowerRecord[] = [];

  // Find sheet: 'Database', 'Books', or first sheet with rows
  let dbSheet: XLSX.WorkSheet | null = null;
  if (workbook.Sheets['Database']) {
    dbSheet = workbook.Sheets['Database'];
  } else if (workbook.Sheets['Books']) {
    dbSheet = workbook.Sheets['Books'];
  } else {
    for (const name of workbook.SheetNames) {
      if (workbook.Sheets[name]) {
        dbSheet = workbook.Sheets[name];
        break;
      }
    }
  }

  if (dbSheet) {
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(dbSheet, { header: 1, defval: '' });
    if (rawRows.length > 0) {
      // Find header row in first 15 rows
      let headerRowIdx = -1;
      const headerKeywords = [
        'book', 'title', 'author', 'category', 'નામ', 'પુસ્તક', 'લેખક', 'વિભાગ',
        'id', 'કોડ', 'વર્ષ', 'પ્રકાર', 'સાહિત્ય', 'પ્રકાશન', 'publisher', 'sr', 'ક્રમ', 'અનુ'
      ];
      
      for (let r = 0; r < Math.min(15, rawRows.length); r++) {
        const rowStr = (rawRows[r] || []).map(cell => cleanCellString(cell).toLowerCase()).join(' ');
        if (headerKeywords.some(kw => rowStr.includes(kw))) {
          headerRowIdx = r;
          break;
        }
      }

      if (headerRowIdx === -1) {
        headerRowIdx = 0;
      }

      const rawHeaderRow = (rawRows[headerRowIdx] || []).map((h) => cleanCellString(h).toLowerCase());

      // Helper to match column index by keywords
      const findColIdx = (keywords: string[]): number => {
        // 1. Exact match first
        for (let idx = 0; idx < rawHeaderRow.length; idx++) {
          const h = rawHeaderRow[idx];
          if (keywords.some(k => h === k.toLowerCase())) {
            return idx;
          }
        }
        // 2. Substring match
        const sortedKw = [...keywords].sort((a, b) => b.length - a.length);
        for (let idx = 0; idx < rawHeaderRow.length; idx++) {
          const h = rawHeaderRow[idx];
          if (sortedKw.some(k => h.includes(k.toLowerCase()))) {
            return idx;
          }
        }
        return -1;
      };

      // 1. Check ID Column explicitly
      const idKeywords = ['book id', 'book_id', 'bookid', 'id', 'કોડ', 'આઈડી', 'code', 'sr no', 'sr. no', 'sr_no', 'sr', 'નંબર', 'ક્રમાંક', 'અનુક્રમ', 'અનુ.', 'no.', 'no'];
      let idxId = findColIdx(idKeywords);

      // 2. Check Book Name Column explicitly
      const nameKeywords = ['book name', 'book_name', 'booktitle', 'book title', 'title', 'પુસ્તકનું નામ', 'પુસ્તકનામ', 'પુસ્તક નામ', 'ગ્રંથનું નામ', 'નામ', 'પુસ્તક', 'ગ્રંથ', 'book', 'name'];
      let idxName = findColIdx(nameKeywords);

      // 3. Check Author Column explicitly
      const authorKeywords = ['author', 'writer', 'લેખકનું નામ', 'લેખક', 'કર્તા', 'સર્જક', 'લેખકો', 'લેખક/અનુવાદક'];
      let idxAuthor = findColIdx(authorKeywords);

      // 4. Check Category Column
      const categoryKeywords = ['category', 'novel / poem etc', 'novel', 'poem', 'શ્રેણી', 'પ્રકાર', 'વિભાગ', 'સાહિત્ય પ્રકાર', 'વિષય', 'subject', 'પ્રકાર/વિષય', 'વિભાગ/પ્રકાર'];
      let idxCategory = findColIdx(categoryKeywords);

      // 5. Check Language Column
      const langKeywords = ['language', 'lang', 'ભાષા'];
      let idxLang = findColIdx(langKeywords);

      // 6. Check Publisher Column
      const publisherKeywords = ['publisher', 'પ્રકાશન', 'પ્રકાશક', 'પબ્લિશર', 'પબ્લિકેશન', 'પબ્લિશર્સ'];
      let idxPublisher = findColIdx(publisherKeywords);

      // 7. Check Edition Column
      const editionKeywords = ['edition', 'આવૃત્તિ', 'એડિશન'];
      let idxEdition = findColIdx(editionKeywords);

      // 8. Check Year Column
      const yearKeywords = ['year', 'વર્ષ', 'પ્રકાશન વર્ષ', 'pub year', 'સાલ'];
      let idxYear = findColIdx(yearKeywords);

      // 9. Check Translator Column
      const translatorKeywords = ['translator', 'અનુવાદક', 'અનુવાદ'];
      let idxTranslator = findColIdx(translatorKeywords);

      // 10. Check ISBN Column
      const isbnKeywords = ['isbn', 'આઇએસબીએન'];
      let idxIsbn = findColIdx(isbnKeywords);

      // 11. Check Book Type Column
      const typeKeywords = ['book type', 'format', 'type', 'પુસ્તક પ્રકાર', 'મીડિયમ', 'સ્વરૂપ', 'ફોર્મેટ'];
      let idxType = findColIdx(typeKeywords);

      // 12. Check Rate Column
      const rateKeywords = ['rate', 'price', 'ભાવ', 'કિંમત', 'રૂપિયા', 'rs', 'inr', 'મૂલ્ય'];
      let idxRate = findColIdx(rateKeywords);

      // 13. Check Remarks Column
      const remarkKeywords = ['remark', 'remarks', 'નોંધ', 'વિશેષ નોંધ', 'વિશેષ', 'comment', 'comments', 'રીમાર્ક'];
      let idxRemarks = findColIdx(remarkKeywords);

      // Fallback heuristics if column detection failed or was ambiguous:
      if (idxName === -1) {
        if (idxId !== -1 && idxId !== 0) {
          idxName = 0;
        } else if (idxId === 0) {
          idxName = 1;
        } else {
          idxName = 0;
        }
      }

      if (idxAuthor === -1) {
        if (idxName === 0) idxAuthor = 1;
        else if (idxName === 1) idxAuthor = 2;
      }

      if (idxCategory === -1) {
        if (idxAuthor === 1 && idxName === 0) idxCategory = 2;
        else if (idxAuthor === 2 && idxName === 1) idxCategory = 3;
      }

      let autoId = 1001;

      for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
        const row = rawRows[i] as any[];
        if (!row || row.length === 0) continue;

        const hasAnyContent = row.some(cell => cleanCellString(cell) !== '');
        if (!hasAnyContent) continue;

        const valIdRaw = idxId !== -1 && row[idxId] !== undefined ? cleanCellString(row[idxId]) : '';
        const valNameRaw = idxName !== -1 && row[idxName] !== undefined ? cleanCellString(row[idxName]) : '';

        if (!valNameRaw && !valIdRaw) continue;

        const bId = valIdRaw ? fixGarbledText(valIdRaw) : String(autoId);
        const bTitle = valNameRaw ? cleanBookTitle(valNameRaw) : `Book #${bId}`;

        autoId++;

        importedBooks.push({
          bookId: bId,
          bookName: bTitle,
          author: idxAuthor !== -1 && row[idxAuthor] !== undefined ? fixGarbledText(cleanCellString(row[idxAuthor])) : '',
          category: idxCategory !== -1 && row[idxCategory] !== undefined ? fixGarbledText(cleanCellString(row[idxCategory])) : 'સાહિત્ય / General',
          edition: idxEdition !== -1 && row[idxEdition] !== undefined ? fixGarbledText(cleanCellString(row[idxEdition])) : '1st Edition',
          yearPublished: idxYear !== -1 && row[idxYear] !== undefined ? fixGarbledText(cleanCellString(row[idxYear])) : new Date().getFullYear().toString(),
          translator: idxTranslator !== -1 && row[idxTranslator] !== undefined ? fixGarbledText(cleanCellString(row[idxTranslator])) : '',
          language: idxLang !== -1 && row[idxLang] !== undefined ? fixGarbledText(cleanCellString(row[idxLang])) : 'Gujarati (ગુજરાતી)',
          isbn: idxIsbn !== -1 && row[idxIsbn] !== undefined ? fixGarbledText(cleanCellString(row[idxIsbn])) : '',
          publisher: idxPublisher !== -1 && row[idxPublisher] !== undefined ? fixGarbledText(cleanCellString(row[idxPublisher])) : '',
          bookType: idxType !== -1 && row[idxType] !== undefined ? fixGarbledText(cleanCellString(row[idxType])) : 'Physical Paperback (પેપરબેક)',
          rate: idxRate !== -1 && row[idxRate] !== undefined ? Number(cleanCellString(row[idxRate])) || 0 : 0,
          remarks1: idxRemarks !== -1 && row[idxRemarks] !== undefined ? fixGarbledText(cleanCellString(row[idxRemarks])) : '',
        });
      }
    }
  }

  // Check Borrower sheet
  const borrowerSheet = workbook.Sheets['Borrowers'] || workbook.Sheets['બોરોવર'];
  if (borrowerSheet) {
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(borrowerSheet, { header: 1, defval: '' });
    if (rawRows.length > 1) {
      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i] as any[];
        if (!row || !row[0]) continue;
        importedBorrowers.push({
          issueId: fixGarbledText(cleanCellString(row[0])),
          bookId: fixGarbledText(cleanCellString(row[1])),
          bookName: fixGarbledText(cleanCellString(row[2])),
          borrowerName: fixGarbledText(cleanCellString(row[3])),
          address: fixGarbledText(cleanCellString(row[4])),
          mobile: fixGarbledText(cleanCellString(row[5])),
          issueDate: fixGarbledText(cleanCellString(row[6])),
          dueDate: fixGarbledText(cleanCellString(row[7])),
          status: (cleanCellString(row[8]) as any) || 'Issued',
          returnDate: fixGarbledText(cleanCellString(row[9])),
          remark: fixGarbledText(cleanCellString(row[10])),
        });
      }
    }
  }

  return { books: importedBooks, borrowers: importedBorrowers };
}

export function parseExcelFile(file: File): Promise<{ books: Book[]; borrowers: BorrowerRecord[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const parsed = parseWorkbook(workbook);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export async function parseGoogleSheetUrl(url: string): Promise<{ books: Book[]; borrowers: BorrowerRecord[] }> {
  let rawInput = url.trim();

  // Extract sheetId and gid if present
  const docMatch = rawInput.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = rawInput.match(/[#&?]gid=([0-9]+)/);
  const sheetId = docMatch ? docMatch[1] : null;
  const gid = gidMatch ? gidMatch[1] : '0';

  const isPubLink = rawInput.includes('/pub') || rawInput.includes('/e/2PACX');

  const urlsToTry: string[] = [];

  if (sheetId && !isPubLink) {
    urlsToTry.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
    urlsToTry.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`);
    urlsToTry.push(`https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv&gid=${gid}`);
  } else if (isPubLink) {
    let formattedPub = rawInput.replace(/\/pubhtml.*/, '/pub?output=csv').replace(/\/pub\?.*/, '/pub?output=csv');
    if (!formattedPub.includes('output=csv')) {
      formattedPub += (formattedPub.includes('?') ? '&' : '?') + 'output=csv';
    }
    urlsToTry.push(formattedPub);
    urlsToTry.push(rawInput);
  } else {
    urlsToTry.push(rawInput);
  }

  let csvText: string | null = null;
  let lastError: any = null;

  for (const candidateUrl of urlsToTry) {
    try {
      const res = await fetch(candidateUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const textDecoder = new TextDecoder('utf-8');
        let text = textDecoder.decode(buf);
        // Strip BOM
        text = text.replace(/^[\uFEFF\uFFFE]+/, '').replace(/^ï»¿/, '');
        if (text && text.trim().length > 0 && !text.includes('<!DOCTYPE html>') && !text.includes('<html')) {
          csvText = text;
          break;
        }
      }
    } catch (err) {
      lastError = err;
    }

    // Proxy fallback
    const proxyUrls = [
      `https://corsproxy.io/?${encodeURIComponent(candidateUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(candidateUrl)}`
    ];

    for (const proxyUrl of proxyUrls) {
      try {
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const textDecoder = new TextDecoder('utf-8');
          let text = textDecoder.decode(buf);
          text = text.replace(/^[\uFEFF\uFFFE]+/, '').replace(/^ï»¿/, '');
          if (text && text.trim().length > 0 && !text.includes('<!DOCTYPE html>') && !text.includes('<html')) {
            csvText = text;
            break;
          }
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (csvText) break;
  }

  if (!csvText) {
    throw new Error('Google Sheet ડાઉનલોડ થઈ શકી નથી. કૃપા કરીને ખાતરી કરો કે લિંક શૅરિંગ "Anyone with the link can view" પર સેટ થયેલું છે.');
  }

  const workbook = XLSX.read(csvText, { type: 'string', raw: true });
  return parseWorkbook(workbook);
}


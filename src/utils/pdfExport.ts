import { Book } from '../types';
import { resolveBookCreatedBy } from '../initialData';

export function openCatalogPrintView(
  books: Book[],
  orientation: 'Landscape' | 'Portrait' = 'Landscape',
  isAdmin: boolean = true,
  selectedUserFilter: string = 'ALL'
): void {
  const isLandscape = orientation === 'Landscape';
  
  // Permissions: Publisher (પ્રકાશક) and Price (કિંમત) are Admin-only.
  // Book Type (સ્વરૂપ) is open for everyone.
  const showPublisher = isAdmin;
  const showPrice = isAdmin;
  const showBookType = isLandscape;

  const allBooks = Array.isArray(books) ? books : [];
  if (allBooks.length === 0) {
    alert('PDF જનરેટ કરવા માટે કોઈ પુસ્તક ડેટા નથી.');
    return;
  }

  // Group books by User (createdBy)
  const userMap = new Map<string, Book[]>();
  for (const book of allBooks) {
    const user = resolveBookCreatedBy(book.bookId, book.createdBy);

    if (selectedUserFilter !== 'ALL' && user !== selectedUserFilter) {
      continue;
    }

    if (!userMap.has(user)) {
      userMap.set(user, []);
    }
    userMap.get(user)!.push(book);
  }

  const userGroups = Array.from(userMap.entries()).sort((a, b) => {
    if (a[0].toLowerCase().includes('devdutt')) return -1;
    if (b[0].toLowerCase().includes('devdutt')) return 1;
    return a[0].localeCompare(b[0]);
  });

  if (userGroups.length === 0) {
    alert(`પસંદ કરેલ યુઝર (${selectedUserFilter}) માટે કોઈ પુસ્તક ડેટા નથી.`);
    return;
  }

  const formattedDate = new Date().toLocaleDateString('gu-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let sectionsHtml = '';

  userGroups.forEach(([userName, userBooks], groupIdx) => {
    const totalUserBooks = userBooks.length;
    const isFirstGroup = groupIdx === 0;

    // Column widths depending on role & orientation
    const authorWidth = isAdmin
      ? (isLandscape ? '190px' : '150px')
      : (isLandscape ? '250px' : '200px');
    
    const categoryWidth = isAdmin
      ? (isLandscape ? '130px' : '105px')
      : (isLandscape ? '180px' : '140px');

    const languageWidth = isAdmin
      ? (isLandscape ? '75px' : '65px')
      : (isLandscape ? '90px' : '80px');

    sectionsHtml += `
      <div class="user-section ${!isFirstGroup ? 'page-break-before' : ''}">
        <!-- Top Header Banner -->
        <div class="header-banner">
          <div class="header-top">
            <div>
              <h1 class="catalog-title">બાલપદ્મ પુસ્તકાલય - રાજુલા</h1>
            </div>
            <div class="header-date">
              તારીખ : ${formattedDate}
            </div>
          </div>
          
          <div class="user-bar">
            <div class="user-name-tag">
              <span>User :</span>
              <span class="badge-user">${escapeHtml(userName)}</span>
            </div>
            <div class="user-stats-tag">
              કુલ પુસ્તકો (Total Books): <span class="badge-count">${totalUserBooks}</span>
            </div>
          </div>
        </div>

        <!-- Books Table -->
        <table class="books-table">
          <thead>
            <tr>
              <th style="width: 48px; text-align: center;">આઈડી</th>
              <th>પુસ્તકનું નામ (Book Name)</th>
              <th style="width: ${authorWidth};">લેખક (Author)</th>
              ${showPublisher ? `<th style="width: ${isLandscape ? '160px' : '130px'};">પ્રકાશક (Publisher)</th>` : ''}
              <th style="width: ${categoryWidth};">શ્રેણી (Category)</th>
              <th style="width: ${languageWidth}; text-align: center;">ભાષા</th>
              ${showBookType ? `<th style="width: 90px; text-align: center;">સ્વરૂપ</th>` : ''}
              ${showPrice ? `<th style="width: 65px; text-align: right;">કિંમત</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${userBooks
              .map(
                (b, bIdx) => `
              <tr class="${bIdx % 2 === 0 ? 'even-row' : 'odd-row'}">
                <td style="text-align: center; font-weight: bold; color: #2563eb; font-family: monospace;">#${escapeHtml(b.bookId)}</td>
                <td style="font-weight: 600; color: #0f172a;">${escapeHtml(b.bookName)}</td>
                <td style="color: #334155;">${escapeHtml(b.author || '-')}</td>
                ${showPublisher ? `<td style="color: #475569;">${escapeHtml(b.publisher || '-')}</td>` : ''}
                <td style="color: #475569;">${escapeHtml(b.category || '-')}</td>
                <td style="text-align: center; color: #1e293b;">${escapeHtml(b.language || '-')}</td>
                ${showBookType ? `<td style="text-align: center; color: #64748b; font-size: 10px;">${escapeHtml(b.bookType || '-')}</td>` : ''}
                ${showPrice ? `<td style="text-align: right; font-weight: bold; color: #059669; font-family: monospace;">₹${b.rate || 0}</td>` : ''}
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <!-- Section Footer -->
        <div class="user-footer">
          <div>User: <strong>${escapeHtml(userName)}</strong> • કુલ પુસ્તકો: <strong>${totalUserBooks}</strong></div>
          <div>બાલપદ્મ પુસ્તકાલય - રાજુલા</div>
          <div>Page Section</div>
        </div>
      </div>
    `;
  });

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="gu">
    <head>
      <meta charset="UTF-8">
      <title></title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Hind+Vadodara:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 ${orientation.toLowerCase()};
          margin: 10mm 10mm 10mm 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 16px;
          font-family: 'Hind Vadodara', 'Noto Sans Gujarati', 'Shruti', Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          font-size: 11px;
        }
        .page-break-before {
          page-break-before: always;
          break-before: page;
        }
        .user-section {
          width: 100%;
          margin-bottom: 24px;
        }
        .header-banner {
          border: 2px solid #1e3a8a;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 12px;
          page-break-inside: avoid;
        }
        .header-top {
          background-color: #1e3a8a;
          color: #ffffff;
          padding: 10px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .catalog-title {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
          letter-spacing: 0.5px;
        }
        .header-date {
          text-align: right;
          font-size: 12.5px;
          font-weight: 700;
          color: #ffffff;
        }
        .user-bar {
          background-color: #eff6ff;
          padding: 8px 16px;
          border-top: 1px solid #bfdbfe;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .user-name-tag {
          color: #1e3a8a;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .badge-user {
          background-color: #1d4ed8;
          color: #ffffff;
          padding: 2px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }
        .badge-count {
          background-color: #059669;
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: bold;
        }
        .user-stats-tag {
          color: #0f172a;
          font-weight: 700;
        }
        .books-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #cbd5e1;
          font-size: ${isLandscape ? '11px' : '10.5px'};
          line-height: 1.3;
        }
        .books-table thead {
          display: table-header-group;
        }
        .books-table thead tr {
          background-color: #0f172a !important;
          color: #ffffff !important;
        }
        .books-table th {
          padding: 7px 8px;
          border: 1px solid #334155;
          text-align: left;
          font-weight: 700;
        }
        .books-table tbody tr {
          page-break-inside: avoid;
        }
        .books-table td {
          padding: 6px 8px;
          border: 1px solid #e2e8f0;
          word-break: break-word;
        }
        .even-row {
          background-color: #ffffff;
        }
        .odd-row {
          background-color: #f8fafc;
        }
        .user-footer {
          margin-top: 10px;
          padding-top: 6px;
          border-top: 1px solid #cbd5e1;
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          color: #64748b;
          page-break-inside: avoid;
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="background: #1e293b; color: white; padding: 12px 20px; margin-bottom: 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div>
          <div style="font-size: 13px; font-weight: bold; margin-bottom: 2px;">
            🖨️ પ્રિન્ટ / PDF સેવ કરો (Print / Save as PDF)
          </div>
          <div style="font-size: 11px; color: #94a3b8;">
            કીબોર્ડ પર <strong>Ctrl + P</strong> દબાવો અથવા બાજુના બટન પર ક્લિક કરો. "Destination" માં <strong>"Save as PDF"</strong> સિલેક્ટ કરો.
            <br>
            💡 <span style="color: #cbd5e1;">ટીપ: પ્રિન્ટ સેટિંગ્સમાં "Headers and footers" અનચેક કરવાથી બ્રાઉઝરની લિંક કે હેડર નહીં છપાય.</span>
          </div>
        </div>
        <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          🖨️ Print
        </button>
      </div>
      ${sectionsHtml}
    </body>
    </html>
  `;

  // Create Blob and open in new tab
  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const newWin = window.open(blobUrl, '_blank');
  if (!newWin) {
    alert('પોપઅપ બ્લોક થયું છે. કૃપા કરીને બ્રાઉઝરમાં Allow Popups પરવાનગી આપો.');
  }
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

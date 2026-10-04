import { BorrowerRecord } from '../types';
import { formatDateToDDMMYYYY } from './dateUtils';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface IssueListFilterInfo {
  status: string;
  search?: string;
}

/**
 * Escapes HTML characters for safe rendering
 */
function escapeHtml(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates the clean, publication-grade A4 HTML for the Issue Book List
 */
export function generateIssueListHtml(
  borrowers: BorrowerRecord[],
  filterInfo: IssueListFilterInfo
): string {
  const currentDate = formatDateToDDMMYYYY(new Date());
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const totalCount = borrowers.length;
  const activeCount = borrowers.filter((b) => b.status === 'Issued').length;
  const returnedCount = borrowers.filter((b) => b.status === 'Returned').length;

  const rowsHtml = borrowers.length === 0
    ? `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">કોઈ ઈશ્યુ રેકોર્ડ ઉપલબ્ધ નથી (No Records Found)</td></tr>`
    : borrowers.map((b, idx) => {
        const isReturned = b.status === 'Returned';
        const isOverdue = !isReturned && b.dueDate && new Date(b.dueDate) < now;

        const statusLabel = isReturned
          ? '<span style="color: #15803d; font-weight: 700;">Returned</span>'
          : isOverdue
          ? '<span style="color: #dc2626; font-weight: 700;">Overdue</span>'
          : '<span style="color: #b45309; font-weight: 700;">Active</span>';

        const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

        // Calculate days book was kept
        const parseD = (str?: string): Date | null => {
          if (!str) return null;
          const clean = str.trim();
          if (clean.includes('/')) {
            const p = clean.split('/');
            if (p.length === 3) return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
          }
          if (clean.includes('-')) {
            const p = clean.split('-');
            if (p.length === 3) {
              if (p[0].length === 4) return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
              return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
            }
          }
          const d = new Date(clean);
          return isNaN(d.getTime()) ? null : d;
        };

        const issueDateObj = parseD(b.issueDate);
        // If returned, days until returnDate; otherwise, days until today (now)
        const endDateObj = (isReturned && b.returnDate) ? parseD(b.returnDate) || now : now;

        let daysKept = 0;
        if (issueDateObj && endDateObj) {
          const startMs = new Date(issueDateObj.getFullYear(), issueDateObj.getMonth(), issueDateObj.getDate()).getTime();
          const endMs = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), endDateObj.getDate()).getTime();
          const diff = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
          daysKept = Math.max(0, diff);
        }

        return `
          <tr style="background-color: ${rowBg};">
            <td style="text-align: center; font-family: monospace; font-weight: bold; color: #334155; vertical-align: middle;">
              ${idx + 1}
            </td>
            <td style="font-weight: 600; color: #0f172a; vertical-align: middle;">
              <span style="color: #64748b; font-weight: normal; margin-right: 6px;">${escapeHtml(b.bookId)}</span>${escapeHtml(b.bookName)}
            </td>
            <td style="color: #1e293b; font-weight: 500; vertical-align: middle;">
              ${escapeHtml(b.borrowerName)}
            </td>
            <td style="font-family: monospace; color: #334155; white-space: nowrap; vertical-align: middle;">
              ${escapeHtml(b.mobile || '—')}
            </td>
            <td style="font-family: monospace; color: #475569; white-space: nowrap; text-align: center; vertical-align: middle;">
              ${formatDateToDDMMYYYY(b.issueDate) || '—'}
            </td>
            <td style="font-family: monospace; color: ${isOverdue ? '#b91c1c' : '#047857'}; font-weight: ${isOverdue ? 'bold' : 'normal'}; white-space: nowrap; text-align: center; vertical-align: middle;">
              ${formatDateToDDMMYYYY(b.dueDate) || '—'}
            </td>
            <td style="font-family: monospace; font-weight: 700; color: #0f172a; white-space: nowrap; text-align: center; vertical-align: middle;">
              ${daysKept} દિવસ
            </td>
            <td style="text-align: center; white-space: nowrap; vertical-align: middle;">
              ${statusLabel}
            </td>
            <td style="font-family: monospace; color: #475569; vertical-align: middle;">
              ${b.returnDate ? `<span style="color: #15803d; font-weight: bold;">Ret: ${formatDateToDDMMYYYY(b.returnDate)}</span>` : ''}
              ${b.remark ? `<span style="color: #64748b; margin-left: 5px;">${escapeHtml(b.remark)}</span>` : ''}
              ${!b.returnDate && !b.remark ? '—' : ''}
            </td>
          </tr>
        `;
      }).join('');

  return `
    <!DOCTYPE html>
    <html lang="gu">
    <head>
      <meta charset="utf-8">
      <title>Issue Book List Report - બાલપદ્મ પુસ્તકાલય</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 12mm 16mm 12mm 16mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
          background-color: #ffffff;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Gujarati", "Gujarati Sangam MN", "Shruti", Arial, sans-serif;
          color: #0f172a;
          line-height: 1.35;
        }
        .page-wrapper {
          box-sizing: border-box;
          min-height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px 28px 10px 28px;
        }
        .main-section {
          flex: 1 0 auto;
        }
        .report-header {
          border-bottom: 2px solid #4338ca;
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .lib-title {
          font-size: 20px;
          font-weight: 800;
          color: #312e81;
          margin: 0;
          letter-spacing: -0.2px;
        }
        .report-subtitle {
          font-size: 13px;
          font-weight: 700;
          color: #4f46e5;
          margin: 2px 0 0 0;
        }
        .header-meta {
          text-align: right;
          font-size: 11px;
          color: #475569;
        }
        .header-meta strong {
          color: #1e293b;
        }
        .stats-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          padding: 6px 14px;
          background: #f1f5f9;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 600;
          color: #334155;
        }
        .stats-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .stat-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .stat-val {
          font-weight: 800;
          font-size: 13px;
          margin-left: 2px;
        }
        .page-no-item {
          font-weight: 700;
          color: #334155;
          font-size: 11.5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        th {
          background-color: #1e293b;
          color: #ffffff;
          border: 1px solid #0f172a;
          padding: 8px 8px;
          font-size: 11px;
          font-weight: 700;
          text-align: left;
          letter-spacing: 0.2px;
          vertical-align: middle !important;
          line-height: 1.3;
        }
        td {
          border: 1px solid #cbd5e1;
          padding: 7px 8px;
          vertical-align: middle !important;
          line-height: 1.35;
          font-size: 11px;
        }
        tr {
          page-break-inside: avoid;
        }
        .footer-section {
          flex-shrink: 0;
          margin-top: 24px;
          page-break-inside: avoid;
        }
        .sign-wrapper {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 18px;
        }
        .sign-area {
          text-align: right;
        }
        .sign-line {
          width: 190px;
          border-top: 1px dashed #64748b;
          margin-bottom: 6px;
          margin-left: auto;
        }
        .center-footer {
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          border-top: 1px solid #cbd5e1;
          padding-top: 8px;
          padding-bottom: 2px;
        }
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm 14mm 10mm 14mm;
          }
          html, body {
            height: auto !important;
            margin: 0;
            padding: 0;
          }
          .page-wrapper {
            min-height: auto !important;
            height: auto !important;
            padding: 0;
            page-break-after: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="page-wrapper">
        <div class="main-section">
          <div class="report-header">
            <div class="header-top">
              <div>
                <h1 class="lib-title">બાલપદ્મ પુસ્તકાલય - રાજુલા</h1>
                <div class="report-subtitle">ઇશ્યૂ થયેલ પુસ્તકોની યાદી (Issue Book List Report)</div>
              </div>
              <div class="header-meta">
                <div>તારીખ (Date): <strong>${currentDate}</strong> • સમય: <strong>${timeStr}</strong></div>
                <div>ફિલ્ટર (Filter): <strong>${filterInfo.status === 'All' ? 'તમામ રેકોર્ડ (All)' : filterInfo.status}</strong> ${filterInfo.search ? `• શોધ: "${escapeHtml(filterInfo.search)}"` : ''}</div>
              </div>
            </div>

            <div class="stats-bar">
              <div class="stats-group">
                <div class="stat-item">કુલ રેકોર્ડ્સ (Total): <span class="stat-val" style="color: #0f172a;">${totalCount}</span></div>
                <div class="stat-item">હાલમાં ઈશ્યુ થયેલ (Active Issued): <span class="stat-val" style="color: #b45309;">${activeCount}</span></div>
                <div class="stat-item">પરત જમા થયેલ (Returned): <span class="stat-val" style="color: #15803d;">${returnedCount}</span></div>
              </div>
              <div class="page-no-item">
                <span>પેઈજ નંબર:</span>
                <span style="font-weight: 800; color: #1e293b; margin-left: 3px;">1</span>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">SR No</th>
                <th>પુસ્તક (Book Title & ID)</th>
                <th style="width: 155px;">ઉધાર લેનાર (Borrower)</th>
                <th style="width: 100px;">મોબાઈલ</th>
                <th style="width: 90px; text-align: center;">ઇશ્યૂ તારીખ</th>
                <th style="width: 90px; text-align: center;">પરત તારીખ</th>
                <th style="width: 65px; text-align: center;">દિવસ</th>
                <th style="width: 90px; text-align: center;">સ્થિતિ (Status)</th>
                <th style="width: 125px;">નોંધ / પરત વિગત</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <div class="footer-section">
          <div class="sign-wrapper">
            <div class="sign-area">
              <div class="sign-line"></div>
              <div style="font-weight: 600; color: #1e293b; font-size: 11px;">ગ્રંથપાલ / અધિકૃત સંચાલકની સહી</div>
            </div>
          </div>
          <div class="center-footer">
            • રિપોર્ટ જનરેટ: બાલપદ્મ પુસ્તકાલય મેનેજમેન્ટ સિસ્ટમ •
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 100% Reliable Print Function:
 * Uses a hidden iframe to print directly without popup blocker interference.
 */
export function printIssueListA4(
  borrowers: BorrowerRecord[],
  filterInfo: IssueListFilterInfo
): void {
  const fullHtml = generateIssueListHtml(borrowers, filterInfo);

  // Create hidden iframe
  const iframeId = 'print-issue-list-iframe';
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
  if (iframe) {
    iframe.remove();
  }

  iframe = document.createElement('iframe');
  iframe.id = iframeId;
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    // Fallback: Open in new window/tab if iframe fails
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    return;
  }

  doc.open();
  doc.write(fullHtml);
  doc.close();

  // Wait for fonts and content to render, then trigger print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  }, 400);
}

/**
 * 100% Working PDF Download:
 * Renders the A4 document offscreen with native Gujarati fonts and exports via html2canvas + jsPDF.
 */
export async function downloadIssueListPdf(
  borrowers: BorrowerRecord[],
  filterInfo: IssueListFilterInfo,
  onProgress?: (isGenerating: boolean) => void
): Promise<void> {
  onProgress?.(true);

  try {
    const fullHtml = generateIssueListHtml(borrowers, filterInfo);

    // Create an offscreen wrapper with exact A4 landscape width (1120px)
    const container = document.createElement('div');
    container.id = 'pdf-render-container';
    container.style.position = 'fixed';
    container.style.top = '-99999px';
    container.style.left = '-99999px';
    container.style.width = '1120px';
    container.style.backgroundColor = '#ffffff';
    container.style.zIndex = '-9999';
    container.style.boxSizing = 'border-box';
    container.innerHTML = fullHtml;

    document.body.appendChild(container);

    // Render with html2canvas for 100% faithful Unicode Gujarati font preservation
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    document.body.removeChild(container);

    // A4 dimensions in mm: 297mm x 210mm (Landscape)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Set 14mm margins on both left and right, and 10mm on top and bottom
    const marginX = 14;
    const marginY = 10;
    const pageWidth = 297;
    const pageHeight = 210;
    const printableWidth = pageWidth - (marginX * 2); // 269mm
    const printableHeight = pageHeight - (marginY * 2); // 190mm

    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    // Strict 1-Page rule: When records fit in 1 sheet (up to 16 books), NEVER create a 2nd page!
    if (borrowers.length <= 16 || imgHeight <= printableHeight + 10) {
      const finalHeight = Math.min(imgHeight, printableHeight);
      pdf.addImage(imgData, 'PNG', marginX, marginY, imgWidth, finalHeight);
    } else {
      // Multi-page handling only for 17+ records
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', marginX, marginY + position, imgWidth, imgHeight);
      heightLeft -= printableHeight;

      // Only add another page if significant content remains (greater than 15mm)
      while (heightLeft > 15) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', marginX, marginY + position, imgWidth, imgHeight);
        heightLeft -= printableHeight;
      }
    }

    const dateStr = formatDateToDDMMYYYY(new Date()).replace(/[-/]/g, '_');
    pdf.save(`Issue_Book_List_Report_${dateStr}.pdf`);
  } catch (err) {
    console.error('PDF generation error, falling back to print view:', err);
    // Fallback directly to print window
    printIssueListA4(borrowers, filterInfo);
  } finally {
    onProgress?.(false);
  }
}

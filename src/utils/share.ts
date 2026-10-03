import { Article } from '../types';

/**
 * Creates the standalone share URL for an article.
 * When opened via this URL, the recipient only sees this single article,
 * and cannot navigate back to the main catalog.
 */
export function getArticleShareUrl(articleId: string): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?article=${encodeURIComponent(articleId)}&standalone=true`;
}

/**
 * Copies the direct browser web link of an article to the clipboard.
 * When this link is pasted into any web browser, the article opens directly.
 */
export async function copyArticleWebLink(article: Article): Promise<string> {
  const shareUrl = getArticleShareUrl(article.id);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      return shareUrl;
    }
  } catch (err) {
    console.warn('Clipboard API failed, falling back to execCommand:', err);
  }

  // Fallback for older browsers or constrained iframe environments
  try {
    const textArea = document.createElement('textarea');
    textArea.value = shareUrl;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return shareUrl;
  } catch (err2) {
    console.error('Copy fallback failed:', err2);
    return shareUrl;
  }
}

/**
 * Generates formatted WhatsApp text message for an article.
 */
export function getArticleWhatsAppMessage(article: Article): string {
  const shareUrl = getArticleShareUrl(article.id);
  const cleanTitle = (article.title || 'લેખ').trim();
  const authorLine = article.author ? `✍️ લેખક: ${article.author.trim()}` : '';
  const protectedNote = article.isPasswordProtected
    ? `🔒 (આ લેખ પાસવર્ડ સુરક્ષિત છે — વાંચવા માટે સંચાલક પાસેથી OTP પાસવર્ડ મેળવવો પડશે)`
    : '';

  const messageParts = [
    `📖 *${cleanTitle}*`,
    authorLine,
    protectedNote,
    `\n🔗 આ લેખ વાંચવા માટે નીચે આપેલ લિંક પર ક્લિક કરો:`,
    shareUrl,
  ].filter(Boolean);

  return messageParts.join('\n');
}

/**
 * Helper to detect mobile devices
 */
export function isMobileUserDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Returns the direct WhatsApp sharing URL with prefilled article message.
 * On Desktop PC, points directly to web.whatsapp.com to bypass intermediate screens.
 * On Mobile, points to api.whatsapp.com to directly launch WhatsApp mobile app.
 */
export function getArticleWhatsAppShareUrl(article: Article): string {
  const fullText = getArticleWhatsAppMessage(article);
  const encodedText = encodeURIComponent(fullText);
  if (isMobileUserDevice()) {
    return `https://api.whatsapp.com/send?text=${encodedText}`;
  }
  return `https://web.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Shares a specific article via WhatsApp with its direct web URL.
 * Uses a fixed named window/tab ('whatsapp_share') so on desktop browsers it reuses
 * the already opened WhatsApp tab instead of opening multiple duplicate tabs.
 */
export function shareArticleOnWhatsApp(article: Article): string {
  if (typeof window === 'undefined') return '';
  const whatsappUrl = getArticleWhatsAppShareUrl(article);
  window.open(whatsappUrl, 'whatsapp_share');
  return whatsappUrl;
}

/**
 * Creates the direct Admin OTP Generator URL for an article.
 * When the admin clicks this link from a WhatsApp request, the app directly
 * opens the OTP generator for that exact article.
 */
export function getAdminOtpUrl(articleId: string): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?adminOtpArticleId=${encodeURIComponent(articleId)}`;
}


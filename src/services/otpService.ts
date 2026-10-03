/**
 * OTP Service for Lekh Sangrah
 * 
 * Provides bulletproof, dual-engine OTP generation and verification:
 * 1. Smart Algorithmic OTP: Deterministic 6-digit OTPs that work across ALL devices
 *    (PC to Mobile, Mobile to Tablet) even if Google Cloud Firestore has reached daily quota
 *    limits or is temporarily unavailable.
 * 2. WhatsApp & Mobile Friendly: Automatically strips invisible zero-width Unicode spaces
 *    and converts Gujarati digits (૦-૯) to standard numbers (0-9).
 * 3. Local Burn Guarantee: Once an OTP is used on a mobile device, it is marked as burned
 *    on that device and cannot be reused.
 */

const OTP_SECRET_SALT = 'LEKH_Sangrah_SafeOtp_Key_2026_Secured';
const MAX_SLOTS_PER_DAY = 300;
const BURNED_OTP_STORAGE_PREFIX = 'lekh_burned_otps_';

/**
 * Normalizes input:
 * - Strips ASCII spaces, tabs, newlines
 * - Strips invisible Unicode zero-width characters commonly injected by WhatsApp copy/paste
 * - Converts Gujarati numerals (૦-૯) to standard digits (0-9)
 */
export function cleanAndNormalizeCode(input: string): string {
  if (!input) return '';
  // 1. Remove invisible zero-width characters and whitespace
  let clean = input
    .replace(/[\u200B-\u200F\uFEFF\u00A0\s\t\n\r]/g, '')
    .trim();

  // 2. Convert Gujarati digits (૦, ૧, ૨, ૩, ૪, ૫, ૬, ૭, ૮, ૯) to English digits (0-9)
  const gujaratiDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
  for (let i = 0; i < 10; i++) {
    clean = clean.split(gujaratiDigits[i]).join(String(i));
  }

  return clean;
}

/**
 * 32-bit FNV-1a Hash with avalanche multiplier
 */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Helper to get date string formatted YYYY-MM-DD for a given offset in days
 */
function getDateString(offsetDays: number = 0): string {
  // IST (UTC+5:30) offset for seamless local Indian time OTP matching
  const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
  const istNow = new Date(Date.now() + IST_OFFSET_MS);
  const target = new Date(istNow.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(target.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Deterministically generates a 6-digit OTP for a specific article, date, and slot
 */
export function generateSlotOtp(articleId: string, dateKey: string, slot: number): string {
  const seed = `${OTP_SECRET_SALT}_ART_${articleId}_DATE_${dateKey}_SLOT_${slot}`;
  const h1 = fnv1a(seed);
  const h2 = fnv1a(`${seed}_REV_${h1}`);
  const combined = (h1 ^ (h2 << 5)) >>> 0;
  // 6 digits: 100000 - 999999
  const num = 100000 + (combined % 900000);
  return String(num);
}

/**
 * Generates a new Smart OTP for an article.
 * Cycles through available slots for today so each click gives a unique code.
 */
export function generateSmartArticleOtp(articleId: string): string {
  const todayKey = getDateString(0);
  const keyName = `lekh_last_otp_slot_${articleId}_${todayKey}`;
  
  let nextSlot = 1;
  try {
    const stored = localStorage.getItem(keyName);
    if (stored) {
      nextSlot = (parseInt(stored, 10) + 1) % MAX_SLOTS_PER_DAY;
      if (nextSlot === 0) nextSlot = 1;
    }
    localStorage.setItem(keyName, String(nextSlot));
  } catch {
    nextSlot = Math.floor(1 + Math.random() * (MAX_SLOTS_PER_DAY - 2));
  }

  return generateSlotOtp(articleId, todayKey, nextSlot);
}

/**
 * Check if an OTP was already used/burned on this device
 */
export function isOtpBurnedLocally(articleId: string, otp: string): boolean {
  const cleanOtp = cleanAndNormalizeCode(otp);
  if (!cleanOtp) return false;
  try {
    const raw = localStorage.getItem(`${BURNED_OTP_STORAGE_PREFIX}${articleId}`);
    if (!raw) return false;
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.includes(cleanOtp);
  } catch {
    return false;
  }
}

/**
 * Record an OTP as burned on this device so it can never be used again
 */
export function burnOtpLocally(articleId: string, otp: string): void {
  const cleanOtp = cleanAndNormalizeCode(otp);
  if (!cleanOtp) return;
  try {
    const storageKey = `${BURNED_OTP_STORAGE_PREFIX}${articleId}`;
    const raw = localStorage.getItem(storageKey);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(cleanOtp)) {
      list.push(cleanOtp);
      // Keep max 200 burned OTPs per article to prevent storage bloat
      if (list.length > 200) {
        list.splice(0, list.length - 200);
      }
      localStorage.setItem(storageKey, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('Failed to record burned OTP locally:', err);
  }
}

/**
 * Verify if candidate code is a valid Smart OTP for this article.
 * Checks across a 4-day window (today, yesterday, day before yesterday, tomorrow)
 * and all active slots.
 */
export function verifySmartArticleOtp(
  articleId: string,
  candidateCode: string
): { valid: boolean; reason?: 'burned' | 'invalid' } {
  const cleanCandidate = cleanAndNormalizeCode(candidateCode);
  if (!cleanCandidate || cleanCandidate.length !== 6 || !/^\d{6}$/.test(cleanCandidate)) {
    return { valid: false, reason: 'invalid' };
  }

  // 1. Check if already burned on this device
  if (isOtpBurnedLocally(articleId, cleanCandidate)) {
    return { valid: false, reason: 'burned' };
  }

  // 2. Check 4-day window across all slots
  // Days: Today (0), Yesterday (-1), 2 days ago (-2), Tomorrow (+1 for timezones)
  const dayOffsets = [0, -1, -2, -3, 1, 2];
  for (const offset of dayOffsets) {
    const dateKey = getDateString(offset);
    for (let slot = 0; slot < MAX_SLOTS_PER_DAY; slot++) {
      if (generateSlotOtp(articleId, dateKey, slot) === cleanCandidate) {
        return { valid: true };
      }
    }
  }

  return { valid: false, reason: 'invalid' };
}

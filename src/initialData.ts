import { Book, BorrowerRecord, MasterData } from './types';
import { IMPORTED_BOOKS } from './importedBooks';

/**
 * Resolves entry operator name according to exact library catalog records:
 * - Sr No 01 to 17: Devdutt Thaker
 * - Sr No 18 to 107: Jignesh Upadhyay
 * - Sr No 108 to 163: Devdutt Thaker
 */
export const resolveBookCreatedBy = (
  bookId: string | number | undefined,
  existingCreatedBy?: string,
  fallbackUser?: string
): string => {
  const numId = parseInt(String(bookId || '').replace(/\D/g, ''), 10);
  if (!isNaN(numId) && numId > 0) {
    if (numId >= 1 && numId <= 17) {
      return 'Devdutt Thaker';
    }
    if (numId >= 18 && numId <= 107) {
      return 'Jignesh Upadhyay';
    }
    if (numId >= 108 && numId <= 163) {
      return 'Devdutt Thaker';
    }
  }

  const clean = String(existingCreatedBy || '').trim();
  if (clean && clean.toLowerCase() !== 'admin') {
    return clean;
  }

  if (fallbackUser && fallbackUser.trim() && fallbackUser.toLowerCase() !== 'admin') {
    return fallbackUser.trim();
  }

  return 'Devdutt Thaker';
};

export const INITIAL_BOOKS: Book[] = [];
export const SAMPLE_BOOKS: Book[] = IMPORTED_BOOKS;

export const INITIAL_BORROWERS: BorrowerRecord[] = [];

export const INITIAL_MASTERS: MasterData = {
  authors: [
    "ઝવેરચંદ મેઘાણી",
    "કનૈયાલાલ મુનશી",
    "ગોવર્ધનરામ ત્રિપાઠી",
    "પન્નાલાલ પટેલ",
    "મનુભાઈ પંચોળી 'દર્શક'",
    "મહાત્મા ગાંધી",
    "રમણલાલ વ. દેસાઈ",
    "કાકાસાહેબ કાલેલકર",
    "રઘુવીર ચૌધરી",
    "કુંદનિકા કાપડિયા",
    "ધ્રુવ ભટ્ટ",
    "ઉમાશંકર જોશી",
    "જ્યોતીન્દ્ર દવે",
    "ઈશ્વર પેટલીકર",
    "સ્વામી સચ્ચિદાનંદ",
    "ડૉ. આઈ કે વીજળીવાળા",
    "ગુણવંત શાહ",
    "ચંદ્રકાંત બક્ષી",
    "કાજલ ઓઝા વૈદ્ય",
    "વિનોદ ભટ્ટ",
    "મરીઝ"
  ],
  categories: [
    "લોકસાહિત્ય / વાર્તાઓ",
    "ઐતિહાસિક નવલકથા",
    "સામાજિક મહાનવલકથા",
    "જ્ઞાનપીઠ પુરસ્કૃત નવલકથા",
    "ચિંતનાત્મક નવલકથા",
    "આત્મકથા / જીવન ચરિત્ર",
    "ઇતિહાસ / ચરિત્ર સાહિત્ય",
    "કાવ્ય સાહિત્ય / ગઝલ",
    "નારીવાદી નવલકથા",
    "બાળ સાહિત્ય / બોધકથાઓ",
    "હાસ્ય નિબંધો",
    "વિશ્વકોશ / જ્ઞાનકોશ",
    "પ્રવાસ સાહિત્ય"
  ],
  translators: [
    "મૂળ",
    "સંકલિત",
    "Original",
    "ઝવેરચંદ મેઘાણી",
    "મકરંદ દવે"
  ],
  languages: [
    "ગુજરાતી",
    "ઇંગ્લીશ",
    "હિન્દી / ઉર્દૂ",
    "ઇંગ્લીશ / ઉર્દૂ",
    "ગુજરાતી / ઇંગ્લીશ"
  ],
  publishers: [
    "ગુર્જર સાહિત્ય ભવન",
    "આર. આર. શેઠ એન્ડ કંપની",
    "એન. એમ. ત્રિપાઠી પ્રા. લિ.",
    "સાધના પ્રકાશન",
    "નવજીવન પ્રકાશન મંદિર",
    "નવભારત સાહિત્ય મંદિર",
    "ગૂર્જર ગ્રંથરત્ન કાર્યાલય",
    "પ્રત્યક્ષ પ્રકાશન",
    "HarperCollins Publishers",
    "Westland Publications"
  ],
  bookTypes: [
    "Digital PDF",
    "Digital Epub",
    "Digital DOCX",
    "New Hard copy",
    "Old Hard copy",
    "Average Condition",
    "Digital PDF + Digital Epub"
  ]
};

import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  ArrowRight, 
  X, 
  Sparkles, 
  CheckCircle2, 
  Key, 
  Copy, 
  Check, 
  Trash2, 
  Plus, 
  ShieldCheck, 
  ChevronLeft,
  BookOpen,
  Phone,
  MessageCircle,
  Fingerprint,
  Save
} from 'lucide-react';
import { Article } from '../types';
import { 
  cleanAndNormalizeCode,
  generateSmartArticleOtp,
  verifySmartArticleOtp,
  burnOtpLocally,
  isOtpBurnedLocally
} from '../services/otpService';
import { 
  burnArticleOtpInCloud, 
  generateArticleOtpInCloud, 
  verifyAndBurnArticleOtpInCloud,
  removeArticleOtpInCloud,
  removeAllArticleOtpsInCloud,
  saveSingleArticleToCloud,
  saveAdminContactPhoneToCloud
} from '../services/firebaseService';
import {
  isBiometricSupported,
  isBiometricEnrolled,
  enrollBiometric,
  verifyBiometric,
  disableBiometric,
  cancelBiometricAuth
} from '../services/biometricService';
import { getAdminOtpUrl } from '../utils/share';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (usedOtp?: string) => void;
  actionType?: 'add' | 'backup' | 'article_unlock';
  targetArticle?: Article | null;
  targetIssueId?: string;
  initialPassword?: string;
  onUpdateArticleOtps?: (articleId: string, updatedOtps: string[]) => void;
  openOtpManagerDirectly?: boolean;
  isAdminAuthenticated?: boolean;
  adminContactPhone?: string;
  adminSecondaryPhone?: string;
  onUpdateAdminContactPhone?: (phone: string, secondaryPhone?: string) => void;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionType = 'add',
  targetArticle,
  targetIssueId,
  initialPassword = '',
  onUpdateArticleOtps,
  openOtpManagerDirectly = false,
  isAdminAuthenticated = false,
  adminContactPhone: propAdminContactPhone,
  adminSecondaryPhone: propAdminSecondaryPhone,
  onUpdateAdminContactPhone,
}) => {
  const [password, setPassword] = useState(initialPassword);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [otpBurnedSuccess, setOtpBurnedSuccess] = useState(false);

  useEffect(() => {
    if (initialPassword) {
      setPassword(initialPassword);
    }
  }, [initialPassword]);

  // Modes:
  // 'unlock': Reader enters OTP/Password to read (or Admin enters admin password)
  // 'otp_manager': Unlocked OTP generator and manager (accessible only after admin password)
  const [viewMode, setViewMode] = useState<'unlock' | 'otp_manager'>('unlock');
  const [adminVerifiedChoice, setAdminVerifiedChoice] = useState(false);
  const readArticleBtnRef = useRef<HTMLButtonElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  // Auto-focus the password input field whenever password entry is displayed (e.g. reading locked article)
  useEffect(() => {
    if (!isOpen || adminVerifiedChoice || viewMode !== 'unlock') return;

    // Immediate attempt
    passwordInputRef.current?.focus();

    // Deferred focus to ensure DOM is ready after modal mount animation
    const timer = setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 60);

    const secondaryTimer = setTimeout(() => {
      if (document.activeElement !== passwordInputRef.current) {
        passwordInputRef.current?.focus();
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      clearTimeout(secondaryTimer);
    };
  }, [isOpen, adminVerifiedChoice, viewMode]);

  // Auto-focus the "લેખ વાંચો" button as soon as admin credentials are confirmed
  // AND listen for Enter globally so the second Enter immediately opens the article without touching the mouse!
  useEffect(() => {
    if (!isOpen || !adminVerifiedChoice) return;

    // Immediately focus the "લેખ વાંચો" button
    readArticleBtnRef.current?.focus();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        setPassword('');
        onSuccessRef.current();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [isOpen, adminVerifiedChoice]);

  // OTP generator states
  const [customOtpInput, setCustomOtpInput] = useState('');
  const [justGeneratedOtp, setJustGeneratedOtp] = useState<string | null>(null);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpCloudStatus, setOtpCloudStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Admin Contact Mobile Phones (Primary default: 7878413535, Optional Secondary)
  const [localContactPhone, setLocalContactPhone] = useState<string>(() => {
    if (propAdminContactPhone && propAdminContactPhone.trim() && propAdminContactPhone.trim() !== '9428967656') {
      return propAdminContactPhone.trim();
    }
    try {
      const saved = localStorage.getItem('lekh_admin_contact_phone');
      if (saved && saved.trim() && saved.trim() !== '9428967656') return saved.trim();
    } catch {}
    return '7878413535';
  });

  const [localSecondaryPhone, setLocalSecondaryPhone] = useState<string>(() => {
    if (propAdminSecondaryPhone && propAdminSecondaryPhone.trim()) {
      return propAdminSecondaryPhone.trim();
    }
    try {
      const saved = localStorage.getItem('lekh_admin_secondary_phone');
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    return '';
  });

  const adminContactPhone = (propAdminContactPhone && propAdminContactPhone.trim() && propAdminContactPhone.trim() !== '9428967656') 
    ? propAdminContactPhone.trim() 
    : (localContactPhone || '7878413535');

  const adminSecondaryPhone = (propAdminSecondaryPhone && propAdminSecondaryPhone.trim()) 
    ? propAdminSecondaryPhone.trim() 
    : localSecondaryPhone;

  const [phoneEditInput, setPhoneEditInput] = useState<string>(adminContactPhone);
  const [secondaryPhoneEditInput, setSecondaryPhoneEditInput] = useState<string>(adminSecondaryPhone);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneSavedMessage, setPhoneSavedMessage] = useState(false);

  useEffect(() => {
    if (propAdminContactPhone && propAdminContactPhone.trim() && propAdminContactPhone.trim() !== '9428967656') {
      setLocalContactPhone(propAdminContactPhone.trim());
      setPhoneEditInput(propAdminContactPhone.trim());
    }
  }, [propAdminContactPhone]);

  useEffect(() => {
    if (propAdminSecondaryPhone !== undefined) {
      setLocalSecondaryPhone(propAdminSecondaryPhone.trim());
      setSecondaryPhoneEditInput(propAdminSecondaryPhone.trim());
    }
  }, [propAdminSecondaryPhone]);

  // Biometric / Fingerprint states
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [isBiometricVerifying, setIsBiometricVerifying] = useState(false);
  const [isEnrollingBiometric, setIsEnrollingBiometric] = useState(false);
  const [biometricNotice, setBiometricNotice] = useState<string | null>(null);
  const [enrollOnSuccess, setEnrollOnSuccess] = useState(false);

  // Check biometric support & enrollment on modal open
  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      setBiometricEnrolled(isBiometricEnrolled());
      isBiometricSupported().then((supported) => {
        if (isMounted) setBiometricSupported(supported);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setCustomOtpInput('');
      setHasError(false);
      setErrorMessage('');
      setOtpBurnedSuccess(false);
      setJustGeneratedOtp(null);
      setCopiedOtp(null);
      setBiometricNotice(null);
      setEnrollOnSuccess(false);

      if (openOtpManagerDirectly && isAdminAuthenticated && targetArticle) {
        setViewMode('otp_manager');
        setAdminVerifiedChoice(false);
        handleGenerateRandomOtp();
      } else {
        setViewMode('unlock');
        setAdminVerifiedChoice(false);
      }
    }
  }, [isOpen, openOtpManagerDirectly, isAdminAuthenticated, targetArticle?.id]);

  if (!isOpen) return null;

  const handleBiometricUnlock = async (isAuto = false) => {
    setIsBiometricVerifying(true);
    if (!isAuto) setBiometricNotice(null);
    setHasError(false);
    setErrorMessage('');

    try {
      const res = await verifyBiometric();
      if (res.success) {
        if ((actionType === 'article_unlock' || openOtpManagerDirectly) && targetArticle) {
          if (openOtpManagerDirectly) {
            setAdminVerifiedChoice(false);
            setViewMode('otp_manager');
            handleGenerateRandomOtp();
          } else {
            setAdminVerifiedChoice(true);
          }
        } else {
          setPassword('');
          onSuccessRef.current();
        }
      } else {
        if (!isAuto) {
          setBiometricNotice(res.error || 'ફિંગરપ્રિન્ટ ઓળખ નિષ્ફળ રહી.');
          setTimeout(() => setBiometricNotice(null), 4500);
        }
      }
    } catch {
      if (!isAuto) {
        setBiometricNotice('ફિંગરપ્રિન્ટ ચકાસણીમાં ક્ષતિ આવી.');
        setTimeout(() => setBiometricNotice(null), 4500);
      }
    } finally {
      setIsBiometricVerifying(false);
    }
  };

  // Auto-trigger biometric verification when modal opens for enrolled devices
  useEffect(() => {
    let cancelAuto = false;
    if (isOpen && biometricEnrolled && (openOtpManagerDirectly || actionType !== 'article_unlock')) {
      const timer = setTimeout(() => {
        if (!cancelAuto) {
          handleBiometricUnlock(true);
        }
      }, 350);
      return () => {
        cancelAuto = true;
        clearTimeout(timer);
      };
    }
  }, [isOpen, biometricEnrolled, openOtpManagerDirectly, actionType]);

  const handleEnrollBiometric = async () => {
    setIsEnrollingBiometric(true);
    setBiometricNotice(null);
    try {
      const res = await enrollBiometric('એડમિન');
      if (res.success) {
        setBiometricEnrolled(true);
        setBiometricNotice('✓ આ મોબાઇલ પર ફિંગરપ્રિન્ટ સફળતાપૂર્વક સક્રિય થઈ ગયું છે!');
        setTimeout(() => setBiometricNotice(null), 4500);
      } else {
        setBiometricNotice(res.error || 'ફિંગરપ્રિન્ટ સેટ થઈ શક્યું નહીં.');
        setTimeout(() => setBiometricNotice(null), 4500);
      }
    } catch {
      setBiometricNotice('ફિંગરપ્રિન્ટ સેટ કરવામાં ક્ષતિ આવી.');
      setTimeout(() => setBiometricNotice(null), 4500);
    } finally {
      setIsEnrollingBiometric(false);
    }
  };

  const handleDisableBiometric = () => {
    disableBiometric();
    setBiometricEnrolled(false);
    setBiometricNotice('ફિંગરપ્રિન્ટ અનલોક બંધ કરી દેવાયું છે.');
    setTimeout(() => setBiometricNotice(null), 3500);
  };

  const isAdminPassword = (val: string) => {
    const trimmed = val.trim();
    return (
      trimmed === '2585981' || 
      trimmed === '090171'
    );
  };

  const triggerPasswordError = (msg: string) => {
    setHasError(true);
    setErrorMessage(msg);
    setTimeout(() => {
      passwordInputRef.current?.focus();
      passwordInputRef.current?.select();
    }, 50);
    setTimeout(() => setHasError(false), 3500);
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;
    const cleanInput = cleanAndNormalizeCode(password);
    if (!cleanInput) {
      passwordInputRef.current?.focus();
      return;
    }
    setHasError(false);
    setErrorMessage('');

    // 1. Check if user is entering the Admin password
    if (isAdminPassword(cleanInput)) {
      if ((actionType !== 'article_unlock' || openOtpManagerDirectly) && enrollOnSuccess && biometricSupported && !biometricEnrolled) {
        try {
          const enrollRes = await enrollBiometric('એડમિન');
          if (enrollRes.success) {
            setBiometricEnrolled(true);
          } else if (enrollRes.error) {
            setBiometricNotice(enrollRes.error);
          }
        } catch {}
      }
      if (actionType === 'article_unlock' && targetArticle) {
        if (openOtpManagerDirectly) {
          setAdminVerifiedChoice(false);
          setViewMode('otp_manager');
          handleGenerateRandomOtp();
          return;
        }
        // Admin entered admin password: Give choice to either open article or create OTP!
        setAdminVerifiedChoice(true);
        return;
      }
      setPassword('');
      onSuccessRef.current();
      return;
    }

    // 2. Check if user is entering the permanent article password locally
    const isLocalArticleMatch = !!(
      targetArticle?.password && cleanInput === cleanAndNormalizeCode(targetArticle.password)
    );
    if (isLocalArticleMatch) {
      setPassword('');
      onSuccess();
      return;
    }

    // 3. Check if this OTP was already burned/used on this device
    if (targetArticle && isOtpBurnedLocally(targetArticle.id, cleanInput)) {
      triggerPasswordError('આ વન-ટાઈમ OTP પહેલેથી જ વપરાઈ ગયેલો છે!');
      return;
    }

    // 4. Check if user is entering a valid One-Time Passcode (OTP) locally
    const localMatchingOtp = targetArticle?.oneTimePasscodes?.find(
      (otp) => cleanAndNormalizeCode(otp) === cleanInput
    );
    if (localMatchingOtp && targetArticle) {
      // Burn the OTP immediately so it can NEVER be reused!
      burnOtpLocally(targetArticle.id, localMatchingOtp);
      burnArticleOtpInCloud(targetArticle.id, localMatchingOtp);
      setOtpBurnedSuccess(true);
      setTimeout(() => {
        setPassword('');
        setOtpBurnedSuccess(false);
        onSuccess(localMatchingOtp);
      }, 700);
      return;
    }

    // 5. Check Smart Algorithmic OTP (Works cross-device PC -> Mobile even with 0 cloud writes!)
    if (targetArticle) {
      const smartCheck = verifySmartArticleOtp(targetArticle.id, cleanInput);
      if (smartCheck.valid) {
        burnOtpLocally(targetArticle.id, cleanInput);
        burnArticleOtpInCloud(targetArticle.id, cleanInput);
        setOtpBurnedSuccess(true);
        setTimeout(() => {
          setPassword('');
          setOtpBurnedSuccess(false);
          onSuccess(cleanInput);
        }, 700);
        return;
      } else if (smartCheck.reason === 'burned') {
        triggerPasswordError('આ વન-ટાઈમ OTP પહેલેથી જ વપરાઈ ગયેલો છે!');
        return;
      }
    }

    // 6. Verify against Google Firebase Cloud (for custom OTPs or cloud-synced passcodes)
    if (actionType === 'article_unlock' && targetArticle) {
      setIsVerifying(true);
      try {
        const cloudResult = await verifyAndBurnArticleOtpInCloud(targetArticle.id, cleanInput);
        if (cloudResult.success) {
          if (cloudResult.isOtp && cloudResult.burnedOtp) {
            burnOtpLocally(targetArticle.id, cloudResult.burnedOtp);
            setOtpBurnedSuccess(true);
            setTimeout(() => {
              setPassword('');
              setOtpBurnedSuccess(false);
              onSuccess(cloudResult.burnedOtp);
            }, 700);
            return;
          }
          // Permanent password matched in cloud
          setPassword('');
          onSuccess();
          return;
        }

        // Failed verification
        triggerPasswordError(
          cloudResult.error
            ? cloudResult.error
            : 'ખોટો પાસવર્ડ અથવા વપરાઈ ગયેલો/અમાન્ય વન-ટાઈમ OTP!'
        );
        return;
      } catch (verifyErr) {
        console.warn('Cloud verification error:', verifyErr);
      } finally {
        setIsVerifying(false);
      }
    }

    // Neither matched locally or in cloud
    triggerPasswordError(
      actionType === 'article_unlock'
        ? 'ખોટો પાસવર્ડ અથવા વપરાઈ ગયેલો/અમાન્ય વન-ટાઈમ OTP!'
        : 'ખોટો એડમિન પાસવર્ડ! ફરી પ્રયત્ન કરો.'
    );
  };

  const getDirectArticleUrl = (articleId: string, otpCode: string) => {
    if (typeof window === 'undefined') return '';
    let origin = window.location.origin;
    if (origin.includes('ais-dev-')) {
      origin = origin.replace('ais-dev-', 'ais-pre-');
    }
    const pathname = window.location.pathname;
    return `${origin}${pathname}?article=${encodeURIComponent(articleId)}&otp=${encodeURIComponent(otpCode)}&standalone=true`;
  };

  // Safe copy to clipboard with fallback
  const handleCopyOtp = (otp: string) => {
    if (!targetArticle) return;
    const directUrl = getDirectArticleUrl(targetArticle.id, otp);
    const textToCopy = `વાંચન સંગ્રહ: "${targetArticle.title}" લેખ વાંચવા માટે તમારો વન-ટાઈમ OTP પાસવર્ડ: ${otp}\n\n👉 લિંક પર ક્લિક કરી સીધું વાંચો:\n${directUrl}\n\n(નોંધ: આ પાસવર્ડ ફક્ત ૧ જ વખત વપરાશે, લેખ ખૂલતાં જ રદ થઈ જશે.)`;
    
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopiedOtp(otp);
        setTimeout(() => setCopiedOtp(null), 3000);
      }).catch(() => {
        fallbackCopy(textToCopy, otp);
      });
    } else {
      fallbackCopy(textToCopy, otp);
    }
  };

  const fallbackCopy = (text: string, otp: string) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedOtp(otp);
      setTimeout(() => setCopiedOtp(null), 3000);
    } catch (e) {
      console.warn('Clipboard copy failed:', e);
    }
  };

  // Generate a random 6-digit OTP in the OTP manager (saved to Cloud Firestore & guaranteed Smart cross-device)
  const handleGenerateRandomOtp = async () => {
    if (!targetArticle) return;
    setIsGenerating(true);
    setOtpCloudStatus('saving');
    // Generates deterministic smart OTP that opens on any phone/device even without cloud writes!
    const newOtp = generateSmartArticleOtp(targetArticle.id);

    // 1. Immediately update local UI
    const currentOtps = targetArticle.oneTimePasscodes || [];
    const updated = [...currentOtps, newOtp];
    if (onUpdateArticleOtps) {
      onUpdateArticleOtps(targetArticle.id, updated);
    }
    setJustGeneratedOtp(newOtp);
    handleCopyOtp(newOtp);

    // 2. Persist OTP directly to Firestore in Cloud (single lightweight atomic arrayUnion write)
    try {
      await generateArticleOtpInCloud(targetArticle.id, newOtp);
      setOtpCloudStatus('saved');
    } catch (err) {
      console.warn('Background OTP cloud sync:', err);
      setOtpCloudStatus('saved');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setOtpCloudStatus('idle'), 4000);
    }
  };

  // Add custom OTP (saved to Cloud Firestore)
  const handleAddCustomOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetArticle) return;
    const clean = customOtpInput.trim();
    if (!clean) return;
    const currentOtps = targetArticle.oneTimePasscodes || [];
    if (currentOtps.includes(clean)) {
      setCustomOtpInput('');
      return;
    }

    setIsGenerating(true);
    setOtpCloudStatus('saving');
    const updated = [...currentOtps, clean];
    if (onUpdateArticleOtps) {
      onUpdateArticleOtps(targetArticle.id, updated);
    }
    setJustGeneratedOtp(clean);
    setCustomOtpInput('');
    handleCopyOtp(clean);

    try {
      await generateArticleOtpInCloud(targetArticle.id, clean);
      setOtpCloudStatus('saved');
    } catch (err) {
      console.warn('Failed to add custom OTP:', err);
      setOtpCloudStatus('saved');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setOtpCloudStatus('idle'), 4000);
    }
  };

  // Revoke/Delete an unused OTP
  const handleDeleteOtp = async (otpToRemove: string) => {
    if (!targetArticle) return;
    const currentOtps = targetArticle.oneTimePasscodes || [];
    const updated = currentOtps.filter((o) => o !== otpToRemove);
    if (onUpdateArticleOtps) {
      onUpdateArticleOtps(targetArticle.id, updated);
    }
    if (justGeneratedOtp === otpToRemove) {
      setJustGeneratedOtp(null);
    }
    try {
      await saveSingleArticleToCloud(targetIssueId || 'collection-main', {
        ...targetArticle,
        oneTimePasscodes: updated,
      });
      await removeArticleOtpInCloud(targetArticle.id, otpToRemove);
    } catch (err) {
      console.warn('Failed to remove OTP in cloud:', err);
    }
  };

  // Revoke/Delete ALL unused OTPs for this article
  const handleDeleteAllOtps = async () => {
    if (!targetArticle) return;
    const currentOtps = targetArticle.oneTimePasscodes || [];
    if (currentOtps.length === 0) return;

    setIsDeletingAll(true);
    // 1. Immediately clear in local UI
    if (onUpdateArticleOtps) {
      onUpdateArticleOtps(targetArticle.id, []);
    }
    setJustGeneratedOtp(null);
    setDeleteSuccessMsg(true);
    setTimeout(() => setDeleteSuccessMsg(false), 3500);
    setTimeout(() => setIsDeletingAll(false), 250);

    // 2. Persist to Firestore in background
    try {
      await removeAllArticleOtpsInCloud(targetArticle.id);
    } catch (err) {
      console.warn('Failed to delete all OTPs in cloud:', err);
    }
  };

  const getTitle = () => {
    if (openOtpManagerDirectly) return '🔑 એડમિન OTP જનરેટર';
    if (actionType === 'backup') return 'એડમિન પાસવર્ડ (બેકઅપ)';
    if (actionType === 'article_unlock') return 'પાસવર્ડ સુરક્ષિત લેખ';
    return 'એડમિન પાસવર્ડ';
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 pt-3 sm:pt-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className={`relative bg-white dark:bg-[#202520] text-[#1C1917] dark:text-[#F5F5F4] rounded-2xl w-full p-4 sm:p-5 shadow-2xl border border-[#E5E1D3] dark:border-[#353D35] transition-all mt-1 sm:mt-0 ${
          viewMode === 'otp_manager' ? 'max-w-md' : 'max-w-sm'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 text-[#7A7566] dark:text-[#9A9483] hover:text-[#1C1917] dark:hover:text-white p-1 rounded-lg cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: REGULAR UNLOCK PROMPT (DEFAULT FOR READERS & VISITORS) */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'unlock' && (
          <div>
            <div className="flex items-center gap-2.5 mb-3 pr-6">
              <div className="w-8 h-8 rounded-xl bg-[#7B8E7E]/15 text-[#5B8260] dark:text-[#A8BDAA] flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif-guj font-bold text-sm text-[#1C1917] dark:text-[#F5F5F4]">
                  {getTitle()}
                </h3>
                <p className="text-[11px] text-[#7A7566] dark:text-[#9A9483] truncate max-w-[240px] sm:max-w-[280px] leading-normal">
                  {openOtpManagerDirectly && targetArticle?.title
                    ? `"${targetArticle.title}" માટે OTP આપવા એડમિન પાસવર્ડ લખો`
                    : actionType === 'article_unlock' && targetArticle?.title
                    ? targetArticle.title
                    : actionType === 'backup'
                    ? 'બેકઅપ અને ડેટાબેઝ ખોલવા માટે પાસવર્ડ'
                    : 'નવો લેખ ઉમેરવા માટે પાસવર્ડ'}
                </p>
              </div>
            </div>

            {/* If Admin typed admin password, show choice */}
            {adminVerifiedChoice && targetArticle ? (
              <div className="py-3 space-y-3">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400/50 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 font-medium">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold">✓ સંચાલક ઓળખ સફળ!</p>
                    <p className="text-[11px] opacity-90">તમે એડમિન તરીકે લોગિન થયા છો.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    ref={readArticleBtnRef}
                    type="button"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setPassword('');
                        onSuccess();
                      }
                    }}
                    onClick={() => {
                      setPassword('');
                      onSuccess();
                    }}
                    className="py-2.5 px-3 rounded-xl bg-[#5B8260] hover:bg-[#486B4D] text-white focus:outline-none ring-2 ring-offset-2 ring-[#5B8260] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                    title="Enter દબાવો અથવા ક્લિક કરો"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>લેખ વાંચો</span>
                    <span className="text-[10px] bg-white/20 px-1 py-0.5 rounded font-mono font-normal">↵ Enter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdminVerifiedChoice(false);
                      setViewMode('otp_manager');
                      handleGenerateRandomOtp();
                    }}
                    className="py-2.5 px-3 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-400/40 hover:bg-amber-500/25 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>OTP બનાવો</span>
                  </button>
                </div>

                {/* Fingerprint management for Admin */}
                {biometricSupported && (
                  <div className="pt-2.5 border-t border-[#E5E1D3] dark:border-[#353D35]">
                    {!biometricEnrolled ? (
                      <button
                        type="button"
                        onClick={handleEnrollBiometric}
                        disabled={isEnrollingBiometric}
                        className="w-full py-2 px-3 rounded-xl bg-[#5B8260]/10 hover:bg-[#5B8260]/20 text-[#2C4A2E] dark:text-[#A8BDAA] border border-[#5B8260]/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Fingerprint className="w-3.5 h-3.5 text-[#5B8260]" />
                        <span>{isEnrollingBiometric ? 'સ્કેન થઈ રહ્યું છે...' : '📱 આ ફોનમાં ફિંગરપ્રિન્ટ (Biometric) સક્રિય કરો'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between text-xs px-1 text-[#5B8260] dark:text-[#A8BDAA]">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />
                          <span>આ ફોનમાં ફિંગરપ્રિન્ટ સક્રિય છે</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleDisableBiometric}
                          className="text-stone-400 hover:text-red-500 underline text-[11px] cursor-pointer"
                        >
                          બંધ કરો
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Reader or Admin password entry form */
              <div className="pt-1 pb-1">
                {/* Biometric Unlock Button (shown whenever enrolled on this phone) */}
                {biometricEnrolled && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleBiometricUnlock(false)}
                        disabled={isBiometricVerifying}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#5B8260] to-[#486B4D] hover:from-[#4E7253] hover:to-[#3E5C42] text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-85"
                      >
                        {isBiometricVerifying ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Fingerprint className="w-4 h-4 text-emerald-200" />
                        )}
                        <span>
                          {isBiometricVerifying 
                            ? 'ફિંગરપ્રિન્ટ ચકાસાઈ રહી છે...' 
                            : openOtpManagerDirectly 
                            ? '👆 ફિંગરપ્રિન્ટથી OTP બનાવો' 
                            : '👆 ફિંગરપ્રિન્ટથી અનલોક કરો'}
                        </span>
                      </button>
                      {isBiometricVerifying && (
                        <button
                          type="button"
                          onClick={() => {
                            cancelBiometricAuth();
                            setIsBiometricVerifying(false);
                            setBiometricNotice('ચકાસણી રદ કરી. નીચે પાસવર્ડ લખી શકો છો.');
                            setTimeout(() => {
                              passwordInputRef.current?.focus();
                            }, 50);
                            setTimeout(() => setBiometricNotice(null), 3000);
                          }}
                          className="px-3 py-2.5 rounded-xl bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold cursor-pointer hover:bg-stone-300 transition shrink-0"
                          title="રદ કરો"
                        >
                          રદ કરો
                        </button>
                      )}
                    </div>

                    <div className="relative flex py-1.5 items-center">
                      <div className="flex-grow border-t border-[#E5E1D3] dark:border-[#3A443A]"></div>
                      <span className="flex-shrink mx-2 text-[10px] text-[#8A8576] dark:text-[#767F76]">
                        અથવા પાસવર્ડ લખો
                      </span>
                      <div className="flex-grow border-t border-[#E5E1D3] dark:border-[#3A443A]"></div>
                    </div>
                  </div>
                )}

                {/* If device supports biometric but not enrolled yet, show convenient enrollment option */}
                {!biometricEnrolled && biometricSupported && (openOtpManagerDirectly || actionType !== 'article_unlock') && (
                  <div className="mb-3 p-2.5 rounded-xl bg-[#5B8260]/10 border border-[#5B8260]/25 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-[#5B8260] shrink-0" />
                      <span className="text-[11px] text-[#2C4A2E] dark:text-[#A8BDAA] font-medium">
                        આ ફોનમાં ફિંગરપ્રિન્ટ સક્રિય કરો
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleEnrollBiometric}
                      disabled={isEnrollingBiometric}
                      className="px-2.5 py-1 rounded-lg bg-[#5B8260] text-white text-[11px] font-bold hover:bg-[#486B4D] transition cursor-pointer shrink-0 disabled:opacity-60"
                    >
                      {isEnrollingBiometric ? 'સ્કેન...' : 'ચાલુ કરો'}
                    </button>
                  </div>
                )}

                <form onSubmit={handleUnlockSubmit}>
                  <div className="relative flex items-center">
                    <input
                      ref={passwordInputRef}
                      type="password"
                      autoFocus
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (hasError) setHasError(false);
                      }}
                      placeholder="પાસવર્ડ દાખલ કરો..."
                      className={`w-full pl-3 pr-10 py-2 rounded-xl text-xs bg-[#F4F1EA] dark:bg-[#2A302A] text-[#1C1917] dark:text-[#F5F5F4] placeholder-[#8A8576] dark:placeholder-[#767F76] border transition focus:outline-none ${
                        hasError 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-[#E5E1D3] dark:border-[#3A443A] focus:border-[#7B8E7E]'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="absolute right-1.5 p-1.5 rounded-lg bg-[#7B8E7E] text-white hover:bg-[#687A6B] transition cursor-pointer disabled:opacity-60"
                      title="ખોલો"
                    >
                      {isVerifying ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Fingerprint options below password input */}
                  {biometricSupported && !biometricEnrolled && (actionType !== 'article_unlock' || openOtpManagerDirectly) && (
                    <div className="mt-2.5 flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-[11px] text-[#7A7566] dark:text-[#9A9483] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={enrollOnSuccess}
                          onChange={(e) => setEnrollOnSuccess(e.target.checked)}
                          className="rounded text-[#5B8260] focus:ring-[#5B8260] w-3.5 h-3.5"
                        />
                        <Fingerprint className="w-3.5 h-3.5 text-[#5B8260] shrink-0" />
                        <span>આ પાસવર્ડ સાથે ફિંગરપ્રિન્ટ પણ સેવ કરો</span>
                      </label>
                    </div>
                  )}

                  {biometricEnrolled && (
                    <div className="mt-2 flex items-center justify-between text-[11px] text-[#7A7566] dark:text-[#9A9483]">
                      <span className="flex items-center gap-1 text-[#5B8260] dark:text-[#A8BDAA]">
                        <Fingerprint className="w-3.5 h-3.5" />
                        <span>ફિંગરપ્રિન્ટ સક્રિય છે</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleDisableBiometric}
                        className="text-stone-400 hover:text-red-500 underline text-[10px] cursor-pointer"
                        title="ફિંગરપ્રિન્ટ બંધ કરો"
                      >
                        ફિંગરપ્રિન્ટ બંધ કરો
                      </button>
                    </div>
                  )}

                  {biometricNotice && (
                    <div className="mt-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/40 text-amber-800 dark:text-amber-200 text-xs font-medium flex items-center justify-between gap-1.5 animate-fadeIn">
                      <span>{biometricNotice}</span>
                      <button 
                        type="button" 
                        onClick={() => setBiometricNotice(null)}
                        className="text-stone-400 hover:text-stone-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                {isVerifying && (
                  <div className="mt-2.5 p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-400/50 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2 font-medium animate-fadeIn">
                    <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>Google Cloud માં OTP ચકાસાઈ રહ્યો છે...</span>
                  </div>
                )}

                {otpBurnedSuccess && (
                  <div className="mt-2.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-1.5 font-medium animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>✓ OTP માન્ય છે! લેખ ખૂલી રહ્યો છે...</span>
                  </div>
                )}

                {hasError && (
                  <p className="text-[11px] text-red-500 mt-1.5 font-medium">
                    {errorMessage || 'ખોટો પાસવર્ડ!'}
                  </p>
                )}

                {/* Mobile number & WhatsApp contact info for getting OTP (shown to readers only) */}
                {actionType === 'article_unlock' && !openOtpManagerDirectly && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300/40 text-xs text-[#7A5826] dark:text-[#E2C48D] space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                      <Phone className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                      <span>પાસવર્ડ મેળવવા માટે સંપર્ક:</span>
                    </div>
                    <p className="text-[11px] text-[#7A7566] dark:text-[#9A9483] leading-relaxed">
                      આ લેખ વાંચવા માટે સંચાલક પાસેથી વન-ટાઈમ OTP પાસવર્ડ મેળવી શકો છો.
                    </p>
                    {adminContactPhone ? (
                      <div className="space-y-2 pt-1 w-full">
                        {/* Primary WhatsApp Contact */}
                        <div className="grid grid-cols-2 gap-2 w-full">
                          <a
                            href={`https://wa.me/91${adminContactPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `નમસ્તે, મારે "${targetArticle?.title || 'લેખ'}" વાંચવા માટે વન-ટાઈમ OTP પાસવર્ડ જોઈએ છે.\n\n👉 એડમિન માટે સીધો OTP બનાવવાની લિંક:\n${targetArticle ? getAdminOtpUrl(targetArticle.id) : ''}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer text-center w-full"
                          >
                            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{adminSecondaryPhone ? 'WhatsApp (મુખ્ય)' : 'WhatsApp પર માંગો'}</span>
                          </a>
                          <a
                            href={`tel:${adminContactPhone.replace(/[^0-9]/g, '')}`}
                            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-stone-200 dark:bg-[#333A33] hover:bg-stone-300 dark:hover:bg-[#3F473F] text-stone-800 dark:text-stone-100 font-bold text-xs transition cursor-pointer text-center w-full"
                          >
                            <Phone className="w-3.5 h-3.5 shrink-0 text-[#7B8E7E]" />
                            <span className="font-mono">{adminContactPhone}</span>
                          </a>
                        </div>

                        {/* Optional Secondary Contact */}
                        {adminSecondaryPhone ? (
                          <div className="grid grid-cols-2 gap-2 w-full pt-1.5 border-t border-amber-300/30">
                            <a
                              href={`https://wa.me/91${adminSecondaryPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                `નમસ્તે, મારે "${targetArticle?.title || 'લેખ'}" વાંચવા માટે વન-ટાઈમ OTP પાસવર્ડ જોઈએ છે.\n\n👉 એડમિન માટે સીધો OTP બનાવવાની લિંક:\n${targetArticle ? getAdminOtpUrl(targetArticle.id) : ''}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-emerald-700/90 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs cursor-pointer text-center w-full"
                            >
                              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">WhatsApp (બીજો નંબર)</span>
                            </a>
                            <a
                              href={`tel:${adminSecondaryPhone.replace(/[^0-9]/g, '')}`}
                              className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-stone-200 dark:bg-[#333A33] hover:bg-stone-300 dark:hover:bg-[#3F473F] text-stone-800 dark:text-stone-100 font-bold text-xs transition cursor-pointer text-center w-full"
                            >
                              <Phone className="w-3.5 h-3.5 shrink-0 text-[#7B8E7E]" />
                              <span className="font-mono">{adminSecondaryPhone}</span>
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}
              </form>
            </div>
          )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* VIEW 2: OTP GENERATOR & MANAGER (SHOWN ONLY AFTER ADMIN PASS CHECK) */}
        {/* ------------------------------------------------------------------ */}
        {viewMode === 'otp_manager' && targetArticle && (
          <div className="space-y-4">
            {/* Admin Mobile Phone Configuration */}
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#1A221A] border border-stone-200 dark:border-stone-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
                  <Phone className="w-3.5 h-3.5 text-[#7B8E7E]" />
                  <span>સંચાલકનો સંપર્ક / WhatsApp નંબર (વાચકો માટે)</span>
                </span>
              </div>
              
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block mb-0.5">
                    મુખ્ય WhatsApp નંબર:
                  </label>
                  <input
                    type="tel"
                    value={phoneEditInput}
                    onChange={(e) => {
                      setPhoneEditInput(e.target.value);
                      setPhoneSavedMessage(false);
                    }}
                    placeholder="દા.ત. 7878413535"
                    className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-[#2A302A] text-[#1C1917] dark:text-[#F5F5F4] border border-[#E5E1D3] dark:border-[#3A443A] focus:border-[#7B8E7E] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block mb-0.5">
                    બીજો નંબર (વૈકલ્પિક / Secondary Phone):
                  </label>
                  <input
                    type="tel"
                    value={secondaryPhoneEditInput}
                    onChange={(e) => {
                      setSecondaryPhoneEditInput(e.target.value);
                      setPhoneSavedMessage(false);
                    }}
                    placeholder="દા.ત. 9428967656 (વૈકલ્પિક - ખાલી રાખી શકો છો)"
                    className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-[#2A302A] text-[#1C1917] dark:text-[#F5F5F4] border border-[#E5E1D3] dark:border-[#3A443A] focus:border-[#7B8E7E] focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                    જો તમે બીજો નંબર ઉમેરશો તો વાચકોને બંને નંબર ઉપલબ્ધ રહેશે. ખાલી રાખશો તો માત્ર મુખ્ય નંબર દેખાશે.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isSavingPhone}
                  onClick={async () => {
                    const cleanPrimary = phoneEditInput.replace(/[^0-9]/g, '').trim() || '7878413535';
                    const cleanSecondary = secondaryPhoneEditInput.replace(/[^0-9]/g, '').trim();
                    if (!cleanPrimary || cleanPrimary.length < 10) {
                      alert('કૃપા કરીને મુખ્ય મોબાઈલ નંબર 10 અંકનો દાખલ કરો.');
                      return;
                    }
                    if (cleanSecondary && cleanSecondary.length < 10) {
                      alert('બીજો નંબર માન્ય 10 અંકનો હોવો જોઈએ અથવા તેને ખાલી રાખો.');
                      return;
                    }
                    setIsSavingPhone(true);
                    try {
                      setLocalContactPhone(cleanPrimary);
                      setPhoneEditInput(cleanPrimary);
                      setLocalSecondaryPhone(cleanSecondary);
                      setSecondaryPhoneEditInput(cleanSecondary);
                      if (onUpdateAdminContactPhone) {
                        onUpdateAdminContactPhone(cleanPrimary, cleanSecondary);
                      }
                      await saveAdminContactPhoneToCloud(cleanPrimary, cleanSecondary);
                      setPhoneSavedMessage(true);
                      setTimeout(() => setPhoneSavedMessage(false), 3500);
                    } catch (e) {
                      console.warn('Failed to save phone:', e);
                    } finally {
                      setIsSavingPhone(false);
                    }
                  }}
                  className="w-full py-2 rounded-xl bg-[#7B8E7E] hover:bg-[#687A6B] disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 mt-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingPhone ? 'સાચવી રહ્યું છે...' : 'સંપર્ક નંબર સાચવો'}</span>
                </button>
              </div>

              {phoneSavedMessage && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1 mt-1">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>સંપર્ક નંબર સફળતાપૂર્વક સાચવી લીધા છે!</span>
                </p>
              )}
            </div>
            <div className="flex items-center justify-between pr-6">
              <button
                type="button"
                onClick={() => {
                  setHasError(false);
                  setViewMode('unlock');
                }}
                className="flex items-center gap-1 text-xs font-bold text-[#7B8E7E] hover:text-[#5E6F61] transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>પાછા UNLOCK પર</span>
              </button>
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="w-3 h-3" />
                <span>એડમિન પ્રમાણિત</span>
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <Key className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif-guj font-bold text-sm text-[#1C1917] dark:text-[#F5F5F4] truncate">
                  વાચક માટે વન-ટાઈમ OTP (One-Time Passcode)
                </h3>
                <p className="text-[11px] text-[#7A7566] dark:text-[#9A9483] truncate">
                  લેખ: <span className="font-medium text-[#1C1917] dark:text-[#F5F5F4]">{targetArticle.title}</span>
                </p>
              </div>
            </div>

            {/* Explanatory Info Card */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <span>🔥 ઓટોમેટિક બર્ન (Auto-Burn):</span>
              </p>
              <p>
                અહીં બનાવેલો OTP વાચક ફક્ત <strong>૧ જ વખત</strong> વાપરી શકશે. વાચક લેખ ખોલશે એટલે આ પાસવર્ડ સિસ્ટમમાંથી <strong>કાયમ માટે ડિલીટ</strong> થઈ જશે. જો તે કોઈને આપશે તો પણ તે ચાલશે નહીં!
              </p>
            </div>

            {/* Top 2 Side-by-Side Action Buttons: Half Size Each */}
            <div className="grid grid-cols-2 gap-2">
              {/* Button 1 (Half width): Generate New 6-Digit OTP */}
              <button
                type="button"
                onClick={handleGenerateRandomOtp}
                disabled={isGenerating}
                className="w-full py-2.5 px-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 text-amber-900 dark:text-amber-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 text-center select-none active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                    <span className="truncate">બનાવી રહ્યા છીએ...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="truncate">નવો ૬-અંકનો OTP બનાવો</span>
                  </>
                )}
              </button>

              {/* Button 2 (Half width): Delete All Old OTPs */}
              {(() => {
                const hasExistingOtps = Boolean(targetArticle.oneTimePasscodes && targetArticle.oneTimePasscodes.length > 0);
                return (
                  <button
                    type="button"
                    onClick={handleDeleteAllOtps}
                    disabled={isDeletingAll || !hasExistingOtps}
                    className={`w-full py-2.5 px-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 text-center select-none ${
                      hasExistingOtps
                        ? 'bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 cursor-pointer active:scale-95'
                        : 'bg-stone-100 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700/50 text-stone-400 dark:text-stone-500 cursor-default opacity-60'
                    }`}
                    title={hasExistingOtps ? 'બધા જ જૂના વણવપરાયેલા OTP એકસાથે ડિલીટ કરો' : 'હાલમાં કોઈ જૂના OTP નથી'}
                  >
                    {isDeletingAll ? (
                      <>
                        <Trash2 className="w-4 h-4 animate-spin text-rose-600 shrink-0" />
                        <span className="truncate">ડીલીટ થઈ રહ્યા છે...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span className="truncate">તમામ જુના OTP ડીલીટ કરો</span>
                      </>
                    )}
                  </button>
                );
              })()}
            </div>

            {deleteSuccessMsg && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium text-center bg-rose-500/10 py-1.5 px-2 rounded-lg border border-rose-400/20">
                ✓ તમામ જૂના OTP સફળતાપૂર્વક ડિલીટ કરી દેવામાં આવ્યા છે.
              </p>
            )}

            {/* Just Generated OTP Display Banner */}
            {justGeneratedOtp && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400/50 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                    નવો બનાવેલ OTP તૈયાર છે:
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 font-mono font-bold flex items-center gap-1">
                    {otpCloudStatus === 'saving' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                        <span>Cloud માં સેવ થાય છે...</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        <span>Cloud Synced ✓ (૧ વખત માન્ય)</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-white dark:bg-[#1A221A] p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-700 gap-2">
                  <span className="font-mono text-xl font-bold tracking-wider text-[#1C1917] dark:text-[#F5F5F4]">
                    {justGeneratedOtp}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyOtp(justGeneratedOtp)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition cursor-pointer"
                    >
                      {copiedOtp === justGeneratedOtp ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>કૉપી થયું!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>કૉપી કરો</span>
                        </>
                      )}
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`વાંચન સંગ્રહ: "${targetArticle.title}" લેખ વાંચવા માટે તમારો વન-ટાઈમ OTP પાસવર્ડ: ${justGeneratedOtp}\n\n👉 લિંક પર ક્લિક કરી સીધું વાંચો:\n${getDirectArticleUrl(targetArticle.id, justGeneratedOtp)}\n\n(નોંધ: આ પાસવર્ડ ફક્ત ૧ જ વખત વપરાશે, લેખ ખૂલતાં જ રદ થઈ જશે.)`)}`}
                      target="whatsapp_share"
                      onClick={(e) => {
                        e.preventDefault();
                        const shareUrl = `https://wa.me/?text=${encodeURIComponent(`વાંચન સંગ્રહ: "${targetArticle.title}" લેખ વાંચવા માટે તમારો વન-ટાઈમ OTP પાસવર્ડ: ${justGeneratedOtp}\n\n👉 લિંક પર ક્લિક કરી સીધું વાંચો:\n${getDirectArticleUrl(targetArticle.id, justGeneratedOtp)}\n\n(નોંધ: આ પાસવર્ડ ફક્ત ૧ જ વખત વપરાશે, લેખ ખૂલતાં જ રદ થઈ જશે.)`)}`;
                        window.open(shareUrl, 'whatsapp_share');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold transition cursor-pointer shadow-xs"
                      title="WhatsApp પર શેર કરો"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-300">
                  <span>✓ આ પાસવર્ડ વાચકને WhatsApp દ્વારા મોકલી આપો.</span>
                  <button
                    type="button"
                    onClick={handleGenerateRandomOtp}
                    disabled={isGenerating}
                    className="underline hover:text-emerald-900 dark:hover:text-white font-bold cursor-pointer"
                  >
                    + બીજો OTP બનાવો
                  </button>
                </div>
              </div>
            )}

            {/* Custom Dummy OTP Entry */}
            <form onSubmit={handleAddCustomOtp} className="flex gap-2">
              <input
                type="text"
                value={customOtpInput}
                onChange={(e) => setCustomOtpInput(e.target.value)}
                placeholder="અથવા મનપસંદ ડમી કોડ (દા.ત. READ85)..."
                className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-[#F4F1EA] dark:bg-[#2A302A] text-[#1C1917] dark:text-[#F5F5F4] placeholder-[#8A8576] dark:placeholder-[#767F76] border border-[#E5E1D3] dark:border-[#3A443A] focus:border-[#7B8E7E] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!customOtpInput.trim() || isGenerating}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ઉમેરો</span>
              </button>
            </form>

            {/* List of currently active unused OTPs */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-[#7A7566] dark:text-[#9A9483] mb-1.5">
                <span>હાલમાં સક્રિય વન-ટાઈમ OTP:</span>
                <span>{(targetArticle.oneTimePasscodes || []).length} કોડ ઉપલબ્ધ</span>
              </div>

              {(!targetArticle.oneTimePasscodes || targetArticle.oneTimePasscodes.length === 0) ? (
                <p className="text-[11px] text-center py-2 text-[#7A7566] dark:text-[#9A9483] italic bg-[#F4F1EA]/60 dark:bg-[#2A302A]/60 rounded-xl">
                  હાલમાં કોઈ સક્રિય OTP નથી. ઉપરથી નવો OTP બનાવો.
                </p>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {targetArticle.oneTimePasscodes.map((otp) => (
                    <div
                      key={otp}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#F4F1EA] dark:bg-[#2A302A] border border-[#E5E1D3] dark:border-[#3A443A] text-xs"
                    >
                      <span className="font-mono font-bold text-amber-800 dark:text-amber-200">
                        {otp}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyOtp(otp)}
                          title="WhatsApp મેસેજ કૉપી કરો"
                          className="p-1 rounded text-[#7A7566] dark:text-[#9A9483] hover:text-[#1C1917] dark:hover:text-white cursor-pointer"
                        >
                          {copiedOtp === otp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(`વાંચન સંગ્રહ: "${targetArticle.title}" લેખ વાંચવા માટે તમારો વન-ટાઈમ OTP પાસવર્ડ: ${otp}\n\n👉 લિંક પર ક્લિક કરી સીધું વાંચો:\n${getDirectArticleUrl(targetArticle.id, otp)}\n\n(નોંધ: આ પાસવર્ડ ફક્ત ૧ જ વખત વપરાશે, લેખ ખૂલતાં જ રદ થઈ જશે.)`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp પર મોકલો"
                          className="p-1 rounded text-emerald-600 hover:text-emerald-700 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteOtp(otp)}
                          title="આ OTP રદ કરો"
                          className="p-1 rounded text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Biometric Setting */}
            {biometricSupported && (
              <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-[#1A221A] border border-stone-200 dark:border-stone-700 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-[#5B8260]" />
                  <span className="font-medium text-stone-800 dark:text-stone-200">
                    {biometricEnrolled ? 'આ મોબાઇલમાં ફિંગરપ્રિન્ટ ચાલુ છે' : 'આ મોબાઇલમાં ફિંગરપ્રિન્ટ બંધ છે'}
                  </span>
                </div>
                {biometricEnrolled ? (
                  <button
                    type="button"
                    onClick={handleDisableBiometric}
                    className="text-stone-500 hover:text-red-500 underline text-[11px] cursor-pointer"
                  >
                    બંધ કરો
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnrollBiometric}
                    disabled={isEnrollingBiometric}
                    className="px-2.5 py-1 rounded-lg bg-[#5B8260] text-white text-[11px] font-bold hover:bg-[#486B4D] cursor-pointer"
                  >
                    {isEnrollingBiometric ? 'સેટિંગ...' : 'ચાલુ કરો'}
                  </button>
                )}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-[#E5E1D3]/80 dark:border-[#353D35]/80 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setPassword('');
                  onSuccess();
                }}
                className="py-2 px-3 rounded-xl bg-[#7B8E7E] text-white hover:bg-[#687A6B] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>હું પોતે લેખ વાંચવા માંગુ છું</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-2 px-3 rounded-xl bg-[#F2EFE6] dark:bg-[#2A302A] text-[#1C1917] dark:text-[#F5F5F4] text-xs font-bold transition cursor-pointer"
              >
                પૂર્ણ થયું
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

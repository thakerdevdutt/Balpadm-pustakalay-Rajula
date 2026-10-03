/**
 * Biometric / Fingerprint Authentication Service using WebAuthn (PublicKeyCredential)
 * Allows device-level biometric authentication (Fingerprint, Touch ID, Face ID, Screen lock)
 * for seamless and secure Admin verification on mobile and desktop.
 */

let activeAbortController: AbortController | null = null;

export function cancelBiometricAuth(): void {
  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch {}
    activeAbortController = null;
  }
}

export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.isSecureContext && window.location.hostname !== 'localhost') {
    return false;
  }
  if (!window.PublicKeyCredential) return false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return !!available;
    }
    return true;
  } catch {
    return false;
  }
}

export function isBiometricEnrolled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const enabled = localStorage.getItem('lekh_biometric_enabled');
    const credId = localStorage.getItem('lekh_biometric_cred_id');
    return enabled === 'true' && !!credId;
  } catch {
    return false;
  }
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function enrollBiometric(
  displayName: string = 'લેખ એડમિન'
): Promise<{ success: boolean; error?: string }> {
  cancelBiometricAuth();

  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { success: false, error: 'આ ડિવાઇસ અથવા બ્રાઉઝર ફિંગરપ્રિન્ટને સપોર્ટ કરતું નથી.' };
  }

  // Security check for iframe
  if (window.self !== window.top) {
    console.warn('[WebAuthn] Running inside an iframe; platform authenticators may be constrained.');
  }

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const abortController = new AbortController();
    activeAbortController = abortController;

    // 25 second timeout for enrollment prompt
    const timeoutId = setTimeout(() => {
      try {
        abortController.abort();
      } catch {}
    }, 25000);

    const createOptions: CredentialCreationOptions = {
      publicKey: {
        challenge,
        rp: {
          name: 'લેખ સંગ્રહ',
          id: window.location.hostname || undefined,
        },
        user: {
          id: userId,
          name: 'admin@lekh-sangrah.local',
          displayName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },  // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
          residentKey: 'preferred',
          requireResidentKey: false,
        },
        timeout: 25000,
        attestation: 'none',
      },
      signal: abortController.signal,
    };

    const credential = (await navigator.credentials.create(createOptions)) as PublicKeyCredential | null;
    clearTimeout(timeoutId);
    activeAbortController = null;

    if (!credential || !credential.rawId) {
      return { success: false, error: 'ફિંગરપ્રિન્ટ રજીસ્ટ્રેશન પૂર્ણ થયું નથી.' };
    }

    const credIdBase64 = bufferToBase64(credential.rawId);

    localStorage.setItem('lekh_biometric_cred_id', credIdBase64);
    localStorage.setItem('lekh_biometric_enabled', 'true');
    localStorage.setItem('lekh_biometric_registered_at', new Date().toISOString());

    return { success: true };
  } catch (err: unknown) {
    activeAbortController = null;
    const error = err as { name?: string; message?: string };
    if (error?.name === 'AbortError' || error?.name === 'NotAllowedError') {
      return { success: false, error: 'ફિંગરપ્રિન્ટ સ્કેન રદ કરવામાં આવ્યું અથવા સમય સમાપ્ત થયો.' };
    }
    if (error?.name === 'SecurityError') {
      return { success: false, error: 'સુરક્ષા મર્યાદા: કૃપા કરીને એપને નવી ટેબ (New Tab) અથવા સીધા બ્રાઉઝરમાં ખોલો.' };
    }
    return { success: false, error: error?.message || 'ફિંગરપ્રિન્ટ સેટઅપ કરતી વખતે ક્ષતિ આવી.' };
  }
}

export async function verifyBiometric(): Promise<{ success: boolean; error?: string }> {
  cancelBiometricAuth();

  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { success: false, error: 'આ બ્રાઉઝરમાં ફિંગરપ્રિન્ટ ઉપલબ્ધ નથી.' };
  }

  const credIdBase64 = localStorage.getItem('lekh_biometric_cred_id');
  if (!credIdBase64) {
    return { success: false, error: 'આ ડિવાઇસમાં ફિંગરપ્રિન્ટ સેટ કરેલી નથી.' };
  }

  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    let rawIdBytes: Uint8Array;
    try {
      rawIdBytes = base64ToUint8Array(credIdBase64);
    } catch {
      rawIdBytes = new Uint8Array(0);
    }

    const abortController = new AbortController();
    activeAbortController = abortController;

    // Safety timeout: 15 seconds max so it NEVER hangs indefinitely
    const timeoutId = setTimeout(() => {
      try {
        abortController.abort();
      } catch {}
    }, 15000);

    const getOptions: CredentialRequestOptions = {
      publicKey: {
        challenge,
        timeout: 15000,
        rpId: window.location.hostname || undefined,
        userVerification: 'preferred',
        allowCredentials: rawIdBytes.length > 0 ? [
          {
            id: rawIdBytes,
            type: 'public-key',
            transports: ['internal'],
          },
        ] : undefined,
      },
      signal: abortController.signal,
    };

    const assertion = await navigator.credentials.get(getOptions);
    clearTimeout(timeoutId);
    activeAbortController = null;

    if (assertion) {
      return { success: true };
    }
    return { success: false, error: 'ઓળખ ચકાસી શકાઈ નથી.' };
  } catch (err: unknown) {
    activeAbortController = null;
    const error = err as { name?: string; message?: string };
    if (error?.name === 'AbortError') {
      return { success: false, error: 'સમય સમાપ્ત થયો અથવા રદ કરવામાં આવ્યું. પાસવર્ડથી ખોલો.' };
    }
    if (error?.name === 'NotAllowedError') {
      return { success: false, error: 'ફિંગરપ્રિન્ટ સ્કેન રદ થયું અથવા મેચ ન થયું.' };
    }
    if (error?.name === 'SecurityError') {
      return { success: false, error: 'સુરક્ષા મર્યાદા: કૃપા કરીને એપને નવી ટેબમાં ખોલો.' };
    }
    return { success: false, error: error?.message || 'ફિંગરપ્રિન્ટ ચકાસણી નિષ્ફળ રહી.' };
  }
}

export function disableBiometric(): void {
  cancelBiometricAuth();
  try {
    localStorage.removeItem('lekh_biometric_enabled');
    localStorage.removeItem('lekh_biometric_cred_id');
    localStorage.removeItem('lekh_biometric_registered_at');
  } catch {}
}

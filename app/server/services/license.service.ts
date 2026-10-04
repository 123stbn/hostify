import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_DIR } from '../utils/env.js';

// Official Hostify Ed25519 Public Key for cryptographic license verification
export const HOSTIFY_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEABSIxi/RwsI0PpuUQT1g5T6c5u6a7O5Q9QygeRlBcRXE=
-----END PUBLIC KEY-----`;

export const TRIAL_DURATION_DAYS = 14;
export const LICENSE_FILE_PATH = path.join(PROJECT_DIR, '.hostify_license');
export const STATE_FILE_PATH = path.join(PROJECT_DIR, '.hostify_state.json');

export interface LicensePayload {
  licenseId: string;
  licensee: string;
  tier: 'starter' | 'pro' | 'lifetime';
  validUntil?: string | null;
  issuedAt: string;
  features?: string[];
}

export interface LicenseStatus {
  status: 'licensed' | 'trial' | 'expired';
  isTrial: boolean;
  tier: string;
  licensee?: string;
  licenseId?: string;
  daysRemaining?: number;
  validUntil?: string | null;
  message?: string;
}

/**
 * Verifies an Ed25519 signed license key string.
 * Key format: HSTF_<base64Url_payload>.<base64Url_signature>
 */
export function verifyLicenseKey(rawKey: string): { valid: boolean; payload?: LicensePayload; error?: string } {
  if (!rawKey || typeof rawKey !== 'string') {
    return { valid: false, error: 'License key is missing or empty' };
  }

  let clean = rawKey.trim();
  if (clean.startsWith('HSTF_') || clean.startsWith('HSTF-')) {
    clean = clean.substring(5);
  }

  const parts = clean.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Invalid license format. Expected payload.signature structure.' };
  }

  const [payloadB64, signatureB64] = parts;

  try {
    const payloadBuf = Buffer.from(payloadB64, 'base64url');
    const signatureBuf = Buffer.from(signatureB64, 'base64url');

    const isVerified = crypto.verify(null, payloadBuf, HOSTIFY_PUBLIC_KEY, signatureBuf);
    if (!isVerified) {
      return { valid: false, error: 'Cryptographic signature verification failed. Invalid license key.' };
    }

    const payload: LicensePayload = JSON.parse(payloadBuf.toString('utf-8'));

    // Check expiration date if specified (null/undefined means lifetime)
    if (payload.validUntil) {
      const expirationDate = new Date(payload.validUntil).getTime();
      if (!isNaN(expirationDate) && Date.now() > expirationDate) {
        return { valid: false, payload, error: `License expired on ${payload.validUntil}` };
      }
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: `License decode error: ${err.message}` };
  }
}

/**
 * Returns or initializes the persistent appliance installation state.
 */
function getOrCreateApplianceState(): { trialStartedAt: string; instanceId: string } {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf-8'));
      if (data.trialStartedAt) return data;
    }
  } catch {}

  const newState = {
    trialStartedAt: new Date().toISOString(),
    instanceId: crypto.randomBytes(8).toString('hex')
  };

  try {
    if (!fs.existsSync(PROJECT_DIR)) fs.mkdirSync(PROJECT_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(newState, null, 2), 'utf-8');
  } catch {}

  return newState;
}

/**
 * Checks current license state: active license, active 14-day trial, or expired.
 */
export function getLicenseStatus(): LicenseStatus {
  // 1. Check for installed license key in file or environment variable
  let savedKey = process.env.HOSTIFY_LICENSE_KEY || '';
  if (!savedKey && fs.existsSync(LICENSE_FILE_PATH)) {
    try {
      savedKey = fs.readFileSync(LICENSE_FILE_PATH, 'utf-8').trim();
    } catch {}
  }

  if (savedKey) {
    const verification = verifyLicenseKey(savedKey);
    if (verification.valid && verification.payload) {
      return {
        status: 'licensed',
        isTrial: false,
        tier: verification.payload.tier || 'pro',
        licensee: verification.payload.licensee,
        licenseId: verification.payload.licenseId,
        validUntil: verification.payload.validUntil || null,
        message: 'License active and verified'
      };
    }
  }

  // 2. Fallback to 14-day Trial evaluation
  const state = getOrCreateApplianceState();
  const startTime = new Date(state.trialStartedAt).getTime();
  const elapsedMs = Date.now() - (isNaN(startTime) ? Date.now() : startTime);
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  const daysRemaining = Math.max(0, Math.ceil(TRIAL_DURATION_DAYS - elapsedDays));

  if (daysRemaining > 0) {
    return {
      status: 'trial',
      isTrial: true,
      tier: 'trial',
      daysRemaining,
      validUntil: new Date(startTime + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      message: `${daysRemaining} days remaining in trial`
    };
  }

  return {
    status: 'expired',
    isTrial: true,
    tier: 'trial',
    daysRemaining: 0,
    message: 'Trial period has expired. Please enter a license key to activate Hostify.'
  };
}

/**
 * Validates and permanently activates a license key.
 */
export function activateLicenseKey(rawKey: string): { success: boolean; message: string; status: LicenseStatus } {
  const result = verifyLicenseKey(rawKey);
  if (!result.valid || !result.payload) {
    return {
      success: false,
      message: result.error || 'Invalid license key',
      status: getLicenseStatus()
    };
  }

  try {
    if (!fs.existsSync(PROJECT_DIR)) fs.mkdirSync(PROJECT_DIR, { recursive: true });
    fs.writeFileSync(LICENSE_FILE_PATH, rawKey.trim(), 'utf-8');
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to save license: ${err.message}`,
      status: getLicenseStatus()
    };
  }

  return {
    success: true,
    message: `License activated successfully for ${result.payload.licensee} (${result.payload.tier})`,
    status: getLicenseStatus()
  };
}

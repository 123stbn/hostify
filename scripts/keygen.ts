#!/usr/bin/env tsx
// ==============================================================================
// HOSTIFY APPLIANCE - ED25519 KEYGEN & LICENSE ISSUER CLI
// ==============================================================================
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEYS_DIR = path.resolve(__dirname, 'keys');
const PRIV_KEY_PATH = path.join(KEYS_DIR, 'hostify_ed25519_private.pem');
const PUB_KEY_PATH = path.join(KEYS_DIR, 'hostify_ed25519_public.pem');

function generateKeys() {
  if (!fs.existsSync(KEYS_DIR)) fs.mkdirSync(KEYS_DIR, { recursive: true });
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

  fs.writeFileSync(PUB_KEY_PATH, pubPem, 'utf-8');
  fs.writeFileSync(PRIV_KEY_PATH, privPem, 'utf-8');

  console.log('✓ Successfully generated Ed25519 keypair in scripts/keys/');
  console.log('\n--- PUBLIC KEY (Embed in license.service.ts) ---\n' + pubPem);
}

function issueLicense(email: string, tier: 'starter' | 'pro' | 'lifetime' = 'lifetime', days?: number) {
  if (!fs.existsSync(PRIV_KEY_PATH)) {
    console.error('Error: Private key not found at scripts/keys/hostify_ed25519_private.pem. Run `init` first.');
    process.exit(1);
  }

  const privateKey = fs.readFileSync(PRIV_KEY_PATH, 'utf-8');
  const licenseId = `HSTF-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const now = new Date();

  let validUntil: string | null = null;
  if (days && days > 0) {
    validUntil = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  const payload = {
    licenseId,
    licensee: email,
    tier,
    validUntil,
    issuedAt: now.toISOString(),
    features: ['all']
  };

  const payloadBuf = Buffer.from(JSON.stringify(payload));
  const signatureBuf = crypto.sign(null, payloadBuf, privateKey);
  const licenseKey = `HSTF_${payloadBuf.toString('base64url')}.${signatureBuf.toString('base64url')}`;

  console.log('\n==================================================================');
  console.log('  HOSTIFY LICENSE ISSUED');
  console.log('==================================================================');
  console.log(`License ID:  ${licenseId}`);
  console.log(`Licensee:    ${email}`);
  console.log(`Tier:        ${tier}`);
  console.log(`Expires:     ${validUntil || 'Never (Lifetime)'}`);
  console.log('------------------------------------------------------------------');
  console.log('LICENSE KEY (Copy and send to customer):\n');
  console.log(licenseKey);
  console.log('==================================================================\n');
}

const args = process.argv.slice(2);
const command = args[0] || 'help';

switch (command) {
  case 'init':
    generateKeys();
    break;
  case 'issue': {
    const email = args[1] || 'customer@example.com';
    const tier = (args[2] as any) || 'lifetime';
    const days = args[3] ? parseInt(args[3], 10) : undefined;
    issueLicense(email, tier, days);
    break;
  }
  default:
    console.log(`
Hostify Ed25519 License CLI
Usage:
  pnpm tsx scripts/keygen.ts init
    Generate new public & private Ed25519 keypair

  pnpm tsx scripts/keygen.ts issue <email> [lifetime|pro|starter] [days]
    Issue a new cryptographically signed license key
    Examples:
      pnpm tsx scripts/keygen.ts issue user@example.com lifetime
      pnpm tsx scripts/keygen.ts issue user@example.com pro 365
`);
    break;
}

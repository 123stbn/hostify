import { Router, Request, Response, NextFunction } from 'express';
import { getLicenseStatus, activateLicenseKey } from '../services/license.service.js';

export const licenseRouter = Router();

/**
 * GET /api/license/status
 * Returns current license state (licensed, trial with days remaining, or expired)
 */
licenseRouter.get('/status', (_req: Request, res: Response) => {
  const status = getLicenseStatus();
  res.json(status);
});

/**
 * POST /api/license/activate
 * Validates and stores a new Ed25519 license key
 */
licenseRouter.post('/activate', (req: Request, res: Response) => {
  const { licenseKey } = req.body || {};
  if (!licenseKey) {
    return res.status(400).json({ error: 'License key is required' });
  }

  const result = activateLicenseKey(licenseKey);
  if (!result.success) {
    return res.status(400).json({ error: result.message, status: result.status });
  }

  res.json({ success: true, message: result.message, status: result.status });
});

/**
 * Middleware: Enforces that the appliance is either under an active trial or has a verified license.
 * Blocks sensitive setup, deploy, and container actions if expired.
 */
export function requireActiveLicenseOrTrial(_req: Request, res: Response, next: NextFunction) {
  const status = getLicenseStatus();
  if (status.status === 'expired') {
    return res.status(402).json({
      error: 'Hostify trial has expired. A valid license key is required to perform this action.',
      status
    });
  }
  next();
}

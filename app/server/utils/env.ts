import fs from 'node:fs';
import path from 'node:path';

// Ubicación del proyecto
export const PROJECT_DIR = process.env.COMPOSE_PROJECT_DIR || path.resolve(process.cwd(), '..');
export const ENV_FILE_PATH = path.join(PROJECT_DIR, '.env');
export const CONFIG_FLAG_PATH = path.join(PROJECT_DIR, '.hostify_configured.json');

/**
 * Lee y parsea el archivo .env a un registro clave-valor simple
 */
export function parseEnv(filePath: string = ENV_FILE_PATH): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
  }
  return result;
}

/**
 * Guarda las variables en el archivo .env formateado
 */
export function writeEnv(filePath: string = ENV_FILE_PATH, env: Record<string, string>): void {
  let content = '# ==============================================================================\n';
  content += '# HOSTIFY APPLIANCE - AUTO-GENERATED CONFIGURATION\n';
  content += '# ==============================================================================\n\n';
  for (const [key, value] of Object.entries(env)) {
    content += `${key}=${value}\n`;
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

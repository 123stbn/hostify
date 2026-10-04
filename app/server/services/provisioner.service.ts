import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PROJECT_DIR, parseEnv, ENV_FILE_PATH } from '../utils/env.js';
import { getHostAllowedAddresses } from './network.service.js';

import { resolveServiceTarget } from '../routes/proxy.routes.js';

/**
 * Parchea o inicializa el config.xml de una app *arr (Prowlarr / Lidarr)
 */
export function configureServarrXml(
  configPath: string,
  port: number,
  instanceName: string,
  allowedHostsStr: string,
  trustedNetworksStr: string,
  envKey: string,
  envData?: Record<string, string>,
  urlBase?: string
) {
  const patchXml = (xml: string): string => {
    let out = xml;
    const replacements: [RegExp, string][] = [
      [/<AuthenticationMethod>.*?<\/AuthenticationMethod>/i, '<AuthenticationMethod>Forms</AuthenticationMethod>'],
      [/<AuthenticationRequired>.*?<\/AuthenticationRequired>/i, '<AuthenticationRequired>DisabledForLocalAddresses</AuthenticationRequired>'],
      [/<AllowedHosts>.*?<\/AllowedHosts>/i, `<AllowedHosts>${allowedHostsStr}</AllowedHosts>`],
      [/<TrustedNetworks>.*?<\/TrustedNetworks>/i, `<TrustedNetworks>${trustedNetworksStr}</TrustedNetworks>`],
    ];
    if (urlBase !== undefined) {
      replacements.push([/<UrlBase>.*?<\/UrlBase>/i, `<UrlBase>${urlBase}</UrlBase>`]);
    }
    for (const [pattern, replacement] of replacements) {
      if (pattern.test(out)) {
        out = out.replace(pattern, replacement);
      } else {
        out = out.replace(/<\/Config>/i, `  ${replacement}\n</Config>`);
      }
    }
    return out;
  };

  if (fs.existsSync(configPath)) {
    let xml = fs.readFileSync(configPath, 'utf-8');
    xml = patchXml(xml);
    const match = xml.match(/<ApiKey>(.*?)<\/ApiKey>/i);
    if (match && match[1] && envData) {
      envData[envKey] = match[1];
    }
    fs.writeFileSync(configPath, xml, 'utf-8');
  } else {
    const apiKey = envData?.[envKey] || crypto.randomBytes(16).toString('hex');
    if (envData) envData[envKey] = apiKey;
    const xml = `<Config>\n  <BindAddress>*</BindAddress>\n  <Port>${port}</Port>\n  <EnableSsl>False</EnableSsl>\n  <ApiKey>${apiKey}</ApiKey>\n  <AuthenticationMethod>Forms</AuthenticationMethod>\n  <AuthenticationRequired>DisabledForLocalAddresses</AuthenticationRequired>\n  <AllowedHosts>${allowedHostsStr}</AllowedHosts>\n  <TrustedNetworks>${trustedNetworksStr}</TrustedNetworks>\n  <Branch>master</Branch>\n  <LogLevel>info</LogLevel>\n  <UrlBase>${urlBase || ''}</UrlBase>\n  <InstanceName>${instanceName}</InstanceName>\n  <UpdateMechanism>Docker</UpdateMechanism>\n</Config>\n`;
    fs.writeFileSync(configPath, xml, 'utf-8');
  }
}

/**
 * Auto-aprovisionar credenciales y configuración Zero-Config para qBittorrent, Prowlarr, Lidarr y Feishin
 */
export function autoConfigureIngestionServices(dockerData: string, musicRoot: string, envData?: Record<string, string>): void {
  try {
    // 1. qBittorrent Zero-Config
    const qbitDir = path.join(dockerData, 'qbittorrent', 'config', 'qBittorrent');
    const qbitIncomplete = path.join(dockerData, 'qbittorrent', 'incomplete');
    const torrentsCompleted = path.join(musicRoot, 'torrents');

    if (!fs.existsSync(qbitDir)) fs.mkdirSync(qbitDir, { recursive: true });
    if (!fs.existsSync(qbitIncomplete)) fs.mkdirSync(qbitIncomplete, { recursive: true });
    if (!fs.existsSync(torrentsCompleted)) fs.mkdirSync(torrentsCompleted, { recursive: true });

    const qbitConfPath = path.join(qbitDir, 'qBittorrent.conf');
    let qbitLines: string[] = [];
    if (fs.existsSync(qbitConfPath)) {
      qbitLines = fs.readFileSync(qbitConfPath, 'utf-8').split('\n');
    }

    const qbitKeys: Record<string, string> = {
      'WebUI\\Address': 'WebUI\\Address=*',
      'WebUI\\Port': 'WebUI\\Port=8080',
      'WebUI\\AuthSubnetWhitelist': 'WebUI\\AuthSubnetWhitelist=0.0.0.0/0, ::/0',
      'WebUI\\AuthSubnetWhitelistEnabled': 'WebUI\\AuthSubnetWhitelistEnabled=true',
      'WebUI\\LocalHostAuth': 'WebUI\\LocalHostAuth=false',
      'WebUI\\UseUPnP': 'WebUI\\UseUPnP=false',
      'WebUI\\ReverseProxySupportEnabled': 'WebUI\\ReverseProxySupportEnabled=true',
      'WebUI\\HostHeaderValidation': 'WebUI\\HostHeaderValidation=false',
      'WebUI\\CSRFProtection': 'WebUI\\CSRFProtection=false',
      'WebUI\\ClickjackingProtection': 'WebUI\\ClickjackingProtection=false',
      'WebUI\\TrustedReverseProxiesList': 'WebUI\\TrustedReverseProxiesList=0.0.0.0/0, ::/0',
      'Downloads\\SavePath': 'Downloads\\SavePath=/downloads/completed/',
      'Downloads\\TempPath': 'Downloads\\TempPath=/downloads/incomplete/',
      'Downloads\\TempPathEnabled': 'Downloads\\TempPathEnabled=true',
      'Connection\\PortRangeMin': 'Connection\\PortRangeMin=6881',
      'Connection\\UPnP': 'Connection\\UPnP=false',
    };

    let hasPreferences = false;
    let hasLegalNotice = false;
    const finalQbitLines: string[] = [];
    const seenKeys = new Set<string>();

    for (const line of qbitLines) {
      if (line.trim() === '[Preferences]') hasPreferences = true;
      if (line.trim() === '[LegalNotice]') hasLegalNotice = true;

      let matched = false;
      for (const [k, fullVal] of Object.entries(qbitKeys)) {
        if (line.startsWith(k + '=')) {
          finalQbitLines.push(fullVal);
          seenKeys.add(k);
          matched = true;
          break;
        }
      }
      if (!matched) finalQbitLines.push(line);
    }

    if (!hasLegalNotice) finalQbitLines.unshift('[LegalNotice]', 'Accepted=true', '');
    if (!hasPreferences) finalQbitLines.push('[Preferences]');

    const prefIdx = finalQbitLines.findIndex(l => l.trim() === '[Preferences]');
    for (const [k, fullVal] of Object.entries(qbitKeys)) {
      if (!seenKeys.has(k)) {
        finalQbitLines.splice(prefIdx + 1, 0, fullVal);
      }
    }
    fs.writeFileSync(qbitConfPath, finalQbitLines.join('\n').trim() + '\n', 'utf-8');

    // 2. Prowlarr & Lidarr Zero-Config
    const allowedHostsStr = getHostAllowedAddresses().join(',');
    const trustedNetworksStr = '172.16.0.0/12, 192.168.0.0/16, 10.0.0.0/8, 127.0.0.1/32, 100.64.0.0/10';

    const prowlarrDir = path.join(dockerData, 'prowlarr');
    if (!fs.existsSync(prowlarrDir)) fs.mkdirSync(prowlarrDir, { recursive: true });
    configureServarrXml(
      path.join(prowlarrDir, 'config.xml'),
      9696,
      'Prowlarr',
      allowedHostsStr,
      trustedNetworksStr,
      'PROWLARR_API_KEY',
      envData,
      '/tools/prowlarr'
    );

    const lidarrDir = path.join(dockerData, 'lidarr');
    if (!fs.existsSync(lidarrDir)) fs.mkdirSync(lidarrDir, { recursive: true });
    configureServarrXml(
      path.join(lidarrDir, 'config.xml'),
      8686,
      'Lidarr',
      allowedHostsStr,
      trustedNetworksStr,
      'LIDARR_API_KEY',
      envData,
      '/tools/lidarr'
    );

    // 3. Feishin Zero-Config (Garantizar template de settings.js en DOCKER_DATA)
    const feishinDataDir = path.join(dockerData, 'feishin');
    if (!fs.existsSync(feishinDataDir)) fs.mkdirSync(feishinDataDir, { recursive: true });
    const feishinTemplatePath = path.join(feishinDataDir, 'settings.js.template');

    // Sincronizar también con PROJECT_DIR si existe
    const feishinProjectDir = path.join(PROJECT_DIR, 'docker', 'feishin');
    if (!fs.existsSync(feishinProjectDir)) {
      try { fs.mkdirSync(feishinProjectDir, { recursive: true }); } catch {}
    }
    const projectTemplateFile = path.join(feishinProjectDir, 'settings.js.template');
    const bundledFeishinTemplate = path.join(process.cwd(), 'templates', 'feishin', 'settings.js.template');

    if (fs.existsSync(projectTemplateFile) && !fs.existsSync(feishinTemplatePath)) {
      try { fs.copyFileSync(projectTemplateFile, feishinTemplatePath); } catch {}
    } else if (fs.existsSync(bundledFeishinTemplate) && !fs.existsSync(feishinTemplatePath)) {
      try { fs.copyFileSync(bundledFeishinTemplate, feishinTemplatePath); } catch {}
    }

    if (!fs.existsSync(feishinTemplatePath)) {
      const templateContent = `"use strict";

(function() {
  var envUrl = "\${SERVER_URL}";
  var hostifyGatewayUrl = (typeof window !== "undefined" && window.location && window.location.origin) ? window.location.origin : "http://127.0.0.1:3500";

  if (!envUrl || envUrl.indexOf("hostify-navidrome") !== -1 || envUrl === "http://:4533" || envUrl === "") {
    window.SERVER_URL = hostifyGatewayUrl;
  } else {
    window.SERVER_URL = envUrl;
  }
})();

window.REMOTE_URL = "\${REMOTE_URL}";
window.SERVER_NAME = "\${SERVER_NAME:-Hostify}";
window.SERVER_TYPE = "navidrome";
window.SERVER_LOCK = "true";
window.LEGACY_AUTHENTICATION = "\${LEGACY_AUTHENTICATION}";
window.ANALYTICS_DISABLED = "\${ANALYTICS_DISABLED:-true}";
window.FS_GENERAL_THEME = "\${FS_GENERAL_THEME:-defaultDark}";

(function autoAuthHostify() {
  var adminUser = "\${NAVIDROME_ADMIN_USER}";
  var adminPass = "\${NAVIDROME_ADMIN_PASSWORD}";
  var serverUrl = window.SERVER_URL;
  var serverName = window.SERVER_NAME || "Hostify";

  if (!adminUser || !adminPass || !serverUrl) return;

  function tryAutoAuth() {
    try {
      var stored = localStorage.getItem("store_authentication");
      if (stored) {
        var parsed = JSON.parse(stored);
        var curr = parsed && parsed.state && parsed.state.currentServer;
        if (curr && curr.url === serverUrl && curr.username === adminUser && curr.credential) {
          return;
        }
      }

      var xhr = new XMLHttpRequest();
      xhr.open("POST", serverUrl + "/auth/login", false);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify({ username: adminUser, password: adminPass }));

      if (xhr.status === 200) {
        var res = JSON.parse(xhr.responseText);
        var serverId = "hostify-navidrome";
        var sItem = {
          id: serverId,
          name: serverName,
          type: "navidrome",
          url: serverUrl,
          remoteUrl: "",
          username: res.username || adminUser,
          userId: res.id || null,
          isAdmin: Boolean(res.isAdmin),
          credential: "u=" + (res.username || adminUser) + "&s=" + res.subsonicSalt + "&t=" + res.subsonicToken,
          ndCredential: res.token,
          savePassword: true
        };

        var deviceId = "hostify-" + Math.random().toString(36).substring(2, 9);
        if (stored) {
          try {
            var old = JSON.parse(stored);
            if (old && old.state && old.state.deviceId) deviceId = old.state.deviceId;
          } catch (e) {}
        }

        var newStore = {
          state: {
            currentServer: sItem,
            deviceId: deviceId,
            serverList: {}
          },
          version: 2
        };
        newStore.state.serverList[serverId] = sItem;
        localStorage.setItem("store_authentication", JSON.stringify(newStore));
      }
    } catch (err) {}
  }

  tryAutoAuth();
})();
`;
      fs.writeFileSync(feishinTemplatePath, templateContent, 'utf-8');
    }
  } catch (err: any) {
    console.error('Error auto-configurando qbittorrent/prowlarr/lidarr/feishin:', err.message);
  }
}

/**
 * Configurar indexadores públicos de música en Prowlarr, vincular Lidarr y qBittorrent vía API
 */
export async function ensureProwlarrLidarrSetup(dockerData: string, retry = 0): Promise<void> {
  const maxRetries = 15;
  try {
    const prowlarrXml = path.join(dockerData, 'prowlarr', 'config.xml');
    const lidarrXml = path.join(dockerData, 'lidarr', 'config.xml');
    if (!fs.existsSync(prowlarrXml) || !fs.existsSync(lidarrXml)) {
      if (retry < maxRetries) {
        setTimeout(() => ensureProwlarrLidarrSetup(dockerData, retry + 1), 3000);
      }
      return;
    }

    const pXml = fs.readFileSync(prowlarrXml, 'utf-8');
    const lXml = fs.readFileSync(lidarrXml, 'utf-8');
    const pKeyMatch = pXml.match(/<ApiKey>(.*?)<\/ApiKey>/i);
    const lKeyMatch = lXml.match(/<ApiKey>(.*?)<\/ApiKey>/i);

    if (!pKeyMatch || !lKeyMatch) {
      if (retry < maxRetries) {
        setTimeout(() => ensureProwlarrLidarrSetup(dockerData, retry + 1), 3000);
      }
      return;
    }

    const currentEnv = parseEnv(ENV_FILE_PATH);
    const adminUser = currentEnv.NAVIDROME_ADMIN_USER || '';
    const adminPass = currentEnv.NAVIDROME_ADMIN_PASSWORD || '';
    const adminLogin = adminUser && adminPass
      ? { username: adminUser, password: adminPass, passwordConfirmation: adminPass }
      : {};
    const allowedHostsList = getHostAllowedAddresses();
    const allowedHostsStr = allowedHostsList.join(',');
    const trustedNetworksStr = '172.16.0.0/12, 192.168.0.0/16, 10.0.0.0/8, 127.0.0.1/32, 100.64.0.0/10';

    const prowlarrApiKey = pKeyMatch[1];
    const lidarrApiKey = lKeyMatch[1];

    const prowlarrBase = `${resolveServiceTarget('prowlarr', 9696)}/tools/prowlarr`;
    const lidarrBase = `${resolveServiceTarget('lidarr', 8686)}/tools/lidarr`;

    // Verificar si Prowlarr responde
    const testRes = await fetch(`${prowlarrBase}/api/v1/system/status`, {
      headers: { 'X-Api-Key': prowlarrApiKey },
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);

    // Verificar si Lidarr responde
    const testLidarr = await fetch(`${lidarrBase}/api/v1/system/status`, {
      headers: { 'X-Api-Key': lidarrApiKey },
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);

    if (!testRes || testRes.status !== 200 || !testLidarr || testLidarr.status !== 200) {
      if (retry < maxRetries) {
        setTimeout(() => ensureProwlarrLidarrSetup(dockerData, retry + 1), 4000);
      }
      return;
    }

    console.log('[Hostify Provisioner] Prowlarr y Lidarr en línea. Verificando autenticación local y AllowedHosts...');

    // 0. Sincronizar configuración de Host (Forms + DisabledForLocalAddresses + AllowedHosts) vía API
    try {
      const pHostRes = await fetch(`${prowlarrBase}/api/v1/config/host`, {
        headers: { 'X-Api-Key': prowlarrApiKey },
        signal: AbortSignal.timeout(4000),
      });
      if (pHostRes.ok) {
        const pHostConfig = await pHostRes.json() as any;
        const currentAllowed = pHostConfig.allowedHosts || '';
        const missingAnyIp = allowedHostsList.some(ip => !currentAllowed.includes(ip));
        const authWrong = pHostConfig.authenticationMethod !== 'forms' || pHostConfig.authenticationRequired !== 'disabledForLocalAddresses';

        if (authWrong || missingAnyIp) {
          const updateRes = await fetch(`${prowlarrBase}/api/v1/config/host`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': prowlarrApiKey },
            body: JSON.stringify({
              ...pHostConfig,
              authenticationMethod: 'forms',
              authenticationRequired: 'disabledForLocalAddresses',
              ...adminLogin,
              allowedHosts: allowedHostsStr,
              trustedNetworks: trustedNetworksStr,
            }),
            signal: AbortSignal.timeout(4000),
          });
          if (updateRes.ok) {
            console.log('[Hostify Provisioner] Prowlarr host config actualizado correctamente.');
          }
        }
      }
    } catch (err: any) {
      console.warn('[Hostify Provisioner] Error configurando host en Prowlarr:', err.message);
    }

    try {
      const lHostRes = await fetch(`${lidarrBase}/api/v1/config/host`, {
        headers: { 'X-Api-Key': lidarrApiKey },
        signal: AbortSignal.timeout(4000),
      });
      if (lHostRes.ok) {
        const lHostConfig = await lHostRes.json() as any;
        const currentAllowed = lHostConfig.allowedHosts || '';
        const missingAnyIp = allowedHostsList.some(ip => !currentAllowed.includes(ip));
        const authWrong = lHostConfig.authenticationMethod !== 'forms' || lHostConfig.authenticationRequired !== 'disabledForLocalAddresses';

        if (authWrong || missingAnyIp) {
          const updateRes = await fetch(`${lidarrBase}/api/v1/config/host`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Api-Key': lidarrApiKey },
            body: JSON.stringify({
              ...lHostConfig,
              authenticationMethod: 'forms',
              authenticationRequired: 'disabledForLocalAddresses',
              ...adminLogin,
              allowedHosts: allowedHostsStr,
              trustedNetworks: trustedNetworksStr,
            }),
            signal: AbortSignal.timeout(4000),
          });
          if (updateRes.ok) {
            console.log('[Hostify Provisioner] Lidarr host config actualizado correctamente.');
          }
        }
      }
    } catch (err: any) {
      console.warn('[Hostify Provisioner] Error configurando host en Lidarr:', err.message);
    }

    // 1. Obtener indexadores existentes en Prowlarr
    const existingIndexersRes = await fetch(`${prowlarrBase}/api/v1/indexer`, {
      headers: { 'X-Api-Key': prowlarrApiKey }
    });
    const existingIndexers = (await existingIndexersRes.json()) as any[];

    // 2. Obtener esquema de indexadores disponibles en Prowlarr
    const schemaRes = await fetch(`${prowlarrBase}/api/v1/indexer/schema`, {
      headers: { 'X-Api-Key': prowlarrApiKey }
    });
    const schema = (await schemaRes.json()) as any[];

    // Indexadores públicos ideales para música (Audio / FLAC / MP3 / Discografías)
    const targetPublicDefs = ['thepiratebay', 'nyaasi', 'limetorrents'];

    for (const defName of targetPublicDefs) {
      const alreadyAdded = existingIndexers.some(i => i.definitionName === defName);
      if (!alreadyAdded) {
        const itemSchema = schema.find(s => s.definitionName === defName);
        if (itemSchema) {
          const itemPayload = { ...itemSchema, appProfileId: 1, enable: true };
          try {
            const addRes = await fetch(`${prowlarrBase}/api/v1/indexer`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': prowlarrApiKey,
              },
              body: JSON.stringify(itemPayload),
            });
            if (addRes.ok) {
              console.log(`[Hostify Provisioner] Indexador público '${defName}' agregado a Prowlarr con éxito.`);
            }
          } catch (err: any) {
            console.warn(`[Hostify Provisioner] Error agregando indexador ${defName}:`, err.message);
          }
        }
      }
    }

    // 3. Vincular Lidarr en Prowlarr (para sincronización bidireccional inmediata)
    const appsRes = await fetch(`${prowlarrBase}/api/v1/applications`, {
      headers: { 'X-Api-Key': prowlarrApiKey }
    });
    const existingApps = (await appsRes.json()) as any[];
    const lidarrLinked = existingApps.some(a => a.name === 'Lidarr' || a.implementation === 'Lidarr');

    if (!lidarrLinked) {
      const appSchemaRes = await fetch(`${prowlarrBase}/api/v1/applications/schema`, {
        headers: { 'X-Api-Key': prowlarrApiKey }
      });
      const appSchemas = (await appSchemaRes.json()) as any[];
      const lidarrSchema = appSchemas.find(a => a.name === 'Lidarr' || a.implementation === 'Lidarr');

      if (lidarrSchema) {
        const payload = {
          ...lidarrSchema,
          name: 'Lidarr',
          syncLevel: 'fullSync',
          enable: true,
          fields: lidarrSchema.fields.map((f: any) => {
            if (f.name === 'prowlarrUrl') return { ...f, value: 'http://hostify-prowlarr:9696/tools/prowlarr' };
            if (f.name === 'baseUrl') return { ...f, value: 'http://hostify-lidarr:8686/tools/lidarr' };
            if (f.name === 'apiKey') return { ...f, value: lidarrApiKey };
            return f;
          })
        };

        const linkRes = await fetch(`${prowlarrBase}/api/v1/applications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': prowlarrApiKey,
          },
          body: JSON.stringify(payload),
        });

        if (linkRes.ok) {
          console.log('[Hostify Provisioner] Lidarr conectado exitosamente como aplicación de Prowlarr.');
        }
      }
    }

    // 4. Vincular qBittorrent como cliente de descarga dentro de Lidarr
    const dlRes = await fetch(`${lidarrBase}/api/v1/downloadclient`, {
      headers: { 'X-Api-Key': lidarrApiKey }
    });
    const existingClients = (await dlRes.json()) as any[];
    const qbitLinked = existingClients.some(c => c.implementation === 'QBittorrent' || c.name === 'qBittorrent');

    if (!qbitLinked) {
      const dlSchemaRes = await fetch(`${lidarrBase}/api/v1/downloadclient/schema`, {
        headers: { 'X-Api-Key': lidarrApiKey }
      });
      const dlSchemas = (await dlSchemaRes.json()) as any[];
      const qbitSchema = dlSchemas.find(s => s.implementation === 'QBittorrent');

      if (qbitSchema) {
        const qbitPayload = {
          ...qbitSchema,
          name: 'qBittorrent',
          enable: true,
          fields: qbitSchema.fields.map((f: any) => {
            if (f.name === 'host') return { ...f, value: 'hostify-qbittorrent' };
            if (f.name === 'port') return { ...f, value: 8080 };
            return f;
          })
        };

        const addQbitRes = await fetch(`${lidarrBase}/api/v1/downloadclient`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': lidarrApiKey,
          },
          body: JSON.stringify(qbitPayload),
        });

        if (addQbitRes.ok) {
          console.log('[Hostify Provisioner] qBittorrent vinculado como cliente de descargas en Lidarr.');
        }
      }
    }

    // 5. Garantizar carpeta raíz /music en Lidarr
    const rootRes = await fetch(`${lidarrBase}/api/v1/rootfolder`, {
      headers: { 'X-Api-Key': lidarrApiKey }
    });
    const roots = (await rootRes.json()) as any[];
    if (!roots.some(r => r.path === '/music')) {
      await fetch(`${lidarrBase}/api/v1/rootfolder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': lidarrApiKey,
        },
        body: JSON.stringify({
          name: 'Music',
          path: '/music',
          defaultQualityProfileId: 1,
          defaultMetadataProfileId: 1,
        }),
      });
      console.log('[Hostify Provisioner] Carpeta raíz /music configurada en Lidarr.');
    }

  } catch (err: any) {
    console.warn('[Hostify Provisioner] Error en ensureProwlarrLidarrSetup:', err.message);
    if (retry < maxRetries) {
      setTimeout(() => ensureProwlarrLidarrSetup(dockerData, retry + 1), 4000);
    }
  }
}

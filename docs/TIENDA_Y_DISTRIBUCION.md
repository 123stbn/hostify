# Estrategia de Venta y Distribución de Hostify (Catálogo Alojado)

Este documento detalla las plataformas y recomendaciones para comercializar **Hostify** sin necesidad de programar ni mantener un sitio web o tienda en línea propia.

---

## 1. Comparativa de Plataformas con Catálogo Alojado

Se priorizan soluciones tipo **Merchant of Record (MoR)** y plataformas de productos digitales que ofrecen:
1. **Página pública de catálogo/producto** (escaparate listo para usar con fotos, video, descripción y botón de compra).
2. **Entrega automática de archivos** (scripts del instalador, `docker-compose.yml`, documentación).
3. **Distribución automática de claves de licencia** (lotes de claves Ed25519 pregeneradas).
4. **Cumplimiento legal y fiscal global** (gestión de impuestos como IVA de la UE o Sales Tax de EE. UU.).

| Plataforma | Catálogo Alojado | Entrega de Licencias | Comisión por Venta | Facilidad de Inicio |
| :--- | :--- | :--- | :--- | :--- |
| **Gumroad** *(Recomendada)* | `gumroad.com/tu_usuario` | Nativa (permite cargar lote de claves) | 10% plano + tarifa de procesamiento | ⭐⭐⭐⭐⭐ Inmediato |
| **Payhip** | `payhip.com/tu_tienda` | Específica para Software / Licencias | 5% (plan gratis) + tarifa de procesamiento | ⭐⭐⭐⭐⭐ Muy alto |
| **Itch.io** | `tu_usuario.itch.io` | Soporte de *External Keys* en lote | Flexible (desde 0% a 10% a elección) | ⭐⭐⭐⭐ Bueno para software técnico |
| **Ko-fi Shop** | `ko-fi.com/tu_usuario/shop` | Entrega de archivo descargable | 0% a 5% + pasarela | ⭐⭐⭐ Básico para licencias |

---

## 2. Recomendación Principal: Gumroad

### ¿Por qué Gumroad?
- **Sin infraestructura web**: Gumroad genera una página de presentación completa, optimizada para móviles y con soporte para capturas de pantalla, videos y reseñas.
- **Flujo de compra nativo**: El usuario ingresa su tarjeta, Apple Pay o PayPal en una ventana emergente limpia.
- **Pantalla de éxito inmediata**: Tras pagar, el cliente ve en pantalla:
  1. Su **Clave de Licencia (Token Ed25519)** para copiarla con un clic.
  2. El botón para descargar el paquete instalador (`hostify-setup.zip`).
- **Respaldo por correo electrónico**: Gumroad envía automáticamente el recibo con la clave de licencia y el link de descarga persistente.

---

## 3. Configuración del Producto en Gumroad

1. **Crear Producto**:
   - Tipo de producto: **Digital Product / Software**.
   - Nombre: `Hostify - Tu Centro Musical Autónomo (Self-Hosted)`.
   - Precio: Definir precio único (ej. `$29` o `$49` para licencia Lifetime).

2. **Entrega de Contenido (Content)**:
   - Subir el archivo comprimido `hostify-setup.zip` conteniendo:
     - `docker-compose.yml`
     - `.env.example`
     - `install.sh` / `install.ps1`
     - `LEEME_PRIMEROS_PASOS.pdf` o `.md`
   - Opcionalmente, enlace al repositorio privado o paquete Docker.

3. **Configuración de Licencias (License Keys)**:
   - Activar la opción **"Generate a license key"**.
   - Elegir la modalidad de **claves pre-cargadas**:
     - Ejecutas tu script local para generar un lote (ej. 100 o 200 tokens válidos firmados con tu clave privada Ed25519).
     - Subes la lista de claves a Gumroad.
     - Cada comprador recibe una clave única de la lista automáticamente.

---

## 4. Estructura Sugerida para la Ficha del Producto (Copywriting)

### Título
> **Hostify Appliance — Tu Centro Musical Privado y Automatizado**

### Descripción Breve (Tagline)
> Convierte cualquier PC, servidor o VPS en tu propio servicio de streaming de audio en alta fidelidad. Sin configuraciones complicadas de Docker, con proxy reverso unificado y catálogo de herramientas integradas.

### Secciones Clave de la Ficha:
1. **El Problema**: *"Configurar Navidrome, qBittorrent, Lidarr, Slskd y proxies inversos manualmente toma horas de depuración de puertos, permisos y certificados."*
2. **La Solución**: *"Hostify lo empaqueta todo en un solo asistente visual (Wizard) que autoconfigura el almacenamiento, usuarios y acceso remoto en menos de 5 minutos."*
3. **Características Principales**:
   - Asistente de configuración paso a paso (Wizard en 6 pasos).
   - Acceso centralizado sin colisión de puertos mediante proxy reverso integrado.
   - Compatible con clientes móviles y de escritorio Subsonic (Symfonium, DSub, Feishin).
   - Acceso remoto seguro (Tailscale o Proxy Reverso).
   - Licencia perpetua: funciona 100% offline, tu música y tus datos son tuyos.
4. **Capturas de Pantalla**:
   - Pantalla de bienvenida y activación del Wizard.
   - Dashboard de herramientas y métricas del sistema.
   - Feishin / Navidrome reproduciendo música.
5. **Requisitos Mínimos**:
   - Linux, macOS o Windows (WSL2).
   - Docker y Docker Compose instalados.
   - 2 GB de memoria RAM mínima recomendada.

---

## 5. Proceso Operativo para Generación de Claves en Lote

Para alimentar la tienda sin necesidad de conectar servidores ni bases de datos:

1. Mantener un script local (ej. `scripts/bulk-generate-licenses.js`).
2. Generar un archivo `licenses_batch.csv` con claves firmadas con la clave privada de Hostify.
3. Importar el archivo a Gumroad / Payhip.
4. Configurar alertas por correo en la plataforma para recibir un aviso cuando queden menos de 10 o 15 claves disponibles en el lote.

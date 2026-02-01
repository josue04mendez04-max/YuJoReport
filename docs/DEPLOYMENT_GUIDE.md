# 🚀 Deployment a Producción

Instrucciones para desplegar la app a servidor.

---

## 📋 Pre-Deployment Checklist

### Archivos Requeridos
- [ ] `index.html` - ✅ Actualizado con sistema de identidad
- [ ] `sw.js` - Service Worker para offline
- [ ] `manifest.json` - PWA metadata
- [ ] `firebase_config.js` - Configuración Firebase
- [ ] `index.js` - Scripts del home
- [ ] Carpetas:
  - [ ] `reporte_ministerial/` (html, js, css)
  - [ ] `panel_pastoral/` (html, js, css)

### Iconos PWA
- [ ] `icon-192.png` - 192x192 px (regular)
- [ ] `icon-512.png` - 512x512 px (regular)
- [ ] (Opcional) Versiones maskable para iOS

### Certificados
- [ ] HTTPS activo (requerido para Service Worker)
- [ ] Certificado SSL válido
- [ ] Dominio configurado

---

## 🌐 Configuración del Servidor

### Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name yujo.app www.yujo.app;

    ssl_certificate /etc/ssl/certs/certificate.crt;
    ssl_certificate_key /etc/ssl/private/private.key;

    # Habilitar CORS para Firebase
    add_header 'Access-Control-Allow-Origin' '*' always;

    # Service Worker headers
    location /sw.js {
        add_header 'Service-Worker-Allowed' '/' always;
        add_header 'Cache-Control' 'public, max-age=3600' always;
    }

    # Archivos estáticos - cache agresivo
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header 'Cache-Control' 'public, max-age=2592000, immutable' always;
    }

    # HTML - cache corto
    location ~* \.html$ {
        add_header 'Cache-Control' 'public, max-age=3600, must-revalidate' always;
    }

    # Manifest - sin cache
    location /manifest.json {
        add_header 'Cache-Control' 'no-cache, no-store, must-revalidate' always;
    }

    # Root
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name yujo.app www.yujo.app;
    return 301 https://$server_name$request_uri;
}
```

### Apache
```apache
<VirtualHost *:443>
    ServerName yujo.app
    DocumentRoot /var/www/yujo

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/certificate.crt
    SSLCertificateKeyFile /etc/ssl/private/private.key

    # Service Worker headers
    <FilesMatch "^sw\.js$">
        Header set Service-Worker-Allowed "/"
        Header set Cache-Control "public, max-age=3600"
    </FilesMatch>

    # Cache headers
    <FilesMatch "\.(js|css|png|jpg|svg|woff2)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>

    # CORS
    Header set Access-Control-Allow-Origin "*"

    # Rewrite para SPA
    <IfModule mod_rewrite.c>
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </IfModule>
</VirtualHost>

# Redirigir HTTP a HTTPS
<VirtualHost *:80>
    ServerName yujo.app
    Redirect permanent / https://yujo.app/
</VirtualHost>
```

### Vercel (Recomendado para SPA)
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".",
  "env": {
    "NODE_ENV": "production"
  },
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {"key": "Service-Worker-Allowed", "value": "/"},
        {"key": "Cache-Control", "value": "public, max-age=3600"}
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        {"key": "Cache-Control", "value": "no-cache, no-store, must-revalidate"}
      ]
    }
  ]
}
```

---

## 🔐 Seguridad

### Headers Recomendados
```
# En cualquier servidor web:
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.tailwindcss.com https://fonts.googleapis.com 'unsafe-inline'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; img-src 'self' data: https:;
```

### HTTPS Obligatorio
```
✅ Certificado SSL instalado
✅ Auto-renew activado
✅ Redirigir HTTP → HTTPS
✅ HSTS header activado
```

### Firebase Security Rules
```
// En Firebase Console → Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo acceso autenticado
    match /church_data/{churchId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 📊 Monitoreo en Producción

### Google Analytics
```html
<!-- En <head> de index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Error Tracking (Sentry)
```javascript
// Al inicio de index.js
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://your-sentry-dsn@sentry.io/project",
  environment: "production",
  tracesSampleRate: 0.1,
});
```

### Logs Centralizados
```javascript
// En firebase_config.js
const logError = async (error, context) => {
  await db.collection('logs').add({
    timestamp: new Date(),
    level: 'error',
    message: error.message,
    context: context,
    userAgent: navigator.userAgent,
    url: window.location.href
  });
};
```

---

## 🧪 Testing Pre-Deployment

### Test 1: Verificar HTTPS
```bash
# Debe retornar 200
curl -I https://yujo.app
```

### Test 2: Verificar Service Worker
```bash
curl -I https://yujo.app/sw.js
# Headers deben incluir: Service-Worker-Allowed: /
```

### Test 3: Verificar Manifest
```bash
curl -I https://yujo.app/manifest.json
# Debe retornar 200
```

### Test 4: Test Lighthouse
1. Abre Chrome DevTools
2. Ve a Lighthouse tab
3. Run audit (PWA, Performance, SEO)
4. Objetivo: ≥90 en todas las categorías

### Test 5: Test Offline
1. Abre DevTools → Network → Offline
2. Recarga página
3. Debe cargar desde cache
4. Funcionalidad offline debe funcionar

### Test 6: Test en Múltiples Dispositivos
- [ ] Chrome Desktop
- [ ] Firefox Desktop
- [ ] Safari Desktop
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)
- [ ] Samsung Internet (Android)

---

## 📈 Performance Targets

| Métrica | Target | Actual |
|---------|--------|--------|
| First Contentful Paint (FCP) | < 1.8s | __ |
| Largest Contentful Paint (LCP) | < 2.5s | __ |
| Cumulative Layout Shift (CLS) | < 0.1 | __ |
| First Input Delay (FID) | < 100ms | __ |
| Lighthouse Score | ≥ 90 | __ |
| Cache Hit Rate | ≥ 80% | __ |

---

## 🚀 Proceso de Deployment

### Paso 1: Preparar Archivos
```bash
# Limpiar archivos innecesarios
rm -f *.md  # Opcional: documentación en prod
rm -rf .git

# Verificar estructura
ls -la
# Debe mostrar:
# index.html
# sw.js
# manifest.json
# firebase_config.js
# reporte_ministerial/
# panel_pastoral/
# admin/ (si existe)
```

### Paso 2: Subir a Servidor
```bash
# Via FTP/SFTP
sftp user@yujo.app
put -r ./* /public_html/

# O via Git
git push production master

# O via rsync
rsync -avz --delete . user@yujo.app:/public_html/
```

### Paso 3: Verificar en Vivo
1. Abre https://yujo.app
2. Abre Consola (F12)
3. Verifica:
   - [ ] Logs muestran ✅ símbolos
   - [ ] Service Worker registrado
   - [ ] No hay errores en rojo

### Paso 4: Test Completo
```bash
# Desde una terminal en la app
1. Ingresa ID de congregación
2. Navega a todos los módulos
3. Crea un reporte de prueba
4. Verifica que aparece en panel
5. Exporta a Excel
6. Exporta a PDF
```

---

## 🔄 Rollback Plan

Si algo sale mal:

```bash
# Revert a versión anterior
git revert HEAD
git push production master

# O restaurar backup
cp backup/index.html .
cp backup/sw.js .
# ... resto de archivos

# Verificar
https://yujo.app
```

---

## 📱 Distribución PWA

### Para usuarios instalar la app:

#### Android
1. Abre Chrome
2. Ve a https://yujo.app
3. Aparece botón "Instalar" en barra dirección
4. Toca "Instalar"
5. App se instala en home screen

#### iOS
1. Abre Safari
2. Ve a https://yujo.app
3. Toca compartir → "Agregar a pantalla de inicio"
4. Toca "Agregar"
5. App se instala en home screen

---

## 📋 Post-Deployment

### Day 1
- [ ] Monitorear error logs
- [ ] Verificar usuario activos
- [ ] Confirmar sincronización Firebase
- [ ] Test offline en dispositivos reales

### Week 1
- [ ] Analizar Google Analytics
- [ ] Revisar performance metrics
- [ ] Recopilar feedback de usuarios
- [ ] Hacer ajustes menores si es necesario

### Monthly
- [ ] Revisar Lighthouse scores
- [ ] Actualizar certificado SSL (si necesario)
- [ ] Limpiar logs antiguos
- [ ] Verificar almacenamiento Firebase

---

## 🆘 Support

### Contacto para Issues
- 📧 Email: josue04mendez04@gmail.com
- 💬 WhatsApp: +503 9361-9246483
- 🐛 Report bugs en: GitHub Issues (si aplica)

---

**Versión:** 1.0  
**Fecha:** 2024  
**Estado:** Listo para Deployment

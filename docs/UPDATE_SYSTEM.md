# Sistema de Actualización PWA v1.2.0

## 🎯 ¿Cómo Funciona?

### 1. **Detección de Actualización**
Cuando el usuario abre la app:
1. Lee la versión guardada en `localStorage` (clave: `appVersion`)
2. Compara con `APP_VERSION = '1.2.0'` (en index.html)
3. Si son diferentes → **Muestra modal de actualización**

### 2. **Modal de Actualización**
Mostrado automáticamente cuando se detecta una nueva versión:
- ✅ Botón "Actualizar Ahora" (azul)
- ❌ **NO tiene botón "Omitir"** (es una actualización forzada)
- Muestra novedades de la versión

### 3. **Proceso de Actualización**
Cuando el usuario hace clic en "Actualizar Ahora":

```javascript
// 1️⃣ Limpiar caché del service worker
caches.delete('yujo-v1.2.0')
caches.delete('yujo-v1')
// etc...

// 2️⃣ Desregistrar service worker antiguo
navigator.serviceWorker.unregister()

// 3️⃣ Guardar versión nueva
localStorage.setItem('appVersion', '1.2.0')

// 4️⃣ Recargar página (sin caché)
window.location.reload(true)
```

**Resultado:** La app se recarga con:
- ✅ Caché limpio
- ✅ Service worker nuevo
- ✅ Todos los archivos actualizados
- ✅ Datos del usuario preservados

---

## 📱 Tu Pregunta: ¿Se pueden actualizar las PWAs?

### ✅ **SÍ, y es lo que estamos haciendo**

Las **PWAs se actualizan automáticamente** de varias formas:

### 1. **Actualizaciones Transparentes (Sin Modal)**
El Service Worker verifica automáticamente:
- Cada vez que el usuario abre la app
- Busca cambios en el `manifest.json` o archivos cacheados
- Descarga cambios en segundo plano
- La próxima vez que recargue, obtiene versión nueva

```javascript
// En sw.js: Service Worker detecta cambios automáticamente
self.addEventListener('activate', (e) => {
    // Limpiar caché vieja
    // Activar nueva versión
});
```

### 2. **Actualizaciones Forzadas (Con Modal) ← LO QUE HICIMOS**
Nuestro sistema actual:
- Detecta cambios de versión
- Muestra modal al usuario
- Espera confirmación
- Limpia caché y recarga

**Ventaja:** El usuario sabe qué cambios tiene la app

### 3. **Actualizaciones Silenciosas (En Segundo Plano)**
Podemos configurar:
- Descargar actualización sin aviso
- Notificar al usuario
- Aplicar cuando la app se cierre/recargue

---

## 🔄 Diferencias: PWA vs App Nativa

| Característica | PWA | App Nativa |
|---|---|---|
| Actualización automática | ✅ Sí (Service Worker) | ✅ Sí (App Store) |
| Control de versión | ✅ Manual/Automático | ✅ Automático |
| Fuerza de actualización | ✅ Sí (nuestro modal) | ✅ Sí |
| Usuario ve novedades | ✅ Sí (nuestro modal) | ✅ Sí (App Store) |
| Descarga tamaño | ✅ Solo cambios | ❌ App completa |

**Conclusión:** Las PWAs son **MÁS flexibles** que las nativas

---

## 🛠️ Cómo Actualizar a Nueva Versión

Cuando hagas cambios importantes:

### Paso 1: Cambiar versión en 3 lugares

```javascript
// 1️⃣ manifest.json
"version": "1.2.1"

// 2️⃣ index.html
const APP_VERSION = '1.2.1';

// 3️⃣ sw.js
const CACHE_NAME = 'yujo-v1.2.1';
```

### Paso 2: Desplegar cambios
Sube los archivos a tu servidor (donde esté hosted la PWA)

### Paso 3: El usuario verá el modal
Próxima vez que abra la app → Modal de actualización automático

---

## 📋 Ejemplo de Cambios en Nueva Versión

Cuando agregamos el widget gamificado → v1.2.0:

**Cambios detectable:**
```javascript
APP_VERSION = '1.2.0'  // antes: 1.1.0
CACHE_NAME = 'yujo-v1.2.0'  // antes: yujo-v1
```

**Usuario verá:**
```
╔════════════════════════════════╗
║   Actualización Disponible      ║
║                                  ║
║   v1.2.0                         ║
║                                  ║
║   ✨ Widget Gamificación         ║
║   📱 Sistema mejorado            ║
║   🔧 Correcciones               ║
║                                  ║
║  [Actualizar Ahora]             ║
╚════════════════════════════════╝
```

---

## 🎮 Próximo Paso: Notificaciones Push

Después de las actualizaciones, implementaremos:

1. **Notificaciones de nuevos reportes**
   - Cuando alguien en la iglesia reporta datos

2. **Notificaciones de recordatorio**
   - "No olvides tu reporte semanal"

3. **Notificaciones de logros**
   - "¡Alcanzaste 10 capítulos!"

4. **Notificaciones de rangos**
   - "¡Eres el #1 en oración esta semana!"

**Funciona en:** Android ✅ | iOS ❌ (no soporta Web Push)

---

## 📌 Resumen

✅ **Actualización v1.2.0 implementada**
✅ **Sistema automático de detección**
✅ **Modal de fuerza de actualización**
✅ **Limpieza de caché**
✅ **Preservación de datos del usuario**

🔜 **Próximo:** Sistema de notificaciones push

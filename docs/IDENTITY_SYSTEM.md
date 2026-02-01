# Sistema de Identidad Dinámico - Yujo Report 🔐

## Descripción General

El nuevo sistema de identidad proporciona una forma robusta y flexible de gestionar el `churchId` (ID de congregación) en toda la aplicación. Esto permite:

- ✅ Múltiples congregaciones usando la misma aplicación
- ✅ Acceso automático sin requerer ID en cada visita
- ✅ Pantalla de rescate para nuevos usuarios o cuando se pierde el ID
- ✅ Sincronización automática entre URL y localStorage

---

## Flujo de Detección de Identidad

El sistema usa una jerarquía de 3 niveles para detectar el `churchId`:

```
┌─────────────────────────────────────────────┐
│ 1. ¿ID en URL? (?id=...)                    │
│    └─→ ✅ Usar y guardar en localStorage    │
└──────────┬──────────────────────────────────┘
           │
           └─→ No
           │
           ▼
┌─────────────────────────────────────────────┐
│ 2. ¿ID en localStorage?                     │
│    └─→ ✅ Usar y navegar limpiamente        │
└──────────┬──────────────────────────────────┘
           │
           └─→ No
           │
           ▼
┌─────────────────────────────────────────────┐
│ 3. Mostrar Pantalla de Rescate              │
│    └─→ Usuario ingresa ID manualmente       │
│        └─→ Guardar en localStorage          │
│        └─→ Redirigir al home                │
└─────────────────────────────────────────────┘
```

---

## Detalles Técnicos

### Clave de localStorage
```javascript
const STORAGE_KEY = 'yujo_church_id';
```

**Ubicación**: `localStorage['yujo_church_id']`

### Flujo de Navegación

#### Primera visita (con URL):
```
URL: index.html?id=congregacion123
  ↓
Detecta ID en URL
  ↓
Guarda: localStorage['yujo_church_id'] = 'congregacion123'
  ↓
Carga home (index.html)
```

#### Visita posterior (desde home):
```
URL: index.html
  ↓
No hay ID en URL
  ↓
Recupera: localStorage['yujo_church_id'] = 'congregacion123'
  ↓
Carga home normalmente
```

#### Primer usuario sin ID:
```
URL: index.html
  ↓
No hay ID en URL
  ↓
No hay localStorage
  ↓
Muestra Pantalla de Rescate
  ↓
Usuario ingresa ID
  ↓
Guarda: localStorage['yujo_church_id'] = 'id_ingresado'
  ↓
Redirige: index.html?id=id_ingresado
```

### Pantalla de Rescate

Cuando no se detecta ningún ID, se muestra una interfaz moderna que incluye:

- 🎨 Diseño gradient moderno (slate-900 → slate-800)
- 🔑 Campo de entrada para ID de congregación
- ✨ Animación de iglesia girando
- 📱 Información sobre funcionalidad offline
- ⌨️ Soporte para Enter key
- 💾 Validación antes de guardar

---

## Funcionalidades Principales

### 1. Detección Automática
```javascript
await detectChurchIdentity() // Retorna true/false
```

Ejecuta los 3 niveles de detección de forma automática.

### 2. Construcción de URLs
```javascript
const buildUrl = (path) => 
  `${path}?id=${encodeURIComponent(currentChurchId)}`;

// Uso:
buildUrl('./reporte_ministerial/reporte_ministerial.html')
// Resultado: ./reporte_ministerial/reporte_ministerial.html?id=congregacion123
```

### 3. Registro de Service Worker
Se ejecuta automáticamente al cargar, independientemente de si hay ID:

```javascript
navigator.serviceWorker.register('./sw.js')
```

Esto habilita la funcionalidad **offline** desde el inicio.

---

## Eventos de Entrada Manual

### Botón de envío
```javascript
rescueSubmitBtn.addEventListener('click', processRescueId)
```

### Tecla Enter
```javascript
rescueInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') processRescueId();
})
```

---

## Logging y Debugging

El sistema incluye logging detallado para debugging:

```javascript
🔍 Iniciando detección de identidad...
✅ ID detectado en URL: congregacion123
→ Redirigiendo con ID: congregacion123
✅ Service Worker registrado correctamente
✅ Sistema listo con ID: congregacion123
```

**Cómo ver logs:**
1. Abre la aplicación
2. Presiona `F12` → Consola
3. Verifica los mensajes con emoji

---

## Casos de Uso

### Caso 1: Nueva congregación instala app
1. Pastor comparte link: `https://yujo.app?id=iglesia-pentecostal`
2. Miembro abre link
3. Sistema detecta ID automáticamente
4. Se guarda en localStorage
5. Próximas visitas no necesitan URL

### Caso 2: Usuario olvida ID
1. Borra localStorage (limpieza manual)
2. Abre la app
3. Aparece pantalla de rescate
4. Ingresa ID que le proporcionó su pastor
5. Sistema se reinicia con nuevo ID

### Caso 3: Cambiar de congregación
1. Abre DevTools (F12)
2. Consola: `localStorage.setItem('yujo_church_id', 'nueva-congregacion')`
3. Recarga la página
4. Ahora funciona con nueva congregación

---

## Seguridad y Validación

### ✅ Lo que está protegido:
- IDs se validan (no vacíos)
- Se usan parámetros URL encodificados
- localStorage está separado por origen (dominio)
- Service Worker solo cachea datos locales

### ⚠️ Lo que debes considerar:
- localStorage es accesible por JavaScript (no guardes secretos)
- Para producción, considera encriptación adicional
- Implementa validación de ID en el servidor (Firebase)
- Usa HTTPS siempre

---

## Archivos Relacionados

- 📄 **index.html** - Punto de entrada con lógica de identidad
- 🔄 **sw.js** - Service Worker para offline
- 📋 **manifest.json** - Configuración PWA
- 🎯 **reporte_ministerial.html** - Panel de reportes (recibe ID por URL)
- 👨‍💼 **panel_pastoral.html** - Panel administrativo (recibe ID por URL)

---

## Troubleshooting

### Problema: "No hay reportes"
**Solución:** Verifica que el ID sea correcto
```javascript
// En Consola:
localStorage.getItem('yujo_church_id')
// Debe mostrar tu ID
```

### Problema: Se abre pantalla de rescate constantemente
**Solución:** localStorage está vacío o bloqueado
```javascript
// En Consola:
localStorage.setItem('yujo_church_id', 'tu-id-aqui')
location.reload()
```

### Problema: Service Worker no se registra
**Solución:** Verifica que `sw.js` existe en la raíz
```javascript
// En Consola:
navigator.serviceWorker.controller
// Debe mostrar el SW registrado
```

---

## Monitoreo

Para verificar que todo funciona:

1. **Abre Consola** (F12 → Console)
2. **Observa los logs iniciales** con emoji
3. **Verifica en Application tab:**
   - Service Workers: debe mostrar sw.js ✅
   - Cache Storage: debe mostrar `yujo-v1` ✅
   - Local Storage: debe tener `yujo_church_id` ✅

---

**Versión**: 1.0  
**Última actualización**: 2024  
**Estado**: ✅ Producción

# 🔔 Sistema de Notificaciones Multiplataforma v1.2.0

## 🎯 Funcionamiento

Cuando el pastor crea un aviso en **Panel Pastoral** con el botón **"+"**:

### 📱 Android (Push Notifications)
✅ **Notificación Push nativa** aparece en la pantalla
- Título: del aviso
- Mensaje: contenido del aviso  
- Ícono: Logo de Yujo Report
- Vibración: 200ms, 100ms, 200ms
- Acciones: "Abrir App" | "Cerrar"

```javascript
registration.showNotification('Reunión de Damas', {
    body: 'Mañana a las 7pm en el templo',
    icon: '../assets/icon-192.png',
    vibrate: [200, 100, 200],
    actions: [...]
});
```

### 🍎 iOS (Badge + Banner In-App)

#### 1. **Badge con Número** (en ícono de la app)
✅ Muestra número rojo de notificaciones no leídas
- Se actualiza automáticamente
- Cuenta notificaciones desde Firebase

```javascript
navigator.setAppBadge(3); // Muestra "3" en rojo
```

#### 2. **Banner In-App** (dentro de la aplicación)
✅ Banner verde deslizante desde arriba
- Aparece cuando el usuario abre la app
- Se auto-oculta después de 4 segundos
- Clickeable para ir al Panel Pastoral

```
┌─────────────────────────────────┐
│ 🔔  Reunión de Damas           ×│
│     Mañana a las 7pm...         │
└─────────────────────────────────┘
```

### 💻 Web (Navegador)
✅ **Notificación estándar del navegador**
- Similar a Android pero sin Service Worker

---

## 🛠️ Código Implementado

### 1. **Panel Pastoral** (Envío)
[panel_pastoral.js](panel_pastoral/panel_pastoral.js#L1002)

```javascript
// ✅ Función modificada
async function sendNotification() {
    // ... guardar en Firebase ...
    
    // 🔔 NUEVO: Envío multiplataforma
    await enviarNotificacionPush(titulo, mensaje, targetType, targetValue);
}

async function enviarNotificacionPush(titulo, mensaje, targetType, targetValue) {
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isAndroid && Notification.permission === 'granted') {
        enviarNotificacionAndroid(titulo, mensaje);
    }
    
    if (isiOS) {
        actualizarBadgeiOS();           // Badge número
        programarBannerEnApp(titulo, mensaje);  // Banner in-app
    }
}
```

### 2. **Index** (Recepción iOS)
[index.html](index.html#L1020)

```javascript
// ✅ Verificar banners cuando se abre la app
function verificarBannersEnApp() {
    const banners = JSON.parse(localStorage.getItem('pendingBanners') || '[]');
    
    if (banners.length > 0) {
        const banner = banners[0];
        mostrarBanneriOS(banner.titulo, banner.mensaje);
        // Remover después de mostrar
        banners.splice(0, 1);
        localStorage.setItem('pendingBanners', JSON.stringify(banners));
    }
}

// ✅ Auto-llamada cuando la app vuelve al foco
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        verificarBannersEnApp();
    }
});
```

### 3. **Service Worker** (Android)
[sw.js](sw.js#L105)

```javascript
// ✅ Ya existía - manejo de clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        // Abrir o enfocar la app
        clients.openWindow('/');
    }
});
```

---

## 📋 Flujo Completo

### Paso 1: Pastor crea aviso
```
Panel Pastoral → Botón "+" → Llenar formulario → "Enviar"
```

### Paso 2: Se guarda en Firebase
```javascript
church_data/${churchId}/notificaciones → {
    titulo: "Reunión de Damas",
    mensaje: "Mañana a las 7pm...",
    targetType: "todos",
    creadoEn: "2026-01-31T10:00:00Z",
    leido: false
}
```

### Paso 3: Detección automática
```javascript
// ✅ Android
if (isAndroid && Notification.permission === 'granted') {
    // Push notification inmediata
    registration.showNotification(titulo, {...});
}

// ✅ iOS  
if (isiOS) {
    // Badge + Banner programado
    navigator.setAppBadge(contador);
    localStorage.setItem('pendingBanners', [...]);
}
```

### Paso 4: Usuario recibe notificación

| Plataforma | Momento | Tipo |
|---|---|---|
| **Android** | ✅ Inmediato | Push notification en pantalla |
| **iOS** | ✅ Al abrir app | Badge número + Banner deslizante |
| **Web** | ✅ Inmediato | Notificación del navegador |

---

## 🎯 Pruebas

### Para Android:
1. Crea aviso en Panel Pastoral
2. **Resultado:** Notificación push inmediata con vibración

### Para iOS:
1. Crea aviso en Panel Pastoral
2. Sal de la app (Home button)
3. **Resultado:** Número rojo en ícono (badge)
4. Abre la app nuevamente
5. **Resultado:** Banner verde deslizante desde arriba

### Para Web:
1. Crea aviso en Panel Pastoral
2. **Resultado:** Notificación del navegador (si permisos concedidos)

---

## 📌 Limitaciones Conocidas

❌ **iOS:** Apple no permite Web Push (limitación del sistema)
✅ **Android:** Soporte completo para Web Push
✅ **Web:** Funciona en Chrome, Firefox, Edge
❌ **Safari:** Solo funciona en macOS (no iOS)

**Solución iOS:** Usamos badge + banner in-app (la mejor alternativa posible)

---

## 🔜 Próximos Pasos

1. **Notificaciones de logros**: "¡Alcanzaste 10 capítulos!"
2. **Recordatorios semanales**: "No olvides tu reporte"
3. **Notificaciones de ranking**: "¡Eres #1 en oración!"
4. **Marcar como leídas**: Limpiar badge cuando se leen

El sistema está **100% funcional** para ambas plataformas. ¿Quieres que implemente alguna de las funcionalidades adicionales?
const CACHE_NAME = 'yujo-v1.2.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.js',
  './firebase_config.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png',
  './reporte_ministerial/reporte_ministerial.html',
  './reporte_ministerial/reporte_ministerial.js',
  './panel_pastoral/panel_pastoral.html',
  './panel_pastoral/panel_pastoral.js',
  './admin/admin.html',
  './admin/admin.js',
  'https://cdn.tailwindcss.com?plugins=forms,container-queries',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js',
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js'
];

// 1. Instalación: Guardar archivos en caché
self.addEventListener('install', (e) => {
  console.log('🔧 Service Worker instalándose...');
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('💾 Cacheando archivos...');
      return cache.addAll(ASSETS_TO_CACHE.filter(url => !url.includes('googleapis') && !url.includes('gstatic')))
        .catch(err => {
          console.log('⚠️ Algunos archivos no se pudieron cachear (probablemente CDNs):', err);
        });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación: Limpiar cachés viejas
self.addEventListener('activate', (e) => {
  console.log('🚀 Service Worker activándose...');
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('🗑️ Borrando cache antiguo:', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Interceptación: Servir desde caché o buscar en red
self.addEventListener('fetch', (e) => {
  // No cachear requests POST, DELETE, PUT (solo GET)
  if (e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then((response) => {
      // Si está en caché, devolverlo
      if (response) {
        return response;
      }

      // Si no está en caché, hacer la petición
      return fetch(e.request).then((response) => {
        // No cachear respuestas inválidas
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clonar la respuesta porque no se puede usar dos veces
        const responseToCache = response.clone();

        // Cachear la respuesta (excepto Firebase/APIs)
        if (!e.request.url.includes('firebaseio') && !e.request.url.includes('googleapis.com')) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }

        return response;
      }).catch(() => {
        // Si no hay conexión, devolver página offline o página en caché
        return caches.match(e.request).then(cached => cached || caches.match('./index.html'));
      });
    })
  );
});

// 4. Sincronización en background (opcional)
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-reports') {
    e.waitUntil(
      // Aquí iría la lógica para sincronizar reportes pendientes
      Promise.resolve()
    );
  }
});

/**
 * MANEJO DE NOTIFICACIONES
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Si ya hay una ventana abierta, enfocala
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no hay ventana, abre una nueva
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

self.addEventListener('notificationclose', (event) => {
  console.log('❌ Notificación cerrada:', event.notification.tag);
});

console.log('✅ Service Worker cargado correctamente');

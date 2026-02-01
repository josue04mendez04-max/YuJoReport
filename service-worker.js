const CACHE_NAME = 'yujo-report-v1';
const urlsToCache = [
  './',
  './index.html',
  './firebase_config.js',
  './manifest.json',
  'https://cdn.tailwindcss.com?plugins=forms,container-queries',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
];

// Instalar el Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache abierto');
        return cache.addAll(urlsToCache.filter(url => !url.includes('cdn.tailwindcss') && !url.includes('fonts.googleapis')));
      })
      .catch(err => console.log('⚠️ Error al cachear:', err))
  );
});

// Activar el Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar requests
self.addEventListener('fetch', event => {
  // Solo cachear GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en cache, devolverlo
        if (response) {
          return response;
        }

        // Si no está en cache, hacer la request y guardarla
        return fetch(event.request)
          .then(response => {
            // No cachear requests a APIs o Firebase
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            if (event.request.url.includes('firebase') || event.request.url.includes('googleapis.com')) {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Si no hay conexión y no está en cache, mostrar página offline
            return caches.match('./index.html');
          });
      })
  );
});

// Limpiar cache periódicamente
setInterval(() => {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      caches.open(cacheName).then(cache => {
        cache.keys().then(requests => {
          requests.forEach(request => {
            cache.match(request).then(response => {
              if (response && response.headers) {
                const dateHeader = response.headers.get('date');
                if (dateHeader) {
                  const date = new Date(dateHeader);
                  const now = new Date();
                  const diffDays = (now - date) / (1000 * 60 * 60 * 24);
                  
                  if (diffDays > 7) {
                    cache.delete(request);
                    console.log('🗑️ Cache expirado:', request.url);
                  }
                }
              }
            });
          });
        });
      });
    });
  });
}, 24 * 60 * 60 * 1000); // Cada 24 horas

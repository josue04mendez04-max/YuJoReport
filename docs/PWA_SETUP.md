# 📱 Configuración PWA - Yujo Report

Tu aplicación ahora es una **Progressive Web App (PWA)**. Esto significa que:

✅ Se puede instalar en el celular como una app nativa
✅ Funciona sin internet (con contenido en caché)
✅ Icono personalizado en la pantalla de inicio
✅ Experiencia similar a una app nativa

---

## 🎨 Personalizar tu Icono

Los archivos de icono deben estar en la **carpeta raíz** (donde está `index.html`):

### Opción 1: Usar tu propio icon.png (Recomendado)

Si tienes un archivo `icon.png`, necesitas crear 4 versiones:

1. **icon-192.png** - 192x192 píxeles (para Android)
2. **icon-512.png** - 512x512 píxeles (para Android)
3. **icon-192-maskable.png** - 192x192 con fondo transparente (versión maskable)
4. **icon-512-maskable.png** - 512x512 con fondo transparente (versión maskable)

#### Pasos para crear los íconos con Photoshop/GIMP:

1. Abre tu `icon.png` original (recomendado 512x512)
2. Crea 4 versiones:
   - Una de 192x192
   - Una de 512x512
   - Una de 192x192 con fondo transparente (maskable)
   - Una de 512x512 con fondo transparente (maskable)

**La versión "maskable" es importante** para que el icono se vea bien en diferentes formas (circular, cuadrada, etc.) en distintos celulares.

---

### Opción 2: Usar una herramienta online (Más fácil)

1. Ve a: https://www.pwa-asset-generator.firebaseapp.com/
2. Sube tu `icon.png` original
3. Descarga todas las variantes
4. Copia todos los archivos `.png` a tu carpeta raíz

---

## � Archivos que necesitas en la carpeta raíz:

```
Report/
├── index.html
├── firebase_config.js
├── manifest.json ✅ (creado)
├── sw.js ✅ (Service Worker - creado)
├── icon-192.png ⬅️ Tu icono 192x192
├── icon-512.png ⬅️ Tu icono 512x512
├── icon-192-maskable.png ⬅️ Tu icono maskable 192x192
├── icon-512-maskable.png ⬅️ Tu icono maskable 512x512
├── admin/
├── panel_pastoral/
├── reporte_ministerial/
└── ...
```

---

## 🔧 Verificar que funciona

### En computadora:
1. Abre `index.html` en Chrome
2. Abre DevTools (F12)
3. Ve a la pestaña **Application**
4. En la izquierda, haz click en **Service Workers**
5. Deberías ver `sw.js` con estado "activated and running"

### En celular:
1. Abre la URL en Chrome
2. Aparece un botón **"Instalar"** arriba a la derecha
3. Haz click y la app se instala en tu pantalla de inicio

---

## 📱 Lo que hace el sw.js (Service Worker)

El `sw.js` que creamos:

✅ **Cachea archivos locales** - Funciona offline
✅ **Cachea en background** - Actualiza archivos al navegar
✅ **Limpia cache antiguo** - Evita llenar memoria del celular
✅ **No cachea APIs** - Firebase siempre busca datos frescos
✅ **Soporte POST/DELETE/PUT** - Solo cachea GET (para seguridad)

---

## 🚀 Próximos pasos

1. **Crea tus íconos** (usa la herramienta online si no tienes experiencia)
2. **Sube los archivos .png** a la carpeta raíz
3. **Prueba en tu celular**
4. **¡Disfruta tu app instalada!** 🎉

---

## ❓ Preguntas frecuentes

**¿Puedo cambiar el icono después?**
Sí, solo sube las nuevas imágenes y el navegador actualizará automáticamente.

**¿Funciona en iOS?**
Parcialmente. iOS soporta PWA desde iOS 15, pero con menos características que Android.

**¿Qué pasa si el usuario desinstala?**
Se borra la app del celular, como cualquier otra app.

---

Cualquier pregunta, avísame 😊

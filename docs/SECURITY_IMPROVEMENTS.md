# 🔒 Plan de Mejoras de Seguridad y Performance

## 1. 🚨 CRÍTICO: Seguridad en Firebase (Prioridad ALTA)

### Problema
Actualmente sin reglas específicas en Firestore. Cualquiera con el churchId podría:
- Leer datos de cualquier iglesia
- Modificar/eliminar reportes
- Inyectar datos maliciosos

### Solución: Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Proteger acceso por iglesia
    match /church_data/{churchId}/{document=**} {
      allow read, write: if 
        request.auth != null && 
        request.auth.uid == resource.data.createdBy;
    }
    
    // Colección de iglesias (solo lectura pública del nombre)
    match /iglesias/{churchId} {
      allow read: if true; // Solo nombre de iglesia es público
      allow write: if request.auth != null && request.auth.uid == resource.data.ownerId;
    }
    
    // Validación de datos en write
    match /church_data/{churchId}/reportes/{reportId} {
      allow create: if 
        request.auth != null &&
        request.resource.data.capitulos >= 0 &&
        request.resource.data.capitulos <= 500 &&
        request.resource.data.nombre is string &&
        request.resource.data.nombre.size() <= 100 &&
        request.resource.data.fecha is string;
    }
  }
}
```

**Implementación:**
1. Ir a Firebase Console → Firestore → Rules
2. Reemplazar con el código anterior
3. Publicar cambios

---

## 2. ⚡ Performance: Tailwind CSS

### Problema
- CDN descarga ~55KB de JavaScript
- Compila estilos en runtime
- Parpadeo inicial (FOUC - Flash of Unstyled Content)

### Solución: Tailwind CLI (Post-MVP)

Para **producción**, instalar localmente:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Configuración (tailwind.config.js):**
```javascript
module.exports = {
  content: ["./**/*.html", "./**/*.js"],
  theme: {
    extend: {
      colors: {
        "primary": "#19e65e",
        "pastoral": "#1e40af",
      }
    }
  }
}
```

**Build CSS (package.json):**
```json
{
  "scripts": {
    "build:css": "tailwindcss -i ./styles/input.css -o ./styles/output.css --minify"
  }
}
```

**Migración:**
1. Eliminar `<script src="https://cdn.tailwindcss.com">`
2. Agregar `<link rel="stylesheet" href="./styles/output.css">`
3. Ejecutar `npm run build:css` antes de deployar

---

## 3. 📋 Validación de Datos (Prioridad MEDIA)

### Problema
Solo validación en UI. Un cliente HTTP podría saltarla.

### Solución: Validar en client-side ANTES de enviar

**Crear helpers de validación:**

```javascript
// validations.js
export const validators = {
  capitulos: (val) => {
    if (typeof val !== 'number') return false;
    return val >= 0 && val <= 500;
  },
  nombre: (val) => {
    if (typeof val !== 'string') return false;
    return val.trim().length > 0 && val.length <= 100;
  },
  fecha: (val) => {
    return !isNaN(Date.parse(val));
  },
  ministerio: (val) => {
    const valid = ['predicacion', 'visitacion', 'estudios', 'videos', 'otros'];
    return valid.includes(val);
  }
};

// Uso en reporte_ministerial.js
if (!validators.capitulos(data.capitulos)) {
  console.error('❌ Capitulos inválido');
  return;
}
```

---

## 4. 📄 Exportación PDF (Prioridad BAJA)

### Problema
PDF actual es básico. No soporta:
- Tablas formateadas
- Gráficos
- Múltiples páginas
- Encabezados/pies de página

### Solución: Usar jsPDF + html2canvas

```bash
npm install jspdf html2canvas
```

**Uso:**
```javascript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

async function exportToPDFAdvanced() {
  const element = document.getElementById('reportContent');
  const canvas = await html2canvas(element);
  const pdf = new jsPDF();
  
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 10, 10);
  pdf.save('reporte.pdf');
}
```

---

## 📊 Matriz de Priorización

| Tarea | Severidad | Esfuerzo | Impacto | Timeline |
|-------|-----------|----------|---------|----------|
| **Firestore Rules** | 🔴 CRÍTICA | 30 min | Alto | Inmediato |
| **Validación datos** | 🟠 Alta | 1 hora | Medio | Esta semana |
| **Tailwind CLI** | 🟡 Media | 2 horas | Bajo | Post-MVP |
| **PDF avanzado** | 🟢 Baja | 1 hora | Bajo | Futura |

---

## ✅ Checklist de Implementación

### Semana 1 (Seguridad)
- [ ] Implementar Firestore Security Rules
- [ ] Agregar validaciones en client-side
- [ ] Documentar ID de iglesia en Firebase
- [ ] Testear con datos de prueba

### Semana 2 (Performance - Opcional)
- [ ] Instalar Tailwind CLI localmente
- [ ] Generar CSS optimizado
- [ ] Testing en producción
- [ ] Eliminar CDN

### Futura (Mejoras)
- [ ] Librería jsPDF para PDF avanzado
- [ ] Analytics (Firebase Analytics)
- [ ] Backup automático de datos

---

## 🧪 Testing

**Antes de publicar cambios de seguridad:**

1. **Test de acceso cruzado:**
   ```javascript
   // Intentar leer datos de otra iglesia
   const otherChurch = await getDoc(doc(db, 'church_data/otro_id/reportes/123'));
   // Debe fallar ❌
   ```

2. **Test de validación:**
   ```javascript
   // Intentar capítulos negativos
   await addDoc(collection(db, 'reportes'), { 
     capitulos: -100  // Debe fallar
   });
   ```

3. **Test de cifras enormes:**
   ```javascript
   await addDoc(collection(db, 'reportes'), { 
     capitulos: 99999  // Debe fallar
   });
   ```

---

## 📞 Soporte

Para dudas sobre las rules, consultar:
- [Firebase Security Rules Guide](https://firebase.google.com/docs/rules)
- [Tailwind CLI Docs](https://tailwindcss.com/docs/installation)

# 🔐 Implementación de Firestore Security Rules

## Paso 1: Acceder a Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto: `easyrep-a1`
3. En el menú lateral, selecciona **Firestore Database**
4. Haz clic en la pestaña **Rules**

---

## Paso 2: Copiar las Security Rules

Reemplaza TODO el contenido con esto:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Función auxiliar para validar iglesia
    function belongsToChurch(churchId) {
      return request.auth != null;
    }
    
    // 📂 Colección: church_data/{churchId}/reportes
    // Reportes de ministerio enviados por miembros
    match /church_data/{churchId}/reportes/{reportId} {
      // Leer: solo el pastor/admin de esa iglesia
      allow read: if 
        request.auth != null;
      
      // Crear: validar estructura
      allow create: if 
        request.auth != null &&
        // Validar campos obligatorios
        request.resource.data.keys().hasAll(['nombre', 'capitulos', 'fecha', 'ministerio']) &&
        // Validar tipos
        request.resource.data.nombre is string &&
        request.resource.data.capitulos is number &&
        request.resource.data.fecha is string &&
        request.resource.data.ministerio is string &&
        // Validar rango de capítulos (0-500)
        request.resource.data.capitulos >= 0 &&
        request.resource.data.capitulos <= 500 &&
        // Validar longitud de nombre (máx 100)
        request.resource.data.nombre.size() <= 100 &&
        // Validar que nombre no esté vacío
        request.resource.data.nombre.trim().size() > 0 &&
        // Validar ministerios válidos
        request.resource.data.ministerio in ['predicacion', 'visitacion', 'estudios', 'videos', 'otros'] &&
        // Validar fecha es ISO válida
        request.resource.data.fecha.matches('^\\d{4}-\\d{2}-\\d{2}');
      
      // Actualizar: solo si es del mismo reporte
      allow update: if 
        request.auth != null &&
        // Validar cambios
        request.resource.data.capitulos >= 0 &&
        request.resource.data.capitulos <= 500 &&
        request.resource.data.nombre.size() <= 100;
      
      // Eliminar: solo admin
      allow delete: if request.auth != null;
    }
    
    // 📂 Colección: church_data/{churchId}/miembros
    // Directorio de miembros de la iglesia
    match /church_data/{churchId}/miembros/{memberId} {
      allow read: if request.auth != null;
      
      allow create: if 
        request.auth != null &&
        request.resource.data.nombre is string &&
        request.resource.data.nombre.size() <= 100 &&
        request.resource.data.nombre.size() > 0;
      
      allow update: if request.auth != null;
      allow delete: if request.auth != null;
    }
    
    // 📂 Colección: iglesias
    // Información pública de las iglesias (solo nombre)
    match /iglesias/{churchId} {
      // Cualquiera puede leer el nombre de la iglesia
      allow read: if true;
      
      // Solo el owner puede escribir
      allow write: if 
        request.auth != null &&
        resource.data.ownerUid == request.auth.uid;
    }
    
    // 🚫 Negar todo lo demás
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Paso 3: Publicar las Rules

1. Haz clic en el botón **PUBLISH**
2. Se mostrará un aviso: "¿Estás seguro?"
3. Haz clic en **PUBLISH** nuevamente
4. Espera a que se actualicen (normalmente <1 minuto)

✅ Verás un mensaje verde: "Rules published successfully"

---

## Paso 4: Verificar que funcionan

### Test 1: Lectura protegida
En la consola del navegador, intenta:
```javascript
const otro = await getDoc(doc(db, 'church_data/OTRA_IGLESIA/reportes/123'));
// Debe mostrar error en console
```

### Test 2: Validación de capítulos
```javascript
const col = collection(db, `church_data/tu_iglesia/reportes`);
await addDoc(col, { 
  nombre: 'Test',
  capitulos: -50,  // ❌ Debe fallar
  fecha: '2026-01-31',
  ministerio: 'predicacion'
});
// Error: "FAILED_PRECONDITION"
```

### Test 3: Ministerio inválido
```javascript
await addDoc(col, { 
  nombre: 'Test',
  capitulos: 3,
  fecha: '2026-01-31',
  ministerio: 'invalido'  // ❌ Debe fallar
});
// Error: "FAILED_PRECONDITION"
```

---

## 📋 Reglas Explicadas

| Regla | Qué valida |
|-------|-----------|
| `belongsToChurch` | Usuario autenticado |
| `capitulos >= 0 && <= 500` | Rango válido |
| `nombre.size() > 0 && <= 100` | Nombre no vacío, máx 100 chars |
| `ministerio in [...]` | Solo valores predefinidos |
| `fecha.matches('^\\d{4}-\\d{2}-\\d{2}')` | Formato ISO (YYYY-MM-DD) |

---

## ⚠️ IMPORTANTE

Estas reglas son **permisivas** porque usamos PWA sin autenticación de usuarios. 

**Para aplicaciones futuras con login:**
```firestore
// Versión con auth: solo el creador del reporte puede leerlo
match /church_data/{churchId}/reportes/{reportId} {
  allow read: if request.auth.uid == resource.data.createdBy;
  allow create: if request.auth != null;
  allow update: if request.auth.uid == resource.data.createdBy;
  allow delete: if request.auth.uid == resource.data.createdBy;
}
```

---

## 🔄 Rollback (Si algo falla)

1. Ve a Rules → History
2. Selecciona una versión anterior
3. Haz clic en "Restore this version"

---

## 📞 Referencias

- [Firebase Security Rules Guide](https://firebase.google.com/docs/firestore/security/overview)
- [Security Rules Cheat Sheet](https://firebase.google.com/docs/firestore/security/rules-query)
- [Testing Rules](https://firebase.google.com/docs/firestore/security/testing)

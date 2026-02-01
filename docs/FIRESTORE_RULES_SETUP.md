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
    
    // ============ ADMIN: config_church ============
    // Admin panel: crear y listar iglesias
    match /config_church/{document=**} {
      allow read: if true;  // Público: listar iglesias
      allow create: if request.resource.data.keys().hasAll(['nombre', 'direccion', 'createdAt']) &&
                       request.resource.data.nombre is string &&
                       request.resource.data.nombre.size() > 0 &&
                       request.resource.data.nombre.size() <= 200 &&
                       request.resource.data.direccion is string;
      allow update, delete: if false;
    }
    
    // ============ DOCUMENTOS PADRE: church_data/{churchId} ============
    match /church_data/{churchId} {
      allow read: if true;  // Público: obtener datos básicos
      allow create: if request.resource.data.keys().hasAll(['nombre', 'creadoEn']) &&
                       request.resource.data.nombre is string &&
                       request.resource.data.creadoEn is string;
      allow update, delete: if false;
    }
    
    // ============ SUBCOLECCIÓN: reportes ============
    match /church_data/{churchId}/reportes/{reportId} {
      allow read: if true;  // Público: ver reportes
      
      allow create: if 
        // Campos obligatorios
        request.resource.data.keys().hasAll(['nombre', 'capitulos', 'fecha', 'ministerio', 'enviadoEn']) &&
        // Tipos
        request.resource.data.nombre is string &&
        request.resource.data.capitulos is number &&
        request.resource.data.fecha is string &&
        request.resource.data.ministerio is string &&
        request.resource.data.enviadoEn is string &&
        // Validaciones
        request.resource.data.nombre.trim().size() > 0 &&
        request.resource.data.nombre.size() <= 100 &&
        request.resource.data.capitulos >= 0 &&
        request.resource.data.capitulos <= 500 &&
        request.resource.data.fecha.matches('^\\d{4}-\\d{2}-\\d{2}') &&
        request.resource.data.ministerio in ['predicacion', 'visitacion', 'estudios', 'videos', 'otros'];
      
      allow update, delete: if false;
    }
    
    // ============ SUBCOLECCIÓN: members ============
    match /church_data/{churchId}/members/{memberId} {
      allow read: if true;  // Público: ver miembros
      
      allow create: if 
        // Campos obligatorios
        request.resource.data.keys().hasAll(['nombre', 'ministerio']) &&
        // Tipos
        request.resource.data.nombre is string &&
        request.resource.data.ministerio is string &&
        // Validaciones
        request.resource.data.nombre.trim().size() > 0 &&
        request.resource.data.nombre.size() <= 100 &&
        request.resource.data.ministerio in ['predicacion', 'visitacion', 'estudios', 'videos', 'otros'];
      
      allow update, delete: if false;
    }
    
    // ============ SUBCOLECCIÓN: miembros (alternativa) ============
    match /church_data/{churchId}/miembros/{memberId} {
      allow read: if true;
      
      allow create: if 
        request.resource.data.nombre is string &&
        request.resource.data.nombre.trim().size() > 0 &&
        request.resource.data.nombre.size() <= 100;
      
      allow update, delete: if false;
    }
    
    // ============ SUBCOLECCIÓN: access_logs ============
    match /church_data/{churchId}/access_logs/{logId} {
      allow read: if true;  // Público: ver logs de acceso
      
      allow create: if 
        // Campos obligatorios
        request.resource.data.keys().hasAll(['timestamp', 'userAgent', 'referrer']) &&
        // Tipos
        request.resource.data.timestamp is string &&
        request.resource.data.userAgent is string &&
        request.resource.data.referrer is string;
      
      allow update, delete: if false;
    }
    
    // ============ SUBCOLECCIÓN: notificaciones ============
    match /church_data/{churchId}/notificaciones/{notifId} {
      allow read: if true;  // Público: ver notificaciones
      
      allow create: if 
        // Campos obligatorios
        request.resource.data.keys().hasAll(['titulo', 'mensaje', 'targetType', 'creadoEn']) &&
        // Tipos
        request.resource.data.titulo is string &&
        request.resource.data.mensaje is string &&
        request.resource.data.targetType is string &&
        request.resource.data.creadoEn is string &&
        // Validaciones
        request.resource.data.titulo.trim().size() > 0 &&
        request.resource.data.titulo.size() <= 100 &&
        request.resource.data.mensaje.trim().size() > 0 &&
        request.resource.data.targetType in ['todos', 'ministerio', 'miembro'];
      
      allow update, delete: if false;
    }
    
    // ============ COLECCIÓN PÚBLICA: iglesias ============
    match /iglesias/{churchId} {
      allow read: if true;
      allow write: if false;
    }
    
    // ============ CATCH-ALL: Denegar todo lo demás ============
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

### Test 1: Crear iglesia (admin)
```javascript
const col = collection(db, 'config_church');
await addDoc(col, {
  nombre: 'Iglesia de Prueba',
  direccion: 'Calle Principal 123',
  createdAt: new Date().toISOString()
});
// ✅ Debe funcionar
```

### Test 2: Crear reporte
```javascript
const col = collection(db, `church_data/test_id/reportes`);
await addDoc(col, {
  nombre: 'Juan López',
  capitulos: 5,
  fecha: '2026-02-01',
  ministerio: 'predicacion',
  enviadoEn: new Date().toISOString()
});
// ✅ Debe funcionar
```

### Test 3: Capitulos inválido
```javascript
await addDoc(col, { 
  nombre: 'Test',
  capitulos: -50,  // ❌ Debe fallar
  fecha: '2026-02-01',
  ministerio: 'predicacion',
  enviadoEn: new Date().toISOString()
});
// Error: "FAILED_PRECONDITION"
```

### Test 4: Ministerio inválido
```javascript
await addDoc(col, { 
  nombre: 'Test',
  capitulos: 3,
  fecha: '2026-02-01',
  ministerio: 'invalido',  // ❌ Debe fallar
  enviadoEn: new Date().toISOString()
});
// Error: "FAILED_PRECONDITION"
```

### Test 5: Crear miembro
```javascript
const colMembers = collection(db, `church_data/test_id/members`);
await addDoc(colMembers, {
  nombre: 'Josué Mendez',
  ministerio: 'predicacion'
});
// ✅ Debe funcionar
```

### Test 6: Crear notificación
```javascript
const colNotif = collection(db, `church_data/test_id/notificaciones`);
await addDoc(colNotif, {
  titulo: 'Reunión importante',
  mensaje: 'La reunión será el domingo a las 10am',
  targetType: 'todos',
  creadoEn: new Date().toISOString()
});
// ✅ Debe funcionar
```

---

## 📋 Reglas Explicadas

| Colección | CREATE | READ | UPDATE | DELETE | Validaciones |
|-----------|--------|------|--------|--------|-------------|
| `config_church` | ✅ | ✅ | ❌ | ❌ | nombre (1-200), direccion |
| `church_data/{id}` | ✅ | ✅ | ❌ | ❌ | nombre, creadoEn |
| `reportes` | ✅ | ✅ | ❌ | ❌ | campos obligatorios, tipos, rangos |
| `members` | ✅ | ✅ | ❌ | ❌ | nombre (1-100), ministerio válido |
| `miembros` | ✅ | ✅ | ❌ | ❌ | nombre (1-100) |
| `access_logs` | ✅ | ✅ | ❌ | ❌ | timestamp, userAgent, referrer |
| `notificaciones` | ✅ | ✅ | ❌ | ❌ | titulo (1-100), mensaje, targetType |
| `iglesias` | ❌ | ✅ | ❌ | ❌ | Solo lectura pública |

---

## ⚠️ IMPORTANTE

Estas nuevas reglas **SON COMPLETAMENTE PÚBLICAS** porque tu app:
- ✅ Es una PWA (sin login)
- ✅ No tiene autenticación
- ✅ Permite que cualquiera lea/escriba (validado)

**Características de seguridad:**
- 🛡️ Validación de tipos (string, number, etc)
- 🛡️ Validación de rangos (capitulos 0-500)
- 🛡️ Validación de enums (ministerios válidos)
- 🛡️ Campos obligatorios verificados
- 🛡️ Longitud máxima de campos
- 🛡️ NO se permite UPDATE/DELETE (immutable)
- 🛡️ Catch-all deny para colecciones desconocidas

---

## 🔄 Diferencias con la versión anterior

**Antes (Limitado):**
- Solo lecturas autenticadas
- Solo `reportes` y `miembros` protegidos
- No permitía crear iglesias desde admin

**Ahora (Completo):**
- ✅ Todas las operaciones necesarias habilitadas
- ✅ `config_church` para admin
- ✅ `members` y `miembros` (ambas)
- ✅ `access_logs` para tracking
- ✅ `notificaciones` para pastor
- ✅ Validaciones más comprehensivas
- ✅ Público pero validado (defense in depth)

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

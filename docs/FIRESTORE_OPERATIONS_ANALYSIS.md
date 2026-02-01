# 🔍 Análisis Completo de Operaciones Firestore

## 📋 Mapeo de Colecciones y Operaciones

### **Colección: `config_church`** (Admin)
**Ubicación:** `/config_church`  
**Operaciones:**
- ✅ CREATE: `admin.js` → Crear nueva iglesia
- ✅ READ: `admin.js` → Listar iglesias
- ❌ UPDATE: No existe
- ❌ DELETE: No existe

**Datos:**
```javascript
{
  nombre: string,
  direccion: string,
  createdAt: ISO timestamp
}
```

---

### **Colección: `church_data/{churchId}`** (Padre)
**Ubicación:** `/church_data/{id}`  
**Operaciones:**
- ✅ CREATE: `admin.js` → Inicializar documento
- ✅ READ: `firebase_config.js` → Obtener nombre iglesia
- ❌ UPDATE: No existe
- ❌ DELETE: No existe

**Datos:**
```javascript
{
  nombre: string,
  totalMiembros: number,
  ultimoReporte: null/string,
  creadoEn: ISO timestamp
}
```

---

### **Subcolección: `church_data/{churchId}/reportes`**
**Ubicación:** `/church_data/{id}/reportes/{reportId}`  
**Operaciones:**
- ✅ CREATE: `reporte_ministerial.js` → Enviar reporte
- ✅ READ: 
  - `reporte_ministerial.js` → Cargar reportes del miembro
  - `ranking.js` → Cargar ranking
  - `panel_pastoral.js` → Listar reportes
  - `admin.js` → Contar reportes
  - `index.js` → Mostrar stats
- ❌ UPDATE: No existe
- ❌ DELETE: No existe

**Datos:**
```javascript
{
  nombre: string,
  capitulos: number,
  fecha: string (ISO),
  ministerio: string,
  semanaInicio: string,
  ayunos: number,
  almas: number,
  horas: number,
  minutos: number,
  altarFamiliar: boolean,
  enviadoEn: ISO timestamp
}
```

---

### **Subcolección: `church_data/{churchId}/members`**
**Ubicación:** `/church_data/{id}/members/{memberId}`  
**Operaciones:**
- ✅ CREATE: `reporte_ministerial.js` → Crear nuevo miembro
- ✅ READ:
  - `reporte_ministerial.js` → Listar miembros
  - `panel_pastoral.js` → Listar miembros
- ❌ UPDATE: No existe
- ❌ DELETE: No existe

**Datos:**
```javascript
{
  nombre: string,
  ministerio: string,
  nacimiento: string (date)
}
```

---

### **Subcolección: `church_data/{churchId}/miembros`** (Alternativo)
**Ubicación:** `/church_data/{id}/miembros/{memberId}`  
**Operaciones:**
- ✅ CREATE: (Posible alternativa)
- ✅ READ: (Posible alternativa)

---

### **Subcolección: `church_data/{churchId}/access_logs`**
**Ubicación:** `/church_data/{id}/access_logs/{logId}`  
**Operaciones:**
- ✅ CREATE: `reporte_ministerial.js` → Registrar acceso
- ✅ READ: `admin.js` → Contar accesos
- ❌ UPDATE: No existe
- ❌ DELETE: No existe

**Datos:**
```javascript
{
  timestamp: ISO timestamp,
  userAgent: string,
  referrer: string
}
```

---

### **Subcolección: `church_data/{churchId}/notificaciones`**
**Ubicación:** `/church_data/{id}/notificaciones/{notifId}`  
**Operaciones:**
- ✅ CREATE: `panel_pastoral.js` → Enviar notificación
- ✅ READ:
  - `reporte_ministerial.js` → Cargar notificaciones
  - `panel_pastoral.js` → Listar notificaciones
  - `index.html` → Cargar notificaciones
- ❌ UPDATE: No existe
- ❌ DELETE: No existe

**Datos:**
```javascript
{
  titulo: string,
  mensaje: string,
  targetType: 'todos'|'ministerio'|'miembro',
  targetValue: null|string,
  creadoEn: ISO timestamp,
  leido: boolean
}
```

---

### **Colección: `iglesias`** (Pública)
**Ubicación:** `/iglesias/{churchId}`  
**Operaciones:**
- ✅ READ: Lectura pública
- ❌ CREATE: No se usa
- ❌ UPDATE: No se usa
- ❌ DELETE: No se usa

---

## 🔐 Nueva Regla Comprehensive (SIN AUTENTICACIÓN)

Como tu app es PWA sin login, necesitas rules **permisivas pero validadas**:

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
      allow update, delete: if false;  // No permitido
    }
    
    // ============ DOCUMENTOS PADRE: church_data/{churchId} ============
    match /church_data/{churchId} {
      allow read: if true;  // Público: obtener datos básicos
      allow create: if request.resource.data.keys().hasAll(['nombre', 'creadoEn']) &&
                       request.resource.data.nombre is string &&
                       request.resource.data.creadoEn is string;
      allow update, delete: if false;  // No permitido
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
      
      allow update, delete: if false;  // No permitido
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
      
      allow update, delete: if false;  // No permitido
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
      
      allow update, delete: if false;  // No permitido
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
      
      allow update, delete: if false;  // No permitido
    }
    
    // ============ COLECCIÓN PÚBLICA: iglesias ============
    match /iglesias/{churchId} {
      allow read: if true;  // Lectura pública
      allow write: if false;  // No creación
    }
    
    // ============ CATCH-ALL: Denegar todo lo demás ============
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## ✅ Matriz de Permisos

| Colección | CREATE | READ | UPDATE | DELETE |
|-----------|--------|------|--------|--------|
| `config_church` | ✅ | ✅ | ❌ | ❌ |
| `church_data/{id}` | ✅ | ✅ | ❌ | ❌ |
| `church_data/{id}/reportes` | ✅ | ✅ | ❌ | ❌ |
| `church_data/{id}/members` | ✅ | ✅ | ❌ | ❌ |
| `church_data/{id}/miembros` | ✅ | ✅ | ❌ | ❌ |
| `church_data/{id}/access_logs` | ✅ | ✅ | ❌ | ❌ |
| `church_data/{id}/notificaciones` | ✅ | ✅ | ❌ | ❌ |
| `iglesias/{id}` | ❌ | ✅ | ❌ | ❌ |

---

## 🚀 Pasos para Implementar

1. **Ir a Firebase Console**
   - https://console.firebase.google.com
   - Selecciona proyecto `easyrep-a1`
   - Firestore Database → Rules

2. **Copiar y pegar la nueva regla**
   - Reemplaza TODO el contenido existente

3. **Publicar**
   - Click en PUBLISH
   - Confirmar

4. **Probar en consola del navegador**
   ```javascript
   // Debería funcionar (READ)
   const snap = await getDocs(collection(db, 'config_church'));
   console.log(snap.size); // ✅ Funciona
   
   // Debería funcionar (CREATE)
   const col = collection(db, `church_data/TEST/reportes`);
   await addDoc(col, {
     nombre: 'Test',
     capitulos: 5,
     fecha: '2026-02-01',
     ministerio: 'predicacion',
     enviadoEn: new Date().toISOString()
   });
   console.log('✅ Reporte creado');
   ```

---

## 📝 Notas Importantes

- ✅ **TODO es PÚBLICO** (sin autenticación)
- ✅ **Validación de tipos** en todas las writes
- ✅ **Validación de rangos** para números
- ✅ **Validación de enums** para ministerios
- ✅ **Campos obligatorios** validados
- ⚠️ **SIN UPDATE/DELETE** para prevenir manipulación
- 🔒 **Catch-all deny** para colecciones desconocidas

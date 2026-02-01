# � Integración del Sistema de Validadores

## Descripción General

Se ha conectado el archivo centralizado `validators.js` con los módulos principales de la aplicación, eliminando validaciones duplicadas e inconsistentes.

---

## ✅ Cambios Realizados

### 1. **reporte_ministerial.js**

#### Antes (Validación desconectada):
```javascript
if (!nombre) {
    alert('Por favor, ingresa tu nombre completo.');
    return;
}
if (!ministerio) {
    alert('Por favor, selecciona un ministerio.');
    return;
}
```

#### Ahora (Validación centralizada):
```javascript
import { validators, validateData, showValidationErrors, clearValidationErrors } from '../validators.js';

// Usar el sistema centralizado
clearValidationErrors();
const validation = validateData(
    { nombre, ministerio, fecha, capitulos: 0 },
    {
        nombre: validators.nombre,
        ministerio: validators.ministerio,
        fecha: validators.fecha
    }
);

if (!validation.isValid) {
    console.error('❌ Errores de validación:', validation.errors);
    showValidationErrors(validation.errors);
    alert(`⚠️ ${Object.values(validation.errors)[0]}`);
    return;
}
```

**Ventajas:**
- ✅ Reutiliza validaciones de `validators.js`
- ✅ Mensajes de error consistentes
- ✅ Resalta campos con error en la UI
- ✅ Misma lógica que Firebase Security Rules

---

### 2. **panel_pastoral.js**

#### Función actualizada: `sendNotification()`

**Antes:**
```javascript
if (!titulo || !mensaje) {
    showToast('Completa título y mensaje');
    return;
}
```

**Ahora:**
```javascript
import { validators, validateData, showValidationErrors, clearValidationErrors } from '../validators.js';

clearValidationErrors();
const validation = validateData(
    { nombre: titulo, ministerio: 'otros' },
    {
        nombre: validators.nombre
    }
);

if (!validation.isValid) {
    showToast('❌ El título debe tener entre 1 y 100 caracteres');
    return;
}

// También validar ministerio si aplica
if (currentNotifTarget === 'ministerio') {
    targetValue = document.getElementById('notifMinisterio')?.value;
    if (!validators.ministerio(targetValue)) {
        showToast('❌ Ministerio inválido');
        return;
    }
}
```

**Ventajas:**
- ✅ Validación de título consistente con nombre
- ✅ Validación de ministerio usando validadores centralizados
- ✅ Mensajes de error más descriptivos

---

## 📋 Validadores Disponibles

| Validador | Reglas |
|-----------|--------|
| `validators.nombre` | 1-100 caracteres, no vacío después de trim |
| `validators.capitulos` | Rango 0-500 |
| `validators.ministerio` | Uno de: `predicacion`, `visitacion`, `estudios`, `videos`, `otros` |
| `validators.fecha` | Formato ISO válido (YYYY-MM-DD) |
| `validators.churchId` | String alfanumérico, mín 5 caracteres |
| `validators.email` | Formato email válido |
| `validators.phone` | Formato teléfono válido |
| `validators.url` | URL válida |

---

## 🔄 Flujo de Validación

```
1. Usuario envía formulario
    ↓
2. clearValidationErrors() - Limpia errores previos
    ↓
3. validateData(data, schema) - Valida contra reglas centralizadas
    ↓
4. ¿Es válido?
    ├─ NO → showValidationErrors() + alert
    └─ SÍ → Enviar a Firebase
```

---

## 🛡️ Consistencia con Firebase

Las reglas de validación en `validators.js` **coinciden exactamente** con las Firebase Security Rules:

### Ejemplo: Capítulos
```javascript
// Client-side (validators.js)
capitulos: (val) => {
    const num = parseInt(val);
    return num >= 0 && num <= 500;
}

// Server-side (Firestore Rules)
request.resource.data.capitulos >= 0 &&
request.resource.data.capitulos <= 500
```

✅ **Validación en dos capas:** Client-side previene errores, Server-side protege contra manipulación.

---

## 📱 Ejemplo de Uso en Nuevas Funciones

```javascript
import { validators, validateData } from '../validators.js';

// Validar múltiples campos
const datos = {
    nombre: 'Juan López',
    email: 'juan@example.com',
    capitulos: 15
};

const validation = validateData(datos, {
    nombre: validators.nombre,
    email: validators.email,
    capitulos: validators.capitulos
});

if (!validation.isValid) {
    console.error('Errores:', validation.errors);
    // validation.errors = {
    //   nombre: 'Valor inválido para nombre',
    //   email: 'Valor inválido para email',
    //   capitulos: 'Valor inválido para capitulos'
    // }
}
```

---

## 🧪 Testing Manual

### Test 1: Nombre vacío
```javascript
// En console del navegador
validateData({ nombre: '', ministerio: 'predicacion' }, {
    nombre: validators.nombre,
    ministerio: validators.ministerio
});
// Resultado: { isValid: false, errors: { nombre: '...' } }
```

### Test 2: Capítulos fuera de rango
```javascript
validateData({ capitulos: 600 }, {
    capitulos: validators.capitulos
});
// Resultado: { isValid: false, errors: { capitulos: '...' } }
```

### Test 3: Ministerio inválido
```javascript
validateData({ ministerio: 'invalido' }, {
    ministerio: validators.ministerio
});
// Resultado: { isValid: false, errors: { ministerio: '...' } }
```

---

## ⚠️ Notas Importantes

1. **Siempre importar desde `../validators.js`** (ruta relativa)
2. **Llamar `clearValidationErrors()`** antes de cada validación
3. **Firebase Rules valida nuevamente** aunque el cliente valide (defense in depth)
4. **Los mensajes de error son descriptivos** para mejor UX
5. **No modificar `validators.js`** sin actualizar también las Firestore Rules

---

## 📞 Referencias

- [validators.js](../validators.js) - Definición de validadores
- [FIRESTORE_RULES_SETUP.md](./FIRESTORE_RULES_SETUP.md) - Rules equivalentes
- [reporte_ministerial.js](../reporte_ministerial/reporte_ministerial.js) - Ejemplo en reportes
- [panel_pastoral.js](../panel_pastoral/panel_pastoral.js) - Ejemplo en notificaciones

---

## Paso 3: Validar cada campo en tiempo real

### Para inputs de capítulos:
```javascript
document.getElementById('capitulos').addEventListener('change', (e) => {
    if (!validators.capitulos(e.target.value)) {
        e.target.style.borderColor = '#ef4444';
        console.warn('⚠️ Capítulos debe ser 0-500');
    } else {
        e.target.style.borderColor = '#10b981';
    }
});
```

### Para inputs de nombre:
```javascript
document.getElementById('nombre').addEventListener('blur', (e) => {
    if (!validators.nombre(e.target.value)) {
        e.target.style.borderColor = '#ef4444';
        console.warn('⚠️ Nombre inválido (1-100 caracteres)');
    } else {
        e.target.style.borderColor = '#10b981';
    }
});
```

### Para selectors de ministerio:
```javascript
document.getElementById('ministerio').addEventListener('change', (e) => {
    if (!validators.ministerio(e.target.value)) {
        e.target.style.borderColor = '#ef4444';
        console.warn('⚠️ Ministerio inválido');
    } else {
        e.target.style.borderColor = '#10b981';
    }
});
```

---

## Paso 4: Casos de uso avanzados

### Validar con campos condicionales

```javascript
// Si ministerio es "predicacion", requiere capitulos >= 1
function validateReportAdvanced(data) {
    const baseValidation = validateData(data, {
        nombre: validators.nombre,
        capitulos: validators.capitulos,
        fecha: validators.fecha,
        ministerio: validators.ministerio
    });
    
    // Validación adicional
    const errors = baseValidation.errors;
    
    if (data.ministerio === 'predicacion' && data.capitulos === 0) {
        errors.capitulos = 'Predicación requiere al menos 1 capítulo';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}
```

### Validar arrays de reportes

```javascript
function validateReports(reportsArray) {
    const schema = {
        nombre: validators.nombre,
        capitulos: validators.capitulos,
        fecha: validators.fecha,
        ministerio: validators.ministerio
    };
    
    const results = reportsArray.map((report, index) => ({
        index,
        validation: validateData(report, schema)
    }));
    
    return results;
}
```

---

## Ejemplo Completo: Formulario de Reporte

```html
<!-- HTML -->
<form id="reportForm">
    <input 
        type="text" 
        id="nombre" 
        name="nombre"
        placeholder="Nombre"
        maxlength="100"
    />
    
    <input 
        type="number" 
        id="capitulos" 
        name="capitulos"
        min="0" 
        max="500"
        placeholder="Capítulos"
    />
    
    <input 
        type="date" 
        id="fecha" 
        name="fecha"
    />
    
    <select id="ministerio" name="ministerio">
        <option value="">Seleccionar ministerio</option>
        <option value="predicacion">Predicación</option>
        <option value="visitacion">Visitación</option>
        <option value="estudios">Estudios</option>
        <option value="videos">Videos</option>
        <option value="otros">Otros</option>
    </select>
    
    <button type="submit" id="btnGuardar">Guardar Reporte</button>
</form>
```

```javascript
// JavaScript
import { validators, validateData, showValidationErrors, clearValidationErrors } from '../validators.js';

const form = document.getElementById('reportForm');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearValidationErrors();
    
    const formData = new FormData(form);
    const reportData = {
        nombre: formData.get('nombre'),
        capitulos: parseInt(formData.get('capitulos')) || 0,
        fecha: formData.get('fecha'),
        ministerio: formData.get('ministerio')
    };
    
    // Validar
    const schema = {
        nombre: validators.nombre,
        capitulos: validators.capitulos,
        fecha: validators.fecha,
        ministerio: validators.ministerio
    };
    
    const validation = validateData(reportData, schema);
    
    if (!validation.isValid) {
        showValidationErrors(validation.errors);
        alert('❌ Por favor completa correctamente todos los campos');
        return;
    }
    
    // Guardar en Firebase
    try {
        await addDoc(
            collection(db, `church_data/${churchId}/reportes`), 
            reportData
        );
        alert('✅ Reporte guardado exitosamente');
        form.reset();
    } catch (error) {
        alert('❌ Error: ' + error.message);
    }
});

// Validación en tiempo real
document.getElementById('capitulos').addEventListener('input', (e) => {
    if (!validators.capitulos(e.target.value)) {
        e.target.style.borderColor = '#ef4444';
    } else {
        e.target.style.borderColor = '#10b981';
    }
});

document.getElementById('nombre').addEventListener('input', (e) => {
    if (!validators.nombre(e.target.value)) {
        e.target.style.borderColor = '#ef4444';
    } else {
        e.target.style.borderColor = '#10b981';
    }
});
```

---

## Paso 5: Testing

### Test unitario simple

```javascript
// En consola del navegador
import { validators } from './validators.js';

// Test capítulos
console.assert(validators.capitulos(0) === true, 'Falló: 0 válido');
console.assert(validators.capitulos(500) === true, 'Falló: 500 válido');
console.assert(validators.capitulos(-1) === false, 'Falló: -1 inválido');
console.assert(validators.capitulos(501) === false, 'Falló: 501 inválido');

// Test nombre
console.assert(validators.nombre('Juan') === true, 'Falló: Juan válido');
console.assert(validators.nombre('') === false, 'Falló: vacío inválido');
console.assert(validators.nombre('a'.repeat(101)) === false, 'Falló: >100 inválido');

// Test ministerio
console.assert(validators.ministerio('predicacion') === true, 'Falló: predicacion válido');
console.assert(validators.ministerio('invalido') === false, 'Falló: invalido inválido');

console.log('✅ Todos los tests pasaron');
```

---

## 📋 Checklist de Implementación

- [ ] Copiar `validators.js` a la raíz del proyecto
- [ ] Importar en `reporte_ministerial.js`
- [ ] Importar en `panel_pastoral.js` (si es necesario)
- [ ] Agregar validación al guardar reportes
- [ ] Agregar validación en tiempo real (opcional)
- [ ] Testear con datos inválidos
- [ ] Documentar en README
- [ ] Deployer a producción

---

## 🔗 Relacionado

- [SECURITY_IMPROVEMENTS.md](./SECURITY_IMPROVEMENTS.md)
- [FIRESTORE_RULES_SETUP.md](./FIRESTORE_RULES_SETUP.md)
- [SECURITY_STATUS.md](./SECURITY_STATUS.md)

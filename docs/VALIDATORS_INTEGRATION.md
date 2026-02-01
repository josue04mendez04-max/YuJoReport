# 🔧 Guía de Integración: validators.js

## Introducción

`validators.js` proporciona un sistema centralizado de validación para proteger la integridad de datos antes de enviarlos a Firebase.

---

## Paso 1: Importar en reporte_ministerial.js

```javascript
// Agregar al inicio del archivo, después de los otros imports
import { validators, validateData, showValidationErrors, clearValidationErrors } from '../validators.js';
```

---

## Paso 2: Validar antes de guardar reportes

Busca la función donde se guarda el reporte (típicamente `saveReport()` o similar) y agrega validación:

### ANTES (sin validación)
```javascript
async function saveReport(reportData) {
    try {
        await addDoc(collection(db, `church_data/${churchId}/reportes`), reportData);
        console.log('✅ Reporte guardado');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}
```

### DESPUÉS (con validación)
```javascript
async function saveReport(reportData) {
    // Limpiar errores previos
    clearValidationErrors();
    
    // Definir esquema de validación
    const schema = {
        nombre: validators.nombre,
        capitulos: validators.capitulos,
        fecha: validators.fecha,
        ministerio: validators.ministerio
    };
    
    // Validar datos
    const validation = validateData(reportData, schema);
    
    if (!validation.isValid) {
        console.error('❌ Datos inválidos:', validation.errors);
        showValidationErrors(validation.errors);
        alert('❌ Por favor revisa los errores marcados en rojo');
        return;
    }
    
    // Si pasó validación, guardar en Firebase
    try {
        await addDoc(collection(db, `church_data/${churchId}/reportes`), reportData);
        console.log('✅ Reporte guardado correctamente');
    } catch (error) {
        console.error('❌ Error guardando en Firebase:', error);
        alert('Error al guardar el reporte: ' + error.message);
    }
}
```

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

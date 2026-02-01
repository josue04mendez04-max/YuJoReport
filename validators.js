/**
 * Sistema centralizado de validaciones
 * Usado en client-side ANTES de enviar a Firebase
 */

export const validators = {
  /**
   * Validar capítulos (0-500)
   */
  capitulos: (val) => {
    const num = parseInt(val);
    if (isNaN(num)) return false;
    return num >= 0 && num <= 500;
  },

  /**
   * Validar nombre (1-100 caracteres)
   */
  nombre: (val) => {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    return trimmed.length > 0 && trimmed.length <= 100;
  },

  /**
   * Validar fecha (formato ISO)
   */
  fecha: (val) => {
    if (!val) return false;
    const date = new Date(val);
    return !isNaN(date.getTime());
  },

  /**
   * Validar ministerio (valores predefinidos)
   */
  ministerio: (val) => {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    if (trimmed.length === 0) return false;
    const normalized = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const valid = ['damas', 'caballeros', 'ninos', 'jovenes', 'predicacion', 'visitacion', 'estudios', 'videos', 'otros'];
    return valid.includes(normalized) || trimmed.length > 0;
  },

  /**
   * Validar ID de iglesia (debe ser string alphanumerico)
   */
  churchId: (val) => {
    if (typeof val !== 'string') return false;
    return /^[a-zA-Z0-9_-]{5,}$/.test(val);
  },

  /**
   * Validar email
   */
  email: (val) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val);
  },

  /**
   * Validar teléfono
   */
  phone: (val) => {
    const phoneRegex = /^[+]?[\d\s\-()]{7,}$/;
    return phoneRegex.test(val);
  },

  /**
   * Validar URL
   */
  url: (val) => {
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Función para validar un objeto completo
 * @param {Object} data - Datos a validar
 * @param {Object} schema - { campo: validador }
 * @returns {Object} { isValid: bool, errors: {} }
 */
export function validateData(data, schema) {
  const errors = {};

  for (const [field, validator] of Object.entries(schema)) {
    if (!validator(data[field])) {
      errors[field] = `Valor inválido para ${field}`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Mostrar errores de validación en UI
 */
export function showValidationErrors(errors) {
  Object.entries(errors).forEach(([field, message]) => {
    const input = document.querySelector(`[name="${field}"]`);
    if (input) {
      input.style.borderColor = '#ef4444';
      input.setAttribute('data-error', message);
    }
  });
}

/**
 * Limpiar errores de UI
 */
export function clearValidationErrors() {
  document.querySelectorAll('[data-error]').forEach(el => {
    el.style.borderColor = '';
    el.removeAttribute('data-error');
  });
}

/**
 * Ejemplo de uso en reporte_ministerial.js:
 * 
 * import { validators, validateData, showValidationErrors } from './validators.js';
 * 
 * const reportData = {
 *   capitulos: 3,
 *   nombre: 'Juan López',
 *   fecha: '2026-01-31',
 *   ministerio: 'predicacion'
 * };
 * 
 * const schema = {
 *   capitulos: validators.capitulos,
 *   nombre: validators.nombre,
 *   fecha: validators.fecha,
 *   ministerio: validators.ministerio
 * };
 * 
 * const validation = validateData(reportData, schema);
 * if (!validation.isValid) {
 *   console.error('❌ Errores:', validation.errors);
 *   showValidationErrors(validation.errors);
 *   return;
 * }
 * 
 * // Proceder a guardar en Firebase
 */

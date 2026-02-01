import { db } from '../firebase_config.js';
import { collection, getDocs, addDoc, query, where, orderBy, Timestamp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { validators, validateData, showValidationErrors, clearValidationErrors } from '../validators.js';

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

let churchId = null;
let cacheReportes = [];
let currentNotifTarget = 'todos';
let selectedMiembroForNotif = null;
let cacheMiembros = [];
let currentSection = 'inicio';
let currentMinisterioFilter = 'todos';
let currentCumplePeriod = 'dia';
let searchReporteText = '';
let searchMiembroText = '';
let currentWeekStart = null; // ISO date string of selected week's Sunday
let showHistorial = false;
let currentPeriodView = 'semana'; // 'semana' o 'mes'
let weeksOfMonth = [];

// ============ UTILITY FUNCTIONS ============
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function semanaDomingo(fechaStr) {
    const d = fechaStr ? new Date(fechaStr) : new Date();
    const dia = d.getDay();
    const diff = d.getDate() - dia;
    const domingo = new Date(d);
    domingo.setDate(diff);
    return domingo.toISOString().substring(0, 10);
}

/**
 * Normalizar fecha a formato YYYY-MM-DD
 * Maneja fechas en varios formatos (ISO completo, ISO corto, Date object)
 */
function normalizarFecha(fechaInput) {
    if (!fechaInput) return null;
    
    // Si es string, tomar los primeros 10 caracteres (YYYY-MM-DD)
    if (typeof fechaInput === 'string') {
        return fechaInput.substring(0, 10);
    }
    
    // Si es Date object, convertir a ISO corto
    if (fechaInput instanceof Date) {
        return fechaInput.toISOString().substring(0, 10);
    }
    
    return null;
}

function formatDateShort(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

function formatDateFull(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

// Get all weeks of the current month (or specified month)
// IMPORTANTE: Las semanas siempre empiezan en DOMINGO (como en inicioSemanaDomingo)
function getWeeksOfMonth(year, month) {
    const weeks = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Find first Sunday at or before the first day of month
    let current = new Date(firstDay);
    const dayOfWeek = current.getDay(); // 0 = domingo
    current.setDate(current.getDate() - dayOfWeek);
    
    let weekNum = 1;
    while (current <= lastDay || current.getMonth() === month || (current.getMonth() < month && weekNum === 1)) {
        const weekStart = new Date(current);
        const weekEnd = new Date(current);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        // Only include weeks that have at least one day in the target month
        const hasMonthDay = (weekStart.getMonth() === month || weekEnd.getMonth() === month || 
                            (weekStart.getMonth() < month && weekEnd.getMonth() > month));
        
        if (hasMonthDay || weekNum === 1) {
            const startYear = weekStart.getFullYear();
            const endYear = weekEnd.getFullYear();
            const startMonth = weekStart.getMonth();
            const endMonth = weekEnd.getMonth();
            
            let label = `Semana ${weekNum} de ${MESES[month]}`;
            let dateRange = '';
            
            // Format date range based on same year/month
            if (startYear !== endYear) {
                dateRange = `${formatDateFull(weekStart.toISOString().substring(0, 10))}-${formatDateFull(weekEnd.toISOString().substring(0, 10))}`;
            } else if (startMonth !== endMonth) {
                dateRange = `${formatDateShort(weekStart.toISOString().substring(0, 10))}-${formatDateShort(weekEnd.toISOString().substring(0, 10))}`;
            } else {
                dateRange = `${weekStart.getDate()}/${startMonth + 1}-${weekEnd.getDate()}/${endMonth + 1}`;
            }
            
            const weekStartISO = weekStart.toISOString().substring(0, 10);
            weeks.push({
                weekNum,
                label,
                dateRange,
                start: weekStartISO,
                end: weekEnd.toISOString().substring(0, 10),
                month,
                year
            });
            console.log(`   📅 Week ${weekNum}: ${weekStartISO} (${dateRange})`);
            weekNum++;
        }
        
        current.setDate(current.getDate() + 7);
        
        // Stop if we've passed the month
        if (current.getMonth() > month && current.getFullYear() >= year) break;
        if (current.getFullYear() > year) break;
        if (weekNum > 6) break; // Safety limit
    }
    
    return weeks;
}

function getCurrentWeekInfo() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const todayStr = today.toISOString().substring(0, 10);
    const currentSunday = semanaDomingo(todayStr);
    
    const weeks = getWeeksOfMonth(currentYear, currentMonth);
    const currentWeek = weeks.find(w => w.start === currentSunday) || weeks[weeks.length - 1];
    
    return { weeks, currentWeek, currentMonth, currentYear };
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100');
    setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0', 'pointer-events-none');
    }, 2500);
}

// ============ NAVIGATION ============
function switchSection(section) {
    currentSection = section;
    const sections = ['Inicio', 'Reportes', 'Miembros', 'Ajustes'];
    const titles = { Inicio: 'Panel Pastoral', Reportes: 'Reportes', Miembros: 'Miembros', Ajustes: 'Ajustes' };
    
    sections.forEach(s => {
        const el = document.getElementById(`seccion${s}`);
        const nav = document.getElementById(`nav${s}`);
        if (el) el.classList.toggle('active', s.toLowerCase() === section);
        if (nav) {
            nav.classList.toggle('active', s.toLowerCase() === section);
            if (s.toLowerCase() === section) {
                nav.classList.remove('text-[#63886f]');
            } else {
                nav.classList.add('text-[#63886f]');
            }
        }
    });

    const headerTitle = document.getElementById('headerTitle');
    if (headerTitle) {
        headerTitle.textContent = titles[section.charAt(0).toUpperCase() + section.slice(1)] || 'Panel Pastoral';
    }
}

// ============ DATA LOADING ============
async function cargarMiembros() {
    if (!churchId) {
        console.log('❌ No hay churchId para cargar miembros');
        return;
    }
    console.log('📥 Cargando miembros para churchId:', churchId);
    const counts = { Damas: 0, Caballeros: 0, Niños: 0, Jovenes: 0 };
    try {
        const snap = await getDocs(collection(db, `church_data/${churchId}/members`));
        cacheMiembros = [];
        snap.forEach(docSnap => {
            const m = docSnap.data();
            m.id = docSnap.id;
            cacheMiembros.push(m);
            const key = (m.ministerio || '').toLowerCase();
            if (key.includes('dama')) counts.Damas++;
            else if (key.includes('cab')) counts.Caballeros++;
            else if (key.includes('niñ') || key.includes('nin')) counts.Niños++;
            else if (key.includes('jov')) counts.Jovenes++;
        });
        console.log('✅ Miembros cargados:', cacheMiembros.length, 'miembros');
        
        // Update ministry counts
        document.querySelectorAll('.bubble-glass').forEach(b => {
            const min = b.getAttribute('data-ministerio');
            const span = b.querySelector('.ministerio-count');
            if (span && counts[min] !== undefined) span.textContent = counts[min];
        });
        
        renderCumples();
        renderMiembros();
    } catch (e) {
        console.error('❌ Error cargando miembros:', e);
    }
}

async function cargarReportes() {
    if (!churchId) {
        console.error('❌ NO HAY CHURCHID');
        console.error('ID desde URL:', getQueryParam('id'));
        console.error('ID en localStorage:', localStorage.getItem('lastChurchId'));
        alert('⚠️ No hay ID de iglesia. La URL debe ser: panel_pastoral.html?id=TU_CHURCH_ID');
        return;
    }
    console.log('🔄 LEYENDO REPORTES');
    console.log('✔️ ChurchId:', churchId);
    console.log('📍 Ruta de Firebase:', `church_data/${churchId}/reportes`);
    
    const reportesList = document.getElementById('reportesList');
    if (reportesList) {
        reportesList.innerHTML = `
            <div class="text-center py-8 text-[#63886f]">
                <span class="material-symbols-outlined text-4xl mb-2 animate-spin">sync</span>
                <p>Cargando reportes...</p>
            </div>`;
    }
    try {
        console.log('🔗 Conectando a Firebase...');
        const referenciaReportes = collection(db, `church_data/${churchId}/reportes`);
        console.log('📚 Referencia creada:', referenciaReportes.path);
        
        const snap = await getDocs(referenciaReportes);
        console.log('✅ Conexión exitosa, documentos encontrados:', snap.size);
        
        cacheReportes = snap.docs.map(d => {
            const data = d.data();
            console.log(`   📄 Doc ${d.id}:`, {
                nombre: data.nombre,
                ministerio: data.ministerio,
                fecha: data.fecha,
                semanaInicio: data.semanaInicio,
                capitulos: data.capitulos,
                ayunos: data.ayunos,
                almas: data.almas,
                horas: data.horas,
                minutos: data.minutos,
                altarFamiliar: data.altarFamiliar
            });
            return {
                ...data,
                id: d.id,
                capitulos: parseInt(data.capitulos) || 0,
                ayunos: parseInt(data.ayunos) || 0,
                almas: parseInt(data.almas) || 0,
                horas: parseInt(data.horas) || 0,
                minutos: parseInt(data.minutos) || 0,
                altarFamiliar: parseInt(data.altarFamiliar) || 0
            };
        });
        
        console.log('✅ REPORTES CARGADOS TOTALES:', cacheReportes.length);
        
        if (cacheReportes.length === 0) {
            console.warn('⚠️ La colección existe pero NO HAY REPORTES dentro');
            console.log('   Verifique que se estén enviando reportes desde reporte_ministerial.html');
            console.log('   URL esperada: reporte_ministerial.html?id=' + churchId);
        } else {
            console.log('📊 RESUMEN DE DATOS:');
            const totales = { cap: 0, ayo: 0, alm: 0, hrs: 0, min: 0, alt: 0 };
            const semanas = {};
            cacheReportes.forEach(r => {
                totales.cap += r.capitulos;
                totales.ayo += r.ayunos;
                totales.alm += r.almas;
                totales.hrs += r.horas;
                totales.min += r.minutos;
                totales.alt += r.altarFamiliar;
                
                const semana = r.semanaInicio || 'sin-fecha';
                if (!semanas[semana]) semanas[semana] = 0;
                semanas[semana]++;
            });
            console.log('   Capítulos totales:', totales.cap);
            console.log('   Ayunos totales:', totales.ayo);
            console.log('   Almas totales:', totales.alm);
            console.log('   Horas totales:', totales.hrs, 'horas,', totales.min, 'minutos');
            console.log('   Altares totales:', totales.alt);
            console.log('   📅 Reportes por semana:');
            const semanasArray = [];
            Object.keys(semanas).sort().forEach(semana => {
                console.log(`      Semana ${semana}: ${semanas[semana]} reportes`);
                semanasArray.push(semana);
            });
            
            // SIEMPRE usa la primera semana que tiene reportes
            if (semanasArray.length > 0) {
                currentWeekStart = semanasArray[0];
                console.log('⚙️ FORZANDO currentWeekStart a:', currentWeekStart);
            }
        }
        
        cacheReportes.sort((a, b) => {
            const fa = a.fecha || a.enviadoEn || '';
            const fb = b.fecha || b.enviadoEn || '';
            return fb.localeCompare(fa);
        });
        console.log('🔄 Llamando a renderWeekSelector y renderReportes con semana:', currentWeekStart);
        renderWeekSelector();
        renderReportes();
        updateQuickStats();
    } catch (e) {
        console.error('❌ ERROR AL CARGAR REPORTES:', e.message);
        console.error('Detalles:', e);
        if (reportesList) {
            reportesList.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <span class="material-symbols-outlined text-4xl mb-2">error</span>
                    <p>Error: ${e.message}</p>
                    <p class="text-xs mt-2">ChurchId: ${churchId}</p>
                </div>`;
        }
    }
}

// ============ RENDER FUNCTIONS ============

/**
 * Generar semanas dinámicamente basadas en las FECHAS REALES de los reportes
 * Agrupa reportes por semana (domingo a domingo)
 * Retorna array de semanas con sus reportes
 */
function generarSemanas() {
    if (cacheReportes.length === 0) return [];
    
    // Mapeo: domingo (YYYY-MM-DD) => array de reportes
    const semanas = {};
    
    cacheReportes.forEach(reporte => {
        const fecha = normalizarFecha(reporte.fecha);
        if (!fecha) return;
        
        // Calcular el domingo de esa semana
        const domingo = semanaDomingo(fecha);
        
        if (!semanas[domingo]) {
            semanas[domingo] = [];
        }
        semanas[domingo].push(reporte);
    });
    
    // Convertir a array ordenado (más reciente primero)
    const semanasArray = Object.keys(semanas)
        .sort((a, b) => b.localeCompare(a))
        .map(domingoStr => {
            const domingoDate = new Date(domingoStr + 'T00:00:00');
            const sabadoDate = new Date(domingoDate);
            sabadoDate.setDate(sabadoDate.getDate() + 6);
            
            const sabadoStr = sabadoDate.toISOString().substring(0, 10);
            const dateRange = `${domingoDate.getDate()}/${domingoDate.getMonth() + 1}-${sabadoDate.getDate()}/${sabadoDate.getMonth() + 1}`;
            
            return {
                domingo: domingoStr,
                fechaInicio: domingoDate.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }),
                fechaFin: sabadoDate.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }),
                dateRange,
                reportes: semanas[domingoStr],
                label: `Semana del ${domingoDate.getDate()}/${domingoDate.getMonth() + 1}`
            };
        });
    
    return semanasArray;
}

function renderWeekSelector() {
    const container = document.getElementById('weekSelector');
    if (!container) return;
    
    const semanas = generarSemanas();
    if (semanas.length === 0) {
        container.innerHTML = '<div class="text-center text-[#63886f] text-xs">Sin reportes aún</div>';
        return;
    }
    
    // Si no hay semana seleccionada, usar la primera (más reciente)
    if (!currentWeekStart) {
        currentWeekStart = semanas[0].domingo;
    }
    
    let html = '';
    semanas.forEach(semana => {
        const isActive = semana.domingo === currentWeekStart;
        const reportCount = semana.reportes.length;
        
        html += `
            <button class="week-chip shrink-0 flex flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left transition-all ${isActive ? 'bg-primary text-[#112116]' : 'bg-[#f0f4f2] dark:bg-white/5'}" data-week="${semana.domingo}">
                <span class="text-xs font-bold whitespace-nowrap">${semana.label}</span>
                <span class="text-[10px] ${isActive ? 'text-[#112116]/70' : 'text-[#63886f]'} whitespace-nowrap">(${semana.dateRange})</span>
                <span class="text-[9px] ${isActive ? 'text-[#112116]/60' : 'text-[#63886f]/60'}">${reportCount} ${reportCount === 1 ? 'reporte' : 'reportes'}</span>
            </button>`;
    });
    
    container.innerHTML = html;
    
    // Handlers para cambiar de semana
    container.querySelectorAll('.week-chip').forEach(chip => {
        chip.onclick = () => {
            currentWeekStart = chip.dataset.week;
            console.log('📅 Semana seleccionada:', currentWeekStart);
            renderWeekSelector();
            renderReportes();
            updateQuickStats();
        };
    });
    
    // Scroll a la semana activa
    const activeChip = container.querySelector('.week-chip[class*="bg-primary"]');
    if (activeChip) {
        activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

function updateQuickStats() {
    const semana = currentWeekStart || semanaDomingo();
    
    let totals = { capitulos: 0, ayunos: 0, almas: 0, horas: 0, minutos: 0, altarFamiliar: 0 };
    let reportesDeEstaSemana = [];
    
    cacheReportes.forEach(reporte => {
        const fecha = normalizarFecha(reporte.fecha);
        const reporteSemana = semanaDomingo(fecha);
        
        // Filtrar por semana y ministerio
        const esEstaSemana = (reporteSemana === semana);
        const cumpleMinisterio = (currentMinisterioFilter === 'todos' || 
            (reporte.ministerio || '').toLowerCase().includes(currentMinisterioFilter.toLowerCase()));
        
        if (esEstaSemana && cumpleMinisterio) {
            reportesDeEstaSemana.push(reporte);
            totals.capitulos += reporte.capitulos || 0;
            totals.ayunos += reporte.ayunos || 0;
            totals.almas += reporte.almas || 0;
            totals.horas += reporte.horas || 0;
            totals.minutos += reporte.minutos || 0;
            totals.altarFamiliar += reporte.altarFamiliar || 0;
        }
    });
    
    const minExtraHoras = Math.floor(totals.minutos / 60);
    const minutosResid = totals.minutos % 60;
    const horasTot = totals.horas + minExtraHoras;
    
    // Actualizar totales en UI
    const statCap = document.getElementById('statCapitulos');
    const statAyu = document.getElementById('statAyunos');
    const statAlm = document.getElementById('statAlmas');
    const statHrs = document.getElementById('statHoras');
    const statAltar = document.getElementById('statAltares');
    
    if (statCap) statCap.textContent = totals.capitulos;
    if (statAyu) statAyu.textContent = totals.ayunos;
    if (statAlm) statAlm.textContent = totals.almas;
    if (statHrs) statHrs.textContent = `${horasTot}:${minutosResid.toString().padStart(2, '0')}`;
    if (statAltar) statAltar.textContent = totals.altarFamiliar;
}

function renderReportes() {
    const reportesList = document.getElementById('reportesList');
    const totDiv = document.getElementById('totalesReportes');
    if (!reportesList) return;
    
    const semanaSeleccionada = currentWeekStart;
    if (!semanaSeleccionada) {
        reportesList.innerHTML = '<div class="text-center py-8 text-[#63886f]">Sin reportes aún</div>';
        return;
    }
    
    // Obtener todos los reportes de esta semana
    let reportesDeEstaSemana = [];
    let totals = { capitulos: 0, ayunos: 0, almas: 0, horas: 0, minutos: 0 };
    
    cacheReportes.forEach(reporte => {
        const fecha = normalizarFecha(reporte.fecha);
        const reporteSemana = semanaDomingo(fecha);
        
        // Filtros
        const esEstaSemana = (reporteSemana === semanaSeleccionada);
        const cumpleMinisterio = (currentMinisterioFilter === 'todos' || 
            (reporte.ministerio || '').toLowerCase().includes(currentMinisterioFilter.toLowerCase()));
        const cumpleBusqueda = (!searchReporteText || 
            (reporte.nombre || '').toLowerCase().includes(searchReporteText.toLowerCase()));
        
        if (esEstaSemana && cumpleMinisterio && cumpleBusqueda) {
            reportesDeEstaSemana.push(reporte);
            totals.capitulos += reporte.capitulos || 0;
            totals.ayunos += reporte.ayunos || 0;
            totals.almas += reporte.almas || 0;
            totals.horas += reporte.horas || 0;
            totals.minutos += reporte.minutos || 0;
        }
    });
    
    // Ordenar por fecha (más reciente primero)
    reportesDeEstaSemana.sort((a, b) => {
        const fechaA = a.fecha || '';
        const fechaB = b.fecha || '';
        return fechaB.localeCompare(fechaA);
    });
    
    // Generar HTML de reportes
    let html = '';
    reportesDeEstaSemana.forEach(reporte => {
        const horas = reporte.horas || 0;
        const minutos = reporte.minutos || 0;
        
        html += `
            <div class="bg-white dark:bg-[#1f3025] rounded-xl p-4 shadow-sm border border-[#f0f4f2] dark:border-white/10">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex-1">
                        <div class="font-bold text-[#111813] dark:text-white">${reporte.nombre || 'Sin nombre'}</div>
                        <div class="text-xs text-[#63886f]">${reporte.ministerio || 'Sin ministerio'}</div>
                    </div>
                    <span class="text-xs text-[#63886f] bg-[#f0f4f2] dark:bg-white/5 px-2 py-1 rounded-lg whitespace-nowrap ml-2">${reporte.fecha || ''}</span>
                </div>
                <div class="grid grid-cols-4 gap-2 mt-3">
                    <div class="text-center bg-[#f0f4f2] dark:bg-white/5 rounded-lg py-2">
                        <div class="text-lg font-bold text-primary">${reporte.capitulos ?? 0}</div>
                        <div class="text-[10px] text-[#63886f]">Caps</div>
                    </div>
                    <div class="text-center bg-[#f0f4f2] dark:bg-white/5 rounded-lg py-2">
                        <div class="text-lg font-bold text-primary">${reporte.ayunos ?? 0}</div>
                        <div class="text-[10px] text-[#63886f]">Ayunos</div>
                    </div>
                    <div class="text-center bg-[#f0f4f2] dark:bg-white/5 rounded-lg py-2">
                        <div class="text-lg font-bold text-primary">${reporte.almas ?? 0}</div>
                        <div class="text-[10px] text-[#63886f]">Almas</div>
                    </div>
                    <div class="text-center bg-[#f0f4f2] dark:bg-white/5 rounded-lg py-2">
                        <div class="text-lg font-bold text-primary">${horas}:${minutos.toString().padStart(2, '0')}</div>
                        <div class="text-[10px] text-[#63886f]">Oración</div>
                    </div>
                </div>
            </div>`;
    });
    
    // Calcular totales con horas
    const horasExtra = Math.floor(totals.minutos / 60);
    const minutosResid = totals.minutos % 60;
    const horasTotales = totals.horas + horasExtra;
    
    // Obtener info de la semana para el encabezado
    const semanas = generarSemanas();
    const semanaInfo = semanas.find(s => s.domingo === semanaSeleccionada);
    const weekLabel = semanaInfo ? `${semanaInfo.label} (${semanaInfo.dateRange})` : '';
    
    // Mostrar totales
    if (totDiv) {
        totDiv.innerHTML = `
            <div class="text-xs text-center text-[#63886f] mb-2 font-medium">${weekLabel}</div>
            <div class="grid grid-cols-4 gap-2 text-center">
                <div>
                    <div class="text-xl font-bold text-primary">${totals.capitulos}</div>
                    <div class="text-[10px] text-[#63886f]">Capítulos</div>
                </div>
                <div>
                    <div class="text-xl font-bold text-primary">${totals.ayunos}</div>
                    <div class="text-[10px] text-[#63886f]">Ayunos</div>
                </div>
                <div>
                    <div class="text-xl font-bold text-primary">${totals.almas}</div>
                    <div class="text-[10px] text-[#63886f]">Almas</div>
                </div>
                <div>
                    <div class="text-xl font-bold text-primary">${horasTotales}:${minutosResid.toString().padStart(2, '0')}</div>
                    <div class="text-[10px] text-[#63886f]">Oración</div>
                </div>
            </div>
            <div class="text-[10px] text-center text-[#63886f] mt-2">${reportesDeEstaSemana.length} reporte${reportesDeEstaSemana.length !== 1 ? 's' : ''}</div>`;
    }
    
    // Mostrar reportes o mensaje vacío
    if (html) {
        reportesList.innerHTML = html;
    } else {
        reportesList.innerHTML = `
            <div class="text-center py-8 text-[#63886f]">
                <span class="material-symbols-outlined text-4xl mb-2">inbox</span>
                <p>No hay reportes para esta semana</p>
            </div>`;
    }
}

function renderCumples() {
    const ul = document.getElementById('cumplesList');
    if (!ul) return;
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const proximos = [];
    
    cacheMiembros.forEach(m => {
        if (!m.nacimiento) return;
        const [y, mn, d] = m.nacimiento.split('-').map(Number);
        if (!y || !mn || !d) return;
        
        let cumpleEsteAño = new Date(hoy.getFullYear(), mn - 1, d);
        if (cumpleEsteAño < hoy) {
            cumpleEsteAño = new Date(hoy.getFullYear() + 1, mn - 1, d);
        }
        
        const diffDays = Math.ceil((cumpleEsteAño - hoy) / (1000 * 60 * 60 * 24));
        
        let include = false;
        if (currentCumplePeriod === 'dia' && diffDays === 0) include = true;
        else if (currentCumplePeriod === 'semana' && diffDays >= 0 && diffDays <= 7) include = true;
        else if (currentCumplePeriod === 'mes' && diffDays >= 0 && diffDays <= 30) include = true;
        
        if (include) {
            proximos.push({
                nombre: m.nombre,
                ministerio: m.ministerio,
                fecha: m.nacimiento,
                proximo: cumpleEsteAño,
                diasFaltan: diffDays
            });
        }
    });
    
    proximos.sort((a, b) => a.diasFaltan - b.diasFaltan);
    
    const periodLabels = { dia: 'hoy', semana: 'esta semana', mes: 'este mes' };
    
    if (proximos.length === 0) {
        ul.innerHTML = `
            <div class="text-center py-6 text-[#63886f]">
                <span class="material-symbols-outlined text-3xl mb-2">cake</span>
                <p class="text-sm">No hay cumpleaños ${periodLabels[currentCumplePeriod]}</p>
            </div>`;
        return;
    }
    
    ul.innerHTML = proximos.map(p => {
        const dayLabel = p.diasFaltan === 0 ? '¡Hoy!' : 
            p.diasFaltan === 1 ? 'Mañana' : `En ${p.diasFaltan} días`;
        return `
            <div class="bg-gradient-to-r from-pink-50 to-yellow-50 dark:from-pink-900/20 dark:to-yellow-900/20 rounded-xl p-3 border border-pink-200/50 dark:border-pink-500/20 flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div class="size-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <span class="material-symbols-outlined text-primary">cake</span>
                    </div>
                    <div>
                        <div class="font-bold text-[#111813] dark:text-white">${p.nombre || 'Sin nombre'}</div>
                        <div class="text-xs text-[#63886f]">${p.ministerio || ''}</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-sm font-semibold ${p.diasFaltan === 0 ? 'text-primary' : 'text-[#63886f]'}">${dayLabel}</div>
                    <div class="text-[10px] text-[#63886f]">${p.proximo.toLocaleDateString('es')}</div>
                </div>
            </div>`;
    }).join('');
}

function renderMiembros() {
    const ul = document.getElementById('miembrosList');
    if (!ul) return;
    
    const filtered = cacheMiembros.filter(m => {
        if (!searchMiembroText) return true;
        return (m.nombre || '').toLowerCase().includes(searchMiembroText.toLowerCase());
    });
    
    if (filtered.length === 0) {
        ul.innerHTML = `
            <div class="text-center py-6 text-[#63886f]">
                <span class="material-symbols-outlined text-3xl mb-2">person_off</span>
                <p class="text-sm">No se encontraron miembros</p>
            </div>`;
        return;
    }
    
    // Group by ministry
    const groups = {};
    filtered.forEach(m => {
        const min = m.ministerio || 'Sin ministerio';
        if (!groups[min]) groups[min] = [];
        groups[min].push(m);
    });
    
    let html = '';
    Object.keys(groups).sort().forEach(min => {
        html += `<div class="text-xs font-bold text-[#63886f] uppercase mt-4 mb-2">${min} (${groups[min].length})</div>`;
        groups[min].forEach(m => {
            html += `
                <div class="member-card bg-white dark:bg-[#1f3025] rounded-xl p-3 border border-[#f0f4f2] dark:border-white/10 flex items-center gap-3">
                    <div class="size-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span class="material-symbols-outlined text-primary">person</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-medium text-[#111813] dark:text-white truncate">${m.nombre || 'Sin nombre'}</div>
                        <div class="text-xs text-[#63886f] truncate">${m.telefono || m.email || ''}</div>
                    </div>
                </div>`;
        });
    });
    
    ul.innerHTML = html;
}

// ============ EXPORT FUNCTIONS ============
function exportToExcel() {
    const semana = currentWeekStart || semanaDomingo();
    const selectedWeek = weeksOfMonth.find(w => w.start === semana);
    const weekLabel = selectedWeek ? selectedWeek.label : semana;
    
    // UTF-8 BOM para que Excel lo lea correctamente con acentos
    let csv = '\uFEFFNombre,Ministerio,Capítulos,Ayunos,Almas,Horas,Minutos,Altares Familiares,Fecha\n';
    
    cacheReportes.forEach(d => {
        const reporteSemana = d.semanaInicio || semanaDomingo(d.fecha);
        const matchSemana = reporteSemana === semana;
        const minKey = (d.ministerio || '').toLowerCase();
        const matchMin = currentMinisterioFilter === 'todos' || minKey.includes(currentMinisterioFilter.toLowerCase());
        if (matchSemana && matchMin) {
            csv += `"${d.nombre || ''}","${d.ministerio || ''}",${d.capitulos || 0},${d.ayunos || 0},${d.almas || 0},${d.horas || 0},${d.minutos || 0},${d.altarFamiliar || 0},"${d.fecha || ''}"\n`;
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${weekLabel.replace(/ /g, '_')}_${currentMinisterioFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Archivo Excel descargado');
}

function exportToPDF() {
    const semana = currentWeekStart || semanaDomingo();
    const selectedWeek = weeksOfMonth.find(w => w.start === semana);
    const weekLabel = selectedWeek ? `${selectedWeek.label} (${selectedWeek.dateRange})` : semana;
    
    let content = `<html><head><meta charset='utf-8'><title>Reporte Semanal</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #19e65e; }
            h2 { color: #333; font-size: 14px; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #19e65e; color: #112116; }
            .totals { background: #f0f4f2; padding: 15px; border-radius: 8px; margin-top: 10px; }
        </style>
    </head><body>`;
    content += `<h1>Reporte Semanal</h1>`;
    content += `<h2>${weekLabel}</h2>`;
    content += `<p><b>Ministerio:</b> ${currentMinisterioFilter === 'todos' ? 'Todos' : currentMinisterioFilter}</p>`;
    content += `<table><tr><th>Nombre</th><th>Ministerio</th><th>Capítulos</th><th>Ayunos</th><th>Almas</th><th>Horas</th><th>Altares</th><th>Fecha</th></tr>`;
    
    cacheReportes.forEach(d => {
        const reporteSemana = d.semanaInicio || semanaDomingo(d.fecha);
        const matchSemana = reporteSemana === semana;
        const minKey = (d.ministerio || '').toLowerCase();
        const matchMin = currentMinisterioFilter === 'todos' || minKey.includes(currentMinisterioFilter.toLowerCase());
        if (matchSemana && matchMin) {
            content += `<tr><td>${d.nombre || ''}</td><td>${d.ministerio || ''}</td><td>${d.capitulos || 0}</td><td>${d.ayunos || 0}</td><td>${d.almas || 0}</td><td>${d.horas || 0}:${(d.minutos || 0).toString().padStart(2, '0')}</td><td>${d.altarFamiliar || 0}</td><td>${d.fecha || ''}</td></tr>`;
        }
    });
    
    content += `</table></body></html>`;
    const win = window.open('', '_blank');
    win.document.write(content);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
}

// ============ PASSWORD MODAL ============
function showLoginModal(isNewPassword = false) {
    const modal = document.getElementById('modalLogin');
    const msg = document.getElementById('loginMsg');
    const input = document.getElementById('inputPassword');
    const btn = document.getElementById('btnLoginSubmit');
    const error = document.getElementById('loginError');
    if (!modal) return Promise.resolve(false);
    
    msg.textContent = isNewPassword ? 'Define una contraseña para el Panel Pastoral.' : 'Ingresa la contraseña para continuar.';
    btn.textContent = isNewPassword ? 'Guardar' : 'Ingresar';
    input.value = '';
    error.classList.add('hidden');
    modal.classList.remove('hidden');
    input.focus();
    
    return new Promise(resolve => {
        function handleSubmit() {
            const val = input.value.trim();
            if (!val) return;
            const key = 'panelPwd';
            if (isNewPassword) {
                localStorage.setItem(key, val);
                modal.classList.add('hidden');
                btn.removeEventListener('click', handleSubmit);
                input.removeEventListener('keydown', handleKey);
                resolve(true);
            } else {
                if (val === localStorage.getItem(key)) {
                    modal.classList.add('hidden');
                    btn.removeEventListener('click', handleSubmit);
                    input.removeEventListener('keydown', handleKey);
                    resolve(true);
                } else {
                    error.classList.remove('hidden');
                    input.value = '';
                    input.focus();
                }
            }
        }
        function handleKey(e) { if (e.key === 'Enter') handleSubmit(); }
        btn.addEventListener('click', handleSubmit);
        input.addEventListener('keydown', handleKey);
    });
}

async function ensurePasswordAccess() {
    const key = 'panelPwd';
    const stored = localStorage.getItem(key);
    if (!stored) {
        return await showLoginModal(true);
    }
    return await showLoginModal(false);
}

// ============ SETTINGS ============
function handleChangePassword() {
    const current = document.getElementById('currentPassword');
    const newPwd = document.getElementById('newPassword');
    const confirm = document.getElementById('confirmPassword');
    const msg = document.getElementById('passwordMsg');
    const key = 'panelPwd';
    const stored = localStorage.getItem(key);
    
    if (stored && current.value !== stored) {
        msg.textContent = 'Contraseña actual incorrecta';
        msg.className = 'text-sm text-center text-red-500';
        msg.classList.remove('hidden');
        return;
    }
    
    if (!newPwd.value.trim()) {
        msg.textContent = 'Ingresa una nueva contraseña';
        msg.className = 'text-sm text-center text-red-500';
        msg.classList.remove('hidden');
        return;
    }
    
    if (newPwd.value !== confirm.value) {
        msg.textContent = 'Las contraseñas no coinciden';
        msg.className = 'text-sm text-center text-red-500';
        msg.classList.remove('hidden');
        return;
    }
    
    localStorage.setItem(key, newPwd.value.trim());
    msg.textContent = '¡Contraseña actualizada!';
    msg.className = 'text-sm text-center text-primary';
    msg.classList.remove('hidden');
    
    current.value = '';
    newPwd.value = '';
    confirm.value = '';
    
    showToast('Contraseña actualizada');
    setTimeout(() => msg.classList.add('hidden'), 3000);
}

// ============ NOTIFICATIONS ============
function openNotificationModal() {
    const modal = document.getElementById('modalNotificacion');
    if (modal) {
        modal.classList.remove('hidden');
        resetNotificationForm();
    }
}

function closeNotificationModal() {
    const modal = document.getElementById('modalNotificacion');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function resetNotificationForm() {
    currentNotifTarget = 'todos';
    selectedMiembroForNotif = null;
    
    document.querySelectorAll('.notif-target-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-[#112116]');
        btn.classList.add('bg-[#f0f4f2]', 'dark:bg-white/5');
    });
    const todosBtn = document.querySelector('.notif-target-btn[data-target="todos"]');
    if (todosBtn) {
        todosBtn.classList.add('active', 'bg-primary', 'text-[#112116]');
        todosBtn.classList.remove('bg-[#f0f4f2]', 'dark:bg-white/5');
    }
    
    document.getElementById('selectorMinisterio')?.classList.add('hidden');
    document.getElementById('selectorMiembro')?.classList.add('hidden');
    document.getElementById('notifTitulo').value = '';
    document.getElementById('notifMensaje').value = '';
    document.getElementById('buscarMiembroNotif').value = '';
    document.getElementById('miembroSeleccionadoId').value = '';
    document.getElementById('miembroSeleccionadoNombre')?.classList.add('hidden');
}

function setupNotificationTargetButtons() {
    document.querySelectorAll('.notif-target-btn').forEach(btn => {
        btn.onclick = () => {
            // Update active state
            document.querySelectorAll('.notif-target-btn').forEach(b => {
                b.classList.remove('active', 'bg-primary', 'text-[#112116]');
                b.classList.add('bg-[#f0f4f2]', 'dark:bg-white/5');
            });
            btn.classList.add('active', 'bg-primary', 'text-[#112116]');
            btn.classList.remove('bg-[#f0f4f2]', 'dark:bg-white/5');
            
            currentNotifTarget = btn.dataset.target;
            
            // Show/hide selectors
            document.getElementById('selectorMinisterio')?.classList.toggle('hidden', currentNotifTarget !== 'ministerio');
            document.getElementById('selectorMiembro')?.classList.toggle('hidden', currentNotifTarget !== 'miembro');
            
            // Reset member selection
            selectedMiembroForNotif = null;
            document.getElementById('miembroSeleccionadoId').value = '';
            document.getElementById('miembroSeleccionadoNombre')?.classList.add('hidden');
        };
    });
}

function setupMemberSearchForNotif() {
    const input = document.getElementById('buscarMiembroNotif');
    const list = document.getElementById('listaMiembrosNotif');
    
    if (!input || !list) return;
    
    input.oninput = () => {
        const search = input.value.toLowerCase().trim();
        if (!search) {
            list.innerHTML = '';
            return;
        }
        
        const matches = cacheMiembros.filter(m => 
            (m.nombre || '').toLowerCase().includes(search)
        ).slice(0, 5);
        
        if (matches.length === 0) {
            list.innerHTML = '<p class="text-xs text-[#63886f] py-2">No se encontraron miembros</p>';
            return;
        }
        
        list.innerHTML = matches.map(m => `
            <div class="miembro-option flex items-center gap-2 p-2 rounded-lg bg-[#f0f4f2] dark:bg-white/5 cursor-pointer hover:bg-primary/10" data-id="${m.id}" data-nombre="${m.nombre}">
                <span class="material-symbols-outlined text-primary text-sm">person</span>
                <span class="text-sm">${m.nombre}</span>
                <span class="text-xs text-[#63886f]">(${m.ministerio || ''})</span>
            </div>
        `).join('');
        
        // Add click handlers
        list.querySelectorAll('.miembro-option').forEach(opt => {
            opt.onclick = () => {
                selectedMiembroForNotif = {
                    id: opt.dataset.id,
                    nombre: opt.dataset.nombre
                };
                document.getElementById('miembroSeleccionadoId').value = opt.dataset.id;
                const nombreDiv = document.getElementById('miembroSeleccionadoNombre');
                if (nombreDiv) {
                    nombreDiv.textContent = `✓ ${opt.dataset.nombre}`;
                    nombreDiv.classList.remove('hidden');
                }
                list.innerHTML = '';
                input.value = '';
            };
        });
    };
}

async function sendNotification() {
    const titulo = document.getElementById('notifTitulo')?.value.trim();
    const mensaje = document.getElementById('notifMensaje')?.value.trim();
    
    // Validar usando el sistema centralizado
    clearValidationErrors();
    const validation = validateData(
        { nombre: titulo, ministerio: 'otros' }, // 'nombre' como proxy para 'titulo'
        {
            nombre: validators.nombre // Reutilizar validador de nombre para titulo
        }
    );
    
    if (!validation.isValid) {
        showToast('❌ El título debe tener entre 1 y 100 caracteres');
        return;
    }
    
    if (!mensaje || mensaje.length === 0) {
        showToast('❌ El mensaje no puede estar vacío');
        return;
    }
    
    let targetType = currentNotifTarget;
    let targetValue = null;
    
    if (currentNotifTarget === 'ministerio') {
        targetValue = document.getElementById('notifMinisterio')?.value;
        // Validar ministerio
        if (!validators.ministerio(targetValue)) {
            showToast('❌ Ministerio inválido');
            return;
        }
    } else if (currentNotifTarget === 'miembro') {
        if (!selectedMiembroForNotif) {
            showToast('Selecciona un miembro');
            return;
        }
        targetValue = selectedMiembroForNotif.id;
    }
    
    try {
        // Guardar en Firebase
        const notificationData = {
            titulo,
            mensaje,
            targetType, // 'todos', 'ministerio', 'miembro'
            targetValue, // null, 'Damas', or memberId
            creadoEn: new Date().toISOString(),
            leido: false
        };
        
        await addDoc(collection(db, `church_data/${churchId}/notificaciones`), notificationData);
        
        // 🔔 ENVIAR NOTIFICACIÓN PUSH MULTIPLATAFORMA
        await enviarNotificacionPush(titulo, mensaje, targetType, targetValue);
        
        showToast('Notificación enviada');
        closeNotificationModal();
    } catch (e) {
        console.error('Error enviando notificación:', e);
        showToast('Error al enviar');
    }
}

/**
 * 🔔 SISTEMA DE NOTIFICACIONES MULTIPLATAFORMA
 */
async function enviarNotificacionPush(titulo, mensaje, targetType, targetValue) {
    console.log('📱 Enviando notificación:', { titulo, mensaje, targetType, targetValue });
    
    // Detectar plataforma
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isAndroid && 'Notification' in window && Notification.permission === 'granted') {
        // 📱 ANDROID: Notificación Push nativa
        enviarNotificacionAndroid(titulo, mensaje);
    }
    
    if (isiOS) {
        // 🍎 iOS: Badge + Notificación en-app
        actualizarBadgeiOS();
        programarBannerEnApp(titulo, mensaje);
    }
    
    // Para usuarios en web (navegador)
    if (!isiOS && !isAndroid && 'Notification' in window && Notification.permission === 'granted') {
        enviarNotificacionWeb(titulo, mensaje);
    }
}

function enviarNotificacionAndroid(titulo, mensaje) {
    if ('serviceWorker' in navigator) {
        // Enviar a través del Service Worker
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(titulo, {
                body: mensaje,
                icon: '../icon-192.png',
                badge: '../icon-192-maskable.png',
                tag: 'yujo-notification',
                renotify: true,
                vibrate: [200, 100, 200],
                actions: [
                    { action: 'open', title: 'Abrir App', icon: '../icon-192.png' },
                    { action: 'dismiss', title: 'Cerrar' }
                ]
            });
        });
    } else {
        // Fallback: Notificación simple
        new Notification(titulo, {
            body: mensaje,
            icon: '../icon-192.png'
        });
    }
    console.log('📱 Notificación Android enviada');
}

function enviarNotificacionWeb(titulo, mensaje) {
    new Notification(titulo, {
        body: mensaje,
        icon: '../icon-192.png',
        tag: 'yujo-web-notification'
    });
    console.log('💻 Notificación Web enviada');
}

function actualizarBadgeiOS() {
    if ('setAppBadge' in navigator) {
        // Contar notificaciones no leídas en Firebase
        obtenerContadorNotificaciones().then(contador => {
            navigator.setAppBadge(contador);
            console.log('🍎 Badge iOS actualizado:', contador);
        });
    }
}

async function obtenerContadorNotificaciones() {
    try {
        const snap = await getDocs(collection(db, `church_data/${churchId}/notificaciones`));
        let contador = 0;
        snap.forEach(doc => {
            const data = doc.data();
            if (!data.leido) contador++;
        });
        return contador;
    } catch (e) {
        console.error('Error contando notificaciones:', e);
        return 0;
    }
}

function programarBannerEnApp(titulo, mensaje) {
    // Guardar en localStorage para mostrar cuando se abra la app
    const banners = JSON.parse(localStorage.getItem('pendingBanners') || '[]');
    banners.push({
        id: Date.now(),
        titulo,
        mensaje,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('pendingBanners', JSON.stringify(banners));
    console.log('🍎 Banner programado para iOS');
}

// ============ INITIALIZATION ============
window.addEventListener('DOMContentLoaded', () => {
    const idFromUrl = getQueryParam('id');
    const storedId = localStorage.getItem('lastChurchId');
    churchId = idFromUrl || storedId;
    
    console.log('🏛️ Inicializando Panel Pastoral');
    console.log('ID desde URL:', idFromUrl);
    console.log('ID almacenado:', storedId);
    console.log('Church ID final:', churchId);
    
    if (idFromUrl) {
        localStorage.setItem('lastChurchId', idFromUrl);
    } else if (churchId) {
        const url = new URL(window.location.href);
        url.searchParams.set('id', churchId);
        window.history.replaceState({}, '', url.toString());
    }

    const buildTarget = (path) => churchId ? `${path}?id=${encodeURIComponent(churchId)}` : path;

    // Navigation buttons
    const navInicio = document.getElementById('navInicio');
    const navReportes = document.getElementById('navReportes');
    const navAdd = document.getElementById('navAdd');
    const navMiembros = document.getElementById('navMiembros');
    const navSettings = document.getElementById('navSettings');

    if (navInicio) navInicio.onclick = () => switchSection('inicio');
    if (navReportes) navReportes.onclick = () => {
        switchSection('reportes');
        renderWeekSelector();
    };
    if (navMiembros) navMiembros.onclick = () => switchSection('miembros');
    if (navSettings) navSettings.onclick = () => switchSection('ajustes');
    if (navAdd) navAdd.onclick = () => openNotificationModal();
    
    // Notification modal setup
    setupNotificationTargetButtons();
    setupMemberSearchForNotif();
    
    const btnCerrarNotif = document.getElementById('cerrarModalNotificacion');
    if (btnCerrarNotif) btnCerrarNotif.onclick = closeNotificationModal;
    
    const btnEnviarNotif = document.getElementById('btnEnviarNotificacion');
    if (btnEnviarNotif) btnEnviarNotif.onclick = sendNotification;
    
    // Close modal on backdrop click
    const modalNotificacion = document.getElementById('modalNotificacion');
    if (modalNotificacion) {
        modalNotificacion.onclick = (e) => {
            if (e.target === modalNotificacion) closeNotificationModal();
        };
    }

    // Historial button
    const btnHistorial = document.getElementById('btnHistorial');
    if (btnHistorial) {
        btnHistorial.onclick = () => {
            showHistorial = !showHistorial;
            btnHistorial.innerHTML = showHistorial 
                ? `<span class="material-symbols-outlined text-sm">close</span> Ocultar historial`
                : `<span class="material-symbols-outlined text-sm">history</span> Ver historial`;
            btnHistorial.classList.toggle('bg-red-500/10', showHistorial);
            btnHistorial.classList.toggle('text-red-500', showHistorial);
            btnHistorial.classList.toggle('bg-primary/10', !showHistorial);
            btnHistorial.classList.toggle('text-primary', !showHistorial);
            renderWeekSelector();
            renderReportes();
        };
    }

    // Filter chips for reportes
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.onclick = () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentMinisterioFilter = chip.dataset.filter;
            renderReportes();
            updateQuickStats();
        };
    });

    // Cumple tabs
    document.querySelectorAll('.cumple-tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.cumple-tab').forEach(t => {
                t.classList.remove('active', 'bg-primary', 'text-[#112116]');
                t.classList.add('bg-[#f0f4f2]', 'dark:bg-white/5');
            });
            tab.classList.add('active', 'bg-primary', 'text-[#112116]');
            tab.classList.remove('bg-[#f0f4f2]', 'dark:bg-white/5');
            currentCumplePeriod = tab.dataset.period;
            renderCumples();
        };
    });

    // Search inputs
    const searchReporte = document.getElementById('searchReporte');
    const searchMiembro = document.getElementById('searchMiembro');
    
    if (searchReporte) {
        searchReporte.oninput = (e) => {
            searchReporteText = e.target.value;
            renderReportes();
        };
    }
    
    if (searchMiembro) {
        searchMiembro.oninput = (e) => {
            searchMiembroText = e.target.value;
            renderMiembros();
        };
    }

    // Botones para cambiar entre Semana y Mes
    const btnVerSemana = document.getElementById('btnVerSemana');
    const btnVerMes = document.getElementById('btnVerMes');
    
    if (btnVerSemana) {
        btnVerSemana.onclick = () => {
            currentPeriodView = 'semana';
            btnVerSemana.classList.add('bg-primary', 'text-[#112116]');
            btnVerSemana.classList.remove('text-[#63886f]');
            btnVerMes.classList.remove('bg-primary', 'text-[#112116]');
            btnVerMes.classList.add('text-[#63886f]');
            renderWeekSelector();
            renderReportes();
            updateQuickStats();
        };
    }
    
    if (btnVerMes) {
        btnVerMes.onclick = () => {
            currentPeriodView = 'mes';
            btnVerMes.classList.add('bg-primary', 'text-[#112116]');
            btnVerMes.classList.remove('text-[#63886f]');
            btnVerSemana.classList.remove('bg-primary', 'text-[#112116]');
            btnVerSemana.classList.add('text-[#63886f]');
            renderWeekSelector();
            renderReportes();
            updateQuickStats();
        };
    }

    // Export buttons
    const btnExportExcel = document.getElementById('btnExportExcel');
    const btnExportPDF = document.getElementById('btnExportPDF');
    if (btnExportExcel) btnExportExcel.onclick = exportToExcel;
    if (btnExportPDF) btnExportPDF.onclick = exportToPDF;

    // Password change
    const btnChangePassword = document.getElementById('btnChangePassword');
    if (btnChangePassword) btnChangePassword.onclick = handleChangePassword;

    // Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.onclick = () => {
            localStorage.removeItem('panelPwd');
            window.location.href = buildTarget('../index.html');
        };
    }

    // Bubble clicks to filter
    document.querySelectorAll('.bubble-glass').forEach(b => {
        b.onclick = () => {
            const min = b.getAttribute('data-ministerio');
            currentMinisterioFilter = min;
            document.querySelectorAll('.filter-chip').forEach(c => {
                c.classList.toggle('active', c.dataset.filter === min);
            });
            switchSection('reportes');
            renderWeekSelector();
            renderReportes();
            updateQuickStats();
        };
    });

    // Initialize week selector
    console.log('⏳ Inicializando selector de semanas...');
    renderWeekSelector();

    // Load data immediately (don't wait for auth)
    console.log('📥 Cargando datos...');
    cargarMiembros();
    cargarReportes().then(() => {
        console.log('✅ Datos cargados, actualizando UI');
        renderWeekSelector();
        renderReportes();
        updateQuickStats();
    });

    // Start authentication (doesn't block data loading)
    console.log('🔐 Iniciando autenticación...');
    ensurePasswordAccess().then(ok => {
        console.log('🔐 Autenticación:', ok ? 'exitosa' : 'fallida');
        if (!ok) {
            window.location.href = '../index.html';
        }
    });
});
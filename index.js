// index.js
import { db } from './firebase_config.js';
import { doc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// Utilidad para obtener parámetros de la URL (exportada globalmente)
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}
window.getQueryParam = getQueryParam;

function inicioMesActual() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0,10);
}

// ============ CAROUSEL PRINCIPAL (Stats + Ranking) ============
let currentPageIndex = 0; // 0 = stats, 1 = ranking
let currentStatIndex = 0;
const statOrder = ['capitulos', 'oracion', 'ayunos', 'almas'];
let mainCarouselInterval = null;
let statsCarouselInterval = null;

// Variables globales para carousel gamificado
let currentGamePage = 0;
let gameCarouselInterval;

const gamePages = [
    { id: 'carousel-lectores', listId: 'ranking-lectores', type: 'capitulos' },
    { id: 'carousel-oradores', listId: 'ranking-oradores', type: 'oracion' },
    { id: 'carousel-ayunadores', listId: 'ranking-ayunadores', type: 'ayunos' },
    { id: 'carousel-evangelistas', listId: 'ranking-evangelistas', type: 'almas' }
];

const indicatorColors = [
    'bg-blue-500 dark:bg-blue-400',     // Lectores
    'bg-amber-500 dark:bg-amber-400',   // Oradores
    'bg-red-500 dark:bg-red-400',       // Ayunadores
    'bg-green-500 dark:bg-green-400'    // Evangelistas
];

function initMainCarousel() {
    rotateGamePage();
    gameCarouselInterval = setInterval(rotateGamePage, 10000); // Cambiar cada 10s
    setupGameButtons();
    cargarRankingsGamificados();
}

function rotateGamePage() {
    const pages = gamePages;
    
    // Cambiar opacidad de todas las páginas
    pages.forEach((page, index) => {
        const el = document.getElementById(page.id);
        if (el) {
            el.style.opacity = index === currentGamePage ? '1' : '0';
            el.style.pointerEvents = index === currentGamePage ? 'auto' : 'none';
        }
    });
    
    // Actualizar indicadores
    const indicators = document.querySelectorAll('.gamification-indicator');
    indicators.forEach((indicator, i) => {
        if (i === currentGamePage) {
            indicator.classList.add('active');
            indicator.classList.remove(...indicatorColors);
            indicator.classList.add(indicatorColors[i]);
        } else {
            indicator.classList.remove('active');
            indicator.classList.remove(...indicatorColors);
            indicator.classList.add('bg-slate-300', 'dark:bg-slate-600');
        }
    });
    
    currentGamePage = (currentGamePage + 1) % pages.length;
}

function setupGameButtons() {
    const indicators = document.querySelectorAll('.gamification-indicator');
    indicators.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            currentGamePage = index;
            rotateGamePage();
            clearInterval(gameCarouselInterval);
            gameCarouselInterval = setInterval(rotateGamePage, 10000);
        });
    });
}

async function cargarRankingsGamificados() {
    const id = getQueryParam('id') || localStorage.getItem('lastChurchId');
    if (!id) return;
    
    try {
        const snap = await getDocs(collection(db, `church_data/${id}/reportes`));
        const inicioMes = inicioMesActual();
        
        // Agrupar por miembro
        const porMiembro = {};
        snap.forEach(d => {
            const r = d.data();
            if (r.fecha && r.fecha >= inicioMes) {
                const key = r.nombre || 'Anónimo';
                if (!porMiembro[key]) {
                    porMiembro[key] = { nombre: key, capitulos: 0, oracion: 0, ayunos: 0, almas: 0 };
                }
                porMiembro[key].capitulos += r.capitulos || 0;
                porMiembro[key].oracion += (r.horas || 0) * 60 + (r.minutos || 0);
                porMiembro[key].ayunos += r.ayunos || 0;
                porMiembro[key].almas += r.almas || 0;
            }
        });
        
        const miembros = Object.values(porMiembro);
        
        // Cargar cada ranking
        renderRanking('ranking-lectores', miembros, 'capitulos', 'Capítulos');
        renderRanking('ranking-oradores', miembros, 'oracion', 'Horas');
        renderRanking('ranking-ayunadores', miembros, 'ayunos', 'Ayunos');
        renderRanking('ranking-evangelistas', miembros, 'almas', 'Almas');
        
    } catch (e) {
        console.error('Error cargando rankings:', e);
        // Mantener placeholders si hay error
    }
}

function renderRanking(listId, miembros, metrica, label) {
    const ul = document.getElementById(listId);
    if (!ul) return;
    
    // Ordenar por métrica y tomar top 3
    const ranking = miembros
        .map(m => ({ ...m, value: m[metrica] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
    
    if (ranking.length === 0) {
        // Mostrar placeholders
        ul.innerHTML = `
            <li class="flex items-center gap-3 bg-white/80 dark:bg-black/20 rounded-xl px-4 py-3">
                <span class="text-2xl">🥇</span>
                <div class="flex-1"><span class="text-sm text-slate-400">Sin datos</span></div>
            </li>
            <li class="flex items-center gap-3 bg-white/80 dark:bg-black/20 rounded-xl px-4 py-3">
                <span class="text-2xl">🥈</span>
                <div class="flex-1"><span class="text-sm text-slate-400">Sin datos</span></div>
            </li>
            <li class="flex items-center gap-3 bg-white/80 dark:bg-black/20 rounded-xl px-4 py-3">
                <span class="text-2xl">🥉</span>
                <div class="flex-1"><span class="text-sm text-slate-400">Sin datos</span></div>
            </li>
        `;
        return;
    }
    
    // Formatear valores según métrica
    const formatValue = (value, metric) => {
        if (metric === 'oracion') {
            const h = Math.floor(value / 60);
            const m = value % 60;
            return `${h}h ${m}m`;
        }
        return String(value);
    };
    
    const medals = ['🥇', '🥈', '🥉'];
    ul.innerHTML = ranking.map((r, i) => `
        <li class="flex items-center justify-between bg-white/80 dark:bg-black/20 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <span class="text-2xl flex-shrink-0">${medals[i]}</span>
                <div class="min-w-0">
                    <div class="font-semibold text-slate-900 dark:text-slate-100 truncate">${r.nombre}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">#${i + 1}</div>
                </div>
            </div>
            <div class="flex-shrink-0 ml-2 text-right">
                <div class="text-sm font-bold text-slate-700 dark:text-slate-300">${formatValue(r.value, metrica)}</div>
                <div class="text-xs text-slate-400 dark:text-slate-500">${label}</div>
            </div>
        </li>
    `).join('');
}

async function mostrarNombreIglesia() {
    const id = getQueryParam('id') || localStorage.getItem('lastChurchId');
    if (id) {
        localStorage.setItem('lastChurchId', id);
    }
    if (!id) return;
    try {
        const docRef = doc(db, 'config_church', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const h1 = document.querySelector('h1');
            if (h1) {
                let html = `<span class='text-primary'>${data.nombre}</span>`;
                html += '<br><span class="text-base font-normal text-slate-500 dark:text-slate-400 block mt-1">Iglesia</span>';
                if (data.direccion) {
                    html += `<div class='text-sm text-slate-400 dark:text-slate-500 mt-1'>${data.direccion}</div>`;
                }
                h1.innerHTML = html;
            }
        }
    } catch (e) {
        // Si hay error, no cambia el título
    }
}

// Event listeners para modales
function setupModals() {
    const btnAcercaDe = document.getElementById('btnAcercaDe');
    const btnAyuda = document.getElementById('btnAyuda');
    const modalAcercaDe = document.getElementById('modalAcercaDe');
    const modalAyuda = document.getElementById('modalAyuda');
    const cerrarAcercaDe = document.getElementById('cerrarAcercaDe');
    const cerrarAyuda = document.getElementById('cerrarAyuda');

    // Abrir/cerrar modal Acerca de
    if (btnAcercaDe) {
        btnAcercaDe.addEventListener('click', () => {
            modalAcercaDe?.classList.remove('hidden');
        });
    }
    if (cerrarAcercaDe) {
        cerrarAcercaDe.addEventListener('click', () => {
            modalAcercaDe?.classList.add('hidden');
        });
    }
    modalAcercaDe?.addEventListener('click', (e) => {
        if (e.target === modalAcercaDe) {
            modalAcercaDe.classList.add('hidden');
        }
    });

    // Abrir/cerrar modal Ayuda
    if (btnAyuda) {
        btnAyuda.addEventListener('click', () => {
            modalAyuda?.classList.remove('hidden');
        });
    }
    if (cerrarAyuda) {
        cerrarAyuda.addEventListener('click', () => {
            modalAyuda?.classList.add('hidden');
        });
    }
    modalAyuda?.addEventListener('click', (e) => {
        if (e.target === modalAyuda) {
            modalAyuda.classList.add('hidden');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    mostrarNombreIglesia();
    cargarRankingWidget();
    setupModals();
});

async function cargarRankingWidget() {
    const churchId = getQueryParam('id') || localStorage.getItem('lastChurchId');
    console.log('🎯 Cargando ranking widget para churchId:', churchId);
    if (!churchId) return;
    
    try {
        const ref = collection(db, `church_data/${churchId}/reportes`);
        const snap = await getDocs(ref);
        console.log('📊 Documentos encontrados para widget:', snap.size);
        
        const reportes = [];
        const mesInicio = inicioMesActual();
        const now = new Date();
        const mesFin = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().substring(0, 10);
        
        snap.forEach(doc => {
            const data = doc.data();
            let fechaNormalizada = null;
            if (data.fecha) fechaNormalizada = data.fecha.substring(0, 10);
            else if (data.enviadoEn) fechaNormalizada = data.enviadoEn.substring(0, 10);
            
            if (!fechaNormalizada || (fechaNormalizada >= mesInicio && fechaNormalizada <= mesFin)) {
                reportes.push({
                    nombre: data.nombre || 'Sin nombre',
                    capitulos: parseInt(data.capitulos) || 0,
                    horas: parseInt(data.horas) || 0,
                    ayunos: parseInt(data.ayunos) || 0
                });
            }
        });

        console.log('📋 Reportes del mes para widget:', reportes.length);

        // Top 3 de cada categoría
        const topLectura = [...reportes].sort((a, b) => b.capitulos - a.capitulos).slice(0, 3);
        const topOracion = [...reportes].sort((a, b) => b.horas - a.horas).slice(0, 3);
        const topAyuno = [...reportes].sort((a, b) => b.ayunos - a.ayunos).slice(0, 3);

        renderRankingWidget('lectura', topLectura, 'capitulos');
        renderRankingWidget('oracion', topOracion, 'horas');
        renderRankingWidget('ayuno', topAyuno, 'ayunos');
    } catch (error) {
        console.error('❌ Error cargando ranking widget:', error);
    }
}

function renderRankingWidget(tipo, lista, campo) {
    const containers = {
        lectura: document.querySelector('#ranking-widget .flex.gap-2:nth-child(1) ul'),
        oracion: document.querySelector('#ranking-widget .flex.gap-2:nth-child(2) ul'), 
        ayuno: document.querySelector('#ranking-widget .flex.gap-2:nth-child(3) ul')
    };
    
    const ul = containers[tipo];
    if (!ul) return;
    
    const medallas = ['🥇', '🥈', '🥉'];
    ul.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        const item = lista[i];
        const li = document.createElement('li');
        li.className = 'flex-1 flex flex-col items-center bg-blue-50 dark:bg-blue-900/20 rounded-xl py-2';
        if (tipo === 'oracion') li.className = li.className.replace('blue', 'amber');
        if (tipo === 'ayuno') li.className = li.className.replace('blue', 'red');
        
        li.innerHTML = `
            <span class="text-lg">${medallas[i]}</span>
            <span class="text-xs font-semibold text-center px-1">${item ? (item.nombre.length > 8 ? item.nombre.substring(0, 8) + '...' : item.nombre) : 'Sin datos'}</span>
            ${item ? `<span class="text-xs font-bold">${item[campo]}${campo === 'horas' ? 'h' : ''}</span>` : ''}
        `;
        ul.appendChild(li);
    }
}
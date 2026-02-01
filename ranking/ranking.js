
import { db } from '../firebase_config.js';
import { collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

function getQueryParam(param) {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get(param);
}

function inicioMesActual() {
	const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);
}

function finMesActual() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().substring(0, 10);
}

function normalizarFecha(fechaInput) {
	if (!fechaInput) return null;
	if (typeof fechaInput === 'string') return fechaInput.substring(0, 10);
	if (fechaInput instanceof Date) return fechaInput.toISOString().substring(0, 10);
	return null;
}

async function cargarRanking() {
    const churchId = getQueryParam('id') || localStorage.getItem('lastChurchId');
    console.log('🎯 Cargando ranking para churchId:', churchId);
    if (!churchId) {
        console.error('❌ No hay churchId para cargar ranking');
        return;
    }
    
    try {
        const ref = collection(db, `church_data/${churchId}/reportes`);
        const snap = await getDocs(ref);
        console.log('📊 Documentos encontrados:', snap.size);
        
        const reportes = [];
        const mesInicio = inicioMesActual();
        const mesFin = finMesActual();
        console.log('📅 Filtrando por mes actual:', mesInicio, '-', mesFin);

        snap.forEach(doc => {
            const data = doc.data();
            console.log('📄 Procesando reporte RAW:', {
                id: doc.id,
                nombre: data.nombre,
                fecha: data.fecha,
                enviadoEn: data.enviadoEn,
                capitulos: data.capitulos,
                capitulosType: typeof data.capitulos,
                horas: data.horas, 
                horasType: typeof data.horas,
                ayunos: data.ayunos,
                ayunosType: typeof data.ayunos,
                todosLosCampos: Object.keys(data)
            });
            
            let fechaNormalizada = null;
            if (data.fecha) {
                fechaNormalizada = normalizarFecha(data.fecha);
            } else if (data.enviadoEn) {
                fechaNormalizada = normalizarFecha(data.enviadoEn);
            }
            
            // Filtrar por mes actual usando strings YYYY-MM-DD
            let esDelMes = false;
            if (fechaNormalizada) {
                esDelMes = fechaNormalizada >= mesInicio && fechaNormalizada <= mesFin;
                console.log('📅 Fecha normalizada:', fechaNormalizada, 'Es del mes:', esDelMes);
            } else {
                // Si no hay fecha, incluir por precaución
                esDelMes = true;
                console.log('⚠️ No hay fecha, incluyendo reporte');
            }
            
            if (esDelMes) {
                // Los datos pueden venir como strings, asegurar conversión
                const capitulosVal = data.capitulos;
                const horasVal = data.horas;
                const ayunosVal = data.ayunos;
                
                const reporte = {
                    nombre: data.nombre || 'Sin nombre',
                    capitulos: Number(capitulosVal) || 0,
                    horas: Number(horasVal) || 0,
                    ayunos: Number(ayunosVal) || 0
                };
                reportes.push(reporte);
                console.log('✅ Reporte agregado con valores:', {
                    nombre: reporte.nombre,
                    capitulos: `${capitulosVal} -> ${reporte.capitulos}`, 
                    horas: `${horasVal} -> ${reporte.horas}`,
                    ayunos: `${ayunosVal} -> ${reporte.ayunos}`
                });
            } else {
                console.log('❌ Reporte fuera del mes actual');
            }
        });

        console.log('📋 Total reportes del mes:', reportes.length);

        // Lectura bíblica (capítulos)
        const topLectura = [...reportes].sort((a, b) => b.capitulos - a.capitulos).slice(0, 3);
        // Oración (horas)
        const topOracion = [...reportes].sort((a, b) => b.horas - a.horas).slice(0, 3);
        // Ayuno (días)
        const topAyuno = [...reportes].sort((a, b) => b.ayunos - a.ayunos).slice(0, 3);

        console.log('🥇 Top Lectura (caps):', topLectura.map(r => `${r.nombre}: ${r.capitulos}`));
        console.log('🙏 Top Oración (hrs):', topOracion.map(r => `${r.nombre}: ${r.horas}`));
        console.log('⏰ Top Ayuno (días):', topAyuno.map(r => `${r.nombre}: ${r.ayunos}`));

        renderRanking('lectura', topLectura, 'capitulos');
        renderRanking('oracion', topOracion, 'horas');
        renderRanking('ayuno', topAyuno, 'ayunos');
    } catch (error) {
        console.error('❌ Error cargando ranking:', error);
    }
}

function renderRanking(tipo, lista, campo) {
	const ul = document.getElementById(`ranking-${tipo}`);
    if (!ul) {
        console.error(`❌ No se encontró elemento ranking-${tipo}`);
        return;
    }
    
    console.log(`🎨 Renderizando ranking ${tipo} con ${lista.length} elementos:`, lista);
    
    ul.innerHTML = '';
    const medallas = ['🥇', '🥈', '🥉'];
    for (let i = 0; i < 3; i++) {
        const item = lista[i];
        const valorTexto = item ? `${item[campo]}${campo==='horas' ? 'h' : ''}` : '';
        
        ul.innerHTML += `<li class="flex items-center gap-3 bg-white/80 dark:bg-black/20 rounded-xl px-4 py-3">
            <span class="text-2xl">${medallas[i]}</span>
            <div class="flex-1 font-semibold">${item ? item.nombre : 'Sin datos'}</div>
            <span class="text-xs font-bold">${valorTexto}</span>
        </li>`;
    }
    
    console.log(`✅ Ranking ${tipo} renderizado en DOM`);
}

window.addEventListener('DOMContentLoaded', cargarRanking);

// Importamos la instancia 'db' ya configurada en tu archivo principal
import { db } from "../firebase_config.js";
// Importamos solo lo necesario de Firestore
import { 
    collection, 
    addDoc, 
    setDoc, 
    doc, 
    getDocs, 
    query, 
    orderBy,
    where,
    increment
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Elementos del DOM
const form = document.getElementById('formIglesia');
const nombreInput = document.getElementById('nombreIglesia');
const direccionInput = document.getElementById('direccionIglesia');
const listaIglesias = document.getElementById('listaIglesias');
const statusMessage = document.getElementById('statusMessage');

// --- LÓGICA PRINCIPAL ---

// 1. Cargar iglesias al iniciar
window.addEventListener('DOMContentLoaded', () => {
    cargarIglesias();
    cargarEstadisticas();
});

// 2. Manejar el envío del formulario
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarEstado('Procesando...', 'text-slate-500');

    const nombre = nombreInput.value.trim();
    const direccion = direccionInput.value.trim();

    try {
        // A) Crear registro en 'config_church' (Visual y Configuración)
        const docRef = await addDoc(collection(db, "config_church"), {
            nombre: nombre,
            direccion: direccion,
            createdAt: new Date().toISOString()
        });

        const idIglesia = docRef.id;

        // B) Inicializar documento en 'church_data' (Para reportes futuros)
        // Esto previene errores de "documento no encontrado" al subir reportes
        await setDoc(doc(db, "church_data", idIglesia), {
            nombre: nombre,
            totalMiembros: 0,
            ultimoReporte: null,
            creadoEn: new Date().toISOString()
        });

        mostrarEstado('¡Iglesia creada con éxito!', 'text-emerald-600');
        form.reset();
        cargarIglesias(); // Recargar la lista inmediatamente

    } catch (error) {
        console.error("Error:", error);
        mostrarEstado('Error al crear: ' + error.message, 'text-red-500');
    }
});

// --- FUNCIONES AUXILIARES ---

async function cargarIglesias() {
    listaIglesias.innerHTML = '<li class="text-center py-8 text-slate-400 animate-pulse">Cargando iglesias...</li>';
    
    try {
        const q = query(collection(db, "config_church"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            listaIglesias.innerHTML = `
                <div class="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    No hay iglesias registradas aún.
                </div>`;
            return;
        }

        // Limpiar y mostrar iglesias inmediatamente SIN esperar estadísticas
        listaIglesias.innerHTML = '';
        
        querySnapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            // Construir la URL absoluta
            const baseUrl = window.location.origin; 
            const accessLink = `${baseUrl}/index.html?id=${id}`;

            const item = document.createElement('li');
            item.className = "bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-indigo-200 transition-colors";
            item.id = `iglesia-${id}`;
            
            item.innerHTML = `
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                        <h3 class="font-bold text-slate-800 text-lg">${data.nombre}</h3>
                        <div class="flex gap-2">
                            <span class="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-semibold animate-pulse">Cargando...</span>
                        </div>
                    </div>
                    <p class="text-slate-500 text-sm flex items-center gap-1">
                        <span class="material-symbols-rounded text-sm">location_on</span>
                        ${data.direccion}
                    </p>
                    <p class="text-xs text-slate-300 font-mono mt-1">ID: ${id}</p>
                </div>
                
                <div class="flex flex-col items-end gap-2 w-full md:w-auto">
                    <div class="flex items-center gap-2 w-full md:w-auto">
                        <input type="text" readonly value="${accessLink}" 
                            class="text-xs bg-slate-50 border border-slate-200 text-slate-600 rounded p-2 w-full md:w-64 font-mono select-all">
                        
                        <button onclick="copiarAlPortapapeles('${accessLink}')" 
                            class="bg-indigo-50 text-indigo-600 p-2 rounded-lg hover:bg-indigo-100 transition-colors"
                            title="Copiar Link">
                            <span class="material-symbols-rounded">content_copy</span>
                        </button>
                    </div>
                    <a href="${accessLink}" target="_blank" class="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                        Probar enlace <span class="material-symbols-rounded text-sm">open_in_new</span>
                    </a>
                </div>
            `;
            listaIglesias.appendChild(item);
            
            // Cargar estadísticas de forma asíncrona sin bloquear
            cargarEstadisticasIglesia(id);
        });

    } catch (error) {
        listaIglesias.innerHTML = `<p class="text-red-500 text-center">Error cargando lista: ${error.message}</p>`;
    }
}

// Nueva función para cargar estadísticas de una iglesia específica
async function cargarEstadisticasIglesia(id) {
    try {
        const [reportesSnap, accessSnap] = await Promise.all([
            getDocs(collection(db, `church_data/${id}/reportes`)),
            getDocs(collection(db, `church_data/${id}/access_logs`))
        ]);
        
        const totalReportes = reportesSnap.size;
        const totalAccesos = accessSnap.size;
        
        // Actualizar el elemento en el DOM
        const item = document.getElementById(`iglesia-${id}`);
        if (item) {
            const badgesDiv = item.querySelector('.flex.gap-2');
            if (badgesDiv) {
                badgesDiv.innerHTML = `
                    <span class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">${totalReportes} reportes</span>
                    <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">${totalAccesos} accesos</span>
                `;
            }
        }
    } catch (e) {
        console.error('Error loading stats for', id, e);
    }

    } catch (error) {
        listaIglesias.innerHTML = `<p class="text-red-500 text-center">Error cargando lista: ${error.message}</p>`;
    }
}

// Función global para el botón de copiar
window.copiarAlPortapapeles = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        alert("✅ Link copiado al portapapeles");
    }).catch(err => {
        console.error('Error al copiar: ', err);
    });
};

function mostrarEstado(mensaje, colorClass) {
    statusMessage.textContent = mensaje;
    statusMessage.className = `mt-4 text-center text-sm font-bold ${colorClass}`;
    statusMessage.classList.remove('hidden');
    
    // Ocultar mensaje después de 3 segundos
    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 5000);
}

// ============ ESTADÍSTICAS DE REPORTES ============

async function cargarEstadisticas() {
    const container = document.getElementById('estadisticasIglesias');
    if (!container) return;
    
    try {
        const iglesiasSnap = await getDocs(collection(db, "config_church"));
        
        // Cargar estadísticas de todas las iglesias en paralelo
        const estadisticasPromises = iglesiasSnap.docs.map(async (iglesia) => {
            const idIglesia = iglesia.id;
            const data = iglesia.data();
            
            // Cargar reportes y accesos en paralelo
            const [reportesSnap, accessLogsSnap] = await Promise.all([
                getDocs(collection(db, `church_data/${idIglesia}/reportes`)),
                getDocs(collection(db, `church_data/${idIglesia}/access_logs`))
            ]);
            
            const totalReportes = reportesSnap.size;
            const totalAccesos = accessLogsSnap.size;
            const ultimoAcceso = accessLogsSnap.docs
                .map(d => d.data().timestamp)
                .filter(t => t)
                .sort((a, b) => new Date(b) - new Date(a))[0];
            
            return {
                id: idIglesia,
                nombre: data.nombre,
                totalReportes,
                totalAccesos,
                ultimoAcceso: ultimoAcceso ? new Date(ultimoAcceso) : null
            };
        });
        
        const estadisticas = await Promise.all(estadisticasPromises);
        
        // Ordenar por total de reportes
        estadisticas.sort((a, b) => b.totalReportes - a.totalReportes);
        
        if (estadisticas.length === 0) {
            container.innerHTML = '<div class="text-center py-8 text-slate-400">No hay datos aún</div>';
            return;
        }
        
        container.innerHTML = estadisticas.map(est => {
            const ultimoAccesoText = est.ultimoAcceso 
                ? est.ultimoAcceso.toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Nunca';
            
            return `
                <div class="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-4 rounded-xl">
                    <div class="flex justify-between items-start mb-3">
                        <h3 class="font-bold text-slate-800">${est.nombre}</h3>
                        <span class="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full font-semibold">${est.id}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="bg-white rounded-lg p-3 border border-purple-100">
                            <div class="text-2xl font-bold text-purple-600">${est.totalReportes}</div>
                            <div class="text-xs text-slate-500">Reportes Totales</div>
                        </div>
                        <div class="bg-white rounded-lg p-3 border border-indigo-100">
                            <div class="text-2xl font-bold text-indigo-600">${est.totalAccesos}</div>
                            <div class="text-xs text-slate-500">Accesos al Link</div>
                        </div>
                    </div>
                    <div class="mt-3 text-xs text-slate-600">
                        <span class="material-symbols-rounded text-sm align-middle">schedule</span>
                        Último acceso: <span class="font-semibold">${ultimoAccesoText}</span>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        container.innerHTML = `<p class="text-red-500 text-center">Error: ${error.message}</p>`;
    }
}
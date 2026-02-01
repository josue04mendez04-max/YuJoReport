
import { db } from '../firebase_config.js';
import { collection, addDoc, doc, getDoc, getDocs, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { validators, validateData, showValidationErrors, clearValidationErrors } from '../validators.js';

function getQueryParam(param) {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get(param);
}

// ============ TRACK ACCESS LOG ============
async function registrarAcceso(churchId) {
	if (!churchId) return;
	try {
		await addDoc(collection(db, `church_data/${churchId}/access_logs`), {
			timestamp: new Date().toISOString(),
			userAgent: navigator.userAgent,
			referrer: document.referrer || 'direct'
		});
	} catch (e) {
		console.error('Error registering access:', e);
	}
}

function aplicarTema(ministerio) {
	const body = document.body;
	body.classList.remove('theme-damas', 'theme-ninos', 'theme-jovenes');
	switch ((ministerio || '').toLowerCase()) {
		case 'damas':
			body.classList.add('theme-damas');
			break;
		case 'niños':
		case 'ninos':
			body.classList.add('theme-ninos');
			break;
		case 'jovenes':
		case 'jóvenes':
			body.classList.add('theme-jovenes');
			break;
		default:
			// caballeros u otro: tema normal
			break;
	}
}

function fechaHoyISO() {
	return new Date().toISOString().substring(0,10);
}

function inicioSemanaDomingo(fechaStr) {
	const d = fechaStr ? new Date(fechaStr) : new Date();
	const dia = d.getDay(); // 0 domingo
	const diff = d.getDate() - dia;
	const domingo = new Date(d);
	domingo.setDate(diff);
	return domingo.toISOString().substring(0,10);
}

// Acceso global al miembro actual
let obtenerMiembroActual = () => null;
let churchId = null;
const countersControl = {};
let solicitarGuardarMiembro = null;
let notificacionesCargadas = [];
let enviarReporteAlGuardarMiembro = false; // Bandera para enviar reporte después de guardar miembro

// ============ NOTIFICATIONS ============
async function cargarNotificaciones() {
    if (!churchId) return;
    
    const miembro = obtenerMiembroActual ? obtenerMiembroActual() : null;
    const ministerio = document.getElementById('ministerioInput')?.value || '';
    
    try {
        const notifsRef = collection(db, `church_data/${churchId}/notificaciones`);
        const snapshot = await getDocs(notifsRef);
        
        notificacionesCargadas = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Filter: show if targets 'todos', or matches ministerio, or matches this member
            let shouldShow = false;
            if (data.targetType === 'todos') {
                shouldShow = true;
            } else if (data.targetType === 'ministerio' && ministerio) {
                shouldShow = data.targetValue?.toLowerCase() === ministerio.toLowerCase();
            } else if (data.targetType === 'miembro' && miembro?.docId) {
                shouldShow = data.targetValue === miembro.docId;
            }
            
            if (shouldShow) {
                notificacionesCargadas.push({ id: doc.id, ...data });
            }
        });
        
        // Sort by date descending
        notificacionesCargadas.sort((a, b) => new Date(b.creadoEn) - new Date(a.creadoEn));
        
        // Update badge
        updateNotificationBadge();
        
    } catch (e) {
        console.error('Error cargando notificaciones:', e);
    }
}

function updateNotificationBadge() {
    const btn = document.getElementById('btnNotificaciones');
    if (!btn) return;
    
    // Remove existing badge
    const existingBadge = btn.querySelector('.notif-badge');
    if (existingBadge) existingBadge.remove();
    
    if (notificacionesCargadas.length > 0) {
        const badge = document.createElement('span');
        badge.className = 'notif-badge absolute -top-1 -right-1 size-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold';
        badge.textContent = notificacionesCargadas.length > 9 ? '9+' : notificacionesCargadas.length;
        btn.style.position = 'relative';
        btn.appendChild(badge);
    }
}

function renderNotificaciones() {
    const lista = document.getElementById('listaNotificaciones');
    if (!lista) return;
    
    if (notificacionesCargadas.length === 0) {
        lista.innerHTML = '<p class="text-slate-500 dark:text-slate-400 text-center py-4">No tienes notificaciones.</p>';
        return;
    }
    
    lista.innerHTML = notificacionesCargadas.map(n => {
        const fecha = new Date(n.creadoEn);
        const fechaStr = fecha.toLocaleDateString('es', { day: 'numeric', month: 'short' });
        return `
            <div class="bg-slate-50 dark:bg-white/5 rounded-xl p-4 mb-2">
                <div class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-primary mt-0.5">campaign</span>
                    <div class="flex-1">
                        <h4 class="font-bold text-sm">${n.titulo}</h4>
                        <p class="text-xs text-slate-600 dark:text-slate-300 mt-1">${n.mensaje}</p>
                        <div class="flex items-center justify-between mt-3">
                            <span class="text-xs text-slate-400">${fechaStr}</span>
                            <button class="text-xs px-3 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-medium" data-notif-id="${n.id}" data-marcar-leido="1">
                                Marcar como leído
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Setup read buttons
    lista.querySelectorAll('[data-marcar-leido]').forEach(btn => {
        btn.onclick = () => {
            const notifId = btn.dataset.notifId;
            marcarNotificacionComoLeida(notifId);
        };
    });
}

async function marcarNotificacionComoLeida(notifId) {
    // Remove from display immediately
    notificacionesCargadas = notificacionesCargadas.filter(n => n.id !== notifId);
    renderNotificaciones();
    updateNotificationBadge();
}

function setupNotificacionesModal() {
    const btn = document.getElementById('btnNotificaciones');
    const modal = document.getElementById('modalNotificaciones');
    const cerrar = document.getElementById('cerrarNotificaciones');
    
    if (btn && modal) {
        btn.onclick = () => {
            renderNotificaciones();
            modal.classList.remove('hidden');
        };
    }
    
    if (cerrar && modal) {
        cerrar.onclick = () => modal.classList.add('hidden');
    }
    
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        };
    }
}


function setupCard(cardId, countId, opts = {}) {
	const card = document.getElementById(cardId);
	const count = document.getElementById(countId);
	
	if (!card || !count) {
		console.error(`❌ setupCard: elementos no encontrados - cardId: ${cardId}, countId: ${countId}`);
		return;
	}
	
	let value = 0;
	function render() {
		if (opts.minutes) {
			// Mostrar en formato h:mm
			const h = Math.floor(value / 60);
			const m = value % 60;
			count.textContent = h + ':' + (m < 10 ? '0' : '') + m;
		} else {
			count.textContent = value;
		}
	}
	
	// Capturar clicks directamente en la tarjeta, sin overlays intermedios
	card.addEventListener('click', function(e) {
		// Prevenir que el click llegue a otros elementos
		e.stopPropagation();
		
		const rect = card.getBoundingClientRect();
		const x = e.clientX - rect.left;
		if (x < rect.width / 2) {
			// Lado izquierdo: restar
			if (opts.minutes) {
				if (value >= 30) value -= 30;
			} else {
				if (value > 0) value--;
			}
		} else {
			// Lado derecho: sumar
			if (opts.minutes) {
				value += 30;
			} else {
				value++;
			}
		}
		render();
	});
	
	render();
	// Permite reiniciar desde fuera
	countersControl[cardId] = {
		set: (newVal) => { value = Math.max(0, newVal || 0); render(); }
	};
}


window.onload = async function() {
	const idFromUrl = getQueryParam('id');
	const storedId = localStorage.getItem('lastChurchId');
	churchId = idFromUrl || storedId;
	
	console.log('🔍 Inicializando reporte_ministerial');
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
	
	// Register access
	if (churchId) {
		registrarAcceso(churchId);
	}
	
	// Setup button to return to index
	const btnVolverAlIndex = document.getElementById('btnVolverAlIndex');
	if (btnVolverAlIndex) {
		btnVolverAlIndex.onclick = () => {
			const targetUrl = churchId ? `../index.html?id=${encodeURIComponent(churchId)}` : '../index.html';
			window.location.href = targetUrl;
		};
	}

	setupCard('capitulosCard', 'capitulosCount');
	setupCard('horasCard', 'horasCount', {minutes: true});
	setupCard('ayunosCard', 'ayunosCount');
	setupCard('almasCard', 'almasCount');

	function resetMetricas() {
		countersControl['capitulosCard']?.set(0);
		countersControl['horasCard']?.set(0);
		countersControl['ayunosCard']?.set(0);
		countersControl['almasCard']?.set(0);
		altar = true;
		updateAltar();
	}

	// Mostrar nombre de la iglesia en cabecera y título de página
	if (churchId) {
		try {
			const docRef = doc(db, 'config_church', churchId);
			const docSnap = await getDoc(docRef);
			if (docSnap.exists()) {
				const data = docSnap.data();
				const titulo = document.getElementById('tituloIglesia');
				if (titulo) {
					titulo.innerHTML = `Reporte, iglesia <span class='text-primary'>${data.nombre}</span>`;
				}
				// Actualizar título de la pestaña del navegador
				const pageTitle = document.getElementById('pageTitle');
				if (pageTitle) {
					pageTitle.textContent = `Reporte ${data.nombre}`;
				}
			}
		} catch (e) {
			console.error('Error al cargar datos de la iglesia:', e);
		}
	}

	// Dropdown personalizado ministerio
	const btn = document.getElementById('ministerioDropdownBtn');
	const list = document.getElementById('ministerioDropdownList');
	const text = document.getElementById('ministerioDropdownText');
	const input = document.getElementById('ministerioInput');
	
	if (btn && list && text && input) {
		btn.onclick = function(e) {
			e.stopPropagation();
			list.classList.toggle('hidden');
		};
		list.querySelectorAll('li').forEach(function(li) {
			li.onclick = function() {
				text.textContent = li.textContent;
				input.value = li.getAttribute('data-value');
				list.classList.add('hidden');
				aplicarTema(input.value);
			};
		});
		document.addEventListener('click', function(e) {
			list.classList.add('hidden');
		});
	} else {
		console.error('❌ Elementos de ministerio dropdown no encontrados', { btn, list, text, input });
	}

	// Toggle altar familiar
	let altar = true;
	const btnSi = document.getElementById('altarSi');
	const btnNo = document.getElementById('altarNo');
	function updateAltar() {
		if (altar) {
			btnSi.classList.add('bg-white', 'dark:bg-primary', 'shadow-sm', 'text-primary', 'dark:text-background-dark');
			btnNo.classList.remove('bg-white', 'dark:bg-primary', 'shadow-sm', 'text-primary', 'dark:text-background-dark');
			btnNo.classList.add('bg-transparent', 'text-slate-500', 'dark:text-slate-400');
		} else {
			btnNo.classList.add('bg-white', 'dark:bg-primary', 'shadow-sm', 'text-primary', 'dark:text-background-dark');
			btnSi.classList.remove('bg-white', 'dark:bg-primary', 'shadow-sm', 'text-primary', 'dark:text-background-dark');
			btnSi.classList.add('bg-transparent', 'text-slate-500', 'dark:text-slate-400');
		}
	}
	
	if (btnSi && btnNo) {
		btnSi.onclick = function() { altar = true; updateAltar(); };
		btnNo.onclick = function() { altar = false; updateAltar(); };
		updateAltar();
	} else {
		console.error('❌ Botones de altar no encontrados', { btnSi, btnNo });
	}

	// --- MODAL NOTIFICACIONES ---
	const btnNotificaciones = document.getElementById('btnNotificaciones');
	const modalNotificaciones = document.getElementById('modalNotificaciones');
	const cerrarNotificaciones = document.getElementById('cerrarNotificaciones');
	
	if (btnNotificaciones && modalNotificaciones && cerrarNotificaciones) {
		btnNotificaciones.onclick = (e) => { 
			e.stopPropagation();
			modalNotificaciones.classList.remove('hidden'); 
		};
		cerrarNotificaciones.onclick = () => { 
			modalNotificaciones.classList.add('hidden'); 
		};
		// Cerrar al hacer click fuera del modal
		modalNotificaciones.onclick = (e) => {
			if (e.target === modalNotificaciones) {
				modalNotificaciones.classList.add('hidden');
			}
		};
	}

	// --- MODAL MIEMBROS Y LOCALSTORAGE + FIREBASE ---
	const btnMiembros = document.getElementById('btnMiembros');
	const modalMiembros = document.getElementById('modalMiembros');
	const cerrarMiembros = document.getElementById('cerrarMiembros');
	const listaMiembros = document.getElementById('listaMiembros');
	const btnGuardarMiembroActual = document.getElementById('btnGuardarMiembroActual');
	const inputNacimientoMiembro = document.getElementById('inputNacimientoMiembro');
	const textoModalMiembros = modalMiembros ? modalMiembros.querySelector('p') : null;

	function ensureAnimStyle() {
		if (document.getElementById('modalMiembroAnim')) return;
		const st = document.createElement('style');
		st.id = 'modalMiembroAnim';
		st.textContent = `@keyframes popGrow{from{transform:scale(0.65) translate(40px,-40px);opacity:0;}to{transform:scale(1) translate(0,0);opacity:1;}} .pop-grow{transform-origin:top right;animation:popGrow 240ms ease-out;}`;
		document.head.appendChild(st);
	}

	// Definir siempre la función para mostrar el modal de guardar miembro
	solicitarGuardarMiembro = (nombre, ministerio) => {
		if (!modalMiembros) return;
		ensureAnimStyle();
		if (textoModalMiembros) {
			const minTxt = ministerio ? ` (${ministerio})` : '';
			textoModalMiembros.textContent = `Guarda a ${nombre || 'este miembro'}${minTxt} para acelerar el próximo reporte y registrar su fecha de nacimiento.`;
		}
		const card = modalMiembros.querySelector('div');
		if (card) {
			card.classList.remove('pop-grow');
			void card.offsetWidth;
			card.classList.add('pop-grow');
		}
		modalMiembros.classList.remove('hidden');
	};

	if (btnMiembros && modalMiembros && cerrarMiembros) {
		function getMiembros() {
			return JSON.parse(localStorage.getItem('miembrosReporte') || '[]');
		}
		function setMiembros(arr) {
			localStorage.setItem('miembrosReporte', JSON.stringify(arr));
		}
		function setMiembroActual(idx) {
			localStorage.setItem('miembroActualReporte', idx);
		}
		function getMiembroActual() {
			return parseInt(localStorage.getItem('miembroActualReporte') || '0', 10);
		}

		function renderMiembros() {
			const miembros = getMiembros();
			listaMiembros.innerHTML = '';
			
			if (miembros.length === 0) {
				listaMiembros.innerHTML = '<li class="text-xs text-slate-400 py-2">No tienes miembros guardados aún.</li>';
				return;
			}
			miembros.forEach((m, idx) => {
				const li = document.createElement('li');
				li.className = 'flex items-center justify-between gap-2 bg-slate-100 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm';
				const fechaTxt = m.nacimiento ? `<span class='text-[10px] text-slate-400'>${m.nacimiento}</span>` : '<span class="text-[10px] text-orange-400">Sin fecha</span>';
				li.innerHTML = `<span>${m.nombre} <span class='text-xs text-slate-400'>(${m.ministerio})</span><br/> ${fechaTxt}</span>` +
					(getMiembroActual() === idx ? "<span class='text-primary text-xs font-bold'>(Actual)</span>" : "") +
					`<button class='text-[11px] font-bold text-background-dark bg-primary px-3 py-1 rounded-lg shadow-sm' data-idx='${idx}'>Usar</button>`;
				li.querySelector('button').onclick = (e) => {
					e.preventDefault();
					setMiembroActual(idx);
					renderMiembros();
					cargarMiembroEnFormulario();
					modalMiembros.classList.add('hidden');
				};
				listaMiembros.appendChild(li);
			});
		}
		async function syncMiembrosDesdeDb() {
			if (!churchId) return;
			try {
				const snap = await getDocs(collection(db, `church_data/${churchId}/members`));
				const arr = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
				setMiembros(arr);
				renderMiembros();
				cargarMiembroEnFormulario();
			} catch (e) {
				console.error('Error leyendo miembros:', e);
			}
		}
		function cargarMiembroEnFormulario() {
			const miembros = getMiembros();
			const idx = getMiembroActual();
			if (miembros[idx]) {
				document.getElementById('nombreInput').value = miembros[idx].nombre;
				document.getElementById('ministerioDropdownText').textContent = miembros[idx].ministerio;
				document.getElementById('ministerioInput').value = miembros[idx].ministerio;
				aplicarTema(miembros[idx].ministerio);
			}
		}

		btnMiembros.onclick = (e) => {
			e.stopPropagation();
			renderMiembros();
			modalMiembros.classList.remove('hidden');
		};
		cerrarMiembros.onclick = () => { 
			modalMiembros.classList.add('hidden'); 
		};
		// Cerrar al hacer click fuera del modal
		modalMiembros.onclick = (e) => {
			if (e.target === modalMiembros) {
				modalMiembros.classList.add('hidden');
			}
		};

		// Al cargar, si hay miembro guardado, preseleccionar y sincronizar con DB
		syncMiembrosDesdeDb();
	}

	// ============ MODAL PERFIL - PARA GUARDAR FECHA DE NACIMIENTO ============
	const modalPerfil = document.getElementById('modalPerfil');
	const cerrarPerfil = document.getElementById('cerrarPerfil');
	const inputNacimientoPerfil = document.getElementById('inputNacimientoPerfil');
	const btnGuardarFechaPerfil = document.getElementById('btnGuardarFechaPerfil');
	const textoModalPerfil = document.getElementById('textoModalPerfil');
	let miembroEnEspera = null; // Para guardar el miembro temporal

	if (modalPerfil && cerrarPerfil && btnGuardarFechaPerfil) {
		cerrarPerfil.onclick = () => { 
			modalPerfil.classList.add('hidden'); 
		};
		modalPerfil.onclick = (e) => {
			if (e.target === modalPerfil) {
				modalPerfil.classList.add('hidden');
			}
		};

		btnGuardarFechaPerfil.onclick = async () => {
			const nacimiento = (inputNacimientoPerfil.value || '').trim();
			if (!nacimiento) {
				alert('Por favor, ingresa tu fecha de nacimiento.');
				return;
			}

			if (!miembroEnEspera) {
				alert('Error: no hay miembro para guardar.');
				return;
			}

			const { nombre, ministerio } = miembroEnEspera;
			const miembros = JSON.parse(localStorage.getItem('miembrosReporte') || '[]');
			
			try {
				console.log('💾 Guardando miembro con fecha de nacimiento:', { nombre, ministerio, nacimiento });
				
				// Buscar si ya existe el miembro en localStorage
				const idxExistente = miembros.findIndex(m => m.nombre === nombre && m.ministerio === ministerio);
				
				let docId = null;
				if (churchId) {
					const docRef = await addDoc(collection(db, `church_data/${churchId}/members`), {
						nombre,
						ministerio,
						nacimiento,
						creadoEn: new Date().toISOString()
					});
					docId = docRef.id;
					console.log('✅ Miembro guardado en Firebase con ID:', docId);
				}
				
				// Actualizar o agregar en localStorage
				if (idxExistente >= 0) {
					miembros[idxExistente].nacimiento = nacimiento;
					miembros[idxExistente].docId = docId;
					localStorage.setItem('miembroActualReporte', idxExistente);
				} else {
					miembros.push({ nombre, ministerio, nacimiento, docId });
					localStorage.setItem('miembroActualReporte', miembros.length - 1);
				}
				localStorage.setItem('miembrosReporte', JSON.stringify(miembros));
				
				modalPerfil.classList.add('hidden');
				miembroEnEspera = null;
				
				alert('¡Fecha de nacimiento guardada!');
				
				// Enviar reporte automáticamente si está pendiente
				if (enviarReporteAlGuardarMiembro) {
					console.log('🚀 Enviando reporte automáticamente...');
					enviarReporteAlGuardarMiembro = false;
					setTimeout(() => {
						const btnEnviar = document.querySelector('footer button');
						if (btnEnviar) {
							btnEnviar.click();
						}
					}, 300);
				}
			} catch (e) {
				console.error('❌ Error al guardar miembro:', e);
				alert('Error al guardar fecha: ' + e.message);
			}
		};
	}

	// Setup notifications modal and load notifications
	setupNotificacionesModal();
	cargarNotificaciones();

	// Cargar métricas de constancia
	updateMetrics();

	// Enviar Reporte a Firebase
	const btnEnviar = document.querySelector('footer button');
	btnEnviar.onclick = async function() {
		const nombre = document.getElementById('nombreInput').value.trim();
		const ministerio = input.value;
		const fecha = fechaHoyISO();
		
		// Validar datos usando el sistema centralizado
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
			
			// Mostrar alerta con el primer error
			const firstError = Object.values(validation.errors)[0];
			alert(`⚠️ ${firstError}`);
			return;
		}
		
		if (!churchId) {
			alert('No se encontró el id de la iglesia en la URL.');
			return;
		}
		
		const capitulos = parseInt(document.getElementById('capitulosCount').textContent) || 0;
		const ayunos = parseInt(document.getElementById('ayunosCount').textContent) || 0;
		const almas = parseInt(document.getElementById('almasCount').textContent) || 0;
		// Horas en formato h:mm
		const horasStr = document.getElementById('horasCount').textContent;
		let horas = 0;
		let minutos = 0;
		if (horasStr.includes(':')) {
			const [h, m] = horasStr.split(':');
			horas = parseInt(h) || 0;
			minutos = parseInt(m) || 0;
		}
		const altarFamiliar = altar;
		
		// Get current selected member
		function getMiembroActual() {
			return parseInt(localStorage.getItem('miembroActualReporte') || '-1', 10);
		}
		function getMiembros() {
			return JSON.parse(localStorage.getItem('miembrosReporte') || '[]');
		}
		
		// Check if nombre is different from current selected member
		const miembros = getMiembros();
		let miembroActualIdx = getMiembroActual();
		let miembroActualData = null;
		if (miembroActualIdx >= 0 && miembros[miembroActualIdx]) {
			miembroActualData = miembros[miembroActualIdx];
		}

		// If no member selected OR nombre is different from current member
		const nombreEsDiferente = !miembroActualData || miembroActualData.nombre !== nombre;
		
		// Si el nombre es diferente, crear un nuevo miembro pero enviar el reporte primero
		if (nombreEsDiferente && nombre && ministerio) {
			console.log('✅ Nombre nuevo detectado:', nombre);
			
			// Guardar nuevo miembro en localStorage (sin fecha por ahora)
			const miembrosAct = getMiembros();
			const nuevoMiembro = { nombre, ministerio, nacimiento: '', docId: null };
			miembrosAct.push(nuevoMiembro);
			localStorage.setItem('miembrosReporte', JSON.stringify(miembrosAct));
			localStorage.setItem('miembroActualReporte', miembrosAct.length - 1);
			
			// Usar el nuevo miembro para el reporte
			miembroActualData = nuevoMiembro;
		}
		
		// If still no member, use current form data
		let miembroActualParam = null;
		if (miembroActualData) {
			miembroActualParam = miembroActualData;
		}
		
		const fecha = fechaHoyISO();
		const semanaInicio = inicioSemanaDomingo(fecha);
		try {
			// Log para debugging
			console.log('🚀 ENVIANDO REPORTE A FIREBASE');
			console.log('✔️ ChurchId:', churchId);
			console.log('📍 Ruta de destino:', `church_data/${churchId}/reportes`);
			console.log('📋 Datos del reporte:', {
				nombre,
				ministerio,
				capitulos,
				ayunos,
				almas,
				horas,
				minutos,
				altarFamiliar,
				fecha,
				semanaInicio,
				churchId
			});

			const docRef = await addDoc(collection(db, `church_data/${churchId}/reportes`), {
				nombre,
				ministerio,
				capitulos,
				ayunos,
				almas,
				horas,
				minutos,
				altarFamiliar,
				miembroDocId: miembroActualParam ? miembroActualParam.docId || null : null,
				miembroNacimiento: miembroActualParam ? (miembroActualParam.nacimiento || null) : null,
				fecha,
				semanaInicio,
				enviadoEn: new Date().toISOString()
			});
			
			console.log('✅ REPORTE GUARDADO');
			console.log('   Doc ID:', docRef.id);
			console.log('   Ubicación: church_data/' + churchId + '/reportes/' + docRef.id);
			alert('¡Reporte enviado exitosamente!');
			
			// Registrar en historial de reportes para métricas de constancia
			const currentHistory = JSON.parse(localStorage.getItem('reportHistory') || '[]');
			currentHistory.push(new Date().toISOString());
			localStorage.setItem('reportHistory', JSON.stringify(currentHistory));
			updateMetrics();
			
			// Si el miembro no tiene fecha de nacimiento, pedir que la complete
			if (miembroActualParam && !miembroActualParam.nacimiento) {
				miembroEnEspera = { nombre, ministerio };
				enviarReporteAlGuardarMiembro = false; // Ya se envió el reporte
				
				inputNacimientoPerfil.value = '';
				if (textoModalPerfil) {
					const firstChild = textoModalPerfil.querySelector('p');
					if (firstChild) {
						firstChild.innerHTML = `<strong>${nombre}</strong>, para completar tu perfil y celebrar tu cumpleaños, necesitamos tu fecha de nacimiento.`;
					}
				}
				modalPerfil.classList.remove('hidden');
				inputNacimientoPerfil.focus();
			} else {
				// Limpiar formulario completamente
				document.getElementById('nombreInput').value = '';
				document.getElementById('ministerioInput').value = '';
				document.getElementById('ministerioDropdownText').textContent = 'Selecciona ministerio';
				localStorage.setItem('miembroActualReporte', '-1');
			}
			
			resetMetricas();
		} catch (e) {
			console.error('Error al enviar reporte:', e);
			alert('Error al enviar reporte: ' + e.message);
		}
	};
};

// --- LÓGICA DE MÉTRICAS Y CONSTANCIA ---
function updateMetrics() {
    const history = JSON.parse(localStorage.getItem('reportHistory') || '[]');
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Filtrar reportes de los últimos 30 días
    const recentReports = history.filter(dateStr => new Date(dateStr) > thirtyDaysAgo);
    
    // Elementos DOM
    const panel = document.getElementById('metricsPanel');
    const icon = document.getElementById('streakIcon');
    const mainText = document.getElementById('lastReportText');
    const subText = document.getElementById('streakCount');
    const countText = document.getElementById('reportsMonth');

    if (panel) panel.classList.remove('hidden');

    // Meta mensual: 4 reportes
    const META_MENSUAL = 4;
    const reportesActuales = recentReports.length;
    const reportesFaltantes = Math.max(0, META_MENSUAL - reportesActuales);

    // Actualizar Contador con formato "X de 4"
    if (countText) {
        countText.textContent = `${reportesActuales} de ${META_MENSUAL} reportes`;
    }

    // Calcular días desde el último reporte
    if (history.length > 0) {
        const lastDate = new Date(history[history.length - 1]);
        const diffTime = Math.abs(now - lastDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            mainText.textContent = "¡Estás al día!";
            if (reportesFaltantes === 0) {
                subText.textContent = "✅ Meta del mes completada!";
            } else {
                subText.textContent = `Te faltan ${reportesFaltantes} ${reportesFaltantes === 1 ? 'reporte' : 'reportes'} para completar el mes.`;
            }
            icon.textContent = "🔥";
            icon.className = "w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xl";
        } else if (diffDays < 7) {
            mainText.textContent = `Hace ${diffDays} día(s)`;
            subText.textContent = `Mantén el ritmo. Te faltan ${reportesFaltantes} ${reportesFaltantes === 1 ? 'reporte' : 'reportes'}.`;
            icon.textContent = "✅";
            icon.className = "w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl";
        } else {
            mainText.textContent = `Hace ${diffDays} días`;
            subText.textContent = `¡No te desanimes! Te faltan ${reportesFaltantes} ${reportesFaltantes === 1 ? 'reporte' : 'reportes'}.`;
            icon.textContent = "⚠️";
            icon.className = "w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-xl";
        }
    }
}
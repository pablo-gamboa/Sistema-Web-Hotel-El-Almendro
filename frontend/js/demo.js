(() => {
  if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) ||
      !['http:', 'https:'].includes(location.protocol)) return;

  // Vista de prueba autónoma. Datos en memoria y CSP con connect-src 'none'.
  // No carga el cliente ni el servicio productivos.
  const app = document.getElementById('vista-local-app');
  const aviso = document.getElementById('vista-local-aviso');
  let demoSequence = 0;
  const demoId = () => `demo-${String(++demoSequence).padStart(8, "0")}`;
  const actor = 'demo-admin';
  const trabajadores = [
    { id: 'demo-1', nombre: 'Administradora de muestra', cargo: 'Administración', estado: 'Activo' },
    { id: 'demo-2', nombre: 'Trabajador sin cuenta', cargo: 'Mantención', estado: 'Activo' },
    { id: 'demo-3', nombre: 'Operaria de muestra', cargo: 'Servicios', estado: 'Activo' },
    { id: 'demo-4', nombre: 'Trabajador inactivo', estado: 'Inactivo' }
  ];
  const maquinas = [{ id: 'demo-equipo', nombre_original: 'Caldera de muestra' }];
  const tareas = [];
  const asignaciones = [];
  const historial = [];
  let falloLectura = false;
  let perderRespuesta = false;
  let recibo;
  const hoy = calendarioFechaCivilLocal();
  const error = (message, code) => Object.assign(new Error(message), { code });
  const copia = value => structuredClone(value);

  window.state = { currentUser: { id: actor, role: 'ADMINISTRADOR' } };
  window.esAdminOperativoActual = () => true;
  window.esAdminPermanenteActual = () => true;
  window.uiEncabezadoSeccion = (titulo, descripcion, icono, acciones) => `
    <header class="alm-panel p-4 flex flex-wrap gap-3 items-center justify-between">
      <div><h1 class="alm-title text-xl">${titulo}</h1><p class="alm-muted">${descripcion}</p></div>
      ${acciones}
    </header>`;
  window.TrabajadoresService = {
    getTrabajadores: async () => copia(trabajadores),
    listarVinculosCuentas: async () => [{ id: actor, trabajador_id: 'demo-1', estado: true }]
  };
  window.MantencionesService = { getElementosMaquinas: async () => copia(maquinas) };

  function asignar(t, ids) {
    for (const id of ids) {
      asignaciones.push({
        id: demoId(), tarea_id: t.id, trabajador_id: id,
        trabajador_nombre: trabajadores.find(w => w.id === id).nombre,
        estado: 'pendiente', progreso: 0, retirada_en: null
      });
    }
  }

  function guardar(op, args) {
    let t = tareas.find(x => x.id === args.p_tarea_id);
    if (op !== 'crear' && (!t || t.revision !== args.p_revision_esperada)) {
      throw error('TAREA_EDITAR_REVISION_DESACTUALIZADA', '40001');
    }
    const anteriores = asignaciones.filter(a => a.tarea_id === t?.id);
    const antes = { tarea: copia(t), asignaciones: copia(anteriores) };
    if (op === 'crear') {
      t = { id: demoId(), revision: 0, estado: 'pendiente', creada_en: new Date().toISOString() };
      tareas.push(t);
      asignar(t, args.p_trabajador_ids);
    }
    if (op === 'crear' || op === 'editar') {
      Object.assign(t, { titulo: args.p_titulo, descripcion: args.p_descripcion,
        fecha_limite: args.p_fecha_limite, equipo_id: args.p_equipo_id });
    }
    const a = anteriores.find(x => x.id === args.p_asignacion_id);
    const fecha = new Date().toISOString();
    if (op === 'responsables') {
      if (args.p_accion === 'AVANCE') {
        a.progreso = args.p_progreso;
        a.estado = a.progreso === 100 ? 'completada' : a.progreso ? 'en_proceso' : 'pendiente';
      } else {
        for (const x of anteriores.filter(x => !x.retirada_en && args.p_retirar?.includes(x.trabajador_id))) {
          x.retirada_en = fecha;
        }
        asignar(t, args.p_incorporar);
      }
    }
    if (op === 'ciclo') {
      if (args.p_accion === 'REABRIR') Object.assign(a, { estado: 'pendiente', progreso: 0 });
      else a.retirada_en = fecha;
    }
    if (op === 'retirar') {
      t.retirada_en = fecha;
      t.retirada_por_nombre_snapshot = 'Administradora de muestra';
    } else {
      const vigentes = asignaciones.filter(x => x.tarea_id === t.id && !x.retirada_en);
      const completada = vigentes.length && vigentes.every(x => x.progreso === 100);
      t.estado = completada ? 'completada' : 'pendiente';
      t.completada_en = completada ? t.completada_en || fecha : null;
    }
    t.revision++;
    historial.push({
      tarea_id: t.id, revision: t.revision,
      accion: args.p_accion || (op === 'retirar' ? 'RETIRAR' : op.toUpperCase()),
      registrada_en: fecha, actor_nombre: 'Administradora de muestra', antes,
      despues: { tarea: copia(t), asignaciones: copia(asignaciones.filter(x => x.tarea_id === t.id)) }
    });
    return { tarea_id: t.id, revision: t.revision, solicitud_id: demoId(), reenvio: false };
  }

  async function pagina(vista, f = {}) {
    if (falloLectura) {
      falloLectura = false;
      throw new TypeError('Failed to fetch');
    }
    const visibles = new Set(tareas.filter(t => !t.retirada_en || f.p_tarea_id === t.id).map(t => t.id));
    const filas = vista === 'HISTORIAL'
      ? historial.filter(o => o.tarea_id === f.p_tarea_id).filter(o => f.p_cursor_revision == null ||
          o.revision < f.p_cursor_revision).sort((a, b) => b.revision - a.revision)
      : (vista === 'ASIGNACIONES' ? asignaciones : tareas).filter(t =>
        visibles.has(t.tarea_id || t.id) &&
        (!f.p_tarea_id || (t.tarea_id || t.id) === f.p_tarea_id) &&
        (!f.p_equipo_id || t.equipo_id === f.p_equipo_id) &&
        (!f.p_desde || t.fecha_limite >= f.p_desde) && (!f.p_hasta || t.fecha_limite <= f.p_hasta) &&
        (!f.p_cursor_id || t.id > f.p_cursor_id)).sort((a, b) => a.id.localeCompare(b.id));
    const limite = f.p_limite || 10;
    const items = filas.slice(0, limite);
    return copia({ items, hay_mas: filas.length > limite,
      siguiente_cursor: filas.length > limite ? items.at(-1)[vista === 'HISTORIAL' ? 'revision' : 'id'] : null });
  }

  window.GestionTareas = {
    habilitada: true,
    puede: () => true, contexto: () => ({ id: actor, admin: true }), comprobar() {},
    pagina, todas: async (vista, f) => (await pagina(vista, { ...f, p_limite: Infinity })).items,
    mes(fecha) {
      const [y, m] = fecha.split('-').map(Number);
      return { p_desde: fecha.slice(0, 7) + '-01',
        p_hasta: fecha.slice(0, 7) + '-' + new Date(y, m, 0).getDate() };
    },
    tienePendiente: () => Boolean(recibo),
    async mutar(op, args) {
      if (recibo) throw Error('Reintenta primero la operación pendiente.');
      const resultado = guardar(op, args);
      if (perderRespuesta) {
        perderRespuesta = false;
        recibo = resultado;
        aviso.textContent = 'Respuesta perdida en la simulación. Usa el reenvío para recuperar la misma tarea.';
        throw new TypeError('Failed to fetch');
      }
      return resultado;
    },
    async reintentar() {
      if (!recibo) throw Error('No hay una operación pendiente.');
      const resultado = { ...recibo, reenvio: true };
      recibo = null;
      aviso.textContent = 'Reenvío simulado recuperado. Se conservó la misma tarea.';
      return resultado;
    }
  };

  guardar('crear', { p_titulo: 'Ordenar bodega de muestra', p_descripcion: 'Ordenar y revisar insumos del área de ejemplo.',
    p_fecha_limite: hoy, p_equipo_id: null, p_trabajador_ids: ['demo-2'] });
  function montar() {
    app.innerHTML = renderGestionTareas();
    iniciarGestionTareas();
  }
  document.getElementById('vista-local-controles').hidden = false;
  document.getElementById('vista-local-fallo').onclick = () => {
    falloLectura = true;
    montar();
  };
  document.getElementById('vista-local-incierta').onclick = () => {
    perderRespuesta = true;
    aviso.textContent = 'La próxima escritura simulada perderá su respuesta.';
  };
  aviso.textContent = 'Vista local con datos ficticios en memoria. Sin Supabase ni credenciales.';
  window.montarTareasDemo = montar;
})();

function uiEncabezadoOriginal(titulo, descripcion, icono, acciones = '') {
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const trazos = {
    wrench:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    box:'<path d="m3 7 9-5 9 5v10l-9 5-9-5Z"/><path d="m3 7 9 5 9-5M12 12v10M7.5 4.5l9 5"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
    calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h2M14 14h2M8 18h2"/>',
    folder:'<path d="M20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2Z"/>',
    shield:'<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 8l5-5 5 5M12 3v12"/>',
    clipboard:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M8 12h8M8 16h5"/>',
    tree:'<path d="m12 2 7 9h-4l5 7H4l5-7H5Z M12 18v4"/>',
    settings:'<path d="m9 3 1-1h4l1 1v2l2 1 2-1 2 3-1 2v3l1 2-2 3-2-1-2 1v2l-1 1h-4l-1-1v-2l-2-1-2 1-2-3 1-2v-3L3 8l2-3 2 1 2-1Z"/><circle cx="12" cy="11" r="3"/>'
  };
  return '<header class="alm-panel alm-page-heading"><div class="alm-heading-main"><span class="alm-module-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (trazos[icono] || trazos.folder) + '</svg></span><div class="alm-heading-text"><h2 class="alm-title">' + esc(titulo) + '</h2><p class="alm-muted">' + esc(descripcion) + '</p></div></div>' + (acciones ? '<div class="alm-heading-actions">' + acciones + '</div>' : '') + '</header>';
}


function formatearFechaCL(valor, { hora = false, civil = false, vacio = 'No definida', invalida = vacio } = {}) {
  if (valor === null || valor === undefined || String(valor).trim() === '') return vacio;
  const texto=String(valor).trim();
  let partes=/^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(texto);
  const legible=/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(texto);
  if(!partes && legible)partes=[texto,legible[3],legible[2].padStart(2,'0'),legible[1].padStart(2,'0'),''];
  if(partes){
    const y=Number(partes[1]),m=Number(partes[2]),d=Number(partes[3]);
    const limite=[31,(y%4===0&&(y%100!==0||y%400===0))?29:28,31,30,31,30,31,31,30,31,30,31][m-1];
    if(y<1||m<1||m>12||d<1||d>limite)return invalida;
    if(civil && partes[4] && !/^[T ]\d{2}:\d{2}/.test(partes[4]))return invalida;
    if(!partes[4] || civil)return `${partes[3]}-${partes[2]}-${partes[1]}`;
    // Un timestamp sin zona no se reinterpreta con la zona del ordenador.
    if(!/^[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(partes[4]))return invalida;
    const reloj=/^[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(partes[4]);
    if(Number(reloj[1])>23||Number(reloj[2])>59||Number(reloj[3]||0)>59)return invalida;
  }
  if(!partes && Object.prototype.toString.call(valor)!=='[object Date]')return invalida;
  const fecha=Object.prototype.toString.call(valor)==='[object Date]'?valor:new Date(texto.replace(/([+-]\d{2})(\d{2})$/,'$1:$2').replace(/([+-]\d{2})$/,'$1:00'));
  if(!Number.isFinite(fecha.getTime()))return invalida;
  const formato=formatearFechaCL.formato || (formatearFechaCL.formato=new Intl.DateTimeFormat('es-CL',{
    timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }));
  const p=formato.formatToParts(fecha),dato=tipo=>p.find(x=>x.type===tipo)?.value;
  return `${dato('day')}-${dato('month')}-${dato('year').padStart(4,'0')}`+(hora?` ${dato('hour')}:${dato('minute')}`:'');
}

let dashboardCargaAreas='listo', dashboardResumen={estado:'listo',proyectos:3,solicitudes:{pendiente:2,aprobada:4,rechazada:1},equipos:8,ubicacionesTotal:12};
function uiCargandoHTML(){return '<div class="alm-carga-inicial" role="status">Cargando...</div>';}
let currentView='dashboard';function hasAccess(){return true;}function formatDate(v){return formatearFechaCL(v);}
function areaTarjetasHTML(){return `<div class="alm-module-grid grid grid-cols-1 md:grid-cols-2 gap-4"><article class="alm-module-card"><h4>Gestión de tareas</h4><p>Registros ficticios y calendario.</p><footer><button onclick="navigateTo('tareas-pendientes')">Ir al módulo</button></footer></article><article class="alm-module-card"><h4>Proyectos de muestra</h4><p>Línea temporal ficticia.</p><footer><button onclick="navigateTo('gantt')">Ir al módulo</button></footer></article></div>`;}
function toggleMobileSidebar(show){const s=document.getElementById('sidebar'),b=document.getElementById('sidebar-backdrop');const open=show??s.classList.contains('-translate-x-full');s.classList.toggle('-translate-x-full',!open);b.classList.toggle('hidden',!open);}
function navigateTo(view){if(!['dashboard','tareas-pendientes','gantt','mejoras','remodelaciones','inventario'].includes(view))return;currentView=view;toggleMobileSidebar(false);document.querySelectorAll('.nav-item').forEach(b=>{const active=b.id==='nav-'+view;b.classList.toggle('bg-blue-600/20',active);b.classList.toggle('text-blue-400',active);b.classList.toggle('border',active);b.classList.toggle('border-blue-500/30',active);});const root=document.getElementById('vista-local-app');document.getElementById('page-title').textContent=({'dashboard':'Panel Principal - Hotel El Almendro','tareas-pendientes':'Gestión de Tareas','gantt':'Línea de Tiempo / Gantt','mejoras':'Mejoras / Obras','remodelaciones':'Remodelaciones','inventario':'Inventario'})[view];document.getElementById('page-subtitle').textContent='Vista de demostración con datos ficticios';if(view==='tareas-pendientes'){montarTareasDemo();return;}if(view==='mejoras'){root.innerHTML=renderMejorasDemo();return;}if(view==='remodelaciones'){root.innerHTML=renderRemodelacionesDemo();return;}if(view==='inventario'){root.innerHTML=renderInventarioView();return;}if(view==='dashboard'){root.innerHTML=getDashboardHTML();const panel=document.getElementById('dashboard-calendario');if(panel)gestionMontarCalendario(panel,'Calendario general de tareas',null,{abierto:true,enlaceGestion:true});return;}const dia=n=>{const d=new Date();d.setDate(d.getDate()+n);return calendarioFechaCivilLocal(d);};root.innerHTML=uiEncabezadoSeccion('Carta Gantt','Proyecto ficticio de muestra','calendar')+'<section class="alm-panel p-4 mt-4">'+GanttCarta.render({tareas:[{id:'demo-a',titulo:'Planificación',faseNombre:'Diseño',responsable:'Equipo ficticio',fechaInicio:dia(-4),fechaFin:dia(2),progreso:70},{id:'demo-b',titulo:'Ejecución',faseNombre:'Implementación',responsable:'Equipo ficticio',fechaInicio:dia(1),fechaFin:dia(12),progreso:20}]})+'</section>';}
window.uiEncabezadoSeccion=uiEncabezadoOriginal;navigateTo('dashboard');
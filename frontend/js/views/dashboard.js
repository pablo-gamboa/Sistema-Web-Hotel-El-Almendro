function dashboardValor(valor) {
  return valor ?? (dashboardResumen.estado === 'listo' ? 'No disponible' : 'Cargando…');
}

function dashboardPuedeConsultarSolicitudes() {
  return esAdminOperativoActual() && hasAccess('solicitudes', state.currentUser?.role);
}

function dashboardSolicitudesValor() {
  if (!dashboardPuedeConsultarSolicitudes()) return 'Sin acceso';
  const solicitudes = dashboardResumen.solicitudes;
  return solicitudes ? solicitudes.pendiente : dashboardValor(null);
}

function dashboardSolicitudesDetalle() {
  const solicitudes = dashboardResumen.solicitudes;
  if (!dashboardPuedeConsultarSolicitudes() || !solicitudes) return '';
  return `Pendientes <span class="block mt-1">Aprobadas: ${solicitudes.aprobada} · Rechazadas: ${solicitudes.rechazada}</span>`;
}

function dashboardIndicadoresHTML(){
  const indicadores=[
    ['Proyectos registrados','proyectos','Mejoras y Remodelación; proyectos únicos.','🏗️'],
    ['Solicitudes','solicitudes','','📋'],
    ['Equipos registrados de Mantención de Máquinas','equipos','Registros del catálogo de Máquinas.','⚙️'],
    ['Ubicaciones del hotel','lugares','Ubicaciones registradas.<span class="block mt-1">Habitaciones, bodegas, salones y otras áreas.</span>','📍']
  ];
  return `<section id="dashboard-kpis" aria-labelledby="dashboard-indicadores" class="space-y-3"><h3 id="dashboard-indicadores" class="alm-section-title text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Resumen de registros del hotel</h3><div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">${indicadores.map(([titulo,clave,detalle,icono])=>`<article class="alm-panel alm-metric bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm min-w-0"><div class="flex items-start gap-2"><span aria-hidden="true" class="alm-metric-icon text-blue-600 dark:text-blue-400">${icono}</span><h4 class="text-sm font-bold text-slate-700 dark:text-slate-200">${titulo}</h4></div><p class="alm-metric-value text-2xl font-black text-slate-900 dark:text-white mt-3">${clave==='solicitudes' ? dashboardSolicitudesValor() : dashboardValor(clave === 'lugares' ? dashboardResumen.ubicacionesTotal : dashboardResumen[clave])}</p><p class="alm-metric-description text-xs leading-relaxed text-slate-500 dark:text-slate-400 mt-2">${clave==='solicitudes' ? dashboardSolicitudesDetalle() : detalle}</p></article>`).join('')}</div></section>`;
}

function dashboardCalendarioHTML() {
  return window.GestionTareas?.habilitada && window.GestionTareas.puede() && hasAccess('tareas-pendientes', state.currentUser?.role)
    ? '<div id="dashboard-calendario" class="min-w-0"></div>' : '';
}
function getDashboardHTML(){
  return `<div class="alm-ui alm-dashboard space-y-5 max-w-7xl mx-auto pb-10"><header class="alm-panel alm-dashboard-header bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-sm border border-slate-800"><div class="flex items-center gap-3 min-w-0"><span aria-hidden="true" class="alm-brand-mark w-12 h-12 shrink-0 rounded-2xl bg-amber-300 text-slate-950 flex items-center justify-center text-2xl"><svg xmlns="http://www.w3.org/2000/svg" width="1.15em" height="1.15em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10 22v-6.57M12 11h.01M12 7h.01M14 15.43V22M15 16a5 5 0 0 0-6 0M16 11h.01M16 7h.01M8 11h.01M8 7h.01"/><rect x="4" y="2" width="16" height="20" rx="2"/></svg></span><div class="min-w-0"><h2 class="text-lg font-black">Hotel & Centro de Eventos El Almendro</h2><p class="text-sm text-slate-300 mt-1">Panel principal · Consulta de información disponible</p></div></div></header>${dashboardIndicadoresHTML()}${dashboardCalendarioHTML()}<section aria-labelledby="dashboard-areas-titulo" class="space-y-4"><div class="border-b border-slate-200 dark:border-slate-800 pb-3"><h3 id="dashboard-areas-titulo" class="text-lg font-black text-slate-900 dark:text-white">Áreas de Trabajo</h3><p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Selecciona un área para consultar sus fichas y registros.</p></div>${dashboardCargaAreas==='error'?'<p role="alert" class="text-sm text-rose-600 dark:text-rose-400">No se pudo completar la consulta de áreas. Vuelve a abrir el panel para reintentar.</p>':''}<div id="area-tarjetas">${dashboardCargaAreas==='cargando'?'<p class="alm-muted" role="status">Cargando áreas…</p>':areaTarjetasHTML()}</div></section></div>`;
}

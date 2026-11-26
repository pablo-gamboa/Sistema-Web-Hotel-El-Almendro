function getImprovementsHTML(proyectos, planes, pendientesPlanAnual, metas, pendientesMantencion) {
  const lista = proyectos || [];
  const planesLista = planes || [];
  const pendientesLista = pendientesPlanAnual || [];
  const metasLista = metas || [];
  const pendMantLista = pendientesMantencion || [];

  // Rango de años calculado desde los datos reales (no hardcodeado).
  const anios = planesLista.map(p => p.anio).filter(a => a !== null && a !== undefined);
  const anioMin = anios.length ? Math.min(...anios) : null;
  const anioMax = anios.length ? Math.max(...anios) : null;
  const rangoAnios = (anioMin !== null && anioMax !== null)
    ? (anioMin === anioMax ? `${anioMin}` : `${anioMin}–${anioMax}`)
    : 'Sin años registrados';

  // Contextos distintos derivados de los datos (no hardcodeados).
  const contextos = [...new Set(planesLista.map(p => p.contexto).filter(c => c !== null && c !== undefined && c !== ''))];
  const textoContextos = contextos.length ? `Contextos: ${contextos.join(' y ')}` : '';

  return `
    <div class="alm-ui alm-main-page alm-module-page alm-project-page space-y-6 max-w-7xl mx-auto pb-10">
      
      ${uiEncabezadoSeccion('Mejoras y Obras','Proyectos de mejoras y obras de El Almendro registrados en el sistema.','folder',`<div class="alm-heading-count"><strong>${lista.length}</strong><span>${lista.length === 1 ? 'Proyecto registrado' : 'Proyectos registrados'}</span></div>`)}

      ${lista.length === 0 ? `
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
          <p class="text-sm font-bold text-slate-600 dark:text-slate-400">No hay proyectos registrados.</p>
        </div>
      ` : `
        <div class="alm-record-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${lista.map(p => `
            <div data-project-id="${p.id}" onclick="openImprovementProjectDetail('${p.id}')" class="alm-project-card bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all card-hover flex flex-col cursor-pointer group">
              
              <div class="alm-project-emblem h-28 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-4xl">
                🌿
              </div>

              <div class="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <span class="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md uppercase">
                    Proyecto de Mejora
                  </span>

                  <h4 class="text-lg font-extrabold text-slate-800 dark:text-white mt-2.5 leading-snug">
                    ${p.nombre || 'Sin nombre registrado'}
                  </h4>

                  <div class="mt-4 space-y-2 text-xs">
                    <div class="flex items-center justify-between">
                      <span class="text-slate-500 dark:text-slate-400 font-medium">Estado</span>
                      <span class="font-extrabold text-emerald-700 dark:text-emerald-300">${p.estado || 'Sin estado registrado'}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-slate-500 dark:text-slate-400 font-medium">Inicio</span>
                      <span class="font-bold text-slate-700 dark:text-slate-200">${p.fecha_inicio ? formatDate(p.fecha_inicio) : 'Sin fecha registrada'}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-slate-500 dark:text-slate-400 font-medium">Fin estimado</span>
                      <span class="font-bold text-slate-700 dark:text-slate-200">${p.fecha_fin_estimada ? formatDate(p.fecha_fin_estimada) : 'Sin fecha registrada'}</span>
                    </div>
                    ${p.es_historico ? `
                      <div class="flex items-center justify-between">
                        <span class="text-slate-500 dark:text-slate-400 font-medium">Origen</span>
                        <span class="font-bold text-slate-700 dark:text-slate-200">Histórico</span>
                      </div>
                    ` : ''}
                  </div>
                </div>

                <div class="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Tareas del proyecto</span>
                  <span class="font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center space-x-1">
                    <span>Ver Detalles</span>

                  </span>
                </div>
              </div>

            </div>
          `).join('')}
        </div>
      `}

      <!-- SECCIÓN PLAN ANUAL (FASE 4D-1): datos reales -->
      <div class="mt-2">
        <div class="flex items-center space-x-2 mb-3">
          <span class="text-lg">📅</span>
          <h3 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Planificación</h3>
        </div>

        ${planesLista.length === 0 && pendientesLista.length === 0 ? `
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <p class="text-sm font-bold text-slate-600 dark:text-slate-400">No hay planes anuales registrados.</p>
          </div>
        ` : `
          <div onclick="openPlanAnualModal()" class="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all card-hover flex flex-col md:flex-row cursor-pointer group">
            
            <div class="md:w-56 h-32 md:h-auto bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-5xl shrink-0">
              📅
            </div>

            <div class="p-6 flex-1">
              <span class="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md uppercase">
                Planificación anual
              </span>

              <h4 class="text-lg font-extrabold text-slate-800 dark:text-white mt-2.5 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors leading-snug">
                Plan Anual
              </h4>

              <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p class="text-2xl font-black text-slate-800 dark:text-white">${planesLista.length}</p>
                  <p class="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mt-0.5">${planesLista.length === 1 ? 'Plan registrado' : 'Planes registrados'}</p>
                </div>
                <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p class="text-2xl font-black text-slate-800 dark:text-white">${rangoAnios}</p>
                  <p class="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mt-0.5">Años disponibles</p>
                </div>
                <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p class="text-2xl font-black text-slate-800 dark:text-white">${pendientesLista.length}</p>
                  <p class="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mt-0.5">${pendientesLista.length === 1 ? 'Pendiente histórico' : 'Pendientes históricos'}</p>
                </div>
              </div>

              <div class="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">${textoContextos}</span>
                <span class="font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center space-x-1">
                  <span>Ver Plan Anual</span>

                </span>
              </div>
            </div>

          </div>
        `}
      </div>

      <!-- SECCIÓN METAS POR ÁREA (FASE 4E-1): datos reales -->
      <div class="mt-2">
        <div class="flex items-center space-x-2 mb-3">
          <span class="text-lg">🎯</span>
          <h3 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Metas</h3>
        </div>

        ${metasLista.length === 0 ? `
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <p class="text-sm font-bold text-slate-600 dark:text-slate-400">No hay metas registradas.</p>
          </div>
        ` : `
          <div onclick="openMetasAreaModal()" class="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all card-hover flex flex-col md:flex-row cursor-pointer group">
            
            <div class="md:w-56 h-32 md:h-auto bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-5xl shrink-0">
              🎯
            </div>

            <div class="p-6 flex-1">
              <span class="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md uppercase">
                Metas operativas
              </span>

              <h4 class="text-lg font-extrabold text-slate-800 dark:text-white mt-2.5 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors leading-snug">
                Metas por Área
              </h4>

              <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p class="text-2xl font-black text-slate-800 dark:text-white">${metasLista.length}</p>
                  <p class="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mt-0.5">${metasLista.length === 1 ? 'Meta registrada' : 'Metas registradas'}</p>
                </div>
                <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p class="text-2xl font-black text-slate-800 dark:text-white">${new Set(metasLista.map(m => m.area_original || 'sin_area')).size}</p>
                  <p class="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mt-0.5">Áreas reales</p>
                </div>
              </div>

              <div class="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Fuente: POR HACER- Area Mantenciones.xlsx</span>
                <span class="font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center space-x-1">
                  <span>Ver Metas por Área</span>

                </span>
              </div>
            </div>

          </div>
        `}
      </div>

      <!-- SECCIÓN PENDIENTES DE MANTENCIÓN (FASE 4E-2): datos reales -->
      <div class="mt-2">
        <div class="flex items-center space-x-2 mb-3">
          <span class="text-lg">🧰</span>
          <h3 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Pendientes</h3>
        </div>

        ${pendMantLista.length === 0 ? `
          <div class="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
            <p class="text-sm font-bold text-slate-600 dark:text-slate-400">No hay pendientes de mantención registrados.</p>
          </div>
        ` : `
          <div onclick="openPendientesMantencionModal()" class="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all card-hover flex flex-col md:flex-row cursor-pointer group">

            <div class="md:w-56 h-32 md:h-auto bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-5xl shrink-0">
              🧰
            </div>

            <div class="p-6 flex-1">
              <span class="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-md uppercase">
                Bitácora de pendientes
              </span>

              <h4 class="text-lg font-extrabold text-slate-800 dark:text-white mt-2.5 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors leading-snug">
                Pendientes de Mantención
              </h4>

              <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p class="text-2xl font-black text-slate-800 dark:text-white">${pendMantLista.length}</p>
                  <p class="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mt-0.5">${pendMantLista.length === 1 ? 'Pendiente registrado' : 'Pendientes registrados'}</p>
                </div>
                <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                  <p class="text-2xl font-black text-slate-800 dark:text-white">${new Set(pendMantLista.map(p => p.grupo_original || 'sin_grupo')).size}</p>
                  <p class="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mt-0.5">Grupos reales</p>
                </div>
              </div>

              <div class="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Fuente: POR HACER- Area Mantenciones.xlsx</span>
                <span class="font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform flex items-center space-x-1">
                  <span>Ver Pendientes de Mantención</span>

                </span>
              </div>
            </div>

          </div>
        `}
      </div>

    </div>
  `;
}

// ==========================================================
// ESTADO DE ERROR: sin fallback a mocks
// ==========================================================
function formatProgresoTarea(valor) {
  if (valor === null || valor === undefined || valor === '') return 'Sin progreso registrado';
  const n = Number(valor);
  if (Number.isNaN(n)) return String(valor);
  if (n === 0) return '0%';
  return `${n}%`;
}

// Formato de duración (solo presentación):
// - NULL/vacío  -> "Sin duración registrada".
// - numérico    -> 1 día / [n] días.
// - texto       -> se muestra tal cual, sin interpretar.
function formatDuracionTarea(valor) {
  if (valor === null || valor === undefined || valor === '') return 'Sin duración registrada';
  const texto = String(valor).trim();
  if (texto === '') return 'Sin duración registrada';
  if (/^\d+$/.test(texto)) {
    const n = Number(texto);
    return n === 1 ? '1 día' : `${n} días`;
  }
  return texto;
}

function getImprovementFichaHTML(proyecto, tareas) {
  const p = proyecto || {};
  const lista = tareas || [];

  // Agrupación por grupo_origen REAL, preservando el orden
  // entregado por MejorasService (fecha_inicio ASC).
  const grupos = [];
  const indiceGrupo = {};
  lista.forEach(t => {
    const clave = t.grupo_origen || null;
    if (!(clave in indiceGrupo)) {
      indiceGrupo[clave] = grupos.length;
      grupos.push({ nombre: clave, tareas: [] });
    }
    grupos[indiceGrupo[clave]].tareas.push(t);
  });

  return `
    <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
      <div>
        <div class="flex items-center space-x-2 flex-wrap gap-y-1">
          <span class="text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-md uppercase">
            Proyecto de Mejora
          </span>
          ${p.es_historico ? `
            <span class="text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md uppercase">
              Histórico
            </span>
          ` : ''}
        </div>
        <h3 class="text-xl font-extrabold text-slate-900 dark:text-white mt-2">${p.nombre || 'Sin nombre registrado'}</h3>
      </div>
      <button onclick="closeModal('modal-improvement-detail')" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl font-bold p-1">&times;</button>
    </div>

    <div class="mt-4 grid grid-cols-2 gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 text-xs">
      <div>
        <span class="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase block">Estado</span>
        <span class="text-sm font-extrabold text-slate-900 dark:text-white">${p.estado || 'Sin estado registrado'}</span>
      </div>
      <div>
        <span class="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase block">Origen</span>
        <span class="text-sm font-extrabold text-slate-900 dark:text-white">${p.es_historico ? 'Histórico' : 'Actual'}</span>
      </div>
      <div>
        <span class="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase block">Fecha de inicio</span>
        <span class="text-sm font-extrabold text-slate-900 dark:text-white">${p.fecha_inicio ? formatDate(p.fecha_inicio) : 'Sin fecha registrada'}</span>
      </div>
      <div>
        <span class="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase block">Fecha fin estimada</span>
        <span class="text-sm font-extrabold text-slate-900 dark:text-white">${p.fecha_fin_estimada ? formatDate(p.fecha_fin_estimada) : 'Sin fecha registrada'}</span>
      </div>
      <div class="col-span-2">
        <span class="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase block">Responsable</span>
        <span class="text-sm font-extrabold text-slate-900 dark:text-white">${p.responsable_texto || 'Sin responsable registrado'}</span>
      </div>
    </div>

    ${p.observaciones ? `
      <div class="mt-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
        <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase block mb-1">Observaciones</span>
        <p class="text-slate-700 dark:text-slate-200 leading-relaxed">${p.observaciones}</p>
      </div>
    ` : ''}

    <!-- ENTRADA CARTA GANTT (FASE 4F-1): solo lectura -->
    ${p.id ? `
      <div class="mt-4">
        <button onclick="openProyectoGantt('${p.id}')" class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center space-x-2">
          <span>📊</span>
          <span>Ver Carta Gantt</span>

        </button>
      </div>
    ` : ''}

    <div class="mt-6">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Tareas del proyecto</h4>
        <span class="text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-full">
          ${lista.length} ${lista.length === 1 ? 'tarea' : 'tareas'}
        </span>
      </div>

      ${lista.length === 0 ? `
        <div class="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-bold text-slate-500 dark:text-slate-400">Sin tareas registradas para este proyecto.</p>
        </div>
      ` : grupos.map(g => `
        <div class="mb-4">
          <h5 class="text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-tight mb-2">
            ${g.nombre || 'Sin grupo registrado'} · ${g.tareas.length} ${g.tareas.length === 1 ? 'tarea' : 'tareas'}
          </h5>
          <div class="space-y-2">
            ${g.tareas.map(t => `
              <div class="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
                <div class="flex items-start justify-between gap-3">
                  <p class="font-extrabold text-slate-800 dark:text-white leading-snug">${t.titulo || 'Sin título registrado'}</p>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                    ${t.estado || 'Sin estado'}
                  </span>
                </div>
                <div class="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 text-[11px]">
                  <div>
                    <span class="text-slate-400 dark:text-slate-500 block">Responsable</span>
                    <span class="font-bold text-slate-700 dark:text-slate-200">${t.responsable_texto || 'Sin responsable registrado'}</span>
                  </div>
                  <div>
                    <span class="text-slate-400 dark:text-slate-500 block">Inicio</span>
                    <span class="font-bold text-slate-700 dark:text-slate-200">${t.fecha_inicio ? formatDate(t.fecha_inicio) : 'Sin fecha registrada'}</span>
                  </div>
                  <div>
                    <span class="text-slate-400 dark:text-slate-500 block">Fin</span>
                    <span class="font-bold text-slate-700 dark:text-slate-200">${t.fecha_vencimiento ? formatDate(t.fecha_vencimiento) : 'Sin fecha registrada'}</span>
                  </div>
                  <div>
                    <span class="text-slate-400 dark:text-slate-500 block">Duración</span>
                    <span class="font-bold text-slate-700 dark:text-slate-200">${formatDuracionTarea(t.duracion_original)}</span>
                  </div>
                  <div>
                    <span class="text-slate-400 dark:text-slate-500 block">Avance</span>
                    <span class="font-bold text-slate-700 dark:text-slate-200">${formatProgresoTarea(t.progreso)}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
      <button onclick="closeModal('modal-improvement-detail')" class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors">
        Cerrar Ficha
      </button>
    </div>
  `;
}

// Estado de error de la ficha: sin fallback a mocks.
function adaptarTareasGanttMejoras(tareas) {
  return (Array.isArray(tareas) ? tareas : []).map(t => ({
    id: t.id,
    titulo: t.titulo,
    faseId: t.grupo_origen || null,
    faseNombre: t.grupo_origen || null,
    responsable: t.responsable_texto,
    estado: t.estado,
    fechaInicio: t.fecha_inicio,
    fechaFin: t.fecha_vencimiento,
    progreso: t.progreso,
    activo: true
  }));
}

function getProyectoGanttHTML(proyecto, tareas) {
  const p = proyecto || {};
  const lista = tareas || [];

  // Rango derivado de las fechas reales (proyecto + tareas),
  // igual que antes: se usa solo para el chip informativo; el
  // renderer lo recalcula con el mismo criterio.
  const rango = GanttCarta.calcularRango(
    [{ fechaInicio: p.fecha_inicio, fechaFin: p.fecha_fin_estimada }]
      .concat(lista.map(t => ({ fechaInicio: t.fecha_inicio, fechaFin: t.fecha_vencimiento })))
  );

  return `
    <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
      <div>
        <button onclick="openImprovementProjectDetail('${p.id || ''}')" class="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-950 border border-emerald-200 dark:border-emerald-900 px-2.5 py-1 rounded-xl flex items-center space-x-1 transition-colors mb-2">
          <span>← Volver a la ficha del proyecto</span>
        </button>
        <span class="text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-md uppercase">
          Carta Gantt · solo lectura
        </span>
        <h3 class="text-lg font-extrabold text-slate-900 dark:text-white mt-2">${p.nombre || 'Sin nombre registrado'}</h3>
      </div>
      <button onclick="closeModal('modal-improvement-detail')" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl font-bold p-1">&times;</button>
    </div>

    <div class="mt-3 inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300">
      <span>${lista.length} ${lista.length === 1 ? 'tarea' : 'tareas'}</span>
      ${rango ? `<span class="text-slate-400 dark:text-slate-500">·</span><span>${formatDate(p.fecha_inicio) || '—'} → ${formatDate(p.fecha_fin_estimada) || '—'}</span>` : ''}
    </div>

    ${GanttCarta.render({
      tareas: adaptarTareasGanttMejoras(lista),
      fechasProyecto: { fechaInicio: p.fecha_inicio, fechaFin: p.fecha_fin_estimada },
      formatearProgreso: formatProgresoTarea,
      formatearFecha: formatDate,
      textos: {
        // Texto EXACTO del Gantt aprobado (paridad visual Fase 4F-1).
        notaEscala: (dias) => `Escala diaria · ${dias} ${dias === 1 ? 'día' : 'días'} derivados de las fechas reales del proyecto y sus tareas. Los fines de semana aparecen en tono gris y la línea roja marca "Hoy" solo cuando cae dentro del rango. Vista de solo lectura.`
      }
    })}

    <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
      <button onclick="openImprovementProjectDetail('${p.id || ''}')" class="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors">
        ← Volver a la ficha del proyecto
      </button>
      <button onclick="closeModal('modal-improvement-detail')" class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors">
        Cerrar
      </button>
    </div>
  `;
}

function getRenovationsGridHTML(renovaciones) {
  return `
    <div class="alm-record-grid grid grid-cols-1 md:grid-cols-2 gap-6">
      ${renovaciones.map(ren => {
        let budgetBlock = '';
        if (ren._isFallback) {
          // Fallback old behavior
          let budgetEstimadoText = 'Sin presupuesto estimado';
          if (ren.budgetEstimado != null) budgetEstimadoText = formatCLP(ren.budgetEstimado);
          else if (ren.budget != null) budgetEstimadoText = formatCLP(ren.budget); 

          let budgetRealText = 'Sin total real';
          if (ren.budgetReal != null) budgetRealText = formatCLP(ren.budgetReal);
          else if (ren.actualCost != null) budgetRealText = formatCLP(ren.actualCost); 

          budgetBlock = `
              <div class="grid grid-cols-2 gap-3 mt-5 p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100">
                <div>
                  <p class="text-[10px] text-purple-900 font-bold uppercase">Total Real</p>
                  <p class="text-base font-black text-purple-700">${budgetRealText}</p>
                </div>
                <div>
                  <p class="text-[10px] text-slate-600 font-bold uppercase">Presupuesto Estimado</p>
                  <p class="text-base font-black text-slate-800">${budgetEstimadoText}</p>
                </div>
              </div>
          `;
        } else {
          // Real Data Rendering
          const pres = ren.presupuestosResumen || [];
          const imps = ren.importacionesResumen || [];
          
          if (pres.length === 0 && imps.length === 0) {
            budgetBlock = `
              <div class="mt-5 p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 text-center">
                <p class="text-xs font-bold text-slate-500">Sin información de totales registrada</p>
              </div>
            `;
          } else if (pres.length > 0) {
            const hasEstimado = pres.some(p => p.tipo === 'ESTIMADO');
            const hasReal = pres.some(p => p.tipo === 'REAL');

            if (hasEstimado || hasReal) {
              const est = pres.find(p => p.tipo === 'ESTIMADO');
              const real = pres.find(p => p.tipo === 'REAL');
              budgetBlock = `
                <div class="grid grid-cols-2 gap-3 mt-5 p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100">
                  <div>
                    <p class="text-[10px] text-purple-900 font-bold uppercase">Total Real</p>
                    <p class="text-base font-black text-purple-700">${real && real.total_con_iva != null ? formatCLP(real.total_con_iva) : 'Sin total real'}</p>
                  </div>
                  <div>
                    <p class="text-[10px] text-slate-600 font-bold uppercase">Presupuesto Estimado</p>
                    <p class="text-base font-black text-slate-800">${est && est.total_con_iva != null ? formatCLP(est.total_con_iva) : 'Sin presupuesto estimado'}</p>
                  </div>
                </div>
              `;
            } else {
              // Only other types (like PRESUPUESTO_HISTORICO or something else)
              // We take the first one 
              const firstPres = pres[0];
              const friendlyType = (firstPres.tipo || 'GENERAL').replace(/_/g, ' ');
              budgetBlock = `
                <div class="mt-5 p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 flex flex-col justify-center items-center text-center">
                  <p class="text-[10px] text-purple-900 font-bold uppercase">${friendlyType}</p>
                  <p class="text-lg font-black text-purple-700">${firstPres.total_con_iva != null ? formatCLP(firstPres.total_con_iva) : 'Sin total registrado'}</p>
                  ${firstPres.total_sin_iva != null ? `<p class="text-[10px] text-slate-600 font-bold mt-1">Sin IVA: ${formatCLP(firstPres.total_sin_iva)}</p>` : ''}
                </div>
              `;
            }
          } else if (imps.length > 0) {
            const firstImp = imps[0];
            budgetBlock = `
              <div class="mt-5 p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 flex flex-col justify-center items-center text-center">
                <p class="text-[10px] text-purple-900 font-bold uppercase">TOTAL REGISTRADO</p>
                <p class="text-lg font-black text-purple-700">${firstImp.total_con_iva != null ? formatCLP(firstImp.total_con_iva) : 'Sin total registrado'}</p>
                ${firstImp.total_sin_iva != null ? `<p class="text-[10px] text-slate-600 font-bold mt-1">Sin IVA: ${formatCLP(firstImp.total_sin_iva)}</p>` : ''}
              </div>
            `;
          }
        }

        const badgeHistorico = ren.es_historico ? `<span class="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">HISTÓRICO</span>` : '';
        
        const estadoOpciones = ['Pendiente de inicio', 'En proceso', 'Pausado', 'Finalizado'];
        const currentStatus = ren.status || 'Estado no definido';
        const selectHtml = `
          <div class="mt-3" onclick="event.stopPropagation()">
            <label class="text-[10px] font-bold text-slate-500 uppercase block mb-1">Estado:</label>
            <select data-proyecto-id="${ren.id}" data-prev="${currentStatus}" onchange="handleChangeEstado(this, '${ren.id}', event)" class="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer hover:bg-slate-100 transition-colors">
              ${!ren.status ? `<option value="Estado no definido">Estado no definido</option>` : ''}
              ${estadoOpciones.map(opt => `<option value="${opt}" ${ren.status === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          </div>
        `;

        return `
          <div onclick="openRenovationDetail('${ren.id}')" class="alm-project-card bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-purple-500 shadow-sm hover:shadow-xl transition-all cursor-pointer card-hover flex flex-col justify-between group">
            
            <div>
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-extrabold bg-purple-100 text-purple-800 px-3 py-1 rounded-lg">
                  🏗️ ${ren.space || 'Ubicación no registrada'}
                </span>
                ${badgeHistorico}
              </div>

              <h4 class="text-xl font-extrabold text-slate-800 group-hover:text-purple-700 transition-colors">
                ${ren.name || 'Sin nombre'}
              </h4>

              ${selectHtml}

              <p class="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                ${ren.description || 'Sin descripción'}
              </p>

              ${budgetBlock}
            </div>

            <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700 group-hover:text-purple-900">
              <span>Abrir Ficha de Remodelación</span>

            </div>

          </div>
        `;
      }).join('')}
    </div>
  `;
}


function demoFecha(n){const d=new Date();d.setDate(d.getDate()+n);return calendarioFechaCivilLocal(d);}
const demoMejoras=[{id:'demo-mejora-1',nombre:'Renovación de iluminación',estado:'En proceso',fecha_inicio:demoFecha(-4),fecha_fin_estimada:demoFecha(12),responsable_texto:'Equipo de mantención',observaciones:'Revisión de avances y coordinación de recursos.'},{id:'demo-mejora-2',nombre:'Mejora de señalización',estado:'Pendiente',fecha_inicio:demoFecha(3),fecha_fin_estimada:demoFecha(15),responsable_texto:'Equipo de mantención'}];
const demoProyectoTareas=[{id:'demo-p1',titulo:'Planificación',grupo_origen:'Diseño',responsable_texto:'Equipo de mantención',estado:'En proceso',fecha_inicio:demoFecha(-4),fecha_vencimiento:demoFecha(2),duracion_original:7,progreso:70},{id:'demo-p2',titulo:'Implementación',grupo_origen:'Ejecución',responsable_texto:'Equipo de mantención',estado:'Pendiente',fecha_inicio:demoFecha(3),fecha_vencimiento:demoFecha(12),duracion_original:10,progreso:0}];
const demoRemodelaciones=[{"id":"demo-rem-1","space":"Sala de reuniones","name":"Renovación de sala","status":"En proceso","description":"Actualización de iluminación y terminaciones.","presupuestosResumen":[{"tipo":"ESTIMADO","total_con_iva":450000},{"tipo":"REAL","total_con_iva":120000}]},{"id":"demo-rem-2","space":"Área común","name":"Renovación de mobiliario","status":"Pendiente de inicio","description":"Planificación de reemplazo de mobiliario.","presupuestosResumen":[{"tipo":"ESTIMADO","total_con_iva":680000},{"tipo":"REAL","total_con_iva":0}]},{"id":"demo-rem-3","space":"Pasillo interior","name":"Mejora de revestimientos","status":"Finalizado","description":"Renovación de superficies y revisión final.","presupuestosResumen":[{"tipo":"ESTIMADO","total_con_iva":320000},{"tipo":"REAL","total_con_iva":298000}]},{"id":"demo-rem-4","space":"Espacio de servicios","name":"Adecuación de instalaciones","status":"Pausado","description":"Revisión de materiales y programación de trabajos.","presupuestosResumen":[{"tipo":"ESTIMADO","total_con_iva":540000},{"tipo":"REAL","total_con_iva":175000}]}];
function demoModal(html){const modal=document.getElementById('modal-improvement-detail');document.getElementById('demo-detalle').innerHTML=html;if(!modal.open)modal.showModal();}
function closeModal(id){const modal=document.getElementById(id);if(modal?.open)modal.close();}
function openImprovementProjectDetail(id){const p=demoMejoras.find(x=>x.id===id);if(p)demoModal(getImprovementFichaHTML(p,demoProyectoTareas));}
function openProyectoGantt(id){const p=demoMejoras.find(x=>x.id===id);if(p)demoModal(getProyectoGanttHTML(p,demoProyectoTareas));}
function formatCLP(v){return '$ '+Number(v).toLocaleString('es-CL');}
function handleChangeEstado(select,id){const p=demoRemodelaciones.find(x=>x.id===id);if(p)p.status=select.value;}
function openRenovationDetail(id){const p=demoRemodelaciones.find(x=>x.id===id);if(!p)return;demoModal(`<h2 class="alm-title">${p.name}</h2><p class="alm-muted">${p.description}</p><p class="mt-3">Estado: ${p.status}</p><p>Presupuesto ficticio: ${formatCLP(p.presupuestosResumen[0].total_con_iva)}</p><button class="alm-btn-secondary mt-4 px-4 py-2" onclick="closeModal('modal-improvement-detail')">Cerrar</button>`);}
function renderMejorasDemo(){return getImprovementsHTML(demoMejoras,[],[],[],[]);}
function renderRemodelacionesDemo(){return '<div class="alm-ui alm-main-page alm-module-page alm-project-page alm-renovations space-y-6 max-w-7xl mx-auto pb-10">'+uiEncabezadoSeccion('Remodelaciones & Cómputo de Materiales','Seguimiento de proyectos y presupuestos.','folder')+getRenovationsGridHTML(demoRemodelaciones)+'</div>';}

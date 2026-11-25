// ==========================================================
// GANTT CARTA — COMPONENTE DE PRESENTACIÓN REUTILIZABLE
// (Fase C2P-4A)
//
// Renderer visual genérico de Carta Gantt. Extraído desde el
// Gantt aprobado de Mejoras (js/views/mejoras.js) SIN cambiar
// su diseño visual: columna izquierda fija, meses, días,
// fines de semana, barras por fase, progreso dentro de la
// barra, línea "Hoy" y scroll horizontal.
//
// REGLAS DEL COMPONENTE (capa SOLO presentación):
// - NO importa servicios (ni MejorasService ni MantencionesService).
// - NO consulta Supabase.
// - NO conoce IDs concretos ni módulos concretos.
// - NO ejecuta escrituras.
// - Recibe un MODELO NORMALIZADO de tareas y devuelve HTML.
//
// MODELO MÍNIMO DE TAREA:
//   {
//     id,                 // identificador libre (no se usa para dibujar)
//     titulo,             // string o null/undefined -> 'Sin título registrado'
//     faseId,             // identificador de fase (no se usa para dibujar)
//     faseNombre,         // nombre visible de la fase (color + leyenda)
//     responsable,        // string o null -> 'Sin responsable registrado'
//     estado,             // OPCIONAL: si la clave existe, se muestra
//     fechaInicio,        // 'YYYY-MM-DD' o null
//     fechaFin,           // 'YYYY-MM-DD' o null
//     progreso,           // 0–100 o null. NULL NUNCA es 0 (sin relleno)
//     activo              // reservado para la fase editor (C2P-4B)
//   }
//
// REGLAS DE DATOS (heredadas del Gantt aprobado):
// - El rango temporal se DERIVA de las fechas reales. Nada hardcodeado.
// - Fechas en ambos extremos (inicio y fin inclusive) dibujan barra.
// - Sin ambas fechas NO se inventa barra: mensaje neutral.
// - progreso NULL -> sin relleno (nunca 0); >100 -> ancho limitado a
//   100% pero el TEXTO conserva el valor real.
// - Colores de fase son SOLO presentación; nunca se persisten.
// - "Hoy" solo se dibuja si cae dentro de la ventana derivada.
// ==========================================================

window.GanttCarta = (function () {
  'use strict';

  // Control auxiliar de navegación; no modifica el modelo del Gantt.
  const recorridosScroll = new WeakMap();
  function recorridoDisponible(timeline, comprobar) {
    const ancho = timeline.clientWidth;
    const contenido = timeline.scrollWidth;
    const anterior = recorridosScroll.get(timeline);
    if (!comprobar && anterior?.ancho === ancho && anterior?.contenido === contenido) return anterior.maximo;
    let maximo = 0;
    if (ancho > 0 && contenido - ancho > 1) {
      // Comprueba el recorrido efectivo del elemento, no solo el ancho de sus hijos.
      const posicion = timeline.scrollLeft;
      const comportamiento = timeline.style.scrollBehavior;
      timeline.style.scrollBehavior = 'auto';
      timeline.scrollLeft = contenido - ancho;
      maximo = Math.max(0, timeline.scrollLeft);
      timeline.scrollLeft = posicion;
      timeline.style.scrollBehavior = comportamiento;
    }
    if (maximo <= 1) maximo = 0;
    recorridosScroll.set(timeline, { ancho, contenido, maximo });
    return maximo;
  }

  function sincronizarScroll(timeline, comprobar = false) {
    const raiz = timeline?.closest('[data-gantt-scroll]');
    const control = raiz?.querySelector('[data-gantt-desplazamiento]');
    if (!control) return;
    const maximo = recorridoDisponible(timeline, comprobar === true);
    const barra = raiz.querySelector('.gantt-horizontal-nav');
    if (barra) barra.hidden = maximo === 0;
    control.disabled = maximo === 0;
    const porcentaje = maximo ? Math.max(0, Math.min(1000, timeline.scrollLeft / maximo * 1000)) : 0;
    control.max = maximo ? '1000' : '0';
    control.value = String(porcentaje);
    control.setAttribute('aria-valuetext', maximo ? Math.round(porcentaje / 10) + ' % del recorrido horizontal' : 'Todas las fechas caben en el espacio disponible');
  }

  function desplazar(control) {
    const timeline = control.closest('[data-gantt-scroll]')?.querySelector('[data-gantt-timeline]');
    if (!timeline) return;
    timeline.scrollLeft = recorridoDisponible(timeline, false) * Number(control.value) / 1000;
    sincronizarScroll(timeline);
  }

  function prepararScroll(control) {
    const timeline = control.closest('[data-gantt-scroll]')?.querySelector('[data-gantt-timeline]');
    if (timeline) sincronizarScroll(timeline);
  }

  function capturarScroll(contenedor) {
    return Array.from(contenedor?.querySelectorAll?.('[data-gantt-timeline]') || []).map(el => el.scrollLeft);
  }

  function restaurarScroll(contenedor, posiciones) {
    Array.from(contenedor?.querySelectorAll?.('[data-gantt-timeline]') || []).forEach((el, i) => {
      el.scrollLeft = posiciones[i] || 0;
      sincronizarScroll(el);
    });
  }

  function avisarGuardado() {
    if (!document.createElement || !document.body) return;
    document.getElementById('gantt-guardado-aviso')?.remove();
    const aviso = document.createElement('div');
    aviso.id = 'gantt-guardado-aviso';
    aviso.className = 'alm-ui';
    aviso.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:1000;pointer-events:none;max-width:calc(100vw - 32px)';
    aviso.setAttribute('role', 'status');
    aviso.setAttribute('aria-live', 'polite');
    aviso.innerHTML = '<div class="alm-panel px-4 py-3 text-sm font-bold">Guardado correctamente.</div>';
    document.body.appendChild(aviso);
    setTimeout(() => aviso.remove(), 1000);
  }

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('resize', function () {
      document.querySelectorAll('[data-gantt-timeline]').forEach(el => sincronizarScroll(el, true));
    });
  }

  // Detecta cartas insertadas en modales y cambios de tamaño sin consultar datos.
  if (typeof MutationObserver === 'function' && typeof document !== 'undefined' && document.documentElement) {
    const observados = new Map();
    const tamanos = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => observados.forEach((hijo, el) => sincronizarScroll(el, true))) : null;
    let pendiente = false;
    const actualizar = () => {
      if (pendiente) return;
      pendiente = true;
      window.requestAnimationFrame(() => {
        pendiente = false;
        observados.forEach((hijo, el) => {
          if (!el.isConnected) {
            tamanos?.unobserve(el);
            if (hijo) tamanos?.unobserve(hijo);
            observados.delete(el);
          }
        });
        document.querySelectorAll('[data-gantt-timeline]').forEach(el => {
          const hijo = el.firstElementChild;
          if (!observados.has(el) || observados.get(el) !== hijo) {
            const anterior = observados.get(el);
            if (anterior) tamanos?.unobserve(anterior);
            observados.set(el, hijo);
            tamanos?.observe(el);
            if (hijo) tamanos?.observe(hijo);
          }
          sincronizarScroll(el, true);
        });
      });
    };
    new MutationObserver(actualizar).observe(document.documentElement, { childList: true, subtree: true });
    actualizar();
  }

  // ---- Constantes visuales (idénticas al Gantt aprobado) ----
  const ANCHO_DIA = 30;   // px por día (escala diaria)
  const ALTO_FILA = 44;   // px por fila de tarea
  const ALTO_MES = 22;    // px fila de meses
  const ALTO_DIA = 24;    // px fila de días
  const ANCHO_INFO = 260; // columna fija izquierda

  // Colores de presentación por fase. NO se persisten.
  const COLORES_FASE = {
    'Planificación': '#0ea5e9',
    'Diseño': '#8b5cf6',
    'Desarrollo': '#10b981',
    'Pruebas': '#f59e0b',
    'Cierre': '#64748b',
    'Hito': '#ef4444'
  };
  const COLOR_FASE_NEUTRO = '#94a3b8';

  // Paleta ordenada para módulos que asignan color por posición de fase
  // (expuesta para que los adaptadores no definan sus propios hex).
  const PALETA_FASES = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#64748b', '#ef4444'];

  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // ---- Variantes de modal ancha (reutilizables) ----
  // El contenido interno NO cambia: solo se altera el ancho del
  // contenedor. La clase normal se restaura al salir de la vista Gantt.
  // NOTA C2P-4A.1: classList NO acepta strings con espacios internos:
  // cada clase va como token individual (spread de los arreglos).
  const CLASES_MODAL_NORMAL = ['max-w-3xl'];
  const CLASES_MODAL_GANTT = ['max-w-[95vw]', 'xl:max-w-[1560px]'];

  // Activa/desactiva la variante ancha sobre un contenedor de modal.
  // Siempre deja exactamente UNA variante (normal o Gantt).
  function modalAncha(contenedor, activo) {
    if (!contenedor || !contenedor.classList) return;
    contenedor.classList.remove(
      ...CLASES_MODAL_NORMAL,
      ...CLASES_MODAL_GANTT
    );
    contenedor.classList.add(
      ...(activo ? CLASES_MODAL_GANTT : CLASES_MODAL_NORMAL)
    );
  }

  // ---- Helpers de datos ----

  // Color de fase: mapa inyectado por el adaptador > nombre estándar >
  // neutro. Nunca persiste nada.
  function colorFase(nombre, colores) {
    if (colores && typeof colores === 'object' && colores[nombre]) return colores[nombre];
    return COLORES_FASE[nombre] || COLOR_FASE_NEUTRO;
  }

  // Escapa comillas dobles para incrustar textos de datos dentro de
  // atributos HTML (title="...") sin romper el marcado.
  function escaparAtributo(valor) {
    return String(valor === null || valor === undefined ? '' : valor).replace(/"/g, '&quot;');
  }

  // Parsea 'YYYY-MM-DD' (o un ISO que empiece igual) a una Date LOCAL a
  // medianoche. Evita el desfase de zona horaria de new Date(str).
  function parseFechaDia(valor) {
    if (!valor) return null;
    const s = String(valor).slice(0, 10);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  function diasEntre(a, b) {
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function agregarDias(fecha, n) {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + n);
  }

  // Rango derivado de TODAS las fechas disponibles. `fuentes` es una
  // lista de objetos { fechaInicio, fechaFin } (tareas y/o fechas de
  // proyecto). Devuelve null si no hay ninguna fecha.
  function calcularRango(fuentes) {
    const fechas = [];
    (Array.isArray(fuentes) ? fuentes : []).forEach(f => {
      if (!f) return;
      const fi = parseFechaDia(f.fechaInicio);
      const ff = parseFechaDia(f.fechaFin);
      if (fi) fechas.push(fi);
      if (ff) fechas.push(ff);
    });

    if (fechas.length === 0) return null;

    let inicio = fechas[0];
    let fin = fechas[0];
    fechas.forEach(f => {
      if (f < inicio) inicio = f;
      if (f > fin) fin = f;
    });

    return { inicio, fin, totalDias: diasEntre(inicio, fin) + 1 };
  }

  // Ancho visual del relleno de progreso (0..100). Escala 0–100:
  // un valor de 1 significa 1%, no 100%. NULL -> null (sin relleno;
  // NULL nunca es 0). >100 -> limitado a 100 para no desbordar; el
  // texto real lo decide la vista.
  function porcentajeProgreso(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    const n = Number(valor);
    if (Number.isNaN(n)) return null;
    if (n === 0) return 0;
    return Math.min(n, 100);
  }

  // Texto de progreso por defecto (idéntico al formato aprobado).
  // Una vista puede inyectar su propio formateador.
  function formatearProgresoDefecto(valor) {
    if (valor === null || valor === undefined || valor === '') return 'Sin progreso registrado';
    const n = Number(valor);
    if (Number.isNaN(n)) return String(valor);
    if (n === 0) return '0%';
    return `${n}%`;
  }

  // ---- Render principal ----
  // Devuelve el BLOQUE de leyenda + timeline (sin encabezados ni
  // botones: eso pertenece a la vista que lo invoca).
  //
  // opciones:
  //   tareas:         [] modelo normalizado (obligatorio para dibujar)
  //   fases:          OPCIONAL [{ nombre }] — si se pasa, la leyenda usa
  //                   estas fases (incluso con 0 tareas); si no, se
  //                   derivan desde las tareas (comportamiento Mejoras).
  //   fechasProyecto: OPCIONAL { fechaInicio, fechaFin } que también
  //                   alimenta el rango temporal.
  //   colores:        OPCIONAL { 'Nombre de fase': '#hex' }.
  //   formatearProgreso: OPCIONAL fn(valor) -> string.
  //   formatearFecha: OPCIONAL fn(valor) -> string (para la lista de
  //                   respaldo sin fechas suficientes).
  //   textos:         OPCIONAL { vacio, sinFechas, sinBarra,
  //                   notaEscala(dias) } para adaptar las cadenas.
  function render(opciones) {
    const o = (opciones && typeof opciones === 'object') ? opciones : {};
    const lista = Array.isArray(o.tareas) ? o.tareas : [];
    const colores = (o.colores && typeof o.colores === 'object') ? o.colores : {};
    const formatearProgreso = (typeof o.formatearProgreso === 'function')
      ? o.formatearProgreso
      : formatearProgresoDefecto;
    const formatearFecha = (typeof o.formatearFecha === 'function')
      ? o.formatearFecha
      : (v => formatDate(v));
    const textos = Object.assign({
      vacio: 'Sin tareas registradas para este proyecto.',
      sinFechas: 'No hay fechas registradas para construir la línea temporal.',
      sinBarra: 'Sin fechas suficientes para dibujar la barra',
      notaEscala: (dias) => `Escala diaria · ${dias} ${dias === 1 ? 'día' : 'días'} derivados de las fechas reales. Los fines de semana aparecen en tono gris y la línea roja marca "Hoy" solo cuando cae dentro del rango.`
    }, (o.textos && typeof o.textos === 'object') ? o.textos : {});

    const rango = calcularRango(
      (o.fechasProyecto ? [o.fechasProyecto] : []).concat(lista)
    );

    // Fases para la leyenda: inyectadas por el adaptador o derivadas
    // desde las tareas (orden de aparición), como en el Gantt aprobado.
    let fasesLeyenda;
    if (Array.isArray(o.fases)) {
      fasesLeyenda = o.fases
        .filter(f => f)
        .map(f => ({
          nombre: (f.nombre === undefined ? null : f.nombre),
          cantidad: lista.filter(t => t && (t.faseNombre || null) === (f.nombre || null)).length
        }));
    } else {
      const indiceFase = {};
      fasesLeyenda = [];
      lista.forEach(t => {
        const clave = (t && t.faseNombre) || null;
        if (!(clave in indiceFase)) {
          indiceFase[clave] = fasesLeyenda.length;
          fasesLeyenda.push({ nombre: clave, cantidad: 0 });
        }
        fasesLeyenda[indiceFase[clave]].cantidad++;
      });
    }

    // ---- Leyenda de fases (solo con tareas) ----
    const leyenda = lista.length > 0 ? `
      <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        ${fasesLeyenda.map(f => `
          <span class="inline-flex items-center space-x-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
            <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${colorFase(f.nombre, colores)}"></span>
            <span>${f.nombre || 'Sin fase registrada'}</span>
            <span class="text-slate-400 dark:text-slate-500">(${f.cantidad})</span>
          </span>
        `).join('')}
      </div>
    ` : '';

    // ---- Cuerpo: vacío / sin fechas / timeline ----
    let cuerpo;
    if (lista.length === 0) {
      cuerpo = `
        <div class="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <p class="text-xs font-bold text-slate-500 dark:text-slate-400">${textos.vacio}</p>
        </div>
      `;
    } else if (!rango) {
      // Sin NINGUNA fecha registrada: listado simple, sin timeline.
      cuerpo = `
        <div class="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 mb-4">
          <p class="text-xs font-bold text-slate-500 dark:text-slate-400">${textos.sinFechas}</p>
        </div>
        <div class="space-y-2">
          ${lista.map(t => `
            <div class="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
              <div class="flex items-start justify-between gap-3">
                <p class="font-extrabold text-slate-800 dark:text-white leading-snug">${t.titulo || 'Sin título registrado'}</p>
                ${('estado' in t) ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">${t.estado || 'Sin estado registrado'}</span>` : ''}
              </div>
              <div class="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 text-[11px]">
                <div><span class="text-slate-400 dark:text-slate-500 block">Fase</span><span class="font-bold text-slate-700 dark:text-slate-200">${t.faseNombre || 'Sin fase registrada'}</span></div>
                ${('responsable' in t) ? `<div><span class="text-slate-400 dark:text-slate-500 block">Responsable</span><span class="font-bold text-slate-700 dark:text-slate-200">${t.responsable || 'Sin responsable registrado'}</span></div>` : ''}
                <div><span class="text-slate-400 dark:text-slate-500 block">Inicio</span><span class="font-bold text-slate-700 dark:text-slate-200">${t.fechaInicio ? formatearFecha(t.fechaInicio) : 'Sin fecha registrada'}</span></div>
                <div><span class="text-slate-400 dark:text-slate-500 block">Avance</span><span class="font-bold text-slate-700 dark:text-slate-200">${formatearProgreso(t.progreso)}</span></div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      // ---- LÍNEA TEMPORAL DIARIA (diseño aprobado) ----
      const anchoTimeline = rango.totalDias * ANCHO_DIA;
      const ALTO_HEADER = ALTO_MES + ALTO_DIA; // cabecera sobre las filas

      const hoy = new Date();
      const hoyDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      const idxHoy = diasEntre(rango.inicio, hoyDia);
      const hoyVisible = idxHoy >= 0 && idxHoy < rango.totalDias;

      // Columnas de fines de semana (una sola capa detrás de las filas).
      let columnasFinde = '';
      for (let i = 0; i < rango.totalDias; i++) {
        const d = agregarDias(rango.inicio, i);
        const wd = d.getDay();
        if (wd === 0 || wd === 6) {
          columnasFinde += `<div style="position:absolute;top:0;bottom:0;left:${i * ANCHO_DIA}px;width:${ANCHO_DIA}px;background:rgba(100,116,139,0.07)"></div>`;
        }
      }

      // Encabezado: fila de meses (agrupando días consecutivos) + fila
      // de números de día.
      let htmlMeses = '';
      let i = 0;
      while (i < rango.totalDias) {
        const d = agregarDias(rango.inicio, i);
        let j = i;
        while (j < rango.totalDias) {
          const dj = agregarDias(rango.inicio, j);
          if (dj.getMonth() !== d.getMonth() || dj.getFullYear() !== d.getFullYear()) break;
          j++;
        }
        const n = j - i;
        htmlMeses += `<div style="width:${n * ANCHO_DIA}px" class="shrink-0 px-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase border-r border-slate-200 dark:border-slate-700 overflow-hidden whitespace-nowrap">${MESES[d.getMonth()]} ${d.getFullYear()}</div>`;
        i = j;
      }

      let htmlDias = '';
      for (let k = 0; k < rango.totalDias; k++) {
        const d = agregarDias(rango.inicio, k);
        const wd = d.getDay();
        const finde = wd === 0 || wd === 6;
        htmlDias += `<div style="width:${ANCHO_DIA}px" class="shrink-0 text-center text-[10px] leading-[${ALTO_DIA}px] font-bold border-r border-slate-100 dark:border-slate-800 ${finde ? 'text-slate-400 dark:text-slate-500 bg-slate-100/60 dark:bg-slate-800/40' : 'text-slate-600 dark:text-slate-300'}">${d.getDate()}</div>`;
      }

      // Filas: barra posicionada por fechas (inicio y fin inclusive).
      // Sin ambas fechas -> sin barra (mensaje neutral, sin inventar).
      const filas = lista.map(t => {
        const color = colorFase(t.faseNombre, colores);
        const fi = parseFechaDia(t.fechaInicio);
        const ff = parseFechaDia(t.fechaFin);
        let barra = '';

        if (fi && ff) {
          let iniIdx = diasEntre(rango.inicio, fi);
          let finIdx = diasEntre(rango.inicio, ff);
          if (finIdx < iniIdx) finIdx = iniIdx; // fin anterior: se conserva 1 día
          const anchoBarra = (finIdx - iniIdx + 1) * ANCHO_DIA;
          const pct = porcentajeProgreso(t.progreso);

          barra = `
              <div style="position:absolute;top:${(ALTO_FILA - 16) / 2}px;left:${iniIdx * ANCHO_DIA}px;width:${anchoBarra}px;height:16px;border-radius:9999px;background:${color}26;border:1px solid ${color}59;overflow:hidden" title="${escaparAtributo(t.titulo || 'Sin título registrado')} · ${escaparAtributo(formatearProgreso(t.progreso))}">
                ${pct !== null ? `<div style="width:${pct}%;height:100%;background:${color}"></div>` : ''}
              </div>
            `;
        } else {
          barra = `<span style="position:absolute;top:0;left:8px;line-height:${ALTO_FILA}px;font-size:10px;color:#94a3b8">${textos.sinBarra}</span>`;
        }

        return `
            <div style="position:relative;height:${ALTO_FILA}px;border-bottom:1px solid rgba(226,232,240,0.7)">
              ${barra}
            </div>
          `;
      }).join('');

      cuerpo = `
        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div class="flex">
            <!-- COLUMNA IZQUIERDA FIJA (no scrollea en horizontal) -->
            <div class="shrink-0 border-r border-slate-200 dark:border-slate-800" style="width:${ANCHO_INFO}px">
              <div class="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 flex items-end" style="height:${ALTO_HEADER}px">
                <span class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase pb-1.5">Tarea / Fase / Responsable</span>
              </div>
              ${lista.map(t => {
                const meta = [
                  t.faseNombre || 'Sin fase registrada',
                  ('responsable' in t) ? (t.responsable || 'Sin responsable registrado') : null,
                  ('estado' in t) ? (t.estado || 'Sin estado registrado') : null,
                  formatearProgreso(t.progreso)
                ].filter(x => x !== null).join(' · ');
                return `
                  <div class="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex flex-col justify-center" style="height:${ALTO_FILA}px">
                    <div class="flex items-center space-x-1.5">
                      <span class="w-2 h-2 rounded-full shrink-0" style="background:${colorFase(t.faseNombre, colores)}"></span>
                      <p class="text-[11px] font-extrabold text-slate-800 dark:text-white truncate" title="${escaparAtributo(t.titulo || 'Sin título registrado')}">${t.titulo || 'Sin título registrado'}</p>
                    </div>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate pl-3.5">
                      ${meta}
                    </p>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- TIMELINE CON SCROLL HORIZONTAL -->
            <div class="overflow-x-auto flex-1" style="min-width:0;overflow-x:auto" data-gantt-timeline onscroll="GanttCarta.sincronizarScroll(this)">
              <div style="position:relative;width:${anchoTimeline}px">
                <!-- Encabezado (meses + días) -->
                <div class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <div class="flex" style="height:${ALTO_MES}px">${htmlMeses}</div>
                  <div class="flex" style="height:${ALTO_DIA}px">${htmlDias}</div>
                </div>

                <!-- Capa de fines de semana detrás de las barras -->
                <div style="position:absolute;top:${ALTO_HEADER}px;left:0;right:0;bottom:0;pointer-events:none">
                  ${columnasFinde}
                </div>

                <!-- Filas con barras -->
                <div style="position:relative">
                  ${filas}
                </div>

                <!-- Línea "Hoy" solo si cae dentro de la ventana -->
                ${hoyVisible ? `
                    <div style="position:absolute;top:0;bottom:0;left:${idxHoy * ANCHO_DIA + ANCHO_DIA / 2}px;width:2px;background:rgba(244,63,94,0.8);pointer-events:none"></div>
                    <div style="position:absolute;top:0;left:${idxHoy * ANCHO_DIA + ANCHO_DIA / 2 + 4}px;font-size:9px;font-weight:900;color:#e11d48;pointer-events:none">Hoy</div>
                  ` : ''}
              </div>
            </div>
          </div>
        </div>

        <div class="gantt-horizontal-nav" hidden>
          <p>Desplázate horizontalmente para ver más fechas →</p>
          <input type="range" min="0" max="1000" step="any" value="0"
            data-gantt-desplazamiento aria-label="Desplazamiento horizontal de las fechas del Gantt"
            onfocus="GanttCarta.prepararScroll(this)" onpointerdown="GanttCarta.prepararScroll(this)"
            oninput="GanttCarta.desplazar(this)">
        </div>
        <p class="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
          ${textos.notaEscala(rango.totalDias)}
        </p>
      `;
    }

    return `${leyenda}
    <div class="mt-4" data-gantt-scroll>
      ${cuerpo}
    </div>
  `;
  }

  return {
    ANCHO_DIA,
    ALTO_FILA,
    ALTO_MES,
    ALTO_DIA,
    ANCHO_INFO,
    COLORES_FASE,
    COLOR_FASE_NEUTRO,
    PALETA_FASES,
    CLASES_MODAL_NORMAL,
    CLASES_MODAL_GANTT,
    colorFase,
    escaparAtributo,
    parseFechaDia,
    diasEntre,
    agregarDias,
    calcularRango,
    porcentajeProgreso,
    formatearProgreso: formatearProgresoDefecto,
    modalAncha,
    sincronizarScroll,
    desplazar,
    prepararScroll,
    capturarScroll,
    restaurarScroll,
    avisarGuardado,
    render
  };
})();

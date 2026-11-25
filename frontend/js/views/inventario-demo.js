const invEstado = {
  texto: '',
  ubicacionId: '',
  pagina: 0,
  cargando: false,
  error: null,
  productos: [],
  total: 0,
  bodegas: [],
  bodegasError: null,
  enVuelo: false
};

const INV_TAMANO_PAGINA=12;let invBusquedaTimer=null,invCatalogoRevision=0;function invPuedeEscribir(){return false;}function invHistPuedeConsultar(){return false;}function invCambiarSeccion(){}function invRecuperacionIniciar(){}function invRecepcionesActualizar(){}function renderInventarioView() {
  invHistSeccion = 'catalogo';
  // La carga se dispara DESPUÉS de que app.js fije el HTML del contenedor.
  setTimeout(function () {
    invCargarBodegas(true);
    invCargarCatalogo(true);
    invRecuperacionIniciar();
    invRecepcionesActualizar();
  }, 0);

  return `
    <!-- INV-4 / INV-4.1: catálogo de Inventario (solo lectura) -->
    <div class="alm-ui alm-main-page alm-module-page alm-inventory space-y-4 md:space-y-5">

      <!-- INV-4.1: encabezado del módulo: título claro + total real
           SIEMPRE visible (sin duplicarlo luego en la barra de filtros). -->
      ${uiEncabezadoSeccion('Inventario','Consulta el catálogo de productos, revisa sus fichas y filtra por bodega.','box','<span id="inv-total" class="text-sm font-semibold alm-muted">' + invTotalHTML() + '</span>')}

      <div id="inv-entradas-pendientes" aria-live="polite"></div>
      <nav aria-label="Secciones de Inventario" class="alm-catalog-tabs flex flex-wrap gap-2">
        <button id="inv-tab-catalogo" aria-pressed="true" onclick="invCambiarSeccion('catalogo')" class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold bg-blue-600 text-white">Catálogo de productos</button>
        ${invHistPuedeConsultar() ? '<button id="inv-tab-historico" aria-pressed="false" onclick="invCambiarSeccion(\'historico\')" class="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold">Histórico y trazabilidad</button>' : ''}
      </nav>
      <div id="inv-seccion-catalogo" class="space-y-4">
      <div class="alm-panel alm-filter-panel bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 shadow-sm">
        <div class="alm-inv-filtros">
          <div class="min-w-0">
            <label for="inv-busqueda" class="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Buscar producto</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">🔍</span>
              <input id="inv-busqueda" type="search" autocomplete="off"
                placeholder="Escriba un nombre de producto…"
                value="${invEsc(invEstado.texto)}"
                oninput="invOnBuscar(this.value)"
                class="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60" />
            </div>
          </div>
          <div class="min-w-0">
            <label for="inv-filtro-bodega" class="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Bodega</label>
            <select id="inv-filtro-bodega" onchange="invOnFiltrarBodega(this.value)"
              ${invEstado.bodegas.length === 0 ? 'disabled' : ''}
              class="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60 disabled:opacity-60 disabled:cursor-not-allowed">
              ${invOpcionesBodegasHTML()}
            </select>
          </div>
          ${invPuedeEscribir() ? `
          <div class="alm-inv-acciones">
            ${typeof esAdminOperativoActual === 'function' && esAdminOperativoActual() === true ? `<button type="button" onclick="mntAbrirAltaUbicacion('inventario')" class="alm-btn-primary px-4 py-2">Agregar bodega</button>` : ''}
            <button type="button" id="inv-nuevo-producto" onclick="invAbrirModalNuevo()"
              title="Crear un producto nuevo en el catálogo del Inventario"
              class="alm-btn-primary px-4 py-2">Agregar producto</button>
          </div>` : ''}
        </div>
        <div id="inv-contador" class="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">${invContadorHTML()}</div>
      </div>

      <div id="inv-listado">${invListadoHTML()}</div>
      <div id="inv-paginacion">${invPaginacionHTML()}</div>
      </div>
      <div id="inv-seccion-historico" class="hidden"></div>
    </div>`;
}

// ---------------------------------------------------------
// Escape de toda cadena proveniente de datos (patrón mntEsc)
// ---------------------------------------------------------
function invEsc(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Fecha/hora del evento → texto local (patrón mntFechaHoraRevisionTexto):
// created_at/fecha salen del servidor; si es ilegible → texto neutro.
function invOnBuscar(valor) {
  if (invBusquedaTimer) clearTimeout(invBusquedaTimer);
  // Debounce de 350 ms: evita una RPC por tecla presionada.
  invBusquedaTimer = setTimeout(function () {
    invBusquedaTimer = null;
    const texto = ((valor === null || valor === undefined) ? '' : String(valor)).trim();
    if (texto === invEstado.texto) return;
    invEstado.texto = texto;
    invEstado.pagina = 0;
    invCargarCatalogo();
  }, 350);
}

function invOnFiltrarBodega(valor) {
  const id = (valor === null || valor === undefined) ? '' : String(valor);
  if (id === invEstado.ubicacionId) return;
  invEstado.ubicacionId = id;
  invEstado.pagina = 0;
  invCargarCatalogo();
}

function invCambiarPagina(delta) {
  const totalPaginas = invTotalPaginas();
  const nueva = invEstado.pagina + (Number(delta) || 0);
  if (nueva < 0 || nueva >= totalPaginas || nueva === invEstado.pagina) return;
  invEstado.pagina = nueva;
  invCargarCatalogo();
}

function invTotalPaginas() {
  const total = Number(invEstado.total) || 0;
  return Math.max(1, Math.ceil(total / INV_TAMANO_PAGINA));
}

function invLimpiarFiltros() {
  if (invBusquedaTimer) { clearTimeout(invBusquedaTimer); invBusquedaTimer = null; }
  invEstado.texto = '';
  invEstado.ubicacionId = '';
  invEstado.pagina = 0;
  const inp = document.getElementById('inv-busqueda');
  if (inp) inp.value = '';
  invPintarFiltroBodegas();
  invCargarCatalogo(true);
}

function invReintentarCatalogo() {
  invCargarCatalogo(true);
}

// ---------------------------------------------------------
// Carga del catálogo (anti doble clic / anti carriles)
// ---------------------------------------------------------
async function invCargarCatalogo(force) {
  if (invEstado.enVuelo) {
    if (force === true) ++invCatalogoRevision;
    return;
  }
  const revision = invCatalogoRevision;
  invEstado.enVuelo = true;
  invEstado.cargando = true;
  invEstado.error = null;
  invPintarListado();

  let paginaCorregida = false;
  try {
    if (!window.InventarioService) throw new Error('InventarioService no está disponible.');
    const res = await window.InventarioService.buscarProductos({
      texto: invEstado.texto,
      ubicacionId: invEstado.ubicacionId,
      limite: INV_TAMANO_PAGINA,
      offset: invEstado.pagina * INV_TAMANO_PAGINA
    }, force === true);

    if (revision !== invCatalogoRevision) {
      paginaCorregida = true;
    } else if (res.productos.length === 0 && res.total > 0 && invEstado.pagina > 0) {
      // La página quedó fuera de rango (p. ej. el catálogo cambió tras un
      // refresco): se vuelve a la primera página en vez de mostrar un
      // vacío engañoso.
      invEstado.pagina = 0;
      paginaCorregida = true;
    } else {
      invEstado.productos = res.productos;
      invEstado.total = res.total;
    }
  } catch (e) {
    invEstado.error = (e && e.message) ? e.message : 'No fue posible cargar el catálogo de productos.';
    invEstado.productos = [];
    invEstado.total = 0;
  } finally {
    invEstado.enVuelo = false;
    invEstado.cargando = false;
  }

  if (revision !== invCatalogoRevision) return invCargarCatalogo(true);
  invPintarListado();
  if (paginaCorregida) return invCargarCatalogo(force);
}

async function invCargarBodegas(force) {
  try {
    if (!window.InventarioService) return;
    const bodegas = await window.InventarioService.getBodegas(force === true);
    invEstado.bodegas = Array.isArray(bodegas) ? bodegas : [];
    invEstado.bodegasError = null;
  } catch (e) {
    // INV-4.1: SIN degradación a "todas las ubicaciones". El filtro queda
    // deshabilitado con estado de error; el catálogo sigue operando.
    invEstado.bodegas = [];
    invEstado.bodegasError = (e && e.message) ? e.message : 'No fue posible cargar las bodegas.';
    console.warn('INV-4: no fue posible cargar el desplegable de bodegas:', e);
  }
  invPintarFiltroBodegas();
}

// ---------------------------------------------------------
// Repintado por zonas (el buscador NO se re-renderiza: conserva el foco)
// ---------------------------------------------------------
function invPintarListado() {
  const listado = document.getElementById('inv-listado');
  if (listado) listado.innerHTML = invListadoHTML();
  const paginacion = document.getElementById('inv-paginacion');
  if (paginacion) paginacion.innerHTML = invPaginacionHTML();
  const contador = document.getElementById('inv-contador');
  if (contador) contador.innerHTML = invContadorHTML();
  const total = document.getElementById('inv-total');
  if (total) total.innerHTML = invTotalHTML();
}

function invPintarFiltroBodegas() {
  const sel = document.getElementById('inv-filtro-bodega');
  if (!sel) return;
  const lista = Array.isArray(invEstado.bodegas) ? invEstado.bodegas : [];
  const ids = lista.map(function (b) { return String(b.id); });
  // INV-4.1: una selección que ya no corresponde a una bodega registrada
  // se limpia (el filtro solo admite ubicaciones con tipo = 'BODEGA').
  if (invEstado.ubicacionId && !invEstado.bodegasError && ids.indexOf(String(invEstado.ubicacionId)) === -1) {
    invEstado.ubicacionId = '';
    invEstado.pagina = 0;
    sel.innerHTML = invOpcionesBodegasHTML();
    invCargarCatalogo();
    return;
  }
  sel.innerHTML = invOpcionesBodegasHTML();
  // INV-4.1: filtro inhabilitado ante error de carga o ausencia de bodegas
  // (sin degradar a "todas las ubicaciones").
  const inactivo = Boolean(invEstado.bodegasError) || lista.length === 0;
  sel.disabled = inactivo;
  sel.title = invEstado.bodegasError
    ? 'No fue posible cargar las bodegas: ' + invEstado.bodegasError
    : (inactivo ? 'Sin bodegas registradas' : '');
}

// ---------------------------------------------------------
// HTML puro del listado (probable por el harness INV-4)
// ---------------------------------------------------------
function invOpcionesBodegasHTML() {
  // INV-4.1: solo bodegas reales (ubicaciones.tipo = 'BODEGA'). Sin
  // degradación a otras ubicaciones ni opciones fuera de la lista.
  if (invEstado.bodegasError) {
    return '<option value="" selected>Bodegas no disponibles (error de carga)</option>';
  }
  const lista = Array.isArray(invEstado.bodegas) ? invEstado.bodegas : [];
  if (lista.length === 0) {
    return '<option value="">Sin bodegas registradas</option>';
  }
  let opciones = '<option value="">Todas las bodegas</option>';
  lista.forEach(function (b) {
    if (!b || !b.id) return;
    const esSeleccion = String(b.id) === String(invEstado.ubicacionId);
    opciones += '<option value="' + invEsc(b.id) + '"' + (esSeleccion ? ' selected' : '') + '>' +
      invEsc(b.nombre) + '</option>';
  });
  return opciones;
}

// INV-4.1: el total REAL vive en el encabezado (#inv-total); la línea de
// contador solo aporta contexto (página, búsqueda y bodega), sin duplicar.
function invTotalHTML() {
  if (invEstado.cargando) return 'Cargando catálogo…';
  if (invEstado.error) return 'Total no disponible';
  const total = Number(invEstado.total) || 0;
  return total + (total === 1 ? ' producto' : ' productos');
}

function invContadorHTML() {
  if (invEstado.cargando) return 'Cargando catálogo…';
  if (invEstado.error) return 'Sin información por un error de carga.';
  const partes = [];
  if (Number(invEstado.total) > INV_TAMANO_PAGINA) {
    partes.push('Página ' + (invEstado.pagina + 1) + ' de ' + invTotalPaginas());
  }
  if (invEstado.texto) partes.push('Búsqueda: “' + invEsc(invEstado.texto) + '”');
  if (invEstado.ubicacionId) {
    const bodega = (invEstado.bodegas || []).find(function (b) {
      return b && String(b.id) === String(invEstado.ubicacionId);
    });
    partes.push('Bodega: ' + (bodega ? invEsc(bodega.nombre) : 'seleccionada'));
  }
  if (partes.length === 0) return ' ';
  return partes.join(' · ');
}

function invEsqueletoHTML() {
  return uiCargandoHTML();
}

function invListadoHTML() {
  if (invEstado.cargando) return invEsqueletoHTML();

  if (invEstado.error) {
    return `
      <div class="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-8 text-center">
        <div class="text-3xl mb-2">⚠️</div>
        <p class="text-sm font-semibold text-rose-700 dark:text-rose-300">No fue posible cargar el catálogo</p>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${invEsc(invEstado.error)}</p>
        <button type="button" onclick="invReintentarCatalogo()"
          class="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">Reintentar</button>
      </div>`;
  }

  if (!invEstado.productos || invEstado.productos.length === 0) {
    const hayFiltros = Boolean(invEstado.texto || invEstado.ubicacionId);
    return `
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
        <div class="text-3xl mb-2">📦</div>
        <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">No se encontraron productos</p>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Ajuste la búsqueda o el filtro de bodega.</p>
        ${hayFiltros ? `<button type="button" onclick="invLimpiarFiltros()"
          class="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">Limpiar filtros</button>` : ''}
      </div>`;
  }

  return `<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">` +
    invEstado.productos.map(invTarjetaHTML).join('') + `</div>`;
}

// Una tarjeta por producto (una sola fila por producto aunque esté en
// varias bodegas: la RPC de buscar ya agrega por producto).
// INV-4.1: nombre protagonista (texto mayor, 2 líneas, título completo en
// tooltip sin modificar el texto original de Supabase); SIN badges de
// procedencia ni "Histórico" ni "Sin unidad registrada" (la procedencia
// detallada vive en la ficha); la unidad solo se muestra si está registrada.
function invTarjetaHTML(p) {
  const prod = p || {};
  const id = (prod.producto_id === null || prod.producto_id === undefined) ? '' : String(prod.producto_id);
  const nombreTexto = (prod.nombre && String(prod.nombre).trim() !== '')
    ? String(prod.nombre) : 'Sin nombre registrado';
  const conUnidad = (prod.unidad_medida !== null && prod.unidad_medida !== undefined &&
    String(prod.unidad_medida).trim() !== '');
  const unidad = conUnidad ? 'Unidad: ' + invEsc(prod.unidad_medida) : '';
  // Único chip informativo: distingue productos con conteo operativo
  // verificado (no es una etiqueta repetitiva por producto del catálogo).
  const chipExistencia = (prod.tiene_existencia_operativa === true)
    ? '<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">Con existencia verificada</span>'
    : '';

  return `
    <button type="button" onclick="invAbrirFicha('${invEsc(id)}')" ${id ? '' : 'disabled'}
      title="${invEsc(nombreTexto)}"
      class="alm-record-card text-left flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:border-blue-400 dark:hover:border-blue-700 hover:shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
      <h3 class="font-semibold text-[15px] leading-snug text-slate-800 dark:text-slate-100 line-clamp-2">${invEsc(nombreTexto)}</h3>
      ${unidad ? `<p class="text-xs text-slate-400 dark:text-slate-500 mt-1.5">${unidad}</p>` : ''}
      ${invPresentacionHTML(prod)}
      ${chipExistencia ? `<div class="flex flex-wrap gap-1.5 mt-2">${chipExistencia}</div>` : ''}
      <span class="inline-block mt-auto pt-3 text-xs font-bold text-blue-600 dark:text-blue-400">Ver ficha</span>
    </button>`;
}

function invEtiquetaOrigen(origen) {
  if (origen === 'CATALOGO_INICIAL') {
    return {
      texto: 'Catálogo inicial',
      clases: 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
    };
  }
  if (origen === 'SISTEMA') {
    return {
      texto: 'Creado en sistema',
      clases: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
    };
  }
  return {
    texto: 'Origen no registrado',
    clases: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
  };
}

function invPaginacionHTML() {
  if (invEstado.cargando || invEstado.error) return '';
  if (!invEstado.productos || invEstado.productos.length === 0) return '';

  const totalPaginas = invTotalPaginas();
  const enPrimera = invEstado.pagina <= 0;
  const enUltima = invEstado.pagina >= totalPaginas - 1;
  const clasesBase = 'px-4 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800';

  return `
    <div class="flex items-center justify-between gap-3">
      <button type="button" onclick="invCambiarPagina(-1)" ${enPrimera ? 'disabled' : ''}
        class="${clasesBase}">‹ Anterior</button>
      <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Página ${invEstado.pagina + 1} de ${totalPaginas}</span>
      <button type="button" onclick="invCambiarPagina(1)" ${enUltima ? 'disabled' : ''}
        class="${clasesBase}">Siguiente ›</button>
    </div>`;
}

// ---------------------------------------------------------
// Modal de ficha del producto (patrón overlay del proyecto)
// ---------------------------------------------------------
function invPresentacionHTML(producto) {
  const texto = producto?.presentacion;
  return typeof texto === 'string' && texto.trim() ? '<p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 break-words">Presentación: ' + invEsc(texto) + '</p>' : '';
}

const demoBodegas=[{id:'demo-b1',nombre:'Bodega de muestra A'},{id:'demo-b2',nombre:'Bodega de muestra B'}];
const demoProductos=[{producto_id:'demo-prod1',nombre:'Pintura blanca de muestra',unidad_medida:'Litro',presentacion:'Envase 4 L',tiene_existencia_operativa:true,bodega:'demo-b1',cantidad:12},{producto_id:'demo-prod2',nombre:'Guantes de trabajo de muestra',unidad_medida:'Par',presentacion:'Talla estándar',tiene_existencia_operativa:true,bodega:'demo-b2',cantidad:8},{producto_id:'demo-prod3',nombre:'Lámpara LED de muestra',unidad_medida:'Unidad',presentacion:'9 W',tiene_existencia_operativa:true,bodega:'demo-b1',cantidad:20}];
window.InventarioService={async getBodegas(){return structuredClone(demoBodegas);},async buscarProductos({texto,ubicacionId,limite,offset}){const items=demoProductos.filter(p=>(!ubicacionId||p.bodega===ubicacionId)&&p.nombre.toLowerCase().includes(texto.toLowerCase()));return {productos:structuredClone(items.slice(offset,offset+limite)),total:items.length};}};
function invAbrirFicha(id){const p=demoProductos.find(x=>x.producto_id===id);if(!p)return;demoModal(`<h2 class="alm-title">${invEsc(p.nombre)}</h2><p class="alm-muted">Ficha de demostración (solo lectura)</p><div class="alm-panel p-4 mt-3"><p>Unidad: ${invEsc(p.unidad_medida)}</p><p>Presentación: ${invEsc(p.presentacion)}</p><p>Existencia ficticia: ${p.cantidad}</p><p>Bodega: ${invEsc(demoBodegas.find(b=>b.id===p.bodega)?.nombre)}</p></div><button class="alm-btn-secondary px-4 py-2 mt-4" onclick="closeModal('modal-improvement-detail')">Cerrar</button>`);}

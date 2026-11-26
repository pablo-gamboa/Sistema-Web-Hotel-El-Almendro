const gestionEsc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);
const gestionBoton = (texto, atributos, principal = false) =>
  `<button type="button" class="alm-btn-${principal ? 'primary' : 'secondary'} px-3 py-2" ${atributos}>${texto}</button>`;
const gestionEstado = t => t.retirada_en ? 'Retirada' : t.estado === 'completada' ? 'Completada'
  : t.fecha_limite && t.fecha_limite < calendarioFechaCivilLocal() ? 'Vencida' : 'Pendiente';
let gestionEntrada = null;
const gestionCalendariosActivos = new WeakMap();

function gestionAplicarTarea(filas, tarea, incluir = !tarea.retirada_en) {
  const actualizadas = filas.filter(t => t.id !== tarea.id);
  if (incluir) actualizadas.push(tarea);
  return actualizadas;
}

function gestionActualizarCalendarios(tarea) {
  document.querySelectorAll('[data-gestion-cal-activo]').forEach(panel =>
    gestionCalendariosActivos.get(panel)?.actualizar(tarea));
}

function gestionAbrirDesdeEquipo(id, nombre) {
  if (!window.GestionTareas?.puede() || !esAdminOperativoActual()) return;
  gestionEntrada = { actor: state.currentUser.id, equipo: { id, nombre } };
  navigateTo('tareas-pendientes');
  gestionEntrada = null;
}

function gestionHoyChile(ahora=new Date()) {
  const formato=gestionHoyChile.formato||(gestionHoyChile.formato=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}));
  const partes=Object.fromEntries(formato.formatToParts(ahora).filter(p=>['year','month','day'].includes(p.type)).map(p=>[p.type,p.value]));
  return partes.year+'-'+partes.month+'-'+partes.day;
}
function gestionCategoriaTarea(t,hoy=gestionHoyChile()) {
  if(t.retirada_en)return null;
  if(t.estado==='completada')return 'completada';
  if(t.estado!=='pendiente'||!/^\d{4}-\d{2}-\d{2}$/.test(t.fecha_limite||'')||!formatearFechaCL(t.fecha_limite,{civil:true,vacio:null,invalida:null}))return null;
  return t.fecha_limite<hoy?'vencida':'pendiente';
}
function gestionContadoresTareas(tareas,completa,hoy=gestionHoyChile()) {
  if(!completa||tareas.some(t=>!t.retirada_en&&!gestionCategoriaTarea(t,hoy)))return null;
  const totales={vencida:0,pendiente:0,completada:0};
  for(const t of tareas){const categoria=gestionCategoriaTarea(t,hoy);if(categoria)totales[categoria]++;}return totales;
}
function gestionOrdenarTareas(tareas,estado,hoy=gestionHoyChile()) {
  return tareas.filter(t=>gestionCategoriaTarea(t,hoy)===estado).sort((a,b)=>{
    const fecha=estado==='completada'?Date.parse(b.completada_en)-Date.parse(a.completada_en):(a.fecha_limite||'').localeCompare(b.fecha_limite||'');
    return fecha||Date.parse(b.creada_en)-Date.parse(a.creada_en)||a.id.localeCompare(b.id);
  });
}
function gestionPaginaLista(tareas,pagina,cursor,cursores) {
  if(!Array.isArray(pagina?.items)||typeof pagina.hay_mas!=='boolean'||pagina.items.some(t=>!t||typeof t.id!=='string'))throw Object.assign(Error('Respuesta de tareas incompleta.'),{code:'GESTION_LISTA_DATOS'});
  if(pagina.hay_mas&&(typeof pagina.siguiente_cursor!=='string'||pagina.siguiente_cursor===cursor||cursores.has(pagina.siguiente_cursor)))throw Object.assign(Error('No se pudo avanzar la consulta de tareas.'),{code:'GESTION_LISTA_CURSOR'});
  return [...new Map([...tareas,...pagina.items].map(t=>[t.id,t])).values()].filter(t=>!t.retirada_en);
}
function gestionDemoraCambioDia(ahora=new Date()) {
  const inicio=ahora.getTime(),dia=gestionHoyChile(ahora);let bajo=inicio,alto=inicio+36*3600000;
  while(alto-bajo>1){const mitad=Math.floor((alto+bajo)/2);if(gestionHoyChile(new Date(mitad))===dia)bajo=mitad;else alto=mitad;}
  return alto-inicio+50;
}
function gestionVigilarDia(raiz,cambiar,online) {
  let dia=gestionHoyChile(),timer,observador,terminado=false;
  const limpiar=()=>{terminado=true;clearTimeout(timer);window.removeEventListener('focus',revisar);window.removeEventListener('online',conectar);document.removeEventListener('visibilitychange',visible);observador?.disconnect();};
  const revisar=()=>{
    if(terminado)return;
    if(!raiz.isConnected){limpiar();return;}
    const actual=gestionHoyChile();if(actual!==dia&&cambiar(actual)!==false)dia=actual;
    clearTimeout(timer);timer=setTimeout(revisar,gestionDemoraCambioDia());
  };
  const conectar=()=>{if(!raiz.isConnected)limpiar();else online?.();};
  const visible=()=>{if(document.visibilityState==='visible')revisar();};
  window.addEventListener('focus',revisar);window.addEventListener('online',conectar);document.addEventListener('visibilitychange',visible);
  if(typeof MutationObserver!=='undefined'&&raiz.parentNode){observador=new MutationObserver(()=>{if(!raiz.isConnected)limpiar();});observador.observe(raiz.parentNode,{childList:true});if(raiz.parentNode.parentNode)observador.observe(raiz.parentNode.parentNode,{childList:true});}
  revisar();return limpiar;
}

function gestionIconoDetalle(tipo) {
  const trazos={retirarUsuario:'<circle cx="9" cy="7" r="4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M18 8h5"/>',usuarios:'<circle cx="9" cy="7" r="4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',historial:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2"/>',calendario:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',cerrar:'<path d="m6 6 12 12M18 6 6 18"/>',editar:'<path d="m16 3 5 5M4 20l4-1L20 7a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/>',retirar:'<path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/>'};
  return '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(trazos[tipo]||'')+'</svg>';
}
function gestionLimpiarAccionesCabecera(root) {
  const destino=root.querySelector?.('[data-gestion-acciones-tarea-cabecera]');
  if(destino){destino.replaceChildren();destino.hidden=true;}
}
function gestionSubirAccionesTarea(root,campos) {
  const destino=root.querySelector?.('[data-gestion-acciones-tarea-cabecera]');
  const fuente=campos.querySelector('[data-gestion-globales-fuente]');
  if(!destino)return;
  const botones=fuente?[...fuente.querySelectorAll('button')]:[];
  destino.replaceChildren(...botones);destino.hidden=botones.length===0;fuente?.remove();
}
function gestionPuedeRetirarAsignacion(t,a,asignaciones,administrador) {
  return Boolean(administrador&&!t.retirada_en&&a&&typeof a.id==='string'&&a.id&&!a.retirada_en&&asignaciones.some(x=>x.id===a.id&&!x.retirada_en)&&asignaciones.filter(x=>!x.retirada_en).length>1);
}
function gestionInicialesResponsable(nombre) {
  return String(nombre||'').trim().split(/\s+/u).filter(Boolean).slice(0,2).map(p=>Array.from(p)[0]).join('').toLocaleUpperCase('es-CL')||'—';
}
function gestionFechaContexto(t,hoy=gestionHoyChile()) {
  if(t.retirada_en)return {estado:'Retirada',texto:'Tarea retirada',clase:'neutra'};
  if(t.estado==='completada')return {estado:'Completada',texto:'Tarea completada',clase:'completada'};
  if(t.estado!=='pendiente')return {estado:'Estado no disponible',texto:'Fecha no disponible',clase:'neutra'};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(t.fecha_limite||'')||!formatearFechaCL(t.fecha_limite,{civil:true,vacio:null,invalida:null}))return {estado:'Pendiente',texto:'Fecha no disponible',clase:'neutra'};
  // Coordenadas de días civiles: UTC solo sirve como escala uniforme, no como zona del usuario.
  const dias=Math.round((Date.parse(t.fecha_limite+'T12:00:00Z')-Date.parse(hoy+'T12:00:00Z'))/86400000);
  if(dias<0)return {estado:'Vencida',texto:dias===-1?'Vencida ayer':'Vencida hace '+(-dias)+' días',clase:'vencida'};
  if(dias===0)return {estado:'Pendiente',texto:'Vence hoy',clase:'proxima'};
  if(dias===1)return {estado:'Pendiente',texto:'Vence mañana',clase:'proxima'};
  return {estado:'Pendiente',texto:'Faltan '+dias+' días',clase:'plazo'};
}
function gestionColorTarea(t) {
  if (t.estado === 'completada') return 'tarea-completada';
  const hoy = calendarioFechaCivilLocal(), siguiente = new Date();
  siguiente.setDate(siguiente.getDate() + 1);
  return t.fecha_limite < hoy ? 'tarea-pendiente-vencida'
    : t.fecha_limite <= calendarioFechaCivilLocal(siguiente) ? 'tarea-pendiente-proxima' : 'tarea-pendiente-plazo';
}
// Resumen visual: promedio aritmético de avances vigentes; no cambia estados.
function gestionProgresoResumen(asignaciones) {
  const vigentes=asignaciones.filter(a=>!a.retirada_en);
  const valido=vigentes.length>0&&vigentes.every(a=>typeof a.progreso==='number'&&Number.isFinite(a.progreso)&&a.progreso>=0&&a.progreso<=100);
  return { total:vigentes.length, completados:vigentes.filter(a=>a.estado==='completada').length,
    porcentaje:valido?Math.round(vigentes.reduce((s,a)=>s+a.progreso,0)/vigentes.length*100)/100:null };
}
function gestionTareaResumen(t, { accion = '', detallado = false, asignaciones } = {}) {
  const activos=Array.isArray(asignaciones)?asignaciones.filter(a=>!a.retirada_en):null;
  const responsables = activos ? (activos.length ? `<div class="gestion-responsables-resumen alm-muted text-xs" aria-label="Responsables vigentes">
    ${activos.slice(0,2).map(a=>{const nombre=window.UsuariosService?.nombreParaMostrar?.(a,'trabajador_nombre')??a.trabajador_nombre;return `<span class="gestion-responsable-nombre" title="${gestionEsc(nombre)}">${gestionEsc(nombre)}</span>`;}).join('')}
    ${activos.length>2?`<span class="gestion-responsables-adicionales">+${activos.length-2}</span>`:''}
  </div>` : '<p class="alm-muted text-xs">Sin responsables vigentes.</p>')
    : detallado?(asignaciones===null?'<p class="alm-muted text-xs">Responsables no disponibles.</p>':'<p class="alm-muted text-xs">Responsables: consultar en Ver tarea.</p>'):'';
  return `<article class="alm-panel gestion-tarea-tarjeta p-3 min-w-0${accion ? ' flex items-center gap-3' : ''}"><div class="min-w-0 flex-1">
    <p class="alm-title break-words" title="${gestionEsc(t.titulo)}">${gestionEsc(t.titulo)}</p>
    ${t.lectura_historica?.estado==='NO_DISPONIBLE'?'<p class="alm-muted text-xs" role="status">Etiquetas históricas no disponibles; se muestran los nombres originales.</p>':''}
    <p class="alm-muted text-sm"><span class="inline-flex rounded-full px-2 py-0.5 ${gestionColorTarea(t)}">${gestionEstado(t)}</span> · ${detallado ? 'Fecha límite: ' : ''}${gestionEsc(formatDate(t.fecha_limite))}</p>
    ${responsables}</div>${accion ? `<div class="shrink-0 flex flex-col gap-2" data-gestion-acciones>${accion}</div>` : ''}
  </article>`;
}
// La lectura principal ya fue autorizada. Las etiquetas se aplican después,
// únicamente si la misma vista/contexto continúa vigente.
function gestionCompletarHistoricos(lectura,vigente,aplicar) {
  lectura?.enriquecimientoHistorico?.then(datos=>{if(vigente())aplicar(datos);}).catch(()=>{});
}

// Calendario compartido. Solo lee el mes visible y reutiliza páginas ya cargadas.
function gestionCalendario(contenedor, alAbrir, equipos = null, { detallado = false } = {}) {
  const servicio = window.GestionTareas;
  const contexto = servicio.contexto();
  contenedor.innerHTML = `${calendarioMensualHTML()}<div data-gestion-dia class="space-y-2" aria-live="polite"></div>`;
  const diaHTML = contenedor.querySelector('[data-gestion-dia]');
  const cache = new Map(), cacheHasta = new Map();
  const cacheAsignaciones = new Map(), datosAsignaciones = new Map();
  const asignacionesHasta = new Map();
  let secuencia = 0;
  const calendario = iniciarCalendarioMensual(contenedor.querySelector('[data-calendario]'), {
    fechaRegistro: t => t.fecha_limite,
    etiquetaCantidad: n => n + (n === 1 ? ' tarea' : ' tareas'),
    alSeleccionar: () => pintar()
  });
  function mostrarError(error) {
    diaHTML.textContent=gestionErrorLectura(error);
    const boton=document.createElement('button');
    boton.type='button';boton.className='alm-btn-secondary px-3 py-2';boton.textContent='Reintentar consulta';
    boton.onclick=()=>{if(contenedor.isConnected)pintar();};diaHTML.append(boton);
  }
  async function pintar() {
    const version = ++secuencia;
    const fecha = calendario.dia;
    const mes = fecha.slice(0, 7);
    const hoy = calendarioFechaCivilLocal();
    if (!contenedor.isConnected) return;
    try { servicio.comprobar(contexto); }
    catch (error) {
      cache.clear(); cacheHasta.clear(); cacheAsignaciones.clear(); datosAsignaciones.clear(); asignacionesHasta.clear(); calendario.pintar([], hoy, hoy);
      mostrarError(error); return;
    }
    if (servicio.habilitada === false) {
      calendario.pintar([], hoy, hoy);
      diaHTML.textContent = servicio.avisoBackend;
      return;
    }
    if(cache.has(mes)&&(cacheHasta.get(mes)||0)<=Date.now()){cache.delete(mes);cacheHasta.delete(mes);}
    if (!cache.has(mes)) {
      calendario.pintar([], hoy, hoy);
      diaHTML.textContent = 'Cargando tareas…';
      cacheHasta.set(mes,Infinity);
      const lectura=servicio.todas('TAREAS',servicio.mes(fecha)).then(filas=>{
        if(cache.get(mes)===lectura)cacheHasta.set(mes,Date.now()+15000);
        return filas;
      }).catch(error=>{if(cache.get(mes)===lectura){cache.delete(mes);cacheHasta.delete(mes);}throw error;});
      cache.set(mes,lectura);
    }
    try {
      const datos = await cache.get(mes);
      servicio.comprobar(contexto);
      if (!contenedor.isConnected || version !== secuencia) return;
      const filas = [...new Map(datos.filter(t => !equipos || equipos.has(t.equipo_id))
        .map(t => [t.id, t])).values()];
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      calendario.pintar(filas, hoy, calendarioFechaCivilLocal(manana));
      const visibles = filas.filter(t => t.fecha_limite === fecha);
      const pintarDia = () => {
        diaHTML.innerHTML = visibles.map((t, i) => gestionTareaResumen(t, {
          accion: alAbrir ? gestionBoton('Ver tarea', 'data-gestion-cal="' + i + '"') : '',
          detallado: true, asignaciones: datosAsignaciones.has(t.id)?datosAsignaciones.get(t.id):servicio.asignacionesDisponibles?.(t.id)
        })).join('') || '<p class="alm-muted">Sin tareas para esta fecha.</p>';
        diaHTML.querySelectorAll('[data-gestion-cal]').forEach(b => {
          b.onclick = () => {
            if (!contenedor.isConnected || version !== secuencia) return;
            try { servicio.comprobar(contexto); }
            catch (_) { pintar(); return; }
            alAbrir(visibles[Number(b.dataset.gestionCal)]);
          };
        });
      };
      pintarDia();
      if (detallado && visibles.length) {
        await Promise.all(visibles.map(t => {
          if(cacheAsignaciones.has(t.id)&&(asignacionesHasta.get(t.id)||0)<=Date.now()){
            cacheAsignaciones.delete(t.id);datosAsignaciones.delete(t.id);asignacionesHasta.delete(t.id);
          }
          if (!cacheAsignaciones.has(t.id)) {
            asignacionesHasta.set(t.id,Infinity);
            const lectura = servicio.todas('ASIGNACIONES', { p_tarea_id: t.id }).then(rows => {
              servicio.comprobar(contexto);
              if (!Array.isArray(rows) || rows.some(a => !a || typeof a.id!=='string' || a.tarea_id!==t.id || typeof a.trabajador_nombre!=='string'))
                throw Error('Asignaciones no verificables.');
              if (cacheAsignaciones.get(t.id)===lectura){
                datosAsignaciones.set(t.id,[...new Map(rows.filter(a=>!a.retirada_en).map(a=>[a.id,a])).values()]);
                asignacionesHasta.set(t.id,Date.now()+15000);
              }
            }).catch(() => {
              if (cacheAsignaciones.get(t.id)===lectura){datosAsignaciones.set(t.id,null);asignacionesHasta.set(t.id,0);}
            });
            cacheAsignaciones.set(t.id,lectura);
          }
          return cacheAsignaciones.get(t.id);
        }));
        servicio.comprobar(contexto);
        if (!contenedor.isConnected || version!==secuencia) return;
        pintarDia();
      }
      gestionCompletarHistoricos(datos,()=>contenedor.isConnected&&version===secuencia,
        enriquecidas=>{cache.set(mes,Promise.resolve(enriquecidas));pintar();});
    } catch (error) {
      if (contenedor.isConnected && version === secuencia) {
        calendario.pintar([], hoy, hoy);
        mostrarError(error);
      }
    }
  }
  const interfaz = {
    pintar,
    actualizar(tarea) {
      cacheAsignaciones.delete(tarea.id); datosAsignaciones.delete(tarea.id);
      for (const [mes, datos] of cache) {
        cacheHasta.set(mes,Math.min(cacheHasta.get(mes)||0,Date.now()+15000));
        cache.set(mes, datos.then(filas => gestionAplicarTarea(
          filas, tarea, !tarea.retirada_en && tarea.fecha_limite?.slice(0, 7) === mes
        )).catch(error => {
          cache.delete(mes);
          throw error;
        }));
        // Una consulta pendiente de un mes oculto puede fallar antes de volver a abrirlo.
        cache.get(mes).catch(() => {});
      }
      if (!contenedor.hidden && contenedor.isConnected) pintar();
    }
  };
  contenedor.setAttribute('data-gestion-cal-activo', '');
  gestionCalendariosActivos.set(contenedor, interfaz);
  pintar();
  return interfaz;
}

function gestionError(error) {
  if (error?.code?.startsWith('GESTION_')) return gestionErrorLectura(error);
  if (error?.code === '40001') return 'La tarea cambió. Vuelve a consultarla antes de guardar.';
  if (error?.code === '42501') return 'Tu sesión no tiene permiso para esta operación.';
  if (error?.code === '55P03') return 'La tarea está ocupada. Reintenta la misma operación.';
  if (error?.code === 'PGRST202') return 'Gestión de tareas no está disponible en este momento.';
  if (/TAREA|TRABAJADOR/i.test(error?.message || '') && error?.code) {
    return 'No se pudo completar la operación. Comprueba la revisión, la máquina o los responsables.';
  }
  return error?.code || error instanceof TypeError ? 'No se pudo confirmar la operación. Revisa la conexión.'
    : error?.message || 'No se pudo completar la operación.';
}

function gestionErrorLectura(error) {
  if(['GESTION_RESPUESTA_INCOMPLETA','GESTION_LISTA_DATOS'].includes(error?.code))return 'La respuesta de tareas está incompleta. Vuelve a consultar.';
  if(error?.code==='GESTION_LISTA_CURSOR')return 'La consulta no permite avanzar de página. Vuelve a cargar las tareas.';
  if(error?.code==='GESTION_CONTEXTO_CAMBIO')return 'Cambió tu sesión o tu acceso. Vuelve a abrir Gestión de Tareas.';
  if(error?.code==='GESTION_SESION_NO_DISPONIBLE')return 'Tu sesión no está disponible o se está verificando. Comprueba tu acceso y vuelve a intentarlo.';
  if(error?.code==='GESTION_LECTURA_INVALIDADA')return 'La información cambió durante la consulta. Vuelve a cargar las tareas.';
  if(['PGRST301','PGRST302','PGRST303'].includes(error?.code)||error?.status===401)return 'Tu sesión no es válida. Vuelve a iniciar sesión.';
  if (error?.code === '42501' || error?.code === 'PGRST202') return gestionError(error);
  return 'No se pudieron cargar las tareas. Comprueba la conexión y vuelve a intentarlo.';
}

function renderGestionTareas() {
  const admin = esAdminOperativoActual();
  return `<section id="tareas-pendientes" class="alm-ui alm-main-page alm-module-page space-y-4 max-w-7xl mx-auto pb-10">
    ${uiEncabezadoSeccion('Gestión de Tareas',
      admin ? 'Trabajos pendientes y finalizados del hotel.' : 'Mi trabajo', 'clipboard',
      admin ? gestionBoton('+ Nueva tarea', 'data-gestion-nueva', true) : '')}
    <div class="flex flex-wrap gap-2" aria-label="Estado de las tareas">
      ${gestionBoton('Calendario', 'data-gestion-filtro="calendario"')}
      ${gestionBoton('Vencidas', 'data-gestion-filtro="vencida"')}
      ${gestionBoton('Pendientes', 'data-gestion-filtro="pendiente"')}
      ${gestionBoton('Completadas', 'data-gestion-filtro="completada"')}
    </div>
    <div data-gestion-estado role="status"></div>
    ${gestionBoton('Reintentar operación pendiente', 'data-gestion-reintentar hidden')}
    <div data-gestion-lista class="space-y-2"></div>
    <div data-gestion-calendario class="space-y-3" hidden></div>
    <dialog class="alm-panel alm-tarea-dialog gestion-tarea-dialog p-5" aria-labelledby="gestion-tarea-titulo">
      <form class="space-y-4">
        <div class="gestion-modal-titulo"><div data-gestion-estado-cabecera hidden></div><div class="gestion-modal-titulo-fila"><h2 id="gestion-tarea-titulo" class="alm-title"></h2><div class="gestion-modal-controles"><div data-gestion-acciones-tarea-cabecera class="gestion-acciones-globales" role="group" aria-label="Acciones globales de la tarea" hidden></div><button type="button" data-gestion-cerrar-superior class="gestion-modal-cerrar-superior" aria-label="Cerrar detalle de tarea" hidden>${gestionIconoDetalle('cerrar')}</button></div></div></div>
        <div data-gestion-campos class="space-y-3"></div>
        <p data-gestion-error role="status"></p>
        <div class="gestion-detalle-pie flex flex-wrap gap-2">
          ${gestionBoton('Cerrar', 'data-gestion-cerrar')}
          <button type="submit" class="alm-btn-primary px-4 py-2" hidden>Guardar</button>
        </div>
      </form>
    </dialog>
  </section>`;
}

// Conserva los nodos originales: pestaña, formularios, scroll y cursores de lectura.
function gestionSuspenderFicha(modal, form, campos, aviso) {
  if (modal.gestionRetorno || !campos.querySelector('[data-gestion-detalle]')) return;
  const titulo=form.querySelector('h2'), insignia=form.querySelector('[data-gestion-estado-cabecera]');
  const acciones=form.querySelector('[data-gestion-acciones-tarea-cabecera]');
  const nodos=[...campos.childNodes], botones=acciones?[...acciones.childNodes]:[];
  const texto=titulo.textContent, estado=insignia?.innerHTML, scroll=modal.scrollTop;
  const online=modal.gestionDetalleOnline, reactivar=modal.gestionReactivarDetalle;
  nodos.forEach(n=>n.remove());botones.forEach(n=>n.remove());
  modal.gestionRetorno={actualizar:false, restaurar(version){
    campos.replaceChildren(...nodos);titulo.textContent=texto;
    if(insignia){insignia.innerHTML=estado;insignia.hidden=false;}
    if(acciones){acciones.replaceChildren(...botones);acciones.hidden=!botones.length;}
    modal.classList.add('gestion-detalle-tabs');
    const superior=form.querySelector('[data-gestion-cerrar-superior]');if(superior)superior.hidden=false;
    form.oninput=null;aviso.textContent='';modal.scrollTop=scroll;
    reactivar?.(version);modal.gestionActualizarFecha?.();return online;
  }};
}

function iniciarGestionTareas(raiz = document.getElementById('tareas-pendientes')) {
  const servicio = window.GestionTareas;
  const contexto = servicio.contexto();
  const admin = contexto.admin;
  const backendDisponible = servicio.habilitada !== false;
  const entrada = gestionEntrada?.actor === contexto.id ? gestionEntrada : null;
  gestionEntrada = null;
  const lista = raiz.querySelector('[data-gestion-lista]');
  const panelCalendario = raiz.querySelector('[data-gestion-calendario]');
  const estado = raiz.querySelector('[data-gestion-estado]');
  const reintentar = raiz.querySelector('[data-gestion-reintentar]');
  const modal = raiz.querySelector('dialog');
  const form = modal.querySelector('form');
  const campos = form.querySelector('[data-gestion-campos]');
  const aviso = form.querySelector('[data-gestion-error]');
  const guardar = form.querySelector('[type=submit]');
  let tareas = [], filtro = 'calendario', completadasVisibles = 10, calendario;
  let estadoLista = backendDisponible ? 'cargando' : 'bloqueado', destacada = null;
  let hayMasLista=true,cursorLista,cargandoLista=false,ultimoListadoMas=false,recuperarHistorialOnline=null;const cursoresLista=new Set();
  let accion, ocupada = false, versionDetalle = 0, versionLista = 0, seleccion = null, edicion = false;
  let catalogo;
  const sigue = () => {
    if (!raiz.isConnected) return false;
    try { servicio.comprobar(contexto); return true; } catch(error) {
      if(error?.code==='GESTION_CONTEXTO_CAMBIO'){
        modal.gestionRetorno=null;modal.gestionReactivarDetalle=null;modal.gestionDetalleOnline=null;
        tareas=[];lista.textContent='';panelCalendario.textContent='';campos.textContent='';accion=null;guardar.hidden=true;gestionLimpiarAccionesCabecera(modal);
      }
      estado.textContent=gestionErrorLectura(error);aviso.textContent=estado.textContent;
      return false;
    }
  };
  const ejecutar = (fn, salida = aviso) => Promise.resolve().then(fn).catch(error => {
    if (raiz.isConnected) (modal.open ? aviso : salida).textContent = gestionError(error);
  });

  function pintarLista() {
    sincronizarReintento();
    const hoy=gestionHoyChile(),totales=gestionContadoresTareas(tareas,estadoLista==='listo'&&!hayMasLista,hoy);
    lista.hidden = filtro === 'calendario';
    panelCalendario.hidden = filtro !== 'calendario';
    raiz.querySelectorAll('[data-gestion-filtro]').forEach(b => {
      const activo = b.dataset.gestionFiltro === filtro;
      b.setAttribute('aria-pressed', String(activo));
      const tipo = b.dataset.gestionFiltro;
      if (tipo !== 'calendario') {
        const etiqueta = tipo==='vencida'?'Vencidas':tipo==='pendiente'?'Pendientes':'Completadas';
        b.textContent=etiqueta+' ('+(totales?totales[tipo]:'—')+')';
        b.title=totales?'Total de la consulta autorizada completada':'Total no disponible: consulta incompleta o con error. No representa cero.';
      }
      b.classList.toggle('alm-btn-primary', activo);
      b.classList.toggle('alm-btn-secondary', !activo);
    });
    if (filtro === 'calendario') {
      if (calendario) calendario.pintar();
      else calendario = gestionCalendario(panelCalendario, t => ejecutar(() => detalle(t.id), estado), null, { detallado: true });
      return;
    }
    const ordenadas = gestionOrdenarTareas(tareas, filtro,hoy);
    const indiceDestacada = ordenadas.findIndex(t => t.id === destacada);
    if (indiceDestacada > 0) ordenadas.unshift(ordenadas.splice(indiceDestacada, 1)[0]);
    const visibles = filtro === 'completada' ? ordenadas.slice(0, completadasVisibles) : ordenadas;
    lista.innerHTML = visibles.map((t, i) => gestionTareaResumen(t, {
      accion: gestionBoton('Ver tarea', 'data-gestion-tarea="' + i + '"'),
      detallado:true, asignaciones:servicio.asignacionesDisponibles?.(t.id)
    })).join('')
      || (estadoLista === 'listo' ? (hayMasLista?'<p class="alm-muted">No hay tareas de esta categoría entre las cargadas. Quedan páginas por consultar.</p>':'<p class="alm-muted">Sin tareas en esta vista.</p>') : '');
    if (estadoLista === 'error') mostrarReintentoLectura();
    if (visibles.length < ordenadas.length) lista.insertAdjacentHTML('beforeend',
      gestionBoton('Ver anteriores', 'data-gestion-anteriores'));
    lista.querySelectorAll('[data-gestion-tarea]').forEach(b => {
      b.onclick = () => ejecutar(() => detalle(visibles[Number(b.dataset.gestionTarea)].id), estado);
    });
    if(hayMasLista){
      lista.insertAdjacentHTML('beforeend','<p class="alm-muted text-xs">Los totales no están disponibles mientras queden páginas por consultar.</p>'+gestionBoton('Cargar más tareas','data-gestion-mas '+(cargandoLista?'disabled':'')));
      lista.querySelector('[data-gestion-mas]').onclick=()=>cargar(true);
    }
    const anteriores = lista.querySelector('[data-gestion-anteriores]');
    if (anteriores) anteriores.onclick = () => { completadasVisibles += 10; pintarLista(); };
  }

  function mostrarReintentoLectura() {
    if (estado.querySelector('[data-gestion-reintentar-carga]')) return;
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'alm-btn-secondary px-3 py-2';
    boton.dataset.gestionReintentarCarga = '';
    boton.textContent = 'Reintentar carga';
    boton.onclick = () => cargar(ultimoListadoMas);
    estado.append(' ', boton);
  }

  async function cargar(mas=false) {
    if(cargandoLista||!sigue())return;
    if(!backendDisponible){estado.textContent=servicio.avisoBackend;pintarLista();return;}
    const version=++versionLista;ultimoListadoMas=mas;cargandoLista=true;
    if(!mas){tareas=[];cursorLista=undefined;hayMasLista=true;cursoresLista.clear();}
    estadoLista='cargando';
    if(mas)estado.textContent='Consultando más tareas…';else estado.innerHTML=uiCargandoHTML();
    pintarLista();
    try {
      const lectura=await servicio.pagina('TAREAS',{p_limite:10,...(mas&&cursorLista?{p_cursor_id:cursorLista}:{})});
      if(!sigue()||version!==versionLista)return;
      tareas=gestionPaginaLista(tareas,lectura,cursorLista,cursoresLista);
      hayMasLista=lectura.hay_mas;cursorLista=lectura.siguiente_cursor;if(hayMasLista)cursoresLista.add(cursorLista);
      estadoLista='listo';estado.textContent=hayMasLista?'Totales no disponibles: quedan páginas por consultar.':gestionContadoresTareas(tareas,true)?'':'No se pueden verificar los totales: hay tareas con datos incompletos.';
      pintarLista();
      gestionCompletarHistoricos(lectura,()=>sigue()&&version===versionLista,enriquecida=>{
        const mapa=new Map(enriquecida.items.map(t=>[t.id,t]));tareas=tareas.map(t=>mapa.get(t.id)||t);pintarLista();
      });
    }catch(error){if(sigue()&&version===versionLista){estadoLista='error';estado.textContent=gestionErrorLectura(error);pintarLista();mostrarReintentoLectura();}}
    finally{cargandoLista=false;if(raiz.isConnected&&version===versionLista){const mas=lista.querySelector('[data-gestion-mas]');if(mas)mas.disabled=false;}}
  }

  function abrir(titulo, contenido, fn, texto = 'Guardar', tarea = null) {
    gestionSuspenderFicha(modal, form, campos, aviso);
    form.querySelector('h2').textContent = titulo;
    recuperarHistorialOnline=null;
    gestionLimpiarAccionesCabecera(form);
    campos.innerHTML = contenido;
    const esDetalle=contenido.includes('data-gestion-detalle');
    modal.classList.toggle('gestion-detalle-tabs',esDetalle);
    const insignia=form.querySelector('[data-gestion-estado-cabecera]');
    const visual=tarea?gestionFechaContexto(tarea):null;
    if(insignia){insignia.hidden=!esDetalle||!tarea;insignia.innerHTML=tarea?`<span class="gestion-estado-insignia gestion-fecha-${visual.clase}">${gestionEsc(visual.estado)}</span>`:'';}
    const superior=form.querySelector('[data-gestion-cerrar-superior]');if(superior)superior.hidden=!esDetalle;
    aviso.textContent = fn && !backendDisponible ? servicio.avisoBackend : '';
    accion = fn;
    edicion = false;
    form.oninput = null;
    guardar.disabled = ocupada || !backendDisponible;
    guardar.textContent = texto;
    guardar.hidden = !fn;
    if (!modal.open) modal.showModal();
  }

  function opciones(filas, valor) {
    return filas.map(t => `<option value="${gestionEsc(t.id)}" ${t.id === valor ? 'selected' : ''}>${gestionEsc(t.nombre)}${t.cargo ? ' · ' + gestionEsc(t.cargo) : ''}</option>`).join('');
  }

  async function trabajadores() {
    catalogo ||= window.TrabajadoresService.getTrabajadores(true)
      .then(filas => filas.filter(w => w.estado === 'Activo')).catch(error => { catalogo = null; throw error; });
    return catalogo;
  }

  async function formulario(t = null, equipo = null) {
    const version = ++versionDetalle;
    seleccion = t?.id ?? null;
    abrir(t ? 'Editar tarea' : 'Nueva tarea', '<p>Cargando formulario…</p>');
    let personal = t ? [] : await trabajadores();
    if (!sigue() || version !== versionDetalle) return;
    const campoEquipo = t?.equipo_id ?? equipo?.id ?? null;
    let equiposEdicion=null;
    if(t&&admin&&window.MantencionesService?.getElementosMaquinas){
      try {equiposEdicion=await window.MantencionesService.getElementosMaquinas();if(!Array.isArray(equiposEdicion))equiposEdicion=null;}
      catch {equiposEdicion=null;}
      if(!sigue()||version!==versionDetalle)return;
    }
    abrir(t ? 'Editar tarea' : 'Nueva tarea', `
      <label class="block">Título<input class="block w-full mt-1" name="titulo" required maxlength="160" value="${gestionEsc(t?.titulo)}"></label>
      <label class="block">Descripción<textarea class="block w-full mt-1" name="descripcion" rows="3" maxlength="2000">${gestionEsc(t?.descripcion)}</textarea></label>
      <label class="block">Fecha límite (obligatoria)<input class="block w-full mt-1" name="fecha" type="date" required value="${gestionEsc(t?.fecha_limite)}"></label>
      ${t&&equiposEdicion?`<label class="block">Máquina<select name="equipo" class="block w-full mt-1"><option value="">Sin máquina vinculada</option>${campoEquipo&&!equiposEdicion.some(e=>e.id===campoEquipo)?`<option value="${gestionEsc(campoEquipo)}" selected>Máquina vinculada actual</option>`:''}${equiposEdicion.map(e=>`<option value="${gestionEsc(e.id)}" ${e.id===campoEquipo?'selected':''}>${gestionEsc(e.nombre_original)}</option>`).join('')}</select></label>`:campoEquipo?`<p class="alm-muted">Máquina vinculada${equipo?.nombre?': '+gestionEsc(equipo.nombre):''}</p>`:''}
      ${t&&!equiposEdicion?'<p class="alm-muted text-xs">Catálogo de máquinas no disponible; se conservará el vínculo actual.</p>':''}
      ${t ? '' : `<fieldset class="space-y-2">
        <legend>Responsables (obligatorio)</legend>
        <div data-gestion-responsables class="space-y-2"></div>
        <div class="flex justify-end">${gestionBoton('+', 'data-gestion-agregar disabled title="Agregar trabajador" aria-label="Agregar trabajador"')}</div>
        <p data-gestion-sin-personal role="status" class="alm-muted" ${personal.length ? 'hidden' : ''}>No hay fichas activas. Puedes registrar un trabajador.</p>
      </fieldset>`}
      <p data-gestion-vencida hidden class="tarea-pendiente-vencida">La fecha límite ya pasó. Confirma si quieres guardar de todas formas.</p>`,
      () => {
        const fecha = form.elements.fecha.value;
        const datos = {
          p_titulo: form.elements.titulo.value.trim(), p_descripcion: form.elements.descripcion.value.trim() || null,
          p_fecha_limite: fecha, p_equipo_id: t&&equiposEdicion?(form.elements.equipo.value||null):campoEquipo
        };
        if(t&&equiposEdicion&&datos.p_equipo_id&&datos.p_equipo_id!==campoEquipo&&!equiposEdicion.some(e=>e.id===datos.p_equipo_id))throw Error('Selecciona una máquina del catálogo autorizado.');
        if (!datos.p_titulo || !fecha) throw Error('Completa el título y selecciona una fecha límite.');
        if (!t) {
          const ids = [...campos.querySelectorAll('[name=responsable]')].map(s => s.value).filter(Boolean);
          if (!ids.length || ids.some(id => !personal.some(w => w.id === id)) || new Set(ids).size !== ids.length) {
            throw Error('Selecciona al menos un responsable y evita duplicados.');
          }
          datos.p_trabajador_ids = ids;
        }
        const advertencia = campos.querySelector('[data-gestion-vencida]');
        if (fecha < calendarioFechaCivilLocal() && advertencia.dataset.confirmada !== fecha) {
          advertencia.dataset.confirmada = fecha;
          advertencia.hidden = false;
          guardar.textContent = 'Guardar de todas formas';
          return null;
        }
        return t ? mutar('editar', t, datos) : mutar('crear', null, datos);
      }, t ? 'Guardar cambios' : 'Guardar');
    if (t) {
      edicion = true;
      const cambio = () => form.elements.titulo.value.trim() !== t.titulo ||
        form.elements.descripcion.value.trim() !== (t.descripcion || '') ||
        form.elements.fecha.value !== t.fecha_limite ||
        Boolean(equiposEdicion&&(form.elements.equipo.value||null)!==campoEquipo);
      form.oninput = () => { guardar.hidden = !cambio(); guardar.disabled = !backendDisponible || ocupada || !cambio(); };
      form.oninput();
    }

    if (!t) {
      const filas = campos.querySelector('[data-gestion-responsables]');
      const sumar = campos.querySelector('[data-gestion-agregar]');
      const registrar = '__registrar_trabajador__';
      const opcionesResponsables = valor => '<option value="">Selecciona trabajador</option>' +
        opciones(personal, valor);
      function sincronizar() {
        const selects = [...filas.querySelectorAll('select')];
        const elegibles = new Set(personal.map(w => w.id));
        const elegidos = new Set(selects.map(s => s.value).filter(id => elegibles.has(id)));
        sumar.hidden = elegidos.size === elegibles.size;
        sumar.disabled = sumar.hidden || !selects.length || elegidos.size !== selects.length;
        for (const select of selects) for (const opt of select.options) {
          opt.disabled = Boolean(opt.value && opt.value !== registrar && selects.some(s => s !== select && s.value === opt.value));
        }
        campos.querySelector('[data-gestion-sin-personal]').hidden = personal.length > 0;
      }
      function agregar() {
        const fila = document.createElement('div');
        fila.className = 'flex items-center gap-2';
        fila.innerHTML = `<select class="min-w-0 flex-1" name="responsable" aria-label="Trabajador responsable">${opcionesResponsables()}</select>`;
        if (filas.childElementCount) {
          fila.insertAdjacentHTML('beforeend', gestionBoton('Quitar', 'data-gestion-quitar'));
          fila.querySelector('button').onclick = () => { fila.remove(); sincronizar(); };
        }
        const selector = fila.querySelector('select');
        let anterior = '';
        selector.onchange = () => {
          if (selector.value !== registrar) {
            anterior = selector.value;
            sincronizar();
            return;
          }
          selector.value = anterior;
          if (!sigue() || version !== versionDetalle || !modal.open || ocupada) return;
          modal.close();
          try {
            abrirTrabajadorFormulario('nuevo', null, {
              alCerrar() {
                if (sigue() && version === versionDetalle && !modal.open) {
                  modal.showModal();
                  selector.focus();
                }
              },
              async alGuardar(nuevo) {
                if (!nuevo?.id || nuevo.estado !== 'Activo') return;
                catalogo = null;
                if (!sigue() || version !== versionDetalle || !selector.isConnected) return;
                const actualizar = (filasActivas, seleccionar = false) => {
                  personal = [...new Map([...filasActivas, nuevo].map(w => [w.id, w])).values()];
                  for (const control of filas.querySelectorAll('select')) {
                    const valor = seleccionar && control === selector ? nuevo.id : control.value;
                    control.innerHTML = opcionesResponsables(valor);
                  }
                  anterior = selector.value;
                  sincronizar();
                };
                actualizar(personal, true);
                try {
                  const refrescado = await trabajadores();
                  if (sigue() && version === versionDetalle && selector.isConnected) {
                    actualizar(refrescado);
                  }
                } catch {
                  if (sigue() && version === versionDetalle)
                    aviso.textContent = 'Ficha registrada. No se pudo actualizar el resto del catálogo.';
                }
              }
            });
            const ficha = document.getElementById('modal-trabajador-form');
            if (ficha && !ficha.classList.contains('hidden')) {
              document.getElementById('tform-nombre')?.focus();
              return;
            }
          } catch (error) {
            aviso.textContent = gestionError(error);
          }
          if (sigue() && !modal.open) {
            modal.showModal();
            selector.focus();
          }
        };
        filas.append(fila);
        sincronizar();
      }
      agregar();
      sumar.onclick = () => { if (!sumar.disabled) agregar(); };

    }
  }

  function mutar(nombre, t, datos = {}) {
    return servicio.mutar(nombre, t
      ? { p_tarea_id: t.id, p_revision_esperada: t.revision, ...datos } : datos);
  }

  async function detalle(id, tareaConfirmada = null) {
    modal.gestionRetorno=null;
    campos.replaceChildren();
    seleccion = id;
    let version = ++versionDetalle;
    abrir('Ficha de tarea', '<p>Cargando ficha…</p>');
    const [lectura, asignaciones] = await Promise.all([
      tareaConfirmada ? { items: [tareaConfirmada] } : servicio.pagina('TAREAS', { p_tarea_id: id, p_limite: 1 }),
      servicio.todas('ASIGNACIONES', { p_tarea_id: id })
    ]);
    if (!sigue() || version !== versionDetalle) return;
    const t = lectura.items[0];
    if (!t) { abrir('Ficha de tarea', '<p>Tarea no disponible.</p>'); return; }
    const puedeCambiar = !t.retirada_en && t.estado === 'pendiente';
    const vigentes = asignaciones.filter(a => !a.retirada_en).length;
    const progreso=gestionProgresoResumen(asignaciones),fechaVisual=gestionFechaContexto(t);
    abrir(t.titulo, `<div data-gestion-detalle class="gestion-detalle-contenido">
      <header class="gestion-detalle-cabecera space-y-2">
        <p class="gestion-detalle-descripcion">${gestionEsc(t.descripcion)||'Sin descripción registrada.'}</p>
        ${t.retirada_en ? `<p>Retiro: ${gestionEsc(t.retirada_en)} · <span data-gestion-retiro-autor>${gestionEsc(window.UsuariosService?.nombreParaMostrar?.(t,'retirada_por_nombre_snapshot')??t.retirada_por_nombre_snapshot)}</span></p><p data-gestion-historicos-aviso class="alm-muted text-xs" role="status"></p>` : ''}

        <div class="gestion-progreso-bloque"><p class="gestion-progreso-etiqueta"><span>Progreso general</span><strong>${progreso.porcentaje===null?'No disponible':gestionEsc(progreso.porcentaje)+' %'}</strong></p>
        ${progreso.porcentaje===null?'':`<progress class="gestion-detalle-progreso" max="100" value="${progreso.porcentaje}" aria-label="Progreso general de responsables vigentes">${progreso.porcentaje} %</progress>`}
        <p class="alm-muted text-xs">${progreso.completados} de ${progreso.total} responsables completados</p></div>
        <div class="gestion-fecha-tarjeta">${gestionIconoDetalle('calendario')}<div><p class="gestion-fecha-etiqueta">Fecha límite</p><p class="gestion-fecha-valor">${gestionEsc(formatearFechaCL(t.fecha_limite,{civil:true,vacio:'No disponible',invalida:'No disponible'}))}</p></div><span class="gestion-fecha-contexto gestion-fecha-${fechaVisual.clase}">${gestionEsc(fechaVisual.texto)}</span></div>
      </header>
      <div class="trabajador-ficha-tabs gestion-detalle-pestanas" role="tablist" aria-label="Detalle de la tarea">
        ${[['responsables','Responsables'],['historial','Historial de actividad']].map(([tipo,nombre])=>`<button type="button" id="gestion-tab-${tipo}" role="tab" data-gestion-tab="${tipo}" aria-selected="${tipo==='responsables'}" aria-controls="gestion-panel-${tipo}" tabindex="${tipo==='responsables'?0:-1}">${gestionIconoDetalle(tipo==='responsables'?'usuarios':'historial')}<span>${nombre}</span></button>`).join('')}
      </div>
      <section id="gestion-panel-responsables" class="gestion-detalle-panel space-y-3" role="tabpanel" aria-labelledby="gestion-tab-responsables" data-gestion-panel="responsables">
        <div class="gestion-responsables-cabecera"><h3>Asignados</h3><div>${admin&&puedeCambiar?gestionBoton('+ Agregar responsable','data-gestion-asignar'):''}${admin&&!t.retirada_en&&t.estado==='completada'&&vigentes?gestionBoton('Reabrir tarea','data-gestion-reabrir'):''}</div></div>
      ${asignaciones.map((a, i) => a.retirada_en ? '' : `<article class="alm-panel gestion-responsable-tarjeta">
        <div class="gestion-responsable-fila"><span class="gestion-responsable-avatar" aria-hidden="true">${gestionEsc(gestionInicialesResponsable(window.UsuariosService?.nombreParaMostrar?.(a,'trabajador_nombre')??a.trabajador_nombre))}</span><div class="gestion-responsable-datos"><p class="alm-title gestion-responsable-titulo">${gestionEsc(window.UsuariosService?.nombreParaMostrar?.(a,'trabajador_nombre')??a.trabajador_nombre)}</p><p class="alm-muted gestion-responsable-avance">${typeof a.progreso==='number'&&Number.isFinite(a.progreso)&&a.progreso>=0&&a.progreso<=100?gestionEsc(a.progreso)+' % de avance':'Progreso no disponible'}</p></div><div class="gestion-responsable-estado-acciones"><span class="gestion-responsable-estado gestion-fecha-${a.estado==='completada'?'completada':a.estado==='en_proceso'?'proxima':'neutra'}">${gestionEsc(({pendiente:'Pendiente',en_proceso:'En proceso',completada:'Completada'})[a.estado]||'Estado no disponible')}</span>${gestionPuedeRetirarAsignacion(t,a,asignaciones,admin)?gestionBoton(gestionIconoDetalle('retirarUsuario')+'<span class="gestion-retirar-asignacion-texto">Retirar</span>','data-gestion-accion="RETIRAR" data-i="'+i+'" title="Retirar asignación" aria-label="Retirar asignación de '+gestionEsc(window.UsuariosService?.nombreParaMostrar?.(a,'trabajador_nombre')??a.trabajador_nombre??'este responsable')+'"').replace('alm-btn-secondary','alm-btn-secondary gestion-retirar-asignacion'):''}</div></div>
        ${!a.retirada_en&&puedeCambiar&&(admin||a.estado!=='completada') ? `<div class="gestion-responsable-acciones">
          ${puedeCambiar && a.estado !== 'completada' ? gestionBoton('Avanzar', 'data-gestion-accion="AVANCE" data-i="' + i + '"',true) : ''}
          ${puedeCambiar && a.estado !== 'completada' ? gestionBoton('Completar', 'data-gestion-accion="COMPLETAR" data-i="' + i + '"').replace('alm-btn-secondary', 'alm-btn-secondary alm-btn-completar') : ''}
          ${admin && puedeCambiar ? gestionBoton('Reasignar', 'data-gestion-accion="REASIGNAR" data-i="' + i + '"') : ''}
        </div>` : ''}
      </article>`).join('') || '<p>Sin responsables vigentes.</p>'}
        ${admin&&!t.retirada_en&&t.estado==='pendiente'?`<div data-gestion-globales-fuente hidden>
          ${admin&&!t.retirada_en&&t.estado==='pendiente'?gestionBoton(gestionIconoDetalle('editar')+'<span>Editar</span>','data-gestion-editar title="Editar tarea" aria-label="Editar tarea"'):''}
          ${admin&&!t.retirada_en&&t.estado==='pendiente'&&esAdminPermanenteActual()?gestionBoton(gestionIconoDetalle('retirar')+'<span>Retirar tarea</span>','data-gestion-retirar title="Retirar tarea del listado activo; conserva su historial" aria-label="Retirar tarea del listado activo, conservando su historial"').replace('alm-btn-secondary','alm-btn-secondary gestion-retirar-tarea'):''}
        </div>`:''}
      </section>
      <section id="gestion-panel-historial" class="gestion-detalle-panel space-y-3" role="tabpanel" aria-labelledby="gestion-tab-historial" data-gestion-panel="historial" tabindex="0" hidden>
        <h3 class="alm-title">Historial de actividad</h3>
        <div data-gestion-historial-lista class="space-y-2"></div><p data-gestion-historial-estado class="alm-muted text-xs" role="status" aria-live="polite"></p>
      </section>
    </div>`,null,'Guardar',t);
    const indicadorFecha=campos.querySelector('.gestion-fecha-contexto');
    modal.gestionActualizarFecha=()=>{
      if(!indicadorFecha?.isConnected||!sigue()||version!==versionDetalle)return;
      const fecha=gestionFechaContexto(t);
      indicadorFecha.textContent=fecha.texto;
      indicadorFecha.className='gestion-fecha-contexto gestion-fecha-'+fecha.clase;
    };
    const editar = campos.querySelector('[data-gestion-editar]');
    if (editar) editar.onclick = () => ejecutar(() => formulario(t));
    const asignar = campos.querySelector('[data-gestion-asignar]');
    if (asignar) asignar.onclick = () => ejecutar(() => accionDetalle(t, 'ASIGNAR', null, asignaciones));
    const reabrir=campos.querySelector('[data-gestion-reabrir]');
    if(reabrir)reabrir.onclick=()=>ejecutar(()=>{
      const opciones=asignaciones.filter(a=>!a.retirada_en);
      if(opciones.length===1)return accionDetalle(t,'REABRIR',opciones[0],asignaciones);
      abrir('Reabrir tarea',`<p>Selecciona el responsable cuyo avance se reiniciará al reabrir la tarea.</p><label class="block">Responsable<select name="reabrir_asignacion" required><option value="">Selecciona responsable</option>${opciones.map(a=>`<option value="${gestionEsc(a.id)}">${gestionEsc(a.trabajador_nombre)}</option>`).join('')}</select></label>`,()=>{
        const elegida=opciones.find(a=>a.id===form.elements.reabrir_asignacion.value);
        if(!elegida)throw Error('Selecciona una asignación vigente de esta tarea.');
        return mutar('ciclo',t,{p_accion:'REABRIR',p_asignacion_id:elegida.id});
      },'Reabrir tarea');
    });
    const retirar = campos.querySelector('[data-gestion-retirar]');
    if (retirar) retirar.onclick = () => abrir('Retirar tarea',
      '<p>¿Retirar esta tarea de los listados activos? Se conservará su historial.</p>',
      () => mutar('retirar', t), 'Retirar tarea');
    gestionSubirAccionesTarea(modal,campos);
    campos.querySelectorAll('[data-gestion-accion]').forEach(b => {
      b.onclick = () => ejecutar(() => accionDetalle(t, b.dataset.gestionAccion, asignaciones[Number(b.dataset.i)], asignaciones));
    });

    gestionCompletarHistoricos(lectura,()=>sigue()&&version===versionDetalle&&modal.open&&!edicion,datos=>{
      const actual=datos.items[0],autor=campos.querySelector('[data-gestion-retiro-autor]');
      if(autor&&actual)autor.textContent=window.UsuariosService?.nombreParaMostrar?.(actual,'retirada_por_nombre_snapshot')??actual.retirada_por_nombre_snapshot??'';
      const nota=campos.querySelector('[data-gestion-historicos-aviso]');
      if(nota)nota.textContent=actual?.lectura_historica?.estado==='NO_DISPONIBLE'?'Etiquetas históricas no disponibles; se muestran los nombres originales.':'';
    });
    const historial=campos.querySelector('[data-gestion-historial-lista]');
    const actividad=gestionMontarHistorial({servicio,id,panel:campos.querySelector('[data-gestion-panel="historial"]'),historial,
      estado:campos.querySelector('[data-gestion-historial-estado]'),vigente:()=>sigue()&&version===versionDetalle&&modal.open&&historial.isConnected});
    recuperarHistorialOnline=actividad.online;
    modal.gestionDetalleOnline=actividad.online;
    modal.gestionReactivarDetalle=nuevaVersion=>{version=nuevaVersion;};
    const tabs=[...campos.querySelectorAll('[data-gestion-tab]')];
    const cambiarPestana=(tipo, enfocar=false)=>{
      if(!sigue()||version!==versionDetalle||!modal.open||ocupada)return;
      for(const tab of tabs){
        const activa=tab.dataset.gestionTab===tipo;
        tab.setAttribute('aria-selected',String(activa));tab.tabIndex=activa?0:-1;
        if(activa&&enfocar)tab.focus();
      }
      campos.querySelectorAll('[data-gestion-panel]').forEach(panel=>{panel.hidden=panel.dataset.gestionPanel!==tipo;});
      if(tipo==='historial')actividad.abrir();
    };
    for(const tab of tabs){
      tab.onclick=()=>cambiarPestana(tab.dataset.gestionTab);
      tab.onkeydown=e=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
        e.preventDefault();const i=tabs.indexOf(tab);
        const destino=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
        cambiarPestana(tabs[destino].dataset.gestionTab,true);
      };
    }
  }

  async function accionDetalle(t, tipo, a, asignaciones) {
    const args = {
      p_accion: tipo, p_incorporar: null, p_retirar: null,
      p_asignacion_id: null, p_progreso: null
    };
    if (tipo === 'ASIGNAR' || tipo === 'REASIGNAR') {
      const version = ++versionDetalle;
      abrir(tipo === 'ASIGNAR' ? 'Agregar responsable' : 'Reasignar responsable', '<p>Cargando trabajadores…</p>');
      const personal = await trabajadores();
      if (!sigue() || version !== versionDetalle) return;
      const ocupados = new Set(asignaciones.filter(x => !x.retirada_en).map(x => x.trabajador_id));
      const elegibles = personal.filter(w => !ocupados.has(w.id));
      const titulo = tipo === 'ASIGNAR' ? 'Agregar responsable' : 'Reasignar responsable';
      if (!elegibles.length) {
        abrir(titulo, '<p>No hay trabajadores activos disponibles para asignar a esta tarea.</p>');
        return;
      }
      abrir(titulo,
        `<label class="block">Nuevo responsable<select name="responsable" required>
          <option value="">Selecciona trabajador</option>${opciones(elegibles)}</select></label>`,
        () => mutar('responsables', t, { ...args, p_incorporar: [form.elements.responsable.value],
          p_retirar: a ? [a.trabajador_id] : null }));
    } else if (tipo === 'COMPLETAR') {
      if (t.retirada_en || t.estado !== 'pendiente' || !a || a.retirada_en || a.estado === 'completada') {
        throw Error('Esta asignación ya no admite completar. Vuelve a consultar la tarea.');
      }
      abrir('Completar responsable',
        `<p>¿Confirmas completar el trabajo de <strong>${gestionEsc(a.trabajador_nombre)}</strong> en esta tarea?</p><p class="alm-muted">Su avance se registrará al 100 %. Cuando todos los responsables vigentes completen su trabajo, el sistema finalizará la tarea.</p>`,
        () => mutar('responsables', t, { ...args, p_accion: 'AVANCE', p_asignacion_id: a.id, p_progreso: 100 }), 'Completar');
    } else if (tipo === 'AVANCE') {
      if(t.retirada_en||t.estado!=='pendiente'||!a||a.retirada_en||a.estado==='completada'||typeof a.progreso!=='number'||!Number.isFinite(a.progreso)||a.progreso<0||a.progreso>=100)
        throw Error('La asignación no admite registrar avance. Vuelve a consultar la tarea.');
      const permitidos=[25,50,75,100].filter(n=>n!==a.progreso);
      abrir('Registrar avance',`<p>Avance actual: <strong>${gestionEsc(a.progreso)} %</strong></p><label class="block">Nuevo avance<select name="progreso" required><option value="">Selecciona un porcentaje</option>${[25,50,75,100].map(n=>`<option value="${n}" ${permitidos.includes(n)?'':'disabled'}>${n} %</option>`).join('')}</select></label>`,()=>{
        const elegido=Number(form.elements.progreso.value);
        if(!permitidos.includes(elegido))throw Error('Selecciona un avance disponible: 25 %, 50 %, 75 % o 100 %.');
        return mutar('responsables',t,{...args,p_asignacion_id:a.id,p_progreso:elegido});
      },'Registrar avance');
      form.oninput=()=>{guardar.disabled=ocupada||!backendDisponible||!permitidos.includes(Number(form.elements.progreso.value));};
      form.oninput();
    } else {
      if(tipo==='RETIRAR'&&!gestionPuedeRetirarAsignacion(t,a,asignaciones,admin))throw Error('No se puede retirar esta asignación ni dejar la tarea sin responsables vigentes.');
      const reabrir = tipo === 'REABRIR';
      abrir(reabrir ? 'Reabrir tarea' : 'Retirar asignación',
        reabrir ? '<p>¿Reabrir la tarea y reiniciar solo esta asignación a 0 %?</p>'
          : '<p>¿Retirar esta asignación? Su progreso y su historial se conservarán.</p>',
        () => mutar('ciclo', t, { p_accion: tipo, p_asignacion_id: a.id }),
        reabrir ? 'Reabrir' : 'Retirar asignación');
    }
  }

  async function guardarOperacion(fn) {
    if (ocupada || !sigue()) return;
    if (!backendDisponible) {
      (modal.open ? aviso : estado).textContent = servicio.avisoBackend;
      return;
    }
    ocupada = true;
    guardar.disabled = true;
    reintentar.disabled = true;
    const salida = modal.open ? aviso : estado;
    salida.textContent = 'Guardando…';
    try {
      const resultado = await fn();
      if (!sigue()) return;
      if (!resultado) { salida.textContent = ''; return; }
      if(modal.gestionRetorno)modal.gestionRetorno.actualizar=true;
      const creada = resultado.revision === 1;
      const conservarEdicion = edicion && seleccion && modal.open;
      const conservarFicha = seleccion && modal.open;
      if (creada) {
        if (modal.open) modal.close();
        filtro = 'pendiente';
        destacada = resultado.tarea_id;
      }
      try {
        const lectura = await servicio.pagina('TAREAS', { p_tarea_id: resultado.tarea_id, p_limite: 1 });
        if (!sigue()) return;
        const actual = lectura.items[0];
        if (!actual || actual.id !== resultado.tarea_id || actual.revision < resultado.revision) {
          throw Error('No se pudo volver a leer la tarea confirmada.');
        }
        if(creada)filtro=gestionCategoriaTarea(actual)||'pendiente';
        if (estadoLista === 'listo') tareas = gestionAplicarTarea(tareas, actual);
        else await cargar();
        if (!sigue()) return;
        gestionActualizarCalendarios(actual);
        pintarLista();
        if (estadoLista === 'listo') estado.textContent = creada ? 'Tarea creada.' : 'Operación guardada.';
        else {
          estado.prepend('La operación se guardó. ');
        }
        if (creada) lista.querySelector('[data-gestion-tarea="0"]')?.focus();
        if (conservarEdicion) await formulario(actual);
        else if (conservarFicha) await detalle(actual.id, actual);
      } catch (error) {
        if (!sigue()) return;
        estadoLista = 'error';
        estado.textContent = 'La operación se guardó. ' + gestionErrorLectura(error);
        if (modal.open) {
          aviso.textContent = estado.textContent;
          accion = null;
          guardar.hidden = true;
        }
        pintarLista();
        mostrarReintentoLectura();
      }
    } catch (error) {
      if (sigue()) {
        const mensaje = gestionError(error);
        (modal.open ? aviso : estado).textContent = servicio.tienePendiente()
          ? mensaje + ' Usa «Reintentar operación pendiente».' : mensaje;
        if (modal.open && servicio.tienePendiente()) {
          const anterior = campos.querySelector('[data-gestion-reintentar-modal]');
          if (!anterior) campos.insertAdjacentHTML('beforeend',
            gestionBoton('Reintentar operación pendiente', 'data-gestion-reintentar-modal'));
          campos.querySelector('[data-gestion-reintentar-modal]').onclick =
            () => guardarOperacion(() => servicio.reintentar());
        }
        if (error?.code === '40001' && seleccion) {
          const anterior = campos.querySelector('[data-gestion-recargar-ficha]');
          if (!anterior) campos.insertAdjacentHTML('beforeend',
            gestionBoton('Recargar ficha', 'data-gestion-recargar-ficha'));
          campos.querySelector('[data-gestion-recargar-ficha]').onclick =
            () => ejecutar(() => detalle(seleccion));
        }
      }
    } finally {
      ocupada = false;
      guardar.disabled = !backendDisponible;
      form.oninput?.();
      reintentar.disabled = false;
      sincronizarReintento();
    }
  }

  form.onsubmit = e => {
    e.preventDefault();
    if (accion && !guardar.disabled && form.reportValidity()) guardarOperacion(accion);
  };
  modal.addEventListener('cancel', e => e.preventDefault());
  const cerrarSuperior=form.querySelector('[data-gestion-cerrar-superior]');
  if(cerrarSuperior)cerrarSuperior.onclick=()=>form.querySelector('[data-gestion-cerrar]').onclick();
  form.querySelector('[data-gestion-cerrar]').onclick = () => {
    if (ocupada || !sigue()) return;
    const retorno=modal.gestionRetorno;
    if(retorno&&seleccion){
      modal.gestionRetorno=null;
      if(retorno.actualizar){ejecutar(()=>detalle(seleccion));return;}
      recuperarHistorialOnline=retorno.restaurar(++versionDetalle);
      accion=null;edicion=false;guardar.hidden=true;
      if(servicio.tienePendiente())aviso.textContent='Hay una operación pendiente de confirmar. Usa «Reintentar operación pendiente».';
      return;
    }
    versionDetalle++;seleccion=null;recuperarHistorialOnline=null;
    modal.gestionRetorno=null;modal.gestionReactivarDetalle=null;modal.gestionDetalleOnline=null;modal.close();
  };
  function sincronizarReintento() {
    const recuperable = servicio.tienePendiente();
    reintentar.hidden = !recuperable;
    if (!recuperable) campos.querySelector('[data-gestion-reintentar-modal]')?.remove();
  }
  sincronizarReintento();
  reintentar.onclick = () => guardarOperacion(() => servicio.reintentar());
  const nueva = raiz.querySelector('[data-gestion-nueva]');
  if (nueva) nueva.onclick = () => ejecutar(() => formulario());
  raiz.querySelectorAll('[data-gestion-filtro]').forEach(b => {
    b.onclick = () => { filtro = b.dataset.gestionFiltro; pintarLista(); };
  });
  cargar();
  if (admin && entrada?.equipo) ejecutar(() => formulario(null, entrada.equipo), aviso);
  if (entrada?.tarea) ejecutar(() => detalle(entrada.tarea), estado);
  gestionVigilarDia(raiz,()=>{if(!sigue())return false;pintarLista();modal.gestionActualizarFecha?.();return true;},()=>recuperarHistorialOnline?.());
}

function gestionTipoErrorHistoria(error) {
  if(error?.code==='GESTION_HISTORIAL_CURSOR')return 'CURSOR';
  if(error?.code?.startsWith('GESTION_HISTORIAL')||error?.code==='GESTION_RESPUESTA_INCOMPLETA')return 'CONTRATO';
  if(['42501','PGRST301','PGRST302','PGRST303','GESTION_CONTEXTO_CAMBIO','GESTION_SESION_NO_DISPONIBLE'].includes(error?.code)||error?.status===401||error?.status===403)return 'ACCESO';
  if(error?.code==='GESTION_LECTURA_INVALIDADA')return 'CAMBIO';
  if(['NETWORK_ERROR','FETCH_ERROR','ECONNRESET','ETIMEDOUT'].includes(error?.code)||error?.name==='TypeError'||error?.name==='AbortError'||error?.status>=500||/^(?:TypeError: )?(?:Failed to fetch|NetworkError(?: when attempting to fetch resource\.)?|Load failed)$/.test(error?.message||''))return 'RED';
  return 'CONTRATO';
}
function gestionMontarHistorial({servicio,id,panel,historial,estado,vigente}) {
  let cursor,iniciado=false,hayMas=false,pendiente=false,error=null,armado=false,ultimo=0,toque=null;
  const vistas=new Map(),cursores=new Set();
  async function consultar() {
    if(pendiente||!vigente())return;
    pendiente=true;iniciado=true;error=null;armado=false;estado.textContent='Consultando actividad…';
    try {
      const pagina=await servicio.pagina('HISTORIAL',{p_tarea_id:id,p_limite:10,...(cursor==null?{}:{p_cursor_revision:cursor})});
      if(!vigente())return;
      const control=gestionPaginaHistorial(pagina,cursor,vistas,cursores);
      historial.insertAdjacentHTML('beforeend',control.items.map(o=>`<article class="alm-panel gestion-historial-fila p-3"><p class="alm-title">${gestionEsc(gestionActividadEvento(o))}</p><p class="alm-muted">${gestionEsc(formatearFechaCL(o.registrada_en,{hora:true,vacio:'Sin fecha registrada'}))} · ${gestionEsc((window.UsuariosService?.nombreParaMostrar?.(o,'actor_nombre')??o.actor_nombre)||'Autor no disponible')}</p><p>${gestionEsc(gestionActividadDescripcion(o))}</p>${o.lectura_historica?.estado==='NO_DISPONIBLE'?'<p class="alm-muted text-xs" role="status">Se muestra el nombre original; etiqueta histórica no disponible.</p>':''}</article>`).join('')||(vistas.size?'':'<p>Sin historial visible.</p>'));
      for(const o of control.items)vistas.set(gestionRevisionClave(o.revision),o);
      if(control.hayMas)cursores.add(gestionRevisionClave(control.siguiente));
      cursor=control.siguiente;hayMas=control.hayMas;
      estado.textContent=hayMas?'Desplázate hacia abajo o utiliza AvPág para consultar más actividad.':'';
    } catch(e) {
      if(!vigente())return;
      error=gestionTipoErrorHistoria(e);
      estado.textContent=error==='RED'?'La consulta se interrumpió. Se conserva la actividad cargada. Puedes desplazarte o volver a esta pestaña para consultar de nuevo; también se intentará al recuperar la conexión.'
        :error==='ACCESO'?'No se pudo verificar tu sesión o permisos. Comprueba el acceso y vuelve a abrir la tarea.'
        :error==='CAMBIO'?'Los datos cambiaron durante la consulta. Vuelve a esta pestaña para consultar de nuevo.'
        :error==='CURSOR'?'La página siguiente no es verificable. Se conserva la actividad cargada; cierra y vuelve a abrir la tarea.'
        :'La respuesta del historial no es verificable. Se conserva la actividad cargada; cierra y vuelve a abrir la tarea.';
    } finally {pendiente=false;armado=false;}
  }
  const recuperable=()=>error&&!['CONTRATO','CURSOR'].includes(error);
  const mas=()=>{
    if(!armado||pendiente||panel.hidden||!vigente()||(!hayMas&&!recuperable())||['CONTRATO','CURSOR'].includes(error))return false;
    if(panel.scrollHeight-panel.clientHeight-panel.scrollTop>48)return false;
    armado=false;consultar();return true;
  };
  const armar=()=>{if(!pendiente)armado=true;};
  panel.onwheel=e=>{armar();if(e?.deltaY>0)mas();};
  panel.ontouchstart=e=>{toque=e.touches?.[0]?.clientY??null;};
  panel.ontouchmove=e=>{const y=e.touches?.[0]?.clientY??null;if(y!==null&&toque!==null&&y<toque){armar();mas();}toque=y;};
  panel.onpointerdown=armar;
  panel.onkeydown=e=>{if(['ArrowDown','PageDown','End',' '].includes(e.key)){armar();if(mas())e.preventDefault();}};
  panel.onscroll=()=>{const actual=panel.scrollTop;if(actual>ultimo)mas();ultimo=actual;};
  return {abrir:()=>{if(!iniciado||recuperable())return consultar();},online:()=>{if(error==='RED'&&!panel.hidden)return consultar();}};
}
function gestionRevisionClave(v) {
  if((typeof v==='number'&&!Number.isSafeInteger(v))||!['number','string'].includes(typeof v)||!/^\d+$/.test(String(v))||BigInt(v)<1n)
    throw Object.assign(Error('Respuesta de historial incompleta. Vuelve a consultar.'),{code:'GESTION_HISTORIAL_CONTRATO'});
  return BigInt(v).toString();
}
function gestionPaginaHistorial(pagina,cursor,vistas,cursores) {
  if(!Array.isArray(pagina?.items)||typeof pagina.hay_mas!=='boolean')throw Object.assign(Error('Respuesta de historial incompleta.'),{code:'GESTION_HISTORIAL_CONTRATO'});
  const comparar=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
  const paginaUnica=new Map();
  for(const o of pagina.items){
    if(!o||typeof o!=='object')throw Object.assign(Error('Respuesta de historial incompleta.'),{code:'GESTION_HISTORIAL_CONTRATO'});
    const clave=gestionRevisionClave(o.revision),previo=paginaUnica.get(clave)||vistas.get(clave);
    if(previo&&comparar(previo)!==comparar(o))throw Object.assign(Error('El historial cambió. Vuelve a abrir la tarea.'),{code:'GESTION_HISTORIAL_CONTRATO'});
    if(!vistas.has(clave)&&cursor!=null&&BigInt(clave)>=BigInt(gestionRevisionClave(cursor)))throw Object.assign(Error('Orden del historial no verificable.'),{code:'GESTION_HISTORIAL_CONTRATO'});
    paginaUnica.set(clave,o);
  }
  const items=[...paginaUnica.entries()].sort(([a],[b])=>BigInt(a)>BigInt(b)?-1:BigInt(a)<BigInt(b)?1:0);
  if(pagina.hay_mas){
    const siguiente=gestionRevisionClave(pagina.siguiente_cursor);
    if(!items.length||siguiente!==items.at(-1)[0]||cursores.has(siguiente)||(cursor!=null&&BigInt(siguiente)>=BigInt(gestionRevisionClave(cursor))))
      throw Object.assign(Error('No se pudo avanzar el historial. Reintenta la consulta.'),{code:'GESTION_HISTORIAL_CURSOR'});
  }
  return {items:items.filter(([k])=>!vistas.has(k)).map(([,o])=>o),siguiente:pagina.hay_mas?pagina.siguiente_cursor:null,hayMas:pagina.hay_mas};
}
function gestionAvanceRegistrado(o) {
  const valido=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
  if(valido(o.despues?.progreso))return o.despues.progreso;
  if(Array.isArray(o.antes?.asignaciones)&&Array.isArray(o.despues?.asignaciones)){
    const cambios=o.despues.asignaciones.filter(a=>a.id&&valido(a.progreso)&&o.antes.asignaciones.some(b=>b.id===a.id&&valido(b.progreso)&&b.progreso!==a.progreso));
    if(cambios.length===1)return cambios[0].progreso;
  }
  return null;
}
function gestionActividadEvento(o) {
  const avance=o.accion==='AVANCE'?gestionAvanceRegistrado(o):null;
  if(avance===100)return 'Responsable completado';
  if(avance!==null)return 'Avance registrado: '+avance+' %';
  if(o.accion==='ASIGNAR')return 'Responsable asignado';
  return ['CREAR','EDITAR','ASIGNAR','REASIGNAR','AVANCE','REABRIR','RETIRAR'].includes(o.accion)?gestionNombreOperacion(o):'Actividad registrada';
}
function gestionActividadDescripcion(o) {
  if(o.accion==='EDITAR'){
    const a=o.antes?.tarea,d=o.despues?.tarea;
    if(a&&d){const campos=[['titulo','título'],['descripcion','descripción'],['fecha_limite','fecha límite'],['equipo_id','máquina']].filter(([k])=>a[k]!==d[k]).map(([,nombre])=>nombre);if(campos.length)return 'Información actualizada: '+campos.join(', ')+'.';}
    return 'Edición registrada.';
  }
  if(o.accion==='CREAR')return 'Creación registrada.';
  if(o.accion==='REABRIR')return 'Reapertura registrada para la asignación seleccionada.';
  if(['ASIGNAR','REASIGNAR'].includes(o.accion))return 'Cambio de responsables registrado.';
  if(o.accion==='AVANCE')return 'Avance individual registrado.';
  if(o.accion==='RETIRAR')return 'Retiro registrado según el alcance autorizado.';
  return 'Actividad registrada en el historial.';
}
function gestionNombreOperacion(o) {
  const nombres={CREAR:'Tarea creada',EDITAR:'Tarea editada',ASIGNAR:'Responsable agregado',REASIGNAR:'Responsable reasignado',REABRIR:'Tarea reabierta'};
  if(nombres[o.accion])return nombres[o.accion];
  if(o.accion==='AVANCE'){
    if(o.despues?.progreso===100)return 'Responsable completado';
    const antes=o.antes?.asignaciones,despues=o.despues?.asignaciones;
    if(Array.isArray(antes)&&Array.isArray(despues)){
      const completada=despues.some(a=>a.id&&a.progreso===100&&antes.some(b=>b.id===a.id&&typeof b.progreso==='number'&&b.progreso<100));
      if(completada)return 'Responsable completado';
    }
    return 'Avance registrado';
  }
  if(o.accion==='RETIRAR'){
    if(o.despues?.tarea?.retirada_en&&!o.antes?.tarea?.retirada_en)return 'Tarea retirada';
    if(o.despues?.retirada_en&&!o.antes?.retirada_en&&o.despues?.trabajador_id)return 'Responsable retirado';
    if(Array.isArray(o.antes?.asignaciones)&&Array.isArray(o.despues?.asignaciones)&&o.despues.asignaciones.some(a=>a.id&&a.retirada_en&&o.antes.asignaciones.some(b=>b.id===a.id&&!b.retirada_en)))return 'Responsable retirado';
    return 'Retiro registrado';
  }
  return o.accion||'Operación registrada';
}
function gestionResumenOperacion(o, filas) {
  const nombres = new Map(filas.map(a => [a.trabajador_id, a.trabajador_nombre]));
  if (o.accion === 'EDITAR' && o.antes?.tarea && o.despues?.tarea) {
    const campos = [['titulo', 'Título'], ['descripcion', 'Descripción'],
      ['fecha_limite', 'Fecha límite'], ['equipo_id', 'Máquina']];
    return campos.filter(([id]) => o.antes.tarea[id] !== o.despues.tarea[id]).map(([id, nombre]) =>
      `<p class="break-words">${nombre}: ${gestionEsc(id==='fecha_limite' ? formatearFechaCL(o.antes.tarea[id],{vacio:'—'}) : o.antes.tarea[id] ?? '—')} → ${gestionEsc(id==='fecha_limite' ? formatearFechaCL(o.despues.tarea[id],{vacio:'—'}) : o.despues.tarea[id] ?? '—')}</p>`
    ).join('') || '<p>Sin cambios de contenido.</p>';
  }
  function asignaciones(snapshot) {
    return (snapshot?.asignaciones || []).map(a =>
      `${gestionEsc(a.trabajador_nombre || nombres.get(a.trabajador_id) || a.trabajador_id)} · ${gestionEsc(a.progreso)} %${a.retirada_en ? ' · Retirada' : ''}`).join('<br>');
  }
  const antes = asignaciones(o.antes);
  const despues = asignaciones(o.despues);
  const propio = o.despues?.progreso ?? o.antes?.progreso;
  return propio != null ? `<p>Progreso: ${gestionEsc(o.antes?.progreso ?? '—')} → ${gestionEsc(o.despues?.progreso ?? '—')} %</p>`
    : antes || despues ? `<details><summary>Ver avances registrados</summary>
      <p>Antes: ${antes || '—'}</p><p>Después: ${despues || '—'}</p></details>` : '';
}

function gestionIndicadorLaboral(a, hoy = calendarioFechaCivilLocal()) {
  if (a.tarea.retirada_en) return ['pendiente', 'Tarea retirada'];
  if (a.estado === 'completada') return ['completada', 'Completada'];
  if (!a.retirada_en && a.tarea.fecha_limite && a.tarea.fecha_limite < hoy) return ['vencida', 'Vencida'];
  return a.estado === 'en_proceso' ? ['en-proceso', 'En proceso'] : ['pendiente', 'Pendiente'];
}

function gestionFichaLaboral(contenedor, id, propia = false) {
  const servicio = window.GestionTareas;
  if (!servicio?.puede() || !esAdminOperativoActual()) return;
  const contexto = servicio.contexto();
  contenedor.insertAdjacentHTML('beforeend', `<section class="alm-panel p-4 space-y-2" data-gestion-laboral>
    <h3 class="alm-title">${propia ? 'Mis trabajos' : 'Trabajos asignados'}</h3>
    <details class="space-y-2">
      <summary>Historial de trabajos</summary>
      <p data-gestion-laboral-estado class="alm-muted text-sm" role="status"></p>
      <ul data-gestion-laboral-lista class="space-y-2"></ul>
      ${gestionBoton('Ver más', 'data-gestion-laboral-cargar hidden')}
    </details>
  </section>`);
  const panel = contenedor.lastElementChild;
  const detalle = panel.querySelector('details');
  const estado = panel.querySelector('[data-gestion-laboral-estado]');
  const lista = panel.querySelector('[data-gestion-laboral-lista]');
  const boton = panel.querySelector('button');
  let cursor, inicio = false, cargando = false;
  async function cargar() {
    if (cargando) return;
    if (servicio.habilitada === false) { estado.textContent = servicio.avisoBackend; return; }
    cargando = true;
    boton.disabled = true;
    estado.textContent = 'Cargando trabajos…';
    try {
      servicio.comprobar(contexto);
      const r = await servicio.historialLaboral(id, cursor);
      if (!panel.isConnected) return;
      lista.insertAdjacentHTML('beforeend', r.items.map(a => {
        const [tono, etiqueta] = gestionIndicadorLaboral(a);
        return `<li class="alm-panel p-3 min-w-0">
          <p class="alm-title break-words">${gestionEsc(a.tarea.titulo)}</p>
          <p class="alm-muted text-sm">${gestionEsc(a.tarea.fecha_limite ? formatDate(a.tarea.fecha_limite) : 'Sin fecha')}
          <span class="gestion-trabajo-estado gestion-trabajo-${tono}">${etiqueta}${a.retirada_en ? ' · Asignación retirada' : ''}</span></p>
          <p class="alm-muted text-sm">Avance individual: ${gestionEsc(a.progreso ?? 'Sin dato')}${a.progreso == null ? '' : ' %'}</p>
          ${a.tarea.retirada_en ? `<p class="alm-muted text-sm">Retiro de tarea: ${gestionEsc(a.tarea.retirada_en)}${(window.UsuariosService?.nombreParaMostrar?.(a.tarea,'retirada_por_nombre_snapshot') ?? a.tarea.retirada_por_nombre_snapshot) ? ` · ${gestionEsc((window.UsuariosService?.nombreParaMostrar?.(a.tarea,'retirada_por_nombre_snapshot') ?? a.tarea.retirada_por_nombre_snapshot))}` : ''}</p>` : ''}
        </li>`;
      }).join(''));
      estado.textContent = !inicio && !r.items.length ? 'Sin trabajos visibles.' : '';
      inicio = true;
      cursor = r.siguiente_cursor;
      boton.hidden = !r.hay_mas;
      boton.textContent = 'Ver más';
    } catch (error) {
      if (panel.isConnected) {
        estado.textContent = gestionErrorLectura(error);
        boton.hidden = false;
        boton.textContent = 'Reintentar carga';
      }
    } finally { cargando = false; boton.disabled = false; }
  }
  detalle.ontoggle = () => { if (detalle.open && !inicio) cargar(); };
  boton.onclick = cargar;
}

function gestionAbrirFicha(id) {
  if (!window.GestionTareas?.puede()) return;
  gestionEntrada = { actor: state.currentUser.id, tarea: id };
  navigateTo('tareas-pendientes');
  gestionEntrada = null;
}

function gestionMontarCalendario(contenedor, titulo, equipos = null, { abierto = false, enlaceGestion = false } = {}) {
  const servicio = window.GestionTareas;
  if (!servicio?.puede()) return;
  if (enlaceGestion && !hasAccess('tareas-pendientes', state.currentUser?.role)) return;
  if (abierto && contenedor.querySelector('[data-gestion-cal-host]')) return;
  contenedor.insertAdjacentHTML('beforeend', `<section class="alm-ui alm-panel p-4 space-y-3" data-gestion-cal-host>
    <div class="flex flex-wrap items-center justify-between gap-3"><h3 class="alm-title">${gestionEsc(titulo)}</h3>
    ${enlaceGestion ? gestionBoton('Gestión de tareas', 'data-gestion-ir', true) : ''}</div>
    ${abierto ? '' : gestionBoton('Consultar calendario', 'data-gestion-ver-cal')}
    <div class="space-y-3" data-gestion-cal-panel></div>
  </section>`);
  const seccion = contenedor.lastElementChild;
  const enlace = seccion.querySelector('[data-gestion-ir]');
  if (enlace) enlace.onclick = () => {
    if (seccion.isConnected && servicio.puede() && hasAccess('tareas-pendientes', state.currentUser?.role)) navigateTo('tareas-pendientes');
  };
  if (abierto) {
    gestionCalendario(seccion.querySelector('[data-gestion-cal-panel]'), tarea => gestionAbrirFicha(tarea.id), equipos);
    return;
  }
  const boton = seccion.querySelector('[data-gestion-ver-cal]');
  boton.onclick = () => {
    if (!servicio.puede()) return;
    boton.hidden = true;
    gestionCalendario(seccion.querySelector('[data-gestion-cal-panel]'), tarea => gestionAbrirFicha(tarea.id), equipos);
  };
}

async function gestionTareasDeMaquinas(ids) {
  const equipos = new Set(ids);
  if (!equipos.size) return [];
  const filas = await window.GestionTareas.todas('TAREAS');
  return [...new Map(filas.filter(t => equipos.has(t.equipo_id)).map(t => [t.id, t])).values()];
}

function gestionMontarFichaMaquina(panel, id) {
  if (!panel || !id || !window.GestionTareas?.puede()) return;
  panel.innerHTML = `<section class="alm-panel p-4 space-y-2">
    <h3 class="alm-title">Tareas de la máquina</h3>
    <div class="flex flex-wrap gap-2">
      ${esAdminOperativoActual() ? gestionBoton('Programar tarea', 'data-gestion-programar') : ''}
      ${gestionBoton('Consultar tareas', 'data-gestion-tareas-equipo')}
    </div>
    <div class="space-y-2" data-gestion-tareas-equipo-lista aria-live="polite"></div>
  </section>`;
  const programar = panel.querySelector('[data-gestion-programar]');
  if (programar) programar.onclick = () => gestionAbrirDesdeEquipo(id);
  const boton = panel.querySelector('[data-gestion-tareas-equipo]');
  const lista = panel.querySelector('[data-gestion-tareas-equipo-lista]');
  boton.onclick = async () => {
    boton.disabled = true;
    try {
      const filas = await window.GestionTareas.todas('TAREAS', { p_equipo_id: id });
      if (!panel.isConnected) return;
      lista.innerHTML = filas.map(gestionTareaResumen).join('') || '<p>Sin tareas visibles.</p>';
      boton.hidden = true;
    } catch (error) {
      if (panel.isConnected) lista.textContent = gestionError(error);
    } finally { boton.disabled = false; }
  };
}

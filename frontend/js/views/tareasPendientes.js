function renderTareasPendientesView() {
  return `<section id="tareas-pendientes" class="alm-ui alm-main-page alm-module-page space-y-4 max-w-7xl mx-auto pb-10">
    ${uiEncabezadoSeccion('Gestión de Tareas', 'Trabajos pendientes y finalizados del hotel.', 'clipboard',
      '<button type="button" data-nueva class="alm-btn-primary px-4 py-2">+ Nueva tarea</button>')}
    <div class="flex flex-wrap gap-2" aria-label="Estado de las tareas">
      <button type="button" data-filtro="pendiente" class="px-4 py-2">Pendientes</button>
      <button type="button" data-filtro="completada" class="px-4 py-2">Completadas</button>
      <button type="button" data-filtro="calendario" class="px-4 py-2">Calendario</button>
    </div>
    <p role="status" data-mensaje></p>
    ${calendarioMensualHTML({ oculto: true })}
    <div data-lista class="space-y-2"></div>
    ${tareasFormularioHTML()}
  </section>`;
}

function tareasFormularioHTML() {
  return `<dialog class="alm-panel alm-tarea-dialog p-5" aria-labelledby="tareas-pendientes-dialogo-titulo">
      <form class="space-y-4">
        <h2 id="tareas-pendientes-dialogo-titulo" class="alm-title"></h2>
        <p data-advertencia hidden>Esta tarea se eliminará definitivamente y no se podrá recuperar.</p>
        <p data-nombre hidden class="break-words"></p>
        <fieldset class="space-y-3">
          <label class="block">Título<input name="titulo" required maxlength="160" class="block w-full mt-1 rounded-xl px-3 py-2" style="background:var(--alm-inset);color:var(--alm-text);border:1px solid var(--alm-border)"></label>
          <label class="block">Descripción<textarea name="descripcion" rows="3" maxlength="2000" class="block w-full mt-1 rounded-xl px-3 py-2" style="background:var(--alm-inset);color:var(--alm-text);border:1px solid var(--alm-border)"></textarea></label>
          <label class="block">Fecha límite (obligatoria)<input name="fecha_limite" type="date" required class="block w-full mt-1 rounded-xl px-3 py-2" style="background:var(--alm-inset);color:var(--alm-text);border:1px solid var(--alm-border)"></label>
          <label class="block"><span data-equipo-etiqueta>Máquina (opcional)</span><select name="equipo_id" aria-describedby="tareas-equipo-aviso" class="block w-full mt-1 rounded-xl px-3 py-2" style="background:var(--alm-inset);color:var(--alm-text);border:1px solid var(--alm-border)"><option value="">Sin máquina</option></select></label>
          <p id="tareas-equipo-aviso" class="text-sm alm-muted" role="status" hidden></p>
        </fieldset>
        <p data-error role="status"></p>
        <div class="flex flex-wrap gap-2">
          <button type="button" data-cancelar class="alm-btn-secondary px-4 py-2">Cancelar</button>
          <button type="submit" class="alm-btn-primary px-4 py-2">Guardar</button>
        </div>
      </form>
      <section data-fecha-vencida hidden class="space-y-4">
        <h2 id="tareas-pendientes-fecha-titulo" class="alm-title">La fecha límite ya pasó</h2>
        <p data-fecha-mensaje></p>
        <div class="flex flex-wrap gap-2">
          <button type="button" data-volver-fecha class="alm-btn-secondary px-4 py-2">Volver a editar</button>
          <button type="button" data-confirmar-fecha class="alm-btn-primary px-4 py-2">Guardar de todas formas</button>
        </div>
      </section>
    </dialog>`;
}

function ordenarTareasPendientes(tareas, estado) {
  return tareas.filter(tarea => tarea.estado === estado).sort((a, b) => {
    const porFecha = estado === 'pendiente'
      ? Number(!a.fecha_limite) - Number(!b.fecha_limite) ||
        (a.fecha_limite || '').localeCompare(b.fecha_limite || '')
      : Date.parse(b.completada_en) - Date.parse(a.completada_en);
    return porFecha || Date.parse(b.creada_en) - Date.parse(a.creada_en) || a.id.localeCompare(b.id);
  });
}

function iniciarTareasPendientes(raiz = document.getElementById('tareas-pendientes'), contexto = null) {
  const servicio = window.TareasPendientesService;
  const lista = raiz.querySelector('[data-lista]');
  const calendario = raiz.querySelector('[data-calendario]');
  const calendarioMensual = contexto ? null : iniciarCalendarioMensual(calendario, {
    fechaRegistro: tarea => tarea.fecha_limite,
    etiquetaCantidad: cantidad => cantidad + (cantidad === 1 ? ' tarea pendiente' : ' tareas pendientes'),
    alSeleccionar: pintar
  });
  const mensaje = raiz.querySelector('[data-mensaje]');
  let errorLectura = false;
  const dialogo = raiz.querySelector('dialog');
  const formulario = dialogo.querySelector('form');
  const campos = formulario.querySelector('fieldset');
  const advertenciaFecha = dialogo.querySelector('[data-fecha-vencida]');
  const volverFecha = advertenciaFecha.querySelector('[data-volver-fecha]');
  const confirmarFecha = advertenciaFecha.querySelector('[data-confirmar-fecha]');
  const enviar = formulario.querySelector('[type="submit"]');
  const cancelar = formulario.querySelector('[data-cancelar]');
  const errorModal = formulario.querySelector('[data-error]');
  const selectorEquipo = formulario.elements.equipo_id;
  const equipoFijo = contexto?.equipo_id ?? null;
  const avisoEquipo = formulario.querySelector('#tareas-equipo-aviso');
  let equipos = null, cargandoEquipos = false;
  const actor = state.currentUser?.id;
  let tareas = [], filtro = 'pendiente', ocupada = false, cargando = false;
  let seleccion = null, borrando = false, guardadoPendiente = null;
  let edicionGuardada = false, confirmarDescarte = false;
  let limiteHistorial = 10;
  const formatoDia = new Intl.DateTimeFormat('es-CL', { dateStyle: 'full' });
  const fechaLocal = fecha => new Date(fecha + 'T12:00:00');
  const vigente = () => raiz.isConnected && actor === state.currentUser?.id && esAdminOperativoActual();
  const faltaFecha = 'Selecciona una fecha límite para continuar';
  const equipoInvalido = 'La máquina seleccionada no está disponible. Selecciona otra o deja la tarea sin máquina.';
  const errorVisible = error => !vigente() || error?.code === '42501'
    ? 'Tu permiso administrativo ya no está vigente.'
    : error?.code === '23502' && /\bfecha_limite\b/.test(error.message || '') ? faltaFecha
    : /equipo|m[aá]quina/i.test(error?.message || '') && ['P0001', '23503', '23514', '22023'].includes(error?.code) ? equipoInvalido
    : 'No se pudo confirmar la operación. Comprueba la conexión y vuelve a consultar.';

  function pintar() {
    if (contexto) return;
    for (const boton of raiz.querySelectorAll('[data-filtro]')) {
      const activo = boton.dataset.filtro === filtro;
      boton.classList.toggle('alm-btn-primary', activo);
      boton.classList.toggle('alm-btn-secondary', !activo);
      boton.setAttribute('aria-pressed', String(activo));
      const pendientes = boton.dataset.filtro === 'pendiente';
      const etiqueta = pendientes ? 'Pendientes' : boton.dataset.filtro === 'completada' ? 'Completadas' : 'Calendario';
      const cantidad = tareas.filter(t => t.estado === boton.dataset.filtro).length;
      boton.textContent = !vigente() || cargando || errorLectura || boton.dataset.filtro === 'calendario' ? etiqueta : etiqueta + ' (' + cantidad + ')';
    }
    lista.replaceChildren();
    const mostrar = vigente() && !cargando && !errorLectura;
    const esCalendario = filtro === 'calendario';
    calendario.hidden = !mostrar || !esCalendario;
    if (!mostrar) return;
    const completadas = filtro === 'completada';
    const ordenadas = ordenarTareasPendientes(tareas, completadas ? 'completada' : 'pendiente');
    const dia = calendarioMensual.dia;
    const visibles = completadas ? ordenadas.slice(0, limiteHistorial)
      : esCalendario ? ordenadas.filter(tarea => tarea.fecha_limite === dia) : ordenadas;
    const ahora = new Date();
    const hoy = calendarioFechaCivilLocal(ahora);
    ahora.setDate(ahora.getDate() + 1);
    const manana = calendarioFechaCivilLocal(ahora);
    if (esCalendario) {
      calendarioMensual.pintar(ordenadas, hoy, manana);
      const encabezado = document.createElement('h3');
      encabezado.className = 'alm-title';
      encabezado.textContent = formatDate(dia);
      lista.append(encabezado);
    }
    if (!visibles.length) {
      const vacio = document.createElement('p');
      vacio.className = 'alm-panel p-5 alm-muted';
      vacio.textContent = filtro === 'pendiente' ? 'No hay tareas pendientes.' : completadas ? 'Todavía no hay tareas completadas.' : 'No hay tareas pendientes para este día.';
      lista.append(vacio);
    }
    const grupoDe = tarea => !tarea.fecha_limite ? 'Sin fecha límite'
      : tarea.fecha_limite < hoy ? 'Atrasadas' : 'Con fecha límite';
    const cantidades = new Map();
    if (filtro === 'pendiente') {
      for (const tarea of visibles) {
        const grupo = grupoDe(tarea);
        cantidades.set(grupo, (cantidades.get(grupo) || 0) + 1);
      }
    }
    let grupoActual;
    let destino = lista;
    for (const tarea of visibles) {
      const fechaLimite = tarea.fecha_limite;
      const alerta = !completadas && fechaLimite && fechaLimite <= manana
        ? fechaLimite < hoy ? 'Vencida' : fechaLimite === hoy ? 'Vence hoy' : 'Vence mañana' : '';
      if (filtro === 'pendiente') {
        const grupo = grupoDe(tarea);
        if (grupo !== grupoActual) {
          const encabezado = document.createElement('h3');
          encabezado.className = 'text-sm font-bold alm-muted';
          encabezado.textContent = grupo + ' (' + cantidades.get(grupo) + ')';
          destino = document.createElement('section');
          destino.className = 'tareas-pendientes-grupo space-y-2';
          destino.append(encabezado);
          lista.append(destino);
          grupoActual = grupo;
        }
      }
      const tarjeta = document.createElement('article');
      tarjeta.className = 'alm-panel tarea-pendiente-fila';
      const contenido = document.createElement('div');
      contenido.className = 'min-w-0';
      const cabecera = document.createElement('div');
      cabecera.className = 'flex flex-wrap items-center gap-2';
      const titulo = document.createElement(filtro === 'pendiente' ? 'h4' : 'h3');
      titulo.className = 'font-bold break-words';
      titulo.textContent = tarea.titulo;
      cabecera.append(titulo);
      if (alerta) {
        const etiqueta = document.createElement('span');
        etiqueta.className = (alerta === 'Vencida' ? 'tarea-pendiente-vencida' : 'tarea-pendiente-proxima') + ' text-xs font-bold';
        const icono = document.createElement('span');
        icono.textContent = '⚠ ';
        icono.setAttribute('aria-hidden', 'true');
        etiqueta.textContent = alerta;
        etiqueta.prepend(icono);
        cabecera.append(etiqueta);
      }
      contenido.append(cabecera);
      if (tarea.descripcion) {
        const descripcion = document.createElement('p');
        descripcion.className = 'tarea-pendiente-descripcion text-sm whitespace-pre-wrap break-words';
        descripcion.textContent = tarea.descripcion;
        contenido.append(descripcion);
      }
      if ((fechaLimite && (alerta === 'Vencida' || !alerta)) || (!fechaLimite && !completadas)) {
        const fecha = document.createElement('p');
        fecha.className = 'text-sm alm-muted';
        if (!tarea.fecha_limite) fecha.textContent = 'Sin plazo definido';
        else fecha.textContent = 'Fecha límite: ' + formatDate(tarea.fecha_limite);
        contenido.append(fecha);
      }
      if (tarea.estado === 'completada' && tarea.completada_en) {
        const fecha = document.createElement('p');
        fecha.className = 'text-sm alm-muted';
        fecha.textContent = 'Finalizada el ' + formatearFechaCL(tarea.completada_en,{vacio:'Sin fecha registrada'});
        contenido.append(fecha);
      }
      const acciones = document.createElement('div');
      acciones.className = 'flex flex-wrap gap-2';
      function agregar(texto, clase, accion) {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = clase + ' px-3 py-2 text-sm';
        boton.textContent = texto;
        boton.disabled = ocupada;
        boton.onclick = accion;
        acciones.append(boton);
      }
      const pendiente = tarea.estado === 'pendiente';
      agregar(pendiente ? 'Completar' : 'Reabrir', 'alm-btn-primary', () =>
        operar(() => servicio.cambiarEstado(tarea.id, tarea.estado),
          pendiente ? 'Tarea completada.' : 'Tarea reabierta.'));
      agregar('Editar', 'alm-btn-secondary', () => abrir(tarea));
      if (esAdminPermanenteActual()) agregar('Eliminar', 'alm-btn-danger', () => abrir(tarea, true));
      tarjeta.append(contenido, acciones);
      destino.append(tarjeta);
    }
    if (completadas && limiteHistorial < ordenadas.length) {
      const anteriores = document.createElement('button');
      anteriores.type = 'button';
      anteriores.className = 'alm-btn-secondary px-4 py-2';
      anteriores.textContent = 'Ver anteriores';
      anteriores.onclick = () => {
        const primeraNueva = limiteHistorial;
        limiteHistorial += 10;
        pintar();
        const tarjeta = lista.children[primeraNueva];
        tarjeta.tabIndex = -1;
        tarjeta.focus();
      };
      lista.append(anteriores);
    }
  }

  async function cargar(aviso = '') {
    if (!vigente() || cargando) return;
    cargando = true;
    errorLectura = false;
    mensaje.textContent = 'Cargando tareas…';
    pintar();
    try {
      const datos = await servicio.listar();
      if (!vigente()) throw new Error('Sesión administrativa no vigente.');
      tareas = datos;
      mensaje.textContent = aviso;
    } catch (error) {
      if (!raiz.isConnected) return;
      tareas = [];
      errorLectura = true;
      mensaje.textContent = error?.code === '42501' || !vigente()
        ? 'Tu permiso administrativo ya no está vigente.'
        : 'No se pudieron cargar las tareas. Comprueba la conexión.';
      if (vigente()) {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'alm-btn-secondary px-3 py-2';
        boton.textContent = 'Reintentar carga';
        boton.onclick = () => cargar();
        mensaje.append(' ', boton);
      }
    } finally {
      cargando = false;
      pintar();
    }
  }

  function pintarSelectorEquipo(id) {
    if (equipoFijo && id === equipoFijo) {
      selectorEquipo.replaceChildren(new Option(contexto.equipoNombre || 'Máquina de esta ficha', equipoFijo));
      selectorEquipo.value = equipoFijo;
      selectorEquipo.disabled = true;
      avisoEquipo.hidden = false;
      avisoEquipo.textContent = 'La máquina viene fijada por la ficha.';
      return;
    }
    selectorEquipo.replaceChildren(new Option('Sin máquina', ''));
    for (const equipo of equipos || []) {
      const etiqueta = [equipo.nombre_original || 'Máquina', equipo.codigo,
        equipo.ubicacion?.nombre || equipo.ubicacion_original].filter(Boolean).join(' · ');
      selectorEquipo.add(new Option(etiqueta, equipo.id));
    }
    if (id && !equipos?.some(equipo => equipo.id === id)) {
      selectorEquipo.add(new Option('Máquina vinculada (no disponible en el catálogo)', id));
    }
    selectorEquipo.value = id || '';
    selectorEquipo.disabled = !equipos;
    avisoEquipo.hidden = Boolean(equipos);
    avisoEquipo.textContent = cargandoEquipos ? 'Cargando máquinas…'
      : 'No se pudo cargar el catálogo. Puedes guardar sin cambiar la asociación.';
  }

  async function cargarEquipos() {
    if (equipos || cargandoEquipos) return;
    cargandoEquipos = true;
    pintarSelectorEquipo(selectorEquipo.value);
    try {
      const datos = await window.MantencionesService.getElementosMaquinas();
      if (vigente()) equipos = datos;
    } catch {
      // La lectura del catálogo es independiente del guardado de la tarea.
    } finally {
      cargandoEquipos = false;
      if (vigente() && dialogo.open) pintarSelectorEquipo(selectorEquipo.value);
    }
  }

  function rellenarCampos(tarea) {
    formulario.elements.titulo.value = tarea?.titulo || '';
    formulario.elements.descripcion.value = tarea?.descripcion || '';
    formulario.elements.fecha_limite.value = tarea?.fecha_limite || '';
    pintarSelectorEquipo(tarea?.equipo_id);
  }

  function tieneCambios() {
    return seleccion && !borrando && ['titulo', 'descripcion', 'fecha_limite', 'equipo_id'].some(campo =>
      formulario.elements[campo].value.trim() !== (seleccion[campo] || '').trim());
  }

  function actualizarSalida() {
    enviar.disabled = ocupada || Boolean(seleccion && !borrando && !tieneCambios());
    cancelar.textContent = confirmarDescarte ? 'Descartar cambios'
      : edicionGuardada && !tieneCambios() ? 'Cerrar' : 'Cancelar';
  }

  function abrir(tarea = null, eliminar = false) {
    if (dialogo.open || !vigente() || ocupada || cargando || (eliminar && !esAdminPermanenteActual())) return;
    seleccion = tarea;
    borrando = eliminar;
    edicionGuardada = confirmarDescarte = false;
    guardadoPendiente = null;
    mostrarAdvertenciaFecha(false);
    formulario.reset();
    campos.hidden = campos.disabled = eliminar;
    formulario.querySelector('[data-advertencia]').hidden = !eliminar;
    const nombre = formulario.querySelector('[data-nombre]');
    nombre.hidden = !eliminar;
    nombre.textContent = tarea?.titulo || '';
    dialogo.querySelector('h2').textContent = eliminar ? 'Eliminar tarea' : tarea ? 'Editar tarea' : contexto ? 'Programar tarea' : 'Nueva tarea';
    formulario.querySelector('[data-equipo-etiqueta]').textContent = equipoFijo ? 'Máquina (obligatoria)' : 'Máquina (opcional)';
    rellenarCampos(tarea ?? (equipoFijo ? { equipo_id: equipoFijo } : null));
    actualizarSalida();
    enviar.textContent = eliminar ? 'Eliminar' : tarea ? 'Guardar cambios' : 'Guardar';
    enviar.className = (eliminar ? 'alm-btn-danger' : 'alm-btn-primary') + ' px-4 py-2';
    errorModal.textContent = '';
    errorModal.className = '';
    if (tarea && !eliminar) dialogo.querySelector('h2').after(errorModal);
    else campos.after(errorModal);
    dialogo.showModal();
    if (!eliminar && !equipoFijo) cargarEquipos();
    (eliminar ? cancelar : formulario.elements.titulo).focus();
  }

  async function operar(accion, exito, eliminar = false, editar = false) {
    if (!vigente() || ocupada || cargando) return;
    ocupada = true;
    enviar.disabled = cancelar.disabled = campos.disabled = true;
    errorModal.className = '';
    errorModal.textContent = dialogo.open ? 'Procesando…' : '';
    if (!dialogo.open) mensaje.textContent = 'Procesando…';
    try {
      const fila = await accion();
      if (!vigente()) throw new Error('Sesión administrativa no vigente.');
      if (!fila) {
        if (contexto) throw new Error('No se pudo confirmar la tarea.');
        if (dialogo.open && !editar) dialogo.close();
        await cargar('La tarea cambió o ya no está disponible. Se actualizó el listado.');
        if (editar) {
          errorModal.className = 'rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800';
          errorModal.textContent = 'La tarea cambió o ya no está disponible. Tus cambios siguen en el formulario.';
        }
        return;
      }
      if (contexto) {
        dialogo.close();
        contexto.alGuardar?.(fila);
        return;
      }
      if (dialogo.open && !editar) dialogo.close();
      tareas = eliminar ? tareas.filter(t => t.id !== fila.id)
        : tareas.some(t => t.id === fila.id) ? tareas.map(t => t.id === fila.id ? fila : t)
        : [fila, ...tareas];
      if (editar) {
        seleccion = fila;
        rellenarCampos(fila);
        edicionGuardada = true;
        actualizarSalida();
        errorModal.className = 'rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-800';
        errorModal.textContent = '✓ Cambios guardados correctamente.';
      } else mensaje.textContent = exito;
    } catch (error) {
      if (raiz.isConnected) {
        const texto = errorVisible(error);
        if (editar) errorModal.className = 'rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800';
        (dialogo.open ? errorModal : mensaje).textContent = editar && vigente() && error?.code !== '42501' && texto !== faltaFecha && texto !== equipoInvalido
          ? 'No se pudieron guardar los cambios. Inténtalo nuevamente.' : texto;
      }
    } finally {
      ocupada = false;
      cancelar.disabled = false;
      actualizarSalida();
      campos.disabled = borrando;
      if (raiz.isConnected) pintar();
    }
  }

  function guardarTarea(id, datos) {
    if (id && !tieneCambios()) return;
    confirmarDescarte = false;
    actualizarSalida();
    return operar(() => servicio.guardar(id, datos),
      'Tarea guardada.', false, Boolean(id));
  }

  function mostrarAdvertenciaFecha(mostrar) {
    formulario.hidden = mostrar;
    advertenciaFecha.hidden = !mostrar;
    dialogo.setAttribute('aria-labelledby', mostrar
      ? 'tareas-pendientes-fecha-titulo' : 'tareas-pendientes-dialogo-titulo');
  }

  volverFecha.onclick = () => {
    guardadoPendiente = null;
    mostrarAdvertenciaFecha(false);
    formulario.elements.fecha_limite.focus();
  };
  confirmarFecha.onclick = () => {
    if (!guardadoPendiente || ocupada || !dialogo.open) return;
    const { id, datos } = guardadoPendiente;
    guardadoPendiente = null;
    mostrarAdvertenciaFecha(false);
    errorModal.tabIndex = -1;
    errorModal.focus();
    guardarTarea(id, datos);
  };

  dialogo.addEventListener('cancel', event => event.preventDefault());
  formulario.oninput = () => {
    confirmarDescarte = false;
    actualizarSalida();
    errorModal.className = '';
    errorModal.textContent = '';
  };
  cancelar.onclick = () => {
    if (ocupada) return;
    if (tieneCambios() && !confirmarDescarte) {
      confirmarDescarte = true;
      actualizarSalida();
      errorModal.textContent = 'Hay cambios sin guardar. Puedes guardarlos o pulsar Descartar cambios.';
      return;
    }
    dialogo.close();
  };
  formulario.elements.fecha_limite.oninvalid = () => {
    if (formulario.elements.fecha_limite.validity.valueMissing) errorModal.textContent = faltaFecha;
  };
  formulario.onsubmit = event => {
    event.preventDefault();
    if (!dialogo.open || ocupada || guardadoPendiente) return;
    if (borrando) {
      operar(() => servicio.eliminar(seleccion.id), 'Tarea eliminada.', true);
      return;
    }
    const { titulo, descripcion, fecha_limite } = formulario.elements;
    if (!titulo.value.trim()) {
      errorModal.textContent = 'Escribe un título para la tarea.';
      titulo.focus();
      return;
    }
    if (!fecha_limite.value) {
      errorModal.textContent = faltaFecha;
      fecha_limite.focus();
      return;
    }
    if (seleccion && !tieneCambios()) return;
    const datos = {
      titulo: titulo.value, descripcion: descripcion.value, fecha_limite: fecha_limite.value
    };
    const equipoId = equipoFijo ?? (selectorEquipo.value || null);
    if (!seleccion || equipoId !== (seleccion.equipo_id ?? null)) datos.equipo_id = equipoId;
    const fechaAnterior = seleccion?.fecha_limite || '';
    if (datos.fecha_limite && datos.fecha_limite < calendarioFechaCivilLocal() &&
        datos.fecha_limite !== fechaAnterior) {
      guardadoPendiente = { id: seleccion?.id, datos };
      const fecha = formatDate(datos.fecha_limite);
      advertenciaFecha.querySelector('[data-fecha-mensaje]').textContent =
        'La fecha seleccionada, ' + fecha + ', es anterior a la fecha actual. ¿Deseas guardar esta tarea con una fecha límite vencida?';
      mostrarAdvertenciaFecha(true);
      volverFecha.focus();
      return;
    }
    guardarTarea(seleccion?.id, datos);
  };
  dialogo.addEventListener('close', () => {
    if (dialogo.open) return;
    guardadoPendiente = seleccion = null;
    formulario.reset();
    rellenarCampos(null);
    mostrarAdvertenciaFecha(false);
    if (contexto) raiz.remove();
  });
  if (contexto) {
    abrir();
    if (!dialogo.open) raiz.remove();
    return;
  }
  raiz.querySelector('[data-nueva]').onclick = () => abrir();
  for (const boton of raiz.querySelectorAll('[data-filtro]')) boton.onclick = () => {
    filtro = boton.dataset.filtro;
    pintar();
  };
  cargar();
}

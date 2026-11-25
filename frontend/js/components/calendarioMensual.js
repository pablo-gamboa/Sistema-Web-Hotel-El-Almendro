// Calendario mensual de presentación. Cada instancia conserva su fecha local.
function calendarioMensualHTML({ oculto = false } = {}) {
  return `<section data-calendario ${oculto ? 'hidden' : ''} class="alm-panel p-4 space-y-3" aria-label="Calendario mensual">
      <div class="tareas-calendario-encabezado">
        <div class="tareas-calendario-periodo">
          <button type="button" data-anterior class="alm-btn-secondary px-3 py-2" aria-label="Mes anterior">←</button>
          <div class="tareas-calendario-selector">
            <h2 data-mes-titulo class="alm-title" aria-live="polite"></h2>
            <input type="month" data-mes min="0001-01" max="9999-12" aria-label="Ir a mes y año" title="Ir a mes y año">
          </div>
          <button type="button" data-siguiente class="alm-btn-secondary px-3 py-2" aria-label="Mes siguiente">→</button>
        </div>
        <button type="button" data-hoy class="alm-btn-secondary px-3 py-2">Ir al día actual</button>
      </div>
      <div data-dias class="tareas-calendario-grid"></div>
      <div class="tareas-calendario-leyenda" aria-label="Leyenda de tareas">
        ${[['tarea-pendiente-plazo','Pendiente en plazo'],['tarea-pendiente-proxima','Vence hoy o mañana'],['tarea-completada','Completada'],['tarea-pendiente-vencida','Vencida sin completar']].map(([clase,texto])=>`<span><i aria-hidden="true" class="tareas-calendario-cantidad ${clase}"></i>${texto}</span>`).join('')}
      </div>
    </section>`;
}

function calendarioFechaCivilLocal(ahora = new Date()) {
  return [ahora.getFullYear(), ahora.getMonth() + 1, ahora.getDate()]
    .map((parte, indice) => String(parte).padStart(indice === 0 ? 4 : 2, '0')).join('-');
}

function iniciarCalendarioMensual(calendario, { fechaRegistro, etiquetaCantidad, alSeleccionar, colorearVencimientos = true, estadoRegistro = null }) {
  const mes = calendario.querySelector('[data-mes]');
  const dias = calendario.querySelector('[data-dias]');
  let dia = calendarioFechaCivilLocal();
  const formatoMes = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' });
  const formatoDia = new Intl.DateTimeFormat('es-CL', { dateStyle: 'full' });
  const fechaLocal = fecha => new Date(fecha + 'T12:00:00');

  function cambiarMes(valor, salto = 0) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(valor)) return;
    const fecha = fechaLocal(valor + '-01');
    fecha.setMonth(fecha.getMonth() + salto);
    if (fecha.getFullYear() < 1 || fecha.getFullYear() > 9999) return;
    dia = calendarioFechaCivilLocal(fecha);
    alSeleccionar(dia);
  }

  function pintar(registros, hoy, manana) {
    // Aritmética civil local también para los consumidores que solo envían hoy.
    if (!manana) { const siguiente=fechaLocal(hoy); siguiente.setDate(siguiente.getDate()+1); manana=calendarioFechaCivilLocal(siguiente); }
    mes.value = dia.slice(0, 7);
    const inicio = fechaLocal(mes.value + '-01');
    const fin = new Date(inicio);
    fin.setMonth(fin.getMonth() + 1, 0);
    calendario.querySelector('[data-mes-titulo]').textContent = formatoMes.format(inicio);
    dias.replaceChildren();
    for (const nombre of ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']) {
      const etiqueta = document.createElement('span');
      etiqueta.className = 'alm-muted';
      etiqueta.textContent = nombre;
      dias.append(etiqueta);
    }
    const espacios = (inicio.getDay() + 6) % 7;
    for (let i = 0; i < espacios; i++) dias.append(document.createElement('span'));
    const cantidades = new Map();
    for (const registro of registros) {
      const fecha = fechaRegistro(registro);
      if (fecha?.slice(0, 7) !== mes.value) continue;
      const estado=estadoRegistro ? estadoRegistro(registro) : registro.estado;
      const clase=estado==='completada' ? 'tarea-completada'
        : !colorearVencimientos && !estadoRegistro ? 'tarea-pendiente-plazo'
        : fecha<hoy ? 'tarea-pendiente-vencida' : fecha<=manana ? 'tarea-pendiente-proxima' : 'tarea-pendiente-plazo';
      if (!cantidades.has(fecha)) cantidades.set(fecha,new Map());
      const estados=cantidades.get(fecha);estados.set(clase,(estados.get(clase)||0)+1);
    }
    for (let numero = 1; numero <= fin.getDate(); numero++) {
      const fecha = mes.value + '-' + String(numero).padStart(2, '0');
      const estados = cantidades.get(fecha) || new Map();
      const cantidad = [...estados.values()].reduce((a,b)=>a+b,0);
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'tareas-calendario-dia';
      boton.textContent = numero;
      boton.setAttribute('aria-pressed', String(fecha === dia));
      if (fecha === hoy) boton.setAttribute('aria-current', 'date');
      const etiqueta = formatoDia.format(fechaLocal(fecha)) + ', ' + etiquetaCantidad(cantidad);
      boton.setAttribute('aria-label', etiqueta);
      if (cantidad) {
        const grupo=document.createElement('span');grupo.className='tareas-calendario-indicadores';
        const etiquetas=[['tarea-pendiente-plazo','pendientes en plazo'],['tarea-pendiente-proxima','vencen hoy o mañana'],['tarea-completada','completadas'],['tarea-pendiente-vencida','vencidas sin completar']];
        const resumen=[];
        for(const [clase,texto] of etiquetas)if(estados.has(clase)){
          const indicador=document.createElement('span');indicador.className='tareas-calendario-cantidad '+clase;
          indicador.textContent=estados.get(clase);indicador.setAttribute('aria-hidden','true');
          grupo.append(indicador);resumen.push(estados.get(clase)+' '+texto);
        }
        boton.setAttribute('aria-label',etiqueta+'; '+resumen.join(', '));
        boton.append(grupo);
      }
      boton.onclick = () => {
        dia = fecha;
        alSeleccionar(dia);
        dias.children[6 + espacios + numero]?.focus();
      };
      dias.append(boton);
    }
  }

  mes.onchange = () => cambiarMes(mes.value);
  calendario.querySelector('[data-anterior]').onclick = () => cambiarMes(mes.value, -1);
  calendario.querySelector('[data-siguiente]').onclick = () => cambiarMes(mes.value, 1);
  calendario.querySelector('[data-hoy]').onclick = () => {
    dia = calendarioFechaCivilLocal();
    alSeleccionar(dia);
  };
  return { get dia() { return dia; }, pintar };
}

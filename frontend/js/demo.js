'use strict';
// La demo solo conserva estado en memoria. No utiliza red, cuentas ni almacenamiento real.
let registros = datosIniciales();
let modulo = 'inicio', editando = null;
const $ = id => document.getElementById(id);
const nav=$('nav'), content=$('content'), editor=$('editor'), form=$('form');
function nodo(tag,text,clase){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(clase)n.className=clase;return n;}
function boton(text,fn,clase){const b=nodo('button',text,clase);b.type='button';b.addEventListener('click',fn);return b;}
function navegar(id){modulo=id;render();}
function render(){
  nav.replaceChildren();
  for(const [id,label] of [['inicio','Inicio / Dashboard'],...Object.entries(MODULOS)]){
    const b=boton(label,()=>navegar(id));if(id===modulo)b.setAttribute('aria-current','page');nav.append(b);
  }
  $('title').textContent=MODULOS[modulo]||'Inicio / Dashboard';content.replaceChildren();
  if(modulo==='inicio'){dashboard();return;}lista();
}
function dashboard(){
  const cards=nodo('div',undefined,'cards');
  for(const [label,value] of [['Registros',registros.length],['Pendientes',registros.filter(r=>r.status==='Pendiente').length],['En curso',registros.filter(r=>r.status==='En curso').length],['Completadas',registros.filter(r=>r.status==='Completada').length]]){
    const c=nodo('div',undefined,'metric');c.append(nodo('small',label),nodo('strong',value));cards.append(c);
  }
  content.append(cards);
  const panel=nodo('section',undefined,'panel');panel.append(nodo('h2','Calendario de actividades'));
  const host=nodo('div');host.innerHTML=calendarioMensualHTML();panel.append(host);
  const detalle=nodo('p','Selecciona una fecha para consultar sus actividades.','empty');panel.append(detalle);content.append(panel);
  const hoy=calendarioFechaCivilLocal();
  const registrosCalendario=registros.map(r=>({...r,estado:r.status==='Completada'?'completada':'pendiente'}));
  const calendario=iniciarCalendarioMensual(host.firstElementChild,{fechaRegistro:r=>r.date,etiquetaCantidad:n=>n+' actividades',alSeleccionar:fecha=>{calendario.pintar(registrosCalendario,hoy);const items=registros.filter(r=>r.date===fecha);detalle.textContent=fecha+': '+(items.map(r=>r.title).join(' · ')||'Sin actividades');}});
  calendario.pintar(registrosCalendario,hoy);
}
function lista(){
  const panel=nodo('section',undefined,'panel'),toolbar=nodo('div',undefined,'toolbar');
  const buscar=nodo('input');buscar.type='search';buscar.placeholder='Buscar registros';buscar.setAttribute('aria-label','Buscar registros');
  const filtro=nodo('select');filtro.setAttribute('aria-label','Filtrar estado');
  for(const s of ['Todos','Pendiente','En curso','Completada'])filtro.append(nodo('option',s));
  toolbar.append(buscar,filtro,boton('Nuevo registro',()=>abrir(null),'primary'));panel.append(toolbar);
  const wrap=nodo('div',undefined,'table-wrap');panel.append(wrap);content.append(panel);
  function pintar(){
    const q=buscar.value.toLocaleLowerCase('es');const rows=registros.filter(r=>r.module===modulo&&(filtro.value==='Todos'||r.status===filtro.value)&&(r.title+' '+r.area).toLocaleLowerCase('es').includes(q));
    wrap.replaceChildren();if(!rows.length){wrap.append(nodo('p','No hay registros para mostrar.','empty'));return;}
    const table=nodo('table'),thead=nodo('thead'),head=nodo('tr');for(const h of ['Descripción','Área','Fecha','Estado','Acciones'])head.append(nodo('th',h));thead.append(head);table.append(thead);
    const tbody=nodo('tbody');for(const r of rows){const tr=nodo('tr');for(const value of [r.title,r.area,r.date])tr.append(nodo('td',value));const state=nodo('td');state.append(nodo('span',r.status,'status'+(r.status==='Completada'?' done':'')));const actions=nodo('td');actions.append(boton('Editar',()=>abrir(r)),document.createTextNode(' '),boton('Eliminar',()=>{if(confirm('¿Eliminar este registro ficticio?')){registros=registros.filter(x=>x.id!==r.id);pintar();}}));tr.append(state,actions);tbody.append(tr);}table.append(tbody);wrap.append(table);
  }
  buscar.addEventListener('input',pintar);filtro.addEventListener('change',pintar);pintar();
}
function abrir(r){editando=r;form.reset();$('editor-title').textContent=r?'Editar registro':'Nuevo registro';for(const key of ['title','area','date','status'])form.elements[key].value=r?r[key]:key==='date'?calendarioFechaCivilLocal():key==='status'?'Pendiente':'';editor.showModal();}
form.addEventListener('submit',e=>{e.preventDefault();const values=Object.fromEntries(new FormData(form));if(!values.title.trim()||!values.area.trim())return;const item={id:editando?.id??Math.max(0,...registros.map(r=>r.id))+1,module:modulo,title:values.title.trim(),area:values.area.trim(),date:values.date,status:values.status};registros=editando?registros.map(r=>r.id===item.id?item:r):[...registros,item];editor.close();render();});
$('cancel').addEventListener('click',()=>editor.close());$('reset').addEventListener('click',()=>{if(confirm('¿Restablecer los datos ficticios?')){registros=datosIniciales();render();}});render();
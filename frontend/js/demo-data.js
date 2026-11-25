// Datos inventados; no se importan registros ni identificadores de producción.
const MODULOS = Object.freeze({
  mantenimiento:'Mantenciones preventivas',
  reactiva:'Mantenciones reactivas',
  inventario:'Inventario y activos',
  proyectos:'Proyectos y mejoras',
  solicitudes:'Solicitudes',
  tareas:'Gestión de tareas',
  personal:'Trabajadores (ficticios)'
});
function datosIniciales(hoy = new Date()) {
  const fecha = n => { const d = new Date(hoy); d.setDate(d.getDate()+n); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); };
  const ejemplos = [
    ['mantenimiento','Revisión de iluminación','Área de ejemplo A',2,'Pendiente'],
    ['mantenimiento','Inspección de equipos','Área de ejemplo B',-2,'Completada'],
    ['reactiva','Reparar cierre de puerta','Área de ejemplo A',0,'En curso'],
    ['inventario','Verificar insumos de limpieza','Bodega de ejemplo',3,'Pendiente'],
    ['proyectos','Planificar renovación de sala','Área de ejemplo C',7,'En curso'],
    ['solicitudes','Solicitar inspección técnica','Área de ejemplo B',1,'Pendiente'],
    ['tareas','Revisar lista de actividades','Área de ejemplo C',0,'Pendiente'],
    ['personal','Colaborador de demostración 01','Equipo ficticio',4,'Completada']
  ];
  return ejemplos.map(([module,title,area,offset,status],i)=>({id:i+1,module,title,area,date:fecha(offset),status}));
}
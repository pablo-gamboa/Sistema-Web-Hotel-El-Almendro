# Sistema de Gestión Hotelera - Hotel & Centro de Eventos El Almendro

Plataforma web full stack para centralizar y digitalizar los procesos operativos de un hotel y centro de eventos, reemplazando registros dispersos en planillas Excel. Desarrollada a partir de requerimientos reales del cliente.

## Mi participación

**Pablo Gamboa - Desarrollador Full Stack y Scrum Master**

- Diseño de interfaces, estructura de base de datos y lógica de negocio.
- Implementación de módulos operativos y mecanismos de control de acceso.
- Levantamiento de requerimientos con usuarios del hotel.
- Coordinación del equipo mediante Scrum y Jira; despliegue en Vercel.

## Funcionalidades del sistema original

- Dashboard e indicadores, mantenciones generales y reactivas.
- Inventario, activos, proyectos, mejoras y remodelaciones.
- Solicitudes, tareas, calendario y carta Gantt.
- Gestión de trabajadores y documentación.
- Autenticación, roles, permisos y trazabilidad de actividades.

## Tecnologías del sistema original

HTML, CSS, JavaScript, Tailwind CSS, TypeScript, PostgreSQL, Supabase, Vercel, GitHub y Jira.

## Arquitectura

El sistema original utiliza una arquitectura de tres capas, separando presentación, negocio y persistencia de datos.

| Capa | Tecnologías | Responsabilidad |
| --- | --- | --- |
| Presentación | HTML, CSS, JavaScript y Vercel | Interfaz web para administradores, técnicos y recepción. |
| Negocio | Supabase, funciones RPC, Auth, API y Mailjet SMTP | Lógica de negocio, autenticación y servicio de correo. |
| Datos | PostgreSQL, Row Level Security (RLS) y Supabase Storage | Persistencia, almacenamiento de archivos y protección de datos. |

## Seguridad y calidad del sistema original

- Autenticación mediante Supabase Auth y control de acceso por roles.
- Políticas RLS para restringir acceso a registros en PostgreSQL.
- Organización modular del código y seguimiento de estados e historial de actividades.

## Demostración de portafolio

Esta versión utiliza el HTML, los estilos CSS y Tailwind y componentes de presentación del frontend original, adaptados a un entorno independiente. Conserva el diseño original del menú, dashboard y gestión de tareas, con tema oscuro y claro. Los datos son ficticios y permanecen solo en memoria.

| Vista | Funcionalidades de demostración |
| --- | --- |
| Dashboard | Indicadores ficticios y calendario de actividades. |
| Gestión de tareas | Calendario, filtros, creación de tareas, responsables ficticios y fichas de seguimiento. |
| Carta Gantt | Visualización de fechas y avances simulados. |
| Mejoras y obras | Listado, fichas de proyectos y Gantt. |
| Remodelaciones | Tarjetas de proyectos y cambio de estado en memoria; ficha simplificada. |
| Inventario | Catálogo, búsqueda y filtro por bodega; ficha simplificada de solo lectura. |

Las demás pantallas y operaciones del sistema original no están incluidas en esta demostración. No es una copia completa de producción.

### Ejecutar localmente

1. Descargar el repositorio desde **Code > Download ZIP** y descomprimirlo.
2. Abrir la carpeta del proyecto y escribir `cmd` en la barra de direcciones del Explorador de Windows.
3. Ejecutar `python -m http.server 8000 --bind 127.0.0.1 --directory frontend` (o `py -m http.server 8000 --bind 127.0.0.1 --directory frontend`).
4. Abrir `http://localhost:8000` en el navegador.
5. Navegar por las vistas, crear una tarea ficticia, consultar una ficha de proyecto y filtrar productos del inventario.
6. Recargar la página para descartar cambios simulados. Detener el servidor con Ctrl+C.

No requiere instalar paquetes ni configurar una cuenta de Supabase. No introducir datos personales o empresariales reales.

### Privacidad y alcance

- La demo no carga el cliente de Supabase ni utiliza su backend, cuentas, registros o configuración de producción.
- Los servicios de demostración son locales y trabajan con objetos ficticios en memoria.
- Una política CSP bloquea las conexiones de red iniciadas por la aplicación y el envío de formularios externos. Los manejadores inline de la interfaz original se conservan para esta demo; no es una configuración recomendada para producción.
- Se excluyen el backend, el esquema SQL, la documentación interna, el historial Git original y las funciones administrativas reales. Se desactiva la fuente tipográfica externa.
- La arquitectura y la seguridad de la sección anterior describen el sistema original, no una autenticación o autorización activa en esta demo.
- El proyecto original fue desarrollado en equipo. La adaptación de portafolio fue asistida por IA; su redistribución requiere la autorización correspondiente.

### Validación de la adaptación

Se verificó la sintaxis de los archivos JavaScript y se realizó una prueba de navegador en memoria con las seis vistas, apertura de fichas, creación de una tarea, Gantt, cambio de estado y filtro de inventario, sin errores JavaScript ni solicitudes externas observadas. La prueba utilizó recursos locales insertados en el navegador, no el despliegue real. La aplicación completa de producción no fue auditada.

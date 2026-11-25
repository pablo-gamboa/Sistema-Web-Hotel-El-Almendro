# Sistema de Gestión Hotelera - Hotel & Centro de Eventos El Almendro

Plataforma web full stack orientada a centralizar y digitalizar los procesos operativos de un hotel y centro de eventos, reemplazando registros dispersos en planillas Excel. Desarrollada a partir de requerimientos reales del cliente.

## Funcionalidades

- Panel de gestión operativa e indicadores.
- Mantenciones preventivas y reactivas.
- Inventario, activos y áreas.
- Proyectos, mejoras y remodelaciones.
- Solicitudes, tareas, calendario y carta Gantt.
- Gestión de trabajadores y documentación.
- Autenticación, roles, permisos y trazabilidad de actividades.

## Mi participación

**Pablo Gamboa - Desarrollador Full Stack y Scrum Master**

- Diseño de interfaces, estructura de base de datos y lógica de negocio.
- Implementación de módulos operativos y mecanismos de control de acceso.
- Levantamiento de requerimientos con usuarios del hotel.
- Coordinación del equipo mediante Scrum y Jira; despliegue en Vercel.

## Tecnologías

HTML, CSS, JavaScript, Tailwind CSS, TypeScript, PostgreSQL, Supabase, Vercel, GitHub y Jira.

## Arquitectura

El sistema se organiza en una arquitectura de tres capas, con separación de responsabilidades entre la interfaz, la lógica de negocio y la persistencia de datos.

| Capa | Tecnologías | Responsabilidad |
| --- | --- | --- |
| Presentación | HTML, CSS, JavaScript y Vercel | Interfaz web para administradores, técnicos y recepción. |
| Negocio | Supabase, funciones RPC, Auth, API y Mailjet SMTP | Lógica de negocio, autenticación y servicio de correo. |
| Datos | PostgreSQL, Row Level Security (RLS) y Supabase Storage | Persistencia, almacenamiento de archivos y protección de datos. |

## Seguridad y calidad

- Autenticación mediante Supabase Auth y control de acceso por roles.
- Políticas RLS para restringir el acceso a registros en PostgreSQL.
- Organización modular del código para facilitar su mantenimiento.
- Seguimiento de estados, responsables e historial de actividades.

## Estado del sistema

Aplicación web desplegada y en validación con el cliente, con funcionalidades integradas y orientadas a sus procesos operativos reales.

## Demostración de portafolio

Este repositorio contiene una adaptación visual independiente del sistema original. Incluye un componente de calendario del proyecto y una interfaz de demostración reconstruida con datos completamente ficticios. No es una copia completa del código de producción ni una implementación del backend original.

### Ejecutar localmente

1. Clonar o descargar el repositorio.
2. Desde la raíz, ejecutar `python -m http.server 8000 --directory frontend`.
3. Abrir `http://localhost:8000` en el navegador.

La demostración permite consultar indicadores, navegar por módulos, buscar, filtrar, crear, editar y eliminar registros ficticios, y consultar actividades en el calendario. Los cambios permanecen solo en memoria hasta recargar la página. No requiere credenciales ni servicios externos.

### Privacidad y alcance

- No contiene datos del hotel, cuentas reales, conexiones a producción ni secretos.
- La política CSP impide las conexiones de red iniciadas por la aplicación.
- El backend, esquema de producción, documentación interna y funciones de administración reales se excluyen deliberadamente.
- Las funciones de seguridad y arquitectura descritas anteriormente corresponden al sistema original, no a la demostración local.
- Proyecto original desarrollado en equipo. La demostración reconstruida con asistencia de IA no sustituye la autoría ni el código original. Compartir el código del sistema original requiere autorización de sus titulares.


# Sistema de Gestión Hotelera - Hotel & Centro de Eventos El Almendro

Plataforma web Full Stack desarrollada para centralizar y digitalizar los procesos operativos de un hotel y centro de eventos, reemplazando registros dispersos en planillas Excel por un sistema integrado de gestión y seguimiento.

El desarrollo responde a requerimientos reales del cliente, con un enfoque en la trazabilidad, la seguridad de la información y la organización de las actividades operativas.

## Mi participación

**Pablo Gamboa - Desarrollador Full Stack y Scrum Master**

- Diseño de interfaces, estructura de base de datos y lógica de negocio.
- Desarrollo e integración de módulos operativos.
- Implementación de mecanismos de autenticación, roles y permisos.
- Levantamiento de requerimientos directamente con los usuarios del hotel.
- Coordinación del equipo de desarrollo mediante Scrum y Jira.
- Configuración y despliegue de la aplicación en Vercel.

## Funcionalidades del sistema

| Módulo | Descripción |
| --- | --- |
| Dashboard | Indicadores operativos y calendario general de actividades. |
| Mantenciones | Gestión y seguimiento de mantenciones generales y reactivas. |
| Inventario | Administración de productos, activos y bodegas. |
| Mejoras y remodelaciones | Planificación y seguimiento de proyectos. |
| Gestión de tareas | Asignación de responsables, estados, plazos y avances. |
| Carta Gantt | Visualización de la planificación y el progreso de actividades. |
| Solicitudes | Registro y seguimiento de requerimientos operativos. |
| Trabajadores | Gestión de personal y documentación. |
| Usuarios | Administración de cuentas, roles y permisos. |

## Tecnologías

| Área | Tecnologías |
| --- | --- |
| Frontend | HTML, CSS, JavaScript y Tailwind CSS |
| Backend | Supabase, TypeScript y funciones RPC |
| Base de datos | PostgreSQL |
| Autenticación y seguridad | Supabase Auth y Row Level Security (RLS) |
| Almacenamiento | Supabase Storage |
| Correo electrónico | Mailjet SMTP |
| Despliegue | Vercel |
| Control de versiones | Git y GitHub |
| Gestión de proyectos | Scrum y Jira |

## Arquitectura

El sistema utiliza una arquitectura de tres capas, separando la presentación, la lógica de negocio y la persistencia de datos.

| Capa | Tecnologías | Responsabilidad |
| --- | --- | --- |
| Presentación | HTML, CSS, JavaScript y Vercel | Interfaz web para administradores, técnicos y recepción. |
| Negocio | Supabase, funciones RPC, Auth, API y Mailjet SMTP | Lógica de negocio, autenticación y servicio de correo. |
| Datos | PostgreSQL, RLS y Supabase Storage | Persistencia, almacenamiento y protección de datos. |

## Seguridad y buenas prácticas

- Autenticación y control de acceso basado en roles.
- Políticas RLS para restringir el acceso a registros de la base de datos.
- Separación de responsabilidades y organización modular del código.
- Trazabilidad de actividades, responsables y estados.
- Diseño responsive con temas claro y oscuro.

## Estructura del repositorio

```text
frontend/
├── css/
├── js/
│   ├── components/
│   └── views/
└── index.html
.gitignore
README.md
```

## Ejecución local

**Requisito:** Python 3.

1. Clonar el repositorio o descargarlo desde Code > Download ZIP.
2. Abrir una terminal en la carpeta del proyecto.
3. Ejecutar:

```bash
python -m http.server 8000 --bind 127.0.0.1 --directory frontend
```

4. Abrir [http://localhost:8000](http://localhost:8000) en el navegador.

No requiere instalar dependencias ni configurar servicios externos.

## Versión de portafolio

Esta versión conserva los estilos y componentes del frontend original y permite explorar el dashboard, la gestión de tareas, la carta Gantt, mejoras y obras, remodelaciones e inventario mediante datos ficticios. Los cambios de la sesión se descartan al recargar la página.

Por confidencialidad, no se incluyen registros reales, credenciales ni el backend de producción. La arquitectura y los mecanismos de seguridad descritos corresponden al sistema original.

Proyecto desarrollado en equipo para un cliente del sector hotelero. La adaptación de demostración contó con asistencia de IA. La redistribución del código está sujeta a las autorizaciones correspondientes.

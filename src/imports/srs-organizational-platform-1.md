DOCUMENTO DE REQUERIMIENTOS DEL SISTEMA
Plataforma de Gestión Organizacional para Iglesias
SRS — Software Requirements Specification

Versión
1.0	Estado
Borrador	Fecha
Febrero 2026	Plataforma
SaaS Multi-Iglesia
 
1. Introducción
1.1 Propósito del Documento
Este documento describe los requerimientos funcionales y no funcionales de la Plataforma de Gestión Organizacional para Iglesias, un sistema SaaS multi-tenancy orientado a iglesias con estructura departamental. Su propósito es servir como referencia contractual y técnica entre los stakeholders y el equipo de desarrollo.

1.2 Alcance del Sistema
La plataforma permite a las iglesias organizar su estructura interna mediante departamentos y subgrupos, gestionar miembros y sus roles, planificar eventos y tareas operativas, y ofrecer formación interna a través de un aula por departamento. Los líderes de departamento cuentan con un módulo exclusivo para evaluar manualmente el desempeño y avance de los miembros a su cargo.

1.3 Definiciones y Acrónimos
Término	Definición
SaaS	Software como Servicio. La plataforma se entrega y consume vía web sin instalación local.
Multi-iglesia	Capacidad de alojar múltiples iglesias independientes en una misma infraestructura.
Departamento	Unidad organizativa interna de la iglesia (ej. Alabanza, Jóvenes, Ujieres).
Subgrupo	Subdivisión de un departamento (ej. células, brigadas, equipos de apoyo).
Servidor	Rol base de un miembro dentro de un departamento. Tiene acceso de solo lectura/visualización.
Líder	Responsable operativo del departamento. Gestiona miembros, eventos, tareas y el aula.
Aula	Espacio de formación digital de cada departamento con módulos, lecciones y recursos.
Evaluación	Valoración manual del desempeño o avance de un miembro, registrada por el líder.
MVP	Minimum Viable Product. Conjunto mínimo de funcionalidades para el primer lanzamiento.
RF	Requerimiento Funcional.
RNF	Requerimiento No Funcional.

1.4 Visión General del Documento
•	Sección 2: Descripción general del sistema, roles de usuario y restricciones.
•	Sección 3: Requerimientos funcionales organizados por módulo.
•	Sección 4: Requerimientos no funcionales.
•	Sección 5: Reglas de negocio y restricciones operativas.
•	Sección 6: Alcance del MVP y exclusiones explícitas.

 
2. Descripción General del Sistema
2.1 Perspectiva del Producto
La plataforma es un sistema web independiente, accesible desde navegador en dispositivos de escritorio y móvil. No requiere integración con sistemas externos en el MVP. Cada iglesia es un tenant aislado con sus propios datos, usuarios y configuraciones.

2.2 Roles de Usuario
Rol	Nivel	Descripción y Capacidades Principales
Super Administrador	Global	Acceso total a la plataforma. Crea y gestiona iglesias. Asigna administradores a cada iglesia. No interviene en la operación interna de ninguna iglesia.
Administrador de Iglesia	Iglesia	Gestiona la estructura completa de su iglesia: departamentos, subgrupos, líderes y eventos globales. Ve todos los departamentos y sus contenidos.
Líder de Departamento	Departamento	Gestiona la operación de su departamento: miembros, eventos, tareas y aula. Es el único rol que puede registrar evaluaciones de desempeño de los miembros.
Co-líder	Departamento	Apoya al líder en la gestión operativa del departamento. Mismos permisos que el líder salvo configuraciones estructurales del departamento.
Coordinador	Departamento	Gestión operativa parcial. Puede gestionar tareas y asistir en la organización de eventos. No gestiona la estructura del aula ni evaluaciones.
Servidor	Departamento	Rol base. Visualiza el cronograma consolidado, sus tareas asignadas, los contenidos del aula y sus evaluaciones recibidas. No puede crear ni modificar contenido.

2.3 Jerarquía Organizacional
La estructura jerárquica del sistema es la siguiente:
1.	Super Administrador
1.1.	Iglesia
a)	Administrador de Iglesia
a)	Departamentos
	Subgrupos
	Miembros (con sus roles: Líder, Co-líder, Coordinador, Servidor)
b)	Aula del Departamento

2.4 Restricciones Generales
•	El sistema debe funcionar como aplicación web responsive, sin requerir instalación de software adicional.
•	Toda la información de una iglesia debe permanecer aislada de las demás (multi-tenancy seguro).
•	Los roles se gestionan a dos niveles independientes: rol en la iglesia y rol en cada departamento.
•	Un usuario puede pertenecer a múltiples iglesias y tener roles distintos en cada una.
•	Dentro de una iglesia, un usuario puede ser líder en un departamento y servidor en otro.

 
3. Requerimientos Funcionales
Los requerimientos se organizan por módulo del sistema. La prioridad se clasifica en Alta (debe incluirse en el MVP), Media (deseable en el MVP) y Baja (puede diferirse).

3.1 Módulo Multi-Iglesia

RF-01  Creación de Iglesias
Descripción	El Super Administrador puede crear una nueva iglesia registrando nombre, slug único, correo, teléfono, dirección, ciudad, país y zona horaria.
Actor(es)	Super Administrador
Módulo	Multi-Iglesia
Prioridad	Alta

RF-02  Asignación de Administrador de Iglesia
Descripción	El Super Administrador puede asignar uno o más usuarios como Administradores de una iglesia específica. También puede revocar este rol.
Actor(es)	Super Administrador
Módulo	Multi-Iglesia
Prioridad	Alta

RF-03  Activación y Desactivación de Iglesias
Descripción	El Super Administrador puede desactivar una iglesia, impidiendo el acceso de sus miembros sin eliminar sus datos.
Actor(es)	Super Administrador
Módulo	Multi-Iglesia
Prioridad	Alta

RF-04  Listado y Búsqueda de Iglesias
Descripción	El Super Administrador puede listar todas las iglesias registradas y filtrarlas por nombre, ciudad o estado (activa/inactiva).
Actor(es)	Super Administrador
Módulo	Multi-Iglesia
Prioridad	Media

3.2 Módulo de Gestión de la Iglesia

RF-05  Creación y Gestión de Departamentos
Descripción	El Administrador de Iglesia puede crear, editar, activar y desactivar departamentos dentro de su iglesia. Cada departamento tiene nombre, descripción e ícono.
Actor(es)	Administrador de Iglesia
Módulo	Gestión Iglesia
Prioridad	Alta

RF-06  Creación y Gestión de Subgrupos
Descripción	El Administrador de Iglesia y el Líder pueden crear subgrupos dentro de un departamento, asignarles nombre y descripción, y gestionar sus miembros.
Actor(es)	Administrador de Iglesia, Líder
Módulo	Gestión Iglesia
Prioridad	Alta

RF-07  Asignación de Líder a Departamento
Descripción	El Administrador de Iglesia puede asignar a un miembro como Líder, Co-líder o Coordinador de un departamento. Un departamento puede tener un líder y múltiples co-líderes o coordinadores.
Actor(es)	Administrador de Iglesia
Módulo	Gestión Iglesia
Prioridad	Alta

RF-08  Creación de Eventos Globales
Descripción	El Administrador de Iglesia puede crear eventos con alcance global, visibles para todos los miembros activos de la iglesia.
Actor(es)	Administrador de Iglesia
Módulo	Gestión Iglesia
Prioridad	Alta

RF-09  Gestión de Miembros de la Iglesia
Descripción	El Administrador de Iglesia puede invitar nuevos usuarios a la iglesia, asignarles un rol global, y activar o desactivar su membresía.
Actor(es)	Administrador de Iglesia
Módulo	Gestión Iglesia
Prioridad	Alta

3.3 Módulo Operativo del Departamento

RF-10  Gestión de Miembros del Departamento
Descripción	El Líder puede agregar miembros de la iglesia a su departamento, asignarles un rol interno (Co-líder, Coordinador, Servidor) y desactivar su membresía en el departamento.
Actor(es)	Líder, Co-líder
Módulo	Operativo Departamento
Prioridad	Alta

RF-11  Creación y Gestión de Eventos del Departamento
Descripción	El Líder puede crear eventos con alcance departamento. Los eventos incluyen título, descripción, lugar, fecha de inicio, fecha de fin y opción de día completo.
Actor(es)	Líder, Co-líder, Coordinador
Módulo	Operativo Departamento
Prioridad	Alta

RF-12  Creación y Gestión de Tareas Operativas
Descripción	El Líder puede crear tareas operativas dentro del departamento, asignarlas a uno o varios miembros, establecer fecha límite y vincularlas opcionalmente a un evento.
Actor(es)	Líder, Co-líder, Coordinador
Módulo	Operativo Departamento
Prioridad	Alta

RF-13  Actualización de Estado de Tareas
Descripción	Cualquier miembro asignado a una tarea puede cambiar su estado entre: Pendiente, En Proceso y Completada.
Actor(es)	Líder, Co-líder, Coordinador, Servidor
Módulo	Operativo Departamento
Prioridad	Alta

RF-14  Visualización del Cronograma Consolidado
Descripción	Cada usuario visualiza un cronograma unificado que incluye: eventos globales de su iglesia, eventos de sus departamentos activos y sus eventos personales.
Actor(es)	Todos los roles
Módulo	Operativo Departamento
Prioridad	Alta

RF-15  Creación de Eventos Personales
Descripción	Cualquier miembro puede crear eventos de alcance personal, visibles solo para él y los asistentes que designe.
Actor(es)	Todos los roles
Módulo	Operativo Departamento
Prioridad	Media

3.4 Módulo Aula

Aclaración sobre el Aula
Cada departamento tiene exactamente un aula. El aula es gestionada exclusivamente por el Líder y Co-líder. Los miembros con rol Coordinador y Servidor solo pueden visualizar el contenido publicado.

RF-16  Gestión de Módulos del Aula
Descripción	El Líder puede crear, editar, reordenar y eliminar módulos dentro del aula de su departamento. Cada módulo tiene título, descripción y un orden de presentación.
Actor(es)	Líder, Co-líder
Módulo	Aula
Prioridad	Alta

RF-17  Gestión de Lecciones
Descripción	El Líder puede crear, editar, reordenar y eliminar lecciones dentro de un módulo. Cada lección tiene título y contenido en texto enriquecido.
Actor(es)	Líder, Co-líder
Módulo	Aula
Prioridad	Alta

RF-18  Gestión de Recursos Adjuntos
Descripción	El Líder puede adjuntar recursos a cada lección: archivos subidos al sistema (PDF, imágenes, documentos) o enlaces externos (YouTube, Google Drive, etc.).
Actor(es)	Líder, Co-líder
Módulo	Aula
Prioridad	Alta

RF-19  Visualización del Aula por el Miembro
Descripción	Los miembros con rol Coordinador o Servidor pueden navegar el aula de su departamento: ver módulos, lecciones y descargar o acceder a los recursos adjuntos.
Actor(es)	Coordinador, Servidor
Módulo	Aula
Prioridad	Alta

3.5 Módulo de Evaluaciones del Líder

Característica Clave del Módulo
Las evaluaciones NO son realizadas por el miembro sobre el contenido del aula. Son valoraciones manuales que el Líder registra sobre el desempeño, participación o avance de cada miembro de su departamento. El miembro puede consultar las evaluaciones que ha recibido.

RF-20  Creación de Evaluación Manual por el Líder
Descripción	El Líder puede registrar una evaluación para cualquier miembro de su departamento. La evaluación incluye: miembro evaluado, fecha, criterio o aspecto evaluado, calificación (escala configurable o descriptiva) y observaciones.
Actor(es)	Líder, Co-líder
Módulo	Evaluaciones
Prioridad	Alta

RF-21  Listado y Filtro de Evaluaciones del Departamento
Descripción	El Líder puede consultar todas las evaluaciones registradas en su departamento, con la posibilidad de filtrar por miembro, fecha o criterio.
Actor(es)	Líder, Co-líder
Módulo	Evaluaciones
Prioridad	Alta

RF-22  Edición y Eliminación de Evaluaciones
Descripción	El Líder puede editar o eliminar una evaluación que él mismo haya registrado, siempre que no haya sido notificada al miembro o en un plazo configurable.
Actor(es)	Líder
Módulo	Evaluaciones
Prioridad	Media

RF-23  Visualización de Evaluaciones por el Miembro
Descripción	El miembro con rol Servidor o Coordinador puede consultar el historial de evaluaciones que ha recibido dentro de su departamento: fecha, criterio, calificación y observaciones del líder.
Actor(es)	Servidor, Coordinador
Módulo	Evaluaciones
Prioridad	Alta

RF-24  Historial de Evaluaciones por Miembro
Descripción	El Líder puede acceder al perfil de desempeño de cada miembro: un historial completo de todas las evaluaciones recibidas, con vista de evolución en el tiempo.
Actor(es)	Líder, Co-líder
Módulo	Evaluaciones
Prioridad	Media

RF-25  Criterios de Evaluación Personalizados
Descripción	El Líder puede definir los criterios o aspectos de evaluación para su departamento (ej. Asistencia, Actitud, Cumplimiento de tareas, Crecimiento espiritual). Estos criterios se reutilizan en cada evaluación.
Actor(es)	Líder
Módulo	Evaluaciones
Prioridad	Media

3.6 Módulo de Notificaciones In-App

RF-26  Notificación por Nuevo Evento
Descripción	Cuando se crea un evento global o departamental, el sistema notifica automáticamente a todos los miembros que deben visualizarlo según su rol y departamento.
Actor(es)	Sistema automático
Módulo	Notificaciones
Prioridad	Alta

RF-27  Notificación por Tarea Asignada
Descripción	Cuando se asigna una tarea a un miembro, este recibe una notificación in-app con el título de la tarea y la fecha límite.
Actor(es)	Sistema automático
Módulo	Notificaciones
Prioridad	Alta

RF-28  Notificación por Cambio de Estado de Tarea
Descripción	Cuando el estado de una tarea cambia, el creador de la tarea recibe una notificación informando el nuevo estado.
Actor(es)	Sistema automático
Módulo	Notificaciones
Prioridad	Media

RF-29  Notificación por Nueva Evaluación Recibida
Descripción	Cuando el líder registra una evaluación para un miembro, dicho miembro recibe una notificación in-app indicando que tiene una nueva evaluación disponible.
Actor(es)	Sistema automático
Módulo	Notificaciones
Prioridad	Alta

RF-30  Centro de Notificaciones
Descripción	Cada usuario tiene acceso a un centro de notificaciones donde puede ver todas sus notificaciones ordenadas por fecha, marcarlas como leídas individualmente o marcar todas como leídas.
Actor(es)	Todos los roles
Módulo	Notificaciones
Prioridad	Alta

3.7 Módulo de Usuario y Autenticación

RF-31  Registro e Inicio de Sesión
Descripción	Los usuarios pueden registrarse con correo electrónico y contraseña. El sistema requiere correo único en toda la plataforma. El inicio de sesión se realiza con correo y contraseña.
Actor(es)	Usuarios no registrados
Módulo	Autenticación
Prioridad	Alta

RF-32  Gestión del Perfil de Usuario
Descripción	El usuario puede actualizar su nombre, teléfono y foto de perfil. El correo es inmutable una vez registrado.
Actor(es)	Todos los roles
Módulo	Usuario
Prioridad	Alta

RF-33  Cambio de Contraseña
Descripción	El usuario puede cambiar su contraseña desde su perfil, confirmando la contraseña actual. También puede solicitar recuperación por correo electrónico.
Actor(es)	Todos los roles
Módulo	Autenticación
Prioridad	Alta

RF-34  Selección de Iglesia Activa
Descripción	Un usuario que pertenece a múltiples iglesias puede seleccionar cuál iglesia está consultando en una sesión determinada.
Actor(es)	Todos los roles
Módulo	Usuario
Prioridad	Alta

 
4. Requerimientos No Funcionales

4.1 Rendimiento
ID	Requerimiento	Métrica
RNF-01	Las páginas principales deben cargarse completamente en condiciones normales de red.	Tiempo de carga < 3 segundos
RNF-02	Las consultas al cronograma consolidado del usuario deben responder rápidamente.	Tiempo de respuesta < 1 segundo
RNF-03	El sistema debe soportar usuarios concurrentes activos sin degradación perceptible.	Hasta 500 usuarios simultáneos en MVP

4.2 Seguridad
ID	Requerimiento
RNF-04	Todas las contraseñas deben almacenarse cifradas usando bcrypt con un factor de costo mínimo de 12.
RNF-05	Las sesiones deben gestionarse mediante JWT con tiempo de expiración configurable (máximo 24 horas).
RNF-06	Toda comunicación entre cliente y servidor debe realizarse sobre HTTPS/TLS 1.2 o superior.
RNF-07	El acceso a los datos de una iglesia debe estar completamente restringido a sus miembros autenticados (aislamiento multi-tenancy).
RNF-08	Las acciones críticas (eliminar iglesia, revocar admin) deben requerir confirmación explícita.
RNF-09	El sistema debe implementar protección contra ataques de fuerza bruta bloqueando el acceso tras 5 intentos fallidos consecutivos.

4.3 Usabilidad
ID	Requerimiento
RNF-10	La interfaz debe ser completamente responsive y funcional en dispositivos móviles (resolución mínima 375px de ancho).
RNF-11	El sistema debe estar disponible en idioma español de forma nativa.
RNF-12	El usuario debe poder completar tareas clave (crear evento, asignar tarea, registrar evaluación) en un máximo de 3 pasos.
RNF-13	Los mensajes de error deben ser claros, en español y orientados a la acción correctiva.

4.4 Disponibilidad y Confiabilidad
ID	Requerimiento	Métrica
RNF-14	Disponibilidad del servicio en producción.	99.5% mensual (uptime)
RNF-15	Tiempo máximo de recuperación ante caída del servicio.	RTO < 2 horas
RNF-16	Frecuencia de respaldo de la base de datos.	Diaria con retención de 30 días

4.5 Mantenibilidad y Escalabilidad
ID	Requerimiento
RNF-17	La arquitectura debe permitir agregar nuevas iglesias sin modificaciones en el código ni la base de datos.
RNF-18	El código debe estar documentado con comentarios técnicos en los módulos principales.
RNF-19	El sistema debe estar preparado para escalar horizontalmente su capa de aplicación.

 
5. Reglas de Negocio

ID	Regla de Negocio
RN-01	Un usuario requiere ser miembro activo de una iglesia para acceder a su contenido.
RN-02	Cada departamento tiene exactamente un aula. El aula se crea automáticamente al crear el departamento y no puede eliminarse independientemente.
RN-03	Un evento con alcance 'departamento' siempre debe tener un departamento asociado. Los eventos globales y personales no requieren departamento.
RN-04	Solo el Líder y el Co-líder pueden registrar evaluaciones. El Coordinador y el Servidor no pueden crear ni editar evaluaciones.
RN-05	Un miembro solo puede ver las evaluaciones que le corresponden. No puede ver evaluaciones de otros miembros del departamento.
RN-06	Los criterios de evaluación son definidos por el Líder y son específicos de cada departamento.
RN-07	El Super Administrador no puede acceder a la operación interna de una iglesia (eventos, tareas, aulas) a menos que también sea miembro de esa iglesia.
RN-08	Desactivar un departamento impide el acceso a su aula, eventos y tareas, pero conserva todos sus datos.
RN-09	Una tarea solo puede ser eliminada por su creador o por el Líder del departamento.
RN-10	El estado de una tarea solo puede avanzar en el orden: Pendiente → En Proceso → Completada. No puede retroceder automáticamente.
RN-11	Las notificaciones in-app no se eliminan; solo se marcan como leídas.
RN-12	Un usuario puede pertenecer al mismo tiempo a múltiples departamentos dentro de la misma iglesia con roles distintos en cada uno.

 
6. Alcance del MVP — Incluido y Excluido

6.1 Funcionalidades Incluidas en el MVP
Módulo	Funcionalidad incluida
Multi-Iglesia	Crear iglesias, asignar admins, activar/desactivar iglesias.
Gestión Iglesia	Departamentos, subgrupos, asignación de líderes, eventos globales.
Operativo Departamento	Gestión de miembros, eventos departamentales, tareas con estados, cronograma consolidado.
Aula	Módulos, lecciones, recursos (archivos y enlaces externos).
Evaluaciones	Registro manual de evaluaciones por el líder, criterios personalizados, historial por miembro, visualización por el servidor.
Notificaciones	Notificaciones in-app para eventos, tareas, evaluaciones. Centro de notificaciones.
Usuario	Registro, autenticación, perfil, cambio de contraseña, selección de iglesia activa.

6.2 Funcionalidades Excluidas del MVP
Nota sobre las Exclusiones
Las siguientes funcionalidades están fuera del alcance del primer lanzamiento. Pueden planificarse para versiones futuras.

Funcionalidad excluida	Justificación / Versión sugerida
Confirmación de asistencia a eventos	Requiere lógica adicional de respuesta; se incluirá en v1.1.
Turnos rotativos de servicio	Funcionalidad específica de algunos tipos de departamentos; se evaluará en v1.2.
Seguimiento automático de progreso en el aula	El avance es registrado manualmente por el líder en el módulo de evaluaciones.
Notificaciones externas (correo, SMS, push)	Solo se implementan notificaciones in-app en el MVP.
Autenticación con redes sociales (OAuth)	Se considerará en v1.1 según demanda de usuarios.
Aplicación móvil nativa (iOS / Android)	El MVP es web responsive; las apps nativas se planifican para v2.0.
Reportes y estadísticas avanzadas	Tableros de desempeño departamental se incluirán en v1.2.
Integración con calendarios externos (Google, Outlook)	Se evaluará en v1.1.
Chat o mensajería interna	Fuera del alcance actual; se analizará para versiones futuras.

 

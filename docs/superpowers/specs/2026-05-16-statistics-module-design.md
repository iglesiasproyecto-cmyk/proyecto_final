# Modulo de Estadisticas - Diseno

Fecha: 2026-05-16
Estado: Propuesto y aprobado para planificacion

## 1. Objetivo

Agregar un modulo mixto de estadisticas para IGLESIABD que permita analizar el estado operativo de la iglesia, ministerios, eventos, tareas y aula de formacion desde una vista ejecutiva. El modulo debe estar disponible para todos los roles, filtrando datos segun permisos, y debe permitir exportar reportes en Excel y PDF ejecutivo corporativo.

El dashboard actual conservara un resumen corto de indicadores, mientras que el analisis completo vivira en una ruta dedicada para evitar que `DashboardPage.tsx` siga creciendo.

## 2. Alcance funcional

El modulo tendra una pagina completa de estadisticas con pestanas por dominio:

- Iglesia: usuarios activos e inactivos, miembros, sedes, ministerios, distribucion por rol y crecimiento por periodo.
- Ministerios: ministerios activos, miembros por ministerio, top ministerios por tamano y distribucion por sede o iglesia segun el alcance del usuario.
- Eventos y tareas: eventos por periodo, tareas por estado, tareas completadas, tareas vencidas o proximas y tasa simple de cumplimiento.
- Aula: cursos activos, borradores, inscripciones activas, progreso promedio cuando este disponible, certificados emitidos y cursos con mas inscritos.

La primera version exportara la pestana activa con el rango de fechas seleccionado. Un reporte completo con todas las pestanas queda como extension futura.

## 3. Usuarios y permisos

Cada usuario vera estadisticas filtradas por un `StatisticsScope` calculado desde `usuarioActual`, `rolActual`, `iglesiaActual` y los claims existentes.

- `super_admin`: ve estadisticas globales y puede filtrar por una iglesia especifica.
- `admin_iglesia`: ve estadisticas de su iglesia actual.
- `admin_sede`: ve estadisticas de su sede asignada cuando los datos soporten ese alcance.
- `lider`: ve datos asociados a sus ministerios, cursos y tareas.
- `servidor`: ve metricas personales y de su participacion.

Las exportaciones deben usar exactamente el mismo dataset visible en pantalla. Ningun rol puede exportar datos fuera de su alcance.

## 4. Rutas y navegacion

Se agregara una ruta dedicada al modulo:

- Global: `/app/global/estadisticas`
- Tenant: `/app/:idIglesia/estadisticas`

El sidebar mostrara un item `Estadisticas` para todos los roles. La ruta global sera usada por `super_admin`; los demas roles usaran la ruta tenant correspondiente.

El dashboard mostrara un resumen compacto con 3 o 4 KPIs y un boton `Ver estadisticas` que lleva a la pagina completa.

## 5. Arquitectura propuesta

La solucion debe ser incremental e hibrida: rapida de implementar con datos actuales, pero preparada para migrar a consultas agregadas o RPC de Supabase sin rehacer la UI.

Componentes y modulos:

- `StatisticsPage.tsx`: pagina principal con encabezado, filtros, pestanas, KPIs, graficos y acciones de exportacion.
- `StatisticsSummaryCard.tsx`: resumen compacto reutilizable en dashboards existentes.
- `statistics.service.ts`: capa para obtener y preparar datos estadisticos. Puede reutilizar consultas existentes o hacer consultas dedicadas segun el dominio.
- `useStatistics.ts`: hook que recibe alcance del usuario, pestana activa y rango temporal. Devuelve KPIs, series, tablas, estado de carga y errores.
- `statisticsExport.service.ts`: genera Excel y PDF desde el mismo `ReportDataset` usado por la UI.
- `statistics.types.ts`: define tipos como `StatisticsScope`, `DateRange`, `StatisticsDomain`, `KpiCard`, `ChartSeries` y `ReportDataset`.

El calculo de metricas debe mantenerse fuera de los componentes de pagina para no duplicar logica entre UI y exportaciones.

## 6. UI y experiencia

La pagina tendra una presentacion ejecutiva y corporativa, alineada con el estilo actual de tarjetas con bordes redondeados, fondos `bg-card/55`, blur sutil, gradientes discretos y graficos limpios.

Estructura:

- Header con titulo `Estadisticas`, subtitulo de alcance y rango actual, y boton `Exportar`.
- Filtros de rango: `Este mes`, `Ultimos 3 meses`, `Ultimos 12 meses` y `Personalizado`.
- Selector de iglesia para `super_admin`: `Todas` o una iglesia especifica.
- KPIs destacados al inicio de la pagina.
- Pestanas: `Iglesia`, `Ministerios`, `Eventos y Tareas`, `Aula`.
- Cada pestana tendra 2 o 3 graficos y una tabla resumida.
- Estados de loading con skeletons, estados vacios y errores recuperables por pestana.

El dashboard no duplicara toda la pagina. Solo mostrara indicadores principales y acceso rapido al modulo.

## 7. Reportes y exportacion

El boton `Exportar` tendra dos salidas:

- Excel `.xlsx`: reporte operativo para analisis, con KPIs, tablas resumidas y datos base de la pestana actual. Debe permitir ordenar y filtrar fuera de la aplicacion.
- PDF ejecutivo: reporte presentable para liderazgo, con portada, nombre de iglesia/sede/ministerio segun alcance, rango de fechas, KPIs principales, graficos clave, conclusiones rapidas y tablas breves.

El PDF debe priorizar claridad y presentacion corporativa sobre detalle exhaustivo. No debe ser un volcado masivo de tablas.

Ambas exportaciones respetan filtros activos, rol del usuario y alcance actual.

## 8. Datos y metricas iniciales

Las metricas iniciales deben aprovechar datos existentes y evitar nuevas tablas en la primera version.

Iglesia:

- Usuarios totales.
- Usuarios activos.
- Miembros.
- Sedes activas.
- Distribucion por roles.
- Crecimiento de usuarios por periodo cuando exista fecha confiable.

Ministerios:

- Ministerios activos.
- Miembros por ministerio.
- Top ministerios por tamano.
- Distribucion por sede o iglesia segun alcance.

Eventos y tareas:

- Eventos por periodo.
- Tareas por estado.
- Tareas completadas.
- Tareas vencidas o proximas.
- Tasa simple de cumplimiento.

Aula:

- Cursos activos.
- Cursos en borrador.
- Inscripciones activas.
- Progreso promedio si los datos estan disponibles.
- Certificados emitidos.
- Cursos con mas inscritos.

Reglas de fecha:

- El rango temporal aplica a entidades con fecha clara: eventos, tareas, inscripciones, cursos, certificados y usuarios si tienen fecha de creacion disponible.
- Las metricas estructurales sin fecha confiable se muestran como snapshot actual.
- Si una metrica no puede calcularse por falta de datos, se muestra como `No disponible`, no como cero falso.

## 9. Manejo de errores

Los errores deben aislarse por dominio. Si falla la consulta de Aula, las pestanas de Iglesia, Ministerios y Eventos/Tareas deben seguir funcionando si sus datos estan disponibles.

La UI mostrara:

- Skeletons mientras carga.
- Estado vacio cuando no haya datos para el filtro aplicado.
- Mensaje recuperable cuando una consulta falle.
- `No disponible` para metricas que no tienen datos suficientes.

## 10. Verificacion

No hay comandos de test o lint configurados. La verificacion minima para la implementacion sera:

- Ejecutar `npm run build`.
- Revisar manualmente las rutas global y tenant.
- Verificar al menos los roles `super_admin`, `admin_iglesia`, `lider` y `servidor`.
- Confirmar que Excel y PDF exportan los mismos datos visibles en pantalla.

## 11. Fuera de alcance inicial

- Reporte completo con todas las pestanas en una sola exportacion.
- Comparativas automaticas contra periodo anterior.
- Tendencias avanzadas con predicciones.
- Nuevas tablas de auditoria o snapshots historicos.
- RPC o vistas SQL obligatorias desde el primer release.

Estas extensiones pueden agregarse despues de validar la utilidad del modulo inicial.

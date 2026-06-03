# Finanzas Responsive Design

## Objetivo

Mejorar la responsividad de todas las pantallas de finanzas del modulo de eventos para que funcionen correctamente en moviles pequenos, tablets y desktop.

## Alcance

- `src/app/components/EventoPresupuestoDrawer.tsx`
- La pestana `Finanzas` dentro de `src/app/components/EventsPage.tsx`
- Componentes y estilos internos relacionados con resumen financiero, filtros, tarjetas de eventos, items de presupuesto y totales.

## Problema Actual

En pantallas pequenas el drawer de presupuesto queda demasiado angosto visualmente, con contenido comprimido y mucho espacio lateral sin usar. Los items financieros tienen columnas que no se adaptan bien y los controles de accion quedan pequenos para uso tactil.

## Diseno Aprobado

### Drawer de presupuesto

- En movil, ocupar el ancho completo disponible con altura de viewport dinamica.
- Usar scroll interno para evitar que el contenido quede cortado.
- Mantener header compacto con balance visible sin invadir el titulo.
- Convertir los grupos `Planeado`, `Real` y `Diferencia` a grid de una columna en movil y tres columnas desde `sm`.
- Mantener los botones editar/eliminar accesibles y con area tactil suficiente.
- Hacer que `Agregar item` ocupe todo el ancho en movil.

### Tabs de ingresos y egresos

- Tabs de ancho completo en movil.
- Altura tactil suficiente.
- Texto e iconos centrados.
- Sin desbordes horizontales.

### Totales

- Bloque de totales apilado en movil.
- Valores alineados y truncados de forma segura si hay montos largos.
- Mantener layout compacto en desktop.

### Pestana Finanzas

- KPIs en grid responsive: una columna en movil, dos en tablet, cuatro en desktop cuando aplique.
- Filtros de ministerio y mes apilados en movil y alineados en desktop.
- Lista de eventos como cards verticales en movil y layout horizontal desde tablet.
- Preservar la logica actual de presupuesto y resumen; solo cambiar estructura responsive y clases.

## No Objetivos

- No cambiar calculos financieros.
- No cambiar consultas Supabase.
- No redisenar todo el modulo de eventos.
- No agregar nuevas dependencias.

## Verificacion

- Revisar visualmente en anchos aproximados de 360px, 768px y desktop.
- Ejecutar build de Vite.
- Confirmar que las acciones existentes de presupuesto siguen visibles y usables.

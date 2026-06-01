# Workflows de desarrollo

## Principios de contribucion

- Cambios pequenos, iterativos y verificables.
- Una responsabilidad clara por PR.
- Tipos primero: no romper contratos TypeScript.
- Sincronizar documentacion cuando cambie el comportamiento.

## Flujo 1: agregar o modificar una pagina

1. Identificar layout de destino (global o tenant).
2. Crear/ajustar componente en `src/app/components/`.
3. Registrar ruta en `src/app/routes.ts`.
4. Conectar datos via `hooks`/`services`.
5. Validar estados de carga, vacio y error.

## Flujo 2: agregar logica de dominio

1. Crear/actualizar servicio en `src/services/<dominio>.service.ts`.
2. Exponer hook de consumo en `src/hooks/use<Domino>.ts`.
3. Mantener mapeo consistente de tipos entre backend y UI.
4. Evitar consultas directas desde componentes si ya existe servicio.

## Flujo 3: cambios en rutas/autorizacion

1. Revisar impacto en `GlobalLayout` vs `TenantLayout`.
2. Confirmar redirects y fallback (`*` y rutas index).
3. Verificar accesos por rol en escenarios principales.
4. Probar navegacion manual completa del modulo afectado.

## Flujo 4: cambios de UI de alto impacto

1. Preservar consistencia visual con `theme.css`.
2. Evitar deuda de estilos inline cuando puede vivir en sistema de tema.
3. Revisar responsive en desktop y mobile.
4. Confirmar accesibilidad basica (foco, etiquetas, contraste).

## Checklist minimo antes de merge

```bash
npm run typecheck
npm run build
```

Si cambia flujo critico, ejecutar E2E:

```bash
npm run test:e2e
```

## Criterios de calidad esperados

- Sin errores TypeScript.
- Sin regresiones de navegacion.
- Mensajes de error utiles para usuario final.
- Documentacion actualizada si se altera arquitectura o proceso.

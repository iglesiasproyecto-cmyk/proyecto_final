# Guia de contribucion

Gracias por contribuir a IGLESIABD. Esta guia define el flujo recomendado para mantener calidad tecnica y consistencia del proyecto.

## Alcance

Esta guia aplica a cambios de frontend, integracion con servicios, ajustes de rutas y documentacion tecnica.

## Requisitos

- Node.js 20+
- npm 10+
- Git

## Flujo recomendado

1. Crea una rama descriptiva desde el estado mas reciente del repositorio.
2. Implementa cambios pequenos y enfocados en una sola responsabilidad.
3. Mantiene contratos de tipos al tocar `services`, `hooks` o `types`.
4. Actualiza documentacion cuando cambie el comportamiento o arquitectura.
5. Verifica el proyecto localmente antes de abrir PR.

## Estandares de codigo

- Prioriza claridad sobre complejidad innecesaria.
- Evita mezclar refactor no relacionado en PR funcional.
- Reutiliza patrones existentes de rutas, hooks y servicios.
- Mantiene el dominio funcional consistente en nombres y estructura.

## Verificaciones minimas obligatorias

Ejecuta siempre:

```bash
npm run typecheck
npm run build
```

Si el cambio impacta flujos criticos de interfaz o navegacion, ejecuta ademas:

```bash
npm run test:e2e
```

## Estructura de PR sugerida

- Contexto breve del problema.
- Solucion implementada.
- Modulos/rutas afectadas.
- Riesgos y mitigaciones.
- Evidencia de verificacion (comandos ejecutados).

## Checklist antes de abrir PR

- [ ] Cambios limitados al alcance definido.
- [ ] `npm run typecheck` sin errores.
- [ ] `npm run build` exitoso.
- [ ] E2E ejecutado si aplica.
- [ ] Documentacion actualizada.

## Documentacion de apoyo

- `README.md`
- `docs/developer/README.md`
- `docs/developer/GETTING_STARTED.md`
- `docs/developer/ARCHITECTURE.md`
- `docs/developer/WORKFLOWS.md`
- `docs/developer/SUPABASE_STATUS.md`

## Convencion de commits (recomendada)

Usa prefijos semanticos cortos para facilitar lectura del historial:

- `feat:` nueva funcionalidad
- `fix:` correccion de bug
- `refactor:` mejora interna sin cambiar comportamiento
- `docs:` cambios en documentacion
- `chore:` tareas de mantenimiento

Ejemplo:

```text
docs: agrega guia de contribucion para desarrolladores
```

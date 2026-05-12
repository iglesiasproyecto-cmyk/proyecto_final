# 🔍 AUDITORÍA COMPLETA - IGLESIABD

**Fecha:** 2026-05-12  
**Status:** 🔴 **MULTIPLE ISSUES FOUND**  
**Prioridad:** ALTA

---

## 📊 RESUMEN

| Categoría | Problemas | Estado |
|-----------|-----------|--------|
| Servicios | 2 críticos | 🔴 |
| Componentes | 0 críticos | ✅ |
| Rutas | 0 críticos | ✅ |
| Build | 0 errores | ✅ |
| Datos | 2 servicios | 🔴 |

---

## 🔴 PROBLEMAS CRÍTICOS

### PROBLEMA 1: aula.service.ts - deleted_at query en tabla SIN esa columna

**Ubicación:** `src/services/aula.service.ts:107`

```typescript
export async function getCursosParaUsuario(): Promise<AulaCursoEnriquecido[]> {
  const { data, error } = await supabase
    .from('aula_curso')
    .select(...)
    .is('deleted_at', null)  // ❌ COLUMNA NO EXISTE
    .order('creado_en', { ascending: false })
```

**Estructura real de aula_curso:**
```
Columnas: id_aula_curso, id_ministerio, titulo, descripcion, estado, creado_en, updated_at
NO TIENE: deleted_at
SÍ TIENE: estado (borrador, activo, archivado)
```

**Impacto:**
- ❌ Error 400 "column does not exist: deleted_at" en Supabase
- ❌ getCursosParaUsuario() falla silenciosamente
- ❌ Imposible ver cursos en AdminAulaPage, AulaPage, LiderAulaPage
- ❌ Imposible enrollarse en cursos

**Solución:**
```typescript
// Cambiar de:
.is('deleted_at', null)

// A:
.eq('estado', 'activo')
```

---

### PROBLEMA 2: inscripciones.service.ts - deleted_at en aula_curso

**Ubicación:** `src/services/inscripciones.service.ts:82`

```typescript
export async function getCandidatosInscripcionCurso(idAulaCurso: number) {
  const { data: curso, error: cursoError } = await supabase
    .from('aula_curso')
    .select('id_aula_curso, id_ministerio')
    .eq('id_aula_curso', idAulaCurso)
    .is('deleted_at', null)  // ❌ MISMO PROBLEMA
```

**Impacto:**
- ❌ No puede obtener candidatos para inscripción
- ❌ AdminAulaPage no puede invitar usuarios a cursos

**Solución:**
```typescript
.eq('estado', 'activo')
```

---

## 🟡 PROBLEMAS SECUNDARIOS

### PROBLEMA 3: Datos enriquecidos incompletos

**Ubicación:** Múltiples servicios

**Funciones enriquecidas identificadas:**
1. `getMinisteriosEnriquecidos()` - ✅ Completo
2. `getUsuariosEnriquecidos()` - ✅ FIJO (ministerios con nombres)
3. `getEventosEnriquecidos()` - ⚠️ Revisar
4. `getCursosParaUsuario()` - ⚠️ Revisar
5. `getPastoresEnriquecidos()` - ⚠️ Revisar
6. `getMiembrosMinisterioEnriquecidos()` - ⚠️ Revisar

**Acción:** Revisar cada una para verificar que incluyen JOINs necesarios

---

## ✅ LO QUE ESTÁ BIEN

### Compilación
- ✅ Build exitoso sin errores de TypeScript
- ⚠️ Warning de bundle size (no crítico)

### Rutas
- ✅ 35 componentes página identificados
- ✅ Rutas protegidas por rol
- ✅ Enrutamiento parece correcto

### Componentes Principales
```
✅ LoginPage - Autenticación
✅ DashboardPage - Dashboard por rol (incluyendo AdminSedeDashboard)
✅ UsuariosPage - Gestión de usuarios (FIJO)
✅ MinisteriosPage - Gestión de ministerios
✅ EventsPage - Eventos
✅ TasksPage - Tareas
✅ AulaPage / AdminAulaPage - Cursos (BROKEN)
✅ ProfilePage - Perfil de usuario
✅ + 27 componentes más
```

### Servicios Correctos
- ✅ usuarios.service.ts - FIJO
- ✅ ministerios.service.ts - FIJO
- ✅ iglesias.service.ts - FIJO
- ✅ eventos.service.ts - Aparentemente OK
- ✅ email.service.ts - Envío de emails
- ✅ notificaciones.service.ts - Sistema de notificaciones

---

## 📋 PLAN DE CORRECCIÓN

### CRÍTICO (Hacer AHORA)

**Tarea 1: Fijar aula.service.ts**
- [ ] Cambiar `.is('deleted_at', null)` → `.eq('estado', 'activo')`
- [ ] Verificar que getCursosParaUsuario() funciona
- [ ] Test en AdminAulaPage
- Tiempo: **5 minutos**

**Tarea 2: Fijar inscripciones.service.ts**
- [ ] Cambiar `.is('deleted_at', null)` → `.eq('estado', 'activo')`
- [ ] Test de inscripción a curso
- Tiempo: **5 minutos**

### IMPORTANTE (Esta semana)

**Tarea 3: Revisar funciones enriquecidas**
- [ ] getEventosEnriquecidos() - Verificar JOINs completos
- [ ] getPastoresEnriquecidos() - Verificar datos
- [ ] getCursosParaUsuario() - Verificar datos enriquecidos
- Tiempo: **20 minutos**

**Tarea 4: Auditar otros servicios**
- [ ] aula.service.ts - Review completo
- [ ] evaluaciones.service.ts - Review completo
- [ ] hojaDeVida.service.ts - Review completo
- Tiempo: **30 minutos**

### OPCIONAL (Mejoras futuras)

**Tarea 5: Agregar tests**
- [ ] Tests para servicios principales
- [ ] Tests para operaciones CRUD
- [ ] Tests de RLS

**Tarea 6: Documentar funciones**
- [ ] JSDoc para todas las funciones de servicio
- [ ] Especificar parámetros y retorno

---

## 🔍 CHECKLIST DE VERIFICACIÓN

Después de aplicar las correcciones:

### Build
- [ ] `npm run build` sin errores

### Funcionalidad
- [ ] Login con todos los roles funciona
- [ ] AdminAulaPage carga sin errores
- [ ] Puede ver lista de cursos
- [ ] Puede invitar usuarios a curso
- [ ] Puede enrollar usuario en curso
- [ ] Dashboard de cada rol carga correctamente
- [ ] UsuariosPage muestra usuarios correctamente

### Console
- [ ] No hay errores 400 en red
- [ ] No hay "ReferenceError"
- [ ] No hay "Cannot read property"

---

## 📌 COMANDOS PARA APLICAR CORRECCIONES

```bash
# 1. Fijar aula.service.ts
sed -i "s/\.is('deleted_at', null)/.eq('estado', 'activo')/" src/services/aula.service.ts

# 2. Fijar inscripciones.service.ts
sed -i "s/\.is('deleted_at', null)/.eq('estado', 'activo')/" src/services/inscripciones.service.ts

# 3. Verificar build
npm run build

# 4. Commit
git add src/services/aula.service.ts src/services/inscripciones.service.ts
git commit -m "fix: replace deleted_at with estado filter in aula_curso queries"
```

---

**Próximo paso:** ✅ Aplicar correcciones críticas

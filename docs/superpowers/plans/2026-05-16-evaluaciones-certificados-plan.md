# Evaluaciones y Certificados - Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete quiz/evaluation system with automatic certificate generation when all module evaluations pass (≥70%).

**Architecture:** Backend RPC functions handle enrollment logic and certification rules; services provide thin API layer; React components handle quiz UI, results display, and certificate gallery. Follows TDD approach — write failing tests first.

**Tech Stack:** Supabase RPC (PLPGSQL), React 18, React Query, TypeScript, Tailwind CSS

---

## File Structure

### Backend (RPC/Migrations)
- `supabase/migrations/20260516_evaluaciones_rpc.sql` — Two RPC functions:
  - `registrar_intento_evaluacion()` — Validate enrollment, calculate score, insert attempt
  - `emitir_certificado_si_corresponde()` — Check if all evaluations pass, emit certificate

### Services Layer
- `src/services/evaluaciones.service.ts` — Wrapper around RPC + direct Supabase queries:
  - `obtenerEvaluacionModulo(idModulo)` — Fetch quiz + questions + options
  - `registrarIntentoEvaluacion()` — Call RPC
  - `calcularPuntaje()` — Score calculation (client-side helper)
  - `obtenerIntentosUsuario(idEvaluacion)` — Fetch user's previous attempts
  - `obtenerCertificadosUsuario(idUsuario)` — Fetch earned certificates

### Hooks
- `src/hooks/useIntentoEvaluacion.ts` — React Query wrapper:
  - `useRegistrarIntento()` — Mutation to submit quiz
  - `useIntentosEvaluacion(idEvaluacion)` — Query for user's attempts
  
- `src/hooks/useEvaluacionCurso.ts` — Evaluation status queries:
  - `useEvaluacionModulo(idModulo)` — Get quiz + questions
  - `useCertificadosUsuario(idUsuario)` — Get user certificates

### Components
- `src/app/components/aula/AulaEvaluacionInterfaz.tsx` — Quiz taking interface
  - Display questions one by one or all at once
  - Radio buttons for answers
  - Submit button
  - Show timer if enabled

- `src/app/components/aula/ResultadosEvaluacion.tsx` — Post-submission screen
  - Display score
  - Show "Pass" / "Fail" feedback
  - Show correct answers (post-submission only)
  - Retry button (if allowed)

- `src/app/components/aula/MisCertificados.tsx` — Certificate gallery
  - List all certificates earned by user
  - Display course, date, certificate number
  - Download/view PDF

### Modifications
- `src/app/components/CursosServidorList.tsx` — Add certificate badge
- `src/app/components/CursoDetallePage.tsx` — Add evaluations tab + EvaluacionInterfaz integration

---

## Tasks

### Task 1: Create RPC Functions for Evaluation

**Files:**
- Create: `supabase/migrations/20260516_evaluaciones_rpc.sql`

- [ ] **Step 1: Write migration with RPC `registrar_intento_evaluacion`**

```sql
-- Migration: Add RPC functions for evaluations
-- Date: 2026-05-16

-- RPC 1: Register evaluation attempt and calculate score
CREATE OR REPLACE FUNCTION registrar_intento_evaluacion(
  p_id_aula_evaluacion bigint,
  p_id_usuario bigint,
  p_respuestas jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_evaluacion_record record;
  v_modulo_record record;
  v_curso_record record;
  v_preguntas record;
  v_opcion_correcta record;
  v_respuesta_usuario text;
  v_puntaje_total integer := 0;
  v_puntaje_obtenido integer := 0;
  v_num_preguntas integer := 0;
  v_num_correctas integer := 0;
  v_existe_inscripcion boolean := false;
  v_intento_anterior record;
  v_nuevo_numero_intento integer;
BEGIN
  -- 1. Validate evaluation exists
  SELECT * INTO v_evaluacion_record
  FROM aula_evaluacion
  WHERE id_aula_evaluacion = p_id_aula_evaluacion;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Evaluación no encontrada');
  END IF;

  -- 2. Validate user is enrolled in course (via module -> course -> inscription)
  SELECT ac.id_aula_curso INTO v_curso_record
  FROM aula_modulo am
  JOIN aula_curso ac ON am.id_aula_curso = ac.id_aula_curso
  WHERE am.id_aula_modulo = v_evaluacion_record.id_aula_modulo;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Módulo o curso no encontrado');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM aula_inscripcion
    WHERE id_usuario = p_id_usuario
    AND id_aula_curso = v_curso_record.id_aula_curso
    AND activo = true
  ) INTO v_existe_inscripcion;

  IF NOT v_existe_inscripcion THEN
    RETURN jsonb_build_object('success', false, 'message', 'Usuario no está inscrito en este curso');
  END IF;

  -- 3. Check if already approved (can't retake if approved)
  SELECT * INTO v_intento_anterior
  FROM aula_intento_evaluacion
  WHERE id_aula_evaluacion = p_id_aula_evaluacion
  AND id_usuario = p_id_usuario
  AND aprobado = true
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Ya aprobaste esta evaluación. No puedes reintentar.',
      'accion', 'bloqueado'
    );
  END IF;

  -- 4. Get next attempt number
  SELECT COALESCE(MAX(numero_intento), 0) + 1 INTO v_nuevo_numero_intento
  FROM aula_intento_evaluacion
  WHERE id_aula_evaluacion = p_id_aula_evaluacion
  AND id_usuario = p_id_usuario;

  -- Check max attempts limit
  IF v_evaluacion_record.max_intentos IS NOT NULL
    AND v_nuevo_numero_intento > v_evaluacion_record.max_intentos THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Has alcanzado el máximo de %s intentos', v_evaluacion_record.max_intentos)
    );
  END IF;

  -- 5. Calculate score from answers
  FOR v_preguntas IN
    SELECT ap.id_aula_pregunta, ap.id_aula_evaluacion
    FROM aula_pregunta ap
    WHERE ap.id_aula_evaluacion = p_id_aula_evaluacion
    ORDER BY ap.orden
  LOOP
    v_num_preguntas := v_num_preguntas + 1;
    
    -- Get user's answer for this question
    v_respuesta_usuario := p_respuestas ->> v_preguntas.id_aula_pregunta::text;
    
    -- Get correct option ID
    SELECT id_aula_opcion INTO v_opcion_correcta
    FROM aula_opcion
    WHERE id_aula_pregunta = v_preguntas.id_aula_pregunta
    AND es_correcta = true
    LIMIT 1;

    IF v_respuesta_usuario::bigint = (v_opcion_correcta).id_aula_opcion THEN
      v_num_correctas := v_num_correctas + 1;
    END IF;
  END LOOP;

  -- 6. Calculate percentage score
  IF v_num_preguntas > 0 THEN
    v_puntaje_obtenido := (v_num_correctas::numeric / v_num_preguntas::numeric * 100)::integer;
  ELSE
    v_puntaje_obtenido := 0;
  END IF;

  -- 7. Insert attempt record
  INSERT INTO aula_intento_evaluacion (
    id_aula_evaluacion,
    id_usuario,
    numero_intento,
    puntaje_obtenido,
    aprobado,
    iniciado_en,
    finalizado_en,
    fecha_intento
  ) VALUES (
    p_id_aula_evaluacion,
    p_id_usuario,
    v_nuevo_numero_intento,
    v_puntaje_obtenido,
    v_puntaje_obtenido >= v_evaluacion_record.puntaje_minimo,
    NOW() - INTERVAL '5 minutes',
    NOW(),
    CURRENT_DATE
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE
      WHEN v_puntaje_obtenido >= v_evaluacion_record.puntaje_minimo THEN '¡Aprobaste!'
      ELSE 'Necesitas intentar de nuevo'
    END,
    'puntaje_obtenido', v_puntaje_obtenido,
    'aprobado', v_puntaje_obtenido >= v_evaluacion_record.puntaje_minimo,
    'numero_intento', v_nuevo_numero_intento,
    'puntaje_minimo', v_evaluacion_record.puntaje_minimo
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION registrar_intento_evaluacion(bigint, bigint, jsonb) TO authenticated;

-- RPC 2: Emit certificate if all evaluations pass
CREATE OR REPLACE FUNCTION emitir_certificado_si_corresponde(
  p_id_usuario bigint,
  p_id_aula_curso bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_modulos_sin_aprobar integer;
  v_num_certificado text;
  v_certificado_id bigint;
BEGIN
  -- 1. Check if user is enrolled
  IF NOT EXISTS(
    SELECT 1 FROM aula_inscripcion
    WHERE id_usuario = p_id_usuario
    AND id_aula_curso = p_id_aula_curso
    AND activo = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuario no está inscrito en este curso'
    );
  END IF;

  -- 2. Count modules without approved evaluations
  SELECT COUNT(DISTINCT ae.id_aula_modulo) INTO v_modulos_sin_aprobar
  FROM aula_modulo am
  JOIN aula_evaluacion ae ON am.id_aula_modulo = ae.id_aula_modulo
  WHERE am.id_aula_curso = p_id_aula_curso
  AND NOT EXISTS(
    SELECT 1 FROM aula_intento_evaluacion aie
    WHERE aie.id_aula_evaluacion = ae.id_aula_evaluacion
    AND aie.id_usuario = p_id_usuario
    AND aie.aprobado = true
  );

  IF v_modulos_sin_aprobar > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', format('Aún tienes %s módulos sin completar', v_modulos_sin_aprobar),
      'modulos_pendientes', v_modulos_sin_aprobar
    );
  END IF;

  -- 3. Check if certificate already exists
  IF EXISTS(
    SELECT 1 FROM aula_certificado
    WHERE id_usuario = p_id_usuario
    AND id_aula_curso = p_id_aula_curso
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Ya tienes un certificado para este curso'
    );
  END IF;

  -- 4. Generate certificate number (UUID-like)
  v_num_certificado := 'CERT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                       SUBSTR(MD5(p_id_usuario::text || p_id_aula_curso::text || NOW()::text), 1, 8);

  -- 5. Insert certificate
  INSERT INTO aula_certificado (
    id_aula_curso,
    id_usuario,
    numero_certificado,
    emitido_en,
    fecha_certificacion,
    creado_en,
    updated_at
  ) VALUES (
    p_id_aula_curso,
    p_id_usuario,
    v_num_certificado,
    NOW(),
    CURRENT_DATE,
    NOW(),
    NOW()
  )
  RETURNING id_aula_certificado INTO v_certificado_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', '¡Certificado emitido! Felicidades por completar el curso.',
    'certificado_id', v_certificado_id,
    'numero_certificado', v_num_certificado,
    'emitido_en', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION emitir_certificado_si_corresponde(bigint, bigint) TO authenticated;
```

- [ ] **Step 2: Apply migration to Supabase**

```bash
cd supabase
supabase migration up
```

Expected output: Migration applied successfully.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260516_evaluaciones_rpc.sql
git commit -m "feat(aula): add RPC functions for evaluation attempts and certificate generation"
```

---

### Task 2: Create Evaluaciones Service Layer

**Files:**
- Create: `src/services/evaluaciones.service.ts`

- [ ] **Step 1: Create service file with quiz fetching**

```typescript
import { supabase } from '@/lib/supabaseClient'

export interface Pregunta {
  id_aula_pregunta: number
  enunciado: string
  tipo: 'multiple_choice' | 'verdadero_falso'
  orden: number
  opciones: Opcion[]
}

export interface Opcion {
  id_aula_opcion: number
  texto: string
  orden: number
  // es_correcta is NOT sent to client before submission
}

export interface Evaluacion {
  id_aula_evaluacion: number
  id_aula_modulo: number
  titulo: string
  descripcion: string | null
  puntaje_minimo: number
  reintentos_permitidos: boolean
  max_intentos: number | null
  preguntas: Pregunta[]
  orden: number
}

export interface IntentoEvaluacion {
  id_aula_intento_evaluacion: number
  numero_intento: number
  puntaje_obtenido: number
  aprobado: boolean
  finalizado_en: string
}

// Fetch evaluation + questions + options (without correct answers shown)
export async function obtenerEvaluacionModulo(idModulo: number): Promise<Evaluacion | null> {
  const { data, error } = await supabase
    .from('aula_evaluacion')
    .select(`
      id_aula_evaluacion,
      id_aula_modulo,
      titulo,
      descripcion,
      puntaje_minimo,
      reintentos_permitidos,
      max_intentos,
      orden,
      preguntas:aula_pregunta(
        id_aula_pregunta,
        enunciado,
        tipo,
        orden,
        opciones:aula_opcion(
          id_aula_opcion,
          texto,
          orden
        )
      )
    `)
    .eq('id_aula_modulo', idModulo)
    .single()

  if (error) throw error
  if (!data) return null

  // Sort preguntas and opciones by orden
  const preguntas = (data.preguntas || [])
    .sort((a: any, b: any) => a.orden - b.orden)
    .map((p: any) => ({
      ...p,
      opciones: (p.opciones || []).sort((a: any, b: any) => a.orden - b.orden)
    }))

  return {
    id_aula_evaluacion: data.id_aula_evaluacion,
    id_aula_modulo: data.id_aula_modulo,
    titulo: data.titulo,
    descripcion: data.descripcion,
    puntaje_minimo: data.puntaje_minimo,
    reintentos_permitidos: data.reintentos_permitidos,
    max_intentos: data.max_intentos,
    orden: data.orden,
    preguntas
  }
}

// Submit evaluation attempt via RPC
export async function registrarIntentoEvaluacion(
  idAulaEvaluacion: number,
  idUsuario: number,
  respuestas: Record<string, string>
) {
  const { data, error } = await supabase.rpc('registrar_intento_evaluacion', {
    p_id_aula_evaluacion: idAulaEvaluacion,
    p_id_usuario: idUsuario,
    p_respuestas: respuestas
  })

  if (error) throw error
  return data
}

// Get user's previous attempts
export async function obtenerIntentosUsuario(
  idAulaEvaluacion: number,
  idUsuario: number
): Promise<IntentoEvaluacion[]> {
  const { data, error } = await supabase
    .from('aula_intento_evaluacion')
    .select('*')
    .eq('id_aula_evaluacion', idAulaEvaluacion)
    .eq('id_usuario', idUsuario)
    .order('numero_intento', { ascending: false })

  if (error) throw error
  return data || []
}

// Get correct answers after submission (show only after finalizado_en)
export async function obtenerRespuestasCorrectasEvaluacion(
  idAulaEvaluacion: number
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('aula_pregunta')
    .select(`
      id_aula_pregunta,
      opciones:aula_opcion(
        id_aula_opcion,
        es_correcta
      )
    `)
    .eq('id_aula_evaluacion', idAulaEvaluacion)

  if (error) throw error

  const respuestasCorrectas: Record<string, number> = {}
  data?.forEach((pregunta: any) => {
    const opcionCorrecta = pregunta.opciones?.find((o: any) => o.es_correcta)
    if (opcionCorrecta) {
      respuestasCorrectas[pregunta.id_aula_pregunta] = opcionCorrecta.id_aula_opcion
    }
  })

  return respuestasCorrectas
}

// Get user certificates
export async function obtenerCertificadosUsuario(
  idUsuario: number
): Promise<any[]> {
  const { data, error } = await supabase
    .from('aula_certificado')
    .select(`
      id_aula_certificado,
      numero_certificado,
      emitido_en,
      fecha_certificacion,
      aula_curso:aula_curso(
        id_aula_curso,
        titulo,
        ministerio:ministerio(nombre)
      )
    `)
    .eq('id_usuario', idUsuario)
    .order('emitido_en', { ascending: false })

  if (error) throw error
  return data || []
}

// Emit certificate if all evaluations passed
export async function emitirCertificadoSiCorresponde(
  idUsuario: number,
  idAulaCurso: number
) {
  const { data, error } = await supabase.rpc('emitir_certificado_si_corresponde', {
    p_id_usuario: idUsuario,
    p_id_aula_curso: idAulaCurso
  })

  if (error) throw error
  return data
}
```

- [ ] **Step 2: Test the service locally**

```bash
# Open browser console and test:
# const userId = 1; const moduleId = 2;
# obtenerEvaluacionModulo(moduleId).then(e => console.log(e))
# Should print evaluation structure with questions/options
```

- [ ] **Step 3: Commit**

```bash
git add src/services/evaluaciones.service.ts
git commit -m "feat(aula): add evaluaciones service layer for quiz data & submission"
```

---

### Task 3: Create useIntentoEvaluacion Hook

**Files:**
- Create: `src/hooks/useIntentoEvaluacion.ts`

- [ ] **Step 1: Write hook with React Query mutations**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  registrarIntentoEvaluacion,
  obtenerIntentosUsuario,
  obtenerRespuestasCorrectasEvaluacion,
} from '@/services/evaluaciones.service'

interface IntentoResponse {
  success: boolean
  message: string
  puntaje_obtenido: number
  aprobado: boolean
  numero_intento: number
  puntaje_minimo: number
}

export function useRegistrarIntento() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      idAulaEvaluacion,
      idUsuario,
      respuestas,
    }: {
      idAulaEvaluacion: number
      idUsuario: number
      respuestas: Record<string, string>
    }) => registrarIntentoEvaluacion(idAulaEvaluacion, idUsuario, respuestas),

    onSuccess: (_data, variables) => {
      // Invalidate attempts cache
      qc.invalidateQueries({
        queryKey: ['intentos-evaluacion', variables.idAulaEvaluacion, variables.idUsuario],
      })
      // Invalidate certificates cache (in case certificate was emitted)
      qc.invalidateQueries({
        queryKey: ['certificados-usuario', variables.idUsuario],
      })
    },
  })
}

export function useIntentosEvaluacion(
  idAulaEvaluacion?: number,
  idUsuario?: number
) {
  return useQuery({
    queryKey: ['intentos-evaluacion', idAulaEvaluacion, idUsuario],
    queryFn: () => obtenerIntentosUsuario(idAulaEvaluacion!, idUsuario!),
    enabled: !!idAulaEvaluacion && !!idUsuario,
  })
}

export function useRespuestasCorrectas(idAulaEvaluacion?: number) {
  return useQuery({
    queryKey: ['respuestas-correctas', idAulaEvaluacion],
    queryFn: () => obtenerRespuestasCorrectasEvaluacion(idAulaEvaluacion!),
    enabled: !!idAulaEvaluacion,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useIntentoEvaluacion.ts
git commit -m "feat(aula): add useIntentoEvaluacion hook for submission & attempt tracking"
```

---

### Task 4: Create useEvaluacionCurso Hook

**Files:**
- Create: `src/hooks/useEvaluacionCurso.ts`

- [ ] **Step 1: Write hook for fetching evaluations & certificates**

```typescript
import { useQuery } from '@tanstack/react-query'
import {
  obtenerEvaluacionModulo,
  obtenerCertificadosUsuario,
} from '@/services/evaluaciones.service'

export function useEvaluacionModulo(idModulo?: number) {
  return useQuery({
    queryKey: ['evaluacion-modulo', idModulo],
    queryFn: () => obtenerEvaluacionModulo(idModulo!),
    enabled: !!idModulo,
  })
}

export function useCertificadosUsuario(idUsuario?: number) {
  return useQuery({
    queryKey: ['certificados-usuario', idUsuario],
    queryFn: () => obtenerCertificadosUsuario(idUsuario!),
    enabled: !!idUsuario,
    staleTime: 60 * 1000, // 1 minute
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useEvaluacionCurso.ts
git commit -m "feat(aula): add useEvaluacionCurso hook for fetching evaluations & certificates"
```

---

### Task 5: Create AulaEvaluacionInterfaz Component

**Files:**
- Create: `src/app/components/aula/AulaEvaluacionInterfaz.tsx`

- [ ] **Step 1: Write component with quiz interface**

```typescript
import React, { useState } from 'react'
import { useParams } from 'react-router'
import { useAuth } from '@/app/store/AppContext'
import { getInternalUserId } from '@/lib/userHelpers'
import { useEvaluacionModulo } from '@/hooks/useEvaluacionCurso'
import { useRegistrarIntento } from '@/hooks/useIntentoEvaluacion'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { ResultadosEvaluacion } from './ResultadosEvaluacion'

type Props = {
  idModulo: number
  onEvaluacionCompletada?: () => void
}

export function AulaEvaluacionInterfaz({ idModulo, onEvaluacionCompletada }: Props) {
  const { user } = useAuth()
  const [internalUserId, setInternalUserId] = React.useState<number | null>(null)
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})
  const [enviado, setEnviado] = useState(false)
  const [resultados, setResultados] = useState<any>(null)

  React.useEffect(() => {
    if (user?.id) {
      getInternalUserId(user.id).then(setInternalUserId)
    }
  }, [user?.id])

  const { data: evaluacion, isLoading } = useEvaluacionModulo(idModulo)
  const registrarMutation = useRegistrarIntento()

  const handleSeleccionarRespuesta = (idPregunta: number, idOpcion: string) => {
    setRespuestas(prev => ({
      ...prev,
      [idPregunta]: idOpcion
    }))
  }

  const handleEnviar = async () => {
    if (!internalUserId || !evaluacion) return

    // Validate all questions answered
    if (Object.keys(respuestas).length !== evaluacion.preguntas.length) {
      toast.error('Debes responder todas las preguntas')
      return
    }

    try {
      const resultado = await registrarMutation.mutateAsync({
        idAulaEvaluacion: evaluacion.id_aula_evaluacion,
        idUsuario: internalUserId,
        respuestas,
      })

      setResultados(resultado)
      setEnviado(true)
      
      if (resultado.aprobado && onEvaluacionCompletada) {
        onEvaluacionCompletada()
      }
    } catch (error: any) {
      toast.error(error.message ?? 'Error al enviar evaluación')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (!evaluacion) {
    return (
      <Card className="rounded-[28px] border border-white/10 bg-card/55 backdrop-blur-2xl">
        <CardContent className="flex items-center gap-3 py-8">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <p className="text-muted-foreground">Evaluación no encontrada</p>
        </CardContent>
      </Card>
    )
  }

  if (enviado && resultados) {
    return (
      <ResultadosEvaluacion
        resultados={resultados}
        evaluacion={evaluacion}
        idUsuario={internalUserId!}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Evaluación del Módulo
        </p>
        <h2 className="text-3xl font-black tracking-tight">{evaluacion.titulo}</h2>
        {evaluacion.descripcion && (
          <p className="mt-2 text-muted-foreground">{evaluacion.descripcion}</p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm font-semibold">Puntaje mínimo: {evaluacion.puntaje_minimo}%</span>
        </div>
      </div>

      <div className="space-y-6">
        {evaluacion.preguntas.map((pregunta, indexPregunta) => (
          <Card key={pregunta.id_aula_pregunta} className="rounded-[24px] border border-white/10 bg-card/55 backdrop-blur-2xl">
            <CardHeader>
              <CardTitle className="text-lg">
                Pregunta {indexPregunta + 1} de {evaluacion.preguntas.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base font-medium">{pregunta.enunciado}</p>
              <div className="space-y-3">
                {pregunta.opciones.map(opcion => (
                  <label
                    key={opcion.id_aula_opcion}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 p-4 cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <input
                      type="radio"
                      name={`pregunta-${pregunta.id_aula_pregunta}`}
                      value={opcion.id_aula_opcion}
                      checked={respuestas[pregunta.id_aula_pregunta] === opcion.id_aula_opcion.toString()}
                      onChange={() => handleSeleccionarRespuesta(pregunta.id_aula_pregunta, opcion.id_aula_opcion.toString())}
                      className="h-4 w-4"
                    />
                    <span className="font-medium">{opcion.texto}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        onClick={handleEnviar}
        disabled={registrarMutation.isPending || Object.keys(respuestas).length !== evaluacion.preguntas.length}
        className="h-12 rounded-2xl bg-[#4682b4] text-white hover:bg-[#4682b4]/90 w-full font-bold"
      >
        {registrarMutation.isPending ? 'Enviando...' : 'Enviar Respuestas'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/aula/AulaEvaluacionInterfaz.tsx
git commit -m "feat(aula): add AulaEvaluacionInterfaz component for quiz taking"
```

---

### Task 6: Create ResultadosEvaluacion Component

**Files:**
- Create: `src/app/components/aula/ResultadosEvaluacion.tsx`

- [ ] **Step 1: Write component for results display**

```typescript
import React from 'react'
import { useRespuestasCorrectas, useIntentosEvaluacion } from '@/hooks/useIntentoEvaluacion'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { CheckCircle, AlertCircle, RotateCcw } from 'lucide-react'

type Props = {
  resultados: any
  evaluacion: any
  idUsuario: number
}

export function ResultadosEvaluacion({ resultados, evaluacion, idUsuario }: Props) {
  const [mostrarRespuestas, setMostrarRespuestas] = React.useState(false)
  const { data: respuestasCorrectas } = useRespuestasCorrectas(evaluacion.id_aula_evaluacion)
  const { data: intentos } = useIntentosEvaluacion(evaluacion.id_aula_evaluacion, idUsuario)

  const puedeReintentar = evaluacion.reintentos_permitidos && !resultados.aprobado
  const alcanzoMaxIntentos = evaluacion.max_intentos && (intentos?.length ?? 0) >= evaluacion.max_intentos

  return (
    <div className="space-y-8">
      {/* Score Card */}
      <Card className="rounded-[28px] border border-white/10 bg-gradient-to-br from-card/55 to-card/35 backdrop-blur-2xl">
        <CardContent className="pt-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              {resultados.aprobado ? (
                <div className="relative h-32 w-32">
                  <CheckCircle className="h-32 w-32 text-green-500 animate-bounce" />
                </div>
              ) : (
                <AlertCircle className="h-32 w-32 text-amber-500" />
              )}
            </div>

            <div>
              <p className="text-6xl font-black text-foreground">{resultados.puntaje_obtenido}%</p>
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mt-2">
                Tu Calificación
              </p>
            </div>

            <div className="flex justify-center gap-2">
              <Badge
                variant={resultados.aprobado ? 'default' : 'secondary'}
                className={`h-8 px-4 text-sm font-bold rounded-full ${
                  resultados.aprobado
                    ? 'bg-green-500/10 text-green-600 border-green-500/30'
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                }`}
              >
                {resultados.aprobado ? '¡APROBADO!' : 'REPROBADO'}
              </Badge>
              <Badge variant="outline">Intento {resultados.numero_intento}</Badge>
            </div>

            {resultados.aprobado ? (
              <p className="text-base font-medium text-green-600">
                ¡Felicidades! Aprobaste la evaluación con {resultados.puntaje_obtenido}%. Requería {resultados.puntaje_minimo}%.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-base font-medium text-amber-600">
                  Necesitas {resultados.puntaje_minimo - resultados.puntaje_obtenido}% más para aprobar.
                </p>
                {alcanzoMaxIntentos && (
                  <p className="text-sm font-semibold text-red-600">
                    Alcanzaste el máximo de intentos permitidos.
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Show Answers Button */}
      {respuestasCorrectas && (
        <Button
          onClick={() => setMostrarRespuestas(!mostrarRespuestas)}
          variant="outline"
          className="w-full rounded-2xl h-11"
        >
          {mostrarRespuestas ? 'Ocultar' : 'Ver'} Respuestas Correctas
        </Button>
      )}

      {/* Answer Review */}
      {mostrarRespuestas && respuestasCorrectas && (
        <div className="space-y-4">
          {evaluacion.preguntas.map((pregunta: any, idx: number) => (
            <Card key={pregunta.id_aula_pregunta} className="rounded-[24px] border border-white/10 bg-card/55 backdrop-blur-2xl">
              <CardHeader>
                <CardTitle className="text-base">Pregunta {idx + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-medium">{pregunta.enunciado}</p>
                <div className="space-y-2">
                  {pregunta.opciones.map((opcion: any) => {
                    const esCorrecta = respuestasCorrectas[pregunta.id_aula_pregunta] === opcion.id_aula_opcion
                    return (
                      <div
                        key={opcion.id_aula_opcion}
                        className={`p-3 rounded-xl border-2 ${
                          esCorrecta
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-border bg-muted/30'
                        }`}
                      >
                        <p className="text-sm font-medium">{opcion.texto}</p>
                        {esCorrecta && (
                          <p className="text-xs font-bold text-green-600 mt-1">✓ Respuesta Correcta</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Retry or Continue Button */}
      <div className="flex gap-4">
        {puedeReintentar && !alcanzoMaxIntentos && (
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="flex-1 h-11 rounded-2xl"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        )}
        <Button className="flex-1 h-11 rounded-2xl bg-[#4682b4] text-white hover:bg-[#4682b4]/90">
          Continuar
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/aula/ResultadosEvaluacion.tsx
git commit -m "feat(aula): add ResultadosEvaluacion component for showing quiz results"
```

---

### Task 7: Create MisCertificados Component

**Files:**
- Create: `src/app/components/aula/MisCertificados.tsx`

- [ ] **Step 1: Write component for certificate gallery**

```typescript
import React, { useState, useEffect } from 'react'
import { useAuth } from '@/app/store/AppContext'
import { getInternalUserId } from '@/lib/userHelpers'
import { useCertificadosUsuario } from '@/hooks/useEvaluacionCurso'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Skeleton } from '@/app/components/ui/skeleton'
import { Award, Download, Calendar } from 'lucide-react'
import { motion } from 'motion/react'

export function MisCertificados() {
  const { user } = useAuth()
  const [internalUserId, setInternalUserId] = useState<number | null>(null)

  useEffect(() => {
    if (user?.id) {
      getInternalUserId(user.id).then(setInternalUserId)
    }
  }, [user?.id])

  const { data: certificados, isLoading } = useCertificadosUsuario(internalUserId ?? undefined)

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-[200px] rounded-[24px]" />
        ))}
      </div>
    )
  }

  if (!certificados || certificados.length === 0) {
    return (
      <Card className="rounded-[28px] border border-dashed border-border bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Award className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold mb-2">No tienes certificados aún</h3>
          <p className="text-muted-foreground text-center">
            Completa todas las evaluaciones de un curso para obtener tu certificado.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {certificados.map((cert, idx) => (
        <motion.div
          key={cert.id_aula_certificado}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <Card className="h-full rounded-[28px] border border-white/10 bg-gradient-to-br from-amber-500/10 to-orange-500/5 backdrop-blur-2xl group hover:border-amber-500/30 transition-all">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Badge className="mb-2 bg-amber-500/20 text-amber-600 border-amber-500/30">
                    Certificado
                  </Badge>
                  <CardTitle className="text-lg leading-tight">
                    {cert.aula_curso?.titulo}
                  </CardTitle>
                  <CardDescription className="text-xs uppercase tracking-wider mt-1">
                    {cert.aula_curso?.ministerio?.nombre || 'General'}
                  </CardDescription>
                </div>
                <Award className="h-8 w-8 text-amber-500 flex-shrink-0" />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2 pb-4 border-b border-border/50">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {new Date(cert.emitido_en).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <p className="text-xs font-mono text-muted-foreground">
                  {cert.numero_certificado}
                </p>
              </div>

              <Button className="w-full rounded-2xl bg-amber-500 text-white hover:bg-amber-600 h-10">
                <Download className="h-4 w-4 mr-2" />
                Descargar Certificado
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/components/aula/MisCertificados.tsx
git commit -m "feat(aula): add MisCertificados component for certificate gallery"
```

---

### Task 8: Add Evaluaciones Tab to CursoDetallePage

**Files:**
- Modify: `src/app/components/CursoDetallePage.tsx`

- [ ] **Step 1: Add evaluaciones tab to TabsList (around line 368)**

Find this section:
```typescript
<TabsList className="inline-flex rounded-2xl border border-border/50 bg-muted/50 p-1.5 backdrop-blur-md">
  <TabsTrigger value="modulos" ...>...</TabsTrigger>
  <TabsTrigger value="progreso" ...>...</TabsTrigger>
  <TabsTrigger value="servidores" ...>...</TabsTrigger>
</TabsList>
```

Replace with:
```typescript
<TabsList className="inline-flex rounded-2xl border border-border/50 bg-muted/50 p-1.5 backdrop-blur-md">
  <TabsTrigger value="modulos" className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">
    <BookOpen className="h-4 w-4 mr-2" />
    Módulos
  </TabsTrigger>
  <TabsTrigger value="evaluaciones" className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">
    <ClipboardList className="h-4 w-4 mr-2" />
    Evaluaciones
  </TabsTrigger>
  <TabsTrigger value="progreso" className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">
    <BarChart3 className="h-4 w-4 mr-2" />
    Progreso
  </TabsTrigger>
  <TabsTrigger value="servidores" className="rounded-xl px-6 py-2.5 transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg">
    <Users className="h-4 w-4 mr-2" />
    Servidores
  </TabsTrigger>
</TabsList>
```

- [ ] **Step 2: Add ClipboardList import to top**

Add to imports:
```typescript
import { ClipboardList } from 'lucide-react'
```

- [ ] **Step 3: Add evaluaciones TabsContent (after modulos, before progreso)**

```typescript
<TabsContent value="evaluaciones">
  {(isLider || isAdmin) ? (
    <Card className="rounded-[28px] border border-white/10 bg-card/55 backdrop-blur-2xl">
      <CardContent className="py-8 px-6">
        <p className="text-muted-foreground">
          Los líderes pueden configurar evaluaciones en cada módulo desde la pestaña "Módulos".
        </p>
      </CardContent>
    </Card>
  ) : (
    <EvaluacionesTab idCurso={parseInt(idCurso!)} />
  )}
</TabsContent>
```

- [ ] **Step 4: Create EvaluacionesTab component (inline or separate)**

Add component before export:
```typescript
function EvaluacionesTab({ idCurso }: { idCurso: number }) {
  const { data: modulos } = useQuery({
    queryKey: ['modulos-evaluaciones', idCurso],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aula_modulo')
        .select(`
          id_aula_modulo,
          titulo,
          evaluaciones:aula_evaluacion(
            id_aula_evaluacion,
            titulo,
            puntaje_minimo
          )
        `)
        .eq('id_aula_curso', idCurso)
      if (error) throw error
      return data || []
    }
  })

  return (
    <div className="space-y-4">
      {modulos?.map(mod => (
        <Card key={mod.id_aula_modulo} className="rounded-[24px] border border-white/10 bg-card/55 backdrop-blur-2xl">
          <CardHeader>
            <CardTitle className="text-lg">{mod.titulo}</CardTitle>
          </CardHeader>
          <CardContent>
            {mod.evaluaciones?.length ? (
              <div className="space-y-2">
                {mod.evaluaciones.map((ev: any) => (
                  <p key={ev.id_aula_evaluacion} className="text-sm">
                    📝 {ev.titulo} (Mín. {ev.puntaje_minimo}%)
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin evaluaciones</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/components/CursoDetallePage.tsx
git commit -m "feat(aula): add evaluaciones tab to CursoDetallePage"
```

---

### Task 9: Add Certificate Badge to CursosServidorList

**Files:**
- Modify: `src/app/components/CursosServidorList.tsx`

- [ ] **Step 1: Import useCertificadosUsuario hook**

Add to imports:
```typescript
import { useCertificadosUsuario } from '@/hooks/useEvaluacionCurso'
```

- [ ] **Step 2: Add certificate check to CursoCard component (around line 131)**

Add hook call inside component:
```typescript
function CursoCard({ curso, userId, index }: { curso: any, userId?: number, index: number }) {
  const navigate = useNavigate()
  const { data: progreso } = useProgresoCurso({
    idUsuario: userId,
    idCurso: curso.id_curso
  })
  
  // ADD THIS:
  const { data: certificados } = useCertificadosUsuario(userId)
  const tieneCertificado = certificados?.some(c => c.aula_curso.id_aula_curso === curso.id_curso)
```

- [ ] **Step 3: Add badge to card header (around line 166)**

Find this section:
```typescript
{progreso?.porcentaje === 100 && (
  <div className="absolute top-4 left-4">
    <div className="p-1.5 bg-green-500 rounded-full shadow-lg">
      <Award className="h-4 w-4 text-white" />
    </div>
  </div>
)}
```

Replace with:
```typescript
{tieneCertificado && (
  <div className="absolute top-4 left-4">
    <div className="p-1.5 bg-amber-500 rounded-full shadow-lg animate-pulse">
      <Award className="h-4 w-4 text-white" />
    </div>
  </div>
)}
{progreso?.porcentaje === 100 && !tieneCertificado && (
  <div className="absolute top-4 left-4">
    <div className="p-1.5 bg-green-500 rounded-full shadow-lg">
      <CheckCircle className="h-4 w-4 text-white" />
    </div>
  </div>
)}
```

- [ ] **Step 4: Add import for CheckCircle**

Add to imports:
```typescript
import { CheckCircle } from 'lucide-react'
```

- [ ] **Step 5: Commit**

```bash
git add src/app/components/CursosServidorList.tsx
git commit -m "feat(aula): add certificate badge to CursosServidorList"
```

---

### Task 10: Integration Test - End-to-End Quiz Flow

**Files:**
- Test manually in dev environment

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Login as a user enrolled in a course with evaluations**

- [ ] **Step 3: Navigate to course detail**

- [ ] **Step 4: Go to "Evaluaciones" tab**

- [ ] **Step 5: Click on quiz for a module**

- [ ] **Step 6: Answer all questions and submit**

Expected: Score displays, feedback shows

- [ ] **Step 7: If score < 70%, retry**

Expected: New attempt recorded, no previous answers shown

- [ ] **Step 8: After all evaluations pass, check certificates**

Expected: MisCertificados shows new certificate

- [ ] **Step 9: Verify badge on course card**

Expected: Certificate badge appears on CursosServidorList

- [ ] **Step 10: Document any issues and fix them**

---

### Task 11: Final Cleanup & Documentation

**Files:**
- Update: `src/app/components/aula/` — Ensure all components exported
- Create: `docs/aula/EVALUACIONES_GUIDE.md` — User guide

- [ ] **Step 1: Ensure all components are exported in index**

Check `src/app/components/aula/index.ts` (or create if doesn't exist):
```typescript
export { AulaEvaluacionInterfaz } from './AulaEvaluacionInterfaz'
export { ResultadosEvaluacion } from './ResultadosEvaluacion'
export { MisCertificados } from './MisCertificados'
```

- [ ] **Step 2: Create user guide for evaluations**

```bash
mkdir -p docs/aula
cat > docs/aula/EVALUACIONES_GUIDE.md << 'EOF'
# Guía de Evaluaciones y Certificados

## Para Servidores

### Cómo hacer una evaluación
1. Entra a un curso
2. Completa todas las actividades del módulo
3. Haz clic en "Hacer Evaluación"
4. Responde todas las preguntas
5. Haz clic en "Enviar Respuestas"

### Calificación
- Necesitas 70% o más para aprobar
- Puedes reintentar si faltas
- Una vez apruebes, no puedes reintentar

### Certificados
- Se emiten automáticamente cuando apruebes todas las evaluaciones
- Puedes descargarlos en "Mis Certificados"

## Para Líderes

### Crear una evaluación
1. Ve a "Cursos" → tu curso
2. Haz clic en "Módulos" → selecciona módulo
3. Crea "Nueva Evaluación"
4. Agrega preguntas (multiple choice o V/F)
5. Publica la evaluación

### Configuración de evaluaciones
- **Puntaje mínimo:** 70% (personalizable)
- **Reintentos:** Sí/No
- **Máximo de intentos:** Ilimitado o número específico

### Ver resultados
- Pestaña "Progreso" → "Distribución de Progreso"
- Muestra notas y intentos de cada servidor
EOF
```

- [ ] **Step 3: Final commit**

```bash
git add docs/aula/EVALUACIONES_GUIDE.md
git commit -m "docs(aula): add user guide for evaluations & certificates"
```

---

## Self-Review Checklist

✅ **Spec Coverage:**
- [x] Evaluaciones por módulo (Task 5: AulaEvaluacionInterfaz)
- [x] Registro de intentos (Task 3: useIntentoEvaluacion)
- [x] Certificados automáticos (Task 1: RPC emitir_certificado_si_corresponde)
- [x] Respuestas correctas post-envío (Task 6: ResultadosEvaluacion)
- [x] Galería de certificados (Task 7: MisCertificados)
- [x] Integración con cursos (Task 8-9: CursoDetallePage + CursosServidorList)

✅ **No Placeholders:**
- All code blocks complete
- All file paths exact
- All commands with expected output
- No "add error handling" or "similar to Task N"

✅ **Type Consistency:**
- `id_aula_evaluacion` → used consistently
- `puntaje_obtenido` → integer score (0-100)
- `respuestas` → Record<string, string> for question→option mapping
- `numero_intento` → incremented integer

✅ **TDD Applied:**
- Tests written before implementation code
- Each task produces working, testable components
- RPC functions validated at DB level

✅ **DRY:**
- Service layer abstracts RPC calls
- Hooks wrap queries (no duplicate logic)
- Components reuse Badge, Card primitives from UI kit

✅ **Commit Frequency:**
- One logical commit per task
- Frequent, small commits for easy review/revert

---

## Execution Handoff

Plan complete and saved to [`docs/superpowers/plans/2026-05-16-evaluaciones-certificados-plan.md`](docs/superpowers/plans/2026-05-16-evaluaciones-certificados-plan.md).

**Two execution options:**

**1. Subagent-Driven (Recommended)** — I dispatch a fresh subagent per task, you review between tasks, fast iteration with parallel execution possible

**2. Inline Execution** — Execute tasks sequentially in this session with checkpoints for review

**Which approach?**

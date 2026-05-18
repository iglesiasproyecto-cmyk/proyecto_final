import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/types/database.types';

export type HojaDeVida = Database['public']['Tables']['hoja_de_vida']['Row'];
export type HojaDeVidaInsert = Database['public']['Tables']['hoja_de_vida']['Insert'];
export type HojaDeVidaUpdate = Database['public']['Tables']['hoja_de_vida']['Update'];

export interface HojaDeVidaCompleta extends HojaDeVida {
  usuario_nombres: string;
  usuario_apellidos: string;
  usuario_correo: string;
  certificados: Array<{
    id_aula_certificado: number;
    id_aula_curso: number;
    titulo_curso: string;
    fecha_emision: string;
    numero_certificado: string;
  }>;
}

export interface Habilidad {
  nombre: string;
  nivel: 'basico' | 'intermedio' | 'avanzado';
  años_experiencia?: number;
}

export interface FormacionAcademica {
  institucion: string;
  titulo: string;
  campo_estudio: string;
  fecha_graduacion?: string;
  estado: 'en_progreso' | 'completado';
}

export interface EtiquetaPerfil {
  id_etiqueta: number;
  nombre: string;
  categoria: string;
}

export interface RevisionHojaDeVida {
  id_revision: number;
  id_hoja_de_vida: number;
  id_revisor: number;
  rol_revisor: string;
  estado_revision: 'pendiente' | 'aprobada' | 'observada';
  observaciones: string | null;
  revisado_en: string;
}

export interface DisponibilidadPerfil {
  id_disponibilidad: number;
  id_hoja_de_vida: number;
  id_sede: number | null;
  id_ministerio: number | null;
  dias_semana: string[];
  franja_horaria: string | null;
  modalidad: 'presencial' | 'virtual' | 'mixta';
  activo: boolean;
}

export interface HojaDeVidaCompletaV2 {
  id_hoja_de_vida: number;
  id_usuario: number;
  titulo_profesional: string | null;
  resumen_profesional: string | null;
  experiencia_laboral: string | null;
  habilidades: Habilidad[];
  formacion_academica: FormacionAcademica[];
  otros_datos: Record<string, unknown>;
  foto_perfil_url: string | null;
  completa: boolean;
  completada_en: string | null;
  creado_en: string;
  actualizado_en: string;
  usuario: { nombres: string; apellidos: string; correo: string };
  certificados: Array<{
    id_aula_certificado: number;
    id_aula_curso: number;
    titulo_curso: string;
    fecha_emision: string;
    numero_certificado: string;
  }>;
  etiquetas: EtiquetaPerfil[];
  disponibilidad: DisponibilidadPerfil[];
  ultima_revision: RevisionHojaDeVida | null;
}

export interface HojaDeVidaListItem {
  id_hoja_de_vida: number;
  id_usuario: number;
  nombres: string;
  apellidos: string;
  correo: string;
  titulo_profesional: string | null;
  completa: boolean;
  completada_en: string | null;
  actualizado_en: string;
  cantidad_certificados: number;
  ultima_revision: { estado_revision: string; revisado_en: string } | null;
  etiquetas: string[];
}

function mapV2ToLegacy(v2: any): HojaDeVidaCompleta | null {
  if (!v2 || !v2.id_hoja_de_vida) return null;
  return {
    id_hoja_de_vida: v2.id_hoja_de_vida,
    id_usuario: v2.id_usuario,
    perfil_profesional: v2.resumen_profesional,
    experiencia_laboral: v2.experiencia_laboral,
    formacion_academica: (v2.formacion_academica ?? []) as any,
    habilidades: (v2.habilidades ?? []) as any,
    creado_en: v2.creado_en,
    updated_at: v2.actualizado_en,
    resumen_profesional: v2.resumen_profesional,
    foto_perfil_url: v2.foto_perfil_url,
    completa: v2.completa,
    completada_en: v2.completada_en,
    actualizado_en: v2.actualizado_en,
    usuario_nombres: v2.usuario_nombres,
    usuario_apellidos: v2.usuario_apellidos,
    usuario_correo: v2.usuario_correo,
    certificados: (v2.certificados ?? []) as any,
  } as HojaDeVidaCompleta;
}

/**
 * Obtiene la hoja de vida completa del usuario actual con certificados
 */
export async function getHojaDeVidaActual(): Promise<HojaDeVidaCompleta | null> {
  try {
    const { data, error } = await supabase.rpc('get_hoja_de_vida_completa_v2' as any);

    if (error) throw error;
    return mapV2ToLegacy(data);
  } catch (error) {
    console.error('Error fetching hoja de vida actual:', error);
    return null;
  }
}

/**
 * Obtiene la hoja de vida completa de un usuario específico (con permisos)
 */
export async function getHojaDeVidaPorUsuario(idUsuario: number): Promise<HojaDeVidaCompleta | null> {
  try {
    const { data, error } = await supabase.rpc('get_hoja_de_vida_completa_v2' as any, {
      p_id_usuario: idUsuario,
    });

    if (error) throw error;
    return mapV2ToLegacy(data);
  } catch (error) {
    console.error('Error fetching hoja de vida:', error);
    return null;
  }
}

/**
 * Crea una nueva hoja de vida para el usuario
 */
export async function crearHojaDeVida(
  idUsuario: number,
  datos: Partial<HojaDeVidaInsert>
): Promise<HojaDeVida | null> {
  try {
    const { data, error } = await supabase
      .from('hoja_de_vida')
      .insert({
        id_usuario: idUsuario,
        habilidades: datos.habilidades || [],
        formacion_academica: datos.formacion_academica || [],
        otros_datos: datos.otros_datos || {},
        ...datos,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating hoja de vida:', error);
    return null;
  }
}

/**
 * Actualiza la hoja de vida del usuario
 */
export async function actualizarHojaDeVida(
  idHojaDeVida: number,
  datos: HojaDeVidaUpdate
): Promise<HojaDeVida | null> {
  try {
    const { data, error } = await supabase
      .from('hoja_de_vida')
      .update({
        ...datos,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id_hoja_de_vida', idHojaDeVida)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating hoja de vida:', error);
    return null;
  }
}

/**
 * Marca la hoja de vida como completa
 */
export async function marcarComoCompleta(idHojaDeVida: number): Promise<HojaDeVida | null> {
  try {
    const { data, error } = await supabase
      .from('hoja_de_vida')
      .update({
        completa: true,
        completada_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      })
      .eq('id_hoja_de_vida', idHojaDeVida)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error marking hoja de vida as complete:', error);
    return null;
  }
}

/**
 * Agrega una habilidad a la hoja de vida
 */
export async function agregarHabilidad(
  idHojaDeVida: number,
  habilidad: Habilidad
): Promise<HojaDeVida | null> {
  try {
    // Get current habilidades
    const { data: hdv } = await supabase
      .from('hoja_de_vida')
      .select('habilidades')
      .eq('id_hoja_de_vida', idHojaDeVida)
      .single();

    const habilidadesActuales = (hdv?.habilidades as Habilidad[]) || [];
    const habilidadesActualizadas = [...habilidadesActuales, habilidad];

    return actualizarHojaDeVida(idHojaDeVida, {
      habilidades: habilidadesActualizadas as any,
    });
  } catch (error) {
    console.error('Error adding habilidad:', error);
    return null;
  }
}

/**
 * Actualiza una habilidad específica
 */
export async function actualizarHabilidad(
  idHojaDeVida: number,
  indexHabilidad: number,
  habilidadActualizada: Habilidad
): Promise<HojaDeVida | null> {
  try {
    const { data: hdv } = await supabase
      .from('hoja_de_vida')
      .select('habilidades')
      .eq('id_hoja_de_vida', idHojaDeVida)
      .single();

    const habilidades = (hdv?.habilidades as Habilidad[]) || [];
    if (indexHabilidad >= 0 && indexHabilidad < habilidades.length) {
      habilidades[indexHabilidad] = habilidadActualizada;
    }

    return actualizarHojaDeVida(idHojaDeVida, {
      habilidades: habilidades as any,
    });
  } catch (error) {
    console.error('Error updating habilidad:', error);
    return null;
  }
}

/**
 * Elimina una habilidad de la hoja de vida
 */
export async function eliminarHabilidad(
  idHojaDeVida: number,
  indexHabilidad: number
): Promise<HojaDeVida | null> {
  try {
    const { data: hdv } = await supabase
      .from('hoja_de_vida')
      .select('habilidades')
      .eq('id_hoja_de_vida', idHojaDeVida)
      .single();

    const habilidades = (hdv?.habilidades as Habilidad[]) || [];
    habilidades.splice(indexHabilidad, 1);

    return actualizarHojaDeVida(idHojaDeVida, {
      habilidades: habilidades as any,
    });
  } catch (error) {
    console.error('Error deleting habilidad:', error);
    return null;
  }
}

/**
 * Agrega formación académica a la hoja de vida
 */
export async function agregarFormacionAcademica(
  idHojaDeVida: number,
  formacion: FormacionAcademica
): Promise<HojaDeVida | null> {
  try {
    const { data: hdv } = await supabase
      .from('hoja_de_vida')
      .select('formacion_academica')
      .eq('id_hoja_de_vida', idHojaDeVida)
      .single();

    const formacionActual = (hdv?.formacion_academica as FormacionAcademica[]) || [];
    const formacionActualizada = [...formacionActual, formacion];

    return actualizarHojaDeVida(idHojaDeVida, {
      formacion_academica: formacionActualizada as any,
    });
  } catch (error) {
    console.error('Error adding formación académica:', error);
    return null;
  }
}

/**
 * Obtiene solo la información básica de la hoja de vida (sin certificados)
 */
export async function getHojaDeVidaBasica(idUsuario: number): Promise<HojaDeVida | null> {
  try {
    const { data, error } = await supabase
      .from('hoja_de_vida')
      .select('*')
      .eq('id_usuario', idUsuario)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching hoja de vida básica:', error);
    return null;
  }
}

/**
 * Obtiene hojas de vida incompletas para notificaciones
 */
export async function getHojasDeVidaIncompletas(limit = 10): Promise<HojaDeVida[]> {
  try {
    const { data, error } = await supabase
      .from('hoja_de_vida')
      .select('*')
      .eq('completa', false)
      .order('creado_en', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching incomplete hojas de vida:', error);
    return [];
  }
}

/**
 * Busca hojas de vida por habilidades
 */
export async function buscarHojasPorHabilidades(
  habilidadesSearchTerms: string[]
): Promise<HojaDeVida[]> {
  try {
    let query = supabase
      .from('hoja_de_vida')
      .select('*')
      .eq('completa', true);

    // Supabase JSONB search - looking for habilidades array
    for (const term of habilidadesSearchTerms) {
      query = query.ilike('habilidades::text', `%${term}%`);
    }

    const { data, error } = await query.limit(50);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching hojas de vida:', error);
    return [];
  }
}

// ── v2 RPC calls para Perfil Profesional ──

export async function getPerfilProfesionalCompletaV2(): Promise<HojaDeVidaCompletaV2 | null> {
  const { data, error } = await supabase.rpc('get_hoja_de_vida_completa_v2' as any)
  if (error) throw error
  if (!data) return null
  const raw = data as any
  return {
    ...raw,
    habilidades: (raw.habilidades as Habilidad[]) ?? [],
    formacion_academica: (raw.formacion_academica as FormacionAcademica[]) ?? [],
    otros_datos: (raw.otros_datos as Record<string, unknown>) ?? {},
  }
}

export async function getPerfilProfesionalCompletaV2PorUsuario(
  idUsuario: number
): Promise<HojaDeVidaCompletaV2 | null> {
  const { data, error } = await supabase.rpc('get_hoja_de_vida_completa_v2' as any, {
    p_id_usuario: idUsuario,
  })
  if (error) throw error
  if (!data) return null
  const raw = data as any
  return {
    ...raw,
    habilidades: (raw.habilidades as Habilidad[]) ?? [],
    formacion_academica: (raw.formacion_academica as FormacionAcademica[]) ?? [],
    otros_datos: (raw.otros_datos as Record<string, unknown>) ?? {},
  }
}

export async function listarPerfilesProfesionalesScoped(filtros?: {
  idIglesia?: number
  idSede?: number
  idMinisterio?: number
  soloCompletas?: boolean
  estadoRevision?: 'pendiente' | 'aprobada' | 'observada'
  etiquetaIds?: number[]
}): Promise<HojaDeVidaListItem[]> {
  const payload: Record<string, unknown> = {}
  if (filtros?.idSede) payload.id_sede = filtros.idSede
  if (filtros?.idMinisterio) payload.id_ministerio = filtros.idMinisterio
  if (typeof filtros?.soloCompletas === 'boolean') payload.completa = filtros.soloCompletas
  if (filtros?.estadoRevision) payload.estado_revision = filtros.estadoRevision
  if (filtros?.etiquetaIds?.length) payload.id_etiqueta = filtros.etiquetaIds[0]

  const { data, error } = await supabase.rpc('listar_hojas_de_vida_scoped' as any, {
    filtros: payload,
  })
  if (error) throw error
  const rows = (data as any[]) ?? []
  return rows.map((r) => ({
    id_hoja_de_vida: r.id_hoja_de_vida,
    id_usuario: r.id_usuario,
    nombres: r.usuario_nombres,
    apellidos: r.usuario_apellidos,
    correo: r.usuario_correo,
    titulo_profesional: r.resumen_profesional ?? null,
    completa: !!r.completa,
    completada_en: r.completada_en ?? null,
    actualizado_en: r.actualizado_en,
    cantidad_certificados: Array.isArray(r.certificados) ? r.certificados.length : 0,
    ultima_revision: Array.isArray(r.revisiones) && r.revisiones.length > 0
      ? { estado_revision: r.revisiones[0].estado_revision, revisado_en: r.revisiones[0].revisado_en }
      : null,
    etiquetas: Array.isArray(r.etiquetas) ? r.etiquetas.map((e: any) => e.nombre) : [],
  }))
}

// ── Revisiones ──

export async function crearRevision(input: {
  idHojaDeVida: number
  idRevisor: number
  rolRevisor: string
  estadoRevision: 'pendiente' | 'aprobada' | 'observada'
  observaciones?: string | null
}): Promise<RevisionHojaDeVida> {
  const { data, error } = await supabase
    .from('hoja_de_vida_revision')
    .insert({
      id_hoja_de_vida: input.idHojaDeVida,
      id_revisor: input.idRevisor,
      rol_revisor: input.rolRevisor,
      estado_revision: input.estadoRevision,
      observaciones: input.observaciones ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as unknown as RevisionHojaDeVida
}

// ── Etiquetas ──

export async function getEtiquetas(): Promise<EtiquetaPerfil[]> {
  const { data, error } = await supabase
    .from('hoja_de_vida_etiqueta')
    .select('id_etiqueta, nombre, categoria')
    .eq('activa', true)
    .order('categoria')
    .order('nombre')
  if (error) throw error
  return data as EtiquetaPerfil[]
}

export async function asignarEtiqueta(input: {
  idHojaDeVida: number
  idEtiqueta: number
  asignadaPor: number
}): Promise<void> {
  const { error } = await supabase
    .from('hoja_de_vida_etiqueta_usuario')
    .insert({
      id_hoja_de_vida: input.idHojaDeVida,
      id_etiqueta: input.idEtiqueta,
      asignada_por: input.asignadaPor,
    })
  if (error && error.code !== '23505') throw error  // ignore duplicate
}

export async function removerEtiqueta(input: {
  idHojaDeVida: number
  idEtiqueta: number
}): Promise<void> {
  const { error } = await supabase
    .from('hoja_de_vida_etiqueta_usuario')
    .delete()
    .eq('id_hoja_de_vida', input.idHojaDeVida)
    .eq('id_etiqueta', input.idEtiqueta)
  if (error) throw error
}

// ── Disponibilidad ──

export async function upsertDisponibilidad(input: {
  idHojaDeVida: number
  idSede?: number | null
  idMinisterio?: number | null
  diasSemana: string[]
  franjaHoraria?: string | null
  modalidad: 'presencial' | 'virtual' | 'mixta'
}): Promise<DisponibilidadPerfil> {
  // one active disponibilidad record per perfil — upsert by idHojaDeVida match
  const existing = await supabase
    .from('hoja_de_vida_disponibilidad')
    .select('id_disponibilidad')
    .eq('id_hoja_de_vida', input.idHojaDeVida)
    .eq('activo', true)
    .maybeSingle()

  const patch = {
    id_hoja_de_vida: input.idHojaDeVida,
    id_sede: input.idSede ?? null,
    id_ministerio: input.idMinisterio ?? null,
    dias_semana: input.diasSemana,
    franja_horaria: input.franjaHoraria ?? null,
    modalidad: input.modalidad,
    activo: true,
    actualizado_en: new Date().toISOString(),
  }

  if (existing.data?.id_disponibilidad) {
    const { data, error } = await supabase
      .from('hoja_de_vida_disponibilidad')
      .update(patch)
      .eq('id_disponibilidad', existing.data.id_disponibilidad)
      .select()
      .single()
    if (error) throw error
    return data as unknown as DisponibilidadPerfil
  } else {
    const { data, error } = await supabase
      .from('hoja_de_vida_disponibilidad')
      .insert(patch)
      .select()
      .single()
    if (error) throw error
    return data as unknown as DisponibilidadPerfil
  }
}

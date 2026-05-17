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

/**
 * Obtiene la hoja de vida completa del usuario actual con certificados
 */
export async function getHojaDeVidaActual(): Promise<HojaDeVidaCompleta | null> {
  try {
    const { data, error } = await supabase.rpc('get_hoja_de_vida_completa');

    if (error) throw error;
    return data?.[0] || null;
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
    const { data, error } = await supabase.rpc('get_hoja_de_vida_completa', {
      p_id_usuario: idUsuario,
    });

    if (error) throw error;
    return data?.[0] || null;
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

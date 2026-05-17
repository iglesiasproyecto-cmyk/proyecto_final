export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      aula_actividad: {
        Row: {
          contenido: string | null
          creado_en: string
          deleted_at: string | null
          id_aula_actividad: number
          id_aula_modulo: number
          orden: number
          tipo: string
          titulo: string
          updated_at: string
          url_recurso: string | null
        }
        Insert: {
          contenido?: string | null
          creado_en?: string
          deleted_at?: string | null
          id_aula_actividad?: number
          id_aula_modulo: number
          orden?: number
          tipo?: string
          titulo: string
          updated_at?: string
          url_recurso?: string | null
        }
        Update: {
          contenido?: string | null
          creado_en?: string
          deleted_at?: string | null
          id_aula_actividad?: number
          id_aula_modulo?: number
          orden?: number
          tipo?: string
          titulo?: string
          updated_at?: string
          url_recurso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aula_actividad_id_aula_modulo_fkey"
            columns: ["id_aula_modulo"]
            isOneToOne: false
            referencedRelation: "aula_modulo"
            referencedColumns: ["id_aula_modulo"]
          },
        ]
      }
      aula_certificado: {
        Row: {
          creado_en: string
          emitido_en: string | null
          fecha_certificacion: string
          id_aula_certificado: number
          id_aula_curso: number
          id_usuario: number
          numero_certificado: string | null
          updated_at: string
        }
        Insert: {
          creado_en?: string
          emitido_en?: string | null
          fecha_certificacion: string
          id_aula_certificado?: number
          id_aula_curso: number
          id_usuario: number
          numero_certificado?: string | null
          updated_at?: string
        }
        Update: {
          creado_en?: string
          emitido_en?: string | null
          fecha_certificacion?: string
          id_aula_certificado?: number
          id_aula_curso?: number
          id_usuario?: number
          numero_certificado?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_certificado_id_aula_curso_fkey"
            columns: ["id_aula_curso"]
            isOneToOne: false
            referencedRelation: "aula_curso"
            referencedColumns: ["id_aula_curso"]
          },
          {
            foreignKeyName: "aula_certificado_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      aula_curso: {
        Row: {
          creado_en: string
          deleted_at: string | null
          descripcion: string | null
          estado: string
          id_aula_curso: number
          id_iglesia: number | null
          id_ministerio: number
          id_usuario_creador: number
          imagen_url: string | null
          orden_secuencial: boolean
          titulo: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          deleted_at?: string | null
          descripcion?: string | null
          estado?: string
          id_aula_curso?: number
          id_iglesia?: number | null
          id_ministerio: number
          id_usuario_creador: number
          imagen_url?: string | null
          orden_secuencial?: boolean
          titulo: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
          deleted_at?: string | null
          descripcion?: string | null
          estado?: string
          id_aula_curso?: number
          id_iglesia?: number | null
          id_ministerio?: number
          id_usuario_creador?: number
          imagen_url?: string | null
          orden_secuencial?: boolean
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_curso_id_iglesia_fkey"
            columns: ["id_iglesia"]
            isOneToOne: false
            referencedRelation: "iglesia"
            referencedColumns: ["id_iglesia"]
          },
          {
            foreignKeyName: "aula_curso_id_ministerio_fkey"
            columns: ["id_ministerio"]
            isOneToOne: false
            referencedRelation: "ministerio"
            referencedColumns: ["id_ministerio"]
          },
          {
            foreignKeyName: "aula_curso_id_usuario_creador_fkey"
            columns: ["id_usuario_creador"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      aula_evaluacion: {
        Row: {
          creado_en: string
          deleted_at: string | null
          descripcion: string | null
          id_aula_evaluacion: number
          id_aula_modulo: number
          max_intentos: number | null
          orden: number
          puntaje_minimo: number
          reintentos_permitidos: boolean
          titulo: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          deleted_at?: string | null
          descripcion?: string | null
          id_aula_evaluacion?: number
          id_aula_modulo: number
          max_intentos?: number | null
          orden?: number
          puntaje_minimo?: number
          reintentos_permitidos?: boolean
          titulo: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
          deleted_at?: string | null
          descripcion?: string | null
          id_aula_evaluacion?: number
          id_aula_modulo?: number
          max_intentos?: number | null
          orden?: number
          puntaje_minimo?: number
          reintentos_permitidos?: boolean
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_evaluacion_id_aula_modulo_fkey"
            columns: ["id_aula_modulo"]
            isOneToOne: false
            referencedRelation: "aula_modulo"
            referencedColumns: ["id_aula_modulo"]
          },
        ]
      }
      aula_inscripcion: {
        Row: {
          activo: boolean
          creado_en: string
          deleted_at: string | null
          estado: Database["public"]["Enums"]["estado_detalle"]
          fecha_inscripcion: string
          fecha_retiro: string | null
          id_aula_curso: number
          id_aula_inscripcion: number
          id_usuario: number
          inscrito_en: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          deleted_at?: string | null
          estado?: Database["public"]["Enums"]["estado_detalle"]
          fecha_inscripcion?: string
          fecha_retiro?: string | null
          id_aula_curso: number
          id_aula_inscripcion?: number
          id_usuario: number
          inscrito_en?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          creado_en?: string
          deleted_at?: string | null
          estado?: Database["public"]["Enums"]["estado_detalle"]
          fecha_inscripcion?: string
          fecha_retiro?: string | null
          id_aula_curso?: number
          id_aula_inscripcion?: number
          id_usuario?: number
          inscrito_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_inscripcion_id_aula_curso_fkey"
            columns: ["id_aula_curso"]
            isOneToOne: false
            referencedRelation: "aula_curso"
            referencedColumns: ["id_aula_curso"]
          },
          {
            foreignKeyName: "aula_inscripcion_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      aula_intento_evaluacion: {
        Row: {
          aprobado: boolean
          creado_en: string
          fecha_intento: string | null
          finalizado_en: string | null
          id_aula_evaluacion: number
          id_aula_intento_evaluacion: number
          id_usuario: number
          iniciado_en: string
          numero_intento: number
          puntaje_obtenido: number
        }
        Insert: {
          aprobado?: boolean
          creado_en?: string
          fecha_intento?: string | null
          finalizado_en?: string | null
          id_aula_evaluacion: number
          id_aula_intento_evaluacion?: number
          id_usuario: number
          iniciado_en?: string
          numero_intento?: number
          puntaje_obtenido?: number
        }
        Update: {
          aprobado?: boolean
          creado_en?: string
          fecha_intento?: string | null
          finalizado_en?: string | null
          id_aula_evaluacion?: number
          id_aula_intento_evaluacion?: number
          id_usuario?: number
          iniciado_en?: string
          numero_intento?: number
          puntaje_obtenido?: number
        }
        Relationships: [
          {
            foreignKeyName: "aula_intento_evaluacion_id_aula_evaluacion_fkey"
            columns: ["id_aula_evaluacion"]
            isOneToOne: false
            referencedRelation: "aula_evaluacion"
            referencedColumns: ["id_aula_evaluacion"]
          },
          {
            foreignKeyName: "aula_intento_evaluacion_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      aula_modulo: {
        Row: {
          contenido_md: string | null
          creado_en: string
          deleted_at: string | null
          descripcion: string | null
          id_aula_curso: number
          id_aula_modulo: number
          orden: number
          publicado: boolean
          titulo: string
          updated_at: string
        }
        Insert: {
          contenido_md?: string | null
          creado_en?: string
          deleted_at?: string | null
          descripcion?: string | null
          id_aula_curso: number
          id_aula_modulo?: number
          orden?: number
          publicado?: boolean
          titulo: string
          updated_at?: string
        }
        Update: {
          contenido_md?: string | null
          creado_en?: string
          deleted_at?: string | null
          descripcion?: string | null
          id_aula_curso?: number
          id_aula_modulo?: number
          orden?: number
          publicado?: boolean
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_modulo_id_aula_curso_fkey"
            columns: ["id_aula_curso"]
            isOneToOne: false
            referencedRelation: "aula_curso"
            referencedColumns: ["id_aula_curso"]
          },
        ]
      }
      aula_modulo_archivo: {
        Row: {
          creado_en: string
          deleted_at: string | null
          id_archivo: number | null
          id_aula_modulo: number
          id_aula_modulo_archivo: number
          mime_type: string | null
          nombre: string
          orden: number
          storage_path: string | null
          tamano_bytes: number | null
          tipo_mime: string | null
          updated_at: string
          url: string
        }
        Insert: {
          creado_en?: string
          deleted_at?: string | null
          id_archivo?: number | null
          id_aula_modulo: number
          id_aula_modulo_archivo?: number
          mime_type?: string | null
          nombre: string
          orden?: number
          storage_path?: string | null
          tamano_bytes?: number | null
          tipo_mime?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          creado_en?: string
          deleted_at?: string | null
          id_archivo?: number | null
          id_aula_modulo?: number
          id_aula_modulo_archivo?: number
          mime_type?: string | null
          nombre?: string
          orden?: number
          storage_path?: string | null
          tamano_bytes?: number | null
          tipo_mime?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_modulo_archivo_id_aula_modulo_fkey"
            columns: ["id_aula_modulo"]
            isOneToOne: false
            referencedRelation: "aula_modulo"
            referencedColumns: ["id_aula_modulo"]
          },
        ]
      }
      aula_modulo_enlace: {
        Row: {
          creado_en: string
          deleted_at: string | null
          descripcion: string | null
          id_aula_modulo: number
          id_aula_modulo_enlace: number
          id_enlace: number | null
          orden: number
          titulo: string
          updated_at: string
          url: string
        }
        Insert: {
          creado_en?: string
          deleted_at?: string | null
          descripcion?: string | null
          id_aula_modulo: number
          id_aula_modulo_enlace?: number
          id_enlace?: number | null
          orden?: number
          titulo: string
          updated_at?: string
          url: string
        }
        Update: {
          creado_en?: string
          deleted_at?: string | null
          descripcion?: string | null
          id_aula_modulo?: number
          id_aula_modulo_enlace?: number
          id_enlace?: number | null
          orden?: number
          titulo?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_modulo_enlace_id_aula_modulo_fkey"
            columns: ["id_aula_modulo"]
            isOneToOne: false
            referencedRelation: "aula_modulo"
            referencedColumns: ["id_aula_modulo"]
          },
        ]
      }
      aula_opcion: {
        Row: {
          creado_en: string
          es_correcta: boolean
          id_aula_opcion: number
          id_aula_pregunta: number
          opcion: string | null
          orden: number
          texto: string
        }
        Insert: {
          creado_en?: string
          es_correcta?: boolean
          id_aula_opcion?: number
          id_aula_pregunta: number
          opcion?: string | null
          orden?: number
          texto: string
        }
        Update: {
          creado_en?: string
          es_correcta?: boolean
          id_aula_opcion?: number
          id_aula_pregunta?: number
          opcion?: string | null
          orden?: number
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_opcion_id_aula_pregunta_fkey"
            columns: ["id_aula_pregunta"]
            isOneToOne: false
            referencedRelation: "aula_pregunta"
            referencedColumns: ["id_aula_pregunta"]
          },
          {
            foreignKeyName: "aula_opcion_id_aula_pregunta_fkey"
            columns: ["id_aula_pregunta"]
            isOneToOne: false
            referencedRelation: "evaluacion_detalle"
            referencedColumns: ["id_evaluacion_detalle"]
          },
        ]
      }
      aula_pregunta: {
        Row: {
          creado_en: string
          deleted_at: string | null
          enunciado: string
          id_aula_evaluacion: number
          id_aula_pregunta: number
          orden: number
          pregunta: string | null
          respuesta_correcta: string | null
          tipo: string
          tipo_pregunta: string | null
          updated_at: string
        }
        Insert: {
          creado_en?: string
          deleted_at?: string | null
          enunciado: string
          id_aula_evaluacion: number
          id_aula_pregunta?: number
          orden?: number
          pregunta?: string | null
          respuesta_correcta?: string | null
          tipo?: string
          tipo_pregunta?: string | null
          updated_at?: string
        }
        Update: {
          creado_en?: string
          deleted_at?: string | null
          enunciado?: string
          id_aula_evaluacion?: number
          id_aula_pregunta?: number
          orden?: number
          pregunta?: string | null
          respuesta_correcta?: string | null
          tipo?: string
          tipo_pregunta?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_pregunta_id_aula_evaluacion_fkey"
            columns: ["id_aula_evaluacion"]
            isOneToOne: false
            referencedRelation: "aula_evaluacion"
            referencedColumns: ["id_aula_evaluacion"]
          },
        ]
      }
      aula_progreso_actividad: {
        Row: {
          completada: boolean
          completada_en: string | null
          creado_en: string
          id_aula_actividad: number
          id_aula_progreso_actividad: number
          id_usuario: number
          updated_at: string
        }
        Insert: {
          completada?: boolean
          completada_en?: string | null
          creado_en?: string
          id_aula_actividad: number
          id_aula_progreso_actividad?: number
          id_usuario: number
          updated_at?: string
        }
        Update: {
          completada?: boolean
          completada_en?: string | null
          creado_en?: string
          id_aula_actividad?: number
          id_aula_progreso_actividad?: number
          id_usuario?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_progreso_actividad_id_aula_actividad_fkey"
            columns: ["id_aula_actividad"]
            isOneToOne: false
            referencedRelation: "aula_actividad"
            referencedColumns: ["id_aula_actividad"]
          },
          {
            foreignKeyName: "aula_progreso_actividad_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      aula_respuesta: {
        Row: {
          creado_en: string
          es_correcta: boolean | null
          id_aula_intento_evaluacion: number
          id_aula_opcion: number | null
          id_aula_pregunta: number
          id_aula_respuesta: number
          respuesta: string | null
          respuesta_texto: string | null
        }
        Insert: {
          creado_en?: string
          es_correcta?: boolean | null
          id_aula_intento_evaluacion: number
          id_aula_opcion?: number | null
          id_aula_pregunta: number
          id_aula_respuesta?: number
          respuesta?: string | null
          respuesta_texto?: string | null
        }
        Update: {
          creado_en?: string
          es_correcta?: boolean | null
          id_aula_intento_evaluacion?: number
          id_aula_opcion?: number | null
          id_aula_pregunta?: number
          id_aula_respuesta?: number
          respuesta?: string | null
          respuesta_texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aula_respuesta_id_aula_intento_evaluacion_fkey"
            columns: ["id_aula_intento_evaluacion"]
            isOneToOne: false
            referencedRelation: "aula_intento_evaluacion"
            referencedColumns: ["id_aula_intento_evaluacion"]
          },
          {
            foreignKeyName: "aula_respuesta_id_aula_opcion_fkey"
            columns: ["id_aula_opcion"]
            isOneToOne: false
            referencedRelation: "aula_opcion"
            referencedColumns: ["id_aula_opcion"]
          },
          {
            foreignKeyName: "aula_respuesta_id_aula_pregunta_fkey"
            columns: ["id_aula_pregunta"]
            isOneToOne: false
            referencedRelation: "aula_pregunta"
            referencedColumns: ["id_aula_pregunta"]
          },
          {
            foreignKeyName: "aula_respuesta_id_aula_pregunta_fkey"
            columns: ["id_aula_pregunta"]
            isOneToOne: false
            referencedRelation: "evaluacion_detalle"
            referencedColumns: ["id_evaluacion_detalle"]
          },
        ]
      }
      aula_retroalimentacion: {
        Row: {
          calificacion: number | null
          comentario: string
          creado_en: string
          deleted_at: string | null
          id_aula_actividad: number | null
          id_aula_retroalimentacion: number
          id_usuario: number
          updated_at: string
        }
        Insert: {
          calificacion?: number | null
          comentario: string
          creado_en?: string
          deleted_at?: string | null
          id_aula_actividad?: number | null
          id_aula_retroalimentacion?: number
          id_usuario: number
          updated_at?: string
        }
        Update: {
          calificacion?: number | null
          comentario?: string
          creado_en?: string
          deleted_at?: string | null
          id_aula_actividad?: number | null
          id_aula_retroalimentacion?: number
          id_usuario?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_retroalimentacion_id_aula_actividad_fkey"
            columns: ["id_aula_actividad"]
            isOneToOne: false
            referencedRelation: "aula_actividad"
            referencedColumns: ["id_aula_actividad"]
          },
          {
            foreignKeyName: "aula_retroalimentacion_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      avance_modulo: {
        Row: {
          completado_en: string
          creado_en: string
          id_avance: number
          id_detalle_proceso_curso: number
          id_modulo: number
          id_usuario: number
          updated_at: string
        }
        Insert: {
          completado_en?: string
          creado_en?: string
          id_avance?: number
          id_detalle_proceso_curso: number
          id_modulo: number
          id_usuario: number
          updated_at?: string
        }
        Update: {
          completado_en?: string
          creado_en?: string
          id_avance?: number
          id_detalle_proceso_curso?: number
          id_modulo?: number
          id_usuario?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avance_modulo_id_detalle_proceso_curso_fkey"
            columns: ["id_detalle_proceso_curso"]
            isOneToOne: false
            referencedRelation: "detalle_proceso_curso"
            referencedColumns: ["id_detalle_proceso_curso"]
          },
          {
            foreignKeyName: "avance_modulo_id_detalle_proceso_curso_fkey"
            columns: ["id_detalle_proceso_curso"]
            isOneToOne: false
            referencedRelation: "v_avance_curso_detalle"
            referencedColumns: ["id_detalle_proceso_curso"]
          },
          {
            foreignKeyName: "avance_modulo_id_detalle_proceso_curso_fkey"
            columns: ["id_detalle_proceso_curso"]
            isOneToOne: false
            referencedRelation: "v_companeros_ciclo"
            referencedColumns: ["id_detalle_proceso_curso"]
          },
          {
            foreignKeyName: "avance_modulo_id_modulo_fkey"
            columns: ["id_modulo"]
            isOneToOne: false
            referencedRelation: "modulo"
            referencedColumns: ["id_modulo"]
          },
          {
            foreignKeyName: "avance_modulo_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      ciudad: {
        Row: {
          creado_en: string
          deleted_at: string | null
          id_ciudad: number
          id_departamento: number
          nombre: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          deleted_at?: string | null
          id_ciudad?: number
          id_departamento: number
          nombre: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
          deleted_at?: string | null
          id_ciudad?: number
          id_departamento?: number
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ciudad_id_departamento_fkey"
            columns: ["id_departamento"]
            isOneToOne: false
            referencedRelation: "departamento"
            referencedColumns: ["id_departamento"]
          },
        ]
      }
      curso: {
        Row: {
          creado_en: string
          descripcion: string | null
          duracion_horas: number | null
          estado: Database["public"]["Enums"]["estado_curso"]
          id_curso: number
          id_ministerio: number
          id_usuario_creador: number
          nombre: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          descripcion?: string | null
          duracion_horas?: number | null
          estado?: Database["public"]["Enums"]["estado_curso"]
          id_curso?: number
          id_ministerio: number
          id_usuario_creador: number
          nombre: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
          descripcion?: string | null
          duracion_horas?: number | null
          estado?: Database["public"]["Enums"]["estado_curso"]
          id_curso?: number
          id_ministerio?: number
          id_usuario_creador?: number
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curso_id_ministerio_fkey"
            columns: ["id_ministerio"]
            isOneToOne: false
            referencedRelation: "ministerio"
            referencedColumns: ["id_ministerio"]
          },
          {
            foreignKeyName: "curso_id_usuario_creador_fkey"
            columns: ["id_usuario_creador"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      departamento: {
        Row: {
          creado_en: string
          deleted_at: string | null
          id_departamento: number
          id_pais: number
          nombre: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          deleted_at?: string | null
          id_departamento?: number
          id_pais: number
          nombre: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
          deleted_at?: string | null
          id_departamento?: number
          id_pais?: number
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departamento_id_pais_fkey"
            columns: ["id_pais"]
            isOneToOne: false
            referencedRelation: "pais"
            referencedColumns: ["id_pais"]
          },
        ]
      }
      detalle_proceso_curso: {
        Row: {
          creado_en: string
          estado: Database["public"]["Enums"]["estado_detalle"]
          fecha_inscripcion: string
          id_detalle_proceso_curso: number
          id_proceso_asignado_curso: number
          id_usuario: number
          updated_at: string
        }
        Insert: {
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_detalle"]
          fecha_inscripcion?: string
          id_detalle_proceso_curso?: number
          id_proceso_asignado_curso: number
          id_usuario: number
          updated_at?: string
        }
        Update: {
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_detalle"]
          fecha_inscripcion?: string
          id_detalle_proceso_curso?: number
          id_proceso_asignado_curso?: number
          id_usuario?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "detalle_proceso_curso_id_proceso_asignado_curso_fkey"
            columns: ["id_proceso_asignado_curso"]
            isOneToOne: false
            referencedRelation: "proceso_asignado_curso"
            referencedColumns: ["id_proceso_asignado_curso"]
          },
          {
            foreignKeyName: "detalle_proceso_curso_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      evaluacion: {
        Row: {
          calificacion: number | null
          creado_en: string
          estado: Database["public"]["Enums"]["estado_evaluacion"]
          fecha_evaluacion: string | null
          id_evaluacion: number
          id_modulo: number
          id_usuario: number
          observaciones: string | null
          updated_at: string
        }
        Insert: {
          calificacion?: number | null
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_evaluacion"]
          fecha_evaluacion?: string | null
          id_evaluacion?: number
          id_modulo: number
          id_usuario: number
          observaciones?: string | null
          updated_at?: string
        }
        Update: {
          calificacion?: number | null
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_evaluacion"]
          fecha_evaluacion?: string | null
          id_evaluacion?: number
          id_modulo?: number
          id_usuario?: number
          observaciones?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluacion_id_modulo_fkey"
            columns: ["id_modulo"]
            isOneToOne: false
            referencedRelation: "modulo"
            referencedColumns: ["id_modulo"]
          },
          {
            foreignKeyName: "evaluacion_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      evento: {
        Row: {
          creado_en: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_evento"]
          fecha_fin: string
          fecha_inicio: string
          id_evento: number
          id_iglesia: number
          id_ministerio: number | null
          id_sede: number | null
          id_tipo_evento: number | null
          nombre: string
          tipo_evento_texto: string | null
          updated_at: string
        }
        Insert: {
          creado_en?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_evento"]
          fecha_fin: string
          fecha_inicio: string
          id_evento?: number
          id_iglesia: number
          id_ministerio?: number | null
          id_sede?: number | null
          id_tipo_evento?: number | null
          nombre: string
          tipo_evento_texto?: string | null
          updated_at?: string
        }
        Update: {
          creado_en?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_evento"]
          fecha_fin?: string
          fecha_inicio?: string
          id_evento?: number
          id_iglesia?: number
          id_ministerio?: number | null
          id_sede?: number | null
          id_tipo_evento?: number | null
          nombre?: string
          tipo_evento_texto?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_id_iglesia_fkey"
            columns: ["id_iglesia"]
            isOneToOne: false
            referencedRelation: "iglesia"
            referencedColumns: ["id_iglesia"]
          },
          {
            foreignKeyName: "evento_id_ministerio_fkey"
            columns: ["id_ministerio"]
            isOneToOne: false
            referencedRelation: "ministerio"
            referencedColumns: ["id_ministerio"]
          },
          {
            foreignKeyName: "evento_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id_sede"]
          },
          {
            foreignKeyName: "evento_id_tipo_evento_fkey"
            columns: ["id_tipo_evento"]
            isOneToOne: false
            referencedRelation: "tipo_evento"
            referencedColumns: ["id_tipo_evento"]
          },
        ]
      }
      evento_ministerio: {
        Row: {
          creado_en: string
          id_evento: number
          id_evento_ministerio: number
          id_ministerio: number
        }
        Insert: {
          creado_en?: string
          id_evento: number
          id_evento_ministerio?: number
          id_ministerio: number
        }
        Update: {
          creado_en?: string
          id_evento?: number
          id_evento_ministerio?: number
          id_ministerio?: number
        }
        Relationships: [
          {
            foreignKeyName: "evento_ministerio_id_evento_fkey"
            columns: ["id_evento"]
            isOneToOne: false
            referencedRelation: "evento"
            referencedColumns: ["id_evento"]
          },
          {
            foreignKeyName: "evento_ministerio_id_ministerio_fkey"
            columns: ["id_ministerio"]
            isOneToOne: false
            referencedRelation: "ministerio"
            referencedColumns: ["id_ministerio"]
          },
        ]
      }
      hoja_de_vida: {
        Row: {
          creado_en: string
          experiencia_laboral: string | null
          formacion_academica: string | null
          habilidades: string | null
          id_hoja_de_vida: number
          id_usuario: number
          perfil_profesional: string | null
          updated_at: string
        }
        Insert: {
          creado_en?: string
          experiencia_laboral?: string | null
          formacion_academica?: string | null
          habilidades?: string | null
          id_hoja_de_vida?: number
          id_usuario: number
          perfil_profesional?: string | null
          updated_at?: string
        }
        Update: {
          creado_en?: string
          experiencia_laboral?: string | null
          formacion_academica?: string | null
          habilidades?: string | null
          id_hoja_de_vida?: number
          id_usuario?: number
          perfil_profesional?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hoja_de_vida_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      hoja_de_vida_disponibilidad: {
        Row: {
          activo: boolean | null
          actualizado_en: string | null
          creado_en: string | null
          dias_semana: string[] | null
          franja_horaria: string | null
          id_disponibilidad: number
          id_hoja_de_vida: number
          id_ministerio: number | null
          id_sede: number | null
          modalidad: string | null
        }
        Insert: {
          activo?: boolean | null
          actualizado_en?: string | null
          creado_en?: string | null
          dias_semana?: string[] | null
          franja_horaria?: string | null
          id_disponibilidad?: number
          id_hoja_de_vida: number
          id_ministerio?: number | null
          id_sede?: number | null
          modalidad?: string | null
        }
        Update: {
          activo?: boolean | null
          actualizado_en?: string | null
          creado_en?: string | null
          dias_semana?: string[] | null
          franja_horaria?: string | null
          id_disponibilidad?: number
          id_hoja_de_vida?: number
          id_ministerio?: number | null
          id_sede?: number | null
          modalidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hoja_de_vida_disponibilidad_id_hoja_de_vida_fkey"
            columns: ["id_hoja_de_vida"]
            isOneToOne: false
            referencedRelation: "hoja_de_vida"
            referencedColumns: ["id_hoja_de_vida"]
          },
          {
            foreignKeyName: "hoja_de_vida_disponibilidad_id_ministerio_fkey"
            columns: ["id_ministerio"]
            isOneToOne: false
            referencedRelation: "ministerio"
            referencedColumns: ["id_ministerio"]
          },
          {
            foreignKeyName: "hoja_de_vida_disponibilidad_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id_sede"]
          },
        ]
      }
      hoja_de_vida_etiqueta: {
        Row: {
          activa: boolean | null
          categoria: string
          creado_en: string | null
          id_etiqueta: number
          nombre: string
        }
        Insert: {
          activa?: boolean | null
          categoria: string
          creado_en?: string | null
          id_etiqueta?: number
          nombre: string
        }
        Update: {
          activa?: boolean | null
          categoria?: string
          creado_en?: string | null
          id_etiqueta?: number
          nombre?: string
        }
        Relationships: []
      }
      hoja_de_vida_etiqueta_usuario: {
        Row: {
          asignada_por: number | null
          creado_en: string | null
          id_etiqueta: number
          id_hoja_de_vida: number
        }
        Insert: {
          asignada_por?: number | null
          creado_en?: string | null
          id_etiqueta: number
          id_hoja_de_vida: number
        }
        Update: {
          asignada_por?: number | null
          creado_en?: string | null
          id_etiqueta?: number
          id_hoja_de_vida?: number
        }
        Relationships: [
          {
            foreignKeyName: "hoja_de_vida_etiqueta_usuario_asignada_por_fkey"
            columns: ["asignada_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "hoja_de_vida_etiqueta_usuario_id_etiqueta_fkey"
            columns: ["id_etiqueta"]
            isOneToOne: false
            referencedRelation: "hoja_de_vida_etiqueta"
            referencedColumns: ["id_etiqueta"]
          },
          {
            foreignKeyName: "hoja_de_vida_etiqueta_usuario_id_hoja_de_vida_fkey"
            columns: ["id_hoja_de_vida"]
            isOneToOne: false
            referencedRelation: "hoja_de_vida"
            referencedColumns: ["id_hoja_de_vida"]
          },
        ]
      }
      hoja_de_vida_revision: {
        Row: {
          actualizado_en: string | null
          creado_en: string | null
          estado_revision: string
          id_hoja_de_vida: number
          id_revision: number
          id_revisor: number
          observaciones: string | null
          revisado_en: string | null
          rol_revisor: string
        }
        Insert: {
          actualizado_en?: string | null
          creado_en?: string | null
          estado_revision?: string
          id_hoja_de_vida: number
          id_revision?: number
          id_revisor: number
          observaciones?: string | null
          revisado_en?: string | null
          rol_revisor: string
        }
        Update: {
          actualizado_en?: string | null
          creado_en?: string | null
          estado_revision?: string
          id_hoja_de_vida?: number
          id_revision?: number
          id_revisor?: number
          observaciones?: string | null
          revisado_en?: string | null
          rol_revisor?: string
        }
        Relationships: [
          {
            foreignKeyName: "hoja_de_vida_revision_id_hoja_de_vida_fkey"
            columns: ["id_hoja_de_vida"]
            isOneToOne: false
            referencedRelation: "hoja_de_vida"
            referencedColumns: ["id_hoja_de_vida"]
          },
          {
            foreignKeyName: "hoja_de_vida_revision_id_revisor_fkey"
            columns: ["id_revisor"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      iglesia: {
        Row: {
          creado_en: string
          descripcion: string | null
          direccion: string | null
          estado: Database["public"]["Enums"]["estado_iglesia"]
          fecha_fundacion: string | null
          id_ciudad: number
          id_iglesia: number
          nombre: string
          sitio_web: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          creado_en?: string
          descripcion?: string | null
          direccion?: string | null
          estado?: Database["public"]["Enums"]["estado_iglesia"]
          fecha_fundacion?: string | null
          id_ciudad: number
          id_iglesia?: number
          nombre: string
          sitio_web?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          creado_en?: string
          descripcion?: string | null
          direccion?: string | null
          estado?: Database["public"]["Enums"]["estado_iglesia"]
          fecha_fundacion?: string | null
          id_ciudad?: number
          id_iglesia?: number
          nombre?: string
          sitio_web?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iglesia_id_ciudad_fkey"
            columns: ["id_ciudad"]
            isOneToOne: false
            referencedRelation: "ciudad"
            referencedColumns: ["id_ciudad"]
          },
        ]
      }
      iglesia_pastor: {
        Row: {
          creado_en: string
          es_principal: boolean
          fecha_fin: string | null
          fecha_inicio: string
          id_iglesia: number
          id_iglesia_pastor: number
          id_pastor: number
          observaciones: string | null
          updated_at: string
        }
        Insert: {
          creado_en?: string
          es_principal?: boolean
          fecha_fin?: string | null
          fecha_inicio: string
          id_iglesia: number
          id_iglesia_pastor?: number
          id_pastor: number
          observaciones?: string | null
          updated_at?: string
        }
        Update: {
          creado_en?: string
          es_principal?: boolean
          fecha_fin?: string | null
          fecha_inicio?: string
          id_iglesia?: number
          id_iglesia_pastor?: number
          id_pastor?: number
          observaciones?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iglesia_pastor_id_iglesia_fkey"
            columns: ["id_iglesia"]
            isOneToOne: false
            referencedRelation: "iglesia"
            referencedColumns: ["id_iglesia"]
          },
          {
            foreignKeyName: "iglesia_pastor_id_pastor_fkey"
            columns: ["id_pastor"]
            isOneToOne: false
            referencedRelation: "pastor"
            referencedColumns: ["id_pastor"]
          },
        ]
      }
      invite_tokens: {
        Row: {
          apellidos: string
          creado_en: string
          email: string
          expires_at: string
          id_iglesia: number
          id_invite_token: number
          id_ministerio: number | null
          id_rol: number
          id_sede: number | null
          nombres: string
          token: string
          updated_at: string
          used_at: string | null
        }
        Insert: {
          apellidos: string
          creado_en?: string
          email: string
          expires_at: string
          id_iglesia: number
          id_invite_token?: number
          id_ministerio?: number | null
          id_rol: number
          id_sede?: number | null
          nombres: string
          token: string
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          apellidos?: string
          creado_en?: string
          email?: string
          expires_at?: string
          id_iglesia?: number
          id_invite_token?: number
          id_ministerio?: number | null
          id_rol?: number
          id_sede?: number | null
          nombres?: string
          token?: string
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_tokens_id_iglesia_fkey"
            columns: ["id_iglesia"]
            isOneToOne: false
            referencedRelation: "iglesia"
            referencedColumns: ["id_iglesia"]
          },
          {
            foreignKeyName: "invite_tokens_id_ministerio_fkey"
            columns: ["id_ministerio"]
            isOneToOne: false
            referencedRelation: "ministerio"
            referencedColumns: ["id_ministerio"]
          },
          {
            foreignKeyName: "invite_tokens_id_rol_fkey"
            columns: ["id_rol"]
            isOneToOne: false
            referencedRelation: "rol"
            referencedColumns: ["id_rol"]
          },
          {
            foreignKeyName: "invite_tokens_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id_sede"]
          },
        ]
      }
      miembro_ministerio: {
        Row: {
          creado_en: string
          fecha_ingreso: string
          fecha_salida: string | null
          id_miembro_ministerio: number
          id_ministerio: number
          id_usuario: number
          rol_en_ministerio: string | null
          updated_at: string
        }
        Insert: {
          creado_en?: string
          fecha_ingreso?: string
          fecha_salida?: string | null
          id_miembro_ministerio?: number
          id_ministerio: number
          id_usuario: number
          rol_en_ministerio?: string | null
          updated_at?: string
        }
        Update: {
          creado_en?: string
          fecha_ingreso?: string
          fecha_salida?: string | null
          id_miembro_ministerio?: number
          id_ministerio?: number
          id_usuario?: number
          rol_en_ministerio?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "miembro_ministerio_id_ministerio_fkey"
            columns: ["id_ministerio"]
            isOneToOne: false
            referencedRelation: "ministerio"
            referencedColumns: ["id_ministerio"]
          },
          {
            foreignKeyName: "miembro_ministerio_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      ministerio: {
        Row: {
          creado_en: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_ministerio"]
          id_ministerio: number
          id_sede: number
          nombre: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_ministerio"]
          id_ministerio?: number
          id_sede: number
          nombre: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_ministerio"]
          id_ministerio?: number
          id_sede?: number
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministerio_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id_sede"]
          },
        ]
      }
      modulo: {
        Row: {
          contenido_md: string | null
          creado_en: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_modulo"]
          id_curso: number
          id_modulo: number
          orden: number
          titulo: string
          updated_at: string
        }
        Insert: {
          contenido_md?: string | null
          creado_en?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_modulo"]
          id_curso: number
          id_modulo?: number
          orden?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          contenido_md?: string | null
          creado_en?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_modulo"]
          id_curso?: number
          id_modulo?: number
          orden?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modulo_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "curso"
            referencedColumns: ["id_curso"]
          },
        ]
      }
      notificacion: {
        Row: {
          creado_en: string
          fecha_lectura: string | null
          id_notificacion: number
          id_usuario: number
          leida: boolean
          mensaje: string
          tipo: Database["public"]["Enums"]["tipo_notificacion"]
          titulo: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          fecha_lectura?: string | null
          id_notificacion?: number
          id_usuario: number
          leida?: boolean
          mensaje: string
          tipo?: Database["public"]["Enums"]["tipo_notificacion"]
          titulo: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
          fecha_lectura?: string | null
          id_notificacion?: number
          id_usuario?: number
          leida?: boolean
          mensaje?: string
          tipo?: Database["public"]["Enums"]["tipo_notificacion"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacion_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      pais: {
        Row: {
          creado_en: string
          deleted_at: string | null
          id_pais: number
          nombre: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          deleted_at?: string | null
          id_pais?: number
          nombre: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
          deleted_at?: string | null
          id_pais?: number
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      pastor: {
        Row: {
          apellidos: string
          biografia: string | null
          correo: string
          creado_en: string
          direccion: string | null
          fecha_nacimiento: string | null
          id_iglesia: number | null
          id_pastor: number
          id_usuario: number | null
          nombres: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          apellidos: string
          biografia?: string | null
          correo: string
          creado_en?: string
          direccion?: string | null
          fecha_nacimiento?: string | null
          id_iglesia?: number | null
          id_pastor?: number
          id_usuario?: number | null
          nombres: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          apellidos?: string
          biografia?: string | null
          correo?: string
          creado_en?: string
          direccion?: string | null
          fecha_nacimiento?: string | null
          id_iglesia?: number | null
          id_pastor?: number
          id_usuario?: number | null
          nombres?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pastor_id_iglesia_fkey"
            columns: ["id_iglesia"]
            isOneToOne: false
            referencedRelation: "iglesia"
            referencedColumns: ["id_iglesia"]
          },
          {
            foreignKeyName: "pastor_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: true
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      proceso_asignado_curso: {
        Row: {
          creado_en: string
          estado: Database["public"]["Enums"]["estado_proceso"]
          fecha_fin: string
          fecha_inicio: string
          id_curso: number
          id_iglesia: number
          id_proceso_asignado_curso: number
          updated_at: string
        }
        Insert: {
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_proceso"]
          fecha_fin: string
          fecha_inicio: string
          id_curso: number
          id_iglesia: number
          id_proceso_asignado_curso?: number
          updated_at?: string
        }
        Update: {
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_proceso"]
          fecha_fin?: string
          fecha_inicio?: string
          id_curso?: number
          id_iglesia?: number
          id_proceso_asignado_curso?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proceso_asignado_curso_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "curso"
            referencedColumns: ["id_curso"]
          },
          {
            foreignKeyName: "proceso_asignado_curso_id_iglesia_fkey"
            columns: ["id_iglesia"]
            isOneToOne: false
            referencedRelation: "iglesia"
            referencedColumns: ["id_iglesia"]
          },
        ]
      }
      reset_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id_reset_token: number
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id_reset_token?: number
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id_reset_token?: number
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      rol: {
        Row: {
          creado_en: string
          descripcion: string | null
          id_rol: number
          nombre: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          descripcion?: string | null
          id_rol?: number
          nombre: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
          descripcion?: string | null
          id_rol?: number
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      schema_migrations: {
        Row: {
          executed_at: string | null
          execution_time: number | null
          name: string
          success: boolean | null
          version: number
        }
        Insert: {
          executed_at?: string | null
          execution_time?: number | null
          name: string
          success?: boolean | null
          version: number
        }
        Update: {
          executed_at?: string | null
          execution_time?: number | null
          name?: string
          success?: boolean | null
          version?: number
        }
        Relationships: []
      }
      sede: {
        Row: {
          creado_en: string
          direccion: string | null
          estado: Database["public"]["Enums"]["estado_sede"]
          id_ciudad: number
          id_iglesia: number
          id_sede: number
          nombre: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          direccion?: string | null
          estado?: Database["public"]["Enums"]["estado_sede"]
          id_ciudad: number
          id_iglesia: number
          id_sede?: number
          nombre: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
          direccion?: string | null
          estado?: Database["public"]["Enums"]["estado_sede"]
          id_ciudad?: number
          id_iglesia?: number
          id_sede?: number
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sede_id_ciudad_fkey"
            columns: ["id_ciudad"]
            isOneToOne: false
            referencedRelation: "ciudad"
            referencedColumns: ["id_ciudad"]
          },
          {
            foreignKeyName: "sede_id_iglesia_fkey"
            columns: ["id_iglesia"]
            isOneToOne: false
            referencedRelation: "iglesia"
            referencedColumns: ["id_iglesia"]
          },
        ]
      }
      sede_pastor: {
        Row: {
          creado_en: string
          es_principal: boolean
          fecha_fin: string | null
          fecha_inicio: string
          id_pastor: number
          id_sede: number
          id_sede_pastor: number
          observaciones: string | null
          updated_at: string
        }
        Insert: {
          creado_en?: string
          es_principal?: boolean
          fecha_fin?: string | null
          fecha_inicio: string
          id_pastor: number
          id_sede: number
          id_sede_pastor?: number
          observaciones?: string | null
          updated_at?: string
        }
        Update: {
          creado_en?: string
          es_principal?: boolean
          fecha_fin?: string | null
          fecha_inicio?: string
          id_pastor?: number
          id_sede?: number
          id_sede_pastor?: number
          observaciones?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sede_pastor_id_pastor_fkey"
            columns: ["id_pastor"]
            isOneToOne: false
            referencedRelation: "pastor"
            referencedColumns: ["id_pastor"]
          },
          {
            foreignKeyName: "sede_pastor_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id_sede"]
          },
        ]
      }
      tarea: {
        Row: {
          creado_en: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_tarea"]
          fecha_limite: string | null
          id_evento: number | null
          id_iglesia: number | null
          id_ministerio: number | null
          id_tarea: number
          id_usuario_creador: number
          prioridad: Database["public"]["Enums"]["prioridad_tarea"]
          titulo: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_tarea"]
          fecha_limite?: string | null
          id_evento?: number | null
          id_iglesia?: number | null
          id_ministerio?: number | null
          id_tarea?: number
          id_usuario_creador: number
          prioridad?: Database["public"]["Enums"]["prioridad_tarea"]
          titulo: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_tarea"]
          fecha_limite?: string | null
          id_evento?: number | null
          id_iglesia?: number | null
          id_ministerio?: number | null
          id_tarea?: number
          id_usuario_creador?: number
          prioridad?: Database["public"]["Enums"]["prioridad_tarea"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarea_id_evento_fkey"
            columns: ["id_evento"]
            isOneToOne: false
            referencedRelation: "evento"
            referencedColumns: ["id_evento"]
          },
          {
            foreignKeyName: "tarea_id_iglesia_fkey"
            columns: ["id_iglesia"]
            isOneToOne: false
            referencedRelation: "iglesia"
            referencedColumns: ["id_iglesia"]
          },
          {
            foreignKeyName: "tarea_id_ministerio_fkey"
            columns: ["id_ministerio"]
            isOneToOne: false
            referencedRelation: "ministerio"
            referencedColumns: ["id_ministerio"]
          },
          {
            foreignKeyName: "tarea_id_usuario_creador_fkey"
            columns: ["id_usuario_creador"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      tarea_aprobacion: {
        Row: {
          accion: string
          creado_en: string
          id_tarea: number
          id_tarea_aprobacion: number
          id_usuario: number
          observaciones: string | null
        }
        Insert: {
          accion: string
          creado_en?: string
          id_tarea: number
          id_tarea_aprobacion?: number
          id_usuario: number
          observaciones?: string | null
        }
        Update: {
          accion?: string
          creado_en?: string
          id_tarea?: number
          id_tarea_aprobacion?: number
          id_usuario?: number
          observaciones?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarea_aprobacion_id_tarea_fkey"
            columns: ["id_tarea"]
            isOneToOne: false
            referencedRelation: "tarea"
            referencedColumns: ["id_tarea"]
          },
          {
            foreignKeyName: "tarea_aprobacion_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      tarea_asignada: {
        Row: {
          creado_en: string
          fecha_asignacion: string
          fecha_completado: string | null
          id_tarea: number
          id_tarea_asignada: number
          id_usuario: number
          observaciones: string | null
          updated_at: string
        }
        Insert: {
          creado_en?: string
          fecha_asignacion?: string
          fecha_completado?: string | null
          id_tarea: number
          id_tarea_asignada?: number
          id_usuario: number
          observaciones?: string | null
          updated_at?: string
        }
        Update: {
          creado_en?: string
          fecha_asignacion?: string
          fecha_completado?: string | null
          id_tarea?: number
          id_tarea_asignada?: number
          id_usuario?: number
          observaciones?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarea_asignada_id_tarea_fkey"
            columns: ["id_tarea"]
            isOneToOne: false
            referencedRelation: "tarea"
            referencedColumns: ["id_tarea"]
          },
          {
            foreignKeyName: "tarea_asignada_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      tarea_checklist: {
        Row: {
          completada: boolean
          completada_en: string | null
          completada_por: number | null
          creado_en: string
          id_tarea: number
          id_tarea_checklist: number
          orden: number
          titulo: string
          updated_at: string
        }
        Insert: {
          completada?: boolean
          completada_en?: string | null
          completada_por?: number | null
          creado_en?: string
          id_tarea: number
          id_tarea_checklist?: number
          orden?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          completada?: boolean
          completada_en?: string | null
          completada_por?: number | null
          creado_en?: string
          id_tarea?: number
          id_tarea_checklist?: number
          orden?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarea_checklist_completada_por_fkey"
            columns: ["completada_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "tarea_checklist_id_tarea_fkey"
            columns: ["id_tarea"]
            isOneToOne: false
            referencedRelation: "tarea"
            referencedColumns: ["id_tarea"]
          },
        ]
      }
      tarea_comentario: {
        Row: {
          contenido: string
          creado_en: string
          id_tarea: number
          id_tarea_comentario: number
          id_usuario: number
        }
        Insert: {
          contenido: string
          creado_en?: string
          id_tarea: number
          id_tarea_comentario?: number
          id_usuario: number
        }
        Update: {
          contenido?: string
          creado_en?: string
          id_tarea?: number
          id_tarea_comentario?: number
          id_usuario?: number
        }
        Relationships: [
          {
            foreignKeyName: "tarea_comentario_id_tarea_fkey"
            columns: ["id_tarea"]
            isOneToOne: false
            referencedRelation: "tarea"
            referencedColumns: ["id_tarea"]
          },
          {
            foreignKeyName: "tarea_comentario_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      tarea_evidencia: {
        Row: {
          creado_en: string
          id_tarea_asignada: number
          id_tarea_evidencia: number
          id_usuario: number
          nombre_archivo: string
          object_path: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          id_tarea_asignada: number
          id_tarea_evidencia?: number
          id_usuario: number
          nombre_archivo: string
          object_path: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
          id_tarea_asignada?: number
          id_tarea_evidencia?: number
          id_usuario?: number
          nombre_archivo?: string
          object_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarea_evidencia_id_tarea_asignada_fkey"
            columns: ["id_tarea_asignada"]
            isOneToOne: false
            referencedRelation: "tarea_asignada"
            referencedColumns: ["id_tarea_asignada"]
          },
          {
            foreignKeyName: "tarea_evidencia_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      tarea_historial: {
        Row: {
          accion: string
          creado_en: string
          id_tarea: number
          id_tarea_historial: number
          id_usuario: number
          metadata: Json | null
          valor_anterior: string | null
          valor_nuevo: string | null
        }
        Insert: {
          accion: string
          creado_en?: string
          id_tarea: number
          id_tarea_historial?: number
          id_usuario: number
          metadata?: Json | null
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Update: {
          accion?: string
          creado_en?: string
          id_tarea?: number
          id_tarea_historial?: number
          id_usuario?: number
          metadata?: Json | null
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarea_historial_id_tarea_fkey"
            columns: ["id_tarea"]
            isOneToOne: false
            referencedRelation: "tarea"
            referencedColumns: ["id_tarea"]
          },
          {
            foreignKeyName: "tarea_historial_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      tipo_evento: {
        Row: {
          creado_en: string
          descripcion: string | null
          id_tipo_evento: number
          nombre: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          descripcion?: string | null
          id_tipo_evento?: number
          nombre: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
          descripcion?: string | null
          id_tipo_evento?: number
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      usuario: {
        Row: {
          activo: boolean
          apellidos: string
          auth_user_id: string | null
          contrasena_hash: string
          correo: string
          creado_en: string
          fecha_nacimiento: string | null
          id_usuario: number
          nombres: string
          telefono: string | null
          ultimo_acceso: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          apellidos: string
          auth_user_id?: string | null
          contrasena_hash: string
          correo: string
          creado_en?: string
          fecha_nacimiento?: string | null
          id_usuario?: number
          nombres: string
          telefono?: string | null
          ultimo_acceso?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          apellidos?: string
          auth_user_id?: string | null
          contrasena_hash?: string
          correo?: string
          creado_en?: string
          fecha_nacimiento?: string | null
          id_usuario?: number
          nombres?: string
          telefono?: string | null
          ultimo_acceso?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      usuario_rol: {
        Row: {
          creado_en: string
          fecha_fin: string | null
          fecha_inicio: string
          id_iglesia: number | null
          id_rol: number
          id_sede: number | null
          id_usuario: number
          id_usuario_rol: number
          permissions_updated_at: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id_iglesia?: number | null
          id_rol: number
          id_sede?: number | null
          id_usuario: number
          id_usuario_rol?: number
          permissions_updated_at?: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id_iglesia?: number | null
          id_rol?: number
          id_sede?: number | null
          id_usuario?: number
          id_usuario_rol?: number
          permissions_updated_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_rol_id_iglesia_fkey"
            columns: ["id_iglesia"]
            isOneToOne: false
            referencedRelation: "iglesia"
            referencedColumns: ["id_iglesia"]
          },
          {
            foreignKeyName: "usuario_rol_id_rol_fkey"
            columns: ["id_rol"]
            isOneToOne: false
            referencedRelation: "rol"
            referencedColumns: ["id_rol"]
          },
          {
            foreignKeyName: "usuario_rol_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id_sede"]
          },
          {
            foreignKeyName: "usuario_rol_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      usuario_rol_sede: {
        Row: {
          creado_en: string
          fecha_fin: string | null
          fecha_inicio: string
          id_iglesia: number
          id_rol: number
          id_sede: number | null
          id_usuario: number
          id_usuario_rol_sede: number
          updated_at: string
        }
        Insert: {
          creado_en?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id_iglesia: number
          id_rol: number
          id_sede?: number | null
          id_usuario: number
          id_usuario_rol_sede?: number
          updated_at?: string
        }
        Update: {
          creado_en?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id_iglesia?: number
          id_rol?: number
          id_sede?: number | null
          id_usuario?: number
          id_usuario_rol_sede?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_rol_sede_id_iglesia_fkey"
            columns: ["id_iglesia"]
            isOneToOne: false
            referencedRelation: "iglesia"
            referencedColumns: ["id_iglesia"]
          },
          {
            foreignKeyName: "usuario_rol_sede_id_rol_fkey"
            columns: ["id_rol"]
            isOneToOne: false
            referencedRelation: "rol"
            referencedColumns: ["id_rol"]
          },
          {
            foreignKeyName: "usuario_rol_sede_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id_sede"]
          },
          {
            foreignKeyName: "usuario_rol_sede_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      usuario_sede: {
        Row: {
          creado_en: string
          estado: string
          fecha_ingreso: string
          id: number
          id_sede: number
          id_usuario: number
          updated_at: string
        }
        Insert: {
          creado_en?: string
          estado?: string
          fecha_ingreso?: string
          id?: number
          id_sede: number
          id_usuario: number
          updated_at?: string
        }
        Update: {
          creado_en?: string
          estado?: string
          fecha_ingreso?: string
          id?: number
          id_sede?: number
          id_usuario?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_sede_id_sede_fkey"
            columns: ["id_sede"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id_sede"]
          },
          {
            foreignKeyName: "usuario_sede_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
    }
    Views: {
      evaluacion_detalle: {
        Row: {
          creado_en: string | null
          id_aula_evaluacion: number | null
          id_aula_modulo: number | null
          id_evaluacion_detalle: number | null
          orden: number | null
          pregunta: string | null
          respuesta_correcta: string | null
          tipo_pregunta: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aula_evaluacion_id_aula_modulo_fkey"
            columns: ["id_aula_modulo"]
            isOneToOne: false
            referencedRelation: "aula_modulo"
            referencedColumns: ["id_aula_modulo"]
          },
          {
            foreignKeyName: "aula_pregunta_id_aula_evaluacion_fkey"
            columns: ["id_aula_evaluacion"]
            isOneToOne: false
            referencedRelation: "aula_evaluacion"
            referencedColumns: ["id_aula_evaluacion"]
          },
        ]
      }
      v_avance_curso_detalle: {
        Row: {
          id_curso: number | null
          id_detalle_proceso_curso: number | null
          id_proceso_asignado_curso: number | null
          id_usuario: number | null
          modulos_completados: number | null
          modulos_publicados: number | null
        }
        Relationships: [
          {
            foreignKeyName: "detalle_proceso_curso_id_proceso_asignado_curso_fkey"
            columns: ["id_proceso_asignado_curso"]
            isOneToOne: false
            referencedRelation: "proceso_asignado_curso"
            referencedColumns: ["id_proceso_asignado_curso"]
          },
          {
            foreignKeyName: "detalle_proceso_curso_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "proceso_asignado_curso_id_curso_fkey"
            columns: ["id_curso"]
            isOneToOne: false
            referencedRelation: "curso"
            referencedColumns: ["id_curso"]
          },
        ]
      }
      v_companeros_ciclo: {
        Row: {
          apellidos: string | null
          estado: Database["public"]["Enums"]["estado_detalle"] | null
          id_detalle_proceso_curso: number | null
          id_proceso_asignado_curso: number | null
          id_usuario: number | null
          nombres: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detalle_proceso_curso_id_proceso_asignado_curso_fkey"
            columns: ["id_proceso_asignado_curso"]
            isOneToOne: false
            referencedRelation: "proceso_asignado_curso"
            referencedColumns: ["id_proceso_asignado_curso"]
          },
          {
            foreignKeyName: "detalle_proceso_curso_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
    }
    Functions: {
      _current_app_user_id: { Args: never; Returns: number }
      _is_manager: { Args: never; Returns: boolean }
      assign_role_with_ministerio: {
        Args: {
          p_id_iglesia: number
          p_id_ministerio?: number
          p_id_rol: number
          p_id_sede?: number
          p_id_usuario: number
        }
        Returns: Json
      }
      aula_recursos_modulo_id_from_name: {
        Args: { object_name: string }
        Returns: number
      }
      can_access_aula_curso: {
        Args: { p_id_aula_curso: number }
        Returns: boolean
      }
      can_assign_role: { Args: { target_role_id: number }; Returns: boolean }
      can_enroll_in_ciclo: {
        Args: { target_ciclo_id: number }
        Returns: boolean
      }
      can_manage_curso_scope: {
        Args: { target_curso_id: number }
        Returns: boolean
      }
      can_manage_ministerio_formacion_scope: {
        Args: { target_ministerio_id: number }
        Returns: boolean
      }
      can_manage_ministerio_scope: {
        Args: { target_ministerio_id: number }
        Returns: boolean
      }
      can_read_modulo_as_student: {
        Args: { p_id_modulo: number }
        Returns: boolean
      }
      can_read_proceso_as_student: {
        Args: { target_ciclo_id: number }
        Returns: boolean
      }
      create_evento_with_ministerios: {
        Args: {
          p_descripcion?: string
          p_fecha_fin?: string
          p_fecha_inicio?: string
          p_id_iglesia: number
          p_id_ministerios?: number[]
          p_id_sede?: number
          p_nombre: string
          p_tipo_evento_texto?: string
        }
        Returns: {
          creado_en: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_evento"]
          fecha_fin: string
          fecha_inicio: string
          id_evento: number
          id_iglesia: number
          id_ministerio: number | null
          id_sede: number | null
          id_tipo_evento: number | null
          nombre: string
          tipo_evento_texto: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "evento"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_tarea: {
        Args: {
          p_descripcion?: string
          p_fecha_limite?: string
          p_id_evento?: number
          p_id_ministerio?: number
          p_id_usuario_creador?: number
          p_prioridad?: string
          p_titulo: string
        }
        Returns: {
          creado_en: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_tarea"]
          fecha_limite: string | null
          id_evento: number | null
          id_iglesia: number | null
          id_ministerio: number | null
          id_tarea: number
          id_usuario_creador: number
          prioridad: Database["public"]["Enums"]["prioridad_tarea"]
          titulo: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tarea"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_task_assignment_notification: {
        Args: { p_id_tarea: number; p_id_usuario: number }
        Returns: undefined
      }
      current_usuario_id: { Args: never; Returns: number }
      delete_tarea_rpc: { Args: { p_id_tarea: number }; Returns: undefined }
      delete_usuario_super_admin: {
        Args: { target_usuario_id: number }
        Returns: string
      }
      enroll_users: {
        Args: {
          p_ciclo_id: number
          p_override_ministerio?: boolean
          p_user_ids: number[]
        }
        Returns: {
          estado: string
          id_detalle: number
          id_usuario: number
        }[]
      }
      finalizar_ciclo: { Args: { p_id_proceso: number }; Returns: undefined }
      get_all_usuarios_enriquecidos: {
        Args: never
        Returns: {
          activo: boolean
          apellidos: string
          auth_user_id: string
          correo: string
          creado_en: string
          id_usuario: number
          ministerios: Json
          nombres: string
          roles: Json
          telefono: string
          ultimo_acceso: string
          updated_at: string
        }[]
      }
      get_enrollment_candidates: {
        Args: { p_ciclo_id: number; p_override_ministerio?: boolean }
        Returns: {
          apellidos: string
          correo: string
          id_usuario: number
          ministerio_principal: string
          nombres: string
          ya_inscrito_activo_en_curso: boolean
        }[]
      }
      get_hoja_de_vida_completa: {
        Args: { usuario_id: number }
        Returns: {
          apellidos: string
          correo: string
          experiencia_laboral: string
          formacion_academica: string
          habilidades: string
          id_usuario: number
          nombres: string
          perfil_profesional: string
        }[]
      }
      get_hoja_de_vida_completa_v2: {
        Args: { p_id_usuario?: number }
        Returns: Json
      }
      get_iglesia_for_curso: {
        Args: { target_curso_id: number }
        Returns: number
      }
      get_iglesia_for_ministerio: {
        Args: { target_ministerio_id: number }
        Returns: number
      }
      get_my_ministerios: {
        Args: never
        Returns: {
          id: number
        }[]
      }
      get_my_ministerios_as_lider: { Args: never; Returns: number[] }
      get_my_permissions_updated_at: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_my_roles: {
        Args: never
        Returns: {
          fecha_fin: string
          id_rol: number
          iglesia_id: number
          iglesia_nombre: string
          rol_nombre: string
          sede_id: number
          sede_nombre: string
        }[]
      }
      get_my_sedes: {
        Args: never
        Returns: {
          id: number
        }[]
      }
      get_my_tenant_id: { Args: never; Returns: number }
      get_my_unread_notifications_count: { Args: never; Returns: number }
      get_my_usuario: {
        Args: never
        Returns: {
          activo: boolean
          apellidos: string
          auth_user_id: string | null
          contrasena_hash: string
          correo: string
          creado_en: string
          fecha_nacimiento: string | null
          id_usuario: number
          nombres: string
          telefono: string | null
          ultimo_acceso: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "usuario"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_usuario_id: { Args: never; Returns: number }
      get_tarea_ministerio: { Args: { p_id_tarea: number }; Returns: number }
      get_tarea_timeline: {
        Args: { p_id_tarea: number }
        Returns: {
          accion: string
          contenido: string
          creado_en: string
          id: number
          id_usuario: number
          metadata: Json
          nombre_completo: string
          tipo: string
          valor_anterior: string
          valor_nuevo: string
        }[]
      }
      get_user_iglesias: {
        Args: never
        Returns: {
          id_iglesia: number
        }[]
      }
      get_user_ministerios: {
        Args: never
        Returns: {
          id_ministerio: number
        }[]
      }
      get_usuario_id_bypass: { Args: never; Returns: number }
      get_usuario_roles_admin: {
        Args: { target_usuario_id: number }
        Returns: {
          creado_en: string
          fecha_fin: string
          fecha_inicio: string
          id_iglesia: number
          id_rol: number
          id_sede: number
          id_usuario: number
          id_usuario_rol: number
          updated_at: string
        }[]
      }
      inscribir_usuarios_curso: {
        Args: { p_id_aula_curso: number; p_user_ids: number[] }
        Returns: {
          accion: string
          id_aula_inscripcion: number
          id_usuario: number
        }[]
      }
      invite_user_rpc: {
        Args: {
          p_apellidos: string
          p_correo: string
          p_id_iglesia: number
          p_id_rol: number
          p_nombres: string
        }
        Returns: Json
      }
      is_admin_iglesia: { Args: never; Returns: boolean }
      is_admin_of_iglesia: {
        Args: { target_iglesia_id: number }
        Returns: boolean
      }
      is_admin_sede: { Args: never; Returns: boolean }
      is_lider: { Args: never; Returns: boolean }
      is_lider_of_ministerio: {
        Args: { target_ministerio_id: number }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_super_admin_role: {
        Args: { target_role_id: number }
        Returns: boolean
      }
      listar_hojas_de_vida_scoped: {
        Args: {
          p_estado_revision?: string
          p_etiqueta_ids?: number[]
          p_id_iglesia?: number
          p_id_ministerio?: number
          p_id_sede?: number
          p_solo_completas?: boolean
        }
        Returns: Json
      }
      remove_rol_by_criteria: {
        Args: {
          target_iglesia_id: number
          target_rol_id: number
          target_usuario_id: number
        }
        Returns: boolean
      }
      toggle_tarea_checklist: {
        Args: { p_completada: boolean; p_id_checklist: number }
        Returns: {
          completada: boolean
          completada_en: string | null
          completada_por: number | null
          creado_en: string
          id_tarea: number
          id_tarea_checklist: number
          orden: number
          titulo: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tarea_checklist"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_tarea_estado_rpc: {
        Args: { p_estado: string; p_id_tarea: number }
        Returns: {
          creado_en: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_tarea"]
          fecha_limite: string | null
          id_evento: number | null
          id_iglesia: number | null
          id_ministerio: number | null
          id_tarea: number
          id_usuario_creador: number
          prioridad: Database["public"]["Enums"]["prioridad_tarea"]
          titulo: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tarea"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      estado_curso: "borrador" | "activo" | "inactivo" | "archivado"
      estado_detalle: "inscrito" | "en_progreso" | "completado" | "retirado"
      estado_evaluacion: "pendiente" | "aprobado" | "reprobado" | "en_revision"
      estado_evento: "programado" | "en_curso" | "finalizado" | "cancelado"
      estado_iglesia: "activa" | "inactiva" | "fusionada" | "cerrada"
      estado_ministerio: "activo" | "inactivo" | "suspendido"
      estado_modulo: "borrador" | "publicado" | "archivado"
      estado_proceso: "programado" | "en_curso" | "finalizado" | "cancelado"
      estado_sede: "activa" | "inactiva" | "en_construccion"
      estado_tarea:
        | "pendiente"
        | "en_progreso"
        | "completada"
        | "cancelada"
        | "en_revision"
      prioridad_tarea: "baja" | "media" | "alta" | "urgente"
      tipo_notificacion: "informacion" | "alerta" | "tarea" | "evento" | "curso"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_curso: ["borrador", "activo", "inactivo", "archivado"],
      estado_detalle: ["inscrito", "en_progreso", "completado", "retirado"],
      estado_evaluacion: ["pendiente", "aprobado", "reprobado", "en_revision"],
      estado_evento: ["programado", "en_curso", "finalizado", "cancelado"],
      estado_iglesia: ["activa", "inactiva", "fusionada", "cerrada"],
      estado_ministerio: ["activo", "inactivo", "suspendido"],
      estado_modulo: ["borrador", "publicado", "archivado"],
      estado_proceso: ["programado", "en_curso", "finalizado", "cancelado"],
      estado_sede: ["activa", "inactiva", "en_construccion"],
      estado_tarea: [
        "pendiente",
        "en_progreso",
        "completada",
        "cancelada",
        "en_revision",
      ],
      prioridad_tarea: ["baja", "media", "alta", "urgente"],
      tipo_notificacion: ["informacion", "alerta", "tarea", "evento", "curso"],
    },
  },
} as const

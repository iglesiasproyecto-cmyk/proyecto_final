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
      ciudad: {
        Row: {
          creado_en: string
          id_ciudad: number
          id_departamento: number
          nombre: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          id_ciudad?: number
          id_departamento: number
          nombre: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
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
      aula_curso: {
        Row: {
          id_aula_curso: number
          id_ministerio: number
          id_usuario_creador: number
          titulo: string
          descripcion: string | null
          imagen_url: string | null
          estado: string
          orden_secuencial: boolean
          creado_en: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id_aula_curso?: number
          id_ministerio: number
          id_usuario_creador: number
          titulo: string
          descripcion?: string | null
          imagen_url?: string | null
          estado?: string
          orden_secuencial?: boolean
          creado_en?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id_aula_curso?: number
          id_ministerio?: number
          id_usuario_creador?: number
          titulo?: string
          descripcion?: string | null
          imagen_url?: string | null
          estado?: string
          orden_secuencial?: boolean
          creado_en?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
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
      aula_modulo: {
        Row: {
          id_aula_modulo: number
          id_aula_curso: number
          titulo: string
          descripcion: string | null
          orden: number
          publicado: boolean
          creado_en: string
          updated_at: string
          contenido_md: string | null
          deleted_at: string | null
        }
        Insert: {
          id_aula_modulo?: number
          id_aula_curso: number
          titulo: string
          descripcion?: string | null
          orden?: number
          publicado?: boolean
          creado_en?: string
          updated_at?: string
          contenido_md?: string | null
          deleted_at?: string | null
        }
        Update: {
          id_aula_modulo?: number
          id_aula_curso?: number
          titulo?: string
          descripcion?: string | null
          orden?: number
          publicado?: boolean
          creado_en?: string
          updated_at?: string
          contenido_md?: string | null
          deleted_at?: string | null
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
      aula_actividad: {
        Row: {
          id_aula_actividad: number
          id_aula_modulo: number
          titulo: string
          tipo: string
          contenido: string | null
          url_recurso: string | null
          orden: number
          creado_en: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id_aula_actividad?: number
          id_aula_modulo: number
          titulo: string
          tipo?: string
          contenido?: string | null
          url_recurso?: string | null
          orden?: number
          creado_en?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id_aula_actividad?: number
          id_aula_modulo?: number
          titulo?: string
          tipo?: string
          contenido?: string | null
          url_recurso?: string | null
          orden?: number
          creado_en?: string
          updated_at?: string
          deleted_at?: string | null
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
      aula_evaluacion: {
        Row: {
          id_aula_evaluacion: number
          id_aula_modulo: number
          titulo: string
          descripcion: string | null
          puntaje_minimo: number
          reintentos_permitidos: boolean
          max_intentos: number | null
          orden: number
          creado_en: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id_aula_evaluacion?: number
          id_aula_modulo: number
          titulo: string
          descripcion?: string | null
          puntaje_minimo?: number
          reintentos_permitidos?: boolean
          max_intentos?: number | null
          orden?: number
          creado_en?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id_aula_evaluacion?: number
          id_aula_modulo?: number
          titulo?: string
          descripcion?: string | null
          puntaje_minimo?: number
          reintentos_permitidos?: boolean
          max_intentos?: number | null
          orden?: number
          creado_en?: string
          updated_at?: string
          deleted_at?: string | null
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
          id_aula_inscripcion: number
          id_aula_curso: number
          id_usuario: number
          activo: boolean
          inscrito_en: string
          updated_at: string
        }
        Insert: {
          id_aula_inscripcion?: number
          id_aula_curso: number
          id_usuario: number
          activo?: boolean
          inscrito_en?: string
          updated_at?: string
        }
        Update: {
          id_aula_inscripcion?: number
          id_aula_curso?: number
          id_usuario?: number
          activo?: boolean
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
          id_aula_intento_evaluacion: number
          id_usuario: number
          id_aula_evaluacion: number
          puntaje_obtenido: number
          aprobado: boolean
          numero_intento: number
          iniciado_en: string
          finalizado_en: string | null
          creado_en: string
          fecha_intento: string | null
        }
        Insert: {
          id_aula_intento_evaluacion?: number
          id_usuario: number
          id_aula_evaluacion: number
          puntaje_obtenido?: number
          aprobado?: boolean
          numero_intento?: number
          iniciado_en?: string
          finalizado_en?: string | null
          creado_en?: string
          fecha_intento?: string | null
        }
        Update: {
          id_aula_intento_evaluacion?: number
          id_usuario?: number
          id_aula_evaluacion?: number
          puntaje_obtenido?: number
          aprobado?: boolean
          numero_intento?: number
          iniciado_en?: string
          finalizado_en?: string | null
          creado_en?: string
          fecha_intento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aula_intento_evaluacion_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "aula_intento_evaluacion_id_aula_evaluacion_fkey"
            columns: ["id_aula_evaluacion"]
            isOneToOne: false
            referencedRelation: "aula_evaluacion"
            referencedColumns: ["id_aula_evaluacion"]
          },
        ]
      }
      aula_progreso_actividad: {
        Row: {
          id_aula_progreso_actividad: number
          id_usuario: number
          id_aula_actividad: number
          completada: boolean
          completada_en: string | null
          creado_en: string
          updated_at: string
        }
        Insert: {
          id_aula_progreso_actividad?: number
          id_usuario: number
          id_aula_actividad: number
          completada?: boolean
          completada_en?: string | null
          creado_en?: string
          updated_at?: string
        }
        Update: {
          id_aula_progreso_actividad?: number
          id_usuario?: number
          id_aula_actividad?: number
          completada?: boolean
          completada_en?: string | null
          creado_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_progreso_actividad_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "aula_progreso_actividad_id_aula_actividad_fkey"
            columns: ["id_aula_actividad"]
            isOneToOne: false
            referencedRelation: "aula_actividad"
            referencedColumns: ["id_aula_actividad"]
          },
        ]
      }
      departamento: {
        Row: {
          creado_en: string
          id_departamento: number
          id_pais: number
          nombre: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          id_departamento?: number
          id_pais: number
          nombre: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
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
      iglesia: {
        Row: {
          creado_en: string
          estado: Database["public"]["Enums"]["estado_iglesia"]
          fecha_fundacion: string | null
          id_ciudad: number
          id_iglesia: number
          nombre: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_iglesia"]
          fecha_fundacion?: string | null
          id_ciudad: number
          id_iglesia?: number
          nombre: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_iglesia"]
          fecha_fundacion?: string | null
          id_ciudad?: number
          id_iglesia?: number
          nombre?: string
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
      aula_modulo: {
        Row: {
          contenido_md: string | null
          creado_en: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["estado_modulo"]
          id_aula_curso: number
          id_aula_modulo: number
          orden: number
          titulo: string
          updated_at: string
        }
        Insert: {
          contenido_md?: string | null
          creado_en?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_modulo"]
          id_aula_curso: number
          id_aula_modulo?: number
          orden?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          contenido_md?: string | null
          creado_en?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["estado_modulo"]
          id_aula_curso?: number
          id_aula_modulo?: number
          orden?: number
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
          id_pais: number
          nombre: string
          updated_at: string
        }
        Insert: {
          creado_en?: string
          id_pais?: number
          nombre: string
          updated_at?: string
        }
        Update: {
          creado_en?: string
          id_pais?: number
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      pastor: {
        Row: {
          apellidos: string
          correo: string
          creado_en: string
          id_pastor: number
          id_usuario: number | null
          nombres: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          apellidos: string
          correo: string
          creado_en?: string
          id_pastor?: number
          id_usuario?: number | null
          nombres: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          apellidos?: string
          correo?: string
          creado_en?: string
          id_pastor?: number
          id_usuario?: number | null
          nombres?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pastor_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: true
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
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
          id_iglesia: number
          id_rol: number
          id_sede: number | null
          id_usuario: number
          id_usuario_rol: number
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
          id_usuario_rol?: number
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
          id_usuario_rol?: number
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
      aula_avance_modulo: {
        Row: {
          completado_en: string
          creado_en: string
          id_aula_avance_modulo: number
          id_detalle_proceso_curso: number
          id_aula_modulo: number
          id_usuario: number
          updated_at: string
        }
        Insert: {
          completado_en?: string
          creado_en?: string
          id_aula_avance_modulo?: number
          id_detalle_proceso_curso: number
          id_aula_modulo: number
          id_usuario: number
          updated_at?: string
        }
        Update: {
          completado_en?: string
          creado_en?: string
          id_aula_avance_modulo?: number
          id_detalle_proceso_curso?: number
          id_aula_modulo?: number
          id_usuario?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_avance_modulo_id_detalle_proceso_curso_fkey"
            columns: ["id_detalle_proceso_curso"]
            isOneToOne: false
            referencedRelation: "detalle_proceso_curso"
            referencedColumns: ["id_detalle_proceso_curso"]
          },
          {
            foreignKeyName: "aula_avance_modulo_id_detalle_proceso_curso_fkey"
            columns: ["id_detalle_proceso_curso"]
            isOneToOne: false
            referencedRelation: "v_companeros_ciclo"
            referencedColumns: ["id_detalle_proceso_curso"]
          },
          {
            foreignKeyName: "aula_avance_modulo_id_aula_modulo_fkey"
            columns: ["id_aula_modulo"]
            isOneToOne: false
            referencedRelation: "aula_modulo"
            referencedColumns: ["id_aula_modulo"]
          },
          {
            foreignKeyName: "aula_avance_modulo_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      hoja_de_vida: {
        Row: {
          id_hoja_de_vida: number
          id_usuario: number
          titulo_profesional: string | null
          experiencia_laboral: string | null
          habilidades: Json
          resumen_profesional: string | null
          foto_perfil_url: string | null
          formacion_academica: Json
          otros_datos: Json
          completa: boolean
          completada_en: string | null
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id_hoja_de_vida?: number
          id_usuario: number
          titulo_profesional?: string | null
          experiencia_laboral?: string | null
          habilidades?: Json
          resumen_profesional?: string | null
          foto_perfil_url?: string | null
          formacion_academica?: Json
          otros_datos?: Json
          completa?: boolean
          completada_en?: string | null
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id_hoja_de_vida?: number
          id_usuario?: number
          titulo_profesional?: string | null
          experiencia_laboral?: string | null
          habilidades?: Json
          resumen_profesional?: string | null
          foto_perfil_url?: string | null
          formacion_academica?: Json
          otros_datos?: Json
          completa?: boolean
          completada_en?: string | null
          creado_en?: string
          actualizado_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "hoja_de_vida_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: true
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
    }
    Views: {
      evaluacion_detalle: {
        Row: {
          id_evaluacion_detalle: number
          id_aula_evaluacion: number
          pregunta: string
          tipo: string
          puntaje: number
          orden: number
          creado_en: string
          updated_at: string
          opciones: Json | null
          respuesta_correcta: string | null
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
      progreso_actividad: {
        Row: {
          id_aula_progreso_actividad: number
          id_usuario: number
          id_aula_actividad: number
          completada: boolean
          completada_en: string | null
          creado_en: string
          updated_at: string
          vista_en: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aula_progreso_actividad_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "aula_progreso_actividad_id_aula_actividad_fkey"
            columns: ["id_aula_actividad"]
            isOneToOne: false
            referencedRelation: "aula_actividad"
            referencedColumns: ["id_aula_actividad"]
          },
        ]
      }
      actividad: {
        Row: {
          id_aula_actividad: number
          id_aula_modulo: number
          titulo: string
          tipo: string
          contenido: string | null
          url_recurso: string | null
          orden: number
          creado_en: string
          updated_at: string
          estado: string
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
      certificado: {
        Row: {
          id_certificado: number
          id_usuario: number
          id_aula_curso: number
          codigo_verificacion: string
          fecha_emision: string
          creado_en: string
          updated_at: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_certificado_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "aula_certificado_id_aula_curso_fkey"
            columns: ["id_aula_curso"]
            isOneToOne: false
            referencedRelation: "aula_curso"
            referencedColumns: ["id_aula_curso"]
          },
        ]
      }
      comentario_lider: {
        Row: {
          id_comentario: number
          id_usuario_autor: number
          id_usuario_destinatario: number
          id_aula_actividad: number | null
          id_aula_evaluacion: number | null
          comentario: string
          creado_en: string
          updated_at: string
          tipo: Database["public"]["Enums"]["tipo_comentario_lider"]
        }
        Relationships: [
          {
            foreignKeyName: "aula_retroalimentacion_id_usuario_lider_fkey"
            columns: ["id_usuario_autor"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "aula_retroalimentacion_id_usuario_servidor_fkey"
            columns: ["id_usuario_destinatario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "aula_retroalimentacion_actividad_fkey"
            columns: ["id_aula_actividad"]
            isOneToOne: false
            referencedRelation: "aula_actividad"
            referencedColumns: ["id_aula_actividad"]
          },
          {
            foreignKeyName: "aula_retroalimentacion_evaluacion_fkey"
            columns: ["id_aula_evaluacion"]
            isOneToOne: false
            referencedRelation: "aula_evaluacion"
            referencedColumns: ["id_aula_evaluacion"]
          },
        ]
      }
      intento_evaluacion: {
        Row: {
          id_aula_intento_evaluacion: number
          id_usuario: number
          id_aula_evaluacion: number
          puntaje_obtenido: number
          aprobado: boolean
          numero_intento: number
          iniciado_en: string
          finalizado_en: string | null
          creado_en: string
          fecha_intento: string | null
          titulo_evaluacion: string
          titulo_modulo: string
          titulo_curso: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_intento_evaluacion_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "aula_intento_evaluacion_id_aula_evaluacion_fkey"
            columns: ["id_aula_evaluacion"]
            isOneToOne: false
            referencedRelation: "aula_evaluacion"
            referencedColumns: ["id_aula_evaluacion"]
          },
        ]
      }
        Insert: {
          calificacion_obtenida?: number | null
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_evaluacion"]
          id_detalle_proceso_curso: number
          id_aula_intento_evaluacion?: number
          id_aula_modulo: number
          id_usuario: number
          respuestas?: Json | null
          updated_at?: string
        }
        Update: {
          calificacion_obtenida?: number | null
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_evaluacion"]
          id_detalle_proceso_curso?: number
          id_aula_intento_evaluacion?: number
          id_aula_modulo?: number
          id_usuario?: number
          respuestas?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_intento_evaluacion_id_detalle_proceso_curso_fkey"
            columns: ["id_detalle_proceso_curso"]
            isOneToOne: false
            referencedRelation: "detalle_proceso_curso"
            referencedColumns: ["id_detalle_proceso_curso"]
          },
          {
            foreignKeyName: "aula_intento_evaluacion_id_aula_modulo_fkey"
            columns: ["id_aula_modulo"]
            isOneToOne: false
            referencedRelation: "aula_modulo"
            referencedColumns: ["id_aula_modulo"]
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
      aula_comentario_lider: {
        Row: {
          comentario: string
          creado_en: string
          id_aula_actividad: number | null
          id_aula_comentario_lider: number
          id_aula_modulo: number | null
          id_usuario_autor: number
          id_usuario_destinatario: number
          tipo: Database["public"]["Enums"]["tipo_comentario"]
          updated_at: string
        }
        Insert: {
          comentario: string
          creado_en?: string
          id_aula_actividad?: number | null
          id_aula_comentario_lider?: number
          id_aula_modulo?: number | null
          id_usuario_autor: number
          id_usuario_destinatario: number
          tipo: Database["public"]["Enums"]["tipo_comentario"]
          updated_at?: string
        }
        Update: {
          comentario?: string
          creado_en?: string
          id_aula_actividad?: number | null
          id_aula_comentario_lider?: number
          id_aula_modulo?: number | null
          id_usuario_autor?: number
          id_usuario_destinatario?: number
          tipo?: Database["public"]["Enums"]["tipo_comentario"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aula_comentario_lider_id_aula_actividad_fkey"
            columns: ["id_aula_actividad"]
            isOneToOne: false
            referencedRelation: "aula_actividad"
            referencedColumns: ["id_aula_actividad"]
          },
          {
            foreignKeyName: "aula_comentario_lider_id_aula_modulo_fkey"
            columns: ["id_aula_modulo"]
            isOneToOne: false
            referencedRelation: "aula_modulo"
            referencedColumns: ["id_aula_modulo"]
          },
          {
            foreignKeyName: "aula_comentario_lider_id_usuario_autor_fkey"
            columns: ["id_usuario_autor"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "aula_comentario_lider_id_usuario_destinatario_fkey"
            columns: ["id_usuario_destinatario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
        ]
      }
      aula_certificado: {
        Row: {
          codigo_unico: string
          creado_en: string
          fecha_emision: string
          id_aula_certificado: number
          id_aula_curso: number
          id_usuario: number
          updated_at: string
        }
        Insert: {
          codigo_unico?: string
          creado_en?: string
          fecha_emision?: string
          id_aula_certificado?: number
          id_aula_curso: number
          id_usuario: number
          updated_at?: string
        }
        Update: {
          codigo_unico?: string
          creado_en?: string
          fecha_emision?: string
          id_aula_certificado?: number
          id_aula_curso?: number
          id_usuario?: number
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
    }
    Enums: {
      can_assign_role: { Args: { target_role_id: number }; Returns: boolean }
      can_enroll_in_ciclo: {
        Args: { target_ciclo_id: number }
        Returns: boolean
      }
      can_manage_curso_scope: {
        Args: { target_curso_id: number }
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
      current_usuario_id: { Args: never; Returns: number }
      finalizar_ciclo: {
        Args: { p_id_proceso: number }
        Returns: undefined
      }
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
      get_iglesia_for_curso: {
        Args: { target_curso_id: number }
        Returns: number
      }
      get_iglesia_for_ministerio: {
        Args: { target_ministerio_id: number }
        Returns: number
      }
      get_my_highest_role: { Args: never; Returns: string }
      get_my_roles: {
        Args: never
        Returns: {
          fecha_fin: string
          id_rol: number
          iglesia_id: number
          iglesia_nombre: string
          rol_nombre: string
        }[]
      }
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
      is_admin_iglesia: { Args: never; Returns: boolean }
      is_admin_of_iglesia: {
        Args: { target_iglesia_id: number }
        Returns: boolean
      }
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
      create_tarea: {
        Args: {
          p_titulo: string
          p_descripcion?: string | null
          p_fecha_limite?: string | null
          p_prioridad?: string
          p_id_usuario_creador?: number | null
          p_id_ministerio?: number | null
          p_id_evento?: number | null
        }
        Returns: Database['public']['Tables']['tarea']['Row']
      }
      update_tarea_estado_rpc: {
        Args: {
          p_id_tarea: number
          p_estado: string
        }
        Returns: Database['public']['Tables']['tarea']['Row']
      }
      delete_tarea_rpc: {
        Args: {
          p_id_tarea: number
        }
        Returns: void
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
      estado_tarea: "pendiente" | "en_progreso" | "en_revision" | "completada" | "cancelada"
      prioridad_tarea: "baja" | "media" | "alta" | "urgente"
      tipo_notificacion: "informacion" | "alerta" | "tarea" | "evento" | "curso"
      tipo_recurso: "archivo" | "enlace"
      estado_actividad: "pendiente" | "vista" | "completada"
      tipo_actividad: "lectura" | "video" | "recurso" | "evaluacion"
      tipo_pregunta: "multiple_choice" | "verdadero_falso" | "respuesta_corta" | "ensayo"
      tipo_comentario: "retroalimentacion" | "observacion"
      tipo_comentario_lider: "actividad" | "evaluacion"
    }
    CompositeTypes: {
      [_ in never]: never
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




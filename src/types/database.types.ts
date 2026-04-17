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
          id_tipo_evento: number
          nombre: string
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
          id_tipo_evento: number
          nombre: string
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
          id_tipo_evento?: number
          nombre?: string
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
      modulo: {
        Row: {
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
      recurso: {
        Row: {
          creado_en: string
          id_modulo: number
          id_recurso: number
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_recurso"]
          updated_at: string
          url: string
        }
        Insert: {
          creado_en?: string
          id_modulo: number
          id_recurso?: number
          nombre: string
          tipo?: Database["public"]["Enums"]["tipo_recurso"]
          updated_at?: string
          url: string
        }
        Update: {
          creado_en?: string
          id_modulo?: number
          id_recurso?: number
          nombre?: string
          tipo?: Database["public"]["Enums"]["tipo_recurso"]
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurso_id_modulo_fkey"
            columns: ["id_modulo"]
            isOneToOne: false
            referencedRelation: "modulo"
            referencedColumns: ["id_modulo"]
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
    }
    Views: {
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
      current_usuario_id: { Args: never; Returns: number }
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
      estado_tarea: "pendiente" | "en_progreso" | "completada" | "cancelada"
      prioridad_tarea: "baja" | "media" | "alta" | "urgente"
      tipo_notificacion: "informacion" | "alerta" | "tarea" | "evento" | "curso"
      tipo_recurso: "archivo" | "enlace"
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
      estado_tarea: ["pendiente", "en_progreso", "completada", "cancelada"],
      prioridad_tarea: ["baja", "media", "alta", "urgente"],
      tipo_notificacion: ["informacion", "alerta", "tarea", "evento", "curso"],
      tipo_recurso: ["archivo", "enlace"],
    },
  },
} as const

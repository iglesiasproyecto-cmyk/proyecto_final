-- supabase/migrations/20260519_add_evidence_tables.sql

-- Add estado_revision column to tarea table
ALTER TABLE tarea
ADD COLUMN estado_revision TEXT DEFAULT 'pendiente' CHECK (estado_revision IN ('pendiente', 'en_revision', 'aprobada', 'rechazada'));

-- Create tarea_evidencia table
CREATE TABLE tarea_evidencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID NOT NULL REFERENCES tarea(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuario(id),
  archivo_url TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  tipo_archivo VARCHAR(50),
  tamaño_bytes INTEGER,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tarea_evidencia_tarea ON tarea_evidencia(tarea_id);
CREATE INDEX idx_tarea_evidencia_usuario ON tarea_evidencia(usuario_id);

-- Create tarea_comentario_revision table
CREATE TABLE tarea_comentario_revision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID NOT NULL REFERENCES tarea(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuario(id),
  contenido TEXT NOT NULL,
  tipo TEXT DEFAULT 'comentario' CHECK (tipo IN ('comentario', 'aprobacion', 'rechazo')),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comentario_revision_tarea ON tarea_comentario_revision(tarea_id);
CREATE INDEX idx_comentario_revision_usuario ON tarea_comentario_revision(usuario_id);

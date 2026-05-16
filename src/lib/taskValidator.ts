/**
 * Task Form Validation
 * Validates task form data with Spanish error messages
 */

export interface TaskValidationErrors {
  titulo?: string;
  descripcion?: string;
  fechaLimite?: string;
  prioridad?: string;
  ministerioId?: string;
}

export interface CreateTaskFormData {
  titulo: string;
  descripcion?: string;
  fechaLimite?: string;
  prioridad: string;
  idMinisterio: number;
}

const VALID_PRIORITIES = ['baja', 'media', 'alta', 'urgente'];

export function validateTaskForm(data: Partial<CreateTaskFormData>): TaskValidationErrors {
  const errors: TaskValidationErrors = {};

  // Validate titulo
  if (!data.titulo || data.titulo.trim() === '') {
    errors.titulo = 'El título es requerido';
  } else if (data.titulo.trim().length < 3) {
    errors.titulo = 'El título debe tener al menos 3 caracteres';
  } else if (data.titulo.trim().length > 255) {
    errors.titulo = 'El título no puede exceder 255 caracteres';
  }

  // Validate descripcion
  if (data.descripcion && data.descripcion.trim().length > 2000) {
    errors.descripcion = 'La descripción no puede exceder 2000 caracteres';
  }

  // Validate fechaLimite
  if (data.fechaLimite) {
    const fecha = new Date(data.fechaLimite);
    const ahora = new Date();
    if (fecha <= ahora) {
      errors.fechaLimite = 'La fecha límite debe ser en el futuro';
    }
  }

  // Validate prioridad
  if (!data.prioridad || !VALID_PRIORITIES.includes(data.prioridad)) {
    errors.prioridad = 'La prioridad es inválida';
  }

  // Validate idMinisterio
  if (!data.idMinisterio || data.idMinisterio <= 0) {
    errors.ministerioId = 'Debes seleccionar un ministerio';
  }

  return errors;
}

export function isTaskFormValid(data: Partial<CreateTaskFormData>): boolean {
  const errors = validateTaskForm(data);
  return Object.keys(errors).length === 0;
}

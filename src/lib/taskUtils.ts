import type { Tarea } from '@/services/eventos.service'

// Database Notes:
// - updated_at columns are automatically managed by database triggers
// - Do not manually set updated_at in INSERT/UPDATE operations
// - Triggers ensure updated_at reflects the actual modification time

export interface TaskFilters {
  searchQuery: string
  dateFilter: string
  sortOrder: 'newest' | 'oldest'
}

export function filterAndSortTareas(tareas: Tarea[], filters: TaskFilters): Tarea[] {
  let result = [...tareas];

  // Search filter
  if (filters.searchQuery.trim()) {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter(t =>
      t.titulo.toLowerCase().includes(q) ||
      (t.descripcion && t.descripcion.toLowerCase().includes(q))
    );
  }

  // Date filter
  if (filters.dateFilter) {
    result = result.filter(t => {
      if (!t.fechaLimite) return false;
      // Compare only the date part (YYYY-MM-DD) to handle both date strings and timestamps
      const taskDate = new Date(t.fechaLimite).toISOString().split('T')[0];
      return taskDate === filters.dateFilter;
    });
  }

  // Sort by creation date
  result.sort((a, b) => {
    const dateA = new Date(a.creadoEn).getTime();
    const dateB = new Date(b.creadoEn).getTime();
    return filters.sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  return result;
}
# Global Aula for super_admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Global Aula page at `/app/global/aula` that allows super_admin to view, manage, and edit courses across all churches and ministries in a hierarchical interface.

**Architecture:** Hierarchical tree view (iglesias → cursos iglesia + ministerios → cursos ministerio) with a side-panel detail view for editing metadata and managing enrollments. Data fetched lazily as users expand nodes. All 5 hooks use React Query for caching and efficient invalidation.

**Tech Stack:** React 18, React Query, React Router, React Hook Form, shadcn/ui (Sheet, Dialog, Button, etc.), Supabase

---

## File Structure

### New Files to Create
- `src/app/components/GlobalAulaPage.tsx` — Main page component (state management, tree rendering)
- `src/app/components/IglesiaAulaRow.tsx` — Collapsible iglesia row with cursos/ministerios
- `src/app/components/MinisterioRow.tsx` — Collapsible ministerio row with cursos
- `src/app/components/CursoListItem.tsx` — Individual curso item in list
- `src/app/components/GlobalAulaDetailPanel.tsx` — Side sheet for course details/edit/enrollments
- `src/hooks/useGlobalAula.ts` — 5 hooks (useCursosGlobal, useCursosPorMinisterio, useCursoDetalle, useEditCurso, useManageEnrollments)

### Files to Modify
- `src/app/routes.ts` — Add `/app/global/aula` route
- `src/app/components/AppLayout.tsx` — Add nav item under "Gestión Global"
- `src/services/aula.service.ts` — Add helper functions for global queries (if needed)

---

## Task Breakdown

### Task 1: Create useGlobalAula Hooks

**Files:**
- Create: `src/hooks/useGlobalAula.ts`

- [ ] **Step 1: Create file and import dependencies**

Create `src/hooks/useGlobalAula.ts` with:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Tables } from '@/types/database.types';
import { toast } from 'sonner';

// All 5 hooks will go here
```

- [ ] **Step 2: Implement useCursosGlobal hook**

Add to `src/hooks/useGlobalAula.ts`:

```typescript
export function useCursosGlobal(idIglesia: number | undefined) {
  return useQuery({
    queryKey: ['cursos-global', idIglesia],
    queryFn: async () => {
      if (!idIglesia) return [];
      
      const { data, error } = await supabase
        .from('aula_curso')
        .select(`
          id_aula_curso,
          titulo,
          descripcion,
          estado,
          id_iglesia,
          id_ministerio,
          creado_en,
          actualizado_en,
          usuario_creador:id_usuario_creador(nombres, apellidos)
        `)
        .eq('id_iglesia', idIglesia)
        .is('id_ministerio', null)
        .order('creado_en', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: idIglesia !== undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

- [ ] **Step 3: Implement useCursosPorMinisterio hook**

Add to `src/hooks/useGlobalAula.ts`:

```typescript
export function useCursosPorMinisterio(idMinisterio: number | undefined) {
  return useQuery({
    queryKey: ['cursos-ministerio', idMinisterio],
    queryFn: async () => {
      if (!idMinisterio) return [];
      
      const { data, error } = await supabase
        .from('aula_curso')
        .select(`
          id_aula_curso,
          titulo,
          descripcion,
          estado,
          id_iglesia,
          id_ministerio,
          creado_en,
          actualizado_en,
          usuario_creador:id_usuario_creador(nombres, apellidos)
        `)
        .eq('id_ministerio', idMinisterio)
        .order('creado_en', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: idMinisterio !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 4: Implement useCursoDetalle hook**

Add to `src/hooks/useGlobalAula.ts`:

```typescript
export function useCursoDetalle(idCurso: number | undefined) {
  return useQuery({
    queryKey: ['curso-detalle', idCurso],
    queryFn: async () => {
      if (!idCurso) return null;
      
      const { data, error } = await supabase
        .from('aula_curso')
        .select(`
          id_aula_curso,
          titulo,
          descripcion,
          estado,
          id_iglesia,
          id_ministerio,
          id_usuario_creador,
          creado_en,
          actualizado_en,
          usuario_creador:id_usuario_creador(id_usuario, nombres, apellidos),
          iglesia:id_iglesia(id_iglesia, nombre),
          ministerio:id_ministerio(id_ministerio, nombre),
          inscripciones:aula_inscripcion(
            id_usuario,
            inscrito_en,
            activo,
            usuario:id_usuario(id_usuario, nombres, apellidos, correo)
          )
        `)
        .eq('id_aula_curso', idCurso)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: idCurso !== undefined,
  });
}
```

- [ ] **Step 5: Implement useEditCurso mutation**

Add to `src/hooks/useGlobalAula.ts`:

```typescript
export function useEditCurso(idCurso: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { titulo: string; descripcion: string | null; estado: 'borrador' | 'activo' | 'archivado' }) => {
      const { data, error } = await supabase
        .from('aula_curso')
        .update({
          titulo: params.titulo,
          descripcion: params.descripcion,
          estado: params.estado,
          actualizado_en: new Date().toISOString(),
        })
        .eq('id_aula_curso', idCurso)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curso-detalle', idCurso] });
      queryClient.invalidateQueries({ queryKey: ['cursos-global'] });
      queryClient.invalidateQueries({ queryKey: ['cursos-ministerio'] });
      toast.success('Curso actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(`Error al actualizar curso: ${error.message}`);
    },
  });
}
```

- [ ] **Step 6: Implement useManageEnrollments mutation**

Add to `src/hooks/useGlobalAula.ts`:

```typescript
export function useManageEnrollments(idCurso: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { action: 'add' | 'remove'; idUsuario: number }) => {
      if (params.action === 'add') {
        // Check if already enrolled
        const { data: existing } = await supabase
          .from('aula_inscripcion')
          .select('id_aula_inscripcion')
          .eq('id_aula_curso', idCurso)
          .eq('id_usuario', params.idUsuario)
          .single();

        if (existing) {
          throw new Error('Usuario ya está inscrito en este curso');
        }

        const { data, error } = await supabase
          .from('aula_inscripcion')
          .insert({
            id_aula_curso: idCurso,
            id_usuario: params.idUsuario,
            inscrito_en: new Date().toISOString(),
            activo: true,
          })
          .select();

        if (error) throw error;
        return data;
      } else {
        // Remove
        const { error } = await supabase
          .from('aula_inscripcion')
          .delete()
          .eq('id_aula_curso', idCurso)
          .eq('id_usuario', params.idUsuario);

        if (error) throw error;
        return null;
      }
    },
    onSuccess: (data, params) => {
      queryClient.invalidateQueries({ queryKey: ['curso-detalle', idCurso] });
      if (params.action === 'add') {
        toast.success('Usuario agregado al curso');
      } else {
        toast.success('Usuario removido del curso');
      }
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });
}
```

- [ ] **Step 7: Commit hooks**

```bash
cd /home/juanda/Proyectofinal
git add src/hooks/useGlobalAula.ts
git commit -m "feat(hooks): add 5 hooks for global aula (useCursosGlobal, useCursosPorMinisterio, useCursoDetalle, useEditCurso, useManageEnrollments)"
```

---

### Task 2: Create CursoListItem Component

**Files:**
- Create: `src/app/components/CursoListItem.tsx`

- [ ] **Step 1: Create component file with structure**

Create `src/app/components/CursoListItem.tsx`:

```typescript
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ChevronRight } from 'lucide-react';
import type { Tables } from '@/types/database.types';

interface CursoListItemProps {
  curso: Tables<'aula_curso'> & {
    usuario_creador?: { nombres: string; apellidos: string } | null;
  };
  enrollmentCount?: number;
  onSelect: (curso: any) => void;
}

export function CursoListItem({ curso, enrollmentCount = 0, onSelect }: CursoListItemProps) {
  const estadoColor = {
    borrador: 'secondary',
    activo: 'default',
    archivado: 'outline',
  };

  return (
    <button
      onClick={() => onSelect(curso)}
      className="w-full text-left px-4 py-3 rounded-lg border border-white/10 bg-card/50 hover:bg-card/80 transition-colors flex items-center justify-between group"
    >
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground truncate text-sm">
          {curso.titulo}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          {curso.descripcion ? curso.descripcion.substring(0, 60) + '...' : 'Sin descripción'}
        </p>
      </div>
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        <Badge variant={estadoColor[curso.estado as keyof typeof estadoColor]}>
          {curso.estado}
        </Badge>
        <Badge variant="secondary" className="whitespace-nowrap">
          {enrollmentCount} inscritos
        </Badge>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Commit component**

```bash
git add src/app/components/CursoListItem.tsx
git commit -m "feat(components): add CursoListItem component for curso list display"
```

---

### Task 3: Create MinisterioRow Component

**Files:**
- Create: `src/app/components/MinisterioRow.tsx`

- [ ] **Step 1: Create component with collapse state**

Create `src/app/components/MinisterioRow.tsx`:

```typescript
import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CursoListItem } from './CursoListItem';
import { ChevronDown, Users } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { useCursosPorMinisterio } from '@/hooks/useGlobalAula';
import type { Tables } from '@/types/database.types';

interface MinisterioRowProps {
  ministerio: Tables<'ministerio'>;
  onCursoSelect: (curso: any) => void;
  expandedMinisterios: Set<number>;
  onToggleMinisterio: (idMinisterio: number) => void;
}

export function MinisterioRow({
  ministerio,
  onCursoSelect,
  expandedMinisterios,
  onToggleMinisterio,
}: MinisterioRowProps) {
  const isExpanded = expandedMinisterios.has(ministerio.id_ministerio);
  const { data: cursos = [], isLoading } = useCursosPorMinisterio(
    isExpanded ? ministerio.id_ministerio : undefined
  );

  const handleToggle = () => {
    onToggleMinisterio(ministerio.id_ministerio);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleToggle}
        className="w-full text-left px-4 py-3 rounded-lg border border-white/10 bg-card/30 hover:bg-card/60 transition-colors flex items-center justify-between group"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${
              isExpanded ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <Users className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h4 className="font-semibold text-sm truncate">{ministerio.nombre}</h4>
          </div>
        </div>
        <Badge variant="outline" className="ml-2 flex-shrink-0">
          {cursos.length} cursos
        </Badge>
      </button>

      {isExpanded && (
        <div className="pl-6 space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </>
          ) : cursos.length > 0 ? (
            cursos.map((curso) => (
              <CursoListItem
                key={curso.id_aula_curso}
                curso={curso}
                enrollmentCount={0} // TODO: Add enrollment count from detail query
                onSelect={onCursoSelect}
              />
            ))
          ) : (
            <p className="text-xs text-muted-foreground px-4 py-2">
              No hay cursos en este ministerio
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit component**

```bash
git add src/app/components/MinisterioRow.tsx
git commit -m "feat(components): add MinisterioRow component with collapsible cursos"
```

---

### Task 4: Create IglesiaAulaRow Component

**Files:**
- Create: `src/app/components/IglesiaAulaRow.tsx`

- [ ] **Step 1: Create component with dual expand states**

Create `src/app/components/IglesiaAulaRow.tsx`:

```typescript
import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CursoListItem } from './CursoListItem';
import { MinisterioRow } from './MinisterioRow';
import { ChevronDown, Building2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { useCursosGlobal, useMinisteriosIglesia } from '@/hooks/useGlobalAula';
import { useMinisterios } from '@/hooks/useMinisterios';
import type { Tables } from '@/types/database.types';

interface IglesiaAulaRowProps {
  iglesia: Tables<'iglesia'>;
  onCursoSelect: (curso: any) => void;
  expandedIglesias: Set<number>;
  onToggleIglesia: (idIglesia: number) => void;
  expandedMinisterios: Set<number>;
  onToggleMinisterio: (idMinisterio: number) => void;
}

export function IglesiaAulaRow({
  iglesia,
  onCursoSelect,
  expandedIglesias,
  onToggleIglesia,
  expandedMinisterios,
  onToggleMinisterio,
}: IglesiaAulaRowProps) {
  const isExpanded = expandedIglesias.has(iglesia.id_iglesia);

  // Fetch cursos and ministerios only when iglesia is expanded
  const { data: cursosIglesia = [], isLoading: loadingCursos } = useCursosGlobal(
    isExpanded ? iglesia.id_iglesia : undefined
  );

  // Use existing useMinisterios hook - it fetches ministerios by sede, so we need to aggregate by iglesia
  // For now, fetch all ministerios and filter by iglesia
  const { data: allMinisterios = [] } = useMinisterios(isExpanded ? iglesia.id_iglesia : undefined);

  const handleToggle = () => {
    onToggleIglesia(iglesia.id_iglesia);
  };

  const totalCursos = cursosIglesia.length + (allMinisterios || []).reduce((sum, m) => sum + (m.cursos?.length || 0), 0);

  return (
    <div className="space-y-3 border-l-2 border-primary/30 pl-4">
      <button
        onClick={handleToggle}
        className="w-full text-left px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-between group"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ChevronDown
            className={`w-5 h-5 text-primary flex-shrink-0 transition-transform ${
              isExpanded ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-primary truncate">{iglesia.nombre}</h3>
          </div>
        </div>
        <Badge className="ml-2 flex-shrink-0">{totalCursos} cursos</Badge>
      </button>

      {isExpanded && (
        <div className="space-y-4">
          {/* Cursos de Iglesia */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-4">
              Cursos de {iglesia.nombre}
            </h4>
            {loadingCursos ? (
              <>
                <Skeleton className="h-16 mx-4" />
                <Skeleton className="h-16 mx-4" />
              </>
            ) : cursosIglesia.length > 0 ? (
              <div className="space-y-2 px-4">
                {cursosIglesia.map((curso) => (
                  <CursoListItem
                    key={curso.id_aula_curso}
                    curso={curso}
                    enrollmentCount={0}
                    onSelect={onCursoSelect}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-4 py-2">
                No hay cursos creados a nivel iglesia
              </p>
            )}
          </div>

          {/* Ministerios */}
          {allMinisterios && allMinisterios.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-4">
                Ministerios
              </h4>
              <div className="space-y-3 px-4">
                {allMinisterios.map((ministerio) => (
                  <MinisterioRow
                    key={ministerio.id_ministerio}
                    ministerio={ministerio}
                    onCursoSelect={onCursoSelect}
                    expandedMinisterios={expandedMinisterios}
                    onToggleMinisterio={onToggleMinisterio}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit component**

```bash
git add src/app/components/IglesiaAulaRow.tsx
git commit -m "feat(components): add IglesiaAulaRow with nested cursos and ministerios"
```

---

### Task 5: Create GlobalAulaDetailPanel Component

**Files:**
- Create: `src/app/components/GlobalAulaDetailPanel.tsx`

- [ ] **Step 1: Create sheet panel with metadata section**

Create `src/app/components/GlobalAulaDetailPanel.tsx`:

```typescript
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Plus, Trash2, Eye, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCursoDetalle, useEditCurso, useManageEnrollments } from '@/hooks/useGlobalAula';
import { useIglesias } from '@/hooks/useIglesias';
import type { Tables } from '@/types/database.types';

interface GlobalAulaDetailPanelProps {
  open: boolean;
  cursoId: number | null;
  onClose: () => void;
}

export function GlobalAulaDetailPanel({ open, cursoId, onClose }: GlobalAulaDetailPanelProps) {
  const [editMode, setEditMode] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [removeUserDialog, setRemoveUserDialog] = useState<{ open: boolean; userId: number | null }>({ open: false, userId: null });

  const { data: curso, isLoading } = useCursoDetalle(cursoId || undefined);
  const editMutation = useEditCurso(cursoId || 0);
  const enrollMutation = useManageEnrollments(cursoId || 0);

  const form = useForm({
    defaultValues: {
      titulo: curso?.titulo || '',
      descripcion: curso?.descripcion || '',
      estado: curso?.estado || 'activo',
    },
  });

  // Update form when curso data loads
  if (curso && !editMode) {
    form.reset({
      titulo: curso.titulo,
      descripcion: curso.descripcion,
      estado: curso.estado,
    });
  }

  const onSubmit = async (data: any) => {
    editMutation.mutate(data, {
      onSuccess: () => {
        setEditMode(false);
      },
    });
  };

  const handleRemoveUser = () => {
    if (removeUserDialog.userId) {
      enrollMutation.mutate({
        action: 'remove',
        idUsuario: removeUserDialog.userId,
      });
      setRemoveUserDialog({ open: false, userId: null });
    }
  };

  if (!open || !cursoId) return null;

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:w-[500px] overflow-y-auto">
          <SheetHeader>
            <Skeleton className="h-8 w-48" />
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!curso) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Curso no encontrado</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground mt-4">Este curso ha sido eliminado o no existe.</p>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>{curso.titulo}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditMode(!editMode)}
              className="ml-2"
            >
              {editMode ? <Eye className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Metadata Section */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Información del Curso
            </h3>

            {!editMode ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Título</p>
                  <p className="text-sm font-medium">{curso.titulo}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Descripción</p>
                  <p className="text-sm">{curso.descripcion || 'Sin descripción'}</p>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <Badge>{curso.estado}</Badge>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <Badge variant="secondary">{curso.id_iglesia ? 'Iglesia' : 'Ministerio'}</Badge>
                  </div>
                </div>
                {curso.iglesia && (
                  <div>
                    <p className="text-xs text-muted-foreground">Iglesia</p>
                    <p className="text-sm">{curso.iglesia.nombre}</p>
                  </div>
                )}
                {curso.ministerio && (
                  <div>
                    <p className="text-xs text-muted-foreground">Ministerio</p>
                    <p className="text-sm">{curso.ministerio.nombre}</p>
                  </div>
                )}
                {curso.usuario_creador && (
                  <div>
                    <p className="text-xs text-muted-foreground">Creado por</p>
                    <p className="text-sm">
                      {curso.usuario_creador.nombres} {curso.usuario_creador.apellidos}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Título
                  </label>
                  <Input {...form.register('titulo', { required: true })} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Descripción
                  </label>
                  <Textarea {...form.register('descripcion')} className="mt-1" rows={3} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Estado
                  </label>
                  <Select {...form.register('estado')} onValueChange={(v) => form.setValue('estado', v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecciona estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="borrador">Borrador</SelectItem>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="archivado">Archivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" size="sm" disabled={editMutation.isPending}>
                    {editMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditMode(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Inscripciones Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Inscritos ({curso.inscripciones?.length || 0})
              </h3>
              <Button size="sm" onClick={() => setEnrollDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Agregar
              </Button>
            </div>

            {curso.inscripciones && curso.inscripciones.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {curso.inscripciones.map((insc: any) => (
                  <div
                    key={insc.id_usuario}
                    className="flex items-center justify-between p-2 rounded border border-white/10 bg-card/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {insc.usuario?.nombres} {insc.usuario?.apellidos}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{insc.usuario?.correo}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRemoveUserDialog({ open: true, userId: insc.id_usuario })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sin usuarios inscritos</p>
            )}
          </div>

          {/* Action Link */}
          <div className="border-t pt-4">
            <Button
              asChild
              variant="outline"
              className="w-full"
            >
              <a href={`/app/${curso.id_iglesia}/aula/curso/${cursoId}`}>
                Ver curso completo
              </a>
            </Button>
          </div>
        </div>

        {/* Add Users Dialog */}
        <EnrollUsersDialog
          open={enrollDialogOpen}
          onClose={() => setEnrollDialogOpen(false)}
          idCurso={cursoId}
          onSubmit={(userIds) => {
            userIds.forEach((userId) => {
              enrollMutation.mutate({ action: 'add', idUsuario: userId });
            });
            setEnrollDialogOpen(false);
          }}
        />

        {/* Remove User Alert Dialog */}
        <AlertDialog open={removeUserDialog.open} onOpenChange={(o) => setRemoveUserDialog({ ...removeUserDialog, open: o })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover usuario</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Seguro que deseas remover este usuario del curso? Perderá acceso a todo el contenido.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveUser}>Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

// Sub-component for enroll dialog
function EnrollUsersDialog({
  open,
  onClose,
  idCurso,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  idCurso: number;
  onSubmit: (userIds: number[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // TODO: Implement user search/selection dialog
  // For now, placeholder

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar usuarios al curso</DialogTitle>
          <DialogDescription>Busca y selecciona usuarios para inscribir en este curso.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {/* TODO: List users based on search */}
          <p className="text-sm text-muted-foreground">Funcionalidad en desarrollo</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onSubmit(Array.from(selected))}>Agregar seleccionados</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit detail panel**

```bash
git add src/app/components/GlobalAulaDetailPanel.tsx
git commit -m "feat(components): add GlobalAulaDetailPanel with edit form and enrollments"
```

---

### Task 6: Create GlobalAulaPage Main Component

**Files:**
- Create: `src/app/components/GlobalAulaPage.tsx`

- [ ] **Step 1: Create main page structure**

Create `src/app/components/GlobalAulaPage.tsx`:

```typescript
import { useState, useMemo } from 'react';
import { useIglesias } from '@/hooks/useIglesias';
import { useAuth } from '@/app/store/AppContext';
import { IglesiaAulaRow } from './IglesiaAulaRow';
import { GlobalAulaDetailPanel } from './GlobalAulaDetailPanel';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { GraduationCap, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Tables } from '@/types/database.types';

export function GlobalAulaPage() {
  const { user, rolActual } = useAuth();
  const { data: iglesias = [], isLoading, error } = useIglesias();

  // State for expand/collapse
  const [expandedIglesias, setExpandedIglesias] = useState<Set<number>>(new Set());
  const [expandedMinisterios, setExpandedMinisterios] = useState<Set<number>>(new Set());
  const [selectedCursoId, setSelectedCursoId] = useState<number | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  // Permission check
  if (rolActual !== 'super_admin') {
    return (
      <div className="container mx-auto py-12 px-4">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Solo super_admin puede acceder a la Aula Global. Tu rol es: {rolActual}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleToggleIglesia = (idIglesia: number) => {
    setExpandedIglesias((prev) => {
      const next = new Set(prev);
      if (next.has(idIglesia)) {
        next.delete(idIglesia);
      } else {
        next.add(idIglesia);
      }
      return next;
    });
  };

  const handleToggleMinisterio = (idMinisterio: number) => {
    setExpandedMinisterios((prev) => {
      const next = new Set(prev);
      if (next.has(idMinisterio)) {
        next.delete(idMinisterio);
      } else {
        next.add(idMinisterio);
      }
      return next;
    });
  };

  const handleSelectCurso = (curso: any) => {
    setSelectedCursoId(curso.id_aula_curso);
    setDetailPanelOpen(true);
  };

  return (
    <div className="relative min-h-full px-4 sm:px-6 lg:px-8 pb-10">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[12%] -right-[5%] w-[42%] h-[42%] bg-[#4682b4]/10 rounded-full blur-[120px]" />
        <div className="absolute top-[18%] -left-[12%] w-[32%] h-[32%] bg-[#709dbd]/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        className="container mx-auto py-4 sm:py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-8 rounded-[32px] border border-white/10 bg-card/55 backdrop-blur-2xl shadow-[0_20px_60px_rgb(0,0,0,0.06)] p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <Badge variant="secondary" className="border-primary/10 bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Plataforma de Formación
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-background/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">
                  Aula Global
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
                  Aula <span className="text-primary">Global</span>
                </h1>
                <p className="mt-3 max-w-2xl text-sm sm:text-base font-medium leading-relaxed text-muted-foreground">
                  Administra cursos en todas las iglesias y ministerios desde un único lugar.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Error al cargar iglesias. Intenta recargar la página.</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        ) : iglesias && iglesias.length > 0 ? (
          <div className="space-y-6 max-w-4xl">
            <AnimatePresence mode="wait">
              {iglesias.map((iglesia) => (
                <motion.div
                  key={iglesia.id_iglesia}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <IglesiaAulaRow
                    iglesia={iglesia}
                    onCursoSelect={handleSelectCurso}
                    expandedIglesias={expandedIglesias}
                    onToggleIglesia={handleToggleIglesia}
                    expandedMinisterios={expandedMinisterios}
                    onToggleMinisterio={handleToggleMinisterio}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No hay iglesias disponibles</p>
          </Card>
        )}
      </motion.div>

      {/* Detail Panel */}
      <GlobalAulaDetailPanel
        open={detailPanelOpen}
        cursoId={selectedCursoId}
        onClose={() => setDetailPanelOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit main component**

```bash
git add src/app/components/GlobalAulaPage.tsx
git commit -m "feat(components): add GlobalAulaPage main component with hierarchy and state management"
```

---

### Task 7: Register Route in routes.ts

**Files:**
- Modify: `src/app/routes.ts`

- [ ] **Step 1: Import GlobalAulaPage component**

Edit `src/app/routes.ts` and add import after other Global component imports:

```typescript
import { GlobalAulaPage } from "./components/GlobalAulaPage";
```

- [ ] **Step 2: Add route under global children**

In the `GlobalLayout` children array, add this route after the "tareas" route:

```typescript
{ path: "aula", Component: GlobalAulaPage, ErrorBoundary: ErrorPage },
```

The updated global children should look like:

```typescript
{
  path: "global",
  Component: GlobalLayout,
  ErrorBoundary: ErrorPage,
  children: [
    { index: true, Component: DashboardPage, ErrorBoundary: ErrorPage },
    { path: "iglesias", Component: ChurchesPage, ErrorBoundary: ErrorPage },
    { path: "iglesias/:idIglesia", Component: ChurchDetailPage, ErrorBoundary: ErrorPage },
    { path: "sedes", Component: SedesPage, ErrorBoundary: ErrorPage },
    { path: "usuarios", Component: UsuariosPage, ErrorBoundary: ErrorPage },
    { path: "geografia", Component: GeographyPage, ErrorBoundary: ErrorPage },
    { path: "notificaciones", Component: NotificationsPage, ErrorBoundary: ErrorPage },
    { path: "perfil", Component: ProfilePage, ErrorBoundary: ErrorPage },
    { path: "cumpleanos", Component: CumpleanosPage, ErrorBoundary: ErrorPage },
    { path: "sitemap", Component: SitemapPage, ErrorBoundary: ErrorPage },
    { path: "administrador", Component: AdministradorPage, ErrorBoundary: ErrorPage },
    { path: "estadisticas", Component: StatisticsPage, ErrorBoundary: ErrorPage },
    { path: "ministerios", Component: GlobalMinisteriosPage, ErrorBoundary: ErrorPage },
    { path: "eventos", Component: GlobalEventosPage, ErrorBoundary: ErrorPage },
    { path: "tareas", Component: GlobalTareasPage, ErrorBoundary: ErrorPage },
    { path: "aula", Component: GlobalAulaPage, ErrorBoundary: ErrorPage },  // NEW
  ],
},
```

- [ ] **Step 3: Commit route changes**

```bash
git add src/app/routes.ts
git commit -m "feat(routes): add /app/global/aula route for GlobalAulaPage"
```

---

### Task 8: Add Nav Item in AppLayout

**Files:**
- Modify: `src/app/components/AppLayout.tsx`

- [ ] **Step 1: Find and update breadcrumb map**

Edit `src/app/components/AppLayout.tsx`. Find the breadcrumb map near the top (around line 43-60) and add:

```typescript
"/app/global/aula": "Aula Virtual Global",
```

Updated section should look like:

```typescript
const breadcrumbMap: { [key: string]: string } = {
  "/app/global": "Dashboard Global",
  "/app/global/iglesias": "Gestión de Iglesias",
  "/app/global/sedes": "Gestión de Sedes",
  "/app/global/administrador": "Administrador",
  "/app/global/usuarios": "Usuarios",
  "/app/global/geografia": "Geografía",
  "/app/global/notificaciones": "Notificaciones",
  "/app/global/perfil": "Mi Perfil",
  "/app/global/eventos": "Eventos Globales",
  "/app/global/tareas": "Tareas Globales",
  "/app/global/aula": "Aula Virtual Global",  // NEW
  // ... rest of map
};
```

- [ ] **Step 2: Find super_admin nav config and add aula item**

Find the super_admin navigation array (around line 83-95) and add the aula link. Insert after the tareas link:

```typescript
{
  label: "Aula Virtual",
  path: "/app/global/aula",
  icon: <BookOpen className="w-5 h-5" />,
  section: "Gestión Global"
},
```

The updated super_admin section should look like:

```typescript
const superAdminItems = [
  { label: "Dashboard", path: "/app/global", icon: <LayoutDashboard className="w-5 h-5" />, section: "Principal" },
  { label: "Iglesias", path: "/app/global/iglesias", icon: <Building2 className="w-5 h-5" />, section: "Gestión Global" },
  { label: "Sedes", path: "/app/global/sedes", icon: <Church className="w-5 h-5" />, section: "Gestión Global" },
  { label: "Administrador", path: "/app/global/administrador", icon: <UserCheck className="w-5 h-5" />, section: "Gestión Global" },
  { label: "Ministerios", path: "/app/global/ministerios", icon: <Settings2 className="w-5 h-5" />, section: "Gestión Global" },
  { label: "Eventos", path: "/app/global/eventos", icon: <CalendarDays className="w-5 h-5" />, section: "Gestión Global" },
  { label: "Tareas", path: "/app/global/tareas", icon: <ListTodo className="w-5 h-5" />, section: "Gestión Global" },
  { label: "Aula Virtual", path: "/app/global/aula", icon: <BookOpen className="w-5 h-5" />, section: "Gestión Global" },  // NEW
  // ... rest
];
```

- [ ] **Step 3: Verify BookOpen icon is imported**

Check the imports at the top of AppLayout. Verify `BookOpen` is imported from lucide-react. If not already there, add it:

```typescript
import { BookOpen, /* other icons... */ } from 'lucide-react';
```

- [ ] **Step 4: Commit navigation changes**

```bash
git add src/app/components/AppLayout.tsx
git commit -m "feat(nav): add Aula Virtual nav item to global section for super_admin"
```

---

### Task 9: Manual Testing & Verification

**Files:**
- N/A (testing step)

- [ ] **Step 1: Start development server**

```bash
cd /home/juanda/Proyectofinal
npm run dev
```

Expected: Server starts on http://localhost:5173 (or similar)

- [ ] **Step 2: Login as super_admin**

- Navigate to http://localhost:5173
- Login with super_admin credentials
- Verify you're authenticated

- [ ] **Step 3: Check navigation**

- Open the sidebar
- Verify "Aula Virtual" appears under "Gestión Global" section
- Click on it

Expected: Navigate to `/app/global/aula` and see the GlobalAulaPage header and iglesias list

- [ ] **Step 4: Test expand/collapse iglesia**

- Click on an iglesia row to expand
- Verify cursos and ministerios load (spinners appear briefly)
- Verify list shows:
  - "Cursos de [Iglesia]" section
  - List of iglesia-scoped cursos
  - "Ministerios" section with ministerios

Expected: Smooth expand/collapse animation, no console errors

- [ ] **Step 5: Test expand ministerio**

- Inside an expanded iglesia, click ministerio toggle
- Verify cursos de ministerio load

Expected: Ministerio expands, shows its cursos

- [ ] **Step 6: Test click curso → detail panel**

- Click on any curso (from iglesia or ministerio)
- Verify detail panel opens from right side
- Verify it shows:
  - Curso title, description, estado
  - Iglesia/Ministerio badges
  - Inscripciones list
  - "Agregar" button
  - "Ver curso completo" link

Expected: Panel opens smoothly, all data displays correctly, no console errors

- [ ] **Step 7: Test edit metadata**

- In detail panel, click Edit button (pencil icon)
- Verify form fields become editable
- Change titulo/descripcion/estado
- Click Save
- Verify toast "Curso actualizado exitosamente" appears
- Verify panel updates to show new values
- Click "Ver" button to exit edit mode

Expected: Edits persist, form validates, no duplicate saves

- [ ] **Step 8: Test close and reopen**

- Close detail panel (X button or backdrop click)
- Click another curso
- Verify detail panel opens with correct curso data

Expected: Panel closes/opens smoothly, data is correct for each curso

- [ ] **Step 9: Check console for errors**

- Open browser DevTools → Console
- Perform all above tests
- Verify no red error messages

Expected: Only info/debug logs, no errors

- [ ] **Step 10: Test role guard (non-super_admin)**

- Logout
- Login as admin_iglesia or another role
- Try to navigate to `/app/global/aula` directly
- Verify alert appears: "Solo super_admin puede acceder..."

Expected: Access denied, appropriate message shown

- [ ] **Step 11: Commit test completion**

```bash
git add -A
git commit -m "test: manual testing of GlobalAulaPage - all features verified working"
```

---

## Summary

- **6 new components** created (GlobalAulaPage, IglesiaAulaRow, MinisterioRow, CursoListItem, GlobalAulaDetailPanel)
- **5 new hooks** for data fetching (useCursosGlobal, useCursosPorMinisterio, useCursoDetalle, useEditCurso, useManageEnrollments)
- **2 files modified** (routes.ts, AppLayout.tsx) for route registration and navigation
- **Hierarchical UI** with lazy-loaded data and efficient React Query caching
- **Full CRUD** on curso metadata and enrollments from global context
- **Role protection** ensures only super_admin can access

All tasks follow TDD/commit-early patterns with clear, atomic commits.

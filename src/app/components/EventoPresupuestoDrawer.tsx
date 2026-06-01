import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog"
import { ConfirmDialog } from "./ui/ConfirmDialog"
import { Skeleton } from "./ui/skeleton"
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react"
import type { EventoEnriquecido } from "@/services/eventos.service"
import type { PresupuestoItem } from "@/types/app.types"
import type { CreateItemPayload, UpdateItemPayload } from "@/services/evento-presupuesto.service"
import {
  useEventoPresupuestoItems,
  useCreatePresupuestoItem,
  useUpdatePresupuestoItem,
  useDeletePresupuestoItem,
} from "@/hooks/useEventoPresupuesto"
import { useApp } from "@/app/store/AppContext"

const CATEGORIAS: Record<"ingreso" | "egreso", string[]> = {
  ingreso: ["Ofrenda", "Aporte voluntario", "Venta de entradas", "Patrocinio", "Otro (especificar)"],
  egreso: ["Sonido", "Decoración", "Comida/Refrigerio", "Transporte", "Material", "Publicidad", "Otro (especificar)"],
}

const EMPTY_FORM = { categoriaSelect: "", categoriaCustom: "", descripcion: "", montoPlaneado: "", montoReal: "" }

function fmt(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
}

function ItemRow({
  item,
  onEdit,
  onDelete,
}: {
  item: PresupuestoItem
  onEdit: (item: PresupuestoItem) => void
  onDelete: (item: PresupuestoItem) => void
}) {
  const diff = item.montoReal !== null ? item.montoReal - item.montoPlaneado : null
  return (
    <div className="bg-card/40 border border-border/50 rounded-xl p-3 space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold">{item.categoria}</p>
          {item.descripcion && <p className="text-xs text-muted-foreground">{item.descripcion}</p>}
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(item)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(item)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-background/50 rounded-lg p-2">
          <p className="text-muted-foreground mb-0.5">Planeado</p>
          <p className="font-semibold">{fmt(item.montoPlaneado)}</p>
        </div>
        <div className="bg-background/50 rounded-lg p-2">
          <p className="text-muted-foreground mb-0.5">Real</p>
          <p className="font-semibold text-emerald-400">{item.montoReal !== null ? fmt(item.montoReal) : "-"}</p>
        </div>
        <div className="bg-background/50 rounded-lg p-2">
          <p className="text-muted-foreground mb-0.5">Diferencia</p>
          {diff !== null ? (
            <p className={`font-semibold ${diff >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {diff >= 0 ? "+" : ""}
              {fmt(diff)}
            </p>
          ) : <p className="text-muted-foreground">-</p>}
        </div>
      </div>
    </div>
  )
}

function ItemsSection({
  tipo,
  items,
  isLoading,
  onAdd,
  onEdit,
  onDelete,
}: {
  tipo: "ingreso" | "egreso"
  items: PresupuestoItem[]
  isLoading: boolean
  onAdd: () => void
  onEdit: (item: PresupuestoItem) => void
  onDelete: (item: PresupuestoItem) => void
}) {
  const filtered = items.filter((i) => i.tipo === tipo)
  const totalPlaneado = filtered.reduce((s, i) => s + i.montoPlaneado, 0)
  const totalReal = filtered.reduce((s, i) => s + (i.montoReal ?? 0), 0)
  const pct = totalPlaneado > 0 ? Math.round((totalReal / totalPlaneado) * 100) : 0

  return (
    <div className="space-y-3">
      {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
      ) : (
        filtered.map((item) => (
          <ItemRow key={item.idPresupuestoItem} item={item} onEdit={onEdit} onDelete={onDelete} />
        ))
      )}

      <button
        onClick={onAdd}
        className="w-full border border-dashed border-primary/40 rounded-xl p-3 text-sm text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        + Agregar ítem
      </button>

      {filtered.length > 0 && (
        <div className="bg-card/30 border border-border/50 rounded-xl p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total planeado</span>
            <span className="font-semibold">{fmt(totalPlaneado)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total real</span>
            <span className={`font-semibold ${tipo === "ingreso" ? "text-emerald-400" : "text-rose-400"}`}>{fmt(totalReal)}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-border/50">
            <span className="text-muted-foreground text-xs">Ejecucion</span>
            <span className="font-bold text-primary">{pct}%</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function EventoPresupuestoDrawer({
  evento,
  onClose,
}: {
  evento: EventoEnriquecido | null
  onClose: () => void
}) {
  const { usuarioActual } = useApp()
  const { data: items = [], isLoading } = useEventoPresupuestoItems(evento?.idEvento)
  const createMutation = useCreatePresupuestoItem()
  const updateMutation = useUpdatePresupuestoItem()
  const deleteMutation = useDeletePresupuestoItem()

  const [activeTab, setActiveTab] = useState<"ingreso" | "egreso">("ingreso")
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<PresupuestoItem | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; item: PresupuestoItem | null }>({ open: false, item: null })

  const ingresosReales = items.filter((i) => i.tipo === "ingreso").reduce((s, i) => s + (i.montoReal ?? 0), 0)
  const egresosReales = items.filter((i) => i.tipo === "egreso").reduce((s, i) => s + (i.montoReal ?? 0), 0)
  const balanceNeto = ingresosReales - egresosReales

  function openAdd(tipo: "ingreso" | "egreso") {
    setActiveTab(tipo)
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(item: PresupuestoItem) {
    setEditingItem(item)
    const isPredefined = CATEGORIAS[item.tipo].includes(item.categoria)
    setForm({
      categoriaSelect: isPredefined ? item.categoria : "Otro (especificar)",
      categoriaCustom: isPredefined ? "" : item.categoria,
      descripcion: item.descripcion ?? "",
      montoPlaneado: String(item.montoPlaneado),
      montoReal: item.montoReal !== null ? String(item.montoReal) : "",
    })
    setActiveTab(item.tipo)
    setShowForm(true)
  }

  function handleSave() {
    if (!evento) return
    const categoria = form.categoriaSelect === "Otro (especificar)" ? form.categoriaCustom.trim() : form.categoriaSelect
    if (!categoria) return
    const montoPlaneado = parseFloat(form.montoPlaneado) || 0
    const montoReal = form.montoReal !== "" ? parseFloat(form.montoReal) : null

    if (editingItem) {
      const payload: UpdateItemPayload = { categoria, descripcion: form.descripcion || null, montoPlaneado, montoReal }
      updateMutation.mutate({ id: editingItem.idPresupuestoItem, idEvento: evento.idEvento, payload }, { onSuccess: () => setShowForm(false) })
    } else {
      const payload: CreateItemPayload = {
        idEvento: evento.idEvento,
        tipo: activeTab,
        categoria,
        descripcion: form.descripcion || null,
        montoPlaneado,
        montoReal,
        creadoPor: usuarioActual?.idUsuario ?? null,
      }
      createMutation.mutate(payload, { onSuccess: () => setShowForm(false) })
    }
  }

  function handleDelete() {
    if (!confirmDelete.item || !evento) return
    deleteMutation.mutate({ id: confirmDelete.item.idPresupuestoItem, idEvento: evento.idEvento }, {
      onSuccess: () => setConfirmDelete({ open: false, item: null }),
    })
  }

  const categoriaOptions = CATEGORIAS[activeTab]
  const isSaving = createMutation.isPending || updateMutation.isPending
  const ministerioTexto = evento?.ministerioNombre ?? (evento?.idMinisterio ? "Ministerio" : "Global")

  return (
    <>
      <Sheet open={!!evento} onOpenChange={(open) => { if (!open) onClose() }}>
        <SheetContent className="w-[440px] sm:max-w-[440px] bg-card/95 backdrop-blur-2xl border-border/50 overflow-y-auto">
          <SheetHeader className="mb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle className="text-lg font-bold tracking-tight">{evento?.nombre}</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{ministerioTexto} · {evento?.fechaInicio ? new Date(evento.fechaInicio).toLocaleDateString("es-CO") : ""}</p>
              </div>
              <div className={`rounded-xl px-3 py-2 text-right border ${balanceNeto >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Balance</p>
                <p className={`text-base font-bold ${balanceNeto >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {balanceNeto >= 0 ? "+" : ""}
                  {fmt(balanceNeto)}
                </p>
              </div>
            </div>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "ingreso" | "egreso")}>
            <TabsList className="w-full bg-card/40 border border-border/50 p-1 rounded-xl mb-4">
              <TabsTrigger value="ingreso" className="flex-1 rounded-lg text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Ingresos
              </TabsTrigger>
              <TabsTrigger value="egreso" className="flex-1 rounded-lg text-xs data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                <TrendingDown className="w-3.5 h-3.5 mr-1.5" /> Egresos
              </TabsTrigger>
            </TabsList>
            <TabsContent value="ingreso" className="mt-0">
              <ItemsSection tipo="ingreso" items={items} isLoading={isLoading}
                onAdd={() => openAdd("ingreso")} onEdit={openEdit}
                onDelete={(item) => setConfirmDelete({ open: true, item })} />
            </TabsContent>
            <TabsContent value="egreso" className="mt-0">
              <ItemsSection tipo="egreso" items={items} isLoading={isLoading}
                onAdd={() => openAdd("egreso")} onEdit={openEdit}
                onDelete={(item) => setConfirmDelete({ open: true, item })} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) setShowForm(false) }}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card/95 backdrop-blur-2xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingItem ? "Editar item" : `Agregar ${activeTab}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Categoria</label>
              <Select value={form.categoriaSelect} onValueChange={(v) => setForm((f) => ({ ...f, categoriaSelect: v, categoriaCustom: "" }))}>
                <SelectTrigger className="h-10 bg-background/50 border-white/10 rounded-xl text-sm">
                  <SelectValue placeholder="Selecciona una categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoriaOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.categoriaSelect === "Otro (especificar)" && (
                <Input
                  className="mt-2 h-10 bg-background/50 border-white/10 rounded-xl text-sm"
                  placeholder="Escribe la categoria..."
                  value={form.categoriaCustom}
                  onChange={(e) => setForm((f) => ({ ...f, categoriaCustom: e.target.value }))}
                />
              )}
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Descripcion (opcional)</label>
              <Input
                className="h-10 bg-background/50 border-white/10 rounded-xl text-sm"
                placeholder="Detalle adicional..."
                value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Monto planeado</label>
                <Input
                  type="number" min={0} step={1000}
                  className="h-10 bg-background/50 border-white/10 rounded-xl text-sm"
                  placeholder="0"
                  value={form.montoPlaneado}
                  onChange={(e) => setForm((f) => ({ ...f, montoPlaneado: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">Monto real (opcional)</label>
                <Input
                  type="number" min={0} step={1000}
                  className="h-10 bg-background/50 border-white/10 rounded-xl text-sm"
                  placeholder="0"
                  value={form.montoReal}
                  onChange={(e) => setForm((f) => ({ ...f, montoReal: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving || !form.categoriaSelect || (form.categoriaSelect === "Otro (especificar)" && !form.categoriaCustom.trim())} className="rounded-xl bg-primary">
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, item: null })}
        onConfirm={handleDelete}
        title="Eliminar item"
        description={`¿Eliminar "${confirmDelete.item?.categoria}"? Esta accion no se puede deshacer.`}
      />
    </>
  )
}

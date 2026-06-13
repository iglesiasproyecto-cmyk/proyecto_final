// src/app/components/disponibilidad/CalendarioMensual.tsx
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/app/components/ui/button'

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export interface DayCellData {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
}

interface Props {
  year?: number
  month?: number          // 0-indexed
  onMonthChange?: (year: number, month: number) => void
  renderDay?: (data: DayCellData) => React.ReactNode
  onDayClick?: (date: Date) => void
}

export function CalendarioMensual({ year: yearProp, month: monthProp, onMonthChange, renderDay, onDayClick }: Props) {
  const today = new Date()
  const [year, setYear] = useState(yearProp ?? today.getFullYear())
  const [month, setMonth] = useState(monthProp ?? today.getMonth())

  function navigate(delta: number) {
    let m = month + delta
    let y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setYear(y)
    setMonth(m)
    onMonthChange?.(y, m)
  }

  function buildDays(): DayCellData[] {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrev = new Date(year, month, 0).getDate()
    const cells: DayCellData[] = []

    // Previous month fill
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrev - i)
      cells.push({ date: d, isCurrentMonth: false, isToday: false })
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const isToday = date.toDateString() === today.toDateString()
      cells.push({ date, isCurrentMonth: true, isToday })
    }
    // Next month fill to complete 6 rows
    const remaining = 42 - cells.length
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false, isToday: false })
    }
    return cells
  }

  const days = buildDays()

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-bold uppercase tracking-widest text-foreground/80">
          {MESES[month]} {year}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => navigate(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((cell, i) => (
          <button
            key={i}
            onClick={() => cell.isCurrentMonth && onDayClick?.(cell.date)}
            className={`
              relative min-h-[40px] rounded-xl p-1 text-xs font-medium transition-all
              ${cell.isCurrentMonth ? 'cursor-pointer hover:bg-primary/10' : 'opacity-25 cursor-default pointer-events-none'}
              ${cell.isToday ? 'ring-2 ring-primary/60' : ''}
            `}
          >
            <span className={`
              absolute top-1 left-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center rounded-full text-[11px]
              ${cell.isToday ? 'bg-primary text-white font-black' : 'text-foreground/70'}
            `}>
              {cell.date.getDate()}
            </span>
            {cell.isCurrentMonth && renderDay?.(cell)}
          </button>
        ))}
      </div>
    </div>
  )
}

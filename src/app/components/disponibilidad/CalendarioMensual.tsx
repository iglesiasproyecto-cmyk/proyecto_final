// src/app/components/disponibilidad/CalendarioMensual.tsx
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/app/components/ui/button'

const DIAS_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export interface DayCellData {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
}

interface Props {
  year?: number
  month?: number
  onMonthChange?: (year: number, month: number) => void
  renderDay?: (data: DayCellData) => React.ReactNode
  onDayClick?: (date: Date) => void
}

export function CalendarioMensual({ year: yearProp, month: monthProp, onMonthChange, renderDay, onDayClick }: Props) {
  const today = new Date()
  const [year, setYear] = useState(yearProp ?? today.getFullYear())
  const [month, setMonth] = useState(monthProp ?? today.getMonth())
  const [direction, setDirection] = useState<1 | -1>(1)

  function navigate(delta: number) {
    setDirection(delta > 0 ? 1 : -1)
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

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrev - i)
      cells.push({ date: d, isCurrentMonth: false, isToday: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d)
      const isToday = date.toDateString() === today.toDateString()
      cells.push({ date, isCurrentMonth: true, isToday })
    }
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
      <div className="flex items-center justify-between mb-5 px-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-primary/10 transition-all"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <motion.div
          key={`${year}-${month}`}
          initial={{ opacity: 0, y: direction > 0 ? 8 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: direction > 0 ? -8 : 8 }}
          transition={{ duration: 0.2 }}
          className="text-sm font-bold tracking-tight text-foreground"
        >
          {MESES[month]} <span className="text-muted-foreground/70">{year}</span>
        </motion.div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg hover:bg-primary/10 transition-all"
          onClick={() => navigate(1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-2 px-1">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1 px-1">
        <AnimatePresence mode="wait">
          {days.map((cell, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15, delay: i * 0.02 }}
              onClick={() => cell.isCurrentMonth && onDayClick?.(cell.date)}
              className={`
                relative min-h-[42px] rounded-xl p-0.5 text-xs font-semibold transition-all overflow-hidden group
                ${cell.isCurrentMonth
                  ? 'cursor-pointer hover:bg-primary/10 active:scale-95'
                  : 'opacity-20 cursor-default pointer-events-none'}
                ${cell.isToday ? 'ring-2 ring-primary/50 bg-primary/5' : 'hover:bg-white/5'}
              `}
            >
              <span className={`
                absolute top-0.5 left-1/2 -translate-x-1/2 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold transition-all
                ${cell.isToday
                  ? 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-md shadow-primary/30'
                  : 'text-foreground/60 group-hover:text-foreground/80'}
              `}>
                {cell.date.getDate()}
              </span>
              {cell.isCurrentMonth && renderDay?.(cell)}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

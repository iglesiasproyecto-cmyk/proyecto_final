import { motion } from 'motion/react'

export function TasksSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-16 bg-white/10 rounded-lg"
        />
      ))}
    </div>
  )
}

export function KanbanColumnSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-24 bg-white/10 rounded-lg"
        />
      ))}
    </div>
  )
}

export function TaskSidePanelSkeleton() {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="space-y-4"
    >
      <div className="h-8 bg-white/10 rounded-lg w-3/4" />
      <div className="h-12 bg-white/10 rounded-lg w-full" />
      <div className="h-12 bg-white/10 rounded-lg w-full" />
      <div className="h-32 bg-white/10 rounded-lg w-full" />
    </motion.div>
  )
}

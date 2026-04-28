import { Progress } from '@/app/components/ui/progress'
import { Badge } from '@/app/components/ui/badge'
import { CheckCircle, Clock, Target } from 'lucide-react'

interface BarraProgresoProps {
  porcentaje: number
  actividadesCompletadas: number
  evaluacionesAprobadas: number
  totalElementos: number
  showDetails?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function BarraProgreso({
  porcentaje,
  actividadesCompletadas,
  evaluacionesAprobadas,
  totalElementos,
  showDetails = false,
  size = 'md'
}: BarraProgresoProps) {
  const getStatusColor = () => {
    if (porcentaje === 100) return 'text-green-600'
    if (porcentaje >= 50) return 'text-blue-600'
    return 'text-orange-600'
  }

  const getStatusIcon = () => {
    if (porcentaje === 100) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (porcentaje > 0) return <Clock className="h-4 w-4 text-blue-600" />
    return <Target className="h-4 w-4 text-orange-600" />
  }

  const getStatusText = () => {
    if (porcentaje === 100) return 'Completado'
    if (porcentaje > 0) return 'En progreso'
    return 'Sin iniciar'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`font-medium ${getStatusColor()}`}>
            {porcentaje}% completado
          </span>
        </div>
        <Badge variant="outline" className={getStatusColor()}>
          {getStatusText()}
        </Badge>
      </div>

      <Progress
        value={porcentaje}
        className={`h-${size === 'sm' ? '2' : size === 'md' ? '3' : '4'}`}
      />

      {showDetails && (
        <div className="text-sm text-muted-foreground space-y-1">
          <div>Actividades completadas: {actividadesCompletadas}</div>
          <div>Evaluaciones aprobadas: {evaluacionesAprobadas}</div>
          <div>Total de elementos: {totalElementos}</div>
        </div>
      )}
    </div>
  )
}
import assert from 'node:assert/strict'
import test from 'node:test'

import { computeStatistics } from '../../src/services/statistics.service.ts'

const allTime = { start: null, end: null }

test('iglesia stats count active ministry members when no separate members dataset exists', () => {
  const stats = computeStatistics(
    { type: 'iglesia', idIglesia: 12 },
    allTime,
    {
      usuarios: [],
      miembros: [],
      sedes: [],
      ministerios: [],
      roles: [],
      eventos: [],
      tareas: [],
      cursos: [],
      inscripciones: [],
      certificados: [],
      miembrosMinisterio: [
        { idMiembroMinisterio: 1, activo: true },
        { idMiembroMinisterio: 2, activo: true },
      ],
    },
  )

  const activeMembers = stats.iglesia.kpis.find((kpi) => kpi.id === 'active-members')

  assert.equal(activeMembers?.value, 2)
})

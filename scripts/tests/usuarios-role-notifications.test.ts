import assert from 'node:assert/strict'
import test from 'node:test'

import {
  findActiveLeaderConflict,
  formatUsuarioMutationError,
  roleOptionsForScope,
} from '../../src/app/components/usuarios/roleNotifications.ts'
import { ROLE_IDS } from '../../src/app/constants/roles.ts'

const users = [
  {
    idUsuario: 7,
    nombres: 'Diana',
    apellidos: 'Mendez',
    minNames: [{ idMinisterio: 12, nombre: 'Comite de Alabanza', rol: 'Líder' }],
  },
  {
    idUsuario: 8,
    nombres: 'Juan',
    apellidos: 'Perez',
    minNames: [{ idMinisterio: 12, nombre: 'Comite de Alabanza', rol: 'Servidor' }],
  },
]

test('findActiveLeaderConflict returns current leader for selected ministry', () => {
  const conflict = findActiveLeaderConflict(users, ROLE_IDS.LIDER, 12)

  assert.equal(conflict?.idUsuario, 7)
  assert.equal(conflict?.leaderName, 'Diana Mendez')
  assert.equal(conflict?.ministerioName, 'Comite de Alabanza')
})

test('findActiveLeaderConflict ignores the same user when assigning an existing leader', () => {
  const conflict = findActiveLeaderConflict(users, ROLE_IDS.LIDER, 12, 7)

  assert.equal(conflict, null)
})

test('roleOptionsForScope hides super admin when a sede is selected', () => {
  const roles = [
    { idRol: ROLE_IDS.SUPER_ADMIN, nombre: 'Super Administrador' },
    { idRol: ROLE_IDS.ADMIN_IGLESIA, nombre: 'Administrador de Iglesia' },
  ]

  const filtered = roleOptionsForScope(roles, { selectedSedeId: 3, canAssignRole: () => true })

  assert.deepEqual(filtered.map((role) => role.idRol), [ROLE_IDS.ADMIN_IGLESIA])
})

test('formatUsuarioMutationError explains duplicate leader conflicts clearly', () => {
  const message = formatUsuarioMutationError(new Error('Ya existe un líder activo en este ministerio: Diana Mendez'))

  assert.equal(message, 'Este ministerio ya tiene un líder activo. Remueve ese líder antes de asignar otro.')
})

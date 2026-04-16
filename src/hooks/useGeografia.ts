import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPaises, getDepartamentos, getCiudades,
  createPais, updatePais, deletePais,
  createDepartamento, updateDepartamento, deleteDepartamento,
  createCiudad, updateCiudad, deleteCiudad,
} from '@/services/geografia.service'

export function usePaises() {
  return useQuery({ queryKey: ['paises'], queryFn: getPaises, staleTime: 30 * 60 * 1000 })
}

export function useDepartamentos(idPais?: number) {
  return useQuery({
    queryKey: ['departamentos', idPais],
    queryFn: () => getDepartamentos(idPais),
    staleTime: 30 * 60 * 1000,
  })
}

export function useCiudades(idDepartamento?: number) {
  return useQuery({
    queryKey: ['ciudades', idDepartamento],
    queryFn: () => getCiudades(idDepartamento),
    staleTime: 30 * 60 * 1000,
  })
}

export function useCreatePais() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nombre: string) => createPais(nombre),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paises'] }),
  })
}

export function useUpdatePais() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) => updatePais(id, nombre),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paises'] }),
  })
}

export function useDeletePais() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePais(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paises'] }),
  })
}

export function useCreateDepartamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nombre, idPais }: { nombre: string; idPais: number }) =>
      createDepartamento(nombre, idPais),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departamentos'] }),
  })
}

export function useUpdateDepartamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) => updateDepartamento(id, nombre),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departamentos'] }),
  })
}

export function useDeleteDepartamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDepartamento(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departamentos'] }),
  })
}

export function useCreateCiudad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nombre, idDepartamento }: { nombre: string; idDepartamento: number }) =>
      createCiudad(nombre, idDepartamento),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ciudades'] }),
  })
}

export function useUpdateCiudad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) => updateCiudad(id, nombre),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ciudades'] }),
  })
}

export function useDeleteCiudad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteCiudad(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ciudades'] }),
  })
}

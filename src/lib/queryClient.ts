import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Ha ocurrido un error')
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
})

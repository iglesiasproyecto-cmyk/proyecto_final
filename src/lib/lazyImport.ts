const CHUNK_RELOAD_KEY = 'iglesiabd:chunk-reload-attempted'

export function isDynamicImportFetchError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(message)
}

export async function loadLazyRoute<T>(loader: () => Promise<T>): Promise<T> {
  try {
    const module = await loader()
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    return module
  } catch (error) {
    if (
      isDynamicImportFetchError(error) &&
      typeof window !== 'undefined' &&
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(CHUNK_RELOAD_KEY) !== '1'
    ) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
      window.location.reload()
    }

    throw error
  }
}

// Development logging — tree-shaken in production builds
export const debugLog = (label: string, ...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(`[${label}]`, ...args)
  }
}

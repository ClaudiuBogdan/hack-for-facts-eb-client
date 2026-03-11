type CachedModuleRecord<TModule> =
  | {
      readonly status: 'pending'
      readonly promise: Promise<TModule>
    }
  | {
      readonly status: 'resolved'
      readonly module: TModule
    }
  | {
      readonly status: 'rejected'
      readonly error: unknown
    }

export type ModuleLoader<TModule> = () => Promise<TModule>

export function createModuleLoaderCache<TModule>() {
  const cachedModules = new Map<string, CachedModuleRecord<TModule>>()

  const startModuleLoad = (
    cacheKey: string,
    loadModule: ModuleLoader<TModule>,
  ): Promise<TModule> => {
    const cachedRecord = cachedModules.get(cacheKey)
    if (cachedRecord?.status === 'pending') {
      return cachedRecord.promise
    }
    if (cachedRecord?.status === 'resolved') {
      return Promise.resolve(cachedRecord.module)
    }
    if (cachedRecord?.status === 'rejected') {
      return Promise.reject(cachedRecord.error)
    }

    const pendingPromise = loadModule().then(
      (resolvedModule) => {
        cachedModules.set(cacheKey, {
          status: 'resolved',
          module: resolvedModule,
        })
        return resolvedModule
      },
      (error) => {
        cachedModules.set(cacheKey, {
          status: 'rejected',
          error,
        })
        throw error
      },
    )

    cachedModules.set(cacheKey, {
      status: 'pending',
      promise: pendingPromise,
    })

    return pendingPromise
  }

  return {
    preload(cacheKey: string, loadModule: ModuleLoader<TModule>): Promise<TModule> {
      return startModuleLoad(cacheKey, loadModule)
    },
    read(cacheKey: string, loadModule: ModuleLoader<TModule>): TModule {
      const cachedRecord = cachedModules.get(cacheKey)
      if (cachedRecord?.status === 'resolved') {
        return cachedRecord.module
      }
      if (cachedRecord?.status === 'pending') {
        throw cachedRecord.promise
      }
      if (cachedRecord?.status === 'rejected') {
        throw cachedRecord.error
      }

      throw startModuleLoad(cacheKey, loadModule)
    },
    peek(cacheKey: string): TModule | null {
      const cachedRecord = cachedModules.get(cacheKey)
      if (cachedRecord?.status === 'resolved') {
        return cachedRecord.module
      }
      return null
    },
    clear(): void {
      cachedModules.clear()
    },
  }
}

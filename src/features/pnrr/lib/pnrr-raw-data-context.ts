import { createContext } from 'react'

/**
 * False while the dashboard shows the server-built overview and the raw
 * dataset is still loading (or failed): detail reads wait for it, so they run
 * again once the dashboard's load or its retry succeeds. True elsewhere.
 */
export const PnrrRawDataReadyContext = createContext(true)

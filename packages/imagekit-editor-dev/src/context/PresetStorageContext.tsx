import type React from "react"
import { createContext, useContext } from "react"
import type { PresetStorageProvider } from "../storage"

const PresetStorageContext = createContext<PresetStorageProvider | null>(null)

export function PresetStorageContextProvider({
  provider,
  children,
}: {
  provider: PresetStorageProvider | null
  children: React.ReactNode
}) {
  return (
    <PresetStorageContext.Provider value={provider}>
      {children}
    </PresetStorageContext.Provider>
  )
}

export function usePresetStorage(): PresetStorageProvider | null {
  return useContext(PresetStorageContext)
}

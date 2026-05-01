import type React from "react"
import { createContext, useContext } from "react"
import type { TemplateStorageProvider } from "../storage"

const TemplateStorageContext = createContext<TemplateStorageProvider | null>(
  null,
)

export function TemplateStorageContextProvider({
  provider,
  children,
}: {
  provider: TemplateStorageProvider | null
  children: React.ReactNode
}) {
  return (
    <TemplateStorageContext.Provider value={provider}>
      {children}
    </TemplateStorageContext.Provider>
  )
}

export function useTemplateStorage(): TemplateStorageProvider | null {
  return useContext(TemplateStorageContext)
}

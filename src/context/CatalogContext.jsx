import { createContext, useContext, useEffect, useState } from 'react'
import { catalogApi, usersApi } from '../api'

const CatalogContext = createContext({ products: [], users: [], reload: () => {} })

/** Catálogo de productos y directorio de usuarios (para menús, filtros y responsables). */
export function CatalogProvider({ children }) {
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const load = () => {
    catalogApi.products(true).then(setProducts).catch(() => {})
    usersApi.directory().then(setUsers).catch(() => {})
  }
  useEffect(load, [])
  const byId = Object.fromEntries(products.map((p) => [p.id, p]))
  const byCode = Object.fromEntries(products.map((p) => [p.code, p]))
  return <CatalogContext.Provider value={{ products, activeProducts: products.filter((p) => p.active), users, byId, byCode, reload: load }}>{children}</CatalogContext.Provider>
}
export const useCatalog = () => useContext(CatalogContext)


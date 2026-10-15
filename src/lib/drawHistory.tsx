import { createContext, useContext } from 'react'

const EMPTY = new Map<string, number>()

/** Coincidencias recientes entre jugadores (domain/variety.ts) para que el sorteo busque variedad */
export const DrawHistoryContext = createContext<Map<string, number>>(EMPTY)

export const useDrawHistory = () => useContext(DrawHistoryContext)

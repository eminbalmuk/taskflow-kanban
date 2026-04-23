import { create } from 'zustand'

export type Card = {
  id: string
  title: string
  description: string | null
  color: string | null
  order: number
  columnId: string
}

export type Column = {
  id: string
  title: string
  order: number
  color: string | null
  cards: Card[]
}

export type Board = {
  id: string
  title: string
  columns: Column[]
}

interface KanbanStore {
  boards: Board[]
  activeBoard: Board | null
  loading: boolean
  searchQuery: string
  setSearchQuery: (query: string) => void
  setBoards: (boards: Board[]) => void
  setActiveBoard: (board: Board | null) => void
  fetchBoard: (boardId: string) => Promise<void>
  addCard: (columnId: string, title: string) => Promise<void>
  deleteCard: (cardId: string) => Promise<void>
  updateCardColor: (cardId: string, color: string) => Promise<void>
  updateCardTitle: (cardId: string, title: string) => Promise<void>
  addColumn: (boardId: string, title: string) => Promise<void>
  deleteColumn: (columnId: string) => Promise<void>
  updateColumnColor: (columnId: string, color: string) => Promise<void>
  updateColumnTitle: (columnId: string, title: string) => Promise<void>
  moveCard: (cardId: string, fromColId: string, toColId: string, newOrder: number) => Promise<void>
  moveColumn: (boardId: string, columnId: string, newOrder: number) => Promise<void>
}

export const useKanbanStore = create<KanbanStore>((set, get) => ({
  boards: [],
  activeBoard: null,
  loading: false,
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setBoards: (boards) => set({ boards }),
  setActiveBoard: (board) => set({ activeBoard: board }),
  
  fetchBoard: async (boardId) => {
    set({ loading: true })
    try {
      const res = await fetch(`/api/boards/${boardId}`)
      const data = await res.json()
      set({ activeBoard: data })
    } finally {
      set({ loading: false })
    }
  },

  addCard: async (columnId, title) => {
    const board = get().activeBoard
    if (!board) return
    const col = board.columns.find(c => c.id === columnId)
    const order = col ? col.cards.length : 0
    const res = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, columnId, order })
    })
    if (res.ok) {
      const newCard = await res.json()
      set((state) => {
        if (!state.activeBoard) return state
        const newColumns = state.activeBoard.columns.map(c => {
          if (c.id === columnId) return { ...c, cards: [...c.cards, newCard] }
          return c
        })
        return { activeBoard: { ...state.activeBoard, columns: newColumns } }
      })
    }
  },

  deleteCard: async (cardId) => {
    const res = await fetch(`/api/cards?id=${cardId}`, { method: 'DELETE' })
    if (res.ok) {
      set((state) => {
        if (!state.activeBoard) return state
        const newColumns = state.activeBoard.columns.map(col => ({
          ...col,
          cards: col.cards.filter(c => c.id !== cardId)
        }))
        return { activeBoard: { ...state.activeBoard, columns: newColumns } }
      })
    }
  },

  updateCardColor: async (cardId, color) => {
    const res = await fetch('/api/cards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, color })
    })
    if (res.ok) {
      set((state) => {
        if (!state.activeBoard) return state
        const newColumns = state.activeBoard.columns.map(col => ({
          ...col,
          cards: col.cards.map(c => c.id === cardId ? { ...c, color } : c)
        }))
        return { activeBoard: { ...state.activeBoard, columns: newColumns } }
      })
    }
  },

  updateCardTitle: async (cardId, title) => {
    const res = await fetch('/api/cards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, title })
    })
    if (res.ok) {
      set((state) => {
        if (!state.activeBoard) return state
        const newColumns = state.activeBoard.columns.map(col => ({
          ...col,
          cards: col.cards.map(c => c.id === cardId ? { ...c, title } : c)
        }))
        return { activeBoard: { ...state.activeBoard, columns: newColumns } }
      })
    }
  },

  addColumn: async (boardId, title) => {
    const board = get().activeBoard
    if (!board) return
    const order = board.columns.length
    const res = await fetch('/api/columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, boardId, order })
    })
    if (res.ok) {
      const newCol = await res.json()
      set((state) => {
        if (!state.activeBoard) return state
        return { activeBoard: { ...state.activeBoard, columns: [...state.activeBoard.columns, { ...newCol, cards: [] }] } }
      })
    }
  },

  deleteColumn: async (columnId) => {
    const res = await fetch(`/api/columns?id=${columnId}`, { method: 'DELETE' })
    if (res.ok) {
      set((state) => {
        if (!state.activeBoard) return state
        return { activeBoard: { ...state.activeBoard, columns: state.activeBoard.columns.filter(c => c.id !== columnId) } }
      })
    }
  },

  updateColumnColor: async (columnId, color) => {
    const res = await fetch('/api/columns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnId, color })
    })
    if (res.ok) {
      set((state) => {
        if (!state.activeBoard) return state
        const newColumns = state.activeBoard.columns.map(c => c.id === columnId ? { ...c, color } : c)
        return { activeBoard: { ...state.activeBoard, columns: newColumns } }
      })
    }
  },

  updateColumnTitle: async (columnId, title) => {
    const res = await fetch('/api/columns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnId, title })
    })
    if (res.ok) {
      set((state) => {
        if (!state.activeBoard) return state
        const newColumns = state.activeBoard.columns.map(c => c.id === columnId ? { ...c, title } : c)
        return { activeBoard: { ...state.activeBoard, columns: newColumns } }
      })
    }
  },

  moveCard: async (cardId, fromColId, toColId, newOrder) => {
    const state = get()
    if (!state.activeBoard) return
    const oldBoard = state.activeBoard
    const newColumns = oldBoard.columns.map((col) => {
      if (col.id === fromColId && col.id === toColId) {
        const newCards = [...col.cards]
        const cardIndex = newCards.findIndex((c) => c.id === cardId)
        if (cardIndex === -1) return col
        const [card] = newCards.splice(cardIndex, 1)
        newCards.splice(newOrder, 0, card)
        return { ...col, cards: newCards.map((c, i) => ({ ...c, order: i })) }
      }
      if (col.id === fromColId) return { ...col, cards: col.cards.filter((c) => c.id !== cardId).map((c, i) => ({ ...c, order: i })) }
      if (col.id === toColId) {
        const sourceCol = oldBoard.columns.find((c) => c.id === fromColId)
        const card = sourceCol?.cards.find((c) => c.id === cardId)
        if (!card) return col
        const newCards = [...col.cards]
        newCards.splice(newOrder, 0, { ...card, columnId: toColId })
        return { ...col, cards: newCards.map((c, i) => ({ ...c, order: i })) }
      }
      return col
    })
    set({ activeBoard: { ...oldBoard, columns: newColumns } })
    try {
      await fetch('/api/cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId, columnId: toColId, order: newOrder })
      })
    } catch (error) {
      set({ activeBoard: oldBoard })
    }
  },

  moveColumn: async (boardId, columnId, newOrder) => {
    const state = get()
    if (!state.activeBoard) return

    const oldBoard = state.activeBoard
    const activeIndex = oldBoard.columns.findIndex(c => c.id === columnId)

    if (activeIndex === -1) return

    const newColumns = [...oldBoard.columns]
    const [movedColumn] = newColumns.splice(activeIndex, 1)
    newColumns.splice(newOrder, 0, movedColumn)

    const updatedColumns = newColumns.map((c, i) => ({ ...c, order: i }))
    set({ activeBoard: { ...oldBoard, columns: updatedColumns } })

    try {
      await fetch('/api/columns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId, order: newOrder })
      })
    } catch (error) {
      set({ activeBoard: oldBoard })
    }
  }
}))

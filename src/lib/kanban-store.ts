import { create } from 'zustand'
import { normalizeAssignees } from '@/lib/assignees'

export type Card = {
  id: string
  title: string
  description: string | null
  assignees: string[]
  dueDate: string | null
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
  accessRole: 'owner' | 'edit' | 'view'
  canEdit: boolean
  isOwner: boolean
  columns: Column[]
}

type ApiCard = Omit<Card, 'assignees'> & {
  assignees?: string[]
  assignee?: string | null
}

type ApiBoard = Omit<Board, 'columns'> & {
  columns?: Array<Omit<Column, 'cards'> & { cards: ApiCard[] }>
}

function normalizeCard(card: ApiCard): Card {
  return {
    ...card,
    assignees: normalizeAssignees(card.assignees ?? card.assignee),
  }
}

function normalizeBoard(board: ApiBoard | null): Board | null {
  if (!board) return null

  return {
    ...board,
    columns: (board.columns ?? []).map((column) => ({
      ...column,
      cards: column.cards.map(normalizeCard),
    })),
  }
}

function extractBoardAssignees(board: Board | null) {
  if (!board) return []
  return Array.from(new Set(board.columns.flatMap((column) => column.cards.flatMap((card) => card.assignees))))
}

interface KanbanStore {
  boards: Board[]
  activeBoard: Board | null
  loading: boolean
  searchQuery: string
  selectedAssignees: string[]
  setSearchQuery: (query: string) => void
  setSelectedAssignees: (assignees: string[]) => void
  setBoards: (boards: Board[]) => void
  setActiveBoard: (board: Board | null) => void
  fetchBoard: (boardId: string) => Promise<void>
  createBoard: (title: string) => Promise<void>
  deleteBoard: (boardId: string) => Promise<void>
  leaveBoard: (boardId: string) => Promise<void>
  updateBoardTitle: (boardId: string, title: string) => Promise<void>
  addCard: (columnId: string, title: string, assignees?: string[], dueDate?: string | null) => Promise<void>
  deleteCard: (cardId: string) => Promise<void>
  updateCardColor: (cardId: string, color: string) => Promise<void>
  updateCardTitle: (cardId: string, title: string) => Promise<void>
  updateCardAssignees: (cardId: string, assignees: string[]) => Promise<void>
  updateCardDueDate: (cardId: string, dueDate: string | null) => Promise<void>
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
  selectedAssignees: [],
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedAssignees: (selectedAssignees) => set({ selectedAssignees }),
  setBoards: (boards) => set({ boards: boards.map((board) => normalizeBoard(board as ApiBoard)!).filter(Boolean) }),
  setActiveBoard: (board) => {
    const normalizedBoard = normalizeBoard(board as ApiBoard | null)
    set({ activeBoard: normalizedBoard })

    if (normalizedBoard) {
      set({ selectedAssignees: extractBoardAssignees(normalizedBoard) })
      return
    }

    set({ selectedAssignees: [] })
  },

  fetchBoard: async (boardId) => {
    set({ loading: true })

    try {
      const response = await fetch(`/api/boards/${boardId}`)
      const data = await response.json()
      get().setActiveBoard(data)
    } finally {
      set({ loading: false })
    }
  },

  updateBoardTitle: async (boardId, title) => {
    if (!get().activeBoard?.canEdit) return

    const response = await fetch(`/api/boards/${boardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })

    if (!response.ok) return

    set((state) => {
      const newBoards = state.boards.map((board) => (board.id === boardId ? { ...board, title } : board))
      if (!state.activeBoard) return { boards: newBoards }

      return {
        boards: newBoards,
        activeBoard: { ...state.activeBoard, title },
      }
    })
  },

  createBoard: async (title) => {
    const response = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })

    if (!response.ok) return

    const newBoard = normalizeBoard((await response.json()) as ApiBoard)
    if (!newBoard) return

    set((state) => ({
      boards: [...state.boards, newBoard],
    }))

    get().setActiveBoard(newBoard)
  },

  deleteBoard: async (boardId) => {
    const response = await fetch(`/api/boards/${boardId}`, { method: 'DELETE' })
    if (!response.ok) return

    set((state) => ({
      boards: state.boards.filter((board) => board.id !== boardId),
    }))

    const currentBoards = get().boards
    if (currentBoards.length > 0) {
      get().fetchBoard(currentBoards[0].id)
      return
    }

    set({ activeBoard: null })
  },

  leaveBoard: async (boardId) => {
    const response = await fetch(`/api/board-access?boardId=${boardId}`, { method: 'DELETE' })
    if (!response.ok) return

    set((state) => ({
      boards: state.boards.filter((board) => board.id !== boardId),
    }))

    const currentBoards = get().boards
    if (currentBoards.length > 0) {
      get().fetchBoard(currentBoards[0].id)
      return
    }

    set({ activeBoard: null })
  },

  addCard: async (columnId, title, assignees, dueDate) => {
    const board = get().activeBoard
    if (!board || !board.canEdit) return

    const column = board.columns.find((item) => item.id === columnId)
    const order = column ? column.cards.length : 0
    const normalizedAssignees = normalizeAssignees(assignees)

    const response = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, columnId, order, assignees: normalizedAssignees, dueDate }),
    })

    if (!response.ok) return

    const newCard = normalizeCard((await response.json()) as ApiCard)

    set((state) => {
      if (!state.activeBoard) return state

      const newColumns = state.activeBoard.columns.map((item) => {
        if (item.id === columnId) {
          return { ...item, cards: [...item.cards, newCard] }
        }

        return item
      })

      return {
        activeBoard: { ...state.activeBoard, columns: newColumns },
        selectedAssignees: Array.from(new Set([...state.selectedAssignees, ...newCard.assignees])),
      }
    })
  },

  updateCardAssignees: async (cardId, assignees) => {
    if (!get().activeBoard?.canEdit) return

    const normalizedAssignees = normalizeAssignees(assignees)

    const response = await fetch('/api/cards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, assignees: normalizedAssignees }),
    })

    if (!response.ok) return

    const updatedCard = normalizeCard((await response.json()) as ApiCard)

    set((state) => {
      if (!state.activeBoard) return state

      const newColumns = state.activeBoard.columns.map((column) => ({
        ...column,
        cards: column.cards.map((card) =>
          card.id === cardId ? { ...card, assignees: updatedCard.assignees } : card
        ),
      }))

      return {
        activeBoard: { ...state.activeBoard, columns: newColumns },
        selectedAssignees: Array.from(new Set([...state.selectedAssignees, ...updatedCard.assignees])),
      }
    })
  },

  updateCardDueDate: async (cardId, dueDate) => {
    if (!get().activeBoard?.canEdit) return

    const response = await fetch('/api/cards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, dueDate }),
    })

    if (!response.ok) return

    const updatedCard = normalizeCard((await response.json()) as ApiCard)

    set((state) => {
      if (!state.activeBoard) return state

      const newColumns = state.activeBoard.columns.map((column) => ({
        ...column,
        cards: column.cards.map((card) =>
          card.id === cardId ? { ...card, dueDate: updatedCard.dueDate } : card
        ),
      }))

      return { activeBoard: { ...state.activeBoard, columns: newColumns } }
    })
  },

  deleteCard: async (cardId) => {
    if (!get().activeBoard?.canEdit) return

    const response = await fetch(`/api/cards?id=${cardId}`, { method: 'DELETE' })
    if (!response.ok) return

    set((state) => {
      if (!state.activeBoard) return state

      const newColumns = state.activeBoard.columns.map((column) => ({
        ...column,
        cards: column.cards.filter((card) => card.id !== cardId),
      }))

      return { activeBoard: { ...state.activeBoard, columns: newColumns } }
    })
  },

  updateCardColor: async (cardId, color) => {
    if (!get().activeBoard?.canEdit) return

    const response = await fetch('/api/cards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, color }),
    })

    if (!response.ok) return

    set((state) => {
      if (!state.activeBoard) return state

      const newColumns = state.activeBoard.columns.map((column) => ({
        ...column,
        cards: column.cards.map((card) => (card.id === cardId ? { ...card, color } : card)),
      }))

      return { activeBoard: { ...state.activeBoard, columns: newColumns } }
    })
  },

  updateCardTitle: async (cardId, title) => {
    if (!get().activeBoard?.canEdit) return

    const response = await fetch('/api/cards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, title }),
    })

    if (!response.ok) return

    set((state) => {
      if (!state.activeBoard) return state

      const newColumns = state.activeBoard.columns.map((column) => ({
        ...column,
        cards: column.cards.map((card) => (card.id === cardId ? { ...card, title } : card)),
      }))

      return { activeBoard: { ...state.activeBoard, columns: newColumns } }
    })
  },

  addColumn: async (boardId, title) => {
    if (!get().activeBoard?.canEdit) return

    const response = await fetch('/api/columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, boardId, order: get().activeBoard?.columns.length || 0 }),
    })

    if (!response.ok) return

    const newColumn = await response.json()

    set((state) => {
      if (!state.activeBoard) return state

      return {
        activeBoard: {
          ...state.activeBoard,
          columns: [...state.activeBoard.columns, { ...newColumn, cards: [] }],
        },
      }
    })
  },

  deleteColumn: async (columnId) => {
    if (!get().activeBoard?.canEdit) return

    const response = await fetch(`/api/columns?id=${columnId}`, { method: 'DELETE' })
    if (!response.ok) return

    set((state) => {
      if (!state.activeBoard) return state

      return {
        activeBoard: {
          ...state.activeBoard,
          columns: state.activeBoard.columns.filter((column) => column.id !== columnId),
        },
      }
    })
  },

  updateColumnColor: async (columnId, color) => {
    if (!get().activeBoard?.canEdit) return

    const response = await fetch('/api/columns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnId, color }),
    })

    if (!response.ok) return

    set((state) => {
      if (!state.activeBoard) return state

      const newColumns = state.activeBoard.columns.map((column) =>
        column.id === columnId ? { ...column, color } : column
      )

      return { activeBoard: { ...state.activeBoard, columns: newColumns } }
    })
  },

  updateColumnTitle: async (columnId, title) => {
    if (!get().activeBoard?.canEdit) return

    const response = await fetch('/api/columns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnId, title }),
    })

    if (!response.ok) return

    set((state) => {
      if (!state.activeBoard) return state

      const newColumns = state.activeBoard.columns.map((column) =>
        column.id === columnId ? { ...column, title } : column
      )

      return { activeBoard: { ...state.activeBoard, columns: newColumns } }
    })
  },

  moveCard: async (cardId, fromColId, toColId, newOrder) => {
    const state = get()
    if (!state.activeBoard || !state.activeBoard.canEdit) return

    const oldBoard = state.activeBoard
    const newColumns = oldBoard.columns.map((column) => {
      if (column.id === fromColId && column.id === toColId) {
        const newCards = [...column.cards]
        const cardIndex = newCards.findIndex((card) => card.id === cardId)
        if (cardIndex === -1) return column

        const [card] = newCards.splice(cardIndex, 1)
        newCards.splice(newOrder, 0, card)

        return {
          ...column,
          cards: newCards.map((cardItem, index) => ({ ...cardItem, order: index })),
        }
      }

      if (column.id === fromColId) {
        return {
          ...column,
          cards: column.cards
            .filter((card) => card.id !== cardId)
            .map((card, index) => ({ ...card, order: index })),
        }
      }

      if (column.id === toColId) {
        const sourceColumn = oldBoard.columns.find((item) => item.id === fromColId)
        const card = sourceColumn?.cards.find((item) => item.id === cardId)
        if (!card) return column

        const newCards = [...column.cards]
        newCards.splice(newOrder, 0, { ...card, columnId: toColId })

        return {
          ...column,
          cards: newCards.map((cardItem, index) => ({ ...cardItem, order: index })),
        }
      }

      return column
    })

    set({ activeBoard: { ...oldBoard, columns: newColumns } })

    try {
      const updates: Array<{ id: string; order: number; columnId: string }> = []

      newColumns.forEach((column) => {
        column.cards.forEach((card, index) => {
          updates.push({ id: card.id, order: index, columnId: column.id })
        })
      })

      await fetch('/api/cards/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
    } catch {
      set({ activeBoard: oldBoard })
    }
  },

  moveColumn: async (boardId, columnId, newOrder) => {
    const state = get()
    if (!state.activeBoard || !state.activeBoard.canEdit) return

    const oldBoard = state.activeBoard
    const activeIndex = oldBoard.columns.findIndex((column) => column.id === columnId)
    if (activeIndex === -1) return

    const newColumns = [...oldBoard.columns]
    const [movedColumn] = newColumns.splice(activeIndex, 1)
    newColumns.splice(newOrder, 0, movedColumn)

    const updatedColumns = newColumns.map((column, index) => ({ ...column, order: index }))
    set({ activeBoard: { ...oldBoard, columns: updatedColumns } })

    try {
      const updates = updatedColumns.map((column) => ({ id: column.id, order: column.order }))

      await fetch('/api/columns/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
    } catch {
      set({ activeBoard: oldBoard })
    }
  },
}))

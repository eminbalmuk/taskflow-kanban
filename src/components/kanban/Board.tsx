'use client'

import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { createPortal } from 'react-dom'
import { useKanbanStore } from '@/lib/kanban-store'
import Column from './Column'
import Card from './Card'
import styles from './Board.module.css'

export default function Board() {
  const { activeBoard, moveCard, moveColumn, addColumn } = useKanbanStore()
  const boardColumns = activeBoard?.columns ?? []
  const boardViewportRef = useRef<HTMLDivElement>(null)
  const canEdit = activeBoard?.canEdit ?? false

  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<'column' | 'card' | null>(null)
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    const viewport = boardViewportRef.current
    if (!viewport) return

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            void viewport.offsetWidth
          })
        : null

    resizeObserver?.observe(viewport)

    const content = viewport.firstElementChild
    if (content instanceof HTMLElement) {
      resizeObserver?.observe(content)
    }

    return () => {
      resizeObserver?.disconnect()
    }
  }, [activeBoard, isAddingColumn])

  const handleAddColumn = async () => {
    if (!newColumnTitle.trim() || !activeBoard) return

    await addColumn(activeBoard.id, newColumnTitle.trim())
    setNewColumnTitle('')
    setIsAddingColumn(false)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    setActiveType(active.data.current?.type ?? null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (!over) return
    if (active.id === over.id) return

    const isActiveCard = active.data.current?.type === 'card'
    const isOverCard = over.data.current?.type === 'card'
    const isOverColumn = over.data.current?.type === 'column'

    if (!isActiveCard) return
    if (!(isOverCard || isOverColumn)) return
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    setActiveId(null)
    setActiveType(null)

    if (!over || !activeBoard) return

    const draggedId = active.id as string
    const targetId = over.id as string

    if (draggedId === targetId) return

    const type = active.data.current?.type

    if (type === 'column') {
      let overColumnId = targetId

      if (over.data.current?.type === 'card') {
        overColumnId = over.data.current.columnId
      }

      const activeIndex = boardColumns.findIndex((column) => column.id === draggedId)
      const overIndex = boardColumns.findIndex((column) => column.id === overColumnId)

      if (activeIndex !== -1 && overIndex !== -1) {
        moveColumn(activeBoard.id, draggedId, overIndex)
      }

      return
    }

    if (type === 'card') {
      const activeColumnId = active.data.current?.columnId
      const overColumnId =
        over.data.current?.type === 'column'
          ? (over.id as string)
          : over.data.current?.columnId

      const overColumn = boardColumns.find((column) => column.id === overColumnId)
      if (!overColumn) return

      let overIndex = overColumn.cards.findIndex((card) => card.id === targetId)
      if (overIndex === -1) {
        overIndex = overColumn.cards.length
      }

      moveCard(draggedId, activeColumnId, overColumnId, overIndex)
    }
  }

  const activeCard =
    activeId && activeType === 'card'
      ? boardColumns.flatMap((column) => column.cards).find((card) => card.id === activeId)
      : null

  const activeColumn =
    activeId && activeType === 'column'
      ? boardColumns.find((column) => column.id === activeId)
      : null

  if (!activeBoard) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyCard}>
          <span className={styles.emptyEyebrow}>Board alani</span>
          <h2>Haydi ilk panonuzu olusturmaya baslayalim.</h2>
          <p>"Yeni Pano" butonuyla ekibini organize etmeye hemen baslayabilirsin.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.boardShell}>
      <div ref={boardViewportRef} className={styles.boardContainer}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className={styles.columnsList}>
            <SortableContext
              items={boardColumns.map((column) => column.id)}
              strategy={horizontalListSortingStrategy}
            >
              {boardColumns.map((column) => (
                <Column key={column.id} column={column} />
              ))}
            </SortableContext>

            {canEdit && isAddingColumn ? (
              <div className={styles.addColumnInputContainer}>
                <input
                  autoFocus
                  className={styles.addColumnInput}
                  placeholder="Sutun basligi..."
                  value={newColumnTitle}
                  onChange={(event) => setNewColumnTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleAddColumn()
                    if (event.key === 'Escape') {
                      setIsAddingColumn(false)
                      setNewColumnTitle('')
                    }
                  }}
                />
                <div className={styles.addColumnActions}>
                  <button className={styles.confirmAddColBtn} onClick={handleAddColumn}>
                    Sutun ekle
                  </button>
                  <button
                    className={styles.cancelAddBtn}
                    onClick={() => {
                      setIsAddingColumn(false)
                      setNewColumnTitle('')
                    }}
                  >
                    Iptal
                  </button>
                </div>
              </div>
            ) : canEdit ? (
              <button className={styles.addColumnBtn} onClick={() => setIsAddingColumn(true)}>
                + Sutun ekle
              </button>
            ) : null}
          </div>

          {typeof document !== 'undefined' &&
            createPortal(
              <DragOverlay
                dropAnimation={{
                  sideEffects: defaultDropAnimationSideEffects({
                    styles: {
                      active: {
                        opacity: '0.5',
                      },
                    },
                  }),
                }}
              >
                {activeColumn ? <Column column={activeColumn} isOverlay /> : null}
                {activeCard ? <Card card={activeCard} isOverlay /> : null}
              </DragOverlay>,
              document.body
            )}
        </DndContext>
      </div>
    </div>
  )
}

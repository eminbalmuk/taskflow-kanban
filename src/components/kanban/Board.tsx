'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Column as ColumnType, Card as CardType, useKanbanStore } from '@/lib/kanban-store'
import Column from './Column'
import Card from './Card'
import styles from './Board.module.css'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

export default function Board() {
  const { activeBoard, moveCard, moveColumn, addColumn } = useKanbanStore()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<'column' | 'card' | null>(null)
  
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')

  const handleAddColumn = async () => {
    if (!newColumnTitle.trim() || !activeBoard) return
    await addColumn(activeBoard.id, newColumnTitle)
    setNewColumnTitle('')
    setIsAddingColumn(false)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  if (!activeBoard) {
    return <div className={styles.empty}>Başlamak için bir pano seçin</div>
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)
    setActiveType(active.data.current?.type)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const isActiveACard = active.data.current?.type === 'card'
    const isOverACard = over.data.current?.type === 'card'
    const isOverAColumn = over.data.current?.type === 'column'

    if (!isActiveACard) return

    if (isActiveACard && (isOverACard || isOverAColumn)) {
      const activeColId = active.data.current?.columnId
      let overColId = isOverAColumn ? over.id as string : over.data.current?.columnId

      if (activeColId !== overColId) {
        // Preview logic can be added here if needed
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setActiveType(null)

    if (!over || !activeBoard) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const type = active.data.current?.type

    if (type === 'column') {
      let overColId = overId
      // Eğer bir kartın üzerine bırakıldıysa, o kartın sütununu bul
      if (over.data.current?.type === 'card') {
        overColId = over.data.current.columnId
      }

      const activeIndex = activeBoard.columns.findIndex((col) => col.id === activeId)
      const overIndex = activeBoard.columns.findIndex((col) => col.id === overColId)

      if (activeIndex !== -1 && overIndex !== -1) {
        moveColumn(activeBoard.id, activeId, overIndex)
      }
    } else if (type === 'card') {
      const activeColId = active.data.current?.columnId
      let overColId = over.data.current?.type === 'column' ? over.id as string : over.data.current?.columnId
      
      const overCol = activeBoard.columns.find(c => c.id === overColId)
      if (!overCol) return

      let overIndex = overCol.cards.findIndex(c => c.id === overId)
      if (overIndex === -1) overIndex = overCol.cards.length

      moveCard(activeId, activeColId, overColId, overIndex)
    }
  }

  return (
    <div className={styles.boardContainer}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.columnsList}>
          <SortableContext 
            items={activeBoard.columns?.map(c => c.id) || []} 
            strategy={horizontalListSortingStrategy}
          >
            <AnimatePresence>
              {activeBoard.columns?.map((col) => (
                <Column key={col.id} column={col} />
              ))}
            </AnimatePresence>
          </SortableContext>
          
          {isAddingColumn ? (
            <div className={styles.addColumnInputContainer}>
              <input
                autoFocus
                className={styles.addColumnInput}
                placeholder="Sütun başlığı..."
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn()
                  if (e.key === 'Escape') setIsAddingColumn(false)
                }}
              />
              <div className={styles.addColumnActions}>
                <button className={styles.confirmAddColBtn} onClick={handleAddColumn}>Sütun Ekle</button>
                <button className={styles.cancelAddBtn} onClick={() => setIsAddingColumn(false)}>İptal</button>
              </div>
            </div>
          ) : (
            <button className={styles.addColumnBtn} onClick={() => setIsAddingColumn(true)}>
              + Sütun Ekle
            </button>
          )}
        </div>

        {typeof document !== 'undefined' && createPortal(
          <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: '0.5',
                },
              },
            }),
          }}>
            {activeId && activeType === 'column' && activeBoard.columns ? (
              <Column column={activeBoard.columns.find(c => c.id === activeId)!} isOverlay />
            ) : null}
            {activeId && activeType === 'card' && activeBoard.columns ? (
              <Card card={activeBoard.columns.flatMap(c => c.cards).find(c => c.id === activeId)!} isOverlay />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  )
}

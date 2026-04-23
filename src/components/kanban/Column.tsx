'use client'

import { useState, useRef, useEffect } from 'react'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Column as ColumnType, Card as CardType, useKanbanStore } from '@/lib/kanban-store'
import Card from './Card'
import styles from './Board.module.css'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreHorizontal, Plus, Trash2, Palette, Check, Pencil } from 'lucide-react'

interface ColumnProps {
  column: ColumnType
  isOverlay?: boolean
}

const PASTEL_COLUMNS = [
  '#f3f0ff', // Mor
  '#e0f2fe', // Mavi
  '#dcfce7', // Yeşil
  '#fef9c3', // Sarı
  '#fce7f3', // Pembe
  '#f1f5f9', // Gri
]

export default function Column({ column, isOverlay }: ColumnProps) {
  const { addCard, deleteColumn, updateColumnColor, updateColumnTitle, searchQuery } = useKanbanStore()
  const [isAddingCard, setIsAddingCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(column.title)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea for column title
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [editedTitle, isEditing])

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return
    await addCard(column.id, newCardTitle)
    setNewCardTitle('')
    setIsAddingCard(false)
  }

  const handleUpdateTitle = async () => {
    if (!editedTitle.trim()) {
      setEditedTitle(column.title)
      setIsEditing(false)
      return
    }
    await updateColumnTitle(column.id, editedTitle)
    setIsEditing(false)
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    disabled: isEditing,
    data: {
      type: 'column',
      column,
    },
  })

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
    backgroundColor: column.color || '#f3f0ff',
  }

  const filteredCards = column.cards.filter(card => 
    card.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`${styles.column} ${styles.columnDragging}`}
      />
    )
  }

  return (
    <motion.div
      layout
      ref={setNodeRef}
      style={style}
      className={`${styles.column} ${isOverlay ? styles.columnOverlay : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div className={styles.columnHeader} {...attributes} {...listeners}>
        <div className={styles.columnTitleContainer}>
          {isEditing ? (
            <textarea
              ref={textareaRef}
              autoFocus
              className={styles.columnTitleInput}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleUpdateTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleUpdateTitle()
                }
                if (e.key === 'Escape') {
                  setEditedTitle(column.title)
                  setIsEditing(false)
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 className={styles.columnTitle}>{column.title}</h3>
          )}
        </div>

        <div className={styles.columnHeaderActions} onClick={(e) => e.stopPropagation()}>
          {!isEditing && (
            <button className={styles.iconBtn} onClick={() => setIsEditing(true)}>
              <Pencil size={14} />
            </button>
          )}

          <div className={styles.colorPickerContainer}>
            <button className={styles.iconBtn} onClick={() => setShowColorPicker(!showColorPicker)}>
              <Palette size={16} />
            </button>
            <AnimatePresence>
              {showColorPicker && (
                <motion.div 
                  className={styles.colorMenuColumn}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  {PASTEL_COLUMNS.map(color => (
                    <button
                      key={color}
                      className={styles.colorDot}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        updateColumnColor(column.id, color)
                        setShowColorPicker(false)
                      }}
                    >
                      {column.color === color && <Check size={10} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => deleteColumn(column.id)}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className={styles.cardsList}>
        <SortableContext items={filteredCards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {filteredCards.map((card) => (
            <Card key={card.id} card={card} />
          ))}
        </SortableContext>
        
        {isAddingCard && (
          <div className={styles.addCardInputContainer}>
            <textarea
              autoFocus
              className={styles.addCardTextarea}
              placeholder="Kart başlığı girin..."
              value={newCardTitle}
              onChange={(e) => {
                setNewCardTitle(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAddCard()
                }
                if (e.key === 'Escape') setIsAddingCard(false)
              }}
            />
            <div className={styles.addCardActions}>
              <button className={styles.confirmAddBtn} onClick={handleAddCard}>Kart Ekle</button>
              <button className={styles.cancelAddBtn} onClick={() => setIsAddingCard(false)}>İptal</button>
            </div>
          </div>
        )}
      </div>

      {!isAddingCard && (
        <button className={styles.addCardBtn} onClick={() => setIsAddingCard(true)}>
          <Plus size={16} /> Kart ekle
        </button>
      )}
    </motion.div>
  )
}

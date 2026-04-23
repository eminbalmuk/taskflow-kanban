'use client'

import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card as CardType, useKanbanStore } from '@/lib/kanban-store'
import styles from './Board.module.css'
import { motion, AnimatePresence } from 'framer-motion'
import { AlignLeft, Trash2, Palette, Check, Pencil } from 'lucide-react'

interface CardProps {
  card: CardType
  isOverlay?: boolean
}

const PASTEL_COLORS = [
  '#ffffff', // Beyaz
  '#fecaca', // Kırmızı
  '#fed7aa', // Turuncu
  '#fef9c3', // Sarı
  '#bbf7d0', // Yeşil
  '#bfdbfe', // Mavi
  '#ddd6fe', // Mor
  '#fbcfe8', // Pembe
]

export default function Card({ card, isOverlay }: CardProps) {
  const { deleteCard, updateCardColor, updateCardTitle } = useKanbanStore()
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(card.title)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [editedTitle, isEditing])

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    disabled: isEditing,
    data: {
      type: 'card',
      card,
      columnId: card.columnId,
    },
  })

  const handleUpdateTitle = async () => {
    if (!editedTitle.trim()) {
      setEditedTitle(card.title)
      setIsEditing(false)
      return
    }
    await updateCardTitle(card.id, editedTitle)
    setIsEditing(false)
  }

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
    backgroundColor: card.color || '#ffffff',
  }

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`${styles.card} ${styles.cardDragging}`}
      />
    )
  }

  return (
    <motion.div
      layout
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${styles.card} ${isOverlay ? styles.cardOverlay : ''}`}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleContainer}>
          {isEditing ? (
            <textarea
              ref={textareaRef}
              autoFocus
              className={styles.cardTitleInput}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleUpdateTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleUpdateTitle()
                }
                if (e.key === 'Escape') {
                  setEditedTitle(card.title)
                  setIsEditing(false)
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h4 className={styles.cardTitle}>{card.title}</h4>
          )}
        </div>
        
        <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
          {!isEditing && (
            <button className={styles.iconBtn} onClick={() => setIsEditing(true)}>
              <Pencil size={14} />
            </button>
          )}

          <div className={styles.colorPickerContainer}>
            <button 
              className={styles.iconBtn}
              onClick={() => setShowColorPicker(!showColorPicker)}
            >
              <Palette size={14} />
            </button>
            
            <AnimatePresence>
              {showColorPicker && (
                <motion.div 
                  className={styles.colorMenu}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  {PASTEL_COLORS.map((color) => (
                    <button
                      key={color}
                      className={styles.colorDot}
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        updateCardColor(card.id, color)
                        setShowColorPicker(false)
                      }}
                    >
                      {card.color === color && <Check size={10} color="#1c1c1c" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            className={`${styles.iconBtn} ${styles.deleteBtn}`}
            onClick={() => deleteCard(card.id)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      {card.description && !isEditing && (
        <div className={styles.cardDescription}>
          <AlignLeft size={12} />
        </div>
      )}
    </motion.div>
  )
}

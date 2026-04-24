'use client'

import { useEffect, useRef, useState } from 'react'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, Check, Palette, Pencil, Plus, Trash2, User, X } from 'lucide-react'
import { appendAssignee } from '@/lib/assignees'
import { Column as ColumnType, useKanbanStore } from '@/lib/kanban-store'
import Card from './Card'
import styles from './Board.module.css'

interface ColumnProps {
  column: ColumnType
  isOverlay?: boolean
}

const PASTEL_COLUMNS = ['#f3f0ff', '#e0f2fe', '#dcfce7', '#fef9c3', '#fce7f3', '#f1f5f9']

export default function Column({ column, isOverlay = false }: ColumnProps) {
  const { addCard, deleteColumn, updateColumnColor, updateColumnTitle, searchQuery, activeBoard } = useKanbanStore()
  const canEdit = activeBoard?.canEdit ?? false

  const [isAddingCard, setIsAddingCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [newCardAssignees, setNewCardAssignees] = useState<string[]>([])
  const [newCardAssigneeInput, setNewCardAssigneeInput] = useState('')
  const [newCardDueDate, setNewCardDueDate] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(column.title)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditedTitle(column.title)
  }, [column.title])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [editedTitle, isEditing])

  const commitNewCardAssignee = () => {
    if (!newCardAssigneeInput.trim()) return
    setNewCardAssignees((current) => appendAssignee(current, newCardAssigneeInput))
    setNewCardAssigneeInput('')
  }

  const resetNewCardForm = () => {
    setIsAddingCard(false)
    setNewCardTitle('')
    setNewCardAssignees([])
    setNewCardAssigneeInput('')
    setNewCardDueDate('')
  }

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return

    const nextAssignees = newCardAssigneeInput.trim()
      ? appendAssignee(newCardAssignees, newCardAssigneeInput)
      : newCardAssignees

    await addCard(column.id, newCardTitle.trim(), nextAssignees, newCardDueDate || null)
    setNewCardAssignees(nextAssignees)
    resetNewCardForm()
  }

  const handleUpdateTitle = async () => {
    const nextTitle = editedTitle.trim()

    if (!nextTitle) {
      setEditedTitle(column.title)
      setIsEditing(false)
      return
    }

    await updateColumnTitle(column.id, nextTitle)
    setIsEditing(false)
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    disabled: !canEdit || isEditing || isOverlay,
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

  const filteredCards = column.cards.filter((card) =>
    card.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isDragging && !isOverlay) {
    return <div ref={setNodeRef} style={style} className={`${styles.column} ${styles.columnDragging}`} />
  }

  return (
    <motion.div
      layout
      ref={setNodeRef}
      style={style}
      className={`${styles.column} ${isOverlay ? styles.columnOverlay : ''}`}
      initial={isOverlay ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
    >
      <div
        className={styles.columnHeader}
        {...(!isEditing && !isOverlay ? attributes : {})}
        {...(!isEditing && !isOverlay ? listeners : {})}
      >
        <div className={styles.columnTitleContainer}>
          {isEditing ? (
            <textarea
              ref={textareaRef}
              autoFocus
              className={styles.columnTitleInput}
              value={editedTitle}
              onChange={(event) => setEditedTitle(event.target.value)}
              onBlur={handleUpdateTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  handleUpdateTitle()
                }

                if (event.key === 'Escape') {
                  setEditedTitle(column.title)
                  setIsEditing(false)
                }
              }}
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <>
              <h3 className={styles.columnTitle}>{column.title}</h3>
              <span className={styles.columnCount}>{filteredCards.length} kart</span>
            </>
          )}
        </div>

        {!isOverlay && canEdit && (
          <div className={styles.columnHeaderActions} onClick={(event) => event.stopPropagation()}>
            {!isEditing && (
              <button className={styles.iconBtn} onClick={() => setIsEditing(true)}>
                <Pencil size={14} />
              </button>
            )}

            <div className={styles.colorPickerContainer}>
              <button className={styles.iconBtn} onClick={() => setShowColorPicker((value) => !value)}>
                <Palette size={16} />
              </button>

              <AnimatePresence>
                {showColorPicker && (
                  <motion.div
                    className={styles.colorMenuColumn}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                  >
                    {PASTEL_COLUMNS.map((color) => (
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
        )}
      </div>

      <div className={styles.cardsList}>
        <SortableContext items={filteredCards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
          {filteredCards.map((card) => (
            <Card key={card.id} card={card} />
          ))}
        </SortableContext>

        {canEdit && isAddingCard && (
          <div className={styles.addCardInputContainer}>
            <textarea
              autoFocus
              className={styles.addCardTextarea}
              placeholder="Kart basligi girin..."
              value={newCardTitle}
              onChange={(event) => {
                setNewCardTitle(event.target.value)
                event.target.style.height = 'auto'
                event.target.style.height = `${event.target.scrollHeight}px`
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  handleAddCard()
                }

                if (event.key === 'Escape') {
                  resetNewCardForm()
                }
              }}
            />

            <div className={styles.assigneeInputContainer}>
              <User size={14} />
              <div className={styles.assigneeField}>
                {newCardAssignees.map((assignee) => (
                  <span key={assignee} className={styles.assigneeToken}>
                    <span>{assignee}</span>
                    <button
                      type="button"
                      className={styles.assigneeTokenRemove}
                      onClick={() => setNewCardAssignees((current) => current.filter((item) => item !== assignee))}
                      aria-label={`${assignee} kisini kaldir`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}

                <input
                  className={styles.assigneeInput}
                  value={newCardAssigneeInput}
                  onChange={(event) => setNewCardAssigneeInput(event.target.value)}
                  onBlur={commitNewCardAssignee}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ',') {
                      event.preventDefault()
                      commitNewCardAssignee()
                    }

                    if (event.key === 'Backspace' && !newCardAssigneeInput && newCardAssignees.length > 0) {
                      event.preventDefault()
                      setNewCardAssignees((current) => current.slice(0, -1))
                    }
                  }}
                  placeholder={
                    newCardAssignees.length === 0 ? 'Sorumlu ekle ve Entera bas...' : 'Kisi ekle...'
                  }
                />
              </div>
            </div>

            <div className={styles.dateInputContainer}>
              <CalendarDays size={14} />
              <input
                type="date"
                className={styles.dateInput}
                value={newCardDueDate}
                onChange={(event) => setNewCardDueDate(event.target.value)}
              />
            </div>

            <div className={styles.addCardActions}>
              <button className={styles.confirmAddBtn} onClick={handleAddCard}>
                Kart ekle
              </button>
              <button className={styles.cancelAddBtn} onClick={resetNewCardForm}>
                Iptal
              </button>
            </div>
          </div>
        )}
      </div>

      {!isAddingCard && !isOverlay && canEdit && (
        <button className={styles.addCardBtn} onClick={() => setIsAddingCard(true)}>
          <Plus size={16} /> Kart ekle
        </button>
      )}
    </motion.div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, Check, Pencil, Palette, Trash2, User, X } from 'lucide-react'
import { appendAssignee } from '@/lib/assignees'
import { Card as CardType, useKanbanStore } from '@/lib/kanban-store'
import styles from './Board.module.css'

interface CardProps {
  card: CardType
  isOverlay?: boolean
}

const PASTEL_COLORS = ['#ffffff', '#fecaca', '#fed7aa', '#fef08a', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#fbcfe8']

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function toDateInputValue(value: string | null) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function formatDueDate(value: string | null) {
  if (!value) return ''

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

export default function Card({ card, isOverlay = false }: CardProps) {
  const {
    deleteCard,
    updateCardColor,
    updateCardTitle,
    updateCardAssignees,
    updateCardDueDate,
    selectedAssignees,
    activeBoard,
  } = useKanbanStore()
  const canEdit = activeBoard?.canEdit ?? false

  const [showColorPicker, setShowColorPicker] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(card.title)
  const [editedAssignees, setEditedAssignees] = useState(card.assignees)
  const [editedAssigneeInput, setEditedAssigneeInput] = useState('')
  const [editedDueDate, setEditedDueDate] = useState(toDateInputValue(card.dueDate))
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditedTitle(card.title)
    setEditedAssignees(card.assignees)
    setEditedAssigneeInput('')
    setEditedDueDate(toDateInputValue(card.dueDate))
  }, [card.assignees, card.dueDate, card.title])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [editedTitle, isEditing])

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: !canEdit || isEditing || isOverlay,
    data: { type: 'card', card, columnId: card.columnId },
  })

  const commitEditedAssignee = () => {
    if (!editedAssigneeInput.trim()) return
    setEditedAssignees((current) => appendAssignee(current, editedAssigneeInput))
    setEditedAssigneeInput('')
  }

  const handleUpdate = async () => {
    const nextTitle = editedTitle.trim()
    if (!nextTitle) {
      setEditedTitle(card.title)
      setEditedAssignees(card.assignees)
      setEditedAssigneeInput('')
      setEditedDueDate(toDateInputValue(card.dueDate))
      setIsEditing(false)
      return
    }

    const nextAssignees = editedAssigneeInput.trim()
      ? appendAssignee(editedAssignees, editedAssigneeInput)
      : editedAssignees

    const nextDueDate = editedDueDate || null

    await updateCardTitle(card.id, nextTitle)
    await updateCardAssignees(card.id, nextAssignees)
    await updateCardDueDate(card.id, nextDueDate)
    setEditedAssignees(nextAssignees)
    setEditedAssigneeInput('')
    setIsEditing(false)
  }

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
    backgroundColor: card.color || '#ffffff',
  }

  const isVisible =
    selectedAssignees.length === 0 ||
    card.assignees.length === 0 ||
    card.assignees.some((assignee) => selectedAssignees.includes(assignee))

  if (!isVisible && !isOverlay) {
    return null
  }

  if (isDragging && !isOverlay) {
    return <div ref={setNodeRef} style={style} className={`${styles.card} ${styles.cardDragging}`} />
  }

  return (
    <motion.div
      layout
      ref={setNodeRef}
      style={style}
      {...(!isEditing && !isOverlay ? attributes : {})}
      {...(!isEditing && !isOverlay ? listeners : {})}
      className={`${styles.card} ${isOverlay ? styles.cardOverlay : ''}`}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleContainer}>
          {isEditing ? (
            <div className={styles.editCardForm} onClick={(event) => event.stopPropagation()}>
              <textarea
                ref={textareaRef}
                autoFocus
                className={styles.cardTitleInput}
                value={editedTitle}
                onChange={(event) => setEditedTitle(event.target.value)}
                placeholder="Kart basligi..."
              />

              <div className={styles.assigneeInputContainer}>
                <User size={14} />
                <div className={styles.assigneeField}>
                  {editedAssignees.map((assignee) => (
                    <span key={assignee} className={styles.assigneeToken}>
                      <span>{assignee}</span>
                      <button
                        type="button"
                        className={styles.assigneeTokenRemove}
                        onClick={() =>
                          setEditedAssignees((current) => current.filter((item) => item !== assignee))
                        }
                        aria-label={`${assignee} kisini kaldir`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}

                  <input
                    className={styles.assigneeInput}
                    value={editedAssigneeInput}
                    onChange={(event) => setEditedAssigneeInput(event.target.value)}
                    onBlur={commitEditedAssignee}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ',') {
                        event.preventDefault()
                        commitEditedAssignee()
                      }

                      if (event.key === 'Backspace' && !editedAssigneeInput && editedAssignees.length > 0) {
                        event.preventDefault()
                        setEditedAssignees((current) => current.slice(0, -1))
                      }
                    }}
                    placeholder={editedAssignees.length === 0 ? 'Sorumlu ekle ve Entera bas...' : 'Kisi ekle...'}
                  />
                </div>
              </div>

              <div className={styles.dateInputContainer}>
                <CalendarDays size={14} />
                <input
                  type="date"
                  className={styles.dateInput}
                  value={editedDueDate}
                  onChange={(event) => setEditedDueDate(event.target.value)}
                />
              </div>

              <div className={styles.editActions}>
                <button className={styles.saveBtn} onClick={handleUpdate}>
                  Kaydet
                </button>
                <button
                  className={styles.cancelBtn}
                  onClick={() => {
                    setEditedTitle(card.title)
                    setEditedAssignees(card.assignees)
                    setEditedAssigneeInput('')
                    setEditedDueDate(toDateInputValue(card.dueDate))
                    setIsEditing(false)
                  }}
                >
                  Iptal
                </button>
              </div>
            </div>
          ) : (
            <h4 className={styles.cardTitle}>{card.title}</h4>
          )}
        </div>

        {!isEditing && !isOverlay && canEdit && (
          <div className={styles.cardActions} onClick={(event) => event.stopPropagation()}>
            <button className={styles.iconBtn} onClick={() => setIsEditing(true)}>
              <Pencil size={14} />
            </button>

            <div className={styles.colorPickerContainer}>
              <button className={styles.iconBtn} onClick={() => setShowColorPicker((value) => !value)}>
                <Palette size={14} />
              </button>

              <AnimatePresence>
                {showColorPicker && (
                  <motion.div
                    className={styles.colorMenu}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
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

            <button className={`${styles.iconBtn} ${styles.deleteBtn}`} onClick={() => deleteCard(card.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {!isEditing && (card.assignees.length > 0 || card.dueDate) && (
        <div className={styles.cardMetaRow}>
          {card.assignees.map((assignee) => (
            <div key={assignee} className={styles.assigneeBadge}>
              <span className={styles.assigneeAvatar}>{getInitials(assignee)}</span>
              <span className={styles.assigneeName}>{assignee}</span>
            </div>
          ))}

          {card.dueDate && (
            <div className={styles.dueDateBadge}>
              <CalendarDays size={12} />
              <span>{formatDueDate(card.dueDate)}</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

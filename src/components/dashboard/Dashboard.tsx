'use client'

import type { CSSProperties } from 'react'
import { useState, useEffect, useRef } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  Check,
  ChevronDown,
  Filter,
  LogOut,
  Pencil,
  Plus,
  Scale,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Board as BoardType, useKanbanStore } from '@/lib/kanban-store'
import Board from '@/components/kanban/Board'
import Loading from '@/components/kanban/Loading'
import styles from '@/app/page.module.css'

const ASSIGNEE_COLORS = ['#8e94f2', '#6ea8fe', '#61d6c2', '#b9a4e7', '#ff9d66', '#8cd3ff']

function getAssigneeColor(index: number) {
  return ASSIGNEE_COLORS[index % ASSIGNEE_COLORS.length]
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const value = normalized.length === 3
    ? normalized
        .split('')
        .map((part) => `${part}${part}`)
        .join('')
    : normalized

  const numeric = Number.parseInt(value, 16)
  const r = (numeric >> 16) & 255
  const g = (numeric >> 8) & 255
  const b = numeric & 255

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Dashboard() {
  const { data: session } = useSession()
  const {
    boards,
    setBoards,
    setActiveBoard,
    activeBoard,
    loading,
    searchQuery,
    setSearchQuery,
    selectedAssignees,
    setSelectedAssignees,
    updateBoardTitle,
    fetchBoard,
    createBoard,
    deleteBoard,
  } = useKanbanStore()

  const [isEditingBoard, setIsEditingBoard] = useState(false)
  const [boardTitle, setBoardTitle] = useState('')
  const [boardToDelete, setBoardToDelete] = useState<BoardType | null>(null)
  const [showFilter, setShowFilter] = useState(false)
  const boardTitleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const init = async () => {
      const response = await fetch('/api/setup')
      if (!response.ok) return

      const data = await response.json()
      setBoards(data.boards)
      setActiveBoard(data.activeBoard)
    }

    init()
  }, [setBoards, setActiveBoard])

  useEffect(() => {
    if (activeBoard) {
      setBoardTitle(activeBoard.title)
    }
  }, [activeBoard])

  const handleUpdateBoardTitle = async () => {
    if (!activeBoard) return

    const nextTitle = boardTitle.trim()
    if (!nextTitle) {
      setBoardTitle(activeBoard.title || 'Pano')
      setIsEditingBoard(false)
      return
    }

    await updateBoardTitle(activeBoard.id, nextTitle)
    setIsEditingBoard(false)
  }

  const handleCreateNewBoard = async () => {
    await createBoard('Yeni Pano')
  }

  const getUserInitials = () => {
    if (!session?.user?.name) return 'TF'
    return getInitials(session.user.name)
  }

  const cards = activeBoard?.columns.flatMap((column) => column.cards) || []
  const assignedCards = cards.filter((card) => card.assignees.length > 0)
  const allAssignees = Array.from(new Set(cards.flatMap((card) => card.assignees)))
  const totalCards = cards.length
  const isAllAssigneesSelected =
    allAssignees.length > 0 && selectedAssignees.length === allAssignees.length
  const totalAssignments = assignedCards.reduce((sum, card) => sum + card.assignees.length, 0)

  const workloadStats = allAssignees
    .map((name) => {
      const taskCount = assignedCards.filter((card) => card.assignees.includes(name)).length
      const percentage = totalAssignments === 0 ? 0 : Math.round((taskCount / totalAssignments) * 100)
      return { name, taskCount, percentage }
    })
    .sort((left, right) => right.taskCount - left.taskCount)

  const workloadValues = workloadStats.map((item) => item.taskCount)
  const minLoad = workloadValues.length > 0 ? Math.min(...workloadValues) : 0
  const maxLoad = workloadValues.length > 0 ? Math.max(...workloadValues) : 0
  const loadSpread = maxLoad - minLoad
  const isBalanced = loadSpread <= 1

  const toggleAssignee = (name: string) => {
    if (selectedAssignees.includes(name)) {
      setSelectedAssignees(selectedAssignees.filter((assignee) => assignee !== name))
      return
    }

    setSelectedAssignees([...selectedAssignees, name])
  }

  const resetFilters = () => {
    setSelectedAssignees(allAssignees)
    setShowFilter(false)
  }

  return (
    <div className={styles.container}>
      <AnimatePresence>
        {boardToDelete && (
          <div className={styles.modalOverlay}>
            <motion.div
              className={styles.confirmModal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h2>Panoyu sil</h2>
              <p>
                <strong>&quot;{boardToDelete.title}&quot;</strong> panosunu silmek istediğinize emin misiniz?
              </p>
              <div className={styles.modalActions}>
                <button className={styles.modalCancelBtn} onClick={() => setBoardToDelete(null)}>
                  İptal
                </button>
                <button
                  className={styles.modalDeleteBtn}
                  onClick={async () => {
                    await deleteBoard(boardToDelete.id)
                    setBoardToDelete(null)
                  }}
                >
                  Sil
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <aside className={styles.sidebar}>
        <div className={styles.logoWrap}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>TF</div>
            <span className={styles.logoText}>TaskFlow</span>
          </div>
          <p className={styles.sidebarIntro}>Panoları yönet, filtrele ve ekibin dengesini tek ekranda gör.</p>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navGroup}>
            <span className={styles.navLabel}>Panolarım</span>

            {boards.map((board) => (
              <div key={board.id} className={styles.boardItemContainer}>
                <button
                  className={`${styles.navItem} ${activeBoard?.id === board.id ? styles.active : ''}`}
                  onClick={() => fetchBoard(board.id)}
                  style={{ width: '100%', paddingRight: '40px' }}
                >
                  <div className={styles.boardDot} style={{ background: '#8e94f2' }} />
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      textAlign: 'left',
                    }}
                  >
                    {board.title}
                  </span>

                  {boards.length > 1 && (
                    <div
                      className={styles.deleteBoardIconBtn}
                      onClick={(event) => {
                        event.stopPropagation()
                        setBoardToDelete(board)
                      }}
                    >
                      <Trash2 size={14} />
                    </div>
                  )}
                </button>
              </div>
            ))}

            <button className={styles.newBoardBtn} onClick={handleCreateNewBoard}>
              <Plus size={18} />
              <span>Yeni Pano</span>
            </button>
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.sidebarMetaCard}>
            <span className={styles.sidebarMetaLabel}>Açık görev</span>
            <strong>{totalCards}</strong>
            <p>{allAssignees.length > 0 ? `${allAssignees.length} kişiye dağılmış durumda` : 'Henüz atama yapılmadı'}</p>
          </div>

          <button className={styles.logoutBtn} onClick={() => signOut()}>
            <LogOut size={20} />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            {isEditingBoard ? (
              <input
                ref={boardTitleRef}
                autoFocus
                className={styles.boardTitleInput}
                value={boardTitle}
                onChange={(event) => setBoardTitle(event.target.value)}
                onBlur={handleUpdateBoardTitle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleUpdateBoardTitle()
                  if (event.key === 'Escape') {
                    setBoardTitle(activeBoard?.title || 'Pano')
                    setIsEditingBoard(false)
                  }
                }}
              />
            ) : (
              <div className={styles.boardTitleContainer} onClick={() => setIsEditingBoard(true)}>
                <div>
                  <span className={styles.boardEyebrow}>Board görünümü</span>
                  <h1 className={styles.boardTitle}>{activeBoard?.title || 'Pano'}</h1>
                </div>
                <button className={styles.editBoardBtn}>
                  <Pencil size={18} />
                </button>
              </div>
            )}
          </div>

          <div className={styles.headerRight}>
            <div className={styles.searchBar}>
              <Search size={18} />
              <input
                type="text"
                placeholder="Görevlerde ara..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className={styles.filterPopoverWrap}>
              <button
                className={`${styles.iconBtn} ${showFilter ? styles.activeFilter : ''}`}
                onClick={() => setShowFilter(!showFilter)}
              >
                <Filter size={18} />
              </button>

              <AnimatePresence>
                {showFilter && (
                  <motion.div
                    className={styles.filterMenu}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  >
                    <div className={styles.filterHeader}>Sorumlu filtresi</div>

                    {allAssignees.length === 0 ? (
                      <div className={styles.emptyFilter}>Sorumlu atanmış görev yok</div>
                    ) : (
                      <div className={styles.filterList}>
                        {allAssignees.map((name) => (
                          <div key={name} className={styles.filterItem} onClick={() => toggleAssignee(name)}>
                            <div
                              className={`${styles.checkbox} ${
                                selectedAssignees.includes(name) ? styles.checked : ''
                              }`}
                            >
                              {selectedAssignees.includes(name) && <Check size={12} />}
                            </div>
                            <span>{name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button className={styles.iconBtn}>
              <Bell size={18} />
            </button>

            <div className={styles.profile}>
              <div className={styles.profileInfo}>
                <div className={styles.userTextInfo}>
                  <span className={styles.userName}>{session?.user?.name || 'Kullanıcı'}</span>
                  <span className={styles.userEmail}>{session?.user?.email || ''}</span>
                </div>
                <div className={styles.avatar}>{getUserInitials()}</div>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.workspace}>
          <section className={styles.toolbar}>
            <div className={styles.toolbarPrimary}>
              <button className={styles.scopeChip} onClick={resetFilters}>
                <span>Tüm Görevler</span>
                <span className={styles.scopeCount}>{totalCards}</span>
                <ChevronDown size={16} />
              </button>

              <span className={styles.toolbarLabel}>Kişi</span>

              <div className={styles.assigneeRail}>
                {allAssignees.length === 0 ? (
                  <div className={styles.emptyAssigneeState}>Henüz sorumlu eklenmedi</div>
                ) : (
                  allAssignees.map((name, index) => {
                    const isSelected = selectedAssignees.includes(name)
                    const accentColor = getAssigneeColor(index)

                    return (
                      <button
                        key={name}
                        className={`${styles.assigneeChip} ${isSelected ? styles.assigneeChipActive : ''}`}
                        onClick={() => toggleAssignee(name)}
                        style={
                          isSelected
                            ? ({
                                '--chip-accent': accentColor,
                                borderColor: hexToRgba(accentColor, 0.72),
                                boxShadow: `0 18px 28px -24px ${hexToRgba(accentColor, 0.48)}`,
                              } as CSSProperties)
                            : undefined
                        }
                      >
                        <span className={styles.assigneeChipAvatar} style={{ backgroundColor: accentColor }}>
                          {getInitials(name)}
                        </span>
                        <span className={styles.assigneeChipName}>{name}</span>
                      </button>
                    )
                  })
                )}

              </div>
            </div>

            <button
              className={`${styles.clearFiltersBtn} ${isAllAssigneesSelected ? styles.clearFiltersMuted : ''}`}
              onClick={resetFilters}
              disabled={allAssignees.length === 0}
            >
              Filtreyi Temizle
            </button>
          </section>

          <div className={styles.decorativeGuide}>
            <Sparkles size={14} />
            <div className={styles.decorativeGuideLine} />
          </div>

          <div className={styles.boardSurface}>{loading ? <Loading /> : <Board />}</div>

          <section className={styles.workloadPanel}>
            <div className={styles.workloadHeader}>
              <div className={styles.workloadIcon}>
                <Scale size={20} />
              </div>
              <div>
                <h2>İş Yükü Dengesi</h2>
                <p>Atanan görevlere göre ekip dağılımı</p>
              </div>
            </div>

            <div className={styles.workloadList}>
              {workloadStats.length === 0 ? (
                <div className={styles.emptyWorkload}>Sorumlu atanan kartlar geldikçe burada ekip dengesi görünecek.</div>
              ) : (
                workloadStats.map((item, index) => {
                  const accentColor = getAssigneeColor(index)

                  return (
                    <div key={item.name} className={styles.workloadStat}>
                      <div className={styles.workloadPerson}>
                        <span className={styles.workloadAvatar} style={{ backgroundColor: accentColor }}>
                          {getInitials(item.name)}
                        </span>
                        <span className={styles.workloadName}>{item.name}</span>
                      </div>
                      <div className={styles.workloadMeter}>
                        <div className={styles.workloadBar}>
                          <span
                            className={styles.workloadFill}
                            style={{ width: `${Math.max(item.percentage, 8)}%`, backgroundColor: accentColor }}
                          />
                        </div>
                        <span className={styles.workloadValue}>{item.percentage}%</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className={styles.workloadStatusCard}>
              <div className={`${styles.workloadStatusBadge} ${isBalanced ? styles.statusGood : styles.statusWarn}`}>
                {isBalanced ? '✓' : '!'}
              </div>
              <div>
                <strong>{isBalanced ? 'İş yükü dengeli' : 'Dengeyi gözden geçirin'}</strong>
                <p>{isBalanced ? 'Harika gidiyorsunuz!' : 'Bazı kişiler daha yoğun görünüyor.'}</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

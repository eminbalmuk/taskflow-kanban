'use client'

import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Check,
  ChevronDown,
  Eye,
  Filter,
  LogOut,
  Pencil,
  Plus,
  Scale,
  Search,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Board as BoardType, useKanbanStore } from '@/lib/kanban-store'
import Board from '@/components/kanban/Board'
import Loading from '@/components/kanban/Loading'
import styles from '@/app/page.module.css'

type ShareEntry = {
  userId: string
  name: string | null
  email: string
  permission: 'VIEW' | 'EDIT'
}

const ASSIGNEE_COLORS = ['#8e94f2', '#6ea8fe', '#61d6c2', '#b9a4e7', '#ff9d66', '#8cd3ff']

function getAssigneeColor(index: number) {
  return ASSIGNEE_COLORS[index % ASSIGNEE_COLORS.length]
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const value =
    normalized.length === 3
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
  const [showShareModal, setShowShareModal] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [shareEntries, setShareEntries] = useState<ShareEntry[]>([])
  const [shareEmail, setShareEmail] = useState('')
  const [sharePermission, setSharePermission] = useState<'VIEW' | 'EDIT'>('VIEW')
  const [shareMessage, setShareMessage] = useState('')
  const [shareError, setShareError] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const boardTitleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const response = await fetch('/api/setup')
        if (!response.ok) return

        const data = await response.json()
        setBoards(data.boards)
        setActiveBoard(data.activeBoard)
      } finally {
        setIsInitializing(false)
      }
    }

    void init()
  }, [setBoards, setActiveBoard])

  useEffect(() => {
    if (activeBoard) {
      setBoardTitle(activeBoard.title)
    }
  }, [activeBoard])

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

  const handleUpdateBoardTitle = async () => {
    if (!activeBoard || !activeBoard.canEdit) return

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

  const loadShares = async () => {
    if (!activeBoard?.isOwner) return

    setShareLoading(true)
    setShareError('')

    try {
      const response = await fetch(`/api/board-access?boardId=${activeBoard.id}`)
      const data = await response.json()

      if (!response.ok) {
        setShareError(data.error || 'Paylasim bilgileri alinamadi.')
        return
      }

      setShareEntries(data.shares || [])
    } finally {
      setShareLoading(false)
    }
  }

  const openShareModal = async () => {
    if (!activeBoard?.isOwner) return

    setShowShareModal(true)
    setShareMessage('')
    setShareError('')
    setShareEmail('')
    setSharePermission('VIEW')
    await loadShares()
  }

  const handleCreateShare = async () => {
    if (!activeBoard?.isOwner || !shareEmail.trim()) return

    setShareLoading(true)
    setShareMessage('')
    setShareError('')

    try {
      const response = await fetch(`/api/board-access?boardId=${activeBoard.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: shareEmail.trim(),
          permission: sharePermission,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setShareError(data.error || 'Kullanici eklenemedi.')
        return
      }

      setShareEntries((current) => {
        const next = current.filter((entry) => entry.userId !== data.share.userId)
        return [...next, data.share]
      })
      setShareEmail('')
      setSharePermission('VIEW')
      setShareMessage('Kullanici boarda eklendi.')
    } finally {
      setShareLoading(false)
    }
  }

  const handleUpdateSharePermission = async (userId: string, permission: 'VIEW' | 'EDIT') => {
    if (!activeBoard?.isOwner) return

    const response = await fetch(`/api/board-access?boardId=${activeBoard.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, permission }),
    })

    const data = await response.json()
    if (!response.ok) {
      setShareError(data.error || 'Izin guncellenemedi.')
      return
    }

    setShareEntries((current) =>
      current.map((entry) => (entry.userId === userId ? { ...entry, permission: data.share.permission } : entry))
    )
  }

  const handleRemoveShare = async (userId: string) => {
    if (!activeBoard?.isOwner) return

    const response = await fetch(`/api/board-access?boardId=${activeBoard.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    const data = await response.json()
    if (!response.ok) {
      setShareError(data.error || 'Paylasim kaldirilamadi.')
      return
    }

    setShareEntries((current) => current.filter((entry) => entry.userId !== userId))
  }

  const renderAccessLabel = (board: BoardType) => {
    if (board.isOwner) return 'Owner'
    return board.accessRole === 'edit' ? 'Editor' : 'Viewer'
  }

  const activeSharePermissionLabel = sharePermission === 'EDIT' ? 'Duzenleyebilir' : 'Goruntuleyebilir'

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
                <strong>&quot;{boardToDelete.title}&quot;</strong> panosunu silmek istediginize emin misiniz?
              </p>
              <div className={styles.modalActions}>
                <button className={styles.modalCancelBtn} onClick={() => setBoardToDelete(null)}>
                  Iptal
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

      <AnimatePresence>
        {showShareModal && activeBoard?.isOwner && (
          <div className={styles.modalOverlay}>
            <motion.div
              className={`${styles.confirmModal} ${styles.shareModal}`}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
            >
              <div className={styles.shareModalHeader}>
                <h2>E-posta ile davet et</h2>
                <p>Ekip arkadaslarina e-posta ile davet gonder ve board iznini buradan yonet.</p>
              </div>

              <div className={styles.shareForm}>
                <div className={styles.shareInviteRow}>
                  <input
                    className={styles.shareInput}
                    type="email"
                    placeholder="E-posta adresi ekle..."
                    value={shareEmail}
                    onChange={(event) => setShareEmail(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void handleCreateShare()
                      }
                    }}
                  />
                  <button
                    className={styles.sharePrimaryBtn}
                    onClick={() => void handleCreateShare()}
                    disabled={shareLoading || !shareEmail.trim()}
                  >
                    <Share2 size={16} />
                    <span>Davet et</span>
                  </button>
                </div>

                <div className={styles.shareSection}>
                  <div className={styles.shareSectionHeader}>
                    <span>Kimler erisebilir?</span>
                    <span className={styles.shareSectionValue}>{activeSharePermissionLabel}</span>
                  </div>

                  <div className={styles.sharePermissionGrid}>
                    <button
                      type="button"
                      className={`${styles.sharePermissionCard} ${
                        sharePermission === 'EDIT' ? styles.sharePermissionCardActive : ''
                      }`}
                      onClick={() => setSharePermission('EDIT')}
                    >
                      <div className={styles.sharePermissionIcon}>
                        <Pencil size={16} />
                      </div>
                      <div className={styles.sharePermissionCopy}>
                        <strong>Duzenleyebilir</strong>
                        <span>Panoyu goruntuleyebilir ve degisiklik yapabilir.</span>
                      </div>
                      <div className={styles.sharePermissionRadio}>
                        {sharePermission === 'EDIT' ? <Check size={12} /> : null}
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`${styles.sharePermissionCard} ${
                        sharePermission === 'VIEW' ? styles.sharePermissionCardActive : ''
                      }`}
                      onClick={() => setSharePermission('VIEW')}
                    >
                      <div className={styles.sharePermissionIcon}>
                        <Eye size={16} />
                      </div>
                      <div className={styles.sharePermissionCopy}>
                        <strong>Goruntuleyebilir</strong>
                        <span>Panoyu goruntuleyebilir, degisiklik yapamaz.</span>
                      </div>
                      <div className={styles.sharePermissionRadio}>
                        {sharePermission === 'VIEW' ? <Check size={12} /> : null}
                      </div>
                    </button>
                  </div>
                </div>

                {shareError ? <div className={styles.shareError}>{shareError}</div> : null}
                {shareMessage ? <div className={styles.shareSuccess}>{shareMessage}</div> : null}
              </div>

              <div className={styles.shareSection}>
                <div className={styles.shareSectionHeader}>
                  <span>Erisimi olan kisiler</span>
                </div>

                <div className={styles.shareList}>
                {shareEntries.length === 0 ? (
                  <div className={styles.emptyFilter}>Henuz paylasilan kullanici yok.</div>
                ) : (
                  shareEntries.map((entry) => (
                    <div key={entry.userId} className={styles.shareRow}>
                      <div className={styles.sharePerson}>
                        <div className={styles.shareAvatar}>
                          {getInitials((entry.name || entry.email.split('@')[0]).replace(/[._-]+/g, ' '))}
                        </div>
                        <div className={styles.shareMeta}>
                          <strong>{entry.name || entry.email.split('@')[0]}</strong>
                          <span>{entry.email}</span>
                        </div>
                      </div>

                      <div className={styles.shareActions}>
                        <select
                          className={styles.shareSelect}
                          value={entry.permission}
                          onChange={(event) =>
                            void handleUpdateSharePermission(
                              entry.userId,
                              event.target.value as 'VIEW' | 'EDIT'
                            )
                          }
                        >
                          <option value="EDIT">Duzenleyebilir</option>
                          <option value="VIEW">Goruntuleyebilir</option>
                        </select>

                        <button className={styles.shareDangerBtn} onClick={() => void handleRemoveShare(entry.userId)}>
                          Kaldir
                        </button>
                      </div>
                    </div>
                  ))
                )}
                </div>
              </div>

              <div className={styles.modalActions}>
                <button className={styles.modalCancelBtn} onClick={() => setShowShareModal(false)}>
                  Kapat
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
          <p className={styles.sidebarIntro}>Panolari yonet, filtrele ve ekip dengesini tek ekranda gor.</p>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navGroup}>
            <span className={styles.navLabel}>Panolarim</span>

            {boards.map((board) => (
              <div key={board.id} className={styles.boardItemContainer}>
                <button
                  className={`${styles.navItem} ${activeBoard?.id === board.id ? styles.active : ''}`}
                  onClick={() => fetchBoard(board.id)}
                  style={{ width: '100%', paddingRight: board.isOwner ? '40px' : '16px' }}
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
                  <span className={styles.accessBadge}>{renderAccessLabel(board)}</span>

                  {board.isOwner && (
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
            <span className={styles.sidebarMetaLabel}>Acik gorev</span>
            <strong>{totalCards}</strong>
            <p>
              {allAssignees.length > 0 ? `${allAssignees.length} kisiye dagitilmis durumda` : 'Henuz atama yapilmadi'}
            </p>
          </div>

          <button className={styles.logoutBtn} onClick={() => signOut()}>
            <LogOut size={20} />
            <span>Cikis Yap</span>
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            {isEditingBoard && activeBoard?.canEdit ? (
              <input
                ref={boardTitleRef}
                autoFocus
                className={styles.boardTitleInput}
                value={boardTitle}
                onChange={(event) => setBoardTitle(event.target.value)}
                onBlur={handleUpdateBoardTitle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleUpdateBoardTitle()
                  if (event.key === 'Escape') {
                    setBoardTitle(activeBoard?.title || 'Pano')
                    setIsEditingBoard(false)
                  }
                }}
              />
            ) : (
              <div
                className={styles.boardTitleContainer}
                onClick={() => {
                  if (activeBoard?.canEdit) {
                    setIsEditingBoard(true)
                  }
                }}
              >
                <div>
                  <span className={styles.boardEyebrow}>Board gorunumu</span>
                  <h1 className={styles.boardTitle}>{activeBoard?.title || 'Pano'}</h1>
                </div>
                <div className={styles.boardAccessRow}>
                  <span
                    className={`${styles.boardAccessChip} ${
                      activeBoard?.accessRole === 'view' ? styles.boardAccessView : styles.boardAccessEdit
                    }`}
                  >
                    {activeBoard?.accessRole === 'view' ? (
                      <>
                        <Eye size={14} />
                        <span>Salt okunur</span>
                      </>
                    ) : (
                      <>
                        <Pencil size={14} />
                        <span>{activeBoard?.isOwner ? 'Owner' : 'Editor'}</span>
                      </>
                    )}
                  </span>
                  {activeBoard?.canEdit ? (
                    <button className={styles.editBoardBtn}>
                      <Pencil size={18} />
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div className={styles.headerRight}>
            {activeBoard?.isOwner ? (
              <button className={styles.shareLaunchBtn} onClick={() => void openShareModal()}>
                <Share2 size={18} />
                <span>Kanban&apos;i Paylas</span>
              </button>
            ) : null}

            <div className={styles.searchBar}>
              <Search size={18} />
              <input
                type="text"
                placeholder="Gorevlerde ara..."
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
                      <div className={styles.emptyFilter}>Sorumlu atanmis gorev yok</div>
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
                  <span className={styles.userName}>{session?.user?.name || 'Kullanici'}</span>
                  <span className={styles.userEmail}>{session?.user?.email || ''}</span>
                </div>
                <div className={styles.avatar}>{getUserInitials()}</div>
              </div>
            </div>
          </div>
        </header>

        <section className={styles.mobileBoardRail}>
          <div className={styles.mobileBoardRailHeader}>
            <div>
              <span className={styles.mobileBoardEyebrow}>Panolarim</span>
            </div>

            <button className={styles.mobileNewBoardBtn} onClick={handleCreateNewBoard}>
              <Plus size={16} />
              <span>Yeni Pano</span>
            </button>
          </div>

          <div className={styles.mobileBoardList}>
            {boards.map((board) => (
              <button
                key={board.id}
                className={`${styles.mobileBoardChip} ${activeBoard?.id === board.id ? styles.mobileBoardChipActive : ''}`}
                onClick={() => fetchBoard(board.id)}
              >
                <span className={styles.mobileBoardChipDot} />
                <span className={styles.mobileBoardChipTitle}>{board.title}</span>
                <span className={styles.mobileBoardChipMeta}>{renderAccessLabel(board)}</span>
              </button>
            ))}
          </div>
        </section>

        <div className={styles.workspace}>
          <section className={styles.toolbar}>
            <div className={styles.toolbarPrimary}>
              <button className={styles.scopeChip} onClick={resetFilters}>
                <span>Tum Gorevler</span>
                <span className={styles.scopeCount}>{totalCards}</span>
                <ChevronDown size={16} />
              </button>

              <span className={styles.toolbarLabel}>Kisi</span>

              <div className={styles.assigneeRail}>
                {allAssignees.length === 0 ? (
                  <div className={styles.emptyAssigneeState}>Henuz sorumlu eklenmedi</div>
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

          <div className={styles.boardSurface}>{loading || isInitializing ? <Loading /> : <Board />}</div>

          <section className={styles.workloadPanel}>
            <div className={styles.workloadHeader}>
              <div className={styles.workloadIcon}>
                <Scale size={20} />
              </div>
              <div>
                <h2>Is Yuku Dengesi</h2>
                <p>Atanan gorevlere gore ekip dagilimi</p>
              </div>
            </div>

            <div className={styles.workloadList}>
              {workloadStats.length === 0 ? (
                <div className={styles.emptyWorkload}>Sorumlu atanan kartlar geldikce burada ekip dengesi gorunecek.</div>
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
                <strong>{isBalanced ? 'Is yuku dengeli' : 'Dengeyi gozden gecirin'}</strong>
                <p>{isBalanced ? 'Harika gidiyorsunuz!' : 'Bazi kisiler daha yogun gorunuyor.'}</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

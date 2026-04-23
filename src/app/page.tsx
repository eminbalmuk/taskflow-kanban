'use client'

import { useEffect } from 'react'
import { useKanbanStore } from '@/lib/kanban-store'
import Board from '@/components/kanban/Board'
import Loading from '@/components/kanban/Loading'
import styles from './page.module.css'
import { LayoutGrid, CheckSquare, Settings, LogOut, Search, Bell } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'

export default function Home() {
  const { setActiveBoard, activeBoard, loading, searchQuery, setSearchQuery } = useKanbanStore()

  useEffect(() => {
    const init = async () => {
      const res = await fetch('/api/setup')
      if (res.ok) {
        const data = await res.json()
        setActiveBoard(data)
      }
    }
    init()
  }, [setActiveBoard])

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>TF</div>
          <span className={styles.logoText}>TaskFlow</span>
        </div>
        
        <nav className={styles.nav}>
          <div className={styles.navGroup}>
            <span className={styles.navLabel}>MENÜ</span>
            <button className={`${styles.navItem} ${styles.active}`}>
              <LayoutGrid size={20} />
              <span>Panolar</span>
            </button>
            <button className={styles.navItem}>
              <CheckSquare size={20} />
              <span>Görevler</span>
            </button>
            <button className={styles.navItem}>
              <Settings size={20} />
              <span>Ayarlar</span>
            </button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navLabel}>PANOLARIM</span>
            <button className={styles.navItem}>
              <div className={styles.boardDot} style={{ background: '#8e94f2' }} />
              <span>Genel Proje</span>
            </button>
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.navItem} onClick={() => signOut()}>
            <LogOut size={20} />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.boardTitle}>{activeBoard?.title || 'Pano'}</h1>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.searchBar}>
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Görevlerde ara..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className={styles.iconBtn}><Bell size={20} /></button>
            <div className={styles.profile}>
              <div className={styles.avatar}>MU</div>
            </div>
          </div>
        </header>

        {loading ? <Loading /> : <Board />}
      </main>
    </div>
  )
}

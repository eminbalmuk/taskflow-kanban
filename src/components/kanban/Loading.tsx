'use client'

import styles from './Board.module.css'

export default function Loading() {
  return (
    <div className={styles.boardContainer}>
      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.columnSkeleton}>
          <div className={styles.headerSkeleton} />
          <div className={styles.cardSkeleton} />
          <div className={styles.cardSkeleton} />
        </div>
      ))}
    </div>
  )
}

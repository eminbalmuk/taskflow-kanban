'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import styles from './landing.module.css'

type FeatureSectionProps = {
  title: string
  description: string
  accentClass: string
  imageSrc: string
  direction?: 'left' | 'right'
}

function FeatureSection({
  title,
  description,
  accentClass,
  imageSrc,
  direction = 'left',
}: FeatureSectionProps) {
  return (
    <motion.article
      className={`${styles.featureRow} ${direction === 'right' ? styles.featureRowReverse : ''}`}
      initial={{ opacity: 0, x: direction === 'left' ? -60 : 60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      <div className={styles.featureText}>
        <span className={styles.featureEyebrow}>TaskFlow deneyimi</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className={styles.featureVisual}>
        <div className={`${styles.featureGlow} ${accentClass}`} />
        <div className={styles.featureShot}>
          <Image
            src={imageSrc}
            alt={title}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className={styles.featureImage}
          />
        </div>
      </div>
    </motion.article>
  )
}

export default function LandingPage() {
  return (
    <div className={styles.landing}>
      <section className={styles.hero}>
        <Image
          src="/img/landingpage.png"
          alt="TaskFlow uygulama ekran görüntüsü"
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay} />

        <div className={styles.heroContent}>
          <motion.span
            className={styles.heroEyebrow}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Modern iş akışı, daha net iletişim, daha fazla odak.
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: -28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            İş akışını netleştir,
            <br />
            ekibi aynı ritimde tut.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
          >
            TaskFlow ile görevleri sürükle-bırak düzenle, sorumluları takip et ve
            projeyi tek ekranda okunur halde tut.
          </motion.p>

          <motion.div
            className={styles.ctaButtons}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <Link href="/register" className={styles.primaryBtn}>
              Hemen Kayıt Ol
            </Link>
            <Link href="/login" className={styles.secondaryBtn}>
              Giriş Yap
            </Link>
          </motion.div>
        </div>
      </section>

      <section className={styles.features}>
        <FeatureSection
          title="Sürükle, bırak, iş akışını kaybetme"
          description="Sütunlar arasında doğal akan bir board yapısı ile görevleri taşı, öncelikleri bir bakışta gör ve karmaşayı azalt."
          accentClass={styles.accentLilac}
          imageSrc="/img/landing1.png"
        />
        <FeatureSection
          title="Sorumlular görünür, iş yükü dengeli kalır"
          description="Kart üstünde kimin neyi üstlendiği temiz biçimde görünür. Filtre ile tek kişiye ya da küçük bir ekibe anında odaklan."
          accentClass={styles.accentBlue}
          imageSrc="/img/landing2.png"
          direction="right"
        />
        <FeatureSection
          title="Büyüyen panolarda bile akış bozulmaz"
          description="Yeni sütunlar geldikçe yatay akış korunur. Dashboard içinde board genişlese de rahatça yana kayıp tüm yapıyı görürsün."
          accentClass={styles.accentMint}
          imageSrc="/img/landing3.png"
        />
      </section>

      <motion.section
        className={styles.finalCta}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
      >
        <h2>Projeyi toparlamak için yeni bir araç değil, net bir akış gerekir.</h2>
        <p>TaskFlow hesabını oluştur ve ilk panonu birkaç saniye içinde aç.</p>
        <Link href="/register" className={styles.primaryBtn}>
          Hesabını Oluştur
        </Link>
      </motion.section>
    </div>
  )
}

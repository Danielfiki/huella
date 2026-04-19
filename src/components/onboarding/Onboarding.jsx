import React, { useState, useRef, useEffect } from 'react'
import styles from './Onboarding.module.css'

const SLIDES = [
  {
    gradient: 'linear-gradient(155deg, #12082a 0%, #3b1a4a 45%, #7c3220 100%)',
    particleColor: 'rgba(255,255,255,0.06)',
    badge: 'Te entendemos',
    emoji: '🌙',
    title: 'Son las 11pm\ny no sabes qué hacer',
    body: 'Tu hijo llora, explota, o simplemente se desconecta. Estás agotado/a, te sientes solo/a, y nadie te enseñó cómo manejar esto.',
    sub: 'No es tu culpa.\nPero sí puedes cambiar esto.',
    textColor: '#fff',
    badgeColor: 'rgba(255,255,255,0.15)',
  },
  {
    gradient: 'linear-gradient(155deg, #c96f45 0%, #e8936a 55%, #f5d0b8 100%)',
    particleColor: 'rgba(255,255,255,0.08)',
    badge: 'Ciencia real · Lenguaje humano',
    emoji: '🧠',
    title: 'No estás adivinando.\nEstás aprendiendo.',
    body: 'Huella integra el trabajo de Daniel Siegel, Bessel van der Kolk, Gordon Neufeld y 24 referentes más para darte orientación concreta, sin tecnicismos ni juicios.',
    sub: 'Cada respuesta está hecha para\ntu hijo y tu familia, no para nadie más.',
    textColor: '#fff',
    badgeColor: 'rgba(255,255,255,0.20)',
  },
  {
    gradient: 'linear-gradient(155deg, #0d6b52 0%, #1fa876 55%, #a8dfc4 100%)',
    particleColor: 'rgba(255,255,255,0.08)',
    badge: 'Tres pasos. Eso es todo.',
    emoji: '✨',
    title: 'Así de simple',
    steps: [
      { emoji: '📝', label: 'Registras', desc: 'qué pasó, cuándo, cómo te sentiste' },
      { emoji: '🤖', label: 'Huella analiza', desc: 'el contexto, los patrones, la raíz' },
      { emoji: '🌱', label: 'Recibes', desc: 'orientación concreta para hoy mismo' },
    ],
    textColor: '#fff',
    badgeColor: 'rgba(255,255,255,0.18)',
  },
  {
    gradient: 'linear-gradient(155deg, #7c3220 0%, #c96f45 45%, #e8936a 100%)',
    particleColor: 'rgba(255,255,255,0.08)',
    badge: 'Bienvenido/a a Huella',
    emoji: '💛',
    title: 'Tu hijo tiene\nsuerte de tenerte aquí',
    body: 'El solo hecho de que estés buscando entender mejor a tu hijo/a ya dice todo de ti como padre o madre.',
    sub: 'Empieza registrando tu primer episodio.\nEl primer paso es el más importante.',
    textColor: '#fff',
    badgeColor: 'rgba(255,255,255,0.18)',
    isLast: true,
  },
]

const getKey = (userId) => `huella_onboarding_v1_${userId || 'anon'}`

export default function Onboarding({ onDone, userId }) {
  const [current, setCurrent] = useState(0)
  const [dir, setDir] = useState(1)
  const [animating, setAnimating] = useState(false)
  const startX = useRef(null)
  const sliderRef = useRef(null)
  const total = SLIDES.length

  function goTo(index, direction) {
    if (animating || index === current) return
    setDir(direction)
    setAnimating(true)
    setTimeout(() => {
      setCurrent(index)
      setAnimating(false)
    }, 380)
  }

  function next() {
    if (current < total - 1) goTo(current + 1, 1)
    else finish()
  }

  function prev() {
    if (current > 0) goTo(current - 1, -1)
  }

  function finish() {
    localStorage.setItem(getKey(userId), '1')
    onDone()
  }

  function onPointerDown(e) {
    startX.current = e.clientX ?? e.touches?.[0]?.clientX
  }

  function onPointerUp(e) {
    if (startX.current == null) return
    const endX = e.clientX ?? e.changedTouches?.[0]?.clientX
    const delta = endX - startX.current
    startX.current = null
    if (delta < -50) next()
    else if (delta > 50) prev()
  }

  const slide = SLIDES[current]

  return (
    <div
      className={styles.overlay}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onTouchStart={(e) => { startX.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        const delta = e.changedTouches[0].clientX - startX.current
        startX.current = null
        if (delta < -50) next()
        else if (delta > 50) prev()
      }}
    >
      {/* Background with gradient transition */}
      <div
        className={styles.bg}
        style={{ background: slide.gradient }}
        key={`bg-${current}`}
      />

      {/* Floating particles */}
      <div className={styles.particles}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`${styles.particle} ${styles[`p${i}`]}`} style={{ background: slide.particleColor }} />
        ))}
      </div>

      {/* Skip button */}
      {current < total - 1 && (
        <button className={styles.skipBtn} onClick={finish}>
          Saltar
        </button>
      )}

      {/* Progress dots */}
      <div className={styles.dots}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === current ? styles.dotActive : ''} ${i < current ? styles.dotDone : ''}`}
            onClick={() => goTo(i, i > current ? 1 : -1)}
            aria-label={`Ir a pantalla ${i + 1}`}
          />
        ))}
      </div>

      {/* Slide content */}
      <div
        ref={sliderRef}
        className={`${styles.slideWrap} ${animating ? (dir > 0 ? styles.exitLeft : styles.exitRight) : ''}`}
        key={current}
      >
        {/* Badge */}
        <div
          className={styles.badge}
          style={{ background: slide.badgeColor, color: slide.textColor }}
        >
          {slide.badge}
        </div>

        {/* Emoji */}
        <div className={styles.emojiWrap}>
          <span className={styles.emoji}>{slide.emoji}</span>
          <div className={styles.emojiGlow} />
        </div>

        {/* Title */}
        <h1
          className={styles.title}
          style={{ color: slide.textColor }}
        >
          {slide.title}
        </h1>

        {/* Steps (slide 3) */}
        {slide.steps ? (
          <div className={styles.steps}>
            {slide.steps.map((step, i) => (
              <div key={i} className={styles.step} style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
                <span className={styles.stepEmoji}>{step.emoji}</span>
                <div className={styles.stepText}>
                  <span className={styles.stepLabel}>{step.label}</span>
                  <span className={styles.stepDesc}>{step.desc}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <p className={styles.body} style={{ color: 'rgba(255,255,255,0.88)' }}>
              {slide.body}
            </p>
            <p className={styles.sub} style={{ color: 'rgba(255,255,255,0.65)' }}>
              {slide.sub}
            </p>
          </>
        )}
      </div>

      {/* CTA */}
      <div className={styles.cta}>
        {slide.isLast ? (
          <button className={styles.btnPrimary} onClick={finish}>
            Empezar ahora →
          </button>
        ) : (
          <button className={styles.btnNext} onClick={next}>
            Continuar
          </button>
        )}
      </div>
    </div>
  )
}

export function shouldShowOnboarding(userId) {
  return !localStorage.getItem(getKey(userId))
}

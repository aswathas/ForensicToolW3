import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import React from 'react'

interface WordsPullUpProps {
  text: string
  className?: string
  style?: React.CSSProperties
  delayOffset?: number
}

export const WordsPullUp: React.FC<WordsPullUpProps> = ({
  text, className = '', style, delayOffset = 0,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const words = text.split(' ')

  return (
    <div ref={ref} className={`inline-flex flex-wrap overflow-hidden ${className}`} style={style}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ y: '110%', opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.75, delay: delayOffset + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block"
          style={{ marginRight: i === words.length - 1 ? 0 : '0.2em' }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  )
}

interface Segment { text: string; className?: string }

interface WordsPullUpMultiStyleProps {
  segments: Segment[]
  className?: string
  style?: React.CSSProperties
}

export const WordsPullUpMultiStyle: React.FC<WordsPullUpMultiStyleProps> = ({
  segments, className = '', style,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  const words: { word: string; className?: string }[] = []
  segments.forEach((seg) => {
    seg.text.split(' ').forEach((w) => {
      if (w) words.push({ word: w, className: seg.className })
    })
  })

  return (
    <div ref={ref} className={`inline-flex flex-wrap overflow-hidden ${className}`} style={style}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ y: '110%', opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.75, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          className={`inline-block ${w.className ?? ''}`}
          style={{ marginRight: '0.2em' }}
        >
          {w.word}
        </motion.span>
      ))}
    </div>
  )
}

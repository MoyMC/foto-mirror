import { useCallback, useEffect, useRef, useState } from 'react'
import {
  slideshowDisplayMode,
  slideshowIsConfigured,
  type SlideshowConfig,
  type SlideshowImage,
} from '../lib/slideshow'

const SLIDE_MS = 4500

interface UseIdleSlideshowOptions {
  active: boolean
  config: SlideshowConfig
  images: SlideshowImage[]
  hasMemoryImages: boolean
  onDismiss: () => void
}

export function useIdleSlideshow({
  active,
  config,
  images,
  hasMemoryImages,
  onDismiss,
}: UseIdleSlideshowOptions) {
  const [slideshowVisible, setSlideshowVisible] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [fade, setFade] = useState(true)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const slideTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const displayMode = slideshowDisplayMode(config, hasMemoryImages)
  const canRun = active && slideshowIsConfigured(config) && images.length > 0 && displayMode

  const clearTimers = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current)
      idleTimer.current = null
    }
    if (slideTimer.current) {
      clearInterval(slideTimer.current)
      slideTimer.current = null
    }
  }, [])

  const dismiss = useCallback(() => {
    clearTimers()
    setSlideshowVisible(false)
    setSlideIndex(0)
    onDismiss()
  }, [clearTimers, onDismiss])

  const bumpActivity = useCallback(() => {
    clearTimers()
    setSlideshowVisible(false)
    setSlideIndex(0)

    if (!canRun) return

    idleTimer.current = setTimeout(() => {
      setSlideshowVisible(true)
      setFade(true)
    }, config.idleSeconds * 1000)
  }, [canRun, clearTimers, config.idleSeconds])

  useEffect(() => {
    if (!canRun) {
      clearTimers()
      setSlideshowVisible(false)
      return
    }
    bumpActivity()
    return clearTimers
  }, [bumpActivity, canRun, clearTimers, images.length])

  useEffect(() => {
    if (!slideshowVisible || images.length <= 1) return

    slideTimer.current = setInterval(() => {
      setFade(false)
      window.setTimeout(() => {
        setSlideIndex((i) => (i + 1) % images.length)
        setFade(true)
      }, 280)
    }, SLIDE_MS)

    return () => {
      if (slideTimer.current) clearInterval(slideTimer.current)
    }
  }, [slideshowVisible, images.length])

  const current = images.length > 0 ? images[slideIndex % images.length] : null

  return {
    slideshowVisible: Boolean(slideshowVisible && canRun),
    displayMode: displayMode ?? 'overlay',
    current,
    fade,
    bumpActivity,
    dismiss,
  }
}

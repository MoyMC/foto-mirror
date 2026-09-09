import { useCallback, useEffect, useRef, useState } from 'react'
import {
  slideshowDisplayMode,
  slideshowIsConfigured,
  type SlideshowConfig,
  type SlideshowImage,
} from '../lib/slideshow'

const IMAGE_SLIDE_MS = 4500

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
  const imageTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const displayMode = slideshowDisplayMode(config, hasMemoryImages)
  const canRun = active && slideshowIsConfigured(config) && images.length > 0 && displayMode

  const clearTimers = useCallback(() => {
    if (idleTimer.current) {
      clearTimeout(idleTimer.current)
      idleTimer.current = null
    }
    if (imageTimer.current) {
      clearTimeout(imageTimer.current)
      imageTimer.current = null
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

  const advanceSlide = useCallback(() => {
    if (images.length <= 1) return
    setFade(false)
    window.setTimeout(() => {
      setSlideIndex((i) => (i + 1) % images.length)
      setFade(true)
    }, 280)
  }, [images.length])

  useEffect(() => {
    if (!canRun) {
      clearTimers()
      setSlideshowVisible(false)
      return
    }
    bumpActivity()
    return clearTimers
  }, [bumpActivity, canRun, clearTimers, images.length])

  const current = images.length > 0 ? images[slideIndex % images.length] : null

  // Photos advance on a timer; videos advance via onEnded from IdleSlideshow.
  useEffect(() => {
    if (!slideshowVisible || !current || current.kind === 'video') {
      if (imageTimer.current) {
        clearTimeout(imageTimer.current)
        imageTimer.current = null
      }
      return
    }

    imageTimer.current = setTimeout(() => {
      advanceSlide()
    }, IMAGE_SLIDE_MS)

    return () => {
      if (imageTimer.current) {
        clearTimeout(imageTimer.current)
        imageTimer.current = null
      }
    }
  }, [slideshowVisible, current, advanceSlide, slideIndex])

  return {
    slideshowVisible: Boolean(slideshowVisible && canRun),
    displayMode: displayMode ?? 'overlay',
    current,
    fade,
    audioEnabled: config.audioEnabled,
    bumpActivity,
    dismiss,
    advanceSlide,
  }
}

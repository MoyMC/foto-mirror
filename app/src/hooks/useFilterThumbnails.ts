import { useEffect, useState } from 'react'
import { captureFilteredFrame } from '../lib/filters'
import type { PreviewRotation } from '../lib/orientation'
import type { FilterPreset } from '../types'

const THUMB_SIZE = 96

export function useFilterThumbnails(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  filters: FilterPreset[],
  isReady: boolean,
  rotation: PreviewRotation = 0,
): Record<string, string> {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isReady || filters.length === 0) {
      setThumbs({})
      return
    }

    const video = videoRef.current
    if (!video || video.readyState < 2) return

    const next: Record<string, string> = {}
    for (const filter of filters) {
      const dataUrl = captureFilteredFrame(
        video,
        THUMB_SIZE,
        THUMB_SIZE,
        filter,
        0.75,
        rotation,
      )
      if (dataUrl) next[filter.id] = dataUrl
    }
    setThumbs(next)
  }, [videoRef, filters, isReady, rotation])

  return thumbs
}

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  shuffleSlideshow,
  slideshowMediaKindFromPath,
  type SlideshowConfig,
  type SlideshowImage,
} from '../lib/slideshow'

interface UseSlideshowImagesOptions {
  config: SlideshowConfig
  photosDir: string | null
  enabled: boolean
  refreshKey?: number
}

export function useSlideshowImages({
  config,
  photosDir,
  enabled,
  refreshKey = 0,
}: UseSlideshowImagesOptions) {
  const [images, setImages] = useState<SlideshowImage[]>([])
  const [hasMemoryImages, setHasMemoryImages] = useState(false)
  const loadingRef = useRef(0)

  const reload = useCallback(async () => {
    if (!enabled || !window.electronAPI?.listSlideshowImages) {
      setImages([])
      setHasMemoryImages(false)
      return
    }

    const loadId = ++loadingRef.current

    if (config.memoriesDir && window.electronAPI.setSlideshowMemoriesDir) {
      await window.electronAPI.setSlideshowMemoriesDir(config.memoriesDir)
    }

    const memoryPaths = config.memoriesDir
      ? await window.electronAPI.listSlideshowImages(config.memoriesDir)
      : []
    const eventPaths =
      config.includeEventPhotos && photosDir && window.electronAPI.listEventSlideshowImages
        ? await window.electronAPI.listEventSlideshowImages(photosDir)
        : []

    if (loadId !== loadingRef.current) return

    const toUrl = window.electronAPI.pathToFileUrl

    const memoryItems: SlideshowImage[] = await Promise.all(
      memoryPaths.map(async (filePath) => ({
        filePath,
        url: await toUrl(filePath),
        source: 'memory' as const,
        kind: slideshowMediaKindFromPath(filePath),
      })),
    )

    const eventItems: SlideshowImage[] = await Promise.all(
      eventPaths.map(async (filePath) => ({
        filePath,
        url: await toUrl(filePath),
        source: 'event' as const,
        kind: slideshowMediaKindFromPath(filePath),
      })),
    )

    if (loadId !== loadingRef.current) return

    setHasMemoryImages(memoryItems.length > 0)
    setImages(shuffleSlideshow([...memoryItems, ...eventItems]))
  }, [config.memoriesDir, config.includeEventPhotos, enabled, photosDir])

  useEffect(() => {
    void reload()
  }, [reload, refreshKey])

  return { images, hasMemoryImages, reload }
}

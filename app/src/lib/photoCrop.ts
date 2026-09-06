export interface CropRect {
  left: number
  top: number
  width: number
  height: number
}

/** Center crop to 3:2 (landscape print aspect). */
export function cropRect3x2(width: number, height: number): CropRect {
  const target = 3 / 2
  const current = width / height
  if (current > target + 0.001) {
    const cropW = Math.round(height * target)
    return { left: Math.round((width - cropW) / 2), top: 0, width: cropW, height }
  }
  if (current < target - 0.001) {
    const cropH = Math.round(width / target)
    return { left: 0, top: Math.round((height - cropH) / 2), width, height: cropH }
  }
  return { left: 0, top: 0, width, height }
}

/** Center crop to 2:3 (portrait print aspect). */
export function cropRect2x3(width: number, height: number): CropRect {
  const target = 2 / 3
  const current = width / height
  if (current > target + 0.001) {
    const cropW = Math.round(height * target)
    return { left: Math.round((width - cropW) / 2), top: 0, width: cropW, height }
  }
  if (current < target - 0.001) {
    const cropH = Math.round(width / target)
    return { left: 0, top: Math.round((height - cropH) / 2), width, height: cropH }
  }
  return { left: 0, top: 0, width, height }
}

/** Map sign % on the full frame to % on a center 2:3 crop. */
export function mapSignPercentThroughCrop(
  x: number,
  y: number,
  fullWidth: number,
  fullHeight: number,
  crop: CropRect,
): { x: number; y: number } {
  const cx = (fullWidth * x) / 100
  const cy = (fullHeight * y) / 100
  return {
    x: ((cx - crop.left) / crop.width) * 100,
    y: ((cy - crop.top) / crop.height) * 100,
  }
}

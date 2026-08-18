import type { VideoInputDevice } from '../types'

interface CameraSelectorProps {
  cameras: VideoInputDevice[]
  selectedDeviceId: string
  activeLabel: string | null
  isReady: boolean
  onSelect: (deviceId: string) => void
  onRefresh: () => void
}

export function CameraSelector({
  cameras,
  selectedDeviceId,
  activeLabel,
  isReady,
  onSelect,
  onRefresh,
}: CameraSelectorProps) {
  return (
    <div className="camera-selector">
      <label className="camera-selector__label" htmlFor="camera-select">
        Cámara
      </label>
      <div className="camera-selector__row">
        <select
          id="camera-select"
          className="camera-selector__select"
          value={selectedDeviceId}
          onChange={(e) => onSelect(e.target.value)}
        >
          {cameras.length === 0 ? (
            <option value="">Sin cámaras detectadas</option>
          ) : (
            cameras.map((cam, index) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `Cámara ${index + 1}`}
              </option>
            ))
          )}
        </select>
        <button type="button" className="camera-selector__refresh" onClick={onRefresh}>
          Actualizar
        </button>
      </div>
      <p className="camera-selector__status">
        {isReady && activeLabel
          ? `Activa: ${activeLabel}`
          : selectedDeviceId
            ? 'Conectando…'
            : 'Elige una cámara'}
      </p>
    </div>
  )
}

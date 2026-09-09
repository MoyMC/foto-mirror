import { SLIDESHOW_IDLE_CHOICES } from '../lib/slideshow'
import { ToggleSwitch } from './ToggleSwitch'

interface SlideshowSetupProps {
  idleEnabled: boolean
  memoriesDir: string | null
  includeEventPhotos: boolean
  idleSeconds: number
  audioEnabled: boolean
  electronAvailable: boolean
  onIdleEnabledChange: (value: boolean) => void
  onPickMemoriesDir: () => void
  onIncludeEventPhotosChange: (value: boolean) => void
  onIdleSecondsChange: (seconds: number) => void
  onAudioEnabledChange: (value: boolean) => void
}

export function SlideshowSetup({
  idleEnabled,
  memoriesDir,
  includeEventPhotos,
  idleSeconds,
  audioEnabled,
  electronAvailable,
  onIdleEnabledChange,
  onPickMemoriesDir,
  onIncludeEventPhotosChange,
  onIdleSecondsChange,
  onAudioEnabledChange,
}: SlideshowSetupProps) {
  return (
    <div className="slideshow-setup">
      <ToggleSwitch
        id="slideshow-idle-enabled"
        label="Pantalla en inactividad"
        hint="Tras unos segundos sin tocar, el espejo muestra fotos y videos de la carpeta de recuerdos (o del evento)."
        checked={idleEnabled}
        disabled={!electronAvailable}
        onChange={onIdleEnabledChange}
      />

      <div
        className={`slideshow-setup__options${
          !idleEnabled ? ' slideshow-setup__options--disabled' : ''
        }`}
      >
        <div className="folder-selector slideshow-setup__folder">
          <p className="folder-selector__label">Carpeta de recuerdos (opcional)</p>
          {memoriesDir ? (
            <p className="folder-selector__path" title={memoriesDir}>
              {memoriesDir}
            </p>
          ) : (
            <p className="folder-selector__empty">Fotos y videos · jpg, png, mp4, webm, mov…</p>
          )}
          <button
            type="button"
            className="btn-secondary folder-selector__pick"
            onClick={onPickMemoriesDir}
            disabled={!electronAvailable || !idleEnabled}
          >
            {memoriesDir ? 'Cambiar carpeta' : 'Elegir carpeta'}
          </button>
        </div>

        <ToggleSwitch
          id="slideshow-event-photos"
          label="Incluir fotos del evento"
          hint="Muestra las de editadas/ conforme se van tomando (carrusel sobre el espejo si no hay recuerdos)."
          checked={includeEventPhotos}
          disabled={!electronAvailable || !idleEnabled}
          onChange={onIncludeEventPhotosChange}
        />

        <ToggleSwitch
          id="slideshow-audio"
          label="Audio en videos"
          hint="Si está apagado, los videos se reproducen en silencio (recomendado en salón)."
          checked={audioEnabled}
          disabled={!electronAvailable || !idleEnabled}
          onChange={onAudioEnabledChange}
        />

        <div className="slideshow-setup__idle">
          <p className="slideshow-setup__idle-label">Mostrar tras inactividad</p>
          <div className="slideshow-setup__idle-options" role="radiogroup" aria-label="Segundos">
            {SLIDESHOW_IDLE_CHOICES.map(({ seconds }) => (
              <button
                key={seconds}
                type="button"
                role="radio"
                aria-checked={idleSeconds === seconds}
                disabled={!idleEnabled}
                className={`slideshow-setup__idle-btn${
                  idleSeconds === seconds ? ' slideshow-setup__idle-btn--active' : ''
                }`}
                onClick={() => onIdleSecondsChange(seconds)}
              >
                {seconds}s
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

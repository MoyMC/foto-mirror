interface FolderSelectorProps {
  photosDir: string | null
  onSelect: () => void
  electronAvailable: boolean
  label?: string
  emptyHint?: string
}

export function FolderSelector({
  photosDir,
  onSelect,
  electronAvailable,
  label = 'Carpeta de fotos',
  emptyHint,
}: FolderSelectorProps) {
  return (
    <div className="folder-selector">
      <p className="folder-selector__label">{label}</p>

      {photosDir ? (
        <p className="folder-selector__path" title={photosDir}>
          {photosDir}
        </p>
      ) : (
        <p className="folder-selector__empty">
          {emptyHint ??
            (electronAvailable
              ? 'Aún no hay carpeta seleccionada'
              : 'En el navegador las fotos se descargan; usa Electron para elegir carpeta.')}
        </p>
      )}

      <button
        type="button"
        className="btn-secondary folder-selector__pick"
        onClick={onSelect}
        disabled={!electronAvailable}
      >
        {photosDir ? 'Cambiar carpeta' : 'Elegir carpeta'}
      </button>
    </div>
  )
}

interface ToggleSwitchProps {
  id: string
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export function ToggleSwitch({
  id,
  label,
  hint,
  checked,
  disabled = false,
  onChange,
}: ToggleSwitchProps) {
  return (
    <div className={`toggle-row${disabled ? ' toggle-row--disabled' : ''}`}>
      <div className="toggle-row__text">
        <label className="toggle-row__label" htmlFor={id}>
          {label}
        </label>
        {hint && <p className="toggle-row__hint">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`toggle${checked ? ' toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle__thumb" aria-hidden />
      </button>
    </div>
  )
}

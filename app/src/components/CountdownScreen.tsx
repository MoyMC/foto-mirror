interface CountdownScreenProps {
  countdown: number
  label: string
}

export function CountdownScreen({ countdown, label }: CountdownScreenProps) {
  return (
    <div className="screen screen--countdown">
      <div className="countdown__stage">
        <div className="countdown__rings" aria-hidden={countdown <= 0}>
          <span className="countdown__ring countdown__ring--outer" />
          <span className="countdown__ring countdown__ring--mid" />
          <span className="countdown__ring countdown__ring--inner" />
          <div className="countdown__number" key={countdown}>
            {countdown > 0 ? countdown : '·'}
          </div>
        </div>
        <p className="countdown__label">{label}</p>
      </div>
    </div>
  )
}

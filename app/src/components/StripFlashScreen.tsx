interface StripFlashScreenProps {
  completedPose: number
  poseCount: number
}

export function StripFlashScreen({ completedPose, poseCount }: StripFlashScreenProps) {
  const nextPose = completedPose + 1

  return (
    <div className="screen screen--strip-flash" role="presentation" aria-live="polite">
      <div className="strip-flash__burst" aria-hidden />
      <div className="strip-flash__message">
        <p className="strip-flash__done">Foto {completedPose} lista</p>
        <p className="strip-flash__next">
          Siguiente: pose {nextPose} de {poseCount}
        </p>
      </div>
    </div>
  )
}

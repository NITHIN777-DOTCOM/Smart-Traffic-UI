interface CarProps {
  color: string
  braking: boolean
  /** Direction the car is facing. */
  facing: 'right' | 'left' | 'up' | 'down'
  x: number
  y: number
  opacity: number
}

/** Top-view car, 60 × 34 px when horizontal. Drawn facing right or up, flipped for the other directions. */
export function Car({ color, braking, facing, x, y, opacity }: CarProps) {
  const brake = braking ? 'var(--sig-red)' : 'var(--sig-red-off)'
  const flip = facing === 'left' ? ' scaleX(-1)' : facing === 'down' ? ' scaleY(-1)' : ''
  // Snap to half pixels so slow-moving cars don't shimmer between sub-pixel positions.
  const px = (n: number) => Math.round(n * 2) / 2
  const style = { transform: `translate(${px(x)}px, ${px(y)}px)${flip}`, opacity }

  if (facing === 'left' || facing === 'right') {
    return (
      <svg className="car" width="60" height="34" viewBox="0 0 60 34" aria-hidden="true" style={style}>
        <rect x="2" y="2" width="56" height="30" rx="9" fill={color} />
        <rect x="36" y="6" width="11" height="22" rx="3" fill="var(--bg)" />
        <rect x="11" y="6" width="8" height="22" rx="3" fill="var(--bg)" />
        <rect x="54" y="5" width="3" height="6" rx="1" fill="var(--sig-yellow)" opacity="0.8" />
        <rect x="54" y="23" width="3" height="6" rx="1" fill="var(--sig-yellow)" opacity="0.8" />
        <rect x="2" y="4" width="4" height="7" rx="1" fill={brake} />
        <rect x="2" y="23" width="4" height="7" rx="1" fill={brake} />
      </svg>
    )
  }
  return (
    <svg className="car" width="34" height="60" viewBox="0 0 34 60" aria-hidden="true" style={style}>
      <rect x="2" y="2" width="30" height="56" rx="9" fill={color} />
      <rect x="6" y="13" width="22" height="11" rx="3" fill="var(--bg)" />
      <rect x="6" y="40" width="22" height="8" rx="3" fill="var(--bg)" />
      <rect x="5" y="3" width="6" height="3" rx="1" fill="var(--sig-yellow)" opacity="0.8" />
      <rect x="23" y="3" width="6" height="3" rx="1" fill="var(--sig-yellow)" opacity="0.8" />
      <rect x="4" y="54" width="7" height="4" rx="1" fill={brake} />
      <rect x="23" y="54" width="7" height="4" rx="1" fill={brake} />
    </svg>
  )
}

const BRAND_A = '#6B3FE4'
const BRAND_B = '#7C4DFF'
const BRAND_C = '#4F46E5'

const PARTICLES = [
  { top: '4%', left: '20%', s: 3, o: 0.5 },
  { top: '10%', right: '6%', s: 2, o: 0.4 },
  { bottom: '8%', left: '4%', s: 2, o: 0.35 },
  { bottom: '14%', right: '10%', s: 3, o: 0.45 },
  { top: '46%', left: '-2%', s: 2, o: 0.3 },
  { top: '52%', right: '-1%', s: 2, o: 0.3 },
] as const

interface Props {
  size?: number
  tiltX?: number
  tiltY?: number
}

export default function HeroOrb({ size = 190, tiltX = 0, tiltY = 0 }: Props) {
  const boxSize = size * 1.3
  const satelliteOrbitRadius = size * 0.62

  return (
    <div
      className="relative flex items-center justify-center shrink-0 transition-transform duration-150 ease-out"
      style={{
        width: boxSize,
        height: boxSize,
        transform: `perspective(900px) rotateX(${tiltY}deg) rotateY(${tiltX}deg)`,
      }}
      title="CloudLabs AI"
    >
      {/* volumetric bloom, softest and widest layer */}
      <div
        className="absolute rounded-full blur-3xl"
        style={{
          width: size * 1.05,
          height: size * 1.05,
          background: `radial-gradient(circle, ${BRAND_B}26, transparent 70%)`,
        }}
      />

      {/* breathing inner glow */}
      <div
        className="absolute rounded-full blur-2xl animate-core-pulse"
        style={{
          width: size * 0.7,
          height: size * 0.7,
          background: `radial-gradient(circle, ${BRAND_A}40, transparent 72%)`,
        }}
      />

      {/* subtle floating particles */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-primary-400"
          style={{ ...p, width: p.s, height: p.s, opacity: p.o }}
        />
      ))}

      {/* two ultra-thin orbital rings, counter-rotating at different speeds */}
      <svg
        viewBox="0 0 100 100"
        className="absolute animate-core-ring-1"
        style={{ width: boxSize, height: boxSize, transformOrigin: '50% 50%' }}
      >
        <defs>
          <linearGradient id="heroRingGradA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor={BRAND_A} stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <g transform="rotate(-18 50 50)">
          <ellipse cx="50" cy="50" rx="44" ry="16" fill="none" stroke="url(#heroRingGradA)" strokeWidth="0.9" />
        </g>
      </svg>

      {/* satellite — a clean, clearly visible circular orbit around the core */}
      <div
        className="absolute animate-core-satellite"
        style={{ width: boxSize, height: boxSize, transformOrigin: '50% 50%' }}
      >
        <div
          className="absolute rounded-full"
          style={{
            top: '50%',
            left: '50%',
            width: size * 0.055,
            height: size * 0.055,
            transform: `translate(-50%, -50%) translateX(${satelliteOrbitRadius}px)`,
            background: `radial-gradient(circle at 35% 30%, #ffffff, ${BRAND_B} 55%, ${BRAND_A} 100%)`,
            boxShadow: `0 0 6px 2px ${BRAND_B}70`,
          }}
        />
      </div>

      <svg
        viewBox="0 0 100 100"
        className="absolute animate-core-ring-2"
        style={{ width: boxSize * 0.86, height: boxSize * 0.86, transformOrigin: '50% 50%' }}
      >
        <defs>
          <linearGradient id="heroRingGradB" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="100%" stopColor={BRAND_C} stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <g transform="rotate(24 50 50)">
          <ellipse cx="50" cy="50" rx="44" ry="14" fill="none" stroke="url(#heroRingGradB)" strokeWidth="0.7" />
        </g>
      </svg>

      {/* gently floating glass core */}
      <div className="relative animate-orbit-float" style={{ width: size, height: size }}>
        {/* outer glass shell */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.4)',
            boxShadow: `0 20px 45px ${BRAND_A}26, inset 0 1px 1px rgba(255,255,255,0.5)`,
          }}
        />

        {/* mid glass layer */}
        <div
          className="absolute rounded-full"
          style={{
            inset: '9%',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.3)',
          }}
        />

        {/* glowing inner energy core */}
        <div
          className="absolute rounded-full"
          style={{
            inset: '22%',
            background: `radial-gradient(circle at 35% 28%, #ffffff 0%, #cbb9fb 14%, ${BRAND_B} 42%, ${BRAND_A} 68%, ${BRAND_C} 100%)`,
            boxShadow: `0 0 30px 6px ${BRAND_B}55`,
          }}
        />

        {/* glass highlight / reflection */}
        <div
          className="absolute rounded-full blur-[3px]"
          style={{
            top: '14%',
            left: '18%',
            width: '30%',
            height: '20%',
            background: 'rgba(255,255,255,0.6)',
          }}
        />
      </div>
    </div>
  )
}

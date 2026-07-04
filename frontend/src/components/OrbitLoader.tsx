interface Props {
  size?: number
  label?: string
}

export default function OrbitLoader({ size = 64, label }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary-300 animate-orbit-slow" />
        <div className="absolute inset-[15%] rounded-full border-2 border-purple-300 animate-orbit-medium" />
        <div className="absolute inset-[32%] rounded-full border-2 border-dashed border-primary-400 animate-orbit-slower" />
        <div className="absolute inset-[42%] rounded-full bg-primary-600 animate-orbit-pulse" />
      </div>
      {label && <p className="text-xs text-gray-400">{label}</p>}
    </div>
  )
}

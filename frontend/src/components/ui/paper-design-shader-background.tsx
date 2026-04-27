import { GrainGradient } from "@paper-design/shaders-react"

interface GradientBackgroundProps {
  colors?: string[]
  softness?: number
  intensity?: number
  speed?: number
  colorBack?: string
}

export function GradientBackground({
  colors = ["hsl(14, 100%, 57%)", "hsl(45, 100%, 51%)", "hsl(340, 82%, 52%)"],
  softness = 0.76,
  intensity = 0.45,
  speed = 1,
  colorBack = "hsl(0, 0%, 0%)",
}: GradientBackgroundProps) {
  return (
    <div className="absolute inset-0 -z-10">
      <GrainGradient
        style={{ height: "100%", width: "100%" }}
        colorBack={colorBack}
        softness={softness}
        intensity={intensity}
        noise={0}
        shape="corners"
        offsetX={0}
        offsetY={0}
        scale={1}
        rotation={0}
        speed={speed}
        colors={colors}
      />
    </div>
  )
}

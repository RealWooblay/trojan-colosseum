import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface StatsStripProps {
  mean: number
  variance: number
  skew: number
  kurtosis: number
}

export function StatsStrip({ mean, variance, skew, kurtosis }: StatsStripProps) {
  const stats = [
    { label: "μ (Mean)", value: mean.toFixed(2), tooltip: "Expected value of the distribution" },
    { label: "σ² (Variance)", value: variance.toFixed(2), tooltip: "Measure of spread" },
    { label: "Skew", value: skew.toFixed(2), tooltip: "Asymmetry of the distribution" },
    { label: "Kurtosis", value: kurtosis.toFixed(2), tooltip: "Tail heaviness" },
  ]

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-3">
        {stats.map((stat) => (
          <Tooltip key={stat.label}>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="px-3 py-1.5 cursor-help">
                <span className="text-xs text-muted-foreground mr-2">{stat.label}</span>
                <span className="font-mono font-semibold">{stat.value}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{stat.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}

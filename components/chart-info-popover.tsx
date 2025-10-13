"use client"

import { Info } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

export function ChartInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Info className="w-4 h-4" />
          <span className="sr-only">How to read this chart</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="glass-card w-80 p-4 space-y-3 text-sm" side="left">
        <h4 className="font-semibold text-base">How to read this chart</h4>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              The <strong className="text-foreground">solid curve</strong> is the probability density function (PDF).
              Higher peaks = more likely outcomes.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-secondary">•</span>
            <span>
              The <strong className="text-foreground">shaded band</strong> shows your selected range. You're
              buying/selling probability mass within this region.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-secondary">•</span>
            <span>
              The <strong className="text-foreground">dashed line</strong> (when visible) shows the curve <em>after</em>{" "}
              your trade executes.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-muted-foreground">•</span>
            <span>
              <strong className="text-foreground">Markers</strong> show mean (μ), median, and mode of the distribution.
            </span>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  )
}

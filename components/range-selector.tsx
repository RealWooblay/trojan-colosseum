"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useEffect, useRef, useState, useCallback } from "react"

interface RangeSelectorProps {
  range: [number, number]
  domain: { min: number; max: number }
  onChange: (range: [number, number]) => void
  unit: string
}

export function RangeSelector({ range, domain, onChange, unit }: RangeSelectorProps) {
  const lowerHandleRef = useRef<HTMLButtonElement>(null)
  const upperHandleRef = useRef<HTMLButtonElement>(null)

  const [minInput, setMinInput] = useState(range[0].toString())
  const [maxInput, setMaxInput] = useState(range[1].toString())
  const [error, setError] = useState<string | null>(null)

  const debounceTimerRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    setMinInput(range[0].toFixed(2))
    setMaxInput(range[1].toFixed(2))
  }, [range])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent, isLower: boolean) => {
      const baseStep = (domain.max - domain.min) / 100
      const step = e.shiftKey ? baseStep * 10 : baseStep

      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault()
        if (isLower) {
          const newMin = Math.max(domain.min, range[0] - step)
          onChange([newMin, range[1]])
        } else {
          const newMax = Math.max(range[0] + step, range[1] - step)
          onChange([range[0], newMax])
        }
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault()
        if (isLower) {
          const newMin = Math.min(range[1] - step, range[0] + step)
          onChange([newMin, range[1]])
        } else {
          const newMax = Math.min(domain.max, range[1] + step)
          onChange([range[0], newMax])
        }
      }
    }

    const lowerHandle = lowerHandleRef.current
    const upperHandle = upperHandleRef.current

    const lowerListener = (e: KeyboardEvent) => handleKeyDown(e, true)
    const upperListener = (e: KeyboardEvent) => handleKeyDown(e, false)

    lowerHandle?.addEventListener("keydown", lowerListener as any)
    upperHandle?.addEventListener("keydown", upperListener as any)

    return () => {
      lowerHandle?.removeEventListener("keydown", lowerListener as any)
      upperHandle?.removeEventListener("keydown", upperListener as any)
    }
  }, [range, domain, onChange])

  const handleInputChange = useCallback(
    (value: string, isMin: boolean) => {
      if (isMin) {
        setMinInput(value)
      } else {
        setMaxInput(value)
      }

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Debounce the actual range update
      debounceTimerRef.current = setTimeout(() => {
        const num = Number.parseFloat(value)

        if (isNaN(num)) {
          setError("Invalid number")
          return
        }

        if (isMin) {
          if (num < domain.min) {
            setError(`Min must be >= ${domain.min}`)
            return
          }
          if (num >= range[1]) {
            setError("Min must be < Max")
            return
          }
          setError(null)
          onChange([num, range[1]])
        } else {
          if (num > domain.max) {
            setError(`Max must be <= ${domain.max}`)
            return
          }
          if (num <= range[0]) {
            setError("Max must be > Min")
            return
          }
          setError(null)
          onChange([range[0], num])
        }
      }, 150)
    },
    [range, domain, onChange],
  )

  const tickStep = 0.01

  const handleSliderChange = (values: number[]) => {
    const snappedMin = Math.round(values[0] / tickStep) * tickStep
    const snappedMax = Math.round(values[1] / tickStep) * tickStep
    onChange([snappedMin, snappedMax])
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="range-min" className="text-xs text-muted-foreground">
            Min ({unit})
          </Label>
          <Input
            id="range-min"
            type="number"
            value={minInput}
            onChange={(e) => handleInputChange(e.target.value, true)}
            min={domain.min}
            max={range[1]}
            step={tickStep}
            className="font-mono bg-white/5 border-white/10 focus:border-primary focus:ring-primary"
            aria-label="Lower bound of range"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="range-max" className="text-xs text-muted-foreground">
            Max ({unit})
          </Label>
          <Input
            id="range-max"
            type="number"
            value={maxInput}
            onChange={(e) => handleInputChange(e.target.value, false)}
            min={range[0]}
            max={domain.max}
            step={tickStep}
            className="font-mono bg-white/5 border-white/10 focus:border-primary focus:ring-primary"
            aria-label="Upper bound of range"
          />
        </div>
      </div>

      {error && <div className="text-xs text-destructive">{error}</div>}

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Drag to adjust range (Shift+Arrow for 10× step)</Label>
        <div className="relative">
          <Slider
            value={[range[0], range[1]]}
            onValueChange={handleSliderChange}
            min={domain.min}
            max={domain.max}
            step={tickStep}
            className="py-4"
            aria-label="Range selector"
          />
          <button
            ref={lowerHandleRef}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background focus:outline-none"
            aria-label="Lower bound handle (use arrow keys, Shift for 10× step)"
            tabIndex={0}
            style={{ left: `${((range[0] - domain.min) / (domain.max - domain.min)) * 100}%` }}
          />
          <button
            ref={upperHandleRef}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background focus:outline-none"
            aria-label="Upper bound handle (use arrow keys, Shift for 10× step)"
            tabIndex={0}
            style={{ left: `${((range[1] - domain.min) / (domain.max - domain.min)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

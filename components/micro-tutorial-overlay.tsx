"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X } from "lucide-react"

const TUTORIAL_KEY = "trojan_tutorial_dismissed"

export function MicroTutorialOverlay() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(TUTORIAL_KEY)
    if (!dismissed) {
      setShow(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(TUTORIAL_KEY, "true")
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="glass-card p-8 max-w-lg relative">
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close tutorial"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Quick Start Guide</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">1/1</span>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">1</span>
                    </div>
                    <div>
                      <strong className="text-foreground">Drag to choose a band</strong>
                      <p className="text-muted-foreground mt-1">
                        Select a range on the chart by dragging the handles or using the brush at the bottom. This is
                        the shaded area where you'll trade probability mass.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <div>
                      <strong className="text-foreground">The dashed curve shows your impact</strong>
                      <p className="text-muted-foreground mt-1">
                        After you enter a trade amount, the dashed line shows how the probability distribution will
                        change. Buying mass in one range reduces it elsewhere.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <div>
                      <strong className="text-foreground">Place the order in the right panel</strong>
                      <p className="text-muted-foreground mt-1">
                        Use the sidebar to set your trade size, review the impact, and confirm. All actions happen in
                        the sidebar.
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={handleDismiss} className="w-full" size="lg">
                  Got it
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

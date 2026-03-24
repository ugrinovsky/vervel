import type { ReactNode } from 'react'

interface FloatingPanelProps {
  children: ReactNode
  className?: string
}

/**
 * Generic floating bottom panel — blurred dark bar for action controls.
 * Used in video calls, media players, etc.
 */
export default function FloatingPanel({ children, className = '' }: FloatingPanelProps) {
  return (
    <div className={`flex items-center justify-center gap-4 px-6 py-6 bg-black/80 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  )
}

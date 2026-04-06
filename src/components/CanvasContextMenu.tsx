"use client"
import React, { useEffect, useRef } from "react"
import { Copy, Trash2, Layers, ArrowUp, ArrowDown, Link2Off, ChevronUp, ChevronDown } from "lucide-react"

interface ContextMenuPosition {
  x: number
  y: number
}

interface CanvasContextMenuProps {
  position: ContextMenuPosition | null
  onClose: () => void
  onDuplicate: () => void
  onDelete: () => void
  onGroup: () => void
  onUngroup: () => void
  onBringToFront: () => void
  onSendToBack: () => void
  onMoveForward: () => void;
  onMoveBackward: () => void;
  onCopy: () => void
  canGroup: boolean
  canUngroup: boolean
}

export function CanvasContextMenu({
  position,
  onClose,
  onDuplicate,
  onDelete,
  onGroup,
  onUngroup,
  onBringToFront,
  onSendToBack,
  onMoveForward,
  onMoveBackward,
  onCopy,
  canGroup,
  canUngroup,
}: CanvasContextMenuProps) {
  // Guard: don't allow closing for a brief moment after opening
  // This prevents the mouseup from the right-click immediately closing the menu
  const readyToClose = useRef(false)

  useEffect(() => {
    if (!position) return
    readyToClose.current = false
    const timer = setTimeout(() => {
      readyToClose.current = true
    }, 150)
    return () => clearTimeout(timer)
  }, [position])

  // Close on any left-click outside
  useEffect(() => {
    if (!position) return
    const handleClick = () => {
      if (readyToClose.current) onClose()
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [position, onClose])

  if (!position) return null

const menuItems = [
    { label: "Duplicate", icon: Copy, onClick: onDuplicate, divider: false },
    { label: "Copy", icon: Copy, onClick: onCopy, divider: true },
    { label: "Group", icon: Layers, onClick: onGroup, disabled: !canGroup, divider: false },
    { label: "Ungroup", icon: Link2Off, onClick: onUngroup, disabled: !canUngroup, divider: true },
    { label: "Bring to Front", icon: ArrowUp, onClick: onBringToFront, divider: false },
    { label: "Bring Forward", icon: ChevronUp, onClick: onMoveForward, divider: false },
    { label: "Send Backward", icon: ChevronDown, onClick: onMoveBackward, divider: false },
    { label: "Send to Back", icon: ArrowDown, onClick: onSendToBack, divider: true },
    { label: "Delete", icon: Trash2, onClick: onDelete, danger: true, divider: false },
  ]

  return (
    <div
       className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-40"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={(e) => e.stopPropagation()} // prevent backdrop from closing
    >
      {menuItems.map((item, index) => (
        <div key={index}>
          <button
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              if (!item.disabled) {
                item.onClick()
                onClose()
              }
            }}
            disabled={item.disabled}
            className={`
              w-full px-3 py-2 text-sm flex items-center gap-2 transition-colors text-left
              ${
                item.disabled
                  ? "opacity-40 cursor-not-allowed text-gray-400"
                  : (item as any).danger
                    ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              }
            `}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </button>
          {item.divider && <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />}
        </div>
      ))}
    </div>
  )
}
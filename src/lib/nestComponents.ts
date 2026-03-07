// lib/nestComponents.ts
import type { ComponentData } from "../App"

const DESIGN_WIDTH = 1920

export const CONTAINER_TYPES = new Set([
  "container", "group", "grid", "form", "section",
])

// ─── Value parsers ────────────────────────────────────────────────────────────

function parseStyleValue(value: any): number {
  if (value === undefined || value === null || value === "") return 0
  if (typeof value === "number") return isNaN(value) ? 0 : value
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed.endsWith("%")) {
      const pct = parseFloat(trimmed)
      return isNaN(pct) ? 0 : (pct / 100) * DESIGN_WIDTH
    }
    const n = parseFloat(trimmed)
    return isNaN(n) ? 0 : n
  }
  return 0
}

export function getComponentWidth(c: ComponentData): number {
  return parseStyleValue(c.style?.width) || parseStyleValue(c.props?.width) || 0
}

export function getComponentHeight(c: ComponentData): number {
  return parseStyleValue(c.style?.height) || parseStyleValue(c.props?.height) || 0
}

export function getComponentX(c: ComponentData): number {
  if (c.position?.x !== undefined) return Number(c.position.x) || 0
  return parseStyleValue(c.style?.left) || 0
}

export function getComponentY(c: ComponentData): number {
  if (c.position?.y !== undefined) return Number(c.position.y) || 0
  return parseStyleValue(c.style?.top) || 0
}

// ─── Containment checks ───────────────────────────────────────────────────────

// Full 2D bounding box check — for partial-width containers
function isInsideBounds(child: ComponentData, parent: ComponentData): boolean {
  const px = getComponentX(parent), py = getComponentY(parent)
  const pw = getComponentWidth(parent), ph = getComponentHeight(parent)
  if (pw <= 0 || ph <= 0) return false

  const cx = getComponentX(child), cy = getComponentY(child)
  const centerX = cx + getComponentWidth(child) / 2
  const centerY = cy + getComponentHeight(child) / 2

  return centerX >= px && centerX <= px + pw && centerY >= py && centerY <= py + ph
}

// Y-band check — for full-width section containers (width = 1920px)
// Only the vertical center needs to fall inside the section's Y range.
function isInsideYBand(child: ComponentData, parent: ComponentData): boolean {
  const py = getComponentY(parent)
  const ph = getComponentHeight(parent)
  if (ph <= 0) return false

  // Never nest containers inside full-width containers — keeps tree shallow
  if (CONTAINER_TYPES.has(child.type)) return false

  const cy = getComponentY(child)
  const centerY = cy + getComponentHeight(child) / 2

  return centerY >= py && centerY <= py + ph
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Takes a flat ComponentData array and returns a nested tree.
 *
 * Strategy:
 * 1. Partial containers (w < 1800px): children assigned by full 2D overlap.
 * 2. Full-width containers (w >= 1800px, i.e. 1920px sections): non-container
 *    children assigned by Y-band overlap only.
 *
 * Pass 1 runs first (partial) so more specific parents win over sections.
 */
export function nestComponents(flat: ComponentData[]): ComponentData[] {
  if (!flat || flat.length === 0) return []

  const cloned: ComponentData[] = flat.map(c => ({ ...c, children: [] }))

  const partialContainers = cloned
    .filter(c => CONTAINER_TYPES.has(c.type) && getComponentWidth(c) > 0 && getComponentWidth(c) < 1800 && getComponentHeight(c) > 0)
    .sort((a, b) => (getComponentWidth(a) * getComponentHeight(a)) - (getComponentWidth(b) * getComponentHeight(b)))

  const fullWidthContainers = cloned
    .filter(c => CONTAINER_TYPES.has(c.type) && getComponentWidth(c) >= 1800 && getComponentHeight(c) > 0)
    .sort((a, b) => getComponentHeight(a) - getComponentHeight(b)) // smallest height = most specific

  const assigned = new Set<string>()

  // Pass 1: partial containers (most specific)
  for (const c of cloned) {
    if (assigned.has(c.id)) continue
    const parent = partialContainers.find(p => p.id !== c.id && isInsideBounds(c, p))
    if (parent) {
      parent.children!.push(c)
      assigned.add(c.id)
    }
  }

  // Pass 2: full-width section containers
  for (const c of cloned) {
    if (assigned.has(c.id)) continue
    if (CONTAINER_TYPES.has(c.type)) continue // don't nest sections into sections
    const parent = fullWidthContainers.find(p => p.id !== c.id && isInsideYBand(c, p))
    if (parent) {
      parent.children!.push(c)
      assigned.add(c.id)
    }
  }

  return cloned.filter(c => !assigned.has(c.id))
}

// ─── Debug helper ─────────────────────────────────────────────────────────────

export function debugNesting(flat: ComponentData[]): void {
  console.group("🔍 nestComponents debug")
  console.table(flat.map(c => ({
    id: c.id.slice(-8),
    type: c.type,
    x: getComponentX(c),
    y: getComponentY(c),
    w: Math.round(getComponentWidth(c)),
    h: Math.round(getComponentHeight(c)),
    raw_w: c.style?.width,
    raw_h: c.style?.height,
  })))
  const result = nestComponents(flat)
  console.log(`Root nodes: ${result.length} (was ${flat.length} flat, ${flat.length - result.length} nested)`)
  result.forEach(c => {
    if (c.children?.length) {
      console.log(`  📦 ${c.type} (${c.id.slice(-6)}) → ${c.children.length} children:`, c.children.map(ch => ch.type))
    }
  })
  console.groupEnd()
}
// lib/nestComponents.ts
import type { ComponentData } from "../App"

const DESIGN_WIDTH = 1920

export const CONTAINER_TYPES = new Set([
  "container", "group", "grid", "form", "section",
])

const NEVER_NEST_INTO_SECTIONS = new Set([
  "navbar", "hero", "footer", "section-heading",
])

// These types can NEVER be parents — components on top of them stay as siblings
const NEVER_BE_PARENT = new Set([
  "navbar", "hero", "footer", "section-heading",
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

function isInsideBounds(child: ComponentData, parent: ComponentData): boolean {
  // Hero, footer, navbar etc. can never absorb children
  if (NEVER_BE_PARENT.has(parent.type)) return false

  const px = getComponentX(parent), py = getComponentY(parent)
  const pw = getComponentWidth(parent), ph = getComponentHeight(parent)
  if (pw <= 0 || ph <= 0) return false

  const cx = getComponentX(child), cy = getComponentY(child)
  const centerX = cx + getComponentWidth(child) / 2
  const centerY = cy + getComponentHeight(child) / 2

  return centerX >= px && centerX <= px + pw && centerY >= py && centerY <= py + ph
}

function isInsideYBand(child: ComponentData, parent: ComponentData): boolean {
  // Hero, footer, navbar etc. can never absorb children
  if (NEVER_BE_PARENT.has(parent.type)) return false

  const py = getComponentY(parent)
  const ph = getComponentHeight(parent)
  if (ph <= 0) return false

  if (CONTAINER_TYPES.has(child.type)) return false
  if (NEVER_NEST_INTO_SECTIONS.has(child.type)) return false

  const cy = getComponentY(child)
  const centerY = cy + getComponentHeight(child) / 2

  return centerY >= py && centerY <= py + ph
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Nesting strategy (in priority order):
 *
 * 1. EXPLICIT: If a component has `parent_id` set, nest it under that parent.
 *    This is the most reliable method — used when the user explicitly places
 *    a component inside a container on the canvas.
 *
 * 2. GEOMETRIC (partial containers, w < 1800px): Children assigned by full
 *    2D centre-point overlap. Works for ALL element types.
 *    NOTE: hero/footer/navbar/section-heading are excluded as parents even
 *    if their saved width happens to be < 1800px.
 *
 * 3. GEOMETRIC (full-width containers, w >= 1800px): Y-band only, and only
 *    for explicit container-type children (not leaf elements like text/button).
 */
export function nestComponents(flat: ComponentData[]): ComponentData[] {
  if (!flat || flat.length === 0) return []

  const cloned: ComponentData[] = flat.map(c => ({ ...c, children: [] }))
  const byId = new Map(cloned.map(c => [c.id, c]))
  const assigned = new Set<string>()

  // ── Pass 0: Explicit parent_id ────────────────────────────────────────────
  for (const c of cloned) {
    const pid = (c as any).parent_id
    if (!pid) continue
    const parent = byId.get(pid)
    if (!parent || parent.id === c.id) continue
    // Still respect NEVER_BE_PARENT even for explicit parent_id
    if (NEVER_BE_PARENT.has(parent.type)) continue
    parent.children!.push(c)
    assigned.add(c.id)
  }

  // ── Geometry-based passes (only for unassigned components) ────────────────

  const partialContainers = cloned
    .filter(c =>
      CONTAINER_TYPES.has(c.type) &&
      !NEVER_BE_PARENT.has(c.type) &&          // ← extra safety guard
      getComponentWidth(c) > 0 &&
      getComponentWidth(c) < 1800 &&
      getComponentHeight(c) > 0
    )
    .sort((a, b) =>
      (getComponentWidth(a) * getComponentHeight(a)) -
      (getComponentWidth(b) * getComponentHeight(b))
    )

  const fullWidthContainers = cloned
    .filter(c =>
      CONTAINER_TYPES.has(c.type) &&
      !NEVER_BE_PARENT.has(c.type) &&          // ← extra safety guard
      getComponentWidth(c) >= 1800 &&
      getComponentHeight(c) > 0
    )
    .sort((a, b) => getComponentHeight(a) - getComponentHeight(b))

  // Pass 1: partial containers — full 2D overlap, ALL element types
  for (const c of cloned) {
    if (assigned.has(c.id)) continue
    const parent = partialContainers.find(p => p.id !== c.id && isInsideBounds(c, p))
    if (parent) {
      parent.children!.push(c)
      assigned.add(c.id)
    }
  }

  // Pass 2: full-width section containers — Y-band only, containers only
  for (const c of cloned) {
    if (assigned.has(c.id)) continue
    if (CONTAINER_TYPES.has(c.type)) continue
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
    parent_id: (c as any).parent_id || "-",
    x: getComponentX(c),
    y: getComponentY(c),
    w: Math.round(getComponentWidth(c)),
    h: Math.round(getComponentHeight(c)),
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
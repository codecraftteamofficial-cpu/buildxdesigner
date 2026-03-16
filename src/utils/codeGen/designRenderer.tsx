/**
 * Design Renderer - Converts component structure to HTML that matches the canvas design
 * Ensures index.html renders exactly what the user sees in the design panel
 */

import type { ComponentData } from "../../App"

export class DesignRenderer {
  /**
   * Generate HTML that renders the actual user design
   */
  generateDesignHTML(components: ComponentData[], pageTitle = "My Design"): string {
    const sortedComponents = this.sortByVisualOrder(components)
    const componentHTML = sortedComponents.map((comp) => this.renderComponent(comp)).join("\n")

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <link rel="stylesheet" href="./css/index.css">
  <link rel="stylesheet" href="./global.css">
</head>
<body>
  <div id="app" class="design-container">
${componentHTML}
  </div>
  <script src="./js/index.js"></script>
  <script src="./utilities.js"></script>
</body>
</html>`
  }

  /**
   * Sort components by visual position (top to bottom, left to right)
   */
  private sortByVisualOrder(components: ComponentData[]): ComponentData[] {
    return [...components].sort((a, b) => {
      const aY = (a.position?.y || 0) + (a.props?.top || 0)
      const bY = (b.position?.y || 0) + (b.props?.top || 0)
      const aX = (a.position?.x || 0) + (a.props?.left || 0)
      const bX = (b.position?.x || 0) + (b.props?.left || 0)

      if (Math.abs(aY - bY) > 20) return aY - bY
      return aX - bX
    })
  }

  /**
   * Render individual component with exact styling
   */
  private renderComponent(comp: ComponentData): string {
    const style = this.generateInlineStyles(comp)
    const id = `comp-${comp.id}`
    const className = `component ${comp.type}`

    switch (comp.type) {
      case "container":
        return `    <div id="${id}" class="${className}" style="${style}">
      ${comp.children?.map((c: ComponentData) => this.renderComponent(c)).join("\n") || ""}
    </div>`

      case "text":
        const text = comp.props?.text || "Text content"
        const fontSize = comp.props?.fontSize || 16
        const color = comp.props?.color || "#000000"
        return `    <p id="${id}" class="${className}" style="${style}; font-size: ${fontSize}px; color: ${color};">${text}</p>`

      case "button":
        const buttonText = comp.props?.text || "Button"
        const bgColor = comp.props?.backgroundColor || "#007bff"
        return `    <button id="${id}" class="${className}" style="${style}; background-color: ${bgColor};">${buttonText}</button>`

      case "image":
        const src =
          comp.props?.src ||
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23ddd' width='200' height='150'/%3E%3C/svg%3E"
        return `    <img id="${id}" class="${className}" src="${src}" style="${style}" alt="${comp.props?.alt || "Image"}">`

      case "header":
        return `    <header id="${id}" class="${className}" style="${style}">
      ${comp.children?.map((c: ComponentData) => this.renderComponent(c)).join("\n") || ""}
    </header>`

      case "footer":
        return `    <footer id="${id}" class="${className}" style="${style}">
      ${comp.children?.map((c: ComponentData) => this.renderComponent(c)).join("\n") || ""}
    </footer>`

      case "section":
        return `    <section id="${id}" class="${className}" style="${style}">
      ${comp.children?.map((c: ComponentData) => this.renderComponent(c)).join("\n") || ""}
    </section>`

      default:
        return `    <div id="${id}" class="${className}" style="${style}"></div>`
    }
  }

  /**
   * Generate inline CSS from component properties
   */
  private generateInlineStyles(comp: ComponentData): string {
    const styles: string[] = []
    const compStyle = comp.style || {}

    // Positioning
    if (comp.position?.x) styles.push(`left: ${comp.position.x}px`)
    if (comp.position?.y) styles.push(`top: ${comp.position.y}px`)

    // Dimensions
    if (comp.props?.width) styles.push(`width: ${comp.props.width}`)
    if (comp.props?.height) styles.push(`height: ${comp.props.height}`)

    // Spacing
    if (comp.props?.padding) styles.push(`padding: ${comp.props.padding}`)
    if (comp.props?.margin) styles.push(`margin: ${comp.props.margin}`)

    // Background handling logic
    const hasValidBackground = compStyle.background && compStyle.background !== "none"
    if (hasValidBackground) {
      styles.push(`background: ${compStyle.background}`)
    } else {
      const bgColor = compStyle.backgroundColor || compStyle["background-color"] || comp.props?.backgroundColor
      if (bgColor) styles.push(`background-color: ${bgColor}`)
    }

    // Colors & Border
    if (comp.props?.borderColor) styles.push(`border-color: ${comp.props.borderColor}`)
    if (comp.props?.border) styles.push(`border: ${comp.props.border}`)
    if (comp.props?.borderRadius) styles.push(`border-radius: ${comp.props.borderRadius}`)

    // Additional custom styles (ignoring already handled background properties)
    if (comp.style) {
      Object.entries(comp.style).forEach(([key, value]) => {
        // Skip already handled or empty values
        if (["background", "backgroundColor", "background-color"].includes(key)) return
        if (value === undefined || value === null || value === "") return

        // Convert camelCase to kebab-case for CSS
        const kebabKey = key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
        styles.push(`${kebabKey}: ${value}`)
      })
    }

    return styles.join("; ")
  }
}

export const createDesignRenderer = () => new DesignRenderer()

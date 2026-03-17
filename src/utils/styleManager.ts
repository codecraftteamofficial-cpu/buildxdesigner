/**
 * Style Manager - Converts component properties to CSS
 * This utility handles the conversion of design panel changes to CSS styles
 */

import type { ComponentData } from "../App"

export interface StyleConfig {
  id: string
  className: string
  styles: Record<string, any>
}

// Default styles per component type to pre-fill the Custom CSS editor
// This provides a starting point that matches the component's visual look
export const COMPONENT_DEFAULTS: Record<string, Record<string, any>> = {
  text: {
    fontSize: '16px',
    color: '#1e293b',
    textAlign: 'left',
    lineHeight: '1.5',
    marginBottom: '16px'
  },
  heading: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '24px',
    lineHeight: '1.2'
  },
  button: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  divider: {
    width: '100%',
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '32px 0'
  },
  container: {
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    minHeight: '100px'
  },
  navbar: {
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  hero: {
    padding: '80px 40px',
    backgroundColor: '#f8fafc',
    textAlign: 'center',
    borderRadius: '16px'
  },
  footer: {
    padding: '40px 24px',
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    textAlign: 'center'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    width: '100%'
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    width: '100%',
    minHeight: '100px'
  },
  accordion: {
    width: '100%',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  tabs: {
    width: '100%',
    borderBottom: '1px solid #e2e8f0'
  },
  modal: {
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    maxWidth: '500px'
  },
  alert: {
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
    width: '100%',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe'
  },
  form: {
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    width: '100%'
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    width: '100%',
    backgroundColor: '#ffffff'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1'
  },
  'radio-group': {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  'image': {
    width: '300px',
    height: '200px',
    borderRadius: '8px',
    objectFit: 'cover'
  },
  'carousel': {
    width: '100%',
    height: '300px',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  'table': {
    width: '100%',
    borderCollapse: 'collapse',
    border: '1px solid #e2e8f0'
  },
  'sign-in': {
    width: '400px',
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },
  'sign-up': {
    width: '400px',
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },
  'auth-block': {
    width: '400px',
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },
  'profile': {
    width: '50px',
    height: '50px',
    borderRadius: '50%'
  },
  'paymongo-button': {
    padding: '10px 20px',
    backgroundColor: '#00c3b2',
    color: '#ffffff',
    borderRadius: '6px',
    fontWeight: '600'
  },
  'grid': {
    display: 'grid',
    gap: '16px',
    padding: '16px'
  },
  'card': {
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  'section-heading': {
    padding: '40px 0',
    textAlign: 'center'
  },
  'paragraph': {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#334155',
    marginBottom: '16px'
  },
  'gallery': {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    padding: '16px'
  },
  'group': {
    display: 'flex',
    gap: '16px',
    padding: '16px'
  }
};

// Convert camelCase to kebab-case
export const toKebab = (str: string): string => {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
}

// Convert style object to CSS string for pre-filling the Custom CSS editor
export const styleToCss = (style: Record<string, any>, selector?: string, componentType?: string): string => {
  if (!style || typeof style !== "object") return ""

  // Merge with defaults if provided
  const baseStyle = componentType && COMPONENT_DEFAULTS[componentType] 
    ? { ...COMPONENT_DEFAULTS[componentType], ...style }
    : style;

  const props = Object.entries(baseStyle)
    .filter(([key, value]) => {
      // Filter out internal properties or undefined/null
      if (value === undefined || value === null || value === "") return false
      if (key.startsWith('_')) return false
      return true
    })
    .map(([key, value]) => {
      const cssKey = toKebab(key)
      let cssValue = String(value)

      // Add px to numeric values that typically need them
      const needsPx = /^(width|height|margin|padding|top|left|right|bottom|fontSize|borderRadius|borderWidth)/i.test(key);
      if (needsPx && !isNaN(Number(value)) && String(value).trim() !== "" && value !== 0 && !String(value).includes('px') && !String(value).includes('%') && !String(value).includes('rem') && !String(value).includes('em')) {
        cssValue = `${value}px`;
      }

      // Handle simple conversion for alignment names if they aren't standard
      if (key === 'textAlign') {
        if (value === 'center') cssValue = 'center';
        if (value === 'left') cssValue = 'left';
        if (value === 'right') cssValue = 'right';
      }

      return selector ? `  ${cssKey}: ${cssValue};` : `${cssKey}: ${cssValue};`
    })
    .filter((s) => s.length > 0)
    .join(selector ? "\n" : " ")

  if (!props) return ""

  const header = `/* 
 * Custom CSS for this ${componentType || 'component'}.
 * You can edit these default styles below.
 * Tip: Most properties are pre-filled for your convenience.
 */\n\n`;

  return selector ? `${header}${selector} {\n${props}\n}` : props
}

// Generate CSS for all components
export const generateComponentCSS = (components: ComponentData[]): string => {
  const baseStyles = `/* ============================================
   Reset & Base Styles
   ============================================ */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f8fafc;
  overflow-x: hidden;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* ============================================
   Base Component Styles
   ============================================ */
.btn {
  padding: 10px 16px;
  border-radius: 8px;
  border: 0;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #64748b;
  color: white;
}

.btn-secondary:hover {
  background: #475569;
}

.heading {
  font-size: clamp(1.25rem, 2.5vw, 2rem);
  margin: 0 0 16px;
  font-weight: 600;
  line-height: 1.2;
}

.subheading {
  font-size: clamp(0.875rem, 1.5vw, 1.25rem);
  font-weight: 500;
  color: #666;
}

.card {
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.text {
  margin: 0 0 12px;
  line-height: 1.6;
  color: #444;
}

.input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.navbar {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.navbar-brand {
  font-size: 18px;
  font-weight: 600;
  color: #111;
}

.navbar-links {
  list-style: none;
  display: flex;
  gap: 32px;
}

.navbar-links a {
  color: #666;
  text-decoration: none;
  transition: color 0.2s ease;
}

.navbar-links a:hover {
  color: #111;
}

/* ============================================
   Utility Classes
   ============================================ */
.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.gap-2 {
  gap: 8px;
}

.gap-4 {
  gap: 16px;
}

.gap-8 {
  gap: 32px;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.justify-center {
  justify-content: center;
}

.mt-4 {
  margin-top: 16px;
}

.mb-4 {
  margin-bottom: 16px;
}

.p-4 {
  padding: 16px;
}

.rounded {
  border-radius: 8px;
}

.shadow {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.hidden {
  display: none;
}

.visible {
  display: block;
}

/* ============================================
   Component-Specific Styles
   ============================================ */`

  const componentStyles = components
    .map((comp) => {
      const className = comp.props?.className || `component-${comp.type}-${comp.id || Math.random()}`

      if (comp.style && typeof comp.style === "object") {
        const cssProps = styleToCss(comp.style)
        if (cssProps) {
          return `.${className} {\n  ${cssProps.replace(/; /g, ";\n  ")}\n}`
        }
      }

      return ""
    })
    .filter((s) => s.length > 0)
    .join("\n\n")

  return `${baseStyles}

${componentStyles || "/* Add component-specific styles here */"}`
}

// Generate responsive CSS media queries
export const generateResponsiveCSS = (): string => {
  return `
/* ============================================
   Responsive Design
   ============================================ */
@media (max-width: 768px) {
  .container {
    padding: 16px;
  }

  .navbar {
    flex-direction: column;
    gap: 16px;
  }

  .navbar-links {
    flex-direction: column;
    gap: 16px;
  }

  .grid {
    grid-template-columns: 1fr !important;
  }

  .heading {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .container {
    padding: 12px;
  }

  .btn {
    width: 100%;
  }

  .card {
    padding: 12px;
  }
}
`
}

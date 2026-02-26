// lib/code-generator.ts
import { ComponentData } from "../App"

export const slugify = (value: string) => 
  value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "page";

const camelToKebab = (value: string): string => 
  value.replace(/([A-Z])/g, "-$1").toLowerCase();

const isUnitless = (key: string) => 
  ["opacity", "zIndex", "fontWeight", "lineHeight", "flex", "order"].includes(key);

const toCssRule = (style: Record<string, any> = {}): string =>
  Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => {
      const unit = typeof value === "number" && !isUnitless(key) ? "px" : "";
      return `  ${camelToKebab(key)}: ${value}${unit};`;
    })
    .join("\n");

const renderComponentToPHP = (component: ComponentData, depth = 0): string => {
  const indent = "  ".repeat(depth);
  const props = component.props ?? {};
  const className = props.className || `comp-${component.id.slice(0, 5)}`;
  const idAttr = component.type === "button" ? ` id="btn-${component.id.slice(0, 5)}"` : "";
  const childOutput = (component.children ?? []).map((child) => renderComponentToPHP(child, depth + 1)).join("\n");

  switch (component.type) {
    case "heading": return `${indent}<h1 class="${className}">${props.content || "Heading"}</h1>`;
    case "text": return `${indent}<p class="${className}">${props.content || "Text"}</p>`;
    case "button": return `${indent}<button${idAttr} class="${className}">${props.content || "Button"}</button>`;
    case "image": return `${indent}<img src="${props.src || ""}" class="${className}" alt="image" />`;
    default: return `${indent}<div class="${className}">\n${childOutput || `${indent}  ${component.type}`}\n${indent}</div>`;
  }
};

const generatePageJS = (components: ComponentData[], pageName: string): string => {
  const buttons = components.filter(c => c.type === "button");
  const listeners = buttons.map(btn => {
    const id = `btn-${btn.id.slice(0, 5)}`;
    return `// Event listener for ${btn.props?.content || 'Button'}\ndocument.getElementById('${id}')?.addEventListener('click', () => {\n  console.log('${id} clicked!');\n});`;
  }).join("\n\n");

  return `document.addEventListener('DOMContentLoaded', () => {\n  console.log("${pageName} page loaded");\n\n  ${listeners || '// No interactive components.'}\n});`;
};

export const generateProjectFiles = (components: ComponentData[], pages: any[], projectName: string) => {
  const files: Record<string, string> = {
    "public/index.php": `<?php require_once __DIR__ . '/../app/views/layout.php'; ?>`,
    "app/views/layout.php": `<?php // Global Layout for ${projectName} ?>`,
    "public/assets/css/styles.css": `/* Global Styles */\n.canvas-container { position: relative; min-height: 100vh; }`,
    "config/database.php": `<?php\nreturn [\n    'db_host' => 'db.supabase.co',\n    'db_name' => 'postgres',\n];`,
    "README.md": `# ${projectName}\nGenerated PHP Project.`,
  };

  pages.forEach((page, index) => {
    const fileName = slugify(page.name);

    // FIX: More robust filtering logic
    const pageComponents = components.filter(c => {
      const isExplicitMatch = c.page_id === page.id;
      const isGlobal = c.page_id === 'all';
      // If component has no page_id, assign it to 'home' OR the very first page in the list
      const isDefaultHome = !c.page_id && (page.id === 'home' || index === 0);
      
      return isExplicitMatch || isGlobal || isDefaultHome;
    });

    // VIEW GENERATION
    files[`app/views/${fileName}.php`] = `<?php\n/** View for ${page.name} **/\n?>\n<link rel="stylesheet" href="assets/css/${fileName}.css">\n<div class="canvas-container">\n${
      pageComponents.length > 0 
        ? pageComponents.map(c => renderComponentToPHP(c, 1)).join("\n") 
        : "  "
    }\n</div>\n<script src="assets/js/${fileName}.js"></script>`;
    
    // CSS GENERATION
    files[`public/assets/css/${fileName}.css`] = pageComponents
      .filter(c => c.style && Object.keys(c.style).length > 0)
      .map(c => `.${c.props?.className || `comp-${c.id.slice(0, 5)}`} {\n${toCssRule(c.style)}\n}`)
      .join("\n\n");
      
    // JS GENERATION
    files[`public/assets/js/${fileName}.js`] = generatePageJS(pageComponents, page.name);
  });

  return files;
};
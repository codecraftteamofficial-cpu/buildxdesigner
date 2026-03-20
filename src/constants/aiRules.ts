export const AI_JAVASCRIPT_RULES = `
IMPORTANT JAVASCRIPT IMPLEMENTATION RULES:
- MANDATORY: Wrap ALL JavaScript logic in a Self-Invoking Function (IIFE): (function() { ... })();
- Do NOT use document.addEventListener('DOMContentLoaded', ...) or any similar global load listeners.
- Ensure all variables are scoped inside the IIFE to prevent conflicts with other components.
- Ensure JavaScript works in both preview mode and published sites.
- Code should be self-contained and not rely on external dependencies or global events.
- ALWAYS use enhanced DOM querying functions provided in custom component environment:
  - Use $('selector') instead of document.getElementById('selector') or document.querySelector('selector')
  - Use $$('selector') instead of document.querySelectorAll('selector')
- Use onclick instead of addEventListener('click', ...) for better compatibility.
- When using $$('selector'), use a standard 'for loop' or 'Array.from().forEach()' to ensure logic applies to all instances of a component on the canvas.
- NEVER use document.body or body tag in custom components - it breaks CSS and component isolation.
- Always include console.log statements for debugging.
- Check if elements exist before attaching event listeners.

STRICT ISOLATION RULES:
- NEVER attempt to access or modify elements outside of your component.
- NEVER use window.parent, window.top, or document.body to append elements.
- All DOM manipulations MUST happen within the component's root element (using $ or $$).
- If you need a modal or overlay, create it INSIDE your component's HTML structure and toggle its visibility.

EXAMPLE JAVASCRIPT PATTERN:
(function() {
  const elements = $$('.your-class');
  console.log('Found elements:', elements.length);
  for (let i = 0; i < elements.length; i++) {
    elements[i].onclick = () => { console.log('Clicked!'); };
  }
})();
`;

export const AI_COMMON_RULES = `
IMPORTANT CANVAS DIMENSIONS:
- The canvas has a FIXED width of 1920px - this will never change
- All components should be designed for 1920px width
- Do not use responsive breakpoints or fluid layouts that assume variable widths
- Design for desktop-first with 1920px as the base width

USER PHRASE RECOGNITION:
- "fit to canvas" or "fit to 1920 width" means the user wants the component to be exactly 1920px wide
- "javascript functions are not working" or "buttons not working" means you need to fix JavaScript event handlers
- When users report JavaScript functionality issues, ensure all event handlers use onclick and proper DOM queries
- Always test that buttons, forms, and interactive elements work in the preview environment
- For canvas fitting, ensure the main container or wrapper has width: 1920px
`;

export const DEFAULT_CUSTOM_COMPONENT_JS = `(function() {
  console.log('Component loaded');
  
  // Use $$ to select all similar elements within your component
  const buttons = $$('.your-button-class');
  
  if (buttons.length > 0) {
    for (let i = 0; i < buttons.length; i++) {
       buttons[i].onclick = function() {
         console.log('Button clicked:', i);
       };
    }
  }
})();`;

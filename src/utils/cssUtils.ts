/**
 * CSS Utilities for the editor
 */

/**
 * Scopes CSS rules by prefixing all selectors with a given prefix.
 * This is used to prevent custom CSS from leaking into the global scope.
 * 
 * @param css The raw CSS string
 * @param prefix The prefix to prepend (e.g., ".component-scope-123")
 * @returns Scoped CSS string
 */
export function scopeCss(css: string, prefix: string): string {
  if (!css || !prefix) return css;

  // Remove comments
  const cleanCss = css.replace(/\/\*[\s\S]*?\*\//g, '');

  let result = '';
  let depth = 0;
  let buffer = '';
  let atRuleStack: string[] = [];

  for (let i = 0; i < cleanCss.length; i++) {
    const char = cleanCss[i];

    if (char === '{') {
      const trimmedBuffer = buffer.trim();
      if (trimmedBuffer.startsWith('@')) {
        // It's an @rule (media, keyframes, etc.)
        atRuleStack.push(trimmedBuffer);
        result += trimmedBuffer + ' {';
      } else {
        // It's a selector
        const isInsideMedia = atRuleStack.some(rule => rule.toLowerCase().startsWith('@media'));
        const isInsideKeyframes = atRuleStack.some(rule => rule.toLowerCase().startsWith('@keyframes'));
        
        // Only prefix if we are at top level OR inside a media query
        // Don't prefix inside keyframes (0%, 100%, from, to)
        if ((depth === 0 || isInsideMedia) && !isInsideKeyframes) {
          const scopedSelector = trimmedBuffer
            .split(',')
            .map(s => {
              const sel = s.trim();
              if (!sel) return '';
              // If it already starts with the prefix, don't double prefix
              if (sel.startsWith(prefix)) return sel;
              
              // Handle root tags like html and body
              // We replace them with the prefix to target the actual component container
              const rootPattern = /^(html|body)\b/i;
              if (rootPattern.test(sel)) {
                const replaced = sel.replace(rootPattern, prefix);
                return replaced;
              }
              
              return `${prefix} ${sel}`;
            })
            .filter(Boolean)
            .join(', ');
          result += scopedSelector + ' {';
        } else {
          result += trimmedBuffer + ' {';
        }
      }
      buffer = '';
      depth++;
    } else if (char === '}') {
      result += buffer + '}';
      buffer = '';
      depth--;
      if (atRuleStack.length > 0 && depth < atRuleStack.length) {
        atRuleStack.pop();
      }
    } else if (char === ';' && depth === 0) {
      // Handle rules that end in semicolons like @import
      result += buffer + ';';
      buffer = '';
    } else {
      buffer += char;
    }
  }

  // Append any remaining buffer
  result += buffer;

  return result;
}

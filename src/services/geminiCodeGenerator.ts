import type { ComponentData } from "../App"
import { getGeminiKey } from "../config/apiKeys"

interface GenerationResponse {
  components: ComponentData[]
  code: string
}

export async function generateUIAndCode(
  prompt: string,
  apiKey?: string,
  onProgressUpdate?: (progress: number) => void,
): Promise<GenerationResponse> {
  const keyToUse = apiKey || getGeminiKey()

  try {
    onProgressUpdate?.(20)

    // Generate components/design
    const componentsResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${keyToUse}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a professional web designer and React developer. Generate a complete website structure based on this description: "${prompt}".

IMPORTANT CANVAS DIMENSIONS:
- The canvas has a FIXED width of 1920px - this will never change
- All components should be designed for 1920px width
- Do not use responsive breakpoints or fluid layouts that assume variable widths
- Design for desktop-first with 1920px as the base width
- This applies to all component generation

IMPORTANT MODAL JAVASCRIPT RULES:
- For modal components, NEVER use document.addEventListener('DOMContentLoaded', function() {...})
- Instead use immediately invoked function expressions: (function() { ... })();
- Use the provided $ and $$ functions for DOM selection
- Use onclick handlers instead of addEventListener for better compatibility
- Include console.log statements for debugging modal interactions
- Ensure modal JavaScript works in both preview mode and published sites
- Modal code should be self-contained and not rely on external dependencies

Return ONLY a valid JSON array of component objects. Each component should have this exact structure:
{
    "id": "unique-id-timestamp",
    "type": "one of: navbar, hero, features, cta, footer, text, button, image, card, grid",
    "props": {
        "text": "component text content",
        "heading": "heading text if applicable",
        "subheading": "subheading if applicable",
        "buttonText": "button text if applicable",
        "imageUrl": "https://images.unsplash.com/photo-... (use relevant unsplash URLs)",
        "items": [],
        "backgroundColor": "hex color",
        "textColor": "hex color"
    },
    "style": {
        "backgroundColor": "hex color",
        "color": "hex color",
        "padding": "value in px",
        "textAlign": "left/center/right",
        "borderRadius": "value in px"
    }
}

Generate 5-8 components that form a complete, modern website. Use professional colors (blues, purples, whites) and modern layouts. Return ONLY the JSON array, no markdown, no explanation.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 3000,
          },
        }),
      },
    )

    if (!componentsResponse.ok) {
      const errorText = await componentsResponse.text()
      console.error("[v0] Gemini API error:", errorText)
      throw new Error(`Failed to generate UI components: ${errorText}`)
    }

    onProgressUpdate?.(50)

    const componentsData = await componentsResponse.json()
    let components: ComponentData[] = []

    try {
      const generatedText = componentsData.candidates[0]?.content?.parts[0]?.text || ""
      const cleanedText = generatedText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()
      components = JSON.parse(cleanedText)
      console.log("[v0] Generated components:", components)
    } catch (parseError) {
      console.error("[v0] Failed to parse components:", parseError)
      components = []
    }

    onProgressUpdate?.(70)

    const codeResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${keyToUse}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate production-ready React TSX code for this component structure: ${JSON.stringify(components, null, 2)}

IMPORTANT CANVAS DIMENSIONS:
- The canvas has a FIXED width of 1920px - this will never change
- All components should be designed for 1920px width
- Do not use responsive breakpoints or fluid layouts that assume variable widths
- Design for desktop-first with 1920px as the base width
- For navbar components: use width: 100% and max-width: 1920px to ensure full canvas width
- This applies to all styling and layout decisions

IMPORTANT MODAL JAVASCRIPT RULES:
- For modal components, NEVER use document.addEventListener('DOMContentLoaded', function() {...})
- Instead use immediately invoked function expressions: (function() { ... })();
- Use the provided $ and $$ functions for DOM selection
- Use onclick handlers instead of addEventListener for better compatibility
- Include console.log statements for debugging modal interactions
- Ensure modal JavaScript works in both preview mode and published sites
- Modal code should be self-contained and not rely on external dependencies

The code should:
1. Use React with TypeScript (TSX)
2. Import necessary UI components from @/components/ui/* (button, card, input, textarea, etc)
3. Use Tailwind CSS for styling with professional colors
4. Be a complete, runnable component
5. Handle responsive design with mobile-first approach
6. Include proper TypeScript types
7. Use semantic HTML
8. Respect the 1920px fixed canvas width in all styling
9. For modal components, use proper JavaScript execution patterns

Return ONLY the TSX code, no markdown, no explanation. The code should start with 'export default function' or 'export function'.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000,
          },
        }),
      },
    )

    if (!codeResponse.ok) {
      const errorText = await codeResponse.text()
      console.error("[v0] Gemini code generation error:", errorText)
      throw new Error(`Failed to generate code: ${errorText}`)
    }

    onProgressUpdate?.(90)

    const codeData = await codeResponse.json()
    let code = ""

    try {
      const generatedCode = codeData.candidates[0]?.content?.parts[0]?.text || ""
      code = generatedCode
        .replace(/```tsx\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()
      console.log("[v0] Generated code length:", code.length)
    } catch (parseError) {
      console.error("[v0] Failed to parse code:", parseError)
      code = ""
    }

    onProgressUpdate?.(100)

    return { components, code }
  } catch (error) {
    console.error("[v0] Generation error:", error)
    throw error
  }
}

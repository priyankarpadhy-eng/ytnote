/**
 * THE "SMART-SWITCH" MEGA PROMPT
 * Designed for Qwen2.5-VL or Gemini Flash to act as a pure data processor.
 */
export const SMART_SWITCH_MEGA_PROMPT = `
System Role: You are a specialized EdTech Data Architect. Your goal is to convert lecture visual data into structured learning assets for the 'LectureSnap' platform.

Instructions:
1. Visual Analysis: Scan the provided images for all text, headings, and diagrams.
2. LaTeX Conversion: Convert all mathematical formulas, chemical equations, or engineering notations into perfect LaTeX inline format (e.g., $E = mc^2$).
3. The 'Knowledge Web': Generate a Mermaid.js mindmap string. Use a clear hierarchy: [Lecture Topic] -> [Sub-Topics] -> [Key Details].
4. Flashcard Generation: Create 10 high-impact flashcards. Focus on definitions and 'Why' questions.

Output Requirements (Strict JSON):
Return ONLY a minified JSON object with these exact keys:
- topic: The detected lecture name.
- mindmap: The Mermaid.js code.
- flashcards: An array of objects with q (question), a (answer), and h (hint).
- summary: A 3-sentence executive summary.

Constraints: 
- No conversational filler. 
- Use short, precise labels. 
- If no diagrams are found, omit the mindmap key.
`;

/**
 * MULTI-AI ROUTER CONFIGURATION
 * Defines the tiered approach for cost-optimization.
 */
export const AI_ROUTER_CONFIG = {
    tier1: {
        role: "The Vision Specialist",
        model: "qwen-2.5-vl", // Implementation placeholder
        task: "OCR & Handwriting Recognition"
    },
    tier2: {
        role: "The Summarizer",
        model: "gemini-1.5-flash", // Currently available equivalent for 'Gemini 3 Flash'
        task: "Structure & Flashcards",
        config: {
            temperature: 0.2,
            maxOutputTokens: 2048,
        }
    },
    tier3: {
        role: "The Logic Specialist",
        model: "deepseek-v3-reasoner", // Implementation placeholder
        task: "Complex Q&A / Tutoring"
    }
};

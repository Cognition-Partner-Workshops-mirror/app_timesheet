/**
 * AI service module.
 * Supports both OpenAI and Groq (OpenAI-compatible) backends.
 * Auto-detects provider from the API key prefix:
 *   - gsk_ → Groq (uses llama-3.3-70b-versatile)
 *   - sk-  → OpenAI (uses gpt-4o)
 */
const OpenAI = require('openai');

// Detect provider from API key prefix
const apiKey = process.env.OPENAI_API_KEY || '';
const isGroq = apiKey.startsWith('gsk_');

const openai = new OpenAI({
  apiKey,
  ...(isGroq ? { baseURL: 'https://api.groq.com/openai/v1' } : {}),
});

// Model selection based on provider
const MODEL = isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o';

/**
 * Sends a chat completion request with the given system prompt and user message.
 * Returns the parsed JSON response or raw text depending on expectJson flag.
 * @param {string} systemPrompt - Instructions for the AI's behavior
 * @param {string} userMessage - The user's input/query
 * @param {boolean} expectJson - Whether to parse the response as JSON
 * @returns {Promise<object|string>} AI response
 */
async function chatCompletion(systemPrompt, userMessage, expectJson = true) {
  try {
    // Groq doesn't support response_format, so we instruct via prompt instead
    const jsonInstruction = expectJson && isGroq
      ? '\n\nIMPORTANT: You MUST respond with valid JSON only. No markdown, no code fences, no extra text.'
      : '';

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt + jsonInstruction },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 4096,
      ...(!isGroq && expectJson ? { response_format: { type: 'json_object' } } : {}),
    });

    const content = response.choices[0]?.message?.content || '';

    if (expectJson) {
      // Strip markdown code fences if present (common with Groq/Llama)
      let cleaned = content
        .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
        .trim();

      // Attempt 1: direct parse
      try {
        return JSON.parse(cleaned);
      } catch (_e1) { /* fall through */ }

      // Attempt 2: extract the first { ... } or [ ... ] block from the response
      const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch (_e2) {
          // Attempt 3: sanitize control characters inside JSON string values
          // by replacing raw newlines/tabs within quoted strings
          let sanitized = jsonMatch[1];
          // Replace unescaped control chars: walk through and fix inside strings
          sanitized = sanitized.replace(/("(?:[^"\\])*(?:\\.[^"\\])*")/g, (m) => {
            return m; // regex already handles escaped chars
          });
          // Brute force: replace all literal newlines inside strings by finding
          // content between quotes that contains raw newlines
          const parts = [];
          let inString = false;
          let escaped = false;
          for (let i = 0; i < sanitized.length; i++) {
            const ch = sanitized[i];
            if (escaped) { parts.push(ch); escaped = false; continue; }
            if (ch === '\\' && inString) { parts.push(ch); escaped = true; continue; }
            if (ch === '"') { inString = !inString; parts.push(ch); continue; }
            if (inString && ch === '\n') { parts.push('\\n'); continue; }
            if (inString && ch === '\r') { parts.push('\\r'); continue; }
            if (inString && ch === '\t') { parts.push('\\t'); continue; }
            parts.push(ch);
          }
          try {
            return JSON.parse(parts.join(''));
          } catch (_e3) {
            console.error('JSON parse failed. Raw (first 500 chars):', content.substring(0, 500));
            throw _e3;
          }
        }
      }

      // No JSON object found — throw with helpful message
      throw new Error('No valid JSON found in AI response');
    }
    return content;
  } catch (error) {
    console.error('AI API error:', error.message);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

module.exports = { openai, chatCompletion };

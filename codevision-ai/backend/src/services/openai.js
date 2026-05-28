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
      const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleaned);
    }
    return content;
  } catch (error) {
    console.error('AI API error:', error.message);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

module.exports = { openai, chatCompletion };

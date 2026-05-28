/**
 * OpenAI service module.
 * Provides a configured OpenAI client instance and helper functions
 * for interacting with GPT-4 for code analysis tasks.
 */
const OpenAI = require('openai');

// Initialize OpenAI client with API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Sends a chat completion request to GPT-4 with the given system prompt and user message.
 * Returns the parsed JSON response or raw text depending on expectJson flag.
 * @param {string} systemPrompt - Instructions for the AI's behavior
 * @param {string} userMessage - The user's input/query
 * @param {boolean} expectJson - Whether to parse the response as JSON
 * @returns {Promise<object|string>} AI response
 */
async function chatCompletion(systemPrompt, userMessage, expectJson = true) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 4096,
      ...(expectJson ? { response_format: { type: 'json_object' } } : {})
    });

    const content = response.choices[0]?.message?.content || '';

    if (expectJson) {
      return JSON.parse(content);
    }
    return content;
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

module.exports = { openai, chatCompletion };

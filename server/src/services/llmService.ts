import Groq from 'groq-sdk';
import { config } from '../config/env.js';
import { logger } from '../middleware/logger.js';
import type { LLMRestructuredContent, NewsStory } from '../types/index.js';

const groq = new Groq({ apiKey: config.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a professional Nepali news social media manager. Your job is to convert raw news headlines and metadata into engaging Facebook posts.

You will receive a news headline (usually in Nepali) along with its source, category, and severity. You MUST produce THREE versions of the Facebook post:

1. **NEPALI** (नेपाली): An engaging Facebook post entirely in Devanagari Nepali script. Include relevant emojis and 3-5 trending Nepali hashtags.

2. **ENGLISH**: A professional English version of the same news. Include relevant emojis and 3-5 English hashtags. 

3. **UNICODE** (Romanized Nepali): The same content written in Romanized Nepali (Nepali words written using English/Latin alphabet, e.g., "Inisa Bik prakarana: Adalatma abhiyog patra pes"). Include emojis and hashtags.

RULES:
- Keep posts factually accurate — NO hallucination or adding information not present in the original
- Use appropriate emojis that match the news tone (serious 🔴, positive ✅, breaking 🚨, sports ⚽, etc.)
- Keep each version between 100-280 characters for optimal Facebook engagement
- Add a "📰 Source: [source_name]" line at the end
- For serious/tragic news, use respectful tone — no excessive emojis
- Format hashtags at the end, separated by spaces
- Do NOT use markdown formatting — plain text only

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no code blocks):
{"nepali": "...", "english": "...", "unicode": "..."}`;

/**
 * Restructures a news story into three language variants using Groq LLM.
 * Includes retry logic with exponential backoff.
 */
export async function restructureNews(story: NewsStory): Promise<LLMRestructuredContent> {
  const userPrompt = `Convert this news into Facebook posts:

Title: ${story.title}
Source: ${story.source_name}
Category: ${story.category}
Severity: ${story.severity}
Language: ${story.language}
URL: ${story.url}
${story.summary ? `Summary: ${story.summary}` : ''}

Generate all three versions (nepali, english, unicode) as instructed.`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      logger.debug(`🤖 LLM restructuring attempt ${attempt}/3 for: "${story.title}"`);

      const completion = await groq.chat.completions.create({
        model: config.GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq LLM');
      }

      const parsed = JSON.parse(content) as LLMRestructuredContent;

      // Validate all three fields exist
      if (!parsed.nepali || !parsed.english || !parsed.unicode) {
        throw new Error('LLM response missing required language variants');
      }

      logger.info(`✅ LLM restructured: "${story.title.substring(0, 50)}..." → 3 language versions`);

      // Log token usage
      if (completion.usage) {
        logger.debug(
          `📊 Token usage — Prompt: ${completion.usage.prompt_tokens}, Completion: ${completion.usage.completion_tokens}, Total: ${completion.usage.total_tokens}`
        );
      }

      return parsed;
    } catch (error: any) {
      lastError = error;
      logger.warn(`⚠️ LLM attempt ${attempt} failed: ${error.message}`);

      if (attempt < 3) {
        const backoff = Math.pow(2, attempt) * 1000;
        logger.debug(`⏳ Retrying in ${backoff}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  logger.error(`❌ LLM restructuring failed after 3 attempts: ${lastError?.message}`);
  throw lastError || new Error('LLM restructuring failed');
}

export default { restructureNews };

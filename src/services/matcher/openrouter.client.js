/**
 * OpenRouter AI API Client
 * Manages HTTP communication, exponential backoff retries on rate-limits (HTTP 429),
 * header injection, error handling, and model routing.
 */

class OpenRouterClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || 'https://openrouter.ai/api/v1';
    this.defaultModel = options.model || 'openrouter/free';
    this.siteUrl = options.siteUrl || 'https://ghayth002.github.io/CareerForge-AI/';
    this.siteName = options.siteName || 'CareerForge AI Autonomous Engine';
    this.maxRetries = options.maxRetries || 3;
    this.initialRetryDelayMs = options.initialRetryDelayMs || 1500;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async completeChat(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured.');
    }

    const model = options.model || this.defaultModel;
    const temperature = options.temperature !== undefined ? options.temperature : 0.2;
    const maxRetries = options.maxRetries !== undefined ? options.maxRetries : this.maxRetries;

    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': this.siteUrl,
            'X-Title': this.siteName
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature,
            response_format: options.jsonFormat ? { type: 'json_object' } : undefined
          })
        });

        if (res.status === 429 || res.status >= 500) {
          attempt++;
          if (attempt > maxRetries) {
            const errText = await res.text().catch(() => '');
            throw new Error(`OpenRouter HTTP ${res.status} (Rate limited / Service unavailable): ${errText || res.statusText}`);
          }
          // Exponential backoff with random jitter
          const backoff = this.initialRetryDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500;
          await this.sleep(backoff);
          continue;
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`OpenRouter HTTP ${res.status}: ${errText || res.statusText}`);
        }

        const data = await res.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Malformed completion response from OpenRouter API.');
        }

        return data.choices[0].message.content.trim();

      } catch (err) {
        if (attempt >= maxRetries || !err.message.includes('429')) {
          throw err;
        }
        attempt++;
        const backoff = this.initialRetryDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500;
        await this.sleep(backoff);
      }
    }
  }
}

module.exports = OpenRouterClient;

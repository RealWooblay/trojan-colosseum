/**
 * AI-assisted oracle service that can be wired into prediction markets.
 * The oracle pulls public signals from the web, applies lightweight NLP
 * heuristics, and returns a verdict with confidence and supporting evidence.
 *
 * The public interface is intentionally lightweight so the caller can handle
 * persistence, scheduling, and any higher level workflow orchestration.
 */
export type OracleOutcome = 'YES' | 'NO' | 'INVALID' | 'PENDING';

export interface OutcomeOption {
  id: string;
  label: string;
  keywords?: string[];
}

export interface OutcomeRequest {
  marketId: string;
  question: string;
  resolutionCriteria?: string;
  resolutionDeadline?: Date | string;
  options: OutcomeOption[];
  locale?: string;
}

export interface OutcomeSignal {
  source: string;
  url: string;
  headline: string;
  snippet: string;
  publishedAt?: string;
  confidence: number;
}

export interface OutcomeVerdict {
  outcome: OracleOutcome;
  confidence: number;
  reasoning: string;
  decidedAt: string;
  signals: OutcomeSignal[];
}

export interface AiOracleConfig {
  /**
   * Optional custom fetch implementation (e.g. node-fetch with custom agent).
   */
  fetcher?: typeof fetch;
  /**
   * How many news items to inspect per query.
   */
  maxSignalsPerQuery?: number;
  /**
   * Minimum confidence score to return a resolved verdict.
   * If the best option is below this threshold the oracle reports PENDING.
   */
  resolutionThreshold?: number;
  /**
   * Optional logger interface; defaults to console.
   */
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
  /**
   * Optional OpenAI API key. Falls back to process.env.OPENAI_API_KEY.
   */
  openAiApiKey?: string;
  /**
   * OpenAI model used for verdict generation.
   */
  openAiModel?: string;
  /**
   * Override OpenAI base URL (useful for Azure/OpenAI-compatible endpoints).
   */
  openAiBaseUrl?: string;
  /**
   * Number of retries when calling OpenAI.
   */
  openAiMaxRetries?: number;
}

interface AggregatedScores {
  [optionId: string]: number;
}

const DEFAULT_CONFIG: Required<Pick<
  AiOracleConfig,
  'fetcher' | 'maxSignalsPerQuery' | 'resolutionThreshold' | 'logger'
>> = {
  fetcher: fetch,
  maxSignalsPerQuery: 8,
  resolutionThreshold: 0.6,
  logger: console,
};

type ResolvedAiOracleConfig = Required<Pick<
  AiOracleConfig,
  'fetcher' | 'maxSignalsPerQuery' | 'resolutionThreshold' | 'logger'
>> & {
  openAiApiKey?: string;
  openAiModel: string;
  openAiBaseUrl: string;
  openAiMaxRetries: number;
};

/**
 * DuckDuckGo and Google block direct scraping, but https://r.jina.ai acts as
 * a passthrough that returns the raw document. The endpoint used here does not
 * require API keys and keeps the implementation dependency-free.
 */
const GOOGLE_NEWS_RSS_BASE =
  'https://r.jina.ai/http://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q=';

export class AiOracle {
  private readonly config: ResolvedAiOracleConfig;

  constructor(config: AiOracleConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      openAiApiKey: config.openAiApiKey ?? process.env.OPENAI_API_KEY,
      openAiModel: config.openAiModel ?? process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
      openAiBaseUrl: config.openAiBaseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com',
      openAiMaxRetries: config.openAiMaxRetries ?? 2,
    };
  }

  /**
   * Public entry point used by market contracts or cron jobs.
   */
  async checkOutcome(request: OutcomeRequest): Promise<OutcomeVerdict> {
    const signals = await this.collectSignals(request);
    const scores = this.scoreSignals(request, signals);
    const heuristicVerdict = this.buildHeuristicVerdict(request, scores, signals);

    if (this.config.openAiApiKey && signals.length > 0) {
      try {
        const aiVerdict = await this.requestVerdictFromOpenAi(request, signals, heuristicVerdict);
        if (aiVerdict) {
          return aiVerdict;
        }
      } catch (error) {
        this.config.logger.warn?.(
          `[AiOracle] OpenAI verdict failed for market "${request.marketId}": ${(error as Error).message}`,
        );
      }
    }

    return heuristicVerdict;
  }

  private async collectSignals(request: OutcomeRequest): Promise<OutcomeSignal[]> {
    const queries = this.buildSearchQueries(request);
    const limitedSignals: OutcomeSignal[] = [];

    for (const query of queries) {
      try {
        const results = await this.fetchGoogleNewsSignals(query);
        for (const signal of results) {
          if (limitedSignals.length >= this.config.maxSignalsPerQuery * queries.length) {
            break;
          }
          limitedSignals.push(signal);
        }
      } catch (error) {
        this.config.logger.warn?.(
          `[AiOracle] Failed to fetch signals for query "${query}": ${(error as Error).message}`,
        );
      }
    }

    return limitedSignals;
  }

  private buildSearchQueries(request: OutcomeRequest): string[] {
    const base = [request.question.trim()];

    if (request.resolutionCriteria) {
      base.push(request.resolutionCriteria.trim());
    }

    const optionKeywords = request.options
      .flatMap((option) => option.keywords ?? [])
      .filter(Boolean);

    if (optionKeywords.length > 0) {
      base.push(optionKeywords.join(' '));
    }

    // Add the market id to differentiate identical questions across markets.
    base.push(request.marketId);

    return base;
  }

  private scoreSignals(
    request: OutcomeRequest,
    signals: OutcomeSignal[],
  ): AggregatedScores {
    const scores: AggregatedScores = Object.fromEntries(
      request.options.map((option) => [option.id, 0]),
    );

    for (const signal of signals) {
      for (const option of request.options) {
        const confidence = this.scoreSignalAgainstOption(signal, option);
        scores[option.id] += confidence;
      }
    }

    return scores;
  }

  private buildHeuristicVerdict(
    request: OutcomeRequest,
    scores: AggregatedScores,
    signals: OutcomeSignal[],
  ): OutcomeVerdict {
    const sorted = [...request.options]
      .map((option) => ({
        option,
        score: scores[option.id],
      }))
      .sort((a, b) => b.score - a.score);

    const top = sorted[0];
    const runnerUp = sorted[1];

    if (!top) {
      return {
        outcome: 'PENDING',
        confidence: 0,
        reasoning: 'No supporting signals were collected.',
        decidedAt: new Date().toISOString(),
        signals,
      };
    }

    const totalScore = Object.values(scores).reduce((sum, value) => sum + value, 0);
    const confidence = totalScore > 0 ? top.score / totalScore : 0;

    if (confidence < this.config.resolutionThreshold) {
      return {
        outcome: 'PENDING',
        confidence,
        reasoning:
          'Signals are inconclusive. Accumulate more data or escalate to a human reviewer.',
        decidedAt: new Date().toISOString(),
        signals,
      };
    }

    const conciseSignals = signals
      .filter((signal) => this.scoreSignalAgainstOption(signal, top.option) > 0)
      .slice(0, 3)
      .map((signal) => `${signal.headline} (${signal.source})`)
      .join('; ');

    const margin = runnerUp ? top.score - runnerUp.score : top.score;

    const reasoning = `Resolved to "${top.option.label}" with confidence ${confidence.toFixed(
      2,
    )}. Margin vs. next option: ${margin.toFixed(
      2,
    )}. Sample supporting signals: ${conciseSignals || 'none captured'}.`;

    // The caller is expected to map option IDs to market payouts.
    return {
      outcome: this.normalizeOutcomeLabel(top.option.label),
      confidence,
      reasoning,
      decidedAt: new Date().toISOString(),
      signals,
    };
  }

  private normalizeOutcomeLabel(label: string): OracleOutcome {
    const normalized = label.trim().toUpperCase();

    if (normalized.includes('YES')) return 'YES';
    if (normalized.includes('NO')) return 'NO';
    if (normalized.includes('INVALID')) return 'INVALID';

    return 'PENDING';
  }

  private scoreSignalAgainstOption(
    signal: OutcomeSignal,
    option: OutcomeOption,
  ): number {
    const headline = `${signal.headline} ${signal.snippet}`.toLowerCase();
    const keywords = option.keywords ?? [];

    if (keywords.length === 0) {
      return 0;
    }

    let score = 0;

    for (const keyword of keywords) {
      const trimmed = keyword.trim().toLowerCase();
      if (!trimmed) continue;

      const occurrences = headline.split(trimmed).length - 1;
      score += occurrences > 0 ? occurrences : 0;
    }

    // Weight by the crawler confidence for extra signal.
    return score * (signal.confidence || 1);
  }

  private async fetchGoogleNewsSignals(query: string): Promise<OutcomeSignal[]> {
    const url = `${GOOGLE_NEWS_RSS_BASE}${encodeURIComponent(query)}`;
    const response = await this.config.fetcher(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; AiOracleBot/1.0; +https://example.com/oracle)',
      },
    });

    if (!response.ok) {
      throw new Error(`Unexpected status ${response.status}`);
    }

    const xml = await response.text();
    return this.parseGoogleNewsRss(xml);
  }

  private parseGoogleNewsRss(xml: string): OutcomeSignal[] {
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

    return items.map((match) => {
      const rawItem = match[1];

      const headline = this.extractTag(rawItem, 'title');
      const link = this.extractTag(rawItem, 'link');
      const pubDate = this.extractTag(rawItem, 'pubDate');
      const description = this.extractTag(rawItem, 'description');
      const cleanedDescription = description.replace(/<!\[CDATA\[|\]\]>/g, '').trim();

      return {
        source: this.extractSourceFromLink(link),
        url: link,
        headline: headline.replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
        snippet: this.stripHtml(cleanedDescription).slice(0, 280),
        publishedAt: pubDate,
        confidence: this.estimateSignalConfidence(cleanedDescription),
      };
    });
  }

  private extractTag(fragment: string, tag: string): string {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = fragment.match(regex);
    return match?.[1] ?? '';
  }

  private stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  private extractSourceFromLink(link: string): string {
    try {
      const url = new URL(link);
      return url.hostname.replace(/^www\./, '');
    } catch {
      return 'unknown';
    }
  }

  private estimateSignalConfidence(rawDescription: string): number {
    const lower = rawDescription.toLowerCase();

    if (lower.includes('according to official results')) {
      return 1;
    }
    if (lower.includes('confirmed') || lower.includes('announced')) {
      return 0.8;
    }
    if (lower.includes('reported') || lower.includes('sources say')) {
      return 0.6;
    }

    return 0.4;
  }

  private async requestVerdictFromOpenAi(
    request: OutcomeRequest,
    signals: OutcomeSignal[],
    heuristicVerdict: OutcomeVerdict,
  ): Promise<OutcomeVerdict | undefined> {
    const apiKey = this.config.openAiApiKey;
    if (!apiKey) return undefined;

    const evidence = signals.slice(0, 8).map((signal, index) => {
      const published = signal.publishedAt ? ` • ${signal.publishedAt}` : '';
      return `${index + 1}. ${signal.headline} (${signal.source}${published})\n   Snippet: ${signal.snippet}\n   URL: ${signal.url}`;
    });

    const optionsSummary = request.options
      .map((option) => `- ${option.id}: ${option.label}${option.keywords ? ` (keywords: ${option.keywords.join(', ')})` : ''}`)
      .join('\n');

    const deadline =
      typeof request.resolutionDeadline === 'string'
        ? request.resolutionDeadline
        : request.resolutionDeadline?.toISOString();

    const body = {
      model: this.config.openAiModel,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'text',
              text: 'You are an impartial prediction market oracle. Return a verdict in JSON. Only use the provided evidence.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                `Market ID: ${request.marketId}`,
                `Question: ${request.question}`,
                request.resolutionCriteria ? `Resolution criteria: ${request.resolutionCriteria}` : undefined,
                deadline ? `Resolution deadline: ${deadline}` : undefined,
                `Options:\n${optionsSummary}`,
                `Heuristic baseline outcome: ${heuristicVerdict.outcome} (confidence ${heuristicVerdict.confidence.toFixed(
                  2,
                )})`,
                `Evidence:\n${evidence.join('\n') || 'No evidence collected.'}`,
                'Return JSON with fields: outcome (YES | NO | INVALID | PENDING), confidence (0-1), reasoning (<= 280 chars).',
              ]
                .filter(Boolean)
                .join('\n\n'),
            },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'oracle_verdict',
          schema: {
            type: 'object',
            properties: {
              outcome: {
                type: 'string',
                enum: ['YES', 'NO', 'INVALID', 'PENDING'],
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 100,
              },
              reasoning: {
                type: 'string',
                maxLength: 512,
              },
            },
            required: ['outcome', 'confidence', 'reasoning'],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.1,
      max_output_tokens: 500,
    };

    const url = `${this.config.openAiBaseUrl.replace(/\/+$/, '')}/v1/responses`;

    for (let attempt = 0; attempt <= this.config.openAiMaxRetries; attempt += 1) {
      try {
        const response = await this.config.fetcher(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI request failed with status ${response.status}: ${errorText}`);
        }

        const payload = await response.json();
        const rawText = this.extractOpenAiText(payload);
        if (!rawText) {
          throw new Error('OpenAI response did not include text output.');
        }

        let parsed: { outcome: OracleOutcome; confidence: number; reasoning: string };
        try {
          parsed = JSON.parse(rawText);
        } catch (parseError) {
          throw new Error(`Failed to parse OpenAI JSON response: ${(parseError as Error).message}`);
        }

        const outcome = this.normalizeOutcomeLabel(parsed.outcome);
        const confidence = Number.isFinite(parsed.confidence)
          ? Math.min(1, Math.max(0, parsed.confidence))
          : heuristicVerdict.confidence;
        const reasoning = parsed.reasoning?.trim() || heuristicVerdict.reasoning;

        return {
          outcome,
          confidence,
          reasoning,
          decidedAt: new Date().toISOString(),
          signals,
        };
      } catch (error) {
        if (attempt >= this.config.openAiMaxRetries) {
          throw error;
        }
        const delay = 500 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return undefined;
  }

  private extractOpenAiText(payload: any): string | undefined {
    const outputs = payload?.output ?? payload?.outputs ?? payload?.choices;
    if (!outputs) return undefined;

    if (Array.isArray(outputs)) {
      for (const item of outputs) {
        const content = item?.content ?? item?.message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block?.type === 'output_text' && typeof block.text === 'string') {
              return block.text;
            }
            if (block?.type === 'text' && typeof block.text === 'string') {
              return block.text;
            }
          }
        } else if (typeof content === 'string') {
          return content;
        }
      }
    }

    return undefined;
  }
}

/**
 * Helper for quick manual testing in a Node REPL.
 *
 * Example:
 * ```ts
 * const oracle = new AiOracle();
 * const result = await oracle.checkOutcome({
 *   marketId: 'market-123',
 *   question: 'Will SpaceX launch Starship into orbit in 2025?',
 *   options: [
 *     { id: 'yes', label: 'YES', keywords: ['launch', 'orbital flight', 'SpaceX Starship'] },
 *     { id: 'no', label: 'NO', keywords: ['delay', 'scrubbed launch', 'not reach orbit'] },
 *   ],
 * });
 * console.log(result);
 * ```
 */

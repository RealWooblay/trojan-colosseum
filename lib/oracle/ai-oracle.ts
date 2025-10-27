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

/**
 * DuckDuckGo and Google block direct scraping, but https://r.jina.ai acts as
 * a passthrough that returns the raw document. The endpoint used here does not
 * require API keys and keeps the implementation dependency-free.
 */
const GOOGLE_NEWS_RSS_BASE =
  'https://r.jina.ai/http://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q=';

export class AiOracle {
  private readonly config: Required<AiOracleConfig>;

  constructor(config: AiOracleConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Public entry point used by market contracts or cron jobs.
   */
  async checkOutcome(request: OutcomeRequest): Promise<OutcomeVerdict> {
    const signals = await this.collectSignals(request);
    const scores = this.scoreSignals(request, signals);
    const { outcome, confidence, reasoning } = this.decideOutcome(
      request,
      scores,
      signals,
    );

    return {
      outcome,
      confidence,
      reasoning,
      decidedAt: new Date().toISOString(),
      signals,
    };
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

  private decideOutcome(
    request: OutcomeRequest,
    scores: AggregatedScores,
    signals: OutcomeSignal[],
  ): { outcome: OracleOutcome; confidence: number; reasoning: string } {
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

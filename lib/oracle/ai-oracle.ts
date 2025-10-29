/**
 * AI-assisted oracle service that can be wired into prediction markets.
 * The oracle pulls public signals from the web, applies lightweight NLP
 * heuristics, and returns a verdict with confidence and supporting evidence.
 *
 * The public interface is intentionally lightweight so the caller can handle
 * persistence, scheduling, and any higher level workflow orchestration.
 */
/**
 * Oracle outcome index or unresolved sentinel.
 * 0 maps to the minimum observable value, 100 to the configured maximum.
 */
export type OracleOutcome = number | 'INVALID' | 'PENDING';

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
  unit?: string;
  domain?: { min: number; max: number };
  valueDomain?: { min: number; max: number };
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

const MAX_OUTCOME_INDEX = 100;
export const MAX_DOLLAR_VALUE = 1_000_000_000; // $1B ceiling mapped to index 100
const MIN_CONFIDENCE_SAMPLES = 3;

type DomainRange = { min: number; max: number };

type ValueSample = {
  value: number;
  weight: number;
  signal: OutcomeSignal;
};

/**
 * DuckDuckGo and Google block direct scraping, but https://r.jina.ai acts as
 * a passthrough that returns the raw document. The endpoint used here does not
 * require API keys and keeps the implementation dependency-free.
 */
const GOOGLE_NEWS_RSS_BASES = [
  // Prefer HTTPS mirror, but fall back to HTTP in case the proxy blocks it.
  'https://r.jina.ai/https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q=',
  'https://r.jina.ai/http://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q=',
];

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
    const heuristicVerdict = this.buildHeuristicVerdict(request, signals);

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

  private buildHeuristicVerdict(
    request: OutcomeRequest,
    signals: OutcomeSignal[],
  ): OutcomeVerdict {
    const numericEstimate = this.estimateNumericOutcome(request, signals);

    if (!numericEstimate) {
      return {
        outcome: 'PENDING',
        confidence: 0,
        reasoning: 'No reliable signals matching the market unit were detected.',
        decidedAt: new Date().toISOString(),
        signals,
      };
    }

    if (numericEstimate.confidence < this.config.resolutionThreshold) {
      return {
        outcome: 'PENDING',
        confidence: numericEstimate.confidence,
        reasoning:
          'Signals suggest a tentative value, but confidence is below the resolution threshold.',
        decidedAt: new Date().toISOString(),
        signals,
      };
    }

    const formattedEstimate = this.formatValue(
      numericEstimate.estimatedValue,
      request.unit,
    );
    const reasoning = `Estimated outcome index ${numericEstimate.outcomeIndex} (~${formattedEstimate}) based on signals from ${numericEstimate.summary || 'available sources'}.`;

    return {
      outcome: numericEstimate.outcomeIndex,
      confidence: numericEstimate.confidence,
      reasoning,
      decidedAt: new Date().toISOString(),
      signals,
    };
  }

  private estimateNumericOutcome(
    request: OutcomeRequest,
    signals: OutcomeSignal[],
  ): { outcomeIndex: number; estimatedValue: number; confidence: number; summary: string } | undefined {
    const keywords = request.options.flatMap((option) => option.keywords ?? []);
    const valueDomain = this.getValueDomain(request);
    const samples: ValueSample[] = [];

    for (const signal of signals) {
      const text = `${signal.headline ?? ''} ${signal.snippet ?? ''}`;
      const extracted = this.extractValuesForUnit(text, request.unit, valueDomain);
      if (extracted.length === 0) continue;

      const representative = this.selectRepresentativeValue(extracted);
      if (!Number.isFinite(representative)) continue;

      const tolerance = Math.max(1, (valueDomain.max - valueDomain.min) * 0.1);
      if (!this.isWithinDomain(representative, valueDomain, tolerance)) continue;

      const clamped = this.clampValueToDomain(representative, valueDomain);

      const relevanceBoost = this.computeSignalRelevance(text, keywords);
      const confidence = Number.isFinite(signal.confidence) ? signal.confidence : 0.5;
      const weight = Math.max(0.1, confidence * relevanceBoost);

      samples.push({ value: clamped, weight, signal });
    }

    if (samples.length === 0) {
      return undefined;
    }

    const totalWeight = samples.reduce((sum, sample) => sum + sample.weight, 0);
    if (totalWeight <= 0) {
      return undefined;
    }

    const weightedMean =
      samples.reduce((sum, sample) => sum + sample.value * sample.weight, 0) / totalWeight;

    const weightedMedian = this.computeWeightedMedian(samples);
    const estimatedValue = (weightedMean + weightedMedian) / 2;

    const outcomeIndex = this.normalizeToIndex(estimatedValue, valueDomain);

    const averageSignalConfidence = Math.min(1, totalWeight / samples.length);
    const supportFactor = Math.min(1, samples.length / MIN_CONFIDENCE_SAMPLES);
    const confidence = Math.max(
      0,
      Math.min(1, averageSignalConfidence * 0.6 + supportFactor * 0.4),
    );

    const summary = [...samples]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map(
        (sample) =>
          `${sample.signal.source || 'unknown'} ~${this.formatValue(sample.value, request.unit)} (${sample.weight.toFixed(2)})`,
      )
      .join('; ');

    return {
      outcomeIndex,
      estimatedValue,
      confidence,
      summary,
    };
  }

  private selectRepresentativeValue(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
  }

  private computeWeightedMedian(samples: ValueSample[]): number {
    const sorted = [...samples].sort((a, b) => a.value - b.value);
    const totalWeight = sorted.reduce((sum, sample) => sum + sample.weight, 0);
    let cumulative = 0;

    for (const sample of sorted) {
      cumulative += sample.weight;
      if (cumulative >= totalWeight / 2) {
        return sample.value;
      }
    }

    return sorted[sorted.length - 1]?.value ?? 0;
  }

  private computeSignalRelevance(text: string, keywords: string[]): number {
    if (!keywords.length) return 1;
    const lower = text.toLowerCase();
    let matches = 0;

    for (const keyword of keywords) {
      const trimmed = keyword.trim().toLowerCase();
      if (!trimmed) continue;
      if (lower.includes(trimmed)) {
        matches += 1;
      }
    }

    // Cap the contribution so a single article doesn't dominate
    return 1 + Math.min(matches, 5) * 0.1;
  }

  private getValueDomain(request: OutcomeRequest): DomainRange {
    const explicit = request.valueDomain ?? request.domain;
    if (explicit && this.isValidDomain(explicit)) {
      return explicit;
    }

    const unit = (request.unit ?? '').toLowerCase();
    if (unit === 'usd' || unit === '$') {
      return { min: 0, max: MAX_DOLLAR_VALUE };
    }

    return { min: 0, max: MAX_OUTCOME_INDEX };
  }

  private isValidDomain(domain: DomainRange): boolean {
    return (
      domain !== undefined &&
      Number.isFinite(domain.min) &&
      Number.isFinite(domain.max) &&
      domain.max > domain.min
    );
  }

  private isWithinDomain(value: number, domain: DomainRange, tolerance = 0): boolean {
    if (!Number.isFinite(value)) return false;
    const lower = domain.min - tolerance;
    const upper = domain.max + tolerance;
    return value >= lower && value <= upper;
  }

  private clampValueToDomain(value: number, domain: DomainRange): number {
    if (!Number.isFinite(value)) return domain.min;
    return Math.min(domain.max, Math.max(domain.min, value));
  }

  private extractValuesForUnit(text: string, unit: string | undefined, domain: DomainRange): number[] {
    const normalizedUnit = (unit ?? '').toLowerCase();

    if (normalizedUnit === 'usd' || normalizedUnit === '$') {
      return this.extractDollarAmounts(text);
    }

    if (normalizedUnit === '%' || normalizedUnit === 'percent') {
      return this.extractPercentages(text);
    }

    if (
      normalizedUnit === '°c' ||
      normalizedUnit === 'celsius' ||
      normalizedUnit === 'degc' ||
      normalizedUnit === '°' ||
      normalizedUnit.includes('celsius')
    ) {
      return this.extractTemperatures(text);
    }

    return this.extractPlainNumericValues(text, domain);
  }

  private extractPercentages(text: string): number[] {
    if (!text) return [];
    const matches = text.match(
      /-?\d+(?:\.\d+)?\s?(?:%|percent(?:age)?(?:\s?points?)?|pct)/gi,
    );
    if (!matches) return [];
    const values: number[] = [];
    for (const token of matches) {
      const cleaned = token.replace(/(%|percent(?:age)?(?:\s?points?)?|pct)/gi, '').trim();
      const parsed = Number.parseFloat(cleaned);
      if (Number.isFinite(parsed)) {
        values.push(parsed);
      }
    }
    return values;
  }

  private extractTemperatures(text: string): number[] {
    if (!text) return [];
    const matches = text.match(
      /-?\d+(?:\.\d+)?\s?(?:°\s?c|degrees?\s?c(?:elsius)?|\s?c(?![a-z]))/gi,
    );
    if (!matches) return [];
    const values: number[] = [];
    for (const token of matches) {
      const cleaned = token
        .toLowerCase()
        .replace(/(°\s?c|degrees?\s?c(?:elsius)?|\s?c(?![a-z]))/g, '')
        .trim();
      const parsed = Number.parseFloat(cleaned);
      if (Number.isFinite(parsed)) {
        values.push(parsed);
      }
    }
    return values;
  }

  private extractPlainNumericValues(text: string, domain: DomainRange): number[] {
    if (!text) return [];
    const matches = text.match(/-?\d+(?:\.\d+)?/g);
    if (!matches) return [];
    const tolerance = Math.max(1, (domain.max - domain.min) * 0.1);
    const values: number[] = [];

    for (const token of matches) {
      const parsed = Number.parseFloat(token);
      if (!Number.isFinite(parsed)) continue;

      if (this.isWithinDomain(parsed, domain, tolerance)) {
        values.push(parsed);
      }
    }

    return values;
  }

  private normalizeOutcomeValue(raw: unknown, request: OutcomeRequest): OracleOutcome {
    const domain = this.getValueDomain(request);

    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return this.normalizeToIndex(raw, domain);
    }

    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) return 'PENDING';

      const upper = trimmed.toUpperCase();
      if (upper === 'PENDING') return 'PENDING';
      if (upper === 'INVALID') return 'INVALID';

      const parsed = Number.parseFloat(trimmed.replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(parsed)) {
        return this.normalizeToIndex(parsed, domain);
      }
    }

    throw new Error(`Unsupported outcome value: ${String(raw)}`);
  }

  private normalizeToIndex(value: number, domain: DomainRange): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    const clamped = this.clampValueToDomain(value, domain);
    const span = domain.max - domain.min;
    if (span <= 0) {
      return 0;
    }

    const ratio = (clamped - domain.min) / span;
    const scaled = Math.ceil(ratio * MAX_OUTCOME_INDEX);
    return this.clampOutcomeIndex(scaled);
  }

  private indexToValue(index: number, domain: DomainRange): number {
    if (!Number.isFinite(index)) return domain.min;
    const clampedIndex = Math.min(MAX_OUTCOME_INDEX, Math.max(0, index));
    const span = domain.max - domain.min;
    if (span <= 0) {
      return domain.min;
    }

    return domain.min + (span * clampedIndex) / MAX_OUTCOME_INDEX;
  }

  private clampOutcomeIndex(index: number): number {
    if (!Number.isFinite(index)) return 0;
    return Math.min(MAX_OUTCOME_INDEX, Math.max(0, Math.round(index)));
  }

  private formatValue(value: number, unit?: string): string {
    if (!Number.isFinite(value)) return '0';
    const normalized = (unit ?? '').toLowerCase();

    if (normalized === 'usd' || normalized === '$') {
      return this.formatUsd(value);
    }

    if (normalized === '%' || normalized === 'percent') {
      return `${value.toFixed(1)}%`;
    }

    if (
      normalized === '°c' ||
      normalized === 'celsius' ||
      normalized === 'degc' ||
      normalized.includes('celsius')
    ) {
      return `${value.toFixed(1)}°C`;
    }

    if (Math.abs(value) >= 1000) {
      return value.toFixed(0);
    }

    return Math.abs(value) >= 1 ? value.toFixed(1) : value.toPrecision(2);
  }

  private formatUsd(value: number): string {
    if (!Number.isFinite(value)) return '0';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (abs >= 1_000_000_000) {
      return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
    }
    if (abs >= 1_000_000) {
      return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    }
    if (abs >= 1_000) {
      return `${sign}$${(abs / 1_000).toFixed(2)}K`;
    }
    if (abs >= 1) {
      return `${sign}$${abs.toFixed(0)}`;
    }
    return `${sign}$${abs.toPrecision(2)}`;
  }

  private extractDollarAmounts(text: string): number[] {
    if (!text) return [];

    const matches = new Set<number>();
    const patterns = [
      /\$[\s]*\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:\s?(?:billion|million|trillion|thousand|bn|mm|m|b|t|k))?/gi,
      /\b(?:usd|us\$|u\.s\.d\.)\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?(?:\s?(?:billion|million|trillion|thousand|bn|mm|m|b|t|k))?\b/gi,
      /\b\d+(?:\.\d+)?\s?(?:billion|million|trillion|thousand|bn|mm|m|b|t|k)\b/gi,
      /\b\d+(?:\.\d+)?(?:(?:k|m|b|t)\b)/gi,
    ];

    for (const pattern of patterns) {
      const found = text.match(pattern);
      if (!found) continue;

      for (const token of found) {
        const amount = this.parseAmountToken(token);
        if (amount && Number.isFinite(amount) && amount > 0) {
          matches.add(amount);
        }
      }
    }

    return Array.from(matches);
  }

  private parseAmountToken(token: string): number | undefined {
    const cleaned = token
      .toLowerCase()
      .replace(/(?:usd|us\$|u\.s\.d\.|dollars?)/g, '')
      .replace(/[,\s]+/g, '')
      .trim();

    const suffixMatch = cleaned.match(
      /(billion|million|trillion|thousand|bn|mm|m|b|t|k)$/i,
    );

    let multiplier = 1;
    let numericPortion = cleaned;

    if (suffixMatch) {
      const suffix = suffixMatch[1];
      multiplier = this.multiplierForSuffix(suffix);
      numericPortion = cleaned.slice(0, Math.max(0, cleaned.length - suffix.length));
    }

    numericPortion = numericPortion.replace(/[^0-9.-]/g, '');
    if (!numericPortion) return undefined;

    const baseValue = Number.parseFloat(numericPortion);
    if (!Number.isFinite(baseValue)) return undefined;

    return baseValue * multiplier;
  }

  private multiplierForSuffix(suffix: string): number {
    switch (suffix.toLowerCase()) {
      case 'trillion':
      case 't':
        return 1_000_000_000_000;
      case 'billion':
      case 'bn':
      case 'b':
        return 1_000_000_000;
      case 'million':
      case 'mm':
      case 'm':
        return 1_000_000;
      case 'thousand':
      case 'k':
        return 1_000;
      default:
        return 1;
    }
  }

  private async fetchGoogleNewsSignals(query: string): Promise<OutcomeSignal[]> {
    const encoded = encodeURIComponent(query);
    let lastError: Error | undefined;

    for (const base of GOOGLE_NEWS_RSS_BASES) {
      const url = `${base}${encoded}`;
      try {
        const response = await this.config.fetcher(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; AiOracleBot/1.0; +https://example.com/oracle)',
          },
        });

        if (!response.ok) {
          lastError = new Error(`Unexpected status ${response.status} for ${url}`);
          continue;
        }

        const xml = await response.text();
        const parsed = this.parseGoogleNewsRss(xml);
        if (parsed.length > 0) {
          return parsed;
        }
      } catch (error) {
        lastError =
          error instanceof Error
            ? error
            : new Error(`Unknown error while fetching ${url}`);
      }
    }

    throw (
      lastError ??
      new Error('Failed to fetch Google News signals from all configured bases.')
    );
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

    const valueDomain = this.getValueDomain(request);
    const baselineOutcome =
      typeof heuristicVerdict.outcome === 'number'
        ? `${heuristicVerdict.outcome} (≈${this.formatValue(
            this.indexToValue(heuristicVerdict.outcome, valueDomain),
            request.unit,
          )})`
        : heuristicVerdict.outcome;

    const scaleSummary = `Scale mapping: index 0 → ${this.formatValue(
      valueDomain.min,
      request.unit,
    )}, index 100 → ${this.formatValue(
      valueDomain.max,
      request.unit,
    )}. Convert observed values into this index via linear interpolation, then clamp to 0-100.`;

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
                optionsSummary ? `Options:\n${optionsSummary}` : undefined,
                `Heuristic baseline outcome index: ${baselineOutcome} (confidence ${heuristicVerdict.confidence.toFixed(
                  2,
                )})`,
                scaleSummary,
                `Evidence:\n${evidence.join('\n') || 'No evidence collected.'}`,
                'Return JSON with fields: outcome (integer 0-100 or string "PENDING"/"INVALID"), confidence (0-1), reasoning (<= 280 chars).',
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
                description:
                  'Resolved index (0-100). Use "PENDING" if insufficient evidence or "INVALID" if market conditions cannot be evaluated.',
                oneOf: [
                  {
                    type: 'number',
                    minimum: 0,
                    maximum: 100,
                  },
                  {
                    type: 'string',
                    enum: ['PENDING', 'INVALID'],
                  },
                ],
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
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

        let parsed: { outcome: number | string; confidence: number; reasoning: string };
        try {
          parsed = JSON.parse(rawText);
        } catch (parseError) {
          throw new Error(`Failed to parse OpenAI JSON response: ${(parseError as Error).message}`);
        }

        const outcome = this.normalizeOutcomeValue(parsed.outcome, request);
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

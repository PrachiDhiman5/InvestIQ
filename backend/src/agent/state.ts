import { Annotation } from "@langchain/langgraph";

export interface ResolvedEntity {
  name: string;
  ticker: string | null;
  isPublic: boolean;
}

export interface Financials {
  revenue: number | null;
  revenueGrowthPct: number | null;
  peRatio: number | null;
  debtToEquity: number | null;
  profitMargin: number | null;
}

export interface NewsResult {
  title: string;
  snippet: string;
  url: string;
  publishedDate: string;
}

export interface RubricScores {
  financialHealth: number | null;
  valuation: number | null;
  newsSentiment: number | null;
  riskFlags: string[];
}

export interface CaseAnalysis {
  summary: string;
  points: string[];
}

export interface JudgeDecision {
  verdict: "INVEST" | "PASS" | "WATCH";
  confidence: number;
  reasoning: string;
  caveats: string[];
}

export const AgentState = Annotation.Root({
  companyName: Annotation<string>(),
  resolvedEntity: Annotation<ResolvedEntity>(),
  financials: Annotation<Financials | null>(),
  newsResults: Annotation<NewsResult[]>({
    reducer: (curr, update) => curr.concat(update),
    default: () => [],
  }),
  rubricScores: Annotation<RubricScores>({
    reducer: (curr, update) => ({ ...curr, ...update }),
    default: () => ({ financialHealth: null, valuation: null, newsSentiment: null, riskFlags: [] }),
  }),
  bullCase: Annotation<CaseAnalysis>(),
  bearCase: Annotation<CaseAnalysis>(),
  decision: Annotation<JudgeDecision>(),
  stepLog: Annotation<string[]>({
    reducer: (curr, update) => curr.concat(update),
    default: () => [],
  }),
});

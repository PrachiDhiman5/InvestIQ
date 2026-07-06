import { useState, useRef, useEffect } from "react";

interface NewsResult {
  title: string;
  snippet: string;
  url: string;
  publishedDate: string;
}

interface Financials {
  revenue: number | null;
  revenueGrowthPct: number | null;
  peRatio: number | null;
  debtToEquity: number | null;
  profitMargin: number | null;
}

interface RubricScores {
  financialHealth: number | null;
  valuation: number | null;
  newsSentiment: number | null;
  riskFlags: string[];
}

interface CaseAnalysis {
  summary: string;
  points: string[];
}

interface JudgeDecision {
  verdict: "INVEST" | "PASS" | "WATCH";
  confidence: number;
  reasoning: string;
  caveats: string[];
}

interface AgentState {
  companyName: string;
  resolvedEntity?: {
    name: string;
    ticker: string | null;
    isPublic: boolean;
  };
  financials?: Financials | null;
  newsResults?: NewsResult[];
  rubricScores?: RubricScores;
  bullCase?: CaseAnalysis;
  bearCase?: CaseAnalysis;
  decision?: JudgeDecision;
  stepLog?: string[];
}

const STEPS = [
  { id: "resolveEntity", label: "Resolving Company & Ticker" },
  { id: "fetchFinancials", label: "Evaluating Public Financials" },
  { id: "fetchNews", label: "Scoping News & Sentiment" },
  { id: "buildBullCase", label: "Formulating Bullish Thesis" },
  { id: "buildBearCase", label: "Analyzing Structural Risks" },
  { id: "judge", label: "Rendering Investment Judgment" },
];

export default function App() {
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [skippedSteps, setSkippedSteps] = useState<string[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [finalState, setFinalState] = useState<AgentState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the terminal logs to the bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLogs]);

  const runResearch = async (nameToSearch: string) => {
    if (!nameToSearch.trim()) return;

    setLoading(true);
    setFinalState(null);
    setError(null);
    setConsoleLogs([]);
    setCompletedSteps([]);
    setSkippedSteps([]);
    setActiveStep("resolveEntity");
    setConsoleLogs(["Initializing investment agent core...", `Target entity queued: "${nameToSearch}"`]);

    try {
      const response = await fetch("http://localhost:4000/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyName: nameToSearch }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP error ${response.status}`);
      }

      if (!response.body) {
        throw new Error("ReadableStream is not supported by your browser");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);

              if (data.event === "step") {
                const node = data.node;
                const output = data.output;
                const logs = data.currentStepLog || [];

                // Append logs to terminal
                if (logs.length > 0) {
                  setConsoleLogs((prev) => [...prev, ...logs]);
                }

                // Manage steps state
                setCompletedSteps((prev) => [...prev, node]);

                if (node === "resolveEntity") {
                  const isPublic = output.resolvedEntity?.isPublic;
                  if (isPublic) {
                    setActiveStep("fetchFinancials");
                  } else {
                    setSkippedSteps((prev) => [...prev, "fetchFinancials"]);
                    setConsoleLogs((prev) => [...prev, "[Skip] Entity is private; bypassing quantitative financial fetch."]);
                    setActiveStep("fetchNews");
                  }
                } else if (node === "fetchFinancials") {
                  setActiveStep("fetchNews");
                } else if (node === "fetchNews") {
                  // After news, both buildBullCase and buildBearCase run in parallel.
                  // We can set active step to represent that.
                  setActiveStep("buildBullCase");
                } else if (node === "buildBullCase") {
                  setActiveStep("buildBearCase");
                } else if (node === "buildBearCase") {
                  setActiveStep("judge");
                } else if (node === "judge") {
                  setActiveStep("complete");
                }

              } else if (data.event === "complete") {
                setFinalState(data.state);
                setActiveStep("complete");
                setConsoleLogs((prev) => [...prev, "Research compilation finalized. Rendering visual dashboard."]);
                setLoading(false);
              } else if (data.event === "error") {
                setError(data.message || "An unexpected error occurred during execution.");
                setConsoleLogs((prev) => [...prev, `[ERROR] ${data.message}`]);
                setLoading(false);
              }
            } catch (err) {
              console.error("Error parsing stream chunk:", err);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to establish connection to the agent stream.");
      setConsoleLogs((prev) => [...prev, `[CRITICAL ERROR] ${err.message}`]);
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runResearch(companyName);
  };

  const formatRevenue = (rev: number | null) => {
    if (rev === null) return "N/A";
    if (rev >= 1e12) return `$${(rev / 1e12).toFixed(2)}T`;
    if (rev >= 1e9) return `$${(rev / 1e9).toFixed(1)}B`;
    return `$${(rev / 1e6).toFixed(1)}M`;
  };

  const getScoreColorClass = (score: number | null) => {
    if (score === null) return "neutral";
    if (score >= 7) return "success";
    if (score >= 4) return "warning";
    return "danger";
  };

  const getVerdictLabel = (verdict: "INVEST" | "PASS" | "WATCH" | undefined) => {
    if (!verdict) return "";
    return verdict;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <span className="badge">Multi-Agent Debate Framework</span>
        <h1 className="title-gradient">Antigravity Research Terminal</h1>
        <p className="subtitle">
          Input any public or private company. Our LangGraph agent executes adaptive qualitative research, evaluates financials, debate-tests bull/bear cases, and generates a structured verdict.
        </p>
      </header>

      {/* Search Input */}
      <div className="search-container">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            className="search-input"
            placeholder="Search e.g. Nvidia, Apple, Stripe, or a local startup name..."
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="search-btn" disabled={loading || !companyName.trim()}>
            {loading ? (
              <>
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: "pulseGlow 1s infinite alternate" }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="30 30" fill="none" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                Analyze Equity
              </>
            )}
          </button>
        </form>

        {/* Predefined Examples */}
        {!loading && (
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.88rem", color: "#6b7280", alignSelf: "center" }}>Quick Examples:</span>
            {["Nvidia", "Tesla", "Stripe", "Retro BioTech (Startup)"].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setCompanyName(ex);
                  runResearch(ex);
                }}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  padding: "0.3rem 0.8rem",
                  fontSize: "0.85rem",
                  color: "#9ca3af",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.4)";
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.color = "#9ca3af";
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: "rgba(244, 63, 94, 0.08)",
          border: "1px solid rgba(244, 63, 94, 0.3)",
          color: "#f87171",
          borderRadius: "12px",
          padding: "1rem 1.5rem",
          maxWidth: "800px",
          margin: "0 auto 2rem auto",
          fontSize: "0.95rem"
        }}>
          <strong>Analysis Failed:</strong> {error}
        </div>
      )}

      {/* Loading Progress & Terminal Log Console */}
      {loading && (
        <div className="glass-panel research-progress-panel">
          <h3 className="panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--color-primary)" }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            Agent Engine Execution Progress
          </h3>

          <div className="stepper-container">
            {STEPS.map((step, idx) => {
              const isCompleted = completedSteps.includes(step.id);
              const isActive = activeStep === step.id;
              const isSkipped = skippedSteps.includes(step.id);
              
              let rowClass = "step-row";
              if (isCompleted) rowClass += " completed";
              if (isActive) rowClass += " active";
              if (isSkipped) rowClass += " skipped";

              return (
                <div key={step.id} className={rowClass}>
                  <div className="step-indicator">
                    {isCompleted ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : isSkipped ? (
                      <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>N/A</span>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div className="step-info">
                    <div className="step-name">
                      {step.label}
                      {isSkipped && <span style={{ color: "#6b7280", fontStyle: "italic", marginLeft: "0.5rem" }}>(Skipped)</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <h4 style={{ fontSize: "0.9rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem", fontWeight: "600" }}>Live Terminal Console</h4>
          <div className="console-log-box">
            {consoleLogs.map((log, idx) => (
              <div key={idx} className="console-line">{log}</div>
            ))}
            <div ref={consoleEndRef} />
          </div>
        </div>
      )}

      {/* FINAL REPORT VIEW */}
      {finalState && !loading && (
        <div className="report-dashboard">
          
          {/* Main Verdict Banner */}
          <div className={`verdict-panel ${finalState.decision?.verdict.toLowerCase()}`}>
            <div className="verdict-header">
              <div>
                <h2 className="company-title">
                  {finalState.resolvedEntity?.name}
                  {finalState.resolvedEntity?.ticker && (
                    <span className="ticker-badge">{finalState.resolvedEntity.ticker}</span>
                  )}
                </h2>
                <div style={{ color: "#9ca3af", marginTop: "0.25rem", fontSize: "0.95rem" }}>
                  {finalState.resolvedEntity?.isPublic 
                    ? "✓ Publicly Traded Corporation" 
                    : "⚡ Private Enterprise (Qualitative Analysis Only)"}
                </div>
              </div>
              
              <div className="verdict-tag">
                {getVerdictLabel(finalState.decision?.verdict)}
              </div>
            </div>

            {/* Confidence Bar */}
            <div className="confidence-container">
              <div style={{ color: "#9ca3af", fontSize: "0.95rem" }}>Committee Confidence:</div>
              <div className="confidence-bar-bg">
                <div 
                  className="confidence-bar-fill" 
                  style={{ width: `${finalState.decision?.confidence ?? 0}%` }}
                />
              </div>
              <span className="confidence-label">{finalState.decision?.confidence}%</span>
            </div>

            {/* Reasoning Paragraph */}
            <p className="verdict-reasoning">
              {finalState.decision?.reasoning}
            </p>

            {/* Warning / Caveats */}
            {finalState.decision?.caveats && finalState.decision.caveats.length > 0 && (
              <div>
                <h4 className="caveats-title">Critical Caveats & Assumptions</h4>
                <ul className="caveats-list">
                  {finalState.decision.caveats.map((cav, idx) => (
                    <li key={idx} className="caveat-item">{cav}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Metrics & Rubric Scores Grid */}
          <div className="grid-2col">
            
            {/* Financial Numbers Card */}
            <div className="glass-panel">
              <h3 className="panel-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                Core Financial Metrics
              </h3>
              
              {finalState.resolvedEntity?.isPublic && finalState.financials ? (
                <div className="grid-2col" style={{ gap: "1rem" }}>
                  <div className="glass-panel metric-card">
                    <div className="metric-value">
                      {formatRevenue(finalState.financials.revenue)}
                    </div>
                    <div className="metric-label">Revenue (TTM)</div>
                  </div>
                  
                  <div className={`glass-panel metric-card ${finalState.financials.revenueGrowthPct !== null && finalState.financials.revenueGrowthPct >= 0 ? 'positive' : 'negative'}`}>
                    <div className="metric-value">
                      {finalState.financials.revenueGrowthPct !== null 
                        ? `${finalState.financials.revenueGrowthPct > 0 ? '+' : ''}${finalState.financials.revenueGrowthPct.toFixed(1)}%` 
                        : "N/A"}
                    </div>
                    <div className="metric-label">YoY Growth</div>
                  </div>

                  <div className="glass-panel metric-card">
                    <div className="metric-value">
                      {finalState.financials.peRatio !== null ? finalState.financials.peRatio : "N/A"}
                    </div>
                    <div className="metric-label">P/E Ratio</div>
                  </div>

                  <div className="glass-panel metric-card">
                    <div className="metric-value">
                      {finalState.financials.profitMargin !== null ? `${finalState.financials.profitMargin.toFixed(1)}%` : "N/A"}
                    </div>
                    <div className="metric-label">Profit Margin</div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: "0.5rem" }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="17" x2="15" y2="17" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                    <line x1="9" y1="9" x2="15" y2="9" />
                  </svg>
                  <p>Quantitative financials are not available for private enterprises.</p>
                  <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Agent bypassed financial statement lookup gracefully.</p>
                </div>
              )}
            </div>

            {/* Rubrics Panel */}
            <div className="glass-panel">
              <h3 className="panel-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Objective Coded Rubrics
              </h3>

              <div className="gauge-grid">
                <div className="gauge-panel">
                  <div className="metric-label">Financial Health</div>
                  <div className={`score-display ${getScoreColorClass(finalState.rubricScores?.financialHealth ?? null)}`}>
                    {finalState.rubricScores?.financialHealth ?? "-"}
                    <span className="score-max">/10</span>
                  </div>
                </div>
                
                <div className="gauge-panel">
                  <div className="metric-label">Valuation</div>
                  <div className={`score-display ${getScoreColorClass(finalState.rubricScores?.valuation ?? null)}`}>
                    {finalState.rubricScores?.valuation ?? "-"}
                    <span className="score-max">/10</span>
                  </div>
                </div>

                <div className="gauge-panel">
                  <div className="metric-label">News Sentiment</div>
                  <div className={`score-display ${getScoreColorClass(finalState.rubricScores?.newsSentiment ?? null)}`}>
                    {finalState.rubricScores?.newsSentiment ?? "-"}
                    <span className="score-max">/10</span>
                  </div>
                </div>
              </div>

              {finalState.rubricScores?.riskFlags && finalState.rubricScores.riskFlags.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ fontSize: "0.85rem", color: "#f43f5e", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>Automated Risk Flags:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    {finalState.rubricScores.riskFlags.map((flag, i) => (
                      <div key={i} style={{ fontSize: "0.88rem", color: "#fda4af", display: "flex", gap: "0.25rem" }}>
                        <span>•</span> <span>{flag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Debate Panel: Bull vs Bear */}
          <div className="glass-panel">
            <h3 className="panel-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Structured Analyst Debate
            </h3>

            <div className="grid-2col" style={{ gap: "2.5rem" }}>
              
              {/* Bull Case */}
              <div className="debate-content bull-points">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>📈</span>
                  <h4 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--color-success)" }}>Bull Thesis</h4>
                </div>
                <p className="debate-summary">{finalState.bullCase?.summary}</p>
                <div className="debate-points-list">
                  {finalState.bullCase?.points.map((pt, idx) => (
                    <div key={idx} className="debate-point-card">
                      {pt}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bear Case */}
              <div className="debate-content bear-points">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>📉</span>
                  <h4 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--color-danger)" }}>Bear Thesis</h4>
                </div>
                <p className="debate-summary">{finalState.bearCase?.summary}</p>
                <div className="debate-points-list">
                  {finalState.bearCase?.points.map((pt, idx) => (
                    <div key={idx} className="debate-point-card">
                      {pt}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Qualitative News Sources */}
          <div className="glass-panel">
            <h3 className="panel-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11" />
                <path d="M12 11h3" />
                <path d="M12 7h3" />
                <path d="M12 15h3" />
                <path d="M7 7h2v6H7z" />
              </svg>
              Key Research & News Catalysts
            </h3>

            <div className="news-grid">
              {finalState.newsResults && finalState.newsResults.length > 0 ? (
                finalState.newsResults.map((article, idx) => (
                  <a 
                    key={idx} 
                    href={article.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="news-card"
                  >
                    <div className="news-header">
                      <h4 className="news-card-title">{article.title}</h4>
                      <span className="news-date">{article.publishedDate}</span>
                    </div>
                    <p className="news-snippet">{article.snippet}</p>
                    <span className="news-url-label">Read Source Article ↗</span>
                  </a>
                ))
              ) : (
                <p style={{ color: "#6b7280", textAlign: "center", padding: "1rem" }}>No recent news articles cataloged.</p>
              )}
            </div>
          </div>

          {/* Reset / Search again button */}
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <button
              onClick={() => {
                setFinalState(null);
                setCompanyName("");
              }}
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#ffffff",
                padding: "0.8rem 2.2rem",
                borderRadius: "12px",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
              }}
            >
              Analyze Another Company
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

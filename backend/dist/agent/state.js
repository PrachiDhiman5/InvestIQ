import { Annotation } from "@langchain/langgraph";
export const AgentState = Annotation.Root({
    companyName: Annotation(),
    resolvedEntity: Annotation(),
    financials: Annotation(),
    newsResults: Annotation({
        reducer: (curr, update) => curr.concat(update),
        default: () => [],
    }),
    rubricScores: Annotation({
        reducer: (curr, update) => ({ ...curr, ...update }),
        default: () => ({ financialHealth: null, valuation: null, newsSentiment: null, riskFlags: [] }),
    }),
    bullCase: Annotation(),
    bearCase: Annotation(),
    decision: Annotation(),
    stepLog: Annotation({
        reducer: (curr, update) => curr.concat(update),
        default: () => [],
    }),
});

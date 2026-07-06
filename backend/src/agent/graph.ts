import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState } from "./state.js";
import { 
  resolveEntity, 
  fetchFinancials, 
  fetchNews, 
  generateBullCase, 
  generateBearCase, 
  judge 
} from "./nodes.js";

// Build the LangGraph workflow
const workflow = new StateGraph(AgentState)
  .addNode("resolveEntity", resolveEntity)
  .addNode("fetchFinancials", fetchFinancials)
  .addNode("fetchNews", fetchNews)
  .addNode("buildBullCase", generateBullCase)
  .addNode("buildBearCase", generateBearCase)
  .addNode("judge", judge)

  // Configure routing
  .addEdge(START, "resolveEntity")
  
  // Conditional branch: public companies go to fetchFinancials, private ones skip directly to fetchNews
  .addConditionalEdges("resolveEntity", (state) => {
    return state.resolvedEntity.isPublic ? "fetchFinancials" : "fetchNews";
  })

  // Financials flows into news
  .addEdge("fetchFinancials", "fetchNews")

  // Run analyst nodes in sequence to respect Gemini Free Tier concurrency limits (preventing 429 retries)
  .addEdge("fetchNews", "buildBullCase")
  .addEdge("buildBullCase", "buildBearCase")
  .addEdge("buildBearCase", "judge")
  
  // Judge finishes the flow
  .addEdge("judge", END);

// Compile the graph
export const graph = workflow.compile();

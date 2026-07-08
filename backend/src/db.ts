import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Interface for cache record
export interface CacheRecord {
  companyName: string;
  ticker: string | null;
  isPublic: boolean;
  financials: any;
  rubricScores: any;
  newsResults: any;
  bullCase: any;
  bearCase: any;
  decision: any;
  stepLog: string[];
  createdAt: string;
}

// Local file-based backup cache path
const LOCAL_CACHE_PATH = path.join(__dirname, "../database_cache.json");

let pgPool: pg.Pool | null = null;
let useLocalCache = false;

// Initialize connection
export async function initDb() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl || databaseUrl.trim() === "") {
    console.warn("[DB] DATABASE_URL is not set in .env. Falling back to local file-based database cache.");
    useLocalCache = true;
    return;
  }

  try {
    // Configure Pool
    pgPool = new pg.Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 15000,
 // Timeout fast if DB is not reachable
    });

    // Test query to verify connection
    const client = await pgPool.connect();
    console.log("[DB] Successfully connected to PostgreSQL database.");
    
    // Create cache table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS investment_research_cache (
        company_name VARCHAR(100) PRIMARY KEY,
        ticker VARCHAR(20),
        is_public BOOLEAN,
        financials JSONB,
        rubric_scores JSONB,
        news_results JSONB,
        bull_case JSONB,
        bear_case JSONB,
        decision JSONB,
        step_log JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    client.release();
  } catch (error: any) {
    console.error(`[DB] Failed to connect to PostgreSQL: ${error.message || error}`);
    console.warn("[DB] Falling back to local file-based database cache.");
    useLocalCache = true;
    pgPool = null;
  }
}

// Get cached analysis
export async function getCachedAnalysis(companyName: string): Promise<CacheRecord | null> {
  const normalized = companyName.trim().toLowerCase();

  if (useLocalCache || !pgPool) {
    return getLocalCache(normalized);
  }

  try {
    const res = await pgPool.query(
      "SELECT * FROM investment_research_cache WHERE LOWER(company_name) = $1",
      [normalized]
    );

    if (res.rows.length > 0) {
      const row = res.rows[0];
      console.log(`[DB] Loaded analysis cache for "${companyName}" from PostgreSQL database.`);
      return {
        companyName: row.company_name,
        ticker: row.ticker,
        isPublic: row.is_public,
        financials: row.financials,
        rubricScores: row.rubric_scores,
        newsResults: row.news_results,
        bullCase: row.bull_case,
        bearCase: row.bear_case,
        decision: row.decision,
        stepLog: row.step_log || [],
        createdAt: row.created_at,
      };
    }
  } catch (error: any) {
    console.error(`[DB] Error querying PostgreSQL cache: ${error.message || error}`);
    // fallback
    return getLocalCache(normalized);
  }

  return null;
}

// Save analysis to cache
export async function saveAnalysisToCache(record: Omit<CacheRecord, "createdAt">): Promise<void> {
  const normalized = record.companyName.trim().toLowerCase();

  if (useLocalCache || !pgPool) {
    saveLocalCache(record);
    return;
  }

  try {
    await pgPool.query(
      `INSERT INTO investment_research_cache 
       (company_name, ticker, is_public, financials, rubric_scores, news_results, bull_case, bear_case, decision, step_log, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (company_name) DO UPDATE SET
         ticker = EXCLUDED.ticker,
         is_public = EXCLUDED.is_public,
         financials = EXCLUDED.financials,
         rubric_scores = EXCLUDED.rubric_scores,
         news_results = EXCLUDED.news_results,
         bull_case = EXCLUDED.bull_case,
         bear_case = EXCLUDED.bear_case,
         decision = EXCLUDED.decision,
         step_log = EXCLUDED.step_log,
         created_at = NOW()`,
      [
        record.companyName,
        record.ticker,
        record.isPublic,
        record.financials ? JSON.stringify(record.financials) : null,
        record.rubricScores ? JSON.stringify(record.rubricScores) : null,
        record.newsResults ? JSON.stringify(record.newsResults) : null,
        record.bullCase ? JSON.stringify(record.bullCase) : null,
        record.bearCase ? JSON.stringify(record.bearCase) : null,
        record.decision ? JSON.stringify(record.decision) : null,
        record.stepLog ? JSON.stringify(record.stepLog) : null,
      ]
    );
    console.log(`[DB] Saved analysis for "${record.companyName}" to PostgreSQL cache.`);
  } catch (error: any) {
    console.error(`[DB] Error saving to PostgreSQL cache: ${error.message || error}`);
    saveLocalCache(record);
  }
}

// Local cache helpers
function getLocalCache(companyName: string): CacheRecord | null {
  if (!fs.existsSync(LOCAL_CACHE_PATH)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(LOCAL_CACHE_PATH, "utf8"));
    if (data[companyName]) {
      console.log(`[DB] Loaded analysis cache for "${companyName}" from local JSON cache.`);
      return data[companyName];
    }
  } catch (e) {
    console.error("[DB] Error reading local JSON cache:", e);
  }
  return null;
}

function saveLocalCache(record: Omit<CacheRecord, "createdAt">) {
  const normalized = record.companyName.trim().toLowerCase();
  let data: Record<string, any> = {};
  try {
    if (fs.existsSync(LOCAL_CACHE_PATH)) {
      data = JSON.parse(fs.readFileSync(LOCAL_CACHE_PATH, "utf8"));
    }
    data[normalized] = {
      ...record,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(LOCAL_CACHE_PATH, JSON.stringify(data, null, 2), "utf8");
    console.log(`[DB] Saved analysis for "${record.companyName}" to local JSON cache.`);
  } catch (e) {
    console.error("[DB] Error writing local JSON cache:", e);
  }
}

import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

const LOCAL_CACHE_PATH = path.join(__dirname, "database_cache.json");

async function run() {
  console.log("Clearing local JSON cache...");
  try {
    fs.writeFileSync(LOCAL_CACHE_PATH, "{}", "utf8");
    console.log("Local JSON cache cleared successfully.");
  } catch (e) {
    console.error("Error clearing local cache:", e);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim() === "") {
    console.log("PostgreSQL database URL is not set. Skipped PostgreSQL table truncation.");
    return;
  }

  console.log("Truncating PostgreSQL table...");
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const client = await pool.connect();
    await client.query("TRUNCATE TABLE investment_research_cache;");
    console.log("PostgreSQL cache table truncated successfully.");
    client.release();
  } catch (e) {
    console.error("Error truncating PostgreSQL table:", e);
  } finally {
    await pool.end();
  }
}

run();

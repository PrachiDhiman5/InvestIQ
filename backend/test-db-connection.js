import pg from "pg";

const testUrls = [
  "postgresql://postgres:postgres@localhost:5432/postgres",
  "postgresql://postgres:admin@localhost:5432/postgres",
  "postgresql://postgres:root@localhost:5432/postgres",
  "postgresql://postgres:123456@localhost:5432/postgres",
  "postgresql://postgres@localhost:5432/postgres"
];

async function test(url) {
  const pool = new pg.Pool({
    connectionString: url,
    connectionTimeoutMillis: 1000
  });
  try {
    const client = await pool.connect();
    client.release();
    await pool.end();
    return true;
  } catch (e) {
    await pool.end();
    return false;
  }
}

async function run() {
  console.log("Testing local PostgreSQL connection URLs...");
  for (const url of testUrls) {
    const success = await test(url);
    if (success) {
      console.log(`SUCCESS! Connected successfully with: ${url}`);
      return;
    }
  }
  console.log("Failed to connect with common defaults. Standard credentials might have a custom password.");
}

run();

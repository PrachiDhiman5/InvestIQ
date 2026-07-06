import dotenv from "dotenv";
dotenv.config();

async function run() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("GEMINI_API_KEY is not set in environment.");
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  console.log("Fetching supported models from Google API...");

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Error! HTTP ${res.status}`);
      const text = await res.text();
      console.error(text);
      return;
    }
    const data = await res.json();
    console.log("Supported models:");
    if (data.models) {
      data.models.forEach((m) => {
        console.log(`- Name: ${m.name}`);
        console.log(`  Supported Actions: ${m.supportedGenerationMethods.join(", ")}`);
      });
    } else {
      console.log("No models returned.", data);
    }
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

run();

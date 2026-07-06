import dotenv from "dotenv";
dotenv.config();

async function testModel(modelName) {
  const key = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
  console.log(`\nTesting raw POST request to: ${modelName}...`);

  const body = {
    contents: [{ parts: [{ text: "Hello" }] }]
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    console.log(`HTTP Status: ${res.status}`);
    const text = await res.text();
    if (res.status === 200) {
      console.log("SUCCESS! Model is active and responsive.");
      return true;
    } else {
      console.log(`FAILED! Response: ${text.substring(0, 300)}...`);
      return false;
    }
  } catch (e) {
    console.error("Fetch failed:", e);
    return false;
  }
}

async function run() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error("GEMINI_API_KEY is not set.");
    return;
  }

  const models = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.0-flash-lite", "gemini-flash-latest"];
  for (const m of models) {
    const success = await testModel(m);
    if (success) {
      console.log(`\nFound working model: ${m}`);
      break;
    }
  }
}

run();

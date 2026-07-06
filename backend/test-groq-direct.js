const apiKey = process.env.GROQ_API_KEY;
const models = [
  "llama-3.3-70b-specdec",
  "llama-3.3-70b-versatile",
  "llama3-70b-8192",
  "mixtral-8x7b-32768"
];

async function testModel(modelName) {
  console.log(`Testing model: ${modelName}...`);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 10
      })
    });

    const data = await res.json();
    if (res.status === 200) {
      console.log(`SUCCESS! Response: ${data.choices[0].message.content}`);
      return true;
    } else {
      console.log(`FAILED! Status: ${res.status}, Error: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (e) {
    console.error("Fetch error:", e);
    return false;
  }
}

async function run() {
  for (const model of models) {
    const success = await testModel(model);
    if (success) {
      console.log(`\nWorking model identified: ${model}`);
      break;
    }
  }
}

run();

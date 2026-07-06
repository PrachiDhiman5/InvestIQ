import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import dotenv from "dotenv";
dotenv.config();

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.2,
});

async function run() {
  console.log("Calling llm.invoke with 'Hello'...");
  try {
    const res = await llm.invoke("Hello");
    console.log("SUCCESS! Response content:", res.content);
  } catch (e) {
    console.error("FAILURE! Error calling llm:", e);
  }
}

run();

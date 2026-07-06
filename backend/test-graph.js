import { graph } from "./dist/agent/graph.js";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  console.log("Starting streamed graph test...");
  try {
    const stream = await graph.stream({ companyName: "Tesla" }, { streamMode: "updates" });
    for await (const chunk of stream) {
      const nodeName = Object.keys(chunk)[0];
      console.log(`\n>>> [NODE COMPLETED]: ${nodeName}`);
      const output = chunk[nodeName];
      if (output.stepLog) {
        output.stepLog.forEach(l => console.log(`    log: ${l}`));
      }
    }
    console.log("\n>>> SUCCESS! Stream finished successfully.");
  } catch (e) {
    console.error("\n>>> FAILURE! Stream failed with error:", e);
  }
}

test();

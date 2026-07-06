async function run() {
  const company = "Stripe";
  console.log(`Sending research request for: "${company}"...`);
  
  try {
    const response = await fetch("http://127.0.0.1:4000/api/research", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ companyName: company }),
    });

    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.status}`);
      const text = await response.text();
      console.error(`Response body: ${text}`);
      return;
    }

    console.log("Connected to stream. Parsing events...");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        console.log("Stream completed by server.");
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.replace("data: ", "").trim();
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (data.event === "step") {
              console.log(`[STEP] Node: ${data.node}`);
              if (data.currentStepLog) {
                data.currentStepLog.forEach((log) => console.log(`  -> ${log}`));
              }
            } else if (data.event === "complete") {
              console.log("\n[COMPLETE] Final Verdict Decision:");
              console.log(JSON.stringify(data.state?.decision, null, 2));
            } else if (data.event === "error") {
              console.error(`[SERVER ERROR] ${data.message}`);
            }
          } catch (e) {
            console.error(`Failed to parse line: ${line}`, e);
          }
        }
      }
    }
  } catch (error) {
    console.error("Client Error:", error);
  }
}

run();

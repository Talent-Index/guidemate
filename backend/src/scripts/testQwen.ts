import "dotenv/config";
import { qwenChat, qwenEnabled } from "../qwen.js";

async function main() {
  if (!qwenEnabled()) {
    console.error("QWEN_API_KEY is not set in backend/.env - add it and retry.");
    process.exit(1);
  }
  console.log(`Model: ${process.env.QWEN_MODEL ?? "Qwen-Ambassador/Qwen3.8-Max"}`);
  const reply = await qwenChat([{ role: "user", content: "Ping! Reply in one short sentence: are you operational?" }]);
  if (reply) {
    console.log("Qwen response:", reply);
  } else {
    console.error("No response - check the API key, base URL, and model name.");
    process.exit(1);
  }
}

main();

import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

console.log("GEMINI_API_KEY", !!process.env.GEMINI_API_KEY);
console.log("COHERE_API_KEY", !!process.env.COHERE_API_KEY);

if (process.env.COHERE_API_KEY) {
  const res = await fetch("https://api.cohere.ai/v1/generate", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.COHERE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "command-light",
      prompt: "Say hi",
      max_tokens: 10
    })
  });
  console.log("Cohere status:", res.status);
  console.log(await res.text());
}

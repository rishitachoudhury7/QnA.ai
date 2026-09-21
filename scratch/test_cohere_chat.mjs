import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function askCohere(prompt) {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) throw new Error("COHERE_API_KEY is not configured");
  
  const response = await fetch("https://api.cohere.ai/v1/chat", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "command-r",
      message: prompt,
      response_format: { type: "json_object" }
    }),
  });
  
  if (!response.ok) {
     console.log(await response.text());
     throw new Error(`Cohere API error: ${response.statusText}`);
  }
  
  const payload = await response.json();
  console.log(payload.text);
}

askCohere('Return a JSON object with {"hi": "world"}').catch(console.error);

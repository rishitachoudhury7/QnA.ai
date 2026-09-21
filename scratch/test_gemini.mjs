async function testGemini() {
  const model = "gemini-2.5-flash";
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("No API key");
    return;
  }
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "Hello" }] }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    }),
  });
  
  if (!response.ok) {
    const err = await response.text();
    console.error("HTTP Error:", response.status, err);
  } else {
    console.log("Success");
  }
}

testGemini();

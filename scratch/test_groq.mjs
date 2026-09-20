const apiKey = process.env.GROQ_API_KEY;
fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: "hello" }],
  })
}).then(async res => {
  console.log(res.status);
  console.log(await res.text());
});

const apiKey = process.env.GROQ_API_KEY;
fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "groq/compound-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "system", content: "You output json." }, { role: "user", content: "hello" }],
  })
}).then(async res => {
  console.log(res.status);
  console.log(await res.text());
});

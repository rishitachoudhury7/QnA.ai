const apiKey = process.env.GROQ_API_KEY;
fetch("https://api.groq.com/openai/v1/models", {
  headers: { Authorization: `Bearer ${apiKey}` },
}).then(async res => {
  console.log(await res.text());
});

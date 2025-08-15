export async function handler(event) {
  try {
    const { text } = JSON.parse(event.body || "{}");
    if (!text) return { statusCode: 400, body: JSON.stringify({ error: "Text is empty" }) };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: "Missing API key" }) };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Translate English text to Georgian accurately, preserving meaning." },
          { role: "user", content: text }
        ],
        temperature: 0.2
      })
    });

    const data = await response.json();
    if (data.error) return { statusCode: 400, body: JSON.stringify({ error: data.error.message }) };

    return {
      statusCode: 200,
      body: JSON.stringify({ translation: data.choices[0].message.content.trim() })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}

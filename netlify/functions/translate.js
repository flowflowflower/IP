// netlify/functions/translate.js
exports.handler = async function (event) {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing request body" }),
      };
    }

    const { text } = JSON.parse(event.body);
    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Text is empty" }),
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a tool that returns LDOCE-style British IPA transcription and Georgian translation for given English text. Respond in JSON with keys 'ipa' and 'translation'."
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: errorText }),
      };
    }

    const data = await response.json();

    let result;
    try {
      result = JSON.parse(data.choices[0].message.content.trim());
    } catch (e) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Invalid JSON from API" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

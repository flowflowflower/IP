// netlify/functions/translate.js
exports.handler = async function (event) {
  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing request body" }) };
    }

    const { text } = JSON.parse(event.body);
    if (!text || !text.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: "Text is empty" }) };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }) };
    }

    // მოვამზადოთ ხაზები backend-ზე, რომ ზუსტად ვიცოდეთ რამდენია
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" }, // აიძულებს დაბრუნდეს ვალიდური JSON
        temperature: 0,
        messages: [
          {
            role: "system",
            content: [
              "You return JSON only. No prose.",
              "Task: For the given list of English lines, produce:",
              "1) British IPA (LDOCE-style symbols, no square brackets, words separated by a single space).",
              "2) Georgian translation (accurate, natural).",
              "Output strict JSON with keys: ipa (array of strings), translation (array of strings).",
              "Arrays must have the same length as the input lines, in the same order.",
              "Do not include any extra keys or commentary."
            ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify({ lines }, null, 2)
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { statusCode: response.status, body: JSON.stringify({ error: errorText }) };
    }

    const data = await response.json();

    // data.choices[0].message.content აუცილებლად იქნება JSON (response_format-ის წყალობით)
    let parsed;
    try {
      parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    } catch {
      return { statusCode: 500, body: JSON.stringify({ error: "Invalid JSON from model" }) };
    }

    // მცირე ვალიდაცია
    if (!Array.isArray(parsed.ipa) || !Array.isArray(parsed.translation)) {
      return { statusCode: 500, body: JSON.stringify({ error: "Model JSON missing ipa/translation arrays" }) };
    }
    if (parsed.ipa.length !== lines.length || parsed.translation.length !== lines.length) {
      return { statusCode: 500, body: JSON.stringify({ error: "Array lengths do not match input lines" }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ipa: parsed.ipa,
        translation: parsed.translation
      })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

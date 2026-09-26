// Thin wrappers around the Azure AI Foundry endpoints used by the bank generators.
// Reads AZURE_AI_KEY / AZURE_AI_RESOURCE / AZURE_TEXT_MODEL from the environment.
const K = process.env.AZURE_AI_KEY;
const R = process.env.AZURE_AI_RESOURCE;
const MODEL = process.env.AZURE_TEXT_MODEL;
if (!K || !R || !MODEL) throw new Error("Missing AZURE_AI_KEY / AZURE_AI_RESOURCE / AZURE_TEXT_MODEL");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(label, fn, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= tries) throw new Error(`${label}: ${e.message}`);
      await sleep(1500 * i * i);
    }
  }
}

// Structured JSON completion via the Responses API. `input` may be a string or a message array.
export function llmJson({ input, schema, name = "out", instructions }) {
  return withRetry("llm", async () => {
    const r = await fetch(`https://${R}.services.ai.azure.com/openai/v1/responses`, {
      method: "POST",
      headers: { "api-key": K, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        instructions,
        input,
        text: { format: { type: "json_schema", name, strict: true, schema } },
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 300)}`);
    const text = j.output_text ?? j.output?.find((o) => o.type === "message")?.content?.find((c) => c.type === "output_text")?.text;
    if (!text) throw new Error("empty response");
    return JSON.parse(text);
  });
}

export function tts(ssml) {
  return withRetry("tts", async () => {
    const r = await fetch(`https://${R}.cognitiveservices.azure.com/tts/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": K,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
        "User-Agent": "tcf-prep-bank",
      },
      body: ssml,
    });
    const buf = Buffer.from(await r.arrayBuffer());
    if (!r.ok) throw new Error(`${r.status} ${buf.toString().slice(0, 300)}`);
    if (buf.length < 2000) throw new Error("audio too short");
    return buf;
  });
}

export function image(prompt, { width = 1024, height = 768 } = {}) {
  return withRetry("image", async () => {
    const r = await fetch(`https://${R}.services.ai.azure.com/providers/blackforestlabs/v1/flux-2-pro?api-version=preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${K}` },
      body: JSON.stringify({ prompt, model: "FLUX.2-pro", width, height, n: 1 }),
    });
    const j = await r.json();
    if (!r.ok || !j.data?.[0]?.b64_json) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 300)}`);
    return Buffer.from(j.data[0].b64_json, "base64");
  }, 3);
}

// Vision question about a generated picture.
export function visionJson({ imageBuf, prompt, schema, name = "vision" }) {
  return llmJson({
    name,
    schema,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: `data:image/jpeg;base64,${imageBuf.toString("base64")}` },
        ],
      },
    ],
  });
}

export const escapeXml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

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

// Fuelix gateway (OpenAI-compatible chat completions): model ids are given as "fuelix:<model>".
function fuelixJson({ model, input, schema, name, instructions }) {
  const toChat = (c) =>
    typeof c === "string" ? c : c.map((p) => (p.type === "input_image" ? { type: "image_url", image_url: { url: p.image_url } } : { type: "text", text: p.text }));
  const messages = [
    ...(instructions ? [{ role: "system", content: instructions }] : []),
    ...(typeof input === "string" ? [{ role: "user", content: input }] : input.map((m) => ({ role: m.role, content: toChat(m.content) }))),
  ];
  return withRetry(`llm ${model}`, async () => {
    let r;
    // Fuelix has a per-minute request quota: on 429, wait for the window to reset instead of failing the item.
    for (let wait = 0; ; wait++) {
      r = await fetch(`${process.env.FUELIX_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.FUELIX_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, response_format: { type: "json_schema", json_schema: { name, strict: true, schema } } }),
        signal: AbortSignal.timeout(180_000),
      });
      if (r.status !== 429 || wait >= 10) break;
      const after = Number(r.headers.get("retry-after"));
      await sleep((after > 0 ? after * 1000 : 20_000) + Math.random() * 10_000);
    }
    const t = await r.text();
    if (r.status === 429 && MODEL) {
      // Still throttled after several minutes: finish this call on Azure rather than lose the item.
      return llmJson({ input, schema, name, instructions });
    }
    if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 300)}`);
    const text = JSON.parse(t).choices?.[0]?.message?.content;
    if (!text) throw new Error("empty response");
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  });
}

// Structured JSON completion. Default: Azure Responses API; "fuelix:<id>" routes to the Fuelix gateway.
// `input` may be a string or a message array.
export function llmJson({ input, schema, name = "out", instructions, model }) {
  if (model?.startsWith("fuelix:")) return fuelixJson({ model: model.slice(7), input, schema, name, instructions });
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

// Microsoft MAI-Image-2.5 on the same resource: slower than FLUX, used when FLUX refuses a scene.
export function maiImage(prompt, { width = 1024, height = 768 } = {}) {
  return withRetry("mai-image", async () => {
    const r = await fetch(`https://${R}.services.ai.azure.com/mai/v1/images/generations`, {
      method: "POST",
      headers: { "api-key": K, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "MAI-Image-2.5", prompt, width, height }),
      signal: AbortSignal.timeout(120_000),
    });
    const j = await r.json();
    if (!r.ok || !j.data?.[0]?.b64_json) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 300)}`);
    return Buffer.from(j.data[0].b64_json, "base64");
  }, 3);
}

// Vision question about a generated picture.
export function visionJson({ imageBuf, prompt, schema, name = "vision", model }) {
  return llmJson({
    name,
    schema,
    model,
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

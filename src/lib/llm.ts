import "server-only";

// Structured JSON completions for server code (grading). "fuelix:<model>" goes to the Fuelix gateway;
// anything else, or Fuelix being unavailable, falls back to the Azure Responses API.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Args = { model: string; input: string; instructions?: string; schema: object; name: string };

async function azure({ input, instructions, schema, name }: Args) {
  const r = await fetch(`https://${process.env.AZURE_AI_RESOURCE}.services.ai.azure.com/openai/v1/responses`, {
    method: "POST",
    headers: { "api-key": process.env.AZURE_AI_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.AZURE_TEXT_MODEL, instructions, input, text: { format: { type: "json_schema", name, strict: true, schema } } }),
    signal: AbortSignal.timeout(180_000),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`azure ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  const text = j.output_text ?? j.output?.find((o: { type: string }) => o.type === "message")?.content?.find((c: { type: string }) => c.type === "output_text")?.text;
  if (!text) throw new Error("azure: empty response");
  return JSON.parse(text);
}

async function fuelix({ model, input, instructions, schema, name }: Args) {
  const messages = [...(instructions ? [{ role: "system", content: instructions }] : []), { role: "user", content: input }];
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`${process.env.FUELIX_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.FUELIX_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, response_format: { type: "json_schema", json_schema: { name, strict: true, schema } } }),
      signal: AbortSignal.timeout(180_000),
    });
    if ((r.status === 429 || r.status >= 500) && attempt < 2) {
      await sleep(15_000);
      continue;
    }
    const t = await r.text();
    if (!r.ok) throw new Error(`fuelix ${r.status} ${t.slice(0, 200)}`);
    const text = JSON.parse(t).choices?.[0]?.message?.content;
    if (!text) throw new Error("fuelix: empty response");
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  }
}

export async function llmJson<T>(args: Args): Promise<T> {
  const m = args.model.match(/^fuelix:(.+)$/);
  if (m) {
    try {
      return await fuelix({ ...args, model: m[1] });
    } catch (e) {
      console.error("llm: fuelix failed, falling back to Azure:", (e as Error).message);
    }
  }
  return azure(args);
}

// Server-side Gemini proxy. The browser SDK is pointed here (requestOptions.baseUrl) and this function
// adds the key, so the key never ships in the public bundle. vercel.json routes /api/gemini/* here.
const MODEL = "gemini-2.5-flash-image"; // fixed server-side; the model name the client sends is ignored
const UPSTREAM = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const ORIGIN_OK = /^(https:\/\/memrescueai\.appcloudpro\.com|https:\/\/memory-resurrection-engine[\w-]*\.vercel\.app|http:\/\/localhost(:\d+)?)$/;
const MAX_PARTS = 12;
const MAX_TEXT = 4000;

// ponytail: Origin only stops other websites' browsers; scripts can forge it. The real spend cap is the
// daily quota on the Gemini key in Google Cloud — set one whenever the key is replaced.
// Vercel caps request bodies at 4.5 MB, so very large or many photos get a 413 from the platform.
export function validate(body) {
  if (!body || !Array.isArray(body.contents) || body.contents.length === 0 || body.contents.length > 40) {
    return "contents must be a non-empty array";
  }
  for (const c of body.contents) {
    if (!c || !["user", "model"].includes(c.role) || !Array.isArray(c.parts) || c.parts.length > MAX_PARTS) {
      return "invalid content entry";
    }
    for (const p of c.parts) {
      if (typeof p.text === "string") { if (p.text.length > MAX_TEXT) return "text too long"; continue; }
      const d = p.inlineData;
      if (!d || typeof d.data !== "string" || !["image/png", "image/jpeg", "image/webp"].includes(d.mimeType)) {
        return "only text and png/jpeg/webp image parts are allowed";
      }
    }
  }
  return null;
}

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (origin && !ORIGIN_OK.test(origin)) return Response.json({ error: { message: "Forbidden" } }, { status: 403 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: { message: "Invalid JSON" } }, { status: 400 }); }
  const bad = validate(body);
  if (bad) return Response.json({ error: { message: bad } }, { status: 400 });

  const key = process.env.GEMINI_API_KEY;
  if (!key) { console.error("GEMINI_API_KEY is not set"); return Response.json({ error: { message: "Server not configured" } }, { status: 500 }); }

  const cfg = body.generationConfig || {};
  const upstream = await fetch(UPSTREAM, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: body.contents,
      generationConfig: { temperature: cfg.temperature, maxOutputTokens: Math.min(Number(cfg.maxOutputTokens) || 2048, 4096) },
    }),
  });
  if (!upstream.ok) {
    console.error("Gemini upstream error", upstream.status, await upstream.text());
    return Response.json({ error: { message: "The AI service failed. Please try again." } }, { status: 502 });
  }
  return new Response(upstream.body, { status: 200, headers: { "Content-Type": "application/json" } });
}

// Check: the real browser SDK, pointed at api/gemini.js, gets a normal response; the key is added
// server-side only; bad input, bad origin and a missing key are refused. Run: node scripts/check-gemini-proxy.mjs
import http from "node:http";
import assert from "node:assert/strict";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { POST } from "../api/gemini.js";

const realFetch = globalThis.fetch;
let upstreamCall = null;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith("https://generativelanguage.googleapis.com")) {
    upstreamCall = { url: String(url), key: init.headers["x-goog-api-key"], body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text: "ok" }] } }] }));
  }
  return realFetch(url, init);
};

const server = http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const r = await POST(new Request("http://x" + req.url, { method: "POST", headers: req.headers, body: Buffer.concat(chunks) }));
  res.writeHead(r.status, { "Content-Type": "application/json" }); res.end(Buffer.from(await r.arrayBuffer()));
}).listen(0);
const base = `http://localhost:${server.address().port}/api/gemini`;

try {
  process.env.GEMINI_API_KEY = "server-secret";
  const sdk = new GoogleGenerativeAI("held-by-server");
  const model = sdk.getGenerativeModel({ model: "any-client-model" }, { baseUrl: base });
  const out = await model.generateContent([{ text: "hi" }, { inlineData: { mimeType: "image/png", data: "AAAA" } }]);
  assert.equal(out.response.text(), "ok");
  assert.equal(upstreamCall.key, "server-secret");
  assert.match(upstreamCall.url, /models\/gemini-2\.5-flash-image:generateContent$/);  // client model ignored

  const chat = model.startChat({ history: [] });
  assert.equal((await chat.sendMessage("again")).response.text(), "ok");

  const post = (body, headers = {}) => POST(new Request(base, { method: "POST", headers, body: JSON.stringify(body) }));
  assert.equal((await post({ contents: [{ role: "user", parts: [{ inlineData: { mimeType: "application/pdf", data: "x" } }] }] })).status, 400);
  assert.equal((await post({ contents: [] })).status, 400);
  assert.equal((await post({ contents: [{ role: "user", parts: [{ text: "x" }] }] }, { origin: "https://evil.example" })).status, 403);
  delete process.env.GEMINI_API_KEY;
  assert.equal((await post({ contents: [{ role: "user", parts: [{ text: "x" }] }] })).status, 500);
  console.log("ok");
} finally { server.close(); }

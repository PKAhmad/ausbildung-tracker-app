import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractJsonArray(raw: string): unknown[] {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON array found in model response");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function extractJsonObject(raw: string): Record<string, unknown> {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found in model response");
  }
  return JSON.parse(text.slice(start, end + 1));
}

async function callGeminiOnce<T>(parts: unknown[], parse: (raw: string) => T) {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`Gemini API error ${res.status}: ${errText}`);
    (err as { status?: number }).status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Unexpected Gemini response shape");
  }
  return parse(text);
}

async function callGemini<T>(parts: unknown[], parse: (raw: string) => T) {
  const attempts = 3;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await callGeminiOnce(parts, parse);
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      const retryable = status === 503 || status === 429 || status === undefined;
      if (!retryable || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
    }
  }
  throw lastErr;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!GEMINI_API_KEY) {
    return jsonResponse({ error: "GEMINI_API_KEY is not configured" }, 500);
  }

  try {
    const body = await req.json();
    const mode = body?.mode;

    if (mode === "text") {
      const words = Array.isArray(body?.words) ? body.words : [];
      if (!words.length) {
        return jsonResponse({ error: "words must be a non-empty array" }, 400);
      }
      const prompt =
        `Translate these German/English computer-science textbook words into German, English, and Pashto. ` +
        `Give the meaning as used in computer science/IT, not everyday meaning. Words: ${words.join(", ")}. ` +
        `Return ONLY a JSON array, no markdown: [{"word":"...","de":"...","en":"...","ps":"..."}]`;
      const result = await callGemini([{ text: prompt }], extractJsonArray);
      return jsonResponse(result);
    }

    if (mode === "image") {
      const imageBase64 = body?.imageBase64;
      const mimeType = body?.mimeType || "image/jpeg";
      if (!imageBase64) {
        return jsonResponse({ error: "imageBase64 is required" }, 400);
      }
      const prompt =
        `This is a photo of a page from a German computer-science textbook. Some words are underlined by hand. ` +
        `Also look for a page number printed on the page — textbook page numbers are usually small text in a corner ` +
        `(top or bottom, left or right). ` +
        `Find ONLY the underlined words. For each, give its meaning in German, English, and Pashto (computer-science context), ` +
        `plus a short explanation of what it means on this page. ` +
        `Return ONLY a JSON object, no markdown: {"detectedPage":"<page number as it appears on the page, or null if not visible>",` +
        `"words":[{"word":"...","de":"...","en":"...","ps":"...","meaning":"..."}]}. If no underlined words are found, return {"detectedPage":null or "...","words":[]}.`;
      const result = await callGemini(
        [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
        extractJsonObject,
      );
      const words = Array.isArray(result?.words) ? result.words : [];
      const detectedPage = result?.detectedPage ?? null;
      return jsonResponse({ detectedPage, words });
    }

    return jsonResponse({ error: 'mode must be "text" or "image"' }, 400);
  } catch (err) {
    return jsonResponse({ error: String(err?.message || err) }, 500);
  }
});

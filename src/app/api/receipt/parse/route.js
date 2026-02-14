import { NextResponse } from "next/server";
import { getGemini, getGeminiModelName } from "@/lib/gemini";

export const runtime = "nodejs";

function safeJsonExtract(text) {
  // убираем ```json ... ```
  const cleaned = text
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();

  // пытаемся найти JSON-объект даже если модель написала текст вокруг
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) return null;

  const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, currencyHint = "USD" } = body || {};

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: "imageBase64 and mimeType are required" },
        { status: 400 }
      );
    }

    const ai = getGemini();
    const model = getGeminiModelName();

    const prompt = `
You are a receipt parser for a personal finance app.

Return ONLY valid JSON (no markdown, no extra text) with this schema:
{
  "merchant": string | null,
  "receiptDate": string | null, // YYYY-MM-DD if possible
  "currency": string, // 3-letter code, use ${currencyHint} if unclear
  "total": number | null,
  "items": [
    {
      "name": string,
      "qty": number | null,
      "unitPrice": number | null,
      "amount": number | null,
      "category": string | null
    }
  ],
  "confidence": number // 0..1
}

Rules:
- If you can't read something, put null.
- total must be a number (use dot for decimals).
- Categories: food, transport, entertainment, health, shopping, utilities, education, other.
- currency must be a 3-letter code (KZT, USD, EUR, etc).
`;

    const contents = [
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
      { text: prompt },
    ];

    const resp = await ai.models.generateContent({
      model,
      contents,
      config: {
        temperature: 0.2,
        maxOutputTokens: 900,
      },
    });

    const text = resp?.text || "";
    const parsed = safeJsonExtract(text);

    if (!parsed) {
      return NextResponse.json(
        { error: "Could not parse JSON from Gemini", raw: text.slice(0, 600) },
        { status: 502 }
      );
    }

    // минимальная нормализация
    if (!parsed.currency) parsed.currency = currencyHint;
    if (typeof parsed.confidence !== "number") parsed.confidence = 0.5;

    return NextResponse.json({ receipt: parsed });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

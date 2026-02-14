import { GoogleGenAI } from "@google/genai";

export function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY in .env");
  return new GoogleGenAI({ apiKey: key });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function safeText(x) {
  return String(x ?? "").slice(0, 6000);
}

function toGeminiRole(role) {
  // Gemini REST uses "user" and "model"
  // We'll map "assistant" -> "model"
  if (role === "assistant") return "model";
  if (role === "model") return "model";
  return "user";
}

function pickCurrencySymbol(currency) {
  const c = String(currency || "").toUpperCase();
  if (c === "KZT") return "₸";
  if (c === "USD") return "$";
  if (c === "EUR") return "€";
  if (c === "GBP") return "£";
  return c || "";
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function offlineCoachReply({ sym, month, userMessage }) {
  // очень простой fallback на случай 429/ошибок
  const m = (userMessage || "").toLowerCase();

  if (m.includes("income") || m.includes("salary") || m.includes("доход") || m.includes("зарп")) {
    return `To make predictions accurate, add an **income** transaction (type: income). Then I can calculate budget health and savings targets.`;
  }

  if (month.income <= 0) {
    return `I can’t see your monthly income yet. Add salary/income to make predictions accurate. Money left: ${Math.round(month.left).toLocaleString()} ${sym}`;
  }

  if (month.percentUsed >= 100) {
    return `Overspending detected. For the next 7 days: cut 1–2 non-essential categories and set a small daily limit. Money left: ${Math.round(month.left).toLocaleString()} ${sym}`;
  }

  if (month.percentUsed >= 80) {
    return `You’re close to the monthly limit. Try reducing cafés/delivery by ~20% for the rest of the month. Money left: ${Math.round(month.left).toLocaleString()} ${sym}`;
  }

  return `Good control (~${Math.round(month.percentUsed)}% of income spent). Pick a small saving target and automate it weekly. Money left: ${Math.round(month.left).toLocaleString()} ${sym}`;
}

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing in .env" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId || "");
    const message = safeText(body.message || "");
    const history = Array.isArray(body.history) ? body.history : [];
    const uiContext = body.context || null;

    if (!userId || !message) {
      return NextResponse.json({ error: "userId and message are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, currency: true, createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Подтягиваем данные приложения (чтобы AI “видел” данные)
    const lastTx = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { type: true, title: true, amount: true, category: true, createdAt: true },
    });

    const activeCalcs = await prisma.calcItem.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: { kind: true, name: true, endDate: true, payload: true, updatedAt: true },
    });

    // Серверный summary (чтобы не зависеть от фронта)
    const monthStart = startOfMonth();
    let income = 0,
      expense = 0,
      savings = 0,
      planned = 0;

    for (const t of lastTx) {
      const d = new Date(t.createdAt);
      const inMonth = Number.isFinite(d.getTime()) && d >= monthStart;
      if (!inMonth) continue;

      const amt = Number(t.amount || 0);
      const type = String(t.type || "").toLowerCase();
      const cat = String(t.category || "").toLowerCase();

      if (type === "income") income += amt;
      if (type === "expense") expense += amt;
      if (type === "expense" && cat === "savings") savings += amt; // piggy
      if (type === "expense" && cat === "planned") planned += amt; // monthly planned
    }

    const spending = Math.max(0, expense - savings);
    const left = income - spending - savings;
    const percentUsed = income > 0 ? (spending / income) * 100 : spending > 0 ? 999 : 0;

    const sym = pickCurrencySymbol(user.currency);

    const appContext = {
      user: { currency: user.currency, email: user.email },
      month: {
        income,
        spending,
        savings,
        planned,
        left,
        percentUsed,
      },
      // UI computed context (если ты передаёшь с фронта)
      uiComputed: uiContext,
      lastTransactions: lastTx.slice(0, 25),
      calculators: activeCalcs.slice(0, 15).map((c) => ({
        kind: c.kind,
        name: c.name,
        endDate: c.endDate,
        // payload может быть большим — обрежем строкой
        payloadPreview: JSON.stringify(c.payload || {}).slice(0, 1200),
      })),
    };

    const systemInstruction =
      `You are "WorthIt" — an assistant inside a personal finance PWA.\n` +
      `You must answer ANY finance/budgeting questions, but always grounded in the user's app data.\n` +
      `Use currency symbol: ${sym}\n` +
      `Rules:\n` +
      `- Be short, practical, mobile-friendly.\n` +
      `- You can suggest budgeting, saving, debt payoff, installment planning, but no guarantees.\n` +
      `- If data is missing, ask what to add in the app (income, planned payments, etc.).\n` +
      `- When you compute, show the formula in 1 line.\n`;

    // Собираем contents: 1) контекст приложения 2) история 3) текущее сообщение
    const contents = [];

    contents.push({
      role: "user",
      parts: [{ text: `APP_DATA_JSON:\n${JSON.stringify(appContext)}` }],
    });

    // последние 10 сообщений для контекста диалога
    for (const h of history.slice(-10)) {
      const r = toGeminiRole(h?.role);
      const txt = safeText(h?.text);
      if (!txt) continue;
      contents.push({ role: r, parts: [{ text: txt }] });
    }

    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: { text: systemInstruction } },
        contents,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 350,
        },
      }),
    });

    const raw = await resp.text();

    // Gemini иногда отдаёт JSON ошибки вида { error: { code, message, status } }
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {}

    if (!resp.ok) {
      // 429 — квоты/лимиты
      if (resp.status === 429) {
        const retryAfterHeader = resp.headers.get("retry-after");
        const retryAfterSec =
          Number(retryAfterHeader) ||
          Number(parsed?.error?.details?.[0]?.retryDelay?.seconds) ||
          60;

        return NextResponse.json(
          {
            error: `Gemini rate limit (429). Try again in ${retryAfterSec}s.`,
            retryAfterSec,
            fallbackReply: offlineCoachReply({
              sym,
              month: appContext.month,
              userMessage: message,
            }),
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: `Gemini error (${resp.status})`,
          details: (parsed?.error?.message || raw || "").slice(0, 800),
        },
        { status: 500 }
      );
    }

    const reply =
      parsed?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim() ||
      "Empty reply. Try again.";

    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

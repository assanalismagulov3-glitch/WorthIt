"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadUser } from "@/lib/session";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function AIPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [tx, setTx] = useState([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I’m your WorthIt budget coach. Ask me about spending, savings, goals, monthly payments, or how to plan your budget.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [cooldownUntil, setCooldownUntil] = useState(0);

  const bottomRef = useRef(null);

  useEffect(() => {
    const u = loadUser();
    setUser(u);

    if (!u?.id) {
      router.push("/signin");
      return;
    }

    const load = async () => {
      setErr("");
      setLoading(true);
      try {
        const res = await fetch(`/api/tx?userId=${encodeURIComponent(u.id)}`);
        const raw = await res.text();
        let data = {};
        try {
          data = JSON.parse(raw);
        } catch {}

        if (!res.ok) {
          setErr(data?.error || raw.slice(0, 200) || `Error (${res.status})`);
          setTx([]);
          return;
        }

        setTx(Array.isArray(data.tx) ? data.tx : []);
      } catch (e) {
        setErr(e?.message || "Network error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const stats = useMemo(() => {
    const monthStart = startOfMonth();
    let income = 0;
    let expense = 0;
    let savings = 0;
    let planned = 0;

    for (const t of tx) {
      const d = new Date(t.createdAt);
      const inMonth = Number.isFinite(d.getTime()) && d >= monthStart;
      if (!inMonth) continue;

      const amt = Number(t.amount || 0);
      const type = String(t.type || "").toLowerCase();
      const cat = String(t.category || "").toLowerCase();

      if (type === "income") income += amt;
      if (type === "expense") expense += amt;
      if (type === "expense" && cat === "savings") savings += amt;
      if (type === "expense" && cat === "planned") planned += amt;
    }

    const spending = Math.max(0, expense - savings);
    const left = income - spending - savings;
    const percentUsed = income > 0 ? (spending / income) * 100 : spending > 0 ? 999 : 0;

    let health = "green";
    if (percentUsed >= 80) health = "yellow";
    if (percentUsed >= 100) health = "red";

    return { income, spending, savings, planned, left, percentUsed, health };
  }, [tx]);

  const tips = useMemo(() => {
    if (loading) return [];
    const arr = [];

    if (stats.income <= 0) {
      arr.push("Add your monthly income (salary) in the app to get accurate predictions.");
    } else {
      if (stats.health === "red") arr.push("Overspending detected. Cut non-essential categories for 7 days.");
      else if (stats.health === "yellow") arr.push("Close to the limit. Reduce cafés/delivery by ~20%.");
      else arr.push("Good control. Try a mini challenge: 1 day without delivery.");
    }

    if (stats.planned > 0) arr.push("Planned monthly payments are active.");
    if (stats.savings > 0) arr.push("Nice — you saved to Piggy bank this month.");
    arr.push("Ask: “Make me a plan to save for a goal in 3 months.”");

    return arr.slice(0, 4);
  }, [stats, loading]);

  const cooldownLeftSec = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));

  const send = async () => {
    if (sending) return;
    if (!user?.id) return;

    if (Date.now() < cooldownUntil) {
      setMessages((m) => [...m, { role: "assistant", text: `Rate limit. Wait ${cooldownLeftSec}s and try again.` }]);
      return;
    }

    const text = input.trim();
    if (!text) return;

    // отправляем историю (последние 10 сообщений)
    const history = messages.slice(-10).map((m) => ({ role: m.role, text: m.text }));

    const context = {
      month: {
        income: stats.income,
        spending: stats.spending,
        savings: stats.savings,
        planned: stats.planned,
        left: stats.left,
        percentUsed: stats.percentUsed,
      },
    };

    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, message: text, context, history }),
      });

      const raw = await res.text();
      let data = {};
      try {
        data = JSON.parse(raw);
      } catch {
        setMessages((m) => [...m, { role: "assistant", text: raw.slice(0, 250) || "Bad JSON response" }]);
        return;
      }

      if (!res.ok) {
        if (res.status === 429) {
          const wait = Number(data?.retryAfterSec || 60);
          setCooldownUntil(Date.now() + wait * 1000);

          // покажем fallback, если сервер прислал
          const fallback = data?.fallbackReply ? `\n\n(Offline fallback)\n${data.fallbackReply}` : "";
          setMessages((m) => [...m, { role: "assistant", text: (data?.error || `Rate limit. Wait ${wait}s.`) + fallback }]);
          return;
        }

        setMessages((m) => [...m, { role: "assistant", text: data?.error || `AI error (${res.status})` }]);
        if (data?.details) {
          setMessages((m) => [...m, { role: "assistant", text: `Details: ${String(data.details).slice(0, 400)}` }]);
        }
        return;
      }

      setMessages((m) => [...m, { role: "assistant", text: data.reply || "OK" }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: e?.message || "Network error" }]);
    } finally {
      setSending(false);
    }
  };

  const healthText =
    stats.health === "green"
      ? "Budget health: Good ✅"
      : stats.health === "yellow"
      ? "Budget health: Careful ⚠️"
      : "Budget health: Overspending ❌";

  const healthBar =
    stats.health === "green" ? "bg-emerald-500" : stats.health === "yellow" ? "bg-yellow-400" : "bg-red-500";

  return (
    <div className="space-y-4">
      {/* Advice */}
      <div className="rounded-[28px] bg-white/80 border border-black/10 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-extrabold">AI advice</div>
          <div className="text-xs text-black/45">{healthText}</div>
        </div>

        <div className="mt-2 h-3 rounded-full bg-black/10 overflow-hidden">
          <div className={`h-full ${healthBar}`} style={{ width: `${Math.min(100, Math.round(stats.percentUsed || 0))}%` }} />
        </div>

        {loading ? (
          <div className="mt-3 text-sm text-black/50">Loading...</div>
        ) : err ? (
          <div className="mt-3 text-sm text-red-600">{err}</div>
        ) : (
          <div className="mt-3 space-y-2">
            {tips.map((t, i) => (
              <div key={i} className="rounded-2xl bg-[#F4F6FB] px-4 py-3 text-sm text-black/75">
                {t}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="rounded-[28px] bg-white/80 border border-black/10 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-extrabold">Chat</div>
          {cooldownLeftSec > 0 ? <div className="text-xs text-red-600">Rate limit: {cooldownLeftSec}s</div> : null}
        </div>

        <div className="h-[300px] overflow-auto space-y-2 pr-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold"
                  : "mr-auto max-w-[85%] rounded-2xl bg-[#F4F6FB] px-4 py-3 text-sm text-black/80"
              }
            >
              {m.text}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 rounded-full bg-[#F4F6FB] px-4 py-3 outline-none"
            placeholder="Ask anything about finance..."
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || cooldownLeftSec > 0}
            className="rounded-full bg-[var(--accent)] px-5 font-extrabold shadow-[0_10px_18px_rgba(0,0,0,0.18)] disabled:opacity-60"
          >
            {sending ? "..." : "Send"}
          </button>
        </div>

        <div className="mt-2 text-xs text-black/45">
          AI reads your transactions + calculators from DB via <span className="font-semibold">/api/ai</span>.
        </div>
      </div>
    </div>
  );
}

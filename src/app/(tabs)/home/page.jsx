"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadUser } from "@/lib/session";

function formatMoney(n, currency) {
  const sym = currency === "KZT" ? "₸" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency;
  const val = Number(n || 0);
  return `${Math.round(val).toLocaleString()} ${sym}`;
}

function startOfMonthISO() {
  const d = new Date();
  const s = new Date(d.getFullYear(), d.getMonth(), 1);
  return s.toISOString();
}

// compress image to base64 jpeg for faster upload
async function compressToBase64(file, maxW = 1080, quality = 0.82) {
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const scale = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  const out = canvas.toDataURL("image/jpeg", quality);
  const base64 = out.split(",")[1]; // remove "data:image/jpeg;base64,"
  return { base64, mimeType: "image/jpeg", preview: out };
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [tx, setTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // receipt modal
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [receiptParsing, setReceiptParsing] = useState(false);
  const [receiptErr, setReceiptErr] = useState("");
  const [receiptData, setReceiptData] = useState(null);
  const [savingReceipt, setSavingReceipt] = useState(false);

  const loadTx = async (u) => {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`/api/tx?userId=${encodeURIComponent(u.id)}`);
      const raw = await res.text();
      let data = {};
      try { data = JSON.parse(raw); } catch {}
      if (!res.ok) {
        setErr(data?.error || raw.slice(0, 200) || `Error (${res.status})`);
        setTx([]);
        return;
      }
      setTx(data.tx || []);
    } catch (e) {
      setErr(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const u = loadUser();
    setUser(u);
    if (!u?.id) {
      router.push("/signin");
      return;
    }
    loadTx(u);
  }, [router]);

  const stats = useMemo(() => {
    const currency = user?.currency || "USD";
    const monthStart = new Date(startOfMonthISO());

    let incomeThisMonth = 0;
    let expenseThisMonth = 0;
    let plannedMonthly = 0;
    let paidThisMonth = 0;

    let incomeAll = 0;
    let expenseAll = 0;

    for (const t of tx) {
      const amt = Number(t.amount || 0);

      if (t.type === "income") incomeAll += amt;
      if (t.type === "expense") expenseAll += amt;

      const d = new Date(t.createdAt);
      const inThisMonth = d >= monthStart;

      if (inThisMonth) {
        if (t.type === "income") incomeThisMonth += amt;
        if (t.type === "expense") expenseThisMonth += amt;

        if (t.type === "expense" && t.category === "this_month") paidThisMonth += amt;
      }

      if (t.type === "expense" && t.category === "planned") plannedMonthly += amt;
    }

    const balanceAll = incomeAll - expenseAll;

    const percentUsed =
      incomeThisMonth > 0 ? (expenseThisMonth / incomeThisMonth) * 100 : (expenseThisMonth > 0 ? 999 : 0);

    let health = "green";
    if (percentUsed >= 80) health = "yellow";
    if (percentUsed >= 100) health = "red";

    return {
      currency,
      incomeThisMonth,
      expenseThisMonth,
      balanceAll,
      plannedMonthly,
      paidThisMonth,
      health,
      percentUsed,
    };
  }, [tx, user]);

  const healthText =
    stats.health === "green"
      ? "Budget health: Good ✅"
      : stats.health === "yellow"
      ? "Budget health: Careful ⚠️"
      : "Budget health: Overspending ❌";

  const healthBarBg =
    stats.health === "green"
      ? "bg-emerald-500"
      : stats.health === "yellow"
      ? "bg-yellow-400"
      : "bg-red-500";

  const onPickReceipt = async (file) => {
    setReceiptErr("");
    setReceiptData(null);
    setReceiptParsing(true);

    try {
      const { base64, mimeType, preview } = await compressToBase64(file);
      setReceiptPreview(preview);

      const res = await fetch("/api/receipt/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          currencyHint: stats.currency || "USD",
        }),
      });

      const raw = await res.text();
      let data = {};
      try { data = JSON.parse(raw); } catch {}

      if (!res.ok) {
        setReceiptErr(data?.error || raw.slice(0, 200) || `Parse failed (${res.status})`);
        return;
      }

      setReceiptData(data.receipt);
    } catch (e) {
      setReceiptErr(e?.message || "Parse error");
    } finally {
      setReceiptParsing(false);
    }
  };

  const saveReceiptAsExpense = async () => {
    if (!user?.id || !receiptData?.total) return;
    setSavingReceipt(true);
    setReceiptErr("");
    try {
      const title = receiptData.merchant || "Receipt";
      const amount = Number(receiptData.total);

      const res = await fetch("/api/tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          type: "expense",
          title,
          amount,
          category: "this_month",
          source: "receipt",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReceiptErr(data?.error || `Save failed (${res.status})`);
        return;
      }

      setReceiptOpen(false);
      setReceiptPreview("");
      setReceiptData(null);
      await loadTx(user);
    } catch (e) {
      setReceiptErr(e?.message || "Save error");
    } finally {
      setSavingReceipt(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top summary card */}
      <div className="rounded-[28px] bg-white/80 border border-black/10 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs text-black/50">Total balance</div>
            <div className="text-2xl font-extrabold truncate">
              {formatMoney(stats.balanceAll, stats.currency)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/add-spending")}
            className="shrink-0 w-12 h-12 rounded-full bg-[var(--accent)] shadow-[0_10px_18px_rgba(0,0,0,0.18)] font-extrabold text-xl"
            aria-label="Add"
          >
            +
          </button>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <div className="text-black/70">{healthText}</div>
            <div className="text-black/45">{Math.min(999, Math.round(stats.percentUsed))}%</div>
          </div>

          <div className="mt-2 h-3 rounded-full bg-black/10 overflow-hidden">
            <div
              className={`h-full ${healthBarBg}`}
              style={{ width: `${Math.min(100, Math.round(stats.percentUsed))}%` }}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-[#F4F6FB] p-3">
              <div className="text-black/50 text-xs">Income (this month)</div>
              <div className="font-extrabold">{formatMoney(stats.incomeThisMonth, stats.currency)}</div>
            </div>
            <div className="rounded-2xl bg-[#F4F6FB] p-3">
              <div className="text-black/50 text-xs">Expenses (this month)</div>
              <div className="font-extrabold">{formatMoney(stats.expenseThisMonth, stats.currency)}</div>
            </div>
          </div>

          {loading ? (
            <div className="mt-3 text-sm text-black/50">Loading...</div>
          ) : err ? (
            <div className="mt-3 text-sm text-red-600">{err}</div>
          ) : null}
        </div>
      </div>

      {/* Quick actions (mobile friendly) */}
      <div className="rounded-[28px] bg-white/80 border border-black/10 shadow-sm p-5">
        <div className="text-sm font-extrabold mb-3">Quick actions</div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => router.push("/add-spending")}
            className="rounded-2xl bg-[#F4F6FB] py-3 font-semibold border border-black/10"
          >
            Add manual
          </button>

          <button
            type="button"
            onClick={() => setReceiptOpen(true)}
            className="rounded-2xl bg-[var(--accent)] py-3 font-semibold shadow-[0_10px_18px_rgba(0,0,0,0.18)]"
          >
            Scan receipt
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push("/ai")}
          className="mt-3 w-full rounded-2xl bg-white py-3 font-semibold border border-black/10"
        >
          Open AI coach
        </button>
      </div>

      {/* Payments summary (no recent tx list) */}
      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-[28px] bg-white/80 border border-black/10 shadow-sm p-5">
          <div className="text-sm font-extrabold mb-1">Payments this month</div>
          <div className="text-xl font-extrabold">{formatMoney(stats.paidThisMonth, stats.currency)}</div>
          <div className="mt-2 text-sm text-black/60">
            Add them in <span className="font-semibold">Add manual</span> → “Payments this month”.
          </div>
        </div>

        <div className="rounded-[28px] bg-white/80 border border-black/10 shadow-sm p-5">
          <div className="text-sm font-extrabold mb-1">Monthly planned payments</div>
          <div className="text-xl font-extrabold">{formatMoney(stats.plannedMonthly, stats.currency)}</div>
          <div className="mt-2 text-sm text-black/60">
            Add planned in <span className="font-semibold">Add manual</span> → “Monthly planned payments”.
          </div>
        </div>
      </div>

      {/* Receipt modal */}
      {receiptOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center p-3">
          <div className="w-full max-w-[420px] rounded-[28px] bg-white p-5 shadow-xl border border-black/10">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-extrabold">Scan receipt</div>
              <button
                type="button"
                className="text-black/50 font-semibold"
                onClick={() => {
                  setReceiptOpen(false);
                  setReceiptPreview("");
                  setReceiptData(null);
                  setReceiptErr("");
                }}
              >
                Close
              </button>
            </div>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickReceipt(f);
              }}
              className="w-full"
            />

            {receiptPreview ? (
              <img
                src={receiptPreview}
                alt="receipt preview"
                className="mt-3 w-full rounded-2xl border border-black/10"
              />
            ) : null}

            {receiptParsing ? (
              <div className="mt-3 text-sm text-black/60">Parsing with AI…</div>
            ) : null}

            {receiptErr ? (
              <div className="mt-3 text-sm text-red-600">{receiptErr}</div>
            ) : null}

            {receiptData ? (
              <div className="mt-3 rounded-2xl bg-[#F4F6FB] p-3">
                <div className="text-sm font-semibold">
                  {receiptData.merchant || "Unknown merchant"}
                </div>
                <div className="text-xs text-black/55">
                  {receiptData.receiptDate ? `Date: ${receiptData.receiptDate}` : "Date: —"}
                  {" • "}
                  Confidence: {Math.round((receiptData.confidence || 0.5) * 100)}%
                </div>

                <div className="mt-2 text-lg font-extrabold">
                  Total: {formatMoney(receiptData.total || 0, receiptData.currency || stats.currency)}
                </div>

                <button
                  type="button"
                  onClick={saveReceiptAsExpense}
                  disabled={savingReceipt}
                  className="mt-3 w-full rounded-2xl bg-[var(--accent)] py-3 font-semibold shadow-[0_10px_18px_rgba(0,0,0,0.18)] disabled:opacity-60"
                >
                  {savingReceipt ? "Saving…" : "Add as expense"}
                </button>

                <div className="mt-2 text-xs text-black/45">
                  MVP: we save the receipt as one expense (later we’ll add “save items separately”).
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

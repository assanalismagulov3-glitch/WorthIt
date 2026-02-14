"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadUser } from "@/lib/session";

/** =======================
 *  Currency helpers
 *  ======================= */
const COMMON_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "KZT", name: "Kazakhstani Tenge" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "AED", name: "UAE Dirham" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "KRW", name: "South Korean Won" },
  { code: "INR", name: "Indian Rupee" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "THB", name: "Thai Baht" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "VND", name: "Vietnamese Dong" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "ZAR", name: "South African Rand" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "UAH", name: "Ukrainian Hryvnia" },
];

function safeCurrency(code) {
  const c = String(code || "").toUpperCase().trim();
  if (/^[A-Z]{3}$/.test(c)) return c;
  return "USD";
}

function formatMoney(n, currency) {
  const val = Number(n || 0);
  const cur = safeCurrency(currency);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(val);
  } catch {
    return `${Math.round(val).toLocaleString()} ${cur}`;
  }
}

function todayInputDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0);
  return d;
}

function toNum(raw) {
  const s = String(raw ?? "").replace(/\s/g, "").replace(",", ".");
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : 0;
}

function annuityPayment(P, annualRate, months) {
  const n = Math.max(1, Number(months || 0));
  const r = Math.max(0, Number(annualRate || 0)) / 100 / 12;
  if (r === 0) return P / n;
  const pow = Math.pow(1 + r, n);
  return (P * r * pow) / (pow - 1);
}

function monthDiff(startDate, opDate) {
  const s = new Date(startDate);
  const o = new Date(opDate);
  return (o.getFullYear() - s.getFullYear()) * 12 + (o.getMonth() - s.getMonth());
}

function simulateDeposit({
  initial,
  annualRate,
  months,
  monthlyTopUp,
  monthlyWithdraw,
  startDate,
  ops,
}) {
  const n = Math.max(1, Number(months || 1));
  const r = Math.max(0, Number(annualRate || 0)) / 100 / 12;

  let balance = toNum(initial);
  let invested = toNum(initial);

  const groups = new Map();
  for (const op of ops || []) {
    const m = monthDiff(startDate, op.date);
    if (m >= 0 && m < n) {
      if (!groups.has(m)) groups.set(m, []);
      groups.get(m).push(op);
    }
  }

  for (let i = 0; i < n; i++) {
    if (r > 0) balance = balance * (1 + r);

    const top = toNum(monthlyTopUp);
    const wd = toNum(monthlyWithdraw);

    if (top > 0) {
      balance += top;
      invested += top;
    }
    if (wd > 0) {
      balance -= wd;
    }

    const opsThis = groups.get(i) || [];
    for (const op of opsThis) {
      const amt = toNum(op.amount);
      if (op.type === "topup") {
        balance += amt;
        invested += amt;
      } else if (op.type === "withdraw") {
        balance -= amt;
      }
    }
  }

  const profit = Math.max(0, balance - invested);
  return { balance, profit, invested };
}

/** =======================
 *  UI components (OUTSIDE)
 *  This fixes focus-loss bug
 *  ======================= */
function Card({ title, children }) {
  return (
    <div className="rounded-[28px] bg-white/80 border border-black/10 shadow-sm p-5 space-y-3">
      <div className="text-sm font-extrabold">{title}</div>
      {children}
    </div>
  );
}

function TabBtn({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex-1 rounded-full bg-[var(--accent)] py-2 font-extrabold shadow-[0_10px_18px_rgba(0,0,0,0.18)]"
          : "flex-1 rounded-full bg-[#F4F6FB] py-2 font-extrabold border border-black/10"
      }
    >
      {label}
    </button>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-full bg-[#F4F6FB] px-4 py-3 outline-none"
      placeholder={placeholder}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      type="text"
    />
  );
}

function NumInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-full bg-[#F4F6FB] px-4 py-3 outline-none"
      placeholder={placeholder}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      type="text"
      inputMode="decimal"
    />
  );
}

function CurrencyPicker({ value, setValue, customValue, setCustomValue }) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-black/55 pl-1">Currency</div>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-full bg-[#F4F6FB] px-4 py-3 outline-none"
      >
        {COMMON_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} — {c.name}
          </option>
        ))}
        <option value="CUSTOM">Other (type ISO code)</option>
      </select>

      {value === "CUSTOM" && (
        <TextInput
          value={customValue}
          onChange={setCustomValue}
          placeholder="Type currency code (e.g., SGD, MAD, BDT)"
        />
      )}
    </div>
  );
}

/** =======================
 *  Main page
 *  ======================= */
export default function CalculatorsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [tab, setTab] = useState("installment"); // installment | loan | deposit | split
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [err, setErr] = useState("");

  // Installment (0%)
  const [insName, setInsName] = useState("");
  const [insAmount, setInsAmount] = useState("");
  const [insDown, setInsDown] = useState("");
  const [insMonths, setInsMonths] = useState("");
  const [insFirstDate, setInsFirstDate] = useState(todayInputDate());
  const [insCurrency, setInsCurrency] = useState("USD");
  const [insCustomCurrency, setInsCustomCurrency] = useState("");

  // Loan
  const [loanName, setLoanName] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanMonths, setLoanMonths] = useState("");
  const [loanRate, setLoanRate] = useState("");
  const [loanFirstDate, setLoanFirstDate] = useState(todayInputDate());
  const [loanCurrency, setLoanCurrency] = useState("USD");
  const [loanCustomCurrency, setLoanCustomCurrency] = useState("");

  // Deposit
  const [depName, setDepName] = useState("");
  const [depStart, setDepStart] = useState("");
  const [depRate, setDepRate] = useState("");
  const [depMonths, setDepMonths] = useState("");
  const [depMonthlyTopUp, setDepMonthlyTopUp] = useState("");
  const [depMonthlyWithdraw, setDepMonthlyWithdraw] = useState("");
  const [depStartDate, setDepStartDate] = useState(todayInputDate());
  const [depCurrency, setDepCurrency] = useState("USD");
  const [depCustomCurrency, setDepCustomCurrency] = useState("");

  const [depOps, setDepOps] = useState([]); // {type, amount, date}
  const [opType, setOpType] = useState("topup");
  const [opAmount, setOpAmount] = useState("");
  const [opDate, setOpDate] = useState(todayInputDate());

  // Split
  const [splitName, setSplitName] = useState("");
  const [splitTotal, setSplitTotal] = useState("");
  const [splitPeople, setSplitPeople] = useState("");
  const [splitTip, setSplitTip] = useState("");
  const [splitCurrency, setSplitCurrency] = useState("USD");
  const [splitCustomCurrency, setSplitCustomCurrency] = useState("");

  const resolveCurrency = (selected, custom) => {
    if (selected === "CUSTOM") return safeCurrency(custom);
    return safeCurrency(selected);
  };

  const insCur = resolveCurrency(insCurrency, insCustomCurrency);
  const loanCur = resolveCurrency(loanCurrency, loanCustomCurrency);
  const depCur = resolveCurrency(depCurrency, depCustomCurrency);
  const splitCur = resolveCurrency(splitCurrency, splitCustomCurrency);

  useEffect(() => {
    const u = loadUser();
    setUser(u);

    if (!u?.id) {
      router.push("/signin");
      return;
    }

    const base = safeCurrency(u.currency || "USD");
    setInsCurrency(base);
    setLoanCurrency(base);
    setDepCurrency(base);
    setSplitCurrency(base);

    reload(u.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const reload = async (userId) => {
    setErr("");
    setLoadingList(true);
    try {
      const res = await fetch(`/api/calculators?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || "Failed to load calculators");
        setItems([]);
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setErr(e?.message || "Network error");
    } finally {
      setLoadingList(false);
    }
  };

  const saveItem = async (kind, name, payload, endDate) => {
    if (!user?.id) return;
    setErr("");
    try {
      const res = await fetch("/api/calculators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          kind,
          name,
          payload,
          isActive: true,
          endDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || "Save failed");
        return;
      }
      await reload(user.id);
    } catch (e) {
      setErr(e?.message || "Network error");
    }
  };

  const toggleActive = async (id, next) => {
    if (!user?.id) return;
    setErr("");
    try {
      const res = await fetch("/api/calculators", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, userId: user.id, patch: { isActive: next } }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || "Update failed");
        return;
      }
      await reload(user.id);
    } catch (e) {
      setErr(e?.message || "Network error");
    }
  };

  const removeItem = async (id) => {
    if (!user?.id) return;
    setErr("");
    try {
      const res = await fetch(
        `/api/calculators?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(user.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || "Delete failed");
        return;
      }
      await reload(user.id);
    } catch (e) {
      setErr(e?.message || "Network error");
    }
  };

  /** ====== Previews ====== */
  const insPreview = useMemo(() => {
    const total = toNum(insAmount);
    const down = toNum(insDown);
    const principal = Math.max(0, total - down);
    const months = Math.max(1, Math.trunc(toNum(insMonths) || 1));
    const monthly = principal / months;
    const end = addMonths(new Date(insFirstDate), months - 1);
    return { principal, months, monthly, end };
  }, [insAmount, insDown, insMonths, insFirstDate]);

  const loanPreview = useMemo(() => {
    const principal = toNum(loanAmount);
    const months = Math.max(1, Math.trunc(toNum(loanMonths) || 1));
    const rate = Math.max(0, toNum(loanRate));
    const monthly = annuityPayment(principal, rate, months);
    const end = addMonths(new Date(loanFirstDate), months - 1);
    const totalPay = monthly * months;
    const overpay = Math.max(0, totalPay - principal);
    return { monthly, totalPay, overpay, end };
  }, [loanAmount, loanMonths, loanRate, loanFirstDate]);

  const depPreview = useMemo(() => {
    const n = Math.max(1, Math.trunc(toNum(depMonths) || 1));
    const end = addMonths(new Date(depStartDate), n);

    const sim = simulateDeposit({
      initial: depStart,
      annualRate: toNum(depRate),
      months: n,
      monthlyTopUp: depMonthlyTopUp,
      monthlyWithdraw: depMonthlyWithdraw,
      startDate: depStartDate,
      ops: depOps,
    });

    return { fv: sim.balance, profit: sim.profit, invested: sim.invested, end };
  }, [depStart, depRate, depMonths, depMonthlyTopUp, depMonthlyWithdraw, depStartDate, depOps]);

  const splitPreview = useMemo(() => {
    const total = toNum(splitTotal);
    const tipPct = Math.max(0, toNum(splitTip));
    const people = Math.max(1, Math.trunc(toNum(splitPeople) || 1));
    const withTip = total * (1 + tipPct / 100);
    const per = withTip / people;
    return { withTip, per };
  }, [splitTotal, splitPeople, splitTip]);

  const currentList = useMemo(() => items.filter((x) => x.kind === tab), [items, tab]);
  const now = new Date();

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="rounded-[28px] bg-white/80 border border-black/10 shadow-sm p-4">
        <div className="text-sm font-extrabold mb-3">Calculators</div>

        <div className="flex gap-2">
          <TabBtn active={tab === "installment"} label="Installment" onClick={() => setTab("installment")} />
          <TabBtn active={tab === "loan"} label="Loan" onClick={() => setTab("loan")} />
        </div>

        <div className="flex gap-2 mt-2">
          <TabBtn active={tab === "deposit"} label="Deposit" onClick={() => setTab("deposit")} />
          <TabBtn active={tab === "split"} label="Split" onClick={() => setTab("split")} />
        </div>

        {err ? <div className="text-sm text-red-600 mt-3">{err}</div> : null}
      </div>

      {/* Installment */}
      {tab === "installment" && (
        <Card title="Installment (0% / no interest)">
          <CurrencyPicker
            value={insCurrency}
            setValue={setInsCurrency}
            customValue={insCustomCurrency}
            setCustomValue={setInsCustomCurrency}
          />

          <TextInput value={insName} onChange={setInsName} placeholder="Name (e.g., Kaspi Installment)" />
          <NumInput value={insAmount} onChange={setInsAmount} placeholder="Total price" />
          <NumInput value={insDown} onChange={setInsDown} placeholder="Down payment (optional)" />
          <NumInput value={insMonths} onChange={setInsMonths} placeholder="Months" />

          <div className="grid grid-cols-2 gap-2 items-center">
            <div className="text-xs text-black/55 pl-1">First payment date</div>
            <input
              type="date"
              className="w-full rounded-full bg-[#F4F6FB] px-4 py-3 outline-none"
              value={insFirstDate}
              onChange={(e) => setInsFirstDate(e.target.value)}
            />
          </div>

          <div className="rounded-2xl bg-[#F4F6FB] p-4 text-sm text-black/75">
            <div className="flex justify-between">
              <span>Monthly payment</span>
              <b>{formatMoney(insPreview.monthly, insCur)}</b>
            </div>
            <div className="flex justify-between">
              <span>Ends</span>
              <b>{insPreview.end.toLocaleDateString()}</b>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              saveItem(
                "installment",
                insName || "Installment",
                {
                  currency: insCur,
                  total: toNum(insAmount),
                  down: toNum(insDown),
                  months: Math.max(1, Math.trunc(toNum(insMonths) || 1)),
                  firstPaymentDate: insFirstDate,
                  monthlyPayment: Number(insPreview.monthly.toFixed(2)),
                  note: "0% installment",
                },
                insPreview.end.toISOString()
              )
            }
            className="w-full rounded-full bg-[var(--accent)] py-3 font-semibold shadow-[0_10px_18px_rgba(0,0,0,0.18)]"
          >
            Save installment
          </button>
        </Card>
      )}

      {/* Loan */}
      {tab === "loan" && (
        <Card title="Loan (interest supported)">
          <CurrencyPicker
            value={loanCurrency}
            setValue={setLoanCurrency}
            customValue={loanCustomCurrency}
            setCustomValue={setLoanCustomCurrency}
          />

          <TextInput value={loanName} onChange={setLoanName} placeholder="Name (e.g., Bank loan)" />
          <NumInput value={loanAmount} onChange={setLoanAmount} placeholder="Principal" />

          <div className="grid grid-cols-2 gap-2">
            <NumInput value={loanMonths} onChange={setLoanMonths} placeholder="Months" />
            <NumInput value={loanRate} onChange={setLoanRate} placeholder="Annual rate %" />
          </div>

          <div className="grid grid-cols-2 gap-2 items-center">
            <div className="text-xs text-black/55 pl-1">First payment date</div>
            <input
              type="date"
              className="w-full rounded-full bg-[#F4F6FB] px-4 py-3 outline-none"
              value={loanFirstDate}
              onChange={(e) => setLoanFirstDate(e.target.value)}
            />
          </div>

          <div className="rounded-2xl bg-[#F4F6FB] p-4 text-sm text-black/75">
            <div className="flex justify-between">
              <span>Monthly payment</span>
              <b>{formatMoney(loanPreview.monthly, loanCur)}</b>
            </div>
            <div className="flex justify-between">
              <span>Overpay</span>
              <b>{formatMoney(loanPreview.overpay, loanCur)}</b>
            </div>
            <div className="flex justify-between">
              <span>Ends</span>
              <b>{loanPreview.end.toLocaleDateString()}</b>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              saveItem(
                "loan",
                loanName || "Loan",
                {
                  currency: loanCur,
                  principal: toNum(loanAmount),
                  months: Math.max(1, Math.trunc(toNum(loanMonths) || 1)),
                  annualRate: Math.max(0, toNum(loanRate)),
                  firstPaymentDate: loanFirstDate,
                  monthlyPayment: Number(loanPreview.monthly.toFixed(2)),
                  totalPay: Number(loanPreview.totalPay.toFixed(2)),
                  overpay: Number(loanPreview.overpay.toFixed(2)),
                },
                loanPreview.end.toISOString()
              )
            }
            className="w-full rounded-full bg-[var(--accent)] py-3 font-semibold shadow-[0_10px_18px_rgba(0,0,0,0.18)]"
          >
            Save loan
          </button>
        </Card>
      )}

      {/* Deposit */}
      {tab === "deposit" && (
        <Card title="Deposit (top up + withdraw + one-time ops)">
          <CurrencyPicker
            value={depCurrency}
            setValue={setDepCurrency}
            customValue={depCustomCurrency}
            setCustomValue={setDepCustomCurrency}
          />

          <TextInput value={depName} onChange={setDepName} placeholder="Name (e.g., Savings / Deposit)" />
          <NumInput value={depStart} onChange={setDepStart} placeholder="Initial amount" />

          <div className="grid grid-cols-2 gap-2">
            <NumInput value={depRate} onChange={setDepRate} placeholder="Annual rate %" />
            <NumInput value={depMonths} onChange={setDepMonths} placeholder="Months" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <NumInput value={depMonthlyTopUp} onChange={setDepMonthlyTopUp} placeholder="Monthly top up" />
            <NumInput value={depMonthlyWithdraw} onChange={setDepMonthlyWithdraw} placeholder="Monthly withdraw" />
          </div>

          <div className="grid grid-cols-2 gap-2 items-center">
            <div className="text-xs text-black/55 pl-1">Start date</div>
            <input
              type="date"
              className="w-full rounded-full bg-[#F4F6FB] px-4 py-3 outline-none"
              value={depStartDate}
              onChange={(e) => setDepStartDate(e.target.value)}
            />
          </div>

          {/* One-time ops */}
          <div className="rounded-2xl bg-[#F4F6FB] p-4">
            <div className="text-sm font-extrabold mb-2">One-time operations</div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={opType}
                onChange={(e) => setOpType(e.target.value)}
                className="w-full rounded-full bg-white px-4 py-3 outline-none border border-black/10"
              >
                <option value="topup">Top up</option>
                <option value="withdraw">Withdraw</option>
              </select>

              <input
                value={opAmount}
                onChange={(e) => setOpAmount(e.target.value)}
                className="w-full rounded-full bg-white px-4 py-3 outline-none border border-black/10"
                placeholder="Amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <input
                type="date"
                value={opDate}
                onChange={(e) => setOpDate(e.target.value)}
                className="w-full rounded-full bg-white px-4 py-3 outline-none border border-black/10"
              />

              <button
                type="button"
                onClick={() => {
                  const amt = toNum(opAmount);
                  if (!opDate || amt <= 0) return;
                  setDepOps((prev) => [...prev, { type: opType, amount: amt, date: opDate }]);
                  setOpAmount("");
                }}
                className="w-full rounded-full bg-white py-3 font-extrabold border border-black/10"
              >
                Add
              </button>
            </div>

            {depOps.length > 0 && (
              <div className="mt-3 space-y-2">
                {depOps.map((o, idx) => (
                  <div
                    key={`${o.type}-${o.date}-${idx}`}
                    className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 border border-black/10"
                  >
                    <div className="text-sm">
                      <b>{o.type === "topup" ? "+" : "-"}</b> {formatMoney(o.amount, depCur)}{" "}
                      <span className="text-black/45">({new Date(o.date).toLocaleDateString()})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDepOps((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-xs font-extrabold rounded-full px-3 py-2 bg-[#F4F6FB] border border-black/10"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-[#F4F6FB] p-4 text-sm text-black/75">
            <div className="flex justify-between">
              <span>Future value</span>
              <b>{formatMoney(depPreview.fv, depCur)}</b>
            </div>
            <div className="flex justify-between">
              <span>Profit</span>
              <b>{formatMoney(depPreview.profit, depCur)}</b>
            </div>
            <div className="flex justify-between">
              <span>Invested (total)</span>
              <b>{formatMoney(depPreview.invested, depCur)}</b>
            </div>
            <div className="flex justify-between">
              <span>Ends</span>
              <b>{depPreview.end.toLocaleDateString()}</b>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              saveItem(
                "deposit",
                depName || "Deposit",
                {
                  currency: depCur,
                  initial: toNum(depStart),
                  months: Math.max(1, Math.trunc(toNum(depMonths) || 1)),
                  annualRate: Math.max(0, toNum(depRate)),
                  monthlyTopUp: toNum(depMonthlyTopUp),
                  monthlyWithdraw: toNum(depMonthlyWithdraw),
                  startDate: depStartDate,
                  oneTimeOps: depOps,
                  futureValue: Number(depPreview.fv.toFixed(2)),
                  profit: Number(depPreview.profit.toFixed(2)),
                  invested: Number(depPreview.invested.toFixed(2)),
                },
                depPreview.end.toISOString()
              )
            }
            className="w-full rounded-full bg-[var(--accent)] py-3 font-semibold shadow-[0_10px_18px_rgba(0,0,0,0.18)]"
          >
            Save deposit
          </button>
        </Card>
      )}

      {/* Split */}
      {tab === "split" && (
        <Card title="Split bill">
          <CurrencyPicker
            value={splitCurrency}
            setValue={setSplitCurrency}
            customValue={splitCustomCurrency}
            setCustomValue={setSplitCustomCurrency}
          />

          <TextInput value={splitName} onChange={setSplitName} placeholder="Name (e.g., Restaurant)" />
          <NumInput value={splitTotal} onChange={setSplitTotal} placeholder="Total amount" />

          <div className="grid grid-cols-2 gap-2">
            <NumInput value={splitPeople} onChange={setSplitPeople} placeholder="People" />
            <NumInput value={splitTip} onChange={setSplitTip} placeholder="Tip % (optional)" />
          </div>

          <div className="rounded-2xl bg-[#F4F6FB] p-4 text-sm text-black/75">
            <div className="flex justify-between">
              <span>Total with tip</span>
              <b>{formatMoney(splitPreview.withTip, splitCur)}</b>
            </div>
            <div className="flex justify-between">
              <span>Per person</span>
              <b>{formatMoney(splitPreview.per, splitCur)}</b>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              saveItem(
                "split",
                splitName || "Split",
                {
                  currency: splitCur,
                  total: toNum(splitTotal),
                  people: Math.max(1, Math.trunc(toNum(splitPeople) || 1)),
                  tipPct: Math.max(0, toNum(splitTip)),
                  perPerson: Number(splitPreview.per.toFixed(2)),
                },
                null
              )
            }
            className="w-full rounded-full bg-[var(--accent)] py-3 font-semibold shadow-[0_10px_18px_rgba(0,0,0,0.18)]"
          >
            Save split
          </button>
        </Card>
      )}

      {/* Saved list */}
      <div className="rounded-[28px] bg-white/80 border border-black/10 shadow-sm p-5">
        <div className="text-sm font-extrabold mb-2">Saved</div>

        {loadingList ? (
          <div className="text-sm text-black/50">Loading...</div>
        ) : currentList.length === 0 ? (
          <div className="text-sm text-black/50">No saved items here yet</div>
        ) : (
          <div className="space-y-2">
            {currentList.map((x) => {
              const ended = x.endDate ? new Date(x.endDate) < now : false;
              const active = !!x.isActive && !ended;

              const p = x.payload || {};
              const cur = safeCurrency(p.currency || user?.currency || "USD");

              let line1 = "";
              if (x.kind === "installment") line1 = `Monthly: ${formatMoney(p.monthlyPayment || 0, cur)}`;
              if (x.kind === "loan") line1 = `Monthly: ${formatMoney(p.monthlyPayment || 0, cur)}`;
              if (x.kind === "deposit") line1 = `Future: ${formatMoney(p.futureValue || 0, cur)}`;
              if (x.kind === "split") line1 = `Per person: ${formatMoney(p.perPerson || 0, cur)}`;

              return (
                <div key={x.id} className="rounded-2xl bg-[#F4F6FB] px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold truncate">{x.name}</div>
                      <div className="text-xs text-black/55">{line1}</div>
                      {x.endDate ? (
                        <div className="text-xs text-black/45">
                          Ends: {new Date(x.endDate).toLocaleDateString()} {ended ? "• Ended" : ""}
                        </div>
                      ) : (
                        <div className="text-xs text-black/45">No end date</div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleActive(x.id, !x.isActive)}
                      className={
                        active
                          ? "rounded-full px-3 py-2 text-xs font-extrabold bg-emerald-500/20 border border-emerald-500/30"
                          : "rounded-full px-3 py-2 text-xs font-extrabold bg-red-500/15 border border-red-500/25"
                      }
                    >
                      {active ? "Active" : "Off"}
                    </button>

                    <button
                      type="button"
                      onClick={() => removeItem(x.id)}
                      className="rounded-full px-3 py-2 text-xs font-extrabold bg-white border border-black/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

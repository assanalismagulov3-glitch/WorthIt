export default function AddReceiptPage() {
  return (
    <div className="rounded-[28px] bg-white/80 border border-black/10 shadow-sm p-5 space-y-3">
      <div className="text-center font-extrabold text-xl">Add receipt</div>

      <input
        className="w-full rounded-[18px] bg-[#F4F6FB] px-4 py-3 outline-none"
        type="file"
        accept="image/*"
        capture="environment"
      />

      <div className="text-xs text-black/45">
        MVP: пока просто загрузка. На следующем шаге подключим сервер + Gemini,
        чтобы распознавать чек и автоматически разносить по категориям.
      </div>

      <button className="w-full rounded-full bg-[var(--accent)] py-3 font-semibold shadow-[0_10px_18px_rgba(0,0,0,0.18)]">
        Analyze
      </button>
    </div>
  );
}

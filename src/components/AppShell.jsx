export default function AppShell({ title, children }) {
  return (
    <div className="min-h-dvh w-full flex justify-center worthit-pattern">
      <div className="w-full max-w-[430px] min-h-dvh bg-[#ECECEC] relative">
        {/* top bar */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between text-sm text-black/60">
          <div className="font-semibold">1:47</div>
          <div className="text-xs">📶 ᯤ 🔋</div>
        </div>

        {/* title */}
        {title ? (
          <div className="px-4 pb-2 text-center font-semibold text-black/70">
            {title}
          </div>
        ) : null}

        {/* content */}
        <div className="px-4 pb-28">{children}</div>
      </div>
    </div>
  );
}

export default function PhoneShell({ children }) {
  return (
    <div className="min-h-dvh w-full flex justify-center worthit-pattern">
      <div className="w-full max-w-[430px] min-h-dvh bg-[#F2F2F2] relative overflow-hidden">
        {/* безопасные отступы как на мобильном */}
        <div className="px-4 pt-4 pb-24">{children}</div>
      </div>
    </div>
  );
}

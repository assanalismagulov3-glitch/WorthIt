export default function AuthShell({ children }) {
  return (
    <div className="min-h-dvh w-full flex justify-center bg-[#ECECEC]">
      <div className="w-full max-w-[430px] min-h-dvh bg-[#ECECEC]">
        {/* Никаких absolute-слоёв, которые могут перехватывать клики */}
        <div className="px-4 pt-10">
          <div className="flex justify-center mb-6">
            <div className="px-10 py-3 bg-white rounded-full font-extrabold text-3xl shadow border border-black/10">
              WorthIt
            </div>
          </div>

          {/* Контент кликабельный */}
          <div className="pointer-events-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

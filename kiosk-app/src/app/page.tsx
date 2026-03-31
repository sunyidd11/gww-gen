import HomeEntryActions from "../components/HomeEntryActions";

export default function HomePage() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-4 md:p-6">
      <div className="w-full rounded-[32px] border border-[#ebe8fa] bg-white p-6 shadow-[0_18px_48px_rgba(114,97,255,0.08)] md:p-10">
        <p className="text-sm text-[#8e88b6]">医院一体机</p>

        <HomeEntryActions />
      </div>
    </div>
  );
}


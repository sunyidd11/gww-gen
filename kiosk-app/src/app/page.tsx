import HomeEntryActions from "../components/HomeEntryActions";

export default function HomePage() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-4 md:p-6">
      <div className="w-full rounded-3xl border border-gray-100 bg-white shadow-sm p-6 md:p-10">
        <p className="text-sm text-gray-500">医院一体机</p>
        <h1 className="mt-2 text-[32px] font-black leading-tight text-gray-900 sm:text-[42px]">
          请插入医保卡或扫描医保码
        </h1>

        <HomeEntryActions lang="zh" />

        <p className="mt-8 text-[16px] text-gray-600 sm:text-[18px]">
          若需语音帮助，请点击下方麦克风说出症状，系统将自动推荐挂号。
        </p>
      </div>
    </div>
  );
}


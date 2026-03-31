import React from "react";
import { AppLang, tr } from "../lib/i18n-shared";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  MapPin,
  Pill,
  Stethoscope,
  Users,
} from "lucide-react";

/**
 * 任务状态头。
 */
export const TaskStatusHeader: React.FC<{
  title: string;
  status: "pending" | "processing" | "completed" | "failed";
  description?: string;
}> = ({ title, status, description }) => {
  const statusConfig = {
    pending: { color: "text-[#6A46FF]", bg: "bg-[#F3F4FF]", ring: "ring-[#6A46FF]/10", icon: Clock },
    processing: { color: "text-[#6A46FF]", bg: "bg-[#F3F4FF]", ring: "ring-[#6A46FF]/10", icon: Loader2 },
    completed: { color: "text-[#6A46FF]", bg: "bg-[#F3F4FF]", ring: "ring-[#6A46FF]/10", icon: CheckCircle2 },
    failed: { color: "text-rose-600", bg: "bg-rose-50", ring: "ring-rose-100", icon: AlertCircle },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`rounded-[28px] border border-[#ebe8fa] p-4 shadow-[0_12px_28px_rgba(108,81,233,0.08)] ring-1 ${config.bg} ${config.ring}`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-[18px] bg-white p-2.5 shadow-[0_6px_18px_rgba(61,57,89,0.12)] ${config.color}`}>
          <Icon size={20} className={status === "processing" ? "animate-spin" : ""} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#2f2a45]">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-[#6d6889]">{description}</p> : null}
        </div>
      </div>
    </div>
  );
};

/**
 * 医院/科室/地点信息卡。
 */
export const LocationCard: React.FC<{
  hospital: string;
  department: string;
  address?: string;
  room?: string;
  lang?: AppLang;
}> = ({ hospital, department, address, room, lang = "zh" }) => (
  <div className="rounded-[28px] border border-[#ebe8fa] bg-white p-5 shadow-[0_12px_28px_rgba(108,81,233,0.08)]">
    <div className="flex items-start gap-3">
      <div className="rounded-[20px] bg-[#F3F4FF] p-3 text-[#6A46FF] shadow-[0_8px_20px_rgba(108,81,233,0.14)] ring-1 ring-[#6A46FF]/8">
        <MapPin size={18} />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-[#2f2a45]">{hospital}</div>
        <div className="mt-1 flex items-center gap-2 text-sm text-[#6d6889]">
          <Stethoscope size={14} />
          {department} {room ? <span className="text-[#9a96bf]">| {room}</span> : null}
        </div>
        {address ? <div className="mt-2 text-xs italic text-[#9a96bf]">{address}</div> : null}
      </div>
    </div>
  </div>
);

/**
 * 时间/预约卡。
 */
export const TimeCard: React.FC<{
  date: string;
  timeSlot: string;
  type?: "appointment" | "deadline";
  lang?: AppLang;
}> = ({ date, timeSlot, type = "appointment", lang = "zh" }) => (
  <div className="flex items-center justify-between rounded-[28px] border border-[#ebe8fa] bg-white p-5 shadow-[0_12px_28px_rgba(108,81,233,0.08)]">
    <div className="flex items-center gap-3">
      <div className="rounded-[20px] bg-[#F3F4FF] p-3 text-[#6A46FF] shadow-[0_8px_20px_rgba(108,81,233,0.14)] ring-1 ring-[#6A46FF]/8">
        <Calendar size={18} />
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-[#8e88b6]">
          {type === "appointment" ? tr(lang, "预约时间", "Appointment") : tr(lang, "截止时间", "Deadline")}
        </div>
        <div className="font-bold text-[#2f2a45]">{date}</div>
      </div>
    </div>
    <div className="text-right font-mono text-lg font-bold text-[#6A46FF]">{timeSlot}</div>
  </div>
);

/**
 * 候诊/排队状态卡。
 */
export const QueueStatusCard: React.FC<{
  currentNumber: string;
  waitingCount: number;
  estimatedTime?: string;
  lang?: AppLang;
}> = ({ currentNumber, waitingCount, estimatedTime, lang = "zh" }) => (
  <div className="w-full overflow-hidden rounded-[1.25rem] bg-[#6A46FF] p-5 text-white shadow-lg sm:rounded-3xl sm:p-6">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-white/90">{tr(lang, "当前叫号", "Current Number")}</div>
        <div className="mt-1 truncate text-5xl font-bold tracking-tight sm:text-6xl">{currentNumber}</div>
      </div>
      <button
        type="button"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/15 text-white shadow-inner ring-1 ring-white/20 transition hover:bg-black/25 sm:h-14 sm:w-14"
        aria-label={tr(lang, "人工服务", "Manual service")}
      >
        <Users className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
      </button>
    </div>
    <div className="my-5 border-t border-white/30 sm:my-6" />
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[15px] text-white sm:text-base">
        {tr(lang, "前面还有", "People ahead")} <span className="text-2xl font-bold sm:text-3xl">{waitingCount}</span> {tr(lang, "人", "")}
      </p>
      {estimatedTime ? (
        <div className="w-fit rounded-full bg-black/20 px-4 py-2.5 text-sm font-medium text-white shadow-md ring-1 ring-white/15">
          {tr(lang, "预计等待", "Estimated wait")} {estimatedTime}
        </div>
      ) : null}
    </div>
  </div>
);

/**
 * 缴费摘要卡。
 */
export const PaymentSummaryCard: React.FC<{
  items: { name: string; price: number }[];
  total: number;
  status?: "unpaid" | "paid";
  lang?: AppLang;
}> = ({ items, total, status = "unpaid", lang = "zh" }) => (
  <div className="w-full space-y-0 overflow-hidden rounded-[28px] bg-white shadow-[0_12px_28px_rgba(108,81,233,0.08)]">
    <div className="flex items-center justify-between gap-3 rounded-none bg-[#F3F4FF] px-4 py-4 sm:px-5 sm:py-4.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <CreditCard className="h-5 w-5 shrink-0 text-[#4b465f]" strokeWidth={1.75} />
        <span className="truncate text-base font-bold text-[#3d3959] sm:text-lg">{tr(lang, "费用明细", "Fee Details")}</span>
      </div>
      <span className="shrink-0 rounded-full bg-[#6A46FF]/16 px-3.5 py-1.5 text-xs font-semibold text-[#6A46FF] shadow-[0_6px_16px_rgba(108,81,233,0.14)] sm:text-sm">
        {status === "paid" ? tr(lang, "已支付", "Paid") : tr(lang, "待支付", "Unpaid")}
      </span>
    </div>
    <div className="divide-y divide-gray-100">
      {items.map((item, idx) => (
        <div key={`${item.name}-${idx}`} className="flex items-center justify-between gap-3 py-3.5 text-sm sm:py-4 sm:text-base">
          <span className="text-[#8f8a96]">{item.name}</span>
          <span className="shrink-0 font-semibold text-[#2f2a45]">¥{item.price.toFixed(2)}</span>
        </div>
      ))}
    </div>
    <div className="mt-4 flex items-center justify-between border-t border-[#d7d3de] pt-4">
      <span className="text-base font-bold text-[#2f2a45] sm:text-lg">{tr(lang, "合计", "Total")}</span>
      <span className="text-xl font-bold text-[#6A46FF] sm:text-2xl">¥{total.toFixed(2)}</span>
    </div>
  </div>
);

/**
 * 报告状态卡。
 */
export const ReportStatusCard: React.FC<{
  title: string;
  date: string;
  status: "ready" | "processing";
  id?: string;
  lang?: AppLang;
}> = ({ title, date, status, id, lang = "zh" }) => (
  <div className="flex items-center gap-4 rounded-[28px] border border-[#ebe8fa] bg-white p-5 shadow-[0_12px_28px_rgba(108,81,233,0.08)]">
    <div className={`rounded-[20px] p-3.5 ring-1 ${status === "ready" ? "bg-[#F3F4FF] text-[#6A46FF] ring-[#6A46FF]/10" : "bg-[#F3F4FF] text-[#6A46FF] ring-[#6A46FF]/10"}`}>
      <FileText size={24} />
    </div>
    <div className="flex-1">
      <h3 className="font-bold text-[#2f2a45]">{title}</h3>
      <div className="mt-1 flex items-center gap-3 text-xs text-[#8e88b6]">
        <span>{date}</span>
        {id ? <span>ID: {id}</span> : null}
      </div>
    </div>
    <div>
      {status === "ready" ? (
        <button className="rounded-full bg-[#6A46FF] px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(107,69,246,0.22)] transition hover:bg-[#5d35f0]">
          {tr(lang, "查看报告", "View Report")}
        </button>
      ) : (
        <div className="flex items-center gap-1 text-xs font-bold text-[#6A46FF]">
          <Loader2 size={12} className="animate-spin" /> {tr(lang, "生成中", "Generating")}
        </div>
      )}
    </div>
  </div>
);

/**
 * 取药信息卡。
 */
export const PharmacyCard: React.FC<{
  window: string;
  code: string;
  medicines: string[];
  lang?: AppLang;
}> = ({ window, code, medicines, lang = "zh" }) => (
  <div className="w-full space-y-5 sm:space-y-6">
    <div className="rounded-[28px] bg-[#F3F4FF] p-5 shadow-[0_12px_28px_rgba(108,81,233,0.08)] sm:rounded-[32px] sm:p-6">
      <div className="mb-4 flex items-center gap-2.5 sm:mb-5">
        <Pill className="h-5 w-5 shrink-0 text-[#4b465f]" strokeWidth={2} />
        <span className="text-base font-bold text-[#3d3959] sm:text-lg">{tr(lang, "取药指引", "Pharmacy Guide")}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-[22px] bg-white p-4 shadow-[0_8px_18px_rgba(61,57,89,0.12)] sm:col-span-2 sm:p-5">
          <div className="text-sm text-[#8e88b6]">{tr(lang, "取药窗口", "Pickup Window")}</div>
          <div className="mt-1 text-2xl font-bold leading-tight text-[#6A46FF] sm:text-3xl">{window}</div>
        </div>
        <div className="rounded-[22px] bg-white p-4 shadow-[0_8px_18px_rgba(61,57,89,0.12)] sm:col-span-1 sm:p-5">
          <div className="text-sm text-[#8e88b6]">{tr(lang, "取药码", "Pickup Code")}</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-[#6A46FF] sm:text-3xl">{code}</div>
        </div>
      </div>
      <div className="mt-5 sm:mt-6">
        <div className="mb-3 text-base font-bold text-[#3d3959] sm:text-lg">{tr(lang, "药品清单", "Medicine List")}</div>
        <ul className="space-y-3 text-sm text-[#5b566f] sm:text-base">
          {medicines.map((medicine, idx) => (
            <li key={`${medicine}-${idx}`} className="flex items-baseline gap-3 leading-relaxed">
              <span className="min-w-0 flex-1">{idx + 1}. {medicine}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

/**
 * 空/加载/错误状态块。
 */
export const StateBlock: React.FC<{
  type: "empty" | "loading" | "error";
  message?: string;
  lang?: AppLang;
}> = ({ type, message, lang = "zh" }) => {
  const configs = {
    empty: { icon: FileText, color: "text-gray-300", defaultMsg: tr(lang, "暂无相关数据", "No related data") },
    loading: { icon: Loader2, color: "text-[#6A46FF]", defaultMsg: tr(lang, "正在努力加载中...", "Loading...") },
    error: { icon: AlertCircle, color: "text-rose-500", defaultMsg: tr(lang, "服务暂时不可用", "Service temporarily unavailable") },
  };
  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-[#ebe8fa] bg-white px-6 py-12 text-center shadow-[0_12px_28px_rgba(108,81,233,0.08)]">
      <div className={`mb-4 ${config.color}`}>
        <Icon size={48} className={type === "loading" ? "animate-spin" : ""} strokeWidth={1.5} />
      </div>
      <p className="font-medium text-[#6d6889]">{message || config.defaultMsg}</p>
      {type === "error" ? (
        <button className="mt-4 text-sm font-bold text-[#6A46FF] underline underline-offset-4">
          {tr(lang, "重试一下", "Retry")}
        </button>
      ) : null}
    </div>
  );
};

/**
 * 检查项分组卡。
 */
export const ExamGroupCard: React.FC<{
  title: string;
  exams: { name: string; status: "pending" | "completed" }[];
  lang?: AppLang;
}> = ({ title, exams, lang = "zh" }) => (
  <div className="w-full space-y-0 overflow-hidden rounded-[28px] bg-white shadow-[0_12px_28px_rgba(108,81,233,0.08)]">
    <div className="flex items-center gap-2.5 rounded-none bg-[#F3F4FF] px-4 py-4 sm:px-5 sm:py-4.5">
      <FileText className="h-5 w-5 shrink-0 text-[#4b465f]" strokeWidth={1.75} />
      <span className="text-base font-bold text-[#3d3959] sm:text-lg">{title}</span>
    </div>
    <div className="divide-y divide-gray-100">
      {exams.map((exam, idx) => {
        const done = exam.status === "completed";
        return (
          <button
            key={`${exam.name}-${idx}`}
            type="button"
            className="flex w-full items-start justify-between gap-3 py-4 text-left transition hover:bg-[#faf9ff] sm:py-4"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm text-[#8f8a96] sm:text-base">{exam.name}</div>
            </div>
            <span className={`flex shrink-0 items-center gap-1 text-sm sm:text-base ${done ? "text-[#8f8a96]" : "font-medium text-[#6A46FF]"}`}>
              {done ? tr(lang, "已完成", "Completed") : tr(lang, "待检查", "Pending")}
              <ChevronRight className="h-4 w-4 opacity-70" strokeWidth={2} />
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

/**
 * 操作按钮区。
 */
export const ActionButtons: React.FC<{
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  disabled?: boolean;
}> = ({ primaryLabel, secondaryLabel, onPrimary, onSecondary, disabled }) => (
  <div className="flex gap-4 rounded-[28px] border border-[#ece9fb] bg-[#faf9ff] p-4 sm:p-5">
    {secondaryLabel ? (
      <button
        type="button"
        onClick={onSecondary}
        disabled={disabled}
        className="flex-1 rounded-full border border-[#ddd8f6] bg-white px-4 py-3 text-sm font-semibold text-[#6d6889] shadow-sm transition hover:bg-[#f8f7ff] disabled:opacity-50"
      >
        {secondaryLabel}
      </button>
    ) : null}
    {primaryLabel ? (
      <button
        type="button"
        onClick={onPrimary}
        disabled={disabled}
        className="flex-[2] rounded-full bg-[#6b45f6] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(107,69,246,0.22)] transition hover:bg-[#5d35f0] disabled:opacity-50"
      >
        {primaryLabel}
      </button>
    ) : null}
  </div>
);


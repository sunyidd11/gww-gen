"use client";

import Link from "next/link";
import { AppLang, tr } from "../lib/i18n-shared";

type PriorityRecommendationPanelProps = {
  symptom: string;
  department: string;
  reason: string;
  doctorName: string;
  doctorTitle: string;
  doctorSpecialty: string;
  doctorNextSlot: string;
  doctorsPageHref: string;
  lang: AppLang;
};

/**
 * 症状识别后，直接输出推荐科室与医生。
 */
export default function PriorityRecommendationPanel(props: PriorityRecommendationPanelProps) {
  const tt = (zh: string, en: string) => tr(props.lang, zh, en);
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[28px] border border-[#ebe8fa] bg-white shadow-[0_12px_28px_rgba(108,81,233,0.08)]">
        <div className="bg-[#F3F4FF] px-5 py-4">
          <p className="text-sm font-semibold text-[#8e88b6]">{tt("已识别症状", "Recognized Symptom")}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[20px] text-[#6d6889]">{props.symptom || tt("未提供", "N/A")}</p>
          <p className="mt-2 text-[24px] font-bold text-[#2f2a45]">{tt("推荐科室：", "Recommended Department: ")}{props.department}</p>
          <p className="mt-3 text-[18px] text-[#6d6889]">{props.reason}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-[#ebe8fa] bg-white shadow-[0_12px_28px_rgba(108,81,233,0.08)]">
        <div className="bg-[#F3F4FF] px-5 py-4">
          <p className="text-sm font-semibold text-[#8e88b6]">{tt("推荐医生", "Recommended Doctor")}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[24px] font-bold text-[#2f2a45]">
            {props.doctorName} {props.doctorTitle}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] border border-[#ece9fb] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(61,57,89,0.12)]">
              <p className="text-xs text-[#8e88b6]">{tt("擅长方向", "Specialty")}</p>
              <p className="mt-1 text-[17px] font-semibold text-[#3d3959]">{props.doctorSpecialty}</p>
            </div>
            <div className="rounded-[20px] border border-[#ece9fb] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(61,57,89,0.12)]">
              <p className="text-xs text-[#8e88b6]">{tt("最早号源", "Earliest Slot")}</p>
              <p className="mt-1 text-[17px] font-semibold text-[#6A46FF]">{props.doctorNextSlot}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/" className="rounded-full border border-[#ddd8f6] bg-[#F3F4FF] px-3 py-3 text-center text-[15px] font-semibold text-[#6d6889] shadow-sm">
          {tt("返回首页", "Home")}
        </Link>
        <Link href={props.doctorsPageHref} className="rounded-full bg-[#6A46FF] px-4 py-4 text-center text-[20px] font-bold text-white shadow-[0_12px_28px_rgba(108,81,233,0.22)]">
          {tt("确认挂号", "Confirm Registration")}
        </Link>
      </div>
    </div>
  );
}


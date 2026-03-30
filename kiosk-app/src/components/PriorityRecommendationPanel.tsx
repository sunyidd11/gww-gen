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
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
        <p className="mt-1 text-[20px] text-gray-900">已识别症状：{props.symptom || "未提供"}</p>
        <p className="mt-2 text-[24px] font-bold text-gray-900">{props.department}</p>
        <p className="mt-2 text-[18px] text-gray-800">{props.reason}</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
        <p className="mt-1 text-[24px] font-bold text-gray-900">
          {props.doctorName} {props.doctorTitle}
        </p>
        <p className="mt-2 text-[17px] text-gray-800">擅长：{props.doctorSpecialty}</p>
        <p className="mt-1 text-[17px] text-gray-800">最早号源：{props.doctorNextSlot}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/" className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-center text-[15px] font-semibold text-gray-700 shadow-sm">
          返回首页
        </Link>
        <Link href={props.doctorsPageHref} className="rounded-xl border border-transparent bg-blue-600 px-4 py-4 text-center text-[20px] font-bold text-white shadow-lg">
          确认挂号
        </Link>
      </div>
    </div>
  );
}


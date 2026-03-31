"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLang, tr } from "../lib/i18n-shared";

type PickerDoctor = {
  name: string;
  title: string;
  specialty: string;
  nextSlot: string;
  consultationFee: number;
};

type AuthoritativeDoctorPickerProps = {
  doctors: PickerDoctor[];
  lang: AppLang;
  detailBaseHref: string;
};

/**
 * 权威医生三选一选择器：
 * - 点击卡片仅切换选中状态（高亮边框）
 * - 页面仅保留一组“返回首页 / 确认挂号”按钮
 * - 点击确认后，跳转到所选医生的详情挂号页
 */
export default function AuthoritativeDoctorPicker(props: AuthoritativeDoctorPickerProps) {
  const router = useRouter();
  const [selectedName, setSelectedName] = useState(props.doctors[0]?.name ?? "");

  const selectedDoctor = useMemo(
    () => props.doctors.find((d) => d.name === selectedName) ?? props.doctors[0],
    [props.doctors, selectedName]
  );

  const confirm = () => {
    if (!selectedDoctor) return;
    router.push(`${props.detailBaseHref}&selectedDoctor=${encodeURIComponent(selectedDoctor.name)}`);
  };

  return (
    <div className="mt-3 space-y-3">
      {props.doctors.map((doctor, idx) => {
        const active = doctor.name === selectedName;
        return (
          <button
            key={`${doctor.name}-${idx}`}
            type="button"
            onClick={() => setSelectedName(doctor.name)}
            className={[
              "w-full rounded-lg px-3 py-3 text-left transition",
              active
                ? "border-2 border-blue-400 bg-blue-50"
                : "border border-gray-200 bg-white hover:border-gray-300 shadow-sm",
            ].join(" ")}
          >
            <p className="text-[20px] font-bold text-gray-900">
              {doctor.name} {doctor.title}
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-500">擅长方向</p>
                <p className="text-[15px] font-semibold text-gray-900">{doctor.specialty}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-500">最早号源</p>
                <p className="text-[15px] font-semibold text-gray-900">{doctor.nextSlot}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-500">挂号费</p>
                <p className="text-[15px] font-semibold text-gray-900">¥{doctor.consultationFee}</p>
              </div>
            </div>
          </button>
        );
      })}

      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="col-span-1 inline-flex min-h-[46px] items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-center text-[15px] font-semibold text-gray-700 shadow-sm"
        >
          返回首页
        </button>
        <button
          type="button"
          onClick={confirm}
          className="col-span-2 inline-flex min-h-[56px] items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-center text-[20px] font-bold text-white shadow-lg"
        >
          确认挂号
        </button>
      </div>
    </div>
  );
}


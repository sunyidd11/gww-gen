"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppLang } from "../lib/i18n-shared";

type PickerDoctor = {
  name: string;
  title: string;
  specialty: string;
  nextSlot: string;
  consultationFee: number;
  isFollowupDoctor?: boolean;
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

  useEffect(() => {
    setSelectedName(props.doctors[0]?.name ?? "");
  }, [props.doctors]);

  const selectedDoctor = useMemo(
    () => props.doctors.find((d) => d.name === selectedName) ?? props.doctors[0],
    [props.doctors, selectedName]
  );

  const confirm = () => {
    if (!selectedDoctor) return;
    router.push(`${props.detailBaseHref}&selectedDoctor=${encodeURIComponent(selectedDoctor.name)}`);
  };

  return (
    <div className="mt-3 space-y-4">
      {props.doctors.map((doctor, idx) => {
        const active = doctor.name === selectedName;
        return (
          <button
            key={`${doctor.name}-${idx}`}
            type="button"
            onClick={() => setSelectedName(doctor.name)}
            data-doctor-name={doctor.name}
            className={[
              "w-full rounded-[28px] px-4 py-4 text-left transition shadow-[0_12px_28px_rgba(108,81,233,0.08)]",
              active
                ? "border border-[#d9d2ff] bg-[#F3F4FF]"
                : "border border-[#ebe8fa] bg-white hover:border-[#d9d2ff] hover:bg-[#faf9ff]",
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              <p className="text-[20px] font-bold text-[#2f2a45]">
                {doctor.name} {doctor.title}
              </p>
              {doctor.isFollowupDoctor ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  复诊
                </span>
              ) : null}
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-[20px] border border-[#ece9fb] bg-white px-3 py-3 shadow-[0_8px_18px_rgba(61,57,89,0.12)]">
                <p className="text-xs text-[#8e88b6]">擅长方向</p>
                <p className="text-[15px] font-semibold text-[#3d3959]">{doctor.specialty}</p>
              </div>
              <div className="rounded-[20px] border border-[#ece9fb] bg-white px-3 py-3 shadow-[0_8px_18px_rgba(61,57,89,0.12)]">
                <p className="text-xs text-[#8e88b6]">最早号源</p>
                <p className="text-[15px] font-semibold text-[#6A46FF]">{doctor.nextSlot}</p>
              </div>
              <div className="rounded-[20px] border border-[#ece9fb] bg-white px-3 py-3 shadow-[0_8px_18px_rgba(61,57,89,0.12)]">
                <p className="text-xs text-[#8e88b6]">挂号费</p>
                <p className="text-[15px] font-semibold text-[#3d3959]">¥{doctor.consultationFee}</p>
              </div>
            </div>
          </button>
        );
      })}

      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="col-span-1 inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#ddd8f6] bg-[#F3F4FF] px-5 py-2.5 text-center text-[15px] font-semibold text-[#6d6889] shadow-sm"
        >
          返回首页
        </button>
        <button
          type="button"
          onClick={confirm}
          data-primary-action="confirm-register"
          className="col-span-2 inline-flex min-h-[56px] items-center justify-center rounded-full bg-[#6A46FF] px-8 py-4 text-center text-[20px] font-bold text-white shadow-[0_12px_28px_rgba(108,81,233,0.22)]"
        >
          确认挂号
        </button>
      </div>
    </div>
  );
}


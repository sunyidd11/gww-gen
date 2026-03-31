"use client";

import Link from "next/link";
import { AppLang, tr } from "../lib/i18n-shared";
import { TASK_PAGE_CONFIGS, TaskSlug } from "../lib/task-pages";

type TaskNavigatorProps = {
  currentSlug: TaskSlug;
  relatedSlugs?: TaskSlug[];
  lang: AppLang;
};

function taskTitle(lang: AppLang, slug: TaskSlug, zh: string): string {
  if (lang === "zh") return zh;
  const map: Record<TaskSlug, string> = {
    "check-in": "Check-in",
    "payment": "Payment",
    "confirm-medicines": "Confirm Medicines",
    "medicine-payment": "Medicine Payment",
    "print-report": "Results Ready",
    "queue-waiting": "Queue Waiting",
    "human-assist": "Human Assistance",
  };
  return map[slug] ?? zh;
}

/**
 * 任务页面通用跳转器：支持返回、上下一个、相关任务跳转。
 */
export default function TaskNavigator(props: TaskNavigatorProps) {
  const current = TASK_PAGE_CONFIGS.find((item) => item.slug === props.currentSlug);
  const chosenSlugs = props.relatedSlugs?.length ? props.relatedSlugs : current?.related ?? [];
  const related = chosenSlugs
    .map((slug) => TASK_PAGE_CONFIGS.find((item) => item.slug === slug))
    .filter((item): item is (typeof TASK_PAGE_CONFIGS)[number] => Boolean(item));

  return (
    <div className="rounded-[28px] border border-[#ebe8fa] bg-[#F3F4FF] p-4 shadow-[0_12px_28px_rgba(108,81,233,0.08)]">
      <p className="text-[14px] font-semibold text-[#6d6889]">{tr(props.lang, "相关任务推荐", "Related Tasks")}</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {related.map((item) => (
          <Link
            key={item.slug}
            href={`/tasks/${item.slug}`}
            className="rounded-[20px] border border-[#ece9fb] bg-white px-3 py-3 text-center text-[15px] font-semibold text-[#3d3959] shadow-[0_8px_18px_rgba(61,57,89,0.12)]"
          >
            {taskTitle(props.lang, item.slug, item.title)}
          </Link>
        ))}
      </div>
    </div>
  );
}


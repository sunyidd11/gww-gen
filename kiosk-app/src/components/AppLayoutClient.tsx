"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mic, Loader2, Bot } from "lucide-react";
import { writeJourneyProgress } from "../lib/journey-progress";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type SpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

const DOCTOR_FLOW_PATHS = new Set(["/register/doctors", "/register/recommend"]);
const DOCTOR_SUGGESTION_FALLBACK = ["更权威医生", "更快就诊", "换位医生"];
const DEFAULT_SUGGESTION_FALLBACK = ["我要挂号", "查看流程", "费用查询"];
const DOCTOR_SUGGESTION_FIXED_TOP = ["更权威医生", "更快就诊"];
const AUTHORITATIVE_KEYWORDS = ["更权威", "权威医生", "专家", "主任医师", "最好的医生", "更资深"];
const FASTER_KEYWORDS = [
  "更快", "尽快就诊", "最快", "最早号源", "早一点", "马上能看", "快一点",
  "更早的号", "更早号", "早号", "有号吗", "还有号", "最快能看",
];
const ANOTHER_DOCTOR_KEYWORDS = [
  "换一个医生", "换个医生", "换医生", "想换医生", "我要换医生", "帮我换医生",
  "重新推荐医生", "重新推荐", "重新匹配", "再匹配一个医生", "再推荐一个医生",
  "再推荐", "换一位医生", "再来一个医生", "另一个医生", "再换一个", "换一换",
  "换一下", "换个更好的", "换个更合适的", "换个更权威的", "换个更快的",
  "这个不合适换一个", "重新匹配医生",
];
const POSITIVE_CONFIRMATION_KEYWORDS = [
  "可以", "同意", "好的", "没问题", "直接帮我", "就这个", "行", "直接挂号", "直接缴费", "确认", "确定", "帮我挂",
  "直接预约", "马上预约", "原医生复诊", "复诊就这个医生", "按原医生复诊",
];
const CONTINUE_COMMAND_KEYWORDS = ["确认", "继续", "确定", "同意", "下一步", "就这样", "可以继续"];
const DEPARTMENT_BOOKING_HINTS = ["挂", "科", "门诊", "有号", "号吗"];
const PRIMARY_ACTION_TEXT_KEYWORDS = ["确认", "继续", "下一步", "去缴费", "确认挂号", "完成", "预约", "挂号", "支付", "提交"];
const PURPLE_BUTTON_CLASS_KEYWORDS = ["bg-[#6A46FF]", "bg-[#6b45f6]", "bg-hospital-blue"];
const BOTTOM_PANEL_HEIGHT_CLASS = "h-[20%]";
const PAGE_SUGGESTION_SEEDS: Record<string, string[]> = {
  home: ["怎么插卡", "扫码失败", "下一步做啥"],
  "register-doctors": ["如何选医生", "号源怎么看", "挂号后去哪"],
  "register-recommend": ["复诊怎么选", "可换医生吗", "排序依据是啥"],
  "task-check-in": ["签到后去哪", "在哪候诊", "如何导航"],
  "task-queue-waiting": ["叫号怎么看", "还要多久", "过号怎么办"],
  "task-payment": ["怎么支付", "费用明细", "支付后去哪"],
  "task-print-report": ["报告在哪看", "异常怎么看", "复诊怎么挂"],
  "task-confirm-medicines": ["药品怎么选", "数量可改吗", "接下来做啥"],
  "task-medicine-payment": ["药费怎么付", "支付后去哪", "怎么取药"],
};

/**
 * 判断路径是否属于医生流程页。
 */
function isDoctorFlowPath(pathname: string): boolean {
  return DOCTOR_FLOW_PATHS.has(pathname);
}

/**
 * 文本中是否命中任一关键词。
 */
function includesAnyKeyword(text: string, keywords: readonly string[]): boolean {
  const q = text.trim().toLowerCase();
  return keywords.some((k) => q.includes(k));
}

/**
 * 判断是否是“挂xx科/xx科还有号吗”类型问句。
 */
function isDepartmentBookingQuery(text: string): boolean {
  const q = text.trim();
  if (!q) return false;
  const hitCount = DEPARTMENT_BOOKING_HINTS.filter((k) => q.includes(k)).length;
  return hitCount >= 2;
}

/**
 * 统一整理推荐问题：
 * - 每条问题不超过 10 个字
 * - 不做截断，超长问题丢弃，避免展示不完整
 * - 去重并保证最终返回 3 条
 */
function normalizeSuggestionList(options: string[], fallback: string[]): string[] {
  const source = [...options, ...fallback];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of source) {
    const text = item.trim().replace(/[。！？!?,，]/g, "");
    if (!text || text.length > 10 || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
    if (result.length >= 3) break;
  }
  return result;
}

/**
 * 将当前路由映射为页面功能标识，用于推荐问题生成。
 */
function getPageStageKey(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname === "/register/doctors") return "register-doctors";
  if (pathname === "/register/recommend") return "register-recommend";
  if (pathname.startsWith("/tasks/")) {
    const task = pathname.split("/")[2] ?? "";
    return `task-${task}`;
  }
  return "home";
}

/**
 * 获取当前页面的推荐问题种子，确保问题与页面功能一致。
 */
function getPageSuggestionSeeds(pathname: string): string[] {
  const key = getPageStageKey(pathname);
  return PAGE_SUGGESTION_SEEDS[key] ?? PAGE_SUGGESTION_SEEDS.home;
}

/**
 * 根据用户当前提问，联想后续可能问题，支持追问链路。
 */
function buildRelatedQuestions(pathname: string, query: string): string[] {
  const q = query.trim();
  if (!q) return [];
  const related: string[] = [];
  if (q.includes("费用") || q.includes("支付") || q.includes("缴费")) {
    related.push("怎么支付", "费用明细", "支付后去哪");
  }
  if (q.includes("签到") || q.includes("候诊") || q.includes("叫号")) {
    related.push("在哪候诊", "还要多久", "过号怎么办");
  }
  if (q.includes("医生") || q.includes("挂号") || q.includes("号源")) {
    related.push("如何选医生", "号源怎么看", "排序依据是啥");
  }
  if (q.includes("报告") || q.includes("异常")) {
    related.push("报告在哪看", "异常怎么看", "复诊怎么挂");
  }
  if (q.includes("药") || q.includes("取药")) {
    related.push("药费怎么付", "支付后去哪", "怎么取药");
  }
  if (!related.length) {
    return getPageSuggestionSeeds(pathname);
  }
  return [...related, ...getPageSuggestionSeeds(pathname)];
}

/**
 * 医生流程固定将“更权威/更快”放在推荐问题前两位。
 */
function mergeDoctorTopSuggestions(suggestions: string[]): string[] {
  const normalized = suggestions
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !DOCTOR_SUGGESTION_FIXED_TOP.includes(item));
  return [...DOCTOR_SUGGESTION_FIXED_TOP, ...normalized].slice(0, 5);
}

/**
 * 统一生成医生推荐说明文案。
 */
function buildDoctorRecommendationReply(query: string, symptom: string, fromSymptom: boolean): string {
  if (!fromSymptom || (symptom === query && (query.includes("挂号") || query.includes("看病")))) {
    return `根据您的需求“${symptom}”，为您匹配了以下三位医生，已综合考虑专业匹配度与号源时间为您排序。`;
  }
  return `根据您补充的症状“${symptom}”，为您推荐了以下三位相关专业的医生，综合考虑了医生的专业匹配度与号源时间。`;
}

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceHint, setVoiceHint] = useState("");
  const [qaAnswer, setQaAnswer] = useState(
    "你好！我是您的AI分诊助手，可以点击下方麦克风说出您的症状或需求。"
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [smartOptions, setSmartOptions] = useState<string[]>(["头痛头晕", "我要挂号", "查看流程"]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const latestInputRef = useRef("");
  const lastQuestionRef = useRef("");

  const getSuggestionFallback = (): string[] => {
    const pageFallback = getPageSuggestionSeeds(pathname);
    if (isDoctorFlowPath(pathname)) {
      return [...DOCTOR_SUGGESTION_FALLBACK, ...pageFallback];
    }
    return [...DEFAULT_SUGGESTION_FALLBACK, ...pageFallback];
  };

  const displayOptions = normalizeSuggestionList(smartOptions, getSuggestionFallback());
  const isDoctorFlowPage = isDoctorFlowPath(pathname);

  /**
   * 根据当前页面上下文统一更新推荐问题，避免重复分支逻辑。
   */
  const updateSmartOptionsByContext = (incoming: string[], relatedToQuery = "") => {
    const related = buildRelatedQuestions(pathname, relatedToQuery);
    if (isDoctorFlowPage) {
      setSmartOptions(
        normalizeSuggestionList(
          mergeDoctorTopSuggestions([...incoming, ...related]),
          [...DOCTOR_SUGGESTION_FALLBACK, ...getPageSuggestionSeeds(pathname)]
        )
      );
      return;
    }
    setSmartOptions(
      normalizeSuggestionList(
        [...incoming, ...related],
        [...DEFAULT_SUGGESTION_FALLBACK, ...getPageSuggestionSeeds(pathname)]
      )
    );
  };

  const wantsAuthoritativeDoctors = (text: string): boolean => {
    return includesAnyKeyword(text, AUTHORITATIVE_KEYWORDS);
  };

  const wantsFasterDoctors = (text: string): boolean => {
    return includesAnyKeyword(text, FASTER_KEYWORDS);
  };

  const wantsAnotherDoctor = (text: string): boolean => {
    return includesAnyKeyword(text, ANOTHER_DOCTOR_KEYWORDS);
  };

  const isPositiveConfirmation = (text: string): boolean => {
    return includesAnyKeyword(text, POSITIVE_CONFIRMATION_KEYWORDS);
  };

  const isConfirmOrContinueCommand = (text: string): boolean => {
    return includesAnyKeyword(text, CONTINUE_COMMAND_KEYWORDS);
  };

  const getPrimaryActionButton = (): HTMLElement | null => {
    if (typeof document === "undefined") return null;
    const marked = document.querySelector("[data-primary-action]") as HTMLElement | null;
    if (marked) return marked;
    const candidates = Array.from(document.querySelectorAll<HTMLElement>("a, button, [role='button']"));
    if (!candidates.length) return null;
    const scoreButton = (el: HTMLElement): number => {
      const cls = typeof el.className === "string" ? el.className : "";
      const txt = (el.textContent ?? "").trim();
      const isDisabled =
        el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true" || el.getAttribute("data-disabled") === "true";
      if (isDisabled) return -1;
      let score = 0;
      if (PURPLE_BUTTON_CLASS_KEYWORDS.some((k) => cls.includes(k))) score += 50;
      if (PRIMARY_ACTION_TEXT_KEYWORDS.some((k) => txt.includes(k))) score += 30;
      if (txt.length > 0 && txt.length <= 12) score += 5;
      return score;
    };
    const sorted = candidates
      .map((el) => ({ el, score: scoreButton(el) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    return sorted[0]?.el ?? null;
  };

  const getPrimaryActionLabel = (el: HTMLElement | null): string => {
    if (!el) return "下一步";
    const txt = (el.textContent ?? "").trim();
    return txt || "下一步";
  };

  const getActionGuidanceText = (): string => {
    const btn = getPrimaryActionButton();
    const actionLabel = getPrimaryActionLabel(btn);
    return `当前可执行“${actionLabel}”，是否确认继续？如有疑惑我可以先为您解答。`;
  };

  const pickDoctorNameFromQuery = (query: string): string | null => {
    if (typeof document === "undefined") return null;
    const doctorNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-doctor-name]"));
    const names = doctorNodes
      .map((node) => (node.getAttribute("data-doctor-name") ?? "").trim())
      .filter(Boolean);
    if (!names.length) return null;
    const direct = names.find((name) => query.includes(name));
    if (direct) return direct;
    const shortHit = names.find((name) => name.length >= 2 && query.includes(name.slice(0, 2)));
    if (shortHit) return shortHit;
    const match = query.match(/挂\s*([^\s，。,.！!]{1,6})(?:医生|主任|的号|号)/);
    if (!match) return null;
    const token = match[1];
    const fuzzy = names.find((name) => name.includes(token) || token.includes(name));
    return fuzzy ?? null;
  };

  const autoSelectDoctorAndConfirm = (doctorName: string): boolean => {
    if (typeof document === "undefined") return false;
    const doctorBtn = Array.from(document.querySelectorAll<HTMLElement>("[data-doctor-name]")).find(
      (node) => (node.getAttribute("data-doctor-name") ?? "").trim() === doctorName
    );
    const primaryBtn = getPrimaryActionButton();
    if (!doctorBtn || !primaryBtn) return false;
    doctorBtn.click();
    setTimeout(() => {
      getPrimaryActionButton()?.click();
    }, 250);
    return true;
  };

  const resolveCurrentDoctorPreference = (): "expert-first" | "time-first" => {
    if (typeof window === "undefined") return "time-first";
    const current = new URL(window.location.href);
    const adjustPref = current.searchParams.get("adjustPref");
    if (adjustPref === "expert-first" || adjustPref === "time-first") return adjustPref;
    const priority = current.searchParams.get("priority");
    return priority === "expert-first" ? "expert-first" : "time-first";
  };

  const applyDoctorAdjustment = (
    pref: "expert-first" | "time-first",
    options?: {
      symptom?: string;
      department?: string;
      reason?: string;
      doctorHint?: string;
      queueHint?: string;
    }
  ) => {
    if (typeof window === "undefined") return;
    const current = new URL(window.location.href);

    current.searchParams.set("priority", pref);
    current.searchParams.set("adjustPref", pref);
    current.searchParams.delete("selectedDoctor");
    current.searchParams.delete("followup"); // Clear followup mode if they change requirements

    if (options?.symptom) current.searchParams.set("symptom", options.symptom);
    if (options?.department) current.searchParams.set("department", options.department);
    if (options?.reason) current.searchParams.set("reason", options.reason);
    if (options?.doctorHint) current.searchParams.set("doctorHint", options.doctorHint);
    if (options?.queueHint) current.searchParams.set("queueHint", options.queueHint);
    current.searchParams.delete("adjustCount");
    current.searchParams.delete("expertList");
    current.searchParams.delete("fastList");
    
    if (current.pathname.includes("/register/recommend")) {
      current.pathname = "/register/doctors";
    }
    router.push(`${current.pathname}?${current.searchParams.toString()}`);
  };

  useEffect(() => {
    latestInputRef.current = input;
  }, [input]);

  const buildFlowContext = () => {
    const seg = pathname.split("/").filter(Boolean);
    const task = seg[0] === "tasks" ? seg[1] ?? "" : "";
    const stageMap: Record<string, string> = {
      "/": "home",
      "/register/recommend": "recommend",
      "/register/doctors": "doctor",
    };
    const stage = task ? `task-${task}` : stageMap[pathname] ?? "general";
    return {
      pathname,
      task,
      stage,
      symptom: typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("symptom") ?? "",
      department: typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("department") ?? "",
    };
  };

  const refreshSuggestionsByContext = async () => {
    try {
      const resp = await fetch("/api/voice-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "suggestions",
          lang: "zh",
          context: buildFlowContext(),
          lastQuestion: lastQuestionRef.current,
        }),
      });
      const data = (await resp.json()) as { suggestions?: string[] };
      if (Array.isArray(data.suggestions) && data.suggestions.length >= 3) {
        updateSmartOptionsByContext(data.suggestions, lastQuestionRef.current);
      } else {
        updateSmartOptionsByContext([], lastQuestionRef.current);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void refreshSuggestionsByContext();

    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if ((pathname === "/register/recommend" || pathname === "/register/doctors") && sp.get("followup") === "1") {
        setQaAnswer("你好！已为您读取就诊记录。请问需要直接预约原医生复诊，还是告诉我您近期的症状？");
      }
    }
  }, [pathname]);

  const getSpeechRecognitionCtor = () => {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
  };

  const analyzeIntent = async (text: string) => {
    const query = text.trim();
    if (!query) return;
    
    setInput(query); // Ensure input shows what was spoken/clicked

    if (isConfirmOrContinueCommand(query)) {
      const primaryBtn = getPrimaryActionButton();
      const actionLabel = getPrimaryActionLabel(primaryBtn);
      if (primaryBtn) {
        setQaAnswer(`收到，正在执行“${actionLabel}”。`);
        setTimeout(() => {
          getPrimaryActionButton()?.click();
        }, 200);
      } else {
        setQaAnswer("当前页面暂无可执行的紫色核心操作，请告诉我您的疑惑。");
      }
      setVoiceHint("");
      return;
    }

    if (pathname === "/register/doctors" && query.includes("挂")) {
      const doctorName = pickDoctorNameFromQuery(query);
      if (doctorName) {
        const ok = autoSelectDoctorAndConfirm(doctorName);
        if (ok) {
          setQaAnswer(`已为您选择${doctorName}医生并准备确认挂号。${getActionGuidanceText()}`);
          setVoiceHint("");
          return;
        }
      }
    }

    if (isPositiveConfirmation(query)) {
      const primaryBtn = getPrimaryActionButton();
      const actionLabel = getPrimaryActionLabel(primaryBtn);
      setQaAnswer(`已识别您的意图：我将为您自动执行“${actionLabel}”。${getActionGuidanceText()}`);
      setTimeout(() => {
        // 自动定位紫色核心按钮并执行
        const primaryBtn = getPrimaryActionButton();
        if (primaryBtn) {
          primaryBtn.click();
        } else {
          setQaAnswer("当前页面没有可确认的操作，请直接描述您的需求。");
        }
      }, 800);
      setVoiceHint("");
      return;
    }

    if (isDoctorFlowPage && wantsAuthoritativeDoctors(query)) {
      setQaAnswer("好的，为您筛选更权威的专家医生，按照专家级别和好评度为您排序。");
      applyDoctorAdjustment("expert-first");
      setVoiceHint("");
      return;
    }

    if (isDoctorFlowPage && wantsFasterDoctors(query)) {
      setQaAnswer("没问题，为您切换到最早有号源的医生，按照可就诊时间为您排序。");
      applyDoctorAdjustment("time-first");
      setVoiceHint("");
      return;
    }

    if (isDoctorFlowPage && wantsAnotherDoctor(query)) {
      setQaAnswer("好的，已为您重新推荐了一位医生供您选择。");
      applyDoctorAdjustment(resolveCurrentDoctorPreference());
      setVoiceHint("");
      return;
    }

    if (isDoctorFlowPage && isDepartmentBookingQuery(query)) {
      setQaAnswer("好的，正在按您的科室需求刷新医生列表与号源信息。");
    }

    setQaAnswer("");
    setIsAnalyzing(true);
    try {
      const resp = await fetch("/api/voice-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "intent",
          text: query,
          lang: "zh",
          context: buildFlowContext(),
          lastQuestion: lastQuestionRef.current,
        }),
      });
      const data = (await resp.json()) as {
        intent?: "symptom" | "faq";
        symptom?: string;
        answer?: string;
        suggestions?: string[];
        department?: string;
        reason?: string;
        doctorHint?: string;
        queueHint?: string;
      };
      lastQuestionRef.current = query;
      if (Array.isArray(data.suggestions) && data.suggestions.length) {
        updateSmartOptionsByContext(data.suggestions, query);
      } else {
        updateSmartOptionsByContext([], query);
      }
      if (data.intent === "symptom") {
        const symptom = (data.symptom || query).trim();
        if (isDoctorFlowPage) {
          const pref = wantsAuthoritativeDoctors(query)
            ? "expert-first"
            : wantsFasterDoctors(query)
              ? "time-first"
              : resolveCurrentDoctorPreference();

          setQaAnswer(buildDoctorRecommendationReply(query, symptom, Boolean(data.symptom)));
          applyDoctorAdjustment(pref, {
            symptom,
            department: data.department,
            reason: data.reason,
            doctorHint: data.doctorHint,
            queueHint: data.queueHint,
          });
          setVoiceHint("");
          return;
        }
        const queryParts = [
          `symptom=${encodeURIComponent(symptom)}`,
          "priority=time-first",
        ];
        if (pathname === "/") {
          queryParts.push("flowStage=1");
          writeJourneyProgress({
            nextStage: 1,
            symptom,
            department: data.department ?? "",
            selectedDoctor: "",
            patientName: "",
            patientAge: 46,
            patientGender: "男",
          });
        } else if (typeof window !== "undefined") {
          const currentFlowStage = new URLSearchParams(window.location.search).get("flowStage");
          if (currentFlowStage) {
            queryParts.push(`flowStage=${encodeURIComponent(currentFlowStage)}`);
          }
        }
        if (data.department) queryParts.push(`department=${encodeURIComponent(data.department)}`);
        if (data.reason) queryParts.push(`reason=${encodeURIComponent(data.reason)}`);
        if (data.doctorHint) queryParts.push(`doctorHint=${encodeURIComponent(data.doctorHint)}`);
        if (data.queueHint) queryParts.push(`queueHint=${encodeURIComponent(data.queueHint)}`);
        setQaAnswer(buildDoctorRecommendationReply(query, symptom, Boolean(data.symptom)));
        router.push(`/register/doctors?${queryParts.join("&")}`);
        setVoiceHint("");
        return;
      }
      const baseAnswer = data.answer || "已收到你的问题，请再具体描述一下。";
      setQaAnswer(`${baseAnswer} ${getActionGuidanceText()}`);
    } catch {
      setQaAnswer("系统暂时繁忙，请稍后再试。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startVoiceInput = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceHint("当前浏览器不支持语音识别，请手动输入。");
      return;
    }

    try {
      const recognition = new Ctor();
      recognition.lang = "zh-CN";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event) => {
        let finalText = "";
        for (let i = 0; i < event.results.length; i += 1) {
          finalText += event.results[i][0]?.transcript ?? "";
        }
        if (finalText.trim()) setInput(finalText.trim());
      };

      recognition.onerror = (event) => {
        setVoiceHint(`语音识别失败：${event.error}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        const text = latestInputRef.current.trim();
        if (text) void analyzeIntent(text);
      };

      recognitionRef.current = recognition;
      setVoiceHint("正在听，请说出需求...");
      setIsListening(true);
      recognition.start();
    } catch {
      setVoiceHint("无法启动麦克风，请检查麦克风权限。");
      setIsListening(false);
    }
  };

  const stopVoiceInput = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setVoiceHint("已停止语音输入。");
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-[#2d2b3a]">
      <div className="relative flex h-full w-full max-w-[calc(100vh*9/16)] flex-col overflow-hidden border-x border-[#e4def8] bg-[#f7f5ff] shadow-2xl">
        
        {/* Top: AI Chat */}
        <div className="flex h-[20%] flex-col overflow-y-auto border-b border-[#e4def8] bg-[#f5f2ff] p-3">
          <div className="flex-1 overflow-y-auto flex flex-col justify-end gap-3 pb-2">
            {input && (
              <div className="flex flex-row-reverse items-start gap-3 mt-2">
                <div className="max-w-[85%] rounded-2xl rounded-tr-none border border-[#ddd8f6] bg-white p-4 text-[#3d3959] shadow-[0_8px_18px_rgba(61,57,89,0.12)]">
                  <p className="text-base whitespace-pre-wrap leading-relaxed">{input}</p>
                </div>
              </div>
            )}
            {isAnalyzing && (
              <div className="flex items-start gap-3 mt-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6A46FF] text-white shadow-[0_8px_18px_rgba(108,81,233,0.2)]">
                  <Bot size={24} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-none border border-transparent bg-[#6A46FF] p-3 text-white shadow-[0_8px_18px_rgba(108,81,233,0.2)]">
                  <Loader2 className="animate-spin text-white" size={18} />
                  <span className="text-sm">正在生成推荐...</span>
                </div>
              </div>
            )}
            {!isAnalyzing && qaAnswer && (
              <div className="flex items-start gap-3 mt-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6A46FF] text-white shadow-[0_8px_18px_rgba(108,81,233,0.2)]">
                  <Bot size={24} />
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-transparent bg-[#6A46FF] p-4 text-white shadow-[0_8px_18px_rgba(108,81,233,0.2)]">
                  <p className="text-base whitespace-pre-wrap leading-relaxed">{qaAnswer}</p>
                </div>
              </div>
            )}
            {voiceHint && (
              <div className="mt-1 text-center text-sm text-orange-500">
                {voiceHint}
              </div>
            )}
          </div>
        </div>

        {/* Middle: Core Task Window */}
        <div className="relative flex h-[60%] flex-col overflow-y-auto bg-[#f7f5ff] text-[#3d3959]">
          {children}
        </div>

        {/* Bottom: Interaction Area */}
        <div className={`flex ${BOTTOM_PANEL_HEIGHT_CLASS} flex-col items-center justify-center gap-3 border-t border-[#e4def8] bg-[#fdfcff] p-4`}>
          {/* Smart options wrap container on top (single line forced, fill entire row) */}
          <div className="flex w-full gap-2">
            {displayOptions.map((keyword, index) => (
              <button
                key={`${keyword}-${index}`}
                type="button"
                onClick={() => {
                  setInput(keyword);
                  void analyzeIntent(keyword);
                }}
                className="flex-1 whitespace-nowrap rounded-full border border-[#ddd8f6] bg-white px-2 py-2 text-center text-xs text-[#6d6889] shadow-sm transition-colors hover:bg-[#f8f7ff] active:bg-[#f1eeff]"
              >
                {keyword}
              </button>
            ))}
          </div>

          {/* Mic button centered below */}
          <button
            type="button"
            onClick={isListening ? stopVoiceInput : startVoiceInput}
            className={`flex shrink-0 h-16 w-16 items-center justify-center rounded-full shadow-lg transition-all ${
              isListening ? "animate-pulse bg-red-500 text-white" : "bg-[#6A46FF] text-white shadow-[0_12px_28px_rgba(108,81,233,0.22)] hover:scale-105"
            }`}
            aria-label={isListening ? "停止语音输入" : "开始语音输入"}
          >
            <Mic size={32} />
          </button>
        </div>
      </div>
    </div>
  );
}

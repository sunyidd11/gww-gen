"use client";

import Link from "next/link";
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

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceHint, setVoiceHint] = useState("");
  const [qaAnswer, setQaAnswer] = useState(
    "你好！我是AI分诊助手，有什么可以帮您？可以说症状如“头痛三天”或问流程如“怎么缴费”。"
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [smartOptions, setSmartOptions] = useState<string[]>([
    "头痛头晕",
    "腹痛腹泻",
    "发热咳嗽",
    "胸闷心慌",
    "皮疹瘙痒",
  ]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const latestInputRef = useRef("");
  const lastQuestionRef = useRef("");

  const truncateOptionsTo20Chars = (options: string[]) => {
    let totalLength = 0;
    const result: string[] = [];
    for (const opt of options) {
      if (result.length >= 3) break;
      const remaining = 20 - totalLength;
      if (remaining <= 0) break;
      let text = opt;
      if (text.length > remaining) {
        text = text.substring(0, remaining);
      }
      result.push(text);
      totalLength += text.length;
    }
    return result;
  };

  const displayOptions = truncateOptionsTo20Chars(smartOptions);

  const mergeDoctorTopSuggestions = (suggestions: string[]): string[] => {
    const fixedTop = ["想要更权威的医生", "想要更快就诊"];
    const normalized = suggestions
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => {
        return !fixedTop.includes(item);
      });
    return [...fixedTop, ...normalized].slice(0, 5);
  };

  const wantsAuthoritativeDoctors = (text: string): boolean => {
    const q = text.trim().toLowerCase();
    const keywords = [
      "更权威", "权威医生", "专家", "主任医师", "最好的医生", "更资深"
    ];
    return keywords.some((k) => q.includes(k));
  };

  const wantsFasterDoctors = (text: string): boolean => {
    const q = text.trim().toLowerCase();
    const keywords = [
      "更快", "尽快就诊", "最快", "最早号源", "早一点", "马上能看", "快一点"
    ];
    return keywords.some((k) => q.includes(k));
  };

  const wantsAnotherDoctor = (text: string): boolean => {
    const q = text.trim().toLowerCase();
    const keywords = [
      "换一个医生", "换个医生", "换医生", "想换医生", "我要换医生", "帮我换医生",
      "重新推荐医生", "重新推荐", "重新匹配", "再匹配一个医生", "再推荐一个医生",
      "再推荐", "换一位医生", "再来一个医生", "另一个医生", "再换一个", "换一换",
      "换一下", "换个更好的", "换个更合适的", "换个更权威的", "换个更快的",
      "这个不合适换一个", "重新匹配医生"
    ];
    return keywords.some((k) => q.includes(k));
  };

  const isPositiveConfirmation = (text: string): boolean => {
    const q = text.trim().toLowerCase();
    const keywords = [
      "可以", "同意", "好的", "没问题", "直接帮我", "就这个", "行", "直接挂号", "直接缴费", "确认", "确定", "帮我挂"
    ];
    return keywords.some((k) => q.includes(k));
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
    const prevPref = current.searchParams.get("adjustPref");
    const countRaw = Number(current.searchParams.get("adjustCount") ?? "0");
    const count = Number.isFinite(countRaw) ? countRaw : 0;
    const nextCount = prevPref && prevPref !== pref ? 1 : count + 1;

    current.searchParams.set("priority", pref);
    current.searchParams.set("adjustPref", pref);
    current.searchParams.set("adjustCount", String(nextCount));
    current.searchParams.delete("selectedDoctor");
    current.searchParams.delete("followup"); // Clear followup mode if they change requirements

    if (options?.symptom) current.searchParams.set("symptom", options.symptom);
    if (options?.department) current.searchParams.set("department", options.department);
    if (options?.reason) current.searchParams.set("reason", options.reason);
    if (options?.doctorHint) current.searchParams.set("doctorHint", options.doctorHint);
    if (options?.queueHint) current.searchParams.set("queueHint", options.queueHint);

    if (nextCount > 2) {
      if (pref === "expert-first") {
        current.searchParams.set("expertList", "1");
        current.searchParams.delete("fastList");
      } else {
        current.searchParams.set("fastList", "1");
        current.searchParams.delete("expertList");
      }
    } else {
      current.searchParams.delete("expertList");
      current.searchParams.delete("fastList");
    }
    
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

  const isNavigationOrProcessQuestion = (text: string) => {
    const q = text.trim().toLowerCase();
    if (!q) return false;
    const keywords = [
      "导航", "路线", "路怎么走", "怎么走", "在哪", "哪里", "几楼", "几层", "怎么去",
      "取药流程", "缴费流程", "报到流程", "签到流程", "挂号流程", "打印流程", "就医顺序",
      "流程", "步骤", "先做什么", "下一步", "怎么办", "如何", "怎么操作",
      "location", "navigation", "where", "floor", "route", "process", "step", "how to",
    ];
    return keywords.some((keyword) => q.includes(keyword));
  };

  const forwardQuestionToMobile = async (question: string) => {
    const mobileBase = process.env.NEXT_PUBLIC_MOBILE_APP_URL?.trim();
    if (!mobileBase) return false;
    try {
      const resp = await fetch(`${mobileBase.replace(/\/$/, "")}/api/kiosk-handoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          source: "kiosk",
          ts: Date.now(),
          context: buildFlowContext(),
        }),
      });
      return resp.ok;
    } catch {
      return false;
    }
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
        if (pathname === "/register/doctors") {
          setSmartOptions(mergeDoctorTopSuggestions(data.suggestions).slice(0, 3));
        } else {
          setSmartOptions(data.suggestions.slice(0, 3));
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void refreshSuggestionsByContext();

    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (pathname === "/register/recommend" && sp.get("followup") === "1") {
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

    if (isPositiveConfirmation(query)) {
      setQaAnswer("好的，正在为您自动确认并进入下一步...");
      setTimeout(() => {
        const primaryBtn = document.querySelector('a.bg-blue-600, button.bg-blue-600, .bg-blue-600') as HTMLElement;
        if (primaryBtn) {
          primaryBtn.click();
        } else {
          setQaAnswer("当前页面没有可确认的操作，请直接描述您的需求。");
        }
      }, 800);
      setVoiceHint("");
      return;
    }

    if (isNavigationOrProcessQuestion(query)) {
      const forwarded = await forwardQuestionToMobile(query);
      if (forwarded) {
        lastQuestionRef.current = query;
        setQaAnswer("已同步到手机端继续处理，请在手机中查看导航或流程指引。");
        setInput("");
        setVoiceHint("");
        setIsAnalyzing(false);
        return;
      }
    }

    if ((pathname === "/register/doctors" || pathname === "/register/recommend") && wantsAuthoritativeDoctors(query)) {
      setQaAnswer("好的，为您筛选更权威的专家医生，按照专家级别和好评度为您排序。");
      applyDoctorAdjustment("expert-first");
      setVoiceHint("");
      return;
    }

    if ((pathname === "/register/doctors" || pathname === "/register/recommend") && wantsFasterDoctors(query)) {
      setQaAnswer("没问题，为您切换到最早有号源的医生，按照可就诊时间为您排序。");
      applyDoctorAdjustment("time-first");
      setVoiceHint("");
      return;
    }

    if ((pathname === "/register/doctors" || pathname === "/register/recommend") && wantsAnotherDoctor(query)) {
      setQaAnswer("好的，已为您重新推荐了一位医生供您选择。");
      applyDoctorAdjustment(resolveCurrentDoctorPreference());
      setVoiceHint("");
      return;
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
      if (Array.isArray(data.suggestions) && data.suggestions.length) {
        if (pathname === "/register/doctors") {
          setSmartOptions(mergeDoctorTopSuggestions(data.suggestions).slice(0, 3));
        } else {
          setSmartOptions(data.suggestions.slice(0, 3));
        }
      }
      lastQuestionRef.current = query;
      if (data.intent === "symptom") {
        const symptom = (data.symptom || query).trim();
        if (pathname === "/register/doctors" || pathname === "/register/recommend") {
          const pref = wantsAuthoritativeDoctors(query)
            ? "expert-first"
            : wantsFasterDoctors(query)
              ? "time-first"
              : resolveCurrentDoctorPreference();
          
          const replyText = (!data.symptom || (symptom === query && (query.includes("挂号") || query.includes("看病"))))
            ? `根据您的需求“${symptom}”，为您匹配了以下三位医生，已综合考虑专业匹配度与号源时间为您排序。`
            : `根据您补充的症状“${symptom}”，为您推荐了以下三位相关专业的医生，综合考虑了医生的专业匹配度与号源时间。`;
          
          setQaAnswer(replyText);
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
        const replyText = (!data.symptom || (symptom === query && (query.includes("挂号") || query.includes("看病"))))
          ? `根据您的需求“${symptom}”，为您匹配了以下三位医生，已综合考虑专业匹配度与号源时间为您排序。`
          : `根据您的症状“${symptom}”，为您推荐了以下三位相关专业的医生，综合考虑了医生的专业匹配度与号源时间。`;
        setQaAnswer(replyText);
        router.push(`/register/doctors?${queryParts.join("&")}`);
        setVoiceHint("");
        return;
      }
      setQaAnswer(data.answer || "已收到你的问题，请再具体描述一下。");
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
    <div className="flex h-screen w-screen items-center justify-center bg-gray-900 overflow-hidden">
      <div className="relative flex flex-col h-full w-full max-w-[calc(100vh*9/16)] bg-hospital-bg shadow-2xl overflow-hidden border-x border-gray-200">
        {pathname !== "/component-library" ? (
          <Link
            href="/component-library"
            className="fixed bottom-4 right-4 z-50 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-black/80"
          >
            组件库
          </Link>
        ) : null}

        {/* Top 1/5: AI Chat */}
        <div className="flex h-[20%] flex-col overflow-y-auto border-b border-gray-200 p-4 bg-white/50">
          <div className="flex-1 overflow-y-auto flex flex-col justify-end gap-3 pb-2">
            {input && (
              <div className="flex flex-row-reverse items-start gap-3 mt-2">
                <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-gray-100 p-4 text-gray-800 shadow-sm border border-gray-200">
                  <p className="text-base whitespace-pre-wrap leading-relaxed">{input}</p>
                </div>
              </div>
            )}
            {!isAnalyzing && qaAnswer && (
              <div className="flex items-start gap-3 mt-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-hospital-blue text-white shadow-sm">
                  <Bot size={24} />
                </div>
                <div className="rounded-2xl rounded-tl-none border border-transparent bg-hospital-blue p-4 text-white shadow-sm max-w-[85%]">
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

        {/* Middle 3/5: Core Task Window */}
        <div className="flex h-[60%] flex-col overflow-y-auto bg-hospital-bg text-gray-900 relative">
          {isAnalyzing && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
              <Loader2 className="h-12 w-12 animate-spin text-hospital-blue mb-4" />
              <p className="text-xl font-bold text-gray-800">正在根据您的需求生成页面...</p>
              <p className="mt-2 text-sm text-gray-500">正在匹配最合适的医生和号源</p>
            </div>
          )}
          {children}
        </div>

        {/* Bottom 1/5: Interaction Area */}
        <div className="flex h-[20%] flex-col border-t border-gray-200 bg-white p-4 justify-center items-center gap-3">
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
                className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-2 text-xs text-gray-700 transition-colors active:bg-gray-200 hover:bg-gray-100 whitespace-nowrap text-center"
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
              isListening ? "bg-red-500 text-white animate-pulse" : "bg-hospital-blue text-white hover:scale-105"
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

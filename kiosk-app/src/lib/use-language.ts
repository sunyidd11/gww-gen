"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLang, LANG_COOKIE_KEY } from "./i18n-shared";

/**
 * 全局语言状态（客户端），默认中文。
 */
export function useLanguage() {
  const router = useRouter();
  const [lang, setLangState] = useState<AppLang>("zh");

  useEffect(() => {
    document.documentElement.lang = "zh-CN";
    document.cookie = `${LANG_COOKIE_KEY}=zh; path=/; max-age=0; samesite=lax`;
  }, []);

  const setLang = (next: AppLang) => {
    setLangState(next);
    document.cookie = `${LANG_COOKIE_KEY}=${next}; path=/; samesite=lax`;
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
    router.refresh();
  };

  const t = (zh: string, en: string) => (lang === "zh" ? zh : en);

  return { lang, setLang, t };
}


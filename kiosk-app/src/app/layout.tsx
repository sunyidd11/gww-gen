import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppLayoutClient from "../components/AppLayoutClient";
import "./globals.css";

export const metadata: Metadata = {
  title: "医院一体机智能助手",
  description: "SmartHospitalAssistant MVP",
};

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="m-0 overflow-hidden bg-[#2d2b3a] p-0">
        <AppLayoutClient>{props.children}</AppLayoutClient>
      </body>
    </html>
  );
}


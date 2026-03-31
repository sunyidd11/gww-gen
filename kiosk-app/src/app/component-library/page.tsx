"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import AuthoritativeDoctorPicker from "../../components/AuthoritativeDoctorPicker";
import HomeEntryActions from "../../components/HomeEntryActions";
import PriorityRecommendationPanel from "../../components/PriorityRecommendationPanel";
import SmartHospitalAssistant from "../../components/SmartHospitalAssistant";
import TaskFlowPanel from "../../components/TaskFlowPanel";
import {
  ActionButtons,
  ExamGroupCard,
  LocationCard,
  PaymentSummaryCard,
  PharmacyCard,
  QueueStatusCard,
  ReportStatusCard,
  StateBlock,
  TaskStatusHeader,
  TimeCard,
} from "../../components/atom";
import type { FlowEvidence } from "../../lib/flow-engine";
import { buildMockJourneyData, sortDoctorCandidatesByPriority } from "../../lib/mock-hospital-data";
import type { TaskSlug } from "../../lib/task-pages";
import { getTaskConfigBySlug } from "../../lib/task-pages";

const previewEvidence: FlowEvidence = {
  hasPendingCheckIn: true,
  unpaidOrderCount: 1,
  reportReadyCount: 1,
  queueStatus: "未排队",
  needsHumanAssist: false,
};

const queueEvidence: FlowEvidence = {
  hasPendingCheckIn: false,
  unpaidOrderCount: 1,
  reportReadyCount: 1,
  queueStatus: "排队中",
  needsHumanAssist: false,
};

const reportEvidence: FlowEvidence = {
  hasPendingCheckIn: false,
  unpaidOrderCount: 0,
  reportReadyCount: 1,
  queueStatus: "未排队",
  needsHumanAssist: false,
};

function requireTaskConfig(slug: TaskSlug) {
  const config = getTaskConfigBySlug(slug);
  if (!config) {
    throw new Error(`Missing ${slug} task config`);
  }
  return config;
}

const previewJourney = buildMockJourneyData("发热咳嗽", previewEvidence, {
  lang: "zh",
});
const queueJourney = buildMockJourneyData("发热咳嗽", queueEvidence, {
  lang: "zh",
});
const reportJourney = buildMockJourneyData("发热咳嗽", reportEvidence, {
  lang: "zh",
});

const doctorList = [
  {
    name: "李海峰",
    title: "主任医师",
    specialty: "呼吸道感染",
    nextSlot: "10:20",
    consultationFee: 80,
  },
  {
    name: "王晨",
    title: "副主任医师",
    specialty: "发热分诊",
    nextSlot: "10:35",
    consultationFee: 50,
  },
  {
    name: "周宁",
    title: "主治医师",
    specialty: "咳嗽评估",
    nextSlot: "10:50",
    consultationFee: 30,
  },
] as const;

const recommendDoctors = sortDoctorCandidatesByPriority(previewJourney.doctorCandidates, "time-first");
const recommendedDoctor = recommendDoctors[0] ?? previewJourney.doctorCandidates[0];
const expertDoctors = sortDoctorCandidatesByPriority(previewJourney.doctorCandidates, "expert-first").slice(0, 3);
const followupOriginalDoctor = previewJourney.doctorCandidates[0];
const followupExpertDoctor = expertDoctors[0] ?? previewJourney.doctorCandidates[0];

function PreviewCard(props: {
  name: string;
  children: ReactNode;
  previewClassName?: string;
}) {
  return (
    <section className="rounded-[32px] border border-[#e8e6f8] bg-white p-5 shadow-[0_14px_32px_rgba(108,81,233,0.08)] sm:p-6">
      <h2 className="text-lg font-bold text-[#3d3959] sm:text-xl">{props.name}</h2>
      <div className={[
        "mt-4 rounded-[28px] border border-dashed border-[#e6e1fb] bg-[#faf9ff] p-4",
        props.previewClassName ?? "",
      ].join(" ")}>{props.children}</div>
    </section>
  );
}

function SceneCard(props: {
  name: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-[#e8e6f8] bg-[#f7f5ff] p-5 shadow-[0_14px_32px_rgba(108,81,233,0.08)] sm:p-6">
      <h2 className="text-lg font-bold text-[#3d3959] sm:text-xl">{props.name}</h2>
      <div className="mt-4 rounded-[28px] border border-[#ebe8fa] bg-white p-4 shadow-[0_10px_28px_rgba(108,81,233,0.08)] sm:p-6">
        {props.children}
      </div>
    </section>
  );
}

export default function ComponentLibraryPage() {
  const paymentConfig = requireTaskConfig("payment");
  const checkInConfig = requireTaskConfig("check-in");
  const queueConfig = requireTaskConfig("queue-waiting");
  const reportConfig = requireTaskConfig("print-report");

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto p-4 md:p-6">
      <div className="w-full rounded-3xl border border-[#e8e6f8] bg-white p-6 shadow-[0_14px_36px_rgba(107,69,246,0.08)] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[#8e88b6]">kiosk-app</p>
            <h1 className="mt-2 text-3xl font-black text-[#3d3959] sm:text-4xl">组件库页面</h1>
          </div>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#ddd8f6] bg-[#faf9ff] px-5 py-2 text-sm font-semibold text-[#6d6889] shadow-sm transition hover:bg-[#f3f0ff]"
          >
            返回首页
          </Link>
        </div>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#8e88b6]">Section A</p>
              <h2 className="text-2xl font-black text-[#3d3959]">组件区</h2>
            </div>
          </div>

          <div className="mt-6 space-y-6">
          <PreviewCard name="HomeEntryActions" previewClassName="bg-[#f4f3ff] text-[#3d3959]">
            <HomeEntryActions lang="zh" />
          </PreviewCard>

          <PreviewCard name="PriorityRecommendationPanel" previewClassName="bg-[#f4f3ff] text-[#3d3959]">
            <PriorityRecommendationPanel
              symptom="发热咳嗽"
              department="发热门诊"
              reason="发热伴呼吸道症状优先进入发热门诊进行分诊和筛查。"
              doctorName="王晨"
              doctorTitle="副主任医师"
              doctorSpecialty="发热分诊"
              doctorNextSlot="10:20"
              doctorsPageHref="/register/doctors?symptom=%E5%8F%91%E7%83%AD%E5%92%B3%E5%97%BD"
              lang="zh"
            />
          </PreviewCard>

          <PreviewCard name="AuthoritativeDoctorPicker" previewClassName="bg-[#f4f3ff] text-[#3d3959]">
            <AuthoritativeDoctorPicker
              doctors={[...doctorList]}
              lang="zh"
              detailBaseHref="/register/doctors?symptom=%E5%8F%91%E7%83%AD%E5%92%B3%E5%97%BD&priority=expert-first"
            />
          </PreviewCard>

          <PreviewCard name="SmartHospitalAssistant" previewClassName="min-h-[720px] overflow-hidden bg-[#F3F4FF] p-0 text-[#3d3959]">
            <SmartHospitalAssistant />
          </PreviewCard>

          <PreviewCard name="TaskFlowPanel" previewClassName="min-h-[520px]">
            <TaskFlowPanel
              config={paymentConfig}
              evidence={previewEvidence}
              journey={previewJourney}
              lang="zh"
              initialStepIndex={1}
              flowStage={1}
            />
          </PreviewCard>

          <PreviewCard name="TaskStatusHeader">
            <TaskStatusHeader
              title="待缴费订单"
              status="pending"
              description="就诊号 XH20260330001，共 3 个收费项目"
            />
          </PreviewCard>

          <PreviewCard name="LocationCard">
            <LocationCard
              hospital="上海新华医院"
              department="发热门诊"
              address="门诊楼 1 层，请按导视前往对应楼层"
              room="1F-03 诊室"
              lang="zh"
            />
          </PreviewCard>

          <PreviewCard name="TimeCard">
            <TimeCard date="2026-03-30" timeSlot="10:20 - 10:40" lang="zh" />
          </PreviewCard>

          <PreviewCard name="QueueStatusCard" previewClassName="bg-white p-2 sm:p-3">
            <QueueStatusCard currentNumber="A042" waitingCount={5} estimatedTime="约15分钟" lang="zh" />
          </PreviewCard>

          <PreviewCard name="PaymentSummaryCard" previewClassName="bg-white p-2 sm:p-3">
            <PaymentSummaryCard
              items={[
                { name: "血常规", price: 45 },
                { name: "C 反应蛋白", price: 32 },
                { name: "胸部 DR", price: 120 },
              ]}
              total={197}
              status="unpaid"
              lang="zh"
            />
          </PreviewCard>

          <PreviewCard name="ReportStatusCard">
            <ReportStatusCard
              title="胸部检查报告"
              date="2026-03-30 11:40"
              status="ready"
              id="RPT-20260330-001"
              lang="zh"
            />
          </PreviewCard>

          <PreviewCard name="PharmacyCard" previewClassName="bg-white p-2 sm:p-3">
            <PharmacyCard
              window="3号 门诊药房"
              code="28"
              medicines={["阿莫西林胶囊（0.25g*24粒）", "复方甘草口服液（100ml）"]}
              lang="zh"
            />
          </PreviewCard>

          <PreviewCard name="StateBlock">
            <StateBlock type="loading" lang="zh" />
          </PreviewCard>

          <PreviewCard name="ExamGroupCard" previewClassName="bg-white p-2 sm:p-3">
            <ExamGroupCard
              title="检验科（2楼）"
              exams={[
                { name: "血常规(五分类)", status: "completed" },
                { name: "胸部正侧位 X线", status: "pending" },
              ]}
              lang="zh"
            />
          </PreviewCard>

          <PreviewCard name="ActionButtons">
            <ActionButtons primaryLabel="确认挂号" secondaryLabel="返回首页" />
          </PreviewCard>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#8e88b6]">Section B</p>
              <h2 className="text-2xl font-black text-[#3d3959]">AI 场景</h2>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <SceneCard name="首页 AI 引导场景">
              <div className="rounded-[32px] border border-[#ebe8fa] bg-white p-6 shadow-[0_12px_30px_rgba(108,81,233,0.08)] md:p-10">
                <p className="text-sm text-[#8e88b6]">医院一体机</p>
                <h3 className="mt-2 text-[32px] font-black leading-tight text-[#3d3959] sm:text-[42px]">
                  请插入医保卡或扫描医保码
                </h3>
                <HomeEntryActions lang="zh" />
                <p className="mt-8 text-[16px] text-[#6d6889] sm:text-[18px]">
                  若需语音帮助，请点击下方麦克风说出症状，系统将自动推荐挂号。
                </p>
              </div>
            </SceneCard>

            <SceneCard name="AI 推荐挂号场景">
              <div className="rounded-[28px] border border-[#ebe8fa] bg-white p-6 text-[#3d3959] shadow-[0_10px_28px_rgba(108,81,233,0.08)]">
                <p className="text-sm text-[#8e88b6]">推荐预约挂号页面</p>
                <h3 className="mt-2 text-[28px] font-black sm:text-[36px]">系统已识别您的需求</h3>
                <p className="mt-3 text-[18px] text-[#3d3959] sm:text-[20px]">输入症状：发热咳嗽</p>
                <p className="mt-1 text-[16px] text-[#6d6889] sm:text-[18px]">
                  就诊人：{previewJourney.patient.maskedName}（{previewJourney.patient.gender}，{previewJourney.patient.age}岁） | 就诊号：
                  {previewJourney.patient.visitNo}
                </p>
                <div className="mt-5 rounded-[24px] border border-[#e6e1fb] bg-[#f4f3ff] p-4 text-[#3d3959] shadow-sm">
                  <PriorityRecommendationPanel
                    symptom="发热咳嗽"
                    department={previewJourney.recommendation.department}
                    reason={previewJourney.recommendation.reason}
                    doctorName={recommendedDoctor.name}
                    doctorTitle={recommendedDoctor.title}
                    doctorSpecialty={recommendedDoctor.specialty}
                    doctorNextSlot={recommendedDoctor.nextSlot}
                    doctorsPageHref="/register/doctors?symptom=%E5%8F%91%E7%83%AD%E5%92%B3%E5%97%BD&priority=time-first"
                    lang="zh"
                  />
                </div>
              </div>
            </SceneCard>

            <SceneCard name="AI 医生推荐 - 单医生确认场景">
              <div className="rounded-[28px] border border-[#ebe8fa] bg-white p-4 text-[#3d3959] shadow-[0_10px_28px_rgba(108,81,233,0.08)] sm:p-6">
                <div className="rounded-[24px] border border-[#ebe8fa] bg-[#F3F4FF] p-4">
                  <p className="text-[22px] font-bold text-[#3d3959]">推荐科室：{previewJourney.recommendation.department}</p>
                  <p className="text-sm text-[#6d6889]">系统已根据优先级为你推荐 1 位医生</p>
                  <p className="mt-1 text-[25px] font-bold">
                    {recommendedDoctor.name} {recommendedDoctor.title}
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-[20px] border border-[#ece9fb] bg-white px-3 py-2 shadow-[0_8px_18px_rgba(61,57,89,0.12)]">
                      <p className="text-xs text-[#8e88b6]">擅长方向</p>
                      <p className="text-[16px] font-semibold text-[#3d3959]">{recommendedDoctor.specialty}</p>
                    </div>
                    <div className="rounded-[20px] border border-[#ece9fb] bg-white px-3 py-2 shadow-[0_8px_18px_rgba(61,57,89,0.12)]">
                      <p className="text-xs text-[#8e88b6]">最早号源</p>
                      <p className="text-[16px] font-semibold text-[#3d3959]">{recommendedDoctor.nextSlot}</p>
                    </div>
                    <div className="rounded-[20px] border border-[#ece9fb] bg-white px-3 py-2 shadow-[0_8px_18px_rgba(61,57,89,0.12)]">
                      <p className="text-xs text-[#8e88b6]">预计候诊</p>
                      <p className="text-[16px] font-semibold text-[#3d3959]">{recommendedDoctor.waitMinutes} 分钟</p>
                    </div>
                    <div className="rounded-[20px] border border-[#ece9fb] bg-white px-3 py-2 shadow-[0_8px_18px_rgba(61,57,89,0.12)]">
                      <p className="text-xs text-[#8e88b6]">诊室位置 / 挂号费</p>
                      <p className="text-[16px] font-semibold text-[#3d3959]">
                        {previewJourney.appointment.room} / ¥{recommendedDoctor.consultationFee}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="col-span-1 inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#ddd8f6] bg-[#F3F4FF] px-5 py-2.5 text-center text-[15px] font-semibold text-[#6d6889] shadow-sm">
                      返回首页
                    </div>
                    <div className="col-span-2 inline-flex min-h-[56px] items-center justify-center rounded-full bg-[#6A46FF] px-8 py-4 text-center text-[20px] font-bold text-white shadow-[0_12px_28px_rgba(108,81,233,0.22)]">
                      确认挂号
                    </div>
                  </div>
                </div>
              </div>
            </SceneCard>

            <SceneCard name="AI 医生推荐 - 专家列表场景">
              <div className="rounded-[28px] border border-[#ebe8fa] bg-white p-4 text-[#3d3959] shadow-[0_10px_28px_rgba(108,81,233,0.08)] sm:p-6">
                <div className="rounded-[24px] border border-[#ebe8fa] bg-[#F3F4FF] p-4">
                  <p className="text-[22px] font-bold text-[#3d3959]">推荐科室：{previewJourney.recommendation.department}</p>
                  <p className="text-sm text-[#6d6889]">已为你筛选本科室 3 位更权威医生，请选择并确认挂号</p>
                  <div className="mt-4 rounded-[24px] border border-[#e6e1fb] bg-[#f4f3ff] p-4 text-[#3d3959] shadow-sm">
                    <AuthoritativeDoctorPicker
                      doctors={expertDoctors}
                      lang="zh"
                      detailBaseHref="/register/doctors?symptom=%E5%8F%91%E7%83%AD%E5%92%B3%E5%97%BD&priority=expert-first"
                    />
                  </div>
                </div>
              </div>
            </SceneCard>

            <SceneCard name="AI 复诊轻异常场景">
              <div className="rounded-[28px] border border-[#ebe8fa] bg-white p-4 text-[#3d3959] shadow-[0_10px_28px_rgba(108,81,233,0.08)] sm:p-6">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-700">当前异常较轻，推荐原医生复诊（免挂号费）</p>
                  <p className="mt-1 text-[25px] font-bold text-[#3d3959]">
                    {followupOriginalDoctor.name} {followupOriginalDoctor.title}
                  </p>
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-white px-3 py-2 shadow-sm">
                    <p className="text-xs text-[#8e88b6]">擅长方向</p>
                    <p className="text-[16px] font-semibold text-[#3d3959]">{followupOriginalDoctor.specialty}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="col-span-1 inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#ddd8f6] bg-[#F3F4FF] px-5 py-2.5 text-center text-[15px] font-semibold text-[#6d6889] shadow-sm">
                      返回首页
                    </div>
                    <div className="col-span-2 inline-flex min-h-[56px] items-center justify-center rounded-full bg-[#6A46FF] px-8 py-4 text-center text-[20px] font-bold text-white shadow-[0_12px_28px_rgba(108,81,233,0.22)]">
                      原医生复诊（免缴费）
                    </div>
                  </div>
                </div>
              </div>
            </SceneCard>

            <SceneCard name="AI 复诊重异常场景">
              <div className="space-y-3 rounded-[28px] border border-[#ebe8fa] bg-white p-4 text-[#3d3959] shadow-[0_10px_28px_rgba(108,81,233,0.08)] sm:p-6">
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <p className="text-[22px] font-bold text-[#3d3959]">推荐科室：{previewJourney.recommendation.department}</p>
                  <p className="text-sm text-red-600">异常项目较多且严重，优先建议专家号复诊</p>
                  <p className="mt-1 text-[25px] font-bold text-[#3d3959]">
                    {followupExpertDoctor.name} {followupExpertDoctor.title}
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-red-200 bg-white px-3 py-2 shadow-sm">
                      <p className="text-xs text-[#8e88b6]">擅长方向</p>
                      <p className="text-[16px] font-semibold text-[#3d3959]">{followupExpertDoctor.specialty}</p>
                    </div>
                    <div className="rounded-xl border border-red-200 bg-white px-3 py-2 shadow-sm">
                      <p className="text-xs text-[#8e88b6]">诊室位置 / 挂号费</p>
                      <p className="text-[16px] font-semibold text-[#3d3959]">
                        {previewJourney.appointment.room} / ¥{followupExpertDoctor.consultationFee}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="col-span-1 inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#ddd8f6] bg-[#F3F4FF] px-5 py-2.5 text-center text-[15px] font-semibold text-[#6d6889] shadow-sm">
                      返回首页
                    </div>
                    <div className="col-span-2 inline-flex min-h-[56px] items-center justify-center rounded-full bg-[#6A46FF] px-8 py-4 text-center text-[20px] font-bold text-white shadow-[0_12px_28px_rgba(108,81,233,0.22)]">
                      挂专家号复诊
                    </div>
                  </div>
                </div>
                <div className="rounded-[24px] border border-[#ebe8fa] bg-[#F3F4FF] p-4">
                  <p className="text-sm text-[#8e88b6]">保留原医生复诊选项（免挂号费）</p>
                  <p className="mt-1 text-[22px] font-bold text-[#3d3959]">
                    {followupOriginalDoctor.name} {followupOriginalDoctor.title}
                  </p>
                  <div className="mt-3 inline-flex min-h-[52px] min-w-[420px] items-center justify-center rounded-full border border-[#ddd8f6] bg-[#F3F4FF] px-6 py-3 text-center text-[18px] font-bold text-[#3d3959] shadow-sm">
                    原医生复诊（免缴费）
                  </div>
                </div>
              </div>
            </SceneCard>

            <SceneCard name="AI 任务页场景 - 签到">
              <div className="rounded-[28px] border border-[#ebe8fa] bg-white p-4 text-[#3d3959] shadow-[0_10px_28px_rgba(108,81,233,0.08)] md:p-6">
                <TaskFlowPanel
                  config={checkInConfig}
                  evidence={previewEvidence}
                  journey={previewJourney}
                  lang="zh"
                  initialStepIndex={0}
                  flowStage={1}
                />
              </div>
            </SceneCard>

            <SceneCard name="AI 任务页场景 - 候诊排队">
              <div className="rounded-[28px] border border-[#ebe8fa] bg-white p-4 text-[#3d3959] shadow-[0_10px_28px_rgba(108,81,233,0.08)] md:p-6">
                <TaskFlowPanel
                  config={queueConfig}
                  evidence={queueEvidence}
                  journey={queueJourney}
                  lang="zh"
                  initialStepIndex={1}
                  flowStage={2}
                />
              </div>
            </SceneCard>

            <SceneCard name="AI 任务页场景 - 打印报告">
              <div className="rounded-[28px] border border-[#ebe8fa] bg-white p-4 text-[#3d3959] shadow-[0_10px_28px_rgba(108,81,233,0.08)] md:p-6">
                <TaskFlowPanel
                  config={reportConfig}
                  evidence={reportEvidence}
                  journey={reportJourney}
                  lang="zh"
                  initialStepIndex={0}
                  flowStage={4}
                />
              </div>
            </SceneCard>
          </div>
        </section>
      </div>
    </div>
  );
}

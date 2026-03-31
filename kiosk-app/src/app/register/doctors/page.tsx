import Link from "next/link";
import AuthoritativeDoctorPicker from "../../../components/AuthoritativeDoctorPicker";
import { parseFlowEvidence } from "../../../lib/flow-engine";
import {
  PriorityMode,
  Recommendation,
  buildMockJourneyData,
  isAbnormalItem,
  sortDoctorCandidatesByPriority,
} from "../../../lib/mock-hospital-data";
import { getQwenClinicalPlan } from "../../../lib/qwen-clinical-plan";
import { getQwenTriageRecommendation } from "../../../lib/qwen-triage";

type DoctorsPageProps = {
  searchParams: Promise<{
    symptom?: string;
    priority?: string;
    department?: string;
    reason?: string;
    doctorHint?: string;
    queueHint?: string;
    followup?: string;
    originalDoctor?: string;
    next?: string;
    hasPendingCheckIn?: string;
    unpaidOrderCount?: string;
    reportReadyCount?: string;
    queueStatus?: string;
    needsHumanAssist?: string;
    expertList?: string;
    fastList?: string;
    selectedDoctor?: string;
    adjustCount?: string;
    adjustPref?: string;
    flowStage?: string;
    patientName?: string;
    patientAge?: string;
    patientGender?: string;
  }>;
};

/**
 * 推荐医生详情页（位于优先级选择之后）。
 */
export default async function DoctorsPage(props: DoctorsPageProps) {
  const sp = await props.searchParams;
  const symptom = sp.symptom ?? "";
  const syncTs = Date.now();
  const patientName = sp.patientName ?? "";
  const patientAgeRaw = Number(sp.patientAge ?? "46");
  const patientAge = Number.isFinite(patientAgeRaw) ? Math.max(1, patientAgeRaw) : 46;
  const patientGender = sp.patientGender === "女" ? "女" : "男";
  const flowStageRaw = Number(sp.flowStage ?? "0");
  const flowStage = Number.isFinite(flowStageRaw) ? flowStageRaw : 0;
  const priority: PriorityMode = sp.priority === "expert-first" ? "expert-first" : "time-first";
  const isFollowupMode = sp.followup === "1";
  const adjustCountRaw = Number(sp.adjustCount ?? "0");
  const adjustCount = Number.isFinite(adjustCountRaw) ? Math.max(0, adjustCountRaw) : 0;
  const adjustPref: PriorityMode =
    sp.adjustPref === "expert-first" ? "expert-first" : "time-first";
  const activePriority: PriorityMode = !isFollowupMode && adjustCount > 0 ? adjustPref : priority;
  const singleAdjustMode = !isFollowupMode && adjustCount > 0 && adjustCount <= 2;
  const showExpertList =
    !isFollowupMode && (sp.expertList === "1" || (adjustCount > 2 && adjustPref === "expert-first"));
  const showFastList =
    !isFollowupMode && (sp.fastList === "1" || (adjustCount > 2 && adjustPref === "time-first"));
  const queryRecommendation: Recommendation | undefined = sp.department
    ? {
        department: sp.department,
        reason: sp.reason ?? "建议按推荐科室就诊。",
        doctorHint: sp.doctorHint ?? "",
        queueHint: sp.queueHint ?? "",
      }
    : undefined;
  
  const aiClinicalPlan = await getQwenClinicalPlan(symptom);
  const aiRecommendation = queryRecommendation ? null : await getQwenTriageRecommendation(symptom);
  const forcedRecommendation: Recommendation | undefined =
    queryRecommendation ?? aiClinicalPlan?.recommendation ?? aiRecommendation ?? undefined;
  const evidence = parseFlowEvidence(sp);
  const journey = buildMockJourneyData(symptom, evidence, {
    selectedDoctorName: sp.originalDoctor ?? undefined,
    forcedRecommendation,
    aiRecommendation: aiClinicalPlan?.recommendation,
    aiDoctors: aiClinicalPlan?.doctors,
    aiExamItems: aiClinicalPlan?.exams,
    aiMedicineItems: aiClinicalPlan?.medicines,
    patientProfile: {
      name: patientName || undefined,
      age: patientAge,
      gender: patientGender,
    },
    lang: "zh",
  });
  const doctorHintVal = forcedRecommendation?.doctorHint ?? sp.doctorHint;
  const doctors = sortDoctorCandidatesByPriority(journey.doctorCandidates, activePriority, doctorHintVal);
  const selectedDoctorByQuery = doctors.find((d) => d.name === (sp.selectedDoctor ?? ""));
  const adjustedIndex = singleAdjustMode ? Math.min(adjustCount, Math.max(0, doctors.length - 1)) : 0;
  const recommendedDoctor =
    !isFollowupMode && selectedDoctorByQuery ? selectedDoctorByQuery : doctors[adjustedIndex] ?? doctors[0];
  const originalDoctor =
    doctors.find((d) => d.name === (sp.originalDoctor ?? "")) ??
    doctors.find((d) => journey.appointment.doctor.includes(d.name)) ??
    doctors[0];

  const abnormalCount = journey.payments.items.filter(
    (item, idx) => isAbnormalItem(item.name, journey.symptomInput, idx)
  ).length;
  const severeAbnormal = abnormalCount >= 2;

  const originalDoctorNoPayHref =
    `/?completedStage=4&flowNextStage=5&syncTs=${encodeURIComponent(String(syncTs))}&symptom=${encodeURIComponent(symptom)}` +
    `&department=${encodeURIComponent(journey.recommendation.department)}` +
    `&patientName=${encodeURIComponent(journey.patient.maskedName)}` +
    `&patientAge=${encodeURIComponent(String(journey.patient.age))}` +
    `&patientGender=${encodeURIComponent(journey.patient.gender)}` +
    `&selectedDoctor=${encodeURIComponent(originalDoctor.name)}`;

  const expertFollowupPayHref =
    `/?completedStage=4&flowNextStage=5&syncTs=${encodeURIComponent(String(syncTs))}&symptom=${encodeURIComponent(symptom)}` +
    `&department=${encodeURIComponent(journey.recommendation.department)}` +
    `&patientName=${encodeURIComponent(journey.patient.maskedName)}` +
    `&patientAge=${encodeURIComponent(String(journey.patient.age))}` +
    `&patientGender=${encodeURIComponent(journey.patient.gender)}` +
    `&selectedDoctor=${encodeURIComponent(recommendedDoctor.name)}`;

  const paymentHref =
    `/tasks/payment?symptom=${encodeURIComponent(symptom)}` +
    `&department=${encodeURIComponent(journey.recommendation.department)}` +
    `&selectedDoctor=${encodeURIComponent(recommendedDoctor.name)}` +
    `&flowStage=${encodeURIComponent(String(flowStage))}` +
    `&patientName=${encodeURIComponent(journey.patient.maskedName)}` +
    `&patientAge=${encodeURIComponent(String(journey.patient.age))}` +
    `&patientGender=${encodeURIComponent(journey.patient.gender)}` +
    `&paymentMode=registration-only` +
    `&hasPendingCheckIn=1&unpaidOrderCount=1&reportReadyCount=1&queueStatus=未排队&needsHumanAssist=0`;
  const topExpertDoctors = sortDoctorCandidatesByPriority(journey.doctorCandidates, "expert-first", doctorHintVal).slice(0, 3);
  const topFastDoctors = sortDoctorCandidatesByPriority(journey.doctorCandidates, "time-first", doctorHintVal).slice(0, 3);
  const detailBaseHref =
    `/register/doctors?symptom=${encodeURIComponent(symptom)}` +
    `&flowStage=${encodeURIComponent(String(flowStage))}` +
    `&patientName=${encodeURIComponent(journey.patient.maskedName)}` +
    `&patientAge=${encodeURIComponent(String(journey.patient.age))}` +
    `&patientGender=${encodeURIComponent(journey.patient.gender)}` +
    `&priority=expert-first` +
    `&department=${encodeURIComponent(journey.recommendation.department)}` +
    `&reason=${encodeURIComponent(forcedRecommendation?.reason ?? journey.recommendation.reason)}` +
    `&doctorHint=${encodeURIComponent(forcedRecommendation?.doctorHint ?? journey.recommendation.doctorHint)}` +
    `&queueHint=${encodeURIComponent(forcedRecommendation?.queueHint ?? journey.recommendation.queueHint)}`;

  return (
    <div className="flex h-full w-full flex-col p-4 md:p-6 text-gray-900">
      <div className="w-full rounded-2xl border border-gray-100 bg-white shadow-sm p-4 sm:p-6">
        {!isFollowupMode ? (
          <div className="mt-2 sm:mt-5">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-[22px] font-bold text-gray-900">
                  {journey.recommendation.department}
                </p>
                {showExpertList || showFastList ? (
                  <>
                    <AuthoritativeDoctorPicker
                      doctors={showExpertList ? topExpertDoctors : topFastDoctors}
                      lang="zh"
                      detailBaseHref={detailBaseHref}
                    />
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-[25px] font-bold">
                      {recommendedDoctor.name} {recommendedDoctor.title}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
                        <p className="text-xs text-gray-500">擅长方向</p>
                        <p className="text-[16px] font-semibold text-gray-900">{recommendedDoctor.specialty}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
                        <p className="text-xs text-gray-500">最早号源</p>
                        <p className="text-[16px] font-semibold text-gray-900">{recommendedDoctor.nextSlot}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
                        <p className="text-xs text-gray-500">预计候诊</p>
                        <p className="text-[16px] font-semibold text-gray-900">
                          {recommendedDoctor.waitMinutes} 分钟
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
                        <p className="text-xs text-gray-500">诊室位置 / 挂号费</p>
                        <p className="text-[16px] font-semibold text-gray-900">
                          {journey.appointment.room} / ¥{recommendedDoctor.consultationFee}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <Link
                        href="/"
                        className="col-span-1 inline-flex min-h-[46px] items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-center text-[15px] font-semibold text-gray-700"
                      >
                        返回首页
                      </Link>
                      <Link
                        href={paymentHref}
                        className="col-span-2 inline-flex w-full min-h-[56px] items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-center text-[20px] font-bold text-white shadow-lg"
                      >
                        确认挂号
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {!severeAbnormal ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-700">
                    当前异常较轻，推荐原医生复诊（免挂号费）
                  </p>
                  <p className="mt-1 text-[25px] font-bold text-gray-900">
                    {originalDoctor.name} {originalDoctor.title}
                  </p>
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-white px-3 py-2 shadow-sm">
                    <p className="text-xs text-gray-500">擅长方向</p>
                    <p className="text-[16px] font-semibold text-gray-900">{originalDoctor.specialty}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <Link
                      href="/"
                      className="col-span-1 inline-flex min-h-[46px] items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-center text-[15px] font-semibold text-gray-700"
                    >
                      返回首页
                    </Link>
                    <Link
                      href={originalDoctorNoPayHref}
                      className="col-span-2 inline-flex min-h-[56px] items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-center text-[20px] font-bold text-white shadow-lg"
                    >
                      原医生复诊（免缴费）
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                    <p className="text-[22px] font-bold text-gray-900">
                      {journey.recommendation.department}
                    </p>
                    <p className="text-sm text-red-600">
                      异常项目较多且严重，优先建议专家号复诊
                    </p>
                    <p className="mt-1 text-[25px] font-bold text-gray-900">
                      {recommendedDoctor.name} {recommendedDoctor.title}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-red-200 bg-white px-3 py-2 shadow-sm">
                        <p className="text-xs text-gray-500">擅长方向</p>
                        <p className="text-[16px] font-semibold text-gray-900">{recommendedDoctor.specialty}</p>
                      </div>
                      <div className="rounded-lg border border-red-200 bg-white px-3 py-2 shadow-sm">
                        <p className="text-xs text-gray-500">诊室位置 / 挂号费</p>
                        <p className="text-[16px] font-semibold text-gray-900">
                          {journey.appointment.room} / ¥{recommendedDoctor.consultationFee}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <Link
                        href="/"
                        className="col-span-1 inline-flex min-h-[46px] items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-center text-[15px] font-semibold text-gray-700"
                      >
                        返回首页
                      </Link>
                      <Link
                        href={expertFollowupPayHref}
                        className="col-span-2 inline-flex min-h-[56px] items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-center text-[20px] font-bold text-white shadow-lg"
                      >
                        挂专家号复诊
                      </Link>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">保留原医生复诊选项（免挂号费）</p>
                    <p className="mt-1 text-[22px] font-bold text-gray-900">
                      {originalDoctor.name} {originalDoctor.title}
                    </p>
                    <div className="mt-3">
                      <Link
                        href={originalDoctorNoPayHref}
                        className="inline-flex min-h-[52px] min-w-[420px] items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-center text-[18px] font-bold text-gray-900 shadow-sm"
                      >
                        原医生复诊（免缴费）
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
      </div>
    </div>
  );
}

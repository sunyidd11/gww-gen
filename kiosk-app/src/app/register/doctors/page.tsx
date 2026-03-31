import AuthoritativeDoctorPicker from "../../../components/AuthoritativeDoctorPicker";
import { parseFlowEvidence } from "../../../lib/flow-engine";
import {
  PriorityMode,
  Recommendation,
  buildMockJourneyData,
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
    selectedDoctor?: string;
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
  const patientName = sp.patientName ?? "";
  const patientAgeRaw = Number(sp.patientAge ?? "46");
  const patientAge = Number.isFinite(patientAgeRaw) ? Math.max(1, patientAgeRaw) : 46;
  const patientGender = sp.patientGender === "女" ? "女" : "男";
  const flowStageRaw = Number(sp.flowStage ?? "0");
  const flowStage = Number.isFinite(flowStageRaw) ? flowStageRaw : 0;
  const priority: PriorityMode = sp.priority === "expert-first" ? "expert-first" : "time-first";
  const isFollowupMode = sp.followup === "1";
  const adjustPref: PriorityMode =
    sp.adjustPref === "expert-first" ? "expert-first" : "time-first";
  const activePriority: PriorityMode = !isFollowupMode && sp.adjustPref ? adjustPref : priority;
  
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
  const paymentBaseHref =
    `/tasks/payment?symptom=${encodeURIComponent(symptom)}` +
    `&department=${encodeURIComponent(journey.recommendation.department)}` +
    `&flowStage=${encodeURIComponent(String(flowStage))}` +
    `&patientName=${encodeURIComponent(journey.patient.maskedName)}` +
    `&patientAge=${encodeURIComponent(String(journey.patient.age))}` +
    `&patientGender=${encodeURIComponent(journey.patient.gender)}` +
    `&paymentMode=registration-only` +
    `&hasPendingCheckIn=1&unpaidOrderCount=1&reportReadyCount=1&queueStatus=未排队&needsHumanAssist=0`;

  const topExpertDoctors = sortDoctorCandidatesByPriority(journey.doctorCandidates, "expert-first", doctorHintVal).slice(0, 3);
  const topFastDoctors = sortDoctorCandidatesByPriority(journey.doctorCandidates, "time-first", doctorHintVal).slice(0, 3);
  const baseDoctors = activePriority === "expert-first" ? topExpertDoctors : topFastDoctors;

  /**
   * 解析原医生字段，兼容“姓名 职称”或仅姓名两种格式。
   */
  const parseOriginalDoctor = (raw: string): { name: string; title: string } => {
    const text = raw.trim();
    if (!text) return { name: "王主任", title: "主任医师" };
    const titleMatch = text.match(/(主任医师|副主任医师|主治医师)$/);
    if (titleMatch) {
      return {
        name: text.replace(titleMatch[1], "").trim() || "王主任",
        title: titleMatch[1],
      };
    }
    return { name: text, title: "主任医师" };
  };

  const originalDoctorInfo = parseOriginalDoctor(sp.originalDoctor ?? "");
  const sameDeptTail = baseDoctors.filter((d) => d.name !== originalDoctorInfo.name);
  const followupFirstBase = baseDoctors[0] ?? doctors[0];
  const followupFirst = {
    ...(followupFirstBase ?? {
      specialty: `${journey.recommendation.department}常见病诊治`,
      nextSlot: "10:30",
      consultationFee: 50,
    }),
    name: originalDoctorInfo.name,
    title: originalDoctorInfo.title,
    isFollowupDoctor: true,
  };
  const followupDoctors = [followupFirst, ...sameDeptTail].slice(0, 3);
  const displayDoctors = isFollowupMode ? followupDoctors : baseDoctors;

  return (
    <div className="flex h-full w-full flex-col p-4 text-[#3d3959] md:p-6">
      <div className="w-full rounded-[32px] border border-[#ebe8fa] bg-white p-4 shadow-[0_18px_48px_rgba(114,97,255,0.08)] sm:p-6">
        <div className="mt-2 sm:mt-5">
          <div className="rounded-[28px] border border-[#e6e1fb] bg-[#F3F4FF] p-4 shadow-[0_10px_24px_rgba(108,81,233,0.08)]">
            <p className="mb-4 text-[22px] font-bold text-[#2f2a45]">
              {journey.recommendation.department}
            </p>
            <AuthoritativeDoctorPicker
              doctors={displayDoctors}
              lang="zh"
              detailBaseHref={paymentBaseHref}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

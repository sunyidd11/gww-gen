import { evidenceToQuery, FlowEvidence, getNextTaskByEvidence } from "../../../lib/flow-engine";
import {
  buildMockJourneyData,
  Recommendation,
  sortDoctorCandidatesByPriority,
} from "../../../lib/mock-hospital-data";
import { getQwenClinicalPlan } from "../../../lib/qwen-clinical-plan";
import { getQwenTriageRecommendation } from "../../../lib/qwen-triage";
import PriorityRecommendationPanel from "../../../components/PriorityRecommendationPanel";
import Link from "next/link";

type RecommendRegisterPageProps = {
  searchParams: Promise<{
    symptom?: string;
    auto?: string;
    department?: string;
    reason?: string;
    doctorHint?: string;
    queueHint?: string;
    flowStage?: string;
    patientName?: string;
    patientAge?: string;
    patientGender?: string;
    followup?: string;
    originalDoctor?: string;
  }>;
};

export default async function RecommendRegisterPage(props: RecommendRegisterPageProps) {
  const sp = await props.searchParams;
  const symptom = sp.symptom ?? "";
  const patientName = sp.patientName ?? "";
  const patientAgeRaw = Number(sp.patientAge ?? "46");
  const patientAge = Number.isFinite(patientAgeRaw) ? Math.max(1, patientAgeRaw) : 46;
  const patientGender = sp.patientGender === "女" ? "女" : "男";
  const flowStageRaw = Number(sp.flowStage ?? "1");
  const flowStage = Number.isFinite(flowStageRaw) ? flowStageRaw : 1;
  const isFollowupMode = sp.followup === "1";
  
  const evidence: FlowEvidence = {
    hasPendingCheckIn: true,
    unpaidOrderCount: 1,
    reportReadyCount: 1,
    queueStatus: "未排队",
    needsHumanAssist: false,
  };
  const fallbackJourney = buildMockJourneyData(symptom, evidence);
  const queryRecommendation: Recommendation | undefined = sp.department
    ? {
        department: sp.department,
        reason: sp.reason ?? "建议按推荐科室就诊。",
        doctorHint: sp.doctorHint ?? "",
        queueHint: sp.queueHint ?? "",
      }
    : undefined;
  const aiClinicalPlan = queryRecommendation ? null : await getQwenClinicalPlan(symptom);
  const aiRecommendation = queryRecommendation ? null : await getQwenTriageRecommendation(symptom);
  const recommendation: Recommendation =
    queryRecommendation ?? aiClinicalPlan?.recommendation ?? aiRecommendation ?? fallbackJourney.recommendation;
  const journey = buildMockJourneyData(symptom, evidence, {
    forcedRecommendation: recommendation,
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
  const doctorHintVal = recommendation.doctorHint;
  const directDoctor = sortDoctorCandidatesByPriority(journey.doctorCandidates, "time-first", doctorHintVal)[0];
  const nextTask = getNextTaskByEvidence(evidence);
  const nextHref = nextTask
    ? `/tasks/${nextTask}?symptom=${encodeURIComponent(symptom)}&${evidenceToQuery(evidence)}`
    : "/";
  const doctorsPageHref =
    `/register/doctors?symptom=${encodeURIComponent(symptom)}` +
    `&priority=time-first` +
    `&flowStage=${encodeURIComponent(String(flowStage))}` +
    `&patientName=${encodeURIComponent(journey.patient.maskedName)}` +
    `&patientAge=${encodeURIComponent(String(journey.patient.age))}` +
    `&patientGender=${encodeURIComponent(journey.patient.gender)}` +
    `&department=${encodeURIComponent(recommendation.department)}` +
    `&reason=${encodeURIComponent(recommendation.reason)}` +
    `&doctorHint=${encodeURIComponent(recommendation.doctorHint)}` +
    `&queueHint=${encodeURIComponent(recommendation.queueHint)}` +
    `&next=${encodeURIComponent(nextHref)}`;
  const symptomDisplay = symptom || "未提供";

  return (
    <div className="flex h-full w-full flex-col p-4 md:p-6">
      <div className="w-full rounded-2xl border border-gray-100 bg-white shadow-sm p-6 text-gray-900">
        <h1 className="mt-2 text-[28px] font-black sm:text-[36px]">已识别您的需求</h1>
        {isFollowupMode ? (
          <p className="mt-3 text-[18px] text-gray-800 sm:text-[20px]">复诊医生：{sp.originalDoctor || "王主任"}</p>
        ) : (
          <p className="mt-3 text-[18px] text-gray-800 sm:text-[20px]">输入症状：{symptomDisplay}</p>
        )}
        <p className="mt-1 text-[16px] text-gray-600 sm:text-[18px]">
          就诊人：{journey.patient.maskedName}（{journey.patient.gender}，{journey.patient.age}岁） | 就诊号：
          {journey.patient.visitNo}
        </p>

        <div className="mt-5">
          {isFollowupMode ? (
            <PriorityRecommendationPanel
              symptom="复诊无需重新识别"
              department="呼吸内科"
              reason="为您推荐原医生复诊（免挂号费）"
              doctorName={sp.originalDoctor || "王主任"}
              doctorTitle="主任医师"
              doctorSpecialty="呼吸内科常见病、多发病的诊治。"
              doctorNextSlot="现在有号"
              doctorsPageHref={doctorsPageHref}
              lang="zh"
            />
          ) : (
            <PriorityRecommendationPanel
              symptom={symptomDisplay}
              department={journey.recommendation.department}
              reason={journey.recommendation.reason}
              doctorName={directDoctor.name}
              doctorTitle={directDoctor.title}
              doctorSpecialty={directDoctor.specialty}
              doctorNextSlot={directDoctor.nextSlot}
              doctorsPageHref={doctorsPageHref}
              lang="zh"
            />
          )}
        </div>
      </div>
    </div>
  );
}

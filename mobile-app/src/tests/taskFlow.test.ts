import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAiContextSummary,
  buildTaskCompletionSummary,
  buildTaskStepTask,
  buildUserProfileSummary,
  createJourneyContext,
  createReopenableTaskFromMessageComponent,
  createTaskFromComponent,
  getInitialTaskStep,
  getLocationTaskPresentation,
  getStandardTaskFlow,
  normalizeLocationData,
  normalizeTaskForFlow,
  recordTaskClose,
  recordTaskCompletion,
  recordTaskOpen,
  recordTaskSelection,
  recordTaskStepChange,
  mapKioskStageOneCompletion,
} from '../aiTaskFlow.ts';

interface MockResponseData {
  component?: {
    type: 'medical' | 'appointment' | 'checkin' | 'payment' | 'report' | 'meds' | 'examination' | 'process' | 'location' | 'tip';
    data: Record<string, unknown> & { currentStep?: number };
  } | null;
  recommendation?: {
    type: 'checkin' | 'payment' | 'report' | 'meds' | 'examination';
    title: string;
    target: string;
  } | null;
}

interface MockMessage {
  role: 'model';
  text: string;
  component?: MockResponseData['component'];
  recommendation?: MockResponseData['recommendation'];
}

function applyAiResponse(responseData: MockResponseData, options?: { autoOpenTask?: boolean }) {
  let activeTask = null;
  let taskStep = -1;
  let message: MockMessage | null = null;

  message = {
    role: 'model',
    text: 'mock',
    component: responseData.component ?? undefined,
    recommendation: responseData.recommendation ?? undefined,
  };

  if (responseData.component && (options?.autoOpenTask ?? true)) {
    activeTask = createTaskFromComponent(responseData.component);
    taskStep = getInitialTaskStep(responseData.component.data);
  }

  return { message, activeTask, taskStep };
}

test('AI recommendation-only flow should not auto-open task card', () => {
  const result = applyAiResponse({
    component: {
      type: 'appointment',
      data: { department: '呼吸内科' },
    },
  }, {
    autoOpenTask: false,
  });

  assert.equal(result.message?.component?.type, 'appointment');
  assert.equal(result.activeTask, null);
});

test('kiosk stage-1 completion should reuse medical component', () => {
  const mapped = mapKioskStageOneCompletion({
    department: '呼吸内科',
    selectedDoctor: '王主任',
    room: '2号诊室',
    appointmentTime: '今日 14:00',
  });

  assert.equal(mapped.completedTitle, '推荐医生挂号缴费');
  assert.equal(mapped.inlineComponent?.type, 'medical');
  assert.deepEqual(mapped.inlineComponent?.data, {
    department: '呼吸内科',
    doctorName: '王主任',
    time: '今日 14:00',
    statusText: '挂号成功',
  });
});

test('task factory should create task only when user manually opens it', () => {
  const task = createTaskFromComponent({
    type: 'appointment',
    data: { department: '呼吸内科' },
  });

  assert.equal(task.type, 'appointment');
  assert.equal(task.title, '推荐医生挂号缴费');
  assert.deepEqual(task.data, { department: '呼吸内科' });
  assert.equal(getInitialTaskStep({ currentStep: 2 }), 2);
});

test('location task factory should preserve dynamic props payload', () => {
  const task = createTaskFromComponent({
    type: 'location',
    data: {
      title: '检验科',
      fields: [
        { label: '楼层', value: '2层' },
        { label: '窗口', value: '3号窗口' },
        { label: '路线', value: '电梯右转直行30米' },
      ],
      routePreview: {
        title: '推荐路线',
        steps: ['乘电梯到2层', '右转直行', '到达检验科'],
      },
    },
  });

  assert.equal(task.type, 'location');
  assert.equal(task.title, '位置导航');
  assert.deepEqual(task.data, {
    title: '检验科',
    fields: [
      { label: '楼层', value: '2层' },
      { label: '窗口', value: '3号窗口' },
      { label: '路线', value: '电梯右转直行30米' },
    ],
    routePreview: {
      title: '推荐路线',
      steps: ['乘电梯到2层', '右转直行', '到达检验科'],
    },
  });
});

test('normalizeLocationData should keep dynamic location props in order', () => {
  const normalized = normalizeLocationData({
    title: '检验科',
    fields: [
      { label: '楼层', value: '2层' },
      { label: '窗口', value: '3号窗口' },
      { label: '路线', value: '电梯右转直行30米' },
    ],
    routePreview: {
      title: '推荐路线',
      steps: ['乘电梯到2层', '右转直行', '到达检验科'],
    },
  });

  assert.deepEqual(normalized, {
    title: '检验科',
    fields: [
      { label: '楼层', value: '2层' },
      { label: '窗口', value: '3号窗口' },
      { label: '路线', value: '电梯右转直行30米' },
    ],
    routePreview: {
      title: '推荐路线',
      steps: ['乘电梯到2层', '右转直行', '到达检验科'],
    },
    actionLabel: undefined,
  });
});

test('normalizeLocationData should convert legacy location props to dynamic fields', () => {
  const normalized = normalizeLocationData({
    destination: '门诊楼2层检验科',
    floor: '2层',
    direction: '电梯右转直行30米',
  });

  assert.deepEqual(normalized, {
    title: '门诊楼2层检验科',
    fields: [
      { label: '楼层', value: '2层' },
      { label: '路线', value: '电梯右转直行30米' },
    ],
    routePreview: undefined,
    actionLabel: undefined,
  });
});

test('getLocationTaskPresentation should prioritize preset map and compact info panel', () => {
  const presentation = getLocationTaskPresentation({
    title: '门诊楼2层检验科',
    fields: [
      { label: '楼层', value: '2层' },
      { label: '检查室', value: 'B203' },
    ],
    routePreview: {
      title: '步行导航',
      steps: ['乘电梯到2层', '右转经过导诊台', '到达 B203'],
      eta: '约3分钟',
    },
  });

  assert.equal(presentation.showPresetMap, true);
  assert.equal(presentation.mapPanelClassName, 'min-h-[320px] sm:min-h-[420px]');
  assert.equal(presentation.infoPanelClassName, 'space-y-3 sm:space-y-4');
});

test('user-initiated request should still auto-open current task card', () => {
  const result = applyAiResponse({
    component: {
      type: 'appointment',
      data: { department: '呼吸内科', currentStep: 1 },
    },
  });

  assert.equal(result.activeTask?.type, 'appointment');
  assert.equal(result.activeTask?.title, '推荐医生挂号缴费');
  assert.equal(result.taskStep, 1);
});

test('createReopenableTaskFromMessageComponent should reopen task-backed components', () => {
  const task = createReopenableTaskFromMessageComponent({
    type: 'process',
    data: {
      steps: ['到签到机刷卡', '确认门诊信息', '在候诊区等候叫号'],
      currentStep: 1,
    },
  });

  assert.equal(task?.type, 'process');
  assert.equal(task?.title, '流程指引');
  assert.deepEqual(task?.data, {
    steps: ['到签到机刷卡', '确认门诊信息', '在候诊区等候叫号'],
    currentStep: 1,
  });
});

test('createReopenableTaskFromMessageComponent should ignore non-task message components', () => {
  const task = createReopenableTaskFromMessageComponent({
    type: 'recommendation',
    data: {
      type: 'checkin',
      title: '前往签到',
      target: '呼吸内科',
    },
  });

  assert.equal(task, null);
});

test('journey context should track open, step change, selection and completion as JSON summary', () => {
  const openedTask = createTaskFromComponent({
    type: 'appointment',
    data: { department: '呼吸内科' },
  });

  let context = createJourneyContext();
  context = recordTaskOpen(context, openedTask, false);
  context = recordTaskStepChange(context, 1);
  context = recordTaskSelection(context, {
    doctorName: '王主任',
    time: '14:00',
    fee: '¥50',
  });
  context = recordTaskCompletion(context, openedTask);

  assert.equal(context.activeTaskSnapshot, null);
  assert.equal(context.completedTasks.length, 1);
  assert.equal(context.completedTasks[0]?.type, 'appointment');
  assert.equal(context.componentUsage.length, 4);
  assert.equal(context.componentUsage[0]?.action, 'complete');
  assert.equal(context.componentUsage[1]?.action, 'select');
  assert.deepEqual(context.componentUsage[1]?.selection, {
    doctorName: '王主任',
    time: '14:00',
    fee: '¥50',
  });
  assert.equal(context.componentUsage[2]?.action, 'step_change');
  assert.equal(context.componentUsage[3]?.action, 'open');

  const summary = buildAiContextSummary(context);
  assert.match(summary, /appointment/);
  assert.match(summary, /doctorName/);
  assert.match(summary, /王主任/);
  assert.match(summary, /completedTasks/);
});

test('exiting a task should only record close state without resume-task payload', () => {
  const openedTask = createTaskFromComponent({
    type: 'appointment',
    data: { department: '呼吸内科' },
  });

  let context = createJourneyContext();
  context = recordTaskOpen(context, openedTask, false);
  context = recordTaskSelection(context, {
    doctorName: '王主任',
    time: '14:00',
  });
  context = recordTaskClose(context);

  assert.equal(context.activeTaskSnapshot, null);
  assert.equal(context.componentUsage[0]?.action, 'close');
  assert.equal(context.componentUsage[0]?.taskType, 'appointment');
});

test('completion flow should preserve recommendation payload in model message', () => {
  const result = applyAiResponse({
    recommendation: {
      type: 'checkin',
      title: '前往签到',
      target: '呼吸内科',
    },
  }, {
    autoOpenTask: false,
  });

  assert.equal(result.message?.recommendation?.type, 'checkin');
  assert.equal(result.message?.recommendation?.title, '前往签到');
  assert.equal(result.activeTask, null);
});

test('task completion summary should expose default completion screen copy', () => {
  const summary = buildTaskCompletionSummary({
    type: 'appointment',
    title: '预约挂号',
    data: {},
  });

  assert.equal(summary.title, '你当前的主要事项已完成');
  assert.equal(summary.subtitle, '祝你早日康复');
  assert.equal(summary.primaryActionLabel, '完成并退出');
  assert.equal(summary.notice, '请记得取走您的卡片和票据');
  assert.equal(summary.followUps.length, 2);
  assert.equal(summary.followUps[0]?.label, '查看后续门诊地点');
  assert.equal(summary.followUps[1]?.label, '打印凭条');
});

test('user profile summary should include profile, visit history and journey context', () => {
  const context = createJourneyContext();
  const summary = buildUserProfileSummary({
    basicInfo: {
      name: '张三',
      age: 34,
      gender: '男',
      phone: '13800000000',
    },
    healthProfile: {
      allergies: '青霉素',
      chronicConditions: '哮喘',
      notes: '近期夜间咳嗽频繁',
    },
    visitRecords: [
      {
        id: 'visit-1',
        date: '2026-03-10',
        department: '呼吸内科',
        complaint: '咳嗽两周',
        diagnosis: '上呼吸道感染',
        treatment: '开药观察',
      },
    ],
  }, [
    {
      id: 'task-1',
      type: 'checkin',
      title: '签到候诊',
      status: 'completed',
      timestamp: 1710000000000,
    },
  ], context);

  assert.match(summary, /张三/);
  assert.match(summary, /青霉素/);
  assert.match(summary, /呼吸内科/);
  assert.match(summary, /签到候诊/);
  assert.match(summary, /currentJourneyStage/);
});

test('normalizeTaskForFlow should map standard medical entry components to fixed flow tasks', () => {
  const normalizedMedical = normalizeTaskForFlow({
    type: 'medical',
    title: '智能分诊',
    data: {
      department: '呼吸内科',
      doctorName: '王主任',
      time: '今日 14:00',
      statusText: '挂号成功',
    },
  });
  const normalizedReport = normalizeTaskForFlow({
    type: 'report',
    title: '报告查询',
    data: {},
  });

  assert.equal(normalizedMedical.type, 'appointment');
  assert.equal(normalizedMedical.title, '推荐医生挂号缴费');
  assert.deepEqual(normalizedMedical.data, {
    department: '呼吸内科',
    doctorName: '王主任',
    time: '今日 14:00',
    statusText: '挂号成功',
  });
  assert.equal(normalizedReport.type, 'report');
  assert.equal(normalizedReport.title, '检查结果打印及建议复诊');
});

test('getStandardTaskFlow should return configurable skeleton for standard medical tasks', () => {
  const flow = getStandardTaskFlow('appointment');

  assert.ok(flow);
  assert.equal(flow?.taskType, 'appointment');
  assert.deepEqual(flow?.steps.map((step: { componentType: string }) => step.componentType), ['medical', 'appointment', 'payment', 'tip']);
  assert.equal(flow?.steps[1]?.confirmLabel, '确认挂号');
  assert.equal(flow?.steps[2]?.confirmLabel, '去缴费');
});

test('buildTaskStepTask should build current step component task from standard flow', () => {
  const task = buildTaskStepTask({
    type: 'appointment',
    title: '推荐医生挂号缴费',
    data: {
      department: '呼吸内科',
      recommendation: '呼吸内科',
      confidence: 0.9,
      doctorName: '王主任',
      time: '今日 14:00',
      statusText: '挂号成功',
    },
  }, 0);

  assert.equal(task?.type, 'medical');
  assert.equal(task?.title, 'AI 根据症状推荐科室与医生');
  assert.equal((task?.data as Record<string, unknown>).department, '呼吸内科');
  assert.equal((task?.data as Record<string, unknown>).doctorName, '王主任');
  assert.equal((task?.data as Record<string, unknown>).time, '今日 14:00');
  assert.equal((task?.data as Record<string, unknown>).statusText, '挂号成功');
});

test('buildTaskStepTask should switch standard flow appointment to payment step task', () => {
  const task = buildTaskStepTask({
    type: 'appointment',
    title: '推荐医生挂号缴费',
    data: { department: '呼吸内科' },
  }, 2);

  assert.equal(task?.type, 'payment');
  assert.equal(task?.title, '挂号缴费');
  assert.equal((task?.data as Record<string, unknown>).__standardFlowStepIndex, 2);
  assert.equal((task?.data as Record<string, unknown>).__standardFlowTaskType, 'appointment');
});

test('buildTaskStepTask should preserve medical appointment confirmation data for kiosk handoff', () => {
  const task = buildTaskStepTask({
    type: 'appointment',
    title: '推荐医生挂号缴费',
    data: {
      department: '呼吸内科',
      doctorName: '王主任',
      time: '今日 14:00',
      statusText: '挂号成功',
    },
  }, 0);

  assert.deepEqual(task?.data, {
    department: '呼吸内科',
    doctorName: '王主任',
    time: '今日 14:00',
    statusText: '挂号成功',
    __standardFlowTaskType: 'appointment',
    __standardFlowTaskTitle: '推荐医生挂号缴费',
    __standardFlowStepIndex: 0,
    __standardFlowActionLabel: undefined,
  });
});

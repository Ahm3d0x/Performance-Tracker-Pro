export type PersonnelCategory = 'officers' | 'other_ranks';
export type ForceType = 'combat' | 'support';
export type StageId = 1 | 2 | 3 | 4 | 5 | 6;
export type AttendanceStatus =
  | 'tested'
  | 'not_tested'
  | 'medical'
  | 'mission'
  | 'leave'
  | 'course';

export interface StageStandard {
  stage: StageId;
  name: string;
  minAge: number;
  maxAge: number;
  pullupsMax: number; // العدد المطلوب للدرجة النهائية (100%)
  pushupsMax: number;
  situpsMax: number;
  runMax: number; // الجري المعدل
}

export interface SuburbTimeStandard {
  code: number; // 0..12
  label: string; // مثال: "21.30 ق" أو "خارج الزمن"
  score: number; // الدرجة من 100
  isMedical?: boolean;
  isUntested?: boolean;
  isOutOfTime?: boolean;
}

export interface ScoringSettings {
  unitName: string;
  ministryHeader: string;
  authorityHeader: string;
  branchHeader: string;
  forceTypeLabel: string;
  genderLabel: string;
  exercisesWeight: number; // افتراضياً 0.5 (50%)
  suburbWeight: number; // افتراضياً 0.5 (50%)
  passThreshold: number; // 50%
  stages: StageStandard[];
  suburbTimes: SuburbTimeStandard[];
}

export interface PersonRecord {
  id: string;
  serialNum: number;
  militaryId: string;
  corps: string; // السلاح
  rank: string; // الرتبة / الدرجة
  category: PersonnelCategory; // ضباط | درجات أخرى
  forceType: ForceType;
  name: string;
  age: number;
  weight: number | null; // كجم
  height: number | null; // سم
}

export interface AssessmentInput {
  periodId: string;
  personId: string;
  stageOverride?: StageId | null;
  pullupsCount: number; // عقلة
  pushupsCount: number; // ضغط
  situpsCount: number; // بطن
  runCount: number; // جرى معدل
  suburbTimeCode: number; // 0 = لم يختبر، 1..10 = الأزمنة، 11 = خارج الزمن، 12 = موقف طبى
  suburbMin: number | null;
  suburbSec: number | null;
  obstacleMin: number | null;
  obstacleSec: number | null;
  marchHours: number | null;
  marchMin: number | null;
  sprint100m: number | null;
  colleagueCarry: number | null;
  zigzagRun: number | null;
  longJump: number | null;
  grenadeThrow: number | null;
  attendanceStatus: AttendanceStatus;
  exercisesNotes: string;
  suburbNotes: string;
}

export interface EvaluatedAssessment {
  person: PersonRecord;
  input: AssessmentInput;
  stage: StageStandard;
  pullupsScore: number;
  pushupsScore: number;
  situpsScore: number;
  runScore: number;
  exercisesPercentage: number;
  exercisesGrade: string;
  suburbScore: number;
  suburbLabel: string;
  suburbGrade: string;
  totalPercentage: number;
  totalGrade: string;
  isTested: boolean;
  isMedical: boolean;
  bmi: number | null;
  bmiStatus: string;
  idealWeightDelta: number | null;
  overallRank: number | null;
  categoryRank: number | null;
}

export interface PeriodComparisonItem {
  person: PersonRecord;
  current: EvaluatedAssessment;
  previous: EvaluatedAssessment | null;
  percentageDelta: number | null;
  exercisesDelta: number | null;
  suburbDelta: number | null;
  rankDelta: number | null; // موجب = تقدم في الترتيب
  trend: 'improved' | 'declined' | 'stable' | 'new';
}

export interface CategorySummaryStats {
  categoryLabel: string;
  totalStrength: number;
  testedCount: number;
  medicalCount: number;
  untestedCount: number;
  avgExercisesPercentage: number;
  avgSuburbPercentage: number;
  avgTotalPercentage: number;
  passCount: number;
  passRate: number;
  excellentCount: number;
}

export interface UnitPeriodSummary {
  officers: CategorySummaryStats;
  otherRanks: CategorySummaryStats;
  overall: CategorySummaryStats;
}

export const DEFAULT_SCORING_SETTINGS: ScoringSettings = {
  unitName: 'اللواء الأول المشاة الميكانيكي',
  ministryHeader: 'وزارة الدفاع',
  authorityHeader: 'هيئة تدريب القوات المسلحة',
  branchHeader: 'فرع التربية الرياضية',
  forceTypeLabel: 'مقاتلة / معاونة',
  genderLabel: 'ذكور',
  exercisesWeight: 0.5,
  suburbWeight: 0.5,
  passThreshold: 50,
  stages: [
    {
      stage: 1,
      name: 'مرحلة أولى',
      minAge: 18,
      maxAge: 26,
      pullupsMax: 14,
      pushupsMax: 50,
      situpsMax: 60,
      runMax: 45,
    },
    {
      stage: 2,
      name: 'مرحلة ثانية',
      minAge: 27,
      maxAge: 31,
      pullupsMax: 12,
      pushupsMax: 44,
      situpsMax: 52,
      runMax: 40,
    },
    {
      stage: 3,
      name: 'مرحلة ثالثة',
      minAge: 32,
      maxAge: 36,
      pullupsMax: 10,
      pushupsMax: 38,
      situpsMax: 45,
      runMax: 36,
    },
    {
      stage: 4,
      name: 'مرحلة رابعة',
      minAge: 37,
      maxAge: 41,
      pullupsMax: 8,
      pushupsMax: 32,
      situpsMax: 38,
      runMax: 32,
    },
    {
      stage: 5,
      name: 'مرحلة خامسة',
      minAge: 42,
      maxAge: 46,
      pullupsMax: 6,
      pushupsMax: 26,
      situpsMax: 30,
      runMax: 28,
    },
    {
      stage: 6,
      name: 'مرحلة سادسة',
      minAge: 47,
      maxAge: 70,
      pullupsMax: 5,
      pushupsMax: 22,
      situpsMax: 25,
      runMax: 24,
    },
  ],
  suburbTimes: [
    { code: 0, label: 'لم يختبر', score: 0, isUntested: true },
    { code: 1, label: '21.30 ق', score: 100 },
    { code: 2, label: '22.00 ق', score: 95 },
    { code: 3, label: '22.30 ق', score: 90 },
    { code: 4, label: '23.00 ق', score: 85 },
    { code: 5, label: '23.30 ق', score: 80 },
    { code: 6, label: '24.00 ق', score: 75 },
    { code: 7, label: '24.30 ق', score: 70 },
    { code: 8, label: '25.00 ق', score: 65 },
    { code: 9, label: '25.30 ق', score: 60 },
    { code: 10, label: '26.00 ق', score: 55 },
    { code: 11, label: 'خارج الزمن', score: 0, isOutOfTime: true },
    { code: 12, label: 'موقف طبى', score: 0, isMedical: true },
  ],
};

export function resolveStageForAge(
  age: number,
  settings: ScoringSettings = DEFAULT_SCORING_SETTINGS,
  override?: StageId | null
): StageStandard {
  if (override) {
    const foundOverride = settings.stages.find((s) => s.stage === override);
    if (foundOverride) return foundOverride;
  }
  const safeAge = Number.isFinite(age) && age > 0 ? age : 25;
  for (const st of settings.stages) {
    if (safeAge >= st.minAge && safeAge <= st.maxAge) {
      return st;
    }
  }
  if (safeAge < settings.stages[0].minAge) return settings.stages[0];
  return settings.stages[settings.stages.length - 1];
}

export function calculateExerciseScore(count: number, maxRequired: number): number {
  if (!Number.isFinite(count) || count <= 0 || maxRequired <= 0) return 0;
  const raw = (count / maxRequired) * 100;
  return Math.min(100, Math.round(raw * 10) / 10);
}

export function getGradeLabel(
  percentage: number,
  isTested: boolean,
  isMedical: boolean
): string {
  if (isMedical) return 'موقف طبى';
  if (!isTested) return 'لم يختبر';
  if (percentage >= 85) return 'ممتاز';
  if (percentage >= 75) return 'جيد جداً';
  if (percentage >= 65) return 'جيد';
  if (percentage >= 50) return 'مقبول';
  return 'راسب';
}

export function calculateBMI(weightKg: number | null, heightCm: number | null): {
  bmi: number | null;
  status: string;
  idealDelta: number | null;
} {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 100) {
    return { bmi: null, status: 'غير مسجل', idealDelta: null };
  }
  const heightM = heightCm / 100;
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  const idealWeight = heightCm - 100;
  const idealDelta = Math.round((weightKg - idealWeight) * 10) / 10;

  let status = 'وزن مثالي';
  if (bmi < 18.5) status = 'نحافة';
  else if (bmi < 25) status = 'وزن مثالي';
  else if (bmi < 28) status = 'زيادة طفيفة';
  else if (bmi < 30) status = 'وزن زائد';
  else status = 'سمنة تقتضي المتابعة';

  return { bmi, status, idealDelta };
}

export function evaluatePersonAssessment(
  person: PersonRecord,
  input: AssessmentInput,
  settings: ScoringSettings = DEFAULT_SCORING_SETTINGS
): EvaluatedAssessment {
  const stage = resolveStageForAge(person.age, settings, input.stageOverride);
  const suburbStd =
    settings.suburbTimes.find((t) => t.code === input.suburbTimeCode) ||
    settings.suburbTimes[0];

  const isMedical =
    input.attendanceStatus === 'medical' || Boolean(suburbStd.isMedical);

  const hasExercisesInput =
    input.pullupsCount > 0 ||
    input.pushupsCount > 0 ||
    input.situpsCount > 0 ||
    input.runCount > 0;

  const hasSuburbInput =
    input.suburbTimeCode >= 1 && input.suburbTimeCode <= 11;

  const isTested =
    !isMedical &&
    input.attendanceStatus === 'tested' &&
    (hasExercisesInput || hasSuburbInput);

  const pullupsScore = isTested
    ? calculateExerciseScore(input.pullupsCount, stage.pullupsMax)
    : 0;
  const pushupsScore = isTested
    ? calculateExerciseScore(input.pushupsCount, stage.pushupsMax)
    : 0;
  const situpsScore = isTested
    ? calculateExerciseScore(input.situpsCount, stage.situpsMax)
    : 0;
  const runScore = isTested
    ? calculateExerciseScore(input.runCount, stage.runMax)
    : 0;

  const exercisesPercentage = isTested
    ? Math.round(((pullupsScore + pushupsScore + situpsScore + runScore) / 4) * 10) / 10
    : 0;

  const exercisesGrade = getGradeLabel(exercisesPercentage, isTested, isMedical);

  const suburbScore = isTested && hasSuburbInput ? suburbStd.score : 0;
  let suburbGrade = 'لم يختبر';
  if (isMedical || suburbStd.isMedical) {
    suburbGrade = 'موقف طبى';
  } else if (suburbStd.isOutOfTime) {
    suburbGrade = 'خارج الزمن';
  } else if (isTested && hasSuburbInput) {
    suburbGrade = getGradeLabel(suburbScore, true, false);
  }

  let totalPercentage = 0;
  if (isTested) {
    if (suburbStd.isMedical) {
      totalPercentage = exercisesPercentage;
    } else if (hasSuburbInput && hasExercisesInput) {
      const wEx = settings.exercisesWeight;
      const wSub = settings.suburbWeight;
      const totalWeight = wEx + wSub > 0 ? wEx + wSub : 1;
      totalPercentage =
        Math.round(((exercisesPercentage * wEx + suburbScore * wSub) / totalWeight) * 10) /
        10;
    } else if (hasExercisesInput) {
      totalPercentage = Math.round(exercisesPercentage * settings.exercisesWeight * 10) / 10;
    } else if (hasSuburbInput) {
      totalPercentage = Math.round(suburbScore * settings.suburbWeight * 10) / 10;
    }
  }

  const totalGrade = getGradeLabel(totalPercentage, isTested, isMedical);
  const { bmi, status: bmiStatus, idealDelta: idealWeightDelta } = calculateBMI(
    person.weight,
    person.height
  );

  return {
    person,
    input,
    stage,
    pullupsScore,
    pushupsScore,
    situpsScore,
    runScore,
    exercisesPercentage,
    exercisesGrade,
    suburbScore,
    suburbLabel: suburbStd.label,
    suburbGrade,
    totalPercentage,
    totalGrade,
    isTested,
    isMedical,
    bmi,
    bmiStatus,
    idealWeightDelta,
    overallRank: null,
    categoryRank: null,
  };
}

export function evaluateAndRankPeriod(
  personnel: PersonRecord[],
  inputsMap: Record<string, AssessmentInput>,
  periodId: string,
  settings: ScoringSettings = DEFAULT_SCORING_SETTINGS
): EvaluatedAssessment[] {
  const evaluated = personnel.map((person) => {
    const existing = inputsMap[person.id] || {
      periodId,
      personId: person.id,
      stageOverride: null,
      pullupsCount: 0,
      pushupsCount: 0,
      situpsCount: 0,
      runCount: 0,
      suburbTimeCode: 0,
      suburbMin: null,
      suburbSec: null,
      obstacleMin: null,
      obstacleSec: null,
      marchHours: null,
      marchMin: null,
      sprint100m: null,
      colleagueCarry: null,
      zigzagRun: null,
      longJump: null,
      grenadeThrow: null,
      attendanceStatus: 'not_tested' as AttendanceStatus,
      exercisesNotes: '',
      suburbNotes: '',
    };
    return evaluatePersonAssessment(person, existing, settings);
  });

  // Sort tested personnel from highest to lowest to assign overallRank and categoryRank
  const testedSorted = [...evaluated]
    .filter((item) => item.isTested)
    .sort((a, b) => {
      if (b.totalPercentage !== a.totalPercentage) {
        return b.totalPercentage - a.totalPercentage;
      }
      if (b.exercisesPercentage !== a.exercisesPercentage) {
        return b.exercisesPercentage - a.exercisesPercentage;
      }
      if (b.suburbScore !== a.suburbScore) {
        return b.suburbScore - a.suburbScore;
      }
      return a.person.serialNum - b.person.serialNum;
    });

  const overallRankMap = new Map<string, number>();
  const categoryRankMap = new Map<string, number>();
  let officersCount = 0;
  let otherRanksCount = 0;

  testedSorted.forEach((item, index) => {
    overallRankMap.set(item.person.id, index + 1);
    if (item.person.category === 'officers') {
      officersCount += 1;
      categoryRankMap.set(item.person.id, officersCount);
    } else {
      otherRanksCount += 1;
      categoryRankMap.set(item.person.id, otherRanksCount);
    }
  });

  return evaluated.map((item) => ({
    ...item,
    overallRank: overallRankMap.get(item.person.id) ?? null,
    categoryRank: categoryRankMap.get(item.person.id) ?? null,
  }));
}

export function calculateCategorySummary(
  label: string,
  items: EvaluatedAssessment[],
  passThreshold = 50
): CategorySummaryStats {
  const totalStrength = items.length;
  const testedItems = items.filter((i) => i.isTested);
  const testedCount = testedItems.length;
  const medicalCount = items.filter((i) => i.isMedical).length;
  const untestedCount = totalStrength - testedCount - medicalCount;

  if (testedCount === 0) {
    return {
      categoryLabel: label,
      totalStrength,
      testedCount: 0,
      medicalCount,
      untestedCount,
      avgExercisesPercentage: 0,
      avgSuburbPercentage: 0,
      avgTotalPercentage: 0,
      passCount: 0,
      passRate: 0,
      excellentCount: 0,
    };
  }

  const sumExercises = testedItems.reduce((acc, i) => acc + i.exercisesPercentage, 0);
  const sumSuburb = testedItems.reduce((acc, i) => acc + i.suburbScore, 0);
  const sumTotal = testedItems.reduce((acc, i) => acc + i.totalPercentage, 0);

  const avgExercisesPercentage = Math.round((sumExercises / testedCount) * 10) / 10;
  const avgSuburbPercentage = Math.round((sumSuburb / testedCount) * 10) / 10;
  const avgTotalPercentage = Math.round((sumTotal / testedCount) * 10) / 10;

  const passCount = testedItems.filter((i) => i.totalPercentage >= passThreshold).length;
  const passRate = Math.round((passCount / testedCount) * 1000) / 10;
  const excellentCount = testedItems.filter((i) => i.totalPercentage >= 85).length;

  return {
    categoryLabel: label,
    totalStrength,
    testedCount,
    medicalCount,
    untestedCount,
    avgExercisesPercentage,
    avgSuburbPercentage,
    avgTotalPercentage,
    passCount,
    passRate,
    excellentCount,
  };
}

export function calculateUnitPeriodSummary(
  evaluated: EvaluatedAssessment[],
  settings: ScoringSettings = DEFAULT_SCORING_SETTINGS
): UnitPeriodSummary {
  const officersList = evaluated.filter((i) => i.person.category === 'officers');
  const otherRanksList = evaluated.filter((i) => i.person.category === 'other_ranks');

  return {
    officers: calculateCategorySummary('الضباط', officersList, settings.passThreshold),
    otherRanks: calculateCategorySummary(
      'الدرجات الأخرى',
      otherRanksList,
      settings.passThreshold
    ),
    overall: calculateCategorySummary(
      'إجمالي الوحدة',
      evaluated,
      settings.passThreshold
    ),
  };
}

export function comparePeriods(
  currentEvaluated: EvaluatedAssessment[],
  previousEvaluated: EvaluatedAssessment[]
): PeriodComparisonItem[] {
  const prevMap = new Map<string, EvaluatedAssessment>();
  for (const item of previousEvaluated) {
    prevMap.set(item.person.id, item);
  }

  return currentEvaluated.map((curr) => {
    const prev = prevMap.get(curr.person.id) || null;
    if (!prev || !curr.isTested || !prev.isTested) {
      return {
        person: curr.person,
        current: curr,
        previous: prev,
        percentageDelta: null,
        exercisesDelta: null,
        suburbDelta: null,
        rankDelta: null,
        trend: 'new',
      };
    }

    const percentageDelta =
      Math.round((curr.totalPercentage - prev.totalPercentage) * 10) / 10;
    const exercisesDelta =
      Math.round((curr.exercisesPercentage - prev.exercisesPercentage) * 10) / 10;
    const suburbDelta = Math.round((curr.suburbScore - prev.suburbScore) * 10) / 10;

    let rankDelta: number | null = null;
    if (curr.overallRank !== null && prev.overallRank !== null) {
      // Lower rank number is better (#1 is better than #5), so prevRank - currRank > 0 means improved
      rankDelta = prev.overallRank - curr.overallRank;
    }

    let trend: 'improved' | 'declined' | 'stable' = 'stable';
    if (percentageDelta > 0.5) trend = 'improved';
    else if (percentageDelta < -0.5) trend = 'declined';

    return {
      person: curr.person,
      current: curr,
      previous: prev,
      percentageDelta,
      exercisesDelta,
      suburbDelta,
      rankDelta,
      trend,
    };
  });
}

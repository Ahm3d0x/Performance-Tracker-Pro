import { EvaluatedAssessment, PeriodComparisonItem } from './scoring';

export type ColumnCategory =
  | 'basic'
  | 'exercises'
  | 'suburb'
  | 'totals'
  | 'comparison'
  | 'skills';

export interface ColumnDefinition {
  id: string;
  label: string;
  shortLabel?: string;
  category: ColumnCategory;
  categoryLabel: string;
  defaultVisible: boolean;
  align?: 'right' | 'center' | 'left';
  minWidth?: string;
  renderText?: (item: EvaluatedAssessment, comp?: PeriodComparisonItem) => string;
}

export const ALL_COLUMNS: ColumnDefinition[] = [
  // --- البيانات الأساسية ---
  {
    id: 'overallRank',
    label: 'الترتيب العام',
    shortLabel: 'الترتيب',
    category: 'basic',
    categoryLabel: 'البيانات الأساسية',
    defaultVisible: true,
    align: 'center',
    renderText: (item) => (item.overallRank ? `#${item.overallRank}` : '-'),
  },
  {
    id: 'categoryRank',
    label: 'ترتيب الفئة (ضباط / درجات)',
    shortLabel: 'ترتيب الفئة',
    category: 'basic',
    categoryLabel: 'البيانات الأساسية',
    defaultVisible: true,
    align: 'center',
    renderText: (item) => (item.categoryRank ? `#${item.categoryRank}` : '-'),
  },
  {
    id: 'serialNum',
    label: 'مسلسل (م)',
    shortLabel: 'م',
    category: 'basic',
    categoryLabel: 'البيانات الأساسية',
    defaultVisible: true,
    align: 'center',
    renderText: (item) => String(item.person.serialNum),
  },
  {
    id: 'militaryId',
    label: 'الرقم العسكري',
    shortLabel: 'رقم عسكري',
    category: 'basic',
    categoryLabel: 'البيانات الأساسية',
    defaultVisible: false,
    align: 'center',
    renderText: (item) => item.person.militaryId || '-',
  },
  {
    id: 'rank',
    label: 'الرتبة / الدرجة',
    shortLabel: 'الرتبة',
    category: 'basic',
    categoryLabel: 'البيانات الأساسية',
    defaultVisible: true,
    align: 'right',
    renderText: (item) => item.person.rank,
  },
  {
    id: 'name',
    label: 'الاسم بالكامل',
    shortLabel: 'الاسم',
    category: 'basic',
    categoryLabel: 'البيانات الأساسية',
    defaultVisible: true,
    align: 'right',
    renderText: (item) => item.person.name,
  },
  {
    id: 'corps',
    label: 'السلاح / التخصص',
    shortLabel: 'السلاح',
    category: 'basic',
    categoryLabel: 'البيانات الأساسية',
    defaultVisible: false,
    align: 'center',
    renderText: (item) => item.person.corps || '-',
  },
  {
    id: 'age',
    label: 'السن',
    shortLabel: 'السن',
    category: 'basic',
    categoryLabel: 'البيانات الأساسية',
    defaultVisible: true,
    align: 'center',
    renderText: (item) => String(item.person.age),
  },
  {
    id: 'stage',
    label: 'المرحلة السنية',
    shortLabel: 'المرحلة',
    category: 'basic',
    categoryLabel: 'البيانات الأساسية',
    defaultVisible: true,
    align: 'center',
    renderText: (item) => item.stage.name,
  },
  {
    id: 'weightHeight',
    label: 'الوزن والطول',
    shortLabel: 'الوزن/الطول',
    category: 'basic',
    categoryLabel: 'البيانات الأساسية',
    defaultVisible: false,
    align: 'center',
    renderText: (item) =>
      item.person.weight && item.person.height
        ? `${item.person.weight} كجم / ${item.person.height} سم`
        : '-',
  },
  {
    id: 'bmi',
    label: 'مؤشر الكتلة BMI وحالة الوزن',
    shortLabel: 'BMI',
    category: 'basic',
    categoryLabel: 'البيانات الأساسية',
    defaultVisible: false,
    align: 'center',
    renderText: (item) =>
      item.bmi !== null ? `${item.bmi} (${item.bmiStatus})` : '-',
  },

  // --- التمرينات الأساسية ---
  {
    id: 'pullups',
    label: 'تمرين العقلة (العدد والدرجة)',
    shortLabel: 'عقلة',
    category: 'exercises',
    categoryLabel: 'التمرينات الأساسية',
    defaultVisible: true,
    align: 'center',
    renderText: (item) => `${item.input.pullupsCount} (${item.pullupsScore}%)`,
  },
  {
    id: 'pushups',
    label: 'تمرين الضغط (العدد والدرجة)',
    shortLabel: 'ضغط',
    category: 'exercises',
    categoryLabel: 'التمرينات الأساسية',
    defaultVisible: true,
    align: 'center',
    renderText: (item) => `${item.input.pushupsCount} (${item.pushupsScore}%)`,
  },
  {
    id: 'situps',
    label: 'تمرين البطن (العدد والدرجة)',
    shortLabel: 'بطن',
    category: 'exercises',
    categoryLabel: 'التمرينات الأساسية',
    defaultVisible: true,
    align: 'center',
    renderText: (item) => `${item.input.situpsCount} (${item.situpsScore}%)`,
  },
  {
    id: 'run',
    label: 'الجري المعدل (العدد والدرجة)',
    shortLabel: 'جري معدل',
    category: 'exercises',
    categoryLabel: 'التمرينات الأساسية',
    defaultVisible: true,
    align: 'center',
    renderText: (item) => `${item.input.runCount} (${item.runScore}%)`,
  },
  {
    id: 'exercisesPercentage',
    label: 'نسبة التمرينات %',
    shortLabel: 'نسبة التمرينات',
    category: 'exercises',
    categoryLabel: 'التمرينات الأساسية',
    defaultVisible: true,
    align: 'center',
    renderText: (item) => `${item.exercisesPercentage}%`,
  },
  {
    id: 'exercisesGrade',
    label: 'تقدير التمرينات',
    shortLabel: 'تقدير التمرينات',
    category: 'exercises',
    categoryLabel: 'التمرينات الأساسية',
    defaultVisible: false,
    align: 'center',
    renderText: (item) => item.exercisesGrade,
  },

  // --- اختبار الضاحية ---
  {
    id: 'suburbLabel',
    label: 'زمن الضاحية',
    shortLabel: 'زمن الضاحية',
    category: 'suburb',
    categoryLabel: 'اختبار الضاحية',
    defaultVisible: false,
    align: 'center',
    renderText: (item) => item.suburbLabel,
  },
  {
    id: 'suburbScore',
    label: 'نتيجة الضاحية %',
    shortLabel: 'الضاحية',
    category: 'suburb',
    categoryLabel: 'اختبار الضاحية',
    defaultVisible: true,
    align: 'center',
    renderText: (item) => `${item.suburbScore}% (${item.suburbLabel})`,
  },
  {
    id: 'suburbGrade',
    label: 'تقدير الضاحية',
    shortLabel: 'تقدير الضاحية',
    category: 'suburb',
    categoryLabel: 'اختبار الضاحية',
    defaultVisible: false,
    align: 'center',
    renderText: (item) => item.suburbGrade,
  },

  // --- النتيجة العامة والتقييم ---
  {
    id: 'totalPercentage',
    label: 'الإجمالي العام %',
    shortLabel: 'الإجمالي العام',
    category: 'totals',
    categoryLabel: 'النتيجة الإجمالية',
    defaultVisible: true,
    align: 'center',
    renderText: (item) => `${item.totalPercentage}%`,
  },
  {
    id: 'totalGrade',
    label: 'التقدير العام',
    shortLabel: 'التقدير',
    category: 'totals',
    categoryLabel: 'النتيجة الإجمالية',
    defaultVisible: true,
    align: 'center',
    renderText: (item) => item.totalGrade,
  },
  {
    id: 'attendance',
    label: 'الموقف / التمام',
    shortLabel: 'الموقف',
    category: 'totals',
    categoryLabel: 'النتيجة الإجمالية',
    defaultVisible: false,
    align: 'center',
    renderText: (item) =>
      item.isMedical ? 'موقف طبى' : item.isTested ? 'مختبر' : 'لم يختبر',
  },
  {
    id: 'notes',
    label: 'ملاحظات',
    shortLabel: 'ملاحظات',
    category: 'totals',
    categoryLabel: 'النتيجة الإجمالية',
    defaultVisible: false,
    align: 'right',
    renderText: (item) =>
      [item.input.exercisesNotes, item.input.suburbNotes].filter(Boolean).join(' - ') || '-',
  },

  // --- تطور المستوى والمقارنة ---
  {
    id: 'prevPercentage',
    label: 'النسبة السابقة %',
    shortLabel: 'السابق %',
    category: 'comparison',
    categoryLabel: 'المقارنة وتطور المستوى',
    defaultVisible: false,
    align: 'center',
    renderText: (_, comp) =>
      comp && comp.previous ? `${comp.previous.totalPercentage}%` : '-',
  },
  {
    id: 'percentageDelta',
    label: 'تطور المستوى (+/- %)',
    shortLabel: 'تطور المستوى',
    category: 'comparison',
    categoryLabel: 'المقارنة وتطور المستوى',
    defaultVisible: true,
    align: 'center',
    renderText: (_, comp) => {
      if (!comp || comp.percentageDelta === null) return '-';
      return comp.percentageDelta > 0
        ? `+${comp.percentageDelta}%`
        : `${comp.percentageDelta}%`;
    },
  },
  {
    id: 'prevRank',
    label: 'الترتيب السابق',
    shortLabel: 'الترتيب السابق',
    category: 'comparison',
    categoryLabel: 'المقارنة وتطور المستوى',
    defaultVisible: false,
    align: 'center',
    renderText: (_, comp) =>
      comp && comp.previous?.overallRank ? `#${comp.previous.overallRank}` : '-',
  },
  {
    id: 'rankDelta',
    label: 'تغير الترتيب (مراكز)',
    shortLabel: 'تغير الترتيب',
    category: 'comparison',
    categoryLabel: 'المقارنة وتطور المستوى',
    defaultVisible: false,
    align: 'center',
    renderText: (_, comp) => {
      if (!comp || comp.rankDelta === null) return '-';
      return comp.rankDelta > 0
        ? `+${comp.rankDelta} مراكز`
        : comp.rankDelta < 0
        ? `${comp.rankDelta} مراكز`
        : 'ثابت';
    },
  },
  {
    id: 'trend',
    label: 'حالة التطور',
    shortLabel: 'حالة المستوى',
    category: 'comparison',
    categoryLabel: 'المقارنة وتطور المستوى',
    defaultVisible: false,
    align: 'center',
    renderText: (_, comp) => {
      if (!comp) return '-';
      if (comp.trend === 'improved') return 'تحسن';
      if (comp.trend === 'declined') return 'تراجع';
      if (comp.trend === 'stable') return 'ثبات';
      return 'جديد';
    },
  },

  // --- المهارات العسكرية التفصيلية ---
  {
    id: 'obstacle',
    label: 'اجتياز الموانع (د:ث)',
    shortLabel: 'الموانع',
    category: 'skills',
    categoryLabel: 'المهارات العسكرية',
    defaultVisible: false,
    align: 'center',
    renderText: (item) =>
      item.input.obstacleMin !== null
        ? `${item.input.obstacleMin}:${String(item.input.obstacleSec || 0).padStart(2, '0')}`
        : '-',
  },
  {
    id: 'march',
    label: 'طابور السير (س:ق)',
    shortLabel: 'طابور السير',
    category: 'skills',
    categoryLabel: 'المهارات العسكرية',
    defaultVisible: false,
    align: 'center',
    renderText: (item) =>
      item.input.marchHours !== null
        ? `${item.input.marchHours}:${String(item.input.marchMin || 0).padStart(2, '0')}`
        : '-',
  },
  {
    id: 'sprint100m',
    label: 'عدو 100م (ثانية)',
    shortLabel: '100م',
    category: 'skills',
    categoryLabel: 'المهارات العسكرية',
    defaultVisible: false,
    align: 'center',
    renderText: (item) => (item.input.sprint100m !== null ? `${item.input.sprint100m} ث` : '-'),
  },
  {
    id: 'colleagueCarry',
    label: 'حمل الزميل (ثانية)',
    shortLabel: 'حمل الزميل',
    category: 'skills',
    categoryLabel: 'المهارات العسكرية',
    defaultVisible: false,
    align: 'center',
    renderText: (item) => (item.input.colleagueCarry !== null ? `${item.input.colleagueCarry} ث` : '-'),
  },
  {
    id: 'zigzagRun',
    label: 'الجري الزجزاجي (ثانية)',
    shortLabel: 'الزجزاج',
    category: 'skills',
    categoryLabel: 'المهارات العسكرية',
    defaultVisible: false,
    align: 'center',
    renderText: (item) => (item.input.zigzagRun !== null ? `${item.input.zigzagRun} ث` : '-'),
  },
  {
    id: 'longJump',
    label: 'الوثب العريض (متر)',
    shortLabel: 'الوثب',
    category: 'skills',
    categoryLabel: 'المهارات العسكرية',
    defaultVisible: false,
    align: 'center',
    renderText: (item) => (item.input.longJump !== null ? `${item.input.longJump} م` : '-'),
  },
  {
    id: 'grenadeThrow',
    label: 'قذف القنابل (متر)',
    shortLabel: 'القنابل',
    category: 'skills',
    categoryLabel: 'المهارات العسكرية',
    defaultVisible: false,
    align: 'center',
    renderText: (item) => (item.input.grenadeThrow !== null ? `${item.input.grenadeThrow} م` : '-'),
  },
];

export const COLUMN_CATEGORIES: { id: ColumnCategory; label: string }[] = [
  { id: 'basic', label: 'البيانات الأساسية والهوية' },
  { id: 'exercises', label: 'التمرينات الأساسية' },
  { id: 'suburb', label: 'اختبار الضاحية' },
  { id: 'totals', label: 'النتيجة الإجمالية والتقديرات' },
  { id: 'comparison', label: 'المقارنة وتطور المستوى' },
  { id: 'skills', label: 'المهارات العسكرية الميدانية' },
];

export const DEFAULT_VISIBLE_COLUMNS: string[] = ALL_COLUMNS.filter(
  (c) => c.defaultVisible
).map((c) => c.id);

export const PRESET_OFFICIAL_STANDARD = [
  'overallRank',
  'categoryRank',
  'serialNum',
  'rank',
  'name',
  'age',
  'stage',
  'pullups',
  'pushups',
  'situps',
  'run',
  'exercisesPercentage',
  'suburbScore',
  'totalPercentage',
  'totalGrade',
  'percentageDelta',
];

export const PRESET_BRIEF = [
  'overallRank',
  'serialNum',
  'rank',
  'name',
  'exercisesPercentage',
  'suburbScore',
  'totalPercentage',
  'totalGrade',
];

export const PRESET_PHYSICAL_ONLY = [
  'overallRank',
  'serialNum',
  'rank',
  'name',
  'age',
  'stage',
  'pullups',
  'pushups',
  'situps',
  'run',
  'exercisesPercentage',
  'suburbLabel',
  'suburbScore',
  'totalPercentage',
  'totalGrade',
];

export const PRESET_FULL_DOSSIER = ALL_COLUMNS.map((c) => c.id);

export const PRESET_COMPARISON_FOCUS = [
  'overallRank',
  'serialNum',
  'rank',
  'name',
  'corps',
  'prevPercentage',
  'totalPercentage',
  'percentageDelta',
  'prevRank',
  'rankDelta',
  'trend',
  'totalGrade',
];

export const PRESET_SKILLS_FOCUS = [
  'serialNum',
  'rank',
  'name',
  'corps',
  'obstacle',
  'march',
  'sprint100m',
  'colleagueCarry',
  'zigzagRun',
  'longJump',
  'grenadeThrow',
  'totalPercentage',
];

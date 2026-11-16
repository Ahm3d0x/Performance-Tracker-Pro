import {
  PersonRecord,
  AssessmentInput,
  resolveStageForAge,
  DEFAULT_SCORING_SETTINGS,
} from '../utils/scoring';

export interface PeriodRecord {
  id: string;
  name: string;
  date: string;
  beneficiary: string;
  unitName: string;
  notes: string;
}

export const INITIAL_PERIODS: PeriodRecord[] = [
  {
    id: 'period-2025-nov',
    name: 'الاختبار الدوري السابق - نوفمبر 2025',
    date: '2025-11-10',
    beneficiary: 'هيئة تدريب القوات المسلحة',
    unitName: 'اللواء الأول المشاة الميكانيكي',
    notes: 'الاختبار الدوري للربع الرابع لعام 2025',
  },
  {
    id: 'period-2026-feb',
    name: 'الاختبار الرسمي - 3 فبراير 2026',
    date: '2026-02-03',
    beneficiary: 'فرع التربية الرياضية - هيئة التدريب',
    unitName: 'اللواء الأول المشاة الميكانيكي',
    notes: 'البيانات التفصيلية للتربية البدنية - كشف فبراير 2026',
  },
  {
    id: 'period-2026-may',
    name: 'اختبار المتابعة والترتيب العام - مايو 2026',
    date: '2026-05-15',
    beneficiary: 'هيئة تدريب القوات المسلحة',
    unitName: 'اللواء الأول المشاة الميكانيكي',
    notes: 'اختبار قياس تطور المستوى البدني ومقارنة الفترات',
  },
];

// All 58 real personnel from the attached Ministry of Defense sheet
export const INITIAL_PERSONNEL: PersonRecord[] = [
  { id: 'p-1', serialNum: 1, militaryId: '41001', corps: 'مشاة', rank: 'عميد أح', category: 'officers', forceType: 'combat', name: 'عمرو حسن عبدالمجيد إبراهيم', age: 51, weight: 87, height: 181 },
  { id: 'p-2', serialNum: 2, militaryId: '41002', corps: 'مدرعات', rank: 'عميد أح', category: 'officers', forceType: 'combat', name: 'حاتم أبودهب تمام محمد', age: 50, weight: 87, height: 186 },
  { id: 'p-3', serialNum: 3, militaryId: '41003', corps: 'مدفعية', rank: 'عميد أح', category: 'officers', forceType: 'combat', name: 'مصطفى عباس ندا البقرى', age: 50, weight: 88, height: 185 },
  { id: 'p-4', serialNum: 4, militaryId: '41004', corps: 'مشاة', rank: 'عميد أح', category: 'officers', forceType: 'combat', name: 'احمد فتحى شفيق النجار', age: 50, weight: 81, height: 175 },
  { id: 'p-5', serialNum: 5, militaryId: '41005', corps: 'إشارة', rank: 'عميد أح', category: 'officers', forceType: 'support', name: 'رامى حلمى عبدالرحمن ابوزيد', age: 49, weight: 82, height: 177 },
  { id: 'p-6', serialNum: 6, militaryId: '41006', corps: 'مهندسين', rank: 'عميد', category: 'officers', forceType: 'combat', name: 'عاطف عبدالفتاح السيد العطار', age: 48, weight: 93, height: 183 },
  { id: 'p-7', serialNum: 7, militaryId: '41007', corps: 'مشاة', rank: 'عميد أح', category: 'officers', forceType: 'combat', name: 'احمد على سليمان محمد', age: 48, weight: 88, height: 181 },
  { id: 'p-8', serialNum: 8, militaryId: '41008', corps: 'دفاع جوي', rank: 'عميد أح', category: 'officers', forceType: 'combat', name: 'على السيد حسن عمران', age: 48, weight: 95, height: 195 },
  { id: 'p-9', serialNum: 9, militaryId: '41009', corps: 'مركبات', rank: 'عميد', category: 'officers', forceType: 'support', name: 'محمد سعد حسين عبدالحق', age: 47, weight: 96, height: 189 },
  { id: 'p-10', serialNum: 10, militaryId: '41010', corps: 'مشاة', rank: 'عميد أح', category: 'officers', forceType: 'combat', name: 'عمرو حسين على احمد', age: 47, weight: 85, height: 178 },
  { id: 'p-11', serialNum: 11, militaryId: '41011', corps: 'مدرعات', rank: 'عميد أح', category: 'officers', forceType: 'combat', name: 'طارق احمد عبدالرحيم', age: 49, weight: 87, height: 180 },
  { id: 'p-12', serialNum: 12, militaryId: '41012', corps: 'مدفعية', rank: 'عميد أح', category: 'officers', forceType: 'combat', name: 'عصام حسين السباعى عبدالعال', age: 47, weight: 82, height: 176 },
  { id: 'p-13', serialNum: 13, militaryId: '41013', corps: 'مشاة', rank: 'عميد أح', category: 'officers', forceType: 'combat', name: 'محمود احمد محمود احمد قدح', age: 48, weight: 80, height: 179 },
  { id: 'p-14', serialNum: 14, militaryId: '41014', corps: 'قوات جوية', rank: 'عقيد جوى', category: 'officers', forceType: 'combat', name: 'الباشا ثروت عبدالبديع عطيه', age: 46, weight: 77, height: 174 },
  { id: 'p-15', serialNum: 15, militaryId: '41015', corps: 'مشاة', rank: 'عقيد أح', category: 'officers', forceType: 'combat', name: 'عبدالله محمود محمد رشدى المعداوى', age: 46, weight: 82, height: 177 },
  { id: 'p-16', serialNum: 16, militaryId: '41016', corps: 'مدرعات', rank: 'عقيد أح', category: 'officers', forceType: 'combat', name: 'عمرو ديب على ديب', age: 45, weight: 93, height: 191 },
  { id: 'p-17', serialNum: 17, militaryId: '41017', corps: 'إمداد وتموين', rank: 'عقيد', category: 'officers', forceType: 'support', name: 'عبدالحميد محمود محمد نصير', age: 45, weight: 79, height: 184 },
  { id: 'p-18', serialNum: 18, militaryId: '41018', corps: 'مشاة', rank: 'عقيد', category: 'officers', forceType: 'combat', name: 'احمد محمد عبدالقادر على', age: 45, weight: 95, height: 189 },
  { id: 'p-19', serialNum: 19, militaryId: '41019', corps: 'مدفعية', rank: 'عقيد أح', category: 'officers', forceType: 'combat', name: 'محمد أبو بكر إبراهيم هلال يوسف', age: 42, weight: 89, height: 181 },
  { id: 'p-20', serialNum: 20, militaryId: '41020', corps: 'حرب إلكترونية', rank: 'عقيد', category: 'officers', forceType: 'support', name: 'احمد فخرى محمود احمد بكر', age: 44, weight: 81, height: 180 },
  { id: 'p-21', serialNum: 21, militaryId: '41021', corps: 'مشاة', rank: 'عقيد أح', category: 'officers', forceType: 'combat', name: 'محمد عزت محمد عطيه', age: 44, weight: 85, height: 185 },
  { id: 'p-22', serialNum: 22, militaryId: '41022', corps: 'مدرعات', rank: 'عقيد أح', category: 'officers', forceType: 'combat', name: 'محمد مصطفى عبدالباقى بيومى', age: 44, weight: 83, height: 180 },
  { id: 'p-23', serialNum: 23, militaryId: '41023', corps: 'مشاة', rank: 'عقيد أح', category: 'officers', forceType: 'combat', name: 'محمد سعد عبدالهادى رزوقة', age: 44, weight: 84, height: 182 },
  { id: 'p-24', serialNum: 24, militaryId: '41024', corps: 'مدفعية', rank: 'عقيد أح', category: 'officers', forceType: 'combat', name: 'فكرى حمدى فكرى عجيز', age: 44, weight: 85, height: 176 },
  { id: 'p-25', serialNum: 25, militaryId: '41025', corps: 'مهندسين', rank: 'عقيد أح', category: 'officers', forceType: 'combat', name: 'حسن محمد سعيد محمد احمد', age: 44, weight: 94, height: 192 },
  { id: 'p-26', serialNum: 26, militaryId: '41026', corps: 'إشارة', rank: 'عقيد', category: 'officers', forceType: 'support', name: 'محمد بدرى عبدالحميد حسين', age: 44, weight: 92, height: 188 },
  { id: 'p-27', serialNum: 27, militaryId: '41027', corps: 'مشاة', rank: 'عقيد', category: 'officers', forceType: 'combat', name: 'محمد حاتم عبدالوهاب سليمه', age: 44, weight: 76, height: 173 },
  { id: 'p-28', serialNum: 28, militaryId: '41028', corps: 'مدرعات', rank: 'عقيد', category: 'officers', forceType: 'combat', name: 'احمد على محمد عطيه', age: 44, weight: 92, height: 185 },
  { id: 'p-29', serialNum: 29, militaryId: '41029', corps: 'أسلحة وذخيرة', rank: 'عقيد', category: 'officers', forceType: 'support', name: 'احمد عبدالبديع احمد التراس', age: 43, weight: 75, height: 178 },
  { id: 'p-30', serialNum: 30, militaryId: '41030', corps: 'مشاة', rank: 'عقيد أح', category: 'officers', forceType: 'combat', name: 'وليد ابوالفتوح محمد جوهر', age: 45, weight: 71, height: 175 },
  { id: 'p-31', serialNum: 31, militaryId: '41031', corps: 'مدفعية', rank: 'عقيد أح', category: 'officers', forceType: 'combat', name: 'عمرو احمد فؤاد على البحيرى', age: 44, weight: 84, height: 179 },
  { id: 'p-32', serialNum: 32, militaryId: '41032', corps: 'مشاة', rank: 'مقدم أح', category: 'officers', forceType: 'combat', name: 'محمد السيد عبدالحى محمد محمد', age: 42, weight: 86, height: 181 },
  { id: 'p-33', serialNum: 33, militaryId: '41033', corps: 'مدرعات', rank: 'مقدم أح', category: 'officers', forceType: 'combat', name: 'مصطفى صبرى عبدالحميد بدوى', age: 42, weight: 86, height: 179 },
  { id: 'p-34', serialNum: 34, militaryId: '41034', corps: 'استطلاع', rank: 'مقدم', category: 'officers', forceType: 'combat', name: 'محمد الصادق عبدالمطلب الديهى', age: 42, weight: 82, height: 184 },
  { id: 'p-35', serialNum: 35, militaryId: '41035', corps: 'مشاة', rank: 'مقدم أح', category: 'officers', forceType: 'combat', name: 'وليد محمد صلاح إسماعيل', age: 41, weight: 88, height: 182 },
  { id: 'p-36', serialNum: 36, militaryId: '41036', corps: 'مدفعية', rank: 'مقدم', category: 'officers', forceType: 'combat', name: 'محمد نشات على على توتو', age: 41, weight: 99, height: 189 },
  { id: 'p-37', serialNum: 37, militaryId: '41037', corps: 'مشاة', rank: 'مقدم', category: 'officers', forceType: 'combat', name: 'احمد بدر عبدالله محمد عفيفى الشيخ', age: 37, weight: 81, height: 180 },
  { id: 'p-38', serialNum: 38, militaryId: '41038', corps: 'مهندسين', rank: 'مقدم', category: 'officers', forceType: 'combat', name: 'احمد حلمى احمد احمد', age: 37, weight: 88, height: 183 },
  { id: 'p-39', serialNum: 39, militaryId: '41039', corps: 'إشارة', rank: 'مقدم', category: 'officers', forceType: 'support', name: 'محمد إبراهيم محمد عبدالله', age: 37, weight: 80, height: 177 },
  { id: 'p-40', serialNum: 40, militaryId: '41040', corps: 'مدرعات', rank: 'مقدم', category: 'officers', forceType: 'combat', name: 'طه محمد طه ابونعمه ندرين', age: 37, weight: 95, height: 191 },
  { id: 'p-41', serialNum: 41, militaryId: '41041', corps: 'قوات بحرية', rank: 'رائد بحرى', category: 'officers', forceType: 'combat', name: 'احمد محمد رضا محمد شمس الدين', age: 33, weight: 71, height: 176 },
  { id: 'p-42', serialNum: 42, militaryId: '41042', corps: 'فني', rank: 'رائد فنى', category: 'officers', forceType: 'support', name: 'اسلام عبدالغفار عبدالسيد عبداللطيف', age: 33, weight: 73, height: 175 },
  { id: 'p-43', serialNum: 43, militaryId: '41043', corps: 'مشاة', rank: 'رائد', category: 'officers', forceType: 'combat', name: 'احمد حسين محمد عبدالخالق', age: 33, weight: 82, height: 184 },
  { id: 'p-44', serialNum: 44, militaryId: '82044', corps: 'مشاة', rank: 'مساعد', category: 'other_ranks', forceType: 'combat', name: 'ابراهيم جمال عدلي', age: 41, weight: 89, height: 184 },
  { id: 'p-45', serialNum: 45, militaryId: '82045', corps: 'مدرعات', rank: 'مساعد', category: 'other_ranks', forceType: 'combat', name: 'محمد ماهر ابراهيم', age: 37, weight: 82, height: 178 },
  { id: 'p-46', serialNum: 46, militaryId: '82046', corps: 'مدفعية', rank: 'مساعد', category: 'other_ranks', forceType: 'combat', name: 'احمد سامى محمد', age: 38, weight: 84, height: 179 },
  { id: 'p-47', serialNum: 47, militaryId: '82047', corps: 'مشاة', rank: 'رقيب أول', category: 'other_ranks', forceType: 'combat', name: 'محمد عيد محمد حسن', age: 30, weight: 75, height: 176 },
  { id: 'p-48', serialNum: 48, militaryId: '82048', corps: 'إشارة', rank: 'رقيب أول', category: 'other_ranks', forceType: 'support', name: 'اشرف مجدى شعبان', age: 33, weight: 76, height: 175 },
  { id: 'p-49', serialNum: 49, militaryId: '82049', corps: 'مهندسين', rank: 'رقيب أول', category: 'other_ranks', forceType: 'combat', name: 'محمود بدر عبد السميع', age: 33, weight: 78, height: 177 },
  { id: 'p-50', serialNum: 50, militaryId: '82050', corps: 'مشاة', rank: 'رقيب أول', category: 'other_ranks', forceType: 'combat', name: 'محمد شعبان أحمد', age: 30, weight: 74, height: 175 },
  { id: 'p-51', serialNum: 51, militaryId: '82051', corps: 'مركبات', rank: 'رقيب أول', category: 'other_ranks', forceType: 'support', name: 'اسلام يحى على', age: 35, weight: 80, height: 178 },
  { id: 'p-52', serialNum: 52, militaryId: '82052', corps: 'مشاة', rank: 'رقيب أول', category: 'other_ranks', forceType: 'combat', name: 'مصطفى محمود السيد', age: 32, weight: 79, height: 177 },
  { id: 'p-53', serialNum: 53, militaryId: '82053', corps: 'صاعقة', rank: 'رقيب أول', category: 'other_ranks', forceType: 'combat', name: 'محمد محمود عبد الحميد', age: 31, weight: 71, height: 170 },
  { id: 'p-54', serialNum: 54, militaryId: '82054', corps: 'مدرعات', rank: 'رقيب أول', category: 'other_ranks', forceType: 'combat', name: 'اسامة السيد قنديل', age: 31, weight: 77, height: 176 },
  { id: 'p-55', serialNum: 55, militaryId: '82055', corps: 'مشاة', rank: 'رقيب', category: 'other_ranks', forceType: 'combat', name: 'محمد ناجى ابراهيم', age: 27, weight: 81, height: 181 },
  { id: 'p-56', serialNum: 56, militaryId: '82056', corps: 'إمداد وتموين', rank: 'مساعد', category: 'other_ranks', forceType: 'support', name: 'محمود أحمد محى', age: 33, weight: 87, height: 180 },
  { id: 'p-57', serialNum: 57, militaryId: '82057', corps: 'مدفعية', rank: 'مساعد أ', category: 'other_ranks', forceType: 'combat', name: 'سامح فاروق السيد', age: 36, weight: 90, height: 182 },
  { id: 'p-58', serialNum: 58, militaryId: '82058', corps: 'مشاة', rank: 'رقيب', category: 'other_ranks', forceType: 'combat', name: 'عمرو عبد البصير فتحى', age: 25, weight: 87, height: 175 },
];

// Deterministic realistic generator for the 3 assessment periods
export function generateSeedAssessments(): AssessmentInput[] {
  const results: AssessmentInput[] = [];

  for (const person of INITIAL_PERSONNEL) {
    const st = resolveStageForAge(person.age, DEFAULT_SCORING_SETTINGS);
    const seed = person.serialNum;

    // Period 1: Nov 2025
    const p1Ratio = 0.68 + ((seed * 7) % 28) / 100; // 68% .. 95%
    const p1SuburbCode = Math.max(1, Math.min(8, 1 + ((seed * 3) % 7)));

    results.push({
      periodId: 'period-2025-nov',
      personId: person.id,
      stageOverride: null,
      pullupsCount: Math.max(1, Math.round(st.pullupsMax * p1Ratio)),
      pushupsCount: Math.max(5, Math.round(st.pushupsMax * (p1Ratio + 0.03))),
      situpsCount: Math.max(8, Math.round(st.situpsMax * (p1Ratio + 0.02))),
      runCount: Math.max(8, Math.round(st.runMax * p1Ratio)),
      suburbTimeCode: seed === 17 ? 12 : p1SuburbCode,
      suburbMin: 21 + Math.floor(p1SuburbCode / 2),
      suburbSec: (p1SuburbCode % 2) * 30,
      obstacleMin: 2,
      obstacleSec: 15 + (seed % 35),
      marchHours: 2,
      marchMin: 20 + (seed % 25),
      sprint100m: 13.2 + (seed % 5) * 0.4,
      colleagueCarry: 18 + (seed % 7),
      zigzagRun: 14.5 + (seed % 6) * 0.3,
      longJump: 3.8 + (seed % 5) * 0.2,
      grenadeThrow: 35 + (seed % 12),
      attendanceStatus: seed === 17 ? 'medical' : 'tested',
      exercisesNotes: seed === 17 ? 'إعفاء طبي مؤقت' : 'أداء منتظم',
      suburbNotes: seed === 17 ? 'موقف طبى' : '',
    });

    // Period 2: Feb 2026 (Official Test Date from attached sheet)
    const delta2 = ((seed * 5) % 13) - 3; // mostly positive improvement
    const p2Ratio = Math.min(1, Math.max(0.55, p1Ratio + delta2 / 100));
    const p2SuburbCode = Math.max(
      1,
      Math.min(9, p1SuburbCode - (delta2 > 2 ? 1 : delta2 < -1 ? -1 : 0))
    );

    results.push({
      periodId: 'period-2026-feb',
      personId: person.id,
      stageOverride: null,
      pullupsCount: Math.max(1, Math.round(st.pullupsMax * p2Ratio)),
      pushupsCount: Math.max(6, Math.round(st.pushupsMax * (p2Ratio + 0.04))),
      situpsCount: Math.max(10, Math.round(st.situpsMax * (p2Ratio + 0.03))),
      runCount: Math.max(10, Math.round(st.runMax * (p2Ratio + 0.02))),
      suburbTimeCode: seed === 17 ? 12 : seed === 36 ? 11 : p2SuburbCode,
      suburbMin: 21 + Math.floor(p2SuburbCode / 2),
      suburbSec: (p2SuburbCode % 2) * 30,
      obstacleMin: 2,
      obstacleSec: 10 + (seed % 30),
      marchHours: 2,
      marchMin: 15 + (seed % 20),
      sprint100m: Number((12.9 + (seed % 5) * 0.35).toFixed(1)),
      colleagueCarry: 17 + (seed % 6),
      zigzagRun: Number((14.1 + (seed % 6) * 0.25).toFixed(1)),
      longJump: Number((4.0 + (seed % 5) * 0.2).toFixed(1)),
      grenadeThrow: 37 + (seed % 12),
      attendanceStatus: seed === 17 ? 'medical' : 'tested',
      exercisesNotes:
        p2Ratio >= 0.9 ? 'مستوى متميز' : seed === 17 ? 'موقف طبى' : 'لائق بدنيًا',
      suburbNotes:
        seed === 36 ? 'خارج الزمن المحدد' : seed === 17 ? 'موقف طبى' : 'ضمن الزمن القياسي',
    });

    // Period 3: May 2026
    const delta3 = ((seed * 11) % 11) - 2;
    const p3Ratio = Math.min(1, Math.max(0.6, p2Ratio + delta3 / 100));
    const p3SuburbCode = Math.max(
      1,
      Math.min(8, p2SuburbCode - (delta3 > 3 ? 1 : 0))
    );

    results.push({
      periodId: 'period-2026-may',
      personId: person.id,
      stageOverride: null,
      pullupsCount: Math.max(2, Math.round(st.pullupsMax * p3Ratio)),
      pushupsCount: Math.max(8, Math.round(st.pushupsMax * (p3Ratio + 0.04))),
      situpsCount: Math.max(12, Math.round(st.situpsMax * (p3Ratio + 0.04))),
      runCount: Math.max(12, Math.round(st.runMax * (p3Ratio + 0.03))),
      suburbTimeCode: seed === 17 ? 12 : p3SuburbCode,
      suburbMin: 21 + Math.floor(p3SuburbCode / 2),
      suburbSec: (p3SuburbCode % 2) * 30,
      obstacleMin: 2,
      obstacleSec: 8 + (seed % 28),
      marchHours: 2,
      marchMin: 12 + (seed % 18),
      sprint100m: Number((12.7 + (seed % 5) * 0.3).toFixed(1)),
      colleagueCarry: 16 + (seed % 6),
      zigzagRun: Number((13.8 + (seed % 6) * 0.25).toFixed(1)),
      longJump: Number((4.1 + (seed % 5) * 0.2).toFixed(1)),
      grenadeThrow: 38 + (seed % 12),
      attendanceStatus: seed === 17 ? 'medical' : 'tested',
      exercisesNotes: p3Ratio >= 0.92 ? 'تفوق بدني' : 'تطور ملحوظ',
      suburbNotes: seed === 17 ? 'موقف طبى' : 'اجتياز بنجاح',
    });
  }

  return results;
}

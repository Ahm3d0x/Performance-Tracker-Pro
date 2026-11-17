import * as XLSX from 'xlsx';
import {
  PersonRecord,
  AssessmentInput,
  PersonnelCategory,
  ForceType,
  AttendanceStatus,
} from './scoring';

export type TargetFieldKey =
  | 'serialNum'
  | 'militaryId'
  | 'rank'
  | 'name'
  | 'age'
  | 'corps'
  | 'category'
  | 'forceType'
  | 'weight'
  | 'height'
  | 'pullups'
  | 'pushups'
  | 'situps'
  | 'run'
  | 'suburbMin'
  | 'suburbSec'
  | 'suburbTimeCode'
  | 'obstacleMin'
  | 'obstacleSec'
  | 'marchHours'
  | 'marchMin'
  | 'sprint100m'
  | 'colleagueCarry'
  | 'zigzagRun'
  | 'longJump'
  | 'grenadeThrow'
  | 'attendanceStatus'
  | 'notes';

export interface TargetFieldDef {
  key: TargetFieldKey;
  label: string;
  category: 'personal' | 'fitness' | 'skills_attendance';
  required?: boolean;
  description: string;
  aliases: string[];
}

export const TARGET_FIELDS: TargetFieldDef[] = [
  // 1. Personal / Identity
  {
    key: 'serialNum',
    label: 'المسلسل (م)',
    category: 'personal',
    description: 'الرقم المسلسل للفرد في الكشف',
    aliases: ['م', 'مسلسل', 'المسلسل', 'الرقم', 'رقم', 'ت', 'no', 'num', 'sn', 'sr'],
  },
  {
    key: 'militaryId',
    label: 'الرقم العسكري',
    category: 'personal',
    description: 'الرقم العسكري أو رقم السلاح/الأقدمية',
    aliases: ['رقم عسكري', 'الرقم العسكري', 'رقم عسكرى', 'الرقم العسكرى', 'ر.ع', 'رقم السلاح', 'رقم الأقدمية', 'رقم الاقدمية', 'كود', 'المعرف', 'military id', 'mil id', 'id'],
  },
  {
    key: 'rank',
    label: 'الرتبة / الدرجة',
    category: 'personal',
    description: 'الرتبة العسكرية للضباط أو الدرجة لضباط الصف',
    aliases: ['رتبة', 'الرتبة', 'درجة', 'الدرجة', 'رتبة / درجة', 'درجة / رتبة', 'درجة/ رتبة', 'رتبة/درجة', 'rank', 'grade'],
  },
  {
    key: 'name',
    label: 'الاسم بالكامل',
    category: 'personal',
    required: true,
    description: 'اسم الفرد (مطلوب لإنشاء السجل)',
    aliases: ['اسم', 'الاسم', 'إسم', 'الإسم', 'اسم المشترك', 'اسم الضابط', 'اسم الفرد', 'المقاتل', 'الاسم ثلاثي', 'الاسم رباعي', 'الاسم واللقب', 'name', 'full name', 'officer name'],
  },
  {
    key: 'age',
    label: 'السن / العمر',
    category: 'personal',
    description: 'السن بالسنوات لتحديد المرحلة التدريبية',
    aliases: ['سن', 'السن', 'عمر', 'العمر', 'تاريخ الميلاد', 'age', 'years'],
  },
  {
    key: 'corps',
    label: 'السلاح / التخصص',
    category: 'personal',
    description: 'السلاح الرئيسي أو الوحدة الفرعية (مشاة، مدرعات، إشارة...)',
    aliases: ['سلاح', 'السلاح', 'تخصص', 'التخصص', 'الوحدة الفرعية', 'السرية', 'corps', 'specialty', 'unit'],
  },
  {
    key: 'category',
    label: 'الفئة (ضباط / درجات)',
    category: 'personal',
    description: 'تحديد الفئة صراحة (ضباط أو درجات أخرى)',
    aliases: ['فئة', 'الفئة', 'نوع الفرد', 'category', 'type'],
  },
  {
    key: 'weight',
    label: 'الوزن (كجم)',
    category: 'personal',
    description: 'وزن الجسم بالكيلوجرام',
    aliases: ['وزن', 'الوزن', 'weight', 'wt'],
  },
  {
    key: 'height',
    label: 'الطول (سم)',
    category: 'personal',
    description: 'طول القامة بالسنتيمتر',
    aliases: ['طول', 'الطول', 'height', 'ht'],
  },

  // 2. Fitness Scores
  {
    key: 'pullups',
    label: 'العقلة (تكرار)',
    category: 'fitness',
    description: 'عدد تكرارات تمرين العقلة',
    aliases: ['عقلة', 'العقلة', 'تمرين العقلة', 'عقلة - عدد', 'pullups', 'pull-up', 'pull ups', 'pulls'],
  },
  {
    key: 'pushups',
    label: 'الضغط (تكرار)',
    category: 'fitness',
    description: 'عدد تكرارات تمرين الضغط',
    aliases: ['ضغط', 'الضغط', 'تمرين الضغط', 'ضغط - عدد', 'pushups', 'push-up', 'push ups', 'push'],
  },
  {
    key: 'situps',
    label: 'البطن (تكرار)',
    category: 'fitness',
    description: 'عدد تكرارات تمرين البطن',
    aliases: ['بطن', 'البطن', 'تمرين البطن', 'بطن - عدد', 'situps', 'sit-up', 'sit ups', 'abs'],
  },
  {
    key: 'run',
    label: 'الجري المعدل / 100م',
    category: 'fitness',
    description: 'عدد تكرارات الجري المعدل أو عدو 100م',
    aliases: ['جري', 'الجرى', 'جرى معدل', 'الجرى المعدل', 'جري معدل', 'جرى معدل - عدد', 'run', 'sprint', 'running'],
  },
  {
    key: 'suburbMin',
    label: 'الضاحية (دقائق)',
    category: 'fitness',
    description: 'دقائق اختبار الضاحية (مثال: 21)',
    aliases: ['دقائق الضاحية', 'ق ضاحية', 'ضاحية - ق', 'زمن الضاحية ق', 'suburb min'],
  },
  {
    key: 'suburbSec',
    label: 'الضاحية (ثواني)',
    category: 'fitness',
    description: 'ثواني اختبار الضاحية (مثال: 30)',
    aliases: ['ثواني الضاحية', 'ث ضاحية', 'ضاحية - ث', 'suburb sec'],
  },
  {
    key: 'suburbTimeCode',
    label: 'كود / زمن الضاحية',
    category: 'fitness',
    description: 'كود الضاحية المباشر أو الزمن المركب (مثال: 21.30 ق أو كود 1..12)',
    aliases: ['ضاحية', 'الضاحية', 'زمن الضاحية', 'نتيجة الضاحية', 'كود الضاحية', 'تقدير الضاحية', 'suburb', 'suburb code'],
  },

  // 3. Military Skills & Attendance
  {
    key: 'obstacleMin',
    label: 'موانع (دقائق)',
    category: 'skills_attendance',
    description: 'دقائق اجتياز الموانع',
    aliases: ['موانع - ق', 'موانع ق', 'دقائق الموانع'],
  },
  {
    key: 'obstacleSec',
    label: 'موانع (ثواني)',
    category: 'skills_attendance',
    description: 'ثواني اجتياز الموانع',
    aliases: ['موانع', 'الموانع', 'موانع - ث', 'موانع ث', 'ثواني الموانع', 'obstacles'],
  },
  {
    key: 'marchHours',
    label: 'سير (ساعات)',
    category: 'skills_attendance',
    description: 'ساعات طابور السير',
    aliases: ['سير - س', 'سير س', 'ساعات السير'],
  },
  {
    key: 'marchMin',
    label: 'سير (دقائق)',
    category: 'skills_attendance',
    description: 'دقائق طابور السير',
    aliases: ['سير', 'السير', 'سير - ق', 'سير ق', 'دقائق السير', 'march'],
  },
  {
    key: 'sprint100m',
    label: 'عدو 100م (ثانية)',
    category: 'skills_attendance',
    description: 'زمن عدو 100م بالثواني',
    aliases: ['100م', 'عدو 100م', 'عدو', '100m sprint'],
  },
  {
    key: 'colleagueCarry',
    label: 'حمل زميل (ثانية)',
    category: 'skills_attendance',
    description: 'زمن حمل الزميل بالثواني',
    aliases: ['حمل زميل', 'حمل الزميل', 'colleague carry'],
  },
  {
    key: 'zigzagRun',
    label: 'جري زجزاجي (ثانية)',
    category: 'skills_attendance',
    description: 'زمن الجري الزجزاجي بالثواني',
    aliases: ['زجزاجي', 'الجري الزجزاجي', 'جرى زجزاجى', 'zigzag'],
  },
  {
    key: 'longJump',
    label: 'وثب عريض (متر)',
    category: 'skills_attendance',
    description: 'مسافة الوثب العريض بالأمتار',
    aliases: ['وثب', 'الوثب', 'الوثب العريض', 'long jump'],
  },
  {
    key: 'grenadeThrow',
    label: 'قذف قنابل (متر)',
    category: 'skills_attendance',
    description: 'مسافة قذف القنابل بالأمتار',
    aliases: ['قنابل', 'قذف القنابل', 'قذف قنبلة', 'grenade'],
  },
  {
    key: 'attendanceStatus',
    label: 'حالة التمام / الموقف',
    category: 'skills_attendance',
    description: 'حالة الفرد (حاضر، موقف طبي، لم يختبر، مأمورية...)',
    aliases: ['تمام', 'التمام', 'حالة التمام', 'الموقف', 'الموقف الطبي', 'حضور', 'status', 'attendance'],
  },
  {
    key: 'notes',
    label: 'ملاحظات',
    category: 'skills_attendance',
    description: 'أي ملاحظات إضافية على الفرد أو الاختبار',
    aliases: ['ملاحظات', 'الملاحظات', 'ملحوظة', 'ملاحظه', 'notes', 'remarks'],
  },
];

export type ImportPresetType = 'all' | 'personal_only' | 'fitness_only' | 'custom';

export interface ColumnOption {
  index: number;
  label: string;
  letter: string;
  sampleValues: string[];
}

export interface SheetInspection {
  sheetName: string;
  rowCount: number;
  colCount: number;
  detectedHeaderRow: number; // 0-based
  detectedDataStartRow: number; // 0-based
  headers: string[]; // Combined or raw headers
  columns: ColumnOption[];
  suggestedMapping: Record<TargetFieldKey, number | null>;
}

export interface WorkbookInspection {
  sheetNames: string[];
  activeSheetName: string;
  detectedFormat: 'monzoma_detailed' | 'dibaja_standard' | 'generic';
  unitName: string;
  periodDate: string;
  beneficiary: string;
  sheet: SheetInspection;
}

export interface ExcelImportResult {
  unitName: string;
  periodDate: string;
  periodName: string;
  beneficiary: string;
  detectedFormat: 'monzoma_detailed' | 'dibaja_standard' | 'generic';
  personnel: PersonRecord[];
  assessments: AssessmentInput[];
  warnings: string[];
  summary: {
    total: number;
    officers: number;
    otherRanks: number;
    withScores: number;
    untestedOrMedical: number;
  };
}

export interface CustomImportConfig {
  sheetName: string;
  headerRowIndex: number;
  dataStartRowIndex: number;
  fieldMapping: Record<TargetFieldKey, number | null>;
  activeFields: TargetFieldKey[];
  unitName?: string;
  periodDate?: string;
  periodName?: string;
  beneficiary?: string;
  isNewPeriod?: boolean;
}

export function cleanStr(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

/**
 * Normalizes Eastern Arabic (١٢٣) and Persian (۱۲۳) numerals to Latin (123)
 */
export function normalizeDigits(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val)
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48))
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48));
}

export function parseNum(val: any, fallback: number = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  const normalized = normalizeDigits(val);
  const cleaned = normalized.replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? fallback : n;
}

export function parseOptionalNum(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  const normalized = normalizeDigits(val);
  const cleaned = normalized.replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/**
 * Parses compound suburb times (e.g. 21.30, 21:30, 21.30 ق, موقف طبي, خارج الزمن, code 1..12)
 */
export function parseSuburbValue(val: any): { min: number | null; sec: number | null; code: number; isMedical: boolean; isUntested: boolean } {
  if (val === undefined || val === null || val === '') {
    return { min: null, sec: null, code: 0, isMedical: false, isUntested: true };
  }
  const str = normalizeDigits(cleanStr(val));

  if (str.includes('موقف طب') || str.includes('طبي') || str === '12') {
    return { min: null, sec: null, code: 12, isMedical: true, isUntested: false };
  }
  if (str.includes('خارج الزمن') || str === '11') {
    return { min: null, sec: null, code: 11, isMedical: false, isUntested: false };
  }
  if (str.includes('لم يختبر') || str === '0') {
    return { min: null, sec: null, code: 0, isMedical: false, isUntested: true };
  }

  const numericOnly = parseFloat(str.replace(/[^0-9.-]/g, ''));
  if (!isNaN(numericOnly)) {
    // If it's code 1..10
    if (Number.isInteger(numericOnly) && numericOnly >= 1 && numericOnly <= 10) {
      const minutes = 21 + Math.floor(numericOnly / 2);
      const seconds = (numericOnly % 2) * 30;
      return { min: minutes, sec: seconds, code: numericOnly, isMedical: false, isUntested: false };
    }

    // If it's a decimal like 21.30 or 22.00 or minutes like 21:30
    if (numericOnly >= 15 && numericOnly <= 45) {
      const parts = str.split(/[:.،]/);
      const minutes = parseInt(parts[0], 10) || 0;
      let seconds = parts[1] ? parseInt(parts[1].slice(0, 2), 10) : 0;
      if (seconds === 3) seconds = 30; // 21.3 -> 21:30

      const totalMin = minutes + seconds / 60;
      let code = 11;
      if (totalMin <= 21.5) code = 1;
      else if (totalMin <= 22.0) code = 2;
      else if (totalMin <= 22.5) code = 3;
      else if (totalMin <= 23.0) code = 4;
      else if (totalMin <= 23.5) code = 5;
      else if (totalMin <= 24.0) code = 6;
      else if (totalMin <= 24.5) code = 7;
      else if (totalMin <= 25.0) code = 8;
      else if (totalMin <= 25.5) code = 9;
      else if (totalMin <= 26.0) code = 10;
      else code = 11;

      return { min: minutes, sec: seconds, code, isMedical: false, isUntested: false };
    }
  }

  return { min: null, sec: null, code: 0, isMedical: false, isUntested: true };
}

export function colIndexToLetter(idx: number): string {
  let temp = idx;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function detectCategoryFromRank(rank: string): PersonnelCategory {
  const r = rank.trim();
  const otherRanks = [
    'مساعد أول',
    'مساعد اول',
    'مساعد',
    'رقيب أول',
    'رقيب اول',
    'رقيب',
    'عريف',
    'جندى',
    'جندي',
    'صانع دقيق',
    'صانع ماهر',
    'صانع ممتاز',
    'ملاحظ',
    'ملاحظ فنى',
    'ملاحظ فني',
  ];
  for (const ork of otherRanks) {
    if (r.includes(ork)) return 'other_ranks';
  }
  return 'officers';
}

export function detectForceType(corps: string): ForceType {
  const c = corps.trim();
  const supportCorps = [
    'إشارة',
    'اشارة',
    'مركبات',
    'إمداد وتموين',
    'امداد وتموين',
    'أسلحة وذخيرة',
    'اسلحة وذخيرة',
    'حرب إلكترونية',
    'حرب الكترونية',
    'شئون إدارية',
    'فني',
    'فنى',
    'طب عسكري',
    'موسيقات',
  ];
  for (const s of supportCorps) {
    if (c.includes(s)) return 'support';
  }
  return 'combat';
}

export function getPresetActiveFields(preset: ImportPresetType): TargetFieldKey[] {
  if (preset === 'all') {
    return TARGET_FIELDS.map((f) => f.key);
  }
  if (preset === 'personal_only') {
    return TARGET_FIELDS.filter((f) => f.category === 'personal').map((f) => f.key);
  }
  if (preset === 'fitness_only') {
    return [
      'name',
      'militaryId',
      'rank',
      'age',
      'pullups',
      'pushups',
      'situps',
      'run',
      'suburbMin',
      'suburbSec',
      'suburbTimeCode',
      'attendanceStatus',
      'notes',
    ];
  }
  return TARGET_FIELDS.map((f) => f.key);
}

/**
 * Smart automatic column mapper that associates target keys to column indices.
 */
export function autoMapHeaders(headers: string[]): Record<TargetFieldKey, number | null> {
  const mapping: Record<TargetFieldKey, number | null> = {} as any;
  const assignedCols = new Set<number>();

  // Pass 1: exact and strong alias matches for critical fields
  for (const field of TARGET_FIELDS) {
    mapping[field.key] = null;
    let bestMatchCol: number | null = null;
    let bestScore = -1;

    for (let c = 0; c < headers.length; c++) {
      if (assignedCols.has(c)) continue;
      const headerText = cleanStr(headers[c]).toLowerCase();
      if (!headerText) continue;

      for (const alias of field.aliases) {
        const a = alias.toLowerCase();
        if (headerText === a) {
          bestMatchCol = c;
          bestScore = 100;
          break;
        } else if (headerText.startsWith(a) || headerText.endsWith(a)) {
          if (bestScore < 80) {
            bestMatchCol = c;
            bestScore = 80;
          }
        } else if (headerText.includes(a)) {
          // Avoid matching "ضاحية" on "ضاحية ثواني" when we want minutes unless specified
          if (bestScore < 50) {
            bestMatchCol = c;
            bestScore = 50;
          }
        }
      }
      if (bestScore === 100) break;
    }

    if (bestMatchCol !== null && bestScore > 0) {
      mapping[field.key] = bestMatchCol;
      assignedCols.add(bestMatchCol);
    }
  }

  return mapping;
}

/**
 * Inspect an Excel workbook Buffer or ArrayBuffer, extract sheets and detect metadata.
 */
export function inspectExcelWorkbook(
  fileBuffer: ArrayBuffer | Uint8Array,
  targetSheetName?: string
): { wb: XLSX.WorkBook; inspection: WorkbookInspection } {
  const wb = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  const sheetNames = wb.SheetNames;

  // Determine active sheet
  let activeSheetName = targetSheetName;
  if (!activeSheetName || !sheetNames.includes(activeSheetName)) {
    activeSheetName =
      sheetNames.find(
        (n) =>
          n.includes('تسجيل') ||
          n.includes('نموذج') ||
          n.includes('البيانات') ||
          n.includes('تفصيلية') ||
          n.includes('كشف')
      ) || sheetNames[0];
  }

  const ws = wb.Sheets[activeSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // 1. Detect template format
  let isMonzoma = false;
  let isDibaja = false;

  for (let r = 0; r < Math.min(15, rows.length); r++) {
    const rowStr = (rows[r] || []).join(' ');
    if (rowStr.includes('رقم عسكرى') || rowStr.includes('البيانات التفصيلية للتربية البدنية')) {
      isMonzoma = true;
      break;
    }
    if (rowStr.includes('درجة/ رتبة') || rowStr.includes('نموذج للبرنامج') || rowStr.includes('مرحلة أولى')) {
      isDibaja = true;
      break;
    }
  }

  const detectedFormat: 'monzoma_detailed' | 'dibaja_standard' | 'generic' = isMonzoma
    ? 'monzoma_detailed'
    : isDibaja
    ? 'dibaja_standard'
    : 'generic';

  // 2. Extract Unit Metadata
  let unitName = 'اللواء الأول المشاة الميكانيكي';
  let periodDate = new Date().toISOString().slice(0, 10);
  let beneficiary = 'فرع التربية الرياضية - هيئة تدريب القوات المسلحة';

  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = cleanStr(row[c]);
      if (cell.includes('إسم الوحدة') || cell.includes('اسم الوحدة')) {
        const nextCell = cleanStr(row[c + 1]) || cleanStr(row[c + 2]);
        if (nextCell && nextCell !== '0') unitName = nextCell;
      }
      if (cell.includes('التاريخ')) {
        const c1 = cleanStr(row[c + 1]);
        const c2 = cleanStr(row[c + 2]);
        const c3 = cleanStr(row[c + 3]);
        if (c1 || c2 || c3) {
          periodDate = [c1, c2, c3].filter(Boolean).join(' ');
        }
      }
      if (cell.includes('إختبار لصالح') || cell.includes('اختبار لصالح')) {
        const b = cleanStr(row[c + 1]) || cleanStr(row[c + 2]);
        if (b) beneficiary = b;
      }
    }
  }

  // 3. Detect Header Row & build combined headers
  let detectedHeaderRow = 0;
  let detectedDataStartRow = 1;

  if (isMonzoma) {
    // Row 7 is main header, row 8 has exercise subheaders, row 9+ data
    for (let r = 0; r < Math.min(15, rows.length); r++) {
      const row = rows[r] || [];
      if (row.some((cell: any) => cleanStr(cell).includes('رقم عسكر') || cleanStr(cell).includes('الإسم'))) {
        detectedHeaderRow = r;
        detectedDataStartRow = r + 2; // skip subheader
        break;
      }
    }
  } else if (isDibaja) {
    // Row 0 or 1 header, data row 3+
    for (let r = 0; r < Math.min(10, rows.length); r++) {
      const rowStr = (rows[r] || []).join(' ');
      if (rowStr.includes('درجة/ رتبة') && rowStr.includes('الإسم')) {
        detectedHeaderRow = r;
        detectedDataStartRow = r + 2; // skip subheaders & section headers
        break;
      }
    }
  } else {
    // Find row with max matches to field aliases
    let maxMatch = 0;
    for (let r = 0; r < Math.min(15, rows.length); r++) {
      const row = rows[r] || [];
      let matches = 0;
      for (const cell of row) {
        const s = cleanStr(cell).toLowerCase();
        if (!s) continue;
        if (TARGET_FIELDS.some((f) => f.aliases.some((a) => s.includes(a.toLowerCase())))) {
          matches++;
        }
      }
      if (matches > maxMatch) {
        maxMatch = matches;
        detectedHeaderRow = r;
        detectedDataStartRow = r + 1;
      }
    }
  }

  // Build combined header labels
  const rawHeaderRow = rows[detectedHeaderRow] || [];
  const subHeaderRow = rows[detectedHeaderRow + 1] || [];
  const maxCols = Math.max(
    rawHeaderRow.length,
    subHeaderRow.length,
    ...rows.slice(0, 20).map((r) => r.length)
  );

  const combinedHeaders: string[] = [];
  const columns: ColumnOption[] = [];

  for (let c = 0; c < maxCols; c++) {
    const mainHeader = cleanStr(rawHeaderRow[c]);
    const subHeader = cleanStr(subHeaderRow[c]);
    let label = mainHeader;

    if (isMonzoma && detectedDataStartRow === detectedHeaderRow + 2) {
      if (subHeader && subHeader !== mainHeader) {
        // If main header is exercise or empty, combine
        if (mainHeader.includes('تمرينات') || !mainHeader) {
          label = subHeader ? `تمرينات - ${subHeader}` : mainHeader;
        } else if (mainHeader.includes('موانع') || mainHeader.includes('ضاحية') || mainHeader.includes('سير')) {
          label = `${mainHeader} - ${subHeader === 'ق' ? 'دقائق' : subHeader === 'ث' ? 'ثواني' : subHeader === 'س' ? 'ساعات' : subHeader}`;
        } else {
          label = `${mainHeader} ${subHeader ? `(${subHeader})` : ''}`.trim();
        }
      }
    } else if (isDibaja && detectedDataStartRow === detectedHeaderRow + 2) {
      if (subHeader) {
        label = `${mainHeader || `عمود ${c}`} (${subHeader})`;
      }
    }

    if (!label) {
      // Find first non-empty value in sample rows as fallback label
      const sampleVal = rows.slice(detectedDataStartRow, detectedDataStartRow + 5).map((r) => cleanStr(r[c])).find(Boolean);
      label = sampleVal ? `عمود ${colIndexToLetter(c)} (${sampleVal})` : `عمود ${colIndexToLetter(c)}`;
    }

    combinedHeaders.push(label);

    // Extract sample values from data rows
    const sampleValues = rows
      .slice(detectedDataStartRow, detectedDataStartRow + 15)
      .map((r) => cleanStr(r[c]))
      .filter((v) => v !== '' && v !== undefined)
      .slice(0, 3);

    columns.push({
      index: c,
      label,
      letter: colIndexToLetter(c),
      sampleValues,
    });
  }

  // Generate suggested mappings
  let suggestedMapping: Record<TargetFieldKey, number | null>;

  if (isMonzoma) {
    // Specific proven mappings for Monzoma sheet
    suggestedMapping = {
      serialNum: 0,
      militaryId: 1,
      corps: 2,
      rank: 3,
      name: 4,
      age: 5,
      weight: 6,
      height: 7,
      category: null,
      forceType: null,
      pushups: 8,
      situps: 9,
      run: 10,
      pullups: 11,
      obstacleSec: 12,
      obstacleMin: 13,
      suburbSec: 14,
      suburbMin: 15,
      suburbTimeCode: null,
      marchHours: 16,
      marchMin: 17,
      sprint100m: 18,
      colleagueCarry: 19,
      zigzagRun: 20,
      longJump: 21,
      grenadeThrow: 22,
      notes: 23,
      attendanceStatus: null,
    };
  } else if (isDibaja) {
    // Proven mappings for Dibaja sheet
    suggestedMapping = {
      serialNum: 0,
      rank: 1,
      name: 2,
      age: 3,
      corps: null,
      militaryId: null,
      category: null,
      forceType: null,
      weight: null,
      height: null,
      pullups: 5,
      pushups: 7,
      situps: 9,
      run: 11,
      suburbTimeCode: 16,
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
      attendanceStatus: 14,
      notes: 18,
    };
  } else {
    suggestedMapping = autoMapHeaders(combinedHeaders);
  }

  const sheet: SheetInspection = {
    sheetName: activeSheetName,
    rowCount: rows.length,
    colCount: maxCols,
    detectedHeaderRow,
    detectedDataStartRow,
    headers: combinedHeaders,
    columns,
    suggestedMapping,
  };

  return {
    wb,
    inspection: {
      sheetNames,
      activeSheetName,
      detectedFormat,
      unitName,
      periodDate,
      beneficiary,
      sheet,
    },
  };
}

/**
 * Execute parsing with the given mapping, sheet, and active field selections.
 */
export function parseExcelWithCustomMapping(
  wb: XLSX.WorkBook,
  config: CustomImportConfig
): ExcelImportResult {
  const ws = wb.Sheets[config.sheetName];
  if (!ws) {
    throw new Error(`ورقة العمل ${config.sheetName} غير موجودة في ملف الإكسل.`);
  }

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const mapping = config.fieldMapping;
  const activeFieldsSet = new Set(config.activeFields);

  const getVal = (row: any[], key: TargetFieldKey): any => {
    if (!activeFieldsSet.has(key)) return undefined;
    const colIdx = mapping[key];
    if (colIdx === null || colIdx === undefined || colIdx < 0) return undefined;
    return row[colIdx];
  };

  const personnel: PersonRecord[] = [];
  const assessments: AssessmentInput[] = [];
  const warnings: string[] = [];

  let currentCategory: PersonnelCategory = 'officers';
  const startRow = Math.max(0, config.dataStartRowIndex);

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r] || [];
    const rowStr = row.map((c) => cleanStr(c)).join(' ');
    if (!rowStr.trim()) continue;

    // Detect section splits in Dibaja (أولاً: الضباط / ثانياً: الدرجات الأخرى)
    if (rowStr.includes('ثانياً') || rowStr.includes('الدرجات الأخرى') || rowStr.includes('الدرجات الاخرى')) {
      currentCategory = 'other_ranks';
      continue;
    }
    if (rowStr.includes('أولاً') || rowStr.includes('الضباط')) {
      currentCategory = 'officers';
      continue;
    }

    // Name extraction & validation
    const rawName = cleanStr(getVal(row, 'name'));
    const rawSerial = parseOptionalNum(getVal(row, 'serialNum'));
    const rawRank = cleanStr(getVal(row, 'rank'));

    if (!rawName && !rawSerial && !rawRank) {
      continue;
    }

    if (rawName.includes('إجمال') || rawName.includes('متوسط') || rawRank.includes('ملحوظة')) {
      continue;
    }

    const name = rawName || `فرد ${rawSerial || personnel.length + 1}`;
    const serialNum = rawSerial || personnel.length + 1;
    const rank = rawRank || (currentCategory === 'officers' ? 'نقيب' : 'رقيب أول');

    // Rank & Category detection
    let category: PersonnelCategory = currentCategory;
    const rawCategory = cleanStr(getVal(row, 'category'));
    if (rawCategory.includes('ضابط') || rawCategory.includes('ضباط')) {
      category = 'officers';
    } else if (rawCategory.includes('درجات') || rawCategory.includes('صف') || rawCategory.includes('جنود')) {
      category = 'other_ranks';
    } else if (rawRank) {
      category = detectCategoryFromRank(rawRank);
    }

    const corps = cleanStr(getVal(row, 'corps')) || 'مشاة';
    const forceType: ForceType = detectForceType(corps);

    const militaryId =
      cleanStr(getVal(row, 'militaryId')) || `${41000 + serialNum}`;
    const age = parseNum(getVal(row, 'age'), 30);
    const weight = parseOptionalNum(getVal(row, 'weight'));
    const height = parseOptionalNum(getVal(row, 'height'));

    const personId = `p-${Date.now()}-${r}-${serialNum}`;

    const person: PersonRecord = {
      id: personId,
      serialNum,
      militaryId,
      corps,
      rank,
      category,
      forceType,
      name,
      age,
      weight,
      height,
    };

    // Fitness scores
    const pullupsCount = parseNum(getVal(row, 'pullups'), 0);
    const pushupsCount = parseNum(getVal(row, 'pushups'), 0);
    const situpsCount = parseNum(getVal(row, 'situps'), 0);
    const runCount = parseNum(getVal(row, 'run'), 0);

    // Suburb minutes/seconds
    const suburbMin = parseOptionalNum(getVal(row, 'suburbMin'));
    const suburbSec = parseOptionalNum(getVal(row, 'suburbSec'));
    const rawSuburbCode = cleanStr(getVal(row, 'suburbTimeCode'));

    // Additional metrics
    const obstacleMin = parseOptionalNum(getVal(row, 'obstacleMin'));
    const obstacleSec = parseOptionalNum(getVal(row, 'obstacleSec'));
    const marchHours = parseOptionalNum(getVal(row, 'marchHours'));
    const marchMin = parseOptionalNum(getVal(row, 'marchMin'));
    const sprint100m = parseOptionalNum(getVal(row, 'sprint100m'));
    const colleagueCarry = parseOptionalNum(getVal(row, 'colleagueCarry'));
    const zigzagRun = parseOptionalNum(getVal(row, 'zigzagRun'));
    const longJump = parseOptionalNum(getVal(row, 'longJump'));
    const grenadeThrow = parseOptionalNum(getVal(row, 'grenadeThrow'));
    const notes = cleanStr(getVal(row, 'notes'));

    // Attendance & Suburb resolution
    const rawAttendance = cleanStr(getVal(row, 'attendanceStatus'));
    let attendanceStatus: AttendanceStatus = 'tested';

    const statusCandidate = `${rawAttendance} ${notes} ${rawSuburbCode}`;
    if (statusCandidate.includes('موقف طب') || statusCandidate.includes('طبي')) {
      attendanceStatus = 'medical';
    } else if (statusCandidate.includes('لم يختبر') || statusCandidate.includes('غياب')) {
      attendanceStatus = 'not_tested';
    } else if (statusCandidate.includes('مأمورية') || statusCandidate.includes('مامورية')) {
      attendanceStatus = 'mission';
    } else if (statusCandidate.includes('أجازة') || statusCandidate.includes('اجازة')) {
      attendanceStatus = 'leave';
    } else if (statusCandidate.includes('فرقة')) {
      attendanceStatus = 'course';
    } else if (!pullupsCount && !pushupsCount && !situpsCount && !runCount && suburbMin === null && !rawSuburbCode) {
      attendanceStatus = 'not_tested';
    }

    // Determine suburbTimeCode and min/sec using smart compound parser
    let resolvedSuburbMin = suburbMin;
    let resolvedSuburbSec = suburbSec;
    let suburbTimeCode = 0;

    if (rawSuburbCode) {
      const parsedSub = parseSuburbValue(rawSuburbCode);
      if (parsedSub.code > 0) {
        suburbTimeCode = parsedSub.code;
        if (resolvedSuburbMin === null && parsedSub.min !== null) {
          resolvedSuburbMin = parsedSub.min;
          resolvedSuburbSec = parsedSub.sec;
        }
      }
    }

    if (!suburbTimeCode && resolvedSuburbMin !== null) {
      const totalMinutes = resolvedSuburbMin + (resolvedSuburbSec || 0) / 60;
      if (totalMinutes <= 21.5) suburbTimeCode = 1;
      else if (totalMinutes <= 22.0) suburbTimeCode = 2;
      else if (totalMinutes <= 22.5) suburbTimeCode = 3;
      else if (totalMinutes <= 23.0) suburbTimeCode = 4;
      else if (totalMinutes <= 23.5) suburbTimeCode = 5;
      else if (totalMinutes <= 24.0) suburbTimeCode = 6;
      else if (totalMinutes <= 24.5) suburbTimeCode = 7;
      else if (totalMinutes <= 25.0) suburbTimeCode = 8;
      else if (totalMinutes <= 25.5) suburbTimeCode = 9;
      else if (totalMinutes <= 26.0) suburbTimeCode = 10;
      else suburbTimeCode = 11; // خارج الزمن
    }

    if (attendanceStatus === 'medical') {
      suburbTimeCode = 12;
    }

    const assessment: AssessmentInput = {
      periodId: 'temp_import_period',
      personId,
      pullupsCount,
      pushupsCount,
      situpsCount,
      runCount,
      suburbTimeCode,
      suburbMin: resolvedSuburbMin,
      suburbSec: resolvedSuburbSec,
      obstacleMin,
      obstacleSec,
      marchHours,
      marchMin,
      sprint100m,
      colleagueCarry,
      zigzagRun,
      longJump,
      grenadeThrow,
      attendanceStatus,
      exercisesNotes: notes,
      suburbNotes: rawSuburbCode,
    };

    personnel.push(person);
    assessments.push(assessment);
  }

  const officers = personnel.filter((p) => p.category === 'officers').length;
  const otherRanks = personnel.filter((p) => p.category === 'other_ranks').length;
  const withScores = assessments.filter(
    (a) => a.pullupsCount > 0 || a.pushupsCount > 0 || a.suburbTimeCode > 0
  ).length;
  const untestedOrMedical = assessments.filter(
    (a) => a.attendanceStatus !== 'tested'
  ).length;

  return {
    unitName: config.unitName || 'اللواء الأول المشاة الميكانيكي',
    periodDate: config.periodDate || new Date().toISOString().slice(0, 10),
    periodName:
      config.periodName ||
      `كشف اختبار التربية البدنية - ${config.periodDate || new Date().toISOString().slice(0, 10)}`,
    beneficiary:
      config.beneficiary || 'فرع التربية الرياضية - هيئة تدريب القوات المسلحة',
    detectedFormat: 'generic',
    personnel,
    assessments,
    warnings,
    summary: {
      total: personnel.length,
      officers,
      otherRanks,
      withScores,
      untestedOrMedical,
    },
  };
}

/**
 * Backward compatibility parser.
 */
export function parseMilitaryFitnessWorkbook(
  fileBuffer: ArrayBuffer | Uint8Array
): ExcelImportResult {
  const { wb, inspection } = inspectExcelWorkbook(fileBuffer);
  const result = parseExcelWithCustomMapping(wb, {
    sheetName: inspection.activeSheetName,
    headerRowIndex: inspection.sheet.detectedHeaderRow,
    dataStartRowIndex: inspection.sheet.detectedDataStartRow,
    fieldMapping: inspection.sheet.suggestedMapping,
    activeFields: TARGET_FIELDS.map((f) => f.key),
    unitName: inspection.unitName,
    periodDate: inspection.periodDate,
    beneficiary: inspection.beneficiary,
  });

  result.detectedFormat = inspection.detectedFormat;
  return result;
}

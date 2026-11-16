import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  EvaluatedAssessment,
  UnitPeriodSummary,
  PeriodComparisonItem,
} from './scoring';
import { PeriodRecord } from '../data/seedPersonnel';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('تعذر الحصول على رمز الوصول من حساب Google');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
}

export async function listUserSpreadsheets(): Promise<DriveSpreadsheetFile[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً');

  const q = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=15&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    throw new Error('تعذر جلب قائمة ملفات Google Sheets');
  }
  const data = await res.json();
  return data.files || [];
}

export async function exportPeriodToGoogleSheet(
  period: PeriodRecord,
  evaluated: EvaluatedAssessment[],
  summary: UnitPeriodSummary,
  comparisons: PeriodComparisonItem[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً');

  const title = `كشف اللياقة البدنية - ${period.name} (${period.date})`;

  // 1. Create a new spreadsheet with 3 sheets
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title, locale: 'ar_EG' },
      sheets: [
        { properties: { title: 'كشف النتائج والترتيب', rightToLeft: true } },
        { properties: { title: 'إجماليات الوحدة', rightToLeft: true } },
        { properties: { title: 'مقارنة الفترات', rightToLeft: true } },
      ],
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`فشل إنشاء ملف Google Sheets: ${errText}`);
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl =
    created.spreadsheetUrl ||
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Prepare rows for Sheet 1: Results & Ranking
  const sortedByRank = [...evaluated].sort((a, b) => {
    if (a.overallRank && b.overallRank) return a.overallRank - b.overallRank;
    if (a.overallRank) return -1;
    if (b.overallRank) return 1;
    return a.person.serialNum - b.person.serialNum;
  });

  const sheet1Rows = [
    [
      'الترتيب العام',
      'م',
      'الفئة',
      'الرتبة / الدرجة',
      'الاسم',
      'السن',
      'المرحلة',
      'عقلة (عدد)',
      'عقلة (درجة)',
      'ضغط (عدد)',
      'ضغط (درجة)',
      'بطن (عدد)',
      'بطن (درجة)',
      'جري معدل (عدد)',
      'جري معدل (درجة)',
      'نسبة التمرينات %',
      'نتيجة التمرينات',
      'زمن الضاحية',
      'نتيجة الضاحية %',
      'الإجمالي العام %',
      'التقدير العام',
      'الموقف / التمام',
      'ملاحظات',
    ],
    ...sortedByRank.map((item) => [
      item.overallRank ? `#${item.overallRank}` : '-',
      item.person.serialNum,
      item.person.category === 'officers' ? 'ضباط' : 'درجات أخرى',
      item.person.rank,
      item.person.name,
      item.person.age,
      item.stage.name,
      item.input.pullupsCount,
      item.pullupsScore,
      item.input.pushupsCount,
      item.pushupsScore,
      item.input.situpsCount,
      item.situpsScore,
      item.input.runCount,
      item.runScore,
      item.exercisesPercentage,
      item.exercisesGrade,
      item.suburbLabel,
      item.suburbScore,
      item.totalPercentage,
      item.totalGrade,
      item.isMedical ? 'موقف طبى' : item.isTested ? 'مختبر' : 'لم يختبر',
      item.input.exercisesNotes || item.input.suburbNotes || '',
    ]),
  ];

  // Prepare rows for Sheet 2: Unit Summary
  const sheet2Rows = [
    ['ملخص نتائج الوحدة', period.unitName, 'تاريخ الاختبار:', period.date],
    [],
    [
      'البيان',
      'إجمالي القوة',
      'عدد المختبرين',
      'موقف طبي',
      'لم يختبر',
      'متوسط التمرينات %',
      'متوسط الضاحية %',
      'النسبة الإجمالية %',
      'نسبة النجاح %',
    ],
    [
      'أولاً: الضباط',
      summary.officers.totalStrength,
      summary.officers.testedCount,
      summary.officers.medicalCount,
      summary.officers.untestedCount,
      summary.officers.avgExercisesPercentage,
      summary.officers.avgSuburbPercentage,
      summary.officers.avgTotalPercentage,
      summary.officers.passRate,
    ],
    [
      'ثانياً: الدرجات الأخرى',
      summary.otherRanks.totalStrength,
      summary.otherRanks.testedCount,
      summary.otherRanks.medicalCount,
      summary.otherRanks.untestedCount,
      summary.otherRanks.avgExercisesPercentage,
      summary.otherRanks.avgSuburbPercentage,
      summary.otherRanks.avgTotalPercentage,
      summary.otherRanks.passRate,
    ],
    [
      'إجمالي النتيجة للوحدة',
      summary.overall.totalStrength,
      summary.overall.testedCount,
      summary.overall.medicalCount,
      summary.overall.untestedCount,
      summary.overall.avgExercisesPercentage,
      summary.overall.avgSuburbPercentage,
      summary.overall.avgTotalPercentage,
      summary.overall.passRate,
    ],
  ];

  // Prepare rows for Sheet 3: Period Comparison
  const sheet3Rows = [
    [
      'م',
      'الرتبة / الدرجة',
      'الاسم',
      'النسبة السابقة %',
      'النسبة الحالية %',
      'فرق النسبة %',
      'الترتيب السابق',
      'الترتيب الحالي',
      'فرق المراكز',
      'حالة التطور',
    ],
    ...comparisons.map((c) => [
      c.person.serialNum,
      c.person.rank,
      c.person.name,
      c.previous ? c.previous.totalPercentage : '-',
      c.current.totalPercentage,
      c.percentageDelta !== null
        ? c.percentageDelta > 0
          ? `+${c.percentageDelta}%`
          : `${c.percentageDelta}%`
        : '-',
      c.previous?.overallRank ?? '-',
      c.current.overallRank ?? '-',
      c.rankDelta !== null
        ? c.rankDelta > 0
          ? `+${c.rankDelta}`
          : `${c.rankDelta}`
        : '-',
      c.trend === 'improved'
        ? 'تقدم في المستوى'
        : c.trend === 'declined'
        ? 'تراجع في المستوى'
        : c.trend === 'stable'
        ? 'مستوى ثابت'
        : 'فترة أولى',
    ]),
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'كشف النتائج والترتيب!A1', values: sheet1Rows },
          { range: 'إجماليات الوحدة!A1', values: sheet2Rows },
          { range: 'مقارنة الفترات!A1', values: sheet3Rows },
        ],
      }),
    }
  );

  return { spreadsheetId, spreadsheetUrl, title };
}

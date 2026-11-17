import {
  EvaluatedAssessment,
  UnitPeriodSummary,
  PeriodComparisonItem,
} from './scoring';
import { PeriodRecord } from '../data/seedPersonnel';

export interface UserStub {
  email: string | null;
  displayName: string | null;
}

let cachedUser: UserStub | null = null;
let authListener: ((user: UserStub | null) => void) | null = null;

export const initAuth = (
  onAuthSuccess?: (user: UserStub, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (cachedUser && onAuthSuccess) {
    onAuthSuccess(cachedUser, 'offline_token');
  } else if (onAuthFailure) {
    onAuthFailure();
  }
  authListener = (u) => {
    if (u && onAuthSuccess) onAuthSuccess(u, 'offline_token');
    else if (!u && onAuthFailure) onAuthFailure();
  };
  return () => {
    authListener = null;
  };
};

export const googleSignIn = async (): Promise<{
  user: UserStub;
  accessToken: string;
} | null> => {
  // In local desktop offline mode, Google cloud sign-in is disabled to save resources
  throw new Error('تسجيل الدخول السحابي معطل في وضع الديسكتوب المحلي أوفلاين. يمكنك تصدير ملفات Excel مباشرة من زر التصدير.');
};

export const getAccessToken = async (): Promise<string | null> => {
  return null;
};

export const logoutGoogle = async () => {
  cachedUser = null;
  if (authListener) authListener(null);
};

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
}

export async function listUserSpreadsheets(): Promise<DriveSpreadsheetFile[]> {
  return [];
}

export async function exportPeriodToGoogleSheet(
  _period: PeriodRecord,
  _evaluated: EvaluatedAssessment[],
  _summary: UnitPeriodSummary,
  _comparisons: PeriodComparisonItem[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  throw new Error('يرجى استخدام تصدير Excel المحلي (.xlsx)');
}

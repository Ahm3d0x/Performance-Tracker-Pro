import React, { useState } from 'react';
import {
  Database,
  Save,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ScoringSettings,
  EvaluatedAssessment,
  UnitPeriodSummary,
  PeriodComparisonItem,
} from '../utils/scoring';
import { PeriodRecord } from '../data/seedPersonnel';
import {
  googleSignIn,
  logoutGoogle,
  exportPeriodToGoogleSheet,
  listUserSpreadsheets,
  DriveSpreadsheetFile,
} from '../utils/googleWorkspace';

interface StandardsAndDbViewProps {
  settings: ScoringSettings;
  periods: PeriodRecord[];
  activePeriodId: string;
  dbInfo: {
    engine: string;
    filePath: string;
    sizeBytes: number;
    totalPersonnel: number;
    totalPeriods: number;
    totalAssessments: number;
    lastUpdated: string;
  };
  currentEvaluated: EvaluatedAssessment[];
  currentSummary: UnitPeriodSummary;
  currentComparisons: PeriodComparisonItem[];
  googleUser: { email: string | null; displayName: string | null } | null;
  onUpdateSettings: (newSettings: ScoringSettings) => Promise<void>;
  onCreatePeriod: (payload: {
    name: string;
    date: string;
    beneficiary: string;
    unitName: string;
    notes: string;
    copyFromPeriodId?: string;
  }) => Promise<void>;
  onDeletePeriod: (periodId: string) => Promise<void>;
  onClearPeriodScores: (periodId: string) => Promise<void>;
  onResetDatabase: () => Promise<void>;
  onImportJsonBackup: (jsonPayload: any) => Promise<void>;
  onExportJsonBackup: () => void;
  onGoogleAuthChange: (
    user: { email: string | null; displayName: string | null } | null
  ) => void;
}

export const StandardsAndDbView: React.FC<StandardsAndDbViewProps> = ({
  settings,
  periods,
  activePeriodId,
  dbInfo,
  currentEvaluated,
  currentSummary,
  currentComparisons,
  googleUser,
  onUpdateSettings,
  onCreatePeriod,
  onDeletePeriod,
  onClearPeriodScores,
  onResetDatabase,
  onImportJsonBackup,
  onExportJsonBackup,
  onGoogleAuthChange,
}) => {
  const [localSettings, setLocalSettings] = useState<ScoringSettings>(() =>
    JSON.parse(JSON.stringify(settings))
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string>('');

  // New Period form
  const [newPeriodName, setNewPeriodName] = useState('اختبار اللياقة الدوري - أغسطس 2026');
  const [newPeriodDate, setNewPeriodDate] = useState('2026-08-10');
  const [newPeriodBeneficiary, setNewPeriodBeneficiary] = useState(
    'هيئة تدريب القوات المسلحة'
  );
  const [copyFromId, setCopyFromId] = useState<string>(activePeriodId);

  // Confirmation modal state for destructive / mutating actions
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Google Sheets state
  const [sheetBusy, setSheetBusy] = useState(false);
  const [createdSheetLink, setCreatedSheetLink] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [recentSheets, setRecentSheets] = useState<DriveSpreadsheetFile[]>([]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await onUpdateSettings(localSettings);
      setStatusBanner('تم حفظ إعدادات الوحدة ومعايير المراحل والأزمنة في قاعدة بيانات SQLite بنجاح.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreatePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriodName.trim()) return;
    await onCreatePeriod({
      name: newPeriodName,
      date: newPeriodDate,
      beneficiary: newPeriodBeneficiary,
      unitName: localSettings.unitName,
      notes: '',
    });
    setStatusBanner(`تم إنشاء الفترة التدريبية "${newPeriodName}" بنجاح كفترة جديدة فارغة (0%).`);
  };

  const handleGoogleLogin = async () => {
    try {
      setSheetBusy(true);
      const res = await googleSignIn();
      if (res) {
        onGoogleAuthChange({
          email: res.user.email,
          displayName: res.user.displayName,
        });
        const files = await listUserSpreadsheets().catch(() => []);
        setRecentSheets(files);
      }
    } catch (err: any) {
      setStatusBanner(`تعذر تسجيل الدخول بـ Google: ${err.message || ''}`);
    } finally {
      setSheetBusy(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logoutGoogle();
    onGoogleAuthChange(null);
    setRecentSheets([]);
  };

  const activePeriod =
    periods.find((p) => p.id === activePeriodId) || periods[0];

  return (
    <div className="space-y-6">
      {statusBanner && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner('')}
            className="text-emerald-700 hover:underline cursor-pointer"
          >
            إخفاء
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {confirmDialog.title}
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {confirmDialog.description}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  const fn = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  await fn();
                }}
                className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg cursor-pointer"
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Grid: Local SQLite Database Card + Google Sheets Integration Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Local SQLite Engine Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  قاعدة البيانات المحلية (SQLite Engine)
                </h2>
                <p className="text-xs text-slate-500">
                  {dbInfo.engine} · المسار: <span className="font-mono">{dbInfo.filePath}</span>
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-500">
              الحجم: <span className="font-mono tabular-nums">{Math.max(12, Math.round(dbInfo.sizeBytes / 1024))} KB</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">إجمالي الأفراد</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {dbInfo.totalPersonnel}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">الفترات التدريبية</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {dbInfo.totalPeriods}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">سجلات التقييم</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {dbInfo.totalAssessments}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <a
              href="/api/database/download-sqlite"
              download="military_fitness_database.sqlite"
              className="px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل ملف SQLite الخام (.sqlite)</span>
            </a>

            <button
              type="button"
              onClick={onExportJsonBackup}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير نسخة احتياطية (JSON)</span>
            </button>

            <label className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>استيراد نسخة احتياطية</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    try {
                      const parsed = JSON.parse(String(ev.target?.result || '{}'));
                      await onImportJsonBackup(parsed);
                      setStatusBanner('تم استعادة النسخة الاحتياطية في قاعدة بيانات SQLite بنجاح.');
                    } catch {
                      setStatusBanner('فشل قراءة ملف النسخة الاحتياطية.');
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>

            <button
              type="button"
              onClick={() =>
                setConfirmDialog({
                  title: 'تصفير كافة السجلات والبيانات (إعادة ضبط المصنع)؟',
                  description:
                    'تنبيه هام: سيؤدي هذا الإجراء إلى مسح كافة سجلات الأفراد والفترات والدرجات نهائياً من قاعدة البيانات (0 أفراد)، وتهيئة المنظومة كقاعدة بيانات بيضاء نظيفة تماماً كأنها تفتح لأول مرة.',
                  confirmLabel: 'تأكيد تصفير ومسح كافة البيانات نهائياً',
                  onConfirm: async () => {
                    await onResetDatabase();
                    setStatusBanner('تم تصفير كافة السجلات والبيانات بنجاح. المنظومة فارغة الآن وجاهزة للعمل الفعلي.');
                  },
                })
              }
              className="px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 border border-red-200 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تصفير السجلات (إعادة ضبط المصنع)</span>
            </button>
          </div>
        </div>

        {/* Google Sheets Sync Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  مزامنة وتصدير Google Sheets
                </h2>
                <p className="text-xs text-slate-500">
                  تصدير مباشر لكشف النتائج وإجماليات الوحدة ومقارنة الفترات إلى حسابك
                </p>
              </div>
            </div>
            {googleUser && (
              <button
                type="button"
                onClick={handleGoogleLogout}
                className="text-xs text-slate-500 hover:text-red-600 cursor-pointer"
              >
                تسجيل الخروج
              </button>
            )}
          </div>

          {!googleUser ? (
            <div className="space-y-3 py-2">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                يمكنك اختيارياً تسجيل الدخول بحساب Google لتصدير كشف الفترة الحالية ({activePeriod.name}) مباشرة إلى ملف Google Sheets منظم في حسابك.
              </p>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={sheetBusy}
                className="gsi-material-button"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      ></path>
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      ></path>
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      ></path>
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      ></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    Sign in with Google
                  </span>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                متصل بالحساب: <strong>{googleUser.email}</strong>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={sheetBusy}
                  onClick={() =>
                    setConfirmDialog({
                      title: 'إنشاء وتصدير كشف جديد في Google Sheets؟',
                      description: `سيتم إنشاء ملف جدول بيانات جديد بعنوان "كشف اللياقة البدنية - ${activePeriod.name}" في حساب Google Sheets الخاص بك متضمناً نتائج ${currentEvaluated.length} فرداً وإجماليات الوحدة ومقارنة الفترات.`,
                      confirmLabel: 'تأكيد التصدير إلى Google Sheets',
                      onConfirm: async () => {
                        setSheetBusy(true);
                        try {
                          const res = await exportPeriodToGoogleSheet(
                            activePeriod,
                            currentEvaluated,
                            currentSummary,
                            currentComparisons
                          );
                          setCreatedSheetLink({
                            url: res.spreadsheetUrl,
                            title: res.title,
                          });
                          setStatusBanner(
                            `تم تصدير الكشف إلى Google Sheets بنجاح: ${res.title}`
                          );
                        } catch (err: any) {
                          setStatusBanner(`خطأ أثناء التصدير: ${err.message}`);
                        } finally {
                          setSheetBusy(false);
                        }
                      },
                    })
                  }
                  className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>
                    {sheetBusy
                      ? 'جاري المزامنة...'
                      : `تصدير (${activePeriod.name}) إلى Google Sheets`}
                  </span>
                </button>

                {createdSheetLink && (
                  <a
                    href={createdSheetLink.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg flex items-center gap-1.5"
                  >
                    <span>فتح الجدول المُصدّر</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {recentSheets.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  آخر ملفات Google Sheets في حسابك:{' '}
                  {recentSheets.slice(0, 3).map((f, i) => (
                    <span key={f.id}>
                      {i > 0 && ' · '}
                      <a
                        href={
                          f.webViewLink ||
                          `https://docs.google.com/spreadsheets/d/${f.id}/edit`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-slate-700 dark:text-slate-300"
                      >
                        {f.name}
                      </a>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Periods Management Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          إدارة الفترات التدريبية (للمقارنة التتبعية بين كل فترة والتي قبلها)
        </h3>

        <form
          onSubmit={handleCreatePeriodSubmit}
          className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl items-end"
        >
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              اسم الفترة التدريبية الجديدة
            </label>
            <input
              type="text"
              value={newPeriodName}
              onChange={(e) => setNewPeriodName(e.target.value)}
              placeholder="مثال: الاختبار الدوري الثاني - مايو 2026"
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              تاريخ الاختبار
            </label>
            <input
              type="date"
              value={newPeriodDate}
              onChange={(e) => setNewPeriodDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center gap-1.5 cursor-pointer h-[36px]"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة فترة فارغة جديدة (0%)</span>
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border border-slate-200 dark:border-slate-800 rounded-lg">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <th className="py-2.5 px-4">اسم الفترة</th>
                <th className="py-2.5 px-4 text-center">تاريخ الاختبار</th>
                <th className="py-2.5 px-4">اختبار لصالح</th>
                <th className="py-2.5 px-4 text-center">إجراءات التحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {periods.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 px-4 font-semibold">{p.name}</td>
                  <td className="py-2.5 px-4 text-center font-mono tabular-nums">
                    {p.date}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                    {p.beneficiary}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDialog({
                            title: `تصفير درجات الفترة (${p.name})؟`,
                            description:
                              'سيتم تصفير جميع درجات التمرينات والضاحية في هذه الفترة وإعادتها إلى حالة "لم يختبر" كما في النموذج الفارغ تماماً.',
                            confirmLabel: 'تأكيد تصفير الدرجات',
                            onConfirm: async () => {
                              await onClearPeriodScores(p.id);
                              setStatusBanner(`تم تصفير درجات الفترة "${p.name}".`);
                            },
                          })
                        }
                        className="px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-md cursor-pointer"
                      >
                        تصفير درجات الفترة
                      </button>
                      {periods.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDialog({
                              title: `حذف الفترة (${p.name}) نهائياً؟`,
                              description:
                                'سيتم حذف هذه الفترة وجميع سجلات التقييم المرتبطة بها من قاعدة البيانات.',
                              confirmLabel: 'حذف الفترة',
                              onConfirm: async () => {
                                await onDeletePeriod(p.id);
                                setStatusBanner(`تم حذف الفترة "${p.name}".`);
                              },
                            })
                          }
                          className="p-1 text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                          aria-label={`حذف ${p.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standards & Stages Control Form */}
      <form
        onSubmit={handleSaveSettings}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                التحكم الكامل في معايير المراحل السنية (1-6) وأزمنة الضاحية وأوزان التقييم
              </h3>
              <p className="text-xs text-slate-500">
                تعديل أي معيار يعيد حساب النسب الفردية والإجمالية والترتيب التنازلي تلقائياً
              </p>
            </div>
          </div>
          <button
            type="submit"
            disabled={savingSettings}
            className="px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{savingSettings ? 'جاري الحفظ...' : 'حفظ المعايير والإعدادات'}</span>
          </button>
        </div>

        {/* Unit & Weights Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              اسم الوحدة العسكرية
            </label>
            <input
              type="text"
              value={localSettings.unitName}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, unitName: e.target.value })
              }
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              وزن التمرينات في الإجمالي (0 إلى 1)
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={localSettings.exercisesWeight}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  exercisesWeight: Number(e.target.value) || 0.5,
                })
              }
              className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              وزن الضاحية في الإجمالي (0 إلى 1)
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={localSettings.suburbWeight}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  suburbWeight: Number(e.target.value) || 0.5,
                })
              }
              className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              حد النجاح الأدنى (%)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={localSettings.passThreshold}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  passThreshold: Number(e.target.value) || 50,
                })
              }
              className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
            />
          </div>
        </div>

        {/* Stages 1 to 6 Table */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            جدول المراحل السنية (المرحلة الأولى حتى المرحلة السادسة) والحد الأقصى للدرجة النهائية (100%):
          </h4>
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="py-2 px-3">المرحلة</th>
                  <th className="py-2 px-3 text-center">من سن</th>
                  <th className="py-2 px-3 text-center">إلى سن</th>
                  <th className="py-2 px-3 text-center">عقلة (عدد 100%)</th>
                  <th className="py-2 px-3 text-center">ضغط (عدد 100%)</th>
                  <th className="py-2 px-3 text-center">بطن (عدد 100%)</th>
                  <th className="py-2 px-3 text-center">جري معدل (عدد 100%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {localSettings.stages.map((st, idx) => {
                  const focusStageCell = (r: number, c: number) => {
                    const el = document.getElementById(`stage-cell-${r}-${c}`);
                    if (el) {
                      el.focus();
                      if (el instanceof HTMLInputElement) el.select();
                    }
                  };

                  const handleKey = (e: React.KeyboardEvent, c: number) => {
                    const maxRows = localSettings.stages.length;
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (c < 5) focusStageCell(idx, c + 1);
                      else if (idx < maxRows - 1) focusStageCell(idx + 1, 0);
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (idx < maxRows - 1) focusStageCell(idx + 1, c);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (idx > 0) focusStageCell(idx - 1, c);
                    } else if (e.key === 'ArrowLeft') {
                      if (c < 5) {
                        e.preventDefault();
                        focusStageCell(idx, c + 1);
                      }
                    } else if (e.key === 'ArrowRight') {
                      if (c > 0) {
                        e.preventDefault();
                        focusStageCell(idx, c - 1);
                      }
                    }
                  };

                  return (
                    <tr key={st.stage}>
                      <td className="py-2 px-3 font-semibold">{st.name}</td>
                      <td className="py-2 px-3 text-center">
                        <input
                          id={`stage-cell-${idx}-0`}
                          type="number"
                          value={st.minAge}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => handleKey(e, 0)}
                          onChange={(e) => {
                            const next = [...localSettings.stages];
                            next[idx] = { ...st, minAge: Number(e.target.value) };
                            setLocalSettings({ ...localSettings, stages: next });
                          }}
                          className="w-16 px-2 py-1 text-center font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-emerald-500 focus:outline-hidden"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          id={`stage-cell-${idx}-1`}
                          type="number"
                          value={st.maxAge}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => handleKey(e, 1)}
                          onChange={(e) => {
                            const next = [...localSettings.stages];
                            next[idx] = { ...st, maxAge: Number(e.target.value) };
                            setLocalSettings({ ...localSettings, stages: next });
                          }}
                          className="w-16 px-2 py-1 text-center font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-emerald-500 focus:outline-hidden"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          id={`stage-cell-${idx}-2`}
                          type="number"
                          value={st.pullupsMax}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => handleKey(e, 2)}
                          onChange={(e) => {
                            const next = [...localSettings.stages];
                            next[idx] = { ...st, pullupsMax: Number(e.target.value) };
                            setLocalSettings({ ...localSettings, stages: next });
                          }}
                          className="w-20 px-2 py-1 text-center font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-emerald-500 focus:outline-hidden"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          id={`stage-cell-${idx}-3`}
                          type="number"
                          value={st.pushupsMax}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => handleKey(e, 3)}
                          onChange={(e) => {
                            const next = [...localSettings.stages];
                            next[idx] = { ...st, pushupsMax: Number(e.target.value) };
                            setLocalSettings({ ...localSettings, stages: next });
                          }}
                          className="w-20 px-2 py-1 text-center font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-emerald-500 focus:outline-hidden"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          id={`stage-cell-${idx}-4`}
                          type="number"
                          value={st.situpsMax}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => handleKey(e, 4)}
                          onChange={(e) => {
                            const next = [...localSettings.stages];
                            next[idx] = { ...st, situpsMax: Number(e.target.value) };
                            setLocalSettings({ ...localSettings, stages: next });
                          }}
                          className="w-20 px-2 py-1 text-center font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-emerald-500 focus:outline-hidden"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          id={`stage-cell-${idx}-5`}
                          type="number"
                          value={st.runMax}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => handleKey(e, 5)}
                          onChange={(e) => {
                            const next = [...localSettings.stages];
                            next[idx] = { ...st, runMax: Number(e.target.value) };
                            setLocalSettings({ ...localSettings, stages: next });
                          }}
                          className="w-20 px-2 py-1 text-center font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-emerald-500 focus:outline-hidden"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cross-country time codes 1..10 */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            جدول أزمنة الضاحية القياسية (الأزمنة من 1 إلى 12):
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
            {localSettings.suburbTimes.map((t, idx) => (
              <div
                key={t.code}
                className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5"
              >
                <div className="text-[11px] font-bold text-slate-500">
                  الزمن {t.code}
                </div>
                <input
                  type="text"
                  value={t.label}
                  onChange={(e) => {
                    const next = [...localSettings.suburbTimes];
                    next[idx] = { ...t, label: e.target.value };
                    setLocalSettings({ ...localSettings, suburbTimes: next });
                  }}
                  className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                />
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] text-slate-500">النسبة %:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={t.score}
                    onChange={(e) => {
                      const next = [...localSettings.suburbTimes];
                      next[idx] = { ...t, score: Number(e.target.value) };
                      setLocalSettings({ ...localSettings, suburbTimes: next });
                    }}
                    className="w-16 px-2 py-0.5 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-center"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};

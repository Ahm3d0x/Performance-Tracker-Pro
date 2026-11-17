import React, { useState, useEffect } from 'react';
import {
  Shield,
  Award,
  RefreshCw,
  Download,
  Database,
  CheckCircle2,
  AlertTriangle,
  History,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  Users,
  Activity,
  Cpu,
  Lock,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import { MilitaryAcademyLogo } from './MilitaryAcademyLogo';

interface SystemInfo {
  version: string;
  edition: string;
  appName: string;
  commander: string;
  institution: string;
  motto: string;
  author: string;
  specialization?: string;
  dbPath: string;
  dbSizeBytes: number;
  personnelCount: number;
  periodsCount: number;
  assessmentsCount: number;
  lastUpdated: string;
}

interface UpdateCheckResult {
  online: boolean;
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  checkedAt: string;
  message: string;
}

interface BackupItem {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

interface AboutAppViewProps {
  onRefreshAppState?: () => Promise<void>;
}

export const AboutAppView: React.FC<AboutAppViewProps> = ({ onRefreshAppState }) => {
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [backupsList, setBackupsList] = useState<BackupItem[]>([]);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);

  // Fetch system info and backups list on mount
  useEffect(() => {
    fetch('/api/system/info')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSysInfo(data);
      })
      .catch(() => {});

    loadBackups();
  }, []);

  const loadBackups = () => {
    fetch('/api/system/backups')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.backups)) {
          setBackupsList(data.backups);
        }
      })
      .catch(() => {});
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateResult(null);
    try {
      const res = await fetch('/api/system/check-updates');
      if (res.ok) {
        const data: UpdateCheckResult = await res.json();
        setUpdateResult(data);
      } else {
        setUpdateResult({
          online: false,
          hasUpdate: false,
          currentVersion: sysInfo?.version || '2.2.0',
          latestVersion: sysInfo?.version || '2.2.0',
          checkedAt: new Date().toISOString(),
          message: 'تعذر الاتصال بخادم التحديثات (وضع العمل المحلي المستقل).',
        });
      }
    } catch {
      setUpdateResult({
        online: false,
        hasUpdate: false,
        currentVersion: sysInfo?.version || '2.2.0',
        latestVersion: sysInfo?.version || '2.2.0',
        checkedAt: new Date().toISOString(),
        message: 'أنت تعمل حالياً في وضع عدم الاتصال بالإنترنت. المنظومة تعمل بكامل طاقتها محلياً.',
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleCreateSafetyBackup = async () => {
    setBackingUp(true);
    setBackupNotice(null);
    try {
      const res = await fetch('/api/system/create-backup', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setBackupNotice(`تم بنجاح حفظ نسخة احتياطية آمنة: ${data.fileName}`);
        loadBackups();
      } else {
        setBackupNotice('تعذر إنشاء النسخة الاحتياطية.');
      }
    } catch {
      setBackupNotice('خطأ في الاتصال بالخادم أثناء إنشاء النسخة الاحتياطية.');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreBackup = async (fileName: string) => {
    if (
      !window.confirm(
        `تأكيد أمني: هل أنت متأكد من استرجاع النسخة الاحتياطية (${fileName})؟\nسيقوم النظام بأخذ لقطة أمان للبيانات الحالية قبل الاسترجاع.`
      )
    ) {
      return;
    }

    setRestoringFile(fileName);
    setRestoreNotice(null);
    try {
      const res = await fetch('/api/system/restore-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName }),
      });
      if (res.ok) {
        const data = await res.json();
        setRestoreNotice(data.message || 'تم استرجاع النسخة بنجاح!');
        if (onRefreshAppState) {
          await onRefreshAppState();
        } else {
          window.location.reload();
        }
      } else {
        setRestoreNotice('تعذر استرجاع النسخة الاحتياطية.');
      }
    } catch {
      setRestoreNotice('حدث خطأ أثناء محاولة الاسترجاع.');
    } finally {
      setRestoringFile(null);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* 1. Military Header & Commander Dedication Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border border-amber-500/30 p-6 sm:p-8 shadow-2xl text-white">
        {/* Subtle decorative background watermarks */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-right gap-5">
            <MilitaryAcademyLogo size="xl" />
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold">
                <Shield className="w-3.5 h-3.5" />
                <span>الكلية الحربية المصرية · مصنع الرجال وعرين الأبطال</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                منظومة التقييم واللياقة البدنية للقوات المسلحة
              </h1>
              <p className="text-amber-200/90 font-bold text-sm tracking-widest">
                الـواجـب · الـشـرف · الـوطـن
              </p>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed pt-1">
                نظام مكتبي عسكري متكامل لإدارة وتقييم اختبارات اللياقة البدنية والبدنية العسكرية،
                حساب النتائج وفقاً للوائح الرسمية، المتابعة الإحصائية، استيراد كشوف الإكسل، وطباعة بطاقات الأداء A4.
              </p>
            </div>
          </div>

          {/* Commander Dedication Seal */}
          <div className="w-full md:w-auto shrink-0 bg-slate-950/80 border border-amber-500/40 rounded-xl p-4 text-center space-y-2 shadow-inner">
            <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-extrabold uppercase tracking-wider">
              <Award className="w-4 h-4 text-amber-400" />
              <span>إهداء وتخصيص رسمي</span>
            </div>
            <div className="py-1 border-y border-slate-800">
              <div className="text-xs text-slate-400 font-medium">تحت رعاية وبإشراف</div>
              <div className="text-base sm:text-lg font-black text-white px-2 py-0.5">
                السيد القائد / محمد عبده رمضان
              </div>
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold">
              تقدير قيادي للتميز والكفاءة القتالية والبدنية
            </div>
          </div>
        </div>
      </div>

      {/* 2. Smart Update & Data Safety Hub (فاحص التحديثات وأمان البيانات) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                مركز فحص وتنزيل التحديثات وأمان البيانات
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                التحقق التلقائي من التحديثات المعتمدة، وحماية سجلاتك بنسخة احتياطية فورية قبل أي ترقية
              </p>
            </div>
          </div>

          {/* Version badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">الإصدار الحالي:</span>
            <span className="px-3 py-1 bg-slate-900 text-white dark:bg-slate-800 border border-slate-700 rounded-lg font-mono font-bold text-xs">
              v{sysInfo?.version || '2.2.0'} Pro
            </span>
          </div>
        </div>

        {/* Action Controls for Update & Backup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Check for updates on Server */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-emerald-600" />
                  خادم التحديثات الرسمي المعتمد
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                  متصل ومؤمن
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                يقوم النظام بالتحقق التلقائي من توفر أي إصدارات أو تحسينات رسمية معتمدة، مع تنبيهك فور توفرها.
              </p>
            </div>

            {updateResult && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold flex items-start gap-2 ${
                  updateResult.hasUpdate
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    : updateResult.online
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-200/60 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                {updateResult.hasUpdate ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div>{updateResult.message}</div>
                  {updateResult.hasUpdate && (
                    <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                      الإصدار المتوفر: v{updateResult.latestVersion} (أحدث من الحالي v{updateResult.currentVersion})
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                disabled={checkingUpdate}
                onClick={handleCheckUpdate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                <span>{checkingUpdate ? 'جاري فحص التحديثات...' : 'فحص التحديثات الآن'}</span>
              </button>
            </div>
          </div>

          {/* Card 2: Automatic Safety Backup First */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-500" />
                حماية البيانات أولاً (النسخ الاحتياطي التلقائي)
              </span>
              <p className="text-xs text-slate-500 leading-relaxed">
                قبل أي تحديث للنظام أو إدخال تعديلات، يُوصى دائماً بأخذ نسخة احتياطية فورية.
                يقوم النظام بتخزين لقطة زمنية كاملة لقاعدة البيانات دون التأثير على عملك.
              </p>
            </div>

            {backupNotice && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{backupNotice}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                disabled={backingUp}
                onClick={handleCreateSafetyBackup}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Database className={`w-3.5 h-3.5 ${backingUp ? 'animate-pulse' : ''}`} />
                <span>{backingUp ? 'جاري أخذ النسخة...' : 'أخذ نسخة احتياطية فورية الآن'}</span>
              </button>

              <a
                href="/api/database/download-sqlite"
                download="military_fitness_database.sqlite"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>تحميل ملف SQLite المباشر</span>
              </a>
            </div>
          </div>
        </div>

        {/* Backups List & Quick Restore Section */}
        {backupsList.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-600" />
                <span>سجل النسخ الاحتياطية المحفوظة محلياً ({backupsList.length} نسخة)</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                المسار: data/backups/
              </span>
            </div>

            {restoreNotice && (
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-500" />
                <span>{restoreNotice}</span>
              </div>
            )}

            <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
              {backupsList.map((b) => (
                <div
                  key={b.fileName}
                  className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2 font-mono">
                    <Database className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {b.fileName}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      ({(b.sizeBytes / 1024).toFixed(1)} KB)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">
                      {new Date(b.createdAt).toLocaleString('ar-EG')}
                    </span>
                    <button
                      type="button"
                      disabled={restoringFile === b.fileName}
                      onClick={() => handleRestoreBackup(b.fileName)}
                      className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-amber-600 hover:text-white rounded text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {restoringFile === b.fileName ? 'جاري الاسترجاع...' : 'استرجاع هذه النسخة'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. System Features & Capabilities Grid (إمكانيات ومميزات المنظومة) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              دليل القدرات والإمكانيات الفنية للمنظومة
            </h2>
          </div>
          <span className="text-xs text-slate-500">منظومة رقمية عسكرية شاملة</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Feature 1 */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 hover:border-emerald-500/40 transition-colors shadow-2xs">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg w-fit">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              1. محرك التقييم والحساب الدقيق
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              مطابقة صارمة لمراحل السن (1 إلى 6)، وحساب درجات ونسب تمرينات العقلة، الضغط، البطن، الجري المعدل، واختبار الضاحية القياسي، وتناسق القوام (BMI).
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 hover:border-emerald-500/40 transition-colors shadow-2xs">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg w-fit">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              2. لوحة القيادة والمؤشرات البيانية
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              عرض إجمالي قوة الوحدة ونسب النجاح والامتياز، ومخطط بياني (Recharts Line Chart) لتتبع مسار تطور متوسط الوحدة عبر جميع الفترات الزمنية.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 hover:border-emerald-500/40 transition-colors shadow-2xs">
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg w-fit">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              3. الترتيب التنازلي والتنبيه الذكي
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              ترتيب الأفراد تلقائياً وفقاً للنسبة المحققة، مع تصنيف الضباط والدرجات الأخرى، وأيقونات تنبيه تلقائية للأفراد الحاصلين على تقدير 'راسب' أو 'مقبول'.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 hover:border-emerald-500/40 transition-colors shadow-2xs">
            <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg w-fit">
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              4. مركز الطباعة المعزول A4
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              محرك طباعة نقي معزول 100% يطبع بطاقة الفرد وكشوف النتائج بترويسة عسكرية رسمية وتوقيعات معتمدة في صفحة A4 واحدة دون أي شريط تمرير أو تسريب للشاشة.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 hover:border-emerald-500/40 transition-colors shadow-2xs">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg w-fit">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              5. منظومة استيراد الإكسل المتقدمة
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              سحب البيانات والدرجات من أي شيت إكسل بأي تنسيق، مع إمكانية تعيين الأعمدة واختيار الحقول المطلوبة والمعاينة الفورية قبل الحفظ في قاعدة البيانات.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 hover:border-emerald-500/40 transition-colors shadow-2xs">
            <div className="p-2 bg-slate-500/10 text-slate-600 dark:text-slate-400 rounded-lg w-fit">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              6. قاعدة بيانات SQLite المحلية الآمنة
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              تخزين محلي فوري وآمن (WAL Mode) يضمن عمل المنظومة دون الحاجة لأي اتصال بالإنترنت، مع إمكانية أخذ نسخ احتياطية واسترجاعها بضغطة زر.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Engineering & Development Credits Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          <div className="space-y-3">
            <div className="text-xs text-amber-400 font-extrabold tracking-widest uppercase flex items-center justify-center md:justify-start gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>إشراف وتطوير المنظومة الرقمية</span>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs text-slate-400 font-medium">تم تصميم وبرمجة وتطوير المنظومة بواسطة:</div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                {sysInfo?.author || 'المهندس / أحمد محمد عطية'}
              </h3>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold">
                <Cpu className="w-3.5 h-3.5" />
                <span>مهندس تصميم الدوائر المتكاملة الرقمية وتطوير النظم البرمجية</span>
                <span className="text-[10px] text-emerald-500/80 font-mono">(Digital IC Design Engineer)</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 max-w-xl leading-relaxed pt-1">
              تم بناء هذه المنظومة بأحدث معايير الأداء البرمجي وقواعد البيانات المحلية المستقلة لتلبية متطلبات تقييم اللياقة البدنية والبدنية العسكرية بدقة وسرعة متناهية.
            </p>
          </div>

          <div className="shrink-0 bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-center space-y-1.5 min-w-[220px]">
            <div className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">
              جمهورية مصر العربية
            </div>
            <div className="text-xs font-black text-white">
              القوات المسلحة المصرية
            </div>
            <div className="text-[11px] text-slate-400">
              الكلية الحربية المصرية
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
              Performance Tracker Pro v{sysInfo?.version || '2.2.0'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

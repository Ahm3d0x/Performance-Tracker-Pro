import React, { useState } from 'react';
import { X, UserPlus, Check, Calculator } from 'lucide-react';
import {
  PersonRecord,
  AssessmentInput,
  ScoringSettings,
  PersonnelCategory,
  ForceType,
  AttendanceStatus,
  evaluatePersonAssessment,
} from '../utils/scoring';

interface QuickEntryModalProps {
  periodId: string;
  periodName: string;
  settings: ScoringSettings;
  nextSerialNum: number;
  initialPerson?: PersonRecord | null;
  initialInput?: AssessmentInput | null;
  onClose: () => void;
  onSaveNewOrUpdate: (
    person: Partial<PersonRecord>,
    assessment: AssessmentInput,
    isNew: boolean
  ) => Promise<void>;
}

export const QuickEntryModal: React.FC<QuickEntryModalProps> = ({
  periodId,
  periodName,
  settings,
  nextSerialNum,
  initialPerson,
  initialInput,
  onClose,
  onSaveNewOrUpdate,
}) => {
  const isNew = !initialPerson;

  const [serialNum, setSerialNum] = useState<number>(
    initialPerson?.serialNum || nextSerialNum
  );
  const [militaryId, setMilitaryId] = useState<string>(
    initialPerson?.militaryId || `${41000 + nextSerialNum}`
  );
  const [category, setCategory] = useState<PersonnelCategory>(
    initialPerson?.category || 'officers'
  );
  const [rank, setRank] = useState<string>(initialPerson?.rank || 'مقدم');
  const [name, setName] = useState<string>(initialPerson?.name || '');
  const [corps, setCorps] = useState<string>(initialPerson?.corps || 'مشاة');
  const [forceType, setForceType] = useState<ForceType>(
    initialPerson?.forceType || 'combat'
  );
  const [age, setAge] = useState<number>(initialPerson?.age || 35);
  const [weight, setWeight] = useState<string>(
    initialPerson?.weight ? String(initialPerson.weight) : '82'
  );
  const [height, setHeight] = useState<string>(
    initialPerson?.height ? String(initialPerson.height) : '180'
  );

  const [pullupsCount, setPullupsCount] = useState<number>(
    initialInput?.pullupsCount ?? 8
  );
  const [pushupsCount, setPushupsCount] = useState<number>(
    initialInput?.pushupsCount ?? 32
  );
  const [situpsCount, setSitupsCount] = useState<number>(
    initialInput?.situpsCount ?? 38
  );
  const [runCount, setRunCount] = useState<number>(
    initialInput?.runCount ?? 32
  );
  const [suburbTimeCode, setSuburbTimeCode] = useState<number>(
    initialInput?.suburbTimeCode ?? 2
  );
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>(
    initialInput?.attendanceStatus ?? 'tested'
  );
  const [exercisesNotes, setExercisesNotes] = useState<string>(
    initialInput?.exercisesNotes ?? ''
  );
  const [suburbNotes, setSuburbNotes] = useState<string>(
    initialInput?.suburbNotes ?? ''
  );

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const previewPerson: PersonRecord = {
    id: initialPerson?.id || 'temp',
    serialNum,
    militaryId,
    corps,
    rank,
    category,
    forceType,
    name: name || 'فرد جديد',
    age,
    weight: weight ? Number(weight) : null,
    height: height ? Number(height) : null,
  };

  const previewInput: AssessmentInput = {
    periodId,
    personId: previewPerson.id,
    stageOverride: initialInput?.stageOverride ?? null,
    pullupsCount,
    pushupsCount,
    situpsCount,
    runCount,
    suburbTimeCode,
    suburbMin: initialInput?.suburbMin ?? null,
    suburbSec: initialInput?.suburbSec ?? null,
    obstacleMin: initialInput?.obstacleMin ?? null,
    obstacleSec: initialInput?.obstacleSec ?? null,
    marchHours: initialInput?.marchHours ?? null,
    marchMin: initialInput?.marchMin ?? null,
    sprint100m: initialInput?.sprint100m ?? null,
    colleagueCarry: initialInput?.colleagueCarry ?? null,
    zigzagRun: initialInput?.zigzagRun ?? null,
    longJump: initialInput?.longJump ?? null,
    grenadeThrow: initialInput?.grenadeThrow ?? null,
    attendanceStatus,
    exercisesNotes,
    suburbNotes,
  };

  const previewEval = evaluatePersonAssessment(
    previewPerson,
    previewInput,
    settings
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('يرجى إدخال الاسم بالكامل قبل الحفظ');
      return;
    }
    setErrorMsg('');
    setSaving(true);
    try {
      await onSaveNewOrUpdate(previewPerson, previewInput, isNew);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-entry-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-3xl shadow-xl overflow-hidden my-6">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 id="quick-entry-title" className="text-base font-bold">
                {isNew
                  ? 'إضافة فرد جديد وتسجيل درجات الاختبار'
                  : `تعديل درجات: ${initialPerson.rank} / ${initialPerson.name}`}
              </h2>
              <p className="text-xs text-slate-300">{periodName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة الإدخال"
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
              {errorMsg}
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 mb-3">
              1. البيانات الأساسية والقياسات الجسمانية
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  الفئة
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const cat = e.target.value as PersonnelCategory;
                    setCategory(cat);
                    if (cat === 'officers' && rank.includes('رقيب')) {
                      setRank('نقيب');
                    } else if (cat === 'other_ranks' && !rank.includes('رقيب') && !rank.includes('مساعد')) {
                      setRank('رقيب أول');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                >
                  <option value="officers">أولاً: الضباط</option>
                  <option value="other_ranks">ثانياً: الدرجات الأخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  الرتبة / الدرجة
                </label>
                <input
                  type="text"
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  placeholder="مثال: عقيد أح / رقيب أول"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  الاسم بالكامل *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="أدخل الاسم الثلاثي أو الرباعي"
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  الرقم العسكري
                </label>
                <input
                  type="text"
                  value={militaryId}
                  onChange={(e) => setMilitaryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  السلاح
                </label>
                <input
                  type="text"
                  value={corps}
                  onChange={(e) => setCorps(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  السن (يحدد المرحلة تلقائياً)
                </label>
                <input
                  type="number"
                  min="18"
                  max="65"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value) || 25)}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    الوزن (كجم)
                  </label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    الطول (سم)
                  </label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Exercise & Suburb Scores */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-500">
                2. إدخال نتائج التمرينات والضاحية (المرحلة المحسوبة:{' '}
                <span className="text-emerald-700 dark:text-emerald-400">
                  {previewEval.stage.name}
                </span>
                )
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 dark:text-slate-400">
                  التمام:
                </label>
                <select
                  value={attendanceStatus}
                  onChange={(e) =>
                    setAttendanceStatus(e.target.value as AttendanceStatus)
                  }
                  className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 font-semibold"
                >
                  <option value="tested">مختبر</option>
                  <option value="medical">موقف طبى</option>
                  <option value="not_tested">لم يختبر</option>
                  <option value="mission">مأمورية</option>
                  <option value="leave">إجازة</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  عقلة (المطلوب: {previewEval.stage.pullupsMax})
                </label>
                <input
                  type="number"
                  min="0"
                  value={pullupsCount}
                  onChange={(e) => setPullupsCount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-sm font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                />
                <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                  الدرجة: <strong>{previewEval.pullupsScore}%</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ضغط (المطلوب: {previewEval.stage.pushupsMax})
                </label>
                <input
                  type="number"
                  min="0"
                  value={pushupsCount}
                  onChange={(e) => setPushupsCount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-sm font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                />
                <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                  الدرجة: <strong>{previewEval.pushupsScore}%</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  بطن (المطلوب: {previewEval.stage.situpsMax})
                </label>
                <input
                  type="number"
                  min="0"
                  value={situpsCount}
                  onChange={(e) => setSitupsCount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-sm font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                />
                <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                  الدرجة: <strong>{previewEval.situpsScore}%</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  جري معدل (المطلوب: {previewEval.stage.runMax})
                </label>
                <input
                  type="number"
                  min="0"
                  value={runCount}
                  onChange={(e) => setRunCount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-sm font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                />
                <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                  الدرجة: <strong>{previewEval.runScore}%</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  زمن الضاحية
                </label>
                <select
                  value={suburbTimeCode}
                  onChange={(e) => setSuburbTimeCode(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                >
                  {settings.suburbTimes.map((t) => (
                    <option key={t.code} value={t.code}>
                      زمن {t.code}: {t.label}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                  النتيجة: <strong>{previewEval.suburbScore}%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Live Calculated Summary Banner */}
          <div className="p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                المعاينة الفورية للنتيجة المحسوبة:
              </span>
            </div>
            <div className="flex items-center gap-6 text-xs font-mono tabular-nums">
              <div>
                <span className="text-slate-500">نسبة التمرينات: </span>
                <strong className="text-sm text-slate-900 dark:text-white">
                  {previewEval.exercisesPercentage}%
                </strong>
              </div>
              <div>
                <span className="text-slate-500">نتيجة الضاحية: </span>
                <strong className="text-sm text-slate-900 dark:text-white">
                  {previewEval.suburbScore}%
                </strong>
              </div>
              <div>
                <span className="text-slate-500">الإجمالي النهائي: </span>
                <strong className="text-base text-emerald-700 dark:text-emerald-400">
                  {previewEval.totalPercentage}% ({previewEval.totalGrade})
                </strong>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ البيانات والنتيجة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Printer,
  Edit3,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
} from 'lucide-react';
import {
  EvaluatedAssessment,
  ScoringSettings,
  PersonRecord,
  AssessmentInput,
  evaluatePersonAssessment,
} from '../utils/scoring';
import { PeriodRecord } from '../data/seedPersonnel';

interface PersonProfileModalProps {
  evaluatedItem: EvaluatedAssessment;
  periods: PeriodRecord[];
  activePeriodId: string;
  assessmentsByPeriod: Record<string, Record<string, AssessmentInput>>;
  allEvaluatedByPeriod: Record<string, EvaluatedAssessment[]>;
  settings: ScoringSettings;
  onClose: () => void;
  onSavePersonAndAssessment: (
    person: PersonRecord,
    assessment: AssessmentInput
  ) => Promise<void>;
}

export const PersonProfileModal: React.FC<PersonProfileModalProps> = ({
  evaluatedItem,
  periods,
  activePeriodId,
  assessmentsByPeriod,
  allEvaluatedByPeriod,
  settings,
  onClose,
  onSavePersonAndAssessment,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [personForm, setPersonForm] = useState<PersonRecord>({
    ...evaluatedItem.person,
  });
  const [inputForm, setInputForm] = useState<AssessmentInput>({
    ...evaluatedItem.input,
  });
  const [saving, setSaving] = useState(false);

  const livePreview = evaluatePersonAssessment(personForm, inputForm, settings);

  // Build historical timeline across all periods
  const historyRows = periods.map((per, idx) => {
    const periodEvalList = allEvaluatedByPeriod[per.id] || [];
    const found = periodEvalList.find(
      (item) => item.person.id === evaluatedItem.person.id
    );
    const prevPeriod = idx > 0 ? periods[idx - 1] : null;
    const prevEvalList = prevPeriod ? allEvaluatedByPeriod[prevPeriod.id] || [] : [];
    const prevFound = prevEvalList.find(
      (item) => item.person.id === evaluatedItem.person.id
    );

    let delta: number | null = null;
    if (found?.isTested && prevFound?.isTested) {
      delta =
        Math.round((found.totalPercentage - prevFound.totalPercentage) * 10) / 10;
    }

    return {
      period: per,
      evalData: found || null,
      delta,
    };
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSavePersonAndAssessment(personForm, inputForm);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="person-profile-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-5xl shadow-xl overflow-hidden my-8">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div>
            <div className="text-xs text-slate-300 mb-1">
              <span>ملف الفرد التفصيلي</span>
              <span className="mx-2">·</span>
              <span>رقم الأقدمية / المسلسل: {evaluatedItem.person.serialNum}</span>
              <span className="mx-2">·</span>
              <span>الرقم العسكري: {evaluatedItem.person.militaryId}</span>
            </div>
            <h2
              id="person-profile-title"
              className="text-xl font-bold tracking-tight flex items-center gap-2"
            >
              <span>{evaluatedItem.person.rank} /</span>
              <span>{evaluatedItem.person.name}</span>
            </h2>
          </div>

          <div className="flex items-center gap-2 no-print">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'إلغاء التعديل' : 'تعديل البيانات والدرجات'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة بطاقة الفرد</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق ملف الفرد"
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[82vh] overflow-y-auto space-y-6">
          {/* Top KPI Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">النسبة الإجمالية</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {livePreview.totalPercentage}%
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                التقدير: <strong className="text-emerald-700 dark:text-emerald-400">{livePreview.totalGrade}</strong>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">الترتيب العام وبالفئة</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {evaluatedItem.overallRank ? `#${evaluatedItem.overallRank}` : 'غير مرتب'}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                ترتيب {personForm.category === 'officers' ? 'الضباط' : 'الدرجات الأخرى'}:{' '}
                <span className="font-mono tabular-nums font-semibold">
                  {evaluatedItem.categoryRank ? `#${evaluatedItem.categoryRank}` : '-'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">نسبة التمرينات</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {livePreview.exercisesPercentage}%
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                المرحلة: {livePreview.stage.name} ({personForm.age} سنة)
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">اختبار الضاحية</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {livePreview.suburbScore}%
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                الزمن: {livePreview.suburbLabel}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">القياسات البدنية (BMI)</div>
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {personForm.weight ? `${personForm.weight} كجم` : '-'} /{' '}
                {personForm.height ? `${personForm.height} سم` : '-'}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                BMI: {livePreview.bmi ?? '-'} · {livePreview.bmiStatus}
              </div>
            </div>
          </div>

          {/* Interactive Edit Form if editing is enabled */}
          {isEditing && (
            <form
              onSubmit={handleSave}
              className="p-5 bg-emerald-50/40 dark:bg-slate-800/50 border border-emerald-200 dark:border-slate-700 rounded-xl space-y-4 no-print"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  تحديث البيانات الشخصية ودرجات الاختبار للفترة الحالية
                </h3>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات في قاعدة البيانات'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    الرتبة / الدرجة
                  </label>
                  <input
                    type="text"
                    value={personForm.rank}
                    onChange={(e) =>
                      setPersonForm({ ...personForm, rank: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    الاسم بالكامل
                  </label>
                  <input
                    type="text"
                    value={personForm.name}
                    onChange={(e) =>
                      setPersonForm({ ...personForm, name: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    السن (سنة)
                  </label>
                  <input
                    type="number"
                    value={personForm.age}
                    onChange={(e) =>
                      setPersonForm({
                        ...personForm,
                        age: Number(e.target.value) || 20,
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    الوزن (كجم)
                  </label>
                  <input
                    type="number"
                    value={personForm.weight ?? ''}
                    onChange={(e) =>
                      setPersonForm({
                        ...personForm,
                        weight: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    الطول (سم)
                  </label>
                  <input
                    type="number"
                    value={personForm.height ?? ''}
                    onChange={(e) =>
                      setPersonForm({
                        ...personForm,
                        height: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    عقلة (عدد)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={inputForm.pullupsCount}
                    onChange={(e) =>
                      setInputForm({
                        ...inputForm,
                        pullupsCount: Number(e.target.value) || 0,
                        attendanceStatus: 'tested',
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    ضغط (عدد)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={inputForm.pushupsCount}
                    onChange={(e) =>
                      setInputForm({
                        ...inputForm,
                        pushupsCount: Number(e.target.value) || 0,
                        attendanceStatus: 'tested',
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    بطن (عدد)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={inputForm.situpsCount}
                    onChange={(e) =>
                      setInputForm({
                        ...inputForm,
                        situpsCount: Number(e.target.value) || 0,
                        attendanceStatus: 'tested',
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    جري معدل (عدد)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={inputForm.runCount}
                    onChange={(e) =>
                      setInputForm({
                        ...inputForm,
                        runCount: Number(e.target.value) || 0,
                        attendanceStatus: 'tested',
                      })
                    }
                    className="w-full px-3 py-1.5 text-sm font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    كود زمن الضاحية
                  </label>
                  <select
                    value={inputForm.suburbTimeCode}
                    onChange={(e) => {
                      const code = Number(e.target.value);
                      setInputForm({
                        ...inputForm,
                        suburbTimeCode: code,
                        attendanceStatus:
                          code === 12
                            ? 'medical'
                            : code === 0
                            ? inputForm.attendanceStatus
                            : 'tested',
                      });
                    }}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  >
                    {settings.suburbTimes.map((t) => (
                      <option key={t.code} value={t.code}>
                        زمن {t.code}: {t.label} ({t.score}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    حالة التمام
                  </label>
                  <select
                    value={inputForm.attendanceStatus}
                    onChange={(e) =>
                      setInputForm({
                        ...inputForm,
                        attendanceStatus: e.target.value as any,
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  >
                    <option value="tested">مختبر</option>
                    <option value="medical">موقف طبى</option>
                    <option value="not_tested">لم يختبر</option>
                    <option value="mission">مأمورية</option>
                    <option value="leave">إجازة</option>
                    <option value="course">فرقة</option>
                  </select>
                </div>
              </div>
            </form>
          )}

          {/* Two-column detailed metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: 4 Core Exercises & Cross-country breakdown */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                تفصيل درجات التمرينات والضاحية ({livePreview.stage.name})
              </h3>
              <div className="space-y-4">
                {[
                  {
                    label: 'تمرين العقلة',
                    count: livePreview.input.pullupsCount,
                    max: livePreview.stage.pullupsMax,
                    score: livePreview.pullupsScore,
                  },
                  {
                    label: 'تمرين الضغط',
                    count: livePreview.input.pushupsCount,
                    max: livePreview.stage.pushupsMax,
                    score: livePreview.pushupsScore,
                  },
                  {
                    label: 'تمرين البطن',
                    count: livePreview.input.situpsCount,
                    max: livePreview.stage.situpsMax,
                    score: livePreview.situpsScore,
                  },
                  {
                    label: 'الجري المعدل',
                    count: livePreview.input.runCount,
                    max: livePreview.stage.runMax,
                    score: livePreview.runScore,
                  },
                ].map((ex) => (
                  <div key={ex.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {ex.label}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        العدد:{' '}
                        <strong className="font-mono tabular-nums">{ex.count}</strong> من{' '}
                        <span className="font-mono tabular-nums">{ex.max}</span> · الدرجة:{' '}
                        <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
                          {ex.score}%
                        </strong>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 transition-all"
                        style={{ width: `${Math.min(100, ex.score)}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    اختبار الضاحية ({livePreview.suburbLabel})
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    <span className="font-mono tabular-nums">{livePreview.suburbScore}%</span> ({livePreview.suburbGrade})
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Additional Military Skills & Physical Metrics */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                المهارات العسكرية والبيانات التفصيلية
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex justify-between">
                  <span className="text-slate-500">السلاح / التخصص:</span>
                  <span className="font-semibold">{personForm.corps}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex justify-between">
                  <span className="text-slate-500">اجتياز الموانع:</span>
                  <span className="font-semibold">
                    {inputForm.obstacleMin !== null ? (
                      <>
                        <span className="font-mono tabular-nums">
                          {inputForm.obstacleMin}:{String(inputForm.obstacleSec || 0).padStart(2, '0')}
                        </span>{' '}
                        دقيقة
                      </>
                    ) : (
                      'غير مسجل'
                    )}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex justify-between">
                  <span className="text-slate-500">طابور السير:</span>
                  <span className="font-semibold">
                    {inputForm.marchHours !== null ? (
                      <>
                        <span className="font-mono tabular-nums">{inputForm.marchHours}</span> س{' '}
                        <span className="font-mono tabular-nums">{inputForm.marchMin || 0}</span> ق
                      </>
                    ) : (
                      'غير مسجل'
                    )}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex justify-between">
                  <span className="text-slate-500">عدو 100 متر:</span>
                  <span className="font-semibold">
                    {inputForm.sprint100m ? (
                      <>
                        <span className="font-mono tabular-nums">{inputForm.sprint100m}</span> ثانية
                      </>
                    ) : (
                      '-'
                    )}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex justify-between">
                  <span className="text-slate-500">حمل الزميل:</span>
                  <span className="font-semibold">
                    {inputForm.colleagueCarry ? (
                      <>
                        <span className="font-mono tabular-nums">{inputForm.colleagueCarry}</span> ثانية
                      </>
                    ) : (
                      '-'
                    )}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex justify-between">
                  <span className="text-slate-500">الجري الزجزاجي:</span>
                  <span className="font-semibold">
                    {inputForm.zigzagRun ? (
                      <>
                        <span className="font-mono tabular-nums">{inputForm.zigzagRun}</span> ثانية
                      </>
                    ) : (
                      '-'
                    )}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex justify-between">
                  <span className="text-slate-500">الوثب الطويل:</span>
                  <span className="font-semibold">
                    {inputForm.longJump ? (
                      <>
                        <span className="font-mono tabular-nums">{inputForm.longJump}</span> متر
                      </>
                    ) : (
                      '-'
                    )}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex justify-between">
                  <span className="text-slate-500">قذف القنابل:</span>
                  <span className="font-semibold">
                    {inputForm.grenadeThrow ? (
                      <>
                        <span className="font-mono tabular-nums">{inputForm.grenadeThrow}</span> متر
                      </>
                    ) : (
                      '-'
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Comparison Across All Periods */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>سجل مقارنة المستوى عبر الفترات التدريبية</span>
              </h3>
              <span className="text-xs text-slate-500">
                مقارنة كل فترة بالتي قبلها
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">الفترة التدريبية</th>
                    <th className="py-2.5 px-3 font-semibold text-center">التاريخ</th>
                    <th className="py-2.5 px-3 font-semibold text-center">الترتيب العام</th>
                    <th className="py-2.5 px-3 font-semibold text-center">نسبة التمرينات</th>
                    <th className="py-2.5 px-3 font-semibold text-center">نتيجة الضاحية</th>
                    <th className="py-2.5 px-3 font-semibold text-center">الإجمالي العام</th>
                    <th className="py-2.5 px-3 font-semibold text-center">التقدير</th>
                    <th className="py-2.5 px-4 font-semibold text-center">
                      المقارنة بالفترة السابقة
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {historyRows.map((row) => {
                    const isCurrent = row.period.id === activePeriodId;
                    const ev = row.evalData;
                    return (
                      <tr
                        key={row.period.id}
                        className={
                          isCurrent
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 font-medium'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }
                      >
                        <td className="py-2.5 px-4">
                          <span>{row.period.name}</span>
                          {isCurrent && (
                            <span className="mr-2 text-emerald-700 dark:text-emerald-400 text-[11px]">
                              (الفترة النشطة)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-500">
                          {row.period.date}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold">
                          {ev?.overallRank ? `#${ev.overallRank}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                          {ev ? `${ev.exercisesPercentage}%` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {ev ? (
                            <>
                              <span className="font-mono tabular-nums">{ev.suburbScore}%</span> ({ev.suburbLabel})
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {ev ? `${ev.totalPercentage}%` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {ev?.totalGrade || '-'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {row.delta === null ? (
                            <span className="text-slate-400">فترة الأساس</span>
                          ) : row.delta > 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span className="font-mono tabular-nums">+{row.delta}%</span> تحسن
                            </span>
                          ) : row.delta < 0 ? (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                              <TrendingDown className="w-3.5 h-3.5" />
                              <span className="font-mono tabular-nums">{row.delta}%</span> تراجع
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <Minus className="w-3.5 h-3.5" />
                              <span className="font-mono tabular-nums">0.0%</span> ثبات
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  Edit3,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  User,
  Users,
  Calendar,
  Activity,
  CheckCircle2,
  AlertCircle,
  Percent,
} from 'lucide-react';
import {
  EvaluatedAssessment,
  ScoringSettings,
  PersonRecord,
  AssessmentInput,
  evaluatePersonAssessment,
} from '../utils/scoring';
import { PeriodRecord } from '../data/seedPersonnel';
import {
  downloadStandaloneIndividualCardHtml,
  printStandaloneIndividualCardDirectly,
} from '../utils/exportFile';

interface PersonProfileModalProps {
  evaluatedItem: EvaluatedAssessment;
  periods: PeriodRecord[];
  activePeriodId: string;
  assessmentsByPeriod: Record<string, Record<string, AssessmentInput>>;
  allEvaluatedByPeriod: Record<string, EvaluatedAssessment[]>;
  settings: ScoringSettings;
  allPersonnelInPeriod?: EvaluatedAssessment[];
  onSelectPerson?: (item: EvaluatedAssessment) => void;
  onClose: () => void;
  onSavePersonAndAssessment: (
    person: PersonRecord,
    assessment: AssessmentInput
  ) => Promise<void>;
}

type ProfileTab = 'overview' | 'charts' | 'comparison' | 'edit';

export const PersonProfileModal: React.FC<PersonProfileModalProps> = ({
  evaluatedItem,
  periods,
  activePeriodId,
  assessmentsByPeriod,
  allEvaluatedByPeriod,
  settings,
  allPersonnelInPeriod = [],
  onSelectPerson,
  onClose,
  onSavePersonAndAssessment,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [personForm, setPersonForm] = useState<PersonRecord>({
    ...evaluatedItem.person,
  });
  const [inputForm, setInputForm] = useState<AssessmentInput>({
    ...evaluatedItem.input,
  });
  const [saving, setSaving] = useState(false);

  // Sync state if evaluatedItem changes via navigation
  React.useEffect(() => {
    setPersonForm({ ...evaluatedItem.person });
    setInputForm({ ...evaluatedItem.input });
  }, [evaluatedItem]);

  React.useEffect(() => {
    document.body.classList.add('has-modal-open');
    return () => {
      document.body.classList.remove('has-modal-open');
    };
  }, []);

  const livePreview = evaluatePersonAssessment(personForm, inputForm, settings);

  // Build historical timeline across all periods
  const historyRows = useMemo(() => {
    return periods.map((per, idx) => {
      const periodEvalList = allEvaluatedByPeriod[per.id] || [];
      const found = periodEvalList.find(
        (item) => item.person.id === evaluatedItem.person.id
      );
      const prevPeriod = idx > 0 ? periods[idx - 1] : null;
      const prevEvalList = prevPeriod
        ? allEvaluatedByPeriod[prevPeriod.id] || []
        : [];
      const prevFound = prevEvalList.find(
        (item) => item.person.id === evaluatedItem.person.id
      );

      let delta: number | null = null;
      if (found?.isTested && prevFound?.isTested) {
        delta =
          Math.round((found.totalPercentage - prevFound.totalPercentage) * 10) /
          10;
      }

      // Unit average for this period
      const testedPeriodList = periodEvalList.filter((p) => p.isTested);
      const unitAvg =
        testedPeriodList.length > 0
          ? Math.round(
              (testedPeriodList.reduce((acc, p) => acc + p.totalPercentage, 0) /
                testedPeriodList.length) *
                10
            ) / 10
          : null;

      return {
        period: per,
        evalData: found || null,
        delta,
        unitAvg,
      };
    });
  }, [periods, allEvaluatedByPeriod, evaluatedItem.person.id]);

  const activePeriod =
    periods.find((per) => per.id === activePeriodId) || periods[0];

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        printStandaloneIndividualCardDirectly(
          personForm,
          livePreview,
          historyRows,
          activePeriod,
          settings
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [personForm, livePreview, historyRows, activePeriod, settings]);

  // Navigation between persons
  const currentIndex = allPersonnelInPeriod.findIndex(
    (p) => p.person.id === evaluatedItem.person.id
  );
  const prevPerson =
    currentIndex > 0 ? allPersonnelInPeriod[currentIndex - 1] : null;
  const nextPerson =
    currentIndex >= 0 && currentIndex < allPersonnelInPeriod.length - 1
      ? allPersonnelInPeriod[currentIndex + 1]
      : null;

  // Unit Statistics & Benchmarks in active period
  const unitStats = useMemo(() => {
    const testedList = allPersonnelInPeriod.filter((p) => p.isTested);
    if (testedList.length === 0) {
      return {
        avgTotal: 0,
        avgExercises: 0,
        avgSuburb: 0,
        avgPullups: 0,
        avgPushups: 0,
        avgSitups: 0,
        avgRun: 0,
        categoryAvgTotal: 0,
        totalStrength: allPersonnelInPeriod.length,
        testedCount: 0,
      };
    }
    const sumTotal = testedList.reduce((acc, p) => acc + p.totalPercentage, 0);
    const sumEx = testedList.reduce((acc, p) => acc + p.exercisesPercentage, 0);
    const sumSub = testedList.reduce((acc, p) => acc + p.suburbScore, 0);
    const sumPull = testedList.reduce((acc, p) => acc + p.pullupsScore, 0);
    const sumPush = testedList.reduce((acc, p) => acc + p.pushupsScore, 0);
    const sumSit = testedList.reduce((acc, p) => acc + p.situpsScore, 0);
    const sumRun = testedList.reduce((acc, p) => acc + p.runScore, 0);

    const categoryList = testedList.filter(
      (p) => p.person.category === evaluatedItem.person.category
    );
    const categoryAvg =
      categoryList.length > 0
        ? categoryList.reduce((acc, p) => acc + p.totalPercentage, 0) /
          categoryList.length
        : 0;

    return {
      avgTotal: Math.round((sumTotal / testedList.length) * 10) / 10,
      avgExercises: Math.round((sumEx / testedList.length) * 10) / 10,
      avgSuburb: Math.round((sumSub / testedList.length) * 10) / 10,
      avgPullups: Math.round((sumPull / testedList.length) * 10) / 10,
      avgPushups: Math.round((sumPush / testedList.length) * 10) / 10,
      avgSitups: Math.round((sumSit / testedList.length) * 10) / 10,
      avgRun: Math.round((sumRun / testedList.length) * 10) / 10,
      categoryAvgTotal: Math.round(categoryAvg * 10) / 10,
      totalStrength: allPersonnelInPeriod.length,
      testedCount: testedList.length,
    };
  }, [allPersonnelInPeriod, evaluatedItem.person.category]);

  // Percentile Rank
  const percentile = useMemo(() => {
    if (!livePreview.isTested || unitStats.testedCount === 0) return 0;
    const lowerCount = allPersonnelInPeriod.filter(
      (p) => p.isTested && p.totalPercentage < livePreview.totalPercentage
    ).length;
    return Math.round((lowerCount / unitStats.testedCount) * 100);
  }, [allPersonnelInPeriod, livePreview.isTested, livePreview.totalPercentage, unitStats.testedCount]);

  // Historical Lifetime Rates
  const validHistory = historyRows.filter(
    (h) => h.evalData && h.evalData.isTested
  );
  const avgLifetimePercentage =
    validHistory.length > 0
      ? Math.round(
          (validHistory.reduce(
            (acc, h) => acc + (h.evalData?.totalPercentage || 0),
            0
          ) /
            validHistory.length) *
            10
        ) / 10
      : 0;

  const peakPeriod = validHistory.reduce(
    (max, h) =>
      !max || (h.evalData?.totalPercentage || 0) > (max.evalData?.totalPercentage || 0)
        ? h
        : max,
    validHistory[0] || null
  );

  const cumulativeImprovement =
    validHistory.length >= 2
      ? Math.round(
          ((validHistory[validHistory.length - 1].evalData?.totalPercentage || 0) -
            (validHistory[0].evalData?.totalPercentage || 0)) *
            10
        ) / 10
      : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSavePersonAndAssessment(personForm, inputForm);
      setActiveTab('overview');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-2xs print:bg-transparent p-2 sm:p-4 print:p-0 overflow-y-auto print:overflow-visible"
      role="dialog"
      aria-modal="true"
      aria-labelledby="person-profile-title"
    >
      <div className="bg-white dark:bg-slate-900 print:bg-white text-slate-900 dark:text-slate-100 print:text-black border border-slate-200 dark:border-slate-800 print:border-none rounded-2xl print:rounded-none w-full max-w-6xl print:max-w-none shadow-2xl print:shadow-none overflow-hidden print:overflow-visible my-4 print:my-0 flex flex-col max-h-[94vh]">
        {/* Top Control Bar (Screen only) */}
        <div className="bg-slate-900 text-white p-4 no-print shrink-0 space-y-3 border-b border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Person Title & Identity Badges */}
            <div className="flex items-center gap-3">
              {/* Navigation prev/next buttons */}
              {onSelectPerson && (
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    disabled={!prevPerson}
                    onClick={() => prevPerson && onSelectPerson(prevPerson)}
                    title={
                      prevPerson
                        ? `السابق: ${prevPerson.person.rank} / ${prevPerson.person.name}`
                        : 'لا يوجد فرد سابق'
                    }
                    className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono px-1.5 text-slate-300">
                    {currentIndex >= 0
                      ? `${currentIndex + 1} / ${allPersonnelInPeriod.length}`
                      : '-'}
                  </span>
                  <button
                    type="button"
                    disabled={!nextPerson}
                    onClick={() => nextPerson && onSelectPerson(nextPerson)}
                    title={
                      nextPerson
                        ? `التالي: ${nextPerson.person.rank} / ${nextPerson.person.name}`
                        : 'لا يوجد فرد تالٍ'
                    }
                    className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>مسلسل #{evaluatedItem.person.serialNum}</span>
                  <span>·</span>
                  <span>ر.ع: {evaluatedItem.person.militaryId}</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-semibold">
                    {evaluatedItem.person.corps}
                  </span>
                </div>
                <h2
                  id="person-profile-title"
                  className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2"
                >
                  <span>{evaluatedItem.person.rank} /</span>
                  <span>{evaluatedItem.person.name}</span>
                </h2>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  printStandaloneIndividualCardDirectly(
                    personForm,
                    livePreview,
                    historyRows,
                    activePeriod,
                    settings
                  )
                }
                className="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>طباعة بطاقة A4</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadStandaloneIndividualCardHtml(
                    personForm,
                    livePreview,
                    historyRows,
                    activePeriod,
                    settings
                  )
                }
                className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير ملف A4</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق ملف الفرد"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab Navigation Strip */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>ملف الأداء والبيانات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('charts')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'charts'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>الرسومات البيانية ومسار التطور</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'comparison'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>مقارنة الفرد بالوحدة والأقران</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-colors flex items-center gap-1.5 mr-auto cursor-pointer ${
                activeTab === 'edit'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>تعديل الدرجات والبيانات</span>
            </button>
          </div>
        </div>

        {/* Dedicated Official Military Header for A4 Print (Visible ONLY when printing) */}
        <div className="hidden print:block p-3 border-b-2 border-slate-900 mb-2">
          <div className="flex justify-between items-start text-[10px] leading-tight">
            <div className="font-bold space-y-0.5">
              <div>{settings.ministryHeader || 'وزارة الدفاع'}</div>
              <div>{settings.authorityHeader || 'هيئة تدريب القوات المسلحة'}</div>
              <div>{settings.branchHeader || 'فرع التربية الرياضية'}</div>
              <div>الوحدة: {settings.unitName}</div>
            </div>
            <div className="text-center">
              <h1 className="text-sm font-bold text-slate-900 mb-0.5">
                بطاقة تقييم واختبار اللياقة البدنية والبدنية العسكرية
              </h1>
              <p className="text-[10px] font-semibold text-slate-700">
                الفترة: {activePeriod?.name} · التاريخ: {activePeriod?.date}
              </p>
              <p className="text-[9px] text-slate-500">
                اختبار لصالح: {activePeriod?.beneficiary}
              </p>
            </div>
            <div className="text-left font-mono tabular-nums text-[9.5px] space-y-0.5">
              <div><strong>الرقم العسكري:</strong> {personForm.militaryId}</div>
              <div><strong>المسلسل العام:</strong> #{personForm.serialNum}</div>
              <div><strong>تاريخ الرصد:</strong> {activePeriod?.date}</div>
              <div><strong>طُبعت بتاريخ:</strong> {new Date().toLocaleDateString('ar-EG')}</div>
            </div>
          </div>

          <table className="w-full mt-2 border-collapse border border-slate-900 text-[10px]">
            <tbody>
              <tr>
                <td className="bg-slate-100 font-bold p-1 border border-slate-400 w-24">الرتبة / الدرجة:</td>
                <td className="font-bold p-1 border border-slate-400">{personForm.rank}</td>
                <td className="bg-slate-100 font-bold p-1 border border-slate-400 w-24">الاسم بالكامل:</td>
                <td className="font-bold p-1 border border-slate-400" colSpan={3}>{personForm.name}</td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-bold p-1 border border-slate-400">السلاح / التخصص:</td>
                <td className="font-semibold p-1 border border-slate-400">{personForm.corps}</td>
                <td className="bg-slate-100 font-bold p-1 border border-slate-400">السن والمرحلة:</td>
                <td className="font-semibold p-1 border border-slate-400">{personForm.age} سنة ({livePreview.stage.name})</td>
                <td className="bg-slate-100 font-bold p-1 border border-slate-400">القوة والتصنيف:</td>
                <td className="font-semibold p-1 border border-slate-400">
                  {personForm.category === 'officers' ? 'ضباط عاملون' : 'درجات أخرى'} · {personForm.forceType === 'combat' ? 'ميدان' : 'إداري'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 print:p-0 overflow-y-auto flex-1 space-y-6 print:space-y-2">
          {/* Top KPI Strip (Always visible) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-xs text-slate-500 mb-1">النسبة الإجمالية العامة</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {livePreview.totalPercentage}%
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                التقدير: <strong className="text-emerald-700 dark:text-emerald-400">{livePreview.totalGrade}</strong>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-xs text-slate-500 mb-1">الترتيب العام وبالفئة</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {evaluatedItem.overallRank ? `#${evaluatedItem.overallRank}` : '-'}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                ترتيب {personForm.category === 'officers' ? 'الضباط' : 'الدرجات الأخرى'}:{' '}
                <span className="font-mono tabular-nums font-semibold">
                  {evaluatedItem.categoryRank ? `#${evaluatedItem.categoryRank}` : '-'}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-xs text-slate-500 mb-1">نتيجة التمرينات البدنية</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {livePreview.exercisesPercentage}%
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                المرحلة: {livePreview.stage.name} ({personForm.age} سنة)
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-xs text-slate-500 mb-1">اختبار الضاحية</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {livePreview.suburbScore}%
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                الزمن: {livePreview.suburbLabel}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-xs text-slate-500 mb-1">تناسق القوام والبدنية (BMI)</div>
              <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {personForm.weight ? `${personForm.weight} كجم` : '-'} /{' '}
                {personForm.height ? `${personForm.height} سم` : '-'}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                BMI: {livePreview.bmi ?? '-'} ({livePreview.bmiStatus})
              </div>
            </div>
          </div>

          {/* TAB 1: OVERVIEW & SCORES */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Benchmark Pill */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-600 text-white rounded-lg">
                    <Award className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="font-bold text-emerald-950 dark:text-emerald-200">
                      موقع الفرد في قوة الوحدة:
                    </span>
                    <span className="mr-1 text-slate-700 dark:text-slate-300">
                      يتفوق على <strong>{percentile}%</strong> من إجمالي أفراد الوحدة المختبرين (متوسط الوحدة: {unitStats.avgTotal}%).
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono font-semibold text-emerald-800 dark:text-emerald-300">
                  <span>الفارق عن الوحدة: {livePreview.totalPercentage >= unitStats.avgTotal ? `+${Math.round((livePreview.totalPercentage - unitStats.avgTotal) * 10) / 10}%` : `${Math.round((livePreview.totalPercentage - unitStats.avgTotal) * 10) / 10}%`}</span>
                  <span>·</span>
                  <span>متوسط فئة {personForm.category === 'officers' ? 'الضباط' : 'الدرجات'}: {unitStats.categoryAvgTotal}%</span>
                </div>
              </div>

              {/* Two columns: Core Exercises vs Military Skills */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-3">
                {/* Core Exercises Table */}
                <div className="bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      أولاً: تفصيل نتائج التمرينات الأساسية والضاحية
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      وفقاً لمعايير {livePreview.stage.name}
                    </span>
                  </div>

                  <table className="w-full text-xs border-collapse">
                    <thead className="text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-1.5 px-2 text-right">نوع الاختبار</th>
                        <th className="py-1.5 px-2 text-center">المطلوب</th>
                        <th className="py-1.5 px-2 text-center">المحقق</th>
                        <th className="py-1.5 px-2 text-center">النسبة</th>
                        <th className="py-1.5 px-2 text-center">التقدير</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      <tr>
                        <td className="py-2 px-2 font-semibold">تمرين العقلة (الشد)</td>
                        <td className="py-2 px-2 text-center font-mono">{livePreview.stage.pullupsMax} عدات</td>
                        <td className="py-2 px-2 text-center font-mono font-bold">{livePreview.input.pullupsCount} عدة</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">{livePreview.pullupsScore}%</td>
                        <td className="py-2 px-2 text-center font-semibold">{livePreview.pullupsScore >= 85 ? 'ممتاز' : livePreview.pullupsScore >= 70 ? 'جيد جداً' : livePreview.pullupsScore >= 50 ? 'جيد' : 'ضعيف'}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 font-semibold">تمرين الضغط (ثني الذراعين)</td>
                        <td className="py-2 px-2 text-center font-mono">{livePreview.stage.pushupsMax} عدات</td>
                        <td className="py-2 px-2 text-center font-mono font-bold">{livePreview.input.pushupsCount} عدة</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">{livePreview.pushupsScore}%</td>
                        <td className="py-2 px-2 text-center font-semibold">{livePreview.pushupsScore >= 85 ? 'ممتاز' : livePreview.pushupsScore >= 70 ? 'جيد جداً' : livePreview.pushupsScore >= 50 ? 'جيد' : 'ضعيف'}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 font-semibold">تمرين البطن (رفع الجذع)</td>
                        <td className="py-2 px-2 text-center font-mono">{livePreview.stage.situpsMax} عدات</td>
                        <td className="py-2 px-2 text-center font-mono font-bold">{livePreview.input.situpsCount} عدة</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">{livePreview.situpsScore}%</td>
                        <td className="py-2 px-2 text-center font-semibold">{livePreview.situpsScore >= 85 ? 'ممتاز' : livePreview.situpsScore >= 70 ? 'جيد جداً' : livePreview.situpsScore >= 50 ? 'جيد' : 'ضعيف'}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 font-semibold">الجري المعدل (تغيير اتجاه)</td>
                        <td className="py-2 px-2 text-center font-mono">{livePreview.stage.runMax} دورة</td>
                        <td className="py-2 px-2 text-center font-mono font-bold">{livePreview.input.runCount} دورة</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">{livePreview.runScore}%</td>
                        <td className="py-2 px-2 text-center font-semibold">{livePreview.runScore >= 85 ? 'ممتاز' : livePreview.runScore >= 70 ? 'جيد جداً' : livePreview.runScore >= 50 ? 'جيد' : 'ضعيف'}</td>
                      </tr>
                      <tr className="bg-emerald-50/70 dark:bg-emerald-950/30">
                        <td className="py-2.5 px-2 font-bold">اختبار الضاحية (المسافات)</td>
                        <td className="py-2.5 px-2 text-center font-mono">21:30 ق</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold">{livePreview.suburbLabel}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-800 dark:text-emerald-300">{livePreview.suburbScore}%</td>
                        <td className="py-2.5 px-2 text-center font-bold text-emerald-800 dark:text-emerald-300">{livePreview.suburbGrade}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Military Field Skills & Body Composition */}
                <div className="bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      ثانياً: المهارات العسكرية الميدانية وتناسق القوام
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      الرقم العسكري: {personForm.militaryId}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">اجتياز الموانع:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {livePreview.input.obstacleMin !== null
                          ? `${livePreview.input.obstacleMin}:${String(livePreview.input.obstacleSec || 0).padStart(2, '0')} ق`
                          : 'غير مسجل'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">طابور السير:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {livePreview.input.marchHours !== null
                          ? `${livePreview.input.marchHours} س ${livePreview.input.marchMin || 0} ق`
                          : 'غير مسجل'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">عدو 100 متر:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {livePreview.input.sprint100m ? `${livePreview.input.sprint100m} ث` : '-'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">حمل الزميل:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {livePreview.input.colleagueCarry ? `${livePreview.input.colleagueCarry} ث` : '-'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">الجري الزجزاجي:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {livePreview.input.zigzagRun ? `${livePreview.input.zigzagRun} ث` : '-'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">الوثب العريض:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {livePreview.input.longJump ? `${livePreview.input.longJump} م` : '-'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">قذف القنابل:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {livePreview.input.grenadeThrow ? `${livePreview.input.grenadeThrow} م` : '-'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">التمام والموقف:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {livePreview.input.attendanceStatus === 'tested'
                          ? 'مختبر وحاضر'
                          : livePreview.input.attendanceStatus === 'medical'
                          ? 'موقف طبي رسمي'
                          : 'غير مختبر'}
                      </span>
                    </div>
                  </div>

                  {/* Notes if present */}
                  {(livePreview.input.exercisesNotes || livePreview.input.suburbNotes) && (
                    <div className="p-2.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs text-amber-900 dark:text-amber-200">
                      <strong>ملاحظات الرصد:</strong>{' '}
                      {[livePreview.input.exercisesNotes, livePreview.input.suburbNotes]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHARTS & HISTORICAL PROGRESSION */}
          {activeTab === 'charts' && (
            <div className="space-y-6">
              {/* Career Performance Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="text-slate-500 mb-1">المعدل العام عبر الفترات</div>
                  <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                    {avgLifetimePercentage}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    متوسط {validHistory.length} فترة مختبرة
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="text-slate-500 mb-1">أعلى مستوى محقق (الذروة)</div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {peakPeriod?.evalData?.totalPercentage || '-'}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {peakPeriod ? `${peakPeriod.period.name}` : '-'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="text-slate-500 mb-1">التحسن التراكمي</div>
                  <div className="text-xl font-bold font-mono flex items-center gap-1">
                    {cumulativeImprovement === null ? (
                      <span className="text-slate-400">-</span>
                    ) : cumulativeImprovement > 0 ? (
                      <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                        <TrendingUp className="w-4 h-4" />
                        +{cumulativeImprovement}%
                      </span>
                    ) : cumulativeImprovement < 0 ? (
                      <span className="text-red-600 flex items-center gap-0.5">
                        <TrendingDown className="w-4 h-4" />
                        {cumulativeImprovement}%
                      </span>
                    ) : (
                      <span className="text-slate-500">0.0%</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    من أول فترة حتى الحالية
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="text-slate-500 mb-1">مرات الحصول على امتياز</div>
                  <div className="text-xl font-bold font-mono text-amber-600">
                    {validHistory.filter((h) => h.evalData && h.evalData.totalGrade === 'ممتاز').length} مرات
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    تقدير 85% فما فوق
                  </div>
                </div>
              </div>

              {/* Interactive SVG Timeline Trend Chart */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-emerald-600" />
                      <span>منحنى تطور النسبة الإجمالية للفرد عبر الفترات التدريبية</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      مقارنة أداء الفرد الزمني (الخط الأخضر) مقابل متوسط أفراد الوحدة (الخط المتقطع)
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <span className="w-3 h-3 bg-emerald-600 rounded-full inline-block" />
                      <span>نسبة الفرد %</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-3 h-0.5 bg-slate-400 border border-dashed inline-block" />
                      <span>متوسط الوحدة %</span>
                    </span>
                  </div>
                </div>

                {/* SVG Visual Canvas */}
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[600px] h-64 p-2 relative">
                    <svg viewBox="0 0 700 240" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="personGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Threshold Guide Lines */}
                      {/* 100% */}
                      <line x1="60" y1="30" x2="680" y2="30" stroke="#e2e8f0" strokeDasharray="3 3" />
                      <text x="50" y="34" textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="monospace">100%</text>

                      {/* 85% (Excellent) */}
                      <line x1="60" y1="60" x2="680" y2="60" stroke="#a7f3d0" strokeDasharray="2 2" />
                      <text x="50" y="64" textAnchor="end" fontSize="10" fill="#059669" fontFamily="monospace">85%</text>

                      {/* 50% (Pass) */}
                      <line x1="60" y1="130" x2="680" y2="130" stroke="#fed7aa" strokeDasharray="2 2" />
                      <text x="50" y="134" textAnchor="end" fontSize="10" fill="#ea580c" fontFamily="monospace">50%</text>

                      {/* Timeline Points & Lines */}
                      {(() => {
                        const count = historyRows.length;
                        if (count === 0) return null;
                        const startX = 100;
                        const endX = 640;
                        const stepX = count > 1 ? (endX - startX) / (count - 1) : 0;

                        // Coordinate calculator (Y: 100% -> 30px, 0% -> 220px)
                        const getY = (val: number) => 220 - (val / 100) * 190;

                        const personPoints = historyRows.map((h, i) => ({
                          x: count === 1 ? 370 : startX + i * stepX,
                          y: getY(h.evalData?.totalPercentage || 0),
                          val: h.evalData?.totalPercentage || 0,
                          isTested: h.evalData?.isTested || false,
                          label: h.period.name,
                          date: h.period.date,
                          unitAvg: h.unitAvg || 0,
                        }));

                        const personLinePath = personPoints
                          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                          .join(' ');

                        const areaPath = `${personLinePath} L ${personPoints[personPoints.length - 1].x} 220 L ${personPoints[0].x} 220 Z`;

                        const unitLinePath = personPoints
                          .filter((p) => p.unitAvg > 0)
                          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${getY(p.unitAvg)}`)
                          .join(' ');

                        return (
                          <>
                            {/* Area Gradient Under Curve */}
                            <path d={areaPath} fill="url(#personGrad)" />

                            {/* Unit Average Dashed Line */}
                            {unitLinePath && (
                              <path
                                d={unitLinePath}
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="2"
                                strokeDasharray="4 4"
                              />
                            )}

                            {/* Person Line Path */}
                            <path
                              d={personLinePath}
                              fill="none"
                              stroke="#059669"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />

                            {/* Circles and Data Labels */}
                            {personPoints.map((pt, idx) => (
                              <g key={idx}>
                                {/* Unit Avg Point */}
                                {pt.unitAvg > 0 && (
                                  <circle
                                    cx={pt.x}
                                    cy={getY(pt.unitAvg)}
                                    r="3"
                                    fill="#94a3b8"
                                  />
                                )}

                                {/* Person Point */}
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="6"
                                  fill="#fff"
                                  stroke="#059669"
                                  strokeWidth="3"
                                />

                                {/* Score Value Badge */}
                                <rect
                                  x={pt.x - 22}
                                  y={pt.y - 24}
                                  width="44"
                                  height="18"
                                  rx="4"
                                  fill="#0f172a"
                                />
                                <text
                                  x={pt.x}
                                  y={pt.y - 12}
                                  textAnchor="middle"
                                  fontSize="10"
                                  fontWeight="bold"
                                  fill="#ffffff"
                                  fontFamily="monospace"
                                >
                                  {pt.val}%
                                </text>

                                {/* Period Label on X Axis */}
                                <text
                                  x={pt.x}
                                  y={235}
                                  textAnchor="middle"
                                  fontSize="9.5"
                                  fontWeight="600"
                                  fill="#475569"
                                >
                                  {pt.label}
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
              </div>

              {/* Historical Log Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    سجل الفترات التفصيلي وتاريخ الأداء
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    عدد الفترات: {historyRows.length} فترة
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse text-center">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="py-2.5 px-3 text-right">الفترة التدريبية</th>
                        <th className="py-2.5 px-2">التاريخ</th>
                        <th className="py-2.5 px-2">الترتيب العام</th>
                        <th className="py-2.5 px-2">نتيجة التمرينات</th>
                        <th className="py-2.5 px-2">نتيجة الضاحية</th>
                        <th className="py-2.5 px-2">الإجمالي العام</th>
                        <th className="py-2.5 px-2">التقدير</th>
                        <th className="py-2.5 px-2">معدل التغير</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {historyRows.map((h) => {
                        const isCurr = h.period.id === activePeriod.id;
                        const ev = h.evalData;
                        const deltaText =
                          h.delta === null
                            ? 'أساس'
                            : h.delta > 0
                            ? `+${h.delta}%`
                            : `${h.delta}%`;
                        return (
                          <tr
                            key={h.period.id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                              isCurr ? 'bg-emerald-50/50 dark:bg-emerald-950/20 font-bold' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-right">
                              {h.period.name} {isCurr && <span className="text-emerald-700 text-[10px]">(الحالية)</span>}
                            </td>
                            <td className="py-2.5 px-2 font-mono text-slate-500">{h.period.date}</td>
                            <td className="py-2.5 px-2 font-mono text-emerald-700 dark:text-emerald-400">
                              {ev?.overallRank ? `#${ev.overallRank}` : '-'}
                            </td>
                            <td className="py-2.5 px-2 font-mono">{ev ? `${ev.exercisesPercentage}%` : '-'}</td>
                            <td className="py-2.5 px-2 font-mono">
                              {ev ? `${ev.suburbScore}% (${ev.suburbLabel})` : '-'}
                            </td>
                            <td className="py-2.5 px-2 font-mono font-bold text-slate-900 dark:text-white">
                              {ev ? `${ev.totalPercentage}%` : '-'}
                            </td>
                            <td className="py-2.5 px-2">{ev?.totalGrade || '-'}</td>
                            <td className="py-2.5 px-2 font-mono">
                              {h.delta !== null ? (
                                h.delta > 0 ? (
                                  <span className="text-emerald-700 font-bold">+{h.delta}%</span>
                                ) : h.delta < 0 ? (
                                  <span className="text-red-600 font-bold">{h.delta}%</span>
                                ) : (
                                  <span className="text-slate-400">0.0%</span>
                                )
                              ) : (
                                <span className="text-slate-400">-</span>
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
          )}

          {/* TAB 3: BENCHMARK & COMPARISON VS PEERS / UNIT */}
          {activeTab === 'comparison' && (
            <div className="space-y-6">
              {/* Unit Comparison Header Strip */}
              <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>مقارنة الفرد الشاملة بمتوسطات الوحدة وفئته العسكرية</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    تحليل تفصيلي للفارق النسبي بين درجة الفرد ومتوسط أفراد الوحدة في كل تمرين واختبار
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono font-bold">
                  <div className="text-center px-3 py-1.5 bg-slate-800 rounded-lg">
                    <div className="text-[10px] text-slate-400 font-normal">الموقع المئوي</div>
                    <div className="text-base text-emerald-400">أفضل من {percentile}%</div>
                  </div>
                  <div className="text-center px-3 py-1.5 bg-slate-800 rounded-lg">
                    <div className="text-[10px] text-slate-400 font-normal">الترتيب العام</div>
                    <div className="text-base text-white">#{evaluatedItem.overallRank || '-'} من {unitStats.testedCount}</div>
                  </div>
                </div>
              </div>

              {/* Head-to-Head Comparison Bars for each Exercise */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* 1. Overall Score */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-900 dark:text-white">الإجمالي العام للنتيجة</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {livePreview.totalPercentage >= unitStats.avgTotal
                        ? `+${Math.round((livePreview.totalPercentage - unitStats.avgTotal) * 10) / 10}% أعلى من الوحدة`
                        : `${Math.round((livePreview.totalPercentage - unitStats.avgTotal) * 10) / 10}% أقل من الوحدة`}
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5 text-slate-600">
                        <span>درجة الفرد المحققة:</span>
                        <strong className="font-mono text-emerald-700">{livePreview.totalPercentage}%</strong>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${livePreview.totalPercentage}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5 text-slate-500">
                        <span>متوسط أفراد الوحدة:</span>
                        <span className="font-mono">{unitStats.avgTotal}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-slate-400 h-full rounded-full" style={{ width: `${unitStats.avgTotal}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Pullups */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-900 dark:text-white">تمرين العقلة (الشد على العقلة)</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {livePreview.pullupsScore >= unitStats.avgPullups
                        ? `+${Math.round((livePreview.pullupsScore - unitStats.avgPullups) * 10) / 10}%`
                        : `${Math.round((livePreview.pullupsScore - unitStats.avgPullups) * 10) / 10}%`}
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5 text-slate-600">
                        <span>درجة الفرد: {livePreview.input.pullupsCount} عدة</span>
                        <strong className="font-mono text-emerald-700">{livePreview.pullupsScore}%</strong>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${livePreview.pullupsScore}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5 text-slate-500">
                        <span>متوسط الوحدة في العقلة:</span>
                        <span className="font-mono">{unitStats.avgPullups}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-slate-400 h-full rounded-full" style={{ width: `${unitStats.avgPullups}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Pushups */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-900 dark:text-white">تمرين الضغط (ثني ومد الذراعين)</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {livePreview.pushupsScore >= unitStats.avgPushups
                        ? `+${Math.round((livePreview.pushupsScore - unitStats.avgPushups) * 10) / 10}%`
                        : `${Math.round((livePreview.pushupsScore - unitStats.avgPushups) * 10) / 10}%`}
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5 text-slate-600">
                        <span>درجة الفرد: {livePreview.input.pushupsCount} عدة</span>
                        <strong className="font-mono text-emerald-700">{livePreview.pushupsScore}%</strong>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${livePreview.pushupsScore}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5 text-slate-500">
                        <span>متوسط الوحدة في الضغط:</span>
                        <span className="font-mono">{unitStats.avgPushups}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-slate-400 h-full rounded-full" style={{ width: `${unitStats.avgPushups}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Situps */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-900 dark:text-white">تمرين البطن (رفع الجذع)</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {livePreview.situpsScore >= unitStats.avgSitups
                        ? `+${Math.round((livePreview.situpsScore - unitStats.avgSitups) * 10) / 10}%`
                        : `${Math.round((livePreview.situpsScore - unitStats.avgSitups) * 10) / 10}%`}
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5 text-slate-600">
                        <span>درجة الفرد: {livePreview.input.situpsCount} عدة</span>
                        <strong className="font-mono text-emerald-700">{livePreview.situpsScore}%</strong>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${livePreview.situpsScore}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5 text-slate-500">
                        <span>متوسط الوحدة في البطن:</span>
                        <span className="font-mono">{unitStats.avgSitups}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-slate-400 h-full rounded-full" style={{ width: `${unitStats.avgSitups}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Suburb */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 col-span-1 md:col-span-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-900 dark:text-white">اختبار الضاحية وجري المسافات</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {livePreview.suburbScore >= unitStats.avgSuburb
                        ? `+${Math.round((livePreview.suburbScore - unitStats.avgSuburb) * 10) / 10}% أعلى من المتوسط`
                        : `${Math.round((livePreview.suburbScore - unitStats.avgSuburb) * 10) / 10}%`}
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5 text-slate-600">
                        <span>نتيجة الفرد في الضاحية ({livePreview.suburbLabel}):</span>
                        <strong className="font-mono text-emerald-700">{livePreview.suburbScore}%</strong>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${livePreview.suburbScore}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-0.5 text-slate-500">
                        <span>متوسط الوحدة في الضاحية:</span>
                        <span className="font-mono">{unitStats.avgSuburb}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-slate-400 h-full rounded-full" style={{ width: `${unitStats.avgSuburb}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Assessment & Guidance */}
              <div className="p-4 bg-slate-100/70 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>التقييم الفني للياقة الفرد والتوصيات:</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>أبرز نقاط القوة:</strong>{' '}
                      {livePreview.suburbScore >= 85
                        ? `تفوق واضح في اختبار الضاحية بنتيجة (${livePreview.suburbScore}%) مع زمن محقق (${livePreview.suburbLabel}).`
                        : `أداء متوازن في التمارين البدنية الأساسية بنسبة (${livePreview.exercisesPercentage}%).`}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>توجيهات التدريب:</strong>{' '}
                      {livePreview.pullupsScore < 85
                        ? 'التركيز على تمارين تقوية عضلات الحزام الكتفي لرفع كفاءة تمرين العقلة.'
                        : livePreview.totalPercentage >= 95
                        ? 'المحافظة على المستوى البدني العالي والاستعداد لتمثيل الوحدة في المسابقات الرسمية.'
                        : 'مواصلة طوابير اللياقة الصباحية لتعزيز القدرة على التحمل الدوري التنفسي.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EDIT DATA & SCORES */}
          {activeTab === 'edit' && (
            <form
              onSubmit={handleSave}
              className="p-5 bg-emerald-50/40 dark:bg-slate-800/50 border border-emerald-200 dark:border-slate-700 rounded-xl space-y-4 no-print"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  تحديث البيانات الشخصية ودرجات الاختبار للفترة الحالية ({activePeriod.name})
                </h3>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
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

              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
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

          {/* Section 4: Military Authorization Signatures (Visible for single-page A4 print) */}
          <div className="hidden print:flex justify-between items-start pt-3 border-t border-slate-900 text-xs text-center page-break-inside-avoid">
            <div className="flex-1">
              <div className="font-bold text-slate-900 mb-6">ضابط التربية الرياضية بالوحدة</div>
              <div className="text-slate-400">................................................</div>
            </div>
            <div className="flex-1">
              <div className="font-bold text-slate-900 mb-6">رئيس فرع التدريب / العمليات</div>
              <div className="text-slate-400">................................................</div>
            </div>
            <div className="flex-1">
              <div className="font-bold text-slate-900 mb-6">يعتمد / قائد الوحدة العسكرية</div>
              <div className="text-slate-400">................................................</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

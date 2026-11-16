import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Award,
  Users,
  TrendingUp,
  TrendingDown,
  Search,
  UserPlus,
  FileSpreadsheet,
  Printer,
  Eye,
  Edit3,
  Trash2,
  ArrowUpDown,
  Check,
  Database,
} from 'lucide-react';
import {
  ScoringSettings,
  PersonRecord,
  AssessmentInput,
  EvaluatedAssessment,
  StageId,
  DEFAULT_SCORING_SETTINGS,
  evaluateAndRankPeriod,
  calculateUnitPeriodSummary,
  comparePeriods,
} from './utils/scoring';
import {
  PeriodRecord,
  INITIAL_PERIODS,
  INITIAL_PERSONNEL,
  generateSeedAssessments,
} from './data/seedPersonnel';
import { exportFullExcelWorkbook } from './utils/exportFile';
import { initAuth } from './utils/googleWorkspace';
import { PersonProfileModal } from './components/PersonProfileModal';
import { QuickEntryModal } from './components/QuickEntryModal';
import { StandardsAndDbView } from './components/StandardsAndDbView';
import { PrintReportModal } from './components/PrintReportModal';
import { PeriodComparisonView } from './components/PeriodComparisonView';

type ActiveTab =
  | 'overview'
  | 'registry'
  | 'comparison'
  | 'fast_entry'
  | 'settings_db';

export default function App() {
  const [settings, setSettings] = useState<ScoringSettings>(
    DEFAULT_SCORING_SETTINGS
  );
  const [periods, setPeriods] = useState<PeriodRecord[]>(INITIAL_PERIODS);
  const [activePeriodId, setActivePeriodId] = useState<string>('period-2026-feb');
  const [personnel, setPersonnel] = useState<PersonRecord[]>(INITIAL_PERSONNEL);
  const [assessmentsByPeriod, setAssessmentsByPeriod] = useState<
    Record<string, Record<string, AssessmentInput>>
  >(() => {
    const map: Record<string, Record<string, AssessmentInput>> = {};
    for (const p of INITIAL_PERIODS) map[p.id] = {};
    for (const a of generateSeedAssessments()) {
      if (!map[a.periodId]) map[a.periodId] = {};
      map[a.periodId][a.personId] = a;
    }
    return map;
  });

  const [dbInfo, setDbInfo] = useState({
    engine: 'SQLite 3 (better-sqlite3 WAL)',
    filePath: 'data/military_fitness.sqlite',
    sizeBytes: 65536,
    totalPersonnel: 58,
    totalPeriods: 3,
    totalAssessments: 174,
    lastUpdated: new Date().toISOString(),
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedPersonEval, setSelectedPersonEval] =
    useState<EvaluatedAssessment | null>(null);
  const [quickEntryTarget, setQuickEntryTarget] = useState<{
    open: boolean;
    person?: PersonRecord | null;
    input?: AssessmentInput | null;
  }>({ open: false });
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Filters for Registry & Ranking Table
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'officers' | 'other_ranks'
  >('all');
  const [stageFilter, setStageFilter] = useState<'all' | StageId>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<
    'rank_desc' | 'rank_asc' | 'serial_asc' | 'exercises_desc' | 'suburb_desc'
  >('rank_desc');

  // Google Auth User
  const [googleUser, setGoogleUser] = useState<{
    email: string | null;
    displayName: string | null;
  } | null>(null);

  // Inline Fast Entry state notification
  const [savedRowId, setSavedRowId] = useState<string | null>(null);

  const applyServerState = (data: any) => {
    if (!data) return;
    if (data.settings) setSettings(data.settings);
    if (Array.isArray(data.periods) && data.periods.length > 0) {
      setPeriods(data.periods);
      setActivePeriodId((prev) =>
        data.periods.some((p: PeriodRecord) => p.id === prev)
          ? prev
          : data.periods[1]?.id || data.periods[0].id
      );
    }
    if (Array.isArray(data.personnel)) setPersonnel(data.personnel);
    if (data.assessmentsByPeriod) setAssessmentsByPeriod(data.assessmentsByPeriod);
    if (data.dbInfo) setDbInfo(data.dbInfo);
  };

  useEffect(() => {
    fetch('/api/state')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) applyServerState(data);
      })
      .catch(() => {
        // Fallback to seeded state if offline
      });

    const unsub = initAuth(
      (u) => setGoogleUser({ email: u.email, displayName: u.displayName }),
      () => setGoogleUser(null)
    );
    return () => unsub();
  }, []);

  // Evaluate all periods for rankings and period-over-period comparisons
  const allEvaluatedByPeriod = useMemo(() => {
    const result: Record<string, EvaluatedAssessment[]> = {};
    for (const per of periods) {
      result[per.id] = evaluateAndRankPeriod(
        personnel,
        assessmentsByPeriod[per.id] || {},
        per.id,
        settings
      );
    }
    return result;
  }, [periods, personnel, assessmentsByPeriod, settings]);

  const activePeriod =
    periods.find((p) => p.id === activePeriodId) || periods[0];
  const activeIdx = Math.max(
    0,
    periods.findIndex((p) => p.id === activePeriod.id)
  );
  const previousPeriod = activeIdx > 0 ? periods[activeIdx - 1] : null;

  const currentEvaluated = useMemo(
    () => allEvaluatedByPeriod[activePeriod.id] || [],
    [allEvaluatedByPeriod, activePeriod.id]
  );
  const previousEvaluated = useMemo(
    () => (previousPeriod ? allEvaluatedByPeriod[previousPeriod.id] || [] : []),
    [allEvaluatedByPeriod, previousPeriod]
  );

  const currentSummary = useMemo(
    () => calculateUnitPeriodSummary(currentEvaluated, settings),
    [currentEvaluated, settings]
  );
  const previousSummary = useMemo(
    () =>
      previousPeriod
        ? calculateUnitPeriodSummary(previousEvaluated, settings)
        : null,
    [previousEvaluated, previousPeriod, settings]
  );

  const currentComparisons = useMemo(
    () => comparePeriods(currentEvaluated, previousEvaluated),
    [currentEvaluated, previousEvaluated]
  );

  const comparisonMap = useMemo(() => {
    const m = new Map<string, (typeof currentComparisons)[0]>();
    currentComparisons.forEach((c) => m.set(c.person.id, c));
    return m;
  }, [currentComparisons]);

  // Filtered & sorted list for Registry
  const filteredEvaluated = useMemo(() => {
    const list = currentEvaluated.filter((item) => {
      if (
        categoryFilter !== 'all' &&
        item.person.category !== categoryFilter
      ) {
        return false;
      }
      if (stageFilter !== 'all' && item.stage.stage !== stageFilter) {
        return false;
      }
      if (gradeFilter !== 'all' && item.totalGrade !== gradeFilter) {
        return false;
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'tested' && !item.isTested) return false;
        if (statusFilter === 'medical' && !item.isMedical) return false;
        if (
          statusFilter === 'not_tested' &&
          (item.isTested || item.isMedical)
        ) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        if (
          !item.person.name.includes(q) &&
          !item.person.rank.includes(q) &&
          !item.person.militaryId.includes(q) &&
          !item.person.corps.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'rank_desc') {
        if (a.overallRank && b.overallRank) return a.overallRank - b.overallRank;
        if (a.overallRank) return -1;
        if (b.overallRank) return 1;
        return a.person.serialNum - b.person.serialNum;
      }
      if (sortBy === 'rank_asc') {
        if (a.overallRank && b.overallRank) return b.overallRank - a.overallRank;
        if (a.overallRank) return -1;
        if (b.overallRank) return 1;
        return a.person.serialNum - b.person.serialNum;
      }
      if (sortBy === 'exercises_desc') {
        return b.exercisesPercentage - a.exercisesPercentage;
      }
      if (sortBy === 'suburb_desc') {
        return b.suburbScore - a.suburbScore;
      }
      return a.person.serialNum - b.person.serialNum;
    });
  }, [
    currentEvaluated,
    categoryFilter,
    stageFilter,
    gradeFilter,
    statusFilter,
    searchQuery,
    sortBy,
  ]);

  // Top 5 Performers for Leaderboard
  const topPerformers = useMemo(() => {
    return [...currentEvaluated]
      .filter((i) => i.isTested && i.overallRank !== null)
      .sort((a, b) => (a.overallRank || 999) - (b.overallRank || 999))
      .slice(0, 6);
  }, [currentEvaluated]);

  // API Mutations with optimistic local fallback
  const handleUpsertAssessment = async (
    periodId: string,
    personId: string,
    input: AssessmentInput
  ) => {
    setAssessmentsByPeriod((prev) => ({
      ...prev,
      [periodId]: {
        ...(prev[periodId] || {}),
        [personId]: input,
      },
    }));
    setSavedRowId(personId);
    setTimeout(() => setSavedRowId(null), 1500);

    try {
      const res = await fetch(`/api/assessments/${periodId}/${personId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) applyServerState(await res.json());
    } catch {
      // Optimistic state already updated
    }
  };

  const handleSavePersonAndAssessment = async (
    person: PersonRecord,
    assessment: AssessmentInput
  ) => {
    setPersonnel((prev) =>
      prev.map((p) => (p.id === person.id ? person : p))
    );
    await handleUpsertAssessment(assessment.periodId, person.id, assessment);
    try {
      const res = await fetch(`/api/personnel/${person.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(person),
      });
      if (res.ok) applyServerState(await res.json());
    } catch {
      // Optimistic update applied
    }
  };

  const handleQuickEntrySave = async (
    personPartial: Partial<PersonRecord>,
    assessment: AssessmentInput,
    isNew: boolean
  ) => {
    if (isNew) {
      try {
        const res = await fetch('/api/personnel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(personPartial),
        });
        if (res.ok) {
          const data = await res.json();
          const newId = data.newPersonId;
          await handleUpsertAssessment(activePeriod.id, newId, {
            ...assessment,
            personId: newId,
          });
          return;
        }
      } catch {
        // fallback
      }
      const newId = `p-${Date.now()}`;
      const newPerson: PersonRecord = {
        id: newId,
        serialNum: personPartial.serialNum || personnel.length + 1,
        militaryId: personPartial.militaryId || `${41000 + personnel.length + 1}`,
        corps: personPartial.corps || 'مشاة',
        rank: personPartial.rank || 'نقيب',
        category: personPartial.category || 'officers',
        forceType: personPartial.forceType || 'combat',
        name: personPartial.name || 'فرد جديد',
        age: personPartial.age || 30,
        weight: personPartial.weight ?? null,
        height: personPartial.height ?? null,
      };
      setPersonnel((prev) => [...prev, newPerson]);
      await handleUpsertAssessment(activePeriod.id, newId, {
        ...assessment,
        personId: newId,
      });
    } else if (personPartial.id) {
      await handleSavePersonAndAssessment(
        personPartial as PersonRecord,
        assessment
      );
    }
  };

  const handleDeletePerson = async (personId: string) => {
    setPersonnel((prev) => prev.filter((p) => p.id !== personId));
    try {
      const res = await fetch(`/api/personnel/${personId}`, {
        method: 'DELETE',
      });
      if (res.ok) applyServerState(await res.json());
    } catch {
      // Optimistic delete
    }
  };

  const overallDeltaFromPrev =
    previousSummary !== null
      ? Math.round(
          (currentSummary.overall.avgTotalPercentage -
            previousSummary.overall.avgTotalPercentage) *
            10
        ) / 10
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 no-print">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('overview');
          }}
          className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          منظومة اللياقة البدنية للقوات المسلحة
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300"
        >
          {[
            { id: 'overview', label: 'لوحة القيادة والإجماليات' },
            { id: 'registry', label: 'كشف النتائج والترتيب' },
            { id: 'comparison', label: 'مقارنة الفترات' },
            { id: 'fast_entry', label: 'الإدخال السريع' },
            { id: 'settings_db', label: 'المعايير وقاعدة البيانات' },
          ].map((nav) => (
            <button
              key={nav.id}
              type="button"
              onClick={() => setActiveTab(nav.id as ActiveTab)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === nav.id
                  ? 'text-white border-emerald-400'
                  : 'border-transparent hover:text-white'
              }`}
            >
              {nav.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setQuickEntryTarget({ open: true })}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            إضافة فرد / تسجيل نتيجة
          </button>
        </div>
      </header>

      {/* Secondary Workspace Context & Export Toolbar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 no-print">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Active Period Switcher & Unit Context */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Shield className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span className="font-bold text-slate-900 dark:text-white">
                {settings.unitName}
              </span>
              <span>·</span>
              <span>الفترة النشطة:</span>
            </div>

            <select
              aria-label="اختيار الفترة التدريبية النشطة"
              value={activePeriod.id}
              onChange={(e) => setActivePeriodId(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.date})
                </option>
              ))}
            </select>

            <div className="hidden xl:flex items-center gap-2 text-xs text-slate-500">
              <span>·</span>
              <span>قاعدة البيانات: SQLite محلية ({personnel.length} فرد)</span>
              {previousPeriod && (
                <>
                  <span>·</span>
                  <span>مقارنة بـ: {previousPeriod.name}</span>
                </>
              )}
            </div>
          </div>

          {/* Export Actions (Excel + PDF + SQLite) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                exportFullExcelWorkbook(
                  activePeriod,
                  currentEvaluated,
                  currentSummary,
                  currentComparisons,
                  previousPeriod?.name
                )
              }
              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير كشف Excel متكامل (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="px-3.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>معاينة وتصدير تقرير PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings_db')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>SQLite / Sheets</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden items-center gap-2 overflow-x-auto pt-3 mt-2 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: 'overview', label: 'الإجماليات' },
            { id: 'registry', label: 'النتائج والترتيب' },
            { id: 'comparison', label: 'مقارنة الفترات' },
            { id: 'fast_entry', label: 'إدخال سريع' },
            { id: 'settings_db', label: 'المعايير و SQLite' },
          ].map((nav) => (
            <button
              key={nav.id}
              type="button"
              onClick={() => setActiveTab(nav.id as ActiveTab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
                activeTab === nav.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {nav.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6 space-y-6">
        {/* TAB 1: OVERVIEW & UNIT SUMMARY */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 5 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <div className="text-xs text-slate-500 mb-1">
                  النسبة الإجمالية للوحدة
                </div>
                <div className="text-3xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {currentSummary.overall.avgTotalPercentage}%
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                  {overallDeltaFromPrev !== null && (
                    <span
                      className={`font-mono tabular-nums font-bold ${
                        overallDeltaFromPrev >= 0
                          ? 'text-emerald-700'
                          : 'text-red-600'
                      }`}
                    >
                      {overallDeltaFromPrev > 0
                        ? `+${overallDeltaFromPrev}%`
                        : `${overallDeltaFromPrev}%`}
                    </span>
                  )}
                  <span>مقارنة بالفترة السابقة</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <div className="text-xs text-slate-500 mb-1">
                  متوسط نتيجة التمرينات
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {currentSummary.overall.avgExercisesPercentage}%
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  عقلة · ضغط · بطن · جري معدل
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <div className="text-xs text-slate-500 mb-1">
                  متوسط نتيجة الضاحية
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {currentSummary.overall.avgSuburbPercentage}%
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  الأزمنة القياسية (21.30 ق - 26.00 ق)
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <div className="text-xs text-slate-500 mb-1">
                  إجمالي القوة والمختبرين
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {currentSummary.overall.testedCount} /{' '}
                  {currentSummary.overall.totalStrength}
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  ضباط: {currentSummary.officers.testedCount} · درجات أخرى:{' '}
                  {currentSummary.otherRanks.testedCount}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <div className="text-xs text-slate-500 mb-1">
                  نسبة النجاح والامتياز
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {currentSummary.overall.passRate}%
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  حصل على ممتاز: {currentSummary.overall.excellentCount} فرد
                </div>
              </div>
            </div>

            {/* Official Summary Table (Matches the attached CSV Summary Box) + Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Official Summary Table (7 cols) */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        البيان الرسمي لإجماليات نتائج الوحدة
                      </h2>
                      <p className="text-xs text-slate-500">
                        تجميع تلقائي لنتائج الضباط والدرجات الأخرى والنسبة الإجمالية
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 font-mono tabular-nums">
                      {activePeriod.date}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-3 px-4 font-bold">البيان</th>
                          <th className="py-3 px-3 text-center font-bold">القوة</th>
                          <th className="py-3 px-3 text-center font-bold">مختبرين</th>
                          <th className="py-3 px-3 text-center font-bold">موقف طبي</th>
                          <th className="py-3 px-3 text-center font-bold">
                            نتيجة التمرينات
                          </th>
                          <th className="py-3 px-3 text-center font-bold">
                            نتيجة الضاحية
                          </th>
                          <th className="py-3 px-4 text-center font-bold">
                            إجمالي النتيجة
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
                        <tr>
                          <td className="py-3.5 px-4 font-sans font-bold text-slate-900 dark:text-white">
                            أولاً: الضباط
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {currentSummary.officers.totalStrength}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {currentSummary.officers.testedCount}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {currentSummary.officers.medicalCount}
                          </td>
                          <td className="py-3.5 px-3 text-center font-semibold">
                            {currentSummary.officers.avgExercisesPercentage}%
                          </td>
                          <td className="py-3.5 px-3 text-center font-semibold">
                            {currentSummary.officers.avgSuburbPercentage}%
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-emerald-700 dark:text-emerald-400">
                            {currentSummary.officers.avgTotalPercentage}%
                          </td>
                        </tr>

                        <tr>
                          <td className="py-3.5 px-4 font-sans font-bold text-slate-900 dark:text-white">
                            ثانياً: الدرجات الأخرى
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {currentSummary.otherRanks.totalStrength}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {currentSummary.otherRanks.testedCount}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {currentSummary.otherRanks.medicalCount}
                          </td>
                          <td className="py-3.5 px-3 text-center font-semibold">
                            {currentSummary.otherRanks.avgExercisesPercentage}%
                          </td>
                          <td className="py-3.5 px-3 text-center font-semibold">
                            {currentSummary.otherRanks.avgSuburbPercentage}%
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-emerald-700 dark:text-emerald-400">
                            {currentSummary.otherRanks.avgTotalPercentage}%
                          </td>
                        </tr>

                        <tr className="bg-emerald-50/60 dark:bg-emerald-950/30 font-bold text-sm">
                          <td className="py-4 px-4 font-sans text-emerald-950 dark:text-emerald-200">
                            إجمالي النتيجة للوحدة
                          </td>
                          <td className="py-4 px-3 text-center">
                            {currentSummary.overall.totalStrength}
                          </td>
                          <td className="py-4 px-3 text-center">
                            {currentSummary.overall.testedCount}
                          </td>
                          <td className="py-4 px-3 text-center">
                            {currentSummary.overall.medicalCount}
                          </td>
                          <td className="py-4 px-3 text-center">
                            {currentSummary.overall.avgExercisesPercentage}%
                          </td>
                          <td className="py-4 px-3 text-center">
                            {currentSummary.overall.avgSuburbPercentage}%
                          </td>
                          <td className="py-4 px-4 text-center text-emerald-700 dark:text-emerald-400">
                            {currentSummary.overall.avgTotalPercentage}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    اختبار لصالح: <strong>{activePeriod.beneficiary}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('comparison')}
                    className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                  >
                    عرض تفاصيل المقارنة بالفترة السابقة ←
                  </button>
                </div>
              </div>

              {/* Top 6 Performers Leaderboard (5 cols) */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          لوحة الشرف والترتيب الأعلى مستوى
                        </h2>
                        <p className="text-xs text-slate-500">
                          أفضل 6 أفراد في النسبة الإجمالية للفترة الحالية
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {topPerformers.map((item) => {
                      const comp = comparisonMap.get(item.person.id);
                      return (
                        <div
                          key={item.person.id}
                          onClick={() => setSelectedPersonEval(item)}
                          className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-mono tabular-nums text-xs font-bold flex items-center justify-center">
                              #{item.overallRank}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">
                                {item.person.rank} / {item.person.name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {item.stage.name} · تمرينات:{' '}
                                <span className="font-mono tabular-nums">
                                  {item.exercisesPercentage}%
                                </span>{' '}
                                · ضاحية:{' '}
                                <span className="font-mono tabular-nums">
                                  {item.suburbScore}%
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-left font-mono tabular-nums">
                            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                              {item.totalPercentage}%
                            </div>
                            {comp && comp.percentageDelta !== null && (
                              <div
                                className={`text-[11px] ${
                                  comp.percentageDelta >= 0
                                    ? 'text-emerald-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {comp.percentageDelta > 0
                                  ? `+${comp.percentageDelta}%`
                                  : `${comp.percentageDelta}%`}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-left">
                  <button
                    type="button"
                    onClick={() => setActiveTab('registry')}
                    className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    عرض الترتيب الكامل لجميع الـ {personnel.length} فرداً ←
                  </button>
                </div>
              </div>
            </div>

            {/* Embedded Preview of Registry Table on Overview */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    جدول الترتيب التنازلي والنسب الفردية والمقارنة بالفترة السابقة
                  </h2>
                  <p className="text-xs text-slate-500">
                    انقر على أي فرد لفتح صفحة التفاصيل الكاملة وسجل تطور المستوى عبر الفترات
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('registry')}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  فتح جدول الفلترة المتقدمة والترتيب الكامل
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3 text-center">الترتيب</th>
                      <th className="py-3 px-2 text-center">م</th>
                      <th className="py-3 px-3">الرتبة / الدرجة</th>
                      <th className="py-3 px-4">الاسم</th>
                      <th className="py-3 px-2 text-center">السن</th>
                      <th className="py-3 px-3 text-center">المرحلة</th>
                      <th className="py-3 px-2 text-center">عقلة</th>
                      <th className="py-3 px-2 text-center">ضغط</th>
                      <th className="py-3 px-2 text-center">بطن</th>
                      <th className="py-3 px-2 text-center">جري</th>
                      <th className="py-3 px-3 text-center">نسبة التمرينات</th>
                      <th className="py-3 px-3 text-center">الضاحية</th>
                      <th className="py-3 px-3 text-center">الإجمالي العام</th>
                      <th className="py-3 px-3 text-center">مقارنة بالسابق</th>
                      <th className="py-3 px-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredEvaluated.slice(0, 15).map((item) => {
                      const comp = comparisonMap.get(item.person.id);
                      return (
                        <tr
                          key={item.person.id}
                          onClick={() => setSelectedPersonEval(item)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                            {item.overallRank ? `#${item.overallRank}` : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-500">
                            {item.person.serialNum}
                          </td>
                          <td className="py-2.5 px-3 font-medium">
                            {item.person.rank}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                            {item.person.name}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                            {item.person.age}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">
                            {item.stage.name}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                            {item.input.pullupsCount}{' '}
                            <span className="text-slate-400 text-[11px]">
                              ({item.pullupsScore}%)
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                            {item.input.pushupsCount}{' '}
                            <span className="text-slate-400 text-[11px]">
                              ({item.pushupsScore}%)
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                            {item.input.situpsCount}{' '}
                            <span className="text-slate-400 text-[11px]">
                              ({item.situpsScore}%)
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                            {item.input.runCount}{' '}
                            <span className="text-slate-400 text-[11px]">
                              ({item.runScore}%)
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold">
                            {item.exercisesPercentage}%
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                            {item.suburbScore}%{' '}
                            <span className="text-slate-400 text-[11px]">
                              ({item.suburbLabel})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                            {item.totalPercentage}%{' '}
                            <span className="font-sans font-normal text-slate-500">
                              · {item.totalGrade}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                            {comp && comp.percentageDelta !== null ? (
                              comp.percentageDelta > 0 ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                  <TrendingUp className="w-3.5 h-3.5" />+
                                  {comp.percentageDelta}%
                                </span>
                              ) : comp.percentageDelta < 0 ? (
                                <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                                  <TrendingDown className="w-3.5 h-3.5" />
                                  {comp.percentageDelta}%
                                </span>
                              ) : (
                                <span className="text-slate-400">0.0%</span>
                              )
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td
                            className="py-2.5 px-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedPersonEval(item)}
                                aria-label={`تفاصيل ${item.person.name}`}
                                className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-md cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setQuickEntryTarget({
                                    open: true,
                                    person: item.person,
                                    input: item.input,
                                  })
                                }
                                aria-label={`تعديل ${item.person.name}`}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </div>
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

        {/* TAB 2: FULL REGISTRY, FILTERING & RANKING TABLE */}
        {activeTab === 'registry' && (
          <div className="space-y-5">
            {/* Multi-Faceted Filter Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Category segmented buttons */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {[
                    { id: 'all', label: `كل القوة (${currentEvaluated.length})` },
                    {
                      id: 'officers',
                      label: `الضباط (${currentSummary.officers.totalStrength})`,
                    },
                    {
                      id: 'other_ranks',
                      label: `الدرجات الأخرى (${currentSummary.otherRanks.totalStrength})`,
                    },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id as any)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        categoryFilter === cat.id
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم، الرتبة، الرقم العسكري، أو السلاح..."
                    className="w-full pr-9 pl-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>

                {/* Sort Control */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-500">الترتيب حسب:</span>
                  <select
                    aria-label="ترتيب الجدول حسب"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="rank_desc">
                      من الأفضل للأقل في المستوى (النسبة الإجمالية)
                    </option>
                    <option value="rank_asc">من الأقل للأعلى في المستوى</option>
                    <option value="exercises_desc">الأعلى في نسبة التمرينات</option>
                    <option value="suburb_desc">الأعلى في نتيجة الضاحية</option>
                    <option value="serial_asc">مسلسل الأقدمية (م)</option>
                  </select>
                </div>
              </div>

              {/* Secondary Filter Row: Stage (1-6), Grade, Attendance Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">المرحلة السنية:</span>
                    <select
                      value={stageFilter}
                      onChange={(e) =>
                        setStageFilter(
                          e.target.value === 'all'
                            ? 'all'
                            : (Number(e.target.value) as StageId)
                        )
                      }
                      className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                    >
                      <option value="all">جميع المراحل (1 - 6)</option>
                      {settings.stages.map((st) => (
                        <option key={st.stage} value={st.stage}>
                          {st.name} ({st.minAge}-{st.maxAge} سنة)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">التقدير:</span>
                    <select
                      value={gradeFilter}
                      onChange={(e) => setGradeFilter(e.target.value)}
                      className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                    >
                      <option value="all">كل التقديرات</option>
                      <option value="ممتاز">ممتاز (85%+)</option>
                      <option value="جيد جداً">جيد جداً (75%-84%)</option>
                      <option value="جيد">جيد (65%-74%)</option>
                      <option value="مقبول">مقبول (50%-64%)</option>
                      <option value="راسب">راسب (&lt;50%)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">حالة التمام:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                    >
                      <option value="all">الكل</option>
                      <option value="tested">مختبر</option>
                      <option value="medical">موقف طبى</option>
                      <option value="not_tested">لم يختبر</option>
                    </select>
                  </div>
                </div>

                <div className="text-slate-500 font-mono tabular-nums">
                  عدد النتائج المعروضة: <strong>{filteredEvaluated.length}</strong> من{' '}
                  {currentEvaluated.length}
                </div>
              </div>
            </div>

            {/* Main Organized Results Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-3 text-center">الترتيب العام</th>
                      <th className="py-3 px-2 text-center">م</th>
                      <th className="py-3 px-3">الرتبة / الدرجة</th>
                      <th className="py-3 px-4">الاسم</th>
                      <th className="py-3 px-2 text-center">السن</th>
                      <th className="py-3 px-3 text-center">المرحلة</th>
                      <th className="py-3 px-2 text-center">عقلة (عدد/درجة)</th>
                      <th className="py-3 px-2 text-center">ضغط (عدد/درجة)</th>
                      <th className="py-3 px-2 text-center">بطن (عدد/درجة)</th>
                      <th className="py-3 px-2 text-center">جري (عدد/درجة)</th>
                      <th className="py-3 px-3 text-center">نسبة التمرينات</th>
                      <th className="py-3 px-3 text-center">الضاحية (زمن/نتيجة)</th>
                      <th className="py-3 px-3 text-center">إجمالي النتيجة</th>
                      <th className="py-3 px-3 text-center">مقارنة بالسابق</th>
                      <th className="py-3 px-3 text-center">التفاصيل / تعديل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredEvaluated.length === 0 ? (
                      <tr>
                        <td
                          colSpan={15}
                          className="py-12 text-center text-slate-500"
                        >
                          لا توجد سجلات مطابقة لمعايير البحث أو الفلترة الحالية.
                        </td>
                      </tr>
                    ) : (
                      filteredEvaluated.map((item) => {
                        const comp = comparisonMap.get(item.person.id);
                        return (
                          <tr
                            key={item.person.id}
                            onClick={() => setSelectedPersonEval(item)}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                          >
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                              {item.overallRank ? `#${item.overallRank}` : '-'}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-500">
                              {item.person.serialNum}
                            </td>
                            <td className="py-2.5 px-3 font-medium">
                              {item.person.rank}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                              {item.person.name}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                              {item.person.age}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">
                              {item.stage.name}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                              <strong>{item.input.pullupsCount}</strong>{' '}
                              <span className="text-slate-400">
                                ({item.pullupsScore}%)
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                              <strong>{item.input.pushupsCount}</strong>{' '}
                              <span className="text-slate-400">
                                ({item.pushupsScore}%)
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                              <strong>{item.input.situpsCount}</strong>{' '}
                              <span className="text-slate-400">
                                ({item.situpsScore}%)
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                              <strong>{item.input.runCount}</strong>{' '}
                              <span className="text-slate-400">
                                ({item.runScore}%)
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold">
                              {item.exercisesPercentage}%
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                              <strong>{item.suburbScore}%</strong>{' '}
                              <span className="text-slate-500">
                                ({item.suburbLabel})
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                              {item.totalPercentage}%{' '}
                              <span className="font-sans font-normal text-slate-500">
                                · {item.totalGrade}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                              {comp && comp.percentageDelta !== null ? (
                                comp.percentageDelta > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                    <TrendingUp className="w-3.5 h-3.5" />+
                                    {comp.percentageDelta}%
                                  </span>
                                ) : comp.percentageDelta < 0 ? (
                                  <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                                    <TrendingDown className="w-3.5 h-3.5" />
                                    {comp.percentageDelta}%
                                  </span>
                                ) : (
                                  <span className="text-slate-400">0.0%</span>
                                )
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td
                              className="py-2.5 px-3 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPersonEval(item)}
                                  aria-label={`ملف ${item.person.name}`}
                                  className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-md cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setQuickEntryTarget({
                                      open: true,
                                      person: item.person,
                                      input: item.input,
                                    })
                                  }
                                  aria-label={`تعديل درجات ${item.person.name}`}
                                  className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeletePerson(item.person.id)
                                  }
                                  aria-label={`حذف ${item.person.name}`}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PERIOD COMPARISON VIEW */}
        {activeTab === 'comparison' && (
          <PeriodComparisonView
            periods={periods}
            activePeriodId={activePeriod.id}
            allEvaluatedByPeriod={allEvaluatedByPeriod}
            settings={settings}
            onSelectPerson={(item) => setSelectedPersonEval(item)}
          />
        )}

        {/* TAB 4: FAST SPREADSHEET-STYLE DATA ENTRY */}
        {activeTab === 'fast_entry' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  واجهة الإدخال السريع المباشر ({activePeriod.name})
                </h2>
                <p className="text-xs text-slate-500">
                  عدّل أعداد التمرينات أو زمن الضاحية لأي فرد وسيتم حساب نسبته وحفظها في قاعدة بيانات SQLite فوراً
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث سريع بالاسم أو الرتبة..."
                    className="w-full pr-9 pl-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setQuickEntryTarget({ open: true })}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إضافة فرد جديد</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 text-center">م</th>
                    <th className="py-2.5 px-3">الرتبة والاسم</th>
                    <th className="py-2.5 px-2 text-center">السن / المرحلة</th>
                    <th className="py-2.5 px-2 text-center">التمام</th>
                    <th className="py-2.5 px-2 text-center">عقلة (عدد)</th>
                    <th className="py-2.5 px-2 text-center">ضغط (عدد)</th>
                    <th className="py-2.5 px-2 text-center">بطن (عدد)</th>
                    <th className="py-2.5 px-2 text-center">جري معدل</th>
                    <th className="py-2.5 px-3 text-center">كود زمن الضاحية</th>
                    <th className="py-2.5 px-3 text-center">نسبة التمرينات</th>
                    <th className="py-2.5 px-3 text-center">الإجمالي المحسوب</th>
                    <th className="py-2.5 px-3 text-center">الترتيب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredEvaluated.map((item) => {
                    const inp = item.input;
                    const isSaved = savedRowId === item.person.id;
                    return (
                      <tr
                        key={item.person.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <td className="py-2 px-3 text-center font-mono tabular-nums text-slate-500">
                          {item.person.serialNum}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.person.rank} / {item.person.name}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center text-slate-500">
                          <span className="font-mono tabular-nums">
                            {item.person.age}
                          </span>{' '}
                          · {item.stage.name}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <select
                            aria-label={`تمام ${item.person.name}`}
                            value={inp.attendanceStatus}
                            onChange={(e) =>
                              handleUpsertAssessment(
                                activePeriod.id,
                                item.person.id,
                                {
                                  ...inp,
                                  attendanceStatus: e.target.value as any,
                                }
                              )
                            }
                            className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                          >
                            <option value="tested">مختبر</option>
                            <option value="medical">موقف طبى</option>
                            <option value="not_tested">لم يختبر</option>
                          </select>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            aria-label={`عقلة ${item.person.name}`}
                            value={inp.pullupsCount}
                            onChange={(e) =>
                              handleUpsertAssessment(
                                activePeriod.id,
                                item.person.id,
                                {
                                  ...inp,
                                  pullupsCount: Number(e.target.value) || 0,
                                  attendanceStatus: 'tested',
                                }
                              )
                            }
                            className="w-16 px-2 py-1 text-center font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            aria-label={`ضغط ${item.person.name}`}
                            value={inp.pushupsCount}
                            onChange={(e) =>
                              handleUpsertAssessment(
                                activePeriod.id,
                                item.person.id,
                                {
                                  ...inp,
                                  pushupsCount: Number(e.target.value) || 0,
                                  attendanceStatus: 'tested',
                                }
                              )
                            }
                            className="w-16 px-2 py-1 text-center font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            aria-label={`بطن ${item.person.name}`}
                            value={inp.situpsCount}
                            onChange={(e) =>
                              handleUpsertAssessment(
                                activePeriod.id,
                                item.person.id,
                                {
                                  ...inp,
                                  situpsCount: Number(e.target.value) || 0,
                                  attendanceStatus: 'tested',
                                }
                              )
                            }
                            className="w-16 px-2 py-1 text-center font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            aria-label={`جري ${item.person.name}`}
                            value={inp.runCount}
                            onChange={(e) =>
                              handleUpsertAssessment(
                                activePeriod.id,
                                item.person.id,
                                {
                                  ...inp,
                                  runCount: Number(e.target.value) || 0,
                                  attendanceStatus: 'tested',
                                }
                              )
                            }
                            className="w-16 px-2 py-1 text-center font-mono tabular-nums border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <select
                            aria-label={`زمن الضاحية ${item.person.name}`}
                            value={inp.suburbTimeCode}
                            onChange={(e) => {
                              const code = Number(e.target.value);
                              handleUpsertAssessment(
                                activePeriod.id,
                                item.person.id,
                                {
                                  ...inp,
                                  suburbTimeCode: code,
                                  attendanceStatus:
                                    code === 12
                                      ? 'medical'
                                      : code === 0
                                      ? inp.attendanceStatus
                                      : 'tested',
                                }
                              );
                            }}
                            className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900"
                          >
                            {settings.suburbTimes.map((t) => (
                              <option key={t.code} value={t.code}>
                                زمن {t.code}: {t.label} ({t.score}%)
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center font-mono tabular-nums font-semibold">
                          {item.exercisesPercentage}%
                        </td>
                        <td className="py-2 px-3 text-center font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                          {item.totalPercentage}% ({item.totalGrade})
                        </td>
                        <td className="py-2 px-3 text-center font-mono tabular-nums font-bold">
                          {isSaved ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px]">
                              <Check className="w-3.5 h-3.5" /> حُفظ
                            </span>
                          ) : item.overallRank ? (
                            `#${item.overallRank}`
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: STANDARDS, PERIODS & SQLITE DATABASE CONTROL */}
        {activeTab === 'settings_db' && (
          <StandardsAndDbView
            settings={settings}
            periods={periods}
            activePeriodId={activePeriod.id}
            dbInfo={dbInfo}
            currentEvaluated={currentEvaluated}
            currentSummary={currentSummary}
            currentComparisons={currentComparisons}
            googleUser={googleUser}
            onUpdateSettings={async (newSettings) => {
              setSettings(newSettings);
              const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings),
              });
              if (res.ok) applyServerState(await res.json());
            }}
            onCreatePeriod={async (payload) => {
              const res = await fetch('/api/periods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (res.ok) {
                const data = await res.json();
                applyServerState(data.state);
                if (data.newPeriodId) setActivePeriodId(data.newPeriodId);
              }
            }}
            onDeletePeriod={async (periodId) => {
              const res = await fetch(`/api/periods/${periodId}`, {
                method: 'DELETE',
              });
              if (res.ok) applyServerState(await res.json());
            }}
            onClearPeriodScores={async (periodId) => {
              const res = await fetch(`/api/periods/${periodId}/clear-scores`, {
                method: 'POST',
              });
              if (res.ok) applyServerState(await res.json());
            }}
            onResetDatabase={async () => {
              const res = await fetch('/api/database/reset', {
                method: 'POST',
              });
              if (res.ok) applyServerState(await res.json());
            }}
            onImportJsonBackup={async (jsonPayload) => {
              const res = await fetch('/api/database/import-json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonPayload),
              });
              if (res.ok) applyServerState(await res.json());
            }}
            onExportJsonBackup={() => {
              const payload = {
                settings,
                periods,
                personnel,
                assessmentsByPeriod,
                exportedAt: new Date().toISOString(),
              };
              const blob = new Blob([JSON.stringify(payload, null, 2)], {
                type: 'application/json',
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `military_fitness_sqlite_backup_${activePeriod.date}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            onGoogleAuthChange={(u) => setGoogleUser(u)}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 text-xs text-slate-500 no-print">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            {settings.ministryHeader} · {settings.authorityHeader} ·{' '}
            {settings.branchHeader}
          </div>
          <div>
            قاعدة البيانات: SQLite محلية (ملف <span className="font-mono">data/military_fitness.sqlite</span>) · التصدير: Excel (.xlsx) و PDF
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedPersonEval && (
        <PersonProfileModal
          evaluatedItem={
            currentEvaluated.find(
              (i) => i.person.id === selectedPersonEval.person.id
            ) || selectedPersonEval
          }
          periods={periods}
          activePeriodId={activePeriod.id}
          assessmentsByPeriod={assessmentsByPeriod}
          allEvaluatedByPeriod={allEvaluatedByPeriod}
          settings={settings}
          onClose={() => setSelectedPersonEval(null)}
          onSavePersonAndAssessment={handleSavePersonAndAssessment}
        />
      )}

      {quickEntryTarget.open && (
        <QuickEntryModal
          periodId={activePeriod.id}
          periodName={activePeriod.name}
          settings={settings}
          nextSerialNum={personnel.length + 1}
          initialPerson={quickEntryTarget.person}
          initialInput={quickEntryTarget.input}
          onClose={() => setQuickEntryTarget({ open: false })}
          onSaveNewOrUpdate={handleQuickEntrySave}
        />
      )}

      {showPrintModal && (
        <PrintReportModal
          period={activePeriod}
          previousPeriodName={previousPeriod?.name}
          settings={settings}
          evaluated={currentEvaluated}
          summary={currentSummary}
          comparisons={currentComparisons}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}

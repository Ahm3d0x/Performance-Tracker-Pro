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
  Upload,
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
import { DEFAULT_VISIBLE_COLUMNS } from './utils/columnConfig';
import { initAuth } from './utils/googleWorkspace';
import { PersonProfileModal } from './components/PersonProfileModal';
import { QuickEntryModal } from './components/QuickEntryModal';
import { StandardsAndDbView } from './components/StandardsAndDbView';
import { PrintReportModal } from './components/PrintReportModal';
import { PeriodComparisonView } from './components/PeriodComparisonView';
import { ExcelImportModal } from './components/ExcelImportModal';
import { DashboardOverviewView } from './components/DashboardOverviewView';
import { RegistryTableView } from './components/RegistryTableView';
import { FastEntryView } from './components/FastEntryView';
import { MilitaryAcademyLogo } from './components/MilitaryAcademyLogo';
import { AboutAppView } from './components/AboutAppView';

type ActiveTab =
  | 'overview'
  | 'registry'
  | 'comparison'
  | 'fast_entry'
  | 'settings_db'
  | 'about';

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
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);

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
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    DEFAULT_VISIBLE_COLUMNS
  );

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
          : data.periods[0].id
      );
    }
    if (Array.isArray(data.personnel)) setPersonnel(data.personnel);
    if (data.assessmentsByPeriod) setAssessmentsByPeriod(data.assessmentsByPeriod);
    if (data.dbInfo) setDbInfo(data.dbInfo);
  };

  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/state')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) applyServerState(data);
      })
      .catch(() => {
        // Fallback to seeded state if offline
      });

    // Check for updates in the background on launch
    fetch('/api/system/check-updates')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.hasUpdate) {
          setUpdateAvailable(data.latestVersion);
        }
      })
      .catch(() => {});

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
      await fetch(`/api/assessments/${periodId}/${personId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
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
      await fetch(`/api/personnel/${person.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(person),
      });
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
          const createdPerson: PersonRecord = data.person || {
            id: newId,
            serialNum: personPartial.serialNum || personnel.length + 1,
            militaryId: personPartial.militaryId || `${41000 + personnel.length + 1}`,
            corps: personPartial.corps || 'مشاة',
            rank: personPartial.rank || 'نقيب',
            category: personPartial.category || 'officers',
            forceType: personPartial.forceType || 'combat',
            name: personPartial.name || 'فرد جديد',
            age: Number(personPartial.age) || 30,
            weight: personPartial.weight ?? null,
            height: personPartial.height ?? null,
          };
          setPersonnel((prev) => [...prev, createdPerson]);
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
      await fetch(`/api/personnel/${personId}`, {
        method: 'DELETE',
      });
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
      {/* Dynamic Update Alert Banner */}
      {updateAvailable && (
        <div className="bg-gradient-to-r from-amber-600 via-emerald-700 to-amber-600 text-white text-xs font-bold px-4 py-2 flex flex-wrap items-center justify-between gap-2 no-print shadow-md">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-white/20 rounded-full animate-pulse">🔔</span>
            <span>يتوفر الآن إصدار جديد للمنظومة (v{updateAvailable})! يمكنك أخذ نسخة احتياطية والترقية بأمان.</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className="px-3 py-1 bg-white text-slate-900 rounded-md hover:bg-slate-100 font-bold text-xs cursor-pointer shadow-xs"
          >
            الانتقال لمركز التحديثات والنسخ الاحتياطي
          </button>
        </div>
      )}

      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-6 px-4 sm:px-6 lg:px-8 py-2.5 bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 no-print">
        {/* Zone 1: Military Academy Emblem & Wordmark */}
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('overview');
          }}
          className="flex items-center gap-3 whitespace-nowrap shrink-0 group focus:outline-none"
        >
          <MilitaryAcademyLogo size="md" showText={true} />
        </a>

        {/* Zone 2: Navigation links */}
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
            {
              id: 'about',
              label: 'عن المنظومة والتحديثات',
              badge: updateAvailable ? `v${updateAvailable}` : undefined,
            },
          ].map((nav) => (
            <button
              key={nav.id}
              type="button"
              onClick={() => setActiveTab(nav.id as ActiveTab)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 flex items-center gap-1.5 ${
                activeTab === nav.id
                  ? 'text-white border-emerald-400'
                  : 'border-transparent hover:text-white'
              }`}
            >
              <span>{nav.label}</span>
              {nav.badge && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-full animate-pulse">
                  {nav.badge}
                </span>
              )}
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

      {/* Secondary Workspace Context & Export Toolbar (Hidden on About Page) */}
      {activeTab !== 'about' ? (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3 no-print">
          <div className="w-full flex flex-wrap items-center justify-between gap-4">
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
                onClick={() => setShowExcelImportModal(true)}
                className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>استيراد كشف Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  exportFullExcelWorkbook(
                    activePeriod,
                    currentEvaluated,
                    currentSummary,
                    currentComparisons,
                    previousPeriod?.name,
                    visibleColumns
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
              { id: 'about', label: 'عن المنظومة' },
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
      ) : (
        /* Mobile Navigation only when on About Tab */
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 no-print">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { id: 'overview', label: 'الإجماليات' },
              { id: 'registry', label: 'النتائج والترتيب' },
              { id: 'comparison', label: 'مقارنة الفترات' },
              { id: 'fast_entry', label: 'إدخال سريع' },
              { id: 'settings_db', label: 'المعايير و SQLite' },
              { id: 'about', label: 'عن المنظومة' },
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
      )}

      {/* Main Content Viewport */}
      <main
        className={`flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 ${
          Boolean(
            selectedPersonEval ||
            quickEntryTarget.open ||
            showPrintModal ||
            showExcelImportModal
          )
            ? 'print:hidden'
            : ''
        }`}
      >
        {/* TAB 1: OVERVIEW & UNIT SUMMARY */}
        {activeTab === 'overview' && (
          <DashboardOverviewView
            activePeriod={activePeriod}
            currentSummary={currentSummary}
            overallDeltaFromPrev={overallDeltaFromPrev}
            filteredEvaluated={filteredEvaluated}
            comparisonMap={comparisonMap}
            topPerformers={topPerformers}
            personnel={personnel}
            periods={periods}
            allEvaluatedByPeriod={allEvaluatedByPeriod}
            settings={settings}
            onSelectPerson={(item) => setSelectedPersonEval(item)}
            onQuickEntry={(p, inp) => setQuickEntryTarget({ open: true, person: p, input: inp })}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* TAB 2: FULL REGISTRY, FILTERING & RANKING TABLE */}
        {activeTab === 'registry' && (
          <RegistryTableView
            items={filteredEvaluated}
            activePeriod={activePeriod}
            comparisonMap={comparisonMap}
            totalCount={personnel.length}
            officersCount={currentSummary.officers.totalStrength}
            otherRanksCount={currentSummary.otherRanks.totalStrength}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            stageFilter={stageFilter}
            setStageFilter={setStageFilter}
            gradeFilter={gradeFilter}
            setGradeFilter={setGradeFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
            onOpenPrintModal={() => setShowPrintModal(true)}
            onSelectPerson={(item) => setSelectedPersonEval(item)}
            onQuickEntry={(p, inp) => setQuickEntryTarget({ open: true, person: p, input: inp })}
            onDeletePerson={handleDeletePerson}
          />
        )}

        {/* TAB 3: PERIOD COMPARISON VIEW */}
        {activeTab === 'comparison' && (
          <PeriodComparisonView
            periods={periods}
            activePeriodId={activePeriod.id}
            allEvaluatedByPeriod={allEvaluatedByPeriod}
            settings={settings}
            onSelectPerson={(item) => setSelectedPersonEval(item)}
            onOpenPrintModal={() => setShowPrintModal(true)}
          />
        )}

        {/* TAB 4: FAST SPREADSHEET-STYLE DATA ENTRY */}
        {activeTab === 'fast_entry' && (
          <FastEntryView
            periodName={activePeriod.name}
            items={filteredEvaluated}
            suburbTimes={settings.suburbTimes}
            savedRowId={savedRowId}
            onSaveRow={(personId, input) => handleUpsertAssessment(activePeriod.id, personId, input)}
            onOpenQuickEntry={() => setQuickEntryTarget({ open: true })}
          />
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'wipe' }),
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

        {/* TAB 6: ABOUT, COMMANDER DEDICATION & UPDATE CENTER */}
        {activeTab === 'about' && (
          <AboutAppView
            onRefreshAppState={async () => {
              const res = await fetch('/api/state');
              if (res.ok) {
                const data = await res.json();
                applyServerState(data);
              }
            }}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-4 text-xs text-slate-500 no-print">
        <div className="w-full flex flex-wrap items-center justify-between gap-4">
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
          allPersonnelInPeriod={currentEvaluated}
          onSelectPerson={(item) => setSelectedPersonEval(item)}
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
          initialVisibleColumns={visibleColumns}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {showExcelImportModal && (
        <ExcelImportModal
          activePeriod={activePeriod}
          onClose={() => setShowExcelImportModal(false)}
          onImportSuccess={(result) => {
            if (result.state) applyServerState(result.state);
            if (result.newPeriodId) setActivePeriodId(result.newPeriodId);
          }}
        />
      )}
    </div>
  );
}

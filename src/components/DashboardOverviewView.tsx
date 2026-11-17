import React, { useState, useMemo } from 'react';
import {
  Award,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit3,
  AlertTriangle,
  AlertOctagon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  EvaluatedAssessment,
  UnitPeriodSummary,
  PeriodComparisonItem,
  PersonRecord,
  ScoringSettings,
  calculateUnitPeriodSummary,
} from '../utils/scoring';
import { PeriodRecord } from '../data/seedPersonnel';

interface DashboardOverviewViewProps {
  activePeriod: PeriodRecord;
  currentSummary: UnitPeriodSummary;
  overallDeltaFromPrev: number | null;
  filteredEvaluated: EvaluatedAssessment[];
  comparisonMap: Map<string, PeriodComparisonItem>;
  topPerformers: EvaluatedAssessment[];
  personnel: PersonRecord[];
  periods?: PeriodRecord[];
  allEvaluatedByPeriod?: Record<string, EvaluatedAssessment[]>;
  settings?: ScoringSettings;
  onSelectPerson: (item: EvaluatedAssessment) => void;
  onQuickEntry: (person: PersonRecord, input: any) => void;
  onNavigateTab: (tab: 'registry' | 'comparison' | 'fast_entry') => void;
}

const CustomRechartsTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-2 dir-rtl">
        <div className="font-bold border-b border-slate-700 pb-1 text-emerald-400">
          {label}
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div
              key={`item-${index}`}
              className="flex items-center justify-between gap-4 font-mono"
            >
              <span
                style={{ color: entry.color }}
                className="font-sans font-semibold text-[11px]"
              >
                {entry.name}:
              </span>
              <span className="font-bold text-white">{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardOverviewView: React.FC<DashboardOverviewViewProps> = ({
  activePeriod,
  currentSummary,
  overallDeltaFromPrev,
  filteredEvaluated,
  comparisonMap,
  topPerformers,
  personnel,
  periods = [],
  allEvaluatedByPeriod = {},
  settings,
  onSelectPerson,
  onQuickEntry,
  onNavigateTab,
}) => {
  // Sorting state for the embedded table
  const [sortColumn, setSortColumn] = useState<string>('overallRank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Timeline data for Recharts Line Chart
  const timelineChartData = useMemo(() => {
    if (!periods || periods.length === 0) return [];
    return periods.map((p) => {
      const evalList = allEvaluatedByPeriod[p.id] || [];
      const sum = settings ? calculateUnitPeriodSummary(evalList, settings) : null;
      return {
        id: p.id,
        name: p.name,
        date: p.date,
        'إجمالي الوحدة %': sum ? sum.overall.avgTotalPercentage : 0,
        'الضباط %': sum ? sum.officers.avgTotalPercentage : 0,
        'الدرجات الأخرى %': sum ? sum.otherRanks.avgTotalPercentage : 0,
        'نسبة النجاح %': sum ? sum.overall.passRate : 0,
        'المختبرين': sum ? sum.overall.testedCount : 0,
      };
    });
  }, [periods, allEvaluatedByPeriod, settings]);

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colKey);
      if (['overallRank', 'serialNum', 'name', 'rank', 'age'].includes(colKey)) {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  const sortedPreviewList = useMemo(() => {
    const list = [...filteredEvaluated];
    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortColumn) {
        case 'overallRank':
          valA = a.overallRank ?? 999999;
          valB = b.overallRank ?? 999999;
          break;
        case 'serialNum':
          valA = a.person.serialNum;
          valB = b.person.serialNum;
          break;
        case 'rank':
          valA = a.person.rank || '';
          valB = b.person.rank || '';
          break;
        case 'name':
          valA = a.person.name || '';
          valB = b.person.name || '';
          break;
        case 'age':
          valA = a.person.age || 0;
          valB = b.person.age || 0;
          break;
        case 'pullups':
          valA = a.pullupsScore;
          valB = b.pullupsScore;
          break;
        case 'pushups':
          valA = a.pushupsScore;
          valB = b.pushupsScore;
          break;
        case 'situps':
          valA = a.situpsScore;
          valB = b.situpsScore;
          break;
        case 'run':
          valA = a.runScore;
          valB = b.runScore;
          break;
        case 'exercisesPercentage':
          valA = a.exercisesPercentage;
          valB = b.exercisesPercentage;
          break;
        case 'suburbScore':
          valA = a.suburbScore;
          valB = b.suburbScore;
          break;
        case 'totalPercentage':
          valA = a.totalPercentage;
          valB = b.totalPercentage;
          break;
        case 'percentageDelta': {
          const compA = comparisonMap.get(a.person.id);
          const compB = comparisonMap.get(b.person.id);
          valA = compA?.percentageDelta ?? -9999;
          valB = compB?.percentageDelta ?? -9999;
          break;
        }
        default:
          valA = a.overallRank ?? 999999;
          valB = b.overallRank ?? 999999;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB, 'ar');
        return sortDirection === 'asc' ? cmp : -cmp;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return a.person.serialNum - b.person.serialNum;
    });
    return list;
  }, [filteredEvaluated, sortColumn, sortDirection, comparisonMap]);

  return (
    <div className="space-y-6">
      {/* 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
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
                    ? 'text-emerald-700 dark:text-emerald-400'
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

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
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

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
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

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
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

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
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

      {/* RECHARTS: Line Chart for Evolution of Unit Average Across Time Periods */}
      {timelineChartData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 rounded-lg">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  مخطط تطور متوسط النسبة المئوية للوحدة عبر الفترات الزمنية (Recharts)
                </h2>
                <p className="text-xs text-slate-500">
                  متابعة مؤشرات أداء اللياقة البدنية لإجمالي الوحدة، والضباط، والدرجات الأخرى عبر دورات التقييم
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">
                عدد الفترات المسجلة: {timelineChartData.length}
              </span>
            </div>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timelineChartData}
                margin={{ top: 15, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip content={<CustomRechartsTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <ReferenceLine
                  y={85}
                  stroke="#059669"
                  strokeDasharray="3 3"
                  label={{ value: 'امتياز (85%)', fill: '#059669', fontSize: 10, position: 'right' }}
                />
                <ReferenceLine
                  y={50}
                  stroke="#ea580c"
                  strokeDasharray="3 3"
                  label={{ value: 'حد النجاح (50%)', fill: '#ea580c', fontSize: 10, position: 'right' }}
                />
                <Line
                  type="monotone"
                  dataKey="إجمالي الوحدة %"
                  stroke="#059669"
                  strokeWidth={3.5}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="الضباط %"
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
                <Line
                  type="monotone"
                  dataKey="الدرجات الأخرى %"
                  stroke="#d97706"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
                <Line
                  type="monotone"
                  dataKey="نسبة النجاح %"
                  stroke="#7c3aed"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Official Summary Table & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Official Summary Table (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between shadow-xs">
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
              onClick={() => onNavigateTab('comparison')}
              className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
            >
              عرض تفاصيل المقارنة بالفترة السابقة ←
            </button>
          </div>
        </div>

        {/* Top 6 Performers Leaderboard (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between shadow-xs">
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
              {topPerformers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  لا توجد نتائج مسجلة حتى الآن. يمكنك استيراد كشف Excel أو إضافة أفراد جدد.
                </div>
              ) : (
                topPerformers.map((item) => {
                  const comp = comparisonMap.get(item.person.id);
                  return (
                    <div
                      key={item.person.id}
                      onClick={() => onSelectPerson(item)}
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
                })
              )}
            </div>
          </div>

          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-left">
            <button
              type="button"
              onClick={() => onNavigateTab('registry')}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              عرض الترتيب الكامل لجميع الـ {personnel.length} فرداً ←
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Preview of Registry Table on Overview with Sorting & Alert Badges */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              جدول النتائج والمقارنة بالفترة السابقة (اضغط على رأس أي عمود للترتيب)
            </h2>
            <p className="text-xs text-slate-500">
              انقر على أي فرد لفتح صفحته الكاملة ورسوماته البيانية، والأفراد ذوو علامة التنبيه يحتاجون تدريباً إضافياً
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('registry')}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            فتح جدول الفلترة المتقدمة والترتيب الكامل
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                {[
                  { id: 'overallRank', label: 'الترتيب', align: 'center' },
                  { id: 'serialNum', label: 'م', align: 'center' },
                  { id: 'rank', label: 'الرتبة / الدرجة', align: 'right' },
                  { id: 'name', label: 'الاسم', align: 'right' },
                  { id: 'age', label: 'السن', align: 'center' },
                  { id: 'pullups', label: 'عقلة', align: 'center' },
                  { id: 'pushups', label: 'ضغط', align: 'center' },
                  { id: 'situps', label: 'بطن', align: 'center' },
                  { id: 'run', label: 'جري', align: 'center' },
                  { id: 'exercisesPercentage', label: 'نسبة التمرينات', align: 'center' },
                  { id: 'suburbScore', label: 'الضاحية', align: 'center' },
                  { id: 'totalPercentage', label: 'الإجمالي العام', align: 'center' },
                  { id: 'percentageDelta', label: 'مقارنة بالسابق', align: 'center' },
                ].map((th) => {
                  const isSorted = sortColumn === th.id;
                  return (
                    <th
                      key={th.id}
                      onClick={() => handleSort(th.id)}
                      className={`py-3 px-2.5 select-none transition-colors cursor-pointer group ${
                        isSorted
                          ? 'bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      } ${th.align === 'center' ? 'text-center' : 'text-right'}`}
                    >
                      <div className={`inline-flex items-center gap-1 ${th.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                        <span>{th.label}</span>
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="py-3 px-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {sortedPreviewList.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-xs text-slate-400">
                    قاعدة البيانات فارغة حالياً (0 أفراد). قم بإضافة فرد جديد أو استيراد كشف Excel لبدء الرصد والتقييم.
                  </td>
                </tr>
              ) : (
                sortedPreviewList.slice(0, 15).map((item) => {
                  const comp = comparisonMap.get(item.person.id);
                  const isFailing =
                    item.totalGrade === 'دون المستوى' ||
                    item.totalGrade === 'راسب' ||
                    (item.isTested && item.totalPercentage < 50);
                  const isMarginal =
                    item.totalGrade === 'مقبول' ||
                    (item.isTested && item.totalPercentage >= 50 && item.totalPercentage < 65);
                  const needsTraining = isFailing || isMarginal;

                  return (
                    <tr
                      key={item.person.id}
                      onClick={() => onSelectPerson(item)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                        {item.overallRank ? `#${item.overallRank}` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-500">
                        {item.person.serialNum}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{item.person.rank}</td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{item.person.name}</span>
                          {needsTraining && (
                            <span
                              title={
                                isFailing
                                  ? 'راسب / دون المستوى - يحتاج إلى تأهيل بدني عاجل'
                                  : 'مقبول - يحتاج إلى تدريب إضافي لرفع اللياقة'
                              }
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isFailing
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-300 dark:border-red-800'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                              }`}
                            >
                              {isFailing ? (
                                <AlertOctagon className="w-3 h-3 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                              )}
                              <span>{isFailing ? 'تأهيل عاجل' : 'تدريب إضافي'}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                        {item.person.age}
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
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
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
                            onClick={() => onSelectPerson(item)}
                            aria-label={`تفاصيل ${item.person.name}`}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickEntry(item.person, item.input)}
                            aria-label={`تعديل ${item.person.name}`}
                            className="p-1.5 text-slate-600 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
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
  );
};

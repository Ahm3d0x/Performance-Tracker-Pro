import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeftRight,
  Search,
  Eye,
} from 'lucide-react';
import {
  EvaluatedAssessment,
  UnitPeriodSummary,
  PeriodComparisonItem,
  comparePeriods,
  calculateUnitPeriodSummary,
  ScoringSettings,
} from '../utils/scoring';
import { PeriodRecord } from '../data/seedPersonnel';

interface PeriodComparisonViewProps {
  periods: PeriodRecord[];
  activePeriodId: string;
  allEvaluatedByPeriod: Record<string, EvaluatedAssessment[]>;
  settings: ScoringSettings;
  onSelectPerson: (item: EvaluatedAssessment) => void;
}

export const PeriodComparisonView: React.FC<PeriodComparisonViewProps> = ({
  periods,
  activePeriodId,
  allEvaluatedByPeriod,
  settings,
  onSelectPerson,
}) => {
  const activeIdx = Math.max(
    0,
    periods.findIndex((p) => p.id === activePeriodId)
  );
  const defaultPrevId =
    activeIdx > 0
      ? periods[activeIdx - 1].id
      : periods[Math.min(periods.length - 1, 1)]?.id || periods[0].id;

  const [targetPeriodId, setTargetPeriodId] = useState<string>(activePeriodId);
  const [basePeriodId, setBasePeriodId] = useState<string>(defaultPrevId);
  const [trendFilter, setTrendFilter] = useState<
    'all' | 'improved' | 'declined' | 'stable'
  >('all');
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'officers' | 'other_ranks'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  const targetPeriod =
    periods.find((p) => p.id === targetPeriodId) || periods[0];
  const basePeriod = periods.find((p) => p.id === basePeriodId) || periods[0];

  const targetEval = allEvaluatedByPeriod[targetPeriod.id] || [];
  const baseEval = allEvaluatedByPeriod[basePeriod.id] || [];

  const targetSummary: UnitPeriodSummary = useMemo(
    () => calculateUnitPeriodSummary(targetEval, settings),
    [targetEval, settings]
  );
  const baseSummary: UnitPeriodSummary = useMemo(
    () => calculateUnitPeriodSummary(baseEval, settings),
    [baseEval, settings]
  );

  const comparisons: PeriodComparisonItem[] = useMemo(
    () => comparePeriods(targetEval, baseEval),
    [targetEval, baseEval]
  );

  const improvedCount = comparisons.filter((c) => c.trend === 'improved').length;
  const declinedCount = comparisons.filter((c) => c.trend === 'declined').length;
  const stableCount = comparisons.filter((c) => c.trend === 'stable').length;

  const unitTotalDelta =
    Math.round(
      (targetSummary.overall.avgTotalPercentage -
        baseSummary.overall.avgTotalPercentage) *
        10
    ) / 10;
  const officersDelta =
    Math.round(
      (targetSummary.officers.avgTotalPercentage -
        baseSummary.officers.avgTotalPercentage) *
        10
    ) / 10;
  const otherRanksDelta =
    Math.round(
      (targetSummary.otherRanks.avgTotalPercentage -
        baseSummary.otherRanks.avgTotalPercentage) *
        10
    ) / 10;

  const filteredComparisons = useMemo(() => {
    return comparisons
      .filter((c) => {
        if (categoryFilter !== 'all' && c.person.category !== categoryFilter) {
          return false;
        }
        if (trendFilter !== 'all' && c.trend !== trendFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.trim();
          if (
            !c.person.name.includes(q) &&
            !c.person.rank.includes(q) &&
            !c.person.militaryId.includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by best improvement or current rank
        if (a.current.overallRank && b.current.overallRank) {
          return a.current.overallRank - b.current.overallRank;
        }
        return a.person.serialNum - b.person.serialNum;
      });
  }, [comparisons, categoryFilter, trendFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Period Selector Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ArrowLeftRight className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              مقارنة المستوى والترتيب بين الفترات التدريبية
            </h2>
            <p className="text-xs text-slate-500">
              قياس نسبة التقدم أو التراجع لكل فرد وللوحدة بالكامل بين أي فترتين
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">
              الفترة الأساسية (السابقة):
            </label>
            <select
              value={basePeriodId}
              onChange={(e) => setBasePeriodId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.date})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 text-slate-400 font-bold">← مقابل →</div>

          <div>
            <label className="block text-[11px] text-slate-500 mb-1">
              الفترة المقارنة (الحالية):
            </label>
            <select
              value={targetPeriodId}
              onChange={(e) => setTargetPeriodId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold border border-emerald-600 rounded-lg bg-emerald-50/40 dark:bg-slate-800 text-emerald-950 dark:text-emerald-300"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.date})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Unit Comparison KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">
            تطور النسبة الإجمالية للوحدة
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {targetSummary.overall.avgTotalPercentage}%
            </div>
            <span
              className={`text-xs font-bold ${
                unitTotalDelta >= 0 ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              <span className="font-mono tabular-nums">
                {unitTotalDelta > 0 ? `+${unitTotalDelta}%` : `${unitTotalDelta}%`}
              </span>{' '}
              عن السابق (<span className="font-mono tabular-nums">{baseSummary.overall.avgTotalPercentage}%</span>)
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">تطور نسبة الضباط</div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {targetSummary.officers.avgTotalPercentage}%
            </div>
            <span
              className={`text-xs font-bold ${
                officersDelta >= 0 ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              <span className="font-mono tabular-nums">
                {officersDelta > 0 ? `+${officersDelta}%` : `${officersDelta}%`}
              </span>{' '}
              عن السابق (<span className="font-mono tabular-nums">{baseSummary.officers.avgTotalPercentage}%</span>)
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">
            تطور نسبة الدرجات الأخرى
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {targetSummary.otherRanks.avgTotalPercentage}%
            </div>
            <span
              className={`text-xs font-bold ${
                otherRanksDelta >= 0 ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              <span className="font-mono tabular-nums">
                {otherRanksDelta > 0 ? `+${otherRanksDelta}%` : `${otherRanksDelta}%`}
              </span>{' '}
              عن السابق (<span className="font-mono tabular-nums">{baseSummary.otherRanks.avgTotalPercentage}%</span>)
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">ملخص حركة الأفراد</div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-emerald-700 font-bold">
              تحسن: <span className="font-mono tabular-nums">{improvedCount}</span>
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600 font-semibold">
              ثبات: <span className="font-mono tabular-nums">{stableCount}</span>
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-red-600 font-bold">
              تراجع: <span className="font-mono tabular-nums">{declinedCount}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filters & Search for Comparison Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {[
                { id: 'all', label: 'كل الحالات' },
                { id: 'improved', label: `متقدم (${improvedCount})` },
                { id: 'stable', label: `ثابت (${stableCount})` },
                { id: 'declined', label: `متراجع (${declinedCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTrendFilter(tab.id as any)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    trendFilter === tab.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'officers', label: 'الضباط' },
                { id: 'other_ranks', label: 'الدرجات الأخرى' },
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
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الرتبة..."
              className="w-full pr-9 pl-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 text-center">م</th>
                <th className="py-3 px-3">الرتبة / الدرجة</th>
                <th className="py-3 px-4">الاسم</th>
                <th className="py-3 px-3 text-center">الترتيب السابق ← الحالي</th>
                <th className="py-3 px-3 text-center">فرق المراكز</th>
                <th className="py-3 px-3 text-center">نسبة التمرينات (سابق ← حالي)</th>
                <th className="py-3 px-3 text-center">الضاحية (سابق ← حالي)</th>
                <th className="py-3 px-3 text-center">النسبة الإجمالية (سابق ← حالي)</th>
                <th className="py-3 px-4 text-center">مقدار التطور</th>
                <th className="py-3 px-3 text-center">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredComparisons.map((item) => (
                <tr
                  key={item.person.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-500">
                    {item.person.serialNum}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                    {item.person.rank}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                    {item.person.name}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                    <span className="text-slate-500">
                      {item.previous?.overallRank
                        ? `#${item.previous.overallRank}`
                        : '-'}
                    </span>
                    <span className="mx-1.5 text-slate-400">←</span>
                    <strong className="text-slate-900 dark:text-white">
                      {item.current.overallRank
                        ? `#${item.current.overallRank}`
                        : '-'}
                    </strong>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {item.rankDelta === null ? (
                      <span className="text-slate-400">-</span>
                    ) : item.rankDelta > 0 ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                        <span className="font-mono tabular-nums">+{item.rankDelta}</span> مركز
                      </span>
                    ) : item.rankDelta < 0 ? (
                      <span className="text-red-600 dark:text-red-400 font-bold">
                        <span className="font-mono tabular-nums">{item.rankDelta}</span> مركز
                      </span>
                    ) : (
                      <span className="text-slate-500">ثابت</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                    <span className="text-slate-500">
                      {item.previous ? `${item.previous.exercisesPercentage}%` : '-'}
                    </span>
                    <span className="mx-1 text-slate-400">←</span>
                    <span>{item.current.exercisesPercentage}%</span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                    <span className="text-slate-500">
                      {item.previous ? `${item.previous.suburbScore}%` : '-'}
                    </span>
                    <span className="mx-1 text-slate-400">←</span>
                    <span>{item.current.suburbScore}%</span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold">
                    <span className="text-slate-500 font-normal">
                      {item.previous ? `${item.previous.totalPercentage}%` : '-'}
                    </span>
                    <span className="mx-1.5 text-slate-400">←</span>
                    <span className="text-slate-900 dark:text-white">
                      {item.current.totalPercentage}%
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center font-mono tabular-nums">
                    {item.percentageDelta === null ? (
                      <span className="text-slate-400">غير مختبر</span>
                    ) : item.percentageDelta > 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                        <TrendingUp className="w-3.5 h-3.5" />
                        +{item.percentageDelta}%
                      </span>
                    ) : item.percentageDelta < 0 ? (
                      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold">
                        <TrendingDown className="w-3.5 h-3.5" />
                        {item.percentageDelta}%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Minus className="w-3.5 h-3.5" />
                        0.0%
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectPerson(item.current)}
                      aria-label={`عرض تفاصيل ${item.person.name}`}
                      className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

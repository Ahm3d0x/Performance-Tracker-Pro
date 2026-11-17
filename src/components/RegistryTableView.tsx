import React, { memo, useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit3,
  Trash2,
  UserPlus,
  Sliders,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  AlertTriangle,
  AlertOctagon,
  Award,
} from 'lucide-react';
import {
  EvaluatedAssessment,
  PeriodComparisonItem,
  StageId,
  PersonnelCategory,
  PersonRecord,
} from '../utils/scoring';
import { PeriodRecord } from '../data/seedPersonnel';
import {
  ALL_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
  ColumnDefinition,
} from '../utils/columnConfig';
import { ColumnCustomizerModal } from './ColumnCustomizerModal';
import { exportCustomFilteredExcel } from '../utils/exportFile';

interface RegistryTableRowProps {
  item: EvaluatedAssessment;
  comp?: PeriodComparisonItem;
  activeCols: ColumnDefinition[];
  onSelectPerson: (item: EvaluatedAssessment) => void;
  onQuickEntry: (person: PersonRecord, input: any) => void;
  onDeletePerson: (id: string) => void;
}

const RegistryTableRow = memo<RegistryTableRowProps>(
  ({ item, comp, activeCols, onSelectPerson, onQuickEntry, onDeletePerson }) => {
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
        onClick={() => onSelectPerson(item)}
        className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
      >
        {activeCols.map((col) => {
          if (col.id === 'overallRank') {
            return (
              <td
                key={col.id}
                className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400"
              >
                {item.overallRank ? `#${item.overallRank}` : '-'}
              </td>
            );
          }
          if (col.id === 'categoryRank') {
            return (
              <td
                key={col.id}
                className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-500"
              >
                {item.categoryRank ? `#${item.categoryRank}` : '-'}
              </td>
            );
          }
          if (col.id === 'name') {
            return (
              <td
                key={col.id}
                className="py-2.5 px-4 font-bold text-slate-900 dark:text-white"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>{item.person.name}</span>
                  {needsTraining && (
                    <span
                      title={
                        isFailing
                          ? 'راسب / دون المستوى - يحتاج إلى تأهيل بدني مكثف'
                          : 'مقبول - يحتاج إلى تدريب إضافي لرفع اللياقة'
                      }
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isFailing
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border border-red-300 dark:border-red-800'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                      }`}
                    >
                      {isFailing ? (
                        <AlertOctagon className="w-3 h-3 shrink-0 text-red-600" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 shrink-0 text-amber-600" />
                      )}
                      <span>{isFailing ? 'تأهيل عاجل' : 'تدريب إضافي'}</span>
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-normal text-slate-400">
                  {item.person.corps} · ر.ع: {item.person.militaryId}
                </div>
              </td>
            );
          }
          if (col.id === 'percentageDelta') {
            return (
              <td
                key={col.id}
                className="py-2.5 px-3 text-center font-mono tabular-nums"
              >
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
            );
          }
          if (col.id === 'totalPercentage') {
            return (
              <td
                key={col.id}
                className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-slate-900 dark:text-white"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>{item.totalPercentage}%</span>
                  {needsTraining && (
                    <span
                      title={
                        isFailing
                          ? 'راسب / دون المستوى - يحتاج تأهيل'
                          : 'مقبول - يحتاج تدريب إضافي'
                      }
                      className={isFailing ? 'text-red-600' : 'text-amber-500'}
                    >
                      {isFailing ? (
                        <AlertOctagon className="w-3.5 h-3.5 inline" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 inline" />
                      )}
                    </span>
                  )}
                </div>
                <div
                  className={`font-sans font-normal text-[11px] ${
                    isFailing
                      ? 'text-red-600 font-bold'
                      : isMarginal
                      ? 'text-amber-600 font-semibold'
                      : 'text-slate-500'
                  }`}
                >
                  · {item.totalGrade}
                </div>
              </td>
            );
          }

          // General cell rendering
          const text = col.renderText ? col.renderText(item, comp) : '-';
          return (
            <td
              key={col.id}
              className={`py-2.5 px-2.5 ${
                col.align === 'right'
                  ? 'text-right'
                  : col.align === 'center'
                  ? 'text-center font-mono tabular-nums'
                  : 'text-left font-mono tabular-nums'
              }`}
            >
              {text}
            </td>
          );
        })}

        {/* Actions column */}
        <td
          className="py-2.5 px-3 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => onSelectPerson(item)}
              aria-label={`ملف ${item.person.name}`}
              title="عرض الملف الفردي الكامل والرسومات البيانية"
              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onQuickEntry(item.person, item.input)}
              aria-label={`تعديل درجات ${item.person.name}`}
              title="تعديل درجات الفرد"
              className="p-1.5 text-slate-600 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDeletePerson(item.person.id)}
              aria-label={`حذف ${item.person.name}`}
              title="حذف الفرد"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }
);

RegistryTableRow.displayName = 'RegistryTableRow';

interface RegistryTableViewProps {
  items: EvaluatedAssessment[];
  activePeriod?: PeriodRecord;
  comparisonMap: Map<string, PeriodComparisonItem>;
  totalCount: number;
  officersCount: number;
  otherRanksCount: number;
  categoryFilter: 'all' | PersonnelCategory;
  setCategoryFilter: (v: 'all' | PersonnelCategory) => void;
  stageFilter: 'all' | StageId;
  setStageFilter: (v: 'all' | StageId) => void;
  gradeFilter: string;
  setGradeFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  sortBy: 'rank_desc' | 'rank_asc' | 'serial_asc' | 'exercises_desc' | 'suburb_desc';
  setSortBy: (v: any) => void;
  visibleColumns?: string[];
  setVisibleColumns?: (cols: string[]) => void;
  onOpenPrintModal?: () => void;
  onSelectPerson: (item: EvaluatedAssessment) => void;
  onQuickEntry: (person?: PersonRecord, input?: any) => void;
  onDeletePerson: (id: string) => void;
}

export const RegistryTableView: React.FC<RegistryTableViewProps> = ({
  items,
  activePeriod,
  comparisonMap,
  totalCount,
  officersCount,
  otherRanksCount,
  categoryFilter,
  setCategoryFilter,
  stageFilter,
  setStageFilter,
  gradeFilter,
  setGradeFilter,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  visibleColumns = DEFAULT_VISIBLE_COLUMNS,
  setVisibleColumns,
  onOpenPrintModal,
  onSelectPerson,
  onQuickEntry,
  onDeletePerson,
}) => {
  // Local advanced filters
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [corpsFilter, setCorpsFilter] = useState<string>('all');
  const [bmiFilter, setBmiFilter] = useState<string>('all');
  const [deficiencyFilter, setDeficiencyFilter] = useState<string>('all');
  const [trendFilter, setTrendFilter] = useState<string>('all');
  const [needsTrainingOnly, setNeedsTrainingOnly] = useState<boolean>(false);

  // Clickable Column Header Sorting State
  const [sortColumn, setSortColumn] = useState<string>('overallRank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Dynamic available Corps list
  const availableCorps = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.person.corps && i.person.corps.trim()) set.add(i.person.corps.trim());
    });
    return Array.from(set).sort();
  }, [items]);

  // Handle clicking on ANY column header to sort
  const handleColumnHeaderClick = (colId: string) => {
    if (sortColumn === colId) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colId);
      if (['overallRank', 'categoryRank', 'serialNum', 'name', 'rank', 'corps', 'militaryId'].includes(colId)) {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  // Count of personnel needing training
  const needsTrainingCount = useMemo(() => {
    return items.filter(
      (item) =>
        item.totalGrade === 'دون المستوى' ||
        item.totalGrade === 'راسب' ||
        item.totalGrade === 'مقبول' ||
        (item.isTested && item.totalPercentage < 65)
    ).length;
  }, [items]);

  // Apply filters on top of incoming items
  const filteredList = useMemo(() => {
    return items.filter((item) => {
      // Needs training filter
      if (needsTrainingOnly) {
        const isFailing =
          item.totalGrade === 'دون المستوى' ||
          item.totalGrade === 'راسب' ||
          (item.isTested && item.totalPercentage < 50);
        const isMarginal =
          item.totalGrade === 'مقبول' ||
          (item.isTested && item.totalPercentage >= 50 && item.totalPercentage < 65);
        if (!isFailing && !isMarginal) return false;
      }
      // Corps filter
      if (corpsFilter !== 'all' && item.person.corps !== corpsFilter) {
        return false;
      }
      // BMI filter
      if (bmiFilter !== 'all') {
        if (bmiFilter === 'normal' && !item.bmiStatus.includes('طبيعي')) return false;
        if (bmiFilter === 'overweight' && !item.bmiStatus.includes('زيادة')) return false;
        if (bmiFilter === 'obese' && !item.bmiStatus.includes('سمنة')) return false;
        if (bmiFilter === 'underweight' && !item.bmiStatus.includes('نحافة')) return false;
      }
      // Deficiency / Strength filter
      if (deficiencyFilter === 'pullups' && item.pullupsScore >= 50) return false;
      if (deficiencyFilter === 'pushups' && item.pushupsScore >= 50) return false;
      if (deficiencyFilter === 'situps' && item.situpsScore >= 50) return false;
      if (deficiencyFilter === 'run' && item.runScore >= 50) return false;
      if (deficiencyFilter === 'suburb' && item.suburbScore >= 50) return false;
      if (deficiencyFilter === 'suburb_100' && item.suburbScore !== 100) return false;
      if (
        deficiencyFilter === 'any_exercise' &&
        item.pullupsScore >= 50 &&
        item.pushupsScore >= 50 &&
        item.situpsScore >= 50 &&
        item.runScore >= 50
      ) {
        return false;
      }
      // Trend filter
      if (trendFilter !== 'all') {
        const comp = comparisonMap.get(item.person.id);
        if (!comp || comp.trend !== trendFilter) return false;
      }
      return true;
    });
  }, [items, needsTrainingOnly, corpsFilter, bmiFilter, deficiencyFilter, trendFilter, comparisonMap]);

  // Sort by clicked column
  const sortedItems = useMemo(() => {
    const list = [...filteredList];
    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortColumn) {
        case 'overallRank':
          valA = a.overallRank ?? 999999;
          valB = b.overallRank ?? 999999;
          break;
        case 'categoryRank':
          valA = a.categoryRank ?? 999999;
          valB = b.categoryRank ?? 999999;
          break;
        case 'serialNum':
          valA = a.person.serialNum;
          valB = b.person.serialNum;
          break;
        case 'militaryId':
          valA = a.person.militaryId || '';
          valB = b.person.militaryId || '';
          break;
        case 'rank':
          valA = a.person.rank || '';
          valB = b.person.rank || '';
          break;
        case 'name':
          valA = a.person.name || '';
          valB = b.person.name || '';
          break;
        case 'corps':
          valA = a.person.corps || '';
          valB = b.person.corps || '';
          break;
        case 'age':
          valA = a.person.age || 0;
          valB = b.person.age || 0;
          break;
        case 'stage':
          valA = a.stage.stage || 0;
          valB = b.stage.stage || 0;
          break;
        case 'weightHeight':
          valA = a.person.weight || 0;
          valB = b.person.weight || 0;
          break;
        case 'bmi':
          valA = a.bmi ?? 0;
          valB = b.bmi ?? 0;
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
        case 'exercisesGrade':
          valA = a.exercisesGrade;
          valB = b.exercisesGrade;
          break;
        case 'suburbLabel':
          valA = a.input.suburbTimeCode || 0;
          valB = b.input.suburbTimeCode || 0;
          break;
        case 'suburbScore':
          valA = a.suburbScore;
          valB = b.suburbScore;
          break;
        case 'suburbGrade':
          valA = a.suburbGrade;
          valB = b.suburbGrade;
          break;
        case 'totalPercentage':
          valA = a.totalPercentage;
          valB = b.totalPercentage;
          break;
        case 'totalGrade':
          valA = a.totalGrade;
          valB = b.totalGrade;
          break;
        case 'percentageDelta': {
          const compA = comparisonMap.get(a.person.id);
          const compB = comparisonMap.get(b.person.id);
          valA = compA?.percentageDelta ?? -9999;
          valB = compB?.percentageDelta ?? -9999;
          break;
        }
        case 'obstacle':
          valA = (a.input.obstacleMin || 0) * 60 + (a.input.obstacleSec || 0);
          valB = (b.input.obstacleMin || 0) * 60 + (b.input.obstacleSec || 0);
          break;
        case 'march':
          valA = (a.input.marchHours || 0) * 60 + (a.input.marchMin || 0);
          valB = (b.input.marchHours || 0) * 60 + (b.input.marchMin || 0);
          break;
        case 'sprint100m':
          valA = a.input.sprint100m || 999;
          valB = b.input.sprint100m || 999;
          break;
        case 'colleagueCarry':
          valA = a.input.colleagueCarry || 999;
          valB = b.input.colleagueCarry || 999;
          break;
        case 'zigzagRun':
          valA = a.input.zigzagRun || 999;
          valB = b.input.zigzagRun || 999;
          break;
        case 'longJump':
          valA = a.input.longJump || 0;
          valB = b.input.longJump || 0;
          break;
        case 'grenadeThrow':
          valA = a.input.grenadeThrow || 0;
          valB = b.input.grenadeThrow || 0;
          break;
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
  }, [filteredList, sortColumn, sortDirection, comparisonMap]);

  // Active filter count
  const activeFiltersCount = [
    categoryFilter !== 'all',
    stageFilter !== 'all',
    gradeFilter !== 'all',
    statusFilter !== 'all',
    corpsFilter !== 'all',
    bmiFilter !== 'all',
    deficiencyFilter !== 'all',
    trendFilter !== 'all',
    needsTrainingOnly,
    searchQuery.trim().length > 0,
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setCategoryFilter('all');
    setStageFilter('all');
    setGradeFilter('all');
    setStatusFilter('all');
    setCorpsFilter('all');
    setBmiFilter('all');
    setDeficiencyFilter('all');
    setTrendFilter('all');
    setNeedsTrainingOnly(false);
    setSearchQuery('');
    setSortColumn('overallRank');
    setSortDirection('asc');
  };

  const activeCols = useMemo(() => {
    return ALL_COLUMNS.filter((c) => visibleColumns.includes(c.id));
  }, [visibleColumns]);

  return (
    <div className="space-y-4">
      {/* Multi-Faceted Filter & Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-xs">
        {/* Row 1: Category segmented buttons, Search bar, and Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category segmented buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {[
              { id: 'all', label: `كل القوة (${totalCount})` },
              { id: 'officers', label: `الضباط (${officersCount})` },
              { id: 'other_ranks', label: `الدرجات الأخرى (${otherRanksCount})` },
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

          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، الرتبة، الرقم العسكري، السلاح..."
              className="w-full pr-9 pl-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-emerald-500"
            />
          </div>

          {/* Table Customization & Export Shortcuts */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCustomizer(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-600" />
              <span>تخصيص الأعمدة ({activeCols.length})</span>
            </button>

            {onOpenPrintModal && (
              <button
                type="button"
                onClick={onOpenPrintModal}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الكشف</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (activePeriod) {
                  exportCustomFilteredExcel({
                    period: activePeriod,
                    items: sortedItems,
                    comparisonMap,
                    visibleColumns,
                    title: `كشف_اللياقة_المفلتر_${sortedItems.length}_فرد`,
                  });
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير Excel المفلتر ({sortedItems.length})</span>
            </button>
          </div>
        </div>

        {/* Row 2: Detailed Selectors */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Stage */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">المرحلة:</span>
            <select
              aria-label="فلترة حسب المرحلة السنية"
              value={stageFilter}
              onChange={(e) =>
                setStageFilter(
                  e.target.value === 'all' ? 'all' : (Number(e.target.value) as any)
                )
              }
              className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">جميع المراحل (1-6)</option>
              <option value="1">المرحلة 1 (18-26)</option>
              <option value="2">المرحلة 2 (27-31)</option>
              <option value="3">المرحلة 3 (32-36)</option>
              <option value="4">المرحلة 4 (37-41)</option>
              <option value="5">المرحلة 5 (42-46)</option>
              <option value="6">المرحلة 6 (47+)</option>
            </select>
          </div>

          {/* Grade */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">التقدير:</span>
            <select
              aria-label="فلترة حسب التقدير"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">جميع التقديرات</option>
              <option value="ممتاز">ممتاز (85%+)</option>
              <option value="جيد جدا">جيد جداً (75-84%)</option>
              <option value="جيد">جيد (65-74%)</option>
              <option value="مقبول">مقبول (50-64%)</option>
              <option value="دون المستوى">دون المستوى (أقل من 50%)</option>
              <option value="موقف طبى">موقف طبي</option>
              <option value="لم يختبر">لم يختبر</option>
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">التمام:</span>
            <select
              aria-label="فلترة حسب التمام"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">الكل</option>
              <option value="tested">المختبرين فقط</option>
              <option value="medical">الموقف الطبي فقط</option>
              <option value="not_tested">غير المختبرين فقط</option>
            </select>
          </div>

          {/* Corps / Branch */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">السلاح:</span>
            <select
              aria-label="فلترة حسب السلاح"
              value={corpsFilter}
              onChange={(e) => setCorpsFilter(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">كل الأسلحة ({availableCorps.length})</option>
              {availableCorps.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* BMI Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">تناسق القوام:</span>
            <select
              aria-label="فلترة حسب مؤشر BMI"
              value={bmiFilter}
              onChange={(e) => setBmiFilter(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">جميع الحالات</option>
              <option value="normal">وزن طبيعي</option>
              <option value="overweight">زيادة طفيفة</option>
              <option value="obese">سمنة</option>
              <option value="underweight">نحافة</option>
            </select>
          </div>

          {/* Deficiency / Strengths */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">مؤشر التقصير/التفوق:</span>
            <select
              aria-label="فلترة التقصير والتفوق"
              value={deficiencyFilter}
              onChange={(e) => setDeficiencyFilter(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              <option value="all">بدون حصر</option>
              <option value="pullups">مقصر في العقلة (&lt; 50%)</option>
              <option value="pushups">مقصر في الضغط (&lt; 50%)</option>
              <option value="situps">مقصر في البطن (&lt; 50%)</option>
              <option value="run">مقصر في الجري (&lt; 50%)</option>
              <option value="any_exercise">مقصر في أي تمرين بدني</option>
              <option value="suburb">مقصر في الضاحية (&lt; 50%)</option>
              <option value="suburb_100">متفوق في الضاحية (100% ممتاز)</option>
            </select>
          </div>

          {/* Sort Info / Reset */}
          <div className="flex items-center gap-1.5 mr-auto">
            <span className="text-slate-500 font-semibold">الترتيب النشط:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <span>{ALL_COLUMNS.find((c) => c.id === sortColumn)?.label || sortColumn}</span>
              {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            </span>
          </div>
        </div>

        {/* Row 3: Quick Filter Chips & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-semibold">فلاتر سريعة:</span>
            
            {/* Quick Filter: Needs Training / Warning */}
            <button
              type="button"
              onClick={() => setNeedsTrainingOnly(!needsTrainingOnly)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                needsTrainingOnly
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>من يحتاج تدريب إضافي / دون المستوى ({needsTrainingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setGradeFilter(gradeFilter === 'ممتاز' ? 'all' : 'ممتاز')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                gradeFilter === 'ممتاز'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Award className="w-3 h-3 text-amber-400" />
              <span>الحاصلين على ممتاز</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'medical' ? 'all' : 'medical')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                statusFilter === 'medical'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              الموقف الطبي
            </button>

            <button
              type="button"
              onClick={() =>
                setDeficiencyFilter(deficiencyFilter === 'suburb_100' ? 'all' : 'suburb_100')
              }
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                deficiencyFilter === 'suburb_100'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              متفوقين في الضاحية (100%)
            </button>
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer hover:underline text-[11px]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة ضبط الفلاتر ({activeFiltersCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            يتم عرض <strong>{sortedItems.length}</strong> فرداً من إجمالي {totalCount} فرد
            {activeFiltersCount > 0 && (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold mr-1">
                (وفقاً للفلترة النشطة)
              </span>
            )}
            <span className="mx-2">·</span>
            <span>الأعمدة المعروضة: <strong>{activeCols.length}</strong> عمود (اضغط على رأس أي عمود للترتيب)</span>
          </div>
          <button
            type="button"
            onClick={() => onQuickEntry()}
            className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>إضافة فرد جديد</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                {activeCols.map((col) => {
                  const isSorted = sortColumn === col.id;
                  return (
                    <th
                      key={col.id}
                      onClick={() => handleColumnHeaderClick(col.id)}
                      className={`py-3 px-2.5 select-none transition-colors cursor-pointer group ${
                        isSorted
                          ? 'bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                      } ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                      title={`ترتيب الجدول حسب ${col.label} (${
                        isSorted ? (sortDirection === 'asc' ? 'تصاعدي' : 'تنازلي') : 'اضغط للترتيب'
                      })`}
                    >
                      <div
                        className={`inline-flex items-center gap-1.5 ${
                          col.align === 'center'
                            ? 'justify-center'
                            : col.align === 'right'
                            ? 'justify-start'
                            : 'justify-end'
                        }`}
                      >
                        <span>{col.shortLabel || col.label}</span>
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-30 group-hover:opacity-100 shrink-0" />
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="py-3 px-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {sortedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeCols.length + 1}
                    className="py-12 text-center text-slate-400"
                  >
                    لا توجد سجلات تطابق الفلترة الحالية
                  </td>
                </tr>
              ) : (
                sortedItems.map((item) => (
                  <RegistryTableRow
                    key={item.person.id}
                    item={item}
                    comp={comparisonMap.get(item.person.id)}
                    activeCols={activeCols}
                    onSelectPerson={onSelectPerson}
                    onQuickEntry={onQuickEntry}
                    onDeletePerson={onDeletePerson}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Column Customizer Modal */}
      {showCustomizer && (
        <ColumnCustomizerModal
          visibleColumns={visibleColumns}
          onChangeColumns={(cols) => {
            if (setVisibleColumns) {
              setVisibleColumns(cols);
            }
          }}
          onClose={() => setShowCustomizer(false)}
          title="تخصيص أعمدة كشف النتائج"
          description="حدد الحقول المطلوب ظهورها في جدول الكشف العام"
        />
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import {
  Search,
  UserPlus,
  Check,
  Filter,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
} from 'lucide-react';
import {
  EvaluatedAssessment,
  AssessmentInput,
  AttendanceStatus,
  SuburbTimeStandard,
} from '../utils/scoring';

interface FastEntryRowProps {
  item: EvaluatedAssessment;
  rowIndex: number;
  suburbTimes: SuburbTimeStandard[];
  isSaved: boolean;
  onSaveRow: (personId: string, input: AssessmentInput) => void;
  onCellKeyDown: (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => void;
}

const FastEntryRow = memo<FastEntryRowProps>(
  ({ item, rowIndex, suburbTimes, isSaved, onSaveRow, onCellKeyDown }) => {
    const [localInp, setLocalInp] = useState<AssessmentInput>(item.input);

    useEffect(() => {
      setLocalInp(item.input);
    }, [item.input]);

    const handleChange = (field: keyof AssessmentInput, value: any) => {
      const updated = { ...localInp, [field]: value };
      if (
        (field === 'pullupsCount' ||
          field === 'pushupsCount' ||
          field === 'situpsCount' ||
          field === 'runCount') &&
        value > 0 &&
        updated.attendanceStatus === 'not_tested'
      ) {
        updated.attendanceStatus = 'tested';
      }
      setLocalInp(updated);
      onSaveRow(item.person.id, updated);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (e.target instanceof HTMLInputElement) {
        e.target.select();
      }
    };

    return (
      <tr className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/60 transition-colors group">
        {/* 1. Serial Number */}
        <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-500">
          <div className="flex items-center justify-center gap-1">
            <span>{item.person.serialNum}</span>
            {isSaved && <Check className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />}
          </div>
        </td>

        {/* 2. Rank & Name */}
        <td className="py-2.5 px-3">
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{item.person.rank} / {item.person.name}</span>
            {item.person.category === 'officers' && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                ضابط
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400">
            {item.person.corps} · ر.ع: <span className="font-mono">{item.person.militaryId}</span>
          </div>
        </td>

        {/* 3. Age & Stage */}
        <td className="py-2.5 px-2 text-center text-slate-500 whitespace-nowrap">
          <span className="font-mono tabular-nums font-bold text-slate-700 dark:text-slate-300">
            {item.person.age}
          </span>{' '}
          · <span className="text-[11px] font-semibold">{item.stage.name}</span>
        </td>

        {/* 4. Col 0: Attendance Status (Select) */}
        <td className="py-2.5 px-2 text-center">
          <select
            id={`fast-grid-cell-${rowIndex}-0`}
            aria-label={`تمام ${item.person.name}`}
            value={localInp.attendanceStatus}
            onFocus={handleFocus}
            onKeyDown={(e) => onCellKeyDown(e, rowIndex, 0)}
            onChange={(e) =>
              handleChange('attendanceStatus', e.target.value as AttendanceStatus)
            }
            className={`px-2 py-1 text-xs border rounded-md font-semibold cursor-pointer transition-colors focus:ring-2 focus:ring-emerald-500 focus:outline-hidden ${
              localInp.attendanceStatus === 'tested'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : localInp.attendanceStatus === 'medical'
                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                : 'bg-white text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            <option value="tested">مختبر</option>
            <option value="medical">موقف طبى</option>
            <option value="not_tested">لم يختبر</option>
          </select>
        </td>

        {/* 5. Col 1: Pullups Count */}
        <td className="py-2.5 px-2 text-center">
          <input
            id={`fast-grid-cell-${rowIndex}-1`}
            type="number"
            min="0"
            max="100"
            aria-label={`عقلة ${item.person.name}`}
            value={localInp.pullupsCount === 0 ? '' : localInp.pullupsCount}
            placeholder="0"
            onFocus={handleFocus}
            onKeyDown={(e) => onCellKeyDown(e, rowIndex, 1)}
            onChange={(e) =>
              handleChange('pullupsCount', Math.max(0, Number(e.target.value) || 0))
            }
            className="w-16 px-2 py-1 text-center font-mono tabular-nums font-bold border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
          />
        </td>

        {/* 6. Col 2: Pushups Count */}
        <td className="py-2.5 px-2 text-center">
          <input
            id={`fast-grid-cell-${rowIndex}-2`}
            type="number"
            min="0"
            max="200"
            aria-label={`ضغط ${item.person.name}`}
            value={localInp.pushupsCount === 0 ? '' : localInp.pushupsCount}
            placeholder="0"
            onFocus={handleFocus}
            onKeyDown={(e) => onCellKeyDown(e, rowIndex, 2)}
            onChange={(e) =>
              handleChange('pushupsCount', Math.max(0, Number(e.target.value) || 0))
            }
            className="w-16 px-2 py-1 text-center font-mono tabular-nums font-bold border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
          />
        </td>

        {/* 7. Col 3: Situps Count */}
        <td className="py-2.5 px-2 text-center">
          <input
            id={`fast-grid-cell-${rowIndex}-3`}
            type="number"
            min="0"
            max="200"
            aria-label={`بطن ${item.person.name}`}
            value={localInp.situpsCount === 0 ? '' : localInp.situpsCount}
            placeholder="0"
            onFocus={handleFocus}
            onKeyDown={(e) => onCellKeyDown(e, rowIndex, 3)}
            onChange={(e) =>
              handleChange('situpsCount', Math.max(0, Number(e.target.value) || 0))
            }
            className="w-16 px-2 py-1 text-center font-mono tabular-nums font-bold border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
          />
        </td>

        {/* 8. Col 4: Run Count */}
        <td className="py-2.5 px-2 text-center">
          <input
            id={`fast-grid-cell-${rowIndex}-4`}
            type="number"
            min="0"
            max="200"
            aria-label={`جري معدل ${item.person.name}`}
            value={localInp.runCount === 0 ? '' : localInp.runCount}
            placeholder="0"
            onFocus={handleFocus}
            onKeyDown={(e) => onCellKeyDown(e, rowIndex, 4)}
            onChange={(e) =>
              handleChange('runCount', Math.max(0, Number(e.target.value) || 0))
            }
            className="w-16 px-2 py-1 text-center font-mono tabular-nums font-bold border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
          />
        </td>

        {/* 9. Col 5: Suburb Time Code */}
        <td className="py-2.5 px-3 text-center">
          <select
            id={`fast-grid-cell-${rowIndex}-5`}
            aria-label={`زمن الضاحية ${item.person.name}`}
            value={localInp.suburbTimeCode}
            onFocus={handleFocus}
            onKeyDown={(e) => onCellKeyDown(e, rowIndex, 5)}
            onChange={(e) => {
              const code = Number(e.target.value);
              const updated = { ...localInp, suburbTimeCode: code };
              if (code === 12) updated.attendanceStatus = 'medical';
              else if (code > 0 && updated.attendanceStatus === 'not_tested') {
                updated.attendanceStatus = 'tested';
              }
              setLocalInp(updated);
              onSaveRow(item.person.id, updated);
            }}
            className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 font-semibold cursor-pointer focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          >
            {suburbTimes.map((st) => (
              <option key={st.code} value={st.code}>
                {st.label} ({st.score}%)
              </option>
            ))}
          </select>
        </td>

        {/* 10. Exercises % */}
        <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
          {item.exercisesPercentage}%
        </td>

        {/* 11. Total % & Grade */}
        <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
          {item.totalPercentage}%{' '}
          <span className="font-sans text-[11px] font-normal text-slate-500">
            · {item.totalGrade}
          </span>
        </td>

        {/* 12. Overall Rank */}
        <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-slate-900 dark:text-white">
          {item.overallRank ? `#${item.overallRank}` : '-'}
        </td>
      </tr>
    );
  }
);

FastEntryRow.displayName = 'FastEntryRow';

interface FastEntryViewProps {
  periodName: string;
  items: EvaluatedAssessment[];
  suburbTimes: SuburbTimeStandard[];
  savedRowId: string | null;
  onSaveRow: (personId: string, input: AssessmentInput) => void;
  onOpenQuickEntry: () => void;
}

export const FastEntryView: React.FC<FastEntryViewProps> = ({
  periodName,
  items,
  suburbTimes,
  savedRowId,
  onSaveRow,
  onOpenQuickEntry,
}) => {
  // Filter States
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'officers' | 'other_ranks'>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'untested' | 'tested' | 'medical'>('all');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [corpsFilter, setCorpsFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number | 'all'>(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Extract distinct lists for dropdowns
  const distinctRanks = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.person.rank) set.add(i.person.rank);
    });
    return Array.from(set);
  }, [items]);

  const distinctCorps = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.person.corps) set.add(i.person.corps);
    });
    return Array.from(set);
  }, [items]);

  const distinctStages = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.stage.name) set.add(i.stage.name);
    });
    return Array.from(set);
  }, [items]);

  // Counts for Quick Filter Pills
  const counts = useMemo(() => {
    let officers = 0;
    let others = 0;
    let untested = 0;
    let tested = 0;
    let medical = 0;

    items.forEach((item) => {
      if (item.person.category === 'officers') officers++;
      else others++;

      const isUntested =
        item.input.attendanceStatus === 'not_tested' ||
        !item.isTested ||
        (item.input.pullupsCount === 0 &&
          item.input.pushupsCount === 0 &&
          item.input.situpsCount === 0 &&
          item.input.runCount === 0 &&
          item.input.suburbTimeCode === 0);

      if (item.input.attendanceStatus === 'medical') medical++;
      else if (isUntested) untested++;
      else tested++;
    });

    return { total: items.length, officers, others, untested, tested, medical };
  }, [items]);

  // Filter application
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Text Query (Search)
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const serialStr = `#${item.person.serialNum}`;
        const matchName = item.person.name.toLowerCase().includes(q);
        const matchRank = item.person.rank.toLowerCase().includes(q);
        const matchId = item.person.militaryId.toLowerCase().includes(q);
        const matchCorps = item.person.corps.toLowerCase().includes(q);
        const matchSerial = serialStr.includes(q) || String(item.person.serialNum) === q;

        if (!matchName && !matchRank && !matchId && !matchCorps && !matchSerial) {
          return false;
        }
      }

      // 2. Category
      if (categoryFilter === 'officers' && item.person.category !== 'officers') return false;
      if (categoryFilter === 'other_ranks' && item.person.category === 'officers') return false;

      // 3. Stage
      if (stageFilter !== 'all' && item.stage.name !== stageFilter) return false;

      // 4. Status
      if (statusFilter !== 'all') {
        const isUntested =
          item.input.attendanceStatus === 'not_tested' ||
          !item.isTested ||
          (item.input.pullupsCount === 0 &&
            item.input.pushupsCount === 0 &&
            item.input.situpsCount === 0 &&
            item.input.runCount === 0 &&
            item.input.suburbTimeCode === 0);

        if (statusFilter === 'untested' && !isUntested) return false;
        if (statusFilter === 'tested' && (isUntested || item.input.attendanceStatus === 'medical')) return false;
        if (statusFilter === 'medical' && item.input.attendanceStatus !== 'medical') return false;
      }

      // 5. Rank
      if (rankFilter !== 'all' && item.person.rank !== rankFilter) return false;

      // 6. Corps
      if (corpsFilter !== 'all' && item.person.corps !== corpsFilter) return false;

      return true;
    });
  }, [items, query, categoryFilter, stageFilter, statusFilter, rankFilter, corpsFilter]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, categoryFilter, stageFilter, statusFilter, rankFilter, corpsFilter, pageSize]);

  // Paginated View Items
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filteredItems.length / (pageSize as number)) || 1;
  const paginatedItems = useMemo(() => {
    if (pageSize === 'all') return filteredItems;
    const start = (currentPage - 1) * (pageSize as number);
    return filteredItems.slice(start, start + (pageSize as number));
  }, [filteredItems, currentPage, pageSize]);

  const isFiltered = Boolean(
    query.trim() ||
      categoryFilter !== 'all' ||
      stageFilter !== 'all' ||
      statusFilter !== 'all' ||
      rankFilter !== 'all' ||
      corpsFilter !== 'all'
  );

  const handleResetFilters = () => {
    setQuery('');
    setCategoryFilter('all');
    setStageFilter('all');
    setStatusFilter('all');
    setRankFilter('all');
    setCorpsFilter('all');
    setCurrentPage(1);
  };

  // Keyboard navigation across grid cells
  const focusGridCell = useCallback((r: number, c: number) => {
    const el = document.getElementById(`fast-grid-cell-${r}-${c}`);
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement) {
        el.select();
      }
    }
  }, []);

  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent, r: number, c: number) => {
      const maxRows = paginatedItems.length;

      if (e.key === 'Enter') {
        e.preventDefault();
        // Move to next cell horizontally; if at end of row, move to first exercise (pullups) of next person
        if (c < 5) {
          focusGridCell(r, c + 1);
        } else if (r < maxRows - 1) {
          focusGridCell(r + 1, 1);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (r < maxRows - 1) {
          focusGridCell(r + 1, c);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (r > 0) {
          focusGridCell(r - 1, c);
        }
      } else if (e.key === 'ArrowLeft') {
        // In RTL visual flow, ArrowLeft moves to next column
        if (c < 5) {
          e.preventDefault();
          focusGridCell(r, c + 1);
        }
      } else if (e.key === 'ArrowRight') {
        // In RTL visual flow, ArrowRight moves to previous column
        if (c > 0) {
          e.preventDefault();
          focusGridCell(r, c - 1);
        }
      }
    },
    [paginatedItems.length, focusGridCell]
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs space-y-0">
      {/* 1. Header & Primary Action Bar */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-600 rounded-lg text-white">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              واجهة الإدخال السريع المباشر ({periodName})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تنقل حر بين الحقول بالأسهم و Enter، مع حفظ فوري ولحظي في قاعدة بيانات SQLite المحلية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Search */}
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم، الرتبة، ر.ع، أو #المسلسل..."
              className="w-full pr-9 pl-8 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors ${
              showAdvancedFilters || isFiltered
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>فلترة متقدمة</span>
            {isFiltered && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
          </button>

          <button
            type="button"
            onClick={onOpenQuickEntry}
            className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة فرد جديد</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Filter Category Pills */}
      <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('all');
              setStatusFilter('all');
            }}
            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
              categoryFilter === 'all' && statusFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-emerald-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60'
            }`}
          >
            الكل ({counts.total})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('officers')}
            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
              categoryFilter === 'officers'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60'
            }`}
          >
            الضباط ({counts.officers})
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('other_ranks')}
            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
              categoryFilter === 'other_ranks'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60'
            }`}
          >
            الدرجات الأخرى ({counts.others})
          </button>

          <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>

          <button
            type="button"
            onClick={() => setStatusFilter('untested')}
            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
              statusFilter === 'untested'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-red-700 dark:text-red-400 hover:bg-red-50 border border-red-200 dark:border-red-900/40'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>بحاجة لرصد ({counts.untested})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('tested')}
            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
              statusFilter === 'tested'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 border border-emerald-200 dark:border-emerald-900/40'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>تم رصدهم ({counts.tested})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('medical')}
            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
              statusFilter === 'medical'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 border border-amber-200 dark:border-amber-900/40'
            }`}
          >
            موقف طبي ({counts.medical})
          </button>
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>إلغاء كل الفلاتر</span>
          </button>
        )}
      </div>

      {/* 3. Advanced Filtering Drawer (when toggled or active) */}
      {showAdvancedFilters && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs animate-in slide-in-from-top-2 duration-200">
          {/* Category Dropdown */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">الفئة (ضباط / درجات):</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 font-semibold cursor-pointer"
            >
              <option value="all">جميع الفئات ({counts.total})</option>
              <option value="officers">ضباط فقط ({counts.officers})</option>
              <option value="other_ranks">درجات أخرى فقط ({counts.others})</option>
            </select>
          </div>

          {/* Stage Dropdown */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">المرحلة التدريبية / السن:</label>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 font-semibold cursor-pointer"
            >
              <option value="all">جميع المراحل السنية</option>
              {distinctStages.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">حالة الرصد والتمام:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 font-semibold cursor-pointer"
            >
              <option value="all">جميع الحالات</option>
              <option value="untested">⚠️ بحاجة لرصد / غير مرصود</option>
              <option value="tested">✅ تم رصدهم واختبارهم</option>
              <option value="medical">🏥 موقف طبي رسمي</option>
            </select>
          </div>

          {/* Rank Dropdown */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">الرتبة العسكرية:</label>
            <select
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 font-semibold cursor-pointer"
            >
              <option value="all">جميع الرتب</option>
              {distinctRanks.map((rk) => (
                <option key={rk} value={rk}>
                  {rk}
                </option>
              ))}
            </select>
          </div>

          {/* Corps Dropdown */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">السلاح / التخصص:</label>
            <select
              value={corpsFilter}
              onChange={(e) => setCorpsFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 font-semibold cursor-pointer"
            >
              <option value="all">جميع الأسلحة</option>
              {distinctCorps.map((cp) => (
                <option key={cp} value={cp}>
                  {cp}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 4. Keyboard Shortcuts Guidance Strip */}
      <div className="px-5 py-2 bg-emerald-950 text-emerald-200 border-b border-emerald-900/60 flex flex-wrap items-center justify-between text-[11px] font-medium gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-amber-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            اختصارات لوحة المفاتيح الذكية:
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-emerald-900/80 border border-emerald-700 rounded text-[10px] font-mono text-white flex items-center gap-0.5">
              <CornerDownLeft className="w-3 h-3" /> Enter
            </kbd>{' '}
            أو{' '}
            <kbd className="px-1.5 py-0.5 bg-emerald-900/80 border border-emerald-700 rounded text-[10px] font-mono text-white">
              <ArrowLeft className="w-3 h-3 inline" />
            </kbd>{' '}
            : الانتقال للتمرين التالي
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-emerald-900/80 border border-emerald-700 rounded text-[10px] font-mono text-white">
              <ArrowDown className="w-3 h-3 inline" />
            </kbd>{' '}
            و{' '}
            <kbd className="px-1.5 py-0.5 bg-emerald-900/80 border border-emerald-700 rounded text-[10px] font-mono text-white">
              <ArrowUp className="w-3 h-3 inline" />
            </kbd>{' '}
            : الانتقال لنفس التمرين للفرد التالي / السابق
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-emerald-900/80 border border-emerald-700 rounded text-[10px] font-mono text-white">
              <ArrowRight className="w-3 h-3 inline" />
            </kbd>{' '}
            : الانتقال للتمرين السابق
          </span>
        </div>

        <div className="text-emerald-300 font-mono">
          معروض {paginatedItems.length} من أصل {filteredItems.length} فرد
          {isFiltered && ` (مُصفى من إجمالي ${items.length})`}
        </div>
      </div>

      {/* 5. Main Editable Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold select-none">
            <tr>
              <th className="py-2.5 px-3 text-center w-12">م</th>
              <th className="py-2.5 px-3 min-w-[200px]">الرتبة والاسم</th>
              <th className="py-2.5 px-2 text-center min-w-[110px]">السن / المرحلة</th>
              <th className="py-2.5 px-2 text-center min-w-[100px]">التمام</th>
              <th className="py-2.5 px-2 text-center w-20">عقلة (عدد)</th>
              <th className="py-2.5 px-2 text-center w-20">ضغط (عدد)</th>
              <th className="py-2.5 px-2 text-center w-20">بطن (عدد)</th>
              <th className="py-2.5 px-2 text-center w-20">جري معدل</th>
              <th className="py-2.5 px-3 text-center min-w-[140px]">كود زمن الضاحية</th>
              <th className="py-2.5 px-3 text-center w-24">نسبة التمرينات</th>
              <th className="py-2.5 px-3 text-center min-w-[120px]">الإجمالي العام</th>
              <th className="py-2.5 px-3 text-center w-16">الترتيب</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-8 h-8 text-slate-400" />
                    <p className="font-bold text-sm">لا توجد سجلات تطابق الفلاتر المحددة</p>
                    <p className="text-xs text-slate-400">جرب تعديل شروط البحث أو إعادة ضبط الفلاتر</p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      إعادة ضبط الفلاتر
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item, rowIdx) => (
                <FastEntryRow
                  key={item.person.id}
                  item={item}
                  rowIndex={rowIdx}
                  suburbTimes={suburbTimes}
                  isSaved={savedRowId === item.person.id}
                  onSaveRow={onSaveRow}
                  onCellKeyDown={handleCellKeyDown}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 6. Footer & Pagination Bar */}
      <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <span>عرض في الصفحة:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 font-semibold cursor-pointer"
          >
            <option value={25}>25 فرد</option>
            <option value={50}>50 فرد</option>
            <option value={100}>100 فرد</option>
            <option value="all">عرض الكل ({filteredItems.length})</option>
          </select>

          <span className="font-mono">
            صفحة {currentPage} من {totalPages}
          </span>
        </div>

        {pageSize !== 'all' && totalPages > 1 && (
          <div className="flex items-center gap-1 font-mono">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              title="الصفحة الأولى"
              className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              title="الصفحة السابقة"
              className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md font-bold">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              title="الصفحة التالية"
              className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="الصفحة الأخيرة"
              className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

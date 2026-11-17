import React, { useState, useEffect, memo } from 'react';
import { Search, UserPlus, Check, Database } from 'lucide-react';
import {
  EvaluatedAssessment,
  AssessmentInput,
  AttendanceStatus,
  SuburbTimeStandard,
  PersonRecord,
} from '../utils/scoring';

interface FastEntryRowProps {
  item: EvaluatedAssessment;
  suburbTimes: SuburbTimeStandard[];
  isSaved: boolean;
  onSaveRow: (personId: string, input: AssessmentInput) => void;
}

const FastEntryRow = memo<FastEntryRowProps>(
  ({ item, suburbTimes, isSaved, onSaveRow }) => {
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

    return (
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
        <td className="py-2 px-3 text-center font-mono tabular-nums text-slate-500">
          <div className="flex items-center justify-center gap-1">
            <span>{item.person.serialNum}</span>
            {isSaved && <Check className="w-3 h-3 text-emerald-600 animate-pulse" />}
          </div>
        </td>
        <td className="py-2 px-3">
          <div className="font-bold text-slate-900 dark:text-white">
            {item.person.rank} / {item.person.name}
          </div>
          <div className="text-[11px] text-slate-400">
            {item.person.corps} · ر.ع: {item.person.militaryId}
          </div>
        </td>
        <td className="py-2 px-2 text-center text-slate-500 whitespace-nowrap">
          <span className="font-mono tabular-nums font-bold text-slate-700 dark:text-slate-300">
            {item.person.age}
          </span>{' '}
          · {item.stage.name}
        </td>
        <td className="py-2 px-2 text-center">
          <select
            aria-label={`تمام ${item.person.name}`}
            value={localInp.attendanceStatus}
            onChange={(e) =>
              handleChange('attendanceStatus', e.target.value as AttendanceStatus)
            }
            className={`px-2 py-1 text-xs border rounded-md font-semibold ${
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
        <td className="py-2 px-2 text-center">
          <input
            type="number"
            min="0"
            max="100"
            aria-label={`عقلة ${item.person.name}`}
            value={localInp.pullupsCount === 0 ? '' : localInp.pullupsCount}
            placeholder="0"
            onChange={(e) =>
              handleChange('pullupsCount', Math.max(0, Number(e.target.value) || 0))
            }
            className="w-16 px-2 py-1 text-center font-mono tabular-nums font-bold border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden"
          />
        </td>
        <td className="py-2 px-2 text-center">
          <input
            type="number"
            min="0"
            max="200"
            aria-label={`ضغط ${item.person.name}`}
            value={localInp.pushupsCount === 0 ? '' : localInp.pushupsCount}
            placeholder="0"
            onChange={(e) =>
              handleChange('pushupsCount', Math.max(0, Number(e.target.value) || 0))
            }
            className="w-16 px-2 py-1 text-center font-mono tabular-nums font-bold border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden"
          />
        </td>
        <td className="py-2 px-2 text-center">
          <input
            type="number"
            min="0"
            max="200"
            aria-label={`بطن ${item.person.name}`}
            value={localInp.situpsCount === 0 ? '' : localInp.situpsCount}
            placeholder="0"
            onChange={(e) =>
              handleChange('situpsCount', Math.max(0, Number(e.target.value) || 0))
            }
            className="w-16 px-2 py-1 text-center font-mono tabular-nums font-bold border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden"
          />
        </td>
        <td className="py-2 px-2 text-center">
          <input
            type="number"
            min="0"
            max="200"
            aria-label={`جري معدل ${item.person.name}`}
            value={localInp.runCount === 0 ? '' : localInp.runCount}
            placeholder="0"
            onChange={(e) =>
              handleChange('runCount', Math.max(0, Number(e.target.value) || 0))
            }
            className="w-16 px-2 py-1 text-center font-mono tabular-nums font-bold border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden"
          />
        </td>
        <td className="py-2 px-3 text-center">
          <select
            aria-label={`زمن الضاحية ${item.person.name}`}
            value={localInp.suburbTimeCode}
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
            className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 font-semibold"
          >
            {suburbTimes.map((st) => (
              <option key={st.code} value={st.code}>
                {st.label} ({st.score}%)
              </option>
            ))}
          </select>
        </td>
        <td className="py-2 px-3 text-center font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
          {item.exercisesPercentage}%
        </td>
        <td className="py-2 px-3 text-center font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
          {item.totalPercentage}%{' '}
          <span className="font-sans text-[11px] font-normal text-slate-500">
            · {item.totalGrade}
          </span>
        </td>
        <td className="py-2 px-3 text-center font-mono tabular-nums font-bold text-slate-900 dark:text-white">
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
  const [query, setQuery] = useState('');

  const filtered = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.trim();
    return (
      item.person.name.includes(q) ||
      item.person.rank.includes(q) ||
      item.person.militaryId.includes(q) ||
      item.person.corps.includes(q)
    );
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            واجهة الإدخال السريع المباشر ({periodName})
          </h2>
          <p className="text-xs text-slate-500">
            عدّل أعداد التمرينات أو زمن الضاحية لأي فرد وسيتم حساب النسبة والحفظ في SQLite فوراً بدون تأخير
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث سريع بالاسم أو الرتبة..."
              className="w-full pr-9 pl-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="button"
            onClick={onOpenQuickEntry}
            className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة فرد جديد</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold">
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
              <th className="py-2.5 px-3 text-center">الإجمالي العام</th>
              <th className="py-2.5 px-3 text-center">الترتيب</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((item) => (
              <FastEntryRow
                key={item.person.id}
                item={item}
                suburbTimes={suburbTimes}
                isSaved={savedRowId === item.person.id}
                onSaveRow={onSaveRow}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

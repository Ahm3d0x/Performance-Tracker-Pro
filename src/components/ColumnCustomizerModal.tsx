import React, { useState } from 'react';
import {
  X,
  CheckSquare,
  Square,
  RotateCcw,
  Sliders,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  ALL_COLUMNS,
  COLUMN_CATEGORIES,
  DEFAULT_VISIBLE_COLUMNS,
  PRESET_OFFICIAL_STANDARD,
  PRESET_BRIEF,
  PRESET_PHYSICAL_ONLY,
  PRESET_FULL_DOSSIER,
  PRESET_COMPARISON_FOCUS,
  PRESET_SKILLS_FOCUS,
} from '../utils/columnConfig';

interface ColumnCustomizerModalProps {
  visibleColumns: string[];
  onChangeColumns: (cols: string[]) => void;
  onClose: () => void;
  title?: string;
  description?: string;
}

export const ColumnCustomizerModal: React.FC<ColumnCustomizerModalProps> = ({
  visibleColumns,
  onChangeColumns,
  onClose,
  title = 'تخصيص وتحديد الأعمدة المعروضة',
  description = 'حدد البيانات والحقول المطلوب ظهورها في الجدول أو كشوف الطباعة والتصدير',
}) => {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(visibleColumns.length > 0 ? visibleColumns : DEFAULT_VISIBLE_COLUMNS)
  );

  const toggleColumn = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Prevent unselecting everything - keep at least 1 column
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(ALL_COLUMNS.map((c) => c.id)));
  };

  const deselectAll = () => {
    // Keep at least basic identifiers (rank, name)
    setSelected(new Set(['rank', 'name', 'totalPercentage']));
  };

  const applyPreset = (presetCols: string[]) => {
    setSelected(new Set(presetCols));
  };

  const handleSave = () => {
    onChangeColumns(Array.from(selected));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {title}
              </h2>
              <p className="text-xs text-slate-500">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Bar */}
        <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="text-[11px] font-bold text-slate-500 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>نماذج وقوالب جاهزة سريعة:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => applyPreset(PRESET_OFFICIAL_STANDARD)}
              className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs"
            >
              الرسمي القياسي
            </button>
            <button
              type="button"
              onClick={() => applyPreset(PRESET_BRIEF)}
              className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs"
            >
              المختصر السريع
            </button>
            <button
              type="button"
              onClick={() => applyPreset(PRESET_PHYSICAL_ONLY)}
              className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs"
            >
              التمرينات والضاحية فقط
            </button>
            <button
              type="button"
              onClick={() => applyPreset(PRESET_COMPARISON_FOCUS)}
              className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs"
            >
              المقارنة والتطور
            </button>
            <button
              type="button"
              onClick={() => applyPreset(PRESET_SKILLS_FOCUS)}
              className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs"
            >
              المهارات العسكرية
            </button>
            <button
              type="button"
              onClick={() => applyPreset(PRESET_FULL_DOSSIER)}
              className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg hover:bg-emerald-100 cursor-pointer"
            >
              الكشف الشامل (كل الأعمدة)
            </button>
          </div>
        </div>

        {/* Content: Columns Grouped by Category */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {COLUMN_CATEGORIES.map((cat) => {
            const catCols = ALL_COLUMNS.filter((c) => c.category === cat.id);
            const selectedCount = catCols.filter((c) => selected.has(c.id)).length;
            const allCatSelected = selectedCount === catCols.length;

            const toggleCategory = () => {
              setSelected((prev) => {
                const next = new Set(prev);
                if (allCatSelected) {
                  catCols.forEach((c) => next.delete(c.id));
                  if (next.size === 0) next.add('name');
                } else {
                  catCols.forEach((c) => next.add(c.id));
                }
                return next;
              });
            };

            return (
              <div
                key={cat.id}
                className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/20"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {cat.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {selectedCount} / {catCols.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleCategory}
                    className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {allCatSelected ? 'إلغاء تحديد القسم' : 'تحديد قسم بالكامل'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {catCols.map((col) => {
                    const isChecked = selected.has(col.id);
                    return (
                      <label
                        key={col.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 font-semibold shadow-2xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleColumn(col.id)}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-400 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="truncate">{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>تحديد الكل</span>
            </button>
            <button
              type="button"
              onClick={deselectAll}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 text-slate-500" />
              <span>إلغاء الكل</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset(DEFAULT_VISIBLE_COLUMNS)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>الوضع الافتراضي</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-500">
              تم تفعيل {selected.size} من {ALL_COLUMNS.length} عمود
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded-lg cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>تطبيق التخصيص</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

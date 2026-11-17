import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  Sliders,
  FileSpreadsheet,
  Check,
  Layout,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  EvaluatedAssessment,
  UnitPeriodSummary,
  PeriodComparisonItem,
  ScoringSettings,
} from '../utils/scoring';
import { PeriodRecord } from '../data/seedPersonnel';
import {
  downloadStandalonePrintReportHtml,
  printStandaloneReportDirectly,
  exportCustomFilteredExcel,
} from '../utils/exportFile';
import {
  ALL_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
  PRESET_OFFICIAL_STANDARD,
  PRESET_BRIEF,
  PRESET_PHYSICAL_ONLY,
  PRESET_FULL_DOSSIER,
  PRESET_COMPARISON_FOCUS,
} from '../utils/columnConfig';
import { ColumnCustomizerModal } from './ColumnCustomizerModal';

interface PrintReportModalProps {
  period: PeriodRecord;
  previousPeriodName?: string;
  settings: ScoringSettings;
  evaluated: EvaluatedAssessment[];
  summary: UnitPeriodSummary;
  comparisons: PeriodComparisonItem[];
  initialVisibleColumns?: string[];
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  period,
  previousPeriodName,
  settings,
  evaluated,
  summary,
  comparisons,
  initialVisibleColumns,
  onClose,
}) => {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    initialVisibleColumns && initialVisibleColumns.length > 0
      ? initialVisibleColumns
      : DEFAULT_VISIBLE_COLUMNS
  );
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showSummary, setShowSummary] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [density, setDensity] = useState<'compact' | 'normal'>('compact');

  React.useEffect(() => {
    document.body.classList.add('has-modal-open', 'has-print-modal');
    return () => {
      document.body.classList.remove('has-modal-open', 'has-print-modal');
    };
  }, []);

  const handlePrintDirectly = () => {
    printStandaloneReportDirectly(
      period,
      settings,
      evaluated,
      summary,
      comparisons,
      previousPeriodName,
      {
        visibleColumns,
        showSummary,
        showSignatures,
        orientation,
        density,
      }
    );
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handlePrintDirectly();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const sortedByRank = [...evaluated].sort((a, b) => {
    if (a.overallRank && b.overallRank) return a.overallRank - b.overallRank;
    if (a.overallRank) return -1;
    if (b.overallRank) return 1;
    return a.person.serialNum - b.person.serialNum;
  });

  const compMap = new Map<string, PeriodComparisonItem>();
  comparisons.forEach((c) => compMap.set(c.person.id, c));

  const activeCols = ALL_COLUMNS.filter((c) => visibleColumns.includes(c.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-2xs p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-report-title"
    >
      <div className="bg-white text-slate-900 border border-slate-300 rounded-2xl w-full max-w-7xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[96vh]">
        {/* Control Bar (Hidden when printing) */}
        <div className="bg-slate-900 text-white p-4 no-print shrink-0 space-y-3 border-b border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-600 rounded-lg text-white">
                  <Printer className="w-4 h-4" />
                </span>
                <h2 id="print-report-title" className="text-sm sm:text-base font-bold">
                  مركز الطباعة المتقدم والتصدير الرسمي (A4)
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تخصيص كامل للأعمدة، الأقسام، الاتجاه، وهوامش الورق للطباعة المباشرة أو الحفظ كـ PDF
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrintDirectly}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة / PDF الآن</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadStandalonePrintReportHtml(
                    period,
                    settings,
                    evaluated,
                    summary,
                    comparisons,
                    previousPeriodName,
                    {
                      visibleColumns,
                      showSummary,
                      showSignatures,
                      orientation,
                      density,
                    }
                  )
                }
                className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>تحميل HTML مستقل</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  exportCustomFilteredExcel({
                    period,
                    items: sortedByRank,
                    comparisonMap: compMap,
                    visibleColumns,
                    title: `كشف_اللياقة_المخصص_${period.name}`,
                  })
                }
                className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير Excel بالأعمدة الحالية</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق معاينة التقرير"
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Customization Toolbar */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Presets and Columns Button */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCustomizer(true)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>تخصيص الأعمدة ({activeCols.length})</span>
              </button>

              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
                <span className="text-[11px] text-slate-400 px-2 font-semibold">قوالب:</span>
                <button
                  type="button"
                  onClick={() => setVisibleColumns(PRESET_OFFICIAL_STANDARD)}
                  className="px-2 py-1 text-[11px] font-semibold bg-slate-700 hover:bg-slate-600 text-white rounded cursor-pointer"
                >
                  القياسي
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleColumns(PRESET_BRIEF)}
                  className="px-2 py-1 text-[11px] font-semibold bg-slate-700 hover:bg-slate-600 text-white rounded cursor-pointer"
                >
                  المختصر
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleColumns(PRESET_PHYSICAL_ONLY)}
                  className="px-2 py-1 text-[11px] font-semibold bg-slate-700 hover:bg-slate-600 text-white rounded cursor-pointer"
                >
                  التمارين والضاحية
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleColumns(PRESET_COMPARISON_FOCUS)}
                  className="px-2 py-1 text-[11px] font-semibold bg-slate-700 hover:bg-slate-600 text-white rounded cursor-pointer"
                >
                  المقارنة والتطور
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleColumns(PRESET_FULL_DOSSIER)}
                  className="px-2 py-1 text-[11px] font-semibold bg-slate-700 hover:bg-slate-600 text-white rounded cursor-pointer"
                >
                  الشامل
                </button>
              </div>
            </div>

            {/* Layout, Sections & Orientation controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Section Checkboxes */}
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSummary}
                  onChange={(e) => setShowSummary(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-0"
                />
                <span>جدول الإجماليات</span>
              </label>

              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSignatures}
                  onChange={(e) => setShowSignatures(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-0"
                />
                <span>توقيعات الاعتماد</span>
              </label>

              {/* Orientation toggle */}
              <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-colors ${
                    orientation === 'landscape'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  عرضي (Landscape)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer transition-colors ${
                    orientation === 'portrait'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  طولي (Portrait)
                </button>
              </div>

              {/* Density toggle */}
              <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setDensity('compact')}
                  className={`px-2 py-1 text-[11px] font-semibold rounded cursor-pointer transition-colors ${
                    density === 'compact'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  مضغوط (A4)
                </button>
                <button
                  type="button"
                  onClick={() => setDensity('normal')}
                  className={`px-2 py-1 text-[11px] font-semibold rounded cursor-pointer transition-colors ${
                    density === 'normal'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  عادي
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Printable A4 Report Sheet Viewport */}
        <div className="p-6 sm:p-8 print:p-0 overflow-y-auto print:overflow-visible flex-1 bg-white text-slate-900 space-y-5 print:space-y-3">
          {/* Official Military Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
            <div className="text-[11px] font-bold space-y-0.5 leading-snug">
              <div>{settings.ministryHeader}</div>
              <div>{settings.authorityHeader}</div>
              <div>{settings.branchHeader}</div>
              <div className="text-emerald-900">الوحدة: {settings.unitName}</div>
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                كشف النتائج والترتيب التنازلي لاختبارات اللياقة البدنية
              </h1>
              <div className="text-xs text-slate-600 font-semibold">
                <span>الفترة: {period.name}</span>
                <span className="mx-2">·</span>
                <span>التاريخ: {period.date}</span>
                <span className="mx-2">·</span>
                <span>لصالح: {period.beneficiary}</span>
              </div>
            </div>

            <div className="text-[11px] font-bold space-y-0.5 text-left leading-snug">
              <div>إجمالي القوة: {summary.overall.totalStrength} فرد</div>
              <div>نسبة النجاح: {summary.overall.passRate}%</div>
              <div>النسبة الإجمالية: {summary.overall.avgTotalPercentage}%</div>
              <div className="text-slate-500 font-normal">
                طُبعت: {new Date().toLocaleDateString('ar-EG')}
              </div>
            </div>
          </div>

          {/* Section 1: Summary Table (Officers / Other Ranks / Total) */}
          {showSummary && (
            <div>
              <div className="text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>أولاً: بيان إجماليات الوحدة (الضباط / الدرجات الأخرى / الإجمالي العام)</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  حاصلين على ممتاز: {summary.overall.excellentCount} فرد
                </span>
              </div>
              <table className="w-full text-[11px] border-collapse border border-slate-400 text-center">
                <thead className="bg-slate-100 font-bold">
                  <tr>
                    <th className="border border-slate-400 py-1.5 px-3 text-right">البيان</th>
                    <th className="border border-slate-400 py-1.5 px-2">إجمالي القوة</th>
                    <th className="border border-slate-400 py-1.5 px-2">مختبرين</th>
                    <th className="border border-slate-400 py-1.5 px-2">موقف طبي</th>
                    <th className="border border-slate-400 py-1.5 px-2">لم يختبر</th>
                    <th className="border border-slate-400 py-1.5 px-2">نتيجة التمرينات</th>
                    <th className="border border-slate-400 py-1.5 px-2">نتيجة الضاحية</th>
                    <th className="border border-slate-400 py-1.5 px-2">إجمالي النتيجة</th>
                    <th className="border border-slate-400 py-1.5 px-2">نسبة النجاح</th>
                    <th className="border border-slate-400 py-1.5 px-2">امتياز</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  <tr>
                    <td className="border border-slate-400 py-1 px-3 text-right font-sans font-semibold">
                      الضباط
                    </td>
                    <td className="border border-slate-400 py-1 px-2">{summary.officers.totalStrength}</td>
                    <td className="border border-slate-400 py-1 px-2">{summary.officers.testedCount}</td>
                    <td className="border border-slate-400 py-1 px-2">{summary.officers.medicalCount}</td>
                    <td className="border border-slate-400 py-1 px-2">{summary.officers.untestedCount}</td>
                    <td className="border border-slate-400 py-1 px-2 font-bold">{summary.officers.avgExercisesPercentage}%</td>
                    <td className="border border-slate-400 py-1 px-2 font-bold">{summary.officers.avgSuburbPercentage}%</td>
                    <td className="border border-slate-400 py-1 px-2 font-bold text-emerald-800">{summary.officers.avgTotalPercentage}%</td>
                    <td className="border border-slate-400 py-1 px-2">{summary.officers.passRate}%</td>
                    <td className="border border-slate-400 py-1 px-2">{summary.officers.excellentCount}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-400 py-1 px-3 text-right font-sans font-semibold">
                      الدرجات الأخرى
                    </td>
                    <td className="border border-slate-400 py-1 px-2">{summary.otherRanks.totalStrength}</td>
                    <td className="border border-slate-400 py-1 px-2">{summary.otherRanks.testedCount}</td>
                    <td className="border border-slate-400 py-1 px-2">{summary.otherRanks.medicalCount}</td>
                    <td className="border border-slate-400 py-1 px-2">{summary.otherRanks.untestedCount}</td>
                    <td className="border border-slate-400 py-1 px-2 font-bold">{summary.otherRanks.avgExercisesPercentage}%</td>
                    <td className="border border-slate-400 py-1 px-2 font-bold">{summary.otherRanks.avgSuburbPercentage}%</td>
                    <td className="border border-slate-400 py-1 px-2 font-bold text-emerald-800">{summary.otherRanks.avgTotalPercentage}%</td>
                    <td className="border border-slate-400 py-1 px-2">{summary.otherRanks.passRate}%</td>
                    <td className="border border-slate-400 py-1 px-2">{summary.otherRanks.excellentCount}</td>
                  </tr>
                  <tr className="bg-emerald-50/80 font-bold">
                    <td className="border border-slate-400 py-1.5 px-3 text-right font-sans">
                      إجمالي النتيجة للوحدة
                    </td>
                    <td className="border border-slate-400 py-1.5 px-2">{summary.overall.totalStrength}</td>
                    <td className="border border-slate-400 py-1.5 px-2">{summary.overall.testedCount}</td>
                    <td className="border border-slate-400 py-1.5 px-2">{summary.overall.medicalCount}</td>
                    <td className="border border-slate-400 py-1.5 px-2">{summary.overall.untestedCount}</td>
                    <td className="border border-slate-400 py-1.5 px-2">{summary.overall.avgExercisesPercentage}%</td>
                    <td className="border border-slate-400 py-1.5 px-2">{summary.overall.avgSuburbPercentage}%</td>
                    <td className="border border-slate-400 py-1.5 px-2 text-emerald-900">{summary.overall.avgTotalPercentage}%</td>
                    <td className="border border-slate-400 py-1.5 px-2">{summary.overall.passRate}%</td>
                    <td className="border border-slate-400 py-1.5 px-2">{summary.overall.excellentCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Section 2: Dynamic Ranked Personnel Table */}
          <div>
            <div className="text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>ثانياً: كشف الترتيب التنازلي للأفراد والنتائج التفصيلية</span>
              <span className="text-[10px] text-slate-500 font-mono">
                ({sortedByRank.length} فرد · {activeCols.length} عمود معروض)
              </span>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <table
                className={`w-full border-collapse border border-slate-400 text-center ${
                  density === 'compact' ? 'text-[10px]' : 'text-[11px]'
                }`}
              >
                <thead className="bg-slate-100 font-bold text-slate-900">
                  <tr>
                    {activeCols.map((col) => (
                      <th
                        key={col.id}
                        className={`border border-slate-400 ${
                          density === 'compact' ? 'py-1 px-1.5' : 'py-1.5 px-2'
                        } ${col.align === 'right' ? 'text-right' : 'text-center'}`}
                      >
                        {col.shortLabel || col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {sortedByRank.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeCols.length}
                        className="border border-slate-400 py-6 text-center text-slate-400"
                      >
                        لا توجد سجلات لعرضها
                      </td>
                    </tr>
                  ) : (
                    sortedByRank.map((item) => {
                      const comp = compMap.get(item.person.id);
                      return (
                        <tr key={item.person.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                          {activeCols.map((col) => {
                            const val = col.renderText ? col.renderText(item, comp) : '-';
                            const isName = col.id === 'name';
                            const isRank = col.id === 'overallRank';
                            const isTotal = col.id === 'totalPercentage';
                            return (
                              <td
                                key={col.id}
                                className={`border border-slate-400 ${
                                  density === 'compact' ? 'py-0.5 px-1.5' : 'py-1 px-2'
                                } ${col.align === 'right' ? 'text-right font-medium' : 'text-center'} ${
                                  isRank ? 'font-mono font-bold text-emerald-800' : ''
                                } ${isTotal ? 'font-mono font-bold text-slate-900' : ''} ${
                                  isName ? 'font-semibold text-slate-900' : ''
                                }`}
                              >
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Military Authorization Signatures */}
          {showSignatures && (
            <div className="pt-4 border-t border-slate-900 flex justify-between items-start text-xs text-center page-break-inside-avoid">
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
          )}
        </div>
      </div>

      {/* Column Customizer Modal */}
      {showCustomizer && (
        <ColumnCustomizerModal
          visibleColumns={visibleColumns}
          onChangeColumns={(cols) => setVisibleColumns(cols)}
          onClose={() => setShowCustomizer(false)}
          title="تخصيص أعمدة تقرير الطباعة"
          description="اختر الأعمدة المراد إظهارها في ورقة الطباعة وملف PDF"
        />
      )}
    </div>
  );
};

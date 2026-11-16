import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import {
  EvaluatedAssessment,
  UnitPeriodSummary,
  PeriodComparisonItem,
  ScoringSettings,
} from '../utils/scoring';
import { PeriodRecord } from '../data/seedPersonnel';
import { downloadStandalonePrintReportHtml } from '../utils/exportFile';

interface PrintReportModalProps {
  period: PeriodRecord;
  previousPeriodName?: string;
  settings: ScoringSettings;
  evaluated: EvaluatedAssessment[];
  summary: UnitPeriodSummary;
  comparisons: PeriodComparisonItem[];
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  period,
  previousPeriodName,
  settings,
  evaluated,
  summary,
  comparisons,
  onClose,
}) => {
  const sortedByRank = [...evaluated].sort((a, b) => {
    if (a.overallRank && b.overallRank) return a.overallRank - b.overallRank;
    if (a.overallRank) return -1;
    if (b.overallRank) return 1;
    return a.person.serialNum - b.person.serialNum;
  });

  const compMap = new Map<string, PeriodComparisonItem>();
  comparisons.forEach((c) => compMap.set(c.person.id, c));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-report-title"
    >
      <div className="bg-white text-slate-900 border border-slate-300 rounded-xl w-full max-w-6xl shadow-2xl overflow-hidden my-6">
        {/* Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white no-print">
          <div>
            <h2 id="print-report-title" className="text-base font-bold">
              معاينة التقرير الرسمي للطباعة وتصدير PDF
            </h2>
            <p className="text-xs text-slate-300">
              مُنسق رسمياً بمقاس A4 مع ترويسة وزارة الدفاع وإجماليات الضباط والدرجات الأخرى والترتيب التنازلي
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ كملف PDF الآن</span>
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
                  previousPeriodName
                )
              }
              className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تحميل ملف التقرير الجاهز للطباعة</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق معاينة التقرير"
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable A4 Report Sheet */}
        <div className="p-8 max-h-[82vh] overflow-y-auto space-y-6 bg-white text-slate-900">
          {/* Official Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div className="text-xs font-bold space-y-1">
              <div>{settings.ministryHeader}</div>
              <div>{settings.authorityHeader}</div>
              <div>{settings.branchHeader}</div>
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-lg font-bold text-slate-900">
                كشف النتائج والترتيب التنازلي لاختبارات اللياقة البدنية
              </h1>
              <div className="text-xs text-slate-600">
                <span>الوحدة: {period.unitName}</span>
                <span className="mx-2">·</span>
                <span>الفترة: {period.name}</span>
                <span className="mx-2">·</span>
                <span>التاريخ: {period.date}</span>
              </div>
            </div>

            <div className="text-xs font-bold space-y-1 text-left">
              <div>اختبار لصالح: {period.beneficiary}</div>
              <div>إجمالي القوة: {summary.overall.totalStrength} فرد</div>
              <div>النسبة الإجمالية للوحدة: {summary.overall.avgTotalPercentage}%</div>
            </div>
          </div>

          {/* Summary Table (Officers / Other Ranks / Total) */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 mb-2">
              أولاً: بيان إجماليات الوحدة (الضباط / الدرجات الأخرى / الإجمالي العام)
            </h3>
            <table className="w-full text-xs border-collapse border border-slate-400 text-center">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="border border-slate-400 py-2 px-3 text-right">البيان</th>
                  <th className="border border-slate-400 py-2 px-2">إجمالي القوة</th>
                  <th className="border border-slate-400 py-2 px-2">مختبرين</th>
                  <th className="border border-slate-400 py-2 px-2">موقف طبي</th>
                  <th className="border border-slate-400 py-2 px-2">لم يختبر</th>
                  <th className="border border-slate-400 py-2 px-2">نتيجة التمرينات</th>
                  <th className="border border-slate-400 py-2 px-2">نتيجة الضاحية</th>
                  <th className="border border-slate-400 py-2 px-2">إجمالي النتيجة</th>
                  <th className="border border-slate-400 py-2 px-2">نسبة النجاح</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                <tr>
                  <td className="border border-slate-400 py-1.5 px-3 text-right font-sans font-semibold">
                    الضباط
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2">
                    {summary.officers.totalStrength}
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2">
                    {summary.officers.testedCount}
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2">
                    {summary.officers.medicalCount}
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2">
                    {summary.officers.untestedCount}
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2 font-bold">
                    {summary.officers.avgExercisesPercentage}%
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2 font-bold">
                    {summary.officers.avgSuburbPercentage}%
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2 font-bold">
                    {summary.officers.avgTotalPercentage}%
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2">
                    {summary.officers.passRate}%
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-400 py-1.5 px-3 text-right font-sans font-semibold">
                    الدرجات الأخرى
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2">
                    {summary.otherRanks.totalStrength}
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2">
                    {summary.otherRanks.testedCount}
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2">
                    {summary.otherRanks.medicalCount}
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2">
                    {summary.otherRanks.untestedCount}
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2 font-bold">
                    {summary.otherRanks.avgExercisesPercentage}%
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2 font-bold">
                    {summary.otherRanks.avgSuburbPercentage}%
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2 font-bold">
                    {summary.otherRanks.avgTotalPercentage}%
                  </td>
                  <td className="border border-slate-400 py-1.5 px-2">
                    {summary.otherRanks.passRate}%
                  </td>
                </tr>
                <tr className="bg-emerald-50 font-bold">
                  <td className="border border-slate-400 py-2 px-3 text-right font-sans">
                    إجمالي النتيجة للوحدة
                  </td>
                  <td className="border border-slate-400 py-2 px-2">
                    {summary.overall.totalStrength}
                  </td>
                  <td className="border border-slate-400 py-2 px-2">
                    {summary.overall.testedCount}
                  </td>
                  <td className="border border-slate-400 py-2 px-2">
                    {summary.overall.medicalCount}
                  </td>
                  <td className="border border-slate-400 py-2 px-2">
                    {summary.overall.untestedCount}
                  </td>
                  <td className="border border-slate-400 py-2 px-2">
                    {summary.overall.avgExercisesPercentage}%
                  </td>
                  <td className="border border-slate-400 py-2 px-2">
                    {summary.overall.avgSuburbPercentage}%
                  </td>
                  <td className="border border-slate-400 py-2 px-2 text-emerald-800">
                    {summary.overall.avgTotalPercentage}%
                  </td>
                  <td className="border border-slate-400 py-2 px-2">
                    {summary.overall.passRate}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Ranked Personnel Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 mb-2">
              ثانياً: كشف الترتيب التنازلي للأفراد (من الأعلى في المستوى إلى الأقل)
            </h3>
            <table className="w-full text-[11px] border-collapse border border-slate-400 text-center">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="border border-slate-400 py-1.5 px-1.5">الترتيب</th>
                  <th className="border border-slate-400 py-1.5 px-1.5">م</th>
                  <th className="border border-slate-400 py-1.5 px-2">الرتبة/الدرجة</th>
                  <th className="border border-slate-400 py-1.5 px-3 text-right">الاسم</th>
                  <th className="border border-slate-400 py-1.5 px-1.5">السن</th>
                  <th className="border border-slate-400 py-1.5 px-2">المرحلة</th>
                  <th className="border border-slate-400 py-1.5 px-1.5">عقلة</th>
                  <th className="border border-slate-400 py-1.5 px-1.5">ضغط</th>
                  <th className="border border-slate-400 py-1.5 px-1.5">بطن</th>
                  <th className="border border-slate-400 py-1.5 px-1.5">جري</th>
                  <th className="border border-slate-400 py-1.5 px-2">نسبة التمرينات</th>
                  <th className="border border-slate-400 py-1.5 px-2">الضاحية</th>
                  <th className="border border-slate-400 py-1.5 px-2">إجمالي النتيجة</th>
                  <th className="border border-slate-400 py-1.5 px-2">التقدير</th>
                  <th className="border border-slate-400 py-1.5 px-2">الفرق عن السابق</th>
                </tr>
              </thead>
              <tbody>
                {sortedByRank.map((item) => {
                  const comp = compMap.get(item.person.id);
                  const deltaText =
                    comp && comp.percentageDelta !== null
                      ? comp.percentageDelta > 0
                        ? `+${comp.percentageDelta}%`
                        : `${comp.percentageDelta}%`
                      : '-';
                  return (
                    <tr key={item.person.id}>
                      <td className="border border-slate-400 py-1 px-1.5 font-mono tabular-nums font-bold">
                        {item.overallRank ? `#${item.overallRank}` : '-'}
                      </td>
                      <td className="border border-slate-400 py-1 px-1.5 font-mono tabular-nums">
                        {item.person.serialNum}
                      </td>
                      <td className="border border-slate-400 py-1 px-2">
                        {item.person.rank}
                      </td>
                      <td className="border border-slate-400 py-1 px-3 text-right font-semibold">
                        {item.person.name}
                      </td>
                      <td className="border border-slate-400 py-1 px-1.5 font-mono tabular-nums">
                        {item.person.age}
                      </td>
                      <td className="border border-slate-400 py-1 px-2">
                        {item.stage.name}
                      </td>
                      <td className="border border-slate-400 py-1 px-1.5 font-mono tabular-nums">
                        {item.input.pullupsCount}
                      </td>
                      <td className="border border-slate-400 py-1 px-1.5 font-mono tabular-nums">
                        {item.input.pushupsCount}
                      </td>
                      <td className="border border-slate-400 py-1 px-1.5 font-mono tabular-nums">
                        {item.input.situpsCount}
                      </td>
                      <td className="border border-slate-400 py-1 px-1.5 font-mono tabular-nums">
                        {item.input.runCount}
                      </td>
                      <td className="border border-slate-400 py-1 px-2 font-mono tabular-nums font-bold">
                        {item.exercisesPercentage}%
                      </td>
                      <td className="border border-slate-400 py-1 px-2 font-mono tabular-nums">
                        {item.suburbScore}% ({item.suburbLabel})
                      </td>
                      <td className="border border-slate-400 py-1 px-2 font-mono tabular-nums font-bold">
                        {item.totalPercentage}%
                      </td>
                      <td className="border border-slate-400 py-1 px-2">
                        {item.totalGrade}
                      </td>
                      <td className="border border-slate-400 py-1 px-2 font-mono tabular-nums">
                        {deltaText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

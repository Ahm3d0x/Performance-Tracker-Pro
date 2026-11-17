import * as XLSX from 'xlsx';
import {
  EvaluatedAssessment,
  UnitPeriodSummary,
  PeriodComparisonItem,
  ScoringSettings,
  PersonRecord,
} from './scoring';
import { PeriodRecord } from '../data/seedPersonnel';
import {
  ALL_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
} from './columnConfig';

// -------------------------------------------------------------
// 1. Export Custom Filtered View to Excel (.xlsx)
// -------------------------------------------------------------
export function exportCustomFilteredExcel({
  period,
  items,
  comparisonMap,
  visibleColumns = DEFAULT_VISIBLE_COLUMNS,
  title = 'كشف_اللياقة_البدنية_المخصص',
}: {
  period: PeriodRecord;
  items: EvaluatedAssessment[];
  comparisonMap?: Map<string, PeriodComparisonItem>;
  visibleColumns?: string[];
  title?: string;
}) {
  const wb = XLSX.utils.book_new();

  const activeCols = ALL_COLUMNS.filter((c) => visibleColumns.includes(c.id));

  const rows = items.map((item) => {
    const comp = comparisonMap?.get(item.person.id);
    const rowObj: Record<string, any> = {};

    activeCols.forEach((col) => {
      if (col.renderText) {
        rowObj[col.label] = col.renderText(item, comp);
      } else {
        rowObj[col.label] = '-';
      }
    });

    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Set worksheet direction RTL
  if (!ws['!views']) ws['!views'] = [];
  ws['!views'].push({ rightToLeft: true });

  // Auto-fit column widths
  const colWidths = activeCols.map((c) => ({
    wch: Math.max(c.label.length + 4, 12),
  }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'الكشف المفلتر');

  const safeDate = period.date.replace(/[^0-9-]/g, '');
  XLSX.writeFile(wb, `${title}_${safeDate}.xlsx`);
}

// -------------------------------------------------------------
// 2. Full Multi-Tab Military Excel Dossier (.xlsx)
// -------------------------------------------------------------
export function exportFullExcelWorkbook(
  period: PeriodRecord,
  evaluated: EvaluatedAssessment[],
  summary: UnitPeriodSummary,
  comparisons: PeriodComparisonItem[],
  previousPeriodName?: string,
  visibleColumns: string[] = DEFAULT_VISIBLE_COLUMNS
) {
  const wb = XLSX.utils.book_new();

  // Sort by rank (best to lowest)
  const sortedByRank = [...evaluated].sort((a, b) => {
    if (a.overallRank && b.overallRank) return a.overallRank - b.overallRank;
    if (a.overallRank) return -1;
    if (b.overallRank) return 1;
    return a.person.serialNum - b.person.serialNum;
  });

  // Sheet 1: كشف النتائج والترتيب
  const rankingCols = ALL_COLUMNS.filter(
    (c) => visibleColumns.includes(c.id) || c.category === 'basic' || c.category === 'totals'
  );
  const compMap = new Map<string, PeriodComparisonItem>();
  comparisons.forEach((c) => compMap.set(c.person.id, c));

  const rankingData = sortedByRank.map((item) => {
    const row: Record<string, any> = {};
    rankingCols.forEach((col) => {
      row[col.label] = col.renderText ? col.renderText(item, compMap.get(item.person.id)) : '-';
    });
    return row;
  });

  const wsRanking = XLSX.utils.json_to_sheet(rankingData);
  if (!wsRanking['!views']) wsRanking['!views'] = [];
  wsRanking['!views'].push({ rightToLeft: true });
  XLSX.utils.book_append_sheet(wb, wsRanking, 'كشف النتائج والترتيب');

  // Sheet 2: إجماليات الوحدة
  const summaryRows = [
    {
      'البيان': 'أولاً: الضباط',
      'إجمالي القوة': summary.officers.totalStrength,
      'مختبرين': summary.officers.testedCount,
      'موقف طبي': summary.officers.medicalCount,
      'لم يختبر': summary.officers.untestedCount,
      'نتيجة التمرينات %': summary.officers.avgExercisesPercentage,
      'نتيجة الضاحية %': summary.officers.avgSuburbPercentage,
      'إجمالي النتيجة %': summary.officers.avgTotalPercentage,
      'نسبة النجاح %': summary.officers.passRate,
      'عدد الامتياز': summary.officers.excellentCount,
    },
    {
      'البيان': 'ثانياً: الدرجات الأخرى',
      'إجمالي القوة': summary.otherRanks.totalStrength,
      'مختبرين': summary.otherRanks.testedCount,
      'موقف طبي': summary.otherRanks.medicalCount,
      'لم يختبر': summary.otherRanks.untestedCount,
      'نتيجة التمرينات %': summary.otherRanks.avgExercisesPercentage,
      'نتيجة الضاحية %': summary.otherRanks.avgSuburbPercentage,
      'إجمالي النتيجة %': summary.otherRanks.avgTotalPercentage,
      'نسبة النجاح %': summary.otherRanks.passRate,
      'عدد الامتياز': summary.otherRanks.excellentCount,
    },
    {
      'البيان': 'إجمالي النتيجة للوحدة',
      'إجمالي القوة': summary.overall.totalStrength,
      'مختبرين': summary.overall.testedCount,
      'موقف طبي': summary.overall.medicalCount,
      'لم يختبر': summary.overall.untestedCount,
      'نتيجة التمرينات %': summary.overall.avgExercisesPercentage,
      'نتيجة الضاحية %': summary.overall.avgSuburbPercentage,
      'إجمالي النتيجة %': summary.overall.avgTotalPercentage,
      'نسبة النجاح %': summary.overall.passRate,
      'عدد الامتياز': summary.overall.excellentCount,
    },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  if (!wsSummary['!views']) wsSummary['!views'] = [];
  wsSummary['!views'].push({ rightToLeft: true });
  XLSX.utils.book_append_sheet(wb, wsSummary, 'إجماليات الوحدة');

  // Sheet 3: مقارنة الفترات
  const compRows = comparisons.map((c) => ({
    'م': c.person.serialNum,
    'الرتبة / الدرجة': c.person.rank,
    'الاسم': c.person.name,
    'السلاح': c.person.corps,
    'الفئة': c.person.category === 'officers' ? 'الضباط' : 'الدرجات الأخرى',
    [`نسبة (${previousPeriodName || 'الفترة السابقة'}) %`]:
      c.previous?.totalPercentage ?? '-',
    [`نسبة (${period.name}) %`]: c.current.totalPercentage,
    'فرق النسبة الإجمالية %': c.percentageDelta ?? '-',
    'فرق نسبة التمرينات %': c.exercisesDelta ?? '-',
    'فرق نسبة الضاحية %': c.suburbDelta ?? '-',
    'الترتيب السابق': c.previous?.overallRank ?? '-',
    'الترتيب الحالي': c.current.overallRank ?? '-',
    'تطور الترتيب (مراكز)': c.rankDelta ?? '-',
    'حالة المستوى':
      c.trend === 'improved'
        ? 'تحسن في المستوى'
        : c.trend === 'declined'
        ? 'تراجع في المستوى'
        : c.trend === 'stable'
        ? 'ثبات المستوى'
        : 'غير مقارن',
  }));
  const wsComp = XLSX.utils.json_to_sheet(compRows);
  if (!wsComp['!views']) wsComp['!views'] = [];
  wsComp['!views'].push({ rightToLeft: true });
  XLSX.utils.book_append_sheet(wb, wsComp, 'مقارنة الفترات');

  // Sheet 4: البيانات التفصيلية والمهارات العسكرية
  const detailsRows = evaluated.map((item) => ({
    'م': item.person.serialNum,
    'رقم عسكري': item.person.militaryId,
    'السلاح': item.person.corps,
    'رتبة / درجة': item.person.rank,
    'الاسم': item.person.name,
    'السن': item.person.age,
    'المرحلة': item.stage.name,
    'الوزن (كجم)': item.person.weight ?? '-',
    'الطول (سم)': item.person.height ?? '-',
    'مؤشر الكتلة BMI': item.bmi ?? '-',
    'حالة الوزن': item.bmiStatus,
    'الموانع (د:ث)':
      item.input.obstacleMin !== null
        ? `${item.input.obstacleMin}:${String(item.input.obstacleSec || 0).padStart(2, '0')}`
        : '-',
    'طابور السير (س:ق)':
      item.input.marchHours !== null
        ? `${item.input.marchHours}:${String(item.input.marchMin || 0).padStart(2, '0')}`
        : '-',
    '100 متر (ثانية)': item.input.sprint100m ?? '-',
    'حمل الزميل (ثانية)': item.input.colleagueCarry ?? '-',
    'الزجزاجي (ثانية)': item.input.zigzagRun ?? '-',
    'وثب طويل (متر)': item.input.longJump ?? '-',
    'قذف قنابل (متر)': item.input.grenadeThrow ?? '-',
  }));
  const wsDetails = XLSX.utils.json_to_sheet(detailsRows);
  if (!wsDetails['!views']) wsDetails['!views'] = [];
  wsDetails['!views'].push({ rightToLeft: true });
  XLSX.utils.book_append_sheet(wb, wsDetails, 'البيانات التفصيلية والمهارات');

  const safeDate = period.date.replace(/[^0-9-]/g, '');
  XLSX.writeFile(wb, `دفتر_اللياقة_البدنية_الشامل_${safeDate}.xlsx`);
}

// -------------------------------------------------------------
// 3. Export Comparison Table to Excel
// -------------------------------------------------------------
export function exportComparisonExcel(
  targetPeriod: PeriodRecord,
  basePeriod: PeriodRecord,
  comparisons: PeriodComparisonItem[],
  targetSummary: UnitPeriodSummary,
  baseSummary: UnitPeriodSummary
) {
  const wb = XLSX.utils.book_new();

  // Summary Comparison
  const sumRows = [
    {
      'البيان': 'إجمالي الوحدة',
      [`نسبة ${basePeriod.name}`]: `${baseSummary.overall.avgTotalPercentage}%`,
      [`نسبة ${targetPeriod.name}`]: `${targetSummary.overall.avgTotalPercentage}%`,
      'الفرق': `${Math.round((targetSummary.overall.avgTotalPercentage - baseSummary.overall.avgTotalPercentage) * 10) / 10}%`,
    },
    {
      'البيان': 'الضباط',
      [`نسبة ${basePeriod.name}`]: `${baseSummary.officers.avgTotalPercentage}%`,
      [`نسبة ${targetPeriod.name}`]: `${targetSummary.officers.avgTotalPercentage}%`,
      'الفرق': `${Math.round((targetSummary.officers.avgTotalPercentage - baseSummary.officers.avgTotalPercentage) * 10) / 10}%`,
    },
    {
      'البيان': 'الدرجات الأخرى',
      [`نسبة ${basePeriod.name}`]: `${baseSummary.otherRanks.avgTotalPercentage}%`,
      [`نسبة ${targetPeriod.name}`]: `${targetSummary.otherRanks.avgTotalPercentage}%`,
      'الفرق': `${Math.round((targetSummary.otherRanks.avgTotalPercentage - baseSummary.otherRanks.avgTotalPercentage) * 10) / 10}%`,
    },
  ];
  const wsSum = XLSX.utils.json_to_sheet(sumRows);
  if (!wsSum['!views']) wsSum['!views'] = [];
  wsSum['!views'].push({ rightToLeft: true });
  XLSX.utils.book_append_sheet(wb, wsSum, 'مقارنة الإجماليات');

  // Individuals Comparison
  const compRows = comparisons.map((c) => ({
    'الترتيب الحالي': c.current.overallRank ?? '-',
    'الترتيب السابق': c.previous?.overallRank ?? '-',
    'تغير الترتيب': c.rankDelta !== null ? (c.rankDelta > 0 ? `+${c.rankDelta}` : c.rankDelta) : '-',
    'م': c.person.serialNum,
    'الرتبة': c.person.rank,
    'الاسم': c.person.name,
    'السلاح': c.person.corps,
    [`نسبة ${basePeriod.name}`]: c.previous ? `${c.previous.totalPercentage}%` : '-',
    [`نسبة ${targetPeriod.name}`]: `${c.current.totalPercentage}%`,
    'فرق النسبة (+/- %)': c.percentageDelta !== null ? (c.percentageDelta > 0 ? `+${c.percentageDelta}%` : `${c.percentageDelta}%`) : '-',
    'حالة التطور':
      c.trend === 'improved'
        ? 'تحسن في المستوى'
        : c.trend === 'declined'
        ? 'تراجع في المستوى'
        : c.trend === 'stable'
        ? 'ثبات المستوى'
        : 'جديد',
  }));
  const wsComp = XLSX.utils.json_to_sheet(compRows);
  if (!wsComp['!views']) wsComp['!views'] = [];
  wsComp['!views'].push({ rightToLeft: true });
  XLSX.utils.book_append_sheet(wb, wsComp, 'كشف مقارنة الأفراد');

  XLSX.writeFile(wb, `مقارنة_اللياقة_${targetPeriod.name}_ضد_${basePeriod.name}.xlsx`);
}

// -------------------------------------------------------------
// 4. Standalone Printable Report HTML with Column Customization
// -------------------------------------------------------------
export interface PrintReportOptions {
  visibleColumns?: string[];
  showSummary?: boolean;
  showSignatures?: boolean;
  orientation?: 'landscape' | 'portrait';
  density?: 'compact' | 'normal';
}

export function buildStandalonePrintReportHtml(
  period: PeriodRecord,
  settings: ScoringSettings,
  evaluated: EvaluatedAssessment[],
  summary: UnitPeriodSummary,
  comparisons: PeriodComparisonItem[],
  previousPeriodName?: string,
  options: PrintReportOptions = {}
): string {
  const {
    visibleColumns = DEFAULT_VISIBLE_COLUMNS,
    showSummary = true,
    showSignatures = true,
    orientation = 'landscape',
    density = 'compact',
  } = options;

  const sortedByRank = [...evaluated].sort((a, b) => {
    if (a.overallRank && b.overallRank) return a.overallRank - b.overallRank;
    if (a.overallRank) return -1;
    if (b.overallRank) return 1;
    return a.person.serialNum - b.person.serialNum;
  });

  const compMap = new Map<string, PeriodComparisonItem>();
  comparisons.forEach((c) => compMap.set(c.person.id, c));

  const activeCols = ALL_COLUMNS.filter((c) => visibleColumns.includes(c.id));

  const fontSize = density === 'compact' ? '10px' : '11px';
  const cellPadding = density === 'compact' ? '3px 4px' : '5px 7px';

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>تقرير اللياقة البدنية - ${period.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 ${orientation};
      margin: 8mm 10mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Cairo', sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 14px;
      background: #fff;
      font-size: ${fontSize};
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .ministry-box { font-weight: 700; line-height: 1.45; font-size: 10px; }
    .title-box { text-align: center; }
    .title-box h1 { margin: 0 0 3px 0; font-size: 16px; font-weight: 700; color: #0f172a; }
    .title-box p { margin: 0; color: #475569; font-size: 10.5px; font-weight: 600; }
    .meta-box { text-align: left; font-size: 10px; font-weight: 700; line-height: 1.45; }
    .summary-table, .main-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      page-break-inside: auto;
    }
    .summary-table th, .summary-table td, .main-table th, .main-table td {
      border: 1px solid #94a3b8;
      padding: ${cellPadding};
      text-align: center;
    }
    .summary-table th, .main-table th {
      background: #f1f5f9;
      font-weight: 700;
      color: #0f172a;
    }
    .main-table tr { page-break-inside: avoid; page-break-after: auto; }
    .name-cell { text-align: right !important; font-weight: 600; }
    .total-row { background: #ecfdf5; font-weight: 700; }
    .print-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
      padding: 10px 14px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    .btn {
      background: #0f172a;
      color: #fff;
      border: none;
      padding: 7px 16px;
      border-radius: 6px;
      font-family: inherit;
      font-weight: 700;
      font-size: 11px;
      cursor: pointer;
    }
    .btn-emerald { background: #059669; }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid #0f172a;
      text-align: center;
      font-size: 10px;
      page-break-inside: avoid;
    }
    .sig-col { flex: 1; }
    .sig-title { font-weight: 700; margin-bottom: 24px; color: #1e293b; }
    .sig-line { color: #94a3b8; }
    @media print {
      .print-bar { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div>
      <strong>تقرير اللياقة البدنية الرسمي (${orientation === 'landscape' ? 'عرضي A4' : 'طولي A4'})</strong>
      <span style="color:#64748b; margin-right: 8px;">· تم تضمين ${activeCols.length} عمود مختار</span>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="btn btn-emerald" onclick="window.print()">طباعة / حفظ كملف PDF الآن</button>
      <button class="btn" onclick="window.close()">إغلاق</button>
    </div>
  </div>

  <div class="header-grid">
    <div class="ministry-box">
      <div>${settings.ministryHeader}</div>
      <div>${settings.authorityHeader}</div>
      <div>${settings.branchHeader}</div>
      <div>الوحدة: ${settings.unitName}</div>
    </div>
    <div class="title-box">
      <div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-bottom:4px;">
        <img src="/logo.svg" style="height:40px; width:40px; object-fit:contain;" alt="شعار الكلية الحربية" />
        <h1 style="margin:0;">كشف النتائج والترتيب التنازلي لاختبارات اللياقة البدنية</h1>
      </div>
      <p>الفترة التدريبية: ${period.name} · تاريخ الاختبار: ${period.date}</p>
    </div>
    <div class="meta-box">
      <div>اختبار لصالح: ${period.beneficiary}</div>
      <div>إجمالي القوة: ${summary.overall.totalStrength} فرد</div>
      <div>نسبة نجاح الوحدة: ${summary.overall.passRate}%</div>
      <div>النسبة الإجمالية للوحدة: ${summary.overall.avgTotalPercentage}%</div>
    </div>
  </div>

  ${
    showSummary
      ? `<table class="summary-table">
    <thead>
      <tr>
        <th style="text-align:right;">البيان</th>
        <th>إجمالي القوة</th>
        <th>مختبرين</th>
        <th>موقف طبي</th>
        <th>لم يختبر</th>
        <th>نتيجة التمرينات %</th>
        <th>نتيجة الضاحية %</th>
        <th>إجمالي النتيجة %</th>
        <th>نسبة النجاح %</th>
        <th>حاصلين على ممتاز</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align:right; font-weight:700;">أولاً: الضباط</td>
        <td>${summary.officers.totalStrength}</td>
        <td>${summary.officers.testedCount}</td>
        <td>${summary.officers.medicalCount}</td>
        <td>${summary.officers.untestedCount}</td>
        <td>${summary.officers.avgExercisesPercentage}%</td>
        <td>${summary.officers.avgSuburbPercentage}%</td>
        <td><strong>${summary.officers.avgTotalPercentage}%</strong></td>
        <td>${summary.officers.passRate}%</td>
        <td>${summary.officers.excellentCount}</td>
      </tr>
      <tr>
        <td style="text-align:right; font-weight:700;">ثانياً: الدرجات الأخرى</td>
        <td>${summary.otherRanks.totalStrength}</td>
        <td>${summary.otherRanks.testedCount}</td>
        <td>${summary.otherRanks.medicalCount}</td>
        <td>${summary.otherRanks.untestedCount}</td>
        <td>${summary.otherRanks.avgExercisesPercentage}%</td>
        <td>${summary.otherRanks.avgSuburbPercentage}%</td>
        <td><strong>${summary.otherRanks.avgTotalPercentage}%</strong></td>
        <td>${summary.otherRanks.passRate}%</td>
        <td>${summary.otherRanks.excellentCount}</td>
      </tr>
      <tr class="total-row">
        <td style="text-align:right;">إجمالي النتيجة للوحدة</td>
        <td>${summary.overall.totalStrength}</td>
        <td>${summary.overall.testedCount}</td>
        <td>${summary.overall.medicalCount}</td>
        <td>${summary.overall.untestedCount}</td>
        <td>${summary.overall.avgExercisesPercentage}%</td>
        <td>${summary.overall.avgSuburbPercentage}%</td>
        <td><strong>${summary.overall.avgTotalPercentage}%</strong></td>
        <td>${summary.overall.passRate}%</td>
        <td>${summary.overall.excellentCount}</td>
      </tr>
    </tbody>
  </table>`
      : ''
  }

  <table class="main-table">
    <thead>
      <tr>
        ${activeCols
          .map((col) => `<th style="${col.align === 'right' ? 'text-align:right;' : ''}">${col.shortLabel || col.label}</th>`)
          .join('')}
      </tr>
    </thead>
    <tbody>
      ${sortedByRank
        .map((item) => {
          const comp = compMap.get(item.person.id);
          return `<tr>
            ${activeCols
              .map((col) => {
                const text = col.renderText ? col.renderText(item, comp) : '-';
                const isName = col.id === 'name';
                const isRank = col.id === 'overallRank';
                return `<td class="${isName ? 'name-cell' : ''}" style="${
                  isRank ? 'font-weight:700; color:#047857;' : ''
                }">${text}</td>`;
              })
              .join('')}
          </tr>`;
        })
        .join('')}
    </tbody>
  </table>

  ${
    showSignatures
      ? `<div class="signatures-row">
    <div class="sig-col">
      <div class="sig-title">ضابط التربية الرياضية بالوحدة</div>
      <div class="sig-line">................................................</div>
    </div>
    <div class="sig-col">
      <div class="sig-title">رئيس فرع التدريب / العمليات</div>
      <div class="sig-line">................................................</div>
    </div>
    <div class="sig-col">
      <div class="sig-title">يعتمد / قائد الوحدة العسكرية</div>
      <div class="sig-line">................................................</div>
    </div>
  </div>`
      : ''
  }
</body>
</html>`;
}

export function downloadStandalonePrintReportHtml(
  period: PeriodRecord,
  settings: ScoringSettings,
  evaluated: EvaluatedAssessment[],
  summary: UnitPeriodSummary,
  comparisons: PeriodComparisonItem[],
  previousPeriodName?: string,
  options: PrintReportOptions = {}
) {
  const html = buildStandalonePrintReportHtml(
    period,
    settings,
    evaluated,
    summary,
    comparisons,
    previousPeriodName,
    options
  );

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `تقرير_اللياقة_البدنية_المخصص_${period.date}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printHtmlViaIsolatedIframe(html: string, iframeId = 'isolated-print-iframe') {
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
  if (iframe) {
    iframe.remove();
  }
  iframe = document.createElement('iframe');
  iframe.id = iframeId;
  iframe.setAttribute(
    'style',
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;z-index:-9999;'
  );
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) {
    window.print();
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  const runPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    }
  };

  if (iframe.contentWindow) {
    if (iframeDoc.readyState === 'complete') {
      setTimeout(runPrint, 200);
    } else {
      iframe.contentWindow.onload = () => setTimeout(runPrint, 200);
      setTimeout(runPrint, 500);
    }
  } else {
    setTimeout(runPrint, 250);
  }
}

export function printStandaloneReportDirectly(
  period: PeriodRecord,
  settings: ScoringSettings,
  evaluated: EvaluatedAssessment[],
  summary: UnitPeriodSummary,
  comparisons: PeriodComparisonItem[],
  previousPeriodName?: string,
  options: PrintReportOptions = {}
) {
  const html = buildStandalonePrintReportHtml(
    period,
    settings,
    evaluated,
    summary,
    comparisons,
    previousPeriodName,
    options
  );
  printHtmlViaIsolatedIframe(html, 'print-report-isolated-iframe');
}

// -------------------------------------------------------------
// 5. Standalone Individual Card HTML (A4 Single Page Dossier)
// -------------------------------------------------------------
export function buildStandaloneIndividualCardHtml(
  person: PersonRecord,
  evalItem: EvaluatedAssessment,
  historyRows: {
    period: PeriodRecord;
    evalData: EvaluatedAssessment | null;
    delta: number | null;
  }[],
  period: PeriodRecord,
  settings: ScoringSettings
): string {
  const exRows = [
    {
      name: 'تمرين العقلة (الشد على العقلة)',
      required: `${evalItem.stage.pullupsMax} عدات`,
      achieved: `${evalItem.input.pullupsCount} عدة`,
      score: `${evalItem.pullupsScore}%`,
      grade: evalItem.pullupsScore >= 85 ? 'ممتاز' : evalItem.pullupsScore >= 70 ? 'جيد جداً' : evalItem.pullupsScore >= 50 ? 'جيد' : 'ضعيف',
    },
    {
      name: 'تمرين الضغط (ثني ومد الذراعين)',
      required: `${evalItem.stage.pushupsMax} عدة`,
      achieved: `${evalItem.input.pushupsCount} عدة`,
      score: `${evalItem.pushupsScore}%`,
      grade: evalItem.pushupsScore >= 85 ? 'ممتاز' : evalItem.pushupsScore >= 70 ? 'جيد جداً' : evalItem.pushupsScore >= 50 ? 'جيد' : 'ضعيف',
    },
    {
      name: 'تمرين البطن (رفع الجذع من الرقود)',
      required: `${evalItem.stage.situpsMax} عدة`,
      achieved: `${evalItem.input.situpsCount} عدة`,
      score: `${evalItem.situpsScore}%`,
      grade: evalItem.situpsScore >= 85 ? 'ممتاز' : evalItem.situpsScore >= 70 ? 'جيد جداً' : evalItem.situpsScore >= 50 ? 'جيد' : 'ضعيف',
    },
    {
      name: 'الجري المعدل (تغيير الاتجاه)',
      required: `${evalItem.stage.runMax} دورة`,
      achieved: `${evalItem.input.runCount} دورة`,
      score: `${evalItem.runScore}%`,
      grade: evalItem.runScore >= 85 ? 'ممتاز' : evalItem.runScore >= 70 ? 'جيد جداً' : evalItem.runScore >= 50 ? 'جيد' : 'ضعيف',
    },
    {
      name: 'اختبار الضاحية (جري المسافات الطويلة)',
      required: '21:30 - 26:00 ق',
      achieved: evalItem.suburbLabel,
      score: `${evalItem.suburbScore}%`,
      grade: evalItem.suburbGrade,
    },
  ];

  const obstacleStr = evalItem.input.obstacleMin !== null
    ? `${evalItem.input.obstacleMin}:${String(evalItem.input.obstacleSec || 0).padStart(2, '0')} ق`
    : 'غير مسجل';

  const marchStr = evalItem.input.marchHours !== null
    ? `${evalItem.input.marchHours} س ${evalItem.input.marchMin || 0} ق`
    : 'غير مسجل';

  const sprintStr = evalItem.input.sprint100m ? `${evalItem.input.sprint100m} ثانية` : '-';
  const carryStr = evalItem.input.colleagueCarry ? `${evalItem.input.colleagueCarry} ثانية` : '-';
  const zigzagStr = evalItem.input.zigzagRun ? `${evalItem.input.zigzagRun} ثانية` : '-';
  const longJumpStr = evalItem.input.longJump ? `${evalItem.input.longJump} م` : '-';
  const grenadeStr = evalItem.input.grenadeThrow ? `${evalItem.input.grenadeThrow} م` : '-';
  const attendanceStr = evalItem.input.attendanceStatus === 'tested'
    ? 'مختبر وحاضر'
    : evalItem.input.attendanceStatus === 'medical'
    ? 'موقف طبي رسمي'
    : 'غير مختبر';
  const notesStr = evalItem.input.exercisesNotes || evalItem.input.suburbNotes || 'لا توجد ملاحظات';

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>بطاقة تقييم اللياقة البدنية - ${person.rank} / ${person.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 6mm 8mm; }
    * { box-sizing: border-box; }
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    body {
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      padding: 8px 12px;
      font-size: 10.5px;
      line-height: 1.3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 6px 12px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; }
    .btn { background: #0f172a; color: #fff; border: none; padding: 5px 12px; border-radius: 5px; font-family: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
    .btn-emerald { background: #059669; }
    @media print {
      .print-bar { display: none !important; }
      body { padding: 0 !important; }
    }

    .header-table { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 6px; page-break-inside: avoid; }
    .header-table td { vertical-align: top; }
    .military-header { font-size: 9.5px; font-weight: 700; line-height: 1.4; }
    .title-cell { text-align: center; }
    .title-cell h1 { margin: 0 0 2px 0; font-size: 14px; font-weight: 700; color: #0f172a; }
    .title-cell p { margin: 0; font-size: 10px; color: #475569; font-weight: 600; }
    .meta-cell { text-align: left; font-size: 9.5px; line-height: 1.4; }

    .identity-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; border: 1.5px solid #0f172a; page-break-inside: avoid; }
    .identity-table td { border: 1px solid #94a3b8; padding: 3px 6px; font-size: 10px; }
    .identity-table .lbl { font-weight: 700; background: #f8fafc; color: #334155; width: 12%; }
    .identity-table .val { font-weight: 700; color: #0f172a; width: 21%; }

    .kpi-grid { display: flex; gap: 6px; margin-bottom: 6px; page-break-inside: avoid; }
    .kpi-card { flex: 1; border: 1px solid #94a3b8; border-radius: 4px; padding: 4px 6px; text-align: center; background: #f8fafc; }
    .kpi-title { font-size: 9px; color: #64748b; margin-bottom: 1px; font-weight: 600; }
    .kpi-val { font-size: 15px; font-weight: 700; color: #0f172a; font-family: monospace; }
    .kpi-val.highlight { color: #047857; }
    .kpi-sub { font-size: 9px; color: #475569; margin-top: 1px; font-weight: 600; }

    .main-grid { display: flex; gap: 6px; margin-bottom: 6px; page-break-inside: avoid; }
    .col-right { flex: 1.35; }
    .col-left { flex: 1; }

    .section-title { font-size: 10px; font-weight: 700; margin: 0 0 3px 0; padding-bottom: 2px; border-bottom: 1.5px solid #0f172a; display: flex; justify-content: space-between; }
    .bordered-table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
    .bordered-table th, .bordered-table td { border: 1px solid #94a3b8; padding: 2.5px 4px; text-align: center; }
    .bordered-table th { background: #f1f5f9; font-weight: 700; color: #1e293b; }
    .bordered-table td.text-right { text-align: right !important; }
    .bordered-table tr.highlight-row { background: #ecfdf5; font-weight: 700; }

    .skills-grid { width: 100%; border-collapse: collapse; font-size: 9.5px; }
    .skills-grid td { border: 1px solid #94a3b8; padding: 2.5px 5px; }
    .skills-grid .sk-lbl { background: #f8fafc; font-weight: 600; color: #475569; width: 45%; }
    .skills-grid .sk-val { font-weight: 700; color: #0f172a; }

    .history-section { margin-bottom: 6px; page-break-inside: avoid; }
    .history-table { width: 100%; border-collapse: collapse; font-size: 9px; text-align: center; }
    .history-table th, .history-table td { border: 1px solid #94a3b8; padding: 2px 4px; }
    .history-table th { background: #f1f5f9; font-weight: 700; }
    .history-table tr.active-p { background: #ecfdf5; font-weight: 700; }

    .signatures-row { display: flex; justify-content: space-between; margin-top: 6px; padding-top: 4px; border-top: 1px solid #0f172a; text-align: center; font-size: 9.5px; page-break-inside: avoid; }
    .sig-col { flex: 1; }
    .sig-title { font-weight: 700; margin-bottom: 18px; color: #1e293b; }
    .sig-line { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="print-bar">
    <div>
      <strong>بطاقة تقييم اللياقة البدنية والبدنية العسكرية</strong>
      <span style="color:#64748b; margin-right: 8px;">(مُنسقة هندسياً لطباعة صفحة A4 واحدة متكاملة)</span>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="btn btn-emerald" onclick="window.print()">طباعة الآن / حفظ كـ PDF</button>
      <button class="btn" onclick="window.close()">إغلاق</button>
    </div>
  </div>

  <table class="header-table">
    <tr>
      <td style="width: 30%;">
        <div class="military-header">
          <div>${settings.ministryHeader || 'جمهورية مصر العربية - وزارة الدفاع'}</div>
          <div>${settings.authorityHeader || 'هيئة التدريب للقوات المسلحة'}</div>
          <div>${settings.branchHeader || 'إدارة التربية الرياضية العسكرية'}</div>
          <div>الوحدة: ${settings.unitName || 'الوحدة العسكرية'}</div>
        </div>
      </td>
      <td class="title-cell" style="width: 42%;">
        <div style="display:flex; justify-content:center; align-items:center; gap:8px; margin-bottom:2px;">
          <img src="/logo.svg" style="height:34px; width:34px; object-fit:contain;" alt="شعار الكلية الحربية" />
          <h1 style="margin:0; font-size:14px; font-weight:700; color:#0f172a;">بطاقة تقييم واختبار اللياقة البدنية</h1>
        </div>
        <p>الفترة: ${period.name} · التاريخ: ${period.date}</p>
        <p style="font-size:9.5px; color:#64748b;">لصالح: ${period.beneficiary}</p>
      </td>
      <td class="meta-cell" style="width: 28%;">
        <div><strong>الرقم العسكري:</strong> ${person.militaryId}</div>
        <div><strong>المسلسل العام:</strong> #${person.serialNum}</div>
        <div><strong>تاريخ الرصد:</strong> ${period.date}</div>
        <div><strong>طُبعت بتاريخ:</strong> ${new Date().toLocaleDateString('ar-EG')}</div>
      </td>
    </tr>
  </table>

  <table class="identity-table">
    <tr>
      <td class="lbl">الرتبة / الدرجة:</td>
      <td class="val">${person.rank}</td>
      <td class="lbl">الاسم بالكامل:</td>
      <td class="val" colspan="3">${person.name}</td>
    </tr>
    <tr>
      <td class="lbl">السلاح / التخصص:</td>
      <td class="val">${person.corps}</td>
      <td class="lbl">السن والمرحلة:</td>
      <td class="val">${person.age} سنة (${evalItem.stage.name})</td>
      <td class="lbl">القوة والتصنيف:</td>
      <td class="val">${person.category === 'officers' ? 'ضباط عاملون' : 'درجات أخرى'} · ${person.forceType === 'combat' ? 'ميدان' : 'إداري'}</td>
    </tr>
  </table>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-title">النسبة الإجمالية العامة</div>
      <div class="kpi-val highlight">${evalItem.totalPercentage}%</div>
      <div class="kpi-sub">التقدير: <strong>${evalItem.totalGrade}</strong></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">الترتيب العام والفئة</div>
      <div class="kpi-val">#${evalItem.overallRank || '-'}</div>
      <div class="kpi-sub">ترتيب الفئة: <strong>#${evalItem.categoryRank || '-'}</strong></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">نسبة نتيجة التمرينات</div>
      <div class="kpi-val">${evalItem.exercisesPercentage}%</div>
      <div class="kpi-sub">المرحلة: ${evalItem.stage.name}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">نتيجة اختبار الضاحية</div>
      <div class="kpi-val">${evalItem.suburbScore}%</div>
      <div class="kpi-sub">الزمن: ${evalItem.suburbLabel}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">تناسق القوام والبدنية (BMI)</div>
      <div class="kpi-val" style="font-size:12px;">${person.weight || '-'} كجم / ${person.height || '-'} سم</div>
      <div class="kpi-sub">BMI: ${evalItem.bmi || '-'} (${evalItem.bmiStatus})</div>
    </div>
  </div>

  <div class="main-grid">
    <div class="col-right">
      <div class="section-title">
        <span>أولاً: تفصيل درجات التمرينات والضاحية</span>
        <span style="font-size:9px; font-weight:normal; color:#475569;">معايير ${evalItem.stage.name}</span>
      </div>
      <table class="bordered-table">
        <thead>
          <tr>
            <th style="width: 32%;" class="text-right">نوع الاختبار</th>
            <th style="width: 20%;">الحد المطلوب</th>
            <th style="width: 20%;">المحقق</th>
            <th style="width: 14%;">النسبة</th>
            <th style="width: 14%;">التقدير</th>
          </tr>
        </thead>
        <tbody>
          ${exRows.map((r, idx) => `
            <tr ${idx === 4 ? 'class="highlight-row"' : ''}>
              <td class="text-right"><strong>${r.name}</strong></td>
              <td>${r.required}</td>
              <td><strong>${r.achieved}</strong></td>
              <td><strong>${r.score}</strong></td>
              <td>${r.grade}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="col-left">
      <div class="section-title">
        <span>ثانياً: المهارات العسكرية والاختبارات التطبيقية</span>
      </div>
      <table class="skills-grid">
        <tr>
          <td class="sk-lbl">اجتياز الموانع:</td>
          <td class="sk-val">${obstacleStr}</td>
          <td class="sk-lbl">طابور السير:</td>
          <td class="sk-val">${marchStr}</td>
        </tr>
        <tr>
          <td class="sk-lbl">عدو 100 متر:</td>
          <td class="sk-val">${sprintStr}</td>
          <td class="sk-lbl">حمل الزميل:</td>
          <td class="sk-val">${carryStr}</td>
        </tr>
        <tr>
          <td class="sk-lbl">الجري الزجزاجي:</td>
          <td class="sk-val">${zigzagStr}</td>
          <td class="sk-lbl">الوثب الطويل:</td>
          <td class="sk-val">${longJumpStr}</td>
        </tr>
        <tr>
          <td class="sk-lbl">قذف القنابل:</td>
          <td class="sk-val">${grenadeStr}</td>
          <td class="sk-lbl">موقف الاختبار:</td>
          <td class="sk-val">${attendanceStr}</td>
        </tr>
        <tr>
          <td class="sk-lbl">ملاحظات الرصد:</td>
          <td class="sk-val" colspan="3">${notesStr}</td>
        </tr>
      </table>
    </div>
  </div>

  <div class="history-section">
    <div class="section-title">
      <span>ثالثاً: سجل مقارنة المستوى وتطور الأداء عبر الفترات التدريبية</span>
      <span style="font-size:9px; font-weight:normal; color:#475569;">مقارنة مؤشرات اللياقة البدنية</span>
    </div>
    <table class="history-table">
      <thead>
        <tr>
          <th style="width: 25%; text-align:right;">الفترة التدريبية</th>
          <th style="width: 12%;">التاريخ</th>
          <th style="width: 10%;">الترتيب العام</th>
          <th style="width: 12%;">نتيجة التمرينات</th>
          <th style="width: 14%;">نتيجة الضاحية</th>
          <th style="width: 11%;">الإجمالي العام</th>
          <th style="width: 8%;">التقدير</th>
          <th style="width: 8%;">التطور</th>
        </tr>
      </thead>
      <tbody>
        ${historyRows.map((h) => {
          const isCurr = h.period.id === period.id;
          const ev = h.evalData;
          const deltaText = h.delta === null ? 'أساس' : h.delta > 0 ? `+${h.delta}%` : `${h.delta}%`;
          return `
            <tr ${isCurr ? 'class="active-p"' : ''}>
              <td style="text-align:right;">${h.period.name} ${isCurr ? '(النشطة)' : ''}</td>
              <td>${h.period.date}</td>
              <td>${ev?.overallRank ? '#' + ev.overallRank : '-'}</td>
              <td>${ev ? ev.exercisesPercentage + '%' : '-'}</td>
              <td>${ev ? ev.suburbScore + '% (' + ev.suburbLabel + ')' : '-'}</td>
              <td><strong>${ev ? ev.totalPercentage + '%' : '-'}</strong></td>
              <td>${ev?.totalGrade || '-'}</td>
              <td>${deltaText}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>

  <div class="signatures-row">
    <div class="sig-col">
      <div class="sig-title">ضابط التربية الرياضية بالوحدة</div>
      <div class="sig-line">................................................</div>
    </div>
    <div class="sig-col">
      <div class="sig-title">رئيس فرع التدريب / العمليات</div>
      <div class="sig-line">................................................</div>
    </div>
    <div class="sig-col">
      <div class="sig-title">يعتمد / قائد الوحدة العسكرية</div>
      <div class="sig-line">................................................</div>
    </div>
  </div>
</body>
</html>`;
}

export function downloadStandaloneIndividualCardHtml(
  person: PersonRecord,
  evalItem: EvaluatedAssessment,
  historyRows: {
    period: PeriodRecord;
    evalData: EvaluatedAssessment | null;
    delta: number | null;
  }[],
  period: PeriodRecord,
  settings: ScoringSettings
) {
  const html = buildStandaloneIndividualCardHtml(person, evalItem, historyRows, period, settings);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `بطاقة_لياقة_فرد_${person.rank}_${person.name.replace(/\s+/g, '_')}_${period.date}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printStandaloneIndividualCardDirectly(
  person: PersonRecord,
  evalItem: EvaluatedAssessment,
  historyRows: {
    period: PeriodRecord;
    evalData: EvaluatedAssessment | null;
    delta: number | null;
  }[],
  period: PeriodRecord,
  settings: ScoringSettings
) {
  const html = buildStandaloneIndividualCardHtml(person, evalItem, historyRows, period, settings);
  printHtmlViaIsolatedIframe(html, 'print-individual-card-isolated-iframe');
}

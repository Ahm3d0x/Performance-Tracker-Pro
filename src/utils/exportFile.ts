import * as XLSX from 'xlsx';
import {
  EvaluatedAssessment,
  UnitPeriodSummary,
  PeriodComparisonItem,
  ScoringSettings,
} from './scoring';
import { PeriodRecord } from '../data/seedPersonnel';

export function exportFullExcelWorkbook(
  period: PeriodRecord,
  evaluated: EvaluatedAssessment[],
  summary: UnitPeriodSummary,
  comparisons: PeriodComparisonItem[],
  previousPeriodName?: string
) {
  const wb = XLSX.utils.book_new();

  // Sort by rank (best to lowest)
  const sortedByRank = [...evaluated].sort((a, b) => {
    if (a.overallRank && b.overallRank) return a.overallRank - b.overallRank;
    if (a.overallRank) return -1;
    if (b.overallRank) return 1;
    return a.person.serialNum - b.person.serialNum;
  });

  // Sheet 1: الترتيب التنازلي والنتائج
  const rankingData = sortedByRank.map((item) => ({
    'الترتيب العام': item.overallRank ?? '-',
    'ترتيب الفئة': item.categoryRank ?? '-',
    'م': item.person.serialNum,
    'الفئة': item.person.category === 'officers' ? 'الضباط' : 'الدرجات الأخرى',
    'الرتبة / الدرجة': item.person.rank,
    'الاسم': item.person.name,
    'السن': item.person.age,
    'المرحلة': item.stage.name,
    'عقلة (عدد)': item.input.pullupsCount,
    'عقلة (درجة)': item.pullupsScore,
    'ضغط (عدد)': item.input.pushupsCount,
    'ضغط (درجة)': item.pushupsScore,
    'بطن (عدد)': item.input.situpsCount,
    'بطن (درجة)': item.situpsScore,
    'جري معدل (عدد)': item.input.runCount,
    'جري معدل (درجة)': item.runScore,
    'نسبة التمرينات %': item.exercisesPercentage,
    'نتيجة التمرينات': item.exercisesGrade,
    'زمن الضاحية': item.suburbLabel,
    'نتيجة الضاحية %': item.suburbScore,
    'إجمالي النتيجة %': item.totalPercentage,
    'التقدير العام': item.totalGrade,
    'التمام': item.isMedical ? 'موقف طبى' : item.isTested ? 'مختبر' : 'لم يختبر',
    'ملاحظات': item.input.exercisesNotes || item.input.suburbNotes || '',
  }));

  const wsRanking = XLSX.utils.json_to_sheet(rankingData);
  XLSX.utils.book_append_sheet(wb, wsRanking, 'كشف النتائج والترتيب');

  // Sheet 2: إجماليات الوحدة (الضباط + الدرجات الأخرى + الإجمالي)
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
  XLSX.utils.book_append_sheet(wb, wsSummary, 'إجماليات الوحدة');

  // Sheet 3: مقارنة الفترات
  const compRows = comparisons.map((c) => ({
    'م': c.person.serialNum,
    'الرتبة / الدرجة': c.person.rank,
    'الاسم': c.person.name,
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
  XLSX.utils.book_append_sheet(wb, wsComp, 'مقارنة الفترات');

  // Sheet 4: البيانات التفصيلية والمهارات العسكرية
  const detailsRows = evaluated.map((item) => ({
    'م': item.person.serialNum,
    'رقم عسكري': item.person.militaryId,
    'السلاح': item.person.corps,
    'رتبة / درجة': item.person.rank,
    'الاسم': item.person.name,
    'السن': item.person.age,
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
  XLSX.utils.book_append_sheet(wb, wsDetails, 'البيانات التفصيلية والمهارات');

  const safeDate = period.date.replace(/[^0-9-]/g, '');
  XLSX.writeFile(wb, `نتائج_اللياقة_البدنية_${safeDate}.xlsx`);
}

export function downloadStandalonePrintReportHtml(
  period: PeriodRecord,
  settings: ScoringSettings,
  evaluated: EvaluatedAssessment[],
  summary: UnitPeriodSummary,
  comparisons: PeriodComparisonItem[],
  previousPeriodName?: string
) {
  const sortedByRank = [...evaluated].sort((a, b) => {
    if (a.overallRank && b.overallRank) return a.overallRank - b.overallRank;
    if (a.overallRank) return -1;
    if (b.overallRank) return 1;
    return a.person.serialNum - b.person.serialNum;
  });

  const compMap = new Map<string, PeriodComparisonItem>();
  comparisons.forEach((c) => compMap.set(c.person.id, c));

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>تقرير اللياقة البدنية - ${period.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: 'Cairo', sans-serif; color: #0f172a; margin: 0; padding: 16px; background: #fff; font-size: 12px; }
    .header-grid { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .ministry-box { font-weight: 700; line-height: 1.6; }
    .title-box { text-align: center; }
    .title-box h1 { margin: 0 0 4px 0; font-size: 20px; }
    .title-box p { margin: 0; color: #475569; font-size: 12px; }
    .summary-table, .main-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    .summary-table th, .summary-table td, .main-table th, .main-table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; }
    .summary-table th, .main-table th { background: #f1f5f9; font-weight: 700; }
    .name-cell { text-align: right !important; font-weight: 600; }
    .total-row { background: #ecfdf5; font-weight: 700; }
    .print-bar { display: flex; gap: 10px; margin-bottom: 16px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
    .btn { background: #0f172a; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-family: inherit; font-weight: 600; cursor: pointer; }
    @media print { .print-bar { display: none !important; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="btn" onclick="window.print()">طباعة / حفظ كملف PDF الآن</button>
  </div>
  <div class="header-grid">
    <div class="ministry-box">
      <div>${settings.ministryHeader}</div>
      <div>${settings.authorityHeader}</div>
      <div>${settings.branchHeader}</div>
    </div>
    <div class="title-box">
      <h1>كشف النتائج والترتيب التنازلي لاختبارات اللياقة البدنية</h1>
      <p>الوحدة: ${period.unitName} · الفترة: ${period.name} · التاريخ: ${period.date}</p>
    </div>
    <div class="ministry-box">
      <div>اختبار لصالح: ${period.beneficiary}</div>
      <div>إجمالي القوة: ${summary.overall.totalStrength} فرد</div>
      <div>النسبة الإجمالية للوحدة: ${summary.overall.avgTotalPercentage}%</div>
    </div>
  </div>

  <table class="summary-table">
    <thead>
      <tr>
        <th>البيان</th>
        <th>إجمالي القوة</th>
        <th>مختبرين</th>
        <th>موقف طبي</th>
        <th>لم يختبر</th>
        <th>نتيجة التمرينات %</th>
        <th>نتيجة الضاحية %</th>
        <th>إجمالي النتيجة %</th>
        <th>نسبة النجاح %</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>أولاً: الضباط</td>
        <td>${summary.officers.totalStrength}</td>
        <td>${summary.officers.testedCount}</td>
        <td>${summary.officers.medicalCount}</td>
        <td>${summary.officers.untestedCount}</td>
        <td>${summary.officers.avgExercisesPercentage}%</td>
        <td>${summary.officers.avgSuburbPercentage}%</td>
        <td>${summary.officers.avgTotalPercentage}%</td>
        <td>${summary.officers.passRate}%</td>
      </tr>
      <tr>
        <td>ثانياً: الدرجات الأخرى</td>
        <td>${summary.otherRanks.totalStrength}</td>
        <td>${summary.otherRanks.testedCount}</td>
        <td>${summary.otherRanks.medicalCount}</td>
        <td>${summary.otherRanks.untestedCount}</td>
        <td>${summary.otherRanks.avgExercisesPercentage}%</td>
        <td>${summary.otherRanks.avgSuburbPercentage}%</td>
        <td>${summary.otherRanks.avgTotalPercentage}%</td>
        <td>${summary.otherRanks.passRate}%</td>
      </tr>
      <tr class="total-row">
        <td>إجمالي النتيجة للوحدة</td>
        <td>${summary.overall.totalStrength}</td>
        <td>${summary.overall.testedCount}</td>
        <td>${summary.overall.medicalCount}</td>
        <td>${summary.overall.untestedCount}</td>
        <td>${summary.overall.avgExercisesPercentage}%</td>
        <td>${summary.overall.avgSuburbPercentage}%</td>
        <td>${summary.overall.avgTotalPercentage}%</td>
        <td>${summary.overall.passRate}%</td>
      </tr>
    </tbody>
  </table>

  <table class="main-table">
    <thead>
      <tr>
        <th>الترتيب</th>
        <th>م</th>
        <th>الرتبة / الدرجة</th>
        <th>الاسم</th>
        <th>السن</th>
        <th>المرحلة</th>
        <th>عقلة</th>
        <th>ضغط</th>
        <th>بطن</th>
        <th>جري معدل</th>
        <th>نسبة التمرينات</th>
        <th>زمن الضاحية</th>
        <th>نتيجة الضاحية</th>
        <th>إجمالي النتيجة</th>
        <th>التقدير</th>
        <th>مقارنة بـ (${previousPeriodName || 'السابق'})</th>
      </tr>
    </thead>
    <tbody>
      ${sortedByRank
        .map((item) => {
          const comp = compMap.get(item.person.id);
          const deltaStr =
            comp && comp.percentageDelta !== null
              ? comp.percentageDelta > 0
                ? `+${comp.percentageDelta}%`
                : `${comp.percentageDelta}%`
              : '-';
          return `<tr>
            <td><strong>${item.overallRank ? '#' + item.overallRank : '-'}</strong></td>
            <td>${item.person.serialNum}</td>
            <td>${item.person.rank}</td>
            <td class="name-cell">${item.person.name}</td>
            <td>${item.person.age}</td>
            <td>${item.stage.name}</td>
            <td>${item.input.pullupsCount} (${item.pullupsScore}%)</td>
            <td>${item.input.pushupsCount} (${item.pushupsScore}%)</td>
            <td>${item.input.situpsCount} (${item.situpsScore}%)</td>
            <td>${item.input.runCount} (${item.runScore}%)</td>
            <td><strong>${item.exercisesPercentage}%</strong></td>
            <td>${item.suburbLabel}</td>
            <td><strong>${item.suburbScore}%</strong></td>
            <td><strong>${item.totalPercentage}%</strong></td>
            <td>${item.totalGrade}</td>
            <td>${deltaStr}</td>
          </tr>`;
        })
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `تقرير_اللياقة_البدنية_للطباعة_PDF_${period.date}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

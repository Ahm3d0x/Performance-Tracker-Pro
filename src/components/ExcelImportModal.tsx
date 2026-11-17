import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Users,
  Shield,
  Calendar,
  Layers,
  ArrowRight,
  ArrowLeft,
  Database,
  Sparkles,
  RotateCcw,
  Check,
  Search,
  Filter,
  CheckSquare,
  Square,
  Eye,
  Info,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  inspectExcelWorkbook,
  parseExcelWithCustomMapping,
  TARGET_FIELDS,
  TargetFieldKey,
  WorkbookInspection,
  ExcelImportResult,
  ImportPresetType,
  getPresetActiveFields,
  autoMapHeaders,
  colIndexToLetter,
  cleanStr,
} from '../utils/excelImport';
import { PeriodRecord } from '../data/seedPersonnel';

interface ExcelImportModalProps {
  activePeriod: PeriodRecord;
  onClose: () => void;
  onImportSuccess: (result: { newPeriodId: string; state: any }) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  activePeriod,
  onClose,
  onImportSuccess,
}) => {
  // Step state: 1 = File & Sheet, 2 = Field Mapping, 3 = Advanced Preview & Save
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // File & Workbook state
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [inspection, setInspection] = useState<WorkbookInspection | null>(null);

  // Sheet & Row configuration
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [dataStartRowIndex, setDataStartRowIndex] = useState<number>(1);

  // Field selection & mapping state
  const [activePreset, setActivePreset] = useState<ImportPresetType>('all');
  const [activeFields, setActiveFields] = useState<TargetFieldKey[]>(
    TARGET_FIELDS.map((f) => f.key)
  );
  const [fieldMapping, setFieldMapping] = useState<Record<TargetFieldKey, number | null>>(
    {} as any
  );

  // Parsed result for preview & saving
  const [parsedData, setParsedData] = useState<ExcelImportResult | null>(null);
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [previewPage, setPreviewPage] = useState<number>(1);
  const pageSize = 10;

  // Import target & period metadata
  const [importTarget, setImportTarget] = useState<'new_period' | 'current_period'>('new_period');
  const [periodName, setPeriodName] = useState<string>('');
  const [periodDate, setPeriodDate] = useState<string>('');
  const [unitName, setUnitName] = useState<string>('');
  const [beneficiary, setBeneficiary] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process uploaded file
  const processFile = async (file: File) => {
    setErrorMsg('');
    setLoading(true);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);

      const { wb, inspection: ins } = inspectExcelWorkbook(buffer);
      setWorkbook(wb);
      setInspection(ins);
      setSelectedSheet(ins.activeSheetName);
      setHeaderRowIndex(ins.sheet.detectedHeaderRow);
      setDataStartRowIndex(ins.sheet.detectedDataStartRow);
      setFieldMapping(ins.sheet.suggestedMapping);

      const defaultUnit = ins.unitName || activePeriod.unitName || 'اللواء الأول المشاة الميكانيكي';
      const defaultDate = ins.periodDate || new Date().toISOString().slice(0, 10);
      const defaultBen = ins.beneficiary || activePeriod.beneficiary || 'فرع التربية الرياضية - هيئة التدريب';

      setUnitName(defaultUnit);
      setPeriodDate(defaultDate);
      setPeriodName(`كشف إكسل (${file.name.replace(/\.[^/.]+$/, '')}) - ${defaultDate}`);
      setBeneficiary(defaultBen);

      // Perform initial test parse
      const testResult = parseExcelWithCustomMapping(wb, {
        sheetName: ins.activeSheetName,
        headerRowIndex: ins.sheet.detectedHeaderRow,
        dataStartRowIndex: ins.sheet.detectedDataStartRow,
        fieldMapping: ins.sheet.suggestedMapping,
        activeFields: TARGET_FIELDS.map((f) => f.key),
        unitName: defaultUnit,
        periodDate: defaultDate,
        beneficiary: defaultBen,
      });

      setParsedData(testResult);
      // Automatically advance to Step 2 so user can configure mapping
      setCurrentStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء فحص ملف الإكسل.');
      setWorkbook(null);
      setInspection(null);
      setParsedData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Switch sheet
  const handleSheetChange = (newSheet: string) => {
    if (!fileBuffer) return;
    setSelectedSheet(newSheet);
    try {
      const { wb, inspection: ins } = inspectExcelWorkbook(fileBuffer, newSheet);
      setWorkbook(wb);
      setInspection(ins);
      setHeaderRowIndex(ins.sheet.detectedHeaderRow);
      setDataStartRowIndex(ins.sheet.detectedDataStartRow);
      setFieldMapping(ins.sheet.suggestedMapping);
      reparseData(wb, ins.activeSheetName, ins.sheet.detectedHeaderRow, ins.sheet.detectedDataStartRow, ins.sheet.suggestedMapping, activeFields);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تبديل ورقة العمل.');
    }
  };

  // Re-run parse when mapping or fields change
  const reparseData = (
    wb: XLSX.WorkBook | null = workbook,
    sheet = selectedSheet,
    headerRow = headerRowIndex,
    dataStart = dataStartRowIndex,
    mapping = fieldMapping,
    fields = activeFields
  ) => {
    if (!wb || !sheet) return;
    try {
      const result = parseExcelWithCustomMapping(wb, {
        sheetName: sheet,
        headerRowIndex: headerRow,
        dataStartRowIndex: dataStart,
        fieldMapping: mapping,
        activeFields: fields,
        unitName,
        periodDate,
        beneficiary,
        periodName,
      });
      setParsedData(result);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إعادة تفسير البيانات بالتنسيق المختار.');
    }
  };

  // Preset switch
  const handleApplyPreset = (preset: ImportPresetType) => {
    setActivePreset(preset);
    const newFields = getPresetActiveFields(preset);
    setActiveFields(newFields);
    reparseData(workbook, selectedSheet, headerRowIndex, dataStartRowIndex, fieldMapping, newFields);
  };

  // Toggle single field
  const handleToggleField = (key: TargetFieldKey) => {
    setActivePreset('custom');
    const newFields = activeFields.includes(key)
      ? activeFields.filter((f) => f !== key)
      : [...activeFields, key];
    setActiveFields(newFields);
    reparseData(workbook, selectedSheet, headerRowIndex, dataStartRowIndex, fieldMapping, newFields);
  };

  // Change single field mapping
  const handleFieldMappingChange = (key: TargetFieldKey, colIdx: number | null) => {
    const updated = { ...fieldMapping, [key]: colIdx };
    setFieldMapping(updated);
    reparseData(workbook, selectedSheet, headerRowIndex, dataStartRowIndex, updated, activeFields);
  };

  // Trigger smart auto-mapping
  const handleAutoMap = () => {
    if (!inspection) return;
    const autoMapped = autoMapHeaders(inspection.sheet.headers);
    setFieldMapping(autoMapped);
    reparseData(workbook, selectedSheet, headerRowIndex, dataStartRowIndex, autoMapped, activeFields);
  };

  // Change header row
  const handleHeaderRowChange = (newHeaderRow: number) => {
    setHeaderRowIndex(newHeaderRow);
    const newDataStart = newHeaderRow + 1;
    setDataStartRowIndex(newDataStart);
    if (!fileBuffer) return;
    try {
      const { wb, inspection: ins } = inspectExcelWorkbook(fileBuffer, selectedSheet);
      // Re-read headers with new row
      const ws = wb.Sheets[selectedSheet];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const rawHeaderRow = rows[newHeaderRow] || [];
      const headers = rawHeaderRow.map((c, i) => cleanStr(c) || `عمود ${colIndexToLetter(i)}`);
      const autoMapped = autoMapHeaders(headers);
      setFieldMapping(autoMapped);
      reparseData(wb, selectedSheet, newHeaderRow, newDataStart, autoMapped, activeFields);
    } catch {
      // ignore
    }
  };

  // Submit to SQLite backend
  const handleConfirmImport = async () => {
    if (!parsedData || parsedData.personnel.length === 0) {
      setErrorMsg('لا توجد بيانات صالحة للاستيراد.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');

    try {
      const isNew = importTarget === 'new_period';
      const payload = {
        periodName: isNew ? periodName : activePeriod.name,
        periodDate: isNew ? periodDate : activePeriod.date,
        beneficiary,
        unitName,
        isNewPeriod: isNew,
        targetPeriodId: isNew ? undefined : activePeriod.id,
        personnel: parsedData.personnel,
        assessments: parsedData.assessments,
      };

      const res = await fetch('/api/periods/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'فشل حفظ البيانات في قاعدة بيانات SQLite.');
      }

      const responseData = await res.json();
      onImportSuccess(responseData);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل استيراد البيانات.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered & Paginated Preview Data
  const filteredPersonnel = useMemo(() => {
    if (!parsedData) return [];
    if (!previewSearch.trim()) return parsedData.personnel;
    const q = previewSearch.trim().toLowerCase();
    return parsedData.personnel.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.rank.toLowerCase().includes(q) ||
        p.militaryId.includes(q) ||
        p.corps.toLowerCase().includes(q)
    );
  }, [parsedData, previewSearch]);

  const totalPreviewPages = Math.ceil(filteredPersonnel.length / pageSize) || 1;
  const currentPreviewRows = useMemo(() => {
    const start = (previewPage - 1) * pageSize;
    return filteredPersonnel.slice(start, start + pageSize);
  }, [filteredPersonnel, previewPage]);

  // Grouped Target Fields
  const personalFields = TARGET_FIELDS.filter((f) => f.category === 'personal');
  const fitnessFields = TARGET_FIELDS.filter((f) => f.category === 'fitness');
  const skillFields = TARGET_FIELDS.filter((f) => f.category === 'skills_attendance');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="excel-import-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 id="excel-import-title" className="text-sm sm:text-base font-bold">
                منظومة استيراد كشوف الإكسل المتقدمة (Excel Import Engine)
              </h2>
              <p className="text-[11px] text-slate-400">
                استيراد أي صيغة إكسل · سحب الحقول المطلوبة فقط · تعيين الأعمدة · معاينة فورية شاملة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Navigation Tabs */}
        <div className="bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs font-semibold shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Step 1 Button */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currentStep === 1
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">
                1
              </span>
              <span>اختيار الملف والورقة</span>
              {inspection && <Check className="w-3.5 h-3.5 text-emerald-300" />}
            </button>

            <ChevronLeft className="w-4 h-4 text-slate-400" />

            {/* Step 2 Button */}
            <button
              type="button"
              onClick={() => inspection && setCurrentStep(2)}
              disabled={!inspection}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                currentStep === 2
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">
                2
              </span>
              <span>تحديد الحقول وتعيين الأعمدة</span>
              {activeFields.length > 0 && <span className="text-[10px] bg-emerald-500/30 px-1.5 py-0.2 rounded-full">{activeFields.length}</span>}
            </button>

            <ChevronLeft className="w-4 h-4 text-slate-400" />

            {/* Step 3 Button */}
            <button
              type="button"
              onClick={() => parsedData && setCurrentStep(3)}
              disabled={!parsedData}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                currentStep === 3
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">
                3
              </span>
              <span>المعاينة المتقدمة وتأكيد الحفظ</span>
              {parsedData && (
                <span className="text-[10px] bg-emerald-500/30 px-1.5 py-0.2 rounded-full">
                  {parsedData.personnel.length} فرد
                </span>
              )}
            </button>
          </div>

          {fileName && (
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-mono max-w-[180px] truncate" title={fileName}>
                {fileName}
              </span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-start gap-2.5 text-red-800 dark:text-red-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: FILE UPLOAD, SHEET SELECTOR & HEADER ROW CONFIGURATION           */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-5">
              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-14 h-14 mx-auto mb-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-7 h-7" />
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {loading
                    ? 'جاري فحص وتفسير أوراق ملف الإكسل...'
                    : fileName
                    ? `الملف الحالي: ${fileName} (اضغط لتغيير الملف)`
                    : 'اضغط هنا لاختيار ملف الإكسل أو اسحبه إلى هنا'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                  يدعم كافة كشوف وملفات الإكسل (.xlsx, .xls) سواء النموذج الرسمي للمنظومة الجديدة، أو ديباجة برنامج التمرينات، أو أي جدول بيانات مخصص.
                </p>
              </div>

              {/* Inspection Info & Sheet Selector (Visible once file is loaded) */}
              {inspection && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          تم فحص هيكل الملف بنجاح
                        </div>
                        <div className="text-[11px] text-slate-500">
                          الصيغة المكتشفة:{' '}
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {inspection.detectedFormat === 'monzoma_detailed'
                              ? 'المنظومة التفصيلية للتربية البدنية'
                              : inspection.detectedFormat === 'dibaja_standard'
                              ? 'ديباجة برنامج التمرينات والضاحية'
                              : 'ملف كشف عام / جدول مخصص'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">إجمالي الأوراق:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {inspection.sheetNames.length}
                      </span>
                    </div>
                  </div>

                  {/* Sheets tabs / selector */}
                  {inspection.sheetNames.length > 1 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        اختر ورقة العمل المراد الاستيراد منها (Sheet):
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {inspection.sheetNames.map((sheet) => (
                          <button
                            key={sheet}
                            type="button"
                            onClick={() => handleSheetChange(sheet)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              selectedSheet === sheet
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                            }`}
                          >
                            <span className="font-mono">{sheet}</span>
                            {selectedSheet === sheet && ' ✓'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Header row & data start configuration */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        صف أسماء الأعمدة (Header Row):
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={headerRowIndex}
                          onChange={(e) => handleHeaderRowChange(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          {Array.from({ length: Math.min(20, inspection.sheet.rowCount) }, (_, i) => (
                            <option key={i} value={i}>
                              الصف {i + 1} {i === inspection.sheet.detectedHeaderRow ? '(الموصى به تلقائياً)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        الصف الذي يحتوي على عناوين: الاسم، الرتبة، الرقم العسكري، إلخ.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        صف بداية بيانات الأفراد (Data Start Row):
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={dataStartRowIndex}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setDataStartRowIndex(val);
                            reparseData(workbook, selectedSheet, headerRowIndex, val, fieldMapping, activeFields);
                          }}
                          className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          {Array.from({ length: Math.min(25, inspection.sheet.rowCount) }, (_, i) => (
                            <option key={i} value={i}>
                              الصف {i + 1} {i === inspection.sheet.detectedDataStartRow ? '(بداية السجلات)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        أول صف يحتوي على اسم وبيانات أول فرد مسجل.
                      </p>
                    </div>
                  </div>

                  {/* Columns detected badge list */}
                  <div className="pt-2">
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      الأعمدة المكتشفة في هذا الصف ({inspection.sheet.columns.length} عمود):
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      {inspection.sheet.columns.map((col) => (
                        <span
                          key={col.index}
                          className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono"
                          title={`عمود ${col.letter}: ${col.label}`}
                        >
                          {col.letter}: {col.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: FIELD SELECTION & CUSTOM COLUMN MAPPING                          */}
          {/* ========================================================================= */}
          {currentStep === 2 && inspection && (
            <div className="space-y-5">
              {/* Presets and Auto-Map Controls */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    نمط السحب المسبق:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      activePreset === 'all'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    سحب الكشف بالكامل (شخصي + لياقة)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('personal_only')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      activePreset === 'personal_only'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    البيانات الشخصية فقط (بدون درجات)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('fitness_only')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      activePreset === 'fitness_only'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    درجات اللياقة والضاحية فقط
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoMap}
                    className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>تعيين تلقائي ذكي</span>
                  </button>
                </div>
              </div>

              {/* Mapping Sections Grid */}
              <div className="space-y-4">
                {/* 1. Personal Fields */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200">
                      <Users className="w-4 h-4 text-emerald-500" />
                      <span>البيانات الأساسية والشخصية للأفراد ({personalFields.filter((f) => activeFields.includes(f.key)).length} مفعل)</span>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {personalFields.map((field) => {
                      const isActive = activeFields.includes(field.key);
                      const currentCol = fieldMapping[field.key];
                      return (
                        <div
                          key={field.key}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            isActive
                              ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700'
                              : 'bg-slate-50/40 dark:bg-slate-900/40 border-dashed border-slate-200 dark:border-slate-800 opacity-60'
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isActive}
                              disabled={field.required}
                              onChange={() => handleToggleField(field.key)}
                              className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <span>{field.label}</span>
                                {field.required && (
                                  <span className="text-[10px] text-red-500 font-normal">(إجباري)</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500">{field.description}</div>
                            </div>
                          </label>

                          <div className="w-56 shrink-0 space-y-1">
                            <select
                              value={currentCol !== null && currentCol !== undefined ? currentCol : ''}
                              disabled={!isActive}
                              onChange={(e) =>
                                handleFieldMappingChange(
                                  field.key,
                                  e.target.value === '' ? null : Number(e.target.value)
                                )
                              }
                              className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-40"
                            >
                              <option value="">-- غير معين (تجاهل) --</option>
                              {inspection.sheet.columns.map((col) => (
                                <option key={col.index} value={col.index}>
                                  عمود {col.letter}: {col.label} {col.sampleValues && col.sampleValues.length > 0 ? `[قيم: ${col.sampleValues.slice(0, 2).join('، ')}]` : '[فارغ]'}
                                </option>
                              ))}
                            </select>
                            {isActive && currentCol !== null && currentCol !== undefined && (
                              <div className="text-[10px]">
                                {inspection.sheet.columns.find((c) => c.index === currentCol)?.sampleValues?.length ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    عينة: {inspection.sheet.columns.find((c) => c.index === currentCol)?.sampleValues.slice(0, 2).join('، ')}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    العمود فارغ في ملف الإكسل
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Fitness Scores */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      <span>اختبارات اللياقة البدنية والضاحية ({fitnessFields.filter((f) => activeFields.includes(f.key)).length} مفعل)</span>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {fitnessFields.map((field) => {
                      const isActive = activeFields.includes(field.key);
                      const currentCol = fieldMapping[field.key];
                      return (
                        <div
                          key={field.key}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            isActive
                              ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700'
                              : 'bg-slate-50/40 dark:bg-slate-900/40 border-dashed border-slate-200 dark:border-slate-800 opacity-60'
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => handleToggleField(field.key)}
                              className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {field.label}
                              </div>
                              <div className="text-[10px] text-slate-500">{field.description}</div>
                            </div>
                          </label>

                          <div className="w-56 shrink-0 space-y-1">
                            <select
                              value={currentCol !== null && currentCol !== undefined ? currentCol : ''}
                              disabled={!isActive}
                              onChange={(e) =>
                                handleFieldMappingChange(
                                  field.key,
                                  e.target.value === '' ? null : Number(e.target.value)
                                )
                              }
                              className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-40"
                            >
                              <option value="">-- غير معين (تجاهل) --</option>
                              {inspection.sheet.columns.map((col) => (
                                <option key={col.index} value={col.index}>
                                  عمود {col.letter}: {col.label} {col.sampleValues && col.sampleValues.length > 0 ? `[قيم: ${col.sampleValues.slice(0, 2).join('، ')}]` : '[فارغ]'}
                                </option>
                              ))}
                            </select>
                            {isActive && currentCol !== null && currentCol !== undefined && (
                              <div className="text-[10px]">
                                {inspection.sheet.columns.find((c) => c.index === currentCol)?.sampleValues?.length ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    عينة: {inspection.sheet.columns.find((c) => c.index === currentCol)?.sampleValues.slice(0, 2).join('، ')}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    العمود فارغ في ملف الإكسل
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Military Skills & Attendance */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200">
                      <Layers className="w-4 h-4 text-emerald-500" />
                      <span>المهارات العسكرية وحالة الحضور والتمام ({skillFields.filter((f) => activeFields.includes(f.key)).length} مفعل)</span>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {skillFields.map((field) => {
                      const isActive = activeFields.includes(field.key);
                      const currentCol = fieldMapping[field.key];
                      return (
                        <div
                          key={field.key}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            isActive
                              ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700'
                              : 'bg-slate-50/40 dark:bg-slate-900/40 border-dashed border-slate-200 dark:border-slate-800 opacity-60'
                          }`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => handleToggleField(field.key)}
                              className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {field.label}
                              </div>
                              <div className="text-[10px] text-slate-500">{field.description}</div>
                            </div>
                          </label>

                          <div className="w-56 shrink-0 space-y-1">
                            <select
                              value={currentCol !== null && currentCol !== undefined ? currentCol : ''}
                              disabled={!isActive}
                              onChange={(e) =>
                                handleFieldMappingChange(
                                  field.key,
                                  e.target.value === '' ? null : Number(e.target.value)
                                )
                              }
                              className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-40"
                            >
                              <option value="">-- غير معين (تجاهل) --</option>
                              {inspection.sheet.columns.map((col) => (
                                <option key={col.index} value={col.index}>
                                  عمود {col.letter}: {col.label} {col.sampleValues && col.sampleValues.length > 0 ? `[قيم: ${col.sampleValues.slice(0, 2).join('، ')}]` : '[فارغ]'}
                                </option>
                              ))}
                            </select>
                            {isActive && currentCol !== null && currentCol !== undefined && (
                              <div className="text-[10px]">
                                {inspection.sheet.columns.find((c) => c.index === currentCol)?.sampleValues?.length ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    عينة: {inspection.sheet.columns.find((c) => c.index === currentCol)?.sampleValues.slice(0, 2).join('، ')}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    العمود فارغ في ملف الإكسل
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: ADVANCED PREVIEW & COMMIT TO SQLITE DATABASE                      */}
          {/* ========================================================================= */}
          {currentStep === 3 && parsedData && (
            <div className="space-y-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-500">إجمالي الأفراد الصالحين</div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {parsedData.summary.total}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-500">الضباط</div>
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {parsedData.summary.officers}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-500">الدرجات الأخرى</div>
                  <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                    {parsedData.summary.otherRanks}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-500">مسجل لهم درجات</div>
                  <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {parsedData.summary.withScores}
                  </div>
                </div>
              </div>

              {/* Informational Banner if template has 0 scores */}
              {parsedData.summary.withScores === 0 && (
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                  <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <span className="font-bold">توضيح بخصوص درجات التمارين (0 مسجل): </span>
                    أعمدة التمارين والضاحية في هذا الملف من الإكسل فارغة تماماً أو قيمها صفرية (كشف أفراد أو ديباجة غير مرصودة). سيتم استيراد أسماء وبيانات الأفراد لتبدأ برصد وتقييم درجاتهم مباشرة داخل المنظومة أو يمكنك استيراد كشف مرصود لاحقاً.
                  </div>
                </div>
              )}

              {/* Destination Selection */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  وجهة الاستيراد في قاعدة البيانات SQLite:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      importTarget === 'new_period'
                        ? 'bg-white dark:bg-slate-800 border-emerald-500 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importTarget"
                      checked={importTarget === 'new_period'}
                      onChange={() => setImportTarget('new_period')}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        إنشاء فترة اختبار جديدة
                      </div>
                      <div className="text-[11px] text-slate-500">
                        حفظ الكشف كفترة جديدة مستقلة مع الاحتفاظ بالفترات السابقة
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      importTarget === 'current_period'
                        ? 'bg-white dark:bg-slate-800 border-emerald-500 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importTarget"
                      checked={importTarget === 'current_period'}
                      onChange={() => setImportTarget('current_period')}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        التحديث في الفترة الحالية
                      </div>
                      <div className="text-[11px] text-slate-500">
                        دمج أو تحديث بيانات: {activePeriod.name}
                      </div>
                    </div>
                  </label>
                </div>

                {/* Period metadata inputs */}
                {importTarget === 'new_period' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        اسم الفترة التدريبية
                      </label>
                      <input
                        type="text"
                        value={periodName}
                        onChange={(e) => setPeriodName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        تاريخ الاختبار
                      </label>
                      <input
                        type="text"
                        value={periodDate}
                        onChange={(e) => setPeriodDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        اسم الوحدة
                      </label>
                      <input
                        type="text"
                        value={unitName}
                        onChange={(e) => setUnitName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Live Preview Table with Search & Pagination */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 space-y-0">
                <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      معاينة البيانات المستخرجة ({filteredPersonnel.length} من {parsedData.personnel.length} فرد)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="بحث بالاسم أو الرتبة أو الرقم..."
                        value={previewSearch}
                        onChange={(e) => {
                          setPreviewSearch(e.target.value);
                          setPreviewPage(1);
                        }}
                        className="w-52 pr-8 pl-3 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        disabled={previewPage <= 1}
                        className="p-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <span className="font-mono text-slate-600 dark:text-slate-400">
                        {previewPage} / {totalPreviewPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                        disabled={previewPage >= totalPreviewPages}
                        className="p-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs text-right divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 font-semibold text-slate-700 dark:text-slate-300 sticky top-0 z-10">
                      <tr>
                        <th className="p-2">م</th>
                        <th className="p-2">الرتبة</th>
                        <th className="p-2">الاسم</th>
                        <th className="p-2">الرقم العسكري</th>
                        <th className="p-2">السلاح</th>
                        <th className="p-2">السن</th>
                        {activeFields.includes('pullups') && <th className="p-2">عقلة</th>}
                        {activeFields.includes('pushups') && <th className="p-2">ضغط</th>}
                        {activeFields.includes('situps') && <th className="p-2">بطن</th>}
                        {activeFields.includes('run') && <th className="p-2">جري</th>}
                        {activeFields.includes('suburbMin') && <th className="p-2">ضاحية (زمن)</th>}
                        {activeFields.includes('suburbTimeCode') && <th className="p-2">ضاحية (كود)</th>}
                        <th className="p-2">التمام / الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {currentPreviewRows.map((person, idx) => {
                        const ass = parsedData.assessments.find((a) => a.personId === person.id);
                        return (
                          <tr
                            key={person.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >
                            <td className="p-2 font-mono text-slate-500">
                              {person.serialNum || (previewPage - 1) * pageSize + idx + 1}
                            </td>
                            <td className="p-2 font-semibold">{person.rank}</td>
                            <td className="p-2 font-bold text-slate-900 dark:text-white">
                              {person.name}
                            </td>
                            <td className="p-2 font-mono text-slate-600 dark:text-slate-400">
                              {person.militaryId}
                            </td>
                            <td className="p-2">{person.corps}</td>
                            <td className="p-2 font-mono">{person.age}</td>
                            {activeFields.includes('pullups') && (
                              <td className="p-2 font-mono">{ass?.pullupsCount ?? 0}</td>
                            )}
                            {activeFields.includes('pushups') && (
                              <td className="p-2 font-mono">{ass?.pushupsCount ?? 0}</td>
                            )}
                            {activeFields.includes('situps') && (
                              <td className="p-2 font-mono">{ass?.situpsCount ?? 0}</td>
                            )}
                            {activeFields.includes('run') && (
                              <td className="p-2 font-mono">{ass?.runCount ?? 0}</td>
                            )}
                            {activeFields.includes('suburbMin') && (
                              <td className="p-2 font-mono">
                                {ass?.suburbMin !== null && ass?.suburbMin !== undefined
                                  ? `${ass.suburbMin}:${String(ass.suburbSec || 0).padStart(2, '0')}`
                                  : '-'}
                              </td>
                            )}
                            {activeFields.includes('suburbTimeCode') && (
                              <td className="p-2 font-mono">
                                {ass?.suburbTimeCode ? `كود ${ass.suburbTimeCode}` : '-'}
                              </td>
                            )}
                            <td className="p-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  ass?.attendanceStatus === 'tested'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : ass?.attendanceStatus === 'medical'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {ass?.attendanceStatus === 'tested'
                                  ? 'مختبر'
                                  : ass?.attendanceStatus === 'medical'
                                  ? 'موقف طبي'
                                  : 'لم يختبر'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => (s - 1) as any)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>السابق</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
            >
              إلغاء
            </button>

            {currentStep < 3 && inspection && (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => (s + 1) as any)}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>
                  {currentStep === 1 ? 'المتابعة لتحديد الحقول والأعمدة' : 'المعاينة المتقدمة للبيانات'}
                </span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            {currentStep === 3 && parsedData && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg flex items-center gap-2 cursor-pointer shadow-xs"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الحفظ في SQLite...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>تأكيد واستيراد {parsedData.personnel.length} فرداً</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

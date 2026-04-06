import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, FileDown, CheckCircle2, Loader2 } from 'lucide-react';
import { PatientLogPrintView } from '../patient-log/PatientLogPrintView';
import { PatientVisit } from '../../types';
import { usePdfGenerator } from '../../hooks/usePdfGenerator';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  visits: PatientVisit[];
  currentDate: string;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  visits,
  currentDate,
}) => {
  const { isGenerating, generatePdf } = usePdfGenerator();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    generatePdf('pdf-preview-content-target', `physiotrack_log_${currentDate}.pdf`);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 backdrop-blur-[3px] p-0 sm:p-4 xl:p-8 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="w-full h-full sm:w-[96vw] sm:h-[95vh] xl:w-[94vw] xl:max-w-[1560px] xl:h-[94vh] bg-slate-100 dark:bg-slate-950 sm:rounded-[28px] shadow-2xl flex flex-col overflow-hidden ring-1 ring-slate-200/70 dark:ring-white/10 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="text-slate-900 dark:text-white">
            <h2 className="text-lg sm:text-2xl font-black flex items-center gap-3 tracking-[-0.02em]">
              <div className="p-2 bg-brand-500 rounded-2xl shadow-sm">
                <Printer className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              인쇄 미리보기
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">
              실제 출력 레이아웃을 크게 확인하고 바로 인쇄하거나 PDF로 저장합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-all active:scale-95 group"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        <div className="grid flex-1 min-h-0 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden xl:flex flex-col gap-4 border-r border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 px-5 py-5">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">문서 정보</div>
              <div className="mt-3 space-y-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <span>출력 날짜</span>
                  <span className="font-black tabular-nums">{currentDate}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>출력 행 수</span>
                  <span className="font-black tabular-nums">{visits.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>용지 형식</span>
                  <span className="font-black">A4 세로</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 text-[12px] font-black text-slate-800 dark:text-slate-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                인쇄 전 확인
              </div>
              <div className="mt-3 space-y-2 text-[12px] font-medium leading-5 text-slate-500 dark:text-slate-400">
                <p>미리보기는 실제 출력 비율에 가깝게 보이도록 확대되어 있습니다.</p>
                <p>브라우저 인쇄 설정에서 배경 그래픽 포함을 켜면 색과 구분선이 더 정확합니다.</p>
                <p>PDF 저장과 즉시 인쇄는 같은 레이아웃을 사용합니다.</p>
              </div>
            </div>
          </aside>

          <div className="min-h-0 overflow-auto bg-[linear-gradient(180deg,rgba(241,245,249,0.95),rgba(226,232,240,0.92))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] p-4 sm:p-6 xl:p-8 custom-scrollbar">
            <div className="mx-auto flex min-h-full max-w-[1180px] items-start justify-center">
              <div className="relative rounded-[28px] border border-slate-300/80 bg-white/70 p-3 shadow-[0_18px_60px_rgba(15,23,42,0.16)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/40">
                <div className="mb-3 flex items-center justify-between px-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                  <span>Preview</span>
                  <span>A4 Portrait</span>
                </div>
                <div className="relative overflow-auto rounded-[20px] bg-slate-200/70 p-4 dark:bg-slate-950/70">
                  <div className="origin-top scale-[0.52] xs:scale-[0.6] sm:scale-[0.72] md:scale-[0.86] xl:scale-[1.02] 2xl:scale-[1.1]">
                    <div className="w-[210mm] min-h-[297mm] bg-white text-black shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                      <PatientLogPrintView
                        id="pdf-preview-content-target"
                        visits={visits}
                        currentDate={currentDate}
                        className="block w-full h-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <div className="mx-auto flex max-w-[1560px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              인쇄 결과를 확인한 뒤 PDF 저장 또는 즉시 인쇄를 선택하세요.
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="flex-1 md:flex-none px-6 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-2xl font-black text-sm shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-wait border border-slate-200 dark:border-slate-700"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                PDF 저장
              </button>

              <button
                onClick={handlePrint}
                className="flex-1 md:flex-none px-8 py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-brand-900/20 transition-all active:scale-95 flex items-center justify-center gap-2.5"
              >
                <Printer className="w-5 h-5" />
                즉시 인쇄
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

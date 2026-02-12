
import React, { useState } from 'react';
import { X, Printer, FileDown, CheckCircle, Loader2 } from 'lucide-react';
import { PatientLogPrintView } from '../patient-log/PatientLogPrintView';
import { PatientVisit } from '../../types';

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
  currentDate 
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('pdf-preview-content-target');
    if (!element) {
        console.error("PDF target element not found");
        return;
    }

    setIsGeneratingPdf(true);

    const opt = {
      margin: 10,
      filename: `physiotrack_log_${currentDate}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      // @ts-ignore
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;
      await html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error("PDF generation failed:", e);
      alert("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div 
      /* 
        xl:pr-[620px]: 데스크톱 모드(xl)에서만 사이드바 너비만큼 우측 공간을 비워둡니다.
        이를 통해 justify-center가 배드 카드가 있는 왼쪽 영역을 기준으로 중앙에 오게 합니다.
        태블릿(md, lg) 모드는 영향을 받지 않도록 xl 접두사를 엄격히 사용합니다.
      */
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 xl:pr-[620px] animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* 
        Modal Window:
        - Mobile/Tablet: 거의 전체 화면 (sm:w-[95vw])
        - Desktop (xl): 배드 영역에 맞춰 너비 조정 및 둥근 모서리 강조
      */}
      <div 
        className="w-full h-full sm:w-[95vw] sm:h-[95vh] xl:w-[90%] xl:max-w-4xl xl:h-[85vh] bg-slate-900 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10 animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="text-white">
            <h2 className="text-xl sm:text-2xl font-black flex items-center gap-3">
              <div className="p-2 bg-brand-500 rounded-xl">
                <Printer className="w-5 h-5 text-white" />
              </div>
              인쇄 미리보기
            </h2>
            <p className="hidden sm:block text-[11px] text-slate-400 mt-1 font-bold">배드 영역 중앙에 팝업된 미리보기 창입니다.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95 group"
          >
            <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 xl:p-12 flex justify-center bg-slate-950/50 custom-scrollbar">
          <div className="relative shadow-2xl origin-top">
            {/* A4 Content Container */}
            <div className="w-[210mm] min-h-[297mm] bg-white text-black scale-[0.45] xs:scale-[0.55] sm:scale-[0.75] lg:scale-[0.85] xl:scale-100 origin-top transition-transform shadow-xl">
               <PatientLogPrintView 
                 id="pdf-preview-content-target"
                 visits={visits} 
                 currentDate={currentDate} 
                 className="block w-full h-full" 
               />
            </div>
          </div>
        </div>

        {/* Modal Footer / Controls */}
        <div className="p-5 sm:p-6 bg-slate-900 border-t border-slate-800 shrink-0">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
             
             {/* Info Label */}
             <div className="hidden xl:flex flex-col gap-1 text-sm text-slate-400">
                <span className="flex items-center gap-2 font-bold text-slate-300">
                   <CheckCircle className="w-4 h-4 text-emerald-500" />
                   A4 세로 모드 최적화
                </span>
                <span className="text-[10px] opacity-60">* 브라우저 인쇄 설정에서 '배경 그래픽'을 켜주세요.</span>
             </div>

             {/* Action Buttons */}
             <div className="flex items-center gap-3 w-full sm:w-auto">
               <button 
                 onClick={handleDownloadPDF}
                 disabled={isGeneratingPdf}
                 className="flex-1 sm:flex-none px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 border border-slate-700"
               >
                 {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                 PDF 저장
               </button>

               <button 
                 onClick={handlePrint}
                 className="flex-1 sm:flex-none px-10 py-3.5 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-brand-900/50 transition-all active:scale-95 flex items-center justify-center gap-2"
               >
                 <Printer className="w-4 h-4" />
                 즉시 인쇄
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

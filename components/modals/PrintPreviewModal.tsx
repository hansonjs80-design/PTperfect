
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
    // Standard System Print Dialog
    window.print();
  };

  const handleDownloadPDF = async () => {
    // Target the specific ID used in this modal, NOT the default ID which might be hidden in PatientLogPanel
    // This prevents generating empty PDFs
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
      // Dynamic import to ensure module is loaded correctly during build and runtime
      // This fixes the 'Rollup failed to resolve import' error on Vercel
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
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/95 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Printer className="w-5 h-5 text-brand-400" />
            인쇄 미리보기
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">A4 용지 기준 레이아웃입니다.</p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Preview Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-950/50 custom-scrollbar">
        <div className="relative shadow-2xl animate-in zoom-in-95 duration-300 origin-top">
          {/* A4 Size Container (approx 210mm x 297mm) */}
          <div className="w-[210mm] min-h-[297mm] bg-white text-black origin-top scale-75 sm:scale-90 md:scale-100 transition-transform">
             {/* Reuse the print view component but force it visible with a UNIQUE ID for PDF generation */}
             <PatientLogPrintView 
               id="pdf-preview-content-target"
               visits={visits} 
               currentDate={currentDate} 
               className="block w-full h-full" 
             />
          </div>
        </div>
      </div>

      {/* Footer / Controls */}
      <div className="p-6 bg-slate-900 border-t border-slate-800 shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
           
           {/* Instructions */}
           <div className="flex flex-col gap-2 text-sm text-slate-400">
              <div className="flex items-start gap-2">
                 <CheckCircle className="w-4 h-4 text-brand-500 mt-0.5" />
                 <span>
                   <strong>프린터 인쇄:</strong> 프린터를 선택하여 즉시 출력합니다.
                 </span>
              </div>
              <div className="flex items-start gap-2">
                 <FileDown className="w-4 h-4 text-brand-500 mt-0.5" />
                 <span>
                   <strong>PDF 다운로드:</strong> 파일을 생성하여 기기에 저장합니다.
                 </span>
              </div>
           </div>

           {/* Action Buttons */}
           <div className="flex items-center gap-3 w-full md:w-auto">
             <button 
               onClick={handleDownloadPDF}
               disabled={isGeneratingPdf}
               className="flex-1 md:flex-none px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-base shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait"
             >
               {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
               PDF 파일 저장
             </button>

             <button 
               onClick={handlePrint}
               className="flex-1 md:flex-none px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-base shadow-lg shadow-brand-900/50 transition-all active:scale-95 flex items-center justify-center gap-2"
             >
               <Printer className="w-5 h-5" />
               프린터 인쇄
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

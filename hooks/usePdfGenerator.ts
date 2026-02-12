
import { useState } from 'react';

export const usePdfGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error("PDF target element not found");
        return;
    }

    setIsGenerating(true);

    const opt = {
      margin: 10,
      filename: filename,
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
      setIsGenerating(false);
    }
  };

  return { isGenerating, generatePdf };
};

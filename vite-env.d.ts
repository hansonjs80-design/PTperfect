
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
}

declare module 'html2pdf.js' {
  export interface Html2PdfOptions {
    margin?: number | [number, number] | [number, number, number, number];
    filename?: string;
    image?: {
      type?: 'jpeg' | 'png' | 'webp';
      quality?: number;
    };
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
    };
    jsPDF?: {
      unit?: string;
      format?: string | [number, number];
      orientation?: 'portrait' | 'landscape';
    };
  }

  interface Html2PdfWorker {
    set(options: Html2PdfOptions): Html2PdfWorker;
    from(source: HTMLElement): Html2PdfWorker;
    save(): Promise<void>;
  }

  const html2pdf: () => Html2PdfWorker;
  export default html2pdf;
}

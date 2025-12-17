
// We use pdfjs-dist from a CDN as a standard practice for in-browser PDF handling.
// Note: In a real project you'd install this via npm.
declare const pdfjsLib: any;

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export class PdfService {
  private static isLoaded = false;

  private static async loadLibrary() {
    if (this.isLoaded) return;
    
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PDFJS_CDN;
      script.onload = () => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
        this.isLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  static async convertPdfToImages(file: File): Promise<{ imageUrl: string; base64: string }[]> {
    await this.loadLibrary();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: { imageUrl: string; base64: string }[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      images.push({
        imageUrl: base64,
        base64: base64.split(',')[1]
      });
    }

    return images;
  }
}

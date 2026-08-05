import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

const PDFJS_VERSION = '4.10.38';
const WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

let pdfjsLibPromise = null;
async function loadPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist').then(async (lib) => {
      const blob = await fetch(WORKER_URL).then(r => r.blob());
      lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
      return lib;
    });
  }
  return pdfjsLibPromise;
}

export default function PdfViewer({ url }) {
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const canvasRefs = useRef([]);
  const pdfRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setNumPages(0);

    (async () => {
      try {
        const pdfjsLib = await loadPdfjs();
        const data = await fetch(url).then(r => r.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (e) {
        console.error('PDF render error:', e);
        if (!cancelled) { setError(true); setLoading(false); }
      }
    })();

    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    if (numPages === 0) return;
    let cancelled = false;
    (async () => {
      const pdf = pdfRef.current;
      if (!pdf) return;
      for (let i = 1; i <= numPages; i++) {
        if (cancelled) return;
        const canvas = canvasRefs.current[i - 1];
        if (!canvas) continue;
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
      }
    })();
    return () => { cancelled = true; };
  }, [numPages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando documento...</span>
      </div>
    );
  }

  if (error) {
    return <iframe src={url} className="w-full h-[600px] border rounded-lg print:hidden" title="Documento ART" />;
  }

  return (
    <div className="pdf-viewer-container space-y-4">
      {Array.from({ length: numPages }).map((_, i) => (
        <div key={i} className="pdf-page-container w-full" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <canvas
            ref={el => { canvasRefs.current[i] = el; }}
            style={{ width: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
          />
        </div>
      ))}
    </div>
  );
}
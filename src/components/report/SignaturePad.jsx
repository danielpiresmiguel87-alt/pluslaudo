import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SignaturePad = forwardRef(({ label }, ref) => {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasSigRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  useImperativeHandle(ref, () => ({
    toDataURL: () => {
      const canvas = canvasRef.current;
      if (!canvas || !hasSigRef.current) return null;
      return canvas.toDataURL('image/png');
    },
    clear: () => clearCanvas(),
    hasSignature: () => hasSigRef.current,
  }));

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSigRef.current = false;
    setHasSignature(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e3a5f';
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const start = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    drawingRef.current = true;
  };

  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    if (!hasSigRef.current) {
      hasSigRef.current = true;
      setHasSignature(true);
    }
  };

  const end = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    drawingRef.current = false;
  };

  return (
    <div>
      {label && <span className="text-sm font-medium text-muted-foreground mb-1 block">{label}</span>}
      <div className="relative border-2 border-dashed border-input rounded-lg bg-white overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          className="w-full h-32 cursor-crosshair touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />
        {!hasSignature && (
          <span className="absolute inset-0 flex items-center justify-center text-muted-foreground/40 text-sm pointer-events-none select-none">
            Assine aqui
          </span>
        )}
      </div>
      {hasSignature && (
        <Button variant="ghost" size="sm" className="mt-1 h-7" onClick={clearCanvas}>
          <Eraser className="h-3 w-3 mr-1" /> Limpar
        </Button>
      )}
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';
export default SignaturePad;
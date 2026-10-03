import React, { useRef, useState, useEffect } from 'react';
import {
  Crop,
  Highlighter,
  Check,
  X,
  RotateCcw,
  Square,
  Circle,
  Type,
  Maximize2
} from 'lucide-react';

export default function ImageEditorModal({
  isOpen,
  onClose,
  imageSrc,
  fileName,
  onSave
}) {
  const [tool, setTool] = useState('crop'); // 'crop', 'highlight', 'rect', 'draw'
  const [color, setColor] = useState('#fbbf24'); // highlight yellow
  const [lineWidth, setLineWidth] = useState(14);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cropRect, setCropRect] = useState(null); // { x, y, width, height }
  const [cropStart, setCropStart] = useState(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const originalImageRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      originalImageRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      setCropRect(null);
      setCropStart(null);
    };
  }, [isOpen, imageSrc]);

  if (!isOpen) return null;

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);

    if (tool === 'crop') {
      setCropStart(coords);
      setCropRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
      return;
    }

    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'highlight') {
      ctx.strokeStyle = color + '66'; // 40% opacity highlighter
      ctx.lineWidth = lineWidth * 2;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
    }
  };

  const handleMouseMove = (e) => {
    const coords = getCanvasCoords(e);

    if (tool === 'crop' && cropStart) {
      const x = Math.min(cropStart.x, coords.x);
      const y = Math.min(cropStart.y, coords.y);
      const width = Math.abs(coords.x - cropStart.x);
      const height = Math.abs(coords.y - cropStart.y);
      setCropRect({ x, y, width, height });
      return;
    }

    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    if (tool === 'crop') {
      setCropStart(null);
      return;
    }
    setIsDrawing(false);
  };

  const applyCrop = () => {
    if (!cropRect || cropRect.width < 5 || cropRect.height < 5) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const croppedData = ctx.getImageData(
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height
    );

    canvas.width = cropRect.width;
    canvas.height = cropRect.height;
    ctx.putImageData(croppedData, 0, 0);
    setCropRect(null);
  };

  const handleReset = () => {
    if (!originalImageRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    setCropRect(null);
  };

  const handleConfirmSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="image-editor-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="editor-modal-header">
          <div className="editor-title-group">
            <h3>Image Editor & Screen Annotate</h3>
            <span className="editor-file-tag">{fileName || 'Screenshot / Image'}</span>
          </div>
          <button className="modal-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="editor-toolbar">
          <div className="editor-tools-group">
            <button
              type="button"
              className={`tool-btn ${tool === 'crop' ? 'active' : ''}`}
              onClick={() => setTool('crop')}
              title="Crop image (Drag rectangle, then click Apply Crop)"
            >
              <Crop size={16} />
              <span>Crop</span>
            </button>

            <button
              type="button"
              className={`tool-btn ${tool === 'highlight' ? 'active' : ''}`}
              onClick={() => {
                setTool('highlight');
                setColor('#fbbf24');
              }}
              title="Highlight text or bugs"
            >
              <Highlighter size={16} />
              <span>Highlight</span>
            </button>

            <button
              type="button"
              className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
              onClick={() => {
                setTool('pen');
                setColor('#ef4444');
              }}
              title="Pen / Draw"
            >
              <Square size={16} />
              <span>Pen</span>
            </button>
          </div>

          <div className="editor-colors-group">
            {['#fbbf24', '#ef4444', '#10b981', '#38bdf8', '#a855f7'].map((c) => (
              <button
                key={c}
                type="button"
                className={`color-swatch ${color === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>

          <div className="editor-actions-group">
            {tool === 'crop' && cropRect && cropRect.width > 10 && (
              <button
                type="button"
                className="btn-apply-crop"
                onClick={applyCrop}
              >
                <Check size={14} />
                <span>Apply Crop</span>
              </button>
            )}

            <button
              type="button"
              className="tool-btn reset-btn"
              onClick={handleReset}
              title="Reset to Original"
            >
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Canvas Workspace */}
        <div className="editor-canvas-workspace" ref={containerRef}>
          <div className="canvas-wrapper">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className={`editor-canvas cursor-${tool}`}
            />
            {tool === 'crop' && cropRect && (
              <div
                className="crop-overlay-rect"
                style={{
                  left: `${(cropRect.x / (canvasRef.current?.width || 1)) * 100}%`,
                  top: `${(cropRect.y / (canvasRef.current?.height || 1)) * 100}%`,
                  width: `${(cropRect.width / (canvasRef.current?.width || 1)) * 100}%`,
                  height: `${(cropRect.height / (canvasRef.current?.height || 1)) * 100}%`
                }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="editor-footer">
          <div className="editor-hints">
            {tool === 'crop' && <span>Drag mouse on canvas to select area, then click "Apply Crop".</span>}
            {tool === 'highlight' && <span>Drag over code or UI to add glowing transparent highlights.</span>}
            {tool === 'pen' && <span>Draw red arrows or circle bugs for the AI model to inspect.</span>}
          </div>
          <div className="editor-footer-buttons">
            <button type="button" className="edit-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="edit-btn-resubmit"
              onClick={handleConfirmSave}
            >
              <Check size={14} />
              <span>Attach Edited Image</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

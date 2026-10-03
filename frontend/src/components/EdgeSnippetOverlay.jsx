import React, { useRef, useState, useEffect } from 'react';
import {
  Crop,
  Highlighter,
  Check,
  X,
  RotateCcw,
  Square,
  ArrowUpRight,
  Type,
  EyeOff,
  Download,
  Copy,
  PenTool
} from 'lucide-react';

export default function EdgeSnippetOverlay({
  isOpen,
  onClose,
  fullScreenshotSrc,
  onConfirmSnippet
}) {
  const [stage, setStage] = useState('snip'); // 'snip' -> 'annotate'
  const [snipRect, setSnipRect] = useState(null); // { x, y, width, height }
  const [dragStart, setDragStart] = useState(null);
  const [tool, setTool] = useState('highlight'); // 'highlight', 'pen', 'arrow', 'rect', 'blur', 'text'
  const [color, setColor] = useState('#fbbf24'); // default yellow
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStartCoords, setDrawStartCoords] = useState(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [history, setHistory] = useState([]); // Undo history stacks
  const [activeTextInput, setActiveTextInput] = useState(null); // { x, y } for text tool
  const [snapshotBeforeShape, setSnapshotBeforeShape] = useState(null); // Snapshot before drawing shape

  const canvasRef = useRef(null);
  const bgImgRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setSnipRect(null);
      setDragStart(null);
      setStage('snip');
    }
  }, [isOpen]);

  // Load snippet into annotation canvas once cropped
  useEffect(() => {
    if (stage === 'annotate' && snipRect && bgImgRef.current && canvasRef.current) {
      const img = bgImgRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = snipRect.width;
      canvas.height = snipRect.height;

      // Draw exactly the selected slice
      ctx.drawImage(
        img,
        snipRect.x,
        snipRect.y,
        snipRect.width,
        snipRect.height,
        0,
        0,
        snipRect.width,
        snipRect.height
      );
    }
  }, [stage, snipRect]);

  if (!isOpen || !fullScreenshotSrc) return null;

  // 1. SNIP STAGE (Microsoft Edge Snipping overlay style)
  const handleOverlayMouseDown = (e) => {
    if (stage !== 'snip') return;
    const x = e.clientX;
    const y = e.clientY;
    setDragStart({ x, y });
    setSnipRect({ x, y, width: 0, height: 0 });
  };

  const handleOverlayMouseMove = (e) => {
    if (stage !== 'snip' || !dragStart) return;
    const currentX = e.clientX;
    const currentY = e.clientY;

    const x = Math.min(dragStart.x, currentX);
    const y = Math.min(dragStart.y, currentY);
    const width = Math.abs(currentX - dragStart.x);
    const height = Math.abs(currentY - dragStart.y);

    setSnipRect({ x, y, width, height });
  };

  const handleOverlayMouseUp = () => {
    if (stage !== 'snip' || !dragStart) return;
    setDragStart(null);

    // If selected area is reasonable (> 20px), transition to annotate stage
    if (snipRect && snipRect.width > 20 && snipRect.height > 20) {
      setStage('annotate');
    } else {
      setSnipRect(null);
    }
  };

  // 2. ANNOTATE STAGE (Highlighter & Markup on cropped snip)
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

  // Save canvas state for Undo
  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHistory((prev) => [...prev, canvas.toDataURL()]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    const img = new Image();
    img.src = last;
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  const handleCanvasMouseDown = (e) => {
    if (stage !== 'annotate') return;
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (tool === 'text') {
      saveState();
      setActiveTextInput({ x: coords.x, y: coords.y, text: '' });
      return;
    }

    saveState();
    setIsDrawing(true);
    setDrawStartCoords(coords);
    setSnapshotBeforeShape(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (tool === 'highlight' || tool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (tool === 'highlight') {
        ctx.strokeStyle = color + '66';
        ctx.lineWidth = 26;
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
      }
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing || stage !== 'annotate') return;
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (tool === 'highlight' || tool === 'pen') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (snapshotBeforeShape && drawStartCoords) {
      // Restore previous state so shape previews cleanly as you drag
      ctx.putImageData(snapshotBeforeShape, 0, 0);

      if (tool === 'rect') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(
          drawStartCoords.x,
          drawStartCoords.y,
          coords.x - drawStartCoords.x,
          coords.y - drawStartCoords.y
        );
      } else if (tool === 'arrow') {
        drawArrow(ctx, drawStartCoords.x, drawStartCoords.y, coords.x, coords.y, color);
      } else if (tool === 'blur') {
        // Redaction / Blur box preview
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(
          drawStartCoords.x,
          drawStartCoords.y,
          coords.x - drawStartCoords.x,
          coords.y - drawStartCoords.y
        );
      }
    }
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY, arrowColor) => {
    const headLength = 22; // solid prominent arrowhead
    const headAngle = Math.PI / 6; // 30 degrees
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    const lineLen = Math.hypot(dx, dy);

    // If drag is tiny, skip
    if (lineLen < 5) return;

    ctx.save();
    ctx.strokeStyle = arrowColor;
    ctx.fillStyle = arrowColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';

    // Calculate where shaft meets back of arrowhead so it doesn't poke through tip
    const shaftEndX = toX - Math.cos(angle) * (headLength * 0.75);
    const shaftEndY = toY - Math.sin(angle) * (headLength * 0.75);

    // Draw Arrow Shaft
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(shaftEndX, shaftEndY);
    ctx.stroke();

    // Draw Crisp Triangular Arrow Head
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - headAngle),
      toY - headLength * Math.sin(angle - headAngle)
    );
    // Slight notch/indent for modern snipping tool look
    ctx.lineTo(
      toX - (headLength * 0.75) * Math.cos(angle),
      toY - (headLength * 0.75) * Math.sin(angle)
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + headAngle),
      toY - headLength * Math.sin(angle + headAngle)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const handleCanvasMouseUp = (e) => {
    if (tool === 'arrow' && drawStartCoords && isDrawing) {
      const coords = getCanvasCoords(e);
      const lineLen = Math.hypot(coords.x - drawStartCoords.x, coords.y - drawStartCoords.y);
      // If arrow was actually dragged out (> 15px), anchor the text annotation box at the arrow base
      if (lineLen > 15) {
        // Place the text prompt at the base of the arrow (drawStartCoords)
        setActiveTextInput({ x: drawStartCoords.x, y: drawStartCoords.y, text: '' });
      }
    }

    setIsDrawing(false);
    setSnapshotBeforeShape(null);
    setDrawStartCoords(null);
  };

  const handleCommitText = (text) => {
    if (!activeTextInput || !text || !text.trim()) {
      setActiveTextInput(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.font = 'bold 18px "Segoe UI", Inter, -apple-system, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const paddingX = 8;
    const boxHeight = 28;
    const boxWidth = textWidth + paddingX * 2;
    const boxX = activeTextInput.x;
    const boxY = activeTextInput.y;

    // Draw clean label box matching Windows / Snipping tool note style
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0078d4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(boxX, boxY, boxWidth, boxHeight);
    ctx.fill();
    ctx.stroke();

    // Draw text inside
    ctx.fillStyle = '#111827';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, boxX + paddingX, boxY + boxHeight / 2);
    ctx.restore();

    setActiveTextInput(null);
  };

  const handleAttachSnippet = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const finalDataUrl = canvas.toDataURL('image/png');
    onConfirmSnippet(finalDataUrl);
    onClose();
  };

  // Robust Clipboard Copy: Copies binary PNG to system clipboard, caches for in-app Ctrl+V, and notifies user
  const handleCopyClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');

    // 1. Cache the snippet in sessionStorage & window so in-app pasting works even if browser blocks system clipboard
    try {
      sessionStorage.setItem('ai_last_copied_screenshot', dataUrl);
      window.__lastCopiedScreenshot = dataUrl;
    } catch (e) {
      // Ignore quota error
    }

    // 2. Write to system clipboard as real PNG image Blob
    let copiedSuccess = false;
    try {
      if (canvas.toBlob && window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        // Modern async clipboard API
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          copiedSuccess = true;
        }
      }
    } catch (err) {
      console.warn('System clipboard.write image/png error:', err);
    }

    // 3. Fallback: Also try writing as text Data URL to clipboard if image blob was denied
    if (!copiedSuccess && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(dataUrl);
        copiedSuccess = true;
      } catch (e) {
        // Fallback for non-secure HTTP origins using execCommand('copy')
        try {
          const textArea = document.createElement('textarea');
          textArea.value = dataUrl;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          copiedSuccess = true;
        } catch (execErr) {
          console.warn('execCommand copy failed:', execErr);
        }
      }
    }

    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Download screenshot as PNG file
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Capture-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Capture Entire Page option (Microsoft Edge "Capture full page")
  const handleCaptureFullPage = () => {
    const img = bgImgRef.current;
    if (!img) return;
    setSnipRect({ x: 0, y: 0, width: img.naturalWidth || window.innerWidth, height: img.naturalHeight || window.innerHeight });
    setStage('annotate');
  };

  const handleRedoSnip = () => {
    setSnipRect(null);
    setDragStart(null);
    setHistory([]);
    setStage('snip');
  };

  return (
    <div className="edge-snippet-fullscreen-root">
      {/* Hidden full screenshot image buffer */}
      <img
        ref={bgImgRef}
        src={fullScreenshotSrc}
        alt="Screen buffer"
        style={{ display: 'none' }}
      />

      {/* STAGE 1: Freeform crosshair area selection (like Microsoft Edge Web Capture) */}
      {stage === 'snip' && (
        <div
          className="edge-snip-overlay"
          onMouseDown={handleOverlayMouseDown}
          onMouseMove={handleOverlayMouseMove}
          onMouseUp={handleOverlayMouseUp}
        >
          {/* Background frozen screenshot */}
          <img src={fullScreenshotSrc} alt="Full view" className="edge-snip-bg-image" />

          {/* Dimmed backdrop */}
          <div className="edge-snip-dim-mask" />

          {/* Selection cutout */}
          {snipRect && snipRect.width > 0 && (
            <div
              className="edge-snip-cutout"
              style={{
                left: `${snipRect.x}px`,
                top: `${snipRect.y}px`,
                width: `${snipRect.width}px`,
                height: `${snipRect.height}px`
              }}
            >
              {/* Highlight borders */}
              <div className="edge-cutout-border" />
              <div className="edge-cutout-dimensions">
                {Math.round(snipRect.width)} × {Math.round(snipRect.height)}
              </div>
            </div>
          )}

          {/* Floating Instructions Banner */}
          <div className="edge-snip-banner">
            <div className="edge-banner-pill">
              <span>✂️ Drag to capture area</span>
              <button
                type="button"
                className="edge-btn-fullpage"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCaptureFullPage();
                }}
              >
                <span>Capture Full Page</span>
              </button>
              <button
                type="button"
                className="edge-banner-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: Microsoft Edge Markup / Highlighter Floating Bar */}
      {stage === 'annotate' && (
        <div className="edge-annotate-overlay">
          {/* Top floating Edge-style command pill */}
          <div className="edge-floating-commandbar">
            <div className="edge-toolset">
              <button
                type="button"
                className={`edge-tool-btn ${tool === 'highlight' ? 'active' : ''}`}
                onClick={() => {
                  setTool('highlight');
                  setColor('#fbbf24');
                }}
                title="Highlighter"
              >
                <Highlighter size={16} />
                <span>Highlighter</span>
              </button>

              <button
                type="button"
                className={`edge-tool-btn ${tool === 'pen' ? 'active' : ''}`}
                onClick={() => {
                  setTool('pen');
                  setColor('#ef4444');
                }}
                title="Pen / Freehand"
              >
                <PenTool size={15} />
                <span>Pen</span>
              </button>

              <button
                type="button"
                className={`edge-tool-btn ${tool === 'arrow' ? 'active' : ''}`}
                onClick={() => {
                  setTool('arrow');
                  setColor('#ef4444');
                }}
                title="Arrow (Point to bugs / UI elements)"
              >
                <ArrowUpRight size={16} />
                <span>Arrow</span>
              </button>

              <button
                type="button"
                className={`edge-tool-btn ${tool === 'rect' ? 'active' : ''}`}
                onClick={() => {
                  setTool('rect');
                  setColor('#ef4444');
                }}
                title="Rectangle / Frame Box"
              >
                <Square size={15} />
                <span>Box</span>
              </button>

              <button
                type="button"
                className={`edge-tool-btn ${tool === 'text' ? 'active' : ''}`}
                onClick={() => {
                  setTool('text');
                  setColor('#38bdf8');
                }}
                title="Text Annotation (Click anywhere on snippet to type)"
              >
                <Type size={15} />
                <span>Text</span>
              </button>

              <button
                type="button"
                className={`edge-tool-btn ${tool === 'blur' ? 'active' : ''}`}
                onClick={() => {
                  setTool('blur');
                }}
                title="Redact / Blur (Black out sensitive data or keys)"
              >
                <EyeOff size={15} />
                <span>Redact</span>
              </button>

              <div className="edge-color-picker">
                {['#fbbf24', '#ef4444', '#10b981', '#38bdf8', '#a855f7'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`edge-swatch ${color === c ? 'active' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>

              <button
                type="button"
                className="edge-tool-btn"
                onClick={handleUndo}
                disabled={history.length === 0}
                title="Undo last stroke"
              >
                <span>↩ Undo</span>
              </button>

              <button
                type="button"
                className="edge-tool-btn"
                onClick={handleRedoSnip}
                title="Retake Area"
              >
                <RotateCcw size={15} />
                <span>Retake</span>
              </button>
            </div>

            <div className="edge-actionset">
              <button
                type="button"
                className="edge-btn-copy"
                onClick={handleDownload}
                title="Save PNG image to disk"
              >
                <Download size={14} />
                <span>Save</span>
              </button>

              <button
                type="button"
                className="edge-btn-copy"
                onClick={handleCopyClipboard}
                title="Copy snippet image to clipboard"
              >
                {copiedNotification ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="edge-btn-done"
                onClick={handleAttachSnippet}
                title="Attach directly to AI chat"
              >
                <Check size={15} />
                <span>Attach to Chat</span>
              </button>

              <button
                type="button"
                className="edge-btn-cancel"
                onClick={onClose}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Central canvas presentation */}
          <div className="edge-canvas-container" style={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className={`edge-markup-canvas cursor-${tool}`}
            />

            {/* Inline Text Annotation Input with [x] [input] [OK] styling */}
            {activeTextInput && (
              <div
                className="edge-canvas-text-prompt-box"
                style={{
                  position: 'absolute',
                  left: `${(activeTextInput.x / (canvasRef.current?.width || 1)) * 100}%`,
                  top: `${(activeTextInput.y / (canvasRef.current?.height || 1)) * 100}%`,
                  zIndex: 25
                }}
              >
                <button
                  type="button"
                  className="edge-prompt-btn-cancel"
                  onClick={() => setActiveTextInput(null)}
                  title="Cancel"
                >
                  ✕
                </button>
                <input
                  type="text"
                  autoFocus
                  placeholder="Type note..."
                  value={activeTextInput.text || ''}
                  onChange={(e) => setActiveTextInput(prev => ({ ...prev, text: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCommitText(activeTextInput.text);
                    } else if (e.key === 'Escape') {
                      setActiveTextInput(null);
                    }
                  }}
                />
                <button
                  type="button"
                  className="edge-prompt-btn-ok"
                  onClick={() => handleCommitText(activeTextInput.text)}
                  title="Commit text"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

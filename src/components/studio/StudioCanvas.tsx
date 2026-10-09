'use client';

import React, { useRef, useState, useEffect } from 'react';
import { CanvasElement, TextElement, ImageElement, GraphicElement } from '@/types/studio';
import { PrintArea } from '@/types/product';
import { getGarmentSvg } from '@/lib/mockups';
import { GRAPHIC_PRESETS } from '@/lib/db/graphics';
import { RotateCw, Trash2, Move, Maximize2 } from 'lucide-react';

interface StudioCanvasProps {
  category: string;
  view: 'front' | 'back';
  garmentColorHex: string;
  printArea?: PrintArea;
  elements: CanvasElement[];
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  zoomLevel: number;
}

export function StudioCanvas({
  category,
  view,
  garmentColorHex,
  printArea,
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  zoomLevel,
}: StudioCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Interaction tracking
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialElementState, setInitialElementState] = useState<CanvasElement | null>(null);

  const selectedElement = elements.find((el) => el.id === selectedElementId);

  // Pointer move handler for drag, resize, rotate
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!printAreaRef.current || !initialElementState || !selectedElement) return;

      const printRect = printAreaRef.current.getBoundingClientRect();

      if (isDragging) {
        const deltaX = ((e.clientX - dragStart.x) / printRect.width) * 100;
        const deltaY = ((e.clientY - dragStart.y) / printRect.height) * 100;

        let newX = initialElementState.x + deltaX;
        let newY = initialElementState.y + deltaY;

        // Keep inside bounds roughly (-10% to 110%)
        newX = Math.max(-10, Math.min(100, newX));
        newY = Math.max(-10, Math.min(100, newY));

        onUpdateElement(selectedElement.id, { x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
      } else if (isResizing) {
        const deltaX = ((e.clientX - dragStart.x) / printRect.width) * 100;
        const newWidth = Math.max(10, Math.min(100, initialElementState.width + deltaX));
        // Scale height proportionally
        const ratio = initialElementState.height / initialElementState.width;
        const newHeight = newWidth * ratio;

        onUpdateElement(selectedElement.id, {
          width: Math.round(newWidth * 10) / 10,
          height: Math.round(newHeight * 10) / 10,
        });
      } else if (isRotating) {
        // Calculate center of element in client coords
        const elCenterX = printRect.left + (initialElementState.x + initialElementState.width / 2) * (printRect.width / 100);
        const elCenterY = printRect.top + (initialElementState.y + initialElementState.height / 2) * (printRect.height / 100);

        const rad = Math.atan2(e.clientY - elCenterY, e.clientX - elCenterX);
        let deg = Math.round(rad * (180 / Math.PI) + 90);
        if (deg < 0) deg += 360;

        onUpdateElement(selectedElement.id, { rotation: deg });
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setIsRotating(false);
      setIsResizing(false);
      setInitialElementState(null);
    };

    if (isDragging || isRotating || isResizing) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, isRotating, isResizing, dragStart, initialElementState, selectedElement, onUpdateElement]);

  const startDrag = (e: React.PointerEvent, el: CanvasElement) => {
    e.stopPropagation();
    onSelectElement(el.id);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialElementState({ ...el });
  };

  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!selectedElement) return;
    setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialElementState({ ...selectedElement });
  };

  const startRotate = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!selectedElement) return;
    setIsRotating(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialElementState({ ...selectedElement });
  };

  // Garment SVG markup
  const garmentSvg = getGarmentSvg(category, view, garmentColorHex);

  const bounds = printArea?.bounds || { x: 28, y: 22, width: 44, height: 46 };

  return (
    <div
      ref={containerRef}
      onClick={() => onSelectElement(null)}
      className="relative w-full h-[520px] md:h-[620px] flex items-center justify-center overflow-hidden bg-canvas-dark rounded-xl border border-canvas-border select-none"
      style={{
        transform: `scale(${zoomLevel})`,
        transformOrigin: 'center center',
        transition: isDragging || isResizing || isRotating ? 'none' : 'transform 0.15s ease-out',
      }}
    >
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #333842 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Main Garment Container */}
      <div className="relative w-[380px] sm:w-[440px] md:w-[480px] h-[460px] sm:h-[520px] md:h-[560px] flex items-center justify-center">
        {/* Render Vector Garment Base */}
        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          dangerouslySetInnerHTML={{ __html: garmentSvg }}
        />

        {/* Printable Area Boundary Container */}
        <div
          ref={printAreaRef}
          style={{
            position: 'absolute',
            left: `${bounds.x}%`,
            top: `${bounds.y}%`,
            width: `${bounds.width}%`,
            height: `${bounds.height}%`,
          }}
          className="relative border border-dashed border-brand-lime/40 bg-brand-lime/[0.02] rounded"
        >
          {/* Printable Area Label */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] tracking-wider uppercase font-mono text-brand-lime/70 bg-black/60 px-2 py-0.5 rounded pointer-events-none whitespace-nowrap">
            Print Area: {printArea?.name || 'Center'}
          </div>

          {/* Render Active Elements */}
          {elements.map((el) => {
            const isSelected = el.id === selectedElementId;

            return (
              <div
                key={el.id}
                onPointerDown={(e) => startDrag(e, el)}
                style={{
                  position: 'absolute',
                  left: `${el.x}%`,
                  top: `${el.y}%`,
                  width: `${el.width}%`,
                  height: el.type === 'text' ? 'auto' : `${el.height}%`,
                  transform: `rotate(${el.rotation}deg)`,
                  transformOrigin: 'center center',
                  zIndex: el.zIndex,
                  cursor: isDragging ? 'grabbing' : 'grab',
                }}
                className={`group touch-none select-none ${
                  isSelected ? 'ring-2 ring-brand-lime ring-offset-1 ring-offset-black/50' : 'hover:ring-1 hover:ring-white/40'
                }`}
              >
                {/* Element Content Renderers */}
                {el.type === 'text' && (
                  <div
                    style={{
                      fontFamily: (el as TextElement).fontFamily,
                      fontSize: `${(el as TextElement).fontSize}px`,
                      color: (el as TextElement).fill,
                      textAlign: (el as TextElement).textAlign,
                      fontWeight: (el as TextElement).fontWeight,
                      fontStyle: (el as TextElement).fontStyle,
                      letterSpacing: `${(el as TextElement).letterSpacing}px`,
                      lineHeight: (el as TextElement).lineHeight,
                      textTransform: (el as TextElement).textTransform || 'none',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                    className="w-full select-none drop-shadow-sm"
                  >
                    {(el as TextElement).text}
                  </div>
                )}

                {el.type === 'image' && (
                  <div className="w-full h-full overflow-hidden select-none">
                    <img
                      src={(el as ImageElement).src}
                      alt={el.name}
                      className="w-full h-full object-contain pointer-events-none"
                      crossOrigin="anonymous"
                    />
                  </div>
                )}

                {el.type === 'graphic' && (() => {
                  const graphicEl = el as GraphicElement;
                  const preset = GRAPHIC_PRESETS.find((p) => p.id === graphicEl.graphicId);
                  const viewBox = graphicEl.viewBox || preset?.viewBox || '0 0 100 100';
                  const svgPath = graphicEl.svgPath || preset?.svgPath || '';

                  return (
                    <svg
                      viewBox={viewBox}
                      className="w-full h-full drop-shadow-sm pointer-events-none"
                    >
                      <path
                        d={svgPath}
                        fill={graphicEl.fill || preset?.defaultFill || '#FFFFFF'}
                        stroke={graphicEl.stroke || 'none'}
                        strokeWidth={graphicEl.strokeWidth || 0}
                      />
                    </svg>
                  );
                })()}

                {/* Selection Handles & Controls */}
                {isSelected && (
                  <>
                    {/* Top Rotate Handle */}
                    <div
                      onPointerDown={startRotate}
                      className="absolute -top-7 left-1/2 -translate-x-1/2 w-6 h-6 bg-brand-lime text-black rounded-full flex items-center justify-center cursor-grab hover:scale-110 shadow-glow pointer-events-auto"
                      title="Rotate Element"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </div>
                    {/* Connector line from element to rotate button */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-brand-lime pointer-events-none" />

                    {/* Bottom Right Resize Handle */}
                    <div
                      onPointerDown={startResize}
                      className="absolute -bottom-2 -right-2 w-5 h-5 bg-brand-lime text-black rounded-sm flex items-center justify-center cursor-nwse-resize hover:scale-110 shadow-glow pointer-events-auto"
                      title="Resize Scale"
                    >
                      <Maximize2 className="w-3 h-3 rotate-90" />
                    </div>

                    {/* Top Right Quick Delete */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteElement(el.id);
                      }}
                      className="absolute -top-3 -right-3 w-5 h-5 bg-brand-accent text-white rounded-full flex items-center justify-center hover:scale-110 shadow-md pointer-events-auto"
                      title="Delete Element"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

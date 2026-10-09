'use client';

import React, { useState, useRef } from 'react';
import { Product, GarmentColor, GarmentSize } from '@/types/product';
import { CanvasElement, TextElement, ImageElement, GraphicElement, DesignDocument } from '@/types/studio';
import { StudioCanvas } from './StudioCanvas';
import { SEED_TEMPLATES } from '@/lib/db/templates';
import { GRAPHIC_PRESETS } from '@/lib/db/graphics';
import { STORE_CONFIG } from '@/lib/config';
import { formatINR } from '@/lib/currency';
import { generateId } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { StoreRepository } from '@/lib/db/store';
import {
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plus,
  Type,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Shapes,
  Upload,
  Check,
  ShoppingBag,
  Bookmark,
  ChevronRight,
  Eye,
  Sliders,
  AlertTriangle,
  Trash2,
} from 'lucide-react';

interface DesignStudioProps {
  initialProduct: Product;
  allCustomizableProducts: Product[];
  initialDesign?: DesignDocument;
}

type TabType = 'templates' | 'text' | 'graphics' | 'uploads' | 'layers';

const FONT_OPTIONS = [
  { label: 'Space Grotesk (Cyber/Modern)', value: 'Space Grotesk, sans-serif' },
  { label: 'Bebas Neue (Heavy Display)', value: 'Bebas Neue, sans-serif' },
  { label: 'Inter (Clean Sans)', value: 'Inter, sans-serif' },
  { label: 'Playfair Display (Editorial Serif)', value: 'Playfair Display, serif' },
  { label: 'Courier Prime (Technical Mono)', value: 'Courier Prime, monospace' },
];

const PRESET_COLORS = [
  '#FFFFFF',
  '#CCFF00', // Lime
  '#111215', // Black
  '#FF462D', // Red
  '#00E5FF', // Cyan
  '#FFB800', // Gold
  '#9E00FF', // Purple
  '#727782', // Slate
];

export function DesignStudio({
  initialProduct,
  allCustomizableProducts,
  initialDesign,
}: DesignStudioProps) {
  const { addItem } = useCart();

  // State
  const [selectedProduct, setSelectedProduct] = useState<Product>(initialProduct);
  const [selectedColor, setSelectedColor] = useState<GarmentColor>(
    initialProduct.colors[0] || { name: 'Jet Black', hex: '#111215', code: 'BLK', mockupFront: '', mockupBack: '' }
  );
  const [selectedSize, setSelectedSize] = useState<GarmentSize>('L');
  const [activeView, setActiveView] = useState<'front' | 'back'>('front');
  const [activeTab, setActiveTab] = useState<TabType>('templates');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Design elements for Front and Back
  const [frontElements, setFrontElements] = useState<CanvasElement[]>(
    initialDesign?.frontElements || SEED_TEMPLATES[0].frontElements
  );
  const [backElements, setBackElements] = useState<CanvasElement[]>(
    initialDesign?.backElements || SEED_TEMPLATES[0].backElements || []
  );

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<{ front: CanvasElement[]; back: CanvasElement[] }[]>([
    {
      front: initialDesign?.frontElements || SEED_TEMPLATES[0].frontElements,
      back: initialDesign?.backElements || SEED_TEMPLATES[0].backElements || [],
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Status message / toast
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Push to history
  const pushHistory = (newFront: CanvasElement[], newBack: CanvasElement[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push({ front: newFront, back: newBack });
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setFrontElements(prev.front);
      setBackElements(prev.back);
      setHistoryIndex(historyIndex - 1);
      setSelectedElementId(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setFrontElements(next.front);
      setBackElements(next.back);
      setHistoryIndex(historyIndex + 1);
      setSelectedElementId(null);
    }
  };

  // Elements on current active view
  const currentElements = activeView === 'front' ? frontElements : backElements;
  const setCurrentElements = (updater: (prev: CanvasElement[]) => CanvasElement[]) => {
    if (activeView === 'front') {
      const next = updater(frontElements);
      setFrontElements(next);
      pushHistory(next, backElements);
    } else {
      const next = updater(backElements);
      setBackElements(next);
      pushHistory(frontElements, next);
    }
  };

  const activePrintArea = selectedProduct.printAreas.find((pa) => pa.view === activeView) || selectedProduct.printAreas[0];

  const selectedElement = currentElements.find((el) => el.id === selectedElementId);

  // Operations
  const handleUpdateElement = (id: string, updates: Partial<CanvasElement>) => {
    setCurrentElements((prev) =>
      prev.map((el) => (el.id === id ? ({ ...el, ...updates } as CanvasElement) : el))
    );
  };

  const handleDeleteElement = (id: string) => {
    setCurrentElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all designs on this side?')) {
      setCurrentElements(() => []);
      setSelectedElementId(null);
    }
  };

  // Add Text Element
  const handleAddText = (text: string = 'YOUR TEXT HERE', size: number = 22) => {
    const newText: TextElement = {
      id: generateId('txt'),
      type: 'text',
      name: 'Custom Text',
      x: 20,
      y: 35,
      width: 60,
      height: 18,
      rotation: 0,
      opacity: 1,
      zIndex: currentElements.length + 1,
      text,
      fontFamily: 'Space Grotesk, sans-serif',
      fontSize: size,
      fill: '#FFFFFF',
      textAlign: 'center',
      fontWeight: 'bold',
      fontStyle: 'normal',
      letterSpacing: 2,
      lineHeight: 1.1,
    };
    setCurrentElements((prev) => [...prev, newText]);
    setSelectedElementId(newText.id);
    setActiveTab('text');
  };

  // Add Graphic Preset
  const handleAddGraphic = (presetId: string) => {
    const preset = GRAPHIC_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const newGraphic: GraphicElement = {
      id: generateId('gfx'),
      type: 'graphic',
      name: preset.name,
      graphicId: preset.id,
      shapeType: preset.category === 'shapes' ? 'star' : undefined,
      x: 35,
      y: 30,
      width: 30,
      height: 30,
      rotation: 0,
      opacity: 1,
      zIndex: currentElements.length + 1,
      fill: preset.defaultFill,
      viewBox: preset.viewBox,
      svgPath: preset.svgPath,
    };
    setCurrentElements((prev) => [...prev, newGraphic]);
    setSelectedElementId(newGraphic.id);
  };

  // Load Template
  const handleApplyTemplate = (tmplId: string) => {
    const tmpl = SEED_TEMPLATES.find((t) => t.id === tmplId);
    if (!tmpl) return;

    setFrontElements([...tmpl.frontElements]);
    if (tmpl.backElements) {
      setBackElements([...tmpl.backElements]);
    }
    pushHistory(tmpl.frontElements, tmpl.backElements || []);
    setSelectedElementId(null);
    showNotification(`Applied template "${tmpl.name}"`);
  };

  // Image Upload Handling
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > STORE_CONFIG.upload.maxSizeBytes) {
      alert(`File size exceeds the limit of ${STORE_CONFIG.upload.maxSizeBytes / (1024 * 1024)}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const newImg: ImageElement = {
          id: generateId('img'),
          type: 'image',
          name: file.name.substring(0, 20),
          src,
          originalWidth: img.width,
          originalHeight: img.height,
          x: 25,
          y: 25,
          width: 50,
          height: 40,
          rotation: 0,
          opacity: 1,
          zIndex: currentElements.length + 1,
          isUploaded: true,
        };
        setCurrentElements((prev) => [...prev, newImg]);
        setSelectedElementId(newImg.id);
        showNotification('Image uploaded and placed on canvas!');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Customization Pricing Calculation
  const hasFrontArtwork = frontElements.length > 0;
  const hasBackArtwork = backElements.length > 0;
  const activePrintAreaCount = (hasFrontArtwork ? 1 : 0) + (hasBackArtwork ? 1 : 0);
  const customizationFeePaise = activePrintAreaCount * selectedProduct.customizationFeePaise;
  const totalItemPaise = selectedProduct.basePricePaise + customizationFeePaise;

  // Add to Cart with immutable design document
  const handleAddToCart = () => {
    const designDoc: DesignDocument = {
      id: generateId('des'),
      schemaVersion: '1.0.0',
      title: `${selectedProduct.name} Custom`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      garmentColor: selectedColor.name,
      garmentColorHex: selectedColor.hex,
      activeView: 'front',
      frontElements: [...frontElements],
      backElements: [...backElements],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addItem({
      productId: selectedProduct.id,
      productSlug: selectedProduct.slug,
      productName: selectedProduct.name,
      variantId: `${selectedProduct.id}-${selectedColor.code.toLowerCase()}-${selectedSize.toLowerCase()}`,
      size: selectedSize,
      colorName: selectedColor.name,
      colorHex: selectedColor.hex,
      garmentImage: selectedProduct.images[0] || '',
      quantity: 1,
      unitPricePaise: selectedProduct.basePricePaise,
      customizationFeePaise: customizationFeePaise,
      isCustomized: activePrintAreaCount > 0,
      customization:
        activePrintAreaCount > 0
          ? {
              designId: designDoc.id,
              designTitle: designDoc.title,
              designDocument: designDoc,
              elementCount: frontElements.length + backElements.length,
            }
          : undefined,
    });

    showNotification('Customized garment added to cart!');
  };

  // Save Design for user
  const handleSaveDesign = () => {
    const designDoc: DesignDocument = {
      id: generateId('des'),
      schemaVersion: '1.0.0',
      title: `${selectedProduct.name} Custom — ${new Date().toLocaleDateString('en-IN')}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      garmentColor: selectedColor.name,
      garmentColorHex: selectedColor.hex,
      activeView: activeView,
      frontElements: [...frontElements],
      backElements: [...backElements],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    StoreRepository.saveDesign(designDoc);
    showNotification('Design saved successfully to your account!');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto py-4">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-dark text-white border border-brand-lime px-4 py-3 rounded-lg shadow-glow flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 text-brand-lime" />
          <span>{notification}</span>
        </div>
      )}

      {/* LEFT PANEL: Editing Tools & Assets */}
      <div className="w-full lg:w-[360px] bg-canvas-card border border-canvas-border rounded-xl flex flex-col overflow-hidden shadow-subtle shrink-0">
        {/* Navigation Tabs */}
        <div className="flex border-b border-canvas-border bg-canvas-dark/60 text-xs font-mono uppercase tracking-wider overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex-1 py-3 px-3 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'templates'
                ? 'border-brand-lime text-brand-lime bg-brand-lime/5 font-bold'
                : 'border-transparent text-brand-gray hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Templates
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-3 px-3 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'text'
                ? 'border-brand-lime text-brand-lime bg-brand-lime/5 font-bold'
                : 'border-transparent text-brand-gray hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Text
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('graphics')}
            className={`flex-1 py-3 px-3 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'graphics'
                ? 'border-brand-lime text-brand-lime bg-brand-lime/5 font-bold'
                : 'border-transparent text-brand-gray hover:text-white'
            }`}
          >
            <Shapes className="w-3.5 h-3.5" />
            Graphics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('uploads')}
            className={`flex-1 py-3 px-3 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'uploads'
                ? 'border-brand-lime text-brand-lime bg-brand-lime/5 font-bold'
                : 'border-transparent text-brand-gray hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('layers')}
            className={`flex-1 py-3 px-3 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'layers'
                ? 'border-brand-lime text-brand-lime bg-brand-lime/5 font-bold'
                : 'border-transparent text-brand-gray hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Layers ({currentElements.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 flex-1 overflow-y-auto max-h-[500px]">
          {/* TAB 1: TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="text-xs text-brand-gray mb-2">
                Click any curated streetwear template to load it onto your garment:
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SEED_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl.id)}
                    className="group relative border border-canvas-border hover:border-brand-lime rounded-lg overflow-hidden bg-canvas-dark text-left transition-all hover:scale-[1.02]"
                  >
                    <div className="h-24 w-full bg-cover bg-center overflow-hidden" style={{ backgroundImage: `url(${tmpl.thumbnail})` }}>
                      <div className="w-full h-full bg-black/40 group-hover:bg-black/10 transition-colors" />
                    </div>
                    <div className="p-2.5">
                      <div className="text-xs font-semibold text-white group-hover:text-brand-lime truncate">
                        {tmpl.name}
                      </div>
                      <div className="text-[10px] text-brand-gray uppercase font-mono mt-0.5">
                        {tmpl.category}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: TEXT TOOL */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => handleAddText('NEW STATEMENT', 22)}
                className="w-full py-2.5 px-4 bg-brand-lime hover:bg-brand-lime-hover text-black font-semibold rounded-lg flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Headline Text
              </button>
              <button
                type="button"
                onClick={() => handleAddText('01. TECHNICAL DATA // 2026', 13)}
                className="w-full py-2 px-4 border border-canvas-border hover:border-brand-lime text-white rounded-lg flex items-center justify-center gap-2 text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Subtitle / Technical Text
              </button>

              {/* If an active text element is selected, show its full properties */}
              {selectedElement && selectedElement.type === 'text' ? (
                <div className="p-3 bg-canvas-dark rounded-lg border border-canvas-border space-y-3 mt-4">
                  <div className="text-xs font-mono uppercase text-brand-lime flex items-center justify-between">
                    <span>Edit Selected Text</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteElement(selectedElement.id)}
                      className="text-brand-accent hover:underline text-[11px]"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Text Input */}
                  <div>
                    <label className="text-[11px] text-brand-gray block mb-1">Text Content</label>
                    <textarea
                      value={(selectedElement as TextElement).text}
                      onChange={(e) => handleUpdateElement(selectedElement.id, { text: e.target.value })}
                      className="w-full bg-canvas-card border border-canvas-border rounded p-2 text-xs text-white focus:border-brand-lime outline-none resize-none h-16"
                    />
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="text-[11px] text-brand-gray block mb-1">Typography</label>
                    <select
                      value={(selectedElement as TextElement).fontFamily}
                      onChange={(e) => handleUpdateElement(selectedElement.id, { fontFamily: e.target.value })}
                      className="w-full bg-canvas-card border border-canvas-border rounded p-2 text-xs text-white focus:border-brand-lime outline-none"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Font Size Slider */}
                  <div>
                    <div className="flex justify-between text-[11px] text-brand-gray mb-1">
                      <span>Size</span>
                      <span className="font-mono text-white">{(selectedElement as TextElement).fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={60}
                      value={(selectedElement as TextElement).fontSize}
                      onChange={(e) => handleUpdateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                      className="w-full accent-brand-lime"
                    />
                  </div>

                  {/* Letter Spacing */}
                  <div>
                    <div className="flex justify-between text-[11px] text-brand-gray mb-1">
                      <span>Letter Spacing</span>
                      <span className="font-mono text-white">{(selectedElement as TextElement).letterSpacing}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={12}
                      value={(selectedElement as TextElement).letterSpacing}
                      onChange={(e) => handleUpdateElement(selectedElement.id, { letterSpacing: Number(e.target.value) })}
                      className="w-full accent-brand-lime"
                    />
                  </div>

                  {/* Color Palettes */}
                  <div>
                    <label className="text-[11px] text-brand-gray block mb-1.5">Text Color</label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleUpdateElement(selectedElement.id, { fill: c })}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full border border-white/20 transition-transform ${
                            (selectedElement as TextElement).fill === c ? 'scale-125 ring-2 ring-brand-lime' : ''
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-brand-gray/80 italic p-3 bg-canvas-dark rounded border border-dashed border-canvas-border text-center">
                  Select a text element on the garment canvas to adjust fonts, size, and colors.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GRAPHICS */}
          {activeTab === 'graphics' && (
            <div className="space-y-4">
              <div className="text-xs text-brand-gray mb-2">
                Click any vector motif to place on the active print area:
              </div>
              <div className="grid grid-cols-3 gap-3">
                {GRAPHIC_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleAddGraphic(preset.id)}
                    className="p-3 bg-canvas-dark border border-canvas-border hover:border-brand-lime rounded-lg flex flex-col items-center justify-center gap-2 group transition-all hover:scale-105"
                  >
                    <svg viewBox={preset.viewBox} className="w-10 h-10 drop-shadow">
                      <path d={preset.svgPath} fill={preset.defaultFill} />
                    </svg>
                    <span className="text-[10px] text-brand-gray group-hover:text-white truncate w-full text-center">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Graphic Color Inspector if selected */}
              {selectedElement && selectedElement.type === 'graphic' && (
                <div className="p-3 bg-canvas-dark rounded-lg border border-canvas-border space-y-2 mt-4">
                  <div className="text-xs font-mono uppercase text-brand-lime">Graphic Tint</div>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleUpdateElement(selectedElement.id, { fill: c })}
                        style={{ backgroundColor: c }}
                        className="w-6 h-6 rounded-full border border-white/20"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: UPLOADS */}
          {activeTab === 'uploads' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-canvas-border hover:border-brand-lime rounded-xl p-6 text-center cursor-pointer transition-all bg-canvas-dark hover:bg-brand-lime/[0.02]"
              >
                <Upload className="w-8 h-8 text-brand-lime mx-auto mb-2" />
                <div className="text-xs font-semibold text-white">Upload Custom Artwork</div>
                <div className="text-[11px] text-brand-gray mt-1">PNG, JPEG, WebP, SVG up to 10MB</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              <div className="p-3 bg-canvas-dark rounded-lg border border-canvas-border text-[11px] text-brand-gray space-y-1.5">
                <div className="text-white font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-brand-lime" />
                  Print Quality Tip:
                </div>
                <p>
                  For crisp Direct-to-Garment printing, upload images with transparent backgrounds and at least 1500 × 1500 px.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: LAYERS */}
          {activeTab === 'layers' && (
            <div className="space-y-2">
              <div className="text-xs text-brand-gray mb-2">
                Active view layers ({currentElements.length}):
              </div>
              {currentElements.length === 0 ? (
                <div className="text-xs text-brand-gray italic text-center py-6">
                  No elements on {activeView} view yet. Add text, graphics, or a template!
                </div>
              ) : (
                currentElements.map((el, idx) => (
                  <div
                    key={el.id}
                    onClick={() => setSelectedElementId(el.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      el.id === selectedElementId
                        ? 'border-brand-lime bg-brand-lime/10 text-white'
                        : 'border-canvas-border bg-canvas-dark text-brand-gray hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] text-brand-lime">#{idx + 1}</span>
                      <span className="truncate">{el.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteElement(el.id);
                        }}
                        className="p-1 hover:text-brand-accent transition-colors"
                        title="Delete Layer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* CENTER CANVAS AREA */}
      <div className="flex-1 flex flex-col gap-3">
        {/* Top Control Bar: Front/Back Toggle & Canvas Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-canvas-card border border-canvas-border p-3 rounded-xl shadow-subtle">
          {/* Front / Back Toggle */}
          <div className="flex bg-canvas-dark rounded-lg p-1 border border-canvas-border">
            <button
              type="button"
              onClick={() => {
                setActiveView('front');
                setSelectedElementId(null);
              }}
              className={`py-1.5 px-4 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 ${
                activeView === 'front'
                  ? 'bg-brand-lime text-black shadow-glow'
                  : 'text-brand-gray hover:text-white'
              }`}
            >
              Front View
              {frontElements.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-black/60 inline-block" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('back');
                setSelectedElementId(null);
              }}
              className={`py-1.5 px-4 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 ${
                activeView === 'back'
                  ? 'bg-brand-lime text-black shadow-glow'
                  : 'text-brand-gray hover:text-white'
              }`}
            >
              Back View
              {backElements.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-black/60 inline-block" />
              )}
            </button>
          </div>

          {/* Undo, Redo, Zoom, Clear */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex === 0}
              className="p-2 bg-canvas-dark border border-canvas-border hover:border-brand-lime text-white rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 bg-canvas-dark border border-canvas-border hover:border-brand-lime text-white rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </button>
            <div className="h-5 w-px bg-canvas-border mx-1" />
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              className="p-2 bg-canvas-dark border border-canvas-border hover:border-brand-lime text-white rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
              className="p-2 bg-canvas-dark border border-canvas-border hover:border-brand-lime text-white rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="p-2 bg-canvas-dark border border-canvas-border hover:border-brand-lime text-white rounded-lg transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="h-5 w-px bg-canvas-border mx-1" />
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-brand-gray hover:text-brand-accent transition-colors px-2"
            >
              Clear
            </button>
          </div>
        </div>

        {/* The Interactive Garment Canvas */}
        <StudioCanvas
          category={selectedProduct.category}
          view={activeView}
          garmentColorHex={selectedColor.hex}
          printArea={activePrintArea}
          elements={currentElements}
          selectedElementId={selectedElementId}
          onSelectElement={setSelectedElementId}
          onUpdateElement={handleUpdateElement}
          onDeleteElement={handleDeleteElement}
          zoomLevel={zoomLevel}
        />
      </div>

      {/* RIGHT PANEL: Garment Options & Checkout CTA */}
      <div className="w-full lg:w-[320px] bg-canvas-card border border-canvas-border rounded-xl p-5 flex flex-col justify-between shadow-subtle shrink-0">
        <div className="space-y-5">
          {/* Product Switcher */}
          <div>
            <label className="text-xs font-mono uppercase text-brand-gray block mb-2">
              Select Garment Silhouette
            </label>
            <select
              value={selectedProduct.id}
              onChange={(e) => {
                const prod = allCustomizableProducts.find((p) => p.id === e.target.value);
                if (prod) {
                  setSelectedProduct(prod);
                  setSelectedColor(prod.colors[0]);
                }
              }}
              className="w-full bg-canvas-dark border border-canvas-border rounded-lg p-2.5 text-xs text-white font-medium focus:border-brand-lime outline-none"
            >
              {allCustomizableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatINR(p.basePricePaise)})
                </option>
              ))}
            </select>
          </div>

          {/* Color Palette Selector */}
          <div>
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-mono uppercase text-brand-gray">Garment Color</span>
              <span className="text-white font-semibold">{selectedColor.name}</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {selectedProduct.colors.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  style={{ backgroundColor: c.hex }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    selectedColor.code === c.code
                      ? 'border-brand-lime scale-110 shadow-glow'
                      : 'border-white/20 hover:scale-105'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Size Selector */}
          <div>
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-mono uppercase text-brand-gray">Size</span>
              <span className="text-white font-semibold">{selectedSize}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {selectedProduct.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSize(s)}
                  className={`py-2 text-xs font-mono font-semibold rounded-lg border transition-all ${
                    selectedSize === s
                      ? 'bg-brand-lime text-black border-brand-lime'
                      : 'bg-canvas-dark text-brand-gray border-canvas-border hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Design Specs Summary */}
          <div className="p-3.5 bg-canvas-dark rounded-xl border border-canvas-border space-y-2 text-xs">
            <div className="text-brand-gray font-mono uppercase text-[11px] mb-1">
              Print Specification
            </div>
            <div className="flex justify-between text-brand-gray">
              <span>Garment Base</span>
              <span className="text-white font-mono">{formatINR(selectedProduct.basePricePaise)}</span>
            </div>
            <div className="flex justify-between text-brand-gray">
              <span>Active Print Areas</span>
              <span className="text-white font-mono">
                {activePrintAreaCount === 0 ? 'None' : activePrintAreaCount === 1 ? '1 Area (Front)' : '2 Areas (Front + Back)'}
              </span>
            </div>
            <div className="flex justify-between text-brand-gray">
              <span>Print Customization Fee</span>
              <span className="text-brand-lime font-mono">
                {activePrintAreaCount === 0 ? '₹0' : `+${formatINR(customizationFeePaise)}`}
              </span>
            </div>
            <div className="border-t border-canvas-border pt-2 flex justify-between items-baseline font-semibold">
              <span className="text-white">Estimated Item Total</span>
              <span className="text-base text-brand-lime font-mono">{formatINR(totalItemPaise)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-5">
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full py-3.5 px-4 bg-brand-lime hover:bg-brand-lime-hover text-black font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-glow hover:scale-[1.02]"
          >
            <ShoppingBag className="w-4 h-4" />
            Add Custom Garment to Cart
          </button>
          <button
            type="button"
            onClick={handleSaveDesign}
            className="w-full py-2.5 px-4 bg-canvas-dark hover:bg-canvas-subtle border border-canvas-border text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Bookmark className="w-3.5 h-3.5 text-brand-lime" />
            Save Design for Later
          </button>
        </div>
      </div>
    </div>
  );
}

export type ElementType = 'text' | 'image' | 'graphic' | 'shape';

export interface BaseElement {
  id: string;
  type: ElementType;
  name: string;
  x: number; // percentage (0 - 100) within print area
  y: number; // percentage (0 - 100) within print area
  width: number; // percentage or px
  height: number;
  rotation: number; // degrees 0 - 360
  opacity: number; // 0 - 1
  zIndex: number;
  locked?: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number; // pt or relative scale
  fill: string;
  textAlign: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold' | '600' | '800';
  fontStyle: 'normal' | 'italic';
  letterSpacing: number; // px
  lineHeight: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase';
  stroke?: string;
  strokeWidth?: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  originalWidth: number;
  originalHeight: number;
  isUploaded?: boolean;
  filter?: 'none' | 'grayscale' | 'invert' | 'vintage' | 'duotone';
  resolutionDpi?: number;
}

export interface GraphicElement extends BaseElement {
  type: 'graphic' | 'shape';
  graphicId: string;
  shapeType?: 'star' | 'cross' | 'barcode' | 'badge' | 'circle' | 'rect' | 'flame' | 'lightning' | 'abstract' | 'globe';
  svgPath?: string;
  viewBox?: string;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export type CanvasElement = TextElement | ImageElement | GraphicElement;

export interface DesignDocument {
  id: string;
  schemaVersion: '1.0.0';
  title: string;
  productId: string;
  productName: string;
  garmentColor: string;
  garmentColorHex: string;
  frontElements: CanvasElement[];
  backElements: CanvasElement[];
  frontPreviewUrl?: string; // Data URL or storage URL
  backPreviewUrl?: string;
  activeView: 'front' | 'back';
  createdAt: string;
  updatedAt: string;
  authorId?: string;
  isTemplate?: boolean;
}

export interface DesignTemplate {
  id: string;
  name: string;
  category: 'streetwear' | 'minimalist' | 'typography' | 'retro' | 'abstract' | 'grunge';
  description: string;
  thumbnail: string;
  compatibleProducts: string[];
  frontElements: CanvasElement[];
  backElements?: CanvasElement[];
}

export interface FontOption {
  family: string;
  label: string;
  category: 'sans' | 'serif' | 'display' | 'mono' | 'handwriting';
  googleFont?: string;
}

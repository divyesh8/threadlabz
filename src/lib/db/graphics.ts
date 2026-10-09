export interface GraphicPreset {
  id: string;
  name: string;
  category: 'shapes' | 'streetwear' | 'badges' | 'cyber';
  viewBox: string;
  svgPath: string;
  defaultFill: string;
}

export const GRAPHIC_PRESETS: GraphicPreset[] = [
  {
    id: 'star',
    name: 'Eight-Point Star',
    category: 'shapes',
    viewBox: '0 0 100 100',
    svgPath: 'M50 0 L62 38 L100 50 L62 62 L50 100 L38 62 L0 50 L38 38 Z',
    defaultFill: '#CCFF00',
  },
  {
    id: 'cross',
    name: 'Brutalist Cross',
    category: 'shapes',
    viewBox: '0 0 100 100',
    svgPath: 'M35 0 H65 V35 H100 V65 H65 V100 H35 V65 H0 V35 H35 Z',
    defaultFill: '#FFFFFF',
  },
  {
    id: 'barcode',
    name: 'Vector Barcode',
    category: 'streetwear',
    viewBox: '0 0 160 80',
    svgPath: 'M5 0 H15 V80 H5 Z M22 0 H26 V80 H22 Z M32 0 H42 V80 H32 Z M48 0 H52 V80 H48 Z M58 0 H64 V80 H58 Z M70 0 H84 V80 H70 Z M90 0 H95 V80 H90 Z M102 0 H112 V80 H102 Z M118 0 H122 V80 H118 Z M128 0 H140 V80 H128 Z M146 0 H155 V80 H146 Z',
    defaultFill: '#FFFFFF',
  },
  {
    id: 'lightning',
    name: 'Bolt of Lightning',
    category: 'streetwear',
    viewBox: '0 0 100 100',
    svgPath: 'M55 0 L15 55 H48 L40 100 L85 45 H52 Z',
    defaultFill: '#CCFF00',
  },
  {
    id: 'flame',
    name: 'Ignition Flame',
    category: 'streetwear',
    viewBox: '0 0 100 100',
    svgPath: 'M50 5 C55 25 70 30 75 48 C80 62 72 85 55 95 C62 80 55 70 48 65 C40 80 32 82 25 75 C18 68 18 52 30 38 C35 32 35 20 50 5 Z',
    defaultFill: '#FF462D',
  },
  {
    id: 'circle',
    name: 'Minimal Ring',
    category: 'shapes',
    viewBox: '0 0 100 100',
    svgPath: 'M50 10 A40 40 0 1 0 50 90 A40 40 0 1 0 50 10 Z M50 20 A30 30 0 1 1 50 80 A30 30 0 1 1 50 20 Z',
    defaultFill: '#CCFF00',
  },
  {
    id: 'globe',
    name: 'Cybernetic Globe',
    category: 'cyber',
    viewBox: '0 0 100 100',
    svgPath: 'M50 5 A45 45 0 1 0 50 95 A45 45 0 1 0 50 5 Z M12 50 H88 M50 5 C62 25 68 38 68 50 C68 62 62 75 50 95 C38 75 32 62 32 50 C32 38 38 25 50 5 Z',
    defaultFill: '#FFFFFF',
  },
  {
    id: 'badge',
    name: 'Hexagonal Shield',
    category: 'badges',
    viewBox: '0 0 100 100',
    svgPath: 'M50 5 L90 28 L90 72 L50 95 L10 72 L10 28 Z',
    defaultFill: '#1E2025',
  },
  {
    id: 'heart_wire',
    name: 'Geometric Heart',
    category: 'shapes',
    viewBox: '0 0 100 100',
    svgPath: 'M50 85 L20 55 C5 40 10 15 35 20 C45 22 48 30 50 35 C52 30 55 22 65 20 C90 15 95 40 80 55 Z',
    defaultFill: '#FF3366',
  },
  {
    id: 'diamond',
    name: 'Prism Diamond',
    category: 'shapes',
    viewBox: '0 0 100 100',
    svgPath: 'M50 5 L95 50 L50 95 L5 50 Z',
    defaultFill: '#CCFF00',
  },
];

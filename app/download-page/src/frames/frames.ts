export type Category = 'all' | 'boda' | 'xv' | 'fiesta' | 'gala' | 'corporativo';
export type Mode = 'strip2' | 'strip3';
export type Decoration = 'botanical' | 'stars' | 'confetti' | 'artdeco' | 'neon' | 'minimal';

export interface FrameColors {
  frame: string;
  accent: string;
  accent2: string;
  sign: string;
  signText: string;
  photoTint: string;
}

export interface FrameConfig {
  id: string;
  name: string;
  subtitle: string;
  category: Exclude<Category, 'all'>;
  colors: FrameColors;
  decoration: Decoration;
  defaultText: string;
}

export const FRAMES: FrameConfig[] = [
  {
    id: 'boda-cream',
    name: 'Boda Clásica',
    subtitle: 'Cream & Gold',
    category: 'boda',
    colors: {
      frame: '#f5ead8',
      accent: '#c9a455',
      accent2: '#7a5c1e',
      sign: '#efdfc0',
      signText: '#6a4c18',
      photoTint: 'rgba(201,164,85,0.09)',
    },
    decoration: 'botanical',
    defaultText: 'Ana & Luis\n14 · Junio · 2026',
  },
  {
    id: 'boda-dark',
    name: 'Boda Oscura',
    subtitle: 'Dark Romantic',
    category: 'boda',
    colors: {
      frame: '#100e08',
      accent: '#c9a455',
      accent2: '#8a6c2a',
      sign: '#1a1508',
      signText: '#c9a455',
      photoTint: 'rgba(201,164,85,0.05)',
    },
    decoration: 'botanical',
    defaultText: 'Sofía & Marco\n2026',
  },
  {
    id: 'xv-blush',
    name: 'XV Años',
    subtitle: 'Blush & Silver',
    category: 'xv',
    colors: {
      frame: '#fce8f2',
      accent: '#c080a0',
      accent2: '#9890b8',
      sign: '#f8d8eb',
      signText: '#7a3860',
      photoTint: 'rgba(192,128,160,0.09)',
    },
    decoration: 'stars',
    defaultText: 'XV Años · Valeria\n2026',
  },
  {
    id: 'fiesta-navy',
    name: 'Fiesta',
    subtitle: 'Navy & Gold',
    category: 'fiesta',
    colors: {
      frame: '#0d1b4b',
      accent: '#f0c040',
      accent2: '#1e88e0',
      sign: '#091230',
      signText: '#f0c040',
      photoTint: 'rgba(240,192,64,0.07)',
    },
    decoration: 'confetti',
    defaultText: "Gary's Festa\nPunshis & Punchis",
  },
  {
    id: 'fiesta-neon',
    name: 'Neon Night',
    subtitle: 'Dark & Electric',
    category: 'fiesta',
    colors: {
      frame: '#040412',
      accent: '#00ffe0',
      accent2: '#ff2dff',
      sign: '#07072a',
      signText: '#00ffe0',
      photoTint: 'rgba(0,255,224,0.04)',
    },
    decoration: 'neon',
    defaultText: 'Happy Birthday · Leo\nFiesta 30',
  },
  {
    id: 'gala-blacktie',
    name: 'Gala',
    subtitle: 'Black Tie Gold',
    category: 'gala',
    colors: {
      frame: '#080808',
      accent: '#c8960c',
      accent2: '#906c08',
      sign: '#0e0e06',
      signText: '#c9a455',
      photoTint: 'rgba(200,150,12,0.05)',
    },
    decoration: 'artdeco',
    defaultText: 'Gala 2026\nNoche de Premios',
  },
  {
    id: 'corp-navy',
    name: 'Corporativo',
    subtitle: 'Navy Minimal',
    category: 'corporativo',
    colors: {
      frame: '#f8f9fc',
      accent: '#1a3a6b',
      accent2: '#3a6abf',
      sign: '#edf0f8',
      signText: '#1a3a6b',
      photoTint: 'rgba(26,58,107,0.05)',
    },
    decoration: 'minimal',
    defaultText: 'Summit 2026\nAcme Corp · Kickoff',
  },
];

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'boda', label: 'Bodas' },
  { id: 'xv', label: 'XV Años' },
  { id: 'fiesta', label: 'Fiestas' },
  { id: 'gala', label: 'Gala' },
  { id: 'corporativo', label: 'Corporativo' },
];

export const CATEGORY_META: Record<string, { color: string; bg: string; label: string }> = {
  boda:        { color: '#c9a455', bg: 'rgba(201,164,85,0.12)',  label: 'Boda' },
  xv:          { color: '#c080a0', bg: 'rgba(192,128,160,0.12)', label: 'XV Años' },
  fiesta:      { color: '#5090e8', bg: 'rgba(80,144,232,0.12)',  label: 'Fiesta' },
  gala:        { color: '#c8960c', bg: 'rgba(200,150,12,0.12)',  label: 'Gala' },
  corporativo: { color: '#4070c0', bg: 'rgba(64,112,192,0.12)',  label: 'Corporativo' },
};

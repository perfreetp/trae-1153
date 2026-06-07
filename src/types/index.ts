export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'archived';
}

export interface Material {
  id: string;
  projectId: string;
  type: 'photo' | 'text';
  content: string;
  thumbnail?: string;
  extractedIngredients: string[];
  createdAt: string;
}

export interface RecipeStep {
  id: string;
  order: number;
  name: string;
  description: string;
  heatLevel: 'low' | 'medium' | 'high' | 'very_high';
  durationMinutes: number;
  ingredientRefs: string[];
  notes: string;
  isKeyNode: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  category: string;
}

export interface RecipeVersion {
  id: string;
  projectId: string;
  versionNumber: number;
  name: string;
  steps: RecipeStep[];
  ingredients: Ingredient[];
  locked: boolean;
  createdAt: string;
}

export interface Trial {
  id: string;
  projectId: string;
  recipeVersionId: string;
  round: number;
  trialDate: string;
  parameters: Record<string, string>;
  result: 'success' | 'fail' | 'partial';
  failReason: string;
  photos: string[];
  notes: string;
}

export interface ReviewScore {
  appearance: number;
  aroma: number;
  taste: number;
  texture: number;
  fidelity: number;
}

export interface Review {
  id: string;
  projectId: string;
  recipeVersionId: string;
  reviewerName: string;
  scores: ReviewScore;
  totalScore: number;
  comments: string;
  reviewedAt: string;
  scored: boolean;
}

export interface ArchiveDoc {
  id: string;
  name: string;
  type: 'authorization' | 'proof' | 'other';
  content: string;
  uploadedAt: string;
}

export interface Archive {
  id: string;
  projectId: string;
  documents: ArchiveDoc[];
  lectureExported: boolean;
  archivedAt: string;
}

export type HeatLevel = RecipeStep['heatLevel'];

export const HEAT_LABELS: Record<HeatLevel, string> = {
  low: '小火',
  medium: '中火',
  high: '大火',
  very_high: '猛火',
};

export const HEAT_COLORS: Record<HeatLevel, string> = {
  low: '#2d6a4f',
  medium: '#b8860b',
  high: '#c0392b',
  very_high: '#e74c3c',
};

export const FAIL_REASONS = [
  '火候过猛',
  '火候不足',
  '配比失衡',
  '工序颠倒',
  '食材不纯',
  '时间过长',
  '时间不足',
  '调味偏差',
  '其他',
] as const;

export const INGREDIENT_CATEGORIES = [
  '肉类',
  '禽类',
  '水产',
  '蔬菜',
  '菌菇',
  '豆制品',
  '谷物',
  '调味料',
  '香料',
  '油脂',
  '其他',
] as const;

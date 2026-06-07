import { create } from 'zustand';
import type { Project, RecipeVersion, RecipeStep, Ingredient, Trial, Review, Material, Archive } from '@/types';
import { getAllProjects, saveProject, deleteProject as dbDeleteProject, getRecipeVersions, saveRecipeVersion, getTrials, saveTrial, getReviews, saveReview, getMaterials, saveMaterial, deleteMaterial as dbDeleteMaterial, getArchive, saveArchive } from '@/lib/database';

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  currentVersion: RecipeVersion | null;
  materials: Material[];
  recipeVersions: RecipeVersion[];
  trials: Trial[];
  reviews: Review[];
  archive: Archive | null;
  loading: boolean;

  loadProjects: () => Promise<void>;
  createProject: (name: string, description: string) => Promise<Project>;
  selectProject: (id: string) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  loadMaterials: () => Promise<void>;
  addMaterial: (material: Material) => Promise<void>;
  removeMaterial: (id: string) => Promise<void>;

  loadRecipeVersions: () => Promise<void>;
  selectVersion: (id: string) => void;
  createVersion: (base?: RecipeVersion) => Promise<RecipeVersion>;
  saveCurrentVersion: () => Promise<void>;
  updateSteps: (steps: RecipeStep[]) => void;
  updateIngredients: (ingredients: Ingredient[]) => void;
  lockVersion: () => Promise<void>;

  loadTrials: () => Promise<void>;
  addTrial: (trial: Trial) => Promise<void>;
  updateTrial: (trial: Trial) => Promise<void>;

  loadReviews: () => Promise<void>;
  addReview: (review: Review) => Promise<void>;
  updateReview: (review: Review) => Promise<void>;

  loadArchive: () => Promise<void>;
  saveArchiveData: (archive: Archive) => Promise<void>;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,
  currentVersion: null,
  materials: [],
  recipeVersions: [],
  trials: [],
  reviews: [],
  archive: null,
  loading: false,

  loadProjects: async () => {
    set({ loading: true });
    const projects = await getAllProjects();
    set({ projects, loading: false });
  },

  createProject: async (name, description) => {
    const project: Project = {
      id: generateId(),
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
    };
    await saveProject(project);
    const version: RecipeVersion = {
      id: generateId(),
      projectId: project.id,
      versionNumber: 1,
      name: `${name} - 第一版`,
      steps: [],
      ingredients: [],
      locked: false,
      createdAt: new Date().toISOString(),
    };
    await saveRecipeVersion(version);
    set(state => ({ projects: [...state.projects, project] }));
    return project;
  },

  selectProject: async (id) => {
    set({ loading: true });
    const projects = await getAllProjects();
    const project = projects.find(p => p.id === id) || null;
    set({ currentProject: project });

    if (project) {
      const [materials, versions, trials, reviews] = await Promise.all([
        getMaterials(project.id),
        getRecipeVersions(project.id),
        getTrials(project.id),
        getReviews(project.id),
      ]);
      const archive = await getArchive(project.id);
      const latestVersion = versions.sort((a, b) => b.versionNumber - a.versionNumber)[0] || null;
      set({
        materials,
        recipeVersions: versions,
        currentVersion: latestVersion,
        trials,
        reviews,
        archive: archive || null,
        loading: false,
      });
    } else {
      set({ loading: false });
    }
  },

  updateProject: async (project) => {
    await saveProject(project);
    set(state => ({
      projects: state.projects.map(p => p.id === project.id ? project : p),
      currentProject: project,
    }));
  },

  deleteProject: async (id) => {
    await dbDeleteProject(id);
    set(state => ({
      projects: state.projects.filter(p => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }));
  },

  loadMaterials: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const materials = await getMaterials(currentProject.id);
    set({ materials });
  },

  addMaterial: async (material) => {
    await saveMaterial(material);
    set(state => ({ materials: [...state.materials, material] }));
  },

  removeMaterial: async (id) => {
    await dbDeleteMaterial(id);
    set(state => ({ materials: state.materials.filter(m => m.id !== id) }));
  },

  loadRecipeVersions: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const versions = await getRecipeVersions(currentProject.id);
    set({ recipeVersions: versions });
  },

  selectVersion: (id) => {
    const { recipeVersions } = get();
    const version = recipeVersions.find(v => v.id === id) || null;
    set({ currentVersion: version });
  },

  createVersion: async (base) => {
    const { currentProject, recipeVersions } = get();
    if (!currentProject) throw new Error('No project selected');
    const maxVersion = Math.max(...recipeVersions.map(v => v.versionNumber), 0);
    const newVersion: RecipeVersion = {
      id: generateId(),
      projectId: currentProject.id,
      versionNumber: maxVersion + 1,
      name: `${currentProject.name} - 第${maxVersion + 1}版`,
      steps: base ? [...base.steps] : [],
      ingredients: base ? [...base.ingredients] : [],
      locked: false,
      createdAt: new Date().toISOString(),
    };
    await saveRecipeVersion(newVersion);
    set(state => ({
      recipeVersions: [...state.recipeVersions, newVersion],
      currentVersion: newVersion,
    }));
    return newVersion;
  },

  saveCurrentVersion: async () => {
    const { currentVersion } = get();
    if (!currentVersion) return;
    await saveRecipeVersion(currentVersion);
  },

  updateSteps: (steps) => {
    const { currentVersion } = get();
    if (!currentVersion || currentVersion.locked) return;
    set({ currentVersion: { ...currentVersion, steps } });
  },

  updateIngredients: (ingredients) => {
    const { currentVersion } = get();
    if (!currentVersion || currentVersion.locked) return;
    set({ currentVersion: { ...currentVersion, ingredients } });
  },

  lockVersion: async () => {
    const { currentVersion } = get();
    if (!currentVersion) return;
    const locked = { ...currentVersion, locked: true };
    await saveRecipeVersion(locked);
    set(state => ({
      currentVersion: locked,
      recipeVersions: state.recipeVersions.map(v => v.id === locked.id ? locked : v),
    }));
  },

  loadTrials: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const trials = await getTrials(currentProject.id);
    set({ trials });
  },

  addTrial: async (trial) => {
    await saveTrial(trial);
    set(state => ({ trials: [...state.trials, trial] }));
  },

  updateTrial: async (trial) => {
    await saveTrial(trial);
    set(state => ({ trials: state.trials.map(t => t.id === trial.id ? trial : t) }));
  },

  loadReviews: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const reviews = await getReviews(currentProject.id);
    set({ reviews });
  },

  addReview: async (review) => {
    await saveReview(review);
    set(state => ({ reviews: [...state.reviews, review] }));
  },

  updateReview: async (review) => {
    await saveReview(review);
    set(state => ({ reviews: state.reviews.map(r => r.id === review.id ? review : r) }));
  },

  loadArchive: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const archive = await getArchive(currentProject.id);
    set({ archive: archive || null });
  },

  saveArchiveData: async (archive) => {
    await saveArchive(archive);
    set({ archive });
  },
}));

interface UIStore {
  sidebarCollapsed: boolean;
  activeModal: string | null;
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
  toggleSidebar: () => void;
  openModal: (name: string) => void;
  closeModal: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  activeModal: null,
  toasts: [],

  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),

  addToast: (message, type = 'info') => {
    const id = generateId();
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 3000);
  },

  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));

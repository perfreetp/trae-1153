import { openDB, IDBPDatabase } from 'idb';
import type { Project, Material, RecipeVersion, Trial, Review, Archive } from '@/types';

const DB_NAME = 'lost-recipe-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('materials')) {
          const store = db.createObjectStore('materials', { keyPath: 'id' });
          store.createIndex('projectId', 'projectId');
        }
        if (!db.objectStoreNames.contains('recipeVersions')) {
          const store = db.createObjectStore('recipeVersions', { keyPath: 'id' });
          store.createIndex('projectId', 'projectId');
        }
        if (!db.objectStoreNames.contains('trials')) {
          const store = db.createObjectStore('trials', { keyPath: 'id' });
          store.createIndex('projectId', 'projectId');
          store.createIndex('recipeVersionId', 'recipeVersionId');
        }
        if (!db.objectStoreNames.contains('reviews')) {
          const store = db.createObjectStore('reviews', { keyPath: 'id' });
          store.createIndex('projectId', 'projectId');
        }
        if (!db.objectStoreNames.contains('archives')) {
          const store = db.createObjectStore('archives', { keyPath: 'id' });
          store.createIndex('projectId', 'projectId');
        }
      },
    });
  }
  return dbPromise;
}

export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return db.getAll(storeName);
}

export async function dbGet<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get(storeName, id);
}

export async function dbGetByIndex<T>(storeName: string, indexName: string, value: string): Promise<T[]> {
  const db = await getDB();
  return db.getAllFromIndex(storeName, indexName, value);
}

export async function dbPut<T>(storeName: string, item: T): Promise<string> {
  const db = await getDB();
  return db.put(storeName, item) as Promise<string>;
}

export async function dbDelete(storeName: string, id: string): Promise<void> {
  const db = await getDB();
  return db.delete(storeName, id);
}

export async function dbClear(storeName: string): Promise<void> {
  const db = await getDB();
  return db.clear(storeName);
}

export async function getAllProjects(): Promise<Project[]> {
  return dbGetAll<Project>('projects');
}

export async function getProject(id: string): Promise<Project | undefined> {
  return dbGet<Project>('projects', id);
}

export async function saveProject(project: Project): Promise<string> {
  return dbPut('projects', { ...project, updatedAt: new Date().toISOString() });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['projects', 'materials', 'recipeVersions', 'trials', 'reviews', 'archives'], 'readwrite');
  await Promise.all([
    tx.objectStore('projects').delete(id),
    ...await tx.objectStore('materials').index('projectId').getAllKeys(id).then(keys => keys.map(k => tx.objectStore('materials').delete(k))),
    ...await tx.objectStore('recipeVersions').index('projectId').getAllKeys(id).then(keys => keys.map(k => tx.objectStore('recipeVersions').delete(k))),
    ...await tx.objectStore('trials').index('projectId').getAllKeys(id).then(keys => keys.map(k => tx.objectStore('trials').delete(k))),
    ...await tx.objectStore('reviews').index('projectId').getAllKeys(id).then(keys => keys.map(k => tx.objectStore('reviews').delete(k))),
    ...await tx.objectStore('archives').index('projectId').getAllKeys(id).then(keys => keys.map(k => tx.objectStore('archives').delete(k))),
    tx.done,
  ]);
}

export async function getMaterials(projectId: string): Promise<Material[]> {
  return dbGetByIndex<Material>('materials', 'projectId', projectId);
}

export async function saveMaterial(material: Material): Promise<string> {
  return dbPut('materials', material);
}

export async function deleteMaterial(id: string): Promise<void> {
  return dbDelete('materials', id);
}

export async function getRecipeVersions(projectId: string): Promise<RecipeVersion[]> {
  return dbGetByIndex<RecipeVersion>('recipeVersions', 'projectId', projectId);
}

export async function saveRecipeVersion(version: RecipeVersion): Promise<string> {
  return dbPut('recipeVersions', version);
}

export async function getTrials(projectId: string): Promise<Trial[]> {
  return dbGetByIndex<Trial>('trials', 'projectId', projectId);
}

export async function saveTrial(trial: Trial): Promise<string> {
  return dbPut('trials', trial);
}

export async function getReviews(projectId: string): Promise<Review[]> {
  return dbGetByIndex<Review>('reviews', 'projectId', projectId);
}

export async function saveReview(review: Review): Promise<string> {
  return dbPut('reviews', review);
}

export async function getArchive(projectId: string): Promise<Archive | undefined> {
  const list = await dbGetByIndex<Archive>('archives', 'projectId', projectId);
  return list[0];
}

export async function saveArchive(archive: Archive): Promise<string> {
  return dbPut('archives', archive);
}

import { recipeSchema, type Recipe, type RecipeData } from "./recipe";

const KEY = "squished:recipes";

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

/** Strip ids and display-only fields; this is all a link or saved recipe carries. */
export const recipeData = (r: RecipeData): RecipeData => recipeSchema.parse(r);

export function loadRecipes(): Recipe[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(list)) return [];
    return list.flatMap((r) => {
      const parsed = recipeSchema.safeParse(r);
      return parsed.success && typeof r.id === "string" ? [{ ...parsed.data, id: r.id }] : [];
    });
  } catch {
    return [];
  }
}

function write(list: Recipe[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage blocked: recipe still works this session */ }
}

export function saveRecipe(data: RecipeData, id = newId()): { list: Recipe[]; recipe: Recipe } {
  const recipe: Recipe = { ...recipeData(data), id };
  const list = [recipe, ...loadRecipes().filter((r) => r.id !== id)].slice(0, 50);
  write(list);
  return { list, recipe };
}

export function deleteRecipe(id: string): Recipe[] {
  const list = loadRecipes().filter((r) => r.id !== id);
  write(list);
  return list;
}

const toB64Url = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromB64Url = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

/** Share link. The recipe sits in the #fragment, which browsers never send to the server. */
export const recipeLink = (r: RecipeData) => `${window.location.origin}/#recipe=${toB64Url(JSON.stringify(recipeData(r)))}`;

/** Recipe from the current URL's #recipe= fragment, or null if missing or invalid. */
export function recipeFromHash(hash: string): RecipeData | null {
  const m = /[#&]recipe=([A-Za-z0-9_-]+)/.exec(hash);
  if (!m || m[1].length > 8000) return null;
  try {
    const parsed = recipeSchema.safeParse(JSON.parse(fromB64Url(m[1])));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

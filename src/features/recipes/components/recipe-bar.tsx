import { useEffect, useState } from "react";
import { BookmarkPlus, ExternalLink, FlaskConical, Link2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQueue } from "@/store/queue";
import { describeRecipe, SPEC_PACKS, type Recipe, type RecipeData } from "../api/recipe";
import { deleteRecipe, loadRecipes, recipeFromHash, recipeLink, saveRecipe } from "../api/recipe-storage";
import { RecipeDialog } from "./recipe-dialog";
import { SyncNote } from "@/features/account-sync/components/sync-note";
import { onSynced } from "@/features/account-sync/api/local-change";

/** Pick a recipe (spec pack or your own) so every dropped file gets its settings. */
export function RecipeBar() {
  const recipe = useQueue((s) => s.recipe);
  const setRecipe = useQueue((s) => s.setRecipe);
  const [mine, setMine] = useState<Recipe[]>([]);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fromLink, setFromLink] = useState(false);

  useEffect(() => onSynced(() => setMine(loadRecipes())), []);

  useEffect(() => {
    setMine(loadRecipes());
    const shared = recipeFromHash(window.location.hash);
    if (!shared) return;
    setRecipe({ ...shared, id: "link" });
    setFromLink(true);
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [setRecipe]);

  const all = [...SPEC_PACKS, ...mine];
  const choose = (v: string) => {
    if (v === "new") { setEditing(null); setDialogOpen(true); return; }
    setFromLink(false);
    setRecipe(v === "none" ? null : all.find((r) => r.id === v) ?? null);
  };

  const onSave = (data: RecipeData, id?: string) => {
    const { list, recipe: saved } = saveRecipe(data, id);
    setMine(list); setRecipe(saved); setFromLink(false); setDialogOpen(false);
    toast.success(`Recipe saved: ${saved.name}`);
  };

  const share = async () => {
    if (!recipe) return;
    const link = recipeLink(recipe);
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied. Anyone who opens it gets these settings.");
    } catch {
      window.prompt("Copy this link:", link);
    }
  };

  const remove = () => {
    if (!recipe) return;
    setMine(deleteRecipe(recipe.id)); setRecipe(null);
  };

  const value = recipe ? (recipe.id === "link" ? "link" : recipe.id) : "none";

  return (
    <div className="mx-auto mb-3 max-w-xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <FlaskConical className="size-3.5" /> Recipe
        </span>
        <Select value={value} onValueChange={choose}>
          <SelectTrigger aria-label="Recipe" className="h-8 w-[230px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No recipe</SelectItem>
            {recipe?.id === "link" && <SelectItem value="link">{recipe.name} (shared)</SelectItem>}
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Platform packs</SelectLabel>
              {SPEC_PACKS.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectGroup>
            {mine.length > 0 && (
              <SelectGroup>
                <SelectLabel>My recipes</SelectLabel>
                {mine.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectGroup>
            )}
            <SelectSeparator />
            <SelectItem value="new">New recipe…</SelectItem>
          </SelectContent>
        </Select>
        {recipe && (
          <>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => void share()}><Link2 className="size-3.5" />Share</Button>
            {fromLink ? (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onSave(recipe)}><BookmarkPlus className="size-3.5" />Save</Button>
            ) : (
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => { setEditing(recipe); setDialogOpen(true); }}>
                <Pencil className="size-3.5" />{recipe.builtIn ? "Customize" : "Edit"}
              </Button>
            )}
            {!recipe.builtIn && !fromLink && (
              <Button variant="ghost" size="icon" className="size-8" onClick={remove} aria-label="Delete recipe"><Trash2 className="size-3.5" /></Button>
            )}
          </>
        )}
      </div>
      {recipe && (
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          {fromLink && "From a shared link. "}
          {describeRecipe(recipe) || "No changes"}
          {recipe.note && <> · {recipe.note}</>}
          {recipe.source && (
            <a href={recipe.source} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 underline-offset-2 hover:underline">
              Source<ExternalLink className="size-3" />
            </a>
          )}
        </p>
      )}
      <SyncNote />
      <RecipeDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSave={onSave} />
    </div>
  );
}

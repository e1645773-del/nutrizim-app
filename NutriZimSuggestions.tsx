import { useMemo, useState } from 'react';
import { Check, ChefHat, ChevronDown, ChevronUp, Clock, Plus, Sparkles } from 'lucide-react';
import { addFoodLogsBatch, type FoodLogEntry } from '../lib/firebase';
import { computeRecipeSuggestionMatches, type RankedRecipeSuggestion } from '../lib/suggestions';

interface NutriZimSuggestionsProps {
  uid: string;
  dateKey: string;
  totals: { kcal: number; protein: number; carbs: number; fat: number; fibre: number };
  targets: {
    targetKcal: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
    targetFibre: number;
  };
}

export function NutriZimSuggestions({
  uid,
  dateKey,
  totals,
  targets,
}: NutriZimSuggestionsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [loggedRecipeId, setLoggedRecipeId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const remaining = useMemo(
    () => ({
      kcal: Math.round(targets.targetKcal - totals.kcal),
      protein: Math.round((targets.targetProtein - totals.protein) * 10) / 10,
      carbs: Math.round((targets.targetCarbs - totals.carbs) * 10) / 10,
      fat: Math.round((targets.targetFat - totals.fat) * 10) / 10,
    }),
    [targets, totals]
  );

  const topSuggestions = useMemo(
    () => computeRecipeSuggestionMatches(remaining).slice(0, 3),
    [remaining]
  );

  const handleLogRecipe = async (suggestion: RankedRecipeSuggestion) => {
    setLoggingId(suggestion.recipe.id);
    setErrorMsg(null);
    try {
      const mealGroup: FoodLogEntry['mealGroup'] = suggestion.recipe.mealSlot;
      await addFoodLogsBatch(
        uid,
        suggestion.ingredients.map((ing) => ({
          dateKey,
          mealGroup,
          foodId: ing.item.id,
          foodName: ing.item.food,
          unit: ing.item.unit,
          portionAmount: ing.portionAmount,
          kcalPer100: ing.item.kcal,
          proteinPer100: ing.item.protein,
          carbsPer100: ing.item.carbs,
          fatPer100: ing.item.fat,
          fibrePer100: ing.item.fibre,
          vitamins: ing.item.vitamins,
          source: 'manual',
        }))
      );
      setLoggedRecipeId(suggestion.recipe.id);
      setTimeout(() => {
        setLoggedRecipeId((curr) => (curr === suggestion.recipe.id ? null : curr));
      }, 2800);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to log recipe ingredients.');
    } finally {
      setLoggingId(null);
    }
  };

  return (
    <section
      aria-label="NutriZim authentic recipe suggestions tailored to remaining macros"
      className="rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#121C17] p-5 space-y-5"
    >
      {/* Header + Live Remaining Macro Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#135D3B]/10 dark:border-white/10 pb-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-full bg-[#135D3B] text-[#E5B84B] flex items-center justify-center shrink-0">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#B7791F] dark:text-[#E5B84B]">
              Smart Zimbabwean Meal Pairing
            </p>
            <h3 className="font-display text-2xl sm:text-3xl font-black uppercase text-[#135D3B] dark:text-[#EDF4EF]">
              NutriZim Suggestions
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums">
          <span className="rounded-full bg-[#FAF4EA] dark:bg-[#18251E] border border-[#135D3B]/15 dark:border-white/10 px-3 py-1.5 text-[#112018] dark:text-white">
            Remaining:{' '}
            <strong className="text-[#135D3B] dark:text-[#E5B84B]">
              {Math.max(0, remaining.kcal)} kcal
            </strong>
          </span>
          <span className="rounded-full bg-[#D8EADB] dark:bg-[#162C21] px-3 py-1.5 font-semibold text-[#135D3B] dark:text-[#5EE39D]">
            {Math.max(0, remaining.protein)}g P left
          </span>
          <span className="rounded-full bg-[#F2DFAA] dark:bg-[#2F2512] px-3 py-1.5 font-semibold text-[#8F6008] dark:text-[#E5B84B]">
            {Math.max(0, remaining.carbs)}g C left
          </span>
          <span className="rounded-full bg-[#F2E9D8] dark:bg-[#18251E] px-3 py-1.5 font-semibold text-[#385043] dark:text-slate-300">
            {Math.max(0, remaining.fat)}g F left
          </span>
        </div>
      </div>

      {errorMsg && <p className="text-xs font-medium text-rose-500">{errorMsg}</p>}

      {/* Top 3 Ranked Authentic Recipes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {topSuggestions.map((entry, idx) => {
          const { recipe, ingredients, totals: rTotals, fitReason } = entry;
          const isExpanded = expandedId === recipe.id;
          const isLogging = loggingId === recipe.id;
          const isJustLogged = loggedRecipeId === recipe.id;

          return (
            <div
              key={recipe.id}
              className="rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-[#FAF4EA] dark:bg-[#18251E] p-4 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#135D3B] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#E5B84B]">
                    <Sparkles className="w-3 h-3" />
                    {idx === 0 ? 'Best Match' : recipe.mealSlot}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#587264] dark:text-slate-400">
                    <Clock className="w-3 h-3" />
                    {recipe.prepMinutes}m
                  </span>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-[#B7791F] dark:text-[#E5B84B]">
                    {recipe.shonaSubtitle}
                  </p>
                  <h4 className="font-display text-xl font-black uppercase leading-tight text-[#112018] dark:text-white mt-0.5">
                    {recipe.title}
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#385043] dark:text-slate-300">
                    {recipe.description}
                  </p>
                </div>

                {/* Fit Rationale */}
                <div className="rounded-xl bg-[#D8EADB]/70 dark:bg-[#121C17] border border-[#135D3B]/15 dark:border-white/10 px-3 py-2 text-xs font-medium text-[#135D3B] dark:text-[#5EE39D]">
                  {fitReason}
                </div>

                {/* Recipe Totals */}
                <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-white dark:bg-[#121C17] p-2.5 font-mono text-[11px] tabular-nums border border-[#135D3B]/10 dark:border-white/5 text-center">
                  <div>
                    <span className="block text-[10px] text-[#587264] dark:text-slate-400">Kcal</span>
                    <strong className="text-[#112018] dark:text-white">{rTotals.kcal}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#587264] dark:text-slate-400">Prot</span>
                    <strong className="text-[#135D3B] dark:text-[#5EE39D]">{rTotals.protein}g</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#587264] dark:text-slate-400">Carb</span>
                    <strong className="text-[#B7791F] dark:text-[#E5B84B]">{rTotals.carbs}g</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#587264] dark:text-slate-400">Fat</span>
                    <strong className="text-[#385043] dark:text-slate-200">{rTotals.fat}g</strong>
                  </div>
                </div>

                {/* Expandable Ingredients & Prep Steps */}
                {isExpanded && (
                  <div className="space-y-3 border-t border-[#135D3B]/15 dark:border-white/10 pt-3 text-xs">
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[10px] text-[#135D3B] dark:text-[#E5B84B] mb-1.5">
                        100g/ml Standardized Ingredients
                      </p>
                      <ul className="space-y-1 font-mono text-[11px] text-[#385043] dark:text-slate-300 tabular-nums">
                        {ingredients.map((ing) => (
                          <li key={ing.item.id} className="flex justify-between gap-2">
                            <span className="font-sans">
                              {ing.item.food} ({ing.portionAmount}
                              {ing.item.unit})
                            </span>
                            <span>{ing.scaledKcal} kcal</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="font-bold uppercase tracking-wider text-[10px] text-[#135D3B] dark:text-[#E5B84B] mb-1">
                        Preparation
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-[#385043] dark:text-slate-300">
                        {recipe.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleLogRecipe(entry)}
                  disabled={isLogging}
                  className={`flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                    isJustLogged
                      ? 'bg-[#1E7A4C] text-white'
                      : 'bg-[#135D3B] text-white hover:bg-[#0E482D]'
                  } disabled:opacity-60`}
                >
                  {isJustLogged ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#E5B84B]" />
                      Logged to {recipe.mealSlot}
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-[#E5B84B]" />
                      {isLogging ? 'Logging...' : `Log ${recipe.mealSlot}`}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
                  className="min-h-[40px] inline-flex items-center gap-1 rounded-full border border-[#135D3B]/20 dark:border-white/15 bg-white dark:bg-[#121C17] px-3 py-2 text-xs font-semibold text-[#135D3B] dark:text-[#E5B84B] hover:border-[#D99B26] transition-colors whitespace-nowrap"
                >
                  {isExpanded ? (
                    <>
                      Hide <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      Recipe <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

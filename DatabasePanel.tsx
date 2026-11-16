import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import {
  FOOD_CATEGORIES,
  scaleNutrition,
  ZIMBABWE_FOOD_DB,
  type FoodCategory,
  type FoodItem,
} from '../data/zimbabweFoodDb';
import { addFoodLogsBatch, type FoodLogEntry } from '../lib/firebase';

interface DatabasePanelProps {
  uid: string;
  dateKey: string;
  onLogged: () => void;
}

export function DatabasePanel({ uid, dateKey, onLogged }: DatabasePanelProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | FoodCategory>('All');
  const [selectedFood, setSelectedFood] = useState<FoodItem>(ZIMBABWE_FOOD_DB[0]);
  const [portion, setPortion] = useState(200);
  const [mealGroup, setMealGroup] = useState<FoodLogEntry['mealGroup']>('Lunch');
  const [logging, setLogging] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ZIMBABWE_FOOD_DB.filter((item) => {
      const catOk = category === 'All' || item.category === category;
      if (!catOk) return false;
      if (!q) return true;
      return (
        item.food.toLowerCase().includes(q) ||
        (item.aliases ?? []).some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [query, category]);

  const scaled = scaleNutrition(selectedFood, portion);

  const handleQuickLog = async () => {
    setLogging(true);
    try {
      await addFoodLogsBatch(uid, [
        {
          dateKey,
          mealGroup,
          foodId: selectedFood.id,
          foodName: selectedFood.food,
          unit: selectedFood.unit,
          portionAmount: portion,
          kcalPer100: selectedFood.kcal,
          proteinPer100: selectedFood.protein,
          carbsPer100: selectedFood.carbs,
          fatPer100: selectedFood.fat,
          fibrePer100: selectedFood.fibre,
          vitamins: selectedFood.vitamins,
          source: 'manual',
        },
      ]);
      onLogged();
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#121C17] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-black uppercase text-[#135D3B] dark:text-[#E5B84B]">
            Zimbabwean 100g / 100ml Database
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#587264] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter English, Shona, or Ndebele..."
              className="w-full min-h-[40px] rounded-full border border-[#135D3B]/20 dark:border-white/15 bg-transparent pl-9 pr-4 text-sm text-[#112018] dark:text-white"
            />
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setCategory('All')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
              category === 'All'
                ? 'bg-[#135D3B] text-[#E5B84B]'
                : 'bg-[#F2E9D8] dark:bg-[#18251E] text-[#385043] dark:text-slate-300'
            }`}
          >
            All
          </button>
          {FOOD_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
                category === cat
                  ? 'bg-[#135D3B] text-[#E5B84B]'
                  : 'bg-[#F2E9D8] dark:bg-[#18251E] text-[#385043] dark:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="max-h-[460px] overflow-y-auto divide-y divide-[#135D3B]/10 dark:divide-white/5 border-t border-[#135D3B]/10 dark:border-white/10">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedFood(item)}
              className={`w-full text-left py-3 px-3 flex items-center justify-between gap-4 transition-colors ${
                selectedFood.id === item.id
                  ? 'bg-[#D8EADB]/60 dark:bg-[#162C21]'
                  : 'hover:bg-[#FAF4EA] dark:hover:bg-white/[0.02]'
              }`}
            >
              <div>
                <p className="font-semibold text-sm text-[#112018] dark:text-white">{item.food}</p>
                <p className="text-xs text-[#587264] dark:text-slate-400">
                  {item.category} · Vitamins: {item.vitamins}
                </p>
              </div>
              <div className="text-right font-mono text-xs tabular-nums shrink-0">
                <p className="font-semibold text-[#135D3B] dark:text-[#E5B84B]">
                  {item.kcal} kcal / 100{item.unit}
                </p>
                <p className="text-[#587264] dark:text-slate-400">
                  {item.protein}P · {item.carbs}C · {item.fat}F
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Standardized 100g/100ml Calculator & Logger */}
      <div className="lg:col-span-4 rounded-2xl border border-[#135D3B]/15 dark:border-white/10 bg-white dark:bg-[#121C17] p-5 flex flex-col justify-between space-y-5">
        <div className="space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#B7791F] dark:text-[#E5B84B]">
              {selectedFood.category}
            </span>
            <h3 className="font-display text-3xl font-black uppercase text-[#135D3B] dark:text-white mt-0.5">
              {selectedFood.food}
            </h3>
            <p className="text-xs text-[#587264] dark:text-slate-400 mt-1">
              Key Vitamins: {selectedFood.vitamins}
            </p>
          </div>

          <div className="rounded-xl bg-[#F2E9D8] dark:bg-[#18251E] p-4 font-mono text-xs tabular-nums space-y-2">
            <p className="font-sans font-semibold text-[#135D3B] dark:text-[#E5B84B]">
              Standardized Baseline (per 100{selectedFood.unit})
            </p>
            <div className="grid grid-cols-3 gap-2 text-[#112018] dark:text-slate-200">
              <div>Kcal: {selectedFood.kcal}</div>
              <div>Prot: {selectedFood.protein}g</div>
              <div>Carb: {selectedFood.carbs}g</div>
              <div>Fat: {selectedFood.fat}g</div>
              <div>Fibre: {selectedFood.fibre}g</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[#385043] dark:text-slate-300">Your Portion</span>
              <span className="font-mono font-bold text-[#135D3B] dark:text-[#E5B84B] tabular-nums">
                {portion} {selectedFood.unit}
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={600}
              step={5}
              value={portion}
              onChange={(e) => setPortion(Number(e.target.value))}
              className="w-full accent-[#D99B26]"
            />
            <div className="grid grid-cols-4 gap-1 pt-1">
              {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setMealGroup(g)}
                  className={`py-1.5 rounded-full text-[11px] font-semibold ${
                    mealGroup === g
                      ? 'bg-[#135D3B] text-[#E5B84B]'
                      : 'bg-[#F2E9D8] dark:bg-[#18251E] text-[#385043] dark:text-slate-300'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#135D3B]/25 bg-[#D8EADB] dark:bg-[#162C21] p-4 font-mono text-xs tabular-nums">
            <p className="font-sans font-bold text-[#135D3B] dark:text-[#E5B84B] mb-1">
              Calculated Total ({portion}
              {selectedFood.unit})
            </p>
            <p className="text-lg font-bold text-[#112018] dark:text-white">{scaled.kcal} kcal</p>
            <p className="mt-1 text-[#385043] dark:text-slate-300">
              {scaled.protein}g P · {scaled.carbs}g C · {scaled.fat}g F · {scaled.fibre}g Fibre
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleQuickLog}
          disabled={logging}
          className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-full bg-[#135D3B] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#0E482D] disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4 text-[#E5B84B]" />
          {logging ? 'Logging...' : `Add to ${mealGroup}`}
        </button>
      </div>
    </div>
  );
}

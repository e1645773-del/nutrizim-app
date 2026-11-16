import { ZIMBABWE_FOOD_DB, scaleNutrition, type FoodItem } from '../data/zimbabweFoodDb';

export interface RecipeIngredient {
  foodId: number;
  portionAmount: number;
  prepNote: string;
}

export interface ZimbabweRecipe {
  id: string;
  title: string;
  shonaSubtitle: string;
  mealSlot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  prepMinutes: number;
  tags: string[];
  description: string;
  steps: string[];
  ingredients: RecipeIngredient[];
}

export interface ComputedRecipeIngredient extends RecipeIngredient {
  item: FoodItem;
  scaledKcal: number;
  scaledProtein: number;
  scaledCarbs: number;
  scaledFat: number;
  scaledFibre: number;
}

export interface RankedRecipeSuggestion {
  recipe: ZimbabweRecipe;
  ingredients: ComputedRecipeIngredient[];
  totals: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    fibre: number;
  };
  fitScore: number;
  fitReason: string;
}

const FOOD_BY_ID = new Map<number, FoodItem>(ZIMBABWE_FOOD_DB.map((item) => [item.id, item]));

export const AUTHENTIC_ZIMBABWE_RECIPES: ZimbabweRecipe[] = [
  {
    id: 'kapenta-covo-bowl',
    title: 'Crispy Matemba & Sautéed Covo Plate',
    shonaSubtitle: 'Matemba nemuriwo wecovo',
    mealSlot: 'Dinner',
    prepMinutes: 15,
    tags: ['High Protein', 'Low Carb', 'Iron & B12'],
    description:
      'Nutrient-dense Lake Kariba kapenta simmered lightly with diced tomato-onion relish and tender covo greens—ideal for closing protein gaps without excess calories.',
    steps: [
      'Rinse dried kapenta briefly and toast dry in a hot pan for 3 minutes until crisp.',
      'Fold in chopped onion and tomato relish, simmering gently for 5 minutes.',
      'Steam sliced covo greens separately with a pinch of salt for 4 minutes and plate together.',
    ],
    ingredients: [
      { foodId: 85, portionAmount: 130, prepNote: 'Pan-simmered kapenta' },
      { foodId: 91, portionAmount: 150, prepNote: 'Steamed covo ribbons' },
      { foodId: 104, portionAmount: 80, prepNote: 'Fresh tomato-onion relish' },
    ],
  },
  {
    id: 'rapoko-chicken-dovi',
    title: 'Roadrunner Chicken Dovi & Sadza Rezviyo',
    shonaSubtitle: 'Sadza rezviyo nehuku yedovi',
    mealSlot: 'Dinner',
    prepMinutes: 30,
    tags: ['Balanced Energy', 'Whole Grain', 'Recovery'],
    description:
      'Slow-simmered chicken folded into rich roasted groundnut dovi sauce paired with high-fibre finger millet sadza and pumpkin leaves.',
    steps: [
      'Simmer browned chicken pieces with onions and tomatoes for 15 minutes.',
      'Whisk smooth peanut butter into warm broth until creamy and coat chicken gently.',
      'Prepare firm rapoko sadza and serve alongside lightly steamed muboora greens.',
    ],
    ingredients: [
      { foodId: 3, portionAmount: 220, prepNote: 'Firm rapoko sadza mound' },
      { foodId: 122, portionAmount: 180, prepNote: 'Creamy chicken dovi' },
      { foodId: 97, portionAmount: 120, prepNote: 'Steamed muboora greens' },
    ],
  },
  {
    id: 'grilled-bream-salad',
    title: 'Chargrilled Kariba Bream, Avocado & Greens',
    shonaSubtitle: 'Hove yakagochwa nekotapeya',
    mealSlot: 'Lunch',
    prepMinutes: 18,
    tags: ['Lean Protein', 'Omega & Vitamin E', 'Light'],
    description:
      'Clean-grilled Kariba bream fillet drizzled with lemon paired with sliced avocado and crunchy cucumber-tomato relish.',
    steps: [
      'Season whole bream fillet with crushed garlic, lemon, and black pepper; grill 6 minutes per side.',
      'Slice ripe avocado and toss fresh cucumber salad alongside.',
    ],
    ingredients: [
      { foodId: 83, portionAmount: 200, prepNote: 'Grilled Kariba bream' },
      { foodId: 135, portionAmount: 70, prepNote: 'Sliced avocado' },
      { foodId: 106, portionAmount: 120, prepNote: 'Crisp cucumber salad' },
    ],
  },
  {
    id: 'nyemba-muboora-stew',
    title: 'Sugar Beans, Muboora & Yellow Sadza',
    shonaSubtitle: 'Nyemba nemuboora nesadza',
    mealSlot: 'Lunch',
    prepMinutes: 25,
    tags: ['Plant Protein', 'High Fibre', 'Heart Healthy'],
    description:
      'Wholesome plant-forward Harare staple combining slow-digesting sugar beans with beta-carotene-rich yellow maize sadza and muboora greens.',
    steps: [
      'Simmer boiled sugar beans in chopped tomato and spring onion for 8 minutes.',
      'Toss shredded muboora greens into a splash of water until bright and tender.',
      'Plate with a modest portion of yellow maize sadza.',
    ],
    ingredients: [
      { foodId: 112, portionAmount: 200, prepNote: 'Tomato-braised sugar beans' },
      { foodId: 97, portionAmount: 140, prepNote: 'Steamed pumpkin leaves' },
      { foodId: 2, portionAmount: 180, prepNote: 'Yellow maize sadza' },
    ],
  },
  {
    id: 'madora-derere-protein',
    title: 'Spiced Madora & Okra (Derere) Skillet',
    shonaSubtitle: 'Madora akagochwa nederere',
    mealSlot: 'Dinner',
    prepMinutes: 14,
    tags: ['Ultra Protein', 'Very Low Carb', 'Micronutrient Rich'],
    description:
      'Protein-packed cooked mopane worms tossed with mild chili and garlic alongside comforting derere okra relish.',
    steps: [
      'Pan-sear soaked, drained mopane worms with onion and tomato until lightly crisped.',
      'Serve warm with freshly simmered derere.',
    ],
    ingredients: [
      { foodId: 128, portionAmount: 130, prepNote: 'Pan-seared mopane worms' },
      { foodId: 99, portionAmount: 140, prepNote: 'Warm derere okra relish' },
    ],
  },
  {
    id: 'millet-porridge-nzungu',
    title: 'Zviyo Millet Bota with Groundnut Crumb',
    shonaSubtitle: 'Bota rezviyo nenzungu',
    mealSlot: 'Breakfast',
    prepMinutes: 12,
    tags: ['Sustained Carbs', 'Morning Fuel', 'Fibre'],
    description:
      'Silky warm finger millet breakfast porridge finished with roasted peanut butter and sliced banana for clean morning training energy.',
    steps: [
      'Whisk finger millet meal slowly into simmering water until smooth and thick.',
      'Swirl in pure peanut butter and top with ripe banana slices.',
    ],
    ingredients: [
      { foodId: 30, portionAmount: 260, prepNote: 'Warm millet porridge' },
      { foodId: 19, portionAmount: 20, prepNote: 'Swirl of pure peanut butter' },
      { foodId: 136, portionAmount: 90, prepNote: 'Sliced banana' },
    ],
  },
  {
    id: 'baobab-amasi-bowl',
    title: 'Mauyu (Baobab) & Lacto Amasi Bowl',
    shonaSubtitle: 'Hodzeko nemauyu',
    mealSlot: 'Snack',
    prepMinutes: 5,
    tags: ['Vitamin C & Probiotics', 'Quick Snack', 'Light'],
    description:
      'Chilled fermented milk whisked with tangy baobab pulp and chopped guava—refreshing probiotic fuel under 250 kcal.',
    steps: [
      'Whisk baobab fruit pulp smoothly into chilled plain fermented milk (amasi/hodzeko).',
      'Top with diced fresh guava just before serving.',
    ],
    ingredients: [
      { foodId: 196, portionAmount: 200, prepNote: 'Chilled fermented milk' },
      { foodId: 133, portionAmount: 25, prepNote: 'Sieved baobab pulp' },
      { foodId: 132, portionAmount: 100, prepNote: 'Diced fresh guava' },
    ],
  },
  {
    id: 'mbambaira-egg-plate',
    title: 'Roasted Mbambaira, Boiled Eggs & Rape',
    shonaSubtitle: 'Mbambaira nemazai nemuriwo',
    mealSlot: 'Breakfast',
    prepMinutes: 16,
    tags: ['Balanced Macro', 'Whole Food', 'Budget Friendly'],
    description:
      'Clean post-workout or brunch plate pairing sweet roasted mbambaira wedges, two boiled eggs, and wilted rape greens.',
    steps: [
      'Slice sweet potato into wedges and roast/pan-toast until golden edges appear.',
      'Pair with two soft- or hard-boiled eggs and sautéed rape leaves.',
    ],
    ingredients: [
      { foodId: 13, portionAmount: 180, prepNote: 'Roasted sweet potato wedges' },
      { foodId: 183, portionAmount: 110, prepNote: 'Two boiled eggs' },
      { foodId: 93, portionAmount: 120, prepNote: 'Steamed rape leaves' },
    ],
  },
];

export function computeRecipeSuggestionMatches(remaining: {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}): RankedRecipeSuggestion[] {
  const remKcal = Math.max(0, remaining.kcal);
  const remP = Math.max(0, remaining.protein);
  const remC = Math.max(0, remaining.carbs);
  const remF = Math.max(0, remaining.fat);

  const ranked = AUTHENTIC_ZIMBABWE_RECIPES.map((recipe): RankedRecipeSuggestion => {
    const computedIngredients: ComputedRecipeIngredient[] = [];
    const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };

    for (const ing of recipe.ingredients) {
      const item = FOOD_BY_ID.get(ing.foodId);
      if (!item) continue;
      const s = scaleNutrition(
        {
          kcal: item.kcal,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fibre: item.fibre,
        },
        ing.portionAmount
      );
      totals.kcal += s.kcal;
      totals.protein = Math.round((totals.protein + s.protein) * 10) / 10;
      totals.carbs = Math.round((totals.carbs + s.carbs) * 10) / 10;
      totals.fat = Math.round((totals.fat + s.fat) * 10) / 10;
      totals.fibre = Math.round((totals.fibre + s.fibre) * 10) / 10;

      computedIngredients.push({
        ...ing,
        item,
        scaledKcal: s.kcal,
        scaledProtein: s.protein,
        scaledCarbs: s.carbs,
        scaledFat: s.fat,
        scaledFibre: s.fibre,
      });
    }

    // Score how cleanly the recipe fits remaining daily calorie & P/C/F targets
    let score = 100;
    if (remKcal <= 250) {
      // Nearly at goal: prefer lighter snacks / low-calorie greens/protein dishes
      score -= Math.abs(totals.kcal - Math.max(150, remKcal)) * 0.2;
      if (totals.kcal > remKcal + 180) score -= 45;
    } else {
      const idealMealKcal = Math.min(remKcal, Math.max(300, remKcal * 0.65));
      score -= Math.abs(totals.kcal - idealMealKcal) * 0.08;
      if (totals.kcal > remKcal + 120) score -= 35;
    }

    // Protein alignment bonus / overage penalty
    if (remP >= 25) {
      score += Math.min(30, (totals.protein / remP) * 28);
    } else if (totals.protein <= remP + 15) {
      score += 10;
    }

    // Carb & fat overshoot guard
    if (totals.carbs > remC + 18) {
      score -= (totals.carbs - remC) * 0.55;
    }
    if (totals.fat > remF + 12) {
      score -= (totals.fat - remF) * 0.8;
    }

    // Build human-readable match explanation
    const reasons: string[] = [];
    if (remP > 10) {
      const covP = Math.min(100, Math.round((totals.protein / remP) * 100));
      reasons.push(`Covers ${covP}% of remaining ${Math.round(remP)}g protein`);
    } else {
      reasons.push(`${totals.protein}g protein · ${totals.fibre}g fibre`);
    }

    if (remKcal <= 250 && totals.kcal <= 300) {
      reasons.push(`Light ${totals.kcal} kcal finish`);
    } else if (totals.kcal <= remKcal) {
      reasons.push(`Fits within your ${Math.round(remKcal)} kcal budget`);
    } else {
      reasons.push(`${totals.kcal} kcal full Zimbabwean meal`);
    }

    return {
      recipe,
      ingredients: computedIngredients,
      totals,
      fitScore: Math.round(score),
      fitReason: reasons.join(' · '),
    };
  });

  return ranked.sort((a, b) => b.fitScore - a.fitScore);
}

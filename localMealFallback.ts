import { matchFoodInDatabase } from '../data/zimbabweFoodDb';

export interface LocalParsedFoodItem {
  foodId: number;
  foodName: string;
  matchedFromDb: boolean;
  unit: 'g' | 'ml';
  portionAmount: number;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  fibrePer100: number;
  vitamins: string;
  confidence: number;
  weightCue?: string;
}

export function localParseMealDescription(
  description: string,
  plateSize: 'small' | 'standard' | 'large' = 'standard'
): LocalParsedFoodItem[] {
  const chunks = description
    .toLowerCase()
    .split(/(?:,|\+|&|\band\b|\bwith\b|\bne\b|\bna\b|\bno\b|\ble\b|\bla\b|\bkanye\b)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const items: LocalParsedFoodItem[] = [];
  for (const chunk of chunks) {
    const gramMatch = chunk.match(/(\d+(?:\.\d+)?)\s*(g|grams?|ml|milliliters?)/i);
    const portion = gramMatch ? Math.max(10, Math.round(Number(gramMatch[1]))) : 180;
    const cleaned = chunk
      .replace(/(\d+(?:\.\d+)?)\s*(g|grams?|ml|milliliters?|tbsp|tablespoons?|spoons?)/gi, '')
      .replace(
        /\b(i|just|had|ate|eating|drank|ndodya|ndadya|ndakadya|ndinwa|ndirikudya|ngidle|ngidlile|ngiphuze|ngadla|of|with|some)\b/gi,
        ' '
      )
      .replace(/\s+/g, ' ')
      .trim();
    const match = matchFoodInDatabase(cleaned || chunk);
    if (match) {
      items.push({
        foodId: match.item.id,
        foodName: match.item.food,
        matchedFromDb: true,
        unit: match.item.unit,
        portionAmount: portion,
        kcalPer100: match.item.kcal,
        proteinPer100: match.item.protein,
        carbsPer100: match.item.carbs,
        fatPer100: match.item.fat,
        fibrePer100: match.item.fibre,
        vitamins: match.item.vitamins,
        confidence: Math.round(match.confidence * 100) / 100,
        weightCue: `Offline local DB match (${plateSize} plate)`,
      });
    }
  }

  if (items.length === 0) {
    const mult = plateSize === 'small' ? 0.78 : plateSize === 'large' ? 1.25 : 1;
    const sadza = matchFoodInDatabase('Sadza (white maize)')?.item;
    const beef = matchFoodInDatabase('Beef stew')?.item;
    const covo = matchFoodInDatabase('Covo with peanut butter')?.item;
    for (const [entry, g, cue] of [
      [sadza, Math.round(250 * mult), 'Rounded sadza dome'],
      [beef, Math.round(180 * mult), 'Braised stew portion'],
      [covo, Math.round(135 * mult), 'Sautéed leafy greens'],
    ] as const) {
      if (entry) {
        items.push({
          foodId: entry.id,
          foodName: entry.food,
          matchedFromDb: true,
          unit: entry.unit,
          portionAmount: g,
          kcalPer100: entry.kcal,
          proteinPer100: entry.protein,
          carbsPer100: entry.carbs,
          fatPer100: entry.fat,
          fibrePer100: entry.fibre,
          vitamins: entry.vitamins,
          confidence: 0.78,
          weightCue: cue,
        });
      }
    }
  }

  return items;
}

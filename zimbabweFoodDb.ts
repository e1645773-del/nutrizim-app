export type FoodUnit = 'g' | 'ml';

export type FoodCategory =
  | 'Staples & Grains'
  | 'Beef & Red Meat'
  | 'Poultry'
  | 'Fish & Kapenta'
  | 'Greens & Relishes'
  | 'Legumes & Dovi'
  | 'Wild & Traditional'
  | 'Fruits'
  | 'Fast Food & Bakery'
  | 'Dairy & Eggs'
  | 'Beverages';

export interface FoodItem {
  id: number;
  food: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  vitamins: string;
  unit: FoodUnit;
  category: FoodCategory;
  aliases?: string[];
}

export interface RawFoodEntry {
  id: number;
  food: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  vitamins: string;
}

const RAW_FOOD_DATA: RawFoodEntry[] = [
  {"id": 1, "food": "Sadza (white maize)", "kcal": 110, "protein": 2.5, "carbs": 24, "fat": 0.5, "fibre": 1.5, "vitamins": "B1, B3, B6"},
  {"id": 2, "food": "Sadza (yellow maize)", "kcal": 115, "protein": 2.6, "carbs": 25, "fat": 0.7, "fibre": 1.8, "vitamins": "A, B1, B3"},
  {"id": 3, "food": "Sadza (rapoko)", "kcal": 115, "protein": 3.5, "carbs": 23, "fat": 1.2, "fibre": 2.5, "vitamins": "B1, B2, B3"},
  {"id": 4, "food": "Sadza (finger millet)", "kcal": 120, "protein": 3.5, "carbs": 25, "fat": 1.1, "fibre": 2.8, "vitamins": "B1, B3, B6"},
  {"id": 5, "food": "Sadza (sorghum)", "kcal": 115, "protein": 3.2, "carbs": 24, "fat": 1, "fibre": 2.5, "vitamins": "B1, B3"},
  {"id": 6, "food": "Boiled white rice", "kcal": 130, "protein": 2.7, "carbs": 28, "fat": 0.3, "fibre": 0.4, "vitamins": "B1, B3"},
  {"id": 7, "food": "Brown rice", "kcal": 123, "protein": 2.7, "carbs": 25.6, "fat": 1, "fibre": 1.8, "vitamins": "B1, B3, B6"},
  {"id": 8, "food": "Rice with peanut butter", "kcal": 170, "protein": 4, "carbs": 27, "fat": 5, "fibre": 1.5, "vitamins": "B3, E"},
  {"id": 9, "food": "Boiled potatoes", "kcal": 87, "protein": 1.9, "carbs": 20, "fat": 0.1, "fibre": 1.8, "vitamins": "C, B6"},
  {"id": 10, "food": "Mashed potatoes", "kcal": 110, "protein": 2, "carbs": 18, "fat": 3, "fibre": 1.8, "vitamins": "C, B6"},
  {"id": 11, "food": "Fried potatoes", "kcal": 250, "protein": 3.5, "carbs": 35, "fat": 11, "fibre": 3, "vitamins": "C, B6"},
  {"id": 12, "food": "Sweet potatoes boiled", "kcal": 86, "protein": 1.6, "carbs": 20, "fat": 0.1, "fibre": 3, "vitamins": "A, C, B6"},
  {"id": 13, "food": "Sweet potatoes roasted", "kcal": 100, "protein": 2, "carbs": 23, "fat": 0.2, "fibre": 3.5, "vitamins": "A, C"},
  {"id": 14, "food": "Cassava boiled", "kcal": 160, "protein": 1.4, "carbs": 38, "fat": 0.3, "fibre": 1.8, "vitamins": "C, B1"},
  {"id": 15, "food": "Boiled green maize", "kcal": 96, "protein": 3.4, "carbs": 21, "fat": 1.5, "fibre": 2.4, "vitamins": "B1, B9"},
  {"id": 16, "food": "Roasted maize", "kcal": 120, "protein": 4, "carbs": 25, "fat": 1.5, "fibre": 3, "vitamins": "B1, B3"},
  {"id": 17, "food": "Boiled groundnuts", "kcal": 318, "protein": 13.5, "carbs": 21, "fat": 22, "fibre": 8, "vitamins": "E, B3, B9"},
  {"id": 18, "food": "Roasted groundnuts", "kcal": 585, "protein": 25, "carbs": 21, "fat": 49, "fibre": 8, "vitamins": "E, B3, B9"},
  {"id": 19, "food": "Peanut butter", "kcal": 588, "protein": 25, "carbs": 20, "fat": 50, "fibre": 6, "vitamins": "E, B3, B9"},
  {"id": 20, "food": "Boiled pumpkin", "kcal": 26, "protein": 1, "carbs": 6.5, "fat": 0.1, "fibre": 0.5, "vitamins": "A, C"},
  {"id": 21, "food": "Pumpkin leaves", "kcal": 35, "protein": 3, "carbs": 5, "fat": 0.5, "fibre": 2.5, "vitamins": "A, C, B9"},
  {"id": 22, "food": "Boiled butternut", "kcal": 45, "protein": 1, "carbs": 12, "fat": 0.1, "fibre": 2, "vitamins": "A, C"},
  {"id": 23, "food": "Boiled yam", "kcal": 118, "protein": 1.5, "carbs": 28, "fat": 0.2, "fibre": 4, "vitamins": "C, B6"},
  {"id": 24, "food": "Boiled green bananas", "kcal": 116, "protein": 1.3, "carbs": 31, "fat": 0.4, "fibre": 2.6, "vitamins": "B6, C"},
  {"id": 25, "food": "Boiled plantain", "kcal": 122, "protein": 1.3, "carbs": 32, "fat": 0.4, "fibre": 2.3, "vitamins": "A, C, B6"},
  {"id": 26, "food": "Maputi", "kcal": 380, "protein": 9, "carbs": 74, "fat": 4, "fibre": 7, "vitamins": "B1, B3"},
  {"id": 27, "food": "Chimodho", "kcal": 280, "protein": 7, "carbs": 48, "fat": 6, "fibre": 2, "vitamins": "B1, B3"},
  {"id": 28, "food": "Rice porridge", "kcal": 60, "protein": 1.2, "carbs": 13, "fat": 0.2, "fibre": 0.3, "vitamins": "B1"},
  {"id": 29, "food": "Maize meal porridge", "kcal": 75, "protein": 2, "carbs": 15, "fat": 1, "fibre": 1.5, "vitamins": "B1, B3"},
  {"id": 30, "food": "Millet porridge", "kcal": 80, "protein": 2.5, "carbs": 15, "fat": 1.5, "fibre": 2, "vitamins": "B1, B3"},
  {"id": 31, "food": "Beef steak grilled", "kcal": 250, "protein": 27, "carbs": 0, "fat": 15, "fibre": 0, "vitamins": "B3, B6, B12"},
  {"id": 32, "food": "Beef steak boiled", "kcal": 210, "protein": 29, "carbs": 0, "fat": 10, "fibre": 0, "vitamins": "B3, B6, B12"},
  {"id": 33, "food": "Beef stew", "kcal": 180, "protein": 20, "carbs": 5, "fat": 9, "fibre": 1, "vitamins": "B3, B12"},
  {"id": 34, "food": "Minced beef cooked", "kcal": 250, "protein": 26, "carbs": 0, "fat": 16, "fibre": 0, "vitamins": "B3, B6, B12"},
  {"id": 35, "food": "Minced beef with vegetables", "kcal": 160, "protein": 17, "carbs": 6, "fat": 8, "fibre": 2, "vitamins": "A, B12"},
  {"id": 36, "food": "Beef liver cooked", "kcal": 175, "protein": 26, "carbs": 5, "fat": 5, "fibre": 0, "vitamins": "A, B2, B12"},
  {"id": 37, "food": "Beef tripe cooked", "kcal": 85, "protein": 12, "carbs": 0, "fat": 4, "fibre": 0, "vitamins": "B12, B3"},
  {"id": 38, "food": "Beef intestine cooked", "kcal": 150, "protein": 15, "carbs": 0, "fat": 9, "fibre": 0, "vitamins": "B12, B3"},
  {"id": 39, "food": "Beef kidney cooked", "kcal": 158, "protein": 27, "carbs": 0, "fat": 4, "fibre": 0, "vitamins": "B12, B2"},
  {"id": 42, "food": "Beef ribs grilled", "kcal": 300, "protein": 25, "carbs": 0, "fat": 22, "fibre": 0, "vitamins": "B12, B6"},
  {"id": 43, "food": "Beef sausages", "kcal": 300, "protein": 15, "carbs": 3, "fat": 25, "fibre": 0, "vitamins": "B12, B3"},
  {"id": 44, "food": "Beef mince fried", "kcal": 280, "protein": 25, "carbs": 0, "fat": 20, "fibre": 0, "vitamins": "B12, B3"},
  {"id": 45, "food": "Beef mince with tomato", "kcal": 170, "protein": 19, "carbs": 4, "fat": 9, "fibre": 1, "vitamins": "A, C, B12"},
  {"id": 46, "food": "Roast beef", "kcal": 220, "protein": 29, "carbs": 0, "fat": 11, "fibre": 0, "vitamins": "B3, B12"},
  {"id": 47, "food": "Boiled beef", "kcal": 200, "protein": 28, "carbs": 0, "fat": 9, "fibre": 0, "vitamins": "B3, B12"},
  {"id": 48, "food": "Beef kebabs", "kcal": 210, "protein": 25, "carbs": 2, "fat": 11, "fibre": 0.5, "vitamins": "B6, B12"},
  {"id": 49, "food": "Beef stew with potatoes", "kcal": 130, "protein": 12, "carbs": 12, "fat": 4, "fibre": 1.5, "vitamins": "C, B12"},
  {"id": 50, "food": "Beef stew with carrots", "kcal": 140, "protein": 15, "carbs": 6, "fat": 7, "fibre": 1.5, "vitamins": "A, B12"},
  {"id": 51, "food": "Chicken breast grilled", "kcal": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fibre": 0, "vitamins": "B3, B6"},
  {"id": 52, "food": "Chicken breast boiled", "kcal": 150, "protein": 31, "carbs": 0, "fat": 3, "fibre": 0, "vitamins": "B3, B6"},
  {"id": 53, "food": "Chicken thigh roasted", "kcal": 210, "protein": 26, "carbs": 0, "fat": 11, "fibre": 0, "vitamins": "B3, B6"},
  {"id": 54, "food": "Chicken drumstick roasted", "kcal": 175, "protein": 28, "carbs": 0, "fat": 6, "fibre": 0, "vitamins": "B3, B6"},
  {"id": 55, "food": "Whole roasted chicken", "kcal": 220, "protein": 27, "carbs": 0, "fat": 12, "fibre": 0, "vitamins": "B3, B6"},
  {"id": 56, "food": "Fried chicken", "kcal": 280, "protein": 25, "carbs": 8, "fat": 17, "fibre": 0.5, "vitamins": "B3, B6"},
  {"id": 57, "food": "Chicken wings fried", "kcal": 290, "protein": 24, "carbs": 5, "fat": 19, "fibre": 0, "vitamins": "B3, B6"},
  {"id": 58, "food": "Chicken liver cooked", "kcal": 167, "protein": 25, "carbs": 1, "fat": 6, "fibre": 0, "vitamins": "A, B2, B12"},
  {"id": 59, "food": "Chicken gizzards cooked", "kcal": 154, "protein": 30, "carbs": 0, "fat": 3, "fibre": 0, "vitamins": "B3, B12"},
  {"id": 60, "food": "Chicken hearts cooked", "kcal": 185, "protein": 26, "carbs": 0, "fat": 8, "fibre": 0, "vitamins": "B12, B2"},
  {"id": 61, "food": "Chicken neck stew", "kcal": 180, "protein": 20, "carbs": 2, "fat": 10, "fibre": 0, "vitamins": "B12, B3"},
  {"id": 62, "food": "Chicken feet cooked", "kcal": 215, "protein": 19, "carbs": 0, "fat": 15, "fibre": 0, "vitamins": "B12"},
  {"id": 63, "food": "Chicken stew", "kcal": 160, "protein": 20, "carbs": 4, "fat": 7, "fibre": 1, "vitamins": "B3, B6"},
  {"id": 64, "food": "Chicken curry", "kcal": 175, "protein": 19, "carbs": 5, "fat": 8, "fibre": 1, "vitamins": "A, B6"},
  {"id": 65, "food": "Chicken and rice", "kcal": 160, "protein": 12, "carbs": 22, "fat": 3, "fibre": 0.5, "vitamins": "B3, B6"},
  {"id": 66, "food": "Chicken and potatoes", "kcal": 145, "protein": 14, "carbs": 14, "fat": 4, "fibre": 1, "vitamins": "C, B6"},
  {"id": 67, "food": "Chicken pie", "kcal": 270, "protein": 12, "carbs": 25, "fat": 14, "fibre": 1, "vitamins": "B3, B12"},
  {"id": 68, "food": "Chicken sausage", "kcal": 230, "protein": 15, "carbs": 3, "fat": 17, "fibre": 0, "vitamins": "B3, B12"},
  {"id": 69, "food": "Chicken kebabs", "kcal": 170, "protein": 27, "carbs": 2, "fat": 5, "fibre": 0, "vitamins": "B3, B6"},
  {"id": 70, "food": "Chicken soup", "kcal": 45, "protein": 5, "carbs": 4, "fat": 1.5, "fibre": 0.5, "vitamins": "B3, B6"},
  {"id": 71, "food": "Pork chops grilled", "kcal": 250, "protein": 27, "carbs": 0, "fat": 15, "fibre": 0, "vitamins": "B1, B3, B12"},
  {"id": 72, "food": "Pork ribs", "kcal": 300, "protein": 25, "carbs": 0, "fat": 22, "fibre": 0, "vitamins": "B1, B3"},
  {"id": 73, "food": "Pork sausages", "kcal": 320, "protein": 15, "carbs": 2, "fat": 28, "fibre": 0, "vitamins": "B1, B12"},
  {"id": 74, "food": "Roast pork", "kcal": 240, "protein": 27, "carbs": 0, "fat": 14, "fibre": 0, "vitamins": "B1, B3"},
  {"id": 75, "food": "Pork stew", "kcal": 190, "protein": 22, "carbs": 3, "fat": 10, "fibre": 0.5, "vitamins": "B1, B12"},
  {"id": 76, "food": "Goat meat grilled", "kcal": 143, "protein": 27, "carbs": 0, "fat": 3, "fibre": 0, "vitamins": "B12, B3"},
  {"id": 77, "food": "Goat stew", "kcal": 160, "protein": 23, "carbs": 3, "fat": 6, "fibre": 0.5, "vitamins": "B12, B3"},
  {"id": 78, "food": "Mutton stew", "kcal": 200, "protein": 25, "carbs": 2, "fat": 11, "fibre": 0, "vitamins": "B12, B3"},
  {"id": 79, "food": "Grilled lamb", "kcal": 250, "protein": 25, "carbs": 0, "fat": 17, "fibre": 0, "vitamins": "B12, B3"},
  {"id": 80, "food": "Rabbit meat cooked", "kcal": 173, "protein": 33, "carbs": 0, "fat": 3.5, "fibre": 0, "vitamins": "B12, B3"},
  {"id": 81, "food": "Tilapia grilled", "kcal": 128, "protein": 26, "carbs": 0, "fat": 2.7, "fibre": 0, "vitamins": "D, B12"},
  {"id": 82, "food": "Tilapia fried", "kcal": 200, "protein": 24, "carbs": 3, "fat": 11, "fibre": 0, "vitamins": "D, B12"},
  {"id": 83, "food": "Bream grilled", "kcal": 120, "protein": 24, "carbs": 0, "fat": 2.5, "fibre": 0, "vitamins": "D, B12"},
  {"id": 84, "food": "Kapenta dried", "kcal": 290, "protein": 58, "carbs": 0, "fat": 5, "fibre": 0, "vitamins": "D, B12"},
  {"id": 85, "food": "Kapenta cooked", "kcal": 180, "protein": 30, "carbs": 0, "fat": 6, "fibre": 0, "vitamins": "D, B12"},
  {"id": 86, "food": "Dried fish", "kcal": 280, "protein": 55, "carbs": 0, "fat": 5, "fibre": 0, "vitamins": "D, B12"},
  {"id": 87, "food": "Fish stew", "kcal": 130, "protein": 20, "carbs": 4, "fat": 4, "fibre": 0.5, "vitamins": "D, B12"},
  {"id": 88, "food": "Fried fish", "kcal": 220, "protein": 23, "carbs": 5, "fat": 12, "fibre": 0, "vitamins": "D, B12"},
  {"id": 89, "food": "Sardines canned", "kcal": 208, "protein": 25, "carbs": 0, "fat": 11, "fibre": 0, "vitamins": "D, B12"},
  {"id": 90, "food": "Smoked fish", "kcal": 170, "protein": 30, "carbs": 0, "fat": 5, "fibre": 0, "vitamins": "D, B12"},
  {"id": 91, "food": "Boiled covo", "kcal": 28, "protein": 2.5, "carbs": 4, "fat": 0.4, "fibre": 2, "vitamins": "A, C, K"},
  {"id": 92, "food": "Covo with peanut butter", "kcal": 110, "protein": 5, "carbs": 8, "fat": 7, "fibre": 3, "vitamins": "A, C, E"},
  {"id": 93, "food": "Boiled rape", "kcal": 30, "protein": 3, "carbs": 4, "fat": 0.5, "fibre": 2, "vitamins": "A, C, K"},
  {"id": 94, "food": "Rape with peanut butter", "kcal": 115, "protein": 5, "carbs": 9, "fat": 7, "fibre": 3, "vitamins": "A, C, E"},
  {"id": 95, "food": "Boiled spinach", "kcal": 23, "protein": 3, "carbs": 3.6, "fat": 0.4, "fibre": 2.2, "vitamins": "A, C, K"},
  {"id": 96, "food": "Spinach with peanut butter", "kcal": 110, "protein": 5, "carbs": 8, "fat": 7, "fibre": 3, "vitamins": "A, E"},
  {"id": 97, "food": "Muboora leaves", "kcal": 35, "protein": 3, "carbs": 6, "fat": 0.5, "fibre": 2.5, "vitamins": "A, C"},
  {"id": 98, "food": "Muboora with peanut butter", "kcal": 120, "protein": 5, "carbs": 9, "fat": 8, "fibre": 3, "vitamins": "A, E"},
  {"id": 99, "food": "Derere cooked", "kcal": 35, "protein": 2, "carbs": 7, "fat": 0.2, "fibre": 3, "vitamins": "A, C"},
  {"id": 100, "food": "Okra stew", "kcal": 45, "protein": 2, "carbs": 8, "fat": 0.5, "fibre": 3, "vitamins": "A, C, K"},
  {"id": 101, "food": "Boiled cabbage", "kcal": 23, "protein": 1.3, "carbs": 5.5, "fat": 0.1, "fibre": 2.5, "vitamins": "C, K"},
  {"id": 102, "food": "Fried cabbage", "kcal": 75, "protein": 1.5, "carbs": 6, "fat": 5, "fibre": 2, "vitamins": "C, K"},
  {"id": 103, "food": "Tomato relish", "kcal": 45, "protein": 1.5, "carbs": 8, "fat": 1, "fibre": 2, "vitamins": "A, C"},
  {"id": 104, "food": "Onion and tomato relish", "kcal": 55, "protein": 1.5, "carbs": 9, "fat": 1.5, "fibre": 2, "vitamins": "C, B6"},
  {"id": 105, "food": "Carrot salad", "kcal": 45, "protein": 1, "carbs": 10, "fat": 0.2, "fibre": 3, "vitamins": "A, K"},
  {"id": 106, "food": "Cucumber salad", "kcal": 20, "protein": 0.7, "carbs": 4, "fat": 0.1, "fibre": 0.5, "vitamins": "C, K"},
  {"id": 107, "food": "Beetroot boiled", "kcal": 44, "protein": 1.7, "carbs": 10, "fat": 0.2, "fibre": 2, "vitamins": "B9, C"},
  {"id": 108, "food": "Green beans boiled", "kcal": 35, "protein": 1.9, "carbs": 7, "fat": 0.2, "fibre": 3, "vitamins": "A, C, K"},
  {"id": 109, "food": "Peas boiled", "kcal": 84, "protein": 5.4, "carbs": 15, "fat": 0.4, "fibre": 5, "vitamins": "A, C, B1"},
  {"id": 110, "food": "Mixed vegetables", "kcal": 65, "protein": 2.5, "carbs": 12, "fat": 1, "fibre": 3, "vitamins": "A, C, K"},
  {"id": 111, "food": "Boiled sugar beans", "kcal": 127, "protein": 8.7, "carbs": 23, "fat": 0.5, "fibre": 6.4, "vitamins": "B1, B9"},
  {"id": 112, "food": "Sugar beans with tomato", "kcal": 135, "protein": 9, "carbs": 23, "fat": 1, "fibre": 7, "vitamins": "B1, B9"},
  {"id": 113, "food": "Black-eyed peas", "kcal": 116, "protein": 7.7, "carbs": 21, "fat": 0.5, "fibre": 6.5, "vitamins": "B1, B9"},
  {"id": 114, "food": "Cowpeas cooked", "kcal": 120, "protein": 8, "carbs": 21, "fat": 0.5, "fibre": 6, "vitamins": "B1, B9"},
  {"id": 115, "food": "Boiled nyimo", "kcal": 130, "protein": 8, "carbs": 24, "fat": 1, "fibre": 5, "vitamins": "B1, B9"},
  {"id": 116, "food": "Nyimo with peanut butter", "kcal": 190, "protein": 10, "carbs": 25, "fat": 7, "fibre": 6, "vitamins": "B1, E"},
  {"id": 117, "food": "Boiled chickpeas", "kcal": 164, "protein": 8.9, "carbs": 27, "fat": 2.6, "fibre": 7.6, "vitamins": "B6, B9"},
  {"id": 118, "food": "Boiled lentils", "kcal": 116, "protein": 9, "carbs": 20, "fat": 0.4, "fibre": 7.9, "vitamins": "B1, B9"},
  {"id": 119, "food": "Boiled soybeans", "kcal": 173, "protein": 17, "carbs": 10, "fat": 9, "fibre": 6, "vitamins": "B1, B9"},
  {"id": 120, "food": "Boiled bambara nuts", "kcal": 160, "protein": 7, "carbs": 25, "fat": 2, "fibre": 6, "vitamins": "B1, B9"},
  {"id": 121, "food": "Peanut butter stew (dovi)", "kcal": 220, "protein": 8, "carbs": 12, "fat": 16, "fibre": 3, "vitamins": "E, B3"},
  {"id": 122, "food": "Chicken dovi", "kcal": 190, "protein": 17, "carbs": 8, "fat": 11, "fibre": 2, "vitamins": "E, B3, B6"},
  {"id": 123, "food": "Beef dovi", "kcal": 210, "protein": 18, "carbs": 8, "fat": 13, "fibre": 2, "vitamins": "E, B12"},
  {"id": 124, "food": "Vegetable dovi", "kcal": 150, "protein": 6, "carbs": 12, "fat": 9, "fibre": 4, "vitamins": "A, E"},
  {"id": 125, "food": "Peanut butter and pumpkin leaves", "kcal": 140, "protein": 6, "carbs": 10, "fat": 9, "fibre": 3, "vitamins": "A, E"},
  {"id": 126, "food": "Peanut butter and beans", "kcal": 190, "protein": 9, "carbs": 20, "fat": 9, "fibre": 6, "vitamins": "B1, E"},
  {"id": 127, "food": "Mopane worms dried", "kcal": 350, "protein": 55, "carbs": 7, "fat": 10, "fibre": 0, "vitamins": "B2, B12"},
  {"id": 128, "food": "Mopane worms cooked", "kcal": 250, "protein": 40, "carbs": 4, "fat": 8, "fibre": 0, "vitamins": "B2, B12"},
  {"id": 129, "food": "Fried mopane worms", "kcal": 300, "protein": 38, "carbs": 4, "fat": 15, "fibre": 0, "vitamins": "B2, B12"},
  {"id": 130, "food": "Termites roasted", "kcal": 450, "protein": 35, "carbs": 20, "fat": 25, "fibre": 5, "vitamins": "B2, B12"},
  {"id": 131, "food": "Boiled guava", "kcal": 68, "protein": 2.6, "carbs": 14, "fat": 1, "fibre": 5, "vitamins": "C, A"},
  {"id": 132, "food": "Fresh guava", "kcal": 68, "protein": 2.6, "carbs": 14, "fat": 1, "fibre": 5, "vitamins": "C, A"},
  {"id": 133, "food": "Baobab fruit pulp", "kcal": 250, "protein": 3, "carbs": 80, "fat": 1, "fibre": 45, "vitamins": "C, B1"},
  {"id": 134, "food": "Wild mango", "kcal": 70, "protein": 1, "carbs": 18, "fat": 0.5, "fibre": 3, "vitamins": "A, C"},
  {"id": 135, "food": "Avocado", "kcal": 160, "protein": 2, "carbs": 9, "fat": 15, "fibre": 7, "vitamins": "E, K, B6"},
  {"id": 136, "food": "Banana", "kcal": 89, "protein": 1.1, "carbs": 23, "fat": 0.3, "fibre": 2.6, "vitamins": "B6, C"},
  {"id": 137, "food": "Orange", "kcal": 47, "protein": 0.9, "carbs": 12, "fat": 0.1, "fibre": 2.4, "vitamins": "C, B9"},
  {"id": 138, "food": "Watermelon", "kcal": 30, "protein": 0.6, "carbs": 8, "fat": 0.2, "fibre": 0.4, "vitamins": "A, C"},
  {"id": 139, "food": "Papaya", "kcal": 43, "protein": 0.5, "carbs": 11, "fat": 0.3, "fibre": 1.7, "vitamins": "A, C"},
  {"id": 140, "food": "Mango", "kcal": 60, "protein": 0.8, "carbs": 15, "fat": 0.4, "fibre": 1.6, "vitamins": "A, C"},
  {"id": 141, "food": "Plain cooked pasta", "kcal": 157, "protein": 5.8, "carbs": 31, "fat": 0.9, "fibre": 1.8, "vitamins": "B1, B3"},
  {"id": 142, "food": "Pasta with tomato sauce", "kcal": 120, "protein": 4, "carbs": 22, "fat": 2, "fibre": 2, "vitamins": "A, C"},
  {"id": 143, "food": "Pasta with cheese sauce", "kcal": 190, "protein": 7, "carbs": 22, "fat": 8, "fibre": 1.5, "vitamins": "A, B2, B12"},
  {"id": 144, "food": "Chicken pasta", "kcal": 170, "protein": 12, "carbs": 22, "fat": 4, "fibre": 1.5, "vitamins": "B3, B6"},
  {"id": 145, "food": "Beef mince pasta", "kcal": 180, "protein": 10, "carbs": 22, "fat": 6, "fibre": 1.5, "vitamins": "B12, B3"},
  {"id": 146, "food": "Mushroom pasta", "kcal": 160, "protein": 6, "carbs": 24, "fat": 4, "fibre": 2, "vitamins": "B2, B3"},
  {"id": 147, "food": "Instant noodles prepared", "kcal": 190, "protein": 5, "carbs": 27, "fat": 7, "fibre": 1.5, "vitamins": "B1, B3"},
  {"id": 148, "food": "Instant noodles with chicken", "kcal": 170, "protein": 9, "carbs": 24, "fat": 5, "fibre": 1.5, "vitamins": "B3, B6"},
  {"id": 149, "food": "Instant noodles with mushrooms", "kcal": 160, "protein": 6, "carbs": 25, "fat": 5, "fibre": 2, "vitamins": "B2, B3"},
  {"id": 150, "food": "Instant noodles with cheese", "kcal": 210, "protein": 7, "carbs": 25, "fat": 9, "fibre": 1, "vitamins": "B2, B12"},
  {"id": 151, "food": "Fried rice with vegetables", "kcal": 160, "protein": 4, "carbs": 26, "fat": 5, "fibre": 2, "vitamins": "A, B1"},
  {"id": 152, "food": "Fried rice with chicken", "kcal": 175, "protein": 10, "carbs": 25, "fat": 4, "fibre": 1, "vitamins": "B3, B6"},
  {"id": 153, "food": "Beef burger", "kcal": 250, "protein": 15, "carbs": 25, "fat": 10, "fibre": 1.5, "vitamins": "B12, B3"},
  {"id": 154, "food": "Chicken burger", "kcal": 230, "protein": 14, "carbs": 25, "fat": 8, "fibre": 1.5, "vitamins": "B3, B6"},
  {"id": 155, "food": "Beef sandwich", "kcal": 220, "protein": 13, "carbs": 25, "fat": 7, "fibre": 2, "vitamins": "B12, B3"},
  {"id": 156, "food": "Chicken sandwich", "kcal": 210, "protein": 13, "carbs": 25, "fat": 6, "fibre": 2, "vitamins": "B3, B6"},
  {"id": 157, "food": "Cheese sandwich", "kcal": 280, "protein": 12, "carbs": 30, "fat": 12, "fibre": 2, "vitamins": "B2, B12"},
  {"id": 158, "food": "Butter sandwich", "kcal": 300, "protein": 7, "carbs": 45, "fat": 10, "fibre": 2, "vitamins": "B1, B2"},
  {"id": 159, "food": "Pizza with meat", "kcal": 270, "protein": 12, "carbs": 32, "fat": 10, "fibre": 2, "vitamins": "A, B12"},
  {"id": 160, "food": "Sausage roll", "kcal": 320, "protein": 9, "carbs": 28, "fat": 20, "fibre": 1, "vitamins": "B1, B12"},
  {"id": 161, "food": "Plain bread", "kcal": 265, "protein": 9, "carbs": 49, "fat": 3, "fibre": 2.7, "vitamins": "B1, B3"},
  {"id": 162, "food": "Whole wheat bread", "kcal": 247, "protein": 13, "carbs": 41, "fat": 4, "fibre": 7, "vitamins": "B1, B3, B9"},
  {"id": 163, "food": "White bread roll", "kcal": 270, "protein": 9, "carbs": 50, "fat": 3, "fibre": 2, "vitamins": "B1, B3"},
  {"id": 164, "food": "Mandazi", "kcal": 350, "protein": 7, "carbs": 50, "fat": 14, "fibre": 2, "vitamins": "B1, B3"},
  {"id": 165, "food": "Doughnut", "kcal": 400, "protein": 6, "carbs": 50, "fat": 22, "fibre": 2, "vitamins": "B1, B3"},
  {"id": 166, "food": "Pancakes", "kcal": 230, "protein": 6, "carbs": 30, "fat": 10, "fibre": 1, "vitamins": "B1, B2"},
  {"id": 167, "food": "Scones", "kcal": 350, "protein": 7, "carbs": 50, "fat": 13, "fibre": 2, "vitamins": "B1, B2"},
  {"id": 168, "food": "Biscuits plain", "kcal": 450, "protein": 7, "carbs": 70, "fat": 15, "fibre": 2, "vitamins": "B1, B3"},
  {"id": 169, "food": "Cornflakes", "kcal": 357, "protein": 8, "carbs": 84, "fat": 0.4, "fibre": 3, "vitamins": "B1, B3"},
  {"id": 170, "food": "Oats dry", "kcal": 389, "protein": 17, "carbs": 66, "fat": 7, "fibre": 10.6, "vitamins": "B1, B5"},
  {"id": 171, "food": "Maize snacks", "kcal": 450, "protein": 7, "carbs": 70, "fat": 16, "fibre": 4, "vitamins": "B1, B3"},
  {"id": 172, "food": "Popcorn plain", "kcal": 387, "protein": 13, "carbs": 78, "fat": 4, "fibre": 15, "vitamins": "B1, B3"},
  {"id": 173, "food": "Potato crisps", "kcal": 536, "protein": 7, "carbs": 53, "fat": 35, "fibre": 4, "vitamins": "C, B6"},
  {"id": 174, "food": "Roasted cashews", "kcal": 553, "protein": 18, "carbs": 30, "fat": 44, "fibre": 3, "vitamins": "E, B6"},
  {"id": 175, "food": "Roasted sunflower seeds", "kcal": 584, "protein": 21, "carbs": 20, "fat": 51, "fibre": 9, "vitamins": "E, B6"},
  {"id": 176, "food": "Whole milk", "kcal": 61, "protein": 3.2, "carbs": 4.8, "fat": 3.3, "fibre": 0, "vitamins": "A, B2, B12"},
  {"id": 177, "food": "Low-fat milk", "kcal": 42, "protein": 3.4, "carbs": 5, "fat": 1, "fibre": 0, "vitamins": "A, B2, B12"},
  {"id": 178, "food": "Plain yoghurt", "kcal": 61, "protein": 3.5, "carbs": 4.7, "fat": 3.3, "fibre": 0, "vitamins": "B2, B12"},
  {"id": 179, "food": "Greek yoghurt", "kcal": 97, "protein": 9, "carbs": 3.6, "fat": 5, "fibre": 0, "vitamins": "B2, B12"},
  {"id": 180, "food": "Cheddar cheese", "kcal": 403, "protein": 25, "carbs": 1.3, "fat": 33, "fibre": 0, "vitamins": "A, B2, B12"},
  {"id": 181, "food": "Butter", "kcal": 717, "protein": 0.9, "carbs": 0.1, "fat": 81, "fibre": 0, "vitamins": "A, D, E"},
  {"id": 182, "food": "Margarine", "kcal": 717, "protein": 0.2, "carbs": 0.7, "fat": 80, "fibre": 0, "vitamins": "A, E"},
  {"id": 183, "food": "Boiled egg", "kcal": 155, "protein": 13, "carbs": 1.1, "fat": 11, "fibre": 0, "vitamins": "A, B12, D"},
  {"id": 184, "food": "Fried egg", "kcal": 196, "protein": 13.6, "carbs": 0.8, "fat": 15, "fibre": 0, "vitamins": "A, B12, D"},
  {"id": 185, "food": "Scrambled eggs", "kcal": 149, "protein": 10, "carbs": 2, "fat": 11, "fibre": 0, "vitamins": "A, B12, D"},
  {"id": 186, "food": "Maheu", "kcal": 60, "protein": 1.5, "carbs": 12, "fat": 0.5, "fibre": 0.5, "vitamins": "B1, B3"},
  {"id": 187, "food": "Plain lemonade", "kcal": 35, "protein": 0, "carbs": 9, "fat": 0, "fibre": 0, "vitamins": "C"},
  {"id": 188, "food": "Orange juice", "kcal": 45, "protein": 0.7, "carbs": 10, "fat": 0.2, "fibre": 0.2, "vitamins": "C, B9"},
  {"id": 189, "food": "Mazoe-style diluted juice", "kcal": 40, "protein": 0, "carbs": 10, "fat": 0, "fibre": 0, "vitamins": "C (variable)"},
  {"id": 190, "food": "Raspberry juice drink", "kcal": 40, "protein": 0, "carbs": 10, "fat": 0, "fibre": 0, "vitamins": "C (variable)"},
  {"id": 191, "food": "Black tea", "kcal": 1, "protein": 0, "carbs": 0.3, "fat": 0, "fibre": 0, "vitamins": "B2 (trace)"},
  {"id": 192, "food": "Tea with whole milk", "kcal": 25, "protein": 1, "carbs": 2, "fat": 1.5, "fibre": 0, "vitamins": "B2, B12"},
  {"id": 193, "food": "Coffee black", "kcal": 2, "protein": 0.3, "carbs": 0, "fat": 0, "fibre": 0, "vitamins": "B3 (trace)"},
  {"id": 194, "food": "Coffee with milk", "kcal": 35, "protein": 2, "carbs": 3, "fat": 2, "fibre": 0, "vitamins": "B2, B12"},
  {"id": 195, "food": "Homemade lemonade with sugar", "kcal": 45, "protein": 0, "carbs": 11, "fat": 0, "fibre": 0, "vitamins": "C"},
  {"id": 196, "food": "Plain fermented milk", "kcal": 65, "protein": 3.5, "carbs": 5, "fat": 3.5, "fibre": 0, "vitamins": "B2, B12"},
  {"id": 197, "food": "Sweetened yoghurt drink", "kcal": 90, "protein": 3, "carbs": 14, "fat": 2.5, "fibre": 0, "vitamins": "B2, B12"},
  {"id": 198, "food": "Sugarcane juice", "kcal": 60, "protein": 0.2, "carbs": 15, "fat": 0, "fibre": 0, "vitamins": "B6 (trace)"},
  {"id": 199, "food": "Fresh tamarind drink", "kcal": 50, "protein": 0.5, "carbs": 13, "fat": 0.2, "fibre": 0.5, "vitamins": "B1, C"},
  {"id": 200, "food": "Unsweetened baobab drink", "kcal": 35, "protein": 0.5, "carbs": 8, "fat": 0.2, "fibre": 1.5, "vitamins": "C, B1"}
];

const LIQUID_IDS = new Set([70, 176, 177, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200]);

const ALIAS_MAP: Record<number, string[]> = {
  1: ['sadza', 'isitshwala', 'pap', 'white sadza', 'maize sadza', 'upfu'],
  2: ['yellow sadza', 'kenya sadza', 'chibage cheyero'],
  3: ['rapoko', 'zviyo', 'sadza rezviyo', 'rukweza', 'uphoko'],
  4: ['sadza rezviyo', 'zviyo', 'finger millet', 'rukweza', 'mhunga'],
  5: ['mapfunde', 'amabele', 'sorghum sadza'],
  6: ['mupunga', 'irayisi', 'white rice'],
  12: ['mbambaira', 'imbambayila', 'sweet potato'],
  13: ['mbambaira yakagochwa', 'roasted sweet potato'],
  15: ['chibage', 'umumbu', 'green mealies', 'boiled mealie'],
  16: ['chibage chakagochwa', 'roasted mealie'],
  17: ['nzungu', 'amazambane', 'boiled peanuts', 'mutakura'],
  18: ['nzungu dzakakangwa', 'roasted peanuts'],
  19: ['dovi', 'idobi', 'peanut butter'],
  20: ['manhanga', 'ithanga'],
  21: ['muboora', 'pumpkin greens', 'ibhobola'],
  26: ['maputi', 'popped corn', 'roasted corn'],
  27: ['chimodho', 'cornbread', 'maize bread'],
  29: ['bota', 'porridge', 'maize porridge', 'iyambazi'],
  30: ['bota rezviyo', 'millet porridge', 'bota remhunga'],
  33: ['nyama yemombe', 'inyama yenkomo', 'beef gravy', 'stew'],
  37: ['matumbu', 'ulusu', 'guru', 'tripe'],
  56: ['nyama yehuku yakakangwa', 'chicken inn', 'fried chicken'],
  63: ['huku', 'inkukhu', 'road runner', 'chicken stew'],
  76: ['mbudzi', 'imbuzi', 'chevon', 'goat'],
  81: ['hove', 'inhlanzi', 'kariba bream'],
  83: ['kariba bream', 'hove', 'bream'],
  84: ['matemba', 'dried kapenta', 'kapenta'],
  85: ['matemba', 'kapenta relish', 'cooked kapenta'],
  91: ['covo', 'muriwo', 'umbhida', 'kale', 'collard greens'],
  92: ['covo nedovi', 'muriwo une dovi', 'covo peanut butter'],
  93: ['rape', 'muriwo werape', 'tsunga'],
  94: ['rape nedovi', 'rape peanut butter'],
  97: ['muboora', 'pumpkin leaves'],
  98: ['muboora nedovi', 'muboora peanut butter'],
  99: ['derere', 'idelele', 'okra', 'gusha'],
  111: ['sugar beans', 'nyemba', 'indumba', 'bhinzi'],
  115: ['nyimo', 'indlubu', 'bambara groundnuts'],
  121: ['dovi', 'peanut butter stew', 'idobi'],
  122: ['chicken dovi', 'huku yedovi', 'inkukhu ledovi'],
  123: ['beef dovi', 'nyama yedovi'],
  127: ['madora', 'amacimbi', 'mopane worms'],
  128: ['madora', 'amacimbi', 'cooked mopane'],
  133: ['mauyu', 'umkhomo', 'baobab'],
  164: ['magwinya', 'vetkoek', 'fat cook', 'mandazi'],
  186: ['maheu', 'amahewu', 'pfuko'],
  189: ['mazoe', 'orange crush', 'diluted juice'],
  196: ['lacto', 'hodzeko', 'amasi', 'mukaka wakakora', 'sour milk'],
};

function getCategory(id: number): FoodCategory {
  if (id <= 30) return 'Staples & Grains';
  if (id <= 50) return 'Beef & Red Meat';
  if (id <= 70) return 'Poultry';
  if (id <= 80) return 'Beef & Red Meat';
  if (id <= 90) return 'Fish & Kapenta';
  if (id <= 110) return 'Greens & Relishes';
  if (id <= 126) return 'Legumes & Dovi';
  if (id <= 130) return 'Wild & Traditional';
  if (id <= 140) return 'Fruits';
  if (id <= 175) return 'Fast Food & Bakery';
  if (id <= 185) return 'Dairy & Eggs';
  return 'Beverages';
}

export const ZIMBABWE_FOOD_DB: FoodItem[] = RAW_FOOD_DATA.map((item) => ({
  ...item,
  unit: LIQUID_IDS.has(item.id) ? 'ml' : 'g',
  category: getCategory(item.id),
  aliases: ALIAS_MAP[item.id] ?? [],
}));

export const COMMERCIAL_BARCODES: Record<
  string,
  { barcode: string; brand: string; foodId?: number; custom?: Omit<FoodItem, 'id'>; defaultPortion: number }
> = {
  '6001087374212': {
    barcode: '6001087374212',
    brand: 'Mazoe Orange Crush (Diluted 1:4)',
    foodId: 189,
    defaultPortion: 250,
  },
  '6009880123456': {
    barcode: '6009880123456',
    brand: 'Dairibord Pfuko Maheu Traditional',
    foodId: 186,
    defaultPortion: 330,
  },
  '6009680200118': {
    barcode: '6009680200118',
    brand: 'Dairibord Lacto Sour Milk (Amasi)',
    foodId: 196,
    defaultPortion: 250,
  },
  '6001060000105': {
    barcode: '6001060000105',
    brand: 'Lyons Smooth Peanut Butter',
    foodId: 19,
    defaultPortion: 30,
  },
  '6009510801122': {
    barcode: '6009510801122',
    brand: 'Kefalos Cheddar Cheese',
    foodId: 180,
    defaultPortion: 40,
  },
  '6001240200019': {
    barcode: '6001240200019',
    brand: 'Tanganda Black Tea (Brewed)',
    foodId: 191,
    defaultPortion: 250,
  },
};

export interface ScaledMacros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
}

export function scaleNutrition(
  per100: { kcal: number; protein: number; carbs: number; fat: number; fibre: number },
  portionAmount: number
): ScaledMacros {
  const factor = Math.max(0, portionAmount) / 100;
  return {
    kcal: Math.round(per100.kcal * factor),
    protein: Math.round(per100.protein * factor * 10) / 10,
    carbs: Math.round(per100.carbs * factor * 10) / 10,
    fat: Math.round(per100.fat * factor * 10) / 10,
    fibre: Math.round(per100.fibre * factor * 10) / 10,
  };
}

export function matchFoodInDatabase(query: string): { item: FoodItem; confidence: number } | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  let bestItem: FoodItem | null = null;
  let bestScore = 0;

  const qTokens = q.split(/[^a-z0-9]+/).filter(Boolean);

  for (const item of ZIMBABWE_FOOD_DB) {
    const nameLower = item.food.toLowerCase();
    const aliasesLower = (item.aliases ?? []).map((a) => a.toLowerCase());

    if (nameLower === q || aliasesLower.includes(q)) {
      return { item, confidence: 1 };
    }

    let score = 0;
    if (nameLower.includes(q)) score += 0.85;
    for (const alias of aliasesLower) {
      if (alias.includes(q) || q.includes(alias)) {
        score = Math.max(score, 0.88);
      }
    }

    const itemText = `${nameLower} ${aliasesLower.join(' ')}`;
    const itemTokens = itemText.split(/[^a-z0-9]+/).filter(Boolean);
    let overlap = 0;
    for (const qt of qTokens) {
      if (qt.length < 2) continue;
      if (itemTokens.some((it) => it === qt || (qt.length >= 4 && it.includes(qt)))) {
        overlap += 1;
      }
    }
    if (qTokens.length > 0) {
      const tokenScore = overlap / Math.max(qTokens.length, 1);
      score = Math.max(score, tokenScore * 0.8);
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  if (bestItem && bestScore >= 0.35) {
    return { item: bestItem, confidence: Math.min(1, bestScore) };
  }
  return null;
}

export const FOOD_CATEGORIES: FoodCategory[] = [
  'Staples & Grains',
  'Beef & Red Meat',
  'Poultry',
  'Fish & Kapenta',
  'Greens & Relishes',
  'Legumes & Dovi',
  'Wild & Traditional',
  'Fruits',
  'Fast Food & Bakery',
  'Dairy & Eggs',
  'Beverages',
];

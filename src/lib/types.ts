export type Unit = "kg" | "lb";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Profile {
  id: string;
  display_name: string | null;
  start_weight: number | null;
  target_weight: number | null;
  height_cm: number | null;
  unit: Unit;
  daily_calorie_target: number | null;
  target_date: string | null;
  created_at: string;
}

export interface Meal {
  id: string;
  daily_log_id: string;
  user_id: string;
  meal_type: MealType;
  description: string;
  calories: number | null;
  protein_g: number | null;
  eaten_at: string | null;
  created_at: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  weight: number | null;
  notes: string | null;
  created_at: string;
  meals: Meal[];
}

export interface Streaks {
  current_streak: number;
  longest_streak: number;
  on_track_streak: number;
  longest_on_track: number;
}

export const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: "breakfast", label: "Breakfast", emoji: "🍳" },
  { value: "lunch", label: "Lunch", emoji: "🥗" },
  { value: "dinner", label: "Dinner", emoji: "🍲" },
  { value: "snack", label: "Snack", emoji: "🍎" },
];

export interface StepEntry {
  id: string;
  user_id: string;
  log_date: string;
  steps: number;
  created_at: string;
}

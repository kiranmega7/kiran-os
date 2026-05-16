export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; name: string | null; avatar_url: string | null; created_at: string };
        Insert: { id: string; name?: string | null; avatar_url?: string | null };
        Update: { name?: string | null; avatar_url?: string | null };
      };
      businesses: {
        Row: {
          id: string; user_id: string; name: string; type: string; status: string;
          description: string | null; monthly_revenue_target: number; current_mrr: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["businesses"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["businesses"]["Insert"]>;
      };
      business_metric_logs: {
        Row: {
          id: string; business_id: string; metric_name: string; value: number;
          date: string; notes: string | null; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["business_metric_logs"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["business_metric_logs"]["Insert"]>;
      };
      income_sources: {
        Row: {
          id: string; user_id: string; name: string; type: string; amount: number;
          expected_date: string | null; received: boolean; notes: string | null; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["income_sources"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["income_sources"]["Insert"]>;
      };
      savings_logs: {
        Row: {
          id: string; user_id: string; date: string; amount: number; type: string;
          category: string | null; notes: string | null; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["savings_logs"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["savings_logs"]["Insert"]>;
      };
      goals: {
        Row: {
          id: string; user_id: string; business_id: string | null; title: string;
          category: string; target_value: number | null; current_value: number;
          unit: string | null; deadline: string | null; status: string; notes: string | null;
          daily_actions: string[] | null; context: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["goals"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["goals"]["Insert"]>;
      };
      workout_logs: {
        Row: {
          id: string; user_id: string; date: string; type: string;
          duration_mins: number | null; completed: boolean; notes: string | null; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["workout_logs"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["workout_logs"]["Insert"]>;
      };
      daily_checkins: {
        Row: {
          id: string; user_id: string; date: string; energy_level: number | null;
          sleep_hours: number | null; mood: number | null; weight_kg: number | null;
          notes: string | null; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["daily_checkins"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["daily_checkins"]["Insert"]>;
      };
      tasks: {
        Row: {
          id: string; user_id: string; business_id: string | null; goal_id: string | null;
          title: string; description: string | null; priority: string; due_date: string | null;
          status: string; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tasks"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
      };
      ai_insights: {
        Row: {
          id: string; user_id: string; date: string; briefing_text: string | null;
          top_actions: Json; goal_analysis: Json; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_insights"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["ai_insights"]["Insert"]>;
      };
    };
  };
}

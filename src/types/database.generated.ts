export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["admin_action_type"]
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          moderation_queue_id: string | null
          reason: string | null
          report_id: string | null
          target_id: string | null
          target_type: Database["public"]["Enums"]["moderation_target_type"]
          target_user_id: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["admin_action_type"]
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          moderation_queue_id?: string | null
          reason?: string | null
          report_id?: string | null
          target_id?: string | null
          target_type: Database["public"]["Enums"]["moderation_target_type"]
          target_user_id?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["admin_action_type"]
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          moderation_queue_id?: string | null
          reason?: string | null
          report_id?: string | null
          target_id?: string | null
          target_type?: Database["public"]["Enums"]["moderation_target_type"]
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_moderation_queue_id_fkey"
            columns: ["moderation_queue_id"]
            isOneToOne: false
            referencedRelation: "moderation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          created_at: string
          id: string
          invited_by_user_id: string | null
          is_telegram_premium: boolean
          language_code: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          invited_by_user_id?: string | null
          is_telegram_premium?: boolean
          language_code?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by_user_id?: string | null
          is_telegram_premium?: boolean
          language_code?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      bans: {
        Row: {
          ban_type: Database["public"]["Enums"]["ban_type"]
          banned_by_user_id: string | null
          created_at: string
          ends_at: string | null
          id: string
          lifted_at: string | null
          lifted_by_user_id: string | null
          metadata: Json
          moderation_queue_id: string | null
          public_message: string | null
          reason: string
          report_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["ban_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ban_type?: Database["public"]["Enums"]["ban_type"]
          banned_by_user_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          lifted_at?: string | null
          lifted_by_user_id?: string | null
          metadata?: Json
          moderation_queue_id?: string | null
          public_message?: string | null
          reason: string
          report_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["ban_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ban_type?: Database["public"]["Enums"]["ban_type"]
          banned_by_user_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          lifted_at?: string | null
          lifted_by_user_id?: string | null
          metadata?: Json
          moderation_queue_id?: string | null
          public_message?: string | null
          reason?: string
          report_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["ban_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bans_banned_by_user_id_fkey"
            columns: ["banned_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bans_lifted_by_user_id_fkey"
            columns: ["lifted_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bans_moderation_queue_id_fkey"
            columns: ["moderation_queue_id"]
            isOneToOne: false
            referencedRelation: "moderation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bans_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_user_id: string
          blocker_user_id: string
          created_at: string
          reason: string | null
        }
        Insert: {
          blocked_user_id: string
          blocker_user_id: string
          created_at?: string
          reason?: string | null
        }
        Update: {
          blocked_user_id?: string
          blocker_user_id?: string
          created_at?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_user_id_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_user_id_fkey"
            columns: ["blocker_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_events: {
        Row: {
          actor_user_id: string | null
          boost_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["boost_event_type"]
          id: string
          payload: Json
          user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          boost_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["boost_event_type"]
          id?: string
          payload?: Json
          user_id: string
        }
        Update: {
          actor_user_id?: string | null
          boost_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["boost_event_type"]
          id?: string
          payload?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_events_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "boosts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_products: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          multiplier: number
          name: string
          price_stars: number
          price_ton: number | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          multiplier: number
          name: string
          price_stars: number
          price_ton?: number | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          multiplier?: number
          name?: string
          price_stars?: number
          price_ton?: number | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      boosts: {
        Row: {
          boost_product_id: string | null
          boost_type: string
          city_name: string | null
          country_code: string | null
          created_at: string
          ends_at: string
          geohash_prefix: string | null
          id: string
          impression_count: number
          like_count: number
          match_count: number
          metadata: Json
          multiplier: number
          paused_at: string | null
          payment_id: string | null
          profile_view_count: number
          remaining_seconds: number | null
          source_surface:
            | Database["public"]["Enums"]["discovery_surface"]
            | null
          starts_at: string
          status: Database["public"]["Enums"]["boost_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          boost_product_id?: string | null
          boost_type?: string
          city_name?: string | null
          country_code?: string | null
          created_at?: string
          ends_at: string
          geohash_prefix?: string | null
          id?: string
          impression_count?: number
          like_count?: number
          match_count?: number
          metadata?: Json
          multiplier?: number
          paused_at?: string | null
          payment_id?: string | null
          profile_view_count?: number
          remaining_seconds?: number | null
          source_surface?:
            | Database["public"]["Enums"]["discovery_surface"]
            | null
          starts_at?: string
          status?: Database["public"]["Enums"]["boost_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          boost_product_id?: string | null
          boost_type?: string
          city_name?: string | null
          country_code?: string | null
          created_at?: string
          ends_at?: string
          geohash_prefix?: string | null
          id?: string
          impression_count?: number
          like_count?: number
          match_count?: number
          metadata?: Json
          multiplier?: number
          paused_at?: string | null
          payment_id?: string | null
          profile_view_count?: number
          remaining_seconds?: number | null
          source_surface?:
            | Database["public"]["Enums"]["discovery_surface"]
            | null
          starts_at?: string
          status?: Database["public"]["Enums"]["boost_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boosts_boost_product_id_fkey"
            columns: ["boost_product_id"]
            isOneToOne: false
            referencedRelation: "boost_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boosts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boosts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          admin1_code: string | null
          admin1_name: string | null
          ascii_name: string | null
          country_code: string
          created_at: string
          geohash_prefix: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          population: number | null
          search_keywords: string[]
          timezone: string | null
          updated_at: string
        }
        Insert: {
          admin1_code?: string | null
          admin1_name?: string | null
          ascii_name?: string | null
          country_code: string
          created_at?: string
          geohash_prefix?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          population?: number | null
          search_keywords?: string[]
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          admin1_code?: string | null
          admin1_name?: string | null
          ascii_name?: string | null
          country_code?: string
          created_at?: string
          geohash_prefix?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          population?: number | null
          search_keywords?: string[]
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          last_activity_at: string
          last_read_at: string | null
          last_read_message_id: string | null
          last_read_sequence: number
          notifications_muted_until: string | null
          unread_count: number
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_activity_at?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          last_read_sequence?: number
          notifications_muted_until?: string | null
          unread_count?: number
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_activity_at?: string
          last_read_at?: string | null
          last_read_message_id?: string | null
          last_read_sequence?: number
          notifications_muted_until?: string | null
          unread_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_last_read_message_id_fkey"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          last_message_sequence: number
          match_id: string
          status: Database["public"]["Enums"]["conversation_status"]
          updated_at: string
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_sequence?: number
          match_id: string
          status?: Database["public"]["Enums"]["conversation_status"]
          updated_at?: string
          user_a_id: string
          user_b_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_sequence?: number
          match_id?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          updated_at?: string
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          currency_code: string | null
          emoji_flag: string | null
          is_active: boolean
          iso3: string | null
          name: string
          native_name: string | null
          phone_code: string | null
          region: string | null
          sort_order: number
          subregion: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code?: string | null
          emoji_flag?: string | null
          is_active?: boolean
          iso3?: string | null
          name: string
          native_name?: string | null
          phone_code?: string | null
          region?: string | null
          sort_order?: number
          subregion?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string | null
          emoji_flag?: string | null
          is_active?: boolean
          iso3?: string | null
          name?: string
          native_name?: string | null
          phone_code?: string | null
          region?: string | null
          sort_order?: number
          subregion?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_chemistry_candidates: {
        Row: {
          acted_at: string | null
          card_id: string
          city_name: string | null
          compatibility_score: number
          country_code: string | null
          created_at: string
          distance_km: number | null
          id: string
          match_id: string | null
          metadata: Json
          rank_position: number
          reason_tags: string[]
          reasons: Json
          shared_goals: string[]
          shared_interests: string[]
          shared_languages: string[]
          status: Database["public"]["Enums"]["daily_chemistry_candidate_status"]
          swipe_action_id: string | null
          target_user_id: string
          updated_at: string
          viewed_at: string | null
          viewer_user_id: string
        }
        Insert: {
          acted_at?: string | null
          card_id: string
          city_name?: string | null
          compatibility_score: number
          country_code?: string | null
          created_at?: string
          distance_km?: number | null
          id?: string
          match_id?: string | null
          metadata?: Json
          rank_position: number
          reason_tags?: string[]
          reasons?: Json
          shared_goals?: string[]
          shared_interests?: string[]
          shared_languages?: string[]
          status?: Database["public"]["Enums"]["daily_chemistry_candidate_status"]
          swipe_action_id?: string | null
          target_user_id: string
          updated_at?: string
          viewed_at?: string | null
          viewer_user_id: string
        }
        Update: {
          acted_at?: string | null
          card_id?: string
          city_name?: string | null
          compatibility_score?: number
          country_code?: string | null
          created_at?: string
          distance_km?: number | null
          id?: string
          match_id?: string | null
          metadata?: Json
          rank_position?: number
          reason_tags?: string[]
          reasons?: Json
          shared_goals?: string[]
          shared_interests?: string[]
          shared_languages?: string[]
          status?: Database["public"]["Enums"]["daily_chemistry_candidate_status"]
          swipe_action_id?: string | null
          target_user_id?: string
          updated_at?: string
          viewed_at?: string | null
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_chemistry_candidates_card_viewer_fkey"
            columns: ["card_id", "viewer_user_id"]
            isOneToOne: false
            referencedRelation: "daily_chemistry_cards"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "daily_chemistry_candidates_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_chemistry_candidates_swipe_action_id_fkey"
            columns: ["swipe_action_id"]
            isOneToOne: false
            referencedRelation: "swipe_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_chemistry_candidates_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_chemistry_candidates_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_chemistry_cards: {
        Row: {
          algorithm_version: string
          card_date: string
          completed_at: string | null
          created_at: string
          expires_at: string
          generated_at: string
          id: string
          metadata: Json
          remaining_candidates: number
          seen_at: string | null
          status: Database["public"]["Enums"]["daily_chemistry_card_status"]
          summary: string | null
          total_candidates: number
          updated_at: string
          user_id: string
        }
        Insert: {
          algorithm_version?: string
          card_date?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          generated_at?: string
          id?: string
          metadata?: Json
          remaining_candidates?: number
          seen_at?: string | null
          status?: Database["public"]["Enums"]["daily_chemistry_card_status"]
          summary?: string | null
          total_candidates?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          algorithm_version?: string
          card_date?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          generated_at?: string
          id?: string
          metadata?: Json
          remaining_candidates?: number
          seen_at?: string | null
          status?: Database["public"]["Enums"]["daily_chemistry_card_status"]
          summary?: string | null
          total_candidates?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_chemistry_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      date_idea_bookmarks: {
        Row: {
          created_at: string
          date_idea_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_idea_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_idea_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "date_idea_bookmarks_date_idea_id_fkey"
            columns: ["date_idea_id"]
            isOneToOne: false
            referencedRelation: "date_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "date_idea_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      date_idea_impressions: {
        Row: {
          created_at: string
          date_idea_id: string
          id: string
          position: number | null
          score: number | null
          source_surface:
            | Database["public"]["Enums"]["discovery_surface"]
            | null
          viewer_user_id: string | null
        }
        Insert: {
          created_at?: string
          date_idea_id: string
          id?: string
          position?: number | null
          score?: number | null
          source_surface?:
            | Database["public"]["Enums"]["discovery_surface"]
            | null
          viewer_user_id?: string | null
        }
        Update: {
          created_at?: string
          date_idea_id?: string
          id?: string
          position?: number | null
          score?: number | null
          source_surface?:
            | Database["public"]["Enums"]["discovery_surface"]
            | null
          viewer_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "date_idea_impressions_date_idea_id_fkey"
            columns: ["date_idea_id"]
            isOneToOne: false
            referencedRelation: "date_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "date_idea_impressions_viewer_user_id_fkey"
            columns: ["viewer_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      date_idea_requests: {
        Row: {
          author_user_id: string
          cancelled_at: string | null
          compatibility_score: number | null
          created_at: string
          date_idea_id: string
          decided_at: string | null
          id: string
          idempotency_key: string | null
          message: string | null
          metadata: Json
          requested_at: string
          requester_user_id: string
          response_note: string | null
          status: Database["public"]["Enums"]["date_idea_request_status"]
          updated_at: string
        }
        Insert: {
          author_user_id: string
          cancelled_at?: string | null
          compatibility_score?: number | null
          created_at?: string
          date_idea_id: string
          decided_at?: string | null
          id?: string
          idempotency_key?: string | null
          message?: string | null
          metadata?: Json
          requested_at?: string
          requester_user_id: string
          response_note?: string | null
          status?: Database["public"]["Enums"]["date_idea_request_status"]
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          cancelled_at?: string | null
          compatibility_score?: number | null
          created_at?: string
          date_idea_id?: string
          decided_at?: string | null
          id?: string
          idempotency_key?: string | null
          message?: string | null
          metadata?: Json
          requested_at?: string
          requester_user_id?: string
          response_note?: string | null
          status?: Database["public"]["Enums"]["date_idea_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "date_idea_requests_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "date_idea_requests_date_idea_id_fkey"
            columns: ["date_idea_id"]
            isOneToOne: false
            referencedRelation: "date_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "date_idea_requests_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      date_ideas: {
        Row: {
          accepted_count: number
          author_user_id: string
          body: string | null
          city_name: string | null
          country_code: string | null
          created_at: string
          expires_at: string
          geohash_prefix: string | null
          id: string
          idea_type: Database["public"]["Enums"]["date_idea_type"]
          interest_tags: string[]
          is_exact_location_hidden: boolean
          language_codes: string[]
          looking_for_genders: string[]
          max_age: number | null
          max_requests: number
          metadata: Json
          min_age: number | null
          premium_only: boolean
          relationship_goals: string[]
          request_count: number
          scheduled_for: string | null
          status: Database["public"]["Enums"]["date_idea_status"]
          title: string
          updated_at: string
          venue_hint: string | null
          venue_name: string | null
          verified_only: boolean
          view_count: number
          visibility: Database["public"]["Enums"]["date_idea_visibility"]
        }
        Insert: {
          accepted_count?: number
          author_user_id: string
          body?: string | null
          city_name?: string | null
          country_code?: string | null
          created_at?: string
          expires_at?: string
          geohash_prefix?: string | null
          id?: string
          idea_type?: Database["public"]["Enums"]["date_idea_type"]
          interest_tags?: string[]
          is_exact_location_hidden?: boolean
          language_codes?: string[]
          looking_for_genders?: string[]
          max_age?: number | null
          max_requests?: number
          metadata?: Json
          min_age?: number | null
          premium_only?: boolean
          relationship_goals?: string[]
          request_count?: number
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["date_idea_status"]
          title: string
          updated_at?: string
          venue_hint?: string | null
          venue_name?: string | null
          verified_only?: boolean
          view_count?: number
          visibility?: Database["public"]["Enums"]["date_idea_visibility"]
        }
        Update: {
          accepted_count?: number
          author_user_id?: string
          body?: string | null
          city_name?: string | null
          country_code?: string | null
          created_at?: string
          expires_at?: string
          geohash_prefix?: string | null
          id?: string
          idea_type?: Database["public"]["Enums"]["date_idea_type"]
          interest_tags?: string[]
          is_exact_location_hidden?: boolean
          language_codes?: string[]
          looking_for_genders?: string[]
          max_age?: number | null
          max_requests?: number
          metadata?: Json
          min_age?: number | null
          premium_only?: boolean
          relationship_goals?: string[]
          request_count?: number
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["date_idea_status"]
          title?: string
          updated_at?: string
          venue_hint?: string | null
          venue_name?: string | null
          verified_only?: boolean
          view_count?: number
          visibility?: Database["public"]["Enums"]["date_idea_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "date_ideas_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          accepted_at: string | null
          created_at: string
          follower_user_id: string
          following_user_id: string
          muted_at: string | null
          status: Database["public"]["Enums"]["follow_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          follower_user_id: string
          following_user_id: string
          muted_at?: string | null
          status?: Database["public"]["Enums"]["follow_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          follower_user_id?: string
          following_user_id?: string
          muted_at?: string | null
          status?: Database["public"]["Enums"]["follow_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_user_id_fkey"
            columns: ["follower_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_user_id_fkey"
            columns: ["following_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_assets: {
        Row: {
          animation_metadata: Json
          asset_type: Database["public"]["Enums"]["gift_asset_type"]
          created_at: string
          id: string
          public_url: string
          storage_path: string
          thumbnail_url: string | null
        }
        Insert: {
          animation_metadata?: Json
          asset_type: Database["public"]["Enums"]["gift_asset_type"]
          created_at?: string
          id?: string
          public_url: string
          storage_path: string
          thumbnail_url?: string | null
        }
        Update: {
          animation_metadata?: Json
          asset_type?: Database["public"]["Enums"]["gift_asset_type"]
          created_at?: string
          id?: string
          public_url?: string
          storage_path?: string
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      gift_categories: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      gifts: {
        Row: {
          asset_id: string
          available_from: string | null
          available_until: string | null
          category_id: string
          created_at: string
          description: string | null
          gift_effect: string | null
          id: string
          is_active: boolean
          limited_quantity: number | null
          metadata: Json
          name: string
          price_stars: number
          price_ton: number | null
          profile_aura_effect: string | null
          rarity: Database["public"]["Enums"]["gift_rarity"]
          slug: string
        }
        Insert: {
          asset_id: string
          available_from?: string | null
          available_until?: string | null
          category_id: string
          created_at?: string
          description?: string | null
          gift_effect?: string | null
          id?: string
          is_active?: boolean
          limited_quantity?: number | null
          metadata?: Json
          name: string
          price_stars?: number
          price_ton?: number | null
          profile_aura_effect?: string | null
          rarity?: Database["public"]["Enums"]["gift_rarity"]
          slug: string
        }
        Update: {
          asset_id?: string
          available_from?: string | null
          available_until?: string | null
          category_id?: string
          created_at?: string
          description?: string | null
          gift_effect?: string | null
          id?: string
          is_active?: boolean
          limited_quantity?: number | null
          metadata?: Json
          name?: string
          price_stars?: number
          price_ton?: number | null
          profile_aura_effect?: string | null
          rarity?: Database["public"]["Enums"]["gift_rarity"]
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "gifts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "gift_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "gift_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          id: string
          last_interaction_at: string
          matched_at: string
          source: Database["public"]["Enums"]["match_source"]
          status: Database["public"]["Enums"]["match_status"]
          unmatched_at: string | null
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          id?: string
          last_interaction_at?: string
          matched_at?: string
          source?: Database["public"]["Enums"]["match_source"]
          status?: Database["public"]["Enums"]["match_status"]
          unmatched_at?: string | null
          user_a_id: string
          user_b_id: string
        }
        Update: {
          id?: string
          last_interaction_at?: string
          matched_at?: string
          source?: Database["public"]["Enums"]["match_source"]
          status?: Database["public"]["Enums"]["match_status"]
          unmatched_at?: string | null
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          client_message_id: string
          conversation_id: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          message_type: Database["public"]["Enums"]["message_type"]
          metadata: Json
          reply_to_message_id: string | null
          sender_user_id: string
          sent_at: string
          sequence: number
        }
        Insert: {
          body: string
          client_message_id: string
          conversation_id: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          metadata?: Json
          reply_to_message_id?: string | null
          sender_user_id: string
          sent_at?: string
          sequence: number
        }
        Update: {
          body?: string
          client_message_id?: string
          conversation_id?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          metadata?: Json
          reply_to_message_id?: string | null
          sender_user_id?: string
          sent_at?: string
          sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          assigned_at: string | null
          assigned_to_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          notes: string | null
          opened_at: string
          priority: number
          reason: string | null
          report_id: string | null
          reported_user_id: string | null
          reporter_user_id: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["moderation_queue_status"]
          target_id: string | null
          target_type: Database["public"]["Enums"]["moderation_target_type"]
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          opened_at?: string
          priority?: number
          reason?: string | null
          report_id?: string | null
          reported_user_id?: string | null
          reporter_user_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["moderation_queue_status"]
          target_id?: string | null
          target_type: Database["public"]["Enums"]["moderation_target_type"]
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          notes?: string | null
          opened_at?: string
          priority?: number
          reason?: string | null
          report_id?: string | null
          reported_user_id?: string | null
          reporter_user_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["moderation_queue_status"]
          target_id?: string | null
          target_type?: Database["public"]["Enums"]["moderation_target_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_queue_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_queue_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_stars: number | null
          amount_ton: number | null
          created_at: string
          currency: string | null
          failed_reason: string | null
          granted_at: string | null
          id: string
          invoice_payload: string
          product_id: string | null
          product_type: Database["public"]["Enums"]["payment_product_type"]
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id: string | null
          raw_request: Json
          raw_webhook: Json
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          amount_stars?: number | null
          amount_ton?: number | null
          created_at?: string
          currency?: string | null
          failed_reason?: string | null
          granted_at?: string | null
          id?: string
          invoice_payload: string
          product_id?: string | null
          product_type: Database["public"]["Enums"]["payment_product_type"]
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id?: string | null
          raw_request?: Json
          raw_webhook?: Json
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          amount_stars?: number | null
          amount_ton?: number | null
          created_at?: string
          currency?: string | null
          failed_reason?: string | null
          granted_at?: string | null
          id?: string
          invoice_payload?: string
          product_id?: string | null
          product_type?: Database["public"]["Enums"]["payment_product_type"]
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id?: string | null
          raw_request?: Json
          raw_webhook?: Json
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_moderation_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          moderation_queue_id: string | null
          new_status: Database["public"]["Enums"]["moderation_state"]
          photo_id: string
          previous_status:
            | Database["public"]["Enums"]["moderation_state"]
            | null
          reason: string | null
          user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          moderation_queue_id?: string | null
          new_status: Database["public"]["Enums"]["moderation_state"]
          photo_id: string
          previous_status?:
            | Database["public"]["Enums"]["moderation_state"]
            | null
          reason?: string | null
          user_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          moderation_queue_id?: string | null
          new_status?: Database["public"]["Enums"]["moderation_state"]
          photo_id?: string
          previous_status?:
            | Database["public"]["Enums"]["moderation_state"]
            | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_moderation_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_moderation_events_moderation_queue_id_fkey"
            columns: ["moderation_queue_id"]
            isOneToOne: false
            referencedRelation: "moderation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_moderation_events_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "profile_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_moderation_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_moderation_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          moderation_queue_id: string | null
          new_status: Database["public"]["Enums"]["moderation_state"]
          post_id: string
          previous_status:
            | Database["public"]["Enums"]["moderation_state"]
            | null
          reason: string | null
          user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          moderation_queue_id?: string | null
          new_status: Database["public"]["Enums"]["moderation_state"]
          post_id: string
          previous_status?:
            | Database["public"]["Enums"]["moderation_state"]
            | null
          reason?: string | null
          user_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          moderation_queue_id?: string | null
          new_status?: Database["public"]["Enums"]["moderation_state"]
          post_id?: string
          previous_status?:
            | Database["public"]["Enums"]["moderation_state"]
            | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_moderation_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_moderation_events_moderation_queue_id_fkey"
            columns: ["moderation_queue_id"]
            isOneToOne: false
            referencedRelation: "moderation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_moderation_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_moderation_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_user_id: string
          body: string
          city_name: string | null
          client_post_id: string | null
          country_code: string | null
          created_at: string
          deleted_at: string | null
          geohash_prefix: string | null
          id: string
          like_count: number
          poll_options: Json | null
          post_type: Database["public"]["Enums"]["post_type"]
          reply_count: number
          reply_to_post_id: string | null
          repost_count: number
          repost_of_post_id: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["post_visibility"]
        }
        Insert: {
          author_user_id: string
          body: string
          city_name?: string | null
          client_post_id?: string | null
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          geohash_prefix?: string | null
          id?: string
          like_count?: number
          poll_options?: Json | null
          post_type?: Database["public"]["Enums"]["post_type"]
          reply_count?: number
          reply_to_post_id?: string | null
          repost_count?: number
          repost_of_post_id?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Update: {
          author_user_id?: string
          body?: string
          city_name?: string | null
          client_post_id?: string | null
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          geohash_prefix?: string | null
          id?: string
          like_count?: number
          poll_options?: Json | null
          post_type?: Database["public"]["Enums"]["post_type"]
          reply_count?: number
          reply_to_post_id?: string | null
          repost_count?: number
          repost_of_post_id?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_reply_to_post_id_fkey"
            columns: ["reply_to_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_repost_of_post_id_fkey"
            columns: ["repost_of_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_feature_usage: {
        Row: {
          created_at: string
          feature_key: string
          id: string
          limit_count: number | null
          metadata: Json
          period_end: string | null
          period_start: string
          reset_at: string | null
          subscription_id: string | null
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          id?: string
          limit_count?: number | null
          metadata?: Json
          period_end?: string | null
          period_start?: string
          reset_at?: string | null
          subscription_id?: string | null
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          id?: string
          limit_count?: number | null
          metadata?: Json
          period_end?: string | null
          period_start?: string
          reset_at?: string | null
          subscription_id?: string | null
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_feature_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_premium_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_feature_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_plans: {
        Row: {
          created_at: string
          currency: string | null
          description: string | null
          duration_days: number | null
          features: Json
          id: string
          interval: Database["public"]["Enums"]["premium_plan_interval"]
          is_active: boolean
          limits: Json
          name: string
          price_stars: number | null
          price_ton: number | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_days?: number | null
          features?: Json
          id?: string
          interval?: Database["public"]["Enums"]["premium_plan_interval"]
          is_active?: boolean
          limits?: Json
          name: string
          price_stars?: number | null
          price_ton?: number | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          duration_days?: number | null
          features?: Json
          id?: string
          interval?: Database["public"]["Enums"]["premium_plan_interval"]
          is_active?: boolean
          limits?: Json
          name?: string
          price_stars?: number | null
          price_ton?: number | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profile_aura_effects: {
        Row: {
          animation_metadata: Json
          aura_key: string
          created_at: string
          css_tokens: Json
          description: string | null
          duration_hours: number | null
          id: string
          is_active: boolean
          is_permanent: boolean
          metadata: Json
          name: string
          preview_url: string | null
          required_gift_count: number | null
          required_gift_id: string | null
          required_min_gift_price_stars: number | null
          required_min_total_gift_value_stars: number | null
          required_rarity: Database["public"]["Enums"]["gift_rarity"] | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          animation_metadata?: Json
          aura_key: string
          created_at?: string
          css_tokens?: Json
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean
          is_permanent?: boolean
          metadata?: Json
          name: string
          preview_url?: string | null
          required_gift_count?: number | null
          required_gift_id?: string | null
          required_min_gift_price_stars?: number | null
          required_min_total_gift_value_stars?: number | null
          required_rarity?: Database["public"]["Enums"]["gift_rarity"] | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          animation_metadata?: Json
          aura_key?: string
          created_at?: string
          css_tokens?: Json
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean
          is_permanent?: boolean
          metadata?: Json
          name?: string
          preview_url?: string | null
          required_gift_count?: number | null
          required_gift_id?: string | null
          required_min_gift_price_stars?: number | null
          required_min_total_gift_value_stars?: number | null
          required_rarity?: Database["public"]["Enums"]["gift_rarity"] | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_aura_effects_required_gift_id_fkey"
            columns: ["required_gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_aura_events: {
        Row: {
          actor_user_id: string | null
          aura_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["profile_aura_event_type"]
          id: string
          metadata: Json
          source_gift_id: string | null
          source_payment_id: string | null
          source_sent_gift_id: string | null
          user_aura_id: string
          user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          aura_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["profile_aura_event_type"]
          id?: string
          metadata?: Json
          source_gift_id?: string | null
          source_payment_id?: string | null
          source_sent_gift_id?: string | null
          user_aura_id: string
          user_id: string
        }
        Update: {
          actor_user_id?: string | null
          aura_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["profile_aura_event_type"]
          id?: string
          metadata?: Json
          source_gift_id?: string | null
          source_payment_id?: string | null
          source_sent_gift_id?: string | null
          user_aura_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_aura_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_aura_events_aura_id_fkey"
            columns: ["aura_id"]
            isOneToOne: false
            referencedRelation: "profile_aura_effects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_aura_events_source_gift_id_fkey"
            columns: ["source_gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_aura_events_source_payment_id_fkey"
            columns: ["source_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_aura_events_source_sent_gift_id_fkey"
            columns: ["source_sent_gift_id"]
            isOneToOne: false
            referencedRelation: "sent_gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_aura_events_user_aura_id_fkey"
            columns: ["user_aura_id"]
            isOneToOne: false
            referencedRelation: "user_profile_auras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_aura_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_photos: {
        Row: {
          blur_hash: string | null
          caption: string | null
          confirmed_at: string | null
          created_at: string
          deleted_at: string | null
          face_check_status: Database["public"]["Enums"]["face_check_status"]
          file_size_bytes: number | null
          height: number | null
          id: string
          is_primary: boolean
          is_private: boolean
          mime_type: string | null
          moderation_status: Database["public"]["Enums"]["moderation_state"]
          public_url: string | null
          sort_order: number
          storage_path: string
          updated_at: string
          upload_expires_at: string | null
          upload_status: string
          user_id: string
          width: number | null
        }
        Insert: {
          blur_hash?: string | null
          caption?: string | null
          confirmed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          face_check_status?: Database["public"]["Enums"]["face_check_status"]
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          is_primary?: boolean
          is_private?: boolean
          mime_type?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_state"]
          public_url?: string | null
          sort_order?: number
          storage_path: string
          updated_at?: string
          upload_expires_at?: string | null
          upload_status?: string
          user_id: string
          width?: number | null
        }
        Update: {
          blur_hash?: string | null
          caption?: string | null
          confirmed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          face_check_status?: Database["public"]["Enums"]["face_check_status"]
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          is_primary?: boolean
          is_private?: boolean
          mime_type?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_state"]
          public_url?: string | null
          sort_order?: number
          storage_path?: string
          updated_at?: string
          upload_expires_at?: string | null
          upload_status?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_stats: {
        Row: {
          follower_count: number
          following_count: number
          gifts_received: number
          likes_received: number
          matches_count: number
          popularity_score: number
          posts_count: number
          profile_completion_score: number
          profile_views: number
          safety_score: number
          updated_at: string
          user_id: string
          video_sessions_count: number
        }
        Insert: {
          follower_count?: number
          following_count?: number
          gifts_received?: number
          likes_received?: number
          matches_count?: number
          popularity_score?: number
          posts_count?: number
          profile_completion_score?: number
          profile_views?: number
          safety_score?: number
          updated_at?: string
          user_id: string
          video_sessions_count?: number
        }
        Update: {
          follower_count?: number
          following_count?: number
          gifts_received?: number
          likes_received?: number
          matches_count?: number
          popularity_score?: number
          posts_count?: number
          profile_completion_score?: number
          profile_views?: number
          safety_score?: number
          updated_at?: string
          user_id?: string
          video_sessions_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "profile_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about_me: string | null
          age_years: number | null
          badges: string[]
          bio: string | null
          birthday: string | null
          city_id: string | null
          city_name: string | null
          country_code: string | null
          created_at: string
          discoverable: boolean
          display_name: string | null
          first_date_idea: string | null
          follow_approval_required: boolean
          fun_fact: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          headline: string | null
          intents: string[]
          interests: string[]
          languages: string[]
          last_active_at: string | null
          looking_for_text: string | null
          mood: string | null
          online_state: Database["public"]["Enums"]["online_state"]
          personality_summary: string | null
          profile_completed_at: string | null
          profile_video_url: string | null
          pronouns: string | null
          public_geohash_prefix: string | null
          relationship_goals: string[]
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["profile_visibility"]
        }
        Insert: {
          about_me?: string | null
          age_years?: number | null
          badges?: string[]
          bio?: string | null
          birthday?: string | null
          city_id?: string | null
          city_name?: string | null
          country_code?: string | null
          created_at?: string
          discoverable?: boolean
          display_name?: string | null
          first_date_idea?: string | null
          follow_approval_required?: boolean
          fun_fact?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          headline?: string | null
          intents?: string[]
          interests?: string[]
          languages?: string[]
          last_active_at?: string | null
          looking_for_text?: string | null
          mood?: string | null
          online_state?: Database["public"]["Enums"]["online_state"]
          personality_summary?: string | null
          profile_completed_at?: string | null
          profile_video_url?: string | null
          pronouns?: string | null
          public_geohash_prefix?: string | null
          relationship_goals?: string[]
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["profile_visibility"]
        }
        Update: {
          about_me?: string | null
          age_years?: number | null
          badges?: string[]
          bio?: string | null
          birthday?: string | null
          city_id?: string | null
          city_name?: string | null
          country_code?: string | null
          created_at?: string
          discoverable?: boolean
          display_name?: string | null
          first_date_idea?: string | null
          follow_approval_required?: boolean
          fun_fact?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          headline?: string | null
          intents?: string[]
          interests?: string[]
          languages?: string[]
          last_active_at?: string | null
          looking_for_text?: string | null
          mood?: string | null
          online_state?: Database["public"]["Enums"]["online_state"]
          personality_summary?: string | null
          profile_completed_at?: string | null
          profile_video_url?: string | null
          pronouns?: string | null
          public_geohash_prefix?: string | null
          relationship_goals?: string[]
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["profile_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_note: string | null
          created_at: string
          decided_at: string | null
          decided_by_user_id: string | null
          details: string | null
          id: string
          post_id: string | null
          profile_photo_id: string | null
          reason: string
          reported_user_id: string | null
          reporter_user_id: string
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
          video_session_id: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by_user_id?: string | null
          details?: string | null
          id?: string
          post_id?: string | null
          profile_photo_id?: string | null
          reason: string
          reported_user_id?: string | null
          reporter_user_id: string
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
          video_session_id?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by_user_id?: string | null
          details?: string | null
          id?: string
          post_id?: string | null
          profile_photo_id?: string | null
          reason?: string
          reported_user_id?: string | null
          reporter_user_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
          video_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_decided_by_user_id_fkey"
            columns: ["decided_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_profile_photo_id_fkey"
            columns: ["profile_photo_id"]
            isOneToOne: false
            referencedRelation: "profile_photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_video_session_id_fkey"
            columns: ["video_session_id"]
            isOneToOne: false
            referencedRelation: "video_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_gifts: {
        Row: {
          context_id: string | null
          context_type: string | null
          gift_id: string
          id: string
          is_public: boolean
          message: string | null
          payment_id: string | null
          receiver_user_id: string
          sender_user_id: string
          sent_at: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          gift_id: string
          id?: string
          is_public?: boolean
          message?: string | null
          payment_id?: string | null
          receiver_user_id: string
          sender_user_id: string
          sent_at?: string
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          gift_id?: string
          id?: string
          is_public?: boolean
          message?: string | null
          payment_id?: string | null
          receiver_user_id?: string
          sender_user_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sent_gifts_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_gifts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_gifts_receiver_user_id_fkey"
            columns: ["receiver_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_gifts_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      super_like_balances: {
        Row: {
          available_count: number
          created_at: string
          lifetime_granted: number
          lifetime_refunded: number
          lifetime_spent: number
          next_refill_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          available_count?: number
          created_at?: string
          lifetime_granted?: number
          lifetime_refunded?: number
          lifetime_spent?: number
          next_refill_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          available_count?: number
          created_at?: string
          lifetime_granted?: number
          lifetime_refunded?: number
          lifetime_spent?: number
          next_refill_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_like_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      super_like_ledger: {
        Row: {
          balance_after: number
          created_at: string
          delta: number
          event_type: Database["public"]["Enums"]["super_like_event_type"]
          expires_at: string | null
          id: string
          metadata: Json
          source_id: string | null
          source_type: string | null
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          delta: number
          event_type: Database["public"]["Enums"]["super_like_event_type"]
          expires_at?: string | null
          id?: string
          metadata?: Json
          source_id?: string | null
          source_type?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          delta?: number
          event_type?: Database["public"]["Enums"]["super_like_event_type"]
          expires_at?: string | null
          id?: string
          metadata?: Json
          source_id?: string | null
          source_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_like_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      swipe_actions: {
        Row: {
          action_sequence: number
          action_type: Database["public"]["Enums"]["swipe_action_type"]
          actor_user_id: string
          created_at: string
          id: string
          idempotency_key: string | null
          source_surface: Database["public"]["Enums"]["discovery_surface"]
          target_user_id: string
          undoes_action_id: string | null
          undone_at: string | null
        }
        Insert: {
          action_sequence?: never
          action_type: Database["public"]["Enums"]["swipe_action_type"]
          actor_user_id: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          source_surface?: Database["public"]["Enums"]["discovery_surface"]
          target_user_id: string
          undoes_action_id?: string | null
          undone_at?: string | null
        }
        Update: {
          action_sequence?: never
          action_type?: Database["public"]["Enums"]["swipe_action_type"]
          actor_user_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string | null
          source_surface?: Database["public"]["Enums"]["discovery_surface"]
          target_user_id?: string
          undoes_action_id?: string | null
          undone_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "swipe_actions_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipe_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipe_actions_undoes_action_id_fkey"
            columns: ["undoes_action_id"]
            isOneToOne: false
            referencedRelation: "swipe_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      ton_transactions: {
        Row: {
          amount_ton: number
          comment: string | null
          confirmed_at: string | null
          created_at: string
          failed_reason: string | null
          fee_ton: number | null
          from_address: string | null
          id: string
          lt: string | null
          network: Database["public"]["Enums"]["wallet_network"]
          payload: string | null
          payment_id: string | null
          raw_transaction: Json
          status: Database["public"]["Enums"]["ton_transaction_status"]
          to_address: string | null
          transaction_type: Database["public"]["Enums"]["ton_transaction_type"]
          tx_hash: string | null
          updated_at: string
          user_id: string | null
          wallet_id: string | null
        }
        Insert: {
          amount_ton: number
          comment?: string | null
          confirmed_at?: string | null
          created_at?: string
          failed_reason?: string | null
          fee_ton?: number | null
          from_address?: string | null
          id?: string
          lt?: string | null
          network?: Database["public"]["Enums"]["wallet_network"]
          payload?: string | null
          payment_id?: string | null
          raw_transaction?: Json
          status?: Database["public"]["Enums"]["ton_transaction_status"]
          to_address?: string | null
          transaction_type: Database["public"]["Enums"]["ton_transaction_type"]
          tx_hash?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount_ton?: number
          comment?: string | null
          confirmed_at?: string | null
          created_at?: string
          failed_reason?: string | null
          fee_ton?: number | null
          from_address?: string | null
          id?: string
          lt?: string | null
          network?: Database["public"]["Enums"]["wallet_network"]
          payload?: string | null
          payment_id?: string | null
          raw_transaction?: Json
          status?: Database["public"]["Enums"]["ton_transaction_status"]
          to_address?: string | null
          transaction_type?: Database["public"]["Enums"]["ton_transaction_type"]
          tx_hash?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ton_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ton_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ton_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      ton_webhooks: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          provider_event_id: string | null
          received_at: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider?: string
          provider_event_id?: string | null
          received_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          provider_event_id?: string | null
          received_at?: string
          status?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          payload: Json
          read_at: string | null
          seen_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          payload?: Json
          read_at?: string | null
          seen_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          payload?: Json
          read_at?: string | null
          seen_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_premium_subscriptions: {
        Row: {
          auto_renew: boolean
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string
          expires_at: string | null
          grace_ends_at: string | null
          id: string
          metadata: Json
          payment_id: string | null
          plan_id: string
          provider: Database["public"]["Enums"]["payment_provider"] | null
          provider_subscription_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["premium_subscription_status"]
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          expires_at?: string | null
          grace_ends_at?: string | null
          id?: string
          metadata?: Json
          payment_id?: string | null
          plan_id: string
          provider?: Database["public"]["Enums"]["payment_provider"] | null
          provider_subscription_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["premium_subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          expires_at?: string | null
          grace_ends_at?: string | null
          id?: string
          metadata?: Json
          payment_id?: string | null
          plan_id?: string
          provider?: Database["public"]["Enums"]["payment_provider"] | null
          provider_subscription_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["premium_subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_premium_subscriptions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_premium_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "premium_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_premium_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile_auras: {
        Row: {
          activated_at: string | null
          aura_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          metadata: Json
          revoked_at: string | null
          source_gift_id: string | null
          source_payment_id: string | null
          source_sent_gift_id: string | null
          status: Database["public"]["Enums"]["profile_aura_status"]
          unlock_source: Database["public"]["Enums"]["profile_aura_unlock_source"]
          unlocked_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          aura_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          revoked_at?: string | null
          source_gift_id?: string | null
          source_payment_id?: string | null
          source_sent_gift_id?: string | null
          status?: Database["public"]["Enums"]["profile_aura_status"]
          unlock_source?: Database["public"]["Enums"]["profile_aura_unlock_source"]
          unlocked_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          aura_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          revoked_at?: string | null
          source_gift_id?: string | null
          source_payment_id?: string | null
          source_sent_gift_id?: string | null
          status?: Database["public"]["Enums"]["profile_aura_status"]
          unlock_source?: Database["public"]["Enums"]["profile_aura_unlock_source"]
          unlocked_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profile_auras_aura_id_fkey"
            columns: ["aura_id"]
            isOneToOne: false
            referencedRelation: "profile_aura_effects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profile_auras_source_gift_id_fkey"
            columns: ["source_gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profile_auras_source_payment_id_fkey"
            columns: ["source_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profile_auras_source_sent_gift_id_fkey"
            columns: ["source_sent_gift_id"]
            isOneToOne: false
            referencedRelation: "sent_gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profile_auras_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_restrictions: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          ends_at: string | null
          id: string
          lifted_at: string | null
          lifted_by_user_id: string | null
          metadata: Json
          moderation_queue_id: string | null
          public_message: string | null
          reason: string | null
          report_id: string | null
          restriction_type: Database["public"]["Enums"]["user_restriction_type"]
          starts_at: string
          status: Database["public"]["Enums"]["user_restriction_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          ends_at?: string | null
          id?: string
          lifted_at?: string | null
          lifted_by_user_id?: string | null
          metadata?: Json
          moderation_queue_id?: string | null
          public_message?: string | null
          reason?: string | null
          report_id?: string | null
          restriction_type: Database["public"]["Enums"]["user_restriction_type"]
          starts_at?: string
          status?: Database["public"]["Enums"]["user_restriction_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          ends_at?: string | null
          id?: string
          lifted_at?: string | null
          lifted_by_user_id?: string | null
          metadata?: Json
          moderation_queue_id?: string | null
          public_message?: string | null
          reason?: string | null
          report_id?: string | null
          restriction_type?: Database["public"]["Enums"]["user_restriction_type"]
          starts_at?: string
          status?: Database["public"]["Enums"]["user_restriction_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_restrictions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_restrictions_lifted_by_user_id_fkey"
            columns: ["lifted_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_restrictions_moderation_queue_id_fkey"
            columns: ["moderation_queue_id"]
            isOneToOne: false
            referencedRelation: "moderation_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_restrictions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_restrictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          created_at: string
          disconnected_at: string | null
          id: string
          is_primary: boolean
          last_connected_at: string
          metadata: Json
          network: Database["public"]["Enums"]["wallet_network"]
          status: Database["public"]["Enums"]["wallet_status"]
          updated_at: string
          user_id: string
          verified_at: string | null
          wallet_address: string
          wallet_app: string | null
        }
        Insert: {
          created_at?: string
          disconnected_at?: string | null
          id?: string
          is_primary?: boolean
          last_connected_at?: string
          metadata?: Json
          network?: Database["public"]["Enums"]["wallet_network"]
          status?: Database["public"]["Enums"]["wallet_status"]
          updated_at?: string
          user_id: string
          verified_at?: string | null
          wallet_address: string
          wallet_app?: string | null
        }
        Update: {
          created_at?: string
          disconnected_at?: string | null
          id?: string
          is_primary?: boolean
          last_connected_at?: string
          metadata?: Json
          network?: Database["public"]["Enums"]["wallet_network"]
          status?: Database["public"]["Enums"]["wallet_status"]
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          wallet_address?: string
          wallet_app?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      video_queue_entries: {
        Row: {
          cancelled_at: string | null
          city_name: string
          country_code: string
          created_at: string
          expires_at: string
          geohash_prefix: string | null
          id: string
          interests: string[]
          joined_at: string
          languages: string[]
          matched_at: string | null
          matched_session_id: string | null
          metadata: Json
          mode: Database["public"]["Enums"]["video_mode"]
          status: Database["public"]["Enums"]["video_queue_status"]
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          city_name: string
          country_code: string
          created_at?: string
          expires_at?: string
          geohash_prefix?: string | null
          id?: string
          interests?: string[]
          joined_at?: string
          languages?: string[]
          matched_at?: string | null
          matched_session_id?: string | null
          metadata?: Json
          mode: Database["public"]["Enums"]["video_mode"]
          status?: Database["public"]["Enums"]["video_queue_status"]
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          city_name?: string
          country_code?: string
          created_at?: string
          expires_at?: string
          geohash_prefix?: string | null
          id?: string
          interests?: string[]
          joined_at?: string
          languages?: string[]
          matched_at?: string | null
          matched_session_id?: string | null
          metadata?: Json
          mode?: Database["public"]["Enums"]["video_mode"]
          status?: Database["public"]["Enums"]["video_queue_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_queue_entries_matched_session_id_fkey"
            columns: ["matched_session_id"]
            isOneToOne: false
            referencedRelation: "video_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_queue_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      video_report_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          reason: string | null
          report_id: string | null
          reported_user_id: string | null
          reporter_user_id: string | null
          video_session_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          reason?: string | null
          report_id?: string | null
          reported_user_id?: string | null
          reporter_user_id?: string | null
          video_session_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          reason?: string | null
          report_id?: string | null
          reported_user_id?: string | null
          reporter_user_id?: string | null
          video_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_report_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_report_events_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_report_events_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_report_events_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_report_events_video_session_id_fkey"
            columns: ["video_session_id"]
            isOneToOne: false
            referencedRelation: "video_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      video_session_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          video_session_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          video_session_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          video_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_session_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_session_events_video_session_id_fkey"
            columns: ["video_session_id"]
            isOneToOne: false
            referencedRelation: "video_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      video_session_participants: {
        Row: {
          joined_at: string | null
          last_seen_at: string
          left_at: string | null
          matched_at: string
          position: number
          ready_at: string | null
          state: Database["public"]["Enums"]["video_participant_state"]
          user_id: string
          video_session_id: string
        }
        Insert: {
          joined_at?: string | null
          last_seen_at?: string
          left_at?: string | null
          matched_at?: string
          position: number
          ready_at?: string | null
          state?: Database["public"]["Enums"]["video_participant_state"]
          user_id: string
          video_session_id: string
        }
        Update: {
          joined_at?: string | null
          last_seen_at?: string
          left_at?: string | null
          matched_at?: string
          position?: number
          ready_at?: string | null
          state?: Database["public"]["Enums"]["video_participant_state"]
          user_id?: string
          video_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_session_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_session_participants_video_session_id_fkey"
            columns: ["video_session_id"]
            isOneToOne: false
            referencedRelation: "video_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      video_session_signals: {
        Row: {
          client_signal_id: string
          created_at: string
          expires_at: string
          id: string
          payload: Json
          recipient_user_id: string
          sender_user_id: string
          signal_type: Database["public"]["Enums"]["video_signal_type"]
          video_session_id: string
        }
        Insert: {
          client_signal_id: string
          created_at?: string
          expires_at?: string
          id?: string
          payload: Json
          recipient_user_id: string
          sender_user_id: string
          signal_type: Database["public"]["Enums"]["video_signal_type"]
          video_session_id: string
        }
        Update: {
          client_signal_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          payload?: Json
          recipient_user_id?: string
          sender_user_id?: string
          signal_type?: Database["public"]["Enums"]["video_signal_type"]
          video_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_session_signals_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_session_signals_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_session_signals_video_session_id_fkey"
            columns: ["video_session_id"]
            isOneToOne: false
            referencedRelation: "video_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      video_sessions: {
        Row: {
          algorithm_version: string | null
          city_name: string | null
          connected_at: string | null
          connection_expires_at: string | null
          country_code: string | null
          created_at: string
          end_reason: string | null
          ended_at: string | null
          ended_by_user_id: string | null
          geohash_prefix: string | null
          id: string
          last_activity_at: string
          match_scope: string | null
          mode: Database["public"]["Enums"]["video_mode"]
          status: Database["public"]["Enums"]["video_session_status"]
        }
        Insert: {
          algorithm_version?: string | null
          city_name?: string | null
          connected_at?: string | null
          connection_expires_at?: string | null
          country_code?: string | null
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          ended_by_user_id?: string | null
          geohash_prefix?: string | null
          id?: string
          last_activity_at?: string
          match_scope?: string | null
          mode?: Database["public"]["Enums"]["video_mode"]
          status?: Database["public"]["Enums"]["video_session_status"]
        }
        Update: {
          algorithm_version?: string | null
          city_name?: string | null
          connected_at?: string | null
          connection_expires_at?: string | null
          country_code?: string | null
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          ended_by_user_id?: string | null
          geohash_prefix?: string | null
          id?: string
          last_activity_at?: string
          match_scope?: string | null
          mode?: Database["public"]["Enums"]["video_mode"]
          status?: Database["public"]["Enums"]["video_session_status"]
        }
        Relationships: [
          {
            foreignKeyName: "video_sessions_ended_by_user_id_fkey"
            columns: ["ended_by_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profile_cards: {
        Row: {
          age_years: number | null
          badges: string[] | null
          bio: string | null
          city_name: string | null
          country_code: string | null
          discoverable: boolean | null
          display_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          gifts_received: number | null
          headline: string | null
          intents: string[] | null
          interests: string[] | null
          languages: string[] | null
          last_active_at: string | null
          likes_received: number | null
          mood: string | null
          online_state: Database["public"]["Enums"]["online_state"] | null
          popularity_score: number | null
          primary_photo_url: string | null
          profile_completion_score: number | null
          public_geohash_prefix: string | null
          relationship_goals: string[] | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      activate_profile_aura: {
        Args: { p_actor_user_id: string; p_user_aura_id: string }
        Returns: {
          activated_at: string
          aura_id: string
          aura_status: Database["public"]["Enums"]["profile_aura_status"]
          expires_at: string
          user_aura_id: string
        }[]
      }
      assign_moderation_case: {
        Args: {
          p_actor_user_id: string
          p_assignee_user_id?: string
          p_moderation_queue_id: string
        }
        Returns: {
          assigned_at: string
          assigned_to_user_id: string
          moderation_queue_id: string
          status: Database["public"]["Enums"]["moderation_queue_status"]
        }[]
      }
      cancel_video_queue: {
        Args: { p_actor_user_id: string }
        Returns: {
          cancelled: boolean
          queue_entry_id: string
        }[]
      }
      claim_premium_daily_super_likes: {
        Args: { p_actor_user_id: string }
        Returns: {
          already_claimed: boolean
          available_count: number
          granted_count: number
          next_refill_at: string
          subscription_id: string
        }[]
      }
      close_date_idea: {
        Args: { p_actor_user_id: string; p_date_idea_id: string }
        Returns: {
          closed_at: string
          date_idea_id: string
          date_idea_status: Database["public"]["Enums"]["date_idea_status"]
        }[]
      }
      consume_api_rate_limit: {
        Args: {
          p_bucket_key: string
          p_request_limit: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      create_boost_payment_intent: {
        Args: {
          p_boost_product_id: string
          p_idempotency_key: string
          p_invoice_payload: string
          p_provider: Database["public"]["Enums"]["payment_provider"]
          p_user_id: string
        }
        Returns: {
          amount_stars: number
          amount_ton: number
          boost_name: string
          boost_product_id: string
          currency: string
          duration_minutes: number
          expires_at: string
          invoice_payload: string
          multiplier: number
          payment_id: string
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          payment_status: Database["public"]["Enums"]["payment_status"]
        }[]
      }
      create_date_idea: {
        Args: {
          p_actor_user_id: string
          p_body?: string
          p_expires_at?: string
          p_idea_type: Database["public"]["Enums"]["date_idea_type"]
          p_interest_tags?: string[]
          p_language_codes?: string[]
          p_looking_for_genders?: string[]
          p_max_age?: number
          p_max_requests?: number
          p_min_age?: number
          p_relationship_goals?: string[]
          p_scheduled_for?: string
          p_title: string
          p_visibility?: Database["public"]["Enums"]["date_idea_visibility"]
        }
        Returns: {
          created_at: string
          date_idea_id: string
          date_idea_status: Database["public"]["Enums"]["date_idea_status"]
          expires_at: string
          max_requests: number
          scheduled_for: string
        }[]
      }
      create_date_idea_request: {
        Args: {
          p_actor_user_id: string
          p_date_idea_id: string
          p_idempotency_key: string
          p_message: string
        }
        Returns: {
          date_idea_request_id: string
          date_idea_status: Database["public"]["Enums"]["date_idea_status"]
          request_status: Database["public"]["Enums"]["date_idea_request_status"]
          requested_at: string
        }[]
      }
      create_gift_payment_intent: {
        Args: {
          p_gift_id: string
          p_idempotency_key: string
          p_invoice_payload: string
          p_is_public?: boolean
          p_message?: string
          p_provider: Database["public"]["Enums"]["payment_provider"]
          p_receiver_user_id: string
          p_sender_user_id: string
        }
        Returns: {
          amount_stars: number
          amount_ton: number
          currency: string
          expires_at: string
          gift_id: string
          gift_name: string
          invoice_payload: string
          payment_id: string
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          payment_status: Database["public"]["Enums"]["payment_status"]
        }[]
      }
      create_moderation_report: {
        Args: {
          p_details?: string
          p_priority?: number
          p_reason: string
          p_reported_user_id?: string
          p_reporter_user_id: string
          p_target_id: string
          p_target_type: Database["public"]["Enums"]["moderation_target_type"]
        }
        Returns: {
          created_at: string
          moderation_queue_id: string
          queue_status: Database["public"]["Enums"]["moderation_queue_status"]
          report_id: string
          report_status: Database["public"]["Enums"]["report_status"]
        }[]
      }
      create_premium_boost: {
        Args: { p_actor_user_id: string; p_duration_minutes: number }
        Returns: {
          boost_id: string
          boost_status: Database["public"]["Enums"]["boost_status"]
          ends_at: string
          multiplier: number
          remaining_minutes: number
          starts_at: string
        }[]
      }
      create_premium_payment_intent: {
        Args: {
          p_idempotency_key: string
          p_invoice_payload: string
          p_plan_id: string
          p_provider: Database["public"]["Enums"]["payment_provider"]
          p_user_id: string
        }
        Returns: {
          amount_stars: number
          amount_ton: number
          currency: string
          expires_at: string
          invoice_payload: string
          payment_id: string
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          plan_id: string
          plan_name: string
        }[]
      }
      create_social_post: {
        Args: {
          p_actor_user_id: string
          p_body: string
          p_client_post_id?: string
          p_post_type?: Database["public"]["Enums"]["post_type"]
          p_visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Returns: {
          already_created: boolean
          created_at: string
          post_id: string
          post_type: Database["public"]["Enums"]["post_type"]
          visibility: Database["public"]["Enums"]["post_visibility"]
        }[]
      }
      decide_date_idea_request: {
        Args: {
          p_accept: boolean
          p_actor_user_id: string
          p_date_idea_id: string
          p_date_idea_request_id: string
          p_response_note?: string
        }
        Returns: {
          accepted_count: number
          date_idea_request_id: string
          date_idea_status: Database["public"]["Enums"]["date_idea_status"]
          decided_at: string
          request_status: Database["public"]["Enums"]["date_idea_request_status"]
        }[]
      }
      decide_follow_request: {
        Args: {
          p_accept: boolean
          p_actor_user_id: string
          p_follower_user_id: string
        }
        Returns: {
          decided_at: string
          follow_status: Database["public"]["Enums"]["follow_status"]
          follower_user_id: string
        }[]
      }
      decide_moderation_case: {
        Args: {
          p_action_type: Database["public"]["Enums"]["admin_action_type"]
          p_actor_user_id: string
          p_ends_at?: string
          p_moderation_queue_id: string
          p_note?: string
          p_public_message?: string
          p_restriction_type?: Database["public"]["Enums"]["user_restriction_type"]
        }
        Returns: {
          action_id: string
          moderation_queue_id: string
          queue_status: Database["public"]["Enums"]["moderation_queue_status"]
          report_id: string
          report_status: Database["public"]["Enums"]["report_status"]
        }[]
      }
      delete_own_social_post: {
        Args: { p_actor_user_id: string; p_post_id: string }
        Returns: {
          already_deleted: boolean
          deleted_at: string
          post_id: string
        }[]
      }
      end_video_session: {
        Args: {
          p_actor_user_id: string
          p_end_reason: string
          p_video_session_id: string
        }
        Returns: {
          already_ended: boolean
          ended_at: string
          video_session_id: string
          video_session_status: Database["public"]["Enums"]["video_session_status"]
        }[]
      }
      find_user_id_by_telegram_id: {
        Args: { p_telegram_user_id: string }
        Returns: string
      }
      follow_user: {
        Args: { p_actor_user_id: string; p_target_user_id: string }
        Returns: {
          accepted_at: string
          already_following: boolean
          follow_status: Database["public"]["Enums"]["follow_status"]
          following_user_id: string
        }[]
      }
      get_account_gate_state: {
        Args: { p_user_id: string }
        Returns: {
          is_banned: boolean
          profile_completed_at: string
          restrictions: Database["public"]["Enums"]["user_restriction_type"][]
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          user_id: string
        }[]
      }
      get_boost_catalog: {
        Args: never
        Returns: {
          boost_product_id: string
          description: string
          duration_minutes: number
          multiplier: number
          name: string
          price_stars: number
          price_ton: number
          slug: string
          sort_order: number
        }[]
      }
      get_conversation_messages: {
        Args: {
          p_actor_user_id: string
          p_conversation_id: string
          p_cursor_message_id?: string
          p_cursor_sent_at?: string
          p_limit?: number
        }
        Returns: {
          body: string
          edited_at: string
          message_id: string
          message_type: Database["public"]["Enums"]["message_type"]
          reply_to_message_id: string
          sender_user_id: string
          sent_at: string
          sequence: number
        }[]
      }
      get_date_idea_cards: {
        Args: {
          p_actor_user_id: string
          p_city_name?: string
          p_country_code?: string
          p_cursor_created_at?: string
          p_cursor_date_idea_id?: string
          p_geohash_prefix?: string
          p_idea_types?: Database["public"]["Enums"]["date_idea_type"][]
          p_limit?: number
        }
        Returns: {
          accepted_count: number
          author_age_years: number
          author_bio: string
          author_display_name: string
          author_gender: Database["public"]["Enums"]["gender_type"]
          author_headline: string
          author_interests: string[]
          author_languages: string[]
          author_last_active_at: string
          author_online_state: Database["public"]["Enums"]["online_state"]
          author_photo_blur_hash: string
          author_photo_height: number
          author_photo_url: string
          author_photo_width: number
          author_relationship_goals: string[]
          author_user_id: string
          body: string
          bookmarked: boolean
          city_name: string
          country_code: string
          date_idea_id: string
          expires_at: string
          geohash_prefix: string
          idea_type: Database["public"]["Enums"]["date_idea_type"]
          interest_tags: string[]
          language_codes: string[]
          looking_for_genders: string[]
          max_age: number
          max_requests: number
          min_age: number
          my_request_status: Database["public"]["Enums"]["date_idea_request_status"]
          relationship_goals: string[]
          request_count: number
          scheduled_for: string
          sort_created_at: string
          title: string
          venue_hint: string
          venue_name: string
          visibility: Database["public"]["Enums"]["date_idea_visibility"]
        }[]
      }
      get_date_idea_requests: {
        Args: {
          p_actor_user_id: string
          p_cursor_request_id?: string
          p_cursor_requested_at?: string
          p_date_idea_id: string
          p_limit?: number
          p_statuses?: Database["public"]["Enums"]["date_idea_request_status"][]
        }
        Returns: {
          date_idea_request_id: string
          decided_at: string
          message: string
          request_status: Database["public"]["Enums"]["date_idea_request_status"]
          requested_at: string
          requester_age_years: number
          requester_bio: string
          requester_display_name: string
          requester_gender: Database["public"]["Enums"]["gender_type"]
          requester_headline: string
          requester_interests: string[]
          requester_languages: string[]
          requester_photo_blur_hash: string
          requester_photo_height: number
          requester_photo_url: string
          requester_photo_width: number
          requester_relationship_goals: string[]
          requester_user_id: string
          response_note: string
          sort_requested_at: string
        }[]
      }
      get_discovery_cards: {
        Args: {
          p_actor_user_id: string
          p_city_name?: string
          p_country_code?: string
          p_cursor_sort_at?: string
          p_cursor_user_id?: string
          p_genders?: Database["public"]["Enums"]["gender_type"][]
          p_geohash_prefix?: string
          p_interests?: string[]
          p_languages?: string[]
          p_limit?: number
          p_max_age?: number
          p_min_age?: number
          p_relationship_goals?: string[]
        }
        Returns: {
          age_years: number
          badges: string[]
          bio: string
          city_name: string
          country_code: string
          display_name: string
          gender: Database["public"]["Enums"]["gender_type"]
          gifts_received: number
          headline: string
          intents: string[]
          interests: string[]
          languages: string[]
          last_active_at: string
          likes_received: number
          mood: string
          online_state: Database["public"]["Enums"]["online_state"]
          popularity_score: number
          primary_photo_blur_hash: string
          primary_photo_height: number
          primary_photo_url: string
          primary_photo_width: number
          profile_completion_score: number
          public_geohash_prefix: string
          relationship_goals: string[]
          sort_at: string
          user_id: string
        }[]
      }
      get_follow_relationships: {
        Args: {
          p_actor_user_id: string
          p_cursor_created_at?: string
          p_cursor_user_id?: string
          p_direction?: string
          p_limit?: number
        }
        Returns: {
          accepted_at: string
          age_years: number
          city_name: string
          country_code: string
          created_at: string
          display_name: string
          follow_status: Database["public"]["Enums"]["follow_status"]
          muted_at: string
          primary_photo_blur_hash: string
          primary_photo_url: string
          relationship_user_id: string
        }[]
      }
      get_gift_catalog: {
        Args: { p_actor_user_id: string }
        Returns: {
          asset_type: Database["public"]["Enums"]["gift_asset_type"]
          asset_url: string
          category_emoji: string
          category_name: string
          category_slug: string
          description: string
          gift_effect: string
          gift_id: string
          name: string
          price_stars: number
          price_ton: number
          profile_aura_effect: string
          rarity: Database["public"]["Enums"]["gift_rarity"]
          slug: string
          thumbnail_url: string
        }[]
      }
      get_moderation_queue: {
        Args: {
          p_actor_user_id: string
          p_assigned_to_me?: boolean
          p_cursor_created_at?: string
          p_cursor_queue_id?: string
          p_limit?: number
          p_statuses?: Database["public"]["Enums"]["moderation_queue_status"][]
        }
        Returns: {
          assigned_at: string
          assigned_to_user_id: string
          created_at: string
          details: string
          moderation_queue_id: string
          opened_at: string
          priority: number
          reason: string
          report_id: string
          reported_user_id: string
          reporter_user_id: string
          status: Database["public"]["Enums"]["moderation_queue_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["moderation_target_type"]
          updated_at: string
        }[]
      }
      get_my_boosts: {
        Args: {
          p_actor_user_id: string
          p_cursor_boost_id?: string
          p_cursor_created_at?: string
          p_limit?: number
        }
        Returns: {
          boost_id: string
          boost_product_id: string
          boost_status: Database["public"]["Enums"]["boost_status"]
          boost_type: string
          created_at: string
          ends_at: string
          impression_count: number
          like_count: number
          match_count: number
          multiplier: number
          paused_at: string
          payment_id: string
          profile_view_count: number
          remaining_seconds: number
          starts_at: string
        }[]
      }
      get_my_moderation_reports: {
        Args: {
          p_cursor_created_at?: string
          p_cursor_report_id?: string
          p_limit?: number
          p_reporter_user_id: string
        }
        Returns: {
          created_at: string
          decided_at: string
          public_message: string
          reason: string
          report_id: string
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["moderation_target_type"]
        }[]
      }
      get_my_premium_entitlements: {
        Args: { p_actor_user_id: string }
        Returns: {
          current_period_end: string
          expires_at: string
          features: Json
          limits: Json
          plan_id: string
          plan_name: string
          plan_slug: string
          starts_at: string
          subscription_id: string
          subscription_status: Database["public"]["Enums"]["premium_subscription_status"]
          super_like_balance: number
        }[]
      }
      get_or_create_daily_chemistry_card: {
        Args: { p_actor_user_id: string }
        Returns: {
          age_years: number
          algorithm_version: string
          bio: string
          candidate_acted_at: string
          candidate_id: string
          candidate_status: Database["public"]["Enums"]["daily_chemistry_candidate_status"]
          candidate_viewed_at: string
          card_date: string
          card_id: string
          card_status: Database["public"]["Enums"]["daily_chemistry_card_status"]
          card_summary: string
          city_name: string
          compatibility_score: number
          country_code: string
          display_name: string
          expires_at: string
          gender: Database["public"]["Enums"]["gender_type"]
          generated_at: string
          headline: string
          interests: string[]
          languages: string[]
          last_active_at: string
          mood: string
          online_state: Database["public"]["Enums"]["online_state"]
          primary_photo_blur_hash: string
          primary_photo_height: number
          primary_photo_url: string
          primary_photo_width: number
          public_geohash_prefix: string
          rank_position: number
          reason_tags: string[]
          reasons: Json
          relationship_goals: string[]
          remaining_candidates: number
          shared_goals: string[]
          shared_interests: string[]
          shared_languages: string[]
          target_user_id: string
          total_candidates: number
        }[]
      }
      get_own_profile_auras: {
        Args: { p_actor_user_id: string }
        Returns: {
          activated_at: string
          animation_metadata: Json
          aura_id: string
          aura_key: string
          aura_status: Database["public"]["Enums"]["profile_aura_status"]
          css_tokens: Json
          description: string
          expires_at: string
          is_active: boolean
          name: string
          preview_url: string
          slug: string
          unlocked_at: string
          user_aura_id: string
        }[]
      }
      get_pending_follow_requests: {
        Args: {
          p_actor_user_id: string
          p_cursor_created_at?: string
          p_cursor_follower_user_id?: string
          p_limit?: number
        }
        Returns: {
          age_years: number
          city_name: string
          country_code: string
          display_name: string
          follower_user_id: string
          primary_photo_blur_hash: string
          primary_photo_url: string
          requested_at: string
        }[]
      }
      get_premium_plans: {
        Args: never
        Returns: {
          description: string
          duration_days: number
          features: Json
          limits: Json
          name: string
          plan_id: string
          plan_interval: Database["public"]["Enums"]["premium_plan_interval"]
          price_stars: number
          price_ton: number
          slug: string
          sort_order: number
        }[]
      }
      get_social_feed: {
        Args: {
          p_actor_user_id: string
          p_cursor_created_at?: string
          p_cursor_post_id?: string
          p_limit?: number
          p_scope?: string
        }
        Returns: {
          age_years: number
          author_user_id: string
          body: string
          city_name: string
          country_code: string
          created_at: string
          display_name: string
          like_count: number
          liked_by_actor: boolean
          post_id: string
          post_type: Database["public"]["Enums"]["post_type"]
          primary_photo_blur_hash: string
          primary_photo_url: string
          reply_count: number
          repost_count: number
          updated_at: string
          visibility: Database["public"]["Enums"]["post_visibility"]
        }[]
      }
      get_ton_boost_payment_context: {
        Args: { p_actor_user_id: string; p_payment_id: string }
        Returns: {
          amount_ton: number
          invoice_payload: string
          payment_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
        }[]
      }
      get_ton_gift_payment_context: {
        Args: { p_actor_user_id: string; p_payment_id: string }
        Returns: {
          amount_ton: number
          invoice_payload: string
          payment_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
        }[]
      }
      get_ton_premium_payment_context: {
        Args: { p_actor_user_id: string; p_payment_id: string }
        Returns: {
          amount_ton: number
          invoice_payload: string
          payment_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
        }[]
      }
      get_user_blocks: {
        Args: {
          p_actor_user_id: string
          p_cursor_created_at?: string
          p_cursor_user_id?: string
          p_limit?: number
        }
        Returns: {
          blocked_user_id: string
          created_at: string
          reason: string
        }[]
      }
      get_user_conversations: {
        Args: {
          p_actor_user_id: string
          p_cursor_activity_at?: string
          p_cursor_conversation_id?: string
          p_limit?: number
        }
        Returns: {
          age_years: number
          city_name: string
          conversation_id: string
          country_code: string
          display_name: string
          last_activity_at: string
          last_message_at: string
          last_message_id: string
          last_message_preview: string
          last_message_sender_user_id: string
          match_id: string
          notifications_muted_until: string
          other_user_id: string
          primary_photo_blur_hash: string
          primary_photo_height: number
          primary_photo_url: string
          primary_photo_width: number
          unread_count: number
        }[]
      }
      get_user_matches: {
        Args: {
          p_actor_user_id: string
          p_cursor_match_id?: string
          p_cursor_matched_at?: string
          p_limit?: number
        }
        Returns: {
          age_years: number
          bio: string
          city_name: string
          country_code: string
          display_name: string
          gender: Database["public"]["Enums"]["gender_type"]
          headline: string
          interests: string[]
          languages: string[]
          last_active_at: string
          last_interaction_at: string
          match_id: string
          match_source: Database["public"]["Enums"]["match_source"]
          match_status: Database["public"]["Enums"]["match_status"]
          matched_at: string
          mood: string
          online_state: Database["public"]["Enums"]["online_state"]
          other_user_id: string
          primary_photo_blur_hash: string
          primary_photo_height: number
          primary_photo_url: string
          primary_photo_width: number
          public_geohash_prefix: string
          relationship_goals: string[]
        }[]
      }
      get_user_notifications: {
        Args: {
          p_actor_user_id: string
          p_cursor_created_at?: string
          p_cursor_notification_id?: string
          p_limit?: number
          p_unread_only?: boolean
        }
        Returns: {
          body: string
          created_at: string
          entity_id: string
          entity_type: string
          expires_at: string
          notification_id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          payload: Json
          read_at: string
          seen_at: string
          title: string
        }[]
      }
      get_video_queue_state: {
        Args: { p_actor_user_id: string }
        Returns: {
          expires_at: string
          matched_at: string
          queue_entry_id: string
          queue_status: Database["public"]["Enums"]["video_queue_status"]
          video_session_id: string
          video_session_status: Database["public"]["Enums"]["video_session_status"]
        }[]
      }
      get_video_session_signals: {
        Args: {
          p_actor_user_id: string
          p_cursor_created_at?: string
          p_cursor_signal_id?: string
          p_limit?: number
          p_video_session_id: string
        }
        Returns: {
          created_at: string
          payload: Json
          sender_user_id: string
          signal_id: string
          signal_type: Database["public"]["Enums"]["video_signal_type"]
        }[]
      }
      get_video_session_state: {
        Args: { p_actor_user_id: string; p_video_session_id: string }
        Returns: {
          connected_at: string
          connection_expires_at: string
          is_initiator: boolean
          mode: Database["public"]["Enums"]["video_mode"]
          other_age_years: number
          other_city_name: string
          other_country_code: string
          other_display_name: string
          other_primary_photo_blur_hash: string
          other_primary_photo_url: string
          other_state: Database["public"]["Enums"]["video_participant_state"]
          other_user_id: string
          self_state: Database["public"]["Enums"]["video_participant_state"]
          video_session_id: string
          video_session_status: Database["public"]["Enums"]["video_session_status"]
        }[]
      }
      grant_verified_boost_payment: {
        Args: {
          p_amount_stars?: number
          p_amount_ton?: number
          p_payment_id: string
          p_provider: Database["public"]["Enums"]["payment_provider"]
          p_provider_customer_id: string
          p_provider_payment_id: string
          p_raw_webhook?: Json
          p_ton_network?: Database["public"]["Enums"]["wallet_network"]
        }
        Returns: {
          already_granted: boolean
          boost_id: string
          boost_status: Database["public"]["Enums"]["boost_status"]
          ends_at: string
          granted_at: string
          payment_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          starts_at: string
        }[]
      }
      grant_verified_gift_payment: {
        Args: {
          p_amount_stars?: number
          p_amount_ton?: number
          p_payment_id: string
          p_provider: Database["public"]["Enums"]["payment_provider"]
          p_provider_customer_id: string
          p_provider_payment_id: string
          p_raw_webhook?: Json
          p_ton_network?: Database["public"]["Enums"]["wallet_network"]
        }
        Returns: {
          already_granted: boolean
          gift_id: string
          granted_at: string
          payment_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          receiver_user_id: string
          sent_gift_id: string
        }[]
      }
      grant_verified_premium_payment: {
        Args: {
          p_amount_stars?: number
          p_amount_ton?: number
          p_payment_id: string
          p_provider: Database["public"]["Enums"]["payment_provider"]
          p_provider_customer_id: string
          p_provider_payment_id: string
          p_raw_webhook?: Json
          p_ton_network?: Database["public"]["Enums"]["wallet_network"]
        }
        Returns: {
          already_granted: boolean
          current_period_end: string
          granted_at: string
          payment_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          plan_id: string
          subscription_id: string
        }[]
      }
      heartbeat_video_session: {
        Args: { p_actor_user_id: string; p_video_session_id: string }
        Returns: {
          last_seen_at: string
          video_session_id: string
          video_session_status: Database["public"]["Enums"]["video_session_status"]
        }[]
      }
      join_video_queue: {
        Args: {
          p_actor_user_id: string
          p_mode: Database["public"]["Enums"]["video_mode"]
        }
        Returns: {
          expires_at: string
          matched: boolean
          queue_entry_id: string
          queue_status: Database["public"]["Enums"]["video_queue_status"]
          video_session_id: string
          video_session_status: Database["public"]["Enums"]["video_session_status"]
        }[]
      }
      mark_all_user_notifications_read: {
        Args: { p_actor_user_id: string }
        Returns: {
          marked_count: number
          read_at: string
        }[]
      }
      mark_conversation_read: {
        Args: {
          p_actor_user_id: string
          p_conversation_id: string
          p_through_message_id?: string
        }
        Returns: {
          conversation_id: string
          last_read_message_id: string
          last_read_sequence: number
          read_at: string
          unread_count: number
        }[]
      }
      mark_daily_chemistry_candidate_viewed: {
        Args: { p_actor_user_id: string; p_candidate_id: string }
        Returns: {
          candidate_id: string
          candidate_status: Database["public"]["Enums"]["daily_chemistry_candidate_status"]
          card_remaining_candidates: number
          card_status: Database["public"]["Enums"]["daily_chemistry_card_status"]
          viewed_at: string
        }[]
      }
      mark_user_notification_read: {
        Args: { p_actor_user_id: string; p_notification_id: string }
        Returns: {
          already_read: boolean
          notification_id: string
          read_at: string
        }[]
      }
      mark_video_session_connected: {
        Args: { p_actor_user_id: string; p_video_session_id: string }
        Returns: {
          connected_at: string
          other_state: Database["public"]["Enums"]["video_participant_state"]
          self_state: Database["public"]["Enums"]["video_participant_state"]
          video_session_id: string
          video_session_status: Database["public"]["Enums"]["video_session_status"]
        }[]
      }
      mark_video_session_ready: {
        Args: { p_actor_user_id: string; p_video_session_id: string }
        Returns: {
          connection_expires_at: string
          is_initiator: boolean
          other_state: Database["public"]["Enums"]["video_participant_state"]
          self_state: Database["public"]["Enums"]["video_participant_state"]
          video_session_id: string
          video_session_status: Database["public"]["Enums"]["video_session_status"]
        }[]
      }
      pause_own_boost: {
        Args: { p_actor_user_id: string; p_boost_id: string }
        Returns: {
          boost_id: string
          boost_status: Database["public"]["Enums"]["boost_status"]
          paused_at: string
          remaining_seconds: number
        }[]
      }
      provision_telegram_user: {
        Args: {
          p_added_to_attachment_menu?: boolean
          p_allows_write_to_pm?: boolean
          p_first_name?: string
          p_init_data_hash?: string
          p_is_telegram_premium?: boolean
          p_language_code?: string
          p_last_name?: string
          p_photo_url?: string
          p_telegram_user_id: string
          p_telegram_username?: string
          p_user_id: string
        }
        Returns: string
      }
      record_boost_impressions: {
        Args: { p_actor_user_id: string; p_target_user_ids: string[] }
        Returns: number
      }
      record_dating_swipe: {
        Args: {
          p_action_type: Database["public"]["Enums"]["swipe_action_type"]
          p_actor_user_id: string
          p_daily_chemistry_candidate_id?: string
          p_idempotency_key: string
          p_source_surface: Database["public"]["Enums"]["discovery_surface"]
          p_target_user_id: string
        }
        Returns: {
          action_created_at: string
          action_id: string
          action_type: Database["public"]["Enums"]["swipe_action_type"]
          match_created: boolean
          match_id: string
          match_status: Database["public"]["Enums"]["match_status"]
          matched_at: string
          source_surface: Database["public"]["Enums"]["discovery_surface"]
          target_user_id: string
        }[]
      }
      record_swipe_action: {
        Args: {
          p_action_type: Database["public"]["Enums"]["swipe_action_type"]
          p_actor_user_id: string
          p_idempotency_key: string
          p_source_surface: Database["public"]["Enums"]["discovery_surface"]
          p_target_user_id: string
        }
        Returns: {
          action_created_at: string
          action_id: string
          action_type: Database["public"]["Enums"]["swipe_action_type"]
          match_created: boolean
          match_id: string
          match_status: Database["public"]["Enums"]["match_status"]
          matched_at: string
          source_surface: Database["public"]["Enums"]["discovery_surface"]
          target_user_id: string
        }[]
      }
      refresh_profile_completion: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      remove_user_block: {
        Args: { p_actor_user_id: string; p_blocked_user_id: string }
        Returns: {
          blocked_user_id: string
          removed: boolean
        }[]
      }
      reorder_profile_photos: {
        Args: { p_photo_ids: string[]; p_user_id: string }
        Returns: boolean
      }
      resolve_telegram_stars_boost_payment: {
        Args: {
          p_amount_stars: number
          p_invoice_payload: string
          p_require_unexpired?: boolean
          p_telegram_user_id: string
        }
        Returns: {
          payment_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
        }[]
      }
      resolve_telegram_stars_gift_payment: {
        Args: {
          p_amount_stars: number
          p_invoice_payload: string
          p_require_unexpired?: boolean
          p_telegram_user_id: string
        }
        Returns: {
          payment_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
        }[]
      }
      resolve_telegram_stars_premium_payment: {
        Args: {
          p_amount_stars: number
          p_invoice_payload: string
          p_require_unexpired?: boolean
          p_telegram_user_id: string
        }
        Returns: {
          payment_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
        }[]
      }
      resume_own_boost: {
        Args: { p_actor_user_id: string; p_boost_id: string }
        Returns: {
          boost_id: string
          boost_status: Database["public"]["Enums"]["boost_status"]
          ends_at: string
          starts_at: string
        }[]
      }
      send_conversation_message: {
        Args: {
          p_actor_user_id: string
          p_body: string
          p_client_message_id: string
          p_conversation_id: string
          p_reply_to_message_id?: string
        }
        Returns: {
          already_created: boolean
          body: string
          conversation_id: string
          message_id: string
          message_type: Database["public"]["Enums"]["message_type"]
          notification_id: string
          reply_to_message_id: string
          sender_user_id: string
          sent_at: string
          sequence: number
        }[]
      }
      send_video_session_signal: {
        Args: {
          p_actor_user_id: string
          p_client_signal_id: string
          p_payload: Json
          p_signal_type: Database["public"]["Enums"]["video_signal_type"]
          p_video_session_id: string
        }
        Returns: {
          already_created: boolean
          created_at: string
          signal_id: string
        }[]
      }
      set_conversation_notification_settings: {
        Args: {
          p_actor_user_id: string
          p_conversation_id: string
          p_muted_until?: string
        }
        Returns: {
          conversation_id: string
          notifications_muted_until: string
        }[]
      }
      set_date_idea_bookmark: {
        Args: {
          p_actor_user_id: string
          p_bookmarked: boolean
          p_date_idea_id: string
        }
        Returns: {
          bookmarked: boolean
          date_idea_id: string
        }[]
      }
      set_follow_muted: {
        Args: {
          p_actor_user_id: string
          p_muted: boolean
          p_target_user_id: string
        }
        Returns: {
          follow_status: Database["public"]["Enums"]["follow_status"]
          following_user_id: string
          muted_at: string
        }[]
      }
      set_primary_profile_photo: {
        Args: { p_photo_id: string; p_user_id: string }
        Returns: boolean
      }
      set_social_post_like: {
        Args: { p_actor_user_id: string; p_liked: boolean; p_post_id: string }
        Returns: {
          like_count: number
          liked: boolean
          post_id: string
        }[]
      }
      set_user_block: {
        Args: {
          p_actor_user_id: string
          p_blocked_user_id: string
          p_reason?: string
        }
        Returns: {
          blocked_user_id: string
          blocker_user_id: string
          created: boolean
          created_at: string
        }[]
      }
      soft_delete_profile_photo: {
        Args: { p_photo_id: string; p_user_id: string }
        Returns: string
      }
      undo_dating_swipe: {
        Args: {
          p_actor_user_id: string
          p_idempotency_key: string
          p_target_user_id?: string
          p_window_seconds?: number
        }
        Returns: {
          action_created_at: string
          action_id: string
          action_type: Database["public"]["Enums"]["swipe_action_type"]
          source_surface: Database["public"]["Enums"]["discovery_surface"]
          target_user_id: string
          undone_action_id: string
        }[]
      }
      undo_latest_swipe: {
        Args: {
          p_actor_user_id: string
          p_idempotency_key: string
          p_target_user_id?: string
          p_window_seconds?: number
        }
        Returns: {
          action_created_at: string
          action_id: string
          action_type: Database["public"]["Enums"]["swipe_action_type"]
          source_surface: Database["public"]["Enums"]["discovery_surface"]
          target_user_id: string
          undone_action_id: string
        }[]
      }
      unfollow_user: {
        Args: { p_actor_user_id: string; p_target_user_id: string }
        Returns: {
          following_user_id: string
          removed: boolean
        }[]
      }
    }
    Enums: {
      admin_action_type:
        | "warn_user"
        | "hide_profile"
        | "unhide_profile"
        | "remove_photo"
        | "restore_photo"
        | "remove_post"
        | "restore_post"
        | "restrict_user"
        | "lift_restriction"
        | "ban_user"
        | "unban_user"
        | "verify_user"
        | "reject_verification"
        | "refund_payment"
        | "manual_note"
      ban_status: "active" | "lifted" | "expired"
      ban_type: "temporary" | "permanent" | "shadow"
      boost_event_type:
        | "created"
        | "paid"
        | "started"
        | "paused"
        | "resumed"
        | "ended"
        | "expired"
        | "cancelled"
        | "refunded"
        | "impression"
        | "profile_view"
        | "like_received"
        | "match_created"
      boost_status:
        | "scheduled"
        | "active"
        | "paused"
        | "ended"
        | "cancelled"
        | "expired"
        | "refunded"
      conversation_status: "active" | "closed" | "blocked"
      daily_chemistry_candidate_status:
        | "pending"
        | "viewed"
        | "liked"
        | "passed"
        | "super_liked"
        | "matched"
        | "expired"
      daily_chemistry_card_status:
        | "generated"
        | "seen"
        | "completed"
        | "expired"
        | "dismissed"
      date_idea_request_status:
        | "requested"
        | "accepted"
        | "rejected"
        | "cancelled"
        | "expired"
      date_idea_status:
        | "draft"
        | "open"
        | "full"
        | "matched"
        | "cancelled"
        | "expired"
        | "removed"
      date_idea_type:
        | "coffee"
        | "walk"
        | "study"
        | "dinner"
        | "movie"
        | "gym"
        | "museum"
        | "party"
        | "video_call"
        | "custom"
      date_idea_visibility:
        | "city"
        | "nearby"
        | "country"
        | "global"
        | "followers"
        | "matches_only"
      discovery_surface:
        | "cards"
        | "explore"
        | "nearby"
        | "feed"
        | "leaderboard"
        | "daily_chemistry"
        | "date_ideas"
      face_check_status: "pending" | "passed" | "failed" | "manual_review"
      follow_status: "requested" | "accepted" | "muted" | "rejected"
      gender_type:
        | "woman"
        | "man"
        | "non_binary"
        | "other"
        | "prefer_not_to_say"
      gift_asset_type: "image" | "webp" | "svg" | "lottie" | "video"
      gift_rarity: "common" | "rare" | "epic" | "legendary" | "mythic"
      match_source:
        | "cards"
        | "explore"
        | "nearby"
        | "video"
        | "gift"
        | "secret_crush"
        | "boosted"
        | "date_idea"
      match_status: "active" | "unmatched" | "blocked" | "expired"
      message_type: "text"
      moderation_queue_status:
        | "open"
        | "assigned"
        | "needs_more_info"
        | "resolved"
        | "dismissed"
        | "escalated"
      moderation_state: "pending" | "approved" | "rejected" | "needs_review"
      moderation_target_type:
        | "user"
        | "profile"
        | "profile_photo"
        | "post"
        | "video_session"
        | "gift"
        | "payment"
        | "report"
      notification_type:
        | "message"
        | "match"
        | "date_idea"
        | "gift"
        | "payment"
        | "moderation"
        | "video"
      online_state: "online" | "recently_online" | "offline" | "hidden"
      payment_product_type: "gift" | "boost" | "premium" | "theme"
      payment_provider: "telegram_stars" | "ton"
      payment_status:
        | "created"
        | "pending"
        | "verified"
        | "failed"
        | "refunded"
        | "cancelled"
      post_type:
        | "text"
        | "question"
        | "confession"
        | "date_idea"
        | "poll"
        | "meme"
        | "local_shout"
      post_visibility:
        | "public"
        | "followers"
        | "country"
        | "city"
        | "nearby"
        | "global"
      premium_plan_interval:
        | "daily"
        | "weekly"
        | "monthly"
        | "quarterly"
        | "yearly"
        | "lifetime"
      premium_subscription_status:
        | "trialing"
        | "active"
        | "grace_period"
        | "past_due"
        | "cancelled"
        | "expired"
        | "refunded"
      profile_aura_event_type:
        | "unlocked"
        | "activated"
        | "deactivated"
        | "expired"
        | "revoked"
        | "extended"
      profile_aura_status: "owned" | "active" | "expired" | "revoked"
      profile_aura_unlock_source:
        | "gift_received"
        | "gift_combo"
        | "premium"
        | "payment"
        | "admin"
        | "event"
      profile_visibility: "public" | "hidden" | "matches_only" | "paused"
      report_status:
        | "pending"
        | "reviewing"
        | "resolved"
        | "dismissed"
        | "action_taken"
      super_like_event_type:
        | "grant"
        | "spend"
        | "refund"
        | "expire"
        | "admin_adjustment"
        | "daily_refill"
        | "premium_refill"
      swipe_action_type:
        | "like"
        | "pass"
        | "super_like"
        | "secret_crush"
        | "undo"
      ton_transaction_status:
        | "created"
        | "pending"
        | "confirmed"
        | "failed"
        | "expired"
        | "refunded"
      ton_transaction_type:
        | "payment"
        | "refund"
        | "withdrawal"
        | "deposit"
        | "gift_purchase"
        | "boost_purchase"
        | "premium_purchase"
        | "theme_purchase"
      user_restriction_status: "active" | "expired" | "lifted"
      user_restriction_type:
        | "no_swipe"
        | "no_post"
        | "no_video"
        | "no_gift"
        | "no_profile_edit"
        | "no_telegram_open"
        | "shadow_ban"
        | "rate_limited"
        | "view_only"
        | "full_suspension"
      user_role: "user" | "moderator" | "admin"
      user_status: "active" | "paused" | "banned" | "deleted"
      video_mode:
        | "global"
        | "country"
        | "city"
        | "nearby"
        | "same_language"
        | "same_interest"
      video_participant_state:
        | "matched"
        | "ready"
        | "joined"
        | "left"
        | "disconnected"
        | "blocked"
      video_queue_status: "waiting" | "matched" | "cancelled" | "expired"
      video_session_status:
        | "created"
        | "connecting"
        | "connected"
        | "ended"
        | "failed"
      video_signal_type: "offer" | "answer" | "ice_candidate" | "hangup"
      wallet_network: "ton_mainnet" | "ton_testnet"
      wallet_status: "connected" | "verified" | "disconnected" | "blocked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_action_type: [
        "warn_user",
        "hide_profile",
        "unhide_profile",
        "remove_photo",
        "restore_photo",
        "remove_post",
        "restore_post",
        "restrict_user",
        "lift_restriction",
        "ban_user",
        "unban_user",
        "verify_user",
        "reject_verification",
        "refund_payment",
        "manual_note",
      ],
      ban_status: ["active", "lifted", "expired"],
      ban_type: ["temporary", "permanent", "shadow"],
      boost_event_type: [
        "created",
        "paid",
        "started",
        "paused",
        "resumed",
        "ended",
        "expired",
        "cancelled",
        "refunded",
        "impression",
        "profile_view",
        "like_received",
        "match_created",
      ],
      boost_status: [
        "scheduled",
        "active",
        "paused",
        "ended",
        "cancelled",
        "expired",
        "refunded",
      ],
      conversation_status: ["active", "closed", "blocked"],
      daily_chemistry_candidate_status: [
        "pending",
        "viewed",
        "liked",
        "passed",
        "super_liked",
        "matched",
        "expired",
      ],
      daily_chemistry_card_status: [
        "generated",
        "seen",
        "completed",
        "expired",
        "dismissed",
      ],
      date_idea_request_status: [
        "requested",
        "accepted",
        "rejected",
        "cancelled",
        "expired",
      ],
      date_idea_status: [
        "draft",
        "open",
        "full",
        "matched",
        "cancelled",
        "expired",
        "removed",
      ],
      date_idea_type: [
        "coffee",
        "walk",
        "study",
        "dinner",
        "movie",
        "gym",
        "museum",
        "party",
        "video_call",
        "custom",
      ],
      date_idea_visibility: [
        "city",
        "nearby",
        "country",
        "global",
        "followers",
        "matches_only",
      ],
      discovery_surface: [
        "cards",
        "explore",
        "nearby",
        "feed",
        "leaderboard",
        "daily_chemistry",
        "date_ideas",
      ],
      face_check_status: ["pending", "passed", "failed", "manual_review"],
      follow_status: ["requested", "accepted", "muted", "rejected"],
      gender_type: ["woman", "man", "non_binary", "other", "prefer_not_to_say"],
      gift_asset_type: ["image", "webp", "svg", "lottie", "video"],
      gift_rarity: ["common", "rare", "epic", "legendary", "mythic"],
      match_source: [
        "cards",
        "explore",
        "nearby",
        "video",
        "gift",
        "secret_crush",
        "boosted",
        "date_idea",
      ],
      match_status: ["active", "unmatched", "blocked", "expired"],
      message_type: ["text"],
      moderation_queue_status: [
        "open",
        "assigned",
        "needs_more_info",
        "resolved",
        "dismissed",
        "escalated",
      ],
      moderation_state: ["pending", "approved", "rejected", "needs_review"],
      moderation_target_type: [
        "user",
        "profile",
        "profile_photo",
        "post",
        "video_session",
        "gift",
        "payment",
        "report",
      ],
      notification_type: [
        "message",
        "match",
        "date_idea",
        "gift",
        "payment",
        "moderation",
        "video",
      ],
      online_state: ["online", "recently_online", "offline", "hidden"],
      payment_product_type: ["gift", "boost", "premium", "theme"],
      payment_provider: ["telegram_stars", "ton"],
      payment_status: [
        "created",
        "pending",
        "verified",
        "failed",
        "refunded",
        "cancelled",
      ],
      post_type: [
        "text",
        "question",
        "confession",
        "date_idea",
        "poll",
        "meme",
        "local_shout",
      ],
      post_visibility: [
        "public",
        "followers",
        "country",
        "city",
        "nearby",
        "global",
      ],
      premium_plan_interval: [
        "daily",
        "weekly",
        "monthly",
        "quarterly",
        "yearly",
        "lifetime",
      ],
      premium_subscription_status: [
        "trialing",
        "active",
        "grace_period",
        "past_due",
        "cancelled",
        "expired",
        "refunded",
      ],
      profile_aura_event_type: [
        "unlocked",
        "activated",
        "deactivated",
        "expired",
        "revoked",
        "extended",
      ],
      profile_aura_status: ["owned", "active", "expired", "revoked"],
      profile_aura_unlock_source: [
        "gift_received",
        "gift_combo",
        "premium",
        "payment",
        "admin",
        "event",
      ],
      profile_visibility: ["public", "hidden", "matches_only", "paused"],
      report_status: [
        "pending",
        "reviewing",
        "resolved",
        "dismissed",
        "action_taken",
      ],
      super_like_event_type: [
        "grant",
        "spend",
        "refund",
        "expire",
        "admin_adjustment",
        "daily_refill",
        "premium_refill",
      ],
      swipe_action_type: ["like", "pass", "super_like", "secret_crush", "undo"],
      ton_transaction_status: [
        "created",
        "pending",
        "confirmed",
        "failed",
        "expired",
        "refunded",
      ],
      ton_transaction_type: [
        "payment",
        "refund",
        "withdrawal",
        "deposit",
        "gift_purchase",
        "boost_purchase",
        "premium_purchase",
        "theme_purchase",
      ],
      user_restriction_status: ["active", "expired", "lifted"],
      user_restriction_type: [
        "no_swipe",
        "no_post",
        "no_video",
        "no_gift",
        "no_profile_edit",
        "no_telegram_open",
        "shadow_ban",
        "rate_limited",
        "view_only",
        "full_suspension",
      ],
      user_role: ["user", "moderator", "admin"],
      user_status: ["active", "paused", "banned", "deleted"],
      video_mode: [
        "global",
        "country",
        "city",
        "nearby",
        "same_language",
        "same_interest",
      ],
      video_participant_state: [
        "matched",
        "ready",
        "joined",
        "left",
        "disconnected",
        "blocked",
      ],
      video_queue_status: ["waiting", "matched", "cancelled", "expired"],
      video_session_status: [
        "created",
        "connecting",
        "connected",
        "ended",
        "failed",
      ],
      video_signal_type: ["offer", "answer", "ice_candidate", "hangup"],
      wallet_network: ["ton_mainnet", "ton_testnet"],
      wallet_status: ["connected", "verified", "disconnected", "blocked"],
    },
  },
} as const

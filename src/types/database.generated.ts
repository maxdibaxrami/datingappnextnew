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
      boosts: {
        Row: {
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
          payment_id: string | null
          profile_view_count: number
          source_surface:
            | Database["public"]["Enums"]["discovery_surface"]
            | null
          starts_at: string
          status: Database["public"]["Enums"]["boost_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
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
          payment_id?: string | null
          profile_view_count?: number
          source_surface?:
            | Database["public"]["Enums"]["discovery_surface"]
            | null
          starts_at?: string
          status?: Database["public"]["Enums"]["boost_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
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
          payment_id?: string | null
          profile_view_count?: number
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
            foreignKeyName: "daily_chemistry_candidates_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "daily_chemistry_cards"
            referencedColumns: ["id"]
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
      video_sessions: {
        Row: {
          algorithm_version: string | null
          city_name: string | null
          connected_at: string | null
          country_code: string | null
          created_at: string
          end_reason: string | null
          ended_at: string | null
          geohash_prefix: string | null
          id: string
          match_scope: string | null
          mode: Database["public"]["Enums"]["video_mode"]
          status: Database["public"]["Enums"]["video_session_status"]
        }
        Insert: {
          algorithm_version?: string | null
          city_name?: string | null
          connected_at?: string | null
          country_code?: string | null
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          geohash_prefix?: string | null
          id?: string
          match_scope?: string | null
          mode?: Database["public"]["Enums"]["video_mode"]
          status?: Database["public"]["Enums"]["video_session_status"]
        }
        Update: {
          algorithm_version?: string | null
          city_name?: string | null
          connected_at?: string | null
          country_code?: string | null
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          geohash_prefix?: string | null
          id?: string
          match_scope?: string | null
          mode?: Database["public"]["Enums"]["video_mode"]
          status?: Database["public"]["Enums"]["video_session_status"]
        }
        Relationships: []
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
      consume_api_rate_limit: {
        Args: {
          p_bucket_key: string
          p_request_limit: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      find_user_id_by_telegram_id: {
        Args: { p_telegram_user_id: string }
        Returns: string
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
      reorder_profile_photos: {
        Args: { p_photo_ids: string[]; p_user_id: string }
        Returns: boolean
      }
      set_primary_profile_photo: {
        Args: { p_photo_id: string; p_user_id: string }
        Returns: boolean
      }
      soft_delete_profile_photo: {
        Args: { p_photo_id: string; p_user_id: string }
        Returns: string
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
      video_session_status:
        | "created"
        | "connecting"
        | "connected"
        | "ended"
        | "failed"
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
      video_session_status: [
        "created",
        "connecting",
        "connected",
        "ended",
        "failed",
      ],
      wallet_network: ["ton_mainnet", "ton_testnet"],
      wallet_status: ["connected", "verified", "disconnected", "blocked"],
    },
  },
} as const

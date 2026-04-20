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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      beds: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          season_notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          season_notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          season_notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          content: string
          created_at: string
          display_name: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          display_name?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          display_name?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          category: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          glossary_ids: string[] | null
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          glossary_ids?: string[] | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          glossary_ids?: string[] | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      click_events: {
        Row: {
          created_at: string
          element_id: string | null
          element_text: string | null
          event_name: string
          id: string
          metadata: Json | null
          path: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          element_id?: string | null
          element_text?: string | null
          event_name: string
          id?: string
          metadata?: Json | null
          path?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          element_id?: string | null
          element_text?: string | null
          event_name?: string
          id?: string
          metadata?: Json | null
          path?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      harvests: {
        Row: {
          bed_id: string | null
          created_at: string
          harvest_date: string
          id: string
          notes: string | null
          sowing_id: string | null
          user_id: string
          variety: string
          weight_grams: number
        }
        Insert: {
          bed_id?: string | null
          created_at?: string
          harvest_date: string
          id?: string
          notes?: string | null
          sowing_id?: string | null
          user_id: string
          variety: string
          weight_grams?: number
        }
        Update: {
          bed_id?: string | null
          created_at?: string
          harvest_date?: string
          id?: string
          notes?: string | null
          sowing_id?: string | null
          user_id?: string
          variety?: string
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "harvests_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvests_sowing_id_fkey"
            columns: ["sowing_id"]
            isOneToOne: false
            referencedRelation: "sowings"
            referencedColumns: ["id"]
          },
        ]
      }
      link_glossary: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          keyword: string
          rel: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          keyword: string
          rel?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string
          rel?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      my_plants: {
        Row: {
          created_at: string | null
          custom_name: string | null
          fertilizing_interval_days: number | null
          id: string
          last_fertilized: string | null
          last_watered: string | null
          location: string | null
          notes: string | null
          plant_id: string | null
          user_id: string
          watering_interval_days: number | null
        }
        Insert: {
          created_at?: string | null
          custom_name?: string | null
          fertilizing_interval_days?: number | null
          id?: string
          last_fertilized?: string | null
          last_watered?: string | null
          location?: string | null
          notes?: string | null
          plant_id?: string | null
          user_id: string
          watering_interval_days?: number | null
        }
        Update: {
          created_at?: string | null
          custom_name?: string | null
          fertilizing_interval_days?: number | null
          id?: string
          last_fertilized?: string | null
          last_watered?: string | null
          location?: string | null
          notes?: string | null
          plant_id?: string | null
          user_id?: string
          watering_interval_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "my_plants_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          path: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          path: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      pest_logs: {
        Row: {
          bed_id: string | null
          created_at: string
          id: string
          notes: string | null
          observed_date: string
          pest_name: string
          resolved: boolean | null
          severity: string | null
          treatment: string | null
          user_id: string
        }
        Insert: {
          bed_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          observed_date?: string
          pest_name: string
          resolved?: boolean | null
          severity?: string | null
          treatment?: string | null
          user_id: string
        }
        Update: {
          bed_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          observed_date?: string
          pest_name?: string
          resolved?: boolean | null
          severity?: string | null
          treatment?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pest_logs_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_logs: {
        Row: {
          created_at: string | null
          id: string
          log_type: string
          note: string | null
          plant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          log_type: string
          note?: string | null
          plant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          log_type?: string
          note?: string | null
          plant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plant_logs_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "my_plants"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_photos: {
        Row: {
          bed_id: string | null
          caption: string | null
          created_at: string
          id: string
          photo_url: string
          sowing_id: string | null
          taken_at: string
          user_id: string
        }
        Insert: {
          bed_id?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          photo_url: string
          sowing_id?: string | null
          taken_at?: string
          user_id: string
        }
        Update: {
          bed_id?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          photo_url?: string
          sowing_id?: string | null
          taken_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plant_photos_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plant_photos_sowing_id_fkey"
            columns: ["sowing_id"]
            isOneToOne: false
            referencedRelation: "sowings"
            referencedColumns: ["id"]
          },
        ]
      }
      plants: {
        Row: {
          category: string
          harvest_month: string | null
          id: string
          light: string | null
          name_sv: string
          plant_out_month: string | null
          sow_month: string | null
          subcategory: string | null
          temp_max: number | null
          temp_min: number | null
          water: string | null
          watering_interval_days: number | null
        }
        Insert: {
          category: string
          harvest_month?: string | null
          id?: string
          light?: string | null
          name_sv: string
          plant_out_month?: string | null
          sow_month?: string | null
          subcategory?: string | null
          temp_max?: number | null
          temp_min?: number | null
          water?: string | null
          watering_interval_days?: number | null
        }
        Update: {
          category?: string
          harvest_month?: string | null
          id?: string
          light?: string | null
          name_sv?: string
          plant_out_month?: string | null
          sow_month?: string | null
          subcategory?: string | null
          temp_max?: number | null
          temp_min?: number | null
          water?: string | null
          watering_interval_days?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          climate_zone: number | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          onboarding_completed: boolean
          preferences: Json
          premium_expires_at: string | null
          referral_code: string | null
          referred_by: string | null
          subscription_status: string
          terms_accepted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          climate_zone?: number | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          onboarding_completed?: boolean
          preferences?: Json
          premium_expires_at?: string | null
          referral_code?: string | null
          referred_by?: string | null
          subscription_status?: string
          terms_accepted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          climate_zone?: number | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          onboarding_completed?: boolean
          preferences?: Json
          premium_expires_at?: string | null
          referral_code?: string | null
          referred_by?: string | null
          subscription_status?: string
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_user_id: string
          referrer_user_id: string
          rewarded: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_user_id: string
          rewarded?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_user_id?: string
          rewarded?: boolean
        }
        Relationships: []
      }
      reminder_settings: {
        Row: {
          created_at: string
          enabled: boolean | null
          evening_reminder: boolean | null
          evening_time: string | null
          id: string
          morning_reminder: boolean | null
          morning_time: string | null
          settings: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          evening_reminder?: boolean | null
          evening_time?: string | null
          id?: string
          morning_reminder?: boolean | null
          morning_time?: string | null
          settings?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          evening_reminder?: boolean | null
          evening_time?: string | null
          id?: string
          morning_reminder?: boolean | null
          morning_time?: string | null
          settings?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      season_summaries: {
        Row: {
          bed_id: string | null
          created_at: string
          didnt_work: string | null
          grow_again: string | null
          id: string
          learnings: string | null
          user_id: string
          went_well: string | null
          year: number
        }
        Insert: {
          bed_id?: string | null
          created_at?: string
          didnt_work?: string | null
          grow_again?: string | null
          id?: string
          learnings?: string | null
          user_id: string
          went_well?: string | null
          year: number
        }
        Update: {
          bed_id?: string | null
          created_at?: string
          didnt_work?: string | null
          grow_again?: string | null
          id?: string
          learnings?: string | null
          user_id?: string
          went_well?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "season_summaries_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
        ]
      }
      seed_inventory: {
        Row: {
          brand: string | null
          created_at: string
          expiry_date: string | null
          id: string
          notes: string | null
          quantity: string | null
          updated_at: string
          user_id: string
          variety: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          quantity?: string | null
          updated_at?: string
          user_id: string
          variety: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          quantity?: string | null
          updated_at?: string
          user_id?: string
          variety?: string
        }
        Relationships: []
      }
      seo_generation_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          input_prompt: string | null
          model: string | null
          output_json: Json | null
          status: string
          target_slug: string | null
          type: string
          validation_errors: string[] | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_prompt?: string | null
          model?: string | null
          output_json?: Json | null
          status?: string
          target_slug?: string | null
          type: string
          validation_errors?: string[] | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_prompt?: string | null
          model?: string | null
          output_json?: Json | null
          status?: string
          target_slug?: string | null
          type?: string
          validation_errors?: string[] | null
        }
        Relationships: []
      }
      seo_months: {
        Row: {
          avg_temp_middle: number | null
          avg_temp_north: number | null
          avg_temp_south: number | null
          content_html: string | null
          created_at: string
          daylight_hours_avg: number | null
          faq: Json | null
          frost_risk: string | null
          generation_errors: string[] | null
          generation_status: string | null
          id: string
          intro: string | null
          month_name: string
          month_number: number
          published: boolean
          season: string | null
          slug: string
          tasks: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          avg_temp_middle?: number | null
          avg_temp_north?: number | null
          avg_temp_south?: number | null
          content_html?: string | null
          created_at?: string
          daylight_hours_avg?: number | null
          faq?: Json | null
          frost_risk?: string | null
          generation_errors?: string[] | null
          generation_status?: string | null
          id?: string
          intro?: string | null
          month_name: string
          month_number: number
          published?: boolean
          season?: string | null
          slug: string
          tasks?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          avg_temp_middle?: number | null
          avg_temp_north?: number | null
          avg_temp_south?: number | null
          content_html?: string | null
          created_at?: string
          daylight_hours_avg?: number | null
          faq?: Json | null
          frost_risk?: string | null
          generation_errors?: string[] | null
          generation_status?: string | null
          id?: string
          intro?: string | null
          month_name?: string
          month_number?: number
          published?: boolean
          season?: string | null
          slug?: string
          tasks?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_plant_months: {
        Row: {
          activity: string
          month_id: string
          plant_id: string
        }
        Insert: {
          activity: string
          month_id: string
          plant_id: string
        }
        Update: {
          activity?: string
          month_id?: string
          plant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_plant_months_month_id_fkey"
            columns: ["month_id"]
            isOneToOne: false
            referencedRelation: "seo_months"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_plant_months_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "seo_plants"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_plant_zones: {
        Row: {
          notes: string | null
          plant_id: string
          suitability: string | null
          zone_id: string
        }
        Insert: {
          notes?: string | null
          plant_id: string
          suitability?: string | null
          zone_id: string
        }
        Update: {
          notes?: string | null
          plant_id?: string
          suitability?: string | null
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_plant_zones_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "seo_plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_plant_zones_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "seo_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_plants: {
        Row: {
          avoid_plants: string[] | null
          category: string | null
          companion_plants: string[] | null
          content_html: string | null
          created_at: string
          days_to_harvest_max: number | null
          days_to_harvest_min: number | null
          description_long: string | null
          description_short: string
          difficulty: string | null
          faq: Json | null
          featured: boolean
          generation_errors: string[] | null
          generation_status: string | null
          germination_days_max: number | null
          germination_days_min: number | null
          harvest_end: number | null
          harvest_start: number | null
          id: string
          image_alt: string | null
          image_url: string | null
          latin_name: string | null
          mature_height_cm: number | null
          name: string
          name_alternatives: string[] | null
          plant_spacing_cm: number | null
          planting_depth_cm: number | null
          published: boolean
          row_spacing_cm: number | null
          slug: string
          soil_ph_max: number | null
          soil_ph_min: number | null
          sow_indoor_end: number | null
          sow_indoor_start: number | null
          sow_outdoor_end: number | null
          sow_outdoor_start: number | null
          sun_requirement: string | null
          updated_at: string
          water_requirement: string | null
          zone_max: number | null
          zone_min: number | null
        }
        Insert: {
          avoid_plants?: string[] | null
          category?: string | null
          companion_plants?: string[] | null
          content_html?: string | null
          created_at?: string
          days_to_harvest_max?: number | null
          days_to_harvest_min?: number | null
          description_long?: string | null
          description_short: string
          difficulty?: string | null
          faq?: Json | null
          featured?: boolean
          generation_errors?: string[] | null
          generation_status?: string | null
          germination_days_max?: number | null
          germination_days_min?: number | null
          harvest_end?: number | null
          harvest_start?: number | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          latin_name?: string | null
          mature_height_cm?: number | null
          name: string
          name_alternatives?: string[] | null
          plant_spacing_cm?: number | null
          planting_depth_cm?: number | null
          published?: boolean
          row_spacing_cm?: number | null
          slug: string
          soil_ph_max?: number | null
          soil_ph_min?: number | null
          sow_indoor_end?: number | null
          sow_indoor_start?: number | null
          sow_outdoor_end?: number | null
          sow_outdoor_start?: number | null
          sun_requirement?: string | null
          updated_at?: string
          water_requirement?: string | null
          zone_max?: number | null
          zone_min?: number | null
        }
        Update: {
          avoid_plants?: string[] | null
          category?: string | null
          companion_plants?: string[] | null
          content_html?: string | null
          created_at?: string
          days_to_harvest_max?: number | null
          days_to_harvest_min?: number | null
          description_long?: string | null
          description_short?: string
          difficulty?: string | null
          faq?: Json | null
          featured?: boolean
          generation_errors?: string[] | null
          generation_status?: string | null
          germination_days_max?: number | null
          germination_days_min?: number | null
          harvest_end?: number | null
          harvest_start?: number | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          latin_name?: string | null
          mature_height_cm?: number | null
          name?: string
          name_alternatives?: string[] | null
          plant_spacing_cm?: number | null
          planting_depth_cm?: number | null
          published?: boolean
          row_spacing_cm?: number | null
          slug?: string
          soil_ph_max?: number | null
          soil_ph_min?: number | null
          sow_indoor_end?: number | null
          sow_indoor_start?: number | null
          sow_outdoor_end?: number | null
          sow_outdoor_start?: number | null
          sun_requirement?: string | null
          updated_at?: string
          water_requirement?: string | null
          zone_max?: number | null
          zone_min?: number | null
        }
        Relationships: []
      }
      seo_zones: {
        Row: {
          content_html: string | null
          created_at: string
          description: string | null
          faq: Json | null
          first_frost_typical: string | null
          frost_free_days_max: number | null
          frost_free_days_min: number | null
          generation_errors: string[] | null
          generation_status: string | null
          id: string
          last_frost_typical: string | null
          published: boolean
          slug: string
          suitable_categories: string[] | null
          title: string
          typical_regions: string[] | null
          updated_at: string
          winter_temp_min: number | null
          zone_number: number
        }
        Insert: {
          content_html?: string | null
          created_at?: string
          description?: string | null
          faq?: Json | null
          first_frost_typical?: string | null
          frost_free_days_max?: number | null
          frost_free_days_min?: number | null
          generation_errors?: string[] | null
          generation_status?: string | null
          id?: string
          last_frost_typical?: string | null
          published?: boolean
          slug: string
          suitable_categories?: string[] | null
          title: string
          typical_regions?: string[] | null
          updated_at?: string
          winter_temp_min?: number | null
          zone_number: number
        }
        Update: {
          content_html?: string | null
          created_at?: string
          description?: string | null
          faq?: Json | null
          first_frost_typical?: string | null
          frost_free_days_max?: number | null
          frost_free_days_min?: number | null
          generation_errors?: string[] | null
          generation_status?: string | null
          id?: string
          last_frost_typical?: string | null
          published?: boolean
          slug?: string
          suitable_categories?: string[] | null
          title?: string
          typical_regions?: string[] | null
          updated_at?: string
          winter_temp_min?: number | null
          zone_number?: number
        }
        Relationships: []
      }
      sowings: {
        Row: {
          bed_id: string | null
          created_at: string
          id: string
          notes: string | null
          seed_brand: string | null
          sow_date: string
          status: string
          transplant_date: string | null
          type: string
          updated_at: string
          user_id: string
          variety: string
        }
        Insert: {
          bed_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          seed_brand?: string | null
          sow_date: string
          status?: string
          transplant_date?: string | null
          type?: string
          updated_at?: string
          user_id: string
          variety: string
        }
        Update: {
          bed_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          seed_brand?: string | null
          sow_date?: string
          status?: string
          transplant_date?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          variety?: string
        }
        Relationships: [
          {
            foreignKeyName: "sowings_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watering_log: {
        Row: {
          id: string
          plant_id: string | null
          user_id: string
          watered_at: string | null
        }
        Insert: {
          id?: string
          plant_id?: string | null
          user_id: string
          watered_at?: string | null
        }
        Update: {
          id?: string
          plant_id?: string | null
          user_id?: string
          watered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watering_log_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "my_plants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      blog_comments_public: {
        Row: {
          content: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          post_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          post_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: undefined
      }
      get_user_activity_stats: {
        Args: never
        Returns: {
          beds_count: number
          harvests_count: number
          last_activity: string
          pest_logs_count: number
          photos_count: number
          seeds_count: number
          sowings_count: number
          user_id: string
        }[]
      }
      get_weekly_signup_count: { Args: never; Returns: number }
      grant_premium_days: {
        Args: { _days: number; _user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      process_referral: {
        Args: { _new_user_id: string; _referral_code: string }
        Returns: boolean
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

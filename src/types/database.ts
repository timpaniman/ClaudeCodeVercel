// Design Ref: §3.3 — supabase/migrations/001~006 과 1:1 로 맞춘 DB 타입.
// Supabase CLI 를 쓸 수 있게 되면 `supabase gen types typescript --project-id <ref>` 결과로 교체한다
// (그때까지는 마이그레이션을 고칠 때 이 파일도 함께 고친다).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'member' | 'admin'
export type MemberStatus = 'pending' | 'active' | 'rejected'
export type ResourceCategory = 'lecture' | 'code' | 'video' | 'reference' | 'assignment'
export type ActivityEvent = 'login' | 'visit' | 'view_resource' | 'download_resource' | 'view_announcement'
export type DeviceKind = 'mobile' | 'desktop'
export type NotificationKind = 'resource' | 'announcement'

export type Database = {
  public: {
    Tables: {
      cohorts: {
        Row: {
          id: number
          number: number
          name: string
          start_date: string | null
          end_date: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: number
          number: number
          name: string
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['cohorts']['Insert']>
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          company: string | null
          position: string | null
          bio: string | null
          avatar_url: string | null
          github_url: string | null
          linkedin_url: string | null
          website_url: string | null
          role: UserRole
          status: MemberStatus
          cohort_id: number | null
          requested_cohort: number | null
          consented_at: string | null
          notify_new_resource: boolean
          notify_announcement: boolean
          locale: string
          created_at: string
          updated_at: string
        }
        // 행 생성은 가입 트리거(service 컨텍스트)만 한다.
        Insert: {
          id: string
          email: string
          name: string
          company?: string | null
          position?: string | null
          bio?: string | null
          avatar_url?: string | null
          github_url?: string | null
          linkedin_url?: string | null
          website_url?: string | null
          role?: UserRole
          status?: MemberStatus
          cohort_id?: number | null
          requested_cohort?: number | null
          consented_at?: string | null
          notify_new_resource?: boolean
          notify_announcement?: boolean
          locale?: string
          created_at?: string
          updated_at?: string
        }
        // 일반 회원이 수정할 수 있는 컬럼만 (005_rls.sql 의 컬럼 GRANT 와 동일). role/status/cohort_id/email 은 제외.
        Update: {
          name?: string
          company?: string | null
          position?: string | null
          bio?: string | null
          avatar_url?: string | null
          github_url?: string | null
          linkedin_url?: string | null
          website_url?: string | null
          notify_new_resource?: boolean
          notify_announcement?: boolean
          locale?: string
          consented_at?: string | null
          requested_cohort?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_cohort_id_fkey'
            columns: ['cohort_id']
            isOneToOne: false
            referencedRelation: 'cohorts'
            referencedColumns: ['id']
          },
        ]
      }
      roster: {
        Row: {
          id: string
          email: string
          name: string
          cohort_id: number
          role: UserRole
          imported_by: string | null
          imported_at: string
          claimed_by: string | null
          claimed_at: string | null
        }
        Insert: {
          id?: string
          email: string
          name: string
          cohort_id: number
          role?: UserRole
          imported_by?: string | null
          imported_at?: string
          claimed_by?: string | null
          claimed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['roster']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'roster_cohort_id_fkey'
            columns: ['cohort_id']
            isOneToOne: false
            referencedRelation: 'cohorts'
            referencedColumns: ['id']
          },
        ]
      }
      resources: {
        Row: {
          id: string
          cohort_id: number | null
          uploader_id: string
          title: string
          description: string | null
          category: ResourceCategory
          week_number: number | null
          tags: string[]
          storage_path: string | null
          external_url: string | null
          file_type: string | null
          file_size: number | null
          is_published: boolean
          published_at: string | null
          download_count: number
          search_text: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cohort_id?: number | null
          uploader_id: string
          title: string
          description?: string | null
          category: ResourceCategory
          week_number?: number | null
          tags?: string[]
          storage_path?: string | null
          external_url?: string | null
          file_type?: string | null
          file_size?: number | null
          is_published?: boolean
          published_at?: string | null
          download_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['resources']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'resources_cohort_id_fkey'
            columns: ['cohort_id']
            isOneToOne: false
            referencedRelation: 'cohorts'
            referencedColumns: ['id']
          },
        ]
      }
      announcements: {
        Row: {
          id: string
          author_id: string
          title: string
          body: string
          is_pinned: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          title: string
          body: string
          is_pinned?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['announcements']['Insert']>
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          user_id: string
          read_at: string
        }
        Insert: {
          announcement_id: string
          user_id: string
          read_at?: string
        }
        Update: Partial<Database['public']['Tables']['announcement_reads']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'announcement_reads_announcement_id_fkey'
            columns: ['announcement_id']
            isOneToOne: false
            referencedRelation: 'announcements'
            referencedColumns: ['id']
          },
        ]
      }
      activity_log: {
        Row: {
          id: number
          user_id: string
          event: ActivityEvent
          ref_id: string | null
          device: DeviceKind | null
          created_at: string
        }
        // 기록은 log_activity / record_download RPC 로만 한다 (직접 INSERT 권한 없음).
        Insert: never
        Update: never
        Relationships: []
      }
      notification_jobs: {
        Row: {
          id: string
          kind: NotificationKind
          ref_id: string
          status: 'queued' | 'processing' | 'done' | 'failed'
          attempts: number
          error: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          kind: NotificationKind
          ref_id: string
          status?: 'queued' | 'processing' | 'done' | 'failed'
          attempts?: number
          error?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['notification_jobs']['Insert']>
        Relationships: []
      }
      notification_deliveries: {
        Row: {
          job_id: string
          user_id: string
          status: 'sent' | 'failed'
          provider_id: string | null
          error: string | null
          sent_at: string
        }
        Insert: {
          job_id: string
          user_id: string
          status: 'sent' | 'failed'
          provider_id?: string | null
          error?: string | null
          sent_at?: string
        }
        Update: Partial<Database['public']['Tables']['notification_deliveries']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'notification_deliveries_job_id_fkey'
            columns: ['job_id']
            isOneToOne: false
            referencedRelation: 'notification_jobs'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      is_active_member: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      can_view_cohort: { Args: { cid: number }; Returns: boolean }
      can_user_view_cohort: { Args: { p_user: string; cid: number }; Returns: boolean }
      admin_import_roster: { Args: { rows: Json }; Returns: Json }
      admin_set_member_status: {
        Args: { p_user: string; p_status: MemberStatus; p_cohort?: number }
        Returns: undefined
      }
      publish_resource: { Args: { p_id: string; p_notify?: boolean }; Returns: string | null }
      publish_announcement: { Args: { p_id: string; p_notify?: boolean }; Returns: string | null }
      record_download: { Args: { p_resource: string; p_device?: string }; Returns: undefined }
      log_activity: {
        Args: { p_event: string; p_ref?: string; p_device?: string }
        Returns: undefined
      }
      directory_members: {
        Args: { p_cohort_id?: number }
        Returns: {
          id: string
          name: string
          company: string | null
          position: string | null
          bio: string | null
          avatar_url: string | null
          github_url: string | null
          linkedin_url: string | null
          website_url: string | null
          cohort_id: number | null
        }[]
      }
      admin_stats: { Args: Record<PropertyKey, never>; Returns: Json }
      notification_recipients: {
        Args: { p_kind: string; p_ref: string }
        Returns: { user_id: string; email: string; name: string; locale: string }[]
      }
    }
    Enums: {
      user_role: UserRole
      member_status: MemberStatus
    }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

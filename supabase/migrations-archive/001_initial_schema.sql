-- ============================================================
-- AI4CEO 커뮤니티 플랫폼 — 초기 스키마
-- 작성일: 2026-05-26
-- ============================================================

-- ENUM 타입
CREATE TYPE user_role AS ENUM ('student', 'graduate', 'admin');
CREATE TYPE question_status AS ENUM ('pending', 'reviewing', 'answered');

-- ============================================================
-- 1. profiles (사용자 프로필)
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  company       TEXT,
  position      TEXT,
  bio           TEXT,
  avatar_url    TEXT,
  github_url    TEXT,
  linkedin_url  TEXT,
  website_url   TEXT,
  role          user_role NOT NULL DEFAULT 'student',
  cohort_id     INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. cohorts (기수)
-- ============================================================
CREATE TABLE cohorts (
  id          SERIAL PRIMARY KEY,
  number      INTEGER NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE,
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. cohort_members (기수-사용자 매핑)
-- ============================================================
CREATE TABLE cohort_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id   INTEGER NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cohort_id, user_id)
);

-- profiles.cohort_id FK 추가
ALTER TABLE profiles
  ADD CONSTRAINT profiles_cohort_id_fkey
  FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;

-- ============================================================
-- 4. posts (커뮤니티 게시글)
-- ============================================================
CREATE TABLE posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cohort_id        INTEGER REFERENCES cohorts(id) ON DELETE SET NULL,
  title            TEXT,
  body             TEXT NOT NULL,
  image_url        TEXT,
  is_pinned        BOOLEAN NOT NULL DEFAULT FALSE,
  is_announcement  BOOLEAN NOT NULL DEFAULT FALSE,
  likes_count      INTEGER NOT NULL DEFAULT 0,
  comments_count   INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. comments (댓글)
-- ============================================================
CREATE TABLE comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id    UUID REFERENCES comments(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  likes_count  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. resources (학습 자료)
-- ============================================================
CREATE TABLE resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id       INTEGER REFERENCES cohorts(id) ON DELETE SET NULL,
  uploader_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  file_url        TEXT,
  file_type       TEXT,
  file_size       INTEGER,
  week_number     INTEGER,
  category        TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  download_count  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. projects (AI 프로젝트 쇼케이스)
-- ============================================================
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cohort_id       INTEGER REFERENCES cohorts(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  github_url      TEXT,
  demo_url        TEXT,
  screenshot_url  TEXT,
  category        TEXT NOT NULL DEFAULT 'other',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  likes_count     INTEGER NOT NULL DEFAULT 0,
  comments_count  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. impact_stories (비즈니스 임팩트 스토리)
-- ============================================================
CREATE TABLE impact_stories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cohort_id     INTEGER REFERENCES cohorts(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  industry      TEXT,
  metric_label  TEXT,
  metric_value  TEXT,
  ai_summary    TEXT,
  ai_tags       TEXT[] NOT NULL DEFAULT '{}',
  likes_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. ask_questions (교수 직통 질문함)
-- ============================================================
CREATE TABLE ask_questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cohort_id    INTEGER REFERENCES cohorts(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  status       question_status NOT NULL DEFAULT 'pending',
  votes_count  INTEGER NOT NULL DEFAULT 0,
  answer       TEXT,
  answered_at  TIMESTAMPTZ,
  answered_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. ai_conversations (AI 채팅 히스토리)
-- ============================================================
CREATE TABLE ai_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT,
  messages    JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. notifications (알림)
-- ============================================================
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 인덱스
-- ============================================================
CREATE INDEX idx_posts_author     ON posts(author_id);
CREATE INDEX idx_posts_cohort     ON posts(cohort_id);
CREATE INDEX idx_posts_created    ON posts(created_at DESC);
CREATE INDEX idx_comments_post    ON comments(post_id);
CREATE INDEX idx_resources_cohort ON resources(cohort_id);
CREATE INDEX idx_projects_author  ON projects(author_id);
CREATE INDEX idx_notif_user       ON notifications(user_id, is_read);
CREATE INDEX idx_ai_conv_user     ON ai_conversations(user_id);
CREATE INDEX idx_ask_status       ON ask_questions(status, votes_count DESC);

-- ============================================================
-- 트리거: updated_at 자동 갱신
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated    BEFORE UPDATE ON profiles    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_posts_updated       BEFORE UPDATE ON posts       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_comments_updated    BEFORE UPDATE ON comments    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated    BEFORE UPDATE ON projects    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_impact_updated      BEFORE UPDATE ON impact_stories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ask_updated         BEFORE UPDATE ON ask_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ai_conv_updated     BEFORE UPDATE ON ai_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 트리거: 신규 사용자 → profiles 자동 생성
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

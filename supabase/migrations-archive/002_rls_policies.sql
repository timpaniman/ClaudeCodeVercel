-- ============================================================
-- AI4CEO — RLS (Row Level Security) 정책
-- ============================================================

-- RLS 활성화
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources         ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_stories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ask_questions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;

-- Helper: 현재 사용자 역할 조회
CREATE OR REPLACE FUNCTION get_user_role(uid UUID)
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = uid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- profiles
-- ============================================================
-- 로그인한 모든 사용자: 전체 프로필 조회 가능
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- 본인 프로필만 수정 가능
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- cohorts
-- ============================================================
-- 모든 인증 사용자: 기수 목록 조회 가능
CREATE POLICY "cohorts_select" ON cohorts
  FOR SELECT USING (auth.role() = 'authenticated');

-- 운영진만 기수 생성/수정
CREATE POLICY "cohorts_insert" ON cohorts
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "cohorts_update" ON cohorts
  FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

-- ============================================================
-- cohort_members
-- ============================================================
CREATE POLICY "cohort_members_select" ON cohort_members
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "cohort_members_insert" ON cohort_members
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- ============================================================
-- posts
-- ============================================================
-- 모든 인증 사용자: 게시글 조회
CREATE POLICY "posts_select" ON posts
  FOR SELECT USING (auth.role() = 'authenticated');

-- 로그인한 사용자: 게시글 작성
CREATE POLICY "posts_insert" ON posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- 본인 게시글 수정, 운영진은 모든 글 수정 가능
CREATE POLICY "posts_update" ON posts
  FOR UPDATE USING (
    auth.uid() = author_id OR
    get_user_role(auth.uid()) = 'admin'
  );

-- 본인 게시글 삭제, 운영진은 모든 글 삭제 가능
CREATE POLICY "posts_delete" ON posts
  FOR DELETE USING (
    auth.uid() = author_id OR
    get_user_role(auth.uid()) = 'admin'
  );

-- ============================================================
-- comments
-- ============================================================
CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "comments_insert" ON comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "comments_update" ON comments
  FOR UPDATE USING (
    auth.uid() = author_id OR
    get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "comments_delete" ON comments
  FOR DELETE USING (
    auth.uid() = author_id OR
    get_user_role(auth.uid()) = 'admin'
  );

-- ============================================================
-- resources
-- ============================================================
CREATE POLICY "resources_select" ON resources
  FOR SELECT USING (auth.role() = 'authenticated');

-- 운영진만 자료 업로드
CREATE POLICY "resources_insert" ON resources
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "resources_update" ON resources
  FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "resources_delete" ON resources
  FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- ============================================================
-- projects
-- ============================================================
CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (
    auth.uid() = author_id OR
    get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (
    auth.uid() = author_id OR
    get_user_role(auth.uid()) = 'admin'
  );

-- ============================================================
-- impact_stories
-- ============================================================
CREATE POLICY "impact_select" ON impact_stories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "impact_insert" ON impact_stories
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "impact_update" ON impact_stories
  FOR UPDATE USING (
    auth.uid() = author_id OR
    get_user_role(auth.uid()) = 'admin'
  );

-- ============================================================
-- ask_questions
-- ============================================================
CREATE POLICY "ask_select" ON ask_questions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "ask_insert" ON ask_questions
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- 답변 작성/상태 변경은 운영진만
CREATE POLICY "ask_update" ON ask_questions
  FOR UPDATE USING (
    auth.uid() = author_id OR
    get_user_role(auth.uid()) = 'admin'
  );

-- ============================================================
-- ai_conversations
-- ============================================================
-- 본인 대화만 접근 가능
CREATE POLICY "ai_conv_select" ON ai_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ai_conv_insert" ON ai_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_conv_update" ON ai_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "ai_conv_delete" ON ai_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- notifications
-- ============================================================
CREATE POLICY "notif_select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notif_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

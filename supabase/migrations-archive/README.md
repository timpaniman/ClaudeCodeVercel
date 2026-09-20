# migrations-archive

2026-05-26에 작성된 초기 스키마(001)와 RLS(002). **Supabase에 적용된 적이 없고**, 2026-09-19 Design 승인으로
v1 전용 스키마(`../migrations/001~006`)로 대체되었다. 참고용으로만 보관한다.

폐기 사유(Design §1.3, §7.1): 피드/AI/쇼케이스 등 v1 범위 밖 테이블 포함, `profiles_update` 정책이
컬럼 제한 없이 본인 행 전체 수정을 허용(role 상승 가능), `resources`/`profiles` SELECT가 모든 로그인자에게 개방.

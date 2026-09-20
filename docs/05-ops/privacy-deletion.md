# 회원 탈퇴·개인정보 삭제 요청 처리 절차

> Design §7.3 (탈퇴/삭제 요청 절차 문서화)에 해당한다. v1 은 화면에 "탈퇴" 기능이 없으므로 **운영진이 요청을 받아 직접 처리**한다.
> 삭제는 되돌릴 수 없다. 반드시 본인 요청임을 확인한 뒤(가입 이메일로 온 요청, 또는 교수님이 직접 받은 요청) 진행한다.

## 1. 접수
- 창구: 교수님(또는 지정한 운영진)에게 카카오톡·이메일로 온 요청. 접수 날짜와 요청자 이름을 기록해 둔다.
- 처리 기한은 내부 기준으로 정한다(예: 접수 후 7일 이내). 법정 기한은 법무 담당과 확인한다.

## 2. 무엇이 지워지는가 (DB 관계 기준)
| 데이터 | 삭제 시 동작 |
|--------|--------------|
| 로그인 계정 (`auth.users`) | 삭제 |
| 프로필 (`profiles`: 이름·회사·직책·소개·링크·이메일·동의 시각) | 계정과 함께 **자동 삭제** (`on delete cascade`) |
| 공지 읽음 기록, 접속·열람·다운로드 기록 (`announcement_reads`, `activity_log`) | 프로필과 함께 **자동 삭제** |
| 알림 발송 기록 (`notification_deliveries`) | 프로필과 함께 **자동 삭제** |
| **명단 행 (`roster`: 이메일·이름·기수)** | **자동 삭제되지 않는다** — 연결만 끊어진다(`claimed_by` 가 비워짐). **아래 3-3 에서 직접 지운다.** |
| 이미 발송된 이메일 | 회수할 수 없다 (Resend 에 발송 기록이 남는 기간은 Resend 정책을 따름) |

## 3. 처리 순서 (Supabase 대시보드)
1. **대상 확인:** 관리자 화면 명단 또는 Supabase SQL Editor 에서 이메일로 대상을 찾는다.
   ```sql
   select p.id, p.email, p.name, p.role, p.status
   from public.profiles p where lower(p.email) = lower('삭제요청자@example.com');
   ```
2. **자료·공지 작성자가 아닌지 확인** — 운영진이 올린 자료(`resources.uploader_id`)와 공지(`announcements.author_id`)는 프로필에 묶여 있어 삭제가 막힌다.
   ```sql
   select (select count(*) from public.resources     where uploader_id = '대상-id') as resources,
          (select count(*) from public.announcements where author_id   = '대상-id') as announcements;
   ```
   0/0 이 아니면(운영진 계정) 다른 운영진 계정으로 작성자를 옮긴 뒤 삭제한다.
   ```sql
   update public.resources     set uploader_id = '인계받을-운영진-id' where uploader_id = '대상-id';
   update public.announcements set author_id   = '인계받을-운영진-id' where author_id   = '대상-id';
   ```
3. **명단 행 삭제** (이 행에 이메일·이름이 남아 있다)
   ```sql
   delete from public.roster where lower(email) = lower('삭제요청자@example.com');
   ```
4. **계정 삭제:** Supabase 대시보드 **Authentication → Users** 에서 해당 사용자를 찾아 **Delete user**. 프로필과 활동 기록이 함께 지워진다.
5. **확인:**
   ```sql
   select (select count(*) from public.profiles where lower(email) = lower('삭제요청자@example.com')) as profiles,
          (select count(*) from public.roster   where lower(email) = lower('삭제요청자@example.com')) as roster;
   ```
   둘 다 0 이어야 한다.
6. **기록:** 처리 날짜와 처리자를 요청 기록에 남긴다(삭제한 개인정보 자체는 기록하지 않는다).

## 4. 주의
- 같은 사람이 나중에 다시 가입하려면 명단을 다시 등록해야 자동 승인된다.
- 삭제 요청이 "알림 메일만 그만 받고 싶다"는 뜻이면 삭제할 필요 없이 **수신 해제**(메일 하단 링크 또는 "나" 탭의 알림 스위치)로 충분하다.
- 명단 CSV 원본 파일과 카카오톡 대화에 남은 정보는 이 절차로 지워지지 않는다. 원본 파일도 함께 삭제한다.

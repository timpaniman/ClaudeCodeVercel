// 언어별 문구를 도메인 파일(core, auth, library, …)에서 모아 하나로 합친다. 파일마다 최상위 키가 문구 네임스페이스(예: auth.login.…)다.
// 새 도메인 파일을 만들면 아래 두 곳(en, ko)에 같은 이름으로 추가한다. 두 언어의 키는 테스트(tests/unit/i18n.test.ts)가 항상 같은지 검사한다.
import enAdmin from './en/admin.json'
import enAuth from './en/auth.json'
import enContent from './en/content.json'
import enEmail from './en/email.json'
import enCore from './en/core.json'
import enLibrary from './en/library.json'
import koAdmin from './ko/admin.json'
import koAuth from './ko/auth.json'
import koContent from './ko/content.json'
import koEmail from './ko/email.json'
import koCore from './ko/core.json'
import koLibrary from './ko/library.json'

export const messages = {
  en: { ...enCore, ...enAuth, ...enLibrary, ...enContent, ...enAdmin, ...enEmail },
  ko: { ...koCore, ...koAuth, ...koLibrary, ...koContent, ...koAdmin, ...koEmail },
} as const

export type Messages = (typeof messages)['en']

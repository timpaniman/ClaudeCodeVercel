// 홈 화면 추가 안내를 어떻게 보여 줄지 결정하는 순수 함수 (브라우저마다 설치 방식이 달라 분기가 필요하다).
export type InstallMode = 'installed' | 'prompt' | 'ios' | 'ios-other-browser' | 'none'

export interface InstallEnv {
  userAgent: string
  /** 이미 홈 화면 앱으로 실행 중인가 (display-mode: standalone 또는 iOS navigator.standalone) */
  standalone: boolean
  /** Chrome 계열이 beforeinstallprompt 이벤트를 주었는가 */
  hasInstallPrompt: boolean
}

export function decideInstallMode({ userAgent, standalone, hasInstallPrompt }: InstallEnv): InstallMode {
  if (standalone) return 'installed'
  if (hasInstallPrompt) return 'prompt'
  // iOS 는 설치 API 가 없어 안내 문구만 보여 준다. iOS 의 Chrome·Edge·Naver 등(CriOS/FxiOS/EdgiOS/NAVER) 은 홈 화면 추가가 안 되므로 Safari 만 대상으로 한다.
  const isIos = /iPhone|iPad|iPod/i.test(userAgent)
  const isSafari = /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|NAVER|DaumApps|KAKAOTALK|Instagram|FBAN|FBAV/i.test(userAgent)
  if (!isIos) return 'none'
  // 카카오톡·네이버 등 앱 안 브라우저나 iOS 의 다른 브라우저: 설치할 수 없으니 Safari 로 열도록 안내한다 (졸업생이 카카오톡 링크로 들어오는 경우가 많다)
  return isSafari ? 'ios' : 'ios-other-browser'
}

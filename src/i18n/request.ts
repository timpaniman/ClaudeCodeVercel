import { cookies } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { messages } from '@/messages'
import { LOCALE_COOKIE, resolveLocale } from './config'

// 서버가 요청마다 쿠키로 언어를 정하고 그 언어의 문구를 불러온다. (서버·클라이언트가 같은 언어를 쓰도록 Provider 로 내려준다)
export default getRequestConfig(async () => {
  const locale = resolveLocale(cookies().get(LOCALE_COOKIE)?.value)
  return { locale, messages: messages[locale] }
})

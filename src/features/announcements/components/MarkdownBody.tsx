// Design Ref: §7.3 — 공지 본문은 안전한 마크다운 렌더러로 출력한다 (XSS 방지).
//   - react-markdown 은 원문 HTML 을 렌더링하지 않는다 (raw HTML 플러그인을 쓰지 않음)
//   - javascript: 등 위험한 주소는 기본 urlTransform 이 제거한다
//   - 이미지는 외부 추적·불쾌한 콘텐츠 방지를 위해 허용하지 않는다
//   - 링크는 새 창 + noopener noreferrer
import ReactMarkdown, { type Components } from 'react-markdown'

const components: Components = {
  h1: ({ children }) => <h2 className="mt-6 mb-3 text-xl font-bold text-white">{children}</h2>,
  h2: ({ children }) => <h3 className="mt-5 mb-2 text-lg font-bold text-white">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-4 mb-2 text-base font-semibold text-white">{children}</h4>,
  p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1 pl-6">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-green-500/60 pl-4 text-gray-300">{children}</blockquote>,
  hr: () => <hr className="my-6 border-white/10" />,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  code: ({ children }) => <code className="rounded bg-white/10 px-1.5 py-0.5 text-[0.9em]">{children}</code>,
  pre: ({ children }) => <pre className="my-4 overflow-x-auto rounded-xl bg-gray-900 p-4 text-sm">{children}</pre>,
  // 위험한 주소(javascript: 등)는 기본 urlTransform 이 빈 문자열로 바꾼다. 그런 링크는 클릭 가능한 빈 링크가 아니라 일반 글자로 보여 준다.
  a: ({ href, children }) =>
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-green-300 underline underline-offset-4 hover:text-green-200">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
}

export function MarkdownBody({ source }: { source: string }) {
  return (
    <div className="text-base text-gray-200 break-words">
      <ReactMarkdown components={components} disallowedElements={['img']} unwrapDisallowed>
        {source}
      </ReactMarkdown>
    </div>
  )
}

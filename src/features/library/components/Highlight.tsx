// 검색어를 강조 표시한다. 정규식을 쓰지 않고 문자열 탐색만 하므로 특수문자가 들어와도 안전하다.
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase()
  if (!q) return <>{text}</>

  const lower = text.toLowerCase()
  const parts: React.ReactNode[] = []
  let from = 0
  let idx = lower.indexOf(q, from)
  while (idx !== -1) {
    if (idx > from) parts.push(text.slice(from, idx))
    parts.push(
      <mark key={idx} className="bg-green-500/30 text-white rounded px-0.5">
        {text.slice(idx, idx + q.length)}
      </mark>,
    )
    from = idx + q.length
    idx = lower.indexOf(q, from)
  }
  parts.push(text.slice(from))
  return <>{parts}</>
}

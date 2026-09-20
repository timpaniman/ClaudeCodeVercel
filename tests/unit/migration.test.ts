import { describe, expect, test } from 'vitest'
import {
  MANIFEST_COLUMNS,
  contentTypeFor,
  guessFromPath,
  isJunkFile,
  parseManifest,
  scanRow,
  serializeManifest,
  validateManifestRow,
  type ManifestRow,
} from '@/features/migration/manifest'
import { MAX_UPLOAD_BYTES } from '@/features/library/fileType'

const ctx = { cohortNumbers: new Set([1, 12, 17]) }
const row = (over: Partial<ManifestRow>): ManifestRow => ({
  ...(Object.fromEntries(MANIFEST_COLUMNS.map((c) => [c, ''])) as ManifestRow),
  status: 'ok', path: 'a.pdf', cohort_number: '12', category: 'lecture', title: '제목', ...over,
})

describe('isJunkFile', () => {
  test.each([['.DS_Store', true], ['Thumbs.db', true], ['desktop.ini', true], ['~$임시.docx', true], ['.hidden', true], ['강의.pdf', false]])(
    '%s → %s', (name, junk) => expect(isJunkFile(name)).toBe(junk),
  )
})

describe('guessFromPath', () => {
  test('기수/주차 폴더 구조', () => {
    expect(guessFromPath('17기/8주차/RAG 강의노트.pdf')).toEqual({ cohort: 17, week: 8, category: 'lecture', title: 'RAG 강의노트', tags: [] })
  })
  test('다양한 표기: 제12기, 12기_강의자료, Week3, cohort-5', () => {
    expect(guessFromPath('제12기/강의자료/Week3/노트.pdf')).toMatchObject({ cohort: 12, week: 3, category: 'lecture' })
    expect(guessFromPath('12기_강의자료/3주/노트.pdf')).toMatchObject({ cohort: 12, week: 3 })
    expect(guessFromPath('cohort-5/week 2/a.py')).toMatchObject({ cohort: 5, week: 2, category: 'code' })
  })
  test('공용 폴더', () => {
    expect(guessFromPath('공용/오리엔테이션.pdf')).toMatchObject({ cohort: 'common', week: null })
    expect(guessFromPath('COMMON/x.pdf').cohort).toBe('common')
  })
  test('기수를 찾지 못하면 null', () => {
    expect(guessFromPath('기타/자료.pdf').cohort).toBeNull()
    expect(guessFromPath('자료.pdf').cohort).toBeNull()
  })
  test('파일명에서도 찾는다 (폴더가 우선)', () => {
    expect(guessFromPath('17기_8주차_노트.pdf')).toMatchObject({ cohort: 17, week: 8 })
    expect(guessFromPath('17기/3주차/12기_비교표.pdf').cohort).toBe(17)
  })
  test('카테고리: 폴더 힌트가 확장자보다 우선', () => {
    expect(guessFromPath('17기/과제/제출양식.pdf').category).toBe('assignment')
    expect(guessFromPath('17기/참고자료/논문.pdf').category).toBe('reference')
    expect(guessFromPath('17기/실습코드/a.zip').category).toBe('code')
    expect(guessFromPath('17기/x.py').category).toBe('code')
    expect(guessFromPath('17기/표.xlsx').category).toBe('reference')
  })
  test('주차 범위(1~20) 밖은 무시', () => {
    expect(guessFromPath('17기/25주차/a.pdf').week).toBeNull()
  })
  test('제목: 확장자 제거, 밑줄→공백. 남는 폴더 이름은 태그(최대 3)', () => {
    const g = guessFromPath('17기/3주차/프롬프트/심화/사례/자료_최종_v2.pdf')
    expect(g.title).toBe('자료 최종 v2')
    expect(g.tags).toEqual(['프롬프트', '심화', '사례'])
  })
})

describe('scanRow', () => {
  test('정상 파일은 ok', () => {
    expect(scanRow('17기/8주차/노트.pdf', 1000)).toMatchObject({ status: 'ok', cohort_number: '17', week_number: '8', category: 'lecture', title: '노트' })
  })
  test('영상은 skip + 링크 안내', () => {
    const r = scanRow('17기/강의.mp4', 5000)
    expect(r.status).toBe('skip')
    expect(r.note).toContain('external_url')
  })
  test('지원하지 않는 형식·빈 파일·50MB 초과는 skip', () => {
    expect(scanRow('17기/a.exe', 10)).toMatchObject({ status: 'skip' })
    expect(scanRow('17기/a.exe', 10).note).toContain('.exe')
    expect(scanRow('17기/a.pdf', 0)).toMatchObject({ status: 'skip', note: '빈 파일입니다.' })
    expect(scanRow('17기/a.pdf', MAX_UPLOAD_BYTES + 1).note).toContain('50MB')
    expect(scanRow('17기/a.pdf', MAX_UPLOAD_BYTES).status).toBe('ok')
  })
  test('기수를 못 찾으면 review', () => {
    expect(scanRow('기타/a.pdf', 10)).toMatchObject({ status: 'review', cohort_number: '' })
  })
})

describe('validateManifestRow', () => {
  test('정상: 파일 행', () => {
    const v = validateManifestRow(row({ week_number: '3', tags: '#ai, rag', description: ' 설명 ' }), ctx)
    expect(v).toEqual({ ok: true, item: { kind: 'file', path: 'a.pdf', externalUrl: null, cohortNumber: 12, week: 3, category: 'lecture', title: '제목', tags: ['ai', 'rag'], description: '설명' } })
  })
  test('정상: 링크 행, 공용(common/공용), 한글 카테고리, "17기", "3주차"', () => {
    const v = validateManifestRow(row({ path: '', external_url: 'https://youtu.be/dQw4w9WgXcQ', cohort_number: 'common', category: '영상', week_number: '3주차' }), ctx)
    expect(v).toMatchObject({ ok: true, item: { kind: 'link', cohortNumber: null, category: 'video', week: 3, externalUrl: 'https://youtu.be/dQw4w9WgXcQ' } })
    expect(validateManifestRow(row({ cohort_number: '공용' }), ctx)).toMatchObject({ ok: true, item: { cohortNumber: null } })
    expect(validateManifestRow(row({ cohort_number: '17기' }), ctx)).toMatchObject({ ok: true, item: { cohortNumber: 17 } })
  })
  test('기수를 비워 두면 오류 (실수로 공용이 되지 않게)', () => {
    const v = validateManifestRow(row({ cohort_number: '' }), ctx)
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.errors.join()).toContain('cohort_number')
  })
  test.each([
    [{ path: '', external_url: '' }, 'path'],
    [{ external_url: 'https://a.com' }, '동시에'],
    [{ path: '../x.pdf' }, '상대 경로'],
    [{ path: '/etc/x.pdf' }, '상대 경로'],
    [{ path: 'C:\\x.pdf' }, '상대 경로'],
    [{ path: 'a.exe' }, '지원하지 않는'],
    [{ path: '', external_url: 'http://a.com' }, 'https'],
    [{ path: '', external_url: 'javascript:alert(1)' }, 'https'],
    [{ cohort_number: '99' }, '존재하지 않는 기수'],
    [{ cohort_number: 'abc' }, '읽을 수 없습니다'],
    [{ week_number: '0' }, 'week_number'],
    [{ week_number: '21' }, 'week_number'],
    [{ category: 'movie' }, 'category'],
    [{ title: '  ' }, 'title'],
    [{ title: 'x'.repeat(201) }, '200자'],
    [{ tags: Array.from({ length: 11 }, (_, i) => `t${i}`).join(',') }, '최대'],
  ] as const)('오류 %j → %s', (over, expected) => {
    const v = validateManifestRow(row(over as Partial<ManifestRow>), ctx)
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.errors.join(' | ')).toContain(expected)
  })
  test('여러 오류를 한 번에 알려 준다', () => {
    const v = validateManifestRow(row({ cohort_number: '', title: '', category: 'x' }), ctx)
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.errors.length).toBeGreaterThanOrEqual(3)
  })
})

describe('manifest CSV', () => {
  test('직렬화 → 파싱 왕복 (쉼표·따옴표·줄바꿈·한글 포함)', () => {
    const rows = [
      row({ title: '쉼표, 그리고 "따옴표"', description: '첫 줄\n둘째 줄', tags: 'a, b' }),
      row({ path: '', external_url: 'https://youtu.be/dQw4w9WgXcQ', title: '영상' }),
    ]
    const csv = serializeManifest(rows)
    expect(csv.startsWith('\uFEFF')).toBe(true) // Excel 한글 호환
    expect(parseManifest(csv)).toEqual({ rows })
  })
  test('열 순서가 달라도, 알 수 없는 열이 있어도 읽는다', () => {
    const r = parseManifest('Title,Status,PATH,Extra\n노트,ok,a.pdf,zzz')
    expect(r.error).toBeUndefined()
    expect(r.rows[0]).toMatchObject({ title: '노트', status: 'ok', path: 'a.pdf' })
  })
  test('manifest 가 아닌 파일은 오류', () => {
    expect(parseManifest('email,name\na@b.com,x').error).toContain('manifest')
  })
})

test('contentTypeFor', () => {
  expect(contentTypeFor('a.PDF')).toBe('application/pdf')
  expect(contentTypeFor('a.pptx')).toContain('presentationml')
  expect(contentTypeFor('a.unknown')).toBe('application/octet-stream')
})

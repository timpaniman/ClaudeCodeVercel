import { describe, expect, test } from 'vitest'
import {
  DEFAULT_PARAMS,
  MAX_PAGE,
  MAX_QUERY_LENGTH,
  escapeLike,
  parseLibraryParams,
  toSearchString,
} from '@/features/library/params'
import {
  MAX_UPLOAD_BYTES,
  buildStoragePath,
  downloadFilename,
  extensionOf,
  formatFileSize,
  inferFileType,
  isSafeExternalUrl,
  isTextPreviewable,
  parseVideoEmbed,
  resourceKind,
  validateUpload,
  withDownloadName,
} from '@/features/library/fileType'
import { detectDevice } from '@/lib/device'

describe('parseLibraryParams', () => {
  test('빈 입력은 기본값', () => {
    expect(parseLibraryParams({})).toEqual(DEFAULT_PARAMS)
  })

  test('정상 값을 읽는다', () => {
    expect(parseLibraryParams({ q: '  RAG   청크 ', cohort: '12', category: 'code', week: '3', sort: 'downloads', page: '2' })).toEqual({
      q: 'RAG 청크', cohort: 12, category: 'code', week: 3, sort: 'downloads', page: 2,
    })
    expect(parseLibraryParams({ cohort: 'common' }).cohort).toBe('common')
  })

  test.each([
    [{ cohort: 'abc' }, 'cohort', null],
    [{ cohort: '0' }, 'cohort', null],
    [{ cohort: '-3' }, 'cohort', null],
    [{ cohort: '1e3' }, 'cohort', null],
    [{ category: 'hack' }, 'category', null],
    [{ week: '0' }, 'week', null],
    [{ week: '21' }, 'week', null],
    [{ week: 'x' }, 'week', null],
    [{ sort: 'random' }, 'sort', 'latest'],
    [{ page: '0' }, 'page', 1],
    [{ page: String(MAX_PAGE + 1) }, 'page', 1],
    [{ page: 'NaN' }, 'page', 1],
  ])('잘못된 값 %j → 안전한 기본값', (raw, key, expected) => {
    expect(parseLibraryParams(raw)[key as keyof typeof DEFAULT_PARAMS]).toBe(expected)
  })

  test('검색어는 길이를 제한하고 배열이 들어와도 첫 값만 쓴다', () => {
    expect(parseLibraryParams({ q: 'a'.repeat(500) }).q).toHaveLength(MAX_QUERY_LENGTH)
    expect(parseLibraryParams({ q: ['첫째', '둘째'] }).q).toBe('첫째')
  })
})

describe('toSearchString', () => {
  test('기본값은 생략하고, 필터가 바뀌면 page 는 1로 돌아간다', () => {
    const cur = { ...DEFAULT_PARAMS, q: '검색', page: 3 }
    expect(toSearchString(cur, { category: 'video' })).toBe('?q=%EA%B2%80%EC%83%89&category=video')
    expect(toSearchString(cur, { page: 4 })).toBe('?q=%EA%B2%80%EC%83%89&page=4')
    expect(toSearchString(DEFAULT_PARAMS)).toBe('')
  })

  test('parse → toSearchString → parse 가 같은 값으로 돌아온다', () => {
    const p = parseLibraryParams({ q: '한글 검색', cohort: '17', category: 'lecture', week: '5', sort: 'downloads', page: '2' })
    const qs = toSearchString(p, { page: p.page })
    const back = parseLibraryParams(Object.fromEntries(new URLSearchParams(qs)))
    expect(back).toEqual(p)
  })
})

describe('escapeLike', () => {
  test('LIKE 특수문자를 문자 그대로 검색하도록 이스케이프', () => {
    expect(escapeLike('100%')).toBe('100\\%')
    expect(escapeLike('a_b')).toBe('a\\_b')
    expect(escapeLike('c:\\path')).toBe('c:\\\\path')
    expect(escapeLike('일반 검색')).toBe('일반 검색')
  })
})

describe('파일 종류·업로드 검증', () => {
  test('extensionOf / inferFileType', () => {
    expect(extensionOf('Report.FINAL.PDF')).toBe('pdf')
    expect(extensionOf('noext')).toBe('')
    expect(inferFileType('a.pdf')).toBe('pdf')
    expect(inferFileType('a.PNG')).toBe('image')
    expect(inferFileType('main.py')).toBe('code')
    expect(inferFileType('a.pptx')).toBe('other')
    expect(inferFileType('a')).toBe('other')
  })

  test('validateUpload: 허용 확장자·빈 파일·크기', () => {
    expect(validateUpload({ name: '강의.pdf', size: 1000 })).toBeNull()
    expect(validateUpload({ name: 'run.exe', size: 1000 })).toMatchObject({ key: 'badType' })
    expect(validateUpload({ name: 'a.pdf', size: 0 })).toEqual({ key: 'empty' })
    expect(validateUpload({ name: 'a.pdf', size: MAX_UPLOAD_BYTES + 1 })).toEqual({ key: 'tooLarge', max: MAX_UPLOAD_BYTES / 1024 / 1024 })
    expect(validateUpload({ name: 'a.pdf', size: MAX_UPLOAD_BYTES })).toBeNull()
    expect(validateUpload({ name: 'a.PDF.exe', size: 10 })).toMatchObject({ key: 'badType' }) // 마지막 확장자 기준
  })

  test('저장 경로는 ASCII 고정 (한글 파일명 키 문제 회피)', () => {
    expect(buildStoragePath(12, 'abc-123', '12기 강의노트(최종).PDF')).toBe('12/abc-123/file.pdf')
    expect(buildStoragePath(null, 'abc-123', 'x.zip')).toBe('common/abc-123/file.zip')
    expect(buildStoragePath(null, 'abc-123', 'noext')).toBe('common/abc-123/file')
    expect(buildStoragePath(12, 'id', '한글.pdf')).toMatch(/^[\x20-\x7e]+$/)
  })

  test('downloadFilename: 제목 + 확장자, 위험 문자 제거', () => {
    expect(downloadFilename('12기 1주차 강의노트', '12/x/file.pdf')).toBe('12기 1주차 강의노트.pdf')
    expect(downloadFilename('../../etc/passwd', '12/x/file.pdf')).toBe('.._.._etc_passwd.pdf')
    expect(downloadFilename('a:b*c?"d<e>f|g', '1/x/file.zip')).toBe('a_b_c__d_e_f_g.zip')
    expect(downloadFilename('   ', '1/x/file.txt')).toBe('download.txt')
    expect(downloadFilename('x'.repeat(200), '1/x/file.txt')).toHaveLength(80 + 4)
  })

  test('withDownloadName: 파일명을 한 번만 인코딩해 붙인다 (SDK download 옵션의 이중 인코딩 회피)', () => {
    const url = 'https://x.supabase.co/storage/v1/object/sign/resources/1/a/file.pdf?token=abc'
    expect(withDownloadName(url, '12기 강의노트.pdf')).toBe(`${url}&download=12%EA%B8%B0%20%EA%B0%95%EC%9D%98%EB%85%B8%ED%8A%B8.pdf`)
    expect(withDownloadName('https://x.co/f', 'a b.txt')).toBe('https://x.co/f?download=a%20b.txt')
    // 인코딩 결과에 '%25' (이중 인코딩의 흔적)가 없어야 한다
    expect(withDownloadName(url, '한글.pdf')).not.toContain('%25')
    // 퍼센트 문자가 이름에 있으면 그 문자만 %25 로 인코딩된다
    expect(withDownloadName(url, '100%.pdf')).toContain('download=100%25.pdf')
  })

  test('isTextPreviewable: 확장자와 크기 제한', () => {
    expect(isTextPreviewable('1/x/file.py', 1000)).toBe(true)
    expect(isTextPreviewable('1/x/file.py', 300 * 1024)).toBe(false)
    expect(isTextPreviewable('1/x/file.ipynb', 100)).toBe(false)
    expect(isTextPreviewable('1/x/file.pdf', 100)).toBe(false)
    expect(isTextPreviewable('1/x/file.txt', null)).toBe(true)
  })

  test('formatFileSize', () => {
    expect(formatFileSize(null)).toBe('')
    expect(formatFileSize(512)).toBe('512B')
    expect(formatFileSize(2048)).toBe('2.0KB')
    expect(formatFileSize(300 * 1024)).toBe('300KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0MB')
  })
})

describe('parseVideoEmbed / isSafeExternalUrl', () => {
  test.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?t=10', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'],
    ['https://vimeo.com/123456789', 'https://player.vimeo.com/video/123456789'],
  ])('%s → 임베드', (url, embed) => {
    expect(parseVideoEmbed(url)?.embedUrl).toBe(embed)
  })

  test.each([
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ', // http
    'https://evil.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com.evil.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v="><script>',
    'https://vimeo.com/abc',
    'javascript:alert(1)',
    'not a url',
  ])('%s → 임베드하지 않음', (url) => {
    expect(parseVideoEmbed(url)).toBeNull()
  })

  test('isSafeExternalUrl: https 만', () => {
    expect(isSafeExternalUrl('https://example.com/a')).toBe(true)
    expect(isSafeExternalUrl('http://example.com')).toBe(false)
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeExternalUrl('ftp://x.com')).toBe(false)
    expect(isSafeExternalUrl('https://' + 'a'.repeat(3000))).toBe(false)
    expect(isSafeExternalUrl('')).toBe(false)
  })
})

describe('resourceKind', () => {
  const base = { file_type: null, storage_path: null, external_url: null, category: 'lecture' }
  test('링크/영상/파일 종류를 구분한다', () => {
    expect(resourceKind({ ...base, external_url: 'https://example.com' })).toBe('link')
    expect(resourceKind({ ...base, external_url: 'https://example.com', category: 'video' })).toBe('video')
    expect(resourceKind({ ...base, external_url: 'https://youtu.be/dQw4w9WgXcQ' })).toBe('video')
    expect(resourceKind({ ...base, storage_path: '1/x/file.pdf', file_type: 'pdf' })).toBe('pdf')
    expect(resourceKind({ ...base, storage_path: '1/x/file.zip', file_type: 'other' })).toBe('other')
    expect(resourceKind({ ...base, storage_path: '1/x/file.zip', file_type: null })).toBe('other')
  })
})

describe('detectDevice', () => {
  test.each([
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Mobile/15E148', 'mobile'],
    ['Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari', 'mobile'],
    ['Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', 'mobile'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120', 'desktop'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari', 'desktop'],
    ['', 'desktop'],
    [null, 'desktop'],
  ])('%s → %s', (ua, expected) => {
    expect(detectDevice(ua)).toBe(expected)
  })
})

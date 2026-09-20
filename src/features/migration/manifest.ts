// Design Ref: §2.2-④ 드라이브 이전 — 폴더 → manifest.csv(운영진이 검수·수정) → 일괄 업로드 → 검수 후 공개.
// 이 파일은 스캔(추측)·검증·CSV 입출력만 담당하는 순수 로직이다 (파일/DB 접근 없음, 단위 테스트 대상).
import Papa from 'papaparse'
import { CATEGORIES, CATEGORY_LABEL, MAX_WEEK, type Category } from '../library/params'
import { MAX_UPLOAD_BYTES, UPLOAD_EXTENSIONS, extensionOf, isSafeExternalUrl } from '../library/fileType'
import { parseTags } from '../library/tags'

export const MANIFEST_COLUMNS = [
  'status', 'path', 'external_url', 'cohort_number', 'week_number', 'category', 'title', 'tags', 'description', 'note', 'resource_id',
] as const

export type ManifestRow = Record<(typeof MANIFEST_COLUMNS)[number], string>

/** ok=업로드 대상, review=사람이 확인 필요, skip=올리지 않음, done=이미 올림(재실행해도 건너뜀) */
export type ManifestStatus = 'ok' | 'review' | 'skip' | 'done'

const emptyRow = (): ManifestRow => Object.fromEntries(MANIFEST_COLUMNS.map((c) => [c, ''])) as ManifestRow

// ---------------------------------------------------------------- 스캔 (경로 → 추측)

const VIDEO_EXT = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'm4v'])
const JUNK_FILES = new Set(['thumbs.db', 'desktop.ini', '.ds_store'])

/** 이전 대상이 아닌 시스템·임시 파일 */
export function isJunkFile(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  return lower.startsWith('.') || lower.startsWith('~$') || JUNK_FILES.has(lower)
}

const COMMON_RE = /^(공용|전체|공통|common|all|shared)$/i
const COHORT_RE = /(?:제\s*)?(\d{1,3})\s*기/
const COHORT_EN_RE = /^cohort[\s_-]*(\d{1,3})$/i
const WEEK_RES = [/(\d{1,2})\s*주\s*차?/, /week[\s_-]*(\d{1,2})/i]

const CATEGORY_HINTS: [RegExp, Category][] = [
  [/과제|숙제|assignment|homework/i, 'assignment'],
  [/참고|reference|부록/i, 'reference'],
  [/코드|실습|소스|code|source|notebook/i, 'code'],
  [/강의|lecture|슬라이드|slide|교안|ppt/i, 'lecture'],
]

function categoryFromExtension(ext: string): Category {
  if (['py', 'js', 'ts', 'ipynb'].includes(ext)) return 'code'
  if (['xlsx', 'csv', 'txt', 'md', 'zip', 'png', 'jpg', 'jpeg'].includes(ext)) return 'reference'
  if (VIDEO_EXT.has(ext)) return 'video'
  return 'lecture' // pdf, pptx, docx 등
}

export interface PathGuess {
  cohort: number | 'common' | null
  week: number | null
  category: Category
  title: string
  tags: string[]
}

/** `17기/8주차/자료.pdf` 같은 상대 경로에서 기수·주차·카테고리·제목·태그를 추측한다 (틀리면 CSV 에서 고친다) */
export function guessFromPath(relPath: string): PathGuess {
  const parts = relPath.split('/').filter(Boolean)
  const fileName = parts[parts.length - 1] ?? ''
  const folders = parts.slice(0, -1)
  const stem = fileName.replace(/\.[^.]+$/, '')

  let cohort: number | 'common' | null = null
  let week: number | null = null
  let hint: Category | null = null
  const consumed = new Set<string>()

  // 폴더(위→아래), 그다음 파일명 순으로 찾는다. 처음 찾은 값을 쓴다.
  for (const seg of [...folders, stem]) {
    if (cohort === null) {
      if (COMMON_RE.test(seg.trim())) {
        cohort = 'common'
        consumed.add(seg)
      } else {
        const m = seg.match(COHORT_RE) ?? seg.trim().match(COHORT_EN_RE)
        if (m && Number(m[1]) > 0) {
          cohort = Number(m[1])
          consumed.add(seg)
        }
      }
    }
    if (week === null) {
      for (const re of WEEK_RES) {
        const m = seg.match(re)
        if (m && Number(m[1]) >= 1 && Number(m[1]) <= MAX_WEEK) {
          week = Number(m[1])
          consumed.add(seg)
          break
        }
      }
    }
    if (hint === null) {
      for (const [re, cat] of CATEGORY_HINTS) {
        if (re.test(seg)) {
          hint = cat
          if (seg !== stem) consumed.add(seg)
          break
        }
      }
    }
  }

  const title = stem.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) || fileName

  // 기수·주차·카테고리 표시가 아닌 폴더 이름은 태그 후보 (최대 3개, 30자 이내)
  const tags = folders
    .filter((f) => !consumed.has(f))
    .map((f) => f.trim())
    .filter((f) => f.length > 0 && f.length <= 30)
    .slice(0, 3)

  return { cohort, week, category: hint ?? categoryFromExtension(extensionOf(fileName)), title, tags }
}

/** 파일 하나에 대한 manifest 행을 만든다 (상태와 안내 문구 포함) */
export function scanRow(relPath: string, size: number): ManifestRow {
  const g = guessFromPath(relPath)
  const ext = extensionOf(relPath)
  const row: ManifestRow = {
    ...emptyRow(),
    status: 'ok',
    path: relPath,
    cohort_number: g.cohort === null ? '' : String(g.cohort),
    week_number: g.week === null ? '' : String(g.week),
    category: g.category,
    title: g.title,
    tags: g.tags.join(', '),
  }

  if (VIDEO_EXT.has(ext)) {
    return { ...row, status: 'skip', note: '영상은 업로드하지 않습니다. 유튜브 등에 올린 뒤 external_url 에 링크를 넣고, path 를 비우고, status 를 ok 로 바꾸세요.' }
  }
  if (!(UPLOAD_EXTENSIONS as readonly string[]).includes(ext)) {
    return { ...row, status: 'skip', note: `지원하지 않는 형식입니다${ext ? ` (.${ext})` : ''}.` }
  }
  if (size === 0) return { ...row, status: 'skip', note: '빈 파일입니다.' }
  if (size > MAX_UPLOAD_BYTES) {
    return { ...row, status: 'skip', note: `${MAX_UPLOAD_BYTES / 1024 / 1024}MB 를 넘습니다. 외부 링크(external_url)로 등록하세요.` }
  }
  if (g.cohort === null) {
    return { ...row, status: 'review', note: '기수를 찾지 못했습니다. cohort_number 에 숫자 또는 common(공용)을 입력하고 status 를 ok 로 바꾸세요.' }
  }
  return row
}

// ---------------------------------------------------------------- 검증 (가져오기 직전)

export interface ImportItem {
  kind: 'file' | 'link'
  path: string | null
  externalUrl: string | null
  /** null = 전체 공용 */
  cohortNumber: number | null
  week: number | null
  category: Category
  title: string
  tags: string[]
  description: string | null
}

export type RowValidation = { ok: true; item: ImportItem } | { ok: false; errors: string[] }

const CATEGORY_BY_LABEL = new Map<string, Category>(CATEGORIES.map((c) => [CATEGORY_LABEL[c], c]))

export function validateManifestRow(row: ManifestRow, ctx: { cohortNumbers: Set<number> }): RowValidation {
  const errors: string[] = []
  const path = row.path.trim()
  const url = row.external_url.trim()

  if (!path && !url) errors.push('path(파일 경로) 또는 external_url(링크) 중 하나가 필요합니다.')
  if (path && url) errors.push('path 와 external_url 을 동시에 쓸 수 없습니다. 하나만 남기세요.')
  if (path) {
    if (path.startsWith('/') || /^[a-zA-Z]:/.test(path) || path.split('/').includes('..')) errors.push('path 는 폴더 안의 상대 경로여야 합니다.')
    if (!(UPLOAD_EXTENSIONS as readonly string[]).includes(extensionOf(path))) errors.push(`지원하지 않는 형식입니다: ${path}`)
  }
  if (url && !isSafeExternalUrl(url)) errors.push('external_url 은 https:// 로 시작하는 주소여야 합니다.')

  // 기수: 비워 두면 오류 (실수로 전체 공용이 되는 것을 막는다). 공용은 common 이라고 명시한다.
  let cohortNumber: number | null = null
  const cohortRaw = row.cohort_number.trim()
  if (!cohortRaw) errors.push('cohort_number 를 입력하세요 (숫자, 또는 전체 공용이면 common).')
  else if (COMMON_RE.test(cohortRaw)) cohortNumber = null
  else {
    const m = cohortRaw.match(/^(\d{1,3})\s*기?$/)
    if (!m) errors.push(`cohort_number 를 읽을 수 없습니다: "${cohortRaw}"`)
    else if (!ctx.cohortNumbers.has(Number(m[1]))) errors.push(`존재하지 않는 기수입니다: ${m[1]}기`)
    else cohortNumber = Number(m[1])
  }

  let week: number | null = null
  const weekRaw = row.week_number.trim().replace(/주차?$/, '')
  if (weekRaw) {
    if (!/^\d{1,2}$/.test(weekRaw) || Number(weekRaw) < 1 || Number(weekRaw) > MAX_WEEK) errors.push(`week_number 는 1~${MAX_WEEK} 이어야 합니다: "${row.week_number}"`)
    else week = Number(weekRaw)
  }

  const catRaw = row.category.trim()
  const category = (CATEGORIES as readonly string[]).includes(catRaw) ? (catRaw as Category) : CATEGORY_BY_LABEL.get(catRaw)
  if (!category) errors.push(`category 는 ${CATEGORIES.join('/')} 중 하나여야 합니다: "${catRaw}"`)

  const title = row.title.trim()
  if (!title) errors.push('title 이 비어 있습니다.')
  else if (title.length > 200) errors.push('title 은 200자 이내여야 합니다.')

  const tags = parseTags(row.tags)
  if (tags.error) errors.push(tags.error)

  const description = row.description.trim()
  if (description.length > 5000) errors.push('description 은 5,000자 이내여야 합니다.')

  if (errors.length > 0 || !category) return { ok: false, errors }
  return {
    ok: true,
    item: {
      kind: path ? 'file' : 'link',
      path: path || null,
      externalUrl: url || null,
      cohortNumber,
      week,
      category,
      title,
      tags: tags.tags,
      description: description || null,
    },
  }
}

// ---------------------------------------------------------------- CSV 입출력

export function parseManifest(text: string): { rows: ManifestRow[]; error?: string } {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
  })
  const fields = parsed.meta.fields ?? []
  if (!fields.includes('status') || !(fields.includes('path') || fields.includes('external_url'))) {
    return { rows: [], error: 'manifest 형식이 아닙니다. status, path(또는 external_url) 열이 필요합니다.' }
  }
  return {
    rows: parsed.data.map((r) => {
      const row = emptyRow()
      for (const c of MANIFEST_COLUMNS) row[c] = (r[c] ?? '').toString()
      return row
    }),
  }
}

/** Excel 에서 한글이 깨지지 않도록 UTF-8 BOM 을 붙인다 */
export function serializeManifest(rows: ManifestRow[]): string {
  return '﻿' + Papa.unparse({ fields: [...MANIFEST_COLUMNS], data: rows.map((r) => MANIFEST_COLUMNS.map((c) => r[c])) })
}

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  zip: 'application/zip',
  ipynb: 'application/x-ipynb+json',
  py: 'text/x-python',
  js: 'text/javascript',
  ts: 'text/plain',
  md: 'text/markdown',
  txt: 'text/plain',
  csv: 'text/csv',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

export const contentTypeFor = (fileName: string): string => CONTENT_TYPES[extensionOf(fileName)] ?? 'application/octet-stream'

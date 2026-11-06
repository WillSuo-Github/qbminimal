import { readStored, writeStored } from '@/lib/storage'

// Translations. The English text is the key, so anything not translated yet shows in English.
// The language is loaded once, before the app's modules, so text built when a module loads is
// translated too. Changing it reloads the page.
export type Catalog = Record<string, string>

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
] as const
export type LanguageCode = (typeof LANGUAGES)[number]['code']
export type LanguageChoice = LanguageCode | 'auto'

const LOADERS: Record<Exclude<LanguageCode, 'en'>, () => Promise<{ default: Catalog }>> = {
  de: () => import('./de'),
}

const STORAGE_KEY = 'qbminimal.language'
let catalog: Catalog = {}
let current: LanguageCode = 'en'

const isLanguage = (code: string | null): code is LanguageCode => LANGUAGES.some(language => language.code === code)

export function chosenLanguage(): LanguageChoice {
  const stored = readStored(STORAGE_KEY)
  return isLanguage(stored) ? stored : 'auto'
}

// The first of the browser's languages that has a translation, or English.
export function detectLanguage(preferred: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]): LanguageCode {
  for (const tag of preferred) {
    const code = tag.toLowerCase().split('-')[0]
    if (isLanguage(code)) return code
  }
  return 'en'
}

export async function loadLanguage() {
  const choice = chosenLanguage()
  const code = choice === 'auto' ? detectLanguage() : choice
  try {
    catalog = code === 'en' ? {} : (await LOADERS[code]()).default
    current = code
  } catch {
    // The translation couldn't load, so the app shows in English.
    catalog = {}
    current = 'en'
  }
  document.documentElement.lang = current
}

export function setLanguage(choice: LanguageChoice) {
  writeStored(STORAGE_KEY, choice === 'auto' ? null : choice)
  window.location.reload()
}

export const currentLanguage = () => current

// Text in the current language. {name} in it is replaced with vars.name.
export function t(text: string, vars?: Record<string, string | number | null | undefined>): string {
  const template = catalog[text] || text
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name] ?? '') : match))
}

// For tests: use a catalog directly.
export function setCatalogForTests(next: Catalog, code: LanguageCode = 'de') {
  catalog = next
  current = code
}

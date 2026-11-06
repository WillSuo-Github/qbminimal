// Turns a two-letter country code, as qBittorrent's GeoIP lookup gives it ("de", "US"), into its
// flag emoji. Anything else, such as an empty code for a peer it couldn't place, gives ''.
export function countryFlag(code: string | undefined): string {
  if (!code || !/^[a-z]{2}$/i.test(code)) return ''
  const upper = code.toUpperCase()
  // Regional indicator symbols A-Z start at U+1F1E6. A pair of them draws as the country's flag.
  return String.fromCodePoint(...[...upper].map(letter => 0x1f1e6 + letter.charCodeAt(0) - 65))
}

// Font stack for flags. Windows has no flag emoji, so a bundled flag font is added there and comes first.
export const FLAG_FONT_FAMILY = '"Twemoji Country Flags", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'

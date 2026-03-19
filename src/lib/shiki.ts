import { createHighlighter, type Highlighter } from 'shiki';

/**
 * Singleton Shiki highlighter — initialized once, cached forever.
 * Per DEV_SPEC §19: "Initialize once on first code render. Don't re-initialize per component."
 */
let highlighterPromise: Promise<Highlighter> | null = null;

/** Languages most likely to appear in A/B test repos — preloaded on init. */
const PRELOAD_LANGS = [
  'javascript', 'typescript', 'tsx', 'jsx', 'python', 'css', 'html',
  'json', 'yaml', 'bash', 'markdown', 'xml', 'text',
];

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: PRELOAD_LANGS,
    });
  }
  return highlighterPromise;
}

/**
 * Highlight a code string with Shiki dual-theme output.
 * Returns an HTML string with CSS variables for light/dark switching.
 * Lazily loads any language not in the preload list.
 */
export async function highlightCode(
  code: string,
  lang: string,
): Promise<string> {
  const highlighter = await getHighlighter();

  // Lazy-load language if not already available
  const loaded = highlighter.getLoadedLanguages();
  if (!loaded.includes(lang)) {
    try {
      await highlighter.loadLanguage(lang as Parameters<Highlighter['loadLanguage']>[0]);
    } catch {
      // Unknown language — fall back to plain text
      lang = 'text';
    }
  }

  return highlighter.codeToHtml(code, {
    lang,
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
  });
}

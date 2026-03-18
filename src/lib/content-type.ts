import type { ContentType } from '../types';

const CONTENT_TYPE_MAP: Record<string, ContentType> = {
  // Images
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image',
  webp: 'image', ico: 'image', avif: 'image', bmp: 'image',

  // SVG (special: image + code)
  svg: 'svg',

  // Markdown
  md: 'markdown',

  // Code
  py: 'code', ts: 'code', tsx: 'code', js: 'code', jsx: 'code',
  css: 'code', sh: 'code', bash: 'code', yml: 'code', yaml: 'code',
  toml: 'code', rs: 'code', go: 'code', java: 'code', c: 'code',
  cpp: 'code', rb: 'code', php: 'code', swift: 'code', kt: 'code',
  sql: 'code', r: 'code', scala: 'code', dart: 'code',

  // Structured Data
  json: 'json',
  csv: 'csv',
  xml: 'xml', webmanifest: 'xml', plist: 'xml',

  // Documents
  pdf: 'pdf',

  // HTML
  html: 'html', htm: 'html',

  // Plain text
  txt: 'plaintext', log: 'plaintext', env: 'plaintext',
  cfg: 'plaintext', ini: 'plaintext', conf: 'plaintext',

  // Audio
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio', flac: 'audio',

  // Video
  mp4: 'video', webm: 'video', mov: 'video',
};

export function getContentType(filename: string): ContentType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPE_MAP[ext] ?? 'binary';
}

export function getShikiLanguage(ext: string): string {
  const langMap: Record<string, string> = {
    py: 'python', ts: 'typescript', tsx: 'tsx', js: 'javascript',
    jsx: 'jsx', css: 'css', html: 'html', sh: 'bash', bash: 'bash',
    yml: 'yaml', yaml: 'yaml', toml: 'toml', json: 'json',
    rs: 'rust', go: 'go', java: 'java', c: 'c', cpp: 'cpp',
    rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
    sql: 'sql', xml: 'xml', md: 'markdown', svg: 'xml',
    csv: 'csv', r: 'r', scala: 'scala', dart: 'dart',
  };
  return langMap[ext.toLowerCase()] ?? 'text';
}

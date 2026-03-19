// ── Authentication ──

export type AuthMethod = 'oauth' | 'pat';

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  method: AuthMethod | null;
  user: GitHubUser | null;
}

export interface GitHubUser {
  login: string;
  avatarUrl: string;
  name: string | null;
}

// ── Repository ──

export interface RepoInfo {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
  defaultBranch: string;
}

// ── Project Discovery ──

export interface Project {
  name: string;
  displayName: string;
  path: string;
  testCount: number;
}

export interface TestSummary {
  id: string;
  name: string;
  path: string;
  difficulty: 'Simple' | 'Medium' | 'Complex';
  prompt: string;
  variantNames: string[];
}

export interface TestDetail {
  id: string;
  name: string;
  meta: TestMeta;
  variants: VariantData[];
  matchedFiles: FileGroup[];
  unmatchedFiles: Record<string, DiscoveredFile[]>;
}

// ── Test Metadata (meta.json) ──

export interface VariantMeta {
  description?: string;
  highlights?: string[];
  issues?: string[];
  notes?: string[];
  [key: string]: unknown;
}

export interface TestMeta {
  name: string;
  prompt: string;
  difficulty: 'Simple' | 'Medium' | 'Complex';
  context?: string;
  tags?: string[];
  date?: string;
  variants?: Record<string, VariantMeta>;
  [key: string]: unknown;
}

// ── Variant & Files ──

export interface VariantData {
  name: string;
  path: string;
  resultsMarkdown: string | null;
  files: DiscoveredFile[];
}

export interface DiscoveredFile {
  name: string;
  /** Relative path within the variant directory (e.g. "post.md") — used for file matching */
  path: string;
  /** Full path within the repo (e.g. "examples/tests/test2/claude/post.md") — used for API calls */
  repoPath: string;
  sha: string;
  size: number;
  extension: string;
  contentType: ContentType;
  downloadUrl: string;
}

/**
 * A group of files matched across variants by relative path.
 * Replaces the old 2-variant FilePair with N-variant support.
 */
export interface FileGroup {
  relativePath: string;
  contentType: ContentType;
  /** Map from variant name → DiscoveredFile */
  files: Record<string, DiscoveredFile>;
  matchType: 'exact';
}

// ── Content Types ──

export type ContentType =
  | 'image'
  | 'svg'
  | 'markdown'
  | 'code'
  | 'json'
  | 'csv'
  | 'xml'
  | 'pdf'
  | 'html'
  | 'plaintext'
  | 'audio'
  | 'video'
  | 'binary';

// ── Generic Hook Result ──

export interface UseQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

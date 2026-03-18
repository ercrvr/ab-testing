import { Octokit } from '@octokit/rest';

let octokitInstance: Octokit | null = null;

export function initOctokit(token: string): void {
  octokitInstance = new Octokit({ auth: token });
}

export function clearOctokit(): void {
  octokitInstance = null;
}

export function getOctokit(): Octokit {
  if (!octokitInstance) throw new Error('Octokit not initialized. Please log in.');
  return octokitInstance;
}

// ── Types ──

export interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

// ── API Wrappers ──

export async function listUserRepos(page = 1, perPage = 30) {
  const octokit = getOctokit();
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: perPage,
    page,
  });
  return data;
}

export async function getRepo(owner: string, repo: string) {
  const octokit = getOctokit();
  const { data } = await octokit.rest.repos.get({ owner, repo });
  return data;
}

export async function getRepoTree(
  owner: string,
  repo: string,
  branch: string,
): Promise<GitHubTreeEntry[]> {
  const octokit = getOctokit();
  const { data } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: '1',
  });
  return data.tree as GitHubTreeEntry[];
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
): Promise<string> {
  const octokit = getOctokit();
  const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
  if (!Array.isArray(data) && 'content' in data && typeof data.content === 'string') {
    const cleaned = data.content.replace(/\n/g, '');
    const bytes = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  throw new Error(`Could not read file: ${path}`);
}

export async function getRateLimit() {
  const octokit = getOctokit();
  const { data } = await octokit.rest.rateLimit.get();
  return data.rate;
}

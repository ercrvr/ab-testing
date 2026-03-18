import type {
  Project,
  TestSummary,
  TestDetail,
  VariantData,
  DiscoveredFile,
  FileGroup,
  TestMeta,
} from '../types';
import type { GitHubTreeEntry } from './github';
import { getFileContent } from './github';
import { getContentType } from './content-type';

// ── Helpers ──

function toDisplayName(dirName: string): string {
  return dirName
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function sortTestDirs(dirs: string[]): string[] {
  return [...dirs].sort((a, b) => {
    const numA = parseInt(a.replace('test', ''), 10);
    const numB = parseInt(b.replace('test', ''), 10);
    return numA - numB;
  });
}

function buildDownloadUrl(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
}

// ── Stage 1: Discover Projects ──

export function discoverProjects(tree: GitHubTreeEntry[]): Project[] {
  const testDirsByProject = new Map<string, Set<string>>();

  for (const entry of tree) {
    const match = entry.path.match(/^([^/]+)\/tests\/(test\d+)(\/|$)/);
    if (match) {
      const projectName = match[1];
      if (!testDirsByProject.has(projectName)) {
        testDirsByProject.set(projectName, new Set());
      }
      testDirsByProject.get(projectName)!.add(match[2]);
    }
  }

  return Array.from(testDirsByProject.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, tests]) => ({
      name,
      displayName: toDisplayName(name),
      path: name,
      testCount: tests.size,
    }));
}

// ── Stage 2: Discover Tests ──

function getTestDirs(tree: GitHubTreeEntry[], projectPath: string): string[] {
  const dirs = new Set<string>();
  const prefix = `${projectPath}/tests/`;

  for (const entry of tree) {
    if (!entry.path.startsWith(prefix)) continue;
    const rest = entry.path.slice(prefix.length);
    const dirName = rest.split('/')[0];
    if (/^test\d+$/.test(dirName)) {
      dirs.add(dirName);
    }
  }

  return sortTestDirs(Array.from(dirs));
}

function getVariantNames(
  tree: GitHubTreeEntry[],
  testPath: string,
): string[] {
  const variants = new Set<string>();
  const prefix = testPath + '/';

  for (const entry of tree) {
    if (!entry.path.startsWith(prefix)) continue;
    const rest = entry.path.slice(prefix.length);
    if (rest === 'meta.json') continue;

    const parts = rest.split('/');
    if (parts.length >= 2) {
      // It's a file inside a subdirectory — the first part is the variant name
      variants.add(parts[0]);
    }
  }

  return Array.from(variants).sort();
}

export async function loadTestSummaries(
  tree: GitHubTreeEntry[],
  owner: string,
  repo: string,
  projectPath: string,
): Promise<TestSummary[]> {
  const testDirNames = getTestDirs(tree, projectPath);

  const results = await Promise.allSettled(
    testDirNames.map(async (dirName) => {
      const testPath = `${projectPath}/tests/${dirName}`;
      const metaPath = `${testPath}/meta.json`;
      const content = await getFileContent(owner, repo, metaPath);
      const meta: TestMeta = JSON.parse(content);
      const variantNames = getVariantNames(tree, testPath);

      return {
        id: dirName,
        name: meta.name,
        path: testPath,
        difficulty: meta.difficulty,
        prompt: meta.prompt,
        variantNames,
      } satisfies TestSummary;
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<TestSummary> => r.status === 'fulfilled')
    .map((r) => r.value);
}

// ── Stage 3: Load Test Detail ──

function getVariantFiles(
  tree: GitHubTreeEntry[],
  testPath: string,
  variantName: string,
  owner: string,
  repo: string,
  branch: string,
): DiscoveredFile[] {
  const prefix = `${testPath}/${variantName}/`;
  const files: DiscoveredFile[] = [];

  for (const entry of tree) {
    if (entry.type !== 'blob') continue;
    if (!entry.path.startsWith(prefix)) continue;

    const relativePath = entry.path.slice(prefix.length);
    const name = relativePath.split('/').pop() ?? relativePath;
    const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';

    files.push({
      name,
      path: relativePath,
      sha: entry.sha,
      size: entry.size ?? 0,
      extension: ext,
      contentType: getContentType(name),
      downloadUrl: buildDownloadUrl(owner, repo, branch, entry.path),
    });
  }

  return files;
}

export async function loadTestDetail(
  tree: GitHubTreeEntry[],
  owner: string,
  repo: string,
  branch: string,
  projectPath: string,
  testDir: string,
): Promise<TestDetail> {
  const testPath = `${projectPath}/tests/${testDir}`;
  const metaPath = `${testPath}/meta.json`;

  // Fetch meta.json
  const metaContent = await getFileContent(owner, repo, metaPath);
  const meta: TestMeta = JSON.parse(metaContent);

  // Discover variants from tree
  const variantNames = getVariantNames(tree, testPath);

  // Build variant data
  const variants: VariantData[] = variantNames.map((vName) => {
    const files = getVariantFiles(tree, testPath, vName, owner, repo, branch);
    return {
      name: vName,
      path: `${testPath}/${vName}`,
      resultsMarkdown: null, // Fetched lazily by Phase 5
      files,
    };
  });

  // Match files across variants
  const { matchedFiles, unmatchedFiles } = matchFiles(variants);

  return {
    id: testDir,
    name: meta.name,
    meta,
    variants,
    matchedFiles,
    unmatchedFiles,
  };
}

// ── File Matching Algorithm ──

export function matchFiles(
  variants: VariantData[],
): {
  matchedFiles: FileGroup[];
  unmatchedFiles: Record<string, DiscoveredFile[]>;
} {
  // Phase 1: Collect all unique relative paths
  const filesByPath = new Map<string, Record<string, DiscoveredFile>>();

  for (const variant of variants) {
    for (const file of variant.files) {
      // Exclude results.md — rendered separately
      if (file.path.toLowerCase() === 'results.md') continue;

      if (!filesByPath.has(file.path)) {
        filesByPath.set(file.path, {});
      }
      filesByPath.get(file.path)![variant.name] = file;
    }
  }

  // Phase 2: Create FileGroups (files in 2+ variants)
  const matchedFiles: FileGroup[] = [];
  const unmatchedFiles: Record<string, DiscoveredFile[]> = {};

  for (const [relativePath, variantFiles] of filesByPath) {
    const variantCount = Object.keys(variantFiles).length;

    if (variantCount >= 2) {
      // Matched — determine content type from first available file
      const firstFile = Object.values(variantFiles)[0];
      matchedFiles.push({
        relativePath,
        contentType: firstFile.contentType,
        files: variantFiles,
        matchType: 'exact',
      });
    } else {
      // Unmatched — belongs to a single variant
      const [variantName, file] = Object.entries(variantFiles)[0];
      if (!unmatchedFiles[variantName]) {
        unmatchedFiles[variantName] = [];
      }
      unmatchedFiles[variantName].push(file);
    }
  }

  // Sort matched files by path
  matchedFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return { matchedFiles, unmatchedFiles };
}

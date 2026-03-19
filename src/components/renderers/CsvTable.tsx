import { useState, useMemo } from 'react';
import { Maximize2, ArrowUpDown } from 'lucide-react';
import type { DiscoveredFile } from '../../types';
import { useFileContent } from '../../hooks/useFileContent';
import { FullscreenModal } from './FullscreenModal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorBanner } from '../ui/ErrorBanner';

/* ── CSV parser (handles quoted values with commas/newlines) ── */

function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const next = raw[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(cell);
        cell = '';
        if (row.some((c) => c.trim() !== '')) rows.push(row);
        row = [];
        if (ch === '\r') i++; // skip \n in \r\n
      } else {
        cell += ch;
      }
    }
  }

  // flush last cell/row
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);

  return rows;
}

/* ── Sortable table component ── */

function TableView({
  rows,
  maxHeight = '24rem',
}: {
  rows: string[][];
  maxHeight?: string;
}) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  if (rows.length === 0) {
    return (
      <div className="p-4 text-center text-base-content/50 text-sm">
        Empty CSV
      </div>
    );
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const sorted = useMemo(() => {
    if (sortCol === null) return dataRows;
    return [...dataRows].sort((a, b) => {
      const av = a[sortCol] ?? '';
      const bv = b[sortCol] ?? '';
      const an = Number(av);
      const bn = Number(bv);
      if (!isNaN(an) && !isNaN(bn)) {
        return sortAsc ? an - bn : bn - an;
      }
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [dataRows, sortCol, sortAsc]);

  const handleSort = (col: number) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  return (
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className="table table-xs table-pin-rows w-full">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="cursor-pointer hover:bg-base-200 select-none whitespace-nowrap"
                onClick={() => handleSort(i)}
              >
                <span className="inline-flex items-center gap-1">
                  {h}
                  <ArrowUpDown
                    size={12}
                    className={sortCol === i ? 'opacity-80' : 'opacity-30'}
                  />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, ri) => (
            <tr key={ri} className="hover">
              {headers.map((_, ci) => (
                <td key={ci} className="whitespace-nowrap">
                  {row[ci] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Single variant panel ── */

function VariantPanel({
  variantName,
  file,
  owner,
  repo,
  onClick,
}: {
  variantName: string;
  file: DiscoveredFile;
  owner: string;
  repo: string;
  onClick: () => void;
}) {
  const { content, isLoading, error } = useFileContent(owner, repo, file.repoPath);

  const rows = useMemo(() => {
    if (!content) return [];
    return parseCsv(content);
  }, [content]);

  const rowCount = rows.length > 0 ? rows.length - 1 : 0;
  const colCount = rows.length > 0 ? rows[0].length : 0;

  return (
    <div
      className="border border-base-300 rounded-box overflow-hidden bg-base-100 cursor-pointer hover:border-primary/30 transition-colors"
      onClick={onClick}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-base-200/50 border-b border-base-300">
        <div className="flex items-center gap-2">
          <span className="lab-label text-primary">{variantName}</span>
          {!isLoading && !error && content && (
            <span className="text-xs text-base-content/40">
              {rowCount} row{rowCount !== 1 ? 's' : ''} × {colCount} col
              {colCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Maximize2 size={14} className="text-base-content/30" />
      </div>

      {/* Content */}
      {isLoading && (
        <div className="p-4">
          <LoadingSpinner size="sm" text="Loading CSV…" />
        </div>
      )}
      {error && (
        <div className="p-4">
          <ErrorBanner message={error} />
        </div>
      )}
      {content && <TableView rows={rows} />}
    </div>
  );
}

/* ── Fullscreen CSV view ── */

function FullscreenCsv({
  files,
  owner,
  repo,
  selectedVariant,
  onClose,
}: {
  files: Record<string, DiscoveredFile>;
  owner: string;
  repo: string;
  selectedVariant: string | null;
  onClose: () => void;
}) {
  const file = selectedVariant ? files[selectedVariant] : undefined;
  const { content } = useFileContent(
    selectedVariant ? owner : undefined,
    selectedVariant ? repo : undefined,
    file?.repoPath,
  );

  const rows = useMemo(() => {
    if (!content) return [];
    return parseCsv(content);
  }, [content]);

  const rowCount = rows.length > 0 ? rows.length - 1 : 0;
  const colCount = rows.length > 0 ? rows[0].length : 0;

  return (
    <FullscreenModal
      isOpen={selectedVariant !== null}
      onClose={onClose}
      title={
        file
          ? `${selectedVariant} — ${file.name} (${rowCount} rows × ${colCount} cols)`
          : undefined
      }
    >
      {content && <TableView rows={rows} maxHeight="none" />}
    </FullscreenModal>
  );
}

/* ── Main CsvTable renderer ── */

interface CsvTableProps {
  files: Record<string, DiscoveredFile>;
  owner: string;
  repo: string;
}

export function CsvTable({ files, owner, repo }: CsvTableProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const entries = Object.entries(files);

  const colsClass =
    entries.length === 1
      ? 'grid-cols-1'
      : entries.length === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';

  return (
    <>
      <div className={`grid ${colsClass} gap-4`}>
        {entries.map(([variantName, file]) => (
          <VariantPanel
            key={variantName}
            variantName={variantName}
            file={file}
            owner={owner}
            repo={repo}
            onClick={() => setSelectedVariant(variantName)}
          />
        ))}
      </div>

      <FullscreenCsv
        files={files}
        owner={owner}
        repo={repo}
        selectedVariant={selectedVariant}
        onClose={() => setSelectedVariant(null)}
      />
    </>
  );
}

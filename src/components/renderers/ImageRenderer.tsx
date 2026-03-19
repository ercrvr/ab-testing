import { useState } from 'react';
import { Columns2, SlidersHorizontal } from 'lucide-react';
import type { DiscoveredFile } from '../../types';
import { FullscreenModal } from './FullscreenModal';
import { ImageSlider } from './ImageSlider';

interface ImageRendererProps {
  files: Record<string, DiscoveredFile>;
}

interface ImageDimensions {
  width: number;
  height: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function ImageRenderer({ files }: ImageRendererProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<Record<string, ImageDimensions>>({});
  const [mode, setMode] = useState<'grid' | 'slider'>('grid');

  const entries = Object.entries(files);
  const variantNames = Object.keys(files);
  const [sliderPair, setSliderPair] = useState<[string, string]>(
    variantNames.length >= 2
      ? [variantNames[0], variantNames[1]]
      : [variantNames[0] ?? '', variantNames[0] ?? ''],
  );

  const colsClass =
    entries.length === 1
      ? 'grid-cols-1'
      : entries.length === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  const handleImageLoad = (
    variantName: string,
    e: React.SyntheticEvent<HTMLImageElement>,
  ) => {
    const img = e.currentTarget;
    setDimensions((prev) => ({
      ...prev,
      [variantName]: { width: img.naturalWidth, height: img.naturalHeight },
    }));
  };

  const selectedFile = selectedVariant ? files[selectedVariant] : null;

  return (
    <>
      {entries.length >= 2 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="join">
            <button
              className={`join-item btn btn-sm ${mode === 'grid' ? 'btn-active' : ''}`}
              onClick={() => setMode('grid')}
            >
              <Columns2 className="w-4 h-4" />
              Grid
            </button>
            <button
              className={`join-item btn btn-sm ${mode === 'slider' ? 'btn-active' : ''}`}
              onClick={() => setMode('slider')}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Slider
            </button>
          </div>
        </div>
      )}

      {mode === 'slider' && entries.length >= 2 ? (
        <ImageSlider
          variants={Object.fromEntries(
            entries.map(([name, file]) => [name, file.downloadUrl]),
          )}
          selectedPair={sliderPair}
          onPairChange={setSliderPair}
        />
      ) : (
        <div className={`grid ${colsClass} gap-4`}>
          {entries.map(([variantName, file]) => (
            <div
              key={variantName}
              className="border border-base-300 rounded-box overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setSelectedVariant(variantName)}
            >
              <div className="px-3 py-2 border-b border-base-300 bg-base-200/50">
                <span className="font-mono text-sm font-semibold">
                  {variantName}
                </span>
              </div>
              <div className="bg-base-200 flex items-center justify-center p-2">
                <img
                  src={file.downloadUrl}
                  alt={`${variantName} — ${file.name}`}
                  loading="lazy"
                  className="object-contain max-h-96"
                  onLoad={(e) => handleImageLoad(variantName, e)}
                />
              </div>
              <div className="px-3 py-2 border-t border-base-300 flex items-center justify-between text-xs text-base-content/60">
                <span>{formatFileSize(file.size)}</span>
                {dimensions[variantName] && (
                  <span>
                    {dimensions[variantName].width} ×{' '}
                    {dimensions[variantName].height}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <FullscreenModal
        isOpen={selectedVariant !== null}
        onClose={() => setSelectedVariant(null)}
        title={
          selectedFile
            ? `${selectedVariant} — ${selectedFile.name}`
            : undefined
        }
      >
        {selectedFile && (
          <div className="flex items-center justify-center">
            <img
              src={selectedFile.downloadUrl}
              alt={selectedFile.name}
              className="object-contain max-h-[90vh] max-w-[90vw]"
            />
          </div>
        )}
      </FullscreenModal>
    </>
  );
}

import { useState, useRef } from 'react';
import { GripVertical } from 'lucide-react';

interface ImageSliderProps {
  variants: Record<string, string>;
  selectedPair: [string, string];
  onPairChange: (pair: [string, string]) => void;
}

export function ImageSlider({
  variants,
  selectedPair,
  onPairChange,
}: ImageSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const variantNames = Object.keys(variants);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div>
      {/* Variant selector */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium">Left:</span>
          <select
            className="select select-sm select-bordered"
            value={selectedPair[0]}
            onChange={(e) => onPairChange([e.target.value, selectedPair[1]])}
          >
            {variantNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium">Right:</span>
          <select
            className="select select-sm select-bordered"
            value={selectedPair[1]}
            onChange={(e) => onPairChange([selectedPair[0], e.target.value])}
          >
            {variantNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Slider comparison */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-box border border-base-300 bg-base-200 select-none"
        style={{ maxHeight: '70vh' }}
      >
        {/* Right image (base layer) */}
        <img
          src={variants[selectedPair[1]]}
          alt={selectedPair[1]}
          className="w-full h-auto max-h-[70vh] object-contain"
          draggable={false}
        />

        {/* Left image (clipped overlay) */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img
            src={variants[selectedPair[0]]}
            alt={selectedPair[0]}
            className="w-full h-auto max-h-[70vh] object-contain"
            draggable={false}
          />
        </div>

        {/* Labels */}
        <span className="absolute top-2 left-2 px-2 py-1 bg-base-300/80 rounded text-xs font-mono">
          {selectedPair[0]}
        </span>
        <span className="absolute top-2 right-2 px-2 py-1 bg-base-300/80 rounded text-xs font-mono">
          {selectedPair[1]}
        </span>

        {/* Divider line + handle */}
        <div
          className="absolute top-0 bottom-0"
          style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-0.5 h-full bg-base-100/80" />
          <div
            className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-base-100 rounded-full shadow-lg border border-base-300 flex items-center justify-center cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <GripVertical className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

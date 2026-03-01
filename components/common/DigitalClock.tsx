import React, { memo, useEffect, useMemo, useState } from 'react';

interface DigitalClockProps {
  className?: string;
}

type SegmentKey = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';

const DIGIT_MAP: Record<string, SegmentKey[]> = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'g', 'e', 'd'],
  '3': ['a', 'b', 'g', 'c', 'd'],
  '4': ['f', 'g', 'b', 'c'],
  '5': ['a', 'f', 'g', 'c', 'd'],
  '6': ['a', 'f', 'g', 'e', 'c', 'd'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g'],
};

const pad2 = (v: number) => String(v).padStart(2, '0');

const SegmentDigit: React.FC<{ value: string }> = ({ value }) => {
  const active = new Set(DIGIT_MAP[value] || []);
  const on = 'bg-cyan-300';
  const off = 'bg-[#1f2328]';

  const seg = (key: SegmentKey, base: string) => (
    <div className={`absolute ${base} ${active.has(key) ? on : off} transition-colors duration-150`} />
  );

  return (
    <div className="relative h-full w-[22%] min-w-[62px]">
      {seg('a', 'left-[16%] top-[4%] h-[11%] w-[68%] [clip-path:polygon(0_0,84%_0,100%_50,84%_100,0_100,12%_50)]')}
      {seg('b', 'right-[4%] top-[11%] h-[38%] w-[16%] [clip-path:polygon(0_6%,82%_0,100%_50,82%_100,0_94%,12%_50)]')}
      {seg('c', 'right-[4%] bottom-[11%] h-[38%] w-[16%] [clip-path:polygon(0_6%,82%_0,100%_50,82%_100,0_94%,12%_50)]')}
      {seg('d', 'left-[16%] bottom-[4%] h-[11%] w-[68%] [clip-path:polygon(0_0,84%_0,100%_50,84%_100,0_100,12%_50)]')}
      {seg('e', 'left-[4%] bottom-[11%] h-[38%] w-[16%] [clip-path:polygon(0_6%,82%_0,100%_50,82%_100,0_94%,12%_50)]')}
      {seg('f', 'left-[4%] top-[11%] h-[38%] w-[16%] [clip-path:polygon(0_6%,82%_0,100%_50,82%_100,0_94%,12%_50)]')}
      {seg('g', 'left-[16%] top-[44.5%] h-[11%] w-[68%] [clip-path:polygon(0_0,84%_0,100%_50,84%_100,0_100,12%_50)]')}
    </div>
  );
};

export const DigitalClock: React.FC<DigitalClockProps> = memo(({ className = '' }) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { hh, mm, blink } = useMemo(() => {
    const sec = now.getSeconds();

    return {
      hh: pad2(now.getHours()),
      mm: pad2(now.getMinutes()),
      blink: sec % 2 === 0,
    };
  }, [now]);

  return (
    <div className={`h-full w-full overflow-hidden rounded-2xl border border-slate-700 bg-black p-3 shadow-[0_10px_30px_rgba(2,6,23,0.5)] ${className}`}>
      <div className="relative flex h-full w-full items-center justify-center gap-2">
        <SegmentDigit value={hh[0]} />
        <SegmentDigit value={hh[1]} />

        <div className="relative h-full w-[9%] min-w-[22px]">
          <div className={`absolute left-1/2 top-[34%] h-[10%] w-[46%] -translate-x-1/2 rounded-sm bg-cyan-300 transition-opacity duration-150 ${blink ? 'opacity-100' : 'opacity-15'}`} />
          <div className={`absolute left-1/2 top-[58%] h-[10%] w-[46%] -translate-x-1/2 rounded-sm bg-cyan-300 transition-opacity duration-150 ${blink ? 'opacity-100' : 'opacity-15'}`} />
        </div>

        <SegmentDigit value={mm[0]} />
        <SegmentDigit value={mm[1]} />
      </div>
    </div>
  );
});

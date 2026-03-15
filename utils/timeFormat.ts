export const clampSeconds = (seconds: number, minSeconds: number = 0) => {
  if (!Number.isFinite(seconds)) return minSeconds;
  return Math.max(minSeconds, Math.floor(seconds));
};

export const formatSecondsToClock = (seconds: number) => {
  const safe = clampSeconds(seconds, 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

export const formatMinutesToKoreanLabel = (minutes: number) => {
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
  const totalSeconds = Math.round(safeMinutes * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return secs === 0 ? `${mins}분` : `${mins}분 ${secs}초`;
};

import { useState, useEffect } from 'react';
import { getRateLimitInfo, subscribeRateLimit, fetchRateLimit } from '../lib/github';
import type { RateLimitInfo } from '../lib/github';

export interface RateLimitDisplay extends RateLimitInfo {
  resetInMinutes: number | null;
}

export function useRateLimit(): RateLimitDisplay {
  const [info, setInfo] = useState<RateLimitInfo>(getRateLimitInfo());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Fetch actual rate limit on mount (costs 0 against rate limit)
    fetchRateLimit().catch(() => {
      // ignore — will update from subsequent API calls
    });

    return subscribeRateLimit(() => {
      setInfo(getRateLimitInfo());
    });
  }, []);

  // Tick every 30s to update the reset countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const resetInMinutes =
    info.reset > 0
      ? Math.max(0, Math.ceil((info.reset * 1000 - now) / 60_000))
      : null;

  return { ...info, resetInMinutes };
}

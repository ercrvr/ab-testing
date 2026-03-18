import { useState, useEffect } from 'react';
import { getRateLimitInfo, subscribeRateLimit, fetchRateLimit } from '../lib/github';
import type { RateLimitInfo } from '../lib/github';

export function useRateLimit(): RateLimitInfo {
  const [info, setInfo] = useState<RateLimitInfo>(getRateLimitInfo());

  useEffect(() => {
    // Fetch actual rate limit on mount (costs 0 against rate limit)
    fetchRateLimit().catch(() => {
      // ignore — will update from subsequent API calls
    });

    return subscribeRateLimit(() => {
      setInfo(getRateLimitInfo());
    });
  }, []);

  return info;
}

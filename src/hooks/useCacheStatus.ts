import { useState, useEffect } from 'react';
import { getLastDataSource, subscribeDataSource } from '../lib/github';
import type { DataSourceEvent } from '../lib/github';

export function useCacheStatus(): DataSourceEvent | null {
  const [info, setInfo] = useState<DataSourceEvent | null>(getLastDataSource());

  useEffect(() => {
    return subscribeDataSource(() => {
      setInfo(getLastDataSource());
    });
  }, []);

  return info;
}

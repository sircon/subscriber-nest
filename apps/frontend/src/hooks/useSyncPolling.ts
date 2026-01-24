import { useEffect, useRef } from 'react';

type UseSyncPollingOptions = {
  enabled?: boolean;
  isSyncing: boolean;
  onPoll: () => Promise<void> | void;
  pollKey?: string | number;
  fastIntervalMs?: number;
  slowIntervalMs?: number;
};

const DEFAULT_FAST_INTERVAL_MS = 2000;
const DEFAULT_SLOW_INTERVAL_MS = 30000;

export function useSyncPolling({
  enabled = true,
  isSyncing,
  onPoll,
  pollKey,
  fastIntervalMs = DEFAULT_FAST_INTERVAL_MS,
  slowIntervalMs = DEFAULT_SLOW_INTERVAL_MS,
}: UseSyncPollingOptions) {
  const onPollRef = useRef(onPoll);

  useEffect(() => {
    onPollRef.current = onPoll;
  }, [onPoll]);

  useEffect(() => {
    if (!enabled) return;

    let isActive = true;

    const runPoll = async () => {
      if (!isActive) return;
      try {
        await onPollRef.current();
      } catch (err) {
        console.error('Error running poll:', err);
      }
    };

    void runPoll();
    const intervalMs = isSyncing ? fastIntervalMs : slowIntervalMs;
    const intervalId = setInterval(runPoll, intervalMs);

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [enabled, fastIntervalMs, isSyncing, pollKey, slowIntervalMs]);
}

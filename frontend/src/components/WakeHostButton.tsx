'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { LoaderCircle, Power } from 'lucide-react';
import { hostAPI } from '@/lib/api';
import type { Host, HostStatus } from '@/types';

type WakePhase = 'idle' | 'sending' | 'waiting' | 'online' | 'timeout' | 'error';

export default function WakeHostButton({ host, disabled = false, onOnline }: {
  host: Host;
  disabled?: boolean;
  onOnline: (status: HostStatus) => void;
}) {
  const [phase, setPhase] = useState<WakePhase>('idle');
  const [error, setError] = useState('');
  const notifyOnline = useEffectEvent(onOnline);
  const busy = phase === 'sending' || (phase === 'waiting' && host.status !== 'online');

  useEffect(() => {
    if (phase !== 'waiting') return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;
    const timeoutTimer = setTimeout(() => {
      cancelled = true;
      clearTimeout(pollTimer);
      setPhase('timeout');
    }, 120_000);

    const checkStatus = async () => {
      try {
        const status = await hostAPI.getStatus(host.id);
        if (cancelled) return;
        if (status.status === 'online') {
          clearTimeout(timeoutTimer);
          setPhase('online');
          notifyOnline(status);
          return;
        }
      } catch {
        if (cancelled) return;
      }
      pollTimer = setTimeout(checkStatus, 5_000);
    };

    pollTimer = setTimeout(checkStatus, 5_000);
    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
      clearTimeout(timeoutTimer);
    };
  }, [phase, host.id]);

  const wake = async () => {
    if (busy) return;
    setPhase('sending');
    setError('');
    try {
      const result = await hostAPI.sendWoL(host.id);
      if (!result.success) throw new Error(result.message);
      setPhase('waiting');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send wake request.');
      setPhase('error');
    }
  };

  if (host.status !== 'offline' && phase === 'idle') return null;

  const message = host.status === 'online' && phase !== 'idle' ? 'Host is online and responding to ping.'
    : phase === 'waiting' ? 'Wake packet sent. Waiting for a ping response.'
    : phase === 'timeout' ? 'No response after 2 minutes. The host may still be starting; you can retry.'
    : phase === 'error' ? error
    : phase === 'sending' ? 'Sending wake packet...'
    : '';

  return (
    <div className="flex-1 min-w-0 space-y-2">
      {(host.status === 'offline' || busy) && (
        <button
          onClick={wake}
          disabled={disabled || busy}
          aria-busy={busy}
          className="w-full min-h-10 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all text-sm font-medium shadow-sm shadow-green-600/20"
        >
          {busy ? <LoaderCircle className="w-4 h-4 shrink-0 animate-spin" /> : <Power className="w-4 h-4 shrink-0" />}
          {phase === 'sending' ? 'Sending...' : phase === 'waiting' ? 'Waking up...' : 'Wake on LAN'}
        </button>
      )}
      <p role="status" aria-live="polite" className={`text-xs break-words ${phase === 'error' || phase === 'timeout' ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
        {message}
      </p>
    </div>
  );
}
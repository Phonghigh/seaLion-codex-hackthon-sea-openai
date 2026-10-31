'use client';
import { useRef, useState } from 'react';
import type { DemoCommand, Scene } from '@seapilot/contracts';
import { createDemoState, transition } from './index';

/** An in-memory fixture boundary. It intentionally never contacts a service. */
export function useDemo(initialScene: Scene = 'returning') {
  const [state, setState] = useState(() => createDemoState(initialScene));
  const current = useRef(state);
  const generation = useRef(0);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function perform(command: DemoCommand, success: string) {
    if (pending.current) return false;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    const started = generation.current;
    await new Promise(resolve => setTimeout(resolve, 250));
    if (started !== generation.current) return false;
    try {
      const next = transition(current.current, command);
      current.current = next; setState(next); setNotice(success); return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'That change could not be saved. Try again.');
      return false;
    } finally { pending.current = false; setBusy(false); }
  }
  function reset(scene: Scene) {
    generation.current += 1; pending.current = false;
    const next = createDemoState(scene); current.current = next; setState(next);
    setBusy(false); setError(''); setNotice('Local demo reset.');
  }
  return { state, busy, error, notice, perform, reset };
}

import { effect, Signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';

import { writeStoredJson } from '../utils/storage';

/**
 * Writes a signal to local storage whenever it changes.
 * The optional project trims the value before it is stored.
 */
export const useStoredSignal = <T,>(
  key: string,
  value: Signal<T>,
  project?: (stored: T) => unknown
): void => {
  useEffect(() => {
    return effect(() => writeStoredJson(key, project ? project(value.value) : value.value));
  }, [key, value, project]);
};

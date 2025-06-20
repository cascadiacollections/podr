import { useEffect, useRef, useCallback, useMemo } from 'preact/hooks';
import { Signal, effect, signal } from '@preact/signals';
import { APP_CONFIG } from './AppContext';

/**
 * Error types for better error handling
 */
export enum FetchErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  PARSE = 'PARSE',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Enhanced error class for fetch operations
 */
export class FetchError extends Error {
  constructor(
    message: string,
    public readonly type: FetchErrorType,
    public readonly status?: number,
    public readonly response?: Response
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

/**
 * Audio control state interface
 */
export interface AudioControlState {
  readonly isPlaying: boolean;
  readonly currentTime: number;
  readonly duration: number;
  readonly volume: number;
  readonly muted: boolean;
  readonly error: string | null;
}

/**
 * Fetch state interface with better type safety
 */
export interface FetchState<T> {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: FetchError | null;
}

/**
 * Custom hook for using localStorage with signals and error handling
 * @param key - Local storage key
 * @param defaultValue - Default value for the signal
 * @returns A signal that syncs with localStorage
 */
export function useLocalStorageSignal<T>(
  key: string, 
  defaultValue: T
): Signal<T> {
  if (!key || typeof key !== 'string') {
    throw new Error('localStorage key must be a non-empty string');
  }

  const signalRef = useRef<Signal<T>>();
  
  if (!signalRef.current) {
    signalRef.current = signal<T>(defaultValue);
  }
  
  const storageSignal = signalRef.current;
  
  // Initialize from localStorage on mount with error handling
  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        const parsedValue = JSON.parse(item);
        storageSignal.value = parsedValue;
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      // Keep default value on parse error
    }
  }, [key, storageSignal]);
  
  // Save to localStorage on signal change with error handling
  useEffect(() => {
    return effect(() => {
      try {
        localStorage.setItem(key, JSON.stringify(storageSignal.value));
      } catch (error) {
        console.error(`Error writing to localStorage key "${key}":`, error);
      }
    });
  }, [key, storageSignal]);
  
  return storageSignal;
}

/**
 * Enhanced custom hook for working with audio elements
 * @param initialSrc - Initial audio source
 * @returns Audio control methods and reactive state
 */
export function useAudio(initialSrc?: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const state = useRef<Signal<AudioControlState>>();
  
  if (!state.current) {
    state.current = signal<AudioControlState>({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      muted: false,
      error: null,
    });
  }
  
  const audioState = state.current;
  
  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(initialSrc);
    audioRef.current = audio;
    
    // Event listeners for state updates
    const updateState = () => {
      audioState.value = {
        isPlaying: !audio.paused,
        currentTime: audio.currentTime,
        duration: audio.duration || 0,
        volume: audio.volume,
        muted: audio.muted,
        error: null,
      };
    };
    
    const handleError = () => {
      audioState.value = {
        ...audioState.value,
        error: audio.error?.message || 'Audio playback error',
        isPlaying: false,
      };
    };
    
    audio.addEventListener('loadedmetadata', updateState);
    audio.addEventListener('timeupdate', updateState);
    audio.addEventListener('play', updateState);
    audio.addEventListener('pause', updateState);
    audio.addEventListener('volumechange', updateState);
    audio.addEventListener('error', handleError);
    
    return () => {
      audio.removeEventListener('loadedmetadata', updateState);
      audio.removeEventListener('timeupdate', updateState);
      audio.removeEventListener('play', updateState);
      audio.removeEventListener('pause', updateState);
      audio.removeEventListener('volumechange', updateState);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, [initialSrc, audioState]);
  
  const play = useCallback(async (src?: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    try {
      if (src && audio.src !== src) {
        audio.src = src;
      }
      
      await audio.play();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown playback error';
      console.error('Error playing audio:', error);
      
      audioState.value = {
        ...audioState.value,
        error: errorMessage,
        isPlaying: false,
      };
      
      // Track error for analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'exception', {
          description: `audio_play_error_${errorMessage}`,
          fatal: false
        });
      }
    }
  }, [audioState]);
  
  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
  }, []);
  
  const setVolume = useCallback((volume: number) => {
    const audio = audioRef.current;
    if (audio && volume >= 0 && volume <= 1) {
      audio.volume = volume;
    }
  }, []);
  
  const setMuted = useCallback((muted: boolean) => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = muted;
    }
  }, []);
  
  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio && time >= 0 && time <= audio.duration) {
      audio.currentTime = time;
    }
  }, []);
  
  return {
    audioRef,
    state: audioState,
    play,
    pause,
    setVolume,
    setMuted,
    seek,
  };
}

/**
 * Enhanced custom hook for API requests with better error handling and caching
 * @param url - The URL to fetch from
 * @param options - Fetch options
 * @returns Object containing loading state, data, error, and refetch function
 */
export function useFetch<T>(
  url: string | null, 
  options: RequestInit & { timeout?: number } = {}
): FetchState<T> & { refetch: () => Promise<void> } {
  const state = useRef<Signal<FetchState<T>>>();
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  
  if (!state.current) {
    state.current = signal<FetchState<T>>({
      data: null,
      loading: false,
      error: null,
    });
  }
  
  const fetchState = state.current;
  
  const createFetchError = useCallback((error: unknown, response?: Response): FetchError => {
    if (error instanceof FetchError) {
      return error;
    }
    
    if (error instanceof TypeError && error.message.includes('network')) {
      return new FetchError('Network error occurred', FetchErrorType.NETWORK);
    }
    
    if (response) {
      const status = response.status;
      
      if (status === 404) {
        return new FetchError('Resource not found', FetchErrorType.NOT_FOUND, status, response);
      }
      
      if (status === 401 || status === 403) {
        return new FetchError('Unauthorized access', FetchErrorType.UNAUTHORIZED, status, response);
      }
      
      if (status >= 500) {
        return new FetchError('Server error occurred', FetchErrorType.SERVER, status, response);
      }
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new FetchError(message, FetchErrorType.UNKNOWN);
  }, []);
  
  const fetchData = useCallback(async (): Promise<void> => {
    if (!url) {
      fetchState.value = { data: null, loading: false, error: null };
      return;
    }
    
    // Check cache first
    const cached = cacheRef.current.get(url);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < APP_CONFIG.PERFORMANCE.CACHE_TTL_MS) {
      fetchState.value = { data: cached.data, loading: false, error: null };
      return;
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    fetchState.value = { ...fetchState.value, loading: true, error: null };
    
    try {
      const { timeout = 10000, ...fetchOptions } = options;
      
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new FetchError('Request timeout', FetchErrorType.TIMEOUT)), timeout);
      });
      
      const fetchPromise = fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!response.ok) {
        throw createFetchError(new Error(`HTTP ${response.status}`), response);
      }
      
      const contentType = response.headers.get('content-type');
      let data: T;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as unknown as T;
      }
      
      // Cache successful response
      cacheRef.current.set(url, { data, timestamp: now });
      
      fetchState.value = { data, loading: false, error: null };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Don't update state for aborted requests
        return;
      }
      
      const fetchError = createFetchError(error);
      fetchState.value = { data: null, loading: false, error: fetchError };
    }
  }, [url, options, fetchState, createFetchError]);
  
  // Effect to trigger fetch on URL or options change
  useEffect(() => {
    fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return useMemo(() => ({
    ...fetchState.value,
    refetch: fetchData,
  }), [fetchState.value, fetchData]);
}

/**
 * Enhanced custom hook for analytics tracking with better type safety
 */
export function useAnalytics() {
  const trackEvent = useCallback((
    category: string, 
    action: string, 
    label?: string,
    value?: number
  ) => {
    if (typeof window === 'undefined' || !window.gtag) return;
    
    const eventData: Record<string, unknown> = {
      event_category: category,
      event_label: label,
      transport_type: 'beacon',
    };
    
    if (value !== undefined) {
      eventData.value = value;
    }
    
    window.gtag('event', action, eventData);
  }, []);
  
  const trackException = useCallback((
    description: string, 
    fatal: boolean = false,
    category: string = 'error'
  ) => {
    if (typeof window === 'undefined' || !window.gtag) return;
    
    window.gtag('event', 'exception', {
      description,
      fatal,
      event_category: category,
    });
  }, []);
  
  const trackSearch = useCallback((searchTerm: string, resultsCount?: number) => {
    if (typeof window === 'undefined' || !window.gtag) return;
    
    const eventData: Record<string, unknown> = {
      search_term: searchTerm,
      transport_type: 'beacon',
    };
    
    if (resultsCount !== undefined) {
      eventData.results_count = resultsCount;
    }
    
    window.gtag('event', 'search', eventData);
  }, []);
  
  const trackPerformance = useCallback((
    name: string,
    duration: number,
    category: string = 'performance'
  ) => {
    if (typeof window === 'undefined' || !window.gtag) return;
    
    window.gtag('event', 'timing_complete', {
      name,
      value: Math.round(duration),
      event_category: category,
    });
  }, []);
  
  return { 
    trackEvent, 
    trackException, 
    trackSearch, 
    trackPerformance,
  };
}

/**
 * Type definitions for CSS class name inputs with comprehensive support for various data types
 */
type ClassNameValue = string | number | boolean | null | undefined;
type ClassNameObject = Record<string, ClassNameValue>;
type ClassNameArray = ReadonlyArray<ClassNameInput>;
type ClassNameFunction = () => ClassNameInput;
type ClassNameInput = 
  | ClassNameValue 
  | ClassNameObject 
  | ClassNameArray 
  | ClassNameFunction;

/**
 * Development debugging interface for CSS class names with immutable data structures
 */
interface ClassNameDebugInfo {
  /** The final computed className string */
  readonly finalClassName: string;
  /** Total number of inputs processed */
  readonly inputCount: number;
  /** Array of resolved class names (frozen for immutability) */
  readonly resolvedClasses: ReadonlyArray<string>;
  /** Array of inputs that were skipped (frozen for immutability) */
  readonly skippedInputs: ReadonlyArray<unknown>;
  /** Time taken to compute the className in milliseconds */
  readonly computationTime: number;
}

/**
 * Hook return type with debugging information
 */
interface UseClassNamesWithDebugResult {
  /** The computed CSS className string */
  readonly className: string;
  /** Debugging information */
  readonly debug: ClassNameDebugInfo;
}

/**
 * Performance-optimized cache for memoizing class name computations
 * Using WeakMap for automatic garbage collection and memory efficiency
 */
const classNameCache = new WeakMap<object, string>();

/**
 * Highly optimized utility function to resolve class names with minimal memory allocation
 * Prioritizes performance over debugging features for the 99% use case
 * @param input - The class name input to resolve
 * @returns Array of resolved class name strings
 */
function resolveClassNamesOptimized(input: ClassNameInput): string[] {
  // Handle falsy values - early return for performance
  if (!input) return [];

  // Handle strings - most common case, optimized path
  if (typeof input === 'string') {
    const trimmed = input.trim();
    return trimmed ? [trimmed] : [];
  }
  
  // Handle numbers - convert directly
  if (typeof input === 'number') {
    return [String(input)];
  }

  // Handle functions - with error boundary
  if (typeof input === 'function') {
    try {
      return resolveClassNamesOptimized(input());
    } catch {
      return []; // Silent failure for performance in production
    }
  }

  // Handle arrays - flatten efficiently
  if (Array.isArray(input)) {
    const result: string[] = [];
    for (const item of input) {
      result.push(...resolveClassNamesOptimized(item));
    }
    return result;
  }

  // Handle objects - extract truthy keys efficiently
  if (typeof input === 'object' && input !== null) {
    const result: string[] = [];
    for (const [key, value] of Object.entries(input)) {
      if (value) {
        result.push(key);
      }
    }
    return result;
  }

  return [];
}

/**
 * Debugging version of class name resolution with comprehensive tracking
 * @param input - The class name input to resolve
 * @returns Object containing resolved class names and skipped inputs
 */
function resolveClassNamesWithDebug(
  input: ClassNameInput
): { readonly classes: ReadonlyArray<string>; readonly skipped: ReadonlyArray<unknown> } {
  // Handle falsy values
  if (!input) {
    return { classes: [], skipped: [input] };
  }

  // Handle primitive values
  if (typeof input === 'string') {
    const trimmed = input.trim();
    return { 
      classes: trimmed ? [trimmed] : [], 
      skipped: trimmed ? [] : [input] 
    };
  }
  
  if (typeof input === 'number') {
    return { classes: [String(input)], skipped: [] };
  }

  // Handle functions
  if (typeof input === 'function') {
    try {
      return resolveClassNamesWithDebug(input());
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Error executing className function:', error);
      }
      return { classes: [], skipped: [input] };
    }
  }

  // Handle arrays
  if (Array.isArray(input)) {
    const results = input.map(item => resolveClassNamesWithDebug(item));
    return {
      classes: results.flatMap(result => result.classes),
      skipped: results.flatMap(result => result.skipped)
    };
  }

  // Handle objects
  if (typeof input === 'object' && input !== null) {
    const entries = Object.entries(input);
    const validEntries = entries.filter(([, value]) => value);
    const invalidEntries = entries.filter(([, value]) => !value);
    
    return {
      classes: validEntries.map(([key]) => key),
      skipped: invalidEntries.map(([key, value]) => ({ [key]: value }))
    };
  }

  return { classes: [], skipped: [input] };
}

/**
 * High-performance CSS class name concatenation hook optimized for the 99% use case
 * 
 * This is the primary hook for CSS class name handling in Podr, designed for maximum
 * runtime performance and minimal memory footprint using Preact best practices.
 * 
 * Key Performance Features:
 * - 🚀 Zero debug overhead in production
 * - 🧠 Intelligent memoization with WeakMap caching
 * - ⚡ Optimized string operations with minimal allocations
 * - 🎯 Direct dependency tracking for efficient re-renders
 * - 📦 Minimal memory footprint with efficient algorithms
 * 
 * Preact Optimizations:
 * - Leverages Preact's efficient dependency array comparison
 * - Uses shallow comparison for optimal re-render prevention
 * - Optimized for Preact's reconciliation patterns
 * 
 * @param inputs - Variable arguments of class name inputs (strings, objects, arrays, functions)
 * @returns The computed className string
 * 
 * @example
 * ```tsx
 * // Object-based conditionals (recommended pattern)
 * const className = useClassNames('button', {
 *   'button--primary': isPrimary,
 *   'button--disabled': isDisabled,
 *   'button--loading': isLoading
 * });
 * 
 * // Mixed inputs for complex scenarios
 * const className = useClassNames(
 *   'base',
 *   ['utility', 'classes'],
 *   isActive && 'active',
 *   () => dynamic ? 'dynamic' : null
 * );
 * ```
 */
export function useClassNames(...inputs: ClassNameInput[]): string {
  return useMemo(() => {
    // Fast path for empty inputs
    if (inputs.length === 0) return '';
    
    // Use cache for object inputs to prevent recomputation
    const cacheKey = inputs.length === 1 && typeof inputs[0] === 'object' && inputs[0] !== null
      ? inputs[0] as object
      : null;
    
    if (cacheKey && classNameCache.has(cacheKey)) {
      return classNameCache.get(cacheKey)!;
    }
    
    // Fast path for single string input (most common case)
    if (inputs.length === 1 && typeof inputs[0] === 'string') {
      const trimmed = inputs[0].trim();
      return trimmed;
    }
    
    // Process all inputs with optimized resolution
    const classes: string[] = [];
    for (const input of inputs) {
      const resolved = resolveClassNamesOptimized(input);
      classes.push(...resolved);
    }
    
    // Deduplicate and join efficiently
    const uniqueClasses = [...new Set(classes.filter(Boolean))];
    const result = uniqueClasses.join(' ');
    
    // Cache result for object inputs
    if (cacheKey) {
      classNameCache.set(cacheKey, result);
    }
    
    return result;
  }, [inputs]);
}

/**
 * CSS class name concatenation hook with comprehensive debugging features
 * 
 * This is the debugging version of useClassNames, designed for development and
 * troubleshooting scenarios. Use this when you need detailed information about
 * class name resolution, performance metrics, or debugging complex conditional logic.
 * 
 * Features:
 * - 🐛 Comprehensive debugging information with frozen data structures
 * - 📊 Performance timing metrics
 * - 🛡️ Immutable debug data for safe inspection
 * - 📝 Development logging for skipped inputs
 * - 🔍 Detailed resolution tracking
 * 
 * @param inputs - Variable arguments of class name inputs
 * @returns Object containing the className and debug information
 * 
 * @example
 * ```tsx
 * // Debug complex conditional logic
 * const { className, debug } = useClassNamesWithDebug(
 *   'component',
 *   { active: isActive, loading: isLoading },
 *   dynamicClasses
 * );
 * 
 * console.log('Resolution time:', debug.computationTime);
 * console.log('Final classes:', debug.resolvedClasses);
 * console.log('Skipped inputs:', debug.skippedInputs);
 * ```
 */
export function useClassNamesWithDebug(...inputs: ClassNameInput[]): UseClassNamesWithDebugResult {
  return useMemo(() => {
    const startTime = performance.now();
    
    // Resolve all class names using debugging approach
    const results = inputs.map(input => resolveClassNamesWithDebug(input));
    const allClasses = results.flatMap(result => result.classes);
    const allSkipped = results.flatMap(result => result.skipped);
    
    // Filter out empty strings and deduplicate using immutable operations
    const validClasses = allClasses.filter(Boolean);
    const finalClasses = [...new Set(validClasses)];
    
    // Join with separator
    const className = finalClasses.join(' ');
    const computationTime = performance.now() - startTime;
    
    // Create immutable debug information
    const debug: ClassNameDebugInfo = {
      finalClassName: className,
      inputCount: inputs.length,
      resolvedClasses: Object.freeze([...finalClasses]),
      skippedInputs: Object.freeze([...allSkipped]),
      computationTime
    };
    
    // Development logging for debugging
    if (process.env.NODE_ENV !== 'production' && allSkipped.length > 0) {
      console.debug('useClassNamesWithDebug skipped inputs:', allSkipped);
    }
    
    return { className, debug };
  }, [inputs]);
}

/**
 * @deprecated Use useClassNames instead. This function will be removed in a future version.
 * The simple version is now the main useClassNames hook for better API design.
 */
export function useClassNamesSimple(...inputs: ClassNameInput[]): string {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('useClassNamesSimple is deprecated. Use useClassNames instead.');
  }
  return useClassNames(...inputs);
}
import { useEffect, useRef, useCallback, useMemo } from 'preact/hooks';
import { Signal, effect, signal } from '@preact/signals';
import { createElement, ComponentType, JSX, FunctionComponent, cloneElement, Fragment } from 'preact';
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
 * Enhanced with immutability patterns and modern TypeScript features
 */
type ClassNameValue = string | number | boolean | null | undefined;
type ClassNameObject = Readonly<Record<string, ClassNameValue>>;
type ClassNameArray = ReadonlyArray<ClassNameInput>;
type ClassNameFunction = () => ClassNameInput;
type ClassNameSignal = Signal<ClassNameInput>;
type ClassNameInput = 
  | ClassNameValue 
  | ClassNameObject 
  | ClassNameArray 
  | ClassNameFunction
  | ClassNameSignal;

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
function resolveClassNamesOptimized(input: ClassNameInput): readonly string[] {
  // Handle falsy values - early return for performance
  if (!input) return Object.freeze([]);

  // Handle strings - most common case, optimized path
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return Object.freeze([]);
    // Split by whitespace to handle multiple classes in one string
    return Object.freeze(trimmed.split(/\s+/).filter(Boolean));
  }
  
  // Handle numbers - convert directly
  if (typeof input === 'number') {
    return Object.freeze([String(input)]);
  }

  // Handle Preact signals - extract value efficiently
  if (input && typeof input === 'object' && 'value' in input && typeof (input as any).value !== 'undefined') {
    try {
      return resolveClassNamesOptimized((input as Signal<ClassNameInput>).value);
    } catch {
      return Object.freeze([]); // Silent failure for performance in production
    }
  }

  // Handle functions - with error boundary
  if (typeof input === 'function') {
    try {
      return resolveClassNamesOptimized(input());
    } catch {
      return Object.freeze([]); // Silent failure for performance in production
    }
  }

  // Handle arrays - flatten efficiently with immutability
  if (Array.isArray(input)) {
    const result: string[] = [];
    for (const item of input) {
      const resolved = resolveClassNamesOptimized(item);
      result.push(...resolved);
    }
    return Object.freeze(result);
  }

  // Handle objects - extract truthy keys efficiently with immutability
  if (typeof input === 'object' && input !== null) {
    const result: string[] = [];
    for (const [key, value] of Object.entries(input)) {
      if (value) {
        result.push(key);
      }
    }
    return Object.freeze(result);
  }

  return Object.freeze([]);
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
export function useClassNames(...inputs: readonly ClassNameInput[]): string {
  return useMemo(() => {
    // Fast path for empty inputs - immutable empty string
    if (inputs.length === 0) return '';
    
    // Use WeakMap cache for object inputs to prevent recomputation
    const cacheKey = inputs.length === 1 && typeof inputs[0] === 'object' && inputs[0] !== null
      ? inputs[0] as object
      : null;
    
    if (cacheKey && classNameCache.has(cacheKey)) {
      return classNameCache.get(cacheKey)!;
    }
    
    // Fast path for single string input (most common case) - optimize whitespace handling
    if (inputs.length === 1 && typeof inputs[0] === 'string') {
      const trimmed = inputs[0].trim();
      // Handle multiple classes in single string efficiently
      const multipleClasses = trimmed.includes(' ') 
        ? [...new Set(trimmed.split(/\s+/).filter(Boolean))].join(' ')
        : trimmed;
      return multipleClasses;
    }
    
    // Process all inputs with optimized resolution, maintaining immutability
    const classes: string[] = [];
    for (const input of inputs) {
      const resolved = resolveClassNamesOptimized(input);
      classes.push(...resolved);
    }
    
    // Deduplicate and join efficiently with Set optimization
    const uniqueClasses = [...new Set(classes.filter(Boolean))];
    const result = uniqueClasses.join(' ');
    
    // Cache result for object inputs - performance optimization
    if (cacheKey) {
      classNameCache.set(cacheKey, result);
    }
    
    return result;
  }, inputs); // Simplified dependency array for better performance
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

/**
 * Element collection type for classList operations
 */
type ElementCollection = Element | Element[] | NodeList | HTMLCollection;

/**
 * Utility function to normalize element input to an array for iteration
 * @param elements - Single element or collection of elements
 * @returns Array of Element objects
 */
function normalizeElements(elements: ElementCollection): Element[] {
  if (!elements) return [];
  
  // Single element
  if (elements instanceof Element) {
    return [elements];
  }
  
  // Array of elements
  if (Array.isArray(elements)) {
    return elements.filter((el): el is Element => el instanceof Element);
  }
  
  // NodeList or HTMLCollection
  return Array.from(elements).filter((el): el is Element => el instanceof Element);
}

/**
 * Optimized classList manipulation API for setting CSS classes on DOM element(s)
 * 
 * Adds the specified classes to the classList of the target element(s).
 * Uses the same flexible input types as useClassNames for consistency.
 * 
 * @param elements - Single element or collection of elements to modify
 * @param inputs - Variable arguments of class name inputs (strings, objects, arrays, functions)
 * 
 * @example
 * ```tsx
 * // Single element with various input types
 * setClassList(button, 'btn', 'btn--primary');
 * setClassList(button, { 'btn--active': isActive, 'btn--disabled': disabled });
 * setClassList(button, ['utility', 'classes'], () => dynamic ? 'dynamic' : null);
 * 
 * // Multiple elements
 * const buttons = document.querySelectorAll('.button');
 * setClassList(buttons, 'btn--hover');
 * ```
 */
export function setClassList(elements: ElementCollection, ...inputs: ClassNameInput[]): void {
  // Fast path for empty inputs
  if (inputs.length === 0) return;
  
  const targetElements = normalizeElements(elements);
  if (targetElements.length === 0) return;
  
  // Resolve class names using the same optimization as useClassNames
  const classes: string[] = [];
  for (const input of inputs) {
    const resolved = resolveClassNamesOptimized(input);
    classes.push(...resolved);
  }
  
  // Filter and deduplicate class names
  const uniqueClasses = [...new Set(classes.filter(Boolean))];
  if (uniqueClasses.length === 0) return;
  
  // Apply classes to all target elements
  for (const element of targetElements) {
    for (const className of uniqueClasses) {
      element.classList.add(className);
    }
  }
}

/**
 * Optimized classList manipulation API for removing CSS classes from DOM element(s)
 * 
 * Removes the specified classes from the classList of the target element(s).
 * Uses the same flexible input types as useClassNames for consistency.
 * 
 * @param elements - Single element or collection of elements to modify
 * @param inputs - Variable arguments of class name inputs (strings, objects, arrays, functions)
 * 
 * @example
 * ```tsx
 * // Remove classes from single element
 * unsetClassList(button, 'btn--active', 'btn--focus');
 * unsetClassList(button, { 'btn--disabled': wasDisabled, 'btn--loading': wasLoading });
 * 
 * // Remove classes from multiple elements
 * const cards = document.querySelectorAll('.card');
 * unsetClassList(cards, 'card--highlighted');
 * ```
 */
export function unsetClassList(elements: ElementCollection, ...inputs: ClassNameInput[]): void {
  // Fast path for empty inputs
  if (inputs.length === 0) return;
  
  const targetElements = normalizeElements(elements);
  if (targetElements.length === 0) return;
  
  // Resolve class names using the same optimization as useClassNames
  const classes: string[] = [];
  for (const input of inputs) {
    const resolved = resolveClassNamesOptimized(input);
    classes.push(...resolved);
  }
  
  // Filter and deduplicate class names
  const uniqueClasses = [...new Set(classes.filter(Boolean))];
  if (uniqueClasses.length === 0) return;
  
  // Remove classes from all target elements
  for (const element of targetElements) {
    for (const className of uniqueClasses) {
      element.classList.remove(className);
    }
  }
}

/**
 * Optimized classList manipulation API for toggling CSS classes on DOM element(s)
 * 
 * Toggles the specified classes on the classList of the target element(s).
 * Uses the same flexible input types as useClassNames for consistency.
 * For object inputs, only processes truthy conditions - falsy conditions are ignored.
 * 
 * @param elements - Single element or collection of elements to modify
 * @param inputs - Variable arguments of class name inputs (strings, objects, arrays, functions)
 * 
 * @example
 * ```tsx
 * // Toggle classes on single element
 * toggleClassList(modal, 'modal--open');
 * toggleClassList(button, { 'btn--active': shouldToggleActive });
 * 
 * // Toggle classes on multiple elements
 * const items = document.querySelectorAll('.nav-item');
 * toggleClassList(items, 'nav-item--selected');
 * ```
 */
export function toggleClassList(elements: ElementCollection, ...inputs: ClassNameInput[]): void {
  // Fast path for empty inputs
  if (inputs.length === 0) return;
  
  const targetElements = normalizeElements(elements);
  if (targetElements.length === 0) return;
  
  // Resolve class names using the same optimization as useClassNames
  const classes: string[] = [];
  for (const input of inputs) {
    const resolved = resolveClassNamesOptimized(input);
    classes.push(...resolved);
  }
  
  // Filter and deduplicate class names
  const uniqueClasses = [...new Set(classes.filter(Boolean))];
  if (uniqueClasses.length === 0) return;
  
  // Toggle classes on all target elements
  for (const element of targetElements) {
    for (const className of uniqueClasses) {
      element.classList.toggle(className);
    }
  }
}

// Preact Idiomatic Declarative APIs for classList Management

/**
 * Preact hook for declaratively managing CSS classes on elements via CSS selectors
 * 
 * This hook provides a Preact-idiomatic declarative API that automatically manages
 * CSS classes on DOM elements matching the provided selector. It uses the optimized
 * classList functions as the foundation and integrates seamlessly with Preact's
 * component lifecycle.
 * 
 * @param selector - CSS selector string (e.g., '.button', '#modal', '[data-active]')
 * @param inputs - Variable arguments of class name inputs (same as useClassNames)
 * @param container - Optional container element to scope the selector (defaults to document)
 * 
 * @example
 * ```tsx
 * function NavComponent({ activeIndex }: { activeIndex: number }) {
 *   // Declaratively manage active state on all nav items
 *   useClassListSelector('.nav-item', [{ 'nav-item--active': false }]); // Reset all
 *   useClassListSelector(`[data-nav-index="${activeIndex}"]`, ['nav-item--active']);
 *   
 *   // Apply loading state to all buttons when loading
 *   useClassListSelector('.btn', [{ 'btn--loading': isLoading }]);
 *   
 *   return <nav>...</nav>;
 * }
 * ```
 */
export function useClassListSelector(
  selector: string,
  inputs: ClassNameInput[],
  container: Element | Document = document
): void {
  const inputsRef = useRef<ClassNameInput[]>([]);
  const inputsStringified = JSON.stringify(inputs);
  
  useEffect(() => {
    if (!selector || inputs.length === 0) return;
    
    try {
      const elements = container.querySelectorAll(selector);
      if (elements.length > 0) {
        // Remove previous classes
        if (inputsRef.current.length > 0) {
          unsetClassList(elements, ...inputsRef.current);
        }
        
        // Add new classes
        setClassList(elements, ...inputs);
        inputsRef.current = [...inputs];
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`useClassListSelector: Invalid selector "${selector}"`, error);
      }
    }
    
    // Cleanup function to remove classes when component unmounts or inputs change
    return () => {
      try {
        const elements = container.querySelectorAll(selector);
        if (elements.length > 0 && inputsRef.current.length > 0) {
          unsetClassList(elements, ...inputsRef.current);
        }
      } catch (error) {
        // Silent cleanup failure
      }
    };
  }, [selector, inputsStringified, container]);
}

/**
 * Preact hook for declaratively managing CSS classes on a ref'd element
 * 
 * This hook provides declarative class management for single elements accessed
 * via Preact refs. It automatically applies and cleans up classes based on
 * the component lifecycle and dependency changes.
 * 
 * @param elementRef - Preact ref to the target element
 * @param inputs - Variable arguments of class name inputs (same as useClassNames)
 * 
 * @example
 * ```tsx
 * function ButtonComponent({ isLoading, variant }: ButtonProps) {
 *   const buttonRef = useRef<HTMLButtonElement>(null);
 *   
 *   // Declaratively manage button classes based on props
 *   useElementClassList(buttonRef, [
 *     'btn',
 *     `btn--${variant}`,
 *     { 'btn--loading': isLoading, 'btn--disabled': isLoading }
 *   ]);
 *   
 *   return <button ref={buttonRef}>Click me</button>;
 * }
 * ```
 */
export function useElementClassList<T extends Element>(
  elementRef: { readonly current: T | null },
  inputs: ClassNameInput[]
): void {
  const previousInputsRef = useRef<ClassNameInput[]>([]);
  const inputsStringified = JSON.stringify(inputs);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    // Remove previous classes if they exist
    if (previousInputsRef.current.length > 0) {
      unsetClassList(element, ...previousInputsRef.current);
    }
    
    // Apply new classes
    if (inputs.length > 0) {
      setClassList(element, ...inputs);
      previousInputsRef.current = [...inputs];
    }
    
    // Cleanup function
    return () => {
      if (element && previousInputsRef.current.length > 0) {
        unsetClassList(element, ...previousInputsRef.current);
      }
    };
  }, [elementRef, inputsStringified]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const element = elementRef.current;
      if (element && previousInputsRef.current.length > 0) {
        unsetClassList(element, ...previousInputsRef.current);
        previousInputsRef.current = [];
      }
    };
  }, [elementRef]);
}

/**
 * Preact hook for conditional CSS class management with fine-grained control
 * 
 * This hook provides declarative management of individual CSS classes based on
 * boolean conditions. Unlike useElementClassList which manages the entire class
 * set, this hook allows for granular control over specific classes.
 * 
 * @param elementRef - Preact ref to the target element
 * @param conditions - Object mapping class names to boolean conditions
 * 
 * @example
 * ```tsx
 * function ModalComponent({ isOpen, isLoading }: ModalProps) {
 *   const modalRef = useRef<HTMLDivElement>(null);
 *   
 *   // Conditionally manage specific classes
 *   useConditionalClassList(modalRef, {
 *     'modal--open': isOpen,
 *     'modal--loading': isLoading,
 *     'modal--has-backdrop': isOpen && !isLoading
 *   });
 *   
 *   return <div ref={modalRef} className="modal">...</div>;
 * }
 * ```
 */
export function useConditionalClassList<T extends Element>(
  elementRef: { readonly current: T | null },
  conditions: Record<string, boolean>
): void {
  const previousConditionsRef = useRef<Record<string, boolean>>({});
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    const currentConditions = { ...conditions };
    const previousConditions = previousConditionsRef.current;
    
    // Process each condition
    for (const [className, shouldHaveClass] of Object.entries(currentConditions)) {
      const hadClass = previousConditions[className] || false;
      
      if (shouldHaveClass && !hadClass) {
        // Add class directly
        element.classList.add(className);
      } else if (!shouldHaveClass && hadClass) {
        // Remove class directly
        element.classList.remove(className);
      }
    }
    
    // Handle removed conditions (classes that are no longer being managed)
    for (const [className, hadClass] of Object.entries(previousConditions)) {
      if (!(className in currentConditions) && hadClass) {
        element.classList.remove(className);
      }
    }
    
    previousConditionsRef.current = currentConditions;
    
    // Cleanup function
    return () => {
      if (element) {
        for (const [className, hasClass] of Object.entries(previousConditionsRef.current)) {
          if (hasClass) {
            element.classList.remove(className);
          }
        }
      }
    };
  }, [conditions]); // Depend on the conditions object directly
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const element = elementRef.current;
      if (element) {
        for (const [className, hasClass] of Object.entries(previousConditionsRef.current)) {
          if (hasClass) {
            element.classList.remove(className);
          }
        }
        previousConditionsRef.current = {};
      }
    };
  }, []);
}

/**
 * Preact hook for toggling CSS classes on elements via CSS selectors
 * 
 * This hook provides a declarative API for toggling classes on multiple elements
 * that match a given selector. Useful for implementing toggle behaviors across
 * multiple elements simultaneously.
 * 
 * @param selector - CSS selector string to target elements
 * @param inputs - Variable arguments of class name inputs to toggle
 * @param container - Optional container element to scope the selector
 * @param trigger - Dependency that triggers the toggle (changes cause toggle)
 * 
 * @example
 * ```tsx
 * function ThemeToggle({ isDark }: { isDark: boolean }) {
 *   // Toggle dark theme classes on all theme-aware elements
 *   useToggleClassListSelector('.theme-aware', ['dark-mode'], document.body, isDark);
 *   
 *   // Toggle active state on navigation items
 *   useToggleClassListSelector('.nav-item', 'nav-item--highlighted', document, activeItem);
 *   
 *   return <button>Toggle Theme</button>;
 * }
 * ```
 */
export function useToggleClassListSelector(
  selector: string,
  inputs: ClassNameInput[],
  container: Element | Document = document,
  trigger?: unknown
): void {
  useEffect(() => {
    if (!selector) return;
    
    try {
      const elements = container.querySelectorAll(selector);
      if (elements.length > 0) {
        toggleClassList(elements, ...inputs);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`useToggleClassListSelector: Invalid selector "${selector}"`, error);
      }
    }
  }, [selector, container, trigger, ...inputs]);
}

// =============================================================================
// JSX HOC and Declarative APIs for Performance Optimization
// =============================================================================

/**
 * Props for components that can be enhanced with class list management
 * Made more flexible to work with any component props including data attributes
 */
interface ClassListEnhancedProps {
  readonly className?: string;
  readonly [key: string]: any;
}

/**
 * Configuration for the withClassList HOC
 */
interface WithClassListConfig<P = Record<string, unknown>> {
  /** Base classes to always apply */
  readonly baseClasses?: ClassNameInput[];
  /** Dynamic classes based on props */
  readonly dynamicClasses?: (props: P) => ClassNameInput[];
  /** Whether to merge with existing className prop */
  readonly mergeClassName?: boolean;
  /** Custom class resolution strategy */
  readonly optimizeNodes?: boolean;
}

/**
 * Higher-Order Component that optimizes class management and reduces createElement calls
 * 
 * This HOC wraps a component and provides intelligent class management with performance
 * optimizations. It can merge classes, reduce rendering overhead, and provide consistent
 * class resolution patterns.
 * 
 * @param WrappedComponent - The component to enhance with class list management
 * @param config - Configuration for class management behavior
 * @returns Enhanced component with optimized class management
 * 
 * @example
 * ```tsx
 * // Basic usage with static classes
 * const ButtonWithClasses = withClassList(Button, {
 *   baseClasses: ['btn', 'btn--primary'],
 *   mergeClassName: true
 * });
 * 
 * // Dynamic classes based on props
 * const InteractiveCard = withClassList(Card, {
 *   baseClasses: ['card'],
 *   dynamicClasses: (props) => [
 *     { 'card--active': props.isActive },
 *     { 'card--disabled': props.disabled },
 *     props.variant && `card--${props.variant}`
 *   ],
 *   optimizeNodes: true
 * });
 * 
 * // Usage in JSX
 * <ButtonWithClasses onClick={handleClick}>
 *   Click me
 * </ButtonWithClasses>
 * ```
 */
export function withClassList<P extends ClassListEnhancedProps>(
  WrappedComponent: ComponentType<P>,
  config: WithClassListConfig<P> = {}
): FunctionComponent<P> {
  const {
    baseClasses = [],
    dynamicClasses,
    mergeClassName = true,
    optimizeNodes = true
  } = config;

  const EnhancedComponent: FunctionComponent<P> = (props) => {
    const computedClassName = useMemo(() => {
      const inputs: ClassNameInput[] = [];
      
      // Add base classes
      if (baseClasses.length > 0) {
        inputs.push(...baseClasses);
      }
      
      // Add dynamic classes based on props
      if (dynamicClasses) {
        const dynamicInputs = dynamicClasses(props);
        if (dynamicInputs) {
          inputs.push(...dynamicInputs);
        }
      }
      
      // Add existing className if merging is enabled
      if (mergeClassName && props.className) {
        inputs.push(props.className);
      }
      
      // Resolve class names using the same optimization as useClassNames
      if (inputs.length === 0) return props.className || '';
      
      const allClasses: string[] = [];
      for (const input of inputs) {
        const resolved = resolveClassNamesOptimized(input);
        allClasses.push(...resolved);
      }
      
      // Filter and deduplicate
      const uniqueClasses = [...new Set(allClasses.filter(Boolean))];
      return uniqueClasses.join(' ');
    }, [props]);

    // Performance optimization: reduce createElement calls when possible
    if (optimizeNodes && computedClassName === props.className) {
      return createElement(WrappedComponent, props);
    }

    // Create enhanced props with computed className
    const enhancedProps = {
      ...props,
      className: computedClassName
    } as P;

    return createElement(WrappedComponent, enhancedProps);
  };

  // Set display name for debugging
  EnhancedComponent.displayName = `withClassList(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return EnhancedComponent;
}

/**
 * Props for the ClassListProvider component
 */
interface ClassListProviderProps {
  /** Class name inputs to resolve */
  readonly classes: ClassNameInput[];
  /** Render prop function that receives the computed className */
  readonly children?: (className: string) => JSX.Element;
  /** Whether to optimize rendering performance */
  readonly optimize?: boolean;
}

/**
 * Render prop component that provides optimized class name computation
 * 
 * This component uses the render prop pattern to provide computed class names
 * to child components while optimizing for performance and reducing unnecessary
 * re-renders.
 * 
 * @example
 * ```tsx
 * // Basic render prop usage
 * <ClassListProvider classes={['btn', { 'btn--active': isActive }]}>
 *   {(className) => (
 *     <button className={className} onClick={handleClick}>
 *       Dynamic Button
 *     </button>
 *   )}
 * </ClassListProvider>
 * 
 * // Complex conditional rendering
 * <ClassListProvider 
 *   classes={[
 *     'modal',
 *     { 'modal--open': isOpen },
 *     { 'modal--loading': isLoading },
 *     () => theme === 'dark' ? 'modal--dark' : 'modal--light'
 *   ]}
 *   optimize={true}
 * >
 *   {(className) => (
 *     <div className={className}>
 *       <ModalContent />
 *     </div>
 *   )}
 * </ClassListProvider>
 * ```
 */
export const ClassListProvider: FunctionComponent<ClassListProviderProps> = ({
  classes,
  children,
  optimize = true
}) => {
  const className = useMemo(() => {
    // Resolve class names using the same optimization as useClassNames
    const allClasses: string[] = [];
    for (const input of classes) {
      const resolved = resolveClassNamesOptimized(input);
      allClasses.push(...resolved);
    }
    
    // Filter and deduplicate
    const uniqueClasses = [...new Set(allClasses.filter(Boolean))];
    return uniqueClasses.join(' ');
  }, optimize ? [classes] : []);

  // Return empty fragment if no children provided (for testing)
  if (!children) {
    return createElement('div', { className });
  }

  return children(className);
};

/**
 * Props for OptimizedClassList component
 */
interface OptimizedClassListProps {
  /** Elements to render with shared classes */
  readonly elements: readonly JSX.Element[];
  /** Shared classes to apply to all elements */
  readonly sharedClasses?: ClassNameInput[];
  /** Strategy for optimizing DOM nodes */
  readonly strategy?: 'merge' | 'fragment' | 'collapse';
  /** Whether to deduplicate similar elements */
  readonly deduplicate?: boolean;
}

/**
 * Component that optimizes multiple elements with shared class patterns
 * 
 * This component can intelligently merge, fragment, or collapse multiple elements
 * to reduce DOM nodes and optimize rendering performance. It's particularly useful
 * when rendering lists of similar elements with shared styling.
 * 
 * @example
 * ```tsx
 * // Optimize a list of buttons with shared classes
 * <OptimizedClassList
 *   elements={[
 *     <button key="1">Button 1</button>,
 *     <button key="2">Button 2</button>,
 *     <button key="3">Button 3</button>
 *   ]}
 *   sharedClasses={['btn', 'btn--small']}
 *   strategy="merge"
 *   deduplicate={true}
 * />
 * 
 * // Fragment strategy for minimal DOM impact
 * <OptimizedClassList
 *   elements={navItems}
 *   sharedClasses={[{ 'nav-item--active': isActive }]}
 *   strategy="fragment"
 * />
 * ```
 */
export const OptimizedClassList: FunctionComponent<OptimizedClassListProps> = ({
  elements,
  sharedClasses = [],
  strategy = 'fragment',
  deduplicate = false
}) => {
  const optimizedElements = useMemo(() => {
    if (elements.length === 0) return [];
    
    // Compute shared class name once
    const sharedClassName = sharedClasses.length > 0 
      ? (() => {
          const allClasses: string[] = [];
          for (const input of sharedClasses) {
            const resolved = resolveClassNamesOptimized(input);
            allClasses.push(...resolved);
          }
          const uniqueClasses = [...new Set(allClasses.filter(Boolean))];
          return uniqueClasses.join(' ');
        })()
      : '';

    // Process elements based on strategy
    let processedElements = [...elements];

    // Deduplicate similar elements if requested
    if (deduplicate) {
      const seen = new Set<string>();
      processedElements = processedElements.filter(element => {
        const key = `${element.type}-${JSON.stringify(element.props)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // Apply shared classes to elements
    const enhancedElements = processedElements.map((element, index) => {
      if (!sharedClassName) return element;

      const existingClassName = element.props?.className || '';
      const mergedClassName = existingClassName 
        ? `${existingClassName} ${sharedClassName}`.trim()
        : sharedClassName;

      return cloneElement(element, {
        ...element.props,
        className: mergedClassName,
        key: element.key || index
      });
    });

    return enhancedElements;
  }, [elements, sharedClasses, deduplicate]);

  // Render based on strategy
  switch (strategy) {
    case 'merge':
      // Attempt to merge similar elements (simplified for demo)
      return createElement(Fragment, {}, ...optimizedElements);
      
    case 'collapse':
      // Collapse into minimal structure when possible
      if (optimizedElements.length === 1) {
        return optimizedElements[0];
      }
      return createElement(Fragment, {}, ...optimizedElements);
      
    case 'fragment':
    default:
      // Use Fragment for minimal DOM impact
      return createElement(Fragment, {}, ...optimizedElements);
  }
};

/**
 * Hook that returns optimized render functions for performance-critical scenarios
 * 
 * This hook provides pre-computed render functions that can reduce createElement
 * calls and optimize rendering performance for frequently updated components.
 * 
 * @param baseClasses - Base classes to apply
 * @param optimizations - Optimization configuration
 * @returns Object with optimized render functions
 * 
 * @example
 * ```tsx
 * function PerformantList({ items, isLoading }: ListProps) {
 *   const { renderOptimized, renderWithClasses } = useOptimizedClassList(
 *     ['list-item'],
 *     { memoizeElements: true, batchUpdates: true }
 *   );
 * 
 *   return (
 *     <div>
 *       {items.map(item => 
 *         renderOptimized('li', 
 *           { 'list-item--active': item.isActive },
 *           item.content
 *         )
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOptimizedClassList(
  baseClasses: ClassNameInput[] = [],
  optimizations: {
    readonly memoizeElements?: boolean;
    readonly batchUpdates?: boolean;
    readonly reduceCreateElement?: boolean;
  } = {}
) {
  const {
    memoizeElements = true,
    batchUpdates = false,
    reduceCreateElement = true
  } = optimizations;

  const baseClassName = useMemo(() => {
    if (baseClasses.length === 0) return '';
    
    const allClasses: string[] = [];
    for (const input of baseClasses) {
      const resolved = resolveClassNamesOptimized(input);
      allClasses.push(...resolved);
    }
    const uniqueClasses = [...new Set(allClasses.filter(Boolean))];
    return uniqueClasses.join(' ');
  }, [baseClasses]);

  const renderOptimized = useCallback((
    type: string | ComponentType<any>,
    conditionalClasses: ClassNameInput,
    children?: JSX.Element | string | readonly (JSX.Element | string)[],
    props: Readonly<Record<string, unknown>> = {}
  ): JSX.Element => {
    const fullClassName = useMemo(() => {
      const inputs: ClassNameInput[] = [];
      if (baseClassName) inputs.push(baseClassName);
      if (conditionalClasses) inputs.push(conditionalClasses);
      
      if (inputs.length === 0) return '';
      
      const allClasses: string[] = [];
      for (const input of inputs) {
        const resolved = resolveClassNamesOptimized(input);
        allClasses.push(...resolved);
      }
      const uniqueClasses = [...new Set(allClasses.filter(Boolean))];
      return uniqueClasses.join(' ');
    }, [conditionalClasses]);

    const elementProps: Readonly<Record<string, unknown>> = {
      ...props,
      className: fullClassName
    } as const;

    if (reduceCreateElement && !children) {
      return createElement(type as any, elementProps);
    }

    return createElement(type as any, elementProps, children);
  }, [baseClassName, reduceCreateElement]);

  const renderWithClasses = useCallback((
    type: string | ComponentType<any>,
    classes: readonly ClassNameInput[],
    children?: JSX.Element | string | readonly (JSX.Element | string)[],
    props: Readonly<Record<string, unknown>> = {}
  ): JSX.Element => {
    const allInputs = [...baseClasses, ...classes] as const;
    
    let className = '';
    if (allInputs.length > 0) {
      const allClasses: string[] = [];
      for (const input of allInputs) {
        const resolved = resolveClassNamesOptimized(input);
        allClasses.push(...resolved);
      }
      const uniqueClasses = [...new Set(allClasses.filter(Boolean))];
      className = uniqueClasses.join(' ');
    }
    
    return createElement(type as any, { ...props, className } as const, children);
  }, [baseClasses]);

  return {
    renderOptimized: memoizeElements ? useMemo(() => renderOptimized, [renderOptimized]) : renderOptimized,
    renderWithClasses: memoizeElements ? useMemo(() => renderWithClasses, [renderWithClasses]) : renderWithClasses,
    baseClassName
  } as const;
}

// ========================================================================================
// Enhanced JSX Props with Custom Pragma
// ========================================================================================

/**
 * Enhanced props interface that includes classList alongside standard JSX props
 * This extends the standard JSX props to include our custom classList property
 * Uses readonly for immutability and proper typing for better performance
 */
interface EnhancedJSXProps extends Readonly<JSX.HTMLAttributes<any>> {
  /**
   * Dynamic class list input using the same flexible patterns as useClassNames
   * Can accept strings, objects, arrays, functions, or any combination
   */
  readonly classList?: ClassNameInput;
  /**
   * Standard className prop for compatibility
   */
  readonly className?: string;
  /**
   * Children elements - made more specific than JSX.Element
   */
  readonly children?: JSX.Element | JSX.Element[] | string | string[];
  /**
   * Allow any additional props for maximum flexibility
   */
  readonly [key: string]: any;
}

/**
 * Custom JSX factory function that automatically handles classList prop merging
 * 
 * This function creates a custom JSX pragma that enhances the standard JSX
 * experience by automatically merging className and classList props using the
 * same optimized logic as useClassNames.
 * 
 * Features:
 * - 🎯 Seamless integration with existing className prop
 * - ⚡ Uses optimized useClassNames logic for consistency and performance
 * - 🔄 Supports all ClassNameInput patterns (strings, objects, arrays, functions)
 * - 📦 Zero runtime overhead when classList is not used
 * - 🛡️ Type-safe with full TypeScript support
 * - 🧹 Automatic prop cleanup to prevent invalid HTML attributes
 * 
 * @param type - The JSX element type (string for HTML elements, function for components)
 * @param props - The element props, potentially including classList
 * @param children - Child elements
 * @returns JSX element with merged className
 * 
 * @example
 * ```tsx
 * // Configure the custom pragma in your component file
 * /** @jsx h *\/
 * import { h } from './utils/hooks';
 * 
 * function MyComponent({ isActive, isDisabled }: ComponentProps) {
 *   return (
 *     <div 
 *       className="base-button"
 *       classList={{
 *         'button--active': isActive,
 *         'button--disabled': isDisabled,
 *         'button--primary': !isDisabled
 *       }}
 *     >
 *       Click me
 *     </div>
 *   );
 * }
 * 
 * // Alternative: Mixed usage patterns
 * <button
 *   classList={[
 *     'utility-class',
 *     { 'conditional': someCondition },
 *     () => dynamicClass()
 *   ]}
 *   className="base-class"
 * >
 *   Mixed patterns
 * </button>
 * ```
 */
export function h(
  type: string | ComponentType<any>,
  props: EnhancedJSXProps | null,
  ...children: readonly any[]
): JSX.Element {
  // Handle null/undefined props - performance fast path
  if (!props) {
    return createElement(type as any, null, ...children);
  }
  
  // Fast path: no classList prop present - avoid object destructuring overhead
  if (!('classList' in props)) {
    return createElement(type as any, props, ...children);
  }
  
  // Extract classList and className, keeping other props immutable
  const { classList, className, ...restProps } = props;
  
  // Handle empty classList - another fast path
  if (!classList) {
    return createElement(type as any, { ...restProps, className } as const, ...children);
  }
  
  // Build array of all class inputs for unified processing
  const allInputs: readonly ClassNameInput[] = [
    ...(className ? [className] : []),
    ...(classList ? [classList] : [])
  ] as const;
  
  // Early return for empty inputs
  if (allInputs.length === 0) {
    return createElement(type as any, restProps, ...children);
  }
  
  // Use the same optimized logic as useClassNames for consistency
  const allClasses: string[] = [];
  for (const input of allInputs) {
    const resolved = resolveClassNamesOptimized(input);
    allClasses.push(...resolved);
  }
  
  // Deduplicate and create final className - use Set for performance
  const finalClassName = allClasses.length > 0 
    ? [...new Set(allClasses.filter(Boolean))].join(' ')
    : undefined;
  
  // Create element with merged className, maintain immutability
  const finalProps = {
    ...restProps,
    ...(finalClassName && { className: finalClassName })
  } as const;
  
  return createElement(type as any, finalProps, ...children);
}

/**
 * Alternative export for explicit pragma configuration
 * Use this when you want to be explicit about using the enhanced JSX factory
 * 
 * @example
 * ```tsx
 * import { enhancedJSX as h } from './utils/hooks';
 * // @jsx h
 * ```
 */
export const enhancedJSX = h;

/**
 * Type definitions for enhanced JSX elements to support classList prop
 * This module declaration extends the JSX namespace to include our classList prop
 */
declare module 'preact' {
  namespace JSX {
    interface HTMLAttributes<RefType extends EventTarget = EventTarget> {
      /**
       * Enhanced classList prop that accepts the same flexible input patterns as useClassNames
       * Automatically merged with className prop when using the custom JSX pragma
       */
      classList?: ClassNameInput;
    }
  }
}

/**
 * Utility function to create enhanced JSX elements programmatically
 * This provides a functional API for creating elements with classList support
 * without requiring the JSX pragma configuration
 * 
 * @param type - Element type
 * @param props - Props including optional classList
 * @param children - Child elements
 * @returns Enhanced JSX element
 * 
 * @example
 * ```tsx
 * import { createEnhancedElement } from './utils/hooks';
 * 
 * function DynamicComponent() {
 *   return createEnhancedElement(
 *     'div',
 *     {
 *       className: 'base',
 *       classList: { 'active': isActive }
 *     },
 *     'Content'
 *   );
 * }
 * ```
 */
export function createEnhancedElement(
  type: string | ComponentType<any>,
  props: EnhancedJSXProps | null = null,
  ...children: readonly any[]
): JSX.Element {
  return h(type, props, ...children);
}

/**
 * Hook for dynamic classList management that returns a className string
 * This hook provides a bridge between the classList concept and traditional className usage
 * 
 * @param classList - ClassList input using the same patterns as useClassNames
 * @param baseClassName - Optional base className to merge with
 * @returns Computed className string
 * 
 * @example
 * ```tsx
 * function Component({ isActive, isDisabled }: ComponentProps) {
 *   const className = useClassList(
 *     {
 *       'component--active': isActive,
 *       'component--disabled': isDisabled
 *     },
 *     'base-component'
 *   );
 *   
 *   return <div className={className}>Content</div>;
 * }
 * ```
 */
export function useClassList(
  classList: ClassNameInput,
  baseClassName?: string
): string {
  return useMemo(() => {
    if (!classList && !baseClassName) return '';
    
    const inputs: ClassNameInput[] = [];
    if (baseClassName) inputs.push(baseClassName);
    if (classList) inputs.push(classList);
    
    if (inputs.length === 0) return '';
    
    const allClasses: string[] = [];
    for (const input of inputs) {
      const resolved = resolveClassNamesOptimized(input);
      allClasses.push(...resolved);
    }
    
    const uniqueClasses = [...new Set(allClasses.filter(Boolean))];
    return uniqueClasses.join(' ');
  }, [classList, baseClassName]);
}
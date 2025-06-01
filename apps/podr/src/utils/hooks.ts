import { useEffect, useRef, useCallback } from 'preact/hooks';
import { Signal, effect } from '@preact/signals';
import { Constants } from './AppContext';

/**
 * Custom hook for using localStorage with signals
 * @param key Local storage key
 * @param defaultValue Default value for the signal
 * @returns A signal that syncs with localStorage
 */
export function useLocalStorageSignal<T>(
  key: string, 
  defaultValue: T
): Signal<T> {
  const signal = useRef<Signal<T>>(new Signal<T>(defaultValue)).current;
  
  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        signal.value = JSON.parse(item);
      }
    } catch (e) {
      console.error(`Error reading localStorage key "${key}":`, e);
    }
  }, [key]);
  
  // Save to localStorage on signal change
  effect(() => {
    localStorage.setItem(key, JSON.stringify(signal.value));
  });
  
  return signal;
}

/**
 * Custom hook for working with audio elements
 * @param initialSrc Initial audio source
 * @returns Audio control methods and state
 */
export function useAudio(initialSrc?: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const play = useCallback((src?: string) => {
    if (!audioRef.current) return;
    
    if (src) {
      audioRef.current.src = src;
    }
    
    audioRef.current.play().catch(err => {
      console.error('Error playing audio:', err);
      window.gtag('event', 'exception', {
        description: `audio_play_error_${err.message}`,
        fatal: false
      });
    });
  }, []);
  
  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  }, []);
  
  return { audioRef, play, pause };
}

/**
 * Custom hook for API requests
 * @param url The URL to fetch from
 * @param options Fetch options
 * @returns Object containing loading state, data, error, and refetch function
 */
export function useFetch<T>(url: string | null, options?: RequestInit) {
  const isLoading = useRef<Signal<boolean>>(new Signal<boolean>(false)).current;
  const data = useRef<Signal<T | null>>(new Signal<T | null>(null)).current;
  const error = useRef<Signal<Error | null>>(new Signal<Error | null>(null)).current;
  
  const fetchData = useCallback(async () => {
    if (!url) return;
    
    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.json();
      data.value = result;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      window.gtag('event', 'exception', {
        description: `useFetch_error_${url}_${error.value.message}`,
        fatal: false
      });
    } finally {
      isLoading.value = false;
    }
  }, [url, options]);
  
  useEffect(() => {
    if (url) {
      fetchData();
    }
  }, [url, fetchData]);
  
  return { 
    isLoading: isLoading.value, 
    data: data.value, 
    error: error.value, 
    refetch: fetchData 
  };
}

/**
 * Custom hook for analytics tracking
 */
export function useAnalytics() {
  const trackEvent = useCallback((category: string, action: string, label: string) => {
    if (typeof window === 'undefined' || !window.gtag) return;
    
    window.gtag('event', category, {
      eventAction: action,
      eventLabel: label,
      transport: 'beacon'
    });
  }, []);
  
  const trackException = useCallback((description: string, fatal: boolean = false) => {
    if (typeof window === 'undefined' || !window.gtag) return;
    
    window.gtag('event', 'exception', {
      description,
      fatal
    });
  }, []);
  
  const trackSearch = useCallback((searchTerm: string) => {
    if (typeof window === 'undefined' || !window.gtag) return;
    
    window.gtag('event', 'search', {
      search_term: searchTerm,
      transport: 'beacon'
    });
  }, []);
  
  return { trackEvent, trackException, trackSearch };
}
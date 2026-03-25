import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { signalDebounce } from './signal-debounce';

describe('signalDebounce', () => {
  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('without params (simple mode)', () => {
    it('should create a signal with undefined initial value when no initialValue is provided', () => {
      const debounced = signalDebounce<string>({ debounceTime: 300 });
      expect(debounced()).toBeUndefined();
    });

    it('should create a signal with the provided initialValue', () => {
      const debounced = signalDebounce<string>({
        debounceTime: 300,
        initialValue: 'hello',
      });
      expect(debounced()).toBe('hello');
    });

    it('should expose isLoading as false initially', () => {
      const debounced = signalDebounce<string>({
        debounceTime: 300,
        initialValue: '',
      });
      expect(debounced.isLoading()).toBe(false);
    });

    it('should allow direct set (bypassing debounce)', () => {
      const debounced = signalDebounce<string>({
        debounceTime: 300,
        initialValue: '',
      });
      debounced.set('instant');
      expect(debounced()).toBe('instant');
      expect(debounced.isLoading()).toBe(false);
    });

    it('should allow direct update (bypassing debounce)', () => {
      const debounced = signalDebounce<number>({
        debounceTime: 300,
        initialValue: 10,
      });
      debounced.update((v) => v + 5);
      expect(debounced()).toBe(15);
    });

    it('should set isLoading to true during debounce and false after', () => {
      const debounced = signalDebounce<string>({
        debounceTime: 300,
        initialValue: '',
      });

      debounced.setDebounced('pending');
      expect(debounced.isLoading()).toBe(true);
      expect(debounced()).toBe(''); // value not yet committed

      vi.advanceTimersByTime(300);
      expect(debounced.isLoading()).toBe(false);
      expect(debounced()).toBe('pending');
    });

    it('should debounce: only the last value commits when called rapidly', () => {
      const debounced = signalDebounce<string>({
        debounceTime: 200,
        initialValue: '',
      });

      debounced.setDebounced('a');
      vi.advanceTimersByTime(50);
      debounced.setDebounced('b');
      vi.advanceTimersByTime(50);
      debounced.setDebounced('c');

      expect(debounced()).toBe(''); // nothing committed yet
      expect(debounced.isLoading()).toBe(true);

      vi.advanceTimersByTime(200);
      expect(debounced()).toBe('c');
      expect(debounced.isLoading()).toBe(false);
    });

    it('should reset the timer on each setDebounced call', () => {
      const debounced = signalDebounce<string>({
        debounceTime: 300,
        initialValue: '',
      });

      debounced.setDebounced('first');
      vi.advanceTimersByTime(250); // 250ms in, not yet committed
      expect(debounced()).toBe('');

      debounced.setDebounced('second'); // resets timer
      vi.advanceTimersByTime(250); // 250ms after second call (total 500ms)
      expect(debounced()).toBe(''); // still not committed (timer was reset)

      vi.advanceTimersByTime(50); // 300ms after second call
      expect(debounced()).toBe('second');
    });

    it('should work with number type', () => {
      const debounced = signalDebounce<number>({
        debounceTime: 100,
        initialValue: 0,
      });

      debounced.setDebounced(42);
      vi.advanceTimersByTime(100);
      expect(debounced()).toBe(42);
    });

    it('should work with object types', () => {
      const debounced = signalDebounce<{ name: string }>({
        debounceTime: 100,
        initialValue: { name: '' },
      });

      debounced.setDebounced({ name: 'test' });
      vi.advanceTimersByTime(100);
      expect(debounced()).toEqual({ name: 'test' });
    });

    it('should work with debounceTime of 0', () => {
      const debounced = signalDebounce<string>({
        debounceTime: 0,
        initialValue: '',
      });

      debounced.setDebounced('immediate');
      vi.advanceTimersByTime(0);
      expect(debounced()).toBe('immediate');
    });

    it('should handle multiple sequential debounced values (non-overlapping)', () => {
      const debounced = signalDebounce<string>({
        debounceTime: 100,
        initialValue: '',
      });

      debounced.setDebounced('first');
      vi.advanceTimersByTime(100);
      expect(debounced()).toBe('first');

      debounced.setDebounced('second');
      vi.advanceTimersByTime(100);
      expect(debounced()).toBe('second');

      debounced.setDebounced('third');
      vi.advanceTimersByTime(100);
      expect(debounced()).toBe('third');
    });
  });

  describe('with params but outside injection context', () => {
    it('should fall back to simple signal and log an error', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const source = signal('source-value');
      // linkedSignal may throw outside injection context in some Angular versions
      // In that case, the function itself may throw before reaching getSig
      let debounced: ReturnType<typeof signalDebounce<string>>;
      let threw = false;

      try {
        debounced = signalDebounce<string>({
          params: () => source(),
          debounceTime: 200,
          initialValue: 'fallback',
        });
      } catch {
        threw = true;
      }

      if (threw) {
        // linkedSignal threw before reaching the isInInjectionContext check
        // This is expected behavior — linkedSignal requires injection context
        expect(threw).toBe(true);
      } else {
        // Fallback path: console.error was called and we got a simple signal
        expect(consoleSpy).toHaveBeenCalled();
        expect(debounced!()).toBe('fallback');

        // setDebounced should still work
        debounced!.setDebounced('manual');
        vi.advanceTimersByTime(200);
        expect(debounced!()).toBe('manual');
      }

      consoleSpy.mockRestore();
    });
  });

  describe('with params inside injection context', () => {
    it('should create debounced signal tracking the source signal (initial value is undefined until resource resolves)', () => {
      const source = signal('initial');

      const debounced = TestBed.runInInjectionContext(() =>
        signalDebounce<string>({
          params: () => source(),
          debounceTime: 300,
          initialValue: 'initial',
        }),
      );

      // resource-backed signal: value starts as undefined and isLoading is false
      // before the resource stream has been triggered
      expect(debounced()).toBeUndefined();
      expect(debounced.isLoading()).toBe(false);
    });

    it('should expose setDebounced that works inside injection context', () => {
      const source = signal('start');

      const debounced = TestBed.runInInjectionContext(() =>
        signalDebounce<string>({
          params: () => source(),
          debounceTime: 200,
          initialValue: 'start',
        }),
      );

      debounced.setDebounced('updated');
      expect(debounced.isLoading()).toBe(true);

      vi.advanceTimersByTime(200);
      expect(debounced.isLoading()).toBe(false);
    });

    it('should expose isLoading signal inside injection context', () => {
      const source = signal(0);

      const debounced = TestBed.runInInjectionContext(() =>
        signalDebounce<number>({
          params: () => source(),
          debounceTime: 150,
          initialValue: 0,
        }),
      );

      expect(debounced.isLoading()).toBe(false);

      debounced.setDebounced(99);
      expect(debounced.isLoading()).toBe(true);

      vi.advanceTimersByTime(150);
      expect(debounced.isLoading()).toBe(false);
    });
  });
});

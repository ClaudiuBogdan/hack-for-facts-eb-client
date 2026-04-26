import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { useDebouncedCallback } from '@/lib/hooks/useDebouncedCallback';

type EqualityFn<TValue> = (left: TValue, right: TValue) => boolean;

interface UseBufferedCommittedValueOptions<TValue> {
  readonly value: TValue;
  readonly onCommit: (value: TValue) => void;
  readonly delay?: number;
  readonly enabled?: boolean;
  readonly isEqual?: EqualityFn<TValue>;
}

export function useBufferedCommittedValue<TValue>({
  value,
  onCommit,
  delay = 300,
  enabled = true,
  isEqual = Object.is,
}: UseBufferedCommittedValueOptions<TValue>) {
  const [draftValue, setDraftValueState] = useState<TValue>(value);
  const draftValueRef = useRef(value);
  const committedValueRef = useRef(value);
  const enabledRef = useRef(enabled);
  const isEqualRef = useRef(isEqual);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    isEqualRef.current = isEqual;
  }, [isEqual]);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  const commitValue = useCallback((nextValue: TValue) => {
    if (!enabledRef.current || isEqualRef.current(nextValue, committedValueRef.current)) {
      return;
    }

    committedValueRef.current = nextValue;
    onCommitRef.current(nextValue);
  }, []);

  const debouncedCommit = useDebouncedCallback<[TValue]>((nextValue) => {
    commitValue(nextValue);
  }, delay);

  const setDraftValue = useCallback(
    (action: SetStateAction<TValue>) => {
      const nextValue =
        typeof action === 'function'
          ? (action as (currentValue: TValue) => TValue)(draftValueRef.current)
          : action;

      draftValueRef.current = nextValue;
      setDraftValueState(nextValue);
      debouncedCommit(nextValue);
    },
    [debouncedCommit]
  );

  const commit = useCallback(() => {
    debouncedCommit.cancel();
    commitValue(draftValueRef.current);
  }, [commitValue, debouncedCommit]);

  const reset = useCallback(
    (nextValue: TValue = committedValueRef.current) => {
      debouncedCommit.cancel();
      draftValueRef.current = nextValue;
      committedValueRef.current = nextValue;
      setDraftValueState(nextValue);
    },
    [debouncedCommit]
  );

  useEffect(() => {
    debouncedCommit.cancel();
    draftValueRef.current = value;
    committedValueRef.current = value;
    setDraftValueState(value);
  }, [debouncedCommit, value]);

  useEffect(() => {
    return () => {
      debouncedCommit.cancel();
      commitValue(draftValueRef.current);
    };
  }, [commitValue, debouncedCommit]);

  return {
    value: draftValue,
    setValue: setDraftValue,
    commit,
    reset,
  };
}

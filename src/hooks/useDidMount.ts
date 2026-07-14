import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/**
 * @return True, if component was mounted.
 */
export function useDidMount(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

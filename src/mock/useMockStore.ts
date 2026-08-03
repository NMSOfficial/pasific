import { useSyncExternalStore } from 'react';
import { mockStore, type MockState } from './store';

export function useMockState(): MockState {
  return useSyncExternalStore(mockStore.subscribe, mockStore.getState);
}

export { mockStore };

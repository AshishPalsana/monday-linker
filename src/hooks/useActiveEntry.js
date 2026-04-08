import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveEntry, clearActiveEntry } from '../store/activeEntrySlice';

export function useActiveEntry() {
  const dispatch    = useDispatch();
  const activeEntry = useSelector((state) => state.activeEntry);

  const set   = useCallback((entry) => dispatch(setActiveEntry(entry)),  [dispatch]);
  const clear = useCallback(()      => dispatch(clearActiveEntry()),      [dispatch]);

  return { activeEntry, setActiveEntry: set, clearActiveEntry: clear };
}

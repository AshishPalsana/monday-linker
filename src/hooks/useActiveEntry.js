import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveEntry, clearActiveEntry } from '../store/activeEntrySlice';

export function useActiveEntry() {
  const dispatch = useDispatch();
  const activeEntries = useSelector((state) => state.activeEntry);

  const set = useCallback((type, entry) => 
    dispatch(setActiveEntry({ type, entry })), [dispatch]);
    
  const clear = useCallback((type) => 
    dispatch(clearActiveEntry(type)), [dispatch]);

  return { activeEntries, setActiveEntry: set, clearActiveEntry: clear };
}

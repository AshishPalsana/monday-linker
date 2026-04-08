import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { login } from '../store/authSlice';

export function AuthProvider({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(login({
      mondayUserId: import.meta.env.VITE_MONDAY_USER_ID   || '',
      name:         import.meta.env.VITE_MONDAY_USER_NAME || '',
      isAdmin:      import.meta.env.VITE_MONDAY_USER_IS_ADMIN === 'true',
    }));
  }, [dispatch]);

  return children;
}

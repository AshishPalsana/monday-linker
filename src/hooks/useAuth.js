import { useSelector } from 'react-redux';

export function useAuth() {
  const { loading, error, data } = useSelector((state) => state.auth);
  return { auth: data, authLoading: loading, authError: error };
}

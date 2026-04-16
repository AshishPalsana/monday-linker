import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const BoardHeaderContext = createContext(null);

export function BoardHeaderProvider({ children }) {
  const [title, setTitle] = useState('');
  const [count, setCount] = useState(0);
  const [countLabel, setCountLabel] = useState('total');
  const [search, setSearch] = useState('');
  const [buttonLabel, setButtonLabel] = useState(null);
  const [onButtonClick, setOnButtonClick] = useState(null);
  const [extra, setExtra] = useState(null);

  const setHeaderConfig = useCallback((config) => {
    if (config.title !== undefined) setTitle(config.title);
    if (config.count !== undefined) setCount(config.count);
    if (config.countLabel !== undefined) setCountLabel(config.countLabel);
    if (config.buttonLabel !== undefined) setButtonLabel(config.buttonLabel);
    if (config.onButtonClick !== undefined) setOnButtonClick(() => config.onButtonClick);
    if (config.extra !== undefined) setExtra(config.extra);
  }, []);

  const value = {
    title,
    count,
    countLabel,
    search,
    setSearch,
    buttonLabel,
    onButtonClick,
    extra,
    setHeaderConfig,
  };

  return (
    <BoardHeaderContext.Provider value={value}>
      {children}
    </BoardHeaderContext.Provider>
  );
}

export function useBoardHeader(config) {
  const context = useContext(BoardHeaderContext);
  if (!context) {
    throw new Error('useBoardHeader must be used within a BoardHeaderProvider');
  }

  const { setHeaderConfig, setSearch, search } = context;
  const { title, count, countLabel, buttonLabel, onButtonClick, extra } = config || {};

  useEffect(() => {
    if (config) {
      setHeaderConfig({ title, count, countLabel, buttonLabel, onButtonClick, extra });
    }
  }, [title, count, countLabel, buttonLabel, onButtonClick, extra, setHeaderConfig]);

  // Reset EVERYTHING when switching pages (unmounting)
  useEffect(() => {
    return () => {
      setSearch('');
      setHeaderConfig({
        title: '',
        count: 0,
        countLabel: 'total',
        buttonLabel: null,
        onButtonClick: null,
        extra: null
      });
    };
  }, [setSearch, setHeaderConfig]);

  return { search, setSearch };
}

export const useBoardHeaderContext = () => useContext(BoardHeaderContext);

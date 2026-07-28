import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { Keyboard } from 'react-native';

// Shared state for the island search: the tab bar owns the input, the vault
// screen consumes the query. Both live under the tabs layout's provider.
type SearchValue = {
  query: string;
  setQuery: (q: string) => void;
  isOpen: boolean; // island is in expanded search mode
  open: () => void; // expand only — navigation to vault is the island's job
  close: () => void; // collapse AND clear, so no hidden filter survives
};

const SearchContext = createContext<SearchValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo<SearchValue>(
    () => ({
      query,
      setQuery,
      isOpen,
      open: () => setIsOpen(true),
      close: () => {
        Keyboard.dismiss();
        setIsOpen(false);
        setQuery('');
      },
    }),
    [query, isOpen]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within SearchProvider');
  return ctx;
}

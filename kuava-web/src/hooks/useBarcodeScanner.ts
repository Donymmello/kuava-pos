import { useCallback, useState } from 'react';
import { useCartStore } from '../store/useCartStore';

interface UseBarcodeScannerResult {
  searchValue: string;
  setSearchValue: (value: string) => void;
  submitSearch: () => Promise<void>;
}

/**
 * Controla o campo de busca/leitor de código de barras. Leitores USB
 * funcionam como teclados: escrevem os dígitos rapidamente seguidos de
 * Enter, que é capturado pelo onKeyDown do campo de input.
 */
export function useBarcodeScanner(): UseBarcodeScannerResult {
  const [searchValue, setSearchValue] = useState('');
  const addProductByBarcode = useCartStore((state) => state.addProductByBarcode);

  const submitSearch = useCallback(async () => {
    const code = searchValue.trim();
    if (!code) {
      return;
    }

    const found = await addProductByBarcode(code);
    if (found) {
      setSearchValue('');
    }
  }, [searchValue, addProductByBarcode]);

  return { searchValue, setSearchValue, submitSearch };
}

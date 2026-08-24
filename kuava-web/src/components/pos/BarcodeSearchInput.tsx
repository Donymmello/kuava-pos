import { forwardRef, KeyboardEvent } from 'react';
import { InputAdornment, TextField } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';

interface BarcodeSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
}

const BarcodeSearchInput = forwardRef<HTMLInputElement, BarcodeSearchInputProps>(
  ({ value, onChange, onSubmit, loading }, ref) => {
    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      if (event.key === 'Enter') {
        onSubmit();
      }
    }

    return (
      <TextField
        inputRef={ref}
        fullWidth
        autoFocus
        placeholder="Ler código de barras ou pesquisar produto (F2)"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <QrCodeScannerIcon color="primary" />
            </InputAdornment>
          ),
        }}
      />
    );
  },
);

BarcodeSearchInput.displayName = 'BarcodeSearchInput';

export default BarcodeSearchInput;

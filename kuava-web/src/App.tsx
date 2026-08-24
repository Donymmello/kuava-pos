import { useEffect, useMemo, useState } from 'react';
import { CssBaseline, PaletteMode } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import { buildTheme } from './theme/theme';
import { ColorModeContext } from './theme/ColorModeContext';
import AppRoutes from './routes/AppRoutes';
import { useOfflineStore } from './store/useOfflineStore';

const STORAGE_KEY = 'kuava:color-mode';

function getInitialMode(): PaletteMode {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function App() {
  const [mode, setMode] = useState<PaletteMode>(getInitialMode);

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        setMode((previous) => {
          const next = previous === 'light' ? 'dark' : 'light';
          window.localStorage.setItem(STORAGE_KEY, next);
          return next;
        });
      },
    }),
    [mode],
  );

  const theme = useMemo(() => buildTheme(mode), [mode]);

  useEffect(() => {
    // Arranca a deteção de online/offline e uma tentativa inicial de
    // sincronizar vendas pendentes — uma única vez, para a app inteira.
    useOfflineStore.getState().init();
  }, []);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

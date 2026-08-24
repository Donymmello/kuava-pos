import { PaletteMode } from '@mui/material';
import { createTheme, ThemeOptions } from '@mui/material/styles';

function getDesignTokens(mode: PaletteMode): ThemeOptions {
  return {
    palette: {
      mode,
      primary: {
        main: '#0F7A5C',
      },
      secondary: {
        main: '#E8A33D',
      },
      error: {
        main: '#D64545',
      },
      background:
        mode === 'light'
          ? { default: '#F4F6F5', paper: '#FFFFFF' }
          : { default: '#0F1512', paper: '#161D19' },
    },
    typography: {
      fontFamily: ['Inter', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  };
}

export function buildTheme(mode: PaletteMode) {
  return createTheme(getDesignTokens(mode));
}

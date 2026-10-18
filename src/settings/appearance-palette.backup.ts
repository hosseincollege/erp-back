/**
 * Approved authenticated-shell appearance backup.
 * Keep this snapshot unchanged unless the user explicitly asks to revise it.
 * The CSS values mirrored from this file live in frontend/src/app/globals.css.
 */
export const ORGANIZATION_ACCENT_COLORS = {
  blue: ['#60a5fa', '#3b82f6'],
  green: ['#4ade80', '#22c55e'],
  red: ['#f87171', '#ef4444'],
  amber: ['#fde047', '#facc15'],
  violet: ['#a78bfa', '#8b5cf6'],
} as const;

type SurfacePalette = {
  background: string;
  foreground: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  surfaceHover: string;
  card: string;
  cardForeground: string;
  mutedForeground: string;
  border: string;
  borderStrong: string;
  input: string;
  sidebar: string;
  sidebarElevated: string;
  sidebarForeground: string;
  sidebarMuted: string;
  sidebarBorder: string;
};

export const APPROVED_SHELL_APPEARANCE_BACKUP = {
  light: {
    soft: {
      background: '#e9edf1', foreground: '#56616e', surface: '#f0f2f5',
      surfaceElevated: '#f4f6f8', surfaceMuted: '#e7ebef', surfaceHover: '#e1e6eb',
      card: '#f2f4f6', cardForeground: '#56616e', mutedForeground: '#6e7986',
      border: '#d8dee5', borderStrong: '#c8d0d9', input: '#d2d9e1',
      sidebar: '#f0f2f5', sidebarElevated: '#f4f6f8', sidebarForeground: '#56616e',
      sidebarMuted: '#6e7986', sidebarBorder: '#d8dee5',
    } satisfies SurfacePalette,
    balanced: {
      background: '#f1f3f5', foreground: '#3f4b5c', surface: '#f8f9fb',
      surfaceElevated: '#f5f6f8', surfaceMuted: '#eceff3', surfaceHover: '#e6eaf0',
      card: '#f8f9fb', cardForeground: '#3f4b5c', mutedForeground: '#687486',
      border: '#dce1e8', borderStrong: '#cbd2dc', input: '#d6dde7',
      sidebar: '#f8f9fb', sidebarElevated: '#f1f3f5', sidebarForeground: '#3f4b5c',
      sidebarMuted: '#687486', sidebarBorder: '#dce1e8',
    } satisfies SurfacePalette,
    strong: {
      background: '#f7f8fa', foreground: '#202a36', surface: '#ffffff',
      surfaceElevated: '#ffffff', surfaceMuted: '#edf0f4', surfaceHover: '#e6eaf0',
      card: '#ffffff', cardForeground: '#202a36', mutedForeground: '#536171',
      border: '#cbd3dd', borderStrong: '#b5c0cd', input: '#c3ccd7',
      sidebar: '#ffffff', sidebarElevated: '#f5f6f8', sidebarForeground: '#263244',
      sidebarMuted: '#536171', sidebarBorder: '#cbd3dd',
    } satisfies SurfacePalette,
  },
  dark: {
    soft: {
      background: '#25292e', foreground: '#c1c6cc', surface: '#2a2f35',
      surfaceElevated: '#30363d', surfaceMuted: '#32383f', surfaceHover: '#3a4149',
      card: '#2a2f35', cardForeground: '#c1c6cc', mutedForeground: '#a6adb5',
      border: '#3e454d', borderStrong: '#4b535d', input: '#3e464f',
      sidebar: '#292e34', sidebarElevated: '#30363d', sidebarForeground: '#c1c6cc',
      sidebarMuted: '#a6adb5', sidebarBorder: '#3e454d',
    } satisfies SurfacePalette,
    balanced: {
      background: '#1b2026', foreground: '#d0d5dc', surface: '#22272e',
      surfaceElevated: '#282e36', surfaceMuted: '#2a3038', surfaceHover: '#333a43',
      card: '#22272e', cardForeground: '#d0d5dc', mutedForeground: '#a5adb7',
      border: '#353c45', borderStrong: '#48515c', input: '#3a424d',
      sidebar: '#20252c', sidebarElevated: '#282e36', sidebarForeground: '#d0d5dc',
      sidebarMuted: '#a5adb7', sidebarBorder: '#353c45',
    } satisfies SurfacePalette,
    strong: {
      background: '#101419', foreground: '#edf0f3', surface: '#171c22',
      surfaceElevated: '#1e242b', surfaceMuted: '#20262e', surfaceHover: '#29313a',
      card: '#171c22', cardForeground: '#edf0f3', mutedForeground: '#b1b8c1',
      border: '#343d47', borderStrong: '#48535f', input: '#303944',
      sidebar: '#171c22', sidebarElevated: '#1e242b', sidebarForeground: '#edf0f3',
      sidebarMuted: '#b1b8c1', sidebarBorder: '#343d47',
    } satisfies SurfacePalette,
  },
  backgroundStyle: {
    lightGray: { soft: '#e9edf1', balanced: '#f1f3f5', strong: '#f7f8fa' },
    darkGray: { soft: '#25292e', balanced: '#1b2026', strong: '#101419' },
    themeAccentMixPercent: { light: 2, dark: 3 },
  },
  gradients: {
    light: {
      soft: 'linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,0) 56%, rgba(82,96,112,.02))',
      balanced: 'linear-gradient(135deg, rgba(255,255,255,.16), rgba(255,255,255,0) 56%, rgba(82,96,112,.025))',
      strong: 'linear-gradient(135deg, rgba(255,255,255,.2), rgba(255,255,255,0) 56%, rgba(82,96,112,.03))',
    },
    dark: {
      soft: 'linear-gradient(135deg, rgba(255,255,255,.02), rgba(255,255,255,0) 56%, rgba(0,0,0,.05))',
      balanced: 'linear-gradient(135deg, rgba(255,255,255,.03), rgba(255,255,255,0) 56%, rgba(0,0,0,.07))',
      strong: 'linear-gradient(135deg, rgba(255,255,255,.04), rgba(255,255,255,0) 56%, rgba(0,0,0,.09))',
    },
    themeAccentOverlay: { light: 2, dark: 3 },
  },
} as const;

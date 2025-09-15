'use client';

interface DarkModeToggleProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export function DarkModeToggle({ darkMode, toggleDarkMode }: DarkModeToggleProps) {
  return (
    <button
      onClick={toggleDarkMode}
      className={`
        p-2 rounded-lg transition-all duration-200
        ${darkMode
          ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400'
          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        }
      `}
      aria-label={`Mudar para modo ${darkMode ? 'claro' : 'escuro'}`}
      title={`Mudar para modo ${darkMode ? 'claro' : 'escuro'}`}
    >
      {darkMode ? '☀️' : '🌙'}
    </button>
  );
}
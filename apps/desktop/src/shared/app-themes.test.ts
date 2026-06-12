import { describe, expect, it } from 'vitest';
import { formatCustomThemeChip, parseCustomThemeChip } from './app-themes';

describe('custom theme chips', () => {
  it('formats and parses a compact color chip', () => {
    const chip = formatCustomThemeChip({
      colors: {
        accent: '#C9895F',
        app: '#171512',
        panel: '#1C1A16',
        paper: '#211F1B',
      },
      name: 'Ink Copy',
    });

    expect(chip).toBe('#171512 #211F1B #1C1A16 #C9895F');

    const theme = parseCustomThemeChip(chip);

    expect(theme?.colors.app).toBe('#171512');
    expect(theme?.colors.paper).toBe('#211F1B');
    expect(theme?.colors.panel).toBe('#1C1A16');
    expect(theme?.colors.accent).toBe('#C9895F');
    expect(theme?.colors.text).toBe('#F0F0ED');
  });

  it('parses four pasted colors in app paper panel accent order', () => {
    const theme = parseCustomThemeChip('#171717 #211f1b #1c1a16 #c9895f');

    expect(theme?.colors.app).toBe('#171717');
    expect(theme?.colors.paper).toBe('#211F1B');
    expect(theme?.colors.panel).toBe('#1C1A16');
    expect(theme?.colors.accent).toBe('#C9895F');
  });

  it('rejects incomplete theme chips', () => {
    expect(parseCustomThemeChip('#171717 #211f1b #1c1a16')).toBeNull();
  });
});

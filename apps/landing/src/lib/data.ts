export const downloadLinks = {
  linuxAppImage: 'https://goyo-api.seokjun.kim/downloads/linux-appimage',
  linuxDeb: 'https://goyo-api.seokjun.kim/downloads/linux-deb',
  mac: 'https://goyo-api.seokjun.kim/downloads/mac',
  releases: 'https://github.com/colus001/goyo/releases/latest',
  windows: 'https://goyo-api.seokjun.kim/downloads/windows',
} as const;

export const roadmap = [
  {
    phase: 'Now',
    title: 'Desktop writing',
    items:
      'Books, chapters, episodes, Quick Drafts, focused mode, local autosave, six themes, custom writing fonts.',
  },
  {
    phase: 'Next',
    title: 'Affordable cloud sync',
    items:
      'Backup, multi-device access, search, settings polish, stronger recovery, export foundations.',
  },
  {
    phase: 'Later',
    title: 'Mobile and browser',
    items:
      'Mobile writing mode, browser web app reusing the same core, realtime collaboration, richer version history.',
  },
];

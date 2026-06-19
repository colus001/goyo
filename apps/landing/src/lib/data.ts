export const downloadLinks = {
  linuxAppImage: 'https://goyo-api.seokjun.kim/downloads/linux-appimage',
  linuxDeb: 'https://goyo-api.seokjun.kim/downloads/linux-deb',
  mac: 'https://goyo-api.seokjun.kim/downloads/mac',
  repository: 'https://github.com/colus001/goyo',
  releases: 'https://github.com/colus001/goyo/releases/latest',
  windows: 'https://goyo-api.seokjun.kim/downloads/windows',
} as const;

export const roadmap = [
  {
    phase: 'Now',
    title: 'Quiet desktop drafting',
    items:
      'Books, chapters, episodes, Quick Drafts, focused mode, local autosave, six themes, and custom writing fonts.',
  },
  {
    phase: 'Next',
    title: 'Safer cloud backup',
    items:
      'Affordable sync, multi-device access, search, settings polish, stronger recovery, and export foundations.',
  },
  {
    phase: 'Later',
    title: 'Writing wherever you are',
    items:
      'Mobile writing mode, browser web app reusing the same core, realtime collaboration, richer version history.',
  },
];

const svg=(body:string)=>`<svg viewBox="0 0 32 32" width="29" height="29" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
export const icons={
  storm:svg('<path d="M9 22H7a5 5 0 0 1-1-10 8 8 0 0 1 15-3 6 6 0 0 1 4 13h-4"/><path d="m17 17-5 8h6l-3 6"/>'),
  sound:svg('<path d="M5 12h5l7-6v20l-7-6H5z"/><path d="M22 11a8 8 0 0 1 0 10m4-14a13 13 0 0 1 0 18"/>'),
  explore:svg('<circle cx="16" cy="16" r="10"/><path d="M16 1v8m0 14v8M1 16h8m14 0h8m-15-5-3 8 8-3-5-5Z"/>'),
};

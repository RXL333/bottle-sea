const svg=(body:string)=>`<svg viewBox="0 0 32 32" width="29" height="29" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
export const icons={
  storm:svg('<path d="M9 22H7a5 5 0 0 1-1-10 8 8 0 0 1 15-3 6 6 0 0 1 4 13h-4"/><path d="m17 17-5 8h6l-3 6"/>'),
  sound:svg('<path d="M5 12h5l7-6v20l-7-6H5z"/><path d="M22 11a8 8 0 0 1 0 10m4-14a13 13 0 0 1 0 18"/>'),
  explore:svg('<circle cx="16" cy="16" r="10"/><path d="M16 1v8m0 14v8M1 16h8m14 0h8m-15-5-3 8 8-3-5-5Z"/>'),
  progression:svg('<path d="M5 5h17a4 4 0 0 1 4 4v18H9a4 4 0 0 1-4-4V5Zm4 0v22M14 11h7m-7 5h7m-7 5h4"/>'),
  collections:svg('<path d="M5 5h17a4 4 0 0 1 4 4v18H9a4 4 0 0 1-4-4V5Zm4 0v22"/><circle cx="18" cy="16" r="6"/><path d="m18 12-3 7 6-3-3-4Z"/>'),
  commissions:svg('<path d="M7 4h18v24H7V4Zm5 6h8m-8 5h8m-9 6 3 3 7-7"/>'),
  inventory:svg('<path d="M6 12h20v16H6V12Zm5 0V8a5 5 0 0 1 10 0v4M6 17h20M11 20h10v4H11Z"/>'),
  food:svg('<path d="M4 20h24L24 27H8L4 20ZM7 17c0-6 18-6 18 0M11 5l-1 3 2 3m5-7-1 3 2 3m5-5-1 3 2 3"/>'),
};

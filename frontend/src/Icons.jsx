// Tiny inline SVG icon set (no extra dependency).
const make = (paths) => ({ size = 20, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {paths}
  </svg>
);

export const I = {
  Circle: make(<circle cx="12" cy="12" r="9" />),
  CheckCircle: make(<><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.8 2.8L16.5 9.5" /></>),
  Check: make(<path d="m5 12.5 4.5 4.5L19 7.5" />),
  Edit: make(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>),
  Trash: make(<><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m6 6 1 14h10l1-14" /><path d="M10 11v5M14 11v5" /></>),
  X: make(<path d="M6 6l12 12M18 6 6 18" />),
  Undo: make(<><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>),
  Plus: make(<path d="M12 5v14M5 12h14" />),
  Menu: make(<path d="M4 6h16M4 12h16M4 18h16" />),
  User: make(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>),
  Logout: make(<><path d="M9 21H5V3h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>),
  History: make(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>),
  Logo: make(<><rect x="4" y="3" width="16" height="18" rx="3" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>),
};

// Next streams the homepage into a hidden sibling of <main> when loading.tsx is
// present. Without React's reveal script it never moves into place. These rules
// expose that already-rendered content, ahead of the footer, only without JS.
// Select by our homepage class, not React's generated segment IDs.
export function NoScriptHome() {
  return <noscript><style>{`
    body:has(.home) { display: flex; flex-direction: column; }
    @layer base { body > div[hidden]:has(> .home) { display: block !important; order: 1; } }
    body:has(.home) > footer, body:has(.home) > .bottom-nav { order: 2; }
    body:has(.home) #main-content > .status-page { display: none; }
    .home .hero-copy > div { opacity: 1 !important; transform: none !important; }
  `}</style></noscript>;
}

# Works wheel

`works-wheel.tsx` exports `WorksWheel` and its TypeScript props. The homepage
uses `demo.tsx` to show nine clothing collections with verified Unsplash image
URLs and existing shop/studio links. Edit `WORKS` there to change the content.

This project already includes React, TypeScript, Tailwind CSS 3, lucide-react,
clsx, and tailwind-merge. No additional packages or context providers are needed.
`components.json` configures the shadcn CLI to use the existing source layout.

The reusable component directory is `src/components/ui`, imported as
`@/components/ui` because `@/*` maps to `src/*` in `tsconfig.json`. Use this
directory rather than a second root-level `components/ui` folder so imports and
future shadcn-generated components resolve consistently. Global styles live in
`src/app/globals.css`; Tailwind configuration lives in `tailwind.config.js`.

```tsx
import { WorksWheel } from "@/components/ui/works-wheel";

<div className="h-[36rem]">
  <WorksWheel
    items={[{ title: "Collection", image: "/collection.jpg", href: "/shop" }]}
    label="Threads '26"
    action="Explore"
  />
</div>
```

Provide a sized parent (the wheel fills its height with a 24rem minimum).
`items` accepts a title, image URL, and optional link. Omit `href` for browse-only
cards; pass `action=""` to hide the link affordance. Section attributes and
`className` are forwarded. State is local to each wheel.

Cards scale with the container through ResizeObserver. Mobile uses a two-column
index and a bottom title to keep text readable. Wheel, vertical drag, index
buttons, ArrowUp/ArrowDown, Home, and End control browsing. Scrolling can leave
the component at its boundaries. Reduced-motion preference disables easing.
Invisible cards cannot receive clicks or keyboard focus, and dragging suppresses
accidental navigation. Images are hosted remotely by Unsplash.

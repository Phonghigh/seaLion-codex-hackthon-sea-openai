import type { SVGProps } from 'react';

/** Original seaPilot mark: three moments connected by one continuous path. */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
    <path d="M7 9h12a6 6 0 0 1 0 12H7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M25 23H13a6 6 0 0 1 0-12h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity=".55" />
    <circle cx="7" cy="9" r="3" fill="#67e8f9" /><circle cx="25" cy="11" r="2.5" fill="currentColor" /><circle cx="7" cy="21" r="2.5" fill="currentColor" />
  </svg>;
}

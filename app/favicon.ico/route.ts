const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect x="2" y="2" width="28" height="28" rx="7" fill="#234395"/>
  <circle cx="16" cy="16" r="7" fill="none" stroke="#00A8E1" stroke-width="2.5"/>
  <circle cx="16" cy="16" r="3" fill="none" stroke="#3BA847" stroke-width="2.5"/>
</svg>`;

export function GET() {
  return new Response(FAVICON_SVG, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/svg+xml",
    },
  });
}

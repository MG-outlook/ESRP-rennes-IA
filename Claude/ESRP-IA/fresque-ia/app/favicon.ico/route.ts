const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#ffffff"/>
  <path d="M6 6h20v20H6z" fill="none" stroke="#2D5A3D" stroke-width="4"/>
  <path d="M10 17l4 4 8-10" fill="none" stroke="#1A1A1A" stroke-width="3" stroke-linecap="square"/>
</svg>`;

export function GET() {
  return new Response(FAVICON_SVG, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/svg+xml",
    },
  });
}

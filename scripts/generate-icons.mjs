// One-off script to rasterize the app icon into the PNG sizes PWA
// manifests / apple-touch-icon / favicons need. `sharp` isn't a project
// dependency (only needed for this one-off script), so install it
// temporarily first:
//   npm install -D sharp && node scripts/generate-icons.mjs && npm uninstall sharp
// Re-run after editing the SVG below to regenerate every size.
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

// Full-bleed square (no baked-in corner rounding) so it works correctly
// both as a maskable icon (OS applies its own shape) and as an
// apple-touch-icon (iOS applies its own rounded corners).
const svg = `
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#8b5cf6"/>
  <circle cx="256" cy="256" r="120" fill="none" stroke="#ffffff" stroke-width="26"/>
  <circle cx="256" cy="256" r="50" fill="#ffffff"/>
</svg>
`.trim()

await mkdir('public/icons', { recursive: true })
await writeFile('public/favicon.svg', svg)

const targets = [
  { file: 'public/icons/icon-192.png', size: 192 },
  { file: 'public/icons/icon-512.png', size: 512 },
  { file: 'public/apple-touch-icon.png', size: 180 },
  { file: 'public/favicon-32.png', size: 32 },
]

for (const { file, size } of targets) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file)
  console.log('wrote', file)
}

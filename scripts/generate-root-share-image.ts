import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { createElement } from 'react'
import satori from 'satori'

const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 630
const OUTPUT_PATH = path.resolve(import.meta.dirname, '..', 'public', 'assets', 'images', 'share-image.png')
const LOGO_PATH = path.resolve(import.meta.dirname, '..', 'src', 'assets', 'logo', 'logo.png')
const FONT_REGULAR = path.resolve(import.meta.dirname, '..', 'public', 'fonts', 'Inter', 'static', 'Inter_18pt-Regular.ttf')
const FONT_BOLD = path.resolve(import.meta.dirname, '..', 'public', 'fonts', 'Inter', 'static', 'Inter_18pt-Bold.ttf')
const FONT_EXTRA_BOLD = path.resolve(import.meta.dirname, '..', 'public', 'fonts', 'Inter', 'static', 'Inter_18pt-ExtraBold.ttf')

const nodeRequire = createRequire(import.meta.url)

async function main() {
  const [regularFont, boldFont, extraBoldFont, logoBuffer] = await Promise.all([
    readFile(FONT_REGULAR),
    readFile(FONT_BOLD),
    readFile(FONT_EXTRA_BOLD),
    readFile(LOGO_PATH),
  ])

  const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`

  const card = createElement(
    'div',
    {
      style: {
        width: `${IMAGE_WIDTH}px`,
        height: `${IMAGE_HEIGHT}px`,
        display: 'flex',
        fontFamily: 'Inter',
        background: 'linear-gradient(140deg, #39d4ff 0%, #2f85ff 34%, #3552f5 60%, #7145ff 80%, #f36ac9 100%)',
        padding: '42px',
      },
    },
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
          borderRadius: 32,
          border: '10px solid #dbe4ee',
          padding: '40px 48px',
          boxShadow: '0 34px 86px rgba(15, 23, 42, 0.22), 0 12px 30px rgba(15, 23, 42, 0.12)',
        },
      },
      createElement('img', {
        src: logoBase64,
        width: 160,
        height: 160,
        style: {
          borderRadius: 32,
          marginBottom: 36,
        },
      }),
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            fontSize: 104,
            color: '#0f172a',
            fontWeight: 800,
            letterSpacing: -3.5,
            lineHeight: 1.0,
            textAlign: 'center',
          },
        },
        'Transparenta.eu',
      ),
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            fontSize: 38,
            color: '#334155',
            fontWeight: 600,
            lineHeight: 1.3,
            marginTop: 24,
            textAlign: 'center',
          },
        },
        'Ușor de înțeles, clar',
      ),
    ),
  )

  const svg = await satori(card, {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    fonts: [
      { name: 'Inter', data: regularFont, weight: 400, style: 'normal' },
      { name: 'Inter', data: boldFont, weight: 700, style: 'normal' },
      { name: 'Inter', data: extraBoldFont, weight: 800, style: 'normal' },
    ],
  })

  const { Resvg } = nodeRequire('@resvg/resvg-js') as { Resvg: new (svg: string, options?: { fitTo?: { mode: 'width'; value: number } }) => { render(): { asPng(): Uint8Array } } }
  const renderedPng = new Resvg(svg, {
    fitTo: { mode: 'width', value: IMAGE_WIDTH },
  }).render()

  const pngBuffer = Buffer.from(renderedPng.asPng())
  await writeFile(OUTPUT_PATH, pngBuffer)

  console.log(`Share image generated: ${OUTPUT_PATH} (${pngBuffer.length} bytes, ${IMAGE_WIDTH}x${IMAGE_HEIGHT})`)
}

main().catch((error) => {
  console.error('Failed to generate share image:', error)
  process.exit(1)
})

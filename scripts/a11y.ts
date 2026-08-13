/**
 * Auditoría de accesibilidad (axe-core) sobre la app servida.
 * Levanta el preview de Vite, abre la página y audita el estado inicial
 * y tras calcular los resultados.
 *
 * Uso: pnpm a11y
 */
import { chromium } from 'playwright-core'
import AxeBuilder from '@axe-core/playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

const PORT = 4173
const URL = `http://127.0.0.1:${PORT}/`

async function waitForServer(url: string, tries = 40): Promise<void> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url)
      if (r.ok) return
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('El servidor preview no arrancó')
}

async function main() {
  const server = spawn(
    'pnpm',
    ['preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { stdio: 'ignore', detached: false },
  )

  try {
    await waitForServer(URL)
    const browser = await chromium.launch({
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    })
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()
    await page.goto(URL, { waitUntil: 'networkidle' })

    const run = async (label: string) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
      console.log(`\n## ${label}`)
      if (results.violations.length === 0) {
        console.log('  ✓ Sin violaciones')
      }
      for (const v of results.violations) {
        console.log(`  ✗ [${v.impact}] ${v.id}: ${v.help}`)
        for (const n of v.nodes.slice(0, 3)) {
          console.log(`      - ${n.html.slice(0, 140)}`)
        }
      }
      return results.violations
    }

    const violations: Awaited<ReturnType<typeof run>> = []
    violations.push(...(await run('Estado inicial')))

    // espera a que el auto-cálculo muestre las tablas
    await page.waitForSelector('table thead', { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(800)
    violations.push(...(await run('Con resultados (tabla Saros)')))

    // abre el desplegable de países y audita el combobox
    await page.locator('#country-input').click()
    await page.waitForTimeout(200)
    violations.push(...(await run('Combobox de países abierto')))
    await page.keyboard.press('Escape')

    // pestaña Besseliana
    await page.locator('#tab-besselian').click()
    await page.waitForTimeout(400)
    violations.push(...(await run('Pestaña Besselianos')))

    await browser.close()

    const total = violations.length
    console.log(`\nTOTAL VIOLACIONES: ${total}`)
    if (total > 0) {
      mkdirSync('/tmp/opencode', { recursive: true })
      writeFileSync('/tmp/opencode/a11y-report.json', JSON.stringify(violations, null, 2))
      console.log('Informe: /tmp/opencode/a11y-report.json')
      process.exit(1)
    }
  } finally {
    server.kill('SIGTERM')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

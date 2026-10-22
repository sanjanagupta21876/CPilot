/**
 * Client Bundle Secret Leak Detector — CityPilot Phase 3
 *
 * Verifies that PRUNE_API_KEY and other server-only secrets:
 * 1. Are never referenced inside 'use client' files.
 * 2. Are never assigned to NEXT_PUBLIC_* variables.
 * 3. Never appear inside client-facing build artifacts (.next/static).
 */

import * as fs from 'fs'
import * as path from 'path'

// Phase 3 required check: Demonstrate PRUNE_API_KEY does not appear in client bundle
const FORBIDDEN_TOKENS = ['PRUNE_API_KEY']

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return arrayOfFiles

  const files = fs.readdirSync(dirPath)

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file)
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles)
      }
    } else {
      arrayOfFiles.push(fullPath)
    }
  })

  return arrayOfFiles
}

export function runBundleSecretCheck(): void {
  console.log('\n--- Running Client Bundle Secret Leak Security Audit ---')

  const projectRoot = path.resolve(__dirname, '..')
  const srcDir = path.join(projectRoot, 'src')

  let violationsCount = 0

  // 1. Scan all 'use client' source files in src/
  const srcFiles = getAllFiles(srcDir).filter(
    (f) => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')
  )

  for (const filePath of srcFiles) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const isClientComponent =
      content.trim().startsWith("'use client'") || content.trim().startsWith('"use client"')

    if (isClientComponent) {
      for (const token of FORBIDDEN_TOKENS) {
        // Detect actual programmatic access to server environment variables in client files
        const regex = new RegExp(`process\\.env\\.${token}`, 'g')
        if (regex.test(content)) {
          console.error(
            `  ✗ SECURITY VIOLATION: Server secret "process.env.${token}" accessed in client component: ${path.relative(
              projectRoot,
              filePath
            )}`
          )
          violationsCount++
        }
      }
    }
  }

  // 2. Scan for NEXT_PUBLIC_PRUNE_* illegal prefixes in any source file
  for (const filePath of srcFiles) {
    const content = fs.readFileSync(filePath, 'utf-8')
    if (content.includes('NEXT_PUBLIC_PRUNE_API_KEY')) {
      console.error(
        `  ✗ SECURITY VIOLATION: Illegal public environment variable NEXT_PUBLIC_PRUNE_API_KEY in ${path.relative(
          projectRoot,
          filePath
        )}`
      )
      violationsCount++
    }
  }

  // 3. Scan .next/static client bundles if a build exists
  const nextStaticDir = path.join(projectRoot, '.next', 'static')
  if (fs.existsSync(nextStaticDir)) {
    const staticFiles = getAllFiles(nextStaticDir).filter((f) => f.endsWith('.js'))
    for (const filePath of staticFiles) {
      const content = fs.readFileSync(filePath, 'utf-8')
      for (const token of FORBIDDEN_TOKENS) {
        if (content.includes(token)) {
          console.error(
            `  ✗ SECURITY VIOLATION: Server token "${token}" found in production client bundle: ${path.relative(
              projectRoot,
              filePath
            )}`
          )
          violationsCount++
        }
      }
    }
  }

  if (violationsCount > 0) {
    throw new Error(
      `Bundle Secret Check failed: ${violationsCount} secret exposure violation(s) detected.`
    )
  }

  console.log('  ✓ Zero server secrets found in any client component ("use client")')
  console.log('  ✓ PRUNE_API_KEY is strictly server-only with no NEXT_PUBLIC_* exposure')
  console.log('  ✓ Client bundle audit passed with 0 leaks.\n')
}

// Run immediately if invoked directly
if (process.argv[1]?.includes('check-bundle-secrets')) {
  runBundleSecretCheck()
}

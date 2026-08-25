import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const workspaceRoot = fileURLToPath(new URL('../../../../..', import.meta.url))
const destinationDir = path.join(process.cwd(), 'coverage/merged-blob')
const workspaceGroups = [
  { directory: 'apps' },
  { directory: 'packages', names: ['core'] },
  { directory: 'packages/adapters' },
]

async function mergeBlobReports() {
  await fs.rm(destinationDir, { recursive: true, force: true })
  await fs.mkdir(destinationDir, { recursive: true })

  const copiedReports: string[] = []

  for (const group of workspaceGroups) {
    const groupPath = path.join(workspaceRoot, group.directory)
    const packageNames = group.names ?? (await fs.readdir(groupPath))

    for (const packageName of packageNames) {
      const blobDir = path.join(groupPath, packageName, 'coverage/blob')

      let blobFiles: string[]

      try {
        blobFiles = await fs.readdir(blobDir)
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          (error.code === 'ENOENT' || error.code === 'ENOTDIR')
        ) {
          continue
        }

        throw error
      }

      for (const blobFile of blobFiles) {
        if (!blobFile.endsWith('.json')) continue

        const source = path.join(blobDir, blobFile)
        const destination = path.join(
          destinationDir,
          `${group.directory.replace('/', '-')}-${packageName}-${blobFile}`,
        )

        await fs.copyFile(source, destination)
        copiedReports.push(path.relative(workspaceRoot, source))
      }
    }
  }

  if (copiedReports.length === 0) {
    throw new Error('No Vitest blob reports found. Run `pnpm test` first.')
  }

  console.log(`Collected ${copiedReports.length} Vitest blob report(s).`)
}

mergeBlobReports().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})

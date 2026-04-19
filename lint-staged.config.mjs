import path from 'node:path'

const apiRoot = path.join(process.cwd(), 'apps/api')
const webRoot = path.join(process.cwd(), 'apps/web')

function eslintFixInWorkspace(workspaceRoot, filenames) {
  if (filenames.length === 0) {
    return []
  }
  const rel = filenames.map((f) => path.relative(workspaceRoot, path.resolve(f)))
  const quoted = rel.map((x) => JSON.stringify(x)).join(' ')
  const subdir = path.relative(process.cwd(), workspaceRoot)
  return `cd ${JSON.stringify(subdir)} && npx eslint --fix --max-warnings=0 ${quoted}`
}

export default {
  'apps/api/**/*.{js,ts}': (filenames) => eslintFixInWorkspace(apiRoot, filenames),
  'apps/web/**/*.{js,jsx,ts,tsx}': (filenames) => eslintFixInWorkspace(webRoot, filenames),
}

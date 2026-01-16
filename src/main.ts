import './style.css'
import { packTar } from 'modern-tar'

const fileInput = document.querySelector<HTMLInputElement>('#file-input')!
const fileList = document.querySelector<HTMLPreElement>('#file-list')!

fileInput.addEventListener('change', async () => {
  // Check selected files
  const files = [...(fileInput.files ?? [])]
  if (files.length === 0) {
    fileList.textContent = 'No files selected'
    return
  }
  fileList.textContent = `${files.length} file(s) selected:\n` + files.map(f => `- ${f.name} (${formatSize(f.size)})\n`).join('')

  // Create tarball
  const tar = await packTar(await Promise.all(files.map(async f => ({
    header: { name: f.name, size: f.size },
    body: await f.bytes(),
  }))))

  // Download tarball
  const blob = new Blob([tar as Uint8Array<ArrayBuffer>], { type: 'application/x-tar' })
  // SAFETY: Uint8Array<SharedArrayBuffer> can be passed to Blob constructor
  fileList.textContent += 'Tarball creation finished.\n'

  // Download blob
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'output.tar'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  await sleep_ms(1000) // Wait a bit before revoking
  URL.revokeObjectURL(link.href)
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GiB`
}

function sleep_ms(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

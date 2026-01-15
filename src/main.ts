import './style.css'

const fileInput = document.querySelector<HTMLInputElement>('#file-input')!
const fileList = document.querySelector<HTMLPreElement>('#file-list')!

fileInput.addEventListener('change', async () => {
  const files = fileInput.files
  if (!files || files.length === 0) {
    fileList.textContent = 'No files selected'
    return
  }
  const fileInfo = [...files].map(f => `${f.name} (${formatSize(f.size)})`).join('\n')
  fileList.textContent = `${files.length} file(s) selected:\n${fileInfo}`

  for (const file of files) {
    const bytes = await file.bytes()
    console.log(file.name, bytes)
  }

  // TODO: Create tarball
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GiB`
}

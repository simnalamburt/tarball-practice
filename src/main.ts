import './style.css'
import { createTarPacker, createGzipEncoder } from 'modern-tar'

const fileInput = document.querySelector<HTMLInputElement>('#file-input')!
const fileList = document.querySelector<HTMLPreElement>('#file-list')!

fileInput.addEventListener('change', async () => {
  // Check selected files
  const files = [...(fileInput.files ?? [])]
  if (files.length === 0) {
    fileList.textContent = 'No files selected'
    return
  }
  fileList.textContent = `${files.length} file(s) selected:\n`

  // Create streams
  const { readable, controller } = createTarPacker()
  const gzip = createGzipEncoder()

  // Connect streams, setup a sink
  const blobPromise = new Response(readable.pipeThrough(gzip)).blob()

  // Start streaming, push inputs
  for (const file of files) {
    await file.stream().pipeTo(controller.add({ name: file.name, size: file.size, type: 'file' }))
    fileList.textContent += `- ${file.name} (${formatSize(file.size)})\n`
  }
  controller.finalize()

  // Wait for completion
  const blob = await blobPromise
  fileList.textContent += 'Tarball creation finished.\n'

  // Download tarball
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'output.tar.gz'
  link.click()
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

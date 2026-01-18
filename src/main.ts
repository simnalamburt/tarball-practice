import './style.css'
import { createTarPacker, createGzipEncoder } from 'modern-tar'

const fileInput = document.querySelector<HTMLInputElement>('#file-input')!
const output = document.querySelector<HTMLPreElement>('#output')!

fileInput.addEventListener('change', async () => {
  // Check selected files
  const files = [...(fileInput.files ?? [])]
  if (files.length === 0) {
    output.textContent = 'No files selected'
    return
  }

  // Calculate total size for overall progress
  const totalSize = files.reduce((acc, file) => acc + file.size, 0)
  let totalProcessed = 0

  // Create streams
  const { readable, controller } = createTarPacker()
  const gzip = createGzipEncoder()

  // Connect streams, setup a sink
  const blobPromise = new Response(readable.pipeThrough(gzip)).blob()

  // Start streaming, push inputs
  let lastUpdate = 0
  for (const [i, file] of files.entries()) {
    let fileProcessed = 0

    // Create a progress tracking transform stream
    const progressStream = new TransformStream<Uint8Array, Uint8Array>({
      async transform(chunk, controller) {
        fileProcessed += chunk.byteLength
        totalProcessed += chunk.byteLength

        // Yield periodically to allow rendering (≤60fps)
        const now = Date.now()
        if (now - lastUpdate >= 1000 / 60) {
          lastUpdate = now
          output.textContent = formatProgress(files, totalSize, totalProcessed, i, fileProcessed)
          await yield_until_idle()
        }

        controller.enqueue(chunk)
      }
    })

    await file.stream().pipeThrough(progressStream).pipeTo(
      controller.add({ name: file.name, size: file.size, type: 'file' })
    )
  }
  controller.finalize()

  // Wait for completion
  const blob = await blobPromise

  // Show final result
  output.textContent = formatProgress(files, totalSize, totalSize, files.length, 0) + `\nTarball creation finished. (${formatSize(blob.size)})\n`

  // Download tarball
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'output.tar.gz'
  link.click()
  await sleep_ms(1000) // Wait a bit before revoking
  URL.revokeObjectURL(link.href)
})

function formatProgress(
  files: File[],
  totalSize: number,
  totalProcessed: number,
  currentIndex: number,
  fileProcessed: number,
): string {
  const formatPercent = (numerator: number, denominator: number): string =>
    denominator === 0 ? '100.0' : (numerator / denominator * 100).toFixed(1)
  return `${files.length} file(s) selected:\n` +
    files.map((file, i) =>
      i < currentIndex ? `- ✅ ${file.name} (${formatSize(file.size)})\n` :
      i === currentIndex ? `- ⏳ ${file.name} (${formatSize(file.size)}) ${formatPercent(fileProcessed, file.size)}%\n` :
      `- ⬜ ${file.name} (${formatSize(file.size)})\n`
    ).join('') + `\nTotal progress: ${formatPercent(totalProcessed, totalSize)}%`
}

function formatSize(bytes: number): string {
  return (
    bytes < 1024 ? `${bytes} B` :
    bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KiB` :
    bytes < 1024 * 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MiB` :
    `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GiB`
  )
}

function yield_until_idle() {
  return new Promise(resolve => requestIdleCallback(resolve))
}

function sleep_ms(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

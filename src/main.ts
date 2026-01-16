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

  // Calculate total size for overall progress
  const totalSize = files.reduce((acc, file) => acc + file.size, 0)
  let processedSize = 0

  // Create streams
  const { readable, controller } = createTarPacker()
  const gzip = createGzipEncoder()

  // Connect streams, setup a sink
  const blobPromise = new Response(readable.pipeThrough(gzip)).blob()

  // Start streaming, push inputs
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    let fileProcessed = 0

    // Create a progress tracking transform stream
    const progressStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        fileProcessed += chunk.byteLength
        processedSize += chunk.byteLength

        // Update progress display
        const fileProgress = file.size > 0 ? (fileProcessed / file.size * 100).toFixed(1) : '100'
        const totalProgress = totalSize > 0 ? (processedSize / totalSize * 100).toFixed(1) : '100'
        updateProgress(files, i, fileProgress, totalProgress)

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
  fileList.textContent = `${files.length} file(s) selected:\n`
  for (const file of files) {
    fileList.textContent += `- ${file.name} (${formatSize(file.size)}) ✓\n`
  }
  fileList.textContent += `\nTarball creation finished. (${formatSize(blob.size)})\n`

  // Download tarball
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'output.tar.gz'
  link.click()
  await sleep_ms(1000) // Wait a bit before revoking
  URL.revokeObjectURL(link.href)
})

function updateProgress(files: File[], currentIndex: number, fileProgress: string, totalProgress: string) {
  let text = `${files.length} file(s) selected:\n`
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (i < currentIndex) {
      text += `- ${file.name} (${formatSize(file.size)}) ✓\n`
    } else if (i === currentIndex) {
      text += `- ${file.name} (${formatSize(file.size)}) ${fileProgress}%\n`
    } else {
      text += `- ${file.name} (${formatSize(file.size)})\n`
    }
  }
  text += `\nTotal progress: ${totalProgress}%`
  fileList.textContent = text
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GiB`
}

function sleep_ms(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

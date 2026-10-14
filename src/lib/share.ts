import { toBlob } from 'html-to-image'

/** Genera un PNG del nodo y lo comparte (móvil) o lo descarga (escritorio) */
export async function exportShareImage(
  node: HTMLElement,
  filename: string,
): Promise<'shared' | 'downloaded'> {
  await document.fonts.ready
  await Promise.all(
    [...node.querySelectorAll('img')].map((img) => (img.complete ? null : img.decode().catch(() => null))),
  )
  const blob = await toBlob(node, { pixelRatio: 1, width: 1080, height: 1350, cacheBust: true })
  if (!blob) throw new Error('No se pudo generar la imagen')
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'WEFA Champions NICS' })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'shared'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}

export function resizeImage(file: File, size: number, type = 'image/jpeg', square = true): Promise<string> {
  return new Promise((ok, no) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const c = document.createElement('canvas')
      let sx = 0, sy = 0, sw = img.width, sh = img.height
      if (square) {
        const m = Math.min(sw, sh)
        sx = (sw - m) / 2; sy = (sh - m) / 2; sw = sh = m
        c.width = c.height = size
      } else {
        const r = Math.min(1, size / img.width)
        c.width = img.width * r; c.height = img.height * r
      }
      c.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      ok(c.toDataURL(type, 0.85))
    }
    img.onerror = no
    img.src = url
  })
}

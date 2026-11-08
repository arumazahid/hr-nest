'use client'
import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { startCam, stopCam, loadFace, detectFace } from '@/lib/camera'

export default function Scanner({ mode, emps, onHit, autoStart }: { mode: string; emps: any[]; onHit: (e: any) => void; autoStart?: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<any>(null)
  const timer = useRef<any>(null)
  const starting = useRef(false)
  const empsRef = useRef(emps)
  const hit = useRef(onHit)
  empsRef.current = emps
  hit.current = onHit
  const [on, setOn] = useState(false)
  const [msg, setMsg] = useState('')

  function stop() {
    clearInterval(timer.current)
    stopCam(stream.current)
    starting.current = false
    setOn(false)
  }

  async function start() {
    if (starting.current) return
    starting.current = true
    setMsg('')
    try {
      stream.current = await startCam(video.current as HTMLVideoElement)
    } catch {
      starting.current = false
      return setMsg('Camera access was blocked. Allow the camera in your browser and try again.')
    }
    setOn(true)
    if (mode === 'qr') {
      const canvas = document.createElement('canvas')
      timer.current = setInterval(() => {
        const v = video.current as HTMLVideoElement
        if (!v || !v.videoWidth) return
        canvas.width = v.videoWidth; canvas.height = v.videoHeight
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
        ctx.drawImage(v, 0, 0)
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(img.data, img.width, img.height)
        const emp = code && empsRef.current.find(e => e.qr_token === code.data)
        if (emp) hit.current(emp)
      }, 500)
    } else {
      setMsg('Loading face models...')
      const face = await loadFace()
      const enrolled = empsRef.current.filter(e => e.face_descriptor)
      if (!enrolled.length) { setMsg('No faces enrolled yet. Enroll faces in the Employees page.'); return stop() }
      const matcher = new face.FaceMatcher(enrolled.map(e => new face.LabeledFaceDescriptors(e.id, [new Float32Array(e.face_descriptor)])), 0.5)
      setMsg('')
      timer.current = setInterval(async () => {
        const det = await detectFace(face, video.current as HTMLVideoElement)
        if (!det) return
        const emp = empsRef.current.find(e => e.id === matcher.findBestMatch(det.descriptor).label)
        if (emp) hit.current(emp)
      }, 1200)
    }
  }

  useEffect(() => { if (autoStart && emps.length && !on) start() }, [emps.length])
  useEffect(() => stop, [])

  return (
    <div>
      <video ref={video} playsInline muted style={{ display: on ? 'block' : 'none' }} />
      {!autoStart && (on ? <button className="btn" onClick={stop}>Stop camera</button> : <button className="btn" onClick={start}>Start camera</button>)}
      {msg && <div className="err">{msg}</div>}
    </div>
  )
}

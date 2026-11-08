const FACE_JS = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.js'
const MODELS = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/'

export async function startCam(video: HTMLVideoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
  video.srcObject = stream
  await video.play()
  return stream
}

export const stopCam = (stream: any) => stream?.getTracks().forEach((t: any) => t.stop())

export async function loadFace() {
  const w: any = window
  if (!w.faceapi) {
    await new Promise((ok, no) => {
      const s = document.createElement('script')
      s.src = FACE_JS; s.onload = ok; s.onerror = no
      document.body.appendChild(s)
    })
  }
  const f = w.faceapi
  if (!f.nets.tinyFaceDetector.params) {
    await Promise.all([
      f.nets.tinyFaceDetector.loadFromUri(MODELS),
      f.nets.faceLandmark68Net.loadFromUri(MODELS),
      f.nets.faceRecognitionNet.loadFromUri(MODELS)
    ])
  }
  return f
}

export const detectFace = (f: any, video: HTMLVideoElement) =>
  f.detectSingleFace(video, new f.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor()

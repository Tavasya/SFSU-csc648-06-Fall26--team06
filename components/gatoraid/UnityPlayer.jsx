import { useEffect, useRef } from 'react'

export default function UnityPlayer() {
  const canvasRef = useRef(null)

  useEffect(() => {
    let instance = null
    let cancelled = false

    const script = document.createElement('script')
    script.src = '/unity/Build/build.loader.js'
    script.async = true

    script.onload = async () => {
      if (cancelled) return
      try {
        const created = await window.createUnityInstance(canvasRef.current, {
          dataUrl: '/unity/Build/build.data',
          frameworkUrl: '/unity/Build/build.framework.js',
          codeUrl: '/unity/Build/build.wasm',
          streamingAssetsUrl: '/unity/StreamingAssets',
          companyName: 'Gatoraid',
          productName: '3D Room Viewer',
          productVersion: '1.0',
        })
        if (cancelled) {
          await created.Quit() // unmounted while loading
          return
        }
        instance = created
        window.unityInstance = instance // Expose the instance for debugging
      } catch (err) {
        console.error('Unity failed to load:', err)
      }
    }

    script.onerror = () => console.error('Failed to load Unity loader script')

    document.body.appendChild(script)

    return () => {
      cancelled = true
      document.body.removeChild(script)
      if (instance) {
        instance.Quit().catch(console.error)
        instance = null
      }
    }
  }, [])

  return (
    <canvas
      id="unity-canvas"
      ref={canvasRef}
      style={{ width: '100%', aspectRatio: '1 / 1', display: 'block' }}
    />
  )
}
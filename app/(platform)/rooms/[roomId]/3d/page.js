"use client";

import { useEffect, useRef, useState } from 'react';

export default function Page() {

    const canvasRef = useRef(null)
    const unityInstanceRef = useRef(null)
    const [windowLocation, setWindowLocation] = useState("");
    
    // Load Unity WebGL build
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
        unityInstanceRef.current = instance
        setWindowLocation(window.location.origin);
        created?.SendMessage("GLTF Importer", "SetBaseAPIUrl", windowLocation);
        created?.SendMessage("GLTF Importer", "ImportScan", String(1));
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

    // UnityPlayer component
    const UnityPlayer = () => (
        <canvas
            id="unity-canvas"
            ref={canvasRef}
            style={{ width: '100%', aspectRatio: '1 / 1', display: 'block' }}
        />
    );

    useEffect(() => {
    }, [])

    console.log("API would be ", windowLocation)
    // send message to Unity

    const UpdateAPI = () => {
        if (unityInstanceRef.current) {
            unityInstanceRef.current.SendMessage("GLTF Importer", "SetBaseAPIUrl", windowLocation);
            // unityInstanceRef.current.SendMessage("GLTF Importer", "ImportScan", String(1));
        }
    }

    const ReloadSceneImport = () => {
        if (unityInstanceRef.current) {
            unityInstanceRef.current.SendMessage("GLTF Importer", "ImportScan", String(1));
        }
    }

    return (
        <>
            <div style={{ width: '100%', height: '100%', backgroundColor: 'black', aspectRatio: '1/1' }}>
                {UnityPlayer()}
            </div>
            <button onClick={UpdateAPI} style={{ marginTop: '10px' }}>Update API URL</button>
            <button onClick={ReloadSceneImport} style={{ marginTop: '10px', marginLeft: '10px' }}>Reload Scene Import</button>
        </>
    );
}
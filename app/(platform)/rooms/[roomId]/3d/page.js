"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

export default function Page() {

    const canvasRef = useRef(null)
    const unityInstanceRef = useRef(null)
    const [roomInfo, setRoomInfo] = useState(null);

    const params = useParams();
    console.log("params are ", params);

    // Load Room Info
    useEffect(() => {
        const fetchRoomInfo = async () => {
            try {
                const response = await fetch(`/api/rooms/${params.roomId}/info`);
                const data = await response.json();
                if (response.ok) {
                    setRoomInfo(data);
                } else {
                    console.error('Failed to fetch room info:', data.error);
                }
            } catch (error) {
                console.error('Error fetching room info:', error);
            }
        };

        fetchRoomInfo();
    }, [params.roomId]);
    console.log("roomInfo is ", roomInfo);

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
                    // left the page while loading (reload discards module)
                    window.location.reload()
                    return
                }
                instance = created
                unityInstanceRef.current = created

                created.SendMessage("GLTF Importer", "ImportScan", JSON.stringify({
                    baseAPIUrl: window.location.origin,
                    scanId: params.roomId,
                }))
                
            } catch (err) {
                console.error('Unity failed to load:', err)
            }
        }

        script.onerror = () => console.error('Failed to load Unity loader script')
        document.body.appendChild(script)

        return () => {
            cancelled = true
            if (document.pointerLockElement) document.exitPointerLock()
            if (script.parentNode) script.parentNode.removeChild(script)

            if (instance) {
                instance = null
                window.location.reload()   // hard-load whatever page we navigated to
            }
        }
    }, [params.roomId])

    // UnityPlayer component
    const UnityPlayer = () => (
        <canvas
            id="unity-canvas"
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block', borderRadius: '20px' }}
        />
    );

    return (
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
            <h1>{roomInfo?.room_name || "Room"}</h1>
            <p>3D scan · one featured room per building · scanned {roomInfo?.scan_date || "N/A"}</p>
            <div style={{ width: '80%', height: '60%', backgroundColor: 'black', aspectRatio: '3/2', borderRadius: '20px' }}>
                {UnityPlayer()}
            </div>
        </main>
    );
}
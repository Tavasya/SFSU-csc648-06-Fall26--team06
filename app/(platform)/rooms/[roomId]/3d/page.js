"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

const testRSVP = {
  "rsvps": [
    {
      "id": "1",
      "username": "alice",
      "profilePictureUrl": "https://example.com/alice.png"
    },
    {
      "id": "2",
      "username": "bob",
      "profilePictureUrl": "https://example.com/bob.png"
    },
    {
      "id": "3",
      "username": "charlie",
      "profilePictureUrl": "https://example.com/charlie.png"
    },
    {
      "id": "4",
      "username": "diana",
      "profilePictureUrl": "https://example.com/diana.png"
    },
    {
      "id": "5",
      "username": "eve",
      "profilePictureUrl": "https://example.com/eve.png"
    }
  ]
}

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


    // Exposed function to be called by Unity
    window.openUserProfile = function(userId) {
        console.log("Browser received id: ", userId);

        // TODO: Implement navigation to the user's profile page
    }


    // Sends RSVP data to Unity
    function SendRSVPToUnity(RSVPS) {
        if (!unityInstanceRef.current) {
            console.error('Unity instance is not ready yet')
            return;
        }

        const rsvpData = JSON.stringify(RSVPS);
        unityInstanceRef.current.SendMessage("RSVP Spawner", "SpawnRSVPs", rsvpData);
    }

    return (
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
            <h1>{roomInfo?.room_name || "Room"}</h1>
            <p>3D scan · One featured room per building · Scanned {roomInfo?.scan_date || "N/A"}</p>
            <p>Use the W, A, S, and D keys to navigate the room</p>
            <div style={{ width: '80%', height: '60%', backgroundColor: 'black', aspectRatio: '3/2', borderRadius: '20px' }}>
                {UnityPlayer()}
            </div>
            <button onClick={() => SendRSVPToUnity(testRSVP)} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px', borderRadius: '5px', backgroundColor: '#604398', color: 'white', border: 'none', cursor: 'pointer' }}>
                Send RSVP Data to Unity
            </button>
        </main>
    );
}
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Render a small self-contained avatar; dispose GPU resources when colors change.
export default function AvatarPreview({ skin, hair, shirt }) {
  const container = useRef(null);
  useEffect(() => {
    const node = container.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 1.2, 5.5);
    camera.lookAt(0, 1.1, 0);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch {
      // Color selection remains usable on browsers without WebGL.
      node.textContent = "3D preview unavailable";
      return () => { node.textContent = ""; };
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(200, 200);
    node.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x827298, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(3, 5, 4); scene.add(light);
    const materials = [skin, hair, shirt].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    const geometries = [];
    function part(geometry, material, x, y, z) {
      geometries.push(geometry);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z); scene.add(mesh); return mesh;
    }
    part(new THREE.SphereGeometry(0.46, 32, 24), materials[0], 0, 1.65, 0);
    // One fixed cap keeps hair color customizable without a hairstyle picker.
    part(new THREE.SphereGeometry(0.47, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.43), materials[1], 0, 1.72, 0);
    part(new THREE.CapsuleGeometry(0.48, 0.6, 8, 24), materials[2], 0, 0.65, 0);
    renderer.render(scene, camera);
    return () => {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose(); node.removeChild(renderer.domElement);
    };
  }, [skin, hair, shirt]);
  return <div className="avatar-preview" ref={container} role="img" aria-label="3D avatar color preview" />;
}

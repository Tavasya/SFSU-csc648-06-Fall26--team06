"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Render a small self-contained avatar; dispose GPU resources when colors change.
export default function AvatarPreview({ skin, hair, shirt, presentation = "Androgynous" }) {
  const container = useRef(null);
  useEffect(() => {
    const node = container.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 1.25, 7.5);
    camera.lookAt(0, 1.15, 0);
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch {
      // Color selection remains usable on browsers without WebGL.
      node.textContent = "3D preview unavailable";
      return () => { node.textContent = ""; };
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(280, 320);
    camera.aspect = 280 / 320;
    camera.updateProjectionMatrix();
    node.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";
    scene.add(new THREE.HemisphereLight(0xffffff, 0x827298, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(3, 5, 4); scene.add(light);
    const materials = [skin, hair, shirt].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    const geometries = [];
    const figure = new THREE.Group();
    scene.add(figure);
    function part(geometry, material, x, y, z) {
      geometries.push(geometry);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z); figure.add(mesh); return mesh;
    }
    part(new THREE.SphereGeometry(0.36, 32, 24), materials[0], 0, 2.15, 0);
    // One fixed cap keeps hair color customizable without a hairstyle picker.
    part(new THREE.SphereGeometry(0.37, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.43), materials[1], 0, 2.19, 0);
    const torso = part(new THREE.CapsuleGeometry(0.39, 0.46, 8, 24), materials[2], 0, 1.29, 0);
    torso.scale.x = presentation === "Masculine" ? 1.12 : presentation === "Feminine" ? 0.9 : 1;
    for (const side of [-1, 1]) {
      const arm = part(new THREE.CapsuleGeometry(0.11, 0.62, 6, 12), materials[2], side * 0.47, 1.32, 0);
      arm.rotation.z = side * 0.13;
      part(new THREE.SphereGeometry(0.12, 16, 12), materials[0], side * 0.53, 0.91, 0);
      part(new THREE.CapsuleGeometry(0.14, 0.56, 6, 12), materials[2], side * 0.19, 0.43, 0);
    }
    const render = () => renderer.render(scene, camera);
    let dragX = null;
    const down = (event) => { dragX = event.clientX; renderer.domElement.setPointerCapture(event.pointerId); };
    const move = (event) => { if (dragX === null) return; figure.rotation.y += (event.clientX - dragX) * 0.01; dragX = event.clientX; render(); };
    const up = () => { dragX = null; };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    render();
    return () => {
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose(); node.removeChild(renderer.domElement);
    };
  }, [skin, hair, shirt, presentation]);
  return <div className="avatar-preview" ref={container} role="img" aria-label="3D avatar color preview" />;
}

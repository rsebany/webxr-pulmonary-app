// frontend/src/components/WebXRViewer.jsx
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const WebXRViewer = ({ patientData, dicomVolume, predictions }) => {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const volumeMeshRef = useRef(null);
    const lungsMeshRef = useRef(null);
    const fvcGraphRef = useRef(null);
    const vrButtonRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        // Configuration de la scène Three.js
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a0a);
        
        const camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        camera.position.set(0, 5, 25);
        
        const renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.xr.enabled = true;
        mountRef.current.appendChild(renderer.domElement);
        
        // Contrôles de caméra (désactivés en VR)
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 2;
        controls.maxDistance = 100;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.enableRotate = true;
        controls.target.set(0, 0, 0);
        
        // Bouton VR
        const vrButton = VRButton.createButton(renderer);
        vrButton.style.position = 'absolute';
        vrButton.style.bottom = '20px';
        vrButton.style.right = '20px';
        document.body.appendChild(vrButton);
        vrButtonRef.current = vrButton;
        
        // Gestion du mode VR
        renderer.xr.addEventListener('sessionstart', () => {
            controls.enabled = false;
        });
        
        renderer.xr.addEventListener('sessionend', () => {
            controls.enabled = true;
        });
        
        // Lumière améliorée pour le modèle 3D
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 10);
        scene.add(directionalLight);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight2.position.set(-10, -5, -10);
        scene.add(directionalLight2);
        
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(0, 10, 0);
        scene.add(pointLight);
        
        // Grille de référence
        const gridHelper = new THREE.GridHelper(20, 20, 0x333333, 0x222222);
        scene.add(gridHelper);
        
        // Axes helper
        const axesHelper = new THREE.AxesHelper(5);
        scene.add(axesHelper);
        
        // Charger le modèle 3D des poumons
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(
            '/threejs-components/realistic_human_lungs.glb',
            (gltf) => {
                const lungs = gltf.scene;
                
                // Calculer la bounding box pour centrer et redimensionner
                const box = new THREE.Box3().setFromObject(lungs);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 12 / maxDim; // Grande taille
                
                lungs.scale.set(scale, scale, scale);
                lungs.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
                
                scene.add(lungs);
                lungsMeshRef.current = lungs;
                
                // Centrer les contrôles sur le modèle
                controls.target.set(0, 0, 0);
                controls.update();
            },
            undefined,
            (error) => {
                console.error('Erreur lors du chargement du modèle de poumons:', error);
            }
        );
        
        // Références
        sceneRef.current = scene;
        rendererRef.current = renderer;
        cameraRef.current = camera;
        controlsRef.current = controls;
        
        // Chargement du volume DICOM
        if (dicomVolume) {
            loadDicomVolume(scene, dicomVolume);
        }
        
        // Graphique des prédictions FVC
        if (predictions && predictions.length > 0) {
            createFVCGraph(scene, predictions);
        }
        
        // Gestion du redimensionnement
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);
        
        // Animation
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();
        
        return () => {
            window.removeEventListener('resize', handleResize);
            if (vrButtonRef.current && vrButtonRef.current.parentNode) {
                vrButtonRef.current.parentNode.removeChild(vrButtonRef.current);
            }
            if (lungsMeshRef.current) {
                scene.remove(lungsMeshRef.current);
            }
            if (mountRef.current && renderer.domElement.parentNode) {
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
            controls.dispose();
        };
    }, []);

    // Mise à jour du volume DICOM
    useEffect(() => {
        if (!sceneRef.current) return;
        
        // Supprimer l'ancien volume
        if (volumeMeshRef.current) {
            sceneRef.current.remove(volumeMeshRef.current);
            if (volumeMeshRef.current.geometry) volumeMeshRef.current.geometry.dispose();
            if (volumeMeshRef.current.material) {
                if (volumeMeshRef.current.material.uniforms?.volume?.value) {
                    volumeMeshRef.current.material.uniforms.volume.value.dispose();
                }
                volumeMeshRef.current.material.dispose();
            }
            volumeMeshRef.current = null;
        }
        
        // Charger le nouveau volume
        if (dicomVolume) {
            loadDicomVolume(sceneRef.current, dicomVolume);
        }
    }, [dicomVolume]);

    // Mise à jour du graphique FVC
    useEffect(() => {
        if (!sceneRef.current) return;
        
        // Supprimer l'ancien graphique
        if (fvcGraphRef.current) {
            sceneRef.current.remove(fvcGraphRef.current);
            if (fvcGraphRef.current.geometry) fvcGraphRef.current.geometry.dispose();
            if (fvcGraphRef.current.material) fvcGraphRef.current.material.dispose();
            fvcGraphRef.current = null;
        }
        
        // Créer le nouveau graphique
        if (predictions && predictions.length > 0) {
            createFVCGraph(sceneRef.current, predictions);
        }
    }, [predictions]);

    const loadDicomVolume = (scene, volumeData) => {
        try {
            // Si volumeData est un objet avec des données
            let data, width, height, depth;
            
            if (volumeData.data && volumeData.shape) {
                // Format avec shape et data
                data = new Uint8Array(volumeData.data);
                [width, height, depth] = volumeData.shape;
            } else if (Array.isArray(volumeData)) {
                // Format array simple
                data = new Uint8Array(volumeData);
                width = height = depth = Math.cbrt(volumeData.length);
            } else {
                console.warn('Format de volume DICOM non reconnu, utilisation d\'un volume de test');
                // Volume de test
                width = height = depth = 64;
                data = new Uint8Array(width * height * depth);
                for (let i = 0; i < data.length; i++) {
                    data[i] = Math.random() * 255;
                }
            }
            
            // Création d'une texture 3D en utilisant DataTexture avec format RGBA
            // Pour Three.js, on utilise une approche avec texture 2D empilée ou DataTexture
            const size = width * height * depth;
            const textureData = new Uint8Array(size * 4); // RGBA
            
            for (let i = 0; i < size; i++) {
                const value = data[i] / 255.0;
                const idx = i * 4;
                // Mapping pour visualisation médicale (poumons)
                textureData[idx] = value * 255;     // R
                textureData[idx + 1] = value * 200; // G
                textureData[idx + 2] = value * 150; // B
                textureData[idx + 3] = value > 0.1 ? 255 : 0; // A (seuil)
            }
            
            // Création de la texture (approche avec DataTexture pour compatibilité)
            const texture = new THREE.DataTexture(
                textureData,
                width,
                height * depth,
                THREE.RGBAFormat,
                THREE.UnsignedByteType
            );
            texture.needsUpdate = true;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            
            // Matériau de rendu volumétrique avec raycasting
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    u_data: { value: texture },
                    u_size: { value: new THREE.Vector3(width, height, depth) },
                    u_clim: { value: new THREE.Vector2(0, 1) },
                    u_renderstyle: { value: 0 }, // 0: MIP, 1: Average, 2: Iso
                    u_isovalue: { value: 0.5 },
                    u_cameraPos: { value: new THREE.Vector3() }
                },
                vertexShader: volumeVertexShader,
                fragmentShader: volumeFragmentShader,
                side: THREE.BackSide,
                transparent: true
            });
            
            const geometry = new THREE.BoxGeometry(10, 10, 10);
            const volumeMesh = new THREE.Mesh(geometry, material);
            volumeMesh.position.set(0, 0, 0);
            scene.add(volumeMesh);
            
            volumeMeshRef.current = volumeMesh;
            
            // Mise à jour de la position de la caméra
            if (cameraRef.current) {
                cameraRef.current.lookAt(0, 0, 0);
            }
            
        } catch (error) {
            console.error('Erreur lors du chargement du volume DICOM:', error);
        }
    };

    const createFVCGraph = (scene, predictions) => {
        if (!predictions || predictions.length === 0) return;
        
        try {
            // Points pour la ligne principale
            const points = [];
            const fvcValues = predictions.map(p => p.fvc_predicted || p.fvc || 0);
            const weekValues = predictions.map((p, idx) => p.week !== undefined ? p.week : idx * 4);
            
            const maxFVC = Math.max(...fvcValues, 1); // Au moins 1 pour éviter division par 0
            const maxWeek = Math.max(...weekValues, 1); // Au moins 1 pour éviter division par 0
            
            predictions.forEach((pred, index) => {
                const week = pred.week !== undefined ? pred.week : index * 4;
                const fvc = pred.fvc_predicted || pred.fvc || 0;
                // Normalisation pour l'affichage 3D
                const x = maxWeek > 0 ? (week / maxWeek) * 10 - 5 : index * 2 - 5;
                const y = maxFVC > 0 ? (fvc / maxFVC) * 5 - 2.5 : 0;
                const z = 0;
                points.push(new THREE.Vector3(x, y, z));
            });
            
            if (points.length > 0) {
                // Ligne principale
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const material = new THREE.LineBasicMaterial({ 
                    color: 0x10b981,
                    linewidth: 3
                });
                const line = new THREE.Line(geometry, material);
                line.position.set(-5, -3, 5);
                scene.add(line);
                
                // Points sur la ligne
                points.forEach((point, index) => {
                    const sphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
                    const sphereMaterial = new THREE.MeshBasicMaterial({ 
                        color: 0x10b981 
                    });
                    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                    sphere.position.set(
                        point.x - 5,
                        point.y - 3,
                        point.z + 5
                    );
                    scene.add(sphere);
                });
                
                // Labels (texte simple avec sprites)
                const loader = new THREE.TextureLoader();
                predictions.forEach((pred, index) => {
                    const week = pred.week !== undefined ? pred.week : index * 4;
                    const fvc = pred.fvc_predicted || pred.fvc || 0;
                    const x = ((week / maxWeek) * 10 - 5) - 5;
                    const y = ((fvc / maxFVC) * 5 - 2.5) - 3;
                    
                    // Création d'un sprite avec texte (simplifié)
                    const spriteMaterial = new THREE.SpriteMaterial({
                        color: 0xffffff,
                        transparent: true,
                        opacity: 0.8
                    });
                    const sprite = new THREE.Sprite(spriteMaterial);
                    sprite.position.set(x, y + 0.5, 5);
                    sprite.scale.set(0.5, 0.3, 1);
                    scene.add(sprite);
                });
                
                fvcGraphRef.current = line;
            }
        } catch (error) {
            console.error('Erreur lors de la création du graphique FVC:', error);
        }
    };

    return (
        <div 
            ref={mountRef} 
            style={{ width: '100%', height: '100vh', position: 'relative' }}
        />
    );
};

// Shaders améliorés pour le rendu volumétrique avec raycasting
const volumeVertexShader = `
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    
    void main() {
        vPosition = position;
        vNormal = normal;
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const volumeFragmentShader = `
    uniform sampler2D u_data;
    uniform vec3 u_size;
    uniform vec2 u_clim;
    uniform int u_renderstyle;
    uniform float u_isovalue;
    uniform vec3 u_cameraPos;
    
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    
    // Échantillonnage du volume
    vec4 sampleVolume(vec3 pos) {
        // Normalisation de la position dans [0,1]
        vec3 uv = (pos + 0.5);
        uv = clamp(uv, 0.0, 1.0);
        
        // Conversion en coordonnées de texture
        float z = uv.z * u_size.z;
        float zIndex = floor(z);
        float zFrac = fract(z);
        
        // Échantillonnage bilinéaire simplifié
        vec2 texCoord = vec2(
            uv.x,
            (uv.y + zIndex) / u_size.z
        );
        
        vec4 color1 = texture2D(u_data, texCoord);
        
        if (zIndex < u_size.z - 1.0) {
            vec2 texCoord2 = vec2(
                uv.x,
                (uv.y + zIndex + 1.0) / u_size.z
            );
            vec4 color2 = texture2D(u_data, texCoord2);
            return mix(color1, color2, zFrac);
        }
        
        return color1;
    }
    
    void main() {
        vec3 pos = vPosition + 0.5;
        vec4 color = sampleVolume(pos);
        
        // Transfer function pour visualisation médicale
        float intensity = color.r;
        
        // Colormap pour poumons (rouge/jaune pour tissus, bleu pour air)
        vec3 finalColor;
        if (intensity > 0.7) {
            // Tissus denses
            finalColor = vec3(1.0, 0.3, 0.2);
        } else if (intensity > 0.4) {
            // Tissus mous
            finalColor = vec3(1.0, 0.8, 0.4);
        } else if (intensity > 0.1) {
            // Air/tissus légers
            finalColor = vec3(0.4, 0.6, 1.0);
        } else {
            // Air pur
            finalColor = vec3(0.1, 0.2, 0.4);
        }
        
        float alpha = intensity * 0.8;
        
        gl_FragColor = vec4(finalColor, alpha);
    }
`;

export default WebXRViewer;
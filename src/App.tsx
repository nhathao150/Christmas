import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// Import có đuôi .js
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// --- CẤU HÌNH ---
const API_URL = 'http://localhost:3000/api'; 

const CONFIG = {
    colors: {
        bg: 0x000000, 
        champagneGold: 0xffd966, 
        deepGreen: 0x03180a,     
        accentRed: 0x990000,     
    },
    particles: { count: 1500, treeHeight: 24, treeRadius: 8 },
    snow: { count: 800, range: 100, speed: 0.1 },
    camera: { z: 50 }
};

const App = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [showInstructions, setShowInstructions] = useState(true);

    const sceneRef = useRef<THREE.Scene | null>(null);
    const mainGroupRef = useRef<THREE.Group | null>(null);
    const photoMeshGroupRef = useRef<THREE.Group | null>(null);
    const particleSystemRef = useRef<any[]>([]); 

    useEffect(() => {
        if (!mountRef.current) return;

        let camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, composer: EffectComposer;
        let clock = new THREE.Clock();
        let handLandmarker: any, video: HTMLVideoElement;
        
        let lastAiCheckTime = 0;
        const AI_INTERVAL = 100;

        const STATE = { 
            mode: 'TREE', 
            focusTarget: null as THREE.Object3D | null, 
            hand: { detected: false, x: 0, y: 0 }, 
            rotation: { x: 0, y: 0 } 
        };
        
        let caneTexture: THREE.CanvasTexture;

        // --- CLASS PARTICLE ---
        class Particle {
            mesh: THREE.Mesh | THREE.Group;
            type: string;
            posTree = new THREE.Vector3();
            posScatter = new THREE.Vector3();
            baseScale: number;
            spinSpeed: THREE.Vector3;

            constructor(mesh: THREE.Mesh | THREE.Group, type: string) {
                this.mesh = mesh;
                this.type = type;
                this.baseScale = mesh.scale.x;
                const speedMult = (type === 'PHOTO') ? 0.3 : 2.0;
                this.spinSpeed = new THREE.Vector3((Math.random()-0.5)*speedMult, (Math.random()-0.5)*speedMult, (Math.random()-0.5)*speedMult);
                this.calculatePositions();
            }

            calculatePositions() {
                const h = CONFIG.particles.treeHeight;
                let t = Math.pow(Math.random(), 0.8);
                const y = (t * h) - (h / 2);
                let rMax = CONFIG.particles.treeRadius * (1.0 - t);
                if (rMax < 0.5) rMax = 0.5;
                const angle = t * 50 * Math.PI + Math.random() * Math.PI;
                const r = rMax * (0.8 + Math.random() * 0.4);
                this.posTree.set(Math.cos(angle) * r, y, Math.sin(angle) * r);

                let rScatter = (8 + Math.random()*12);
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                this.posScatter.set(
                    rScatter * Math.sin(phi) * Math.cos(theta),
                    rScatter * Math.sin(phi) * Math.sin(theta),
                    rScatter * Math.cos(phi)
                );
            }

            update(dt: number) {
                let target = this.posTree;

                if (STATE.mode === 'SCATTER') {
                    target = this.posScatter;
                } else if (STATE.mode === 'FOCUS' && STATE.focusTarget) {
                    if (this.mesh === STATE.focusTarget) {
                        const desiredWorldPos = new THREE.Vector3(0, 2, 35);
                        const invMatrix = new THREE.Matrix4().copy(mainGroupRef.current!.matrixWorld).invert();
                        target = desiredWorldPos.applyMatrix4(invMatrix);
                    } else {
                        target = this.posScatter;
                    }
                }

                const lerpSpeed = (STATE.mode === 'FOCUS' && this.mesh === STATE.focusTarget) ? 5.0 : 3.0;
                this.mesh.position.lerp(target, lerpSpeed * dt);

                if (STATE.mode === 'SCATTER') {
                    this.mesh.rotation.x += this.spinSpeed.x * dt;
                    this.mesh.rotation.y += this.spinSpeed.y * dt;
                } else if (STATE.mode === 'FOCUS' && this.mesh === STATE.focusTarget) {
                     this.mesh.lookAt(camera.position);
                } else {
                    this.mesh.rotation.y += 0.5 * dt;
                }
                
                let s = this.baseScale;
                if (STATE.mode === 'SCATTER' && this.type === 'PHOTO') s = this.baseScale * 2.5;
                else if (STATE.mode === 'FOCUS') {
                    if (this.mesh === STATE.focusTarget) s = 4.5;
                    else s = this.baseScale * 0.5;
                }
                this.mesh.scale.lerp(new THREE.Vector3(s,s,s), 4*dt);
            }
        }

        const init = async () => {
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(CONFIG.colors.bg);
            scene.fog = new THREE.FogExp2(CONFIG.colors.bg, 0.015); 
            sceneRef.current = scene;

            camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 2, CONFIG.camera.z);

            renderer = new THREE.WebGLRenderer({ 
                antialias: false, 
                powerPreference: "high-performance",
                stencil: false,
                depth: true
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
            renderer.toneMapping = THREE.ReinhardToneMapping;
            mountRef.current?.appendChild(renderer.domElement);

            const mainGroup = new THREE.Group();
            scene.add(mainGroup);
            mainGroupRef.current = mainGroup;

            const photoGroup = new THREE.Group();
            mainGroup.add(photoGroup);
            photoMeshGroupRef.current = photoGroup;

            const pmremGenerator = new THREE.PMREMGenerator(renderer);
            scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
            scene.add(new THREE.AmbientLight(0xffffff, 0.6));
            const spotGold = new THREE.SpotLight(0xffcc66, 1200);
            spotGold.position.set(30, 40, 40);
            scene.add(spotGold);

            const renderScene = new RenderPass(scene, camera);
            const bloomPass = new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth/2, window.innerHeight/2),
                1.5, 0.4, 0.85
            );
            bloomPass.threshold = 0.6;
            bloomPass.strength = 0.5;
            bloomPass.radius = 0.4;
            composer = new EffectComposer(renderer);
            composer.addPass(renderScene);
            composer.addPass(bloomPass);

            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = 64;
            const ctx = canvas.getContext('2d');
            if(ctx) {
                ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,64,64);
                ctx.fillStyle = '#880000'; ctx.beginPath();
                for(let i=-64; i<128; i+=16) {
                    ctx.moveTo(i, 0); ctx.lineTo(i+16, 64); ctx.lineTo(i+8, 64); ctx.lineTo(i-8, 0);
                }
                ctx.fill();
            }
            caneTexture = new THREE.CanvasTexture(canvas);
            caneTexture.wrapS = THREE.RepeatWrapping; caneTexture.wrapT = THREE.RepeatWrapping;
            caneTexture.repeat.set(3, 3);

            const sphereGeo = new THREE.SphereGeometry(0.5, 8, 8); 
            const boxGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, 0.3, 0),
                new THREE.Vector3(0.1, 0.5, 0), new THREE.Vector3(0.3, 0.4, 0)
            ]);
            const candyGeo = new THREE.TubeGeometry(curve, 8, 0.08, 4, false);

            const goldMat = new THREE.MeshStandardMaterial({ color: CONFIG.colors.champagneGold, metalness: 1.0, roughness: 0.1, emissive: 0x443300 });
            const greenMat = new THREE.MeshStandardMaterial({ color: CONFIG.colors.deepGreen, metalness: 0.2, roughness: 0.8, emissive: 0x002200 });
            const redMat = new THREE.MeshPhysicalMaterial({ color: CONFIG.colors.accentRed, metalness: 0.3, roughness: 0.2, clearcoat: 1.0, emissive: 0x330000 });
            const candyMat = new THREE.MeshStandardMaterial({ map: caneTexture, roughness: 0.4 });

            for (let i = 0; i < CONFIG.particles.count; i++) {
                const rand = Math.random();
                let mesh, type;
                if (rand < 0.40) { mesh = new THREE.Mesh(boxGeo, greenMat); type = 'BOX'; }
                else if (rand < 0.70) { mesh = new THREE.Mesh(boxGeo, goldMat); type = 'GOLD_BOX'; }
                else if (rand < 0.92) { mesh = new THREE.Mesh(sphereGeo, goldMat); type = 'GOLD_SPHERE'; }
                else if (rand < 0.97) { mesh = new THREE.Mesh(sphereGeo, redMat); type = 'RED'; }
                else { mesh = new THREE.Mesh(candyGeo, candyMat); type = 'CANE'; }

                const s = 0.4 + Math.random() * 0.5;
                mesh.scale.set(s,s,s);
                mesh.rotation.set(Math.random()*6, Math.random()*6, Math.random()*6);
                
                mainGroup.add(mesh);
                particleSystemRef.current.push(new Particle(mesh, type));
            }

            const starGeo = new THREE.OctahedronGeometry(1.2, 0);
            const starMat = new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffaa00, emissiveIntensity: 1.0, metalness: 1.0 });
            const star = new THREE.Mesh(starGeo, starMat);
            star.position.set(0, CONFIG.particles.treeHeight/2 + 1.2, 0);
            mainGroup.add(star);

            const snowGeo = new THREE.TetrahedronGeometry(0.08, 0);
            const snowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
            const snowGroup = new THREE.Group();
            scene.add(snowGroup);
            for(let i=0; i<CONFIG.snow.count; i++) {
                const mesh = new THREE.Mesh(snowGeo, snowMat);
                mesh.position.set((Math.random()-0.5)*100, (Math.random()-0.5)*100, (Math.random()-0.5)*100);
                mesh.userData = { speed: Math.random()*0.1+0.05, wobble: Math.random()*Math.PI };
                snowGroup.add(mesh);
            }

            try {
                video = document.createElement('video');
                video.autoplay = true; video.playsInline = true; video.style.display = 'none';
                document.body.appendChild(video);
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
                await video.play();
                const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
                handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" },
                    runningMode: "VIDEO", numHands: 1
                });
            } catch (e) { console.error("AI Error:", e); }

            const animate = () => {
                requestAnimationFrame(animate);
                const dt = clock.getDelta();
                const now = performance.now();

                if (handLandmarker && video && video.readyState >= 2) {
                    if (now - lastAiCheckTime > AI_INTERVAL) {
                        lastAiCheckTime = now;
                        const results = handLandmarker.detectForVideo(video, now);
                        
                        if (results.landmarks.length > 0) {
                            STATE.hand.detected = true;
                            const lm = results.landmarks[0];
                            const thumb = lm[4]; const index = lm[8]; const wrist = lm[0];
                            
                            const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
                            const tips = [lm[8], lm[12], lm[16], lm[20]];
                            let avgDist = 0;
                            tips.forEach(t => avgDist += Math.hypot(t.x - wrist.x, t.y - wrist.y));
                            avgDist /= 4;

                            let newMode = STATE.mode;

                            if (pinchDist < 0.05) {
                                newMode = 'FOCUS';
                                if (STATE.mode !== 'FOCUS') {
                                     const photos = particleSystemRef.current.filter(p => p.type === 'PHOTO');
                                     if (photos.length) STATE.focusTarget = photos[Math.floor(Math.random()*photos.length)].mesh;
                                }
                            } else if (avgDist < 0.25) {
                                newMode = 'TREE';
                                STATE.focusTarget = null;
                            } else if (avgDist > 0.35) {
                                newMode = 'SCATTER';
                                STATE.focusTarget = null;
                            }
                            
                            if (STATE.mode !== newMode) STATE.mode = newMode;

                            const targetRotY = (lm[9].x - 0.5) * Math.PI * 2;
                            STATE.rotation.y = targetRotY; 
                        }
                    }
                }

                if (STATE.hand.detected) {
                    mainGroup.rotation.y += (STATE.rotation.y - mainGroup.rotation.y) * 3.0 * dt;
                } else {
                    mainGroup.rotation.y += 0.2 * dt;
                }

                particleSystemRef.current.forEach(p => p.update(dt));
                
                const snowChildren = snowGroup.children;
                for (let i = 0, l = snowChildren.length; i < l; i++) {
                    const mesh = snowChildren[i];
                    mesh.position.y -= mesh.userData.speed;
                    mesh.position.x += Math.sin(now * 0.001 + mesh.userData.wobble) * 0.02;
                    if (mesh.position.y < -30) mesh.position.y = 40;
                }

                composer.render();
            };
            
            setLoading(false);
            animate();
            fetchPhotosFromDB();
        };

        const fetchPhotosFromDB = async () => {
            try {
                const res = await fetch(`${API_URL}/photos`);
                const data = await res.json();
                const loader = new THREE.TextureLoader();
                data.forEach((photo: any, index: number) => {
                    loader.load(photo.url, (tex) => {
                        tex.colorSpace = THREE.SRGBColorSpace;
                        setTimeout(() => addPhotoToScene(tex), index * 100);
                    });
                });
            } catch (err) { console.error("Lỗi lấy ảnh:", err); }
        };

        const handleFileUpload = async (e: any) => {
            const files = e.target.files;
            if (!files.length) return;
            for (const file of Array.from(files) as File[]) {
                const formData = new FormData();
                formData.append('photo', file);
                try {
                    const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.photo) {
                        new THREE.TextureLoader().load(data.photo.url, (tex) => {
                            tex.colorSpace = THREE.SRGBColorSpace;
                            addPhotoToScene(tex);
                        });
                    }
                } catch (err) { alert("Lỗi kết nối Server Backend!"); }
            }
        };

        const handleReset = async () => {
            if (!confirm("Xóa toàn bộ ảnh?")) return;
            try {
                await fetch(`${API_URL}/reset`, { method: 'DELETE' });
                if (photoMeshGroupRef.current) {
                    while(photoMeshGroupRef.current.children.length > 0) photoMeshGroupRef.current.remove(photoMeshGroupRef.current.children[0]);
                    particleSystemRef.current = particleSystemRef.current.filter(p => p.type !== 'PHOTO');
                }
                alert("Đã xóa sạch!");
            } catch (err) { console.error(err); }
        };

        const addPhotoToScene = (texture: THREE.Texture) => {
            if (!photoMeshGroupRef.current || !mainGroupRef.current) return;
            const frameGeo = new THREE.BoxGeometry(1.4, 1.4, 0.05);
            const frameMat = new THREE.MeshStandardMaterial({ color: 0xffd966, metalness: 1.0, roughness: 0.1 });
            const frame = new THREE.Mesh(frameGeo, frameMat);
            const photoGeo = new THREE.PlaneGeometry(1.2, 1.2);
            const photoMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
            const photo = new THREE.Mesh(photoGeo, photoMat);
            photo.position.z = 0.04;
            const group = new THREE.Group();
            group.add(frame); group.add(photo);
            
            const h = CONFIG.particles.treeHeight;
            let t = Math.pow(Math.random(), 0.8);
            const y = (t * h) - (h / 2);
            const r = CONFIG.particles.treeRadius * (1.0 - t) * (0.8 + Math.random() * 0.4);
            const angle = t * 50 * Math.PI + Math.random() * Math.PI;
            
            const particleMock = {
                mesh: group,
                type: 'PHOTO',
                baseScale: 0.8,
                posTree: new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r),
                posScatter: new THREE.Vector3(
                    (10 + Math.random()*10) * Math.sin(Math.random()*6) * Math.cos(Math.random()*6),
                    (10 + Math.random()*10) * Math.sin(Math.random()*6) * Math.sin(Math.random()*6),
                    (10 + Math.random()*10) * Math.cos(Math.random()*6)
                ),
                spinSpeed: new THREE.Vector3(0,0,0),
                update: function(dt: number) {
                    let target = this.posTree;
                    if (STATE.mode === 'SCATTER') target = this.posScatter;
                    else if (STATE.mode === 'FOCUS' && STATE.focusTarget) {
                        if (this.mesh === STATE.focusTarget) {
                            const desiredWorldPos = new THREE.Vector3(0, 2, 35);
                            const invMatrix = new THREE.Matrix4().copy(mainGroupRef.current!.matrixWorld).invert();
                            target = desiredWorldPos.applyMatrix4(invMatrix);
                        } else {
                            target = this.posScatter;
                        }
                    }

                    this.mesh.position.lerp(target, 3.0 * dt);
                    
                    if (STATE.mode === 'SCATTER') {
                         this.mesh.rotation.y += dt;
                    } else if (STATE.mode === 'FOCUS' && this.mesh === STATE.focusTarget) {
                         this.mesh.lookAt(camera.position);
                    } else {
                         this.mesh.rotation.y += 0.5 * dt;
                    }

                    let s = this.baseScale;
                    if (STATE.mode === 'SCATTER') s = this.baseScale * 2.5;
                    else if (STATE.mode === 'FOCUS') {
                        if (this.mesh === STATE.focusTarget) s = 4.5;
                        else s = this.baseScale * 0.5;
                    }
                    this.mesh.scale.lerp(new THREE.Vector3(s,s,s), 4*dt);
                }
            };
            group.scale.set(0,0,0);
            photoMeshGroupRef.current.add(group);
            particleSystemRef.current.push(particleMock);
            let scale = 0;
            const popUp = setInterval(() => {
                scale += 0.05;
                group.scale.set(scale, scale, scale);
                if (scale >= 0.8) clearInterval(popUp);
            }, 16);
        };

        init();

        const handleResize = () => {
            if(camera && renderer) {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
                composer.setSize(window.innerWidth, window.innerHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        setTimeout(() => {
            const input = document.getElementById('file-input');
            const btnReset = document.getElementById('btn-reset');
            if (input) input.onchange = handleFileUpload;
            if (btnReset) btnReset.onclick = handleReset;
        }, 1000);

        return () => {
            window.removeEventListener('resize', handleResize);
            if(mountRef.current && renderer) mountRef.current.removeChild(renderer.domElement);
        };
    }, []);

    const handleCloseInstructions = () => {
        setShowInstructions(false);
        const audio = document.getElementById('bg-music') as HTMLAudioElement;
        if(audio) audio.play().catch(() => {}); 
    };

    return (
        <>
            {loading && (
                <div id="loader">
                    <div className="spinner"></div>
                    <div className="loader-text">Loading Holiday Magic...</div>
                </div>
            )}

            {showInstructions && (
                <div className="popup-overlay">
                    <div className="popup-content">
                        <div className="popup-title">HƯỚNG DẪN CỬ CHỈ</div>
                        
                        <div className="guide-row">
                            <span className="guide-icon">🖐</span>
                            <span><b>Xòe 5 ngón:</b> Hiệu ứng nổ tung (Disperse)</span>
                        </div>
                        <div className="guide-row">
                            <span className="guide-icon">✊</span>
                            <span><b>Nắm tay:</b> Thu về cây thông (Assemble)</span>
                        </div>
                        <div className="guide-row">
                            <span className="guide-icon">👌</span>
                            <span><b>Chụm (Cái + Trỏ):</b> Xem ảnh (Focus Mode)</span>
                        </div>

                        <button className="popup-btn-ok" onClick={handleCloseInstructions}>
                            OK
                        </button>
                    </div>
                </div>
            )}

            <audio loop id="bg-music">
                <source src="/sound/sound_noel.mp3" type="audio/mpeg" />
            </audio>
            
            <div id="canvas-container" ref={mountRef}></div>
            
            <div id="ui-layer">
                <h1 id="title-noel">MERRY CHRISTMAS</h1>
                <div className="upload-wrapper">
                    <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                        <label className="upload-btn">
                            THÊM ẢNH
                            <input type="file" id="file-input" multiple accept="image/*" />
                        </label>
                        <button className="upload-btn" id="btn-reset" style={{borderColor: '#ff4444', color: '#ffaaaa'}}>
                            XÓA HẾT
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default App;
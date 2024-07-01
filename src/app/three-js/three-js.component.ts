import { Component, OnInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';

@Component({
  selector: 'app-three-js',
  templateUrl: './three-js.component.html',
  styleUrls: ['./three-js.component.scss']
})
export class ThreeJsComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  controls!: OrbitControls;
  transformControls!: TransformControls;
  objects: THREE.Mesh[] = [];
  plane!: THREE.Mesh;
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  currentTool = 'none';
  selectedObject: THREE.Mesh | null = null;
  showModal: boolean = false;
  modalObjectProperties: any = {};

  constructor() { }

  ngOnInit(): void {
    this.initThreeJs();
    this.loadObjectsFromLocalStorage();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.camera.aspect = (window.innerWidth * 0.75) / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth * 0.75, window.innerHeight);
  }

  initThreeJs(): void {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvasRef.nativeElement, antialias: true });
    this.renderer.setSize(window.innerWidth * 0.75, window.innerHeight);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xEEEEEE);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5).normalize();
    this.scene.add(light);

    const planeGeometry = new THREE.PlaneGeometry(10, 10, 10, 10);
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xADD8E6, side: THREE.DoubleSide, wireframe: true });
    this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.plane.rotation.x = -Math.PI / 2;
    this.scene.add(this.plane);

    const loader = new FontLoader();
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
      const textGeometry = new TextGeometry('CART DESIGN', {
        font: font,
        size: 0.5,
        height: 0.05,
      });
      const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.rotation.x = -Math.PI / 2;
      textMesh.position.set(-2.5, 0.01, 0);
      this.scene.add(textMesh);
    });

    this.camera = new THREE.PerspectiveCamera(75, (window.innerWidth * 0.75) / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 5, 5);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableRotate = false;
    this.controls.enableZoom = true;

    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.addEventListener('change', () => this.renderer.render(this.scene, this.camera));
    this.transformControls.addEventListener('dragging-changed', (event) => {
      this.controls.enabled = !event.value;
    });
    this.scene.add(this.transformControls);

    this.animate();

    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('contextmenu', this.onRightClick.bind(this));
    this.renderer.domElement.addEventListener('dblclick', this.onDoubleClick.bind(this));
  }

  setTool(tool: string): void {
    this.currentTool = tool;
  }

  addObject(tool: string, position: THREE.Vector3): void {
    let geometry;

    switch (tool) {
      case 'cube':
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        break;
      case 'cone':
        geometry = new THREE.ConeGeometry(0.5, 1, 32);
        break;
      default:
        return;
    }

    const material = new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.y += 0.5;
    this.scene.add(mesh);
    this.objects.push(mesh);
    this.saveObjectsToLocalStorage();
  }

  onDragStart(event: DragEvent, tool: string): void {
    event.dataTransfer?.setData('text/plain', tool);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const tool = event.dataTransfer?.getData('text/plain');
    if (tool) {
      this.mouse.x = (event.clientX / (window.innerWidth * 0.75)) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.plane);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        this.addObject(tool, point);
      }
    }
  }

  onMouseDown(event: MouseEvent): void {
    this.selectObject(event);
  }

  onMouseUp(event: MouseEvent): void {
    this.saveObjectsToLocalStorage();
  }

  onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / (window.innerWidth * 0.75)) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  selectObject(event: MouseEvent): void {
    this.mouse.x = (event.clientX / (window.innerWidth * 0.75)) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.objects, true);

    if (intersects.length > 0) {
      const selectedObject = intersects[0].object as THREE.Mesh;
      this.selectedObject = selectedObject;
      this.transformControls.attach(selectedObject);
      this.updateSelectedObjectProperties();
    } else {
      this.transformControls.detach();
      this.selectedObject = null;
      this.showModal = false;
    }
  }

  updateSelectedObjectProperties(): void {
    if (this.selectedObject && this.selectedObject.material instanceof THREE.MeshBasicMaterial) {
      const { x, y, z } = this.selectedObject.scale;
      const { r, g, b } = this.selectedObject.material.color;
      this.modalObjectProperties = {
        scaleX: x,
        scaleY: y,
        scaleZ: z,
        color: `#${((1 << 24) + (r * 255 << 16) + (g * 255 << 8) + (b * 255)).toString(16).slice(1)}`,
        positionX: this.selectedObject.position.x,
        positionY: this.selectedObject.position.y,
        positionZ: this.selectedObject.position.z
      };
    }
  }

  updateObject(): void {
    if (this.selectedObject && this.selectedObject.material instanceof THREE.MeshBasicMaterial) {
      this.selectedObject.material.color.set(this.modalObjectProperties.color);
      this.selectedObject.position.set(this.modalObjectProperties.positionX, this.modalObjectProperties.positionY, this.modalObjectProperties.positionZ);
      this.selectedObject.scale.set(this.modalObjectProperties.scaleX, this.modalObjectProperties.scaleY, this.modalObjectProperties.scaleZ);
      this.showModal = false;
      this.saveObjectsToLocalStorage();
    }
  }

  closeModal(): void {
    this.showModal = false;
  }

  loadSTL(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const contents = e.target?.result as ArrayBuffer;
        const loader = new STLLoader();
        const geometry = loader.parse(contents);
        const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
        const mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);
        this.objects.push(mesh);
        this.saveObjectsToLocalStorage();
      };
      reader.readAsArrayBuffer(file);
    }
  }

  animate(): void {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  exportModel(): void {
    const exporter = new STLExporter();
    const stlString = exporter.parse(this.scene);
    const blob = new Blob([stlString], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'model.stl';
    link.click();
  }

  onRightClick(event: MouseEvent): void {
    event.preventDefault();
    this.selectObject(event);
  }

  onDoubleClick(event: MouseEvent): void {
    if (this.selectedObject) {
      this.showModal = true;
    }
  }

  moveCamera(direction: string): void {
    const movementSpeed = 0.5;
    switch (direction) {
      case 'up':
        this.camera.position.y += movementSpeed;
        break;
      case 'down':
        this.camera.position.y -= movementSpeed;
        break;
      case 'left':
        this.camera.position.x -= movementSpeed;
        break;
      case 'right':
        this.camera.position.x += movementSpeed;
        break;
    }
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.renderer.render(this.scene, this.camera);
  }

  saveObjectsToLocalStorage(): void {
    const objectsData = this.objects.map(obj => ({
      type: obj.geometry.type,
      position: obj.position,
      scale: obj.scale,
      color: (obj.material as THREE.MeshBasicMaterial).color.getHexString()
    }));
    localStorage.setItem('threejs-objects', JSON.stringify(objectsData));
  }

  loadObjectsFromLocalStorage(): void {
    const objectsData = localStorage.getItem('threejs-objects');
    if (objectsData) {
      const parsedObjects = JSON.parse(objectsData);
      parsedObjects.forEach((objData: any) => {
        let geometry;
        switch (objData.type) {
          case 'BoxGeometry':
            geometry = new THREE.BoxGeometry(1, 1, 1);
            break;
          case 'SphereGeometry':
            geometry = new THREE.SphereGeometry(0.5, 32, 32);
            break;
          case 'CylinderGeometry':
            geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
            break;
          case 'ConeGeometry':
            geometry = new THREE.ConeGeometry(0.5, 1, 32);
            break;
          default:
            return;
        }
        const material = new THREE.MeshBasicMaterial({ color: parseInt(objData.color, 16) });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(objData.position);
        mesh.scale.copy(objData.scale);
        this.scene.add(mesh);
        this.objects.push(mesh);
      });
    }
  }
}

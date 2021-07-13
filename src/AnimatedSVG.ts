import * as AFRAME from "aframe";
import { svg2imgs } from "../utils/svg";

const { THREE } = AFRAME;
interface AnimatedSVGComponentSchema {
  src: string; // src of svg file.
  frameRate: number;
}

interface AnimatedSVGComponent
  extends AFRAME.Component<AnimatedSVGComponentSchema> {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  svgEl: SVGSVGElement;
  geometry: THREE.PlaneBufferGeometry;
  texture: THREE.Texture;
  textureLoader: THREE.TextureLoader;
  material: THREE.MeshBasicMaterial;
  frames: HTMLImageElement[]; // array of images to show on the background.
  currentIndex: number; // index of the images element array

  handleSVGLoaded(): void;
  loadSVG(url: string): void;
  updateTextureWithAnimationFrame(): void;
}

AFRAME.registerComponent("svg", <AnimatedSVGComponent>{
  schema: {
    src: { type: "string" },
    frameRate: { type: "number" },
  },
  init: function (this: AnimatedSVGComponent): void {
    // bind handlers
    this.loadSVG = this.loadSVG.bind(this);

    if (!this.el.sceneEl) return;

    // init image array
    this.frames = [];
    this.currentIndex = 0;

    this.loadSVG(this.data.src);

    // tick throttling
    if (this.tick) {
      this.tick = AFRAME.utils.throttleTick(
        this.tick,
        1000 / this.data.frameRate,
        this
      );
    }
  },
  tick: function (this: AnimatedSVGComponent, time, deltaTime): void {
    if (!this.el.sceneEl || !this.svgEl || !this.frames.length) return;
    // update image
    const image = this.frames[this.currentIndex % this.frames.length];
    this.currentIndex++;

    // FIXME: update texture instead of switching src of material for better performance.
    // this.texture = new THREE.Texture(image);
    // this.geometry = new THREE.PlaneBufferGeometry(1, 1, 1);
    // this.material = new THREE.MeshBasicMaterial({color: 'red', opacity: 0.5, flatShading: true, map: this.texture});
    // this.el.setObject3D('mesh', new THREE.Mesh(this.geometry, this.material));

    this.el.setAttribute("material", { src: image.src });
  },
  loadSVG(url: string): void {
    const loader = new THREE.FileLoader();
    loader.load(url, (svgString) => {
      // load svg & parse as SVG element.
      const parser = new DOMParser();
      this.svgEl = parser.parseFromString(svgString.toString(), "image/svg+xml")
        .documentElement as unknown as SVGSVGElement;

      // append svg.
      this.svgEl.style.display = "none";
      document.body.appendChild(this.svgEl);

      // transform animated svg to a series of images.
      this.frames = svg2imgs(this.svgEl, this.data.frameRate);
    });
  },
});

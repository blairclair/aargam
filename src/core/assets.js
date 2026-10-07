// Image registry. Owned by: supervisor. Add new image keys to MANIFEST via the supervisor,
// or (preferred) generate art procedurally in src/art/.
export const MANIFEST = {
  'portrait.aaron': 'assets/portraits/aaron.jpg',
  'portrait.victoria': 'assets/portraits/victoria.jpg',
  // Tight face-only crops (little background) — best for small in-world chibi heads.
  'face.aaron': 'assets/portraits/aaron_face.jpg',
  'face.victoria': 'assets/portraits/victoria_face.jpg',
  // Transparent photo cutouts (real face + hair). Busts for cutscenes/dialog/select; full = body reference.
  'bust.aaron.smile': 'assets/cutouts/aaron_smile.png',
  'bust.victoria.smile': 'assets/cutouts/victoria_smile.png',
  'bust.victoria.neutral': 'assets/cutouts/victoria_neutral.png',
  'full.aaron.crouch': 'assets/cutouts/aaron_1_full.png',
  'full.aaron.sit': 'assets/cutouts/aaron_2_full.png',
  'full.victoria.sit': 'assets/cutouts/victoria_2_full.png',
  'full.victoria.jacket': 'assets/cutouts/victoria_3_full.png',
};

export class Assets {
  constructor() { this.images = new Map(); }

  async loadAll(manifest = MANIFEST) {
    await Promise.all(Object.entries(manifest).map(([key, url]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.images.set(key, img); resolve(); };
      img.onerror = () => { console.warn('asset failed', key, url); resolve(); };
      img.src = url;
    })));
  }

  /** Returns HTMLImageElement or undefined. Always handle undefined. */
  image(key) { return this.images.get(key); }
}

// TEMPORARY free camera for exploring the world. No UI.
//
//   left drag            orbit around what the camera is looking at
//   right drag / shift   pan
//   wheel                zoom
//   double-click         reset back to the preset's view
//
// It adds offsets on top of whatever the camera rig did this frame, so presets,
// songs and transitions keep working underneath. Remove the two lines in
// viewer.js (import + freecam.apply) to take it out.

import * as THREE from 'three';

export function createFreecam(dom, camera, getTarget) {
  const off = { az: 0, el: 0, zoom: 1, pan: new THREE.Vector3() };
  let drag = null;

  dom.addEventListener('contextmenu', (e) => e.preventDefault());
  dom.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey };
    dom.setPointerCapture(e.pointerId);
  });
  dom.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    if (drag.pan) {
      // move in screen space, scaled so the world follows the mouse
      const h = dom.clientHeight || 1;
      const unitsPerPx = (camera.top - camera.bottom) / camera.zoom / h;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      off.pan.addScaledVector(right, -dx * unitsPerPx).addScaledVector(up, dy * unitsPerPx);
    } else {
      off.az -= dx * 0.005;
      off.el += dy * 0.005;
    }
  });
  const end = () => { drag = null; };
  dom.addEventListener('pointerup', end);
  dom.addEventListener('pointercancel', end);
  dom.addEventListener('wheel', (e) => {
    e.preventDefault();
    off.zoom = Math.min(40, Math.max(0.1, off.zoom * Math.exp(-e.deltaY * 0.0015)));
  }, { passive: false });
  dom.addEventListener('dblclick', () => {
    off.az = 0; off.el = 0; off.zoom = 1; off.pan.set(0, 0, 0);
  });

  const v = new THREE.Vector3();
  const sph = new THREE.Spherical();

  // call right after rig.update()
  function apply() {
    const target = getTarget();
    v.copy(camera.position).sub(target);
    sph.setFromVector3(v);
    sph.theta += off.az;
    sph.phi = Math.min(Math.PI - 0.01, Math.max(0.01, sph.phi - off.el));
    v.setFromSpherical(sph);
    const t = target.clone().add(off.pan);
    camera.position.copy(t).add(v);
    camera.up.set(0, 1, 0);
    camera.lookAt(t);
    camera.zoom *= off.zoom;
    camera.updateProjectionMatrix();
  }

  // current offsets (world space) and a way to clear them
  function get() { return { az: off.az, el: off.el, zoom: off.zoom, pan: off.pan.clone() }; }
  function reset() { off.az = 0; off.el = 0; off.zoom = 1; off.pan.set(0, 0, 0); }

  return { apply, get, reset };
}

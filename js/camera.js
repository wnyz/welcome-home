// Camera rig: turns a preset (anchor + angles + distance + zoom) into an
// orthographic camera pose every frame, and moves between presets with a
// cinematic ease. The target is re-evaluated every frame during a transition,
// so the camera lands precisely on things that are moving (a window on a
// spinning island, a drifting point under the airplane).

import * as THREE from 'three';
import { presetById } from './presets.js';

const V3 = THREE.Vector3;
const d2r = THREE.MathUtils.degToRad;
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const llerp = (a, b, t) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);

export function createCameraRig(camera, anchors) {
  const pose = { target: new V3(0, 0.5, -1), dir: new V3(0, 0.5, 0.866).normalize(), dist: 140, zoom: 0.56 };
  const des = { target: new V3(), dir: new V3(), dist: 1, zoom: 1 };
  const q = new THREE.Quaternion();
  const p = new V3();
  let preset = presetById('overview');
  let trans = null;
  let progress = 1;

  function desired(pr, elevation, zoom, orbit, pan) {
    const a = anchors[pr.anchor] || anchors.world;
    a.updateWorldMatrix(true, false);
    p.setFromMatrixPosition(a.matrixWorld);
    if (pr.frame === 'local') a.getWorldQuaternion(q); else q.identity();
    des.target.fromArray(pr.target || [0, 0, 0]);
    if (pan) des.target.add(pan);
    des.target.applyQuaternion(q).add(p);
    const az = d2r((pr.azimuth || 0) + orbit), el = d2r(Math.min(85, Math.max(-20, elevation)));
    des.dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).applyQuaternion(q).normalize();
    des.dist = pr.distance ?? 100;
    des.zoom = Math.max(0.05, zoom);
  }

  function go(id, duration, nowSec) {
    preset = presetById(id);
    trans = {
      from: { target: pose.target.clone(), dir: pose.dir.clone(), dist: pose.dist, zoom: pose.zoom },
      start: nowSec,
      dur: Math.max(0.05, duration),
    };
    progress = 0;
  }

  function jump(id) { preset = presetById(id); trans = null; progress = 1; }

  function update(nowSec, elevation, zoom, orbit, pan) {
    desired(preset, elevation, zoom, orbit, pan);
    if (trans) {
      const t = Math.min(1, Math.max(0, (nowSec - trans.start) / trans.dur));
      const e = ease(t);
      progress = e;
      pose.target.lerpVectors(trans.from.target, des.target, e);
      pose.dir.lerpVectors(trans.from.dir, des.dir, e);
      if (pose.dir.lengthSq() < 1e-6) pose.dir.copy(des.dir);
      pose.dir.normalize();
      pose.dist = llerp(trans.from.dist, des.dist, e);
      pose.zoom = llerp(trans.from.zoom, des.zoom, e);
      if (t >= 1) trans = null;
    } else {
      pose.target.copy(des.target);
      pose.dir.copy(des.dir);
      pose.dist = des.dist;
      pose.zoom = des.zoom;
    }
    camera.position.copy(pose.target).addScaledVector(pose.dir, pose.dist);
    camera.up.set(0, 1, 0);
    camera.lookAt(pose.target);
    camera.zoom = pose.zoom;
    camera.updateProjectionMatrix();
  }

  return {
    go, jump, update, pose,
    get preset() { return preset; },
    get frameQuat() { return q; },   // the preset's frame (identity unless frame: 'local')
    get transitioning() { return !!trans; },
    get progress() { return progress; },
  };
}

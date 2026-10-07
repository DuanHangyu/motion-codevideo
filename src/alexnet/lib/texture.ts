import { useEffect, useState } from "react";
import * as THREE from "three";
import { useDelayRender } from "remotion";

const cache = new Map<string, THREE.Texture>();

const load = (url: string) =>
  new Promise<THREE.Texture>((resolve, reject) => {
    const hit = cache.get(url);
    if (hit) return resolve(hit);
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        cache.set(url, t);
        resolve(t);
      },
      undefined,
      reject,
    );
  });

/**
 * Loads textures and holds the Remotion render until they are ready.
 * Call this OUTSIDE the R3F canvas (delayRender is not bridged into it) and pass textures down as props.
 */
export const useLoadedTextures = (urls: string[]): Record<string, THREE.Texture> | null => {
  const key = urls.join("|");
  const ready = () => (urls.every((u) => cache.has(u)) ? Object.fromEntries(urls.map((u) => [u, cache.get(u)!])) : null);
  const [tex, setTex] = useState<Record<string, THREE.Texture> | null>(ready);
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => (ready() ? null : delayRender(`textures ${key}`)));
  useEffect(() => {
    if (handle === null) return;
    Promise.all(urls.map(load))
      .then((list) => {
        setTex(Object.fromEntries(urls.map((u, i) => [u, list[i]])));
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
    // urls are captured through `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, handle, continueRender, cancelRender]);
  return tex;
};

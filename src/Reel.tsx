import { ComponentType, useEffect, useState } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useDelayRender } from "remotion";
import { Flash, Grain, Vignette, useShake } from "./components/Atmosphere";
import { Hud } from "./components/Hud";
import { Subtitles } from "./components/Subtitles";
import { loadFonts } from "./lib/fonts";
import { FPS, SCENES, SceneName } from "./lib/timing";
import { INK } from "./lib/theme";
import { Code } from "./scenes/Code";
import { Cuts } from "./scenes/Cuts";
import { Finale } from "./scenes/Finale";
import { Genesis } from "./scenes/Genesis";
import { Materials } from "./scenes/Materials";
import { Opener } from "./scenes/Opener";
import { World } from "./scenes/World";

const SCENE_COMPONENTS: Record<SceneName, ComponentType> = {
  opener: Opener,
  genesis: Genesis,
  world: World,
  materials: Materials,
  code: Code,
  cuts: Cuts,
  finale: Finale,
};

const useFonts = () => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [handle] = useState(() => delayRender("loading fonts"));
  useEffect(() => {
    loadFonts()
      .then(() => continueRender(handle))
      .catch((err) => cancelRender(err));
  }, [handle, continueRender, cancelRender]);
};

export const Reel = () => {
  useFonts();
  const t = useCurrentFrame() / FPS;
  const shake = useShake();
  const active = (Object.keys(SCENES) as SceneName[]).find((n) => t >= SCENES[n][0] && t < SCENES[n][1]) ?? "finale";
  const Scene = SCENE_COMPONENTS[active];
  return (
    <AbsoluteFill style={{ background: INK, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${shake.x}px, ${shake.y}px) scale(${shake.scale})` }}>
        <Scene />
      </AbsoluteFill>
      <Flash />
      <Vignette />
      <Grain />
      <Subtitles />
      <Hud />
      <Audio src={staticFile("audio/mix.wav")} />
    </AbsoluteFill>
  );
};

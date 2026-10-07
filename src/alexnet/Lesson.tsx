import { ComponentType, useEffect, useState } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useDelayRender } from "remotion";
import { loadFonts } from "../lib/fonts";
import { ChapterCard } from "./components/ChapterCard";
import { ChapterRail, Grain, Vignette } from "./components/Frame";
import { Subtitles } from "./components/Subtitles";
import { prog } from "./lib/anim";
import { FPS, sceneAt } from "./lib/timeline";
import { BG, DIM, FONT_MONO } from "./lib/theme";
import audio from "./generated/audio.json";
import { Open } from "./scenes/Open";
import { Pixels } from "./scenes/Pixels";
import { Hand } from "./scenes/Hand";
import { Neuron } from "./scenes/Neuron";
import { Conv } from "./scenes/Conv";
import { Relu } from "./scenes/Relu";
import { Hier } from "./scenes/Hier";
import { Arch } from "./scenes/Arch";
import { Keys } from "./scenes/Keys";
import { Impact } from "./scenes/Impact";
import { Legacy } from "./scenes/Legacy";

export type SceneProps = { t: number };

const Todo = ({ t }: SceneProps) => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: FONT_MONO, color: DIM, fontSize: 30 }}>{sceneAt(t).id}</AbsoluteFill>
);

const SCENES: Record<string, ComponentType<SceneProps>> = {
  open: Open,
  pixels: Pixels,
  hand: Hand,
  neuron: Neuron,
  conv: Conv,
  relu: Relu,
  hier: Hier,
  arch: Arch,
  keys: Keys,
  impact: Impact,
  legacy: Legacy,
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

export const Lesson = () => {
  useFonts();
  const t = useCurrentFrame() / FPS;
  const s = sceneAt(t);
  const Scene = SCENES[s.id] ?? Todo;
  // every chapter fades to black over its last half second; the next one opens behind its chapter card
  const out = 1 - prog(t, s.end - 0.5, s.end);
  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: out }}>
        <Scene t={t} />
      </AbsoluteFill>
      <ChapterCard />
      <Vignette />
      <Grain />
      <ChapterRail />
      <Subtitles />
      {audio.mix && <Audio src={staticFile(audio.mix)} />}
    </AbsoluteFill>
  );
};

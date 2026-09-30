import { Composition } from "remotion";
import { Reel } from "./Reel";
import { DURATION, FPS } from "./lib/timing";

export const Root = () => (
  <Composition id="Opus55Reel" component={Reel} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
);

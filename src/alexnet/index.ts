import { Composition, registerRoot } from "remotion";
import { createElement } from "react";
import { Lesson } from "./Lesson";
import { DURATION, FPS } from "./lib/timeline";

const Root = () => createElement(Composition, { id: "AlexNet", component: Lesson, durationInFrames: DURATION, fps: FPS, width: 1920, height: 1080 });

registerRoot(Root);

import { useEffect, useRef } from "react";
import { sfx } from "../../src/alexnet/lib/sfx";
import type { Prediction } from "./zones";

const LETTER = "ABCD";

/** "Guess first": a card that rises over the paused video. */
export const PredictCard = ({ prediction, onPick }: { prediction: Prediction; onPick: (i: number) => void }) => (
  <div className="predict" role="dialog" aria-label="先猜一猜">
    <div className="mono" style={{ color: "var(--cyan)" }}>
      先猜一猜 · 答案马上揭晓
    </div>
    <h3>{prediction.prompt}</h3>
    <div className="predict-opts">
      {prediction.options.map((o, i) => (
        <button key={o} onClick={() => onPick(i)}>
          <span className="k">{LETTER[i]}</span>
          {o}
        </button>
      ))}
    </div>
  </div>
);

/** The student's guess, pinned to the corner until the lesson says the answer, then judged. */
export const PredictResult = ({ prediction, pick, revealed }: { prediction: Prediction; pick: number; revealed: boolean }) => {
  const right = pick === prediction.answer;
  const played = useRef(false);
  useEffect(() => {
    if (!revealed || played.current) return;
    played.current = true;
    if (right) sfx.chime();
    else sfx.blip(300, 0.15);
  }, [revealed, right]);
  return (
    <div className={`predict-chip${revealed ? (right ? " right" : " wrong") : ""}`}>
      {revealed ? (right ? "✓ 猜对了！" : `✗ 答案是 ${prediction.options[prediction.answer]}`) : "你的猜测"} · <b>{prediction.options[pick]}</b>
    </div>
  );
};

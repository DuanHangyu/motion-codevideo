import { ReactNode } from "react";
import { zoneFor, type LabId } from "../lesson/zones";
import { ActivationLab } from "./ActivationLab";
import { ArchLab } from "./ArchLab";
import { ConvLab } from "./ConvLab";
import { DescentLab } from "./DescentLab";
import { PixelLab } from "./PixelLab";

const LABS: Record<LabId, () => ReactNode> = {
  pixel: () => <PixelLab />,
  descent: () => <DescentLab />,
  conv: () => <ConvLab />,
  activation: () => <ActivationLab />,
  arch: () => <ArchLab />,
};

/** Full-window lab layer opened from a paused lesson. */
export const Lab = ({ id, onResume, onBack }: { id: LabId; onResume: () => void; onBack: () => void }) => {
  const zone = zoneFor(id);
  return (
    <section className="lab" role="dialog" aria-label={zone.title}>
      <header className="lab-head">
        <span className="mono">◆ 探索模式 · EXPLORE</span>
        <h2>{zone.title}</h2>
        <span style={{ color: "var(--dim)", fontSize: 14 }}>{zone.hint}</span>
        <span className="spacer" />
        <button className="btn ghost small" onClick={onBack}>
          回到课堂（保持暂停） <kbd>Esc</kbd>
        </button>
        <button className="btn primary" onClick={onResume}>
          继续播放 ▶
        </button>
      </header>
      {LABS[id]()}
    </section>
  );
};

/** Two-column lab body: the interactive stage and a side panel of controls + things to try. */
export const LabBody = ({ main, aside }: { main: ReactNode; aside: ReactNode }) => (
  <div className="lab-body">
    <div className="lab-main">{main}</div>
    <aside className="lab-aside">{aside}</aside>
  </div>
);

export const TryList = ({ items }: { items: ReactNode[] }) => (
  <>
    <h4>试一试</h4>
    <ol className="try">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ol>
  </>
);

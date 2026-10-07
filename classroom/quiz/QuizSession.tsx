import { useState } from "react";
import { useProgress, progress as store } from "../progress/store";
import { STATUS_LABEL, get, status } from "../progress/mastery";
import { nodeById } from "../map/graph";
import { Question, questionById } from "./questions";

type Props = {
  title: string;
  questionIds: string[];
  isFinal?: boolean;
  onClose: () => void;
  onReview: (q: Question) => void;
  onMap: () => void;
};

const LETTER = "ABCD";

export const QuizSession = ({ title, questionIds, isFinal, onClose, onReview, onMap }: Props) => {
  const questions = questionIds.map(questionById);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const progress = useProgress();
  const finished = index >= questions.length;

  if (finished) {
    const touched = [...new Set(questions.flatMap((q) => q.nodes))];
    return (
      <section className="panel quiz summary" role="dialog" aria-label={`${title} 结果`}>
        <div className="mono">{title} · 完成</div>
        <div className="big">
          {score}/{questions.length}
        </div>
        <div style={{ color: "var(--dim)" }}>{score === questions.length ? "全部答对，太棒了！" : "答错的题可以回到对应片段，或走进画面再探索一下。"}</div>
        <div className="summary-nodes">
          {touched.map((id) => {
            const p = get(progress, id);
            const st = status(p);
            return (
              <div key={id}>
                <span>{nodeById(id).title}</span>
                <span className={`status-chip status-${st}`}>
                  {STATUS_LABEL[st]} · {Math.round(p.score * 100)}%
                </span>
              </div>
            );
          })}
        </div>
        <div className="quiz-foot" style={{ justifyContent: "center" }}>
          {isFinal ? (
            <button className="btn primary" onClick={onMap}>
              回到知识地图，看看点亮了哪些节点 →
            </button>
          ) : (
            <>
              <button className="btn ghost" onClick={onMap}>
                查看知识地图
              </button>
              <button className="btn primary" onClick={onClose}>
                继续上课 ▶
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  const q = questions[index];
  const answered = picked !== null;
  const correct = picked === q.answer;
  const images = q.options.some((o) => o.img);

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    const ok = i === q.answer;
    if (ok) setScore((s) => s + 1);
    store.answer(q.nodes, ok);
  };

  return (
    <section className="panel quiz" role="dialog" aria-label={title}>
      <div className="quiz-head">
        <span className="mono" style={{ color: "var(--violet)" }}>
          {title} · 第 {index + 1} / {questions.length} 题
        </span>
        <div className="quiz-dots">
          {questions.map((x, i) => (
            <i key={x.id} className={i < index ? "done" : i === index ? "now" : ""} />
          ))}
        </div>
      </div>
      <h3>{q.prompt}</h3>
      {q.figure?.kernel && (
        <div className="kernel-fig">
          {q.figure.kernel.flat().map((v, i) => (
            <div key={i}>{v}</div>
          ))}
        </div>
      )}
      <div className={`opts${images ? " images" : ""}`}>
        {q.options.map((o, i) => (
          <button key={i} className={`opt${answered && i === q.answer ? " right" : ""}${answered && i === picked && !correct ? " wrong" : ""}`} onClick={() => choose(i)} disabled={answered}>
            {o.img && <img src={`/${o.img}`} alt={`选项 ${LETTER[i]}`} style={{ filter: o.imgStyle }} />}
            <span className="k">{LETTER[i]}</span>
            {!o.img && <span>{o.text}</span>}
          </button>
        ))}
      </div>
      {answered && (
        <div className={`explain ${correct ? "ok" : "no"}`}>
          <b>{correct ? "✓ 回答正确" : `✗ 正确答案是 ${LETTER[q.answer]}`}</b>
          {q.explain}
        </div>
      )}
      <div className="quiz-foot">
        {answered && !correct && (
          <button className="btn" onClick={() => onReview(q)}>
            {q.review.world ? "◆ 走进画面再探索" : "↺ 回到讲解片段"}
          </button>
        )}
        {answered && (
          <button
            className="btn primary"
            onClick={() => {
              setIndex(index + 1);
              setPicked(null);
            }}
          >
            {index + 1 < questions.length ? "下一题 →" : "查看结果"}
          </button>
        )}
      </div>
    </section>
  );
};

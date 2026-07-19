export const AI_ACTIVITY_STEPS = [
  "正在理解问题…",
  "正在检索校本知识库…",
  "正在核对资料来源…",
  "正在组织回答…",
];

export function startAiActivity(
  setActivity: (message: string) => void,
): () => void {
  setActivity(AI_ACTIVITY_STEPS[0]);
  const timers = AI_ACTIVITY_STEPS.slice(1).map((message, index) =>
    window.setTimeout(() => setActivity(message), 420 * (index + 1)),
  );
  return () => timers.forEach((timer) => window.clearTimeout(timer));
}

export interface TypewriterStream {
  append: (text: string) => void;
  finish: () => Promise<void>;
  cancel: (flush?: boolean) => void;
  stop: () => string;
  current: () => string;
  isStopped: () => boolean;
}

export function createTypewriterStream(
  onUpdate: (content: string) => void,
  initialDelay = 1350,
  characterInterval = 10,
): TypewriterStream {
  const target: string[] = [];
  let displayedLength = 0;
  let ended = false;
  let stopped = false;
  let timer: number | undefined;
  let startTimer: number | undefined;
  let resolveFinished: (() => void) | undefined;
  const startedAt = Date.now();

  const completeIfReady = () => {
    if (ended && displayedLength >= target.length) {
      if (startTimer !== undefined) window.clearTimeout(startTimer);
      if (timer !== undefined) window.clearInterval(timer);
      startTimer = undefined;
      timer = undefined;
      resolveFinished?.();
      resolveFinished = undefined;
    }
  };

  const start = () => {
    if (timer !== undefined) return;
    timer = window.setInterval(() => {
      if (displayedLength < target.length) {
        displayedLength += 1;
        onUpdate(target.slice(0, displayedLength).join(""));
      }
      completeIfReady();
    }, characterInterval);
  };

  const ensureStarted = () => {
    if (timer !== undefined || startTimer !== undefined) return;
    const remainingDelay = Math.max(0, initialDelay - (Date.now() - startedAt));
    if (remainingDelay === 0) {
      start();
      return;
    }
    startTimer = window.setTimeout(() => {
      startTimer = undefined;
      start();
    }, remainingDelay);
  };

  return {
    append(text) {
      if (stopped) return;
      target.push(...Array.from(text));
      ensureStarted();
    },
    finish() {
      ended = true;
      ensureStarted();
      completeIfReady();
      if (displayedLength >= target.length) return Promise.resolve();
      return new Promise<void>((resolve) => {
        resolveFinished = resolve;
      });
    },
    cancel(flush = false) {
      if (startTimer !== undefined) window.clearTimeout(startTimer);
      if (timer !== undefined) window.clearInterval(timer);
      startTimer = undefined;
      timer = undefined;
      if (flush && displayedLength < target.length) {
        displayedLength = target.length;
        onUpdate(target.join(""));
      }
      resolveFinished?.();
      resolveFinished = undefined;
    },
    stop() {
      stopped = true;
      ended = true;
      if (startTimer !== undefined) window.clearTimeout(startTimer);
      if (timer !== undefined) window.clearInterval(timer);
      startTimer = undefined;
      timer = undefined;
      target.splice(displayedLength);
      resolveFinished?.();
      resolveFinished = undefined;
      return target.join("");
    },
    current() {
      return target.slice(0, displayedLength).join("");
    },
    isStopped() {
      return stopped;
    },
  };
}

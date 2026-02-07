export function createScheduler({ onTick }) {
  const timers = new Map(); // key -> intervalId

  function schedule(key, everyMs) {
    if (timers.has(key)) clearInterval(timers.get(key));
    const id = setInterval(() => onTick(key).catch(() => {}), Math.max(1000, Number(everyMs) || 60000));
    timers.set(key, id);
  }

  function clear(key) {
    if (!timers.has(key)) return;
    clearInterval(timers.get(key));
    timers.delete(key);
  }

  function stopAll() {
    for (const id of timers.values()) clearInterval(id);
    timers.clear();
  }

  return { schedule, clear, stopAll };
}



export function createQueue() {
  const q = [];
  let running = false;

  async function runNext() {
    if (running) return;
    const job = q.shift();
    if (!job) return;
    running = true;
    try { await job(); } catch (e) { /* swallow to keep queue alive */ }
    running = false;
    setImmediate(runNext);
  }

  function add(job) {
    q.push(job);
    setImmediate(runNext);
  }

  return { add };
}



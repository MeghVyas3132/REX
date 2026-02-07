export function createAgentRunsRepository({ pool }) {
  const memRuns = new Map();
  const memMessages = new Map(); // runId -> [messages]

  function genId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  }

  async function createRun(agentId, input) {
    const id = genId('arun');
    const nowIso = new Date().toISOString();
    if (!pool) {
      const run = { id, agent_id: agentId, status: 'queued', input, output: null, error: null, created_at: nowIso, updated_at: nowIso };
      memRuns.set(id, run);
      return run;
    }
    const { rows } = await pool.query(`insert into agent_runs (id, agent_id, status, input) values ($1,$2,'queued',$3) returning *`, [id, agentId, JSON.stringify(input)]);
    return rows[0];
  }

  async function updateRun(id, { status, output, error }) {
    if (!pool) {
      const cur = memRuns.get(id);
      if (!cur) return null;
      const next = { ...cur, status: status ?? cur.status, output: output ?? cur.output, error: error ?? cur.error, updated_at: new Date().toISOString() };
      memRuns.set(id, next);
      return next;
    }
    const { rows } = await pool.query(
      `update agent_runs set status = coalesce($2, status), output = coalesce($3, output), error = coalesce($4, error), updated_at = now() where id = $1 returning *`,
      [id, status ?? null, output === undefined ? null : JSON.stringify(output), error ?? null]
    );
    return rows[0] || null;
  }

  async function getRun(id) {
    if (!pool) return memRuns.get(id) || null;
    const { rows } = await pool.query('select * from agent_runs where id = $1', [id]);
    return rows[0] || null;
  }

  async function listMessages(runId) {
    if (!pool) return memMessages.get(runId) || [];
    const { rows } = await pool.query('select * from agent_messages where run_id = $1 order by created_at asc', [runId]);
    return rows;
  }

  async function appendMessage(runId, role, content) {
    if (!pool) {
      const msg = { id: Date.now(), run_id: runId, role, content, created_at: new Date().toISOString() };
      const arr = memMessages.get(runId) || [];
      arr.push(msg);
      memMessages.set(runId, arr);
      return msg;
    }
    const { rows } = await pool.query(`insert into agent_messages (run_id, role, content) values ($1,$2,$3) returning *`, [runId, role, JSON.stringify(content)]);
    return rows[0];
  }

  return { createRun, updateRun, getRun, listMessages, appendMessage };
}



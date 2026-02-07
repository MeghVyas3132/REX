export function createAgentsRepository({ pool }) {
  const memAgents = new Map();

  function parseTools(value) {
    if (Array.isArray(value)) return value;
    try { return value ? JSON.parse(value) : []; } catch { return []; }
  }

  async function listAgents() {
    if (!pool) return Array.from(memAgents.values());
    const { rows } = await pool.query('select * from agents order by created_at desc');
    return rows.map(r => ({ ...r, tools: parseTools(r.tools) }));
  }

  async function getAgent(id) {
    if (!pool) return memAgents.get(id) || null;
    const { rows } = await pool.query('select * from agents where id = $1', [id]);
    const r = rows[0];
    return r ? { ...r, tools: parseTools(r.tools) } : null;
  }

  function genId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  }

  async function createAgent(body) {
    const id = body.id || genId('agent');
    const name = body.name || 'Agent';
    const model = body.model || 'gpt-4o-mini';
    const instructions = body.instructions || null;
    const tools = Array.isArray(body.tools) ? body.tools : [];
    if (!pool) {
      const now = new Date().toISOString();
      const a = { id, name, model, instructions, tools, created_at: now, updated_at: now };
      memAgents.set(id, a);
      return a;
    }
    const { rows } = await pool.query(
      `insert into agents (id, name, model, instructions, tools) values ($1,$2,$3,$4,$5)
       on conflict (id) do update set name = excluded.name, model = excluded.model, instructions = excluded.instructions, tools = excluded.tools, updated_at = now()
       returning *`,
      [id, name, model, instructions, JSON.stringify(tools)]
    );
    const r = rows[0];
    return { ...r, tools: parseTools(r.tools) };
  }

  async function updateAgent(id, patch) {
    if (!pool) {
      const cur = memAgents.get(id);
      if (!cur) return null;
      const next = { ...cur, ...patch, tools: patch.tools ?? cur.tools, updated_at: new Date().toISOString() };
      memAgents.set(id, next);
      return next;
    }
    const { rows } = await pool.query(
      `update agents set
        name = coalesce($2, name),
        model = coalesce($3, model),
        instructions = coalesce($4, instructions),
        tools = coalesce($5, tools),
        updated_at = now()
       where id = $1 returning *`,
      [id, patch.name ?? null, patch.model ?? null, patch.instructions ?? null, patch.tools ? JSON.stringify(patch.tools) : null]
    );
    const r = rows[0];
    return r ? { ...r, tools: parseTools(r.tools) } : null;
  }

  async function deleteAgent(id) {
    if (!pool) return memAgents.delete(id);
    const { rowCount } = await pool.query('delete from agents where id = $1', [id]);
    return rowCount > 0;
  }

  return { listAgents, getAgent, createAgent, updateAgent, deleteAgent };
}



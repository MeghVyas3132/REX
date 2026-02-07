class WorkflowRun {
  constructor(data) {
    this.id = data.id;
    this.workflowId = data.workflowId;
    this.status = data.status || 'pending'; // pending, running, completed, failed, cancelled
    this.input = data.input || {};
    this.output = data.output;
    this.error = data.error;
    this.nodeResults = data.nodeResults || {};
    this.executionOrder = data.executionOrder || [];
    this.nodeOutputs = data.nodeOutputs || {};
    this.runOptions = data.runOptions || {};
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.duration = data.duration;
    this.userId = data.userId;
    this.createdAt = data.createdAt;
  }

  static fromDbRow(row) {
    return new WorkflowRun({
      id: row.id,
      workflowId: row.workflow_id,
      status: row.status,
      input: row.input ? JSON.parse(row.input) : {},
      output: row.output ? JSON.parse(row.output) : null,
      error: row.error,
      nodeResults: row.node_results ? JSON.parse(row.node_results) : {},
      executionOrder: row.execution_order ? JSON.parse(row.execution_order) : [],
      nodeOutputs: row.node_outputs ? JSON.parse(row.node_outputs) : {},
      runOptions: row.run_options ? JSON.parse(row.run_options) : {},
      startedAt: row.started_at,
      completedAt: row.completed_at,
      duration: row.duration,
      userId: row.user_id,
      createdAt: row.created_at
    });
  }

  toDbRow() {
    return {
      id: this.id,
      workflow_id: this.workflowId,
      status: this.status,
      input: JSON.stringify(this.input),
      output: this.output ? JSON.stringify(this.output) : null,
      error: this.error,
      node_results: JSON.stringify(this.nodeResults),
      execution_order: JSON.stringify(this.executionOrder),
      node_outputs: JSON.stringify(this.nodeOutputs),
      run_options: JSON.stringify(this.runOptions),
      started_at: this.startedAt,
      completed_at: this.completedAt,
      duration: this.duration,
      user_id: this.userId,
      created_at: this.createdAt
    };
  }

  calculateDuration() {
    if (this.startedAt && this.completedAt) {
      const start = new Date(this.startedAt);
      const end = new Date(this.completedAt);
      this.duration = end - start;
    }
    return this.duration;
  }

  isCompleted() {
    return ['completed', 'failed', 'cancelled'].includes(this.status);
  }

  isRunning() {
    return this.status === 'running';
  }
}

module.exports = WorkflowRun;

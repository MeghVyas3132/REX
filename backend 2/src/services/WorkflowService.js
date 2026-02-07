const { getPool } = require('../config/database');
const Workflow = require('../models/Workflow');
const WorkflowRun = require('../models/WorkflowRun');
const logger = require('../utils/logger');

class WorkflowService {
  constructor() {
    this.pool = getPool();
  }

  async createWorkflow(workflowData) {
    try {
      const workflow = new Workflow({
        ...workflowData,
        id: workflowData.id || `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const validation = workflow.validate();
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      if (!this.pool) {
        // In-memory fallback
        return workflow;
      }

      const query = `
        INSERT INTO workflows (id, name, description, nodes, edges, settings, is_active, user_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        workflow.id,
        workflow.name,
        workflow.description,
        JSON.stringify(workflow.nodes),
        JSON.stringify(workflow.edges),
        JSON.stringify(workflow.settings),
        workflow.isActive,
        workflow.userId,
        workflow.createdAt,
        workflow.updatedAt
      ];

      const result = await this.pool.query(query, values);
      return Workflow.fromDbRow(result.rows[0]);
    } catch (error) {
      logger.error('Error creating workflow:', error);
      throw error;
    }
  }

  async getWorkflow(id) {
    try {
      if (!this.pool) {
        return null; // In-memory mode
      }

      const query = 'SELECT * FROM workflows WHERE id = $1';
      const result = await this.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return Workflow.fromDbRow(result.rows[0]);
    } catch (error) {
      logger.error('Error getting workflow:', error);
      throw error;
    }
  }

  async updateWorkflow(id, updateData) {
    try {
      const workflow = await this.getWorkflow(id);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const updatedWorkflow = new Workflow({
        ...workflow,
        ...updateData,
        id,
        updatedAt: new Date().toISOString()
      });

      const validation = updatedWorkflow.validate();
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      if (!this.pool) {
        return updatedWorkflow;
      }

      const query = `
        UPDATE workflows 
        SET name = $2, description = $3, nodes = $4, edges = $5, settings = $6, is_active = $7, updated_at = $8
        WHERE id = $1
        RETURNING *
      `;
      
      const values = [
        id,
        updatedWorkflow.name,
        updatedWorkflow.description,
        JSON.stringify(updatedWorkflow.nodes),
        JSON.stringify(updatedWorkflow.edges),
        JSON.stringify(updatedWorkflow.settings),
        updatedWorkflow.isActive,
        updatedWorkflow.updatedAt
      ];

      const result = await this.pool.query(query, values);
      return Workflow.fromDbRow(result.rows[0]);
    } catch (error) {
      logger.error('Error updating workflow:', error);
      throw error;
    }
  }

  async deleteWorkflow(id) {
    try {
      if (!this.pool) {
        return false;
      }

      const query = 'DELETE FROM workflows WHERE id = $1';
      const result = await this.pool.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error deleting workflow:', error);
      throw error;
    }
  }

  async listWorkflows(userId = null, limit = 100, offset = 0) {
    try {
      if (!this.pool) {
        return [];
      }

      let query = 'SELECT * FROM workflows';
      const params = [];
      
      if (userId) {
        query += ' WHERE user_id = $1';
        params.push(userId);
      }
      
      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);

      const result = await this.pool.query(query, params);
      return result.rows.map(row => Workflow.fromDbRow(row));
    } catch (error) {
      logger.error('Error listing workflows:', error);
      throw error;
    }
  }

  async createWorkflowRun(runData) {
    try {
      const run = new WorkflowRun({
        ...runData,
        id: runData.id || `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString()
      });

      if (!this.pool) {
        return run;
      }

      const query = `
        INSERT INTO workflow_runs (id, workflow_id, status, input, run_options, started_at, user_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        run.id,
        run.workflowId,
        run.status,
        JSON.stringify(run.input),
        JSON.stringify(run.runOptions),
        run.startedAt,
        run.userId,
        run.createdAt
      ];

      const result = await this.pool.query(query, values);
      return WorkflowRun.fromDbRow(result.rows[0]);
    } catch (error) {
      logger.error('Error creating workflow run:', error);
      throw error;
    }
  }

  async updateWorkflowRun(id, updateData) {
    try {
      if (!this.pool) {
        return null;
      }

      const query = `
        UPDATE workflow_runs 
        SET status = $2, output = $3, error = $4, node_results = $5, execution_order = $6, node_outputs = $7, completed_at = $8, duration = $9
        WHERE id = $1
        RETURNING *
      `;
      
      const values = [
        id,
        updateData.status,
        updateData.output ? JSON.stringify(updateData.output) : null,
        updateData.error,
        updateData.nodeResults ? JSON.stringify(updateData.nodeResults) : null,
        updateData.executionOrder ? JSON.stringify(updateData.executionOrder) : null,
        updateData.nodeOutputs ? JSON.stringify(updateData.nodeOutputs) : null,
        updateData.completedAt,
        updateData.duration
      ];

      const result = await this.pool.query(query, values);
      return result.rows.length > 0 ? WorkflowRun.fromDbRow(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error updating workflow run:', error);
      throw error;
    }
  }

  async getWorkflowRun(id) {
    try {
      if (!this.pool) {
        return null;
      }

      const query = 'SELECT * FROM workflow_runs WHERE id = $1';
      const result = await this.pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return WorkflowRun.fromDbRow(result.rows[0]);
    } catch (error) {
      logger.error('Error getting workflow run:', error);
      throw error;
    }
  }

  async listWorkflowRuns(workflowId = null, userId = null, limit = 100, offset = 0) {
    try {
      if (!this.pool) {
        return [];
      }

      let query = 'SELECT * FROM workflow_runs';
      const params = [];
      const conditions = [];
      
      if (workflowId) {
        conditions.push('workflow_id = $' + (params.length + 1));
        params.push(workflowId);
      }
      
      if (userId) {
        conditions.push('user_id = $' + (params.length + 1));
        params.push(userId);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(limit, offset);

      const result = await this.pool.query(query, params);
      return result.rows.map(row => WorkflowRun.fromDbRow(row));
    } catch (error) {
      logger.error('Error listing workflow runs:', error);
      throw error;
    }
  }
}

module.exports = WorkflowService;

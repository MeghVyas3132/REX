// Simple in-memory database for development
class SimpleDatabase {
  constructor() {
    this.users = new Map();
    this.workflows = new Map();
    this.workflowRuns = new Map();
    this.credentials = new Map();
    this.webhooks = new Map();
  }

  // User operations
  createUser(userData) {
    const user = {
      id: `user_${Date.now()}`,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  findUserByEmail(email) {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  findUserById(id) {
    return this.users.get(id) || null;
  }

  // Workflow operations
  createWorkflow(workflowData) {
    const workflow = {
      id: `workflow_${Date.now()}`,
      ...workflowData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  getWorkflows() {
    return Array.from(this.workflows.values());
  }

  getWorkflowById(id) {
    return this.workflows.get(id) || null;
  }

  updateWorkflow(id, data) {
    const workflow = this.workflows.get(id);
    if (workflow) {
      Object.assign(workflow, data, { updatedAt: new Date() });
      return workflow;
    }
    return null;
  }

  deleteWorkflow(id) {
    return this.workflows.delete(id);
  }

  // Workflow Run operations
  createWorkflowRun(runData) {
    const run = {
      id: `run_${Date.now()}`,
      ...runData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.workflowRuns.set(run.id, run);
    return run;
  }

  getWorkflowRunById(id) {
    return this.workflowRuns.get(id) || null;
  }

  updateWorkflowRun(id, data) {
    const run = this.workflowRuns.get(id);
    if (run) {
      Object.assign(run, data, { updatedAt: new Date() });
      return run;
    }
    return null;
  }

  // Credential operations
  createCredential(credentialData) {
    const credential = {
      id: `cred_${Date.now()}`,
      ...credentialData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.credentials.set(credential.id, credential);
    return credential;
  }

  getCredentialsByUserId(userId) {
    return Array.from(this.credentials.values()).filter(c => c.userId === userId);
  }

  // Webhook operations
  createWebhook(webhookData) {
    const webhook = {
      id: `webhook_${Date.now()}`,
      ...webhookData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.webhooks.set(webhook.id, webhook);
    return webhook;
  }

  getWebhooksByWorkflowId(workflowId) {
    return Array.from(this.webhooks.values()).filter(w => w.workflowId === workflowId);
  }
}

// Export singleton instance
const database = new SimpleDatabase();
module.exports = database;

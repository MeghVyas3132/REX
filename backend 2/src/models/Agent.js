class Agent {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.model = data.model || 'gpt-4o-mini';
    this.instructions = data.instructions;
    this.tools = data.tools || [];
    this.settings = data.settings || {};
    this.isActive = data.isActive || false;
    this.userId = data.userId;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static fromDbRow(row) {
    return new Agent({
      id: row.id,
      name: row.name,
      description: row.description,
      model: row.model,
      instructions: row.instructions,
      tools: row.tools ? JSON.parse(row.tools) : [],
      settings: row.settings ? JSON.parse(row.settings) : {},
      isActive: row.is_active,
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  toDbRow() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      model: this.model,
      instructions: this.instructions,
      tools: JSON.stringify(this.tools),
      settings: JSON.stringify(this.settings),
      is_active: this.isActive,
      user_id: this.userId,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  validate() {
    const errors = [];
    
    if (!this.name || this.name.trim().length === 0) {
      errors.push('Name is required');
    }
    
    if (!this.model || this.model.trim().length === 0) {
      errors.push('Model is required');
    }
    
    if (!Array.isArray(this.tools)) {
      errors.push('Tools must be an array');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = Agent;

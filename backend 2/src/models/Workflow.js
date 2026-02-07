class Workflow {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.nodes = data.nodes || [];
    this.edges = data.edges || [];
    this.settings = data.settings || {};
    this.isActive = data.isActive || false;
    this.userId = data.userId;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static fromDbRow(row) {
    return new Workflow({
      id: row.id,
      name: row.name,
      description: row.description,
      nodes: row.nodes ? JSON.parse(row.nodes) : [],
      edges: row.edges ? JSON.parse(row.edges) : [],
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
      nodes: JSON.stringify(this.nodes),
      edges: JSON.stringify(this.edges),
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
    
    if (!Array.isArray(this.nodes)) {
      errors.push('Nodes must be an array');
    }
    
    if (!Array.isArray(this.edges)) {
      errors.push('Edges must be an array');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = Workflow;

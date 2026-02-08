import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class GitHubNode {
  getNodeDefinition() {
    return {
      id: 'github',
      type: 'action',
      name: 'GitHub',
      description: 'Interact with GitHub repositories and API',
      category: 'development',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'token',
          type: 'string',
          displayName: 'Access Token',
          description: 'GitHub Personal Access Token',
          required: true,
          placeholder: 'ghp_xxxxxxxxxxxx',
          credentialType: 'github_token'
        },
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'GitHub operation to perform',
          required: true,
          default: 'getRepository',
          options: [
            { name: 'Get Repository', value: 'getRepository' },
            { name: 'List Repositories', value: 'listRepositories' },
            { name: 'Create Repository', value: 'createRepository' },
            { name: 'Get Issues', value: 'getIssues' },
            { name: 'Create Issue', value: 'createIssue' },
            { name: 'Get Pull Requests', value: 'getPullRequests' },
            { name: 'Create Pull Request', value: 'createPullRequest' },
            { name: 'Get Commits', value: 'getCommits' },
            { name: 'Get File Contents', value: 'getFileContents' },
            { name: 'Create File', value: 'createFile' },
            { name: 'Update File', value: 'updateFile' },
            { name: 'Delete File', value: 'deleteFile' },
            { name: 'Get User', value: 'getUser' },
            { name: 'Search Repositories', value: 'searchRepositories' },
            { name: 'Get Releases', value: 'getReleases' },
            { name: 'Create Release', value: 'createRelease' }
          ]
        },
        {
          name: 'owner',
          type: 'string',
          displayName: 'Owner',
          description: 'Repository owner (username or organization)',
          required: false,
          placeholder: 'octocat'
        },
        {
          name: 'repo',
          type: 'string',
          displayName: 'Repository',
          description: 'Repository name',
          required: false,
          placeholder: 'Hello-World'
        },
        {
          name: 'repositoryName',
          type: 'string',
          displayName: 'Repository Name',
          description: 'Name for new repository',
          required: false,
          placeholder: 'my-new-repo'
        },
        {
          name: 'description',
          type: 'string',
          displayName: 'Description',
          description: 'Repository description',
          required: false,
          placeholder: 'A sample repository'
        },
        {
          name: 'private',
          type: 'boolean',
          displayName: 'Private',
          description: 'Make repository private',
          required: false,
          default: false
        },
        {
          name: 'issueTitle',
          type: 'string',
          displayName: 'Issue Title',
          description: 'Title for the issue',
          required: false,
          placeholder: 'Bug: Something is broken'
        },
        {
          name: 'issueBody',
          type: 'string',
          displayName: 'Issue Body',
          description: 'Body content for the issue',
          required: false,
          placeholder: 'Describe the issue...'
        },
        {
          name: 'issueLabels',
          type: 'string',
          displayName: 'Issue Labels',
          description: 'Comma-separated labels',
          required: false,
          placeholder: 'bug,urgent'
        },
        {
          name: 'prTitle',
          type: 'string',
          displayName: 'Pull Request Title',
          description: 'Title for the pull request',
          required: false,
          placeholder: 'Add new feature'
        },
        {
          name: 'prBody',
          type: 'string',
          displayName: 'Pull Request Body',
          description: 'Body content for the pull request',
          required: false,
          placeholder: 'Describe the changes...'
        },
        {
          name: 'head',
          type: 'string',
          displayName: 'Head Branch',
          description: 'Source branch for pull request',
          required: false,
          placeholder: 'feature-branch'
        },
        {
          name: 'base',
          type: 'string',
          displayName: 'Base Branch',
          description: 'Target branch for pull request',
          required: false,
          placeholder: 'main',
          default: 'main'
        },
        {
          name: 'path',
          type: 'string',
          displayName: 'File Path',
          description: 'Path to file in repository',
          required: false,
          placeholder: 'src/index.js'
        },
        {
          name: 'content',
          type: 'string',
          displayName: 'File Content',
          description: 'Content for the file',
          required: false,
          placeholder: 'console.log("Hello World");'
        },
        {
          name: 'message',
          type: 'string',
          displayName: 'Commit Message',
          description: 'Commit message for file operations',
          required: false,
          placeholder: 'Add new file'
        },
        {
          name: 'branch',
          type: 'string',
          displayName: 'Branch',
          description: 'Branch name for file operations',
          required: false,
          placeholder: 'main',
          default: 'main'
        },
        {
          name: 'username',
          type: 'string',
          displayName: 'Username',
          description: 'GitHub username to get user info',
          required: false,
          placeholder: 'octocat'
        },
        {
          name: 'query',
          type: 'string',
          displayName: 'Search Query',
          description: 'Search query for repositories',
          required: false,
          placeholder: 'language:javascript stars:>1000'
        },
        {
          name: 'sort',
          type: 'options',
          displayName: 'Sort By',
          description: 'Sort order for search results',
          required: false,
          default: 'stars',
          options: [
            { name: 'Stars', value: 'stars' },
            { name: 'Forks', value: 'forks' },
            { name: 'Updated', value: 'updated' }
          ]
        },
        {
          name: 'perPage',
          type: 'string',
          displayName: 'Per Page',
          description: 'Number of results per page',
          required: false,
          placeholder: '10',
          default: '10'
        },
        {
          name: 'state',
          type: 'options',
          displayName: 'State',
          description: 'State filter for issues and PRs',
          required: false,
          default: 'open',
          options: [
            { name: 'Open', value: 'open' },
            { name: 'Closed', value: 'closed' },
            { name: 'All', value: 'all' }
          ]
        }
      ],
      inputs: [
        { name: 'owner', type: 'string', description: 'Owner from previous node', required: false },
        { name: 'repo', type: 'string', description: 'Repository from previous node', required: false },
        { name: 'content', type: 'string', description: 'Content from previous node', required: false }
      ],
      outputs: [
        { name: 'data', type: 'object', description: 'GitHub API response data' },
        { name: 'url', type: 'string', description: 'GitHub URL' },
        { name: 'id', type: 'string', description: 'GitHub object ID' }
      ]
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.token && !context.input?.token) {
      throw new Error('Required parameter "token" is missing');
    }
    if (!config.operation && !context.input?.operation) {
      throw new Error('Required parameter "operation" is missing');
    }

    
    try {

      const { 
        token, 
        operation,
        owner,
        repo,
        repositoryName,
        description,
        private: isPrivate,
        issueTitle,
        issueBody,
        issueLabels,
        prTitle,
        prBody,
        head,
        base,
        path,
        content,
        message,
        branch,
        username,
        query,
        sort,
        perPage,
        state
      } = config;
      
      const inputOwner = context.input?.owner || owner;
      const inputRepo = context.input?.repo || repo;
      const inputContent = context.input?.content || content;

      if (!token) {
        throw new Error('GitHub token is required');
      }

      let result: any = {};

      switch (operation) {
        case 'getRepository':
          result = await this.getRepository(token, inputOwner, inputRepo);
          break;
        case 'listRepositories':
          result = await this.listRepositories(token, perPage);
          break;
        case 'createRepository':
          result = await this.createRepository(token, repositoryName, description, isPrivate);
          break;
        case 'getIssues':
          result = await this.getIssues(token, inputOwner, inputRepo, state, perPage);
          break;
        case 'createIssue':
          result = await this.createIssue(token, inputOwner, inputRepo, issueTitle, issueBody, issueLabels);
          break;
        case 'getPullRequests':
          result = await this.getPullRequests(token, inputOwner, inputRepo, state, perPage);
          break;
        case 'createPullRequest':
          result = await this.createPullRequest(token, inputOwner, inputRepo, prTitle, prBody, head, base);
          break;
        case 'getCommits':
          result = await this.getCommits(token, inputOwner, inputRepo, perPage);
          break;
        case 'getFileContents':
          result = await this.getFileContents(token, inputOwner, inputRepo, path, branch);
          break;
        case 'createFile':
          result = await this.createFile(token, inputOwner, inputRepo, path, inputContent, message, branch);
          break;
        case 'updateFile':
          result = await this.updateFile(token, inputOwner, inputRepo, path, inputContent, message, branch);
          break;
        case 'deleteFile':
          result = await this.deleteFile(token, inputOwner, inputRepo, path, message, branch);
          break;
        case 'getUser':
          result = await this.getUser(token, username);
          break;
        case 'searchRepositories':
          result = await this.searchRepositories(token, query, sort, perPage);
          break;
        case 'getReleases':
          result = await this.getReleases(token, inputOwner, inputRepo, perPage);
          break;
        case 'createRelease':
          result = await this.createRelease(token, inputOwner, inputRepo, issueTitle, issueBody);
          break;
        default:
          throw new Error(`Unsupported GitHub operation: ${operation}`);
      }

      const duration = Date.now() - startTime;
      
      logger.info('GitHub node executed successfully', {
        operation,
        owner: inputOwner,
        repo: inputRepo,
        duration
      });

      return {
        success: true,
        output: {
          output: result,
          url: this.getGitHubUrl(operation, result, inputOwner, inputRepo),
          id: result.id || result.number || result.sha,
          operation,
          timestamp: new Date().toISOString(),
          duration
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('GitHub node execution failed', {
        error: error.message,
        operation: config.operation,
        duration
      });

      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }

  private async getRepository(token: string, owner?: string, repo?: string) {
    if (!owner || !repo) {
      throw new Error('Owner and repository are required');
    }

    const url = `https://api.github.com/repos/${owner}/${repo}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async listRepositories(token: string, perPage?: string) {
    const url = `https://api.github.com/user/repos?per_page=${perPage || '10'}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async createRepository(token: string, name?: string, description?: string, isPrivate?: boolean) {
    if (!name) {
      throw new Error('Repository name is required');
    }

    const url = 'https://api.github.com/user/repos';
    
    const payload = {
      name,
      description: description || '',
      private: isPrivate || false
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async getIssues(token: string, owner?: string, repo?: string, state?: string, perPage?: string) {
    if (!owner || !repo) {
      throw new Error('Owner and repository are required');
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=${state || 'open'}&per_page=${perPage || '10'}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async createIssue(token: string, owner?: string, repo?: string, title?: string, body?: string, labels?: string) {
    if (!owner || !repo || !title) {
      throw new Error('Owner, repository, and title are required');
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/issues`;
    
    const payload: any = {
      title,
      body: body || ''
    };

    if (labels) {
      payload.labels = labels.split(',').map(label => label.trim());
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async getPullRequests(token: string, owner?: string, repo?: string, state?: string, perPage?: string) {
    if (!owner || !repo) {
      throw new Error('Owner and repository are required');
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state || 'open'}&per_page=${perPage || '10'}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async createPullRequest(token: string, owner?: string, repo?: string, title?: string, body?: string, head?: string, base?: string) {
    if (!owner || !repo || !title || !head || !base) {
      throw new Error('Owner, repository, title, head, and base are required');
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/pulls`;
    
    const payload = {
      title,
      body: body || '',
      head,
      base
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async getCommits(token: string, owner?: string, repo?: string, perPage?: string) {
    if (!owner || !repo) {
      throw new Error('Owner and repository are required');
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage || '10'}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async getFileContents(token: string, owner?: string, repo?: string, path?: string, branch?: string) {
    if (!owner || !repo || !path) {
      throw new Error('Owner, repository, and path are required');
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch || 'main'}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async createFile(token: string, owner?: string, repo?: string, path?: string, content?: string, message?: string, branch?: string) {
    if (!owner || !repo || !path || !content || !message) {
      throw new Error('Owner, repository, path, content, and message are required');
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    const payload = {
      message,
      content: Buffer.from(content).toString('base64'),
      branch: branch || 'main'
    };

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async updateFile(token: string, owner?: string, repo?: string, path?: string, content?: string, message?: string, branch?: string) {
    if (!owner || !repo || !path || !content || !message) {
      throw new Error('Owner, repository, path, content, and message are required');
    }

    // First get the current file to get the SHA
    const currentFile = await this.getFileContents(token, owner, repo, path, branch);
    
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    const payload = {
      message,
      content: Buffer.from(content).toString('base64'),
      sha: currentFile.sha,
      branch: branch || 'main'
    };

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async deleteFile(token: string, owner?: string, repo?: string, path?: string, message?: string, branch?: string) {
    if (!owner || !repo || !path || !message) {
      throw new Error('Owner, repository, path, and message are required');
    }

    // First get the current file to get the SHA
    const currentFile = await this.getFileContents(token, owner, repo, path, branch);
    
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    const payload = {
      message,
      sha: currentFile.sha,
      branch: branch || 'main'
    };

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async getUser(token: string, username?: string) {
    if (!username) {
      throw new Error('Username is required');
    }

    const url = `https://api.github.com/users/${username}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async searchRepositories(token: string, query?: string, sort?: string, perPage?: string) {
    if (!query) {
      throw new Error('Search query is required');
    }

    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=${sort || 'stars'}&per_page=${perPage || '10'}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async getReleases(token: string, owner?: string, repo?: string, perPage?: string) {
    if (!owner || !repo) {
      throw new Error('Owner and repository are required');
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=${perPage || '10'}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private async createRelease(token: string, owner?: string, repo?: string, tagName?: string, body?: string) {
    if (!owner || !repo || !tagName) {
      throw new Error('Owner, repository, and tag name are required');
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/releases`;
    
    const payload = {
      tag_name: tagName,
      name: tagName,
      body: body || '',
      draft: false,
      prerelease: false
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${error}`);
    }

    return await response.json();
  }

  private getGitHubUrl(operation: string, result: any, owner?: string, repo?: string): string {
    const baseUrl = 'https://github.com';
    
    switch (operation) {
      case 'getRepository':
      case 'createRepository':
        return `${baseUrl}/${owner}/${repo}`;
      case 'createIssue':
      case 'getIssues':
        return `${baseUrl}/${owner}/${repo}/issues/${result.number}`;
      case 'createPullRequest':
      case 'getPullRequests':
        return `${baseUrl}/${owner}/${repo}/pull/${result.number}`;
      case 'getFileContents':
      case 'createFile':
      case 'updateFile':
        return `${baseUrl}/${owner}/${repo}/blob/${result.commit?.sha || 'main'}/${result.content?.path}`;
      case 'getUser':
        return `${baseUrl}/${result.login}`;
      case 'getReleases':
      case 'createRelease':
        return `${baseUrl}/${owner}/${repo}/releases/tag/${result.tag_name}`;
      default:
        return baseUrl;
    }
  }}


export default GitHubNode;
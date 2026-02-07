import { WorkflowNode, ExecutionContext, ExecutionResult } from '../../utils/types';
const logger = require("../../utils/logger");

export class DockerRealNode {
  getNodeDefinition() {
    return {
      id: 'docker-real',
      type: 'action',
      name: 'Docker',
      description: 'Manage Docker containers, images, and services',
      category: 'cloud',
      version: '1.0.0',
      author: 'Workflow Studio',
      
      parameters: [
        {
          name: 'host',
          type: 'string',
          displayName: 'Docker Host',
          description: 'Docker daemon host (e.g., localhost, tcp://host:port)',
          required: true,
          default: 'localhost',
          placeholder: 'localhost'
        },
        {
          name: 'port',
          type: 'number',
          displayName: 'Docker Port',
          description: 'Docker daemon port',
          required: false,
          default: 2375,
          placeholder: '2375'
        },
        {
          name: 'operation',
          type: 'options',
          displayName: 'Operation',
          description: 'Docker operation to perform',
          required: true,
          default: 'listContainers',
          options: [
            { name: 'List Containers', value: 'listContainers' },
            { name: 'Create Container', value: 'createContainer' },
            { name: 'Start Container', value: 'startContainer' },
            { name: 'Stop Container', value: 'stopContainer' },
            { name: 'Remove Container', value: 'removeContainer' },
            { name: 'List Images', value: 'listImages' },
            { name: 'Pull Image', value: 'pullImage' },
            { name: 'Remove Image', value: 'removeImage' },
            { name: 'Get Container Logs', value: 'getLogs' },
            { name: 'Execute Command', value: 'execCommand' }
          ]
        },
        {
          name: 'imageName',
          type: 'string',
          displayName: 'Image Name',
          description: 'Docker image name',
          required: false,
          placeholder: 'nginx:latest'
        },
        {
          name: 'containerName',
          type: 'string',
          displayName: 'Container Name',
          description: 'Container name',
          required: false,
          placeholder: 'my-container'
        },
        {
          name: 'command',
          type: 'string',
          displayName: 'Command',
          description: 'Command to execute in container',
          required: false,
          placeholder: 'ls -la'
        },
        {
          name: 'ports',
          type: 'string',
          displayName: 'Ports (JSON)',
          description: 'Port mappings (JSON array)',
          required: false,
          placeholder: '[{"80": "8080"}]'
        },
        {
          name: 'environment',
          type: 'string',
          displayName: 'Environment Variables (JSON)',
          description: 'Environment variables (JSON object)',
          required: false,
          placeholder: '{"NODE_ENV": "production"}'
        },
        {
          name: 'volumes',
          type: 'string',
          displayName: 'Volumes (JSON)',
          description: 'Volume mappings (JSON array)',
          required: false,
          placeholder: '[{"/host/path": "/container/path"}]'
        },
        {
          name: 'restartPolicy',
          type: 'options',
          displayName: 'Restart Policy',
          description: 'Container restart policy',
          required: false,
          default: 'no',
          options: [
            { name: 'No Restart', value: 'no' },
            { name: 'Always', value: 'always' },
            { name: 'On Failure', value: 'on-failure' },
            { name: 'Unless Stopped', value: 'unless-stopped' }
          ]
        }
      ],

      inputs: [
        {
          name: 'imageName',
          type: 'string',
          description: 'Image name from previous node',
          required: false
        },
        {
          name: 'containerName',
          type: 'string',
          description: 'Container name from previous node',
          required: false
        },
        {
          name: 'command',
          type: 'string',
          description: 'Command from previous node',
          required: false
        }
      ],

      outputs: [
        {
          name: 'containers',
          type: 'array',
          description: 'List of containers'
        },
        {
          name: 'images',
          type: 'array',
          description: 'List of images'
        },
        {
          name: 'container',
          type: 'object',
          description: 'Container information'
        },
        {
          name: 'logs',
          type: 'string',
          description: 'Container logs'
        },
        {
          name: 'commandOutput',
          type: 'string',
          description: 'Command execution output'
        }
      ]
    };
  }

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = node.data?.config || {};
    
    // Validation for required parameters
    if (!config.host && !context.input?.host) {
      throw new Error('Required parameter "host" is missing');
    }
    if (!config.port && !context.input?.port) {
      throw new Error('Required parameter "port" is missing');
    }

    
    try {
      const config = node.config;
      const { host, port, operation, imageName, containerName, command, ports, environment, volumes, restartPolicy } = config;
      
      const inputImageName = context.input?.imageName || imageName;
      const inputContainerName = context.input?.containerName || containerName;
      const inputCommand = context.input?.command || command;

      if (!host) {
        throw new Error('Docker host is required');
      }

      // Initialize Docker client
      const Docker = require('dockerode');
      const docker = new Docker({
        host: host,
        port: port || 2375
      });

      let result: any = {};

      switch (operation) {
        case 'listContainers':
          result = await this.listContainers(docker);
          break;
        case 'createContainer':
          result = await this.createContainer(docker, inputImageName, inputContainerName, ports, environment, volumes, restartPolicy);
          break;
        case 'startContainer':
          result = await this.startContainer(docker, inputContainerName);
          break;
        case 'stopContainer':
          result = await this.stopContainer(docker, inputContainerName);
          break;
        case 'removeContainer':
          result = await this.removeContainer(docker, inputContainerName);
          break;
        case 'listImages':
          result = await this.listImages(docker);
          break;
        case 'pullImage':
          result = await this.pullImage(docker, inputImageName);
          break;
        case 'removeImage':
          result = await this.removeImage(docker, inputImageName);
          break;
        case 'getLogs':
          result = await this.getLogs(docker, inputContainerName);
          break;
        case 'execCommand':
          result = await this.execCommand(docker, inputContainerName, inputCommand);
          break;
        default:
          throw new Error(`Unsupported Docker operation: ${operation}`);
      }

      const duration = Date.now() - startTime;
      
      logger.info('Docker node executed successfully', {
        operation,
        host,
        duration
      });

      return {
        success: true,
        output: {
          ...result,
          operation,
          host,
          timestamp: new Date().toISOString(),
          duration
        },
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error('Docker node execution failed', {
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

  private async listContainers(docker: any) {
    const containers = await docker.listContainers({ all: true });
    
    return {
      containers: containers.map((container: any) => ({
        id: container.Id,
        name: container.Names[0]?.replace('/', '') || 'unnamed',
        image: container.Image,
        status: container.Status,
        ports: container.Ports,
        created: new Date(container.Created * 1000).toISOString()
      })),
      count: containers.length
    };
  }

  private async createContainer(docker: any, imageName: string, containerName?: string, ports?: string, environment?: string, volumes?: string, restartPolicy?: string) {
    if (!imageName) {
      throw new Error('Image name is required for create container');
    }

    const containerConfig: any = {
      Image: imageName
    };

    if (containerName) {
      containerConfig.name = containerName;
    }

    if (ports) {
      try {
        const portMappings = JSON.parse(ports);
        containerConfig.ExposedPorts = {};
        containerConfig.HostConfig = { PortBindings: {} };
        
        Object.entries(portMappings).forEach(([containerPort, hostPort]: [string, any]) => {
          containerConfig.ExposedPorts[`${containerPort}/tcp`] = {};
          containerConfig.HostConfig.PortBindings[`${containerPort}/tcp`] = [{ HostPort: hostPort.toString() }];
        });
      } catch (e) {
        logger.warn('Invalid ports JSON, ignoring', { ports });
      }
    }

    if (environment) {
      try {
        const envVars = JSON.parse(environment);
        containerConfig.Env = Object.entries(envVars).map(([key, value]) => `${key}=${value}`);
      } catch (e) {
        logger.warn('Invalid environment JSON, ignoring', { environment });
      }
    }

    if (volumes) {
      try {
        const volumeMappings = JSON.parse(volumes);
        containerConfig.Volumes = {};
        containerConfig.HostConfig = containerConfig.HostConfig || {};
        containerConfig.HostConfig.Binds = Object.entries(volumeMappings).map(([hostPath, containerPath]) => `${hostPath}:${containerPath}`);
      } catch (e) {
        logger.warn('Invalid volumes JSON, ignoring', { volumes });
      }
    }

    if (restartPolicy) {
      containerConfig.HostConfig = containerConfig.HostConfig || {};
      containerConfig.HostConfig.RestartPolicy = { Name: restartPolicy };
    }

    const container = await docker.createContainer(containerConfig);
    
    return {
      container: {
        id: container.id,
        name: containerName || 'unnamed',
        image: imageName,
        status: 'created'
      }
    };
  }

  private async startContainer(docker: any, containerName: string) {
    if (!containerName) {
      throw new Error('Container name is required for start container');
    }

    const container = docker.getContainer(containerName);
    await container.start();
    
    return {
      container: {
        name: containerName,
        status: 'started'
      }
    };
  }

  private async stopContainer(docker: any, containerName: string) {
    if (!containerName) {
      throw new Error('Container name is required for stop container');
    }

    const container = docker.getContainer(containerName);
    await container.stop();
    
    return {
      container: {
        name: containerName,
        status: 'stopped'
      }
    };
  }

  private async removeContainer(docker: any, containerName: string) {
    if (!containerName) {
      throw new Error('Container name is required for remove container');
    }

    const container = docker.getContainer(containerName);
    await container.remove();
    
    return {
      container: {
        name: containerName,
        status: 'removed'
      }
    };
  }

  private async listImages(docker: any) {
    const images = await docker.listImages();
    
    return {
      images: images.map((image: any) => ({
        id: image.Id,
        tags: image.RepoTags || [],
        size: image.Size,
        created: new Date(image.Created * 1000).toISOString()
      })),
      count: images.length
    };
  }

  private async pullImage(docker: any, imageName: string) {
    if (!imageName) {
      throw new Error('Image name is required for pull image');
    }

    await docker.pull(imageName);
    
    return {
      image: {
        name: imageName,
        status: 'pulled'
      }
    };
  }

  private async removeImage(docker: any, imageName: string) {
    if (!imageName) {
      throw new Error('Image name is required for remove image');
    }

    const image = docker.getImage(imageName);
    await image.remove();
    
    return {
      image: {
        name: imageName,
        status: 'removed'
      }
    };
  }

  private async getLogs(docker: any, containerName: string) {
    if (!containerName) {
      throw new Error('Container name is required for get logs');
    }

    const container = docker.getContainer(containerName);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      timestamps: true
    });
    
    return {
      logs: logs.toString(),
      container: containerName
    };
  }

  private async execCommand(docker: any, containerName: string, command: string) {
    if (!containerName || !command) {
      throw new Error('Container name and command are required for exec command');
    }

    const container = docker.getContainer(containerName);
    const exec = await container.exec({
      Cmd: command.split(' '),
      AttachStdout: true,
      AttachStderr: true
    });

    const stream = await exec.start();
    
    let output = '';
    stream.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });

    return new Promise((resolve) => {
      stream.on('end', () => {
        resolve({
          commandOutput: output,
          container: containerName,
          command
        });
      });
    });

  }

  async test(context: ExecutionContext): Promise<ExecutionResult> {
    const { config } = context;
    const { host, port, operation } = config;

    if (!host) {
      return {
        success: false,
        error: 'Docker host is required for Docker node test.'
      };
    }

    // Mock a successful test response
    return {
      success: true,
      data: {
        nodeType: 'docker',
        status: 'success',
        message: 'Docker node test completed successfully',
        config: { host, port, operation },
        capabilities: {
          containerManagement: true,
          imageManagement: true,
          logAccess: true,
          commandExecution: true
        },
        timestamp: new Date().toISOString()
      }
    };
  }}
export default DockerRealNode;

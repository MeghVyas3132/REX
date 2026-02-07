import {
  INodeType,
  INodeTypeDescription,
  ITriggerFunctions,
  ITriggerResponse,
  NodeConnectionTypes,
} from '../../types/n8n-types';
import chokidar from 'chokidar';

export class FileTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'File Trigger',
    name: 'file-trigger',
    icon: 'fa:file',
    group: ['trigger'],
    version: 1,
    description: 'Triggers the workflow for file create/modify/delete in a directory',
    eventTriggerDescription: '',
    defaults: { name: 'File Trigger' },
    inputs: [],
    outputs: [NodeConnectionTypes.Main],
    properties: [
      { displayName: 'Directory', name: 'directory', type: 'string', required: true, default: '', placeholder: '/tmp/inbox' },
      { displayName: 'Pattern', name: 'pattern', type: 'string', default: '**/*', placeholder: '*.csv' },
      { displayName: 'Ignore Initial', name: 'ignoreInitial', type: 'boolean', default: true },
    ],
  };

  getNodeDefinition() {
    return {
      id: 'file-trigger',
      type: 'trigger',
      name: 'File Trigger',
      description: 'Triggers the workflow for file create/modify/delete in a directory',
      category: 'trigger',
      version: '1.0.0',
      author: 'Workflow Studio',
      parameters: [
        {
          name: 'directory',
          type: 'string',
          displayName: 'Directory',
          description: 'Directory to watch',
          required: true,
          default: ''
        },
        {
          name: 'pattern',
          type: 'string',
          displayName: 'Pattern',
          description: 'File pattern to match',
          required: false,
          default: '**/*'
        },
        {
          name: 'ignoreInitial',
          type: 'boolean',
          displayName: 'Ignore Initial',
          description: 'Ignore existing files on startup',
          required: false,
          default: true
        }
      ],
      inputs: [],
      outputs: [
        {
          name: 'data',
          type: 'object',
          displayName: 'File Event Data',
          description: 'Data from file event',
          dataType: 'object'
        }
      ]
    };
  }

  async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
    const directory = this.getNodeParameter('directory', 0) as string;
    const pattern = this.getNodeParameter('pattern', 0, '**/*') as string;
    const ignoreInitial = this.getNodeParameter('ignoreInitial', 0, true) as boolean;

    const watcher = chokidar.watch([`${directory}/${pattern}`], { ignoreInitial });
    const emitEvent = (type: string, filePath: string) => {
      this.emit([
        this.helpers.returnJsonArray([{ event: type, path: filePath, timestamp: new Date().toISOString() }]),
      ]);
    };

    watcher.on('add', (p) => emitEvent('add', p));
    watcher.on('change', (p) => emitEvent('change', p));
    watcher.on('unlink', (p) => emitEvent('unlink', p));

    const closeFunction = async () => { await watcher.close(); };
    const manualTriggerFunction = async () => emitEvent('manual', directory);
    return { closeFunction, manualTriggerFunction };
  }
}

export default FileTrigger;



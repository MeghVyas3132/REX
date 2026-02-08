/**
 * Message Field Definitions
 * Field definitions for message operations
 */

import { CURRENCY_CODES, MEDIA_TYPES, MESSAGE_TYPES, OPERATIONS, RESOURCES } from '../constants';

/**
 * Get message operation fields
 */
export function getMessageOperationFields() {
  return [
    {
      name: 'operation',
      type: 'options',
      displayName: 'Operation',
      description: 'The operation to perform',
      required: true,
      default: OPERATIONS.SEND,
      options: [
        { name: 'Send', value: OPERATIONS.SEND },
        { name: 'Send Template', value: OPERATIONS.SEND_TEMPLATE },
      ],
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
        },
      },
    },
  ];
}

/**
 * Get common message fields
 */
export function getCommonMessageFields() {
  return [
    {
      name: 'phoneNumberId',
      type: 'string',
      displayName: 'Sender Phone Number ID',
      description: 'The ID of the business account\'s phone number from which the message will be sent',
      required: true,
      placeholder: '123456789012345',
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
        },
      },
    },
    {
      name: 'recipientPhoneNumber',
      type: 'string',
      displayName: 'Recipient Phone Number',
      description: 'Phone number of the recipient (include country code). Can be set statically or dynamically from previous node output (e.g., {{$json.phoneNumber}} or {{$json.to}})',
      required: true,
      placeholder: '+1234567890',
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
        },
      },
    },
  ];
}

/**
 * Get message type fields
 */
export function getMessageTypeFields() {
  return [
    {
      name: 'messageType',
      type: 'options',
      displayName: 'Message Type',
      description: 'The type of message to send',
      required: true,
      default: MESSAGE_TYPES.TEXT,
      options: [
        { name: 'Text', value: MESSAGE_TYPES.TEXT },
        { name: 'Image', value: MESSAGE_TYPES.IMAGE },
        { name: 'Video', value: MESSAGE_TYPES.VIDEO },
        { name: 'Audio', value: MESSAGE_TYPES.AUDIO },
        { name: 'Document', value: MESSAGE_TYPES.DOCUMENT },
        { name: 'Location', value: MESSAGE_TYPES.LOCATION },
        { name: 'Contacts', value: MESSAGE_TYPES.CONTACTS },
      ],
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
          operation: [OPERATIONS.SEND],
        },
      },
    },
  ];
}

/**
 * Get text message fields
 */
export function getTextMessageFields() {
  return [
    {
      name: 'textBody',
      type: 'string',
      displayName: 'Text Body',
      description: 'The body of the message (max 4096 characters). Can be set statically or dynamically from previous node output (e.g., {{$json.message}} or {{$json.text}})',
      required: true,
      placeholder: 'Enter your message here...',
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
          operation: [OPERATIONS.SEND],
          messageType: [MESSAGE_TYPES.TEXT],
        },
      },
    },
    {
      name: 'previewUrl',
      type: 'boolean',
      displayName: 'Show URL Previews',
      description: 'Whether to display URL previews in text messages',
      required: false,
      default: false,
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
          operation: [OPERATIONS.SEND],
          messageType: [MESSAGE_TYPES.TEXT],
        },
      },
    },
  ];
}

/**
 * Get template message fields
 */
export function getTemplateMessageFields() {
  return [
    {
      name: 'template',
      type: 'string',
      displayName: 'Template',
      description: 'Template name in format "name|language" (e.g., "hello_world|en"). Can be set statically or dynamically from previous node output (e.g., {{$json.template}})',
      required: true,
      placeholder: 'hello_world|en',
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
          operation: [OPERATIONS.SEND_TEMPLATE],
        },
      },
    },
    {
      name: 'components',
      type: 'object',
      displayName: 'Template Components',
      description: 'Template components (body, header, button parameters)',
      required: false,
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
          operation: [OPERATIONS.SEND_TEMPLATE],
        },
      },
    },
  ];
}

/**
 * Get media message fields
 */
export function getMediaMessageFields() {
  return [
    {
      name: 'mediaPath',
      type: 'options',
      displayName: 'Media Source',
      description: 'Where to get the media from',
      required: true,
      default: 'useMediaLink',
      options: [
        { name: 'Link', value: 'useMediaLink' },
        { name: 'WhatsApp Media ID', value: 'useMediaId' },
        { name: 'Binary Data', value: 'useMedian8n' },
      ],
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
          operation: [OPERATIONS.SEND],
          messageType: MEDIA_TYPES,
        },
      },
    },
    {
      name: 'mediaLink',
      type: 'string',
      displayName: 'Media Link',
      description: 'URL of the media file. Can be set statically or dynamically from previous node output (e.g., {{$json.mediaUrl}} or {{$json.url}})',
      required: false,
      placeholder: 'https://example.com/image.jpg',
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
          operation: [OPERATIONS.SEND],
          messageType: MEDIA_TYPES,
          mediaPath: ['useMediaLink'],
        },
      },
    },
    {
      name: 'mediaId',
      type: 'string',
      displayName: 'Media ID',
      description: 'WhatsApp media ID (if already uploaded)',
      required: false,
      placeholder: '123456789012345',
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
          operation: [OPERATIONS.SEND],
          messageType: MEDIA_TYPES,
          mediaPath: ['useMediaId'],
        },
      },
    },
    {
      name: 'mediaPropertyName',
      type: 'string',
      displayName: 'Binary Data Field Name',
      description: 'Name of the input field containing binary data',
      required: false,
      default: 'data',
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
          operation: [OPERATIONS.SEND],
          messageType: MEDIA_TYPES,
          mediaPath: ['useMedian8n'],
        },
      },
    },
    {
      name: 'mediaCaption',
      type: 'string',
      displayName: 'Caption',
      description: 'Caption for the media (for images, videos, documents)',
      required: false,
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
          operation: [OPERATIONS.SEND],
          messageType: [MESSAGE_TYPES.IMAGE, MESSAGE_TYPES.VIDEO, MESSAGE_TYPES.DOCUMENT],
        },
      },
    },
    {
      name: 'mediaFilename',
      type: 'string',
      displayName: 'Filename',
      description: 'Filename for document (required when using media ID)',
      required: false,
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
          operation: [OPERATIONS.SEND],
          messageType: [MESSAGE_TYPES.DOCUMENT],
          mediaPath: ['useMediaId'],
        },
      },
    },
  ];
}

/**
 * Get location message fields
 */
export function getLocationMessageFields() {
  return [
    {
      name: 'longitude',
      type: 'number',
      displayName: 'Longitude',
      description: 'Longitude coordinate (-180 to 180)',
      required: true,
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
          operation: [OPERATIONS.SEND],
          messageType: [MESSAGE_TYPES.LOCATION],
        },
      },
    },
    {
      name: 'latitude',
      type: 'number',
      displayName: 'Latitude',
      description: 'Latitude coordinate (-90 to 90)',
      required: true,
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
          operation: [OPERATIONS.SEND],
          messageType: [MESSAGE_TYPES.LOCATION],
        },
      },
    },
    {
      name: 'locationName',
      type: 'string',
      displayName: 'Location Name',
      description: 'Name of the location (optional)',
      required: false,
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
          operation: [OPERATIONS.SEND],
          messageType: [MESSAGE_TYPES.LOCATION],
        },
      },
    },
    {
      name: 'locationAddress',
      type: 'string',
      displayName: 'Location Address',
      description: 'Address of the location (optional)',
      required: false,
      displayOptions: {
        show: {
          resource: [RESOURCES.MESSAGE],
          operation: [OPERATIONS.SEND],
          messageType: [MESSAGE_TYPES.LOCATION],
        },
      },
    },
  ];
}

/**
 * Get all message fields
 */
export function getAllMessageFields() {
  return [
    ...getMessageOperationFields(),
    ...getCommonMessageFields(),
    ...getMessageTypeFields(),
    ...getTextMessageFields(),
    ...getTemplateMessageFields(),
    ...getMediaMessageFields(),
    ...getLocationMessageFields(),
  ];
}


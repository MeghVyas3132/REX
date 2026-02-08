/**
 * Media Field Definitions
 * Field definitions for media operations
 */

import { OPERATIONS, RESOURCES } from '../constants';

/**
 * Get media operation fields
 */
export function getMediaOperationFields() {
  return [
    {
      name: 'operation',
      type: 'options',
      displayName: 'Operation',
      description: 'The operation to perform on media',
      required: true,
      default: OPERATIONS.MEDIA_UPLOAD,
      options: [
        { name: 'Upload', value: OPERATIONS.MEDIA_UPLOAD },
        { name: 'Download', value: OPERATIONS.MEDIA_DOWNLOAD },
        { name: 'Delete', value: OPERATIONS.MEDIA_DELETE },
      ],
      displayOptions: {
        show: {
          resource: [RESOURCES.MEDIA],
        },
      },
    },
  ];
}

/**
 * Get media upload fields
 */
export function getMediaUploadFields() {
  return [
    {
      name: 'phoneNumberId',
      type: 'string',
      displayName: 'Sender Phone Number ID',
      description: 'The ID of the phone number to store the media',
      required: true,
      placeholder: '123456789012345',
      displayOptions: {
        show: {
          resource: [RESOURCES.MEDIA],
          operation: [OPERATIONS.MEDIA_UPLOAD],
        },
      },
    },
    {
      name: 'mediaPropertyName',
      type: 'string',
      displayName: 'Binary Data Field Name',
      description: 'Name of the binary property containing the file data',
      required: true,
      default: 'data',
      displayOptions: {
        show: {
          resource: [RESOURCES.MEDIA],
          operation: [OPERATIONS.MEDIA_UPLOAD],
        },
      },
    },
    {
      name: 'mediaFileName',
      type: 'string',
      displayName: 'Filename',
      description: 'Name to use for the file (optional)',
      required: false,
      displayOptions: {
        show: {
          resource: [RESOURCES.MEDIA],
          operation: [OPERATIONS.MEDIA_UPLOAD],
        },
      },
    },
  ];
}

/**
 * Get media download fields
 */
export function getMediaDownloadFields() {
  return [
    {
      name: 'mediaGetId',
      type: 'string',
      displayName: 'Media ID',
      description: 'The ID of the media to download',
      required: true,
      placeholder: '123456789012345',
      displayOptions: {
        show: {
          resource: [RESOURCES.MEDIA],
          operation: [OPERATIONS.MEDIA_DOWNLOAD],
        },
      },
    },
  ];
}

/**
 * Get media delete fields
 */
export function getMediaDeleteFields() {
  return [
    {
      name: 'mediaDeleteId',
      type: 'string',
      displayName: 'Media ID',
      description: 'The ID of the media to delete',
      required: true,
      placeholder: '123456789012345',
      displayOptions: {
        show: {
          resource: [RESOURCES.MEDIA],
          operation: [OPERATIONS.MEDIA_DELETE],
        },
      },
    },
  ];
}

/**
 * Get all media fields
 */
export function getAllMediaFields() {
  return [
    ...getMediaOperationFields(),
    ...getMediaUploadFields(),
    ...getMediaDownloadFields(),
    ...getMediaDeleteFields(),
  ];
}


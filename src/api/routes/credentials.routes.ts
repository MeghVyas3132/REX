/**
 * Credentials API Routes
 * Handles credential management and testing
 */

import { Router } from 'express';
import { credentialHelper } from '../../core/credentials/credential-helper';
import { credentialStorage } from '../../core/credentials/credential-storage';
import { credentialTypes } from '../../core/credentials/credential-types';
import { optionalAuth } from '../middlewares/auth.middleware';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/credentials/types - Get all credential types
router.get('/types', optionalAuth, async (req, res) => {
	try {
		const allTypes = credentialHelper.getAllCredentialTypes();
		
		res.json({
			success: true,
			data: allTypes.map(type => ({
				name: type.name,
				displayName: type.displayName,
				icon: type.icon,
				properties: type.properties,
				documentationUrl: type.documentationUrl,
			})),
			count: allTypes.length,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		logger.error('Failed to get credential types', error as Error);
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to get credential types',
		});
	}
});

// GET /api/credentials/types/:typeName - Get credential type details
router.get('/types/:typeName', optionalAuth, async (req, res) => {
	try {
		const { typeName } = req.params;
		
		if (!credentialHelper.recognizes(typeName)) {
			return res.status(404).json({
				success: false,
				error: `Credential type '${typeName}' not found`,
			});
		}

		const properties = credentialHelper.getCredentialProperties(typeName);
		const credentialType = credentialTypes.getCredentialType(typeName);
		
		res.json({
			success: true,
			data: {
				name: typeName,
				displayName: credentialType?.displayName,
				icon: credentialType?.icon,
				properties,
				documentationUrl: credentialType?.documentationUrl,
				hasTest: !!credentialType?.test,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		logger.error('Failed to get credential type', error as Error, { typeName: req.params.typeName });
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to get credential type',
		});
	}
});

// POST /api/credentials - Create credentials
router.post('/', optionalAuth, async (req, res) => {
	try {
		const { name, type, data } = req.body;

		if (!name || !type || !data) {
			return res.status(400).json({
				success: false,
				error: 'Name, type, and data are required',
			});
		}

		if (!credentialHelper.recognizes(type)) {
			return res.status(400).json({
				success: false,
				error: `Credential type '${type}' not recognized`,
			});
		}

		const credentialId = uuidv4();
		const credentials = await credentialStorage.saveCredentials(credentialId, name, type, data);

		logger.info('Credentials created', { credentialId, name, type, userId: (req as any).user?.id });

		res.json({
			success: true,
			data: {
				id: credentials.id,
				name: credentials.name,
				type: credentials.type,
				// Don't return encrypted data
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		logger.error('Failed to create credentials', error as Error, { userId: (req as any).user?.id });
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to create credentials',
		});
	}
});

// GET /api/credentials - List all credentials
router.get('/', optionalAuth, async (req, res) => {
	try {
		const allCredentials = await credentialStorage.listCredentials();
		
		res.json({
			success: true,
			data: allCredentials.map(cred => ({
				id: cred.id,
				name: cred.name,
				type: cred.type,
				// Don't return encrypted data
			})),
			count: allCredentials.length,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		logger.error('Failed to list credentials', error as Error, { userId: (req as any).user?.id });
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to list credentials',
		});
	}
});

// GET /api/credentials/:id - Get credentials by ID
router.get('/:id', optionalAuth, async (req, res) => {
	try {
		const { id } = req.params;
		
		const credentials = await credentialStorage.getCredentials(id);
		if (!credentials) {
			return res.status(404).json({
				success: false,
				error: `Credentials '${id}' not found`,
			});
		}

		res.json({
			success: true,
			data: {
				id: credentials.id,
				name: credentials.name,
				type: credentials.type,
				// Don't return encrypted data
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		logger.error('Failed to get credentials', error as Error, { credentialId: req.params.id });
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to get credentials',
		});
	}
});

// PUT /api/credentials/:id - Update credentials
router.put('/:id', optionalAuth, async (req, res) => {
	try {
		const { id } = req.params;
		const { data } = req.body;

		if (!data) {
			return res.status(400).json({
				success: false,
				error: 'Data is required',
			});
		}

		const existing = await credentialStorage.getCredentials(id);
		if (!existing) {
			return res.status(404).json({
				success: false,
				error: `Credentials '${id}' not found`,
			});
		}

		const updated = await credentialStorage.updateCredentials(id, data);
		if (!updated) {
			return res.status(500).json({
				success: false,
				error: 'Failed to update credentials',
			});
		}

		logger.info('Credentials updated', { credentialId: id, userId: (req as any).user?.id });

		res.json({
			success: true,
			data: {
				id: updated.id,
				name: updated.name,
				type: updated.type,
			},
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		logger.error('Failed to update credentials', error as Error, { credentialId: req.params.id });
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to update credentials',
		});
	}
});

// DELETE /api/credentials/:id - Delete credentials
router.delete('/:id', optionalAuth, async (req, res) => {
	try {
		const { id } = req.params;
		
		const deleted = await credentialStorage.deleteCredentials(id);
		if (!deleted) {
			return res.status(404).json({
				success: false,
				error: `Credentials '${id}' not found`,
			});
		}

		logger.info('Credentials deleted', { credentialId: id, userId: (req as any).user?.id });

		res.json({
			success: true,
			message: 'Credentials deleted successfully',
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		logger.error('Failed to delete credentials', error as Error, { credentialId: req.params.id });
		res.status(500).json({
			success: false,
			error: error.message || 'Failed to delete credentials',
		});
	}
});

// POST /api/credentials/:typeName/test - Test credentials
router.post('/:typeName/test', optionalAuth, async (req, res) => {
	try {
		const { typeName } = req.params;
		const { data } = req.body;

		if (!data) {
			return res.status(400).json({
				success: false,
				error: 'Credential data is required',
			});
		}

		if (!credentialHelper.recognizes(typeName)) {
			return res.status(400).json({
				success: false,
				error: `Credential type '${typeName}' not recognized`,
			});
		}

		const result = await credentialHelper.testCredentials(typeName, data);

		logger.info('Credential test completed', {
			typeName,
			status: result.status,
			userId: (req as any).user?.id,
		});

		res.json({
			success: result.status === 'OK',
			data: result,
			timestamp: new Date().toISOString(),
		});
	} catch (error: any) {
		logger.error('Credential test failed', error as Error, { typeName: req.params.typeName });
		res.status(500).json({
			success: false,
			error: error.message || 'Credential test failed',
		});
	}
});

export default router;

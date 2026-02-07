/**
 * Node Version Migration
 * Handles migration of nodes between versions
 */

import { INodeTypeDescription } from '../../types/n8n-types';
const logger = require("../../utils/logger");

export interface VersionMigration {
	fromVersion: number;
	toVersion: number;
	upgrade: (data: any) => any;
	description?: string;
}

export class NodeVersionMigration {
	private static instance: NodeVersionMigration;
	private migrations: Map<string, VersionMigration[]> = new Map();

	private constructor() {
		this.registerDefaultMigrations();
	}

	public static getInstance(): NodeVersionMigration {
		if (!NodeVersionMigration.instance) {
			NodeVersionMigration.instance = new NodeVersionMigration();
		}
		return NodeVersionMigration.instance;
	}

	private registerDefaultMigrations(): void {
		// Example: HTTP Request node migrations
		this.registerMigration('httpRequest', {
			fromVersion: 1,
			toVersion: 2,
			upgrade: (data: any) => {
				// Migrate from v1 to v2
				// Example: Rename 'url' to 'url' (no change) or restructure
				if (data.url && !data.url.startsWith('http')) {
					data.url = `https://${data.url}`;
				}
				return data;
			},
			description: 'Migrate HTTP Request from v1 to v2',
		});

		// Example: Code node migrations
		this.registerMigration('code', {
			fromVersion: 1,
			toVersion: 2,
			upgrade: (data: any) => {
				// Migrate from v1 to v2
				// Example: Add default mode if missing
				if (!data.mode) {
					data.mode = 'runOnceForAllItems';
				}
				return data;
			},
			description: 'Migrate Code node from v1 to v2',
		});
	}

	public registerMigration(nodeName: string, migration: VersionMigration): void {
		if (!this.migrations.has(nodeName)) {
			this.migrations.set(nodeName, []);
		}
		this.migrations.get(nodeName)!.push(migration);
		// Sort migrations by fromVersion
		this.migrations.get(nodeName)!.sort((a, b) => a.fromVersion - b.fromVersion);
		logger.info(`Registered migration for ${nodeName}: v${migration.fromVersion} -> v${migration.toVersion}`);
	}

	public async migrateNode(
		nodeName: string,
		currentVersion: number,
		targetVersion: number,
		nodeData: any
	): Promise<any> {
		const migrations = this.migrations.get(nodeName) || [];
		
		if (currentVersion === targetVersion) {
			return nodeData; // No migration needed
		}

		if (currentVersion > targetVersion) {
			logger.warn(`Downgrade not supported: ${nodeName} v${currentVersion} -> v${targetVersion}`);
			return nodeData; // Downgrade not supported
		}

		let migratedData = { ...nodeData };
		let currentVer = currentVersion;

		// Apply migrations in sequence
		for (const migration of migrations) {
			if (migration.fromVersion === currentVer && migration.toVersion <= targetVersion) {
				logger.info(`Migrating ${nodeName} from v${migration.fromVersion} to v${migration.toVersion}`);
				migratedData = migration.upgrade(migratedData);
				currentVer = migration.toVersion;
				
				if (currentVer >= targetVersion) {
					break; // Reached target version
				}
			}
		}

		if (currentVer < targetVersion) {
			logger.warn(`Migration incomplete: ${nodeName} v${currentVersion} -> v${targetVersion} (stopped at v${currentVer})`);
		}

		return migratedData;
	}

	public getMigrations(nodeName: string): VersionMigration[] {
		return this.migrations.get(nodeName) || [];
	}

	public hasMigrations(nodeName: string): boolean {
		return (this.migrations.get(nodeName) || []).length > 0;
	}
}

export const nodeVersionMigration = NodeVersionMigration.getInstance();


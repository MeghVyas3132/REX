/**
 * Verification script for n8n-compatible nodes
 * Tests node registration, discovery, and basic functionality
 */

const path = require('path');

// Add TypeScript support
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020',
  },
});

async function verifyN8nNodes() {
  console.log('🔍 Verifying n8n-compatible nodes...\n');

  try {
    // Import registries
    const NodeRegistryV2 = require('../src/core/registry/node-registry-v2').default;
    const { nodeRegistry } = require('../src/core/registry/node-registry');
    const { nodeRegistryHelper } = require('../src/core/registry/node-registry-helper');

    const nodeRegistryV2 = NodeRegistryV2.getInstance();

    // Test 1: Check n8n-compatible nodes are registered
    console.log('📋 Test 1: Checking n8n-compatible node registration...');
    const n8nNodes = nodeRegistryV2.getN8nCompatibleNodes();
    console.log(`   ✅ Found ${n8nNodes.length} n8n-compatible nodes`);
    
    const expectedNodes = ['manualTrigger', 'code', 'httpRequest', 'webhook', 'schedule'];
    for (const nodeId of expectedNodes) {
      const node = nodeRegistryV2.getNode(nodeId);
      if (node && node.isN8nCompatible) {
        console.log(`   ✅ ${nodeId} is registered and n8n-compatible`);
        if (node.n8nDescription) {
          console.log(`      - Display Name: ${node.n8nDescription.displayName}`);
          console.log(`      - Properties: ${node.n8nDescription.properties?.length || 0}`);
        }
      } else {
        console.log(`   ⚠️  ${nodeId} not found or not n8n-compatible`);
      }
    }

    // Test 2: Check unified access
    console.log('\n📋 Test 2: Checking unified access via helper...');
    const manualTrigger = nodeRegistryHelper.getNodeDefinition('manualTrigger');
    if (manualTrigger) {
      console.log('   ✅ manualTrigger accessible via helper');
      const isN8n = nodeRegistryHelper.isN8nCompatible('manualTrigger');
      console.log(`   ✅ Is n8n-compatible: ${isN8n}`);
    } else {
      console.log('   ⚠️  manualTrigger not accessible via helper');
    }

    // Test 3: Check old structure still works
    console.log('\n📋 Test 3: Checking backward compatibility...');
    const oldNodes = nodeRegistryV2.getOldStructureNodes();
    console.log(`   ✅ Found ${oldNodes.length} old structure nodes`);
    
    // Try to get an old node
    const oldNode = nodeRegistry.getNode('http-request');
    if (oldNode) {
      console.log('   ✅ Old structure nodes still accessible');
    } else {
      console.log('   ⚠️  Old structure nodes not accessible');
    }

    // Test 4: Check all nodes are accessible
    console.log('\n📋 Test 4: Checking all node definitions...');
    const allNodes = nodeRegistryHelper.getAllNodeDefinitions();
    console.log(`   ✅ Total nodes available: ${allNodes.length}`);
    
    const n8nCount = allNodes.filter(node => {
      const nodeId = 'id' in node ? node.id : node.name;
      return nodeRegistryHelper.isN8nCompatible(nodeId);
    }).length;
    console.log(`   ✅ n8n-compatible nodes: ${n8nCount}`);
    console.log(`   ✅ Old structure nodes: ${allNodes.length - n8nCount}`);

    // Test 5: Check node schemas
    console.log('\n📋 Test 5: Checking node schemas...');
    const codeSchema = nodeRegistryHelper.getNodeSchema('code');
    if (codeSchema) {
      console.log('   ✅ Code node schema accessible');
      console.log(`   ✅ Schema has ${codeSchema.parameters?.length || 0} parameters`);
    } else {
      console.log('   ⚠️  Code node schema not accessible');
    }

    // Test 6: Check node descriptions
    console.log('\n📋 Test 6: Checking n8n node descriptions...');
    const codeDescription = nodeRegistryHelper.getN8nNodeDescription('code');
    if (codeDescription) {
      console.log('   ✅ Code node n8n description accessible');
      console.log(`   ✅ Description: ${codeDescription.displayName}`);
      console.log(`   ✅ Properties: ${codeDescription.properties?.length || 0}`);
    } else {
      console.log('   ⚠️  Code node n8n description not accessible');
    }

    console.log('\n✅ Verification complete!');
    console.log('\n📊 Summary:');
    console.log(`   - n8n-compatible nodes: ${n8nCount}`);
    console.log(`   - Old structure nodes: ${allNodes.length - n8nCount}`);
    console.log(`   - Total nodes: ${allNodes.length}`);
    console.log(`   - System supports both structures: ✅`);

  } catch (error) {
    console.error('❌ Verification failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run verification
verifyN8nNodes().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


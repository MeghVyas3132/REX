#!/bin/bash

# REX Node Migration Script
# Migrates nodes from backend/src/nodes to /nodes with new structure

set -e

ROOT_DIR="/Users/meghvyas/Desktop/REX"
SOURCE_DIR="$ROOT_DIR/backend/src/nodes"
TARGET_DIR="$ROOT_DIR/nodes"

echo "=================================="
echo "  REX Node Migration Script"
echo "=================================="

# Create category directories
CATEGORIES=(
  "agent"
  "ai"
  "analytics"
  "cloud"
  "communication"
  "core"
  "data"
  "development"
  "file-processing"
  "finance"
  "integrations"
  "llm"
  "logic"
  "productivity"
  "triggers"
  "utility"
)

for category in "${CATEGORIES[@]}"; do
  mkdir -p "$TARGET_DIR/$category"
  echo "Created: $TARGET_DIR/$category"
done

echo ""
echo "Migrating nodes..."

# Function to migrate a node
migrate_node() {
  local source_file=$1
  local category=$2
  local node_name=$3
  
  local target_dir="$TARGET_DIR/$category/$node_name"
  mkdir -p "$target_dir"
  
  # Copy the source file
  cp "$source_file" "$target_dir/${node_name}.node.ts"
  
  echo "  Migrated: $category/$node_name"
}

# Migrate all .node.ts files (excluding whatsapp subdirectory for now)
find "$SOURCE_DIR" -name "*.node.ts" -not -path "*whatsapp/*" | while read file; do
  # Extract category and node name from path
  # Path format: backend/src/nodes/<category>/<node-name>.node.ts
  relative_path="${file#$SOURCE_DIR/}"
  category=$(dirname "$relative_path")
  filename=$(basename "$file" .node.ts)
  
  if [ "$category" != "." ] && [ -f "$file" ]; then
    migrate_node "$file" "$category" "$filename"
  fi
done

# Handle whatsapp directory specially (has subdirectory structure)
if [ -d "$SOURCE_DIR/communication/whatsapp" ]; then
  mkdir -p "$TARGET_DIR/communication/whatsapp"
  cp -r "$SOURCE_DIR/communication/whatsapp"/* "$TARGET_DIR/communication/whatsapp/"
  echo "  Migrated: communication/whatsapp (full directory)"
fi

# Copy node-registry.ts
if [ -f "$SOURCE_DIR/node-registry.ts" ]; then
  cp "$SOURCE_DIR/node-registry.ts" "$TARGET_DIR/registry.ts"
  echo "  Migrated: node-registry.ts -> registry.ts"
fi

echo ""
echo "=================================="
echo "  Migration Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Update imports in migrated files to use @rex/shared"
echo "2. Split large node files into definition/execution/ui"
echo "3. Create index.ts for each node"

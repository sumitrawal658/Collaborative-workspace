#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Setting up MongoDB Sharding${NC}"
echo "------------------------------------------------"

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo -e "${RED}MongoDB is not installed. Please install MongoDB first.${NC}"
    exit 1
fi

# Create directories for sharding
echo "Creating directories for sharding..."
mkdir -p /data/configserver /data/shard1 /data/shard2 /data/shard3

# Start config servers
echo "Starting config servers..."
mongod --configsvr --replSet configReplSet --port 27019 --dbpath /data/configserver --fork --logpath /data/configserver/configserver.log

# Initialize config server replica set
echo "Initializing config server replica set..."
mongosh --port 27019 <<EOF
rs.initiate({
  _id: "configReplSet",
  configsvr: true,
  members: [
    { _id: 0, host: "localhost:27019" }
  ]
})
EOF

# Start shard servers
echo "Starting shard servers..."
mongod --shardsvr --replSet shard1RepSet --port 27020 --dbpath /data/shard1 --fork --logpath /data/shard1/shard1.log
mongod --shardsvr --replSet shard2RepSet --port 27021 --dbpath /data/shard2 --fork --logpath /data/shard2/shard2.log
mongod --shardsvr --replSet shard3RepSet --port 27022 --dbpath /data/shard3 --fork --logpath /data/shard3/shard3.log

# Initialize shard replica sets
echo "Initializing shard replica sets..."
mongosh --port 27020 <<EOF
rs.initiate({
  _id: "shard1RepSet",
  members: [
    { _id: 0, host: "localhost:27020" }
  ]
})
EOF

mongosh --port 27021 <<EOF
rs.initiate({
  _id: "shard2RepSet",
  members: [
    { _id: 0, host: "localhost:27021" }
  ]
})
EOF

mongosh --port 27022 <<EOF
rs.initiate({
  _id: "shard3RepSet",
  members: [
    { _id: 0, host: "localhost:27022" }
  ]
})
EOF

# Start mongos router
echo "Starting mongos router..."
mongos --configdb configReplSet/localhost:27019 --port 27017 --fork --logpath /data/mongos.log

# Wait for everything to be ready
sleep 5

# Add shards to the cluster
echo "Adding shards to the cluster..."
mongosh --port 27017 <<EOF
sh.addShard("shard1RepSet/localhost:27020")
sh.addShard("shard2RepSet/localhost:27021")
sh.addShard("shard3RepSet/localhost:27022")
EOF

# Enable sharding for our database and collections
echo "Enabling sharding for workspace database..."
mongosh --port 27017 <<EOF
use admin
sh.enableSharding("workspace")

// Shard the notes collection by tenantId for better data distribution
sh.shardCollection("workspace.notes", { "tenantId": "hashed" })

// Shard the analytics collection by tenantId and timestamp
sh.shardCollection("workspace.analytics", { "tenantId": "hashed", "dataTimestamp": 1 })

// Create indexes for better query performance
use workspace
db.notes.createIndex({ "tenantId": "hashed" })
db.notes.createIndex({ "tags": 1, "tenantId": 1 })
db.notes.createIndex({ "content": "text", "tenantId": 1 })

db.analytics.createIndex({ "tenantId": "hashed" })
db.analytics.createIndex({ "dataTimestamp": 1 })
db.analytics.createIndex({ "type": 1, "tenantId": 1 })

// Configure chunk size (in MB)
use config
db.settings.updateOne(
   { _id: "chunksize" },
   { \$set: { value: 64 } },
   { upsert: true }
)
EOF

echo -e "${GREEN}MongoDB sharding setup completed successfully!${NC}"
echo "The following components have been configured:"
echo "- Config server on port 27019"
echo "- Shard 1 on port 27020"
echo "- Shard 2 on port 27021"
echo "- Shard 3 on port 27022"
echo "- Mongos router on port 27017 (main application port)"
echo ""
echo "Collections have been sharded:"
echo "- notes: Sharded by tenantId (hashed)"
echo "- analytics: Sharded by tenantId (hashed) and dataTimestamp" 
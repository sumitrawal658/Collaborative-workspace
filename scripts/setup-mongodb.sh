#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Setting up MongoDB${NC}"
echo "------------------------------------------------"

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo -e "${RED}MongoDB is not installed. Please install MongoDB first.${NC}"
    exit 1
fi

# Check if MongoDB is running
if ! pgrep mongod > /dev/null; then
    echo "Starting MongoDB service..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start mongodb-community
    else
        sudo systemctl start mongod
    fi
fi

# Wait for MongoDB to start
sleep 2

# Create database and collections
echo "Creating database and collections..."
mongosh --eval '
    use workspace;
    
    // Create collections with schema validation
    db.createCollection("users", {
        validator: {
            $jsonSchema: {
                bsonType: "object",
                required: ["email", "name", "tenantId", "provider", "providerId"],
                properties: {
                    email: { bsonType: "string" },
                    name: { bsonType: "string" },
                    tenantId: { bsonType: "string" },
                    provider: { bsonType: "string" },
                    providerId: { bsonType: "string" }
                }
            }
        }
    });
    
    db.createCollection("notes", {
        validator: {
            $jsonSchema: {
                bsonType: "object",
                required: ["tenantId", "title", "content"],
                properties: {
                    tenantId: { bsonType: "string" },
                    title: { bsonType: "string" },
                    content: { bsonType: "string" },
                    tags: { bsonType: "array" }
                }
            }
        }
    });
    
    db.createCollection("analytics", {
        validator: {
            $jsonSchema: {
                bsonType: "object",
                required: ["tenantId", "type", "data"],
                properties: {
                    tenantId: { bsonType: "string" },
                    type: { bsonType: "string" },
                    data: { bsonType: "object" }
                }
            }
        }
    });
    
    // Create indexes
    db.users.createIndex({ "tenantId": 1, "email": 1 }, { unique: true });
    db.users.createIndex({ "provider": 1, "providerId": 1 }, { unique: true });
    
    db.notes.createIndex({ "tenantId": 1, "title": 1 });
    db.notes.createIndex({ "tenantId": 1, "tags": 1 });
    db.notes.createIndex({ "tenantId": 1, "content": "text" });
    
    db.analytics.createIndex({ "tenantId": 1, "type": 1 });
    db.analytics.createIndex({ "dataTimestamp": 1 }, { expireAfterSeconds: 604800 }); // 7 days TTL
    
    print("Database setup completed successfully!");
'

echo -e "${GREEN}MongoDB setup completed successfully!${NC}"
echo "The following collections have been created:"
echo "- users: Stores user information with tenant isolation"
echo "- notes: Stores notes with content, tags, and sentiment analysis"
echo "- analytics: Stores cached analytics data with TTL index" 
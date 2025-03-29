proverbs3:5-6
// Switch to the novamind database
db = db.getSiblingDB('novamind');

// Create collections with schema validation
db.createCollection('templates', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'description', 'architecture'],
      properties: {
        name: { bsonType: 'string' },
        description: { bsonType: 'string' },
        architecture: { bsonType: 'string' },
        capabilities: { bsonType: 'array', items: { bsonType: 'string' } },
        requiredTools: { bsonType: 'array', items: { bsonType: 'string' } }
      }
    }
  }
});

db.createCollection('tools', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'description', 'type'],
      properties: {
        name: { bsonType: 'string' },
        description: { bsonType: 'string' },
        type: { bsonType: 'string' },
        configuration: { bsonType: 'object' }
      }
    }
  }
});

db.createCollection('agents', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'description', 'status'],
      properties: {
        name: { bsonType: 'string' },
        description: { bsonType: 'string' },
        status: { bsonType: 'string' },
        capabilities: { bsonType: 'array', items: { bsonType: 'string' } },
        configuration: { bsonType: 'object' }
      }
    }
  }
});

// Create indexes
db.templates.createIndex({ name: 1 }, { unique: true });
db.tools.createIndex({ name: 1 }, { unique: true });
db.agents.createIndex({ name: 1 }, { unique: true });
db.agents.createIndex({ status: 1 });

// Insert some initial templates
db.templates.insertMany([
  {
    name: 'Task Assistant',
    description: 'A general-purpose task assistant agent',
    architecture: 'Reactive',
    capabilities: ['Task Management', 'Communication'],
    requiredTools: ['Calendar', 'Email']
  },
  {
    name: 'Data Analyst',
    description: 'An agent specialized in data analysis and visualization',
    architecture: 'Analytical',
    capabilities: ['Data Analysis', 'Visualization'],
    requiredTools: ['Database', 'Charts']
  },
  {
    name: 'Contact Detective',
    description: 'An agent specialized in gathering and analyzing contact information from web and social media sources',
    architecture: 'Investigative',
    capabilities: ['Web Search', 'Social Media Analysis', 'Contact Information Extraction', 'Report Generation'],
    requiredTools: ['WebSearch', 'SocialMediaSearch', 'ReportGenerator']
  }
]);

// Insert some initial tools
db.tools.insertMany([
  {
    name: 'Calendar',
    description: 'Calendar integration tool',
    type: 'Productivity',
    configuration: { required: ['apiKey'] }
  },
  {
    name: 'Database',
    description: 'Database connection and query tool',
    type: 'Data',
    configuration: { required: ['connectionString'] }
  },
  {
    name: 'WebSearch',
    description: 'Advanced web search tool with support for targeted queries',
    type: 'Search',
    configuration: { required: ['apiKey', 'searchEngineId'] }
  },
  {
    name: 'SocialMediaSearch',
    description: 'Search and analyze social media profiles and content',
    type: 'Search',
    configuration: { required: ['apiKeys'] }
  },
  {
    name: 'ReportGenerator',
    description: 'Generate structured reports with findings and sources',
    type: 'Document',
    configuration: { required: [] }
  }
]); 
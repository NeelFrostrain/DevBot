import { DatabaseAdapter } from './DatabaseAdapter.js';
import { MongoDBAdapter } from './MongoDBAdapter.js';
import { JsonAdapter } from './JsonAdapter.js';
import chalk from 'chalk';

let db: DatabaseAdapter;
let usingMongoDB = false;

export async function initializeDatabase(mongoUri?: string): Promise<DatabaseAdapter> {
  if (mongoUri) {
    console.log(chalk.blue('Attempting to connect to MongoDB...'));
    const mongoAdapter = new MongoDBAdapter();
    
    try {
      const connected = await mongoAdapter.connect(mongoUri);
      
      if (connected && mongoAdapter.isConnected()) {
        console.log(chalk.green('✓ Using MongoDB as primary database'));
        db = mongoAdapter;
        usingMongoDB = true;
        
        // Monitor connection and fallback if needed
        setInterval(() => {
          if (!mongoAdapter.isConnected() && usingMongoDB) {
            console.log(chalk.yellow('⚠ MongoDB disconnected — switching to JSON mode'));
            fallbackToJson();
          }
        }, 10000);
        
        return db;
      }
    } catch (error) {
      console.log(chalk.yellow('⚠ MongoDB connection failed — switching to JSON mode'));
    }
  }
  
  return await fallbackToJson();
}

async function fallbackToJson(): Promise<DatabaseAdapter> {
  console.log(chalk.blue('Initializing JSON database...'));
  const jsonAdapter = new JsonAdapter();
  await jsonAdapter.init();
  console.log(chalk.green('✓ Using JSON as primary database'));
  db = jsonAdapter;
  usingMongoDB = false;
  return db;
}

export function getDatabase(): DatabaseAdapter {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export function isUsingMongoDB(): boolean {
  return usingMongoDB;
}

// Helper functions for common operations
export async function getUser(userId: string, guildId: string = 'global') {
  const path = `users.${guildId}.${userId}`;
  let user = await db.get(path);
  
  if (!user) {
    user = {
      id: userId,
      guildId: guildId,
      balance: 1000,
      bank: 0,
      inventory: [],
      bio: '',
      achievements: [],
      createdAt: Date.now()
    };
    await db.set(path, user);
  }
  
  return user;
}

export async function updateUser(userId: string, guildId: string, updates: any) {
  const path = `users.${guildId}.${userId}`;
  const user = await getUser(userId, guildId);
  const updated = { ...user, ...updates };
  await db.set(path, updated);
  return updated;
}

export async function getUserLevel(userId: string, guildId: string) {
  const path = `levels.${guildId}.${userId}`;
  let level = await db.get(path);
  
  if (!level) {
    level = {
      id: userId,
      guildId: guildId,
      xp: 0,
      level: 1,
      totalXP: 0,
      messages: 0,
      lastXPGain: 0,
      rankCard: {
        backgroundColor: '#2b2d31',
        progressBarColor: '#5865f2',
        textColor: '#ffffff',
        accentColor: '#5865f2'
      }
    };
    await db.set(path, level);
  } else {
    // Ensure totalXP and xp are in sync
    if (!level.totalXP && level.xp) {
      level.totalXP = level.xp;
    } else if (!level.xp && level.totalXP) {
      level.xp = level.totalXP;
    }
    
    // Ensure messages field exists
    if (typeof level.messages !== 'number') {
      level.messages = 0;
    }
    
    // Ensure level is at least 1
    if (!level.level || level.level < 1) {
      level.level = 1;
    }
  }
  
  return level;
}

export async function getGuildRankConfig(guildId: string) {
  const path = `rankConfig.${guildId}`;
  let config = await db.get(path);
  
  if (!config) {
    config = {
      guildId: guildId,
      xpPerMessage: 15,
      xpCooldown: 60000,
      rankRoles: [],
      enabledChannels: [],
      disabledChannels: [],
      multipliers: {}
    };
    await db.set(path, config);
  }
  
  return config;
}

export async function updateGuildRankConfig(guildId: string, updates: any) {
  const path = `rankConfig.${guildId}`;
  const config = await getGuildRankConfig(guildId);
  const updated = { ...config, ...updates };
  await db.set(path, updated);
  return updated;
}

export async function updateUserLevel(userId: string, guildId: string, updates: any) {
  const path = `levels.${guildId}.${userId}`;
  const level = await getUserLevel(userId, guildId);
  const updated = { ...level, ...updates };
  await db.set(path, updated);
  return updated;
}

export { db };

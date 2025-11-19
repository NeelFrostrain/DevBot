import { getUserLevel, updateUserLevel } from '../database/index.js';
import { getDatabase } from '../database/index.js';
/**
 * Calculate level from total XP using formula: level = floor(sqrt(totalXP / 100))
 * This ensures consistent level calculation across the entire system
 */
export function calculateLevel(totalXP) {
    // Ensure totalXP is never negative
    totalXP = Math.max(0, totalXP);
    // Calculate level: level = floor(sqrt(totalXP / 100))
    const level = Math.max(1, Math.floor(Math.sqrt(totalXP / 100)));
    // Calculate XP required for current level
    const xpForCurrentLevel = level * level * 100;
    // Calculate XP required for next level
    const xpForNextLevel = (level + 1) * (level + 1) * 100;
    // Current XP within this level
    const currentXP = totalXP - xpForCurrentLevel;
    // XP needed to reach next level
    const requiredXP = xpForNextLevel - xpForCurrentLevel;
    return {
        level,
        currentXP: Math.max(0, currentXP),
        requiredXP: Math.max(1, requiredXP)
    };
}
/**
 * Add XP to a user and update their level
 */
export async function addXP(userId, guildId, amount, multiplier = 1) {
    const levelData = await getUserLevel(userId, guildId);
    const oldLevel = levelData.level;
    const finalAmount = Math.floor(amount * multiplier);
    // Update totalXP (this is the source of truth)
    levelData.totalXP = (levelData.totalXP || 0) + finalAmount;
    levelData.xp = levelData.totalXP; // Keep xp in sync with totalXP
    levelData.messages = (levelData.messages || 0) + 1;
    // Calculate new level from totalXP
    const { level, currentXP, requiredXP } = calculateLevel(levelData.totalXP);
    levelData.level = level;
    await updateUserLevel(userId, guildId, levelData);
    return {
        xp: levelData.totalXP,
        level: level,
        currentXP: currentXP,
        requiredXP: requiredXP,
        leveledUp: level > oldLevel,
        newLevel: level,
        xpGained: finalAmount
    };
}
/**
 * Get all users from database with proper fallback handling
 */
async function getAllUsers(guildId, dataType) {
    const db = getDatabase();
    try {
        // Try direct path first: levels.{guildId} or users.{guildId}
        let allData = await db.get(`${dataType}.${guildId}`);
        // If not found or empty, try getting parent object
        if (!allData || Object.keys(allData).length === 0) {
            const parentData = await db.get(dataType);
            if (parentData && parentData[guildId]) {
                allData = parentData[guildId];
            }
        }
        // If still no data, return empty array
        if (!allData || typeof allData !== 'object') {
            return [];
        }
        // Convert object to array of users
        const users = Object.entries(allData)
            .map(([userId, data]) => {
            // Ensure data is an object
            if (typeof data !== 'object' || data === null) {
                return null;
            }
            return {
                id: userId,
                ...data
            };
        })
            .filter(user => user !== null);
        return users;
    }
    catch (error) {
        console.error(`Error fetching ${dataType} for guild ${guildId}:`, error);
        return [];
    }
}
/**
 * Get level leaderboard sorted by totalXP
 * Tie-breaker: level, then messages
 */
export async function getLeaderboard(guildId, limit = 10) {
    const users = await getAllUsers(guildId, 'levels');
    // Filter users with XP > 0 and ensure they have required fields
    const validUsers = users
        .filter(user => {
        const totalXP = user.totalXP || user.xp || 0;
        return totalXP > 0;
    })
        .map(user => {
        // Ensure totalXP and xp are in sync
        const totalXP = user.totalXP || user.xp || 0;
        const { level } = calculateLevel(totalXP);
        return {
            ...user,
            totalXP: totalXP,
            xp: totalXP,
            level: level,
            messages: user.messages || 0
        };
    });
    // Sort by totalXP (descending), then level, then messages
    const sorted = validUsers.sort((a, b) => {
        if (b.totalXP !== a.totalXP)
            return b.totalXP - a.totalXP;
        if (b.level !== a.level)
            return b.level - a.level;
        return b.messages - a.messages;
    });
    return sorted.slice(0, limit);
}
/**
 * Get economy leaderboard sorted by total wealth (balance + bank)
 */
export async function getEconomyLeaderboard(guildId, limit = 10) {
    const users = await getAllUsers(guildId, 'users');
    // Calculate total wealth and filter users with wealth > 0
    const validUsers = users
        .map(user => ({
        ...user,
        balance: user.balance || 0,
        bank: user.bank || 0,
        totalWealth: (user.balance || 0) + (user.bank || 0)
    }))
        .filter(user => user.totalWealth > 0);
    // Sort by total wealth (descending)
    const sorted = validUsers.sort((a, b) => b.totalWealth - a.totalWealth);
    return sorted.slice(0, limit);
}
/**
 * Get user's rank position in the server
 */
export async function getUserRank(userId, guildId) {
    const leaderboard = await getLeaderboard(guildId, 9999); // Get all users
    const position = leaderboard.findIndex(user => user.id === userId);
    return position === -1 ? 0 : position + 1;
}
/**
 * Set user's XP directly (admin command)
 */
export async function setXP(userId, guildId, xp) {
    const { level, currentXP, requiredXP } = calculateLevel(xp);
    await updateUserLevel(userId, guildId, {
        xp: xp,
        totalXP: xp,
        level: level
    });
    return { level, currentXP, requiredXP };
}

import { addXP } from '../utils/leveling.js';
import { EmbedFactory } from '../utils/embeds.js';
import { getGuildRankConfig } from '../database/index.js';
import { analytics } from '../utils/analytics.js';
const xpCooldowns = new Map();
export default {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || !message.guild)
            return;
        // Track message in analytics
        try {
            await analytics.trackMessage(message.author.id, message.guild.id, message.channel.id);
        }
        catch (error) {
            console.error('Analytics tracking error:', error);
        }
        // XP System with Rank Configuration
        const cooldownKey = `${message.guild.id}-${message.author.id}`;
        const now = Date.now();
        try {
            const config = await getGuildRankConfig(message.guild.id);
            const cooldownAmount = config.xpCooldown || 60000;
            // Check if channel is disabled
            if (config.disabledChannels?.includes(message.channel.id))
                return;
            // Check if only enabled channels are set and this isn't one
            if (config.enabledChannels && config.enabledChannels.length > 0 && !config.enabledChannels.includes(message.channel.id)) {
                return;
            }
            const lastXP = xpCooldowns.get(cooldownKey) || 0;
            if (now - lastXP < cooldownAmount)
                return;
            xpCooldowns.set(cooldownKey, now);
            // Calculate XP multiplier based on roles
            let multiplier = 1;
            if (config.multipliers && message.member) {
                for (const [roleId, mult] of Object.entries(config.multipliers)) {
                    if (message.member.roles.cache.has(roleId)) {
                        multiplier = Math.max(multiplier, mult);
                    }
                }
            }
            const xpAmount = config.xpPerMessage || 15;
            const randomXP = Math.floor(Math.random() * 10) + xpAmount;
            const result = await addXP(message.author.id, message.guild.id, randomXP, multiplier);
            if (result.leveledUp) {
                // Check for rank role rewards
                const rankRole = config.rankRoles?.find((r) => r.level === result.newLevel);
                if (rankRole && message.member) {
                    try {
                        await message.member.roles.add(rankRole.roleId);
                    }
                    catch (err) {
                        console.error('Failed to add rank role:', err);
                    }
                }
                // Send level up message (mention outside, username inside)
                const embed = EmbedFactory.leveling('⭐ Level Up! 🎉')
                    .setDescription(`Congratulations **${message.author.username}**! You've reached **Level ${result.newLevel}**!`)
                    .setThumbnail(message.author.displayAvatarURL({ size: 128 }))
                    .addFields({ name: '⭐ XP Gained', value: `+${result.xpGained}`, inline: true }, { name: '💫 Total XP', value: `${result.xp.toLocaleString()}`, inline: true }, { name: '🎯 Next Level', value: `${result.newLevel + 1}`, inline: true })
                    .setTimestamp();
                if (rankRole) {
                    embed.addFields({ name: '🎁 Reward Unlocked', value: `<@&${rankRole.roleId}>` });
                }
                // Send to configured channel or reply (with mention outside embed)
                const messageContent = `<@${message.author.id}>`;
                const messageOptions = {
                    content: messageContent,
                    embeds: [embed],
                    allowedMentions: { users: [message.author.id] }
                };
                if (config.levelUpChannel) {
                    const channel = message.guild.channels.cache.get(config.levelUpChannel);
                    if (channel?.isTextBased()) {
                        channel.send(messageOptions).catch(() => { });
                    }
                }
                else {
                    message.reply(messageOptions).catch(() => { });
                }
            }
        }
        catch (error) {
            console.error('XP system error:', error);
        }
        // Prefix commands
        const prefix = process.env.PREFIX || '!';
        if (!message.content.startsWith(prefix))
            return;
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();
        if (!commandName)
            return;
        // Find and execute the slash command
        const command = client.commands.get(commandName);
        if (command) {
            try {
                // Create a mock interaction object for prefix commands
                const mockInteraction = {
                    user: message.author,
                    member: message.member,
                    guild: message.guild,
                    channel: message.channel,
                    guildId: message.guild.id,
                    channelId: message.channel.id,
                    replied: false,
                    deferred: false,
                    // Mock options
                    options: {
                        getString: (name) => args[0] || null,
                        getUser: (name) => message.mentions.users.first() || null,
                        getInteger: (name) => {
                            const num = parseInt(args[0]);
                            return isNaN(num) ? null : num;
                        },
                        getBoolean: (name) => {
                            const val = args[0]?.toLowerCase();
                            return val === 'true' || val === 'yes' ? true : val === 'false' || val === 'no' ? false : null;
                        },
                        getChannel: (name) => message.mentions.channels.first() || null,
                        getRole: (name) => message.mentions.roles.first() || null,
                        getMentionable: (name) => message.mentions.users.first() || message.mentions.roles.first() || null
                    },
                    // Mock reply methods
                    reply: async (options) => {
                        mockInteraction.replied = true;
                        return message.reply(options);
                    },
                    followUp: async (options) => {
                        if ('send' in message.channel) {
                            return message.channel.send(options);
                        }
                        return null;
                    },
                    editReply: async (options) => {
                        return message.edit(options);
                    },
                    deferReply: async (options) => {
                        mockInteraction.deferred = true;
                        if ('sendTyping' in message.channel) {
                            return message.channel.sendTyping();
                        }
                        return null;
                    },
                    fetchReply: async () => {
                        return message;
                    }
                };
                // Execute the command
                await command.execute(mockInteraction, client);
            }
            catch (error) {
                console.error(`Prefix command error (${commandName}):`, error);
                const errorEmbed = EmbedFactory.error('Command Error', 'There was an error executing this command!');
                message.reply({ embeds: [errorEmbed] }).catch(() => { });
            }
        }
        else {
            // Command not found
            const embed = EmbedFactory.warning('Command Not Found', `Command \`${prefix}${commandName}\` not found.\n\nUse \`${prefix}help\` to see all commands!`);
            message.reply({ embeds: [embed] }).catch(() => { });
        }
    }
};

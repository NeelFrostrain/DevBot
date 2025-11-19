import { SlashCommandBuilder } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUserLevel } from '../../database/index.js';
import { calculateLevel, getUserRank } from '../../utils/leveling.js';
export default {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your or another user\'s rank')
        .addUserOption(option => option.setName('user')
        .setDescription('The user to check')
        .setRequired(false)),
    async execute(interaction, client) {
        const target = interaction.options.getUser('user') || interaction.user;
        try {
            // Get user level data
            const levelData = await getUserLevel(target.id, interaction.guildId);
            // Ensure totalXP exists and is in sync with xp
            const totalXP = levelData.totalXP || levelData.xp || 0;
            levelData.totalXP = totalXP;
            levelData.xp = totalXP;
            // Calculate level from totalXP
            const { level, currentXP, requiredXP } = calculateLevel(totalXP);
            // Get user's rank position
            const rank = await getUserRank(target.id, interaction.guildId);
            // Create progress bar
            const progressBar = createProgressBar(currentXP, requiredXP, 20);
            const progressPercent = Math.round((currentXP / requiredXP) * 100);
            const xpToNextLevel = requiredXP - currentXP;
            // Build embed (NO mentions inside)
            const embed = EmbedFactory.leveling(`⭐ ${target.username}'s Rank Card`)
                .setThumbnail(target.displayAvatarURL({ size: 256 }))
                .setDescription(`${progressBar}\n**${currentXP.toLocaleString()}** / **${requiredXP.toLocaleString()}** XP (**${progressPercent}%**)`)
                .addFields({ name: '🏆 Server Rank', value: rank > 0 ? `#${rank}` : 'Unranked', inline: true }, { name: '📊 Level', value: `${level}`, inline: true }, { name: '💬 Messages', value: `${levelData.messages || 0}`, inline: true }, { name: '💫 Total XP', value: `${totalXP.toLocaleString()}`, inline: true }, { name: '📈 XP to Next Level', value: `${xpToNextLevel.toLocaleString()}`, inline: true }, { name: '🎯 Next Level', value: `${level + 1}`, inline: true });
            // Apply custom rank card colors if set
            if (levelData.rankCard && levelData.rankCard.accentColor) {
                embed.setColor(levelData.rankCard.accentColor);
            }
            // Reply with mention OUTSIDE embed
            await interaction.reply({
                content: `<@${target.id}>`,
                embeds: [embed],
                allowedMentions: { users: [target.id] }
            });
        }
        catch (error) {
            console.error('Rank command error:', error);
            const errorEmbed = EmbedFactory.error('Error', 'Failed to fetch rank data. Please try again.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
/**
 * Create a visual progress bar
 */
function createProgressBar(current, max, length = 20) {
    const percentage = Math.min(Math.max(current / max, 0), 1);
    const filled = Math.round(length * percentage);
    const empty = length - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

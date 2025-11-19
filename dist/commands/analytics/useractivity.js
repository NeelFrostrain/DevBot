import { SlashCommandBuilder } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { analytics } from '../../utils/analytics.js';
export default {
    data: new SlashCommandBuilder()
        .setName('useractivity')
        .setDescription('View detailed user activity statistics')
        .addUserOption(option => option.setName('user')
        .setDescription('User to check')
        .setRequired(false)),
    async execute(interaction, client) {
        const target = interaction.options.getUser('user') || interaction.user;
        try {
            await interaction.deferReply();
            const activity = await analytics.getMemberAnalytics(target.id, interaction.guildId);
            if (!activity) {
                return interaction.editReply({
                    embeds: [EmbedFactory.error('No Data', `No activity data found for ${target.username}.`)]
                });
            }
            const daysSinceJoin = Math.floor((Date.now() - activity.joinedAt) / (1000 * 60 * 60 * 24));
            const avgMessagesPerDay = daysSinceJoin > 0 ? (activity.messages / daysSinceJoin).toFixed(1) : '0';
            const avgVoicePerDay = daysSinceJoin > 0 ? (activity.voiceMinutes / daysSinceJoin).toFixed(1) : '0';
            // Get top emojis
            const topEmojis = Object.entries(activity.emojisUsed)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([emoji, count]) => `${emoji} (${count})`)
                .join(', ') || 'None';
            const embed = EmbedFactory.leveling(`📊 ${target.username}'s Activity`)
                .setThumbnail(target.displayAvatarURL({ size: 256 }))
                .addFields({ name: '💬 Total Messages', value: activity.messages.toLocaleString(), inline: true }, { name: '🎤 Voice Minutes', value: Math.floor(activity.voiceMinutes).toLocaleString(), inline: true }, { name: '👍 Reactions', value: activity.reactions.toLocaleString(), inline: true }, { name: '📈 Activity Score', value: activity.activityScore.toLocaleString(), inline: true }, { name: '⭐ Engagement Score', value: activity.engagementScore.toLocaleString(), inline: true }, { name: '🔥 Streak', value: `${activity.streak} days`, inline: true }, { name: '📊 Avg Messages/Day', value: avgMessagesPerDay, inline: true }, { name: '🎤 Avg Voice/Day', value: `${avgVoicePerDay}m`, inline: true }, { name: '📅 Days in Server', value: daysSinceJoin.toString(), inline: true }, { name: '😀 Top Emojis', value: topEmojis })
                .setFooter({ text: `Member since ${new Date(activity.joinedAt).toLocaleDateString()}` });
            await interaction.editReply({
                content: `<@${target.id}>`,
                embeds: [embed]
            });
        }
        catch (error) {
            console.error('Useractivity command error:', error);
            await interaction.editReply({
                embeds: [EmbedFactory.error('Error', 'Failed to fetch user activity.')]
            });
        }
    }
};

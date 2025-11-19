import { SlashCommandBuilder } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getLeaderboard } from '../../utils/leveling.js';
export default {
    data: new SlashCommandBuilder()
        .setName('toprank')
        .setDescription('View the top ranked users')
        .addIntegerOption(option => option.setName('limit')
        .setDescription('Number of users to show (default: 10)')
        .setMinValue(5)
        .setMaxValue(25)
        .setRequired(false)),
    async execute(interaction, client) {
        const limit = interaction.options.getInteger('limit') || 10;
        try {
            const leaderboard = await getLeaderboard(interaction.guildId, limit);
            if (leaderboard.length === 0) {
                const embed = EmbedFactory.leveling('Top Ranks')
                    .setDescription('📊 No ranking data available yet!');
                return interaction.reply({ embeds: [embed] });
            }
            let description = '';
            for (let i = 0; i < leaderboard.length; i++) {
                const user = leaderboard[i];
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
                description += `${medal} <@${user.id}>\n`;
                description += `└ Level **${user.level}** • ${user.totalXP.toLocaleString()} Total XP • ${user.messages || 0} messages\n\n`;
            }
            const embed = EmbedFactory.leveling(`🏆 Top ${limit} Ranks`)
                .setDescription(description)
                .setFooter({ text: `Showing top ${leaderboard.length} users` });
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error('Toprank command error:', error);
            const errorEmbed = EmbedFactory.error('Error', 'Failed to fetch top ranks.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

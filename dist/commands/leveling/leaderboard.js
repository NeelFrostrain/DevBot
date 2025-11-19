import { SlashCommandBuilder } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getLeaderboard, getEconomyLeaderboard, calculateLevel } from '../../utils/leveling.js';
export default {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the server leaderboard')
        .addStringOption(option => option.setName('type')
        .setDescription('Leaderboard type')
        .addChoices({ name: 'Levels', value: 'levels' }, { name: 'Economy', value: 'economy' })
        .setRequired(false))
        .addIntegerOption(option => option.setName('page')
        .setDescription('Page number (10 users per page)')
        .setMinValue(1)
        .setRequired(false)),
    async execute(interaction, client) {
        const type = interaction.options.getString('type') || 'levels';
        const page = interaction.options.getInteger('page') || 1;
        const perPage = 10;
        try {
            await interaction.deferReply();
            if (type === 'economy') {
                // ==================== ECONOMY LEADERBOARD ====================
                const allUsers = await getEconomyLeaderboard(interaction.guildId, 9999);
                if (allUsers.length === 0) {
                    const embed = EmbedFactory.economy('💰 Economy Leaderboard')
                        .setDescription('📊 No economy data available yet!\n\nStart earning coins with:\n• `/daily` - Claim daily rewards\n• `/work` - Work for coins\n• `/coinflip` - Gamble your coins');
                    return interaction.editReply({ embeds: [embed] });
                }
                // Paginate
                const totalPages = Math.ceil(allUsers.length / perPage);
                const startIndex = (page - 1) * perPage;
                const endIndex = startIndex + perPage;
                const leaderboard = allUsers.slice(startIndex, endIndex);
                const embed = EmbedFactory.economy(`💰 Economy Leaderboard - Page ${page}/${totalPages}`);
                let description = '';
                for (let i = 0; i < leaderboard.length; i++) {
                    const user = leaderboard[i];
                    const position = startIndex + i + 1;
                    const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `**${position}.**`;
                    // Get user's level for display
                    const { level } = calculateLevel(user.totalXP || 0);
                    description += `${medal} <@${user.id}>\n`;
                    description += `└ 💰 **${user.totalWealth.toLocaleString()}** coins • ⭐ Level ${level}\n`;
                    description += `   💵 Wallet: ${user.balance.toLocaleString()} | 🏦 Bank: ${user.bank.toLocaleString()}\n\n`;
                }
                embed.setDescription(description);
                embed.setFooter({ text: `Showing ${allUsers.length} total users • Page ${page}/${totalPages}` });
                await interaction.editReply({ embeds: [embed] });
            }
            else {
                // ==================== LEVEL LEADERBOARD ====================
                const allUsers = await getLeaderboard(interaction.guildId, 9999);
                if (allUsers.length === 0) {
                    const embed = EmbedFactory.leveling('⭐ Level Leaderboard')
                        .setDescription('📊 No level data available yet!\n\nStart chatting in the server to earn XP and level up!');
                    return interaction.editReply({ embeds: [embed] });
                }
                // Paginate
                const totalPages = Math.ceil(allUsers.length / perPage);
                const startIndex = (page - 1) * perPage;
                const endIndex = startIndex + perPage;
                const leaderboard = allUsers.slice(startIndex, endIndex);
                const embed = EmbedFactory.leveling(`⭐ Level Leaderboard - Page ${page}/${totalPages}`);
                let description = '';
                for (let i = 0; i < leaderboard.length; i++) {
                    const user = leaderboard[i];
                    const position = startIndex + i + 1;
                    const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `**${position}.**`;
                    description += `${medal} <@${user.id}>\n`;
                    description += `└ Level **${user.level}** • 💫 ${user.totalXP.toLocaleString()} Total XP\n`;
                    description += `   💬 ${user.messages || 0} messages\n\n`;
                }
                embed.setDescription(description);
                embed.setFooter({ text: `Showing ${allUsers.length} total users • Page ${page}/${totalPages}` });
                await interaction.editReply({ embeds: [embed] });
            }
        }
        catch (error) {
            console.error('Leaderboard command error:', error);
            const errorEmbed = EmbedFactory.error('Error', 'Failed to fetch leaderboard data. Please try again.');
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            }
            else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};

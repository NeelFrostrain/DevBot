import { SlashCommandBuilder } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUserLevel } from '../../database/index.js';
import { calculateLevel } from '../../utils/leveling.js';
export default {
    data: new SlashCommandBuilder()
        .setName('rankcompare')
        .setDescription('Compare your rank with another user')
        .addUserOption(option => option.setName('user')
        .setDescription('The user to compare with')
        .setRequired(true)),
    async execute(interaction, client) {
        const target = interaction.options.getUser('user', true);
        if (target.id === interaction.user.id) {
            return interaction.reply({
                embeds: [EmbedFactory.error('Error', 'You cannot compare with yourself!')],
                ephemeral: true
            });
        }
        try {
            const user1Data = await getUserLevel(interaction.user.id, interaction.guildId);
            const user2Data = await getUserLevel(target.id, interaction.guildId);
            const user1Calc = calculateLevel(user1Data.xp);
            const user2Calc = calculateLevel(user2Data.xp);
            const xpDiff = user1Data.xp - user2Data.xp;
            const levelDiff = user1Calc.level - user2Calc.level;
            const messageDiff = (user1Data.messages || 0) - (user2Data.messages || 0);
            let comparison = '';
            if (xpDiff > 0) {
                comparison = `You are ahead by **${xpDiff.toLocaleString()} XP** and **${levelDiff} level${Math.abs(levelDiff) !== 1 ? 's' : ''}**! 🎉`;
            }
            else if (xpDiff < 0) {
                comparison = `**${target.username}** is ahead by **${Math.abs(xpDiff).toLocaleString()} XP** and **${Math.abs(levelDiff)} level${Math.abs(levelDiff) !== 1 ? 's' : ''}**! 💪`;
            }
            else {
                comparison = `You're tied! Both at the same XP! 🤝`;
            }
            const embed = EmbedFactory.leveling('⚔️ Rank Comparison')
                .setDescription(comparison)
                .addFields({ name: `${interaction.user.username}`, value: `**Level ${user1Calc.level}**\n${user1Data.xp.toLocaleString()} XP\n${user1Data.messages || 0} messages`, inline: true }, { name: '⚔️', value: 'VS', inline: true }, { name: `${target.username}`, value: `**Level ${user2Calc.level}**\n${user2Data.xp.toLocaleString()} XP\n${user2Data.messages || 0} messages`, inline: true })
                .addFields({ name: '📊 XP Difference', value: `${xpDiff > 0 ? '+' : ''}${xpDiff.toLocaleString()}`, inline: true }, { name: '📈 Level Difference', value: `${levelDiff > 0 ? '+' : ''}${levelDiff}`, inline: true }, { name: '💬 Message Difference', value: `${messageDiff > 0 ? '+' : ''}${messageDiff}`, inline: true });
            await interaction.reply({
                content: `<@${interaction.user.id}> vs <@${target.id}>`,
                embeds: [embed],
                allowedMentions: { users: [interaction.user.id, target.id] }
            });
        }
        catch (error) {
            console.error('Rankcompare command error:', error);
            const errorEmbed = EmbedFactory.error('Error', 'Failed to compare ranks.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

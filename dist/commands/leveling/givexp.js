import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { addXP } from '../../utils/leveling.js';
export default {
    data: new SlashCommandBuilder()
        .setName('givexp')
        .setDescription('Give XP to a user (Admin only)')
        .addUserOption(option => option.setName('user')
        .setDescription('The user to give XP to')
        .setRequired(true))
        .addIntegerOption(option => option.setName('amount')
        .setDescription('Amount of XP to give')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100000))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        const target = interaction.options.getUser('user', true);
        const amount = interaction.options.getInteger('amount', true);
        if (target.bot) {
            return interaction.reply({
                embeds: [EmbedFactory.error('Error', 'You cannot give XP to bots.')],
                ephemeral: true
            });
        }
        try {
            const result = await addXP(target.id, interaction.guildId, amount);
            const embed = EmbedFactory.success('XP Given', `Successfully gave **${amount} XP** to **${target.username}**!`)
                .addFields({ name: '📊 New Level', value: `${result.level}`, inline: true }, { name: '💫 Total XP', value: `${result.xp.toLocaleString()}`, inline: true });
            if (result.leveledUp) {
                embed.addFields({ name: '🎉 Level Up!', value: `**${target.username}** leveled up to **${result.newLevel}**!` });
            }
            await interaction.reply({
                content: `<@${target.id}>`,
                embeds: [embed],
                allowedMentions: { users: [target.id] }
            });
        }
        catch (error) {
            console.error('Givexp command error:', error);
            const errorEmbed = EmbedFactory.error('Error', 'Failed to give XP.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { ExtendedClient } from '../../types/index.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { updateUserLevel } from '../../database/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rankreset')
    .setDescription('Reset a user\'s rank and XP (Admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to reset')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const target = interaction.options.getUser('user', true);

    try {
      await updateUserLevel(target.id, interaction.guildId!, {
        xp: 0,
        level: 1,
        totalXP: 0,
        messages: 0
      });

      const embed = EmbedFactory.success(
        'Rank Reset',
        `Successfully reset **${target.username}**'s rank and XP.`
      );

      await interaction.reply({ 
        content: `<@${target.id}>`,
        embeds: [embed],
        allowedMentions: { users: [target.id] }
      });
    } catch (error) {
      console.error('Rankreset command error:', error);
      const errorEmbed = EmbedFactory.error('Error', 'Failed to reset rank.');
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};

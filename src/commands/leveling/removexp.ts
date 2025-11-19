import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { ExtendedClient } from '../../types/index.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUserLevel, updateUserLevel } from '../../database/index.js';
import { calculateLevel } from '../../utils/leveling.js';

export default {
  data: new SlashCommandBuilder()
    .setName('removexp')
    .setDescription('Remove XP from a user (Admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to remove XP from')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount of XP to remove')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100000)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);

    if (target.bot) {
      return interaction.reply({
        embeds: [EmbedFactory.error('Error', 'You cannot remove XP from bots.')],
        ephemeral: true
      });
    }

    try {
      const levelData = await getUserLevel(target.id, interaction.guildId!);
      const oldLevel = levelData.level;
      
      levelData.xp = Math.max(0, levelData.xp - amount);
      levelData.totalXP = Math.max(0, levelData.totalXP - amount);

      const { level, currentXP, requiredXP } = calculateLevel(levelData.xp);
      levelData.level = level;

      await updateUserLevel(target.id, interaction.guildId!, levelData);

      const embed = EmbedFactory.success(
        'XP Removed',
        `Successfully removed **${amount} XP** from **${target.username}**!`
      )
        .addFields(
          { name: '📊 New Level', value: `${level}`, inline: true },
          { name: '💫 Total XP', value: `${levelData.xp.toLocaleString()}`, inline: true }
        );

      if (level < oldLevel) {
        embed.addFields({ name: '📉 Level Down', value: `**${target.username}** is now level **${level}** (was ${oldLevel})` });
      }

      await interaction.reply({ 
        content: `<@${target.id}>`,
        embeds: [embed],
        allowedMentions: { users: [target.id] }
      });
    } catch (error) {
      console.error('Removexp command error:', error);
      const errorEmbed = EmbedFactory.error('Error', 'Failed to remove XP.');
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};

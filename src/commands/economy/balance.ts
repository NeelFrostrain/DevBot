import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ExtendedClient } from '../../types/index.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUser } from '../../database/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your or another user\'s balance')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check')
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const target = interaction.options.getUser('user') || interaction.user;
    
    try {
      const user = await getUser(target.id, interaction.guildId!);

      const embed = EmbedFactory.economy(`💰 ${target.username}'s Balance`)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: '💵 Wallet', value: `${user.balance.toLocaleString()} coins`, inline: true },
          { name: '🏦 Bank', value: `${user.bank.toLocaleString()} coins`, inline: true },
          { name: '💎 Total', value: `${(user.balance + user.bank).toLocaleString()} coins`, inline: true }
        );

      await interaction.reply({ 
        content: `<@${target.id}>`,
        embeds: [embed],
        allowedMentions: { users: [target.id] }
      });
    } catch (error) {
      console.error('Balance command error:', error);
      const errorEmbed = EmbedFactory.error(
        'Database Error',
        'Failed to fetch balance. Please try again later.'
      );
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};

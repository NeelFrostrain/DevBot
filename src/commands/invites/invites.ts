import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ExtendedClient } from '../../types/index.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { inviteTracker } from '../../utils/inviteTracker.js';

export default {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Check invite statistics')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const target = interaction.options.getUser('user') || interaction.user;

    try {
      const stats = await inviteTracker.getUserInvites(target.id, interaction.guildId!);

      if (!stats) {
        return interaction.reply({
          embeds: [EmbedFactory.error('No Data', `${target.username} hasn't invited anyone yet.`)],
          ephemeral: true
        });
      }

      const totalValid = stats.realInvites - stats.leftInvites;

      const embed = EmbedFactory.leveling(`🎫 ${target.username}'s Invites`)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: '✅ Total Invites', value: stats.totalInvites.toString(), inline: true },
          { name: '👥 Real Invites', value: stats.realInvites.toString(), inline: true },
          { name: '🚫 Fake Invites', value: stats.fakeInvites.toString(), inline: true },
          { name: '👋 Left Server', value: stats.leftInvites.toString(), inline: true },
          { name: '🎁 Bonus Invites', value: stats.bonusInvites.toString(), inline: true },
          { name: '💎 Valid Invites', value: totalValid.toString(), inline: true }
        );

      if (stats.rank > 0) {
        embed.setFooter({ text: `Server Rank: #${stats.rank}` });
      }

      await interaction.reply({ 
        content: `<@${target.id}>`,
        embeds: [embed],
        allowedMentions: { users: [target.id] }
      });
    } catch (error) {
      console.error('Invites command error:', error);
      await interaction.reply({
        embeds: [EmbedFactory.error('Error', 'Failed to fetch invite statistics.')],
        ephemeral: true
      });
    }
  }
};

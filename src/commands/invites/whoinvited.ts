import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ExtendedClient } from '../../types/index.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getDatabase } from '../../database/index.js';
import { InviteUse } from '../../types/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('whoinvited')
    .setDescription('Check who invited a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const target = interaction.options.getUser('user', true);

    try {
      const db = getDatabase();
      const inviteUse = await db.get(`inviteUses.${interaction.guildId}.${target.id}`) as InviteUse;

      if (!inviteUse) {
        return interaction.reply({
          embeds: [EmbedFactory.error('No Data', `No invite data found for **${target.username}**.`)],
          ephemeral: true
        });
      }

      const accountAgeDays = Math.floor(inviteUse.accountAge);
      const accountAgeText = accountAgeDays < 1 
        ? `${Math.floor(inviteUse.accountAge * 24)} hours`
        : `${accountAgeDays} days`;

      const embed = EmbedFactory.leveling(`🎫 ${target.username}'s Invite Information`)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: '👤 Username', value: target.username, inline: true },
          { name: '🎫 Invited By', value: inviteUse.inviterId !== 'unknown' ? `<@${inviteUse.inviterId}>` : 'Unknown', inline: true },
          { name: '📅 Account Age', value: accountAgeText, inline: true },
          { name: '🔗 Invite Code', value: inviteUse.inviteCode, inline: true },
          { name: '📊 Join Method', value: inviteUse.joinMethod, inline: true },
          { name: '⏰ Joined At', value: `<t:${Math.floor(inviteUse.joinedAt / 1000)}:R>`, inline: true }
        );

      if (inviteUse.isFake) {
        embed.setColor('#ff0000');
        embed.addFields({ name: '⚠️ Status', value: '🚫 Flagged as Fake/Suspicious' });
      } else {
        embed.addFields({ name: '✅ Status', value: '✅ Real Account' });
      }

      if (inviteUse.leftAt) {
        embed.addFields({ 
          name: '👋 Left Server', 
          value: `<t:${Math.floor(inviteUse.leftAt / 1000)}:R>` 
        });
      }

      await interaction.reply({ 
        content: `<@${target.id}>`,
        embeds: [embed],
        allowedMentions: { users: [target.id] }
      });
    } catch (error) {
      console.error('Whoinvited command error:', error);
      await interaction.reply({
        embeds: [EmbedFactory.error('Error', 'Failed to fetch invite information.')],
        ephemeral: true
      });
    }
  }
};

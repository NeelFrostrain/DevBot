import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ExtendedClient } from '../../types/index.js';
import { EmbedFactory } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get information about a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to get info about')
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const target = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild?.members.fetch(target.id);

    if (!member) {
      const errorEmbed = EmbedFactory.error('Error', 'Could not fetch member information.');
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    const roles = member.roles.cache
      .filter(role => role.id !== interaction.guildId)
      .sort((a, b) => b.position - a.position)
      .map(role => role.toString())
      .slice(0, 10);

    const embed = EmbedFactory.info(`👤 ${target.username}'s Information`)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '👤 Username', value: target.username, inline: true },
        { name: '🆔 ID', value: target.id, inline: true },
        { name: '🤖 Bot', value: target.bot ? 'Yes' : 'No', inline: true },
        { name: '📅 Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`, inline: true },
        { name: `🎭 Roles [${roles.length}]`, value: roles.join(', ') || 'None', inline: false }
      );

    await interaction.reply({ 
      content: `<@${target.id}>`,
      embeds: [embed],
      allowedMentions: { users: [target.id] }
    });
  }
};

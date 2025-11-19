import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ExtendedClient } from '../../types/index.js';
import { EmbedFactory } from '../../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Get a user\'s avatar')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to get avatar from')
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const target = interaction.options.getUser('user') || interaction.user;

    const embed = EmbedFactory.info(`🖼️ ${target.username}'s Avatar`)
      .setImage(target.displayAvatarURL({ size: 1024 }));

    await interaction.reply({ 
      content: `<@${target.id}>`,
      embeds: [embed],
      allowedMentions: { users: [target.id] }
    });
  }
};

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ExtendedClient } from '../../types/index.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { useItem, getUsableItems, formatItemEffect } from '../../utils/useItem.js';
import { getItem } from '../../utils/itemService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('use')
    .setDescription('Use an item from your inventory')
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Item to use')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const itemId = interaction.options.getString('item', true);

    try {
      const result = await useItem(interaction.user.id, 'global', itemId, 'general');

      if (!result.success) {
        return interaction.reply({
          embeds: [EmbedFactory.error('Cannot Use Item', result.error || 'Unknown error')],
          ephemeral: true
        });
      }

      const item = getItem(itemId);
      const embed = EmbedFactory.success('Item Used! ✨')
        .setDescription(`You used **${item?.emoji} ${item?.name}**!`);

      if (result.effect) {
        embed.addFields({
          name: 'Effect',
          value: formatItemEffect(result.effect)
        });
      }

      if (result.message) {
        embed.setFooter({ text: result.message });
      }

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Use command error:', error);
      return interaction.reply({
        embeds: [EmbedFactory.error('Error', 'Failed to use item.')],
        ephemeral: true
      });
    }
  }
};

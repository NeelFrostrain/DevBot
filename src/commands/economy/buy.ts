import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ExtendedClient } from '../../types/index.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUser, updateUser, getDatabase } from '../../database/index.js';
import { getItemById, getRarityEmoji } from '../../data/shopItems.js';

export default {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop')
    .addStringOption(option =>
      option.setName('item')
        .setDescription('The item ID to buy (use /shop to see all items)')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount to buy')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const itemId = interaction.options.getString('item', true);
    const amount = interaction.options.getInteger('amount') || 1;
    const item = getItemById(itemId);

    if (!item) {
      const embed = EmbedFactory.error('Item Not Found', 'This item does not exist in the shop.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      const user = await getUser(interaction.user.id, 'global');
      const totalCost = item.price * amount;

      if (user.balance < totalCost) {
        const embed = EmbedFactory.error(
          'Insufficient Funds',
          `You need **${totalCost.toLocaleString()}** coins but only have **${user.balance.toLocaleString()}** coins.`
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      user.balance -= totalCost;
      await updateUser(interaction.user.id, 'global', { balance: user.balance });

      const db = getDatabase();
      const inventoryPath = `inventory.${interaction.guildId}.${interaction.user.id}`;
      const inventory = await db.get(inventoryPath) || { items: [] };

      for (let i = 0; i < amount; i++) {
        inventory.items.push({ ...item, uniqueId: Date.now() + i, acquiredAt: Date.now() });
      }

      await db.set(inventoryPath, inventory);

      const rarityEmoji = getRarityEmoji(item.rarity);
      const embed = EmbedFactory.success('Purchase Successful!')
        .setDescription(`You bought **${amount}x ${rarityEmoji} ${item.name}** for **${totalCost.toLocaleString()}** coins!`)
        .addFields(
          { name: '💰 Remaining Balance', value: `${user.balance.toLocaleString()} coins`, inline: true },
          { name: '📦 Item Type', value: item.type, inline: true },
          { name: '✨ Rarity', value: `${rarityEmoji} ${item.rarity}`, inline: true }
        );

      if (item.description) {
        embed.setFooter({ text: item.description });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Buy command error:', error);
      const errorEmbed = EmbedFactory.error('Error', 'Failed to purchase item. Please try again.');
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};

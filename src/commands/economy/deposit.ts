import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ExtendedClient } from '../../types/index.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUser, updateUser } from '../../database/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposit coins to your bank')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Amount to deposit (or "all")')
        .setMinValue(1)
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const amount = interaction.options.getInteger('amount', true);

    try {
      const user = await getUser(interaction.user.id, 'global');

      if (user.balance < amount) {
        const embed = EmbedFactory.error('Insufficient Funds', `You only have **${user.balance.toLocaleString()}** coins in your wallet.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      user.balance -= amount;
      user.bank += amount;

      await updateUser(interaction.user.id, 'global', { balance: user.balance, bank: user.bank });

      const embed = EmbedFactory.economy('Deposit Successful')
        .setDescription(`💵 Deposited **${amount.toLocaleString()}** coins to your bank!`)
        .addFields(
          { name: '💵 Wallet', value: `${user.balance.toLocaleString()} coins`, inline: true },
          { name: '🏦 Bank', value: `${user.bank.toLocaleString()} coins`, inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Deposit command error:', error);
      const errorEmbed = EmbedFactory.error('Error', 'Failed to deposit coins.');
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};

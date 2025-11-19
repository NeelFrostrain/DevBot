import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ExtendedClient } from '../../types/index.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUser, updateUser } from '../../database/index.js';

const emojis = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];

export default {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Play the slot machine')
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('Amount to bet')
        .setMinValue(10)
        .setRequired(true)
    ),
  cooldown: 5,
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const bet = interaction.options.getInteger('bet', true);

    try {
      const user = await getUser(interaction.user.id, 'global');

      if (user.balance < bet) {
        const embed = EmbedFactory.error(
          'Insufficient Funds',
          `You don't have enough coins! You only have **${user.balance.toLocaleString()}** coins.`
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const slots = [
        emojis[Math.floor(Math.random() * emojis.length)],
        emojis[Math.floor(Math.random() * emojis.length)],
        emojis[Math.floor(Math.random() * emojis.length)]
      ];

      let winnings = 0;
      let result = '';

      if (slots[0] === slots[1] && slots[1] === slots[2]) {
        if (slots[0] === '7️⃣') {
          winnings = bet * 10;
          result = '🎰 **JACKPOT!** 🎰';
        } else if (slots[0] === '💎') {
          winnings = bet * 5;
          result = '💎 **Triple Diamonds!** 💎';
        } else {
          winnings = bet * 3;
          result = '🎉 **Triple Match!** 🎉';
        }
      } else if (slots[0] === slots[1] || slots[1] === slots[2] || slots[0] === slots[2]) {
        winnings = Math.floor(bet * 1.5);
        result = '✨ **Double Match!** ✨';
      } else {
        winnings = -bet;
        result = '😢 No match...';
      }

      user.balance += winnings;
      await updateUser(interaction.user.id, 'global', { balance: user.balance });

      const embed = EmbedFactory.custom(winnings > 0 ? '#00FF00' : '#FF0000', '🎰 Slot Machine')
        .setDescription(`${slots.join(' | ')}\n\n${result}`)
        .addFields(
          { name: '💰 Bet', value: `${bet.toLocaleString()} coins`, inline: true },
          { name: '🎁 Result', value: `${winnings > 0 ? '+' : ''}${winnings.toLocaleString()} coins`, inline: true },
          { name: '💵 Balance', value: `${user.balance.toLocaleString()} coins`, inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Slots command error:', error);
      const errorEmbed = EmbedFactory.error('Error', 'Failed to play slots. Please try again.');
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};

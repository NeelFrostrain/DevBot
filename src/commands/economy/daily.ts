import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ExtendedClient } from '../../types/index.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUser, updateUser, getDatabase } from '../../database/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward'),
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const userId = interaction.user.id;
    const guildId = 'global';
    const db = getDatabase();
    const cooldownKey = `cooldowns.daily.${guildId}.${userId}`;

    try {
      const lastClaim = await db.get(cooldownKey);
      const now = Date.now();
      const cooldown = client.config.economy.dailyCooldown;

      if (lastClaim && now - lastClaim < cooldown) {
        const timeLeft = cooldown - (now - lastClaim);
        const hours = Math.floor(timeLeft / 3600000);
        const minutes = Math.floor((timeLeft % 3600000) / 60000);

        const embed = EmbedFactory.warning(
          'Daily Reward Already Claimed',
          `⏰ Come back in **${hours}h ${minutes}m** to claim your next daily reward!`
        );
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const user = await getUser(userId, guildId);
      const amount = client.config.economy.dailyAmount;
      user.balance += amount;

      await updateUser(userId, guildId, { balance: user.balance });
      await db.set(cooldownKey, now);

      const embed = EmbedFactory.economy('Daily Reward Claimed!')
        .setDescription(`<@${interaction.user.id}> received **${amount.toLocaleString()}** coins! 🎁`)
        .addFields({ name: '💰 New Balance', value: `${user.balance.toLocaleString()} coins` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Daily command error:', error);
      const errorEmbed = EmbedFactory.error('Error', 'Failed to claim daily reward. Please try again.');
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};

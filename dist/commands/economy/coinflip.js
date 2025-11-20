import { SlashCommandBuilder } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUser, updateUser } from '../../database/index.js';
export default {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin and bet on the outcome')
        .addStringOption(option => option.setName('choice')
        .setDescription('Heads or Tails')
        .setRequired(true)
        .addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' }))
        .addIntegerOption(option => option.setName('bet')
        .setDescription('Amount to bet')
        .setMinValue(10)
        .setRequired(true)),
    cooldown: 3,
    async execute(interaction, client) {
        const choice = interaction.options.getString('choice', true);
        const bet = interaction.options.getInteger('bet', true);
        try {
            const user = await getUser(interaction.user.id, 'global');
            if (user.balance < bet) {
                const embed = EmbedFactory.error('Insufficient Funds', `You don't have enough coins! You only have **${user.balance.toLocaleString()}** coins.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            const won = result === choice;
            const winnings = won ? bet : -bet;
            user.balance += winnings;
            await updateUser(interaction.user.id, 'global', { balance: user.balance });
            const embed = EmbedFactory.custom(won ? '#00FF00' : '#FF0000', '🪙 Coinflip')
                .setDescription(`<@${interaction.user.id}>, the coin landed on **${result}**!`)
                .addFields({ name: '🎯 Your Choice', value: choice, inline: true }, { name: '🎁 Result', value: won ? `Won ${bet.toLocaleString()} coins!` : `Lost ${bet.toLocaleString()} coins!`, inline: true }, { name: '💵 Balance', value: `${user.balance.toLocaleString()} coins`, inline: true });
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error('Coinflip command error:', error);
            const errorEmbed = EmbedFactory.error('Error', 'Failed to flip coin. Please try again.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

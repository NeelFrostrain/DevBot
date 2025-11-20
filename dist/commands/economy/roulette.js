import { SlashCommandBuilder } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUser, updateUser } from '../../database/index.js';
export default {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Play roulette')
        .addStringOption(option => option.setName('bet_type')
        .setDescription('Type of bet')
        .setRequired(true)
        .addChoices({ name: 'Red', value: 'red' }, { name: 'Black', value: 'black' }, { name: 'Green (0)', value: 'green' }, { name: 'Odd', value: 'odd' }, { name: 'Even', value: 'even' }))
        .addIntegerOption(option => option.setName('amount')
        .setDescription('Amount to bet')
        .setMinValue(10)
        .setRequired(true)),
    cooldown: 5,
    async execute(interaction, client) {
        const betType = interaction.options.getString('bet_type', true);
        const amount = interaction.options.getInteger('amount', true);
        try {
            const user = await getUser(interaction.user.id, 'global');
            if (user.balance < amount) {
                const embed = EmbedFactory.error('Insufficient Funds', `You only have **${user.balance.toLocaleString()}** coins.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            const number = Math.floor(Math.random() * 37);
            const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
            const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
            let color = 'green';
            if (redNumbers.includes(number))
                color = 'red';
            if (blackNumbers.includes(number))
                color = 'black';
            let won = false;
            let multiplier = 0;
            if (betType === 'green' && number === 0) {
                won = true;
                multiplier = 35;
            }
            else if (betType === 'red' && color === 'red') {
                won = true;
                multiplier = 2;
            }
            else if (betType === 'black' && color === 'black') {
                won = true;
                multiplier = 2;
            }
            else if (betType === 'odd' && number % 2 === 1 && number !== 0) {
                won = true;
                multiplier = 2;
            }
            else if (betType === 'even' && number % 2 === 0 && number !== 0) {
                won = true;
                multiplier = 2;
            }
            const winnings = won ? amount * multiplier : -amount;
            user.balance += winnings;
            await updateUser(interaction.user.id, 'global', { balance: user.balance });
            const colorEmoji = color === 'red' ? '🔴' : color === 'black' ? '⚫' : '🟢';
            const embed = EmbedFactory.custom(won ? '#00FF00' : '#FF0000', '🎰 Roulette')
                .setDescription(`The ball landed on ${colorEmoji} **${number}**!`)
                .addFields({ name: 'Your Bet', value: `${betType} - ${amount.toLocaleString()} coins`, inline: true }, { name: 'Result', value: won ? `Won ${winnings.toLocaleString()} coins!` : `Lost ${amount.toLocaleString()} coins!`, inline: true }, { name: 'Balance', value: `${user.balance.toLocaleString()} coins`, inline: true });
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error('Roulette command error:', error);
            const errorEmbed = EmbedFactory.error('Error', 'Failed to play roulette.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

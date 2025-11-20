import { SlashCommandBuilder } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUser, updateUser } from '../../database/index.js';
export default {
    data: new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('Withdraw coins from your bank')
        .addIntegerOption(option => option.setName('amount')
        .setDescription('Amount to withdraw')
        .setMinValue(1)
        .setRequired(true)),
    async execute(interaction, client) {
        const amount = interaction.options.getInteger('amount', true);
        try {
            const user = await getUser(interaction.user.id, 'global');
            if (user.bank < amount) {
                const embed = EmbedFactory.error('Insufficient Funds', `You only have **${user.bank.toLocaleString()}** coins in your bank.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            user.bank -= amount;
            user.balance += amount;
            await updateUser(interaction.user.id, 'global', { balance: user.balance, bank: user.bank });
            const embed = EmbedFactory.economy('Withdrawal Successful')
                .setDescription(`🏦 Withdrew **${amount.toLocaleString()}** coins from your bank!`)
                .addFields({ name: '💵 Wallet', value: `${user.balance.toLocaleString()} coins`, inline: true }, { name: '🏦 Bank', value: `${user.bank.toLocaleString()} coins`, inline: true });
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error('Withdraw command error:', error);
            const errorEmbed = EmbedFactory.error('Error', 'Failed to withdraw coins.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

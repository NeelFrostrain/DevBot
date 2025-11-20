import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUser, updateUser } from '../../database/index.js';
const activeTrades = new Map();
export default {
    data: new SlashCommandBuilder()
        .setName('trade')
        .setDescription('Trade coins with another user')
        .addUserOption(option => option.setName('user')
        .setDescription('The user to trade with')
        .setRequired(true))
        .addIntegerOption(option => option.setName('amount')
        .setDescription('Amount of coins to give')
        .setMinValue(1)
        .setRequired(true)),
    async execute(interaction, client) {
        const target = interaction.options.getUser('user', true);
        const amount = interaction.options.getInteger('amount', true);
        if (target.bot) {
            const embed = EmbedFactory.error('Invalid Target', 'You cannot trade with bots!');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        if (target.id === interaction.user.id) {
            const embed = EmbedFactory.error('Invalid Target', 'You cannot trade with yourself!');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        const tradeId = `${interaction.user.id}-${target.id}`;
        if (activeTrades.has(tradeId)) {
            const embed = EmbedFactory.warning('Trade Active', 'You already have an active trade with this user!');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        try {
            const user = await getUser(interaction.user.id, 'global');
            if (user.balance < amount) {
                const embed = EmbedFactory.error('Insufficient Funds', `You don't have enough coins! You only have **${user.balance.toLocaleString()}** coins.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            const row = new ActionRowBuilder()
                .addComponents(new ButtonBuilder()
                .setCustomId('accept_trade')
                .setLabel('Accept')
                .setStyle(ButtonStyle.Success), new ButtonBuilder()
                .setCustomId('decline_trade')
                .setLabel('Decline')
                .setStyle(ButtonStyle.Danger));
            const embed = EmbedFactory.economy('Trade Offer')
                .setDescription(`<@${interaction.user.id}> wants to give <@${target.id}> **${amount.toLocaleString()}** coins!`);
            await interaction.reply({
                content: `${target}`,
                embeds: [embed],
                components: [row]
            });
            const response = await interaction.fetchReply();
            activeTrades.set(tradeId, { from: interaction.user.id, to: target.id, amount, guildId: interaction.guildId });
            const collector = response.createMessageComponentCollector({ time: 60000 });
            collector.on('collect', async (i) => {
                if (i.user.id !== target.id) {
                    const errorEmbed = EmbedFactory.error('Not For You', 'This trade is not for you!');
                    return i.reply({ embeds: [errorEmbed], ephemeral: true });
                }
                if (i.customId === 'accept_trade') {
                    const fromUser = await getUser(interaction.user.id, 'global');
                    if (fromUser.balance < amount) {
                        const errorEmbed = EmbedFactory.error('Trade Failed', 'The sender doesn\'t have enough coins anymore.');
                        await i.update({ embeds: [errorEmbed], components: [] });
                    }
                    else {
                        fromUser.balance -= amount;
                        await updateUser(interaction.user.id, 'global', { balance: fromUser.balance });
                        const toUser = await getUser(target.id, 'global');
                        toUser.balance += amount;
                        await updateUser(target.id, 'global', { balance: toUser.balance });
                        const successEmbed = EmbedFactory.success('Trade Successful!')
                            .setDescription(`<@${interaction.user.id}> gave <@${target.id}> **${amount.toLocaleString()}** coins!`);
                        await i.update({ embeds: [successEmbed], components: [] });
                    }
                }
                else {
                    const declineEmbed = EmbedFactory.warning('Trade Declined', 'The trade was declined.');
                    await i.update({ embeds: [declineEmbed], components: [] });
                }
                activeTrades.delete(tradeId);
                collector.stop();
            });
            collector.on('end', collected => {
                if (collected.size === 0) {
                    const expiredEmbed = EmbedFactory.warning('Trade Expired', 'The trade offer has expired.');
                    interaction.editReply({ embeds: [expiredEmbed], components: [] }).catch(() => { });
                    activeTrades.delete(tradeId);
                }
            });
        }
        catch (error) {
            console.error('Trade command error:', error);
            const errorEmbed = EmbedFactory.error('Error', 'Failed to initiate trade. Please try again.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

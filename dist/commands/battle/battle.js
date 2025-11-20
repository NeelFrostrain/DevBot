import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUser, updateUser } from '../../database/index.js';
const activeBattles = new Map();
function simulateBattle(playerHP, playerDamage, opponentHP, opponentDamage) {
    const log = [];
    let pHP = playerHP;
    let oHP = opponentHP;
    let turn = 1;
    while (pHP > 0 && oHP > 0 && turn <= 10) {
        const pAttack = playerDamage + Math.floor(Math.random() * 10);
        oHP -= pAttack;
        log.push(`Turn ${turn}: You dealt ${pAttack} damage`);
        if (oHP <= 0) {
            log.push('✅ You won!');
            break;
        }
        const oAttack = opponentDamage + Math.floor(Math.random() * 10);
        pHP -= oAttack;
        log.push(`Turn ${turn}: Opponent dealt ${oAttack} damage`);
        if (pHP <= 0) {
            log.push('💀 You lost!');
            break;
        }
        turn++;
    }
    return {
        won: pHP > 0,
        log: log,
        remainingHP: Math.max(0, pHP)
    };
}
export default {
    data: new SlashCommandBuilder()
        .setName('battle')
        .setDescription('Challenge another user to a PvP battle')
        .addUserOption(option => option.setName('user')
        .setDescription('The user to battle')
        .setRequired(true))
        .addIntegerOption(option => option.setName('wager')
        .setDescription('Amount to wager (winner takes all)')
        .setMinValue(0)
        .setRequired(false)),
    async execute(interaction, client) {
        const target = interaction.options.getUser('user', true);
        const wager = interaction.options.getInteger('wager') || 0;
        if (target.bot) {
            const embed = EmbedFactory.error('Invalid Target', 'You cannot battle bots!');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        if (target.id === interaction.user.id) {
            const embed = EmbedFactory.error('Invalid Target', 'You cannot battle yourself!');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        const battleId = `${interaction.user.id}-${target.id}`;
        if (activeBattles.has(battleId)) {
            const embed = EmbedFactory.warning('Battle Active', 'You already have an active battle with this user!');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        try {
            if (wager > 0) {
                const user = await getUser(interaction.user.id, 'global');
                if (user.balance < wager) {
                    const embed = EmbedFactory.error('Insufficient Funds', `You don't have enough coins to wager!`);
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }
            const row = new ActionRowBuilder()
                .addComponents(new ButtonBuilder().setCustomId('accept_battle').setLabel('Accept').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('decline_battle').setLabel('Decline').setStyle(ButtonStyle.Danger));
            const embed = EmbedFactory.battle('Battle Challenge!')
                .setDescription(`${interaction.user} challenges ${target} to a battle!${wager > 0 ? `\n\n💰 Wager: **${wager.toLocaleString()}** coins` : ''}`);
            await interaction.reply({
                content: `${target}`,
                embeds: [embed],
                components: [row]
            });
            const response = await interaction.fetchReply();
            activeBattles.set(battleId, { challenger: interaction.user.id, opponent: target.id, wager });
            const collector = response.createMessageComponentCollector({ time: 60000 });
            collector.on('collect', async (i) => {
                if (i.user.id !== target.id) {
                    const errorEmbed = EmbedFactory.error('Not For You', 'This battle is not for you!');
                    return i.reply({ embeds: [errorEmbed], ephemeral: true });
                }
                if (i.customId === 'accept_battle') {
                    const battle = simulateBattle(100, 20, 100, 20);
                    const winnerUser = battle.won ? interaction.user : target;
                    const loserUser = battle.won ? target : interaction.user;
                    const resultEmbed = EmbedFactory.battle('⚔️ Battle Results')
                        .setDescription(`**${winnerUser.username}** won the battle!\n\n${battle.log.join('\n')}`);
                    if (wager > 0) {
                        const winner = battle.won ? interaction.user.id : target.id;
                        const loser = battle.won ? target.id : interaction.user.id;
                        const winnerData = await getUser(winner, 'global');
                        const loserData = await getUser(loser, 'global');
                        if (loserData.balance >= wager) {
                            loserData.balance -= wager;
                            winnerData.balance += wager;
                            await updateUser(winner, 'global', { balance: winnerData.balance });
                            await updateUser(loser, 'global', { balance: loserData.balance });
                            resultEmbed.addFields({ name: '💰 Winnings', value: `${wager.toLocaleString()} coins`, inline: true });
                        }
                        else {
                            resultEmbed.addFields({ name: '⚠️ Note', value: `Loser didn't have enough coins for wager.` });
                        }
                    }
                    resultEmbed.setColor(battle.won ? '#00FF00' : '#FF0000');
                    await i.update({
                        content: `<@${winnerUser.id}> vs <@${loserUser.id}>`,
                        embeds: [resultEmbed],
                        components: []
                    });
                }
                else {
                    const declineEmbed = EmbedFactory.warning('Battle Declined', 'The battle was declined.');
                    await i.update({ embeds: [declineEmbed], components: [] });
                }
                activeBattles.delete(battleId);
                collector.stop();
            });
            collector.on('end', collected => {
                if (collected.size === 0) {
                    const expiredEmbed = EmbedFactory.warning('Battle Expired', 'The battle challenge expired.');
                    interaction.editReply({ embeds: [expiredEmbed], components: [] }).catch(() => { });
                    activeBattles.delete(battleId);
                }
            });
        }
        catch (error) {
            console.error('Battle command error:', error);
            const errorEmbed = EmbedFactory.error('Error', 'Failed to start battle.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

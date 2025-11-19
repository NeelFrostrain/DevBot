import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { ExtendedClient } from '../../types/index.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUser, updateUser } from '../../database/index.js';

const games = new Map<string, any>();

function createDeck() {
  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: any[] = [];

  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }

  return deck.sort(() => Math.random() - 0.5);
}

function getCardValue(card: any): number {
  if (card.value === 'A') return 11;
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  return parseInt(card.value);
}

function calculateHand(hand: any[]): number {
  let value = 0;
  let aces = 0;

  for (const card of hand) {
    value += getCardValue(card);
    if (card.value === 'A') aces++;
  }

  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
}

function formatHand(hand: any[]): string {
  return hand.map(card => `${card.value}${card.suit}`).join(' ');
}

export default {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Play blackjack')
    .addIntegerOption(option =>
      option.setName('bet')
        .setDescription('Amount to bet')
        .setMinValue(10)
        .setRequired(true)
    ),
  cooldown: 3,
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const bet = interaction.options.getInteger('bet', true);

    try {
      const user = await getUser(interaction.user.id, 'global');

      if (user.balance < bet) {
        const embed = EmbedFactory.error('Insufficient Funds', `You only have **${user.balance.toLocaleString()}** coins.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const deck = createDeck();
      const playerHand = [deck.pop(), deck.pop()];
      const dealerHand = [deck.pop(), deck.pop()];

      const gameId = interaction.user.id;
      games.set(gameId, { deck, playerHand, dealerHand, bet, userId: interaction.user.id, guildId: interaction.guildId });

      const playerValue = calculateHand(playerHand);

      const embed = EmbedFactory.custom('#FFD700', '🃏 Blackjack')
        .addFields(
          { name: 'Your Hand', value: `${formatHand(playerHand)} (${playerValue})`, inline: true },
          { name: 'Dealer Hand', value: `${dealerHand[0].value}${dealerHand[0].suit} ??`, inline: true },
          { name: 'Bet', value: `${bet.toLocaleString()} coins`, inline: true }
        );

      if (playerValue === 21) {
        games.delete(gameId);
        user.balance += Math.floor(bet * 1.5);
        await updateUser(interaction.user.id, 'global', { balance: user.balance });
        embed.setDescription(`🎉 BLACKJACK! <@${interaction.user.id}> wins 1.5x your bet!`);
        embed.setColor('#00FF00');
        return interaction.reply({ embeds: [embed] });
      }

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)
        );

      await interaction.reply({ embeds: [embed], components: [row] });
      const response = await interaction.fetchReply();

      const collector = response.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
          const errorEmbed = EmbedFactory.error('Not For You', 'This game is not for you!');
          return i.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const game = games.get(gameId);
        if (!game) return;

        if (i.customId === 'bj_hit') {
          game.playerHand.push(game.deck.pop());
          const newValue = calculateHand(game.playerHand);

          if (newValue > 21) {
            games.delete(gameId);
            user.balance -= bet;
            await updateUser(interaction.user.id, 'global', { balance: user.balance });

            const bustEmbed = EmbedFactory.error('Bust!')
              .setDescription(`<@${interaction.user.id}> busted!`)
              .addFields(
                { name: 'Your Hand', value: `${formatHand(game.playerHand)} (${newValue})`, inline: true },
                { name: 'Result', value: `Lost ${bet.toLocaleString()} coins`, inline: true },
                { name: 'Balance', value: `${user.balance.toLocaleString()} coins`, inline: true }
              );

            await i.update({ embeds: [bustEmbed], components: [] });
            collector.stop();
          } else {
            const hitEmbed = EmbedFactory.custom('#FFD700', '🃏 Blackjack')
              .addFields(
                { name: 'Your Hand', value: `${formatHand(game.playerHand)} (${newValue})`, inline: true },
                { name: 'Dealer Hand', value: `${game.dealerHand[0].value}${game.dealerHand[0].suit} ??`, inline: true },
                { name: 'Bet', value: `${bet.toLocaleString()} coins`, inline: true }
              );

            await i.update({ embeds: [hitEmbed], components: [row] });
          }
        } else if (i.customId === 'bj_stand') {
          let dealerValue = calculateHand(game.dealerHand);

          while (dealerValue < 17) {
            game.dealerHand.push(game.deck.pop());
            dealerValue = calculateHand(game.dealerHand);
          }

          const playerValue = calculateHand(game.playerHand);
          let result, winnings;

          if (dealerValue > 21 || playerValue > dealerValue) {
            result = '🎉 You win!';
            winnings = bet;
            user.balance += bet;
          } else if (playerValue === dealerValue) {
            result = '🤝 Push!';
            winnings = 0;
          } else {
            result = '😢 Dealer wins!';
            winnings = -bet;
            user.balance -= bet;
          }

          await updateUser(interaction.user.id, 'global', { balance: user.balance });
          games.delete(gameId);

          const finalEmbed = EmbedFactory.custom(winnings > 0 ? '#00FF00' : winnings < 0 ? '#FF0000' : '#FFD700', '🃏 Blackjack - Results')
            .addFields(
              { name: 'Your Hand', value: `${formatHand(game.playerHand)} (${playerValue})`, inline: true },
              { name: 'Dealer Hand', value: `${formatHand(game.dealerHand)} (${dealerValue})`, inline: true },
              { name: 'Result', value: result, inline: true },
              { name: 'Winnings', value: `${winnings > 0 ? '+' : ''}${winnings.toLocaleString()} coins`, inline: true },
              { name: 'Balance', value: `${user.balance.toLocaleString()} coins`, inline: true }
            );

          await i.update({ embeds: [finalEmbed], components: [] });
          collector.stop();
        }
      });

      collector.on('end', collected => {
        if (collected.size === 0 && games.has(gameId)) {
          games.delete(gameId);
          interaction.editReply({ content: '⏰ Game expired.', embeds: [], components: [] }).catch(() => {});
        }
      });
    } catch (error) {
      console.error('Blackjack command error:', error);
      const errorEmbed = EmbedFactory.error('Error', 'Failed to start blackjack game.');
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};

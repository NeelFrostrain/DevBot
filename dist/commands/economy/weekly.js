import { SlashCommandBuilder } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUser, updateUser, getDatabase } from '../../database/index.js';
export default {
    data: new SlashCommandBuilder()
        .setName('weekly')
        .setDescription('Claim your weekly reward'),
    async execute(interaction, client) {
        const userId = interaction.user.id;
        const guildId = 'global';
        const db = getDatabase();
        const cooldownKey = `cooldowns.weekly.${guildId}.${userId}`;
        try {
            const lastClaim = await db.get(cooldownKey);
            const now = Date.now();
            const cooldown = 604800000; // 7 days
            if (lastClaim && now - lastClaim < cooldown) {
                const timeLeft = cooldown - (now - lastClaim);
                const days = Math.floor(timeLeft / 86400000);
                const hours = Math.floor((timeLeft % 86400000) / 3600000);
                const embed = EmbedFactory.warning('Weekly Reward Already Claimed', `⏰ Come back in **${days}d ${hours}h** to claim your next weekly reward!`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            const user = await getUser(userId, guildId);
            const amount = 3500;
            user.balance += amount;
            await updateUser(userId, guildId, { balance: user.balance });
            await db.set(cooldownKey, now);
            const embed = EmbedFactory.economy('Weekly Reward Claimed!')
                .setDescription(`You received **${amount.toLocaleString()}** coins! 🎁`)
                .addFields({ name: '💰 New Balance', value: `${user.balance.toLocaleString()} coins` });
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error('Weekly command error:', error);
            const errorEmbed = EmbedFactory.error('Error', 'Failed to claim weekly reward.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

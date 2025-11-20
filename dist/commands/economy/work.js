import { SlashCommandBuilder } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUser, updateUser, getDatabase } from '../../database/index.js';
const jobs = [
    'programmer', 'chef', 'teacher', 'doctor', 'artist', 'musician',
    'writer', 'engineer', 'designer', 'streamer', 'gamer', 'youtuber'
];
export default {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work to earn money'),
    async execute(interaction, client) {
        const userId = interaction.user.id;
        const guildId = 'global';
        const db = getDatabase();
        const cooldownKey = `cooldowns.work.${guildId}.${userId}`;
        try {
            const lastWork = await db.get(cooldownKey);
            const now = Date.now();
            const cooldown = client.config.economy.workCooldown;
            if (lastWork && now - lastWork < cooldown) {
                const timeLeft = cooldown - (now - lastWork);
                const minutes = Math.floor(timeLeft / 60000);
                const seconds = Math.floor((timeLeft % 60000) / 1000);
                const embed = EmbedFactory.warning('You\'re Tired!', `⏰ Rest for **${minutes}m ${seconds}s** before working again.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            const user = await getUser(userId, guildId);
            const min = client.config.economy.workMin;
            const max = client.config.economy.workMax;
            const earned = Math.floor(Math.random() * (max - min + 1)) + min;
            const job = jobs[Math.floor(Math.random() * jobs.length)];
            user.balance += earned;
            await updateUser(userId, guildId, { balance: user.balance });
            await db.set(cooldownKey, now);
            const embed = EmbedFactory.economy('Work Complete!')
                .setDescription(`💼 <@${interaction.user.id}> worked as a **${job}** and earned **${earned}** coins!`)
                .addFields({ name: '💰 New Balance', value: `${user.balance.toLocaleString()} coins` });
            await interaction.reply({ embeds: [embed] });
        }
        catch (error) {
            console.error('Work command error:', error);
            const errorEmbed = EmbedFactory.error('Error', 'Failed to work. Please try again.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

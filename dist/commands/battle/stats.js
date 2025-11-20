import { SlashCommandBuilder } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getDatabase, getUserLevel } from '../../database/index.js';
export default {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View your battle stats')
        .addUserOption(option => option.setName('user')
        .setDescription('User to check')
        .setRequired(false)),
    async execute(interaction, client) {
        const target = interaction.options.getUser('user') || interaction.user;
        const db = getDatabase();
        try {
            const equipmentKey = `equipment.${interaction.guildId}.${target.id}`;
            const equipment = await db.get(equipmentKey) || { weapon: null, armor: null };
            const petsKey = `pets.${interaction.guildId}.${target.id}`;
            const pets = await db.get(petsKey) || { pets: [] };
            const levelData = await getUserLevel(target.id, 'global');
            const baseDamage = 20;
            const baseDefense = 10;
            const weaponDamage = equipment.weapon?.damage || 0;
            const armorDefense = equipment.armor?.defense || 0;
            const totalDamage = baseDamage + weaponDamage;
            const totalDefense = baseDefense + armorDefense;
            const embed = EmbedFactory.battle(`⚔️ ${target.username}'s Battle Stats`)
                .setThumbnail(target.displayAvatarURL())
                .addFields({ name: '⚔️ Attack Power', value: `${totalDamage} (Base: ${baseDamage} + Weapon: ${weaponDamage})`, inline: false }, { name: '🛡️ Defense', value: `${totalDefense} (Base: ${baseDefense} + Armor: ${armorDefense})`, inline: false }, { name: '📊 Level', value: `${levelData.level}`, inline: true }, { name: '🐾 Pets', value: `${pets.pets.length}`, inline: true }, { name: '❤️ HP', value: '100', inline: true });
            await interaction.reply({
                content: `<@${target.id}>`,
                embeds: [embed],
                allowedMentions: { users: [target.id] }
            });
        }
        catch (error) {
            console.error('Stats command error:', error);
            const errorEmbed = EmbedFactory.error('Error', 'Failed to fetch stats.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

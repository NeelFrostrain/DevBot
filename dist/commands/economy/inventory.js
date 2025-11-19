import { SlashCommandBuilder } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getDatabase } from '../../database/index.js';
export default {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('View your inventory')
        .addUserOption(option => option.setName('user')
        .setDescription('The user to check')
        .setRequired(false)),
    async execute(interaction, client) {
        const target = interaction.options.getUser('user') || interaction.user;
        const db = getDatabase();
        try {
            const inventoryPath = `inventory.${interaction.guildId}.${target.id}`;
            const inventory = await db.get(inventoryPath) || { items: [] };
            const embed = EmbedFactory.economy(`🎒 ${target.username}'s Inventory`)
                .setThumbnail(target.displayAvatarURL());
            if (!inventory.items || inventory.items.length === 0) {
                embed.setDescription('🎒 Inventory is empty!');
            }
            else {
                const itemCounts = {};
                inventory.items.forEach((item) => {
                    const key = item.name || item.id;
                    itemCounts[key] = (itemCounts[key] || 0) + 1;
                });
                let description = '';
                for (const [name, count] of Object.entries(itemCounts)) {
                    description += `${name} x${count}\n`;
                }
                embed.setDescription(description || 'No items');
            }
            await interaction.reply({
                content: `<@${target.id}>`,
                embeds: [embed],
                allowedMentions: { users: [target.id] }
            });
        }
        catch (error) {
            console.error('Inventory command error:', error);
            const errorEmbed = EmbedFactory.error('Error', 'Failed to fetch inventory.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

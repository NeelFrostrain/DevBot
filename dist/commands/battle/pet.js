import { SlashCommandBuilder } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getDatabase, getUser, updateUser } from '../../database/index.js';
const pets = [
    { id: 'dog', name: '🐕 Dog', rarity: 'common', damage: 5, hp: 30 },
    { id: 'cat', name: '🐈 Cat', rarity: 'common', damage: 4, hp: 25 },
    { id: 'bird', name: '🦅 Eagle', rarity: 'uncommon', damage: 8, hp: 40 },
    { id: 'lion', name: '🦁 Lion', rarity: 'rare', damage: 15, hp: 80 },
    { id: 'phoenix', name: '🔥 Phoenix', rarity: 'legendary', damage: 30, hp: 150 }
];
function getRandomPet() {
    const rand = Math.random();
    let pool;
    if (rand < 0.5) {
        pool = pets.filter(p => p.rarity === 'common');
    }
    else if (rand < 0.8) {
        pool = pets.filter(p => p.rarity === 'uncommon');
    }
    else if (rand < 0.95) {
        pool = pets.filter(p => p.rarity === 'rare');
    }
    else {
        pool = pets.filter(p => p.rarity === 'legendary');
    }
    return pool[Math.floor(Math.random() * pool.length)];
}
export default {
    data: new SlashCommandBuilder()
        .setName('pet')
        .setDescription('Manage your pets')
        .addSubcommand(subcommand => subcommand
        .setName('view')
        .setDescription('View your pets'))
        .addSubcommand(subcommand => subcommand
        .setName('summon')
        .setDescription('Summon a random pet (costs 2000 coins)')),
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const db = getDatabase();
        const key = `pets.${interaction.guildId}.${interaction.user.id}`;
        try {
            if (subcommand === 'view') {
                const userPets = await db.get(key) || { pets: [] };
                const embed = EmbedFactory.battle('Your Pets');
                if (userPets.pets.length === 0) {
                    embed.setDescription('🐾 You don\'t have any pets yet! Use `/pet summon` to get one.');
                }
                else {
                    let description = '';
                    userPets.pets.forEach((pet, index) => {
                        description += `**${index + 1}.** ${pet.name} (${pet.rarity})\n`;
                        description += `   ⚔️ Damage: ${pet.damage} | ❤️ HP: ${pet.hp}\n\n`;
                    });
                    embed.setDescription(description);
                }
                await interaction.reply({ embeds: [embed] });
            }
            else if (subcommand === 'summon') {
                const user = await getUser(interaction.user.id, 'global');
                const cost = 2000;
                if (user.balance < cost) {
                    const embed = EmbedFactory.error('Insufficient Funds', `You need **${cost.toLocaleString()}** coins to summon a pet!`);
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                const pet = getRandomPet();
                const userPets = await db.get(key) || { pets: [] };
                userPets.pets.push({ ...pet, summonedAt: Date.now() });
                await db.set(key, userPets);
                user.balance -= cost;
                await updateUser(interaction.user.id, 'global', { balance: user.balance });
                const embed = EmbedFactory.success('🐾 Pet Summoned!')
                    .setDescription(`You summoned a **${pet.name}**!`)
                    .addFields({ name: '🎭 Rarity', value: pet.rarity, inline: true }, { name: '⚔️ Damage', value: `${pet.damage}`, inline: true }, { name: '❤️ HP', value: `${pet.hp}`, inline: true });
                await interaction.reply({
                    content: `<@${interaction.user.id}>`,
                    embeds: [embed],
                    allowedMentions: { users: [interaction.user.id] }
                });
            }
        }
        catch (error) {
            console.error('Pet command error:', error);
            const errorEmbed = EmbedFactory.error('Error', 'Failed to manage pets.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

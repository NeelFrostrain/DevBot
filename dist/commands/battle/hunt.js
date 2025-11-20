import { SlashCommandBuilder } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getDatabase } from '../../database/index.js';
import { getUser, updateUser } from '../../database/index.js';
import { addXP } from '../../utils/leveling.js';
const monsters = [
    { id: 'slime', name: '🟢 Slime', hp: 50, damage: 5, xp: 20, coins: [10, 30], rarity: 'common' },
    { id: 'goblin', name: '👺 Goblin', hp: 100, damage: 15, xp: 50, coins: [30, 60], rarity: 'common' },
    { id: 'wolf', name: '🐺 Wolf', hp: 150, damage: 25, xp: 80, coins: [50, 100], rarity: 'uncommon' },
    { id: 'orc', name: '👹 Orc', hp: 250, damage: 40, xp: 150, coins: [100, 200], rarity: 'uncommon' },
    { id: 'dragon', name: '🐉 Dragon', hp: 500, damage: 80, xp: 500, coins: [300, 600], rarity: 'rare' }
];
function getRandomMonster() {
    const rand = Math.random();
    let pool;
    if (rand < 0.5) {
        pool = monsters.filter(m => m.rarity === 'common');
    }
    else if (rand < 0.8) {
        pool = monsters.filter(m => m.rarity === 'uncommon');
    }
    else {
        pool = monsters.filter(m => m.rarity === 'rare');
    }
    return pool[Math.floor(Math.random() * pool.length)];
}
function simulateBattle(playerHP, playerDamage, monsterHP, monsterDamage) {
    const log = [];
    let pHP = playerHP;
    let mHP = monsterHP;
    let turn = 1;
    while (pHP > 0 && mHP > 0 && turn <= 10) {
        const playerAttack = playerDamage + Math.floor(Math.random() * 10);
        mHP -= playerAttack;
        log.push(`Turn ${turn}: You dealt ${playerAttack} damage`);
        if (mHP <= 0) {
            log.push('✅ You won!');
            break;
        }
        const monsterAttack = monsterDamage + Math.floor(Math.random() * 5);
        pHP -= monsterAttack;
        log.push(`Turn ${turn}: Monster dealt ${monsterAttack} damage`);
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
        .setName('hunt')
        .setDescription('Hunt monsters for rewards'),
    async execute(interaction, client) {
        const userId = interaction.user.id;
        const guildId = 'global';
        const db = getDatabase();
        const cooldownKey = `cooldowns.hunt.${guildId}.${userId}`;
        try {
            const lastHunt = await db.get(cooldownKey);
            const now = Date.now();
            const cooldown = client.config.battle.huntCooldown;
            if (lastHunt && now - lastHunt < cooldown) {
                const timeLeft = Math.ceil((cooldown - (now - lastHunt)) / 1000);
                const embed = EmbedFactory.warning('Still Recovering', `⏰ Wait **${timeLeft}s** before hunting again.`);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            const monster = getRandomMonster();
            const playerHP = 100;
            const playerDamage = 20;
            const battle = simulateBattle(playerHP, playerDamage, monster.hp, monster.damage);
            const embed = EmbedFactory.battle(`⚔️ Hunting ${monster.name}`)
                .setDescription(battle.log.join('\n'));
            if (battle.won) {
                const coins = Math.floor(Math.random() * (monster.coins[1] - monster.coins[0] + 1)) + monster.coins[0];
                const user = await getUser(userId, guildId);
                user.balance += coins;
                await updateUser(userId, guildId, { balance: user.balance });
                await addXP(userId, guildId, monster.xp);
                embed.addFields({ name: '💰 Coins Earned', value: `${coins.toLocaleString()}`, inline: true }, { name: '⭐ XP Earned', value: `${monster.xp.toLocaleString()}`, inline: true }, { name: '❤️ HP Remaining', value: `${battle.remainingHP}`, inline: true });
                embed.setColor('#00FF00');
            }
            else {
                embed.setDescription(`You lost the hunt!\n\n${battle.log.join('\n')}`);
                embed.setColor('#FF0000');
            }
            await db.set(cooldownKey, now);
            await interaction.reply({
                content: `<@${userId}>`,
                embeds: [embed],
                allowedMentions: { users: [userId] }
            });
        }
        catch (error) {
            console.error('Hunt command error:', error);
            const errorEmbed = EmbedFactory.error('Error', 'Failed to hunt. Please try again.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

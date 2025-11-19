import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ExtendedClient } from '../../types/index.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getUserLevel } from '../../database/index.js';
import { calculateLevel } from '../../utils/leveling.js';
import { getDatabase } from '../../database/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rankstats')
    .setDescription('View detailed ranking statistics')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to check')
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const target = interaction.options.getUser('user') || interaction.user;

    try {
      const levelData = await getUserLevel(target.id, interaction.guildId!);
      const { level, currentXP, requiredXP } = calculateLevel(levelData.xp);

      // Calculate server rank
      const db = getDatabase();
      const allData = await db.get(`levels.${interaction.guildId}`);
      let rank = 1;
      
      if (allData) {
        const users = Object.values(allData) as any[];
        const sorted = users.sort((a, b) => b.xp - a.xp);
        rank = sorted.findIndex(u => u.id === target.id) + 1;
      }

      // Calculate progress percentage
      const progressPercent = Math.round((currentXP / requiredXP) * 100);
      const progressBar = createProgressBar(currentXP, requiredXP, 25);

      // Calculate messages per level
      const messagesPerLevel = levelData.messages ? Math.floor(levelData.messages / level) : 0;

      // Calculate XP to next level
      const xpToNext = requiredXP - currentXP;

      const embed = EmbedFactory.leveling(`📊 ${target.username}'s Rank Statistics`)
        .setThumbnail(target.displayAvatarURL({ size: 256 }))
        .setDescription(`${progressBar}\n**${progressPercent}%** to next level`)
        .addFields(
          { name: '🏆 Server Rank', value: `#${rank}`, inline: true },
          { name: '📊 Current Level', value: `${level}`, inline: true },
          { name: '⭐ Current XP', value: `${currentXP}/${requiredXP}`, inline: true },
          { name: '💫 Total XP', value: `${levelData.xp.toLocaleString()}`, inline: true },
          { name: '📈 XP to Next Level', value: `${xpToNext.toLocaleString()}`, inline: true },
          { name: '💬 Total Messages', value: `${levelData.messages || 0}`, inline: true },
          { name: '📊 Avg Messages/Level', value: `${messagesPerLevel}`, inline: true },
          { name: '🎯 Estimated Messages to Level', value: `${Math.ceil(xpToNext / 15)}`, inline: true }
        );

      await interaction.reply({ 
        content: `<@${target.id}>`,
        embeds: [embed],
        allowedMentions: { users: [target.id] }
      });
    } catch (error) {
      console.error('Rankstats command error:', error);
      const errorEmbed = EmbedFactory.error('Error', 'Failed to fetch rank statistics.');
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};

function createProgressBar(current: number, max: number, length: number = 25): string {
  const percentage = Math.min(current / max, 1);
  const filled = Math.round(length * percentage);
  const empty = length - filled;
  
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

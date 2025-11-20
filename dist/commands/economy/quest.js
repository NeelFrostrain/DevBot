import { SlashCommandBuilder } from 'discord.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getAllQuests, getQuest, getActiveQuests, startQuest, formatQuest, checkQuestCompletion, giveQuestRewards } from '../../utils/questService.js';
import { getUserLevel } from '../../database/index.js';
export default {
    data: new SlashCommandBuilder()
        .setName('quest')
        .setDescription('Quest system')
        .addSubcommand(subcommand => subcommand
        .setName('list')
        .setDescription('View all available quests'))
        .addSubcommand(subcommand => subcommand
        .setName('active')
        .setDescription('View your active quests'))
        .addSubcommand(subcommand => subcommand
        .setName('start')
        .setDescription('Start a quest')
        .addStringOption(option => option.setName('quest')
        .setDescription('Quest to start')
        .setRequired(true)
        .setAutocomplete(true)))
        .addSubcommand(subcommand => subcommand
        .setName('info')
        .setDescription('View quest details')
        .addStringOption(option => option.setName('quest')
        .setDescription('Quest to view')
        .setRequired(true)
        .setAutocomplete(true)))
        .addSubcommand(subcommand => subcommand
        .setName('claim')
        .setDescription('Claim completed quest rewards')),
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        try {
            if (subcommand === 'list') {
                const quests = getAllQuests();
                const levelData = await getUserLevel(interaction.user.id, 'global');
                const embed = EmbedFactory.economy('📜 Available Quests')
                    .setDescription('Use `/quest start <quest>` to begin a quest');
                const availableQuests = quests.filter((q) => q.requiredLevel <= levelData.level);
                const lockedQuests = quests.filter((q) => q.requiredLevel > levelData.level);
                if (availableQuests.length > 0) {
                    let available = '';
                    availableQuests.forEach((quest) => {
                        const repeatIcon = quest.repeatable ? '🔄' : '📌';
                        available += `${repeatIcon} **${quest.name}** (\`${quest.id}\`)\n  ${quest.description}\n\n`;
                    });
                    embed.addFields({ name: '✅ Available', value: available.slice(0, 1024) });
                }
                if (lockedQuests.length > 0) {
                    let locked = '';
                    lockedQuests.slice(0, 3).forEach((quest) => {
                        locked += `• ${quest.name} - Level ${quest.requiredLevel} required\n`;
                    });
                    embed.addFields({ name: '🔒 Locked', value: locked });
                }
                return interaction.reply({ embeds: [embed] });
            }
            if (subcommand === 'active') {
                const activeQuests = await getActiveQuests(interaction.user.id, 'global');
                if (activeQuests.length === 0) {
                    return interaction.reply({
                        embeds: [EmbedFactory.economy('Active Quests').setDescription('You have no active quests.\nUse `/quest list` to see available quests.')]
                    });
                }
                const embed = EmbedFactory.economy('📜 Active Quests');
                for (const activeQuest of activeQuests) {
                    const quest = getQuest(activeQuest.questId);
                    if (quest) {
                        embed.addFields({
                            name: quest.name,
                            value: formatQuest(quest, activeQuest.progress)
                        });
                    }
                }
                return interaction.reply({ embeds: [embed] });
            }
            if (subcommand === 'start') {
                const questId = interaction.options.getString('quest', true);
                const result = await startQuest(interaction.user.id, 'global', questId);
                if (!result.success) {
                    return interaction.reply({
                        embeds: [EmbedFactory.error('Cannot Start Quest', result.error || 'Unknown error')],
                        ephemeral: true
                    });
                }
                const quest = getQuest(questId);
                const embed = EmbedFactory.success('Quest Started! 📜')
                    .setDescription(`You started: **${quest.name}**\n\n${formatQuest(quest)}`);
                return interaction.reply({ embeds: [embed] });
            }
            if (subcommand === 'info') {
                const questId = interaction.options.getString('quest', true);
                const quest = getQuest(questId);
                if (!quest) {
                    return interaction.reply({
                        embeds: [EmbedFactory.error('Quest Not Found', 'This quest does not exist.')],
                        ephemeral: true
                    });
                }
                const embed = EmbedFactory.economy('📜 Quest Details')
                    .setDescription(formatQuest(quest));
                return interaction.reply({ embeds: [embed] });
            }
            if (subcommand === 'claim') {
                const completedQuests = await checkQuestCompletion(interaction.user.id, 'global');
                if (completedQuests.length === 0) {
                    return interaction.reply({
                        embeds: [EmbedFactory.error('No Completed Quests', 'You have no quests ready to claim.')],
                        ephemeral: true
                    });
                }
                const embed = EmbedFactory.success('Quest Completed! 🎉');
                let description = '';
                for (const { quest } of completedQuests) {
                    await giveQuestRewards(interaction.user.id, 'global', quest);
                    description += `**${quest.name}**\n`;
                    description += `🎁 Rewards:\n`;
                    if (quest.rewards.coins)
                        description += `  • 💰 ${quest.rewards.coins} coins\n`;
                    if (quest.rewards.xp)
                        description += `  • ⭐ ${quest.rewards.xp} XP\n`;
                    if (quest.rewards.items)
                        description += `  • 📦 ${quest.rewards.items.length} items\n`;
                    description += '\n';
                }
                embed.setDescription(description);
                return interaction.reply({ embeds: [embed] });
            }
        }
        catch (error) {
            console.error('Quest command error:', error);
            return interaction.reply({
                embeds: [EmbedFactory.error('Error', 'Failed to process quest command.')],
                ephemeral: true
            });
        }
    }
};

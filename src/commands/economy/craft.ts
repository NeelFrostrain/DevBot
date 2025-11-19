import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { ExtendedClient } from '../../types/index.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getAllRecipes, getRecipe, canCraft, craftItem, formatRecipe } from '../../utils/craftingService.js';
import { getUserLevel } from '../../database/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('craft')
    .setDescription('Craft items from materials')
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('View all available recipes')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('recipe')
        .setDescription('View a specific recipe')
        .addStringOption(option =>
          option.setName('item')
            .setDescription('Recipe to view')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('make')
        .setDescription('Craft an item')
        .addStringOption(option =>
          option.setName('item')
            .setDescription('Item to craft')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'list') {
        const recipes = getAllRecipes();
        const levelData = await getUserLevel(interaction.user.id, 'global');
        
        const embed = EmbedFactory.economy('🔨 Crafting Recipes')
          .setDescription('Use `/craft recipe <item>` to view details\nUse `/craft make <item>` to craft');

        const availableRecipes = recipes.filter((r: any) => r.requiredLevel <= levelData.level);
        const lockedRecipes = recipes.filter((r: any) => r.requiredLevel > levelData.level);

        if (availableRecipes.length > 0) {
          let available = '';
          availableRecipes.forEach((recipe: any) => {
            available += `• **${recipe.name}** (ID: \`${recipe.id}\`)\n`;
          });
          embed.addFields({ name: '✅ Available', value: available });
        }

        if (lockedRecipes.length > 0) {
          let locked = '';
          lockedRecipes.slice(0, 5).forEach((recipe: any) => {
            locked += `• ${recipe.name} - Requires Level ${recipe.requiredLevel}\n`;
          });
          embed.addFields({ name: '🔒 Locked', value: locked });
        }

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'recipe') {
        const itemId = interaction.options.getString('item', true);
        const recipe = getRecipe(itemId);

        if (!recipe) {
          return interaction.reply({
            embeds: [EmbedFactory.error('Recipe Not Found', 'This recipe does not exist.')],
            ephemeral: true
          });
        }

        const { canCraft: canMake, missing } = await canCraft(interaction.user.id, 'global', itemId);
        
        const embed = EmbedFactory.economy('🔨 Recipe Details')
          .setDescription(formatRecipe(recipe));

        if (!canMake) {
          let missingText = '❌ Missing materials:\n';
          for (const [mat, amount] of Object.entries(missing)) {
            missingText += `  • ${mat}: ${amount} more needed\n`;
          }
          embed.addFields({ name: 'Status', value: missingText });
        } else {
          embed.addFields({ name: 'Status', value: '✅ You can craft this!' });
        }

        return interaction.reply({ embeds: [embed] });
      }

      if (subcommand === 'make') {
        const itemId = interaction.options.getString('item', true);
        const result = await craftItem(interaction.user.id, 'global', itemId);

        if (!result.success) {
          return interaction.reply({
            embeds: [EmbedFactory.error('Crafting Failed', result.error || 'Unknown error')],
            ephemeral: true
          });
        }

        const embed = EmbedFactory.success('Crafting Successful! 🔨')
          .setDescription(`You crafted **${result.result.emoji} ${result.result.name}**!`)
          .addFields({ name: 'Added to Inventory', value: 'Check `/inventory` to see your new item!' });

        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Craft command error:', error);
      return interaction.reply({
        embeds: [EmbedFactory.error('Error', 'Failed to process crafting command.')],
        ephemeral: true
      });
    }
  }
};

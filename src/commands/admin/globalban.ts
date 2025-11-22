import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { ExtendedClient } from '../../types/index.js';
import { EmbedFactory } from '../../utils/embeds.js';
import { getDatabase } from '../../database/index.js';

export default {
  data: new SlashCommandBuilder()
    .setName('globalban')
    .setDescription('Manage global ban list (Owner only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add user to global ban list')
        .addStringOption(option =>
          option.setName('userid')
            .setDescription('User ID to ban globally')
            .setRequired(true)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for global ban')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove user from global ban list')
        .addStringOption(option =>
          option.setName('userid')
            .setDescription('User ID to unban globally')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('View global ban list')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('check')
        .setDescription('Check if user is globally banned')
        .addStringOption(option =>
          option.setName('userid')
            .setDescription('User ID to check')
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    // Check if user is bot owner
    if (interaction.user.id !== process.env.OWNER_ID) {
      const embed = EmbedFactory.error(
        'Permission Denied',
        'Only the bot owner can manage the global ban list!'
      );
      await interaction.deferReply({ ephemeral: true });
      return interaction.editReply({ embeds: [embed] });
    }

    await interaction.deferReply({ ephemeral: true });
    
    const subcommand = interaction.options.getSubcommand();
    const db = getDatabase();

    try {
      if (subcommand === 'add') {
        const userId = interaction.options.getString('userid', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Validate user ID
        if (!/^\d{17,19}$/.test(userId)) {
          const embed = EmbedFactory.error('Invalid User ID', 'Please provide a valid Discord user ID (17-19 digits).');
          return interaction.editReply({ embeds: [embed] });
        }

        // Try to fetch user info
        let username = 'Unknown User';
        try {
          const user = await client.users.fetch(userId);
          username = user.username;
        } catch (error) {
          // User not found, but we can still ban by ID
        }

        // Get current ban list
        const banList = await db.get('globalBans') || {};

        // Add user to ban list
        banList[userId] = {
          userId: userId,
          username: username,
          reason: reason,
          bannedBy: interaction.user.id,
          bannedAt: Date.now()
        };

        await db.set('globalBans', banList);

        // Try to ban from current server
        if (interaction.guild) {
          try {
            await interaction.guild.members.ban(userId, { reason: `Global Ban: ${reason}` });
          } catch (error) {
            // User might not be in this server
          }
        }

        const embed = EmbedFactory.success('Global Ban Added')
          .setDescription(`**${username}** has been added to the global ban list.`)
          .addFields(
            { name: '👤 User', value: `${username}\nID: \`${userId}\``, inline: true },
            { name: '📝 Reason', value: reason, inline: true },
            { name: '⚠️ Effect', value: 'Will be auto-banned when joining any server', inline: false }
          );

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === 'remove') {
        const userId = interaction.options.getString('userid', true);

        const banList = await db.get('globalBans') || {};

        if (!banList[userId]) {
          const embed = EmbedFactory.error(
            'Not Found',
            `User ID \`${userId}\` is not in the global ban list.`
          );
          return interaction.editReply({ embeds: [embed] });
        }

        const username = banList[userId].username;
        delete banList[userId];
        await db.set('globalBans', banList);

        const embed = EmbedFactory.success('Global Ban Removed')
          .setDescription(`**${username}** has been removed from the global ban list.`)
          .addFields(
            { name: '👤 User', value: `${username}\nID: \`${userId}\``, inline: true },
            { name: '✅ Status', value: 'Can now join servers', inline: true }
          );

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === 'list') {
        const banList = await db.get('globalBans') || {};
        const bans = Object.values(banList) as any[];

        if (bans.length === 0) {
          const embed = EmbedFactory.info('Global Ban List')
            .setDescription('No users are currently globally banned.');
          return interaction.editReply({ embeds: [embed] });
        }

        const embed = EmbedFactory.warning('🚫 Global Ban List')
          .setDescription(`**${bans.length}** users are globally banned:\n\n${bans.map((ban, i) => 
            `**${i + 1}.** ${ban.username} (\`${ban.userId}\`)\n└ Reason: ${ban.reason}`
          ).join('\n\n')}`)
          .setFooter({ text: `Total: ${bans.length} banned users` });

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === 'check') {
        const userId = interaction.options.getString('userid', true);
        const banList = await db.get('globalBans') || {};

        if (banList[userId]) {
          const ban = banList[userId];
          const embed = EmbedFactory.error('🚫 User is Globally Banned')
            .addFields(
              { name: '👤 User', value: `${ban.username}\nID: \`${userId}\``, inline: true },
              { name: '📝 Reason', value: ban.reason, inline: true },
              { name: '📅 Banned At', value: `<t:${Math.floor(ban.bannedAt / 1000)}:R>`, inline: true }
            );
          await interaction.editReply({ embeds: [embed] });
        } else {
          const embed = EmbedFactory.success('✅ User is Not Banned')
            .setDescription(`User ID \`${userId}\` is not in the global ban list.`);
          await interaction.editReply({ embeds: [embed] });
        }
      }

    } catch (error) {
      console.error('Global ban error:', error);
      const errorEmbed = EmbedFactory.error('Error', 'Failed to manage global ban list.');
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};

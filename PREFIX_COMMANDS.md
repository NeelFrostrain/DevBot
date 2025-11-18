# ℹ️ Prefix Commands Information

## Important Notice

This bot primarily uses **Discord Slash Commands** (`/command`) instead of traditional prefix commands (`!command`).

---

## Why Slash Commands?

### Benefits
- ✅ **Auto-complete** - See available commands as you type
- ✅ **Validation** - Discord validates parameters before sending
- ✅ **Help Text** - Built-in descriptions for each command
- ✅ **Better UX** - Modern Discord interface
- ✅ **Type Safety** - Prevents errors from wrong input types

### How to Use
1. Type `/` in the chat box
2. Select a command from the menu
3. Fill in the required options
4. Press Enter

---

## Supported Prefix Commands

For convenience, these prefix commands are supported:

### `!help`
Shows a message explaining how to use slash commands.

**Response:**
- Explains slash commands
- Lists popular commands
- Directs to `/help` for full list

### `!ping`
Quick ping response.

**Response:**
- Directs to `/ping` for detailed latency

### Any Other Command
If you try `!command`, the bot will suggest using `/command` instead.

---

## Migration Guide

### Old Way (Prefix)
```
!help
!rank
!balance
!work
```

### New Way (Slash)
```
/help
/rank
/balance
/work
```

---

## Full Command List

Use `/help` to see all 70+ commands organized by category:
- 💰 Economy (17 commands)
- ⭐ Leveling (13 commands)
- ⚔️ Battle (6 commands)
- 📊 Analytics (4 commands)
- 🎫 Invites (5 commands)
- 🛡️ Moderation (6 commands)
- 👑 Admin (6 commands)
- 📦 Utility (9 commands)
- 🎮 Fun (7 commands)

---

## FAQ

**Q: Why don't prefix commands work?**  
A: This bot uses slash commands for better functionality. Use `/command` instead of `!command`.

**Q: Can I change the prefix?**  
A: The prefix is only for the basic `!help` and `!ping` commands. All main features use slash commands.

**Q: How do I see all commands?**  
A: Type `/help` in Discord.

**Q: Do I need to enable anything?**  
A: No, slash commands work automatically once the bot is invited with the correct permissions.

**Q: What if slash commands don't show up?**  
A: Wait 1-5 minutes for Discord to register them, or try kicking and re-inviting the bot.

---

## Configuration

The prefix for basic commands can be changed in `.env`:

```env
PREFIX=!
```

Default is `!` if not specified.

---

## For Developers

If you want to add more prefix commands, edit `src/events/messageCreate.ts`:

```typescript
if (commandName === 'yourcommand') {
  // Your command logic here
  const embed = EmbedFactory.info('Title', 'Description');
  message.reply({ embeds: [embed] }).catch(() => {});
}
```

However, we **strongly recommend** creating slash commands instead for better user experience.

---

**Last Updated:** November 19, 2025  
**Version:** 3.0  
**Status:** Slash Commands Recommended

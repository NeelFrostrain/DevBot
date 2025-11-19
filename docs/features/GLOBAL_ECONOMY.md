# 🌍 Global Economy System

## Overview

The economy system is now **GLOBAL** - your balance, inventory, and items work across ALL servers!

---

## ✨ What This Means

### Before (Per-Server Economy)
- Different balance in each server
- Different inventory in each server
- Had to earn coins separately everywhere

### After (Global Economy)
- **ONE balance** across all servers
- **ONE inventory** shared everywhere
- Earn coins in any server, spend anywhere!

---

## 💰 Global Features

### Balance
- Your coins work in ALL servers
- `/balance` shows the same amount everywhere
- Earn in Server A, spend in Server B!

### Inventory
- Items you buy are available in all servers
- `/inventory` shows same items everywhere
- Buy a sword in one server, use it in another!

### Shop
- Same shop in all servers
- Purchases are global
- 130+ items available everywhere

### Daily/Weekly Rewards
- Claim once per day/week globally
- Can't claim separately in each server
- Fair and balanced!

---

## 🎮 Commands (All Global)

### Economy
```
/balance          # Same balance everywhere
/daily            # Claim once per day (global)
/weekly           # Claim once per week (global)
/work             # Earn coins (global)
/shop             # Same shop everywhere
/buy              # Items go to global inventory
/inventory        # Same inventory everywhere
```

### Gambling
```
/coinflip         # Bet global coins
/blackjack        # Bet global coins
/slots            # Bet global coins
/roulette         # Bet global coins
```

### Trading
```
/trade            # Trade global coins
```

### Battle
```
/hunt             # Earn global coins
/battle           # Wager global coins
/pet              # Global pets
/stats            # Global battle stats
```

---

## 📊 Benefits

### For Users
- ✅ Don't lose progress when joining new servers
- ✅ One unified economy
- ✅ Easier to track your wealth
- ✅ More convenient

### For Server Owners
- ✅ Users already have coins when they join
- ✅ More active economy
- ✅ Users more engaged
- ✅ Fair across all servers

---

## 🔧 Technical Details

### Database Structure
```
users.global.{userId}
  ├── balance: 1000
  ├── bank: 5000
  ├── daily: timestamp
  ├── weekly: timestamp
  └── ...

inventory.global.{userId}
  └── items: [...]
```

### Migration
- Existing data automatically migrated
- Old per-server data still accessible
- No data loss

---

## ⚠️ Important Notes

### Cooldowns are Global
- Daily reward: Once per day globally
- Weekly reward: Once per week globally
- Work cooldown: Global

### Trading is Global
- Trade with users in any server
- Both users must be in a server with the bot

### Leaderboards
- Economy leaderboard shows global wealth
- Same leaderboard in all servers

---

## 🎯 Examples

### Example 1: Multi-Server User
```
Server A: /daily → +1000 coins
Server B: /balance → Shows 1000 coins
Server C: /shop → Can spend those 1000 coins
```

### Example 2: Trading
```
Server A: User1 has 5000 coins
Server B: User1 trades 1000 to User2
Server A: User1 now has 4000 coins (updated everywhere)
```

### Example 3: Shopping
```
Server A: /buy sword
Server B: /inventory → Sword is there!
Server C: /equip sword → Can use it!
```

---

## 🔄 Leveling System

**Note:** Leveling is still PER-SERVER!
- XP and levels are separate in each server
- Rank roles are server-specific
- This keeps server communities unique

**Global:**
- 💰 Economy (coins, items)
- 🎮 Battle stats
- 🐾 Pets

**Per-Server:**
- ⭐ XP and Levels
- 🏆 Rank roles
- 📊 Leaderboards (levels)

---

## 📚 Related Documentation

- **Commands:** `docs/COMMANDS.md`
- **Shop Items:** `docs/features/SHOP_ITEMS_UPDATE.md`
- **Economy Commands:** See `/help economy`

---

**Version:** 1.5  
**Economy Type:** Global  
**Status:** ✅ Active

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { 
    carregarDados, 
    getUserXpData, 
    calculateXpForLevel,
    carregarDadosAsync,
    getUserXpDataAsync,
    useFirebase
} = require('../dataHandler');
const config = require('../config');

const levelCommand = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Mostra seu nível e progresso de XP.')
        .addUserOption(option =>
            option.setName('membro')
                .setDescription('O membro que você quer ver o nível (opcional)')
                .setRequired(false)
        ),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('membro') || interaction.user;
        
        let xpData;
        if (useFirebase()) {
            xpData = await carregarDadosAsync(config.XP_FILE);
        } else {
            xpData = carregarDados(config.XP_FILE);
        }
        
        const allUsersSorted = Object.entries(xpData).sort((a, b) => b[1].xp - a[1].xp);
        
        let rank;
        try {
            rank = allUsersSorted.findIndex(([uid, data]) => uid === targetUser.id.toString()) + 1;
        } catch (error) {
            rank = allUsersSorted.length + 1;
        }

        let userData;
        if (useFirebase()) {
            userData = await getUserXpDataAsync(targetUser.id, config.XP_FILE);
        } else {
            userData = getUserXpData(targetUser.id, config.XP_FILE);
        }
        
        const currentLevel = userData.level;
        const currentXp = userData.xp;
        
        const xpForCurrentLevel = calculateXpForLevel(currentLevel);
        const xpForNextLevel = calculateXpForLevel(currentLevel + 1);
        
        const xpInThisLevel = currentXp - xpForCurrentLevel;
        const xpNeededForThisLevel = xpForNextLevel - xpForCurrentLevel;
        
        const progressPercentage = xpNeededForThisLevel > 0 ? (xpInThisLevel / xpNeededForThisLevel) * 100 : 0;
        const progressBar = Array.from({ length: 10 }, (_, i) => i < progressPercentage / 10 ? "▓" : "░").join("");

        const embed = new EmbedBuilder()
            .setColor(0x36393F)
            .setDescription(
                `### **${targetUser.displayName}**\n` +
                `**Rank:** \`#${rank}\`\n` +
                `**Nível:** \`${currentLevel}\`\n` +
                `**XP:** \`${xpInThisLevel}/${xpNeededForThisLevel}\`\n` +
                `${progressBar} **${progressPercentage.toFixed(1)}%**`
            );

        if (targetUser.avatarURL()) {
            embed.setThumbnail(targetUser.avatarURL());
        }
        
        await interaction.reply({ embeds: [embed] });
    }
};

const rankingCommand = {
    data: new SlashCommandBuilder()
        .setName('ranking')
        .setDescription('Mostra o ranking de XP do servidor.'),
    async execute(interaction) {
        let xpData;
        if (useFirebase()) {
            xpData = await carregarDadosAsync(config.XP_FILE);
        } else {
            xpData = carregarDados(config.XP_FILE);
        }
        
        if (!xpData || Object.keys(xpData).length === 0) {
            await interaction.reply("Ainda não há ninguém no ranking!");
            return;
        }
        
        const sortedUsers = Object.entries(xpData).sort((a, b) => b[1].xp - a[1].xp);
        
        const embed = new EmbedBuilder()
            .setTitle("🏆 Ranking de XP do Servidor")
            .setColor(0xFFD700);
        
        let description = "";
        for (let i = 0; i < Math.min(10, sortedUsers.length); i++) {
            const [userId, data] = sortedUsers[i];
            try {
                const member = await interaction.guild.members.fetch(userId);
                const memberName = member.displayName;
                
                const rankEmoji = { 0: "🥇", 1: "🥈", 2: "🥉" }[i] || `**#${i + 1}**`;
                description += `${rankEmoji} **${memberName}** - Nível ${data.level} (${data.xp.toLocaleString()} XP)\n`;
            } catch (error) {
                const rankEmoji = { 0: "🥇", 1: "🥈", 2: "🥉" }[i] || `**#${i + 1}**`;
                description += `${rankEmoji} **ID: ${userId}** - Nível ${data.level} (${data.xp.toLocaleString()} XP)\n`;
            }
        }
        
        embed.setDescription(description);
        await interaction.reply({ embeds: [embed] });
    }
};

module.exports = { levelCommand, rankingCommand };


const { 
    carregarDados, 
    salvarDados, 
    getUserXpData, 
    calculateXpForLevel,
    getUserXpDataAsync,
    setUserDataAsync,
    useFirebase
} = require('../dataHandler');
const config = require('../config');

async function checkLevelUp(message, userId) {
    let userData;
    if (useFirebase()) {
        userData = await getUserXpDataAsync(userId, config.XP_FILE);
    } else {
        const xpData = carregarDados(config.XP_FILE);
        userData = xpData[userId.toString()];
    }
    
    const currentLevel = userData.level;
    const xpNeeded = calculateXpForLevel(currentLevel + 1);
    
    if (userData.xp >= xpNeeded) {
        userData.level += 1;
        
        if (useFirebase()) {
            await setUserDataAsync(config.XP_FILE, userId, userData);
        } else {
            const xpData = carregarDados(config.XP_FILE);
            xpData[userId.toString()] = userData;
            salvarDados(config.XP_FILE, xpData);
        }
        
        const guild = message.guild;
        const member = guild.members.cache.get(userId);
        if (!member) return;

        const levelUpChannel = message.client.channels.cache.get(config.LEVEL_UP_CHANNEL_ID);
        if (levelUpChannel) {
            await levelUpChannel.send(`🎉 Parabéns ${member.toString()}, você avançou para o **Nível ${userData.level}**!`);
        }
            
        const newLevel = userData.level;
        if (config.LEVEL_ROLES[newLevel]) {
            const roleId = config.LEVEL_ROLES[newLevel];
            if (roleId !== "0") {
                const role = guild.roles.cache.get(roleId);
                if (role) {
                    try {
                        await member.roles.add(role, `Alcançou o Nível ${newLevel}`);
                    } catch (error) {
                        console.error(`ERRO: Não foi possível adicionar o cargo de nível ${newLevel} a ${member.user.username}.`);
                    }
                }
            }
        }
    }
}

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) {
            return;
        }

        if (config.XP_ENABLED_CHANNELS.includes(message.channel.id)) {
            const userId = message.author.id;
            
            let userData;
            if (useFirebase()) {
                userData = await getUserXpDataAsync(userId, config.XP_FILE);
            } else {
                userData = getUserXpData(userId, config.XP_FILE);
            }
            
            const currentTime = Date.now() / 1000;
            const lastMessageTime = userData.last_message_timestamp || 0;

            if (currentTime - lastMessageTime > config.XP_COOLDOWN) {
                let xpToAdd = Math.floor(Math.random() * 11) + 15; // 15-25
                
                // Verificar XP Boost
                const xpBoostRoleId = config.SHOP_CONFIG.funcoes.items.xp_boost.role_id;
                if (xpBoostRoleId !== "0") {
                    const xpBoostRole = message.guild.roles.cache.get(xpBoostRoleId);
                    if (xpBoostRole && message.member.roles.cache.has(xpBoostRoleId)) {
                        xpToAdd *= 2;
                    }
                }

                userData.xp += xpToAdd;
                userData.last_message_timestamp = currentTime;
                
                if (useFirebase()) {
                    await setUserDataAsync(config.XP_FILE, userId, userData);
                } else {
                    const xpDataAll = carregarDados(config.XP_FILE);
                    xpDataAll[userId.toString()] = userData;
                    salvarDados(config.XP_FILE, xpDataAll);
                }
                
                await checkLevelUp(message, userId);
            }
        }
    }
};


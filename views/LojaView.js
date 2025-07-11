const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { 
    carregarDados, 
    salvarDados, 
    getUserEconomyData,
    getUserEconomyDataAsync,
    setUserDataAsync,
    getUserDataAsync,
    useFirebase
} = require('../dataHandler');

class ItemSelect {
    constructor(category) {
        this.categoryKey = category;
        this.categoryData = config.SHOP_CONFIG[this.categoryKey];
    }

    createSelectMenu() {
        const options = [];
        
        for (const [itemKey, itemData] of Object.entries(this.categoryData.items)) {
            let price = itemData.price;
            let label = `${itemData.name} - ${price.toLocaleString()} moedas`;

            if (itemKey === "moon") {
                // Para o Firebase, precisamos carregar os dados de forma assíncrona
                // Por enquanto, usamos o preço padrão
                label = `${itemData.name} - ${price.toLocaleString()} moedas (preço dinâmico)`;
            }

            options.push({
                label: label,
                description: itemData.description.substring(0, 100),
                value: itemKey
            });
        }

        return new StringSelectMenuBuilder()
            .setCustomId(`shop_category_${this.categoryKey}`)
            .setPlaceholder(`Selecione um item de ${this.categoryData.name}...`)
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(options);
    }

    async handleSelection(interaction, itemKey) {
        const itemData = this.categoryData.items[itemKey];
        const userId = interaction.user.id;
        
        let userData;
        if (useFirebase()) {
            userData = await getUserEconomyDataAsync(userId, config.ECONOMY_FILE);
        } else {
            userData = getUserEconomyData(userId, config.ECONOMY_FILE);
        }
        
        const roleId = itemData.role_id;

        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
            await interaction.reply({ content: "❌ Ops! Este cargo não está configurado. Avise um administrador!", ephemeral: true });
            return;
        }

        if (itemKey === "moon") {
            await this.handleMoonPurchase(interaction, itemData, userData, role);
            return;
        }

        const price = itemData.price;
        if (interaction.member.roles.cache.has(roleId)) {
            await interaction.reply({ content: `❌ Você já possui o cargo \`${itemData.name}\`!`, ephemeral: true });
            return;
        }

        if (userData.carteira < price) {
            await interaction.reply({ 
                content: `❌ Você não tem moedas suficientes! Precisa de ${price.toLocaleString()}, mas só tem ${userData.carteira.toLocaleString()}.`, 
                ephemeral: true 
            });
            return;
        }

        try {
            userData.carteira -= price;
            
            if (useFirebase()) {
                await setUserDataAsync(config.ECONOMY_FILE, userId, userData);
            } else {
                const economia = carregarDados(config.ECONOMY_FILE);
                economia[userId.toString()] = userData;
                salvarDados(config.ECONOMY_FILE, economia);
            }

            await interaction.member.roles.add(role, `Comprou na loja por ${price} moedas.`);
            await interaction.reply({ 
                content: `🎉 Parabéns! Você comprou o cargo **${itemData.name}** por ${price.toLocaleString()} moedas furradas!`, 
                ephemeral: true 
            });
        } catch (error) {
            await interaction.reply({ content: "❌ Eu não tenho permissão para adicionar este cargo!", ephemeral: true });
        }
    }

    async handleMoonPurchase(interaction, itemData, userData, role) {
        let shopData;
        if (useFirebase()) {
            shopData = await getUserDataAsync(config.SHOP_DATA_FILE, 'moon_data') || {};
        } else {
            shopData = carregarDados(config.SHOP_DATA_FILE);
        }
        
        const price = shopData.moon_price || itemData.price;
        const currentOwnerId = shopData.moon_owner_id;

        if (currentOwnerId === interaction.user.id) {
            await interaction.reply({ content: "❌ Você já é o dono do cargo Moon!", ephemeral: true });
            return;
        }

        if (userData.carteira < price) {
            await interaction.reply({ 
                content: `❌ Você não tem moedas suficientes! O cargo Moon custa ${price.toLocaleString()} moedas.`, 
                ephemeral: true 
            });
            return;
        }

        try {
            // Remover cargo do dono anterior e reembolsar
            if (currentOwnerId) {
                const previousOwner = await interaction.guild.members.fetch(currentOwnerId).catch(() => null);
                if (previousOwner) {
                    await previousOwner.roles.remove(role, "Novo dono do cargo Moon");
                    
                    let previousOwnerData;
                    if (useFirebase()) {
                        previousOwnerData = await getUserEconomyDataAsync(currentOwnerId, config.ECONOMY_FILE);
                    } else {
                        previousOwnerData = getUserEconomyData(currentOwnerId, config.ECONOMY_FILE);
                    }
                    
                    const reembolso = Math.floor(price / 2);
                    previousOwnerData.carteira += reembolso;
                    
                    if (useFirebase()) {
                        await setUserDataAsync(config.ECONOMY_FILE, currentOwnerId, previousOwnerData);
                    } else {
                        const economia = carregarDados(config.ECONOMY_FILE);
                        economia[currentOwnerId.toString()] = previousOwnerData;
                        salvarDados(config.ECONOMY_FILE, economia);
                    }

                    try {
                        await previousOwner.send(`👑 O cargo Moon foi comprado! Você recebeu um reembolso de **${reembolso.toLocaleString()}** moedas furradas.`);
                    } catch (error) {
                        // Usuário pode ter DMs desabilitadas
                    }
                }
            }

            // Adicionar cargo ao novo dono
            await interaction.member.roles.add(role, "Comprou o cargo Moon");
            
            // Atualizar economia do comprador
            userData.carteira -= price;
            if (useFirebase()) {
                await setUserDataAsync(config.ECONOMY_FILE, interaction.user.id, userData);
            } else {
                const economia = carregarDados(config.ECONOMY_FILE);
                economia[interaction.user.id.toString()] = userData;
                salvarDados(config.ECONOMY_FILE, economia);
            }
            
            // Atualizar dados da loja
            shopData.moon_owner_id = interaction.user.id;
            shopData.moon_price = price * 2;
            
            if (useFirebase()) {
                await setUserDataAsync(config.SHOP_DATA_FILE, 'moon_data', shopData);
            } else {
                salvarDados(config.SHOP_DATA_FILE, shopData);
            }

            await interaction.reply({ 
                content: `👑 Parabéns! Você é o novo dono do cargo **Moon**! O próximo preço será de ${shopData.moon_price.toLocaleString()} moedas.`, 
                ephemeral: true 
            });

        } catch (error) {
            await interaction.reply({ content: `Ocorreu um erro: ${error.message}`, ephemeral: true });
        }
    }
}

class LojaView {
    createActionRow() {
        const funcoesButton = new ButtonBuilder()
            .setCustomId('cat_funcoes_persist')
            .setLabel('Cargos com Funções')
            .setStyle(ButtonStyle.Success);

        const cosmeticosButton = new ButtonBuilder()
            .setCustomId('cat_cosmeticos_persist')
            .setLabel('Cargos Cosméticos')
            .setStyle(ButtonStyle.Primary);

        const especiaisButton = new ButtonBuilder()
            .setCustomId('cat_especiais_persist')
            .setLabel('Cargos Especiais')
            .setStyle(ButtonStyle.Secondary);

        return new ActionRowBuilder()
            .addComponents(funcoesButton, cosmeticosButton, especiaisButton);
    }

    async showCategory(interaction, category) {
        const itemSelect = new ItemSelect(category);
        const selectMenu = itemSelect.createSelectMenu();
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.reply({ content: "Escolha um item abaixo:", components: [row], ephemeral: true });
    }

    async handleFuncoes(interaction) {
        await this.showCategory(interaction, "funcoes");
    }

    async handleCosmeticos(interaction) {
        await this.showCategory(interaction, "cosmeticos");
    }

    async handleEspeciais(interaction) {
        await this.showCategory(interaction, "especiais");
    }

    static async createShopEmbed() {
        const embed = new EmbedBuilder()
            .setTitle("🛍️ Lojinha do Moon")
            .setDescription(
                "Aqui você poderá encontrar diferentes cargos que podem ou não (maioria não mesmo) te trazer algum benéfico dentro do servidor, esses cargos podem ser obtidos utilizando a moeda do servidor.\n\n" +
                "Para comprar basta clicar nos Menus abaixo, pedidos que clique um por vez e aguarde o Bot te responder para que não tenha erro na sua utilização."
            )
            .setColor(0xAB8FE9);

        for (const [categoryKey, categoryData] of Object.entries(config.SHOP_CONFIG)) {
            let fieldValue = "";
            
            for (const [itemKey, itemData] of Object.entries(categoryData.items)) {
                const roleMention = itemData.role_id !== "0" ? `<@&${itemData.role_id}>` : `@${itemData.name}`;
                
                if (itemKey === "moon") {
                    let shopData;
                    if (useFirebase()) {
                        try {
                            shopData = await getUserDataAsync(config.SHOP_DATA_FILE, 'moon_data') || {};
                        } catch (error) {
                            shopData = {};
                        }
                    } else {
                        shopData = carregarDados(config.SHOP_DATA_FILE);
                    }
                    
                    const price = shopData.moon_price || itemData.price;
                    fieldValue += `• ${roleMention}: ${itemData.description}\n*Preço atual: M$ ${price.toLocaleString()}*\n`;
                } else {
                    fieldValue += `• ${roleMention}: ${itemData.description}\n*Preço: M$ ${itemData.price.toLocaleString()}*\n`;
                }
            }
            
            embed.addFields({ name: `📦 ${categoryData.name}`, value: fieldValue, inline: false });
        }

        return embed;
    }
}

module.exports = { LojaView, ItemSelect };


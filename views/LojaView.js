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
                label = `${itemData.name} - Preço dinâmico`;
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

        if (!roleId || roleId === "0") {
             await interaction.reply({ content: "❌ Ops! O ID deste cargo não está configurado. Avise um administrador!", ephemeral: true });
            return;
        }

        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
            await interaction.reply({ content: "❌ Ops! Este cargo não existe mais no servidor. Avise um administrador!", ephemeral: true });
            return;
        }

        if (itemKey === "moon") {
            // A instância da LojaView é necessária para chamar o método
            const lojaView = new LojaView();
            await lojaView.handleMoonPurchase(interaction, itemData, userData, role);
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
            console.error("Erro ao adicionar cargo:", error);
            await interaction.reply({ content: "❌ Eu não tenho permissão para adicionar este cargo! Verifique minhas permissões.", ephemeral: true });
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

    handleFuncoes(interaction) { this.showCategory(interaction, "funcoes"); }
    handleCosmeticos(interaction) { this.showCategory(interaction, "cosmeticos"); }
    handleEspeciais(interaction) { this.showCategory(interaction, "especiais"); }

    async handleMoonPurchase(interaction, itemData, userData, role) {
        const userId = interaction.user.id;
        let shopData;
        
        if (useFirebase()) {
            shopData = await getUserDataAsync(config.SHOP_DATA_FILE, 'moon_data') || {};
        } else {
            shopData = (carregarDados(config.SHOP_DATA_FILE) || {}).moon_data || {};
        }

        const currentPrice = shopData.moon_price || itemData.price;
        const currentOwnerId = shopData.moon_owner_id;
        const lastPricePaid = shopData.moon_last_price || itemData.price;

        if (currentOwnerId === userId) {
            return interaction.reply({ content: "❌ Você já é o dono do cargo Moon!", ephemeral: true });
        }

        if (userData.carteira < currentPrice) {
            return interaction.reply({
                content: `❌ Você não tem moedas suficientes! O cargo Moon custa ${currentPrice.toLocaleString()} moedas.`,
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            if (currentOwnerId) {
                const previousOwner = await interaction.guild.members.fetch(currentOwnerId).catch(() => null);
                if (previousOwner) {
                    await previousOwner.roles.remove(role, "Novo dono do cargo Moon comprou o cargo.");

                    let previousOwnerData;
                    if (useFirebase()) {
                        previousOwnerData = await getUserEconomyDataAsync(currentOwnerId, config.ECONOMY_FILE);
                    } else {
                        previousOwnerData = getUserEconomyData(currentOwnerId, config.ECONOMY_FILE);
                    }
                    
                    previousOwnerData.carteira += lastPricePaid;

                    if (useFirebase()) {
                        await setUserDataAsync(config.ECONOMY_FILE, currentOwnerId, previousOwnerData);
                    } else {
                        const economia = carregarDados(config.ECONOMY_FILE);
                        economia[currentOwnerId.toString()] = previousOwnerData;
                        salvarDados(config.ECONOMY_FILE, economia);
                    }

                    await previousOwner.send(`👑 O cargo Moon foi comprado por outro membro! Você recebeu seu dinheiro de volta: **${lastPricePaid.toLocaleString()}** moedas furradas.`).catch(() => {});
                }
            }

            userData.carteira -= currentPrice;
            await interaction.member.roles.add(role, "Comprou o cargo Moon");
            
            if (useFirebase()) {
                await setUserDataAsync(config.ECONOMY_FILE, userId, userData);
            } else {
                const economia = carregarDados(config.ECONOMY_FILE);
                economia[userId.toString()] = userData;
                salvarDados(config.ECONOMY_FILE, economia);
            }

            const newPrice = currentPrice * 2;
            const updatedShopData = {
                moon_owner_id: userId,
                moon_price: newPrice,
                moon_last_price: currentPrice
            };
            
            if (useFirebase()) {
                await setUserDataAsync(config.SHOP_DATA_FILE, 'moon_data', updatedShopData);
            } else {
                let shopJson = carregarDados(config.SHOP_DATA_FILE);
                if(!shopJson) shopJson = {};
                shopJson.moon_data = updatedShopData;
                salvarDados(config.SHOP_DATA_FILE, shopJson);
            }

            await interaction.editReply({
                content: `👑 Parabéns! Você é o novo dono do cargo **Moon**! O próximo preço será de ${newPrice.toLocaleString()} moedas.`
            });

            await this.updateShopMessage(interaction.client);

        } catch (error) {
            console.error("Erro ao comprar cargo Moon:", error);
            await interaction.editReply({ content: `Ocorreu um erro durante a compra. Por favor, contate um administrador.` });
        }
    }

    async updateShopMessage(client) {
        // Para ser mais robusto, o ID do canal e da mensagem da loja poderiam ser salvos
        // no config.js ou em um banco de dados após o comando /postar_loja ser usado.
        // Esta é uma implementação de exemplo que busca em canais configurados.
        for (const channelId of [config.LOG_CHANNEL_ID, "ID_DE_OUTRO_CANAL_AQUI"]) { // Adicione o ID do canal da loja aqui
            try {
                const channel = await client.channels.fetch(channelId);
                if (channel && channel.isTextBased()) {
                    const messages = await channel.messages.fetch({ limit: 50 });
                    const shopMessage = messages.find(msg => 
                        msg.author.id === client.user.id &&
                        msg.embeds[0]?.title === "🛍️ Lojinha do Moon"
                    );

                    if (shopMessage) {
                        const newEmbed = await LojaView.createShopEmbed();
                        await shopMessage.edit({ embeds: [newEmbed] });
                        console.log(`Mensagem da loja atualizada no canal ${channel.name}`);
                        return; // Para de procurar após encontrar e atualizar a primeira mensagem
                    }
                }
            } catch (error) {
                console.error(`Não foi possível atualizar a mensagem da loja no canal ${channelId}:`, error.message);
            }
        }
    }

    static async createShopEmbed() {
        const embed = new EmbedBuilder()
            .setTitle("🛍️ Lojinha do Moon")
            .setDescription(
                "Bem-vindo à Lojinha do Moon! Use suas moedas furradas para adquirir cargos exclusivos.\n\n" +
                "Para comprar, clique em uma das categorias abaixo e selecione o item desejado. As compras são processadas individualmente."
            )
            .setColor(0xAB8FE9)
            .setTimestamp()
            .setFooter({ text: "A loja é atualizada automaticamente." });

        for (const [categoryKey, categoryData] of Object.entries(config.SHOP_CONFIG)) {
            let fieldValue = "";

            for (const [itemKey, itemData] of Object.entries(categoryData.items)) {
                const roleMention = itemData.role_id !== "0" ? `<@&${itemData.role_id}>` : `\`${itemData.name}\``;
                
                if (itemKey === "moon") {
                    let shopData;
                    if (useFirebase()) {
                        shopData = await getUserDataAsync(config.SHOP_DATA_FILE, 'moon_data') || {};
                    } else {
                        shopData = (carregarDados(config.SHOP_DATA_FILE) || {}).moon_data || {};
                    }

                    const price = shopData.moon_price || itemData.price;
                    const ownerId = shopData.moon_owner_id;
                    const ownerText = ownerId ? `(Dono atual: <@${ownerId}>)` : "(Disponível)";

                    fieldValue += `• ${roleMention}: ${itemData.description}\n*Preço atual: M$ ${price.toLocaleString()}* ${ownerText}\n\n`;
                } else {
                    fieldValue += `• ${roleMention}: ${itemData.description}\n*Preço: M$ ${itemData.price.toLocaleString()}*\n\n`;
                }
            }
            
            embed.addFields({ name: `📦 ${categoryData.name}`, value: fieldValue.trim(), inline: false });
        }

        return embed;
    }
}

module.exports = { LojaView, ItemSelect };

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const config = require("../config");
const { 
    carregarDados, 
    salvarDados, 
    getUserEconomyData, 
    getUserXpData,
    getUserEconomyDataAsync,
    getUserXpDataAsync,
    setUserDataAsync,
    useFirebase
} = require("../dataHandler");

class CarteiraPerdidaView {
    constructor() {
        this.interagidoPor = new Set();
    }

    createActionRow() {
        const pegarButton = new ButtonBuilder()
            .setCustomId("pegar_carteira_persist")
            .setLabel("Pegar a carteira")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🏃");

        const devolverButton = new ButtonBuilder()
            .setCustomId("devolver_carteira_persist")
            .setLabel("Devolver a carteira")
            .setStyle(ButtonStyle.Success)
            .setEmoji("😇");

        return new ActionRowBuilder()
            .addComponents(pegarButton, devolverButton);
    }

    async handleInteraction(interaction, embed) {
        // Desabilitar todos os botões
        const row = this.createActionRow();
        row.components.forEach(component => component.setDisabled(true));

        if (!interaction.replied && !interaction.deferred) {
            await interaction.update({ embeds: [embed], components: [row] });
        } else {
            await interaction.editReply({ embeds: [embed], components: [row] });
        }
        
        // Deletar mensagem após 3 minutos
        setTimeout(async () => {
            try {
                await interaction.message.delete();
            } catch (error) {
                // Mensagem pode já ter sido deletada
            }
        }, 180000);
    }

    async handlePegarCarteira(interaction) {
        if (this.interagidoPor.has(interaction.user.id)) {
            await interaction.reply({ content: "Você já interagiu com este evento!", ephemeral: true });
            return;
        }

        this.interagidoPor.add(interaction.user.id);

        await interaction.deferReply({ ephemeral: true });

        let userData;
        if (useFirebase()) {
            userData = await getUserEconomyDataAsync(interaction.user.id, config.ECONOMY_FILE);
        } else {
            userData = getUserEconomyData(interaction.user.id, config.ECONOMY_FILE);
        }
        
        userData.carteiras_pegas += 1;

        const chance = Math.random();
        let embed;

        if (chance < 0.04) {
            const ganhos = 10000;
            userData.carteira += ganhos;
            userData.ganhos_pegando += ganhos;
            embed = new EmbedBuilder()
                .setTitle("🎉 DIA DE SORTE!")
                .setDescription(`**${interaction.user.displayName}** pegou a carteira e encontrou um tesouro!\n\nEle(a) ganhou **${ganhos.toLocaleString()}** moedas furradas!`)
                .setColor(0xFFD700);
        } else if (chance < 0.44) {
            const perda = Math.floor(Math.random() * 251) + 100; // 100-350
            userData.carteira = Math.max(0, userData.carteira - perda);
            userData.perdas_policia += perda;
            embed = new EmbedBuilder()
                .setTitle("🚓 MÃOS AO ALTO!")
                .setDescription(`A **Pawlice** pegou **${interaction.user.displayName}** no flagra tentando pegar a carteira!\n\nComo multa, ele(a) perdeu **${perda.toLocaleString()}** moedas furradas.`)
                .setColor(0x8B0000);
        } else {
            embed = new EmbedBuilder()
                .setTitle("🤔 Que pena...")
                .setDescription(`**${interaction.user.displayName}** pegou a carteira, mas ela estava vazia! Não havia nada dentro.`)
                .setColor(0xD3D3D3);
        }

        if (useFirebase()) {
            await setUserDataAsync(config.ECONOMY_FILE, interaction.user.id, userData);
        } else {
            const economia = carregarDados(config.ECONOMY_FILE);
            economia[interaction.user.id.toString()] = userData;
            salvarDados(config.ECONOMY_FILE, economia);
        }
        
        await this.handleInteraction(interaction, embed);
    }

    async handleDevolverCarteira(interaction) {
        if (this.interagidoPor.has(interaction.user.id)) {
            await interaction.reply({ content: "Você já interagiu com este evento!", ephemeral: true });
            return;
        }

        this.interagidoPor.add(interaction.user.id);

        await interaction.deferReply({ ephemeral: true });

        let userData;
        if (useFirebase()) {
            userData = await getUserEconomyDataAsync(interaction.user.id, config.ECONOMY_FILE);
        } else {
            userData = getUserEconomyData(interaction.user.id, config.ECONOMY_FILE);
        }

        let ganhos;
        if (Math.random() < 0.01) {
            ganhos = 2000;
        } else {
            ganhos = Math.floor(Math.random() * 251) + 50; // 50-300
        }

        userData.carteira += ganhos;
        userData.ganhos_devolvendo += ganhos;
        userData.carteiras_devolvidas += 1;

        const embed = new EmbedBuilder()
            .setTitle("😇 Boa Ação Recompensada!")
            .setDescription(`**${interaction.user.displayName}** foi honesto(a) e devolveu a carteira!\n\nComo recompensa, ele(a) ganhou **${ganhos.toLocaleString()}** moedas furradas!\n\n*Total de carteiras devolvidas: ${userData.carteiras_devolvidas}*`)
            .setColor(0x00FF00);

        // Verificar se chegou a 50 carteiras devolvidas
        if (userData.carteiras_devolvidas === 50) {
            const bomSamaritanoRole = interaction.guild.roles.cache.get(config.GOOD_SAMARITAN_ROLE_ID);
            if (bomSamaritanoRole && !interaction.member.roles.cache.has(config.GOOD_SAMARITAN_ROLE_ID)) {
                try {
                    await interaction.member.roles.add(bomSamaritanoRole, "Devolveu 50 carteiras.");
                    embed.setFooter({ text: `Parabéns! Você recebeu o cargo \'${bomSamaritanoRole.name}\'!` });
                } catch (error) {
                    console.error(`ERRO: Não foi possível adicionar o cargo \'${bomSamaritanoRole.name}\' a ${interaction.user.username}.`);
                }
            }
        }

        if (useFirebase()) {
            await setUserDataAsync(config.ECONOMY_FILE, interaction.user.id, userData);
        } else {
            const economia = carregarDados(config.ECONOMY_FILE);
            economia[interaction.user.id.toString()] = userData;
            salvarDados(config.ECONOMY_FILE, economia);
        }
        
        await this.handleInteraction(interaction, embed);
    }
}

class CristalMisteriosoView {
    constructor() {
        this.interagidoPor = new Set();
    }

    createActionRow() {
        const lamberButton = new ButtonBuilder()
            .setCustomId("lamber_cristal_persist")
            .setLabel("Lamber o cristal")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("👅");

        const coletarButton = new ButtonBuilder()
            .setCustomId("coletar_cristal_persist")
            .setLabel("Coletar o cristal")
            .setStyle(ButtonStyle.Success)
            .setEmoji("✋");

        const venderButton = new ButtonBuilder()
            .setCustomId("vender_cristal_persist")
            .setLabel("Vender o cristal")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("💰");

        return new ActionRowBuilder()
            .addComponents(lamberButton, coletarButton, venderButton);
    }

    async handleInteraction(interaction, embed) {
        // Desabilitar todos os botões
        const row = this.createActionRow();
        row.components.forEach(component => component.setDisabled(true));

        if (!interaction.replied && !interaction.deferred) {
            await interaction.update({ embeds: [embed], components: [row] });
        } else {
            await interaction.editReply({ embeds: [embed], components: [row] });
        }
        
        // Deletar mensagem após 3 minutos
        setTimeout(async () => {
            try {
                await interaction.message.delete();
            } catch (error) {
                // Mensagem pode já ter sido deletada
            }
        }, 180000);
    }

    async handleLamberCristal(interaction) {
        if (this.interagidoPor.has(interaction.user.id)) {
            await interaction.reply({ content: "Você já interagiu com este cristal!", ephemeral: true });
            return;
        }

        this.interagidoPor.add(interaction.user.id);

        await interaction.deferReply({ ephemeral: true });

        let embed;
        if (Math.random() < 0.50) {
            let userData;
            if (useFirebase()) {
                userData = await getUserXpDataAsync(interaction.user.id, config.XP_FILE);
            } else {
                userData = getUserXpData(interaction.user.id, config.XP_FILE);
            }
            
            userData.xp += 300;
            
            if (useFirebase()) {
                await setUserDataAsync(config.XP_FILE, interaction.user.id, userData);
            } else {
                const xpData = carregarDados(config.XP_FILE);
                xpData[interaction.user.id.toString()] = userData;
                salvarDados(config.XP_FILE, xpData);
            }

            embed = new EmbedBuilder()
                .setTitle("⚡ Energia Absorvida!")
                .setDescription(`**${interaction.user.displayName}** lambeu o cristal e sentiu uma onda de energia! Ele(a) absorveu **300 XP**.`)
                .setColor(0x800080);

            // Verificar level up (implementar depois)
            // await checkLevelUp(interaction, interaction.user.id);
        } else {
            embed = new EmbedBuilder()
                .setTitle("😝 Gosto Ruim!")
                .setDescription(`**${interaction.user.displayName}** lambeu o cristal... Tinha um gosto amargo e ele(a) repensa sua decisão.`)
                .setColor(0xD3D3D3);
        }

        await this.handleInteraction(interaction, embed);
    }

    async handleColetarCristal(interaction) {
        if (this.interagidoPor.has(interaction.user.id)) {
            await interaction.reply({ content: "Você já interagiu com este cristal!", ephemeral: true });
            return;
        }

        this.interagidoPor.add(interaction.user.id);

        await interaction.deferReply({ ephemeral: true });

        let userData;
        if (useFirebase()) {
            userData = await getUserXpDataAsync(interaction.user.id, config.XP_FILE);
        } else {
            userData = getUserXpData(interaction.user.id, config.XP_FILE);
        }
        
        userData.xp += 100;
        
        if (useFirebase()) {
            await setUserDataAsync(config.XP_FILE, interaction.user.id, userData);
        } else {
            const xpData = carregarDados(config.XP_FILE);
            xpData[interaction.user.id.toString()] = userData;
            salvarDados(config.XP_FILE, xpData);
        }

        const embed = new EmbedBuilder()
            .setTitle("✨ Cristal Coletado!")
            .setDescription(`**${interaction.user.displayName}** coletou o cristal e absorveu **100 XP**.`)
            .setColor(0x00FF00);

        // Verificar level up (implementar depois)
        // await checkLevelUp(interaction, interaction.user.id);
        await this.handleInteraction(interaction, embed);
    }

    async handleVenderCristal(interaction) {
        if (this.interagidoPor.has(interaction.user.id)) {
            await interaction.reply({ content: "Você já interagiu com este cristal!", ephemeral: true });
            return;
        }

        this.interagidoPor.add(interaction.user.id);

        await interaction.deferReply({ ephemeral: true });

        let userData;
        if (useFirebase()) {
            userData = await getUserEconomyDataAsync(interaction.user.id, config.ECONOMY_FILE);
        } else {
            userData = getUserEconomyData(interaction.user.id, config.ECONOMY_FILE);
        }

        let ganhos;
        if (Math.random() < 0.20) {
            ganhos = 1500;
        } else {
            ganhos = 500;
        }

        userData.carteira += ganhos;
        
        if (useFirebase()) {
            await setUserDataAsync(config.ECONOMY_FILE, interaction.user.id, userData);
        } else {
            const economia = carregarDados(config.ECONOMY_FILE);
            economia[interaction.user.id.toString()] = userData;
            salvarDados(config.ECONOMY_FILE, economia);
        }

        const embed = new EmbedBuilder()
            .setTitle("💎 Venda Realizada!")
            .setDescription(`**${interaction.user.displayName}** vendeu o cristal e ganhou **${ganhos.toLocaleString()}** moedas furradas!`)
            .setColor(0x0000FF);

        await this.handleInteraction(interaction, embed);
    }
}

module.exports = { CarteiraPerdidaView, CristalMisteriosoView };


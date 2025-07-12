const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const config = require("../config");
const { 
    getUserEconomyDataAsync,
    updateUserDataAsync,
    incrementUserFieldAsync,
    logTransaction // <--- Importado aqui
} = require("../dataHandler");

// --- LÓGICA DO EVENTO DE CARTEIRA PERDIDA (VERSÃO PÚBLICA) ---
class CarteiraPerdidaView {
    constructor() {
        // Controla quem já interagiu com ESTA mensagem de evento específica.
        this.interagidoPor = new Set();
        this.pegarId = 'pegar_carteira_persist';
        this.devolverId = 'devolver_carteira_persist';
    }

    createActionRow() {
        const pegarButton = new ButtonBuilder()
            .setCustomId(this.pegarId)
            .setLabel("Pegar a carteira")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🏃");

        const devolverButton = new ButtonBuilder()
            .setCustomId(this.devolverId)
            .setLabel("Devolver a carteira")
            .setStyle(ButtonStyle.Success)
            .setEmoji("😇");

        return new ActionRowBuilder().addComponents(pegarButton, devolverButton);
    }

    // Função para atualizar a mensagem original do evento para todos verem.
    async handlePublicUpdate(interaction, embed) {
        const row = this.createActionRow();
        row.components.forEach(component => component.setDisabled(true));

        await interaction.message.edit({ embeds: [embed], components: [row] });

        // Deleta a mensagem do evento após 3 minutos
        setTimeout(async () => {
            try {
                await interaction.message.delete();
            } catch (error) {
                // A mensagem pode já ter sido deletada, ignorar erro.
            }
        }, 180000);
    }

    // --- LÓGICA PARA PEGAR A CARTEIRA (COM NOVAS REGRAS) ---
    async handlePegar(interaction) {
        if (this.interagidoPor.size > 0) { // Apenas uma pessoa pode interagir
            await interaction.reply({ content: "Alguém já interagiu com esta carteira!", ephemeral: true });
            return;
        }
        this.interagidoPor.add(interaction.user.id);

        await interaction.deferUpdate(); // Acknowledge da interação sem resposta privada.

        const userId = interaction.user.id;
        
        // --- NOVA LÓGICA ---
        // 1. Zera o contador de devoluções
        await updateUserDataAsync(config.ECONOMY_FILE, userId, { carteiras_devolvidas: 0 });

        // 2. Verifica e remove o cargo "Bom Samaritano"
        const bomSamaritanoRoleId = config.GOOD_SAMARITAN_ROLE_ID;
        let cargoRemovido = false;
        if (bomSamaritanoRoleId && interaction.member.roles.cache.has(bomSamaritanoRoleId)) {
            try {
                const role = await interaction.guild.roles.fetch(bomSamaritanoRoleId);
                if (role) {
                    await interaction.member.roles.remove(role, "Pegou uma carteira, perdendo o status de Bom Samaritano.");
                    cargoRemovido = true;
                }
            } catch (error) {
                console.error("Erro ao remover o cargo de Bom Samaritano:", error);
            }
        }

        // --- LÓGICA ORIGINAL DE RESULTADOS ALEATÓRIOS ---
        await incrementUserFieldAsync(config.ECONOMY_FILE, userId, 'carteiras_pegas', 1);

        const chance = Math.random();
        let embed;

        if (chance < 0.04) { // 4% de chance de tesouro
            const ganhos = 10000;
            await incrementUserFieldAsync(config.ECONOMY_FILE, userId, 'carteira', ganhos);
            await incrementUserFieldAsync(config.ECONOMY_FILE, userId, 'ganhos_pegando', ganhos);
            await logTransaction(userId, 'WALLET_TREASURE', ganhos, 'Encontrou um tesouro na carteira perdida');
            embed = new EmbedBuilder()
                .setTitle("🎉 DIA DE SORTE!")
                .setDescription(`**${interaction.user.displayName}** pegou a carteira e encontrou um tesouro!\n\nEle(a) ganhou **${ganhos.toLocaleString()}** moedas furradas!`)
                .setColor(0xFFD700);
        } else if (chance < 0.44) { // 40% de chance de ser pego
            const perda = Math.floor(Math.random() * 251) + 100;
            await incrementUserFieldAsync(config.ECONOMY_FILE, userId, 'carteira', -perda);
            await incrementUserFieldAsync(config.ECONOMY_FILE, userId, 'perdas_policia', perda);
            await logTransaction(userId, 'WALLET_FINE', -perda, 'Multado pela Pawlice ao pegar carteira');
            embed = new EmbedBuilder()
                .setTitle("🚓 MÃOS AO ALTO!")
                .setDescription(`A **Pawlice** pegou **${interaction.user.displayName}** no flagra!\n\nComo multa, ele(a) perdeu **${perda.toLocaleString()}** moedas furradas.`)
                .setColor(0x8B0000);
        } else { // 56% de chance de estar vazia
            embed = new EmbedBuilder()
                .setTitle("🤔 Que pena...")
                .setDescription(`**${interaction.user.displayName}** pegou a carteira, mas ela estava vazia!`)
                .setColor(0xD3D3D3);
        }
        
        if (cargoRemovido) {
            embed.setFooter({ text: "Sua contagem de devoluções foi zerada e o cargo Bom Samaritano removido." });
        }

        await this.handlePublicUpdate(interaction, embed);
    }

    // --- LÓGICA PARA DEVOLVER A CARTEIRA (COM CORREÇÃO E NOVA REGRA) ---
    async handleDevolver(interaction) {
        if (this.interagidoPor.size > 0) { // Apenas uma pessoa pode interagir
            await interaction.reply({ content: "Alguém já interagiu com esta carteira!", ephemeral: true });
            return;
        }
        this.interagidoPor.add(interaction.user.id);

        await interaction.deferUpdate();

        const userId = interaction.user.id;
        
        let ganhos;
        if (Math.random() < 0.01) { // 1% de chance de recompensa alta
            ganhos = 2000;
        } else {
            ganhos = Math.floor(Math.random() * 251) + 50; // 50-300
        }

        await incrementUserFieldAsync(config.ECONOMY_FILE, userId, 'carteira', ganhos);
        await incrementUserFieldAsync(config.ECONOMY_FILE, userId, 'ganhos_devolvendo', ganhos);
        await incrementUserFieldAsync(config.ECONOMY_FILE, userId, 'carteiras_devolvidas', 1);
        
        await logTransaction(userId, 'WALLET_REWARD', ganhos, 'Recompensa por devolver carteira');

        // Busca os dados atualizados para exibir o total e verificar o cargo
        const userData = await getUserEconomyDataAsync(userId, config.ECONOMY_FILE);
        const totalDevolvido = userData.carteiras_devolvidas || 0;

        const embed = new EmbedBuilder()
            .setTitle("😇 Boa Ação Recompensada!")
            .setDescription(`**${interaction.user.displayName}** foi honesto(a) e devolveu a carteira!\n\nComo recompensa, ele(a) ganhou **${ganhos.toLocaleString()}** moedas furradas!\n\n*Total de carteiras devolvidas: ${totalDevolvido}*`)
            .setColor(0x00FF00);

        const bomSamaritanoRoleId = config.GOOD_SAMARITAN_ROLE_ID;
        if (bomSamaritanoRoleId && totalDevolvido >= 50 && !interaction.member.roles.cache.has(bomSamaritanoRoleId)) {
            try {
                const bomSamaritanoRole = await interaction.guild.roles.fetch(bomSamaritanoRoleId);
                if (bomSamaritanoRole) {
                    await interaction.member.roles.add(bomSamaritanoRole, "Atingiu 50 carteiras devolvidas.");
                    embed.setFooter({ text: `Parabéns! Você recebeu o cargo '${bomSamaritanoRole.name}'!` });
                }
            } catch (error) {
                console.error(`ERRO: Não foi possível adicionar o cargo '${bomSamaritanoRoleId}' a ${interaction.user.username}.`);
            }
        }
        
        await this.handlePublicUpdate(interaction, embed);
    }
}


// --- LÓGICA DO EVENTO DE CRISTAL MISTERIOSO (VERSÃO PÚBLICA) ---
class CristalMisteriosoView {
    constructor() {
        this.interagidoPor = new Set();
        this.lamberId = "lamber_cristal_persist";
        this.coletarId = "coletar_cristal_persist";
        this.venderId = "vender_cristal_persist";
    }

    createActionRow() {
        const lamberButton = new ButtonBuilder().setCustomId(this.lamberId).setLabel("Lamber").setStyle(ButtonStyle.Secondary).setEmoji("👅");
        const coletarButton = new ButtonBuilder().setCustomId(this.coletarId).setLabel("Coletar").setStyle(ButtonStyle.Success).setEmoji("✋");
        const venderButton = new ButtonBuilder().setCustomId(this.venderId).setLabel("Vender").setStyle(ButtonStyle.Primary).setEmoji("💰");
        return new ActionRowBuilder().addComponents(lamberButton, coletarButton, venderButton);
    }

    async handlePublicUpdate(interaction, embed) {
        const row = this.createActionRow();
        row.components.forEach(component => component.setDisabled(true));
        await interaction.message.edit({ embeds: [embed], components: [row] });
        setTimeout(async () => {
            try { await interaction.message.delete(); } catch (error) { /* ignore */ }
        }, 180000);
    }

    async handleInteraction(interaction, actionFn) {
        if (this.interagidoPor.size > 0) {
            await interaction.reply({ content: "Alguém já interagiu com este cristal!", ephemeral: true });
            return;
        }
        this.interagidoPor.add(interaction.user.id);
        await interaction.deferUpdate();
        await actionFn();
    }

    async handleLamber(interaction) {
        await this.handleInteraction(interaction, async () => {
            let embed;
            if (Math.random() < 0.50) {
                await incrementUserFieldAsync(config.XP_FILE, interaction.user.id, 'xp', 300);
                embed = new EmbedBuilder().setTitle("⚡ Energia Absorvida!").setDescription(`**${interaction.user.displayName}** lambeu o cristal e absorveu **300 XP**.`).setColor(0x800080);
            } else {
                embed = new EmbedBuilder().setTitle("😝 Gosto Ruim!").setDescription(`**${interaction.user.displayName}** lambeu o cristal... e se arrependeu.`).setColor(0xD3D3D3);
            }
            await this.handlePublicUpdate(interaction, embed);
        });
    }

    async handleColetar(interaction) {
        await this.handleInteraction(interaction, async () => {
            await incrementUserFieldAsync(config.XP_FILE, interaction.user.id, 'xp', 100);
            const embed = new EmbedBuilder().setTitle("✨ Cristal Coletado!").setDescription(`**${interaction.user.displayName}** coletou o cristal e absorveu **100 XP**.`).setColor(0x00FF00);
            await this.handlePublicUpdate(interaction, embed);
        });
    }

    async handleVender(interaction) {
        await this.handleInteraction(interaction, async () => {
            const ganhos = Math.random() < 0.20 ? 1500 : 500;
            await incrementUserFieldAsync(config.ECONOMY_FILE, interaction.user.id, 'carteira', ganhos);
            
            // Log da venda do cristal
            await logTransaction(interaction.user.id, 'CRYSTAL_SELL', ganhos, 'Venda de cristal misterioso');

            const embed = new EmbedBuilder().setTitle("💎 Venda Realizada!").setDescription(`**${interaction.user.displayName}** vendeu o cristal e ganhou **${ganhos.toLocaleString()}** moedas!`).setColor(0x0000FF);
            await this.handlePublicUpdate(interaction, embed);
        });
    }
}

module.exports = { CarteiraPerdidaView, CristalMisteriosoView };

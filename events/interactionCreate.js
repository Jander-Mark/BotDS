const PainelDeControle = require('../views/PainelDeControle');
const { LojaView, ItemSelect } = require('../views/LojaView');
const { CarteiraPerdidaView, CristalMisteriosoView } = require('../views/EventViews');

// Instâncias globais para manter estado
const carteiraPerdidaViews = new Map();
const cristalMisteriosoViews = new Map();
const painelDeControleViews = new Map();

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`Nenhum comando correspondente a ${interaction.commandName} foi encontrado.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Erro ao executar comando:', error);
                
                const errorMessage = { content: 'Houve um erro ao executar este comando!', ephemeral: true };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        } else if (interaction.isButton()) {
            const customId = interaction.customId;

            try {
                // Botões do Painel de Controle
                if (customId === 'boas_vindas' || customId === 'expulsar' || customId === 'banir') {
                    // Encontrar o membro associado a esta mensagem
                    const embed = interaction.message.embeds[0];
                    if (embed && embed.description) {
                        const memberMention = embed.description.match(/<@!?(\d+)>/);
                        if (memberMention) {
                            const memberId = memberMention[1];
                            const member = await interaction.guild.members.fetch(memberId);
                            
                            if (member) {
                                const painelDeControle = new PainelDeControle(member);
                                
                                switch (customId) {
                                    case 'boas_vindas':
                                        await painelDeControle.handleBoasVindas(interaction);
                                        break;
                                    case 'expulsar':
                                        await painelDeControle.handleExpulsar(interaction);
                                        break;
                                    case 'banir':
                                        await painelDeControle.handleBanir(interaction);
                                        break;
                                }
                            }
                        }
                    }
                }
                // Botões da Loja
                else if (customId.startsWith('cat_')) {
                    const lojaView = new LojaView();
                    
                    switch (customId) {
                        case 'cat_funcoes_persist':
                            await lojaView.handleFuncoes(interaction);
                            break;
                        case 'cat_cosmeticos_persist':
                            await lojaView.handleCosmeticos(interaction);
                            break;
                        case 'cat_especiais_persist':
                            await lojaView.handleEspeciais(interaction);
                            break;
                    }
                }
                // Botões de Eventos
                else if (customId === 'pegar_carteira_persist' || customId === 'devolver_carteira_persist') {
                    let carteiraPerdidaView = carteiraPerdidaViews.get(interaction.message.id);
                    if (!carteiraPerdidaView) {
                        carteiraPerdidaView = new CarteiraPerdidaView();
                        carteiraPerdidaViews.set(interaction.message.id, carteiraPerdidaView);
                    }
                    
                    switch (customId) {
                        case 'pegar_carteira_persist':
                            await carteiraPerdidaView.handlePegarCarteira(interaction);
                            break;
                        case 'devolver_carteira_persist':
                            await carteiraPerdidaView.handleDevolverCarteira(interaction);
                            break;
                    }
                }
                else if (customId === 'lamber_cristal_persist' || customId === 'coletar_cristal_persist' || customId === 'vender_cristal_persist') {
                    let cristalMisteriosoView = cristalMisteriosoViews.get(interaction.message.id);
                    if (!cristalMisteriosoView) {
                        cristalMisteriosoView = new CristalMisteriosoView();
                        cristalMisteriosoViews.set(interaction.message.id, cristalMisteriosoView);
                    }
                    
                    switch (customId) {
                        case 'lamber_cristal_persist':
                            await cristalMisteriosoView.handleLamberCristal(interaction);
                            break;
                        case 'coletar_cristal_persist':
                            await cristalMisteriosoView.handleColetarCristal(interaction);
                            break;
                        case 'vender_cristal_persist':
                            await cristalMisteriosoView.handleVenderCristal(interaction);
                            break;
                    }
                }
            } catch (error) {
                console.error('Erro ao processar interação de botão:', error);
                
                const errorMessage = { content: 'Houve um erro ao processar esta interação!', ephemeral: true };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        } else if (interaction.isStringSelectMenu()) {
            const customId = interaction.customId;

            try {
                if (customId.startsWith('shop_category_')) {
                    const category = customId.replace('shop_category_', '');
                    const itemSelect = new ItemSelect(category);
                    const selectedItem = interaction.values[0];
                    
                    await itemSelect.handleSelection(interaction, selectedItem);
                }
            } catch (error) {
                console.error('Erro ao processar select menu:', error);
                
                const errorMessage = { content: 'Houve um erro ao processar esta seleção!', ephemeral: true };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }
    }
};


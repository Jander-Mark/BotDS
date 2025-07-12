const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { initializeDataHandler } = require('./dataHandler');

// Criar uma nova instância do cliente
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Coleção para armazenar comandos
client.commands = new Collection();

// Inicializar sistema de dados (Firebase ou JSON local)
console.log('Inicializando sistema de dados...');
const usingFirebase = initializeDataHandler();
if (usingFirebase) {
    console.log('✅ Firebase inicializado com sucesso!');
} else {
    console.log('⚠️ Usando armazenamento JSON local (Firebase não configurado)');
}

// Carregar comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const commandModule = require(filePath);
    
    // Cada arquivo de comando pode exportar múltiplos comandos
    for (const [key, command] of Object.entries(commandModule)) {
        if (command.data && command.execute) {
            client.commands.set(command.data.name, command);
            console.log(`Comando carregado: ${command.data.name}`);
        }
    }
}

// Carregar eventos
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
    
    console.log(`Evento carregado: ${event.name}`);
}

// Função para registrar os comandos no Discord
async function deployCommands() {
    if (!config.CLIENT_ID || !config.GUILD_ID) {
        console.error("ERRO: CLIENT_ID e GUILD_ID precisam ser configurados em config.js para registrar os comandos.");
        return;
    }

    const commands = [];
    client.commands.forEach(command => {
        commands.push(command.data.toJSON());
    });

    const rest = new REST({ version: '10' }).setToken(config.TOKEN);

    try {
        console.log(`Iniciando o registro de ${commands.length} comandos de aplicação (/).`);

        // Registra os comandos para um servidor específico (guild). É mais rápido para testes.
        const data = await rest.put(
            Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
            { body: commands },
        );

        console.log(`✅ ${data.length} comandos de aplicação (/) recarregados com sucesso.`);
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
}

// Fazer login do bot
if (!config.TOKEN || config.TOKEN === "") {
    console.error("ERRO CRÍTICO: O TOKEN do bot não foi configurado no arquivo config.js");
    process.exit(1);
} else {
    // Registra os comandos ANTES de fazer o login
    deployCommands().then(() => {
        client.login(config.TOKEN)
            .then(() => {
                console.log("Bot logado com sucesso!");
                console.log(`Sistema de dados: ${usingFirebase ? 'Firebase' : 'JSON Local'}`);
            })
            .catch(error => {
                if (error.code === 'TokenInvalid') {
                    console.error("ERRO: O token fornecido é inválido.");
                } else {
                    console.error("Ocorreu um erro inesperado durante o login:", error);
                }
                process.exit(1);
            });
    });
}

// Tratamento de erros não capturados
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

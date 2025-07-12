// ------------------- CONFIGURAÇÃO INICIAL (MUITO IMPORTANTE!) -------------------
module.exports = {
    TOKEN: "", // <-- COLOQUE SEU TOKEN REAL AQUI
    CLIENT_ID: "", // <-- COLOQUE O ID DO SEU BOT AQUI (CLIENT ID)
    GUILD_ID: "", // <-- COLOQUE O ID DO SEU SERVIDOR AQUI
    
    // --- IDs DOS CANAIS ---
    WELCOME_CHANNEL_ID: "800504234851565588",
    PUBLIC_WELCOME_CHANNEL_ID: "542399752394768385",
    LOG_CHANNEL_ID: "800504234851565588",
    SUMMARY_CHANNEL_ID: "771744782284226561",
    GUIDELINES_CHANNEL_ID: "542397837863026719",
    LEVEL_UP_CHANNEL_ID: "543495697010393088",

    // --- CONFIGURAÇÃO DE XP ---
    // Lista de IDs de canais onde os membros podem ganhar XP.
    XP_ENABLED_CHANNELS: ["542399752394768385", "800504234851565588", "769717199837069372"], // <-- ADICIONE OS IDs DOS CANAIS DE CHAT AQUI
    // Cooldown em segundos para ganhar XP após enviar uma mensagem.
    XP_COOLDOWN: 60,

    // --- IDs DOS CARGOS ---
    WELCOME_GANG_ROLE_ID: "1391919478375317554",
    STAFF_ROLE_ID: "983160693702410282",
    BAN_COMMAND_ROLE_ID: "549286242177777674",
    GOOD_SAMARITAN_ROLE_ID: "1392104928213729341",

    // Dicionário de cargos por nível. {nível: id_do_cargo}
    LEVEL_ROLES: {
        10: "1392155616348340244", // ID do cargo "furrinho"
        20: "1392155750226198729", // ID do cargo "furro iniciante"
        30: "1392156138895577089", // ID do cargo "furro estudado"
        40: "1392156205723680891", // ID do cargo "furro avançado"
        50: "1392156257229734019", // ID do cargo "Furro conversador"
        75: "1392156321088016507", // ID do cargo "Furro dedicado"
        100: "1392156358178246738" // ID do cargo "Alisa meu pelo"
    },

    // --- CONFIGURAÇÃO DE EVENTOS ---
    AUTO_DROP_CHANNELS: ["542399752394768385", "543495697010393088", "780495720494530570", "819547863653941279"],
    // Chance (em %) de dropar uma carteira a cada 5 minutos. (Ex: 5 = 5% de chance)
    AUTO_DROP_CHANCE: 80,

    // --- Nomes dos Arquivos de Dados ---
    ENTRY_COUNT_FILE: "contagem_entradas.json",
    ECONOMY_FILE: "economia.json",
    XP_FILE: "xp_data.json",
    SHOP_DATA_FILE: "shop_data.json",

    // --- CONFIGURAÇÃO DA LOJA ---
    SHOP_CONFIG: {
        "funcoes": {
            "name": "Cargos com Funções",
            "items": {
                "xp_boost": {"name": "Xp Boost", "price": 1000000, "role_id": "0", "description": "Ganhe o dobro de XP permanentemente."},
                "gartic_mod": {"name": "GarticMOD", "price": 50000, "role_id": "0", "description": "Controle sobre o bot de Gartic."},
                "color_pass": {"name": "Color pass", "price": 100000, "role_id": "0", "description": "Acesso ao menu de cores."}
            }
        },
        "cosmeticos": {
            "name": "Cargos Cosméticos",
            "items": {
                "markonha": {"name": "Markonha", "price": 50000, "role_id": "0", "description": "Um cargo verde estiloso."},
                "rosquinha": {"name": "Rosquinha", "price": 50000, "role_id": "0", "description": "Um cargo doce e rosa."},
                "femboy": {"name": "Femboy", "price": 50000, "role_id": "0", "description": "Um cargo fofo e amarelo."},
                "rocknroll": {"name": "Rock'n roll", "price": 50000, "role_id": "0", "description": "Um cargo de atitude."},
                "lacradora": {"name": "Lacradora", "price": 50000, "role_id": "0", "description": "Um cargo para quem chega chegando."},
                "fusca_rosa": {"name": "Fusca Rosa", "price": 30000, "role_id": "0", "description": "Um cargo extra para seu perfil."},
                "submarino": {"name": "Submarino", "price": 30000, "role_id": "0", "description": "Um cargo extra para seu perfil."}
            }
        },
        "especiais": {
            "name": "Cargos Especiais",
            "items": {
                "carro_ovo": {"name": "Carro do ovo", "price": 500000, "role_id": "0", "description": "Cargo de evento passado e exclusivo."},
                "moon": {"name": "Moon", "price": 400000, "role_id": "0", "description": "Apenas uma pessoa pode tê-lo por vez."}
            }
        }
    }
};


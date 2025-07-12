const fs = require('fs');
const path = require('path');
const firebaseHandler = require('./firebaseHandler');

// Flag para determinar se usar Firebase ou JSON local
let useFirebase = false;

// Inicializar Firebase
function initializeDataHandler() {
    useFirebase = firebaseHandler.initializeFirebase();
    return useFirebase;
}

// ------------------- FUNÇÕES AUXILIARES PARA DADOS (JSON) -------------------
function carregarDados(arquivo) {
    if (!fs.existsSync(arquivo)) return {};
    try {
        const data = fs.readFileSync(arquivo, 'utf8');
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error(`Erro ao carregar dados de ${arquivo}:`, error);
        return {};
    }
}

function salvarDados(arquivo, data) {
    try {
        const dir = path.dirname(arquivo);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(arquivo, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        console.error(`Erro ao salvar dados em ${arquivo}:`, error);
    }
}

// ------------------- LÓGICA DE LOG DE TRANSAÇÕES (NOVO SISTEMA) -------------------
const HISTORICO_FILE = 'historico_transacoes.json';
const HISTORICO_COLLECTION = 'historico_transacoes';

/**
 * Registra uma transação no histórico de um usuário.
 * @param {string} userId - O ID do usuário.
 * @param {'DAILY'|'TRANSFER_SENT'|'TRANSFER_RECEIVED'|'CRYSTAL_SELL'|'WALLET_REWARD'|'WALLET_FINE'|'WALLET_TREASURE'} type - O tipo de transação.
 * @param {number} quantia - A quantia (positiva para ganhos, negativa para perdas).
 * @param {string} descricao - Uma breve descrição da transação.
 * @param {string|null} relatedUserId - O ID do outro usuário envolvido, se houver.
 */
async function logTransaction(userId, type, quantia, descricao, relatedUserId = null) {
    const logEntry = {
        id: `TX${Date.now()}${Math.random().toString(36).substring(2, 8)}`,
        type: type,
        quantia: quantia,
        descricao: descricao,
        relatedUserId: relatedUserId,
        timestamp: new Date().toISOString()
    };

    if (useFirebase) {
        try {
            const userDocRef = firebaseHandler.getCollection(HISTORICO_COLLECTION).doc(userId.toString());
            
            // CORREÇÃO APLICADA AQUI:
            // Usamos .set() com { merge: true } em vez de .update().
            // Isso cria o documento se ele não existir, ou atualiza o campo `transacoes` se o documento já existir.
            // O arrayUnion garante que estamos apenas adicionando um novo item ao array sem sobrescrever os antigos.
            await userDocRef.set({
                transacoes: firebaseHandler.FieldValue.arrayUnion(logEntry)
            }, { merge: true });

        } catch (error) {
            console.error(`Erro ao salvar log de transação no Firebase para o usuário ${userId}:`, error);
        }
    } else {
        const logFile = path.join(__dirname, '..', 'logs', HISTORICO_FILE);
        const historicos = carregarDados(logFile);

        if (!historicos[userId]) {
            historicos[userId] = [];
        }

        historicos[userId].unshift(logEntry);
        historicos[userId] = historicos[userId].slice(0, 50);

        salvarDados(logFile, historicos);
    }
}


// ------------------- FUNÇÕES PARA FIREBASE -------------------

const COLLECTION_MAPPING = {
    'economia.json': 'economia',
    'xp_data.json': 'xp_data',
    'contagem_entradas.json': 'contagem_entradas',
    'shop_data.json': 'shop_data',
    [HISTORICO_FILE]: HISTORICO_COLLECTION
};

function getCollectionName(arquivo) {
    return COLLECTION_MAPPING[arquivo] || arquivo.replace('.json', '');
}

async function carregarDadosAsync(arquivo) {
    if (useFirebase) {
        try {
            const collectionName = getCollectionName(arquivo);
            return await firebaseHandler.getAllDocuments(collectionName);
        } catch (error) {
            console.error(`Erro ao carregar dados do Firebase (${arquivo}):`, error);
            return carregarDados(arquivo);
        }
    } else {
        return carregarDados(arquivo);
    }
}

async function salvarDadosAsync(arquivo, data) {
    if (useFirebase) {
        try {
            const collectionName = getCollectionName(arquivo);
            const batch = firebaseHandler.createBatch();
            
            for (const [userId, userData] of Object.entries(data)) {
                const docRef = firebaseHandler.getCollection(collectionName).doc(userId);
                batch.set(docRef, userData, { merge: true });
            }
            
            await firebaseHandler.commitBatch(batch);
            return true;
        } catch (error) {
            console.error(`Erro ao salvar dados no Firebase (${arquivo}):`, error);
            salvarDados(arquivo, data);
            return false;
        }
    } else {
        salvarDados(arquivo, data);
        return true;
    }
}

async function getUserDataAsync(arquivo, userId) {
    if (useFirebase) {
        try {
            const collectionName = getCollectionName(arquivo);
            const userData = await firebaseHandler.getDocument(collectionName, userId.toString());
            return userData || {};
        } catch (error) {
            console.error(`Erro ao obter dados do usuário ${userId} do Firebase:`, error);
            const data = carregarDados(arquivo);
            return data[userId.toString()] || {};
        }
    } else {
        const data = carregarDados(arquivo);
        return data[userId.toString()] || {};
    }
}

async function setUserDataAsync(arquivo, userId, userData) {
    if (useFirebase) {
        try {
            const collectionName = getCollectionName(arquivo);
            await firebaseHandler.setDocument(collectionName, userId.toString(), userData);
            return true;
        } catch (error) {
            console.error(`Erro ao salvar dados do usuário ${userId} no Firebase:`, error);
            const data = carregarDados(arquivo);
            data[userId.toString()] = userData;
            salvarDados(arquivo, data);
            return false;
        }
    } else {
        const data = carregarDados(arquivo);
        data[userId.toString()] = userData;
        salvarDados(arquivo, data);
        return true;
    }
}

async function updateUserDataAsync(arquivo, userId, updateData) {
    if (useFirebase) {
        try {
            const collectionName = getCollectionName(arquivo);
            await firebaseHandler.setDocument(collectionName, userId.toString(), updateData, { merge: true });
        } catch (error) {
            console.error(`Erro ao atualizar dados do usuário ${userId} no Firebase:`, error);
            const data = carregarDados(arquivo);
            data[userId.toString()] = { ...data[userId.toString()], ...updateData };
            salvarDados(arquivo, data);
        }
    } else {
        const data = carregarDados(arquivo);
        data[userId.toString()] = { ...data[userId.toString()], ...updateData };
        salvarDados(arquivo, data);
    }
}

async function incrementUserFieldAsync(arquivo, userId, field, incrementValue = 1) {
    if (useFirebase) {
        try {
            const collectionName = getCollectionName(arquivo);
            await firebaseHandler.incrementField(collectionName, userId.toString(), field, incrementValue);
            return true;
        } catch (error) {
            console.error(`Erro ao incrementar campo ${field} do usuário ${userId} no Firebase:`, error);
            const data = carregarDados(arquivo);
            if (!data[userId.toString()]) data[userId.toString()] = {};
            data[userId.toString()][field] = (data[userId.toString()][field] || 0) + incrementValue;
            salvarDados(arquivo, data);
            return false;
        }
    } else {
        const data = carregarDados(arquivo);
        if (!data[userId.toString()]) data[userId.toString()] = {};
        data[userId.toString()][field] = (data[userId.toString()][field] || 0) + incrementValue;
        salvarDados(arquivo, data);
        return true;
    }
}

// ------------------- FUNÇÕES ESPECÍFICAS PARA ECONOMIA -------------------
async function getUserEconomyData(userId, economyFile) {
    const userData = await getUserDataAsync(economyFile, userId);
    
    const defaultData = {
        carteira: 0,
        ultimo_daily: null,
        carteiras_devolvidas: 0,
        ganhos_devolvendo: 0,
        ganhos_pegando: 0,
        perdas_policia: 0,
        carteiras_pegas: 0
    };
    
    const mergedData = { ...defaultData, ...userData };
    
    return mergedData;
}

// ------------------- FUNÇÕES ESPECÍFICAS PARA XP -------------------
async function getUserXpData(userId, xpFile) {
    const userData = await getUserDataAsync(xpFile, userId);
    
    const defaultData = {
        xp: 0,
        level: 0,
        last_message_timestamp: 0
    };
    
    const mergedData = { ...defaultData, ...userData };
    
    return mergedData;
}

// ------------------- FUNÇÕES DE COMPATIBILIDADE (SÍNCRONAS) -------------------
function getUserEconomyDataSync(userId, economyFile) {
    const economia = carregarDados(economyFile);
    const userIdStr = userId.toString();
    
    const defaultData = {
        carteira: 0,
        ultimo_daily: null,
        carteiras_devolvidas: 0,
        ganhos_devolvendo: 0,
        ganhos_pegando: 0,
        perdas_policia: 0,
        carteiras_pegas: 0
    };
    
    economia[userIdStr] = { ...defaultData, ...economia[userIdStr] };
    salvarDados(economyFile, economia);
    
    return economia[userIdStr];
}

function getUserXpDataSync(userId, xpFile) {
    const xpData = carregarDados(xpFile);
    const userIdStr = userId.toString();
    
    if (!xpData[userIdStr]) {
        xpData[userIdStr] = {
            xp: 0,
            level: 0,
            last_message_timestamp: 0
        };
        salvarDados(xpFile, xpData);
    }
    return xpData[userIdStr];
}

function calculateXpForLevel(level) {
    if (level < 1) return 0;
    return 25 * (level * level) + 50 * level;
}

function calculateLevelForXp(xp) {
    if (xp <= 0) return 0;
    const level = Math.floor((Math.sqrt(2500 + 100 * xp) - 50) / 50);
    return Math.max(0, level);
}

function updateUserLevel(userData) {
    const newLevel = calculateLevelForXp(userData.xp);
    if (newLevel !== userData.level) {
        userData.level = newLevel;
    }
    return userData;
}

module.exports = {
    initializeDataHandler,
    carregarDados,
    salvarDados,
    logTransaction,
    getUserEconomyData: getUserEconomyDataSync,
    getUserXpData: getUserXpDataSync,
    carregarDadosAsync,
    salvarDadosAsync,
    getUserDataAsync,
    setUserDataAsync,
    updateUserDataAsync,
    incrementUserFieldAsync,
    getUserEconomyDataAsync: getUserEconomyData,
    getUserXpDataAsync: getUserXpData,
    useFirebase: () => useFirebase,
    getCollectionName,
    calculateXpForLevel,
    calculateLevelForXp,
    updateUserLevel,
    HISTORICO_FILE,
    HISTORICO_COLLECTION
};

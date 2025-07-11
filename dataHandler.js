const fs = require('fs');
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
        return JSON.parse(data);
    } catch (error) {
        console.error(`Erro ao carregar dados de ${arquivo}:`, error);
        return {};
    }
}

function salvarDados(arquivo, data) {
    try {
        fs.writeFileSync(arquivo, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        console.error(`Erro ao salvar dados em ${arquivo}:`, error);
    }
}

// ------------------- FUNÇÕES PARA FIREBASE -------------------

// Mapear nomes de arquivos para coleções do Firebase
const COLLECTION_MAPPING = {
    'economia.json': 'economia',
    'xp_data.json': 'xp_data',
    'contagem_entradas.json': 'contagem_entradas',
    'shop_data.json': 'shop_data'
};

function getCollectionName(arquivo) {
    return COLLECTION_MAPPING[arquivo] || arquivo.replace('.json', '');
}

// Função unificada para carregar dados (Firebase ou JSON)
async function carregarDadosAsync(arquivo) {
    if (useFirebase) {
        try {
            const collectionName = getCollectionName(arquivo);
            return await firebaseHandler.getAllDocuments(collectionName);
        } catch (error) {
            console.error(`Erro ao carregar dados do Firebase (${arquivo}):`, error);
            // Fallback para JSON local
            return carregarDados(arquivo);
        }
    } else {
        return carregarDados(arquivo);
    }
}

// Função unificada para salvar dados (Firebase ou JSON)
async function salvarDadosAsync(arquivo, data) {
    if (useFirebase) {
        try {
            const collectionName = getCollectionName(arquivo);
            const batch = firebaseHandler.createBatch();
            
            // Salvar cada usuário como um documento separado
            for (const [userId, userData] of Object.entries(data)) {
                const docRef = firebaseHandler.getCollection(collectionName).doc(userId);
                batch.set(docRef, userData, { merge: true });
            }
            
            await firebaseHandler.commitBatch(batch);
            return true;
        } catch (error) {
            console.error(`Erro ao salvar dados no Firebase (${arquivo}):`, error);
            // Fallback para JSON local
            salvarDados(arquivo, data);
            return false;
        }
    } else {
        salvarDados(arquivo, data);
        return true;
    }
}

// Função para obter dados de um usuário específico
async function getUserDataAsync(arquivo, userId) {
    if (useFirebase) {
        try {
            const collectionName = getCollectionName(arquivo);
            const userData = await firebaseHandler.getDocument(collectionName, userId.toString());
            return userData || {};
        } catch (error) {
            console.error(`Erro ao obter dados do usuário ${userId} do Firebase:`, error);
            // Fallback para JSON local
            const data = carregarDados(arquivo);
            return data[userId.toString()] || {};
        }
    } else {
        const data = carregarDados(arquivo);
        return data[userId.toString()] || {};
    }
}

// Função para salvar dados de um usuário específico
async function setUserDataAsync(arquivo, userId, userData) {
    if (useFirebase) {
        try {
            const collectionName = getCollectionName(arquivo);
            await firebaseHandler.setDocument(collectionName, userId.toString(), userData);
            return true;
        } catch (error) {
            console.error(`Erro ao salvar dados do usuário ${userId} no Firebase:`, error);
            // Fallback para JSON local
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

// Função para atualizar dados de um usuário específico
async function updateUserDataAsync(arquivo, userId, updateData) {
    if (useFirebase) {
        try {
            const collectionName = getCollectionName(arquivo);
            await firebaseHandler.updateDocument(collectionName, userId.toString(), updateData);
            return true;
        } catch (error) {
            console.error(`Erro ao atualizar dados do usuário ${userId} no Firebase:`, error);
            // Fallback para JSON local
            const data = carregarDados(arquivo);
            data[userId.toString()] = { ...data[userId.toString()], ...updateData };
            salvarDados(arquivo, data);
            return false;
        }
    } else {
        const data = carregarDados(arquivo);
        data[userId.toString()] = { ...data[userId.toString()], ...updateData };
        salvarDados(arquivo, data);
        return true;
    }
}

// Função para incrementar um campo numérico
async function incrementUserFieldAsync(arquivo, userId, field, incrementValue = 1) {
    if (useFirebase) {
        try {
            const collectionName = getCollectionName(arquivo);
            await firebaseHandler.incrementField(collectionName, userId.toString(), field, incrementValue);
            return true;
        } catch (error) {
            console.error(`Erro ao incrementar campo ${field} do usuário ${userId} no Firebase:`, error);
            // Fallback para JSON local
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
    
    // Garantir que todos os campos necessários existam
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
    
    // Garantir que todos os campos necessários existam
    const defaultData = {
        xp: 0,
        level: 0,
        last_message_timestamp: 0
    };
    
    const mergedData = { ...defaultData, ...userData };
    
    return mergedData;
}

// ------------------- FUNÇÕES DE COMPATIBILIDADE (SÍNCRONAS) -------------------
// Estas funções mantêm compatibilidade com o código existente
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

/**
 * Calcula o XP total necessário para atingir um determinado nível.
 * @param {number} level - O nível.
 * @returns {number} O XP total necessário.
 */
function calculateXpForLevel(level) {
    if (level < 1) return 0;
    return 25 * (level * level) + 50 * level;
}

/**
 * Calcula o nível de um usuário com base em seu XP total.
 * Inverso de calculateXpForLevel.
 * @param {number} xp - O XP total do usuário.
 * @returns {number} O nível calculado.
 */
function calculateLevelForXp(xp) {
    if (xp <= 0) return 0;
    // Fórmula matemática para encontrar L: L = (sqrt(2500 + 100 * XP) - 50) / 50
    const level = Math.floor((Math.sqrt(2500 + 100 * xp) - 50) / 50);
    return Math.max(0, level);
}

/**
 * Atualiza o nível de um usuário com base em seu XP atual e retorna os dados atualizados.
 * @param {object} userData - O objeto de dados de XP do usuário.
 * @returns {object} O objeto de dados de XP atualizado com o nível correto.
 */
function updateUserLevel(userData) {
    const newLevel = calculateLevelForXp(userData.xp);
    if (newLevel !== userData.level) {
        userData.level = newLevel;
    }
    return userData;
}

module.exports = {
    // Inicialização
    initializeDataHandler,
    
    // Funções síncronas (compatibilidade)
    carregarDados,
    salvarDados,
    getUserEconomyData: getUserEconomyDataSync,
    getUserXpData: getUserXpDataSync,
    
    // Funções assíncronas (Firebase)
    carregarDadosAsync,
    salvarDadosAsync,
    getUserDataAsync,
    setUserDataAsync,
    updateUserDataAsync,
    incrementUserFieldAsync,
    getUserEconomyDataAsync: getUserEconomyData,
    getUserXpDataAsync: getUserXpData,
    
    // Utilitários
    useFirebase: () => useFirebase,
    getCollectionName,

    // Funções de XP e Nível
    calculateXpForLevel,
    calculateLevelForXp,
    updateUserLevel
};

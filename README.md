# Discord Bot JavaScript - Versão Modularizada com Firebase

Este é um bot do Discord convertido de Python para JavaScript, com uma arquitetura modularizada e integração opcional com Firebase Firestore para persistência de dados.

## 📁 Estrutura do Projeto

```
discord-bot-js/
├── config.js                          # Configurações do bot (IDs, tokens, etc.)
├── dataHandler.js                     # Funções para manipulação de dados (JSON/Firebase)
├── firebaseHandler.js                 # Módulo de conexão com Firebase
├── index.js                          # Arquivo principal do bot
├── migrate-to-firebase.js             # Script de migração de dados
├── package.json                       # Dependências e scripts do projeto
├── README.md                          # Este arquivo
├── firebase-service-account.json      # Credenciais do Firebase (não incluído)
├── firebase-service-account.json.example # Exemplo de credenciais
├── commands/                          # Comandos do bot
│   ├── adminCommands.js               # Comandos administrativos
│   ├── economyCommands.js             # Comandos de economia
│   └── xpCommands.js                  # Comandos de XP/nível
├── events/                            # Eventos do bot
│   ├── interactionCreate.js           # Manipulação de interações (botões, menus)
│   ├── memberJoin.js                  # Evento de entrada de membros
│   ├── messageCreate.js               # Evento de criação de mensagens
│   └── ready.js                       # Evento de inicialização do bot
└── views/                             # Componentes de interface (botões, menus)
    ├── EventViews.js                  # Views para eventos (carteira, cristal)
    ├── LojaView.js                    # View da loja
    └── PainelDeControle.js            # Painel de controle de entrada
```

## 🚀 Configuração e Instalação

### 1. Pré-requisitos
- Node.js 16.0.0 ou superior
- npm (geralmente vem com o Node.js)
- Um bot do Discord criado no Discord Developer Portal
- (Opcional) Projeto Firebase configurado

### 2. Instalação
```bash
# Clone ou baixe o projeto
cd discord-bot-js

# Instale as dependências
npm install
```

### 3. Configuração Básica
1. Abra o arquivo `config.js`
2. Substitua o valor vazio de `TOKEN` pelo token do seu bot:
   ```javascript
   TOKEN: "SEU_TOKEN_AQUI",
   ```
3. Configure os IDs dos canais e cargos conforme necessário
4. Ajuste as configurações da loja, XP e eventos conforme desejado

### 4. Configuração do Firebase (Opcional)

#### 4.1. Criar Projeto Firebase
1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Crie um novo projeto ou use um existente
3. Ative o Firestore Database
4. Configure as regras de segurança do Firestore

#### 4.2. Obter Credenciais de Serviço
1. No Console do Firebase, vá para "Configurações do Projeto"
2. Aba "Contas de serviço"
3. Clique em "Gerar nova chave privada"
4. Baixe o arquivo JSON de credenciais
5. Renomeie para `firebase-service-account.json` e coloque na pasta do projeto

#### 4.3. Configurar URL do Banco
1. Abra o arquivo `firebaseHandler.js`
2. Substitua a URL do banco na linha:
   ```javascript
   databaseURL: "https://SEU-PROJETO-firebase.firebaseio.com"
   ```

### 5. Execução
```bash
# Executar o bot
npm start

# Ou para desenvolvimento
npm run dev
```

## 🔄 Sistema de Dados Híbrido

O bot suporta dois modos de armazenamento:

### Modo JSON Local (Padrão)
- Usado quando o Firebase não está configurado
- Dados salvos em arquivos JSON locais
- Compatível com a versão original

### Modo Firebase (Recomendado)
- Usado quando o Firebase está configurado corretamente
- Dados salvos no Firestore
- Melhor performance e escalabilidade
- Backup automático na nuvem

## 📊 Migração de Dados

### Migrar JSON para Firebase
```bash
# Migrar todos os dados existentes para Firebase
node migrate-to-firebase.js migrate
```

### Fazer Backup do Firebase
```bash
# Criar backup dos dados do Firebase para JSON
node migrate-to-firebase.js backup
```

### Comandos de Migração
```bash
# Ver todos os comandos disponíveis
node migrate-to-firebase.js
```

## 🔧 Funcionalidades

### Sistema de XP e Níveis
- Ganho automático de XP por mensagens
- Sistema de níveis com cargos automáticos
- Comandos: `/level`, `/ranking`
- Comandos admin: `/xp_admin adicionar`, `/xp_admin remover`
- **Firebase**: Dados de XP armazenados na coleção `xp_data`

### Sistema de Economia
- Moedas furradas como moeda do servidor
- Daily de 2000 moedas a cada 24 horas
- Transferência entre usuários
- Comandos: `/carteira`, `/daily`, `/transferir`, `/topcarteira`, `/status_carteira`
- Comandos admin: `/economia_admin definir`, `/economia_admin adicionar`, `/economia_admin remover`
- **Firebase**: Dados de economia armazenados na coleção `economia`

### Sistema de Loja
- Loja com cargos funcionais, cosméticos e especiais
- Cargo "Moon" especial com preço dinâmico
- Interface com botões e menus de seleção
- Comando admin: `/postar_loja`
- **Firebase**: Dados da loja armazenados na coleção `shop_data`

### Eventos Interativos
- **Carteira Perdida**: Evento com escolhas (pegar ou devolver)
- **Cristal Misterioso**: Evento com múltiplas opções (lamber, coletar, vender)
- Drop automático a cada 5 minutos (configurável)
- Comandos admin: `/dropar_carteira`, `/dropar_cristal`

### Painel de Entrada
- Painel automático quando novos membros entram
- Botões para boas-vindas, expulsão e banimento
- Log de moderação automático
- Contador de entradas por usuário
- **Firebase**: Contadores armazenados na coleção `contagem_entradas`

## 📝 Comandos Disponíveis

### Comandos Gerais
- `/level [membro]` - Mostra nível e progresso de XP
- `/ranking` - Ranking de XP do servidor
- `/carteira [membro]` - Mostra saldo de moedas
- `/daily` - Resgata 2000 moedas diárias
- `/transferir <membro> <quantia>` - Transfere moedas
- `/topcarteira` - Ranking de moedas
- `/status_carteira` - Estatísticas de eventos

### Comandos Administrativos
- `/postar_loja` - Posta a mensagem da loja
- `/dropar_carteira` - Inicia evento de carteira perdida
- `/dropar_cristal` - Inicia evento de cristal misterioso
- `/economia_admin definir/adicionar/remover` - Gerencia economia
- `/xp_admin adicionar/remover` - Gerencia XP

## 🔄 Migração do Python

### Principais Mudanças
1. **Sintaxe**: Convertida de Python para JavaScript
2. **Estrutura**: Modularizada em arquivos separados por funcionalidade
3. **Eventos**: Sistema de eventos do discord.js
4. **Comandos**: Slash commands em vez de comandos de texto
5. **Interações**: Botões e menus persistentes
6. **Banco de Dados**: Suporte a Firebase Firestore

### Funcionalidades Mantidas
- ✅ Sistema de XP e níveis
- ✅ Sistema de economia completo
- ✅ Loja com todos os tipos de cargos
- ✅ Eventos interativos (carteira e cristal)
- ✅ Painel de entrada de membros
- ✅ Drop automático de eventos
- ✅ Comandos administrativos
- ✅ Sistema de logs

### Novas Funcionalidades
- ✅ Integração com Firebase Firestore
- ✅ Sistema híbrido de armazenamento (JSON/Firebase)
- ✅ Scripts de migração de dados
- ✅ Backup automático
- ✅ Melhor tratamento de erros
- ✅ Performance otimizada

## 🛠️ Personalização

### Adicionando Novos Comandos
1. Crie um novo arquivo em `commands/` ou adicione ao arquivo existente
2. Exporte o comando seguindo o padrão:
   ```javascript
   const novoComando = {
       data: new SlashCommandBuilder()
           .setName('nome')
           .setDescription('descrição'),
       async execute(interaction) {
           // Para usar Firebase:
           if (useFirebase()) {
               const userData = await getUserDataAsync('arquivo.json', userId);
               await setUserDataAsync('arquivo.json', userId, userData);
           } else {
               // Usar JSON local
           }
       }
   };
   module.exports = { novoComando };
   ```

### Adicionando Novos Eventos
1. Crie um arquivo em `events/`
2. Exporte seguindo o padrão:
   ```javascript
   module.exports = {
       name: 'nomeDoEvento',
       once: false, // ou true para eventos únicos
       async execute(...args) {
           // lógica do evento
       }
   };
   ```

### Modificando Configurações
- Edite `config.js` para alterar IDs, preços, chances, etc.
- Modifique `SHOP_CONFIG` para adicionar/remover itens da loja
- Ajuste `LEVEL_ROLES` para configurar cargos por nível

## 🔒 Segurança do Firebase

### Regras de Segurança Recomendadas
```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir apenas leitura/escrita do bot
    match /{document=**} {
      allow read, write: if false; // Bloquear acesso público
    }
  }
}
```

### Boas Práticas
- Mantenha as credenciais do Firebase seguras
- Use variáveis de ambiente para dados sensíveis
- Configure regras de segurança restritivas
- Faça backups regulares dos dados

## 🐛 Solução de Problemas

### Bot não inicia
- Verifique se o token está correto em `config.js`
- Certifique-se de que as dependências estão instaladas (`npm install`)
- Verifique se o Node.js está na versão 16+ (`node --version`)

### Firebase não conecta
- Verifique se o arquivo `firebase-service-account.json` existe
- Confirme se a URL do banco está correta
- Verifique as permissões da conta de serviço
- O bot funcionará com JSON local se o Firebase falhar

### Comandos não aparecem
- Descomente e configure a função `deployCommands()` em `index.js`
- Para desenvolvimento, use guild commands (mais rápido)
- Para produção, use global commands (demora até 1 hora)

### Erros de permissão
- Verifique se o bot tem as permissões necessárias no servidor
- Configure os IDs dos cargos corretamente em `config.js`

### Problemas de migração
- Faça backup dos dados antes de migrar
- Verifique se o Firebase está configurado corretamente
- Use o comando `backup` para criar cópias de segurança

## 📊 Estrutura do Firebase

### Coleções Criadas
- `economia` - Dados de moedas e estatísticas dos usuários
- `xp_data` - Dados de XP e níveis dos usuários
- `contagem_entradas` - Contador de entradas por usuário
- `shop_data` - Dados especiais da loja (preço do Moon, etc.)

### Formato dos Documentos
```javascript
// Coleção: economia
// Documento ID: userId
{
  carteira: 5000,
  ultimo_daily: "2024-01-15T10:30:00.000Z",
  carteiras_devolvidas: 10,
  ganhos_devolvendo: 2500,
  ganhos_pegando: 1000,
  perdas_policia: 500,
  carteiras_pegas: 5
}

// Coleção: xp_data
// Documento ID: userId
{
  xp: 15000,
  level: 25,
  last_message_timestamp: 1705312200
}
```

## 📄 Licença

Este projeto está sob a licença ISC. Veja o arquivo `package.json` para mais detalhes.

## 🤝 Contribuição

Sinta-se à vontade para contribuir com melhorias, correções de bugs ou novas funcionalidades!

## 📞 Suporte

Se encontrar problemas ou tiver dúvidas:
1. Verifique a seção de solução de problemas
2. Consulte os logs do console para erros específicos
3. Teste primeiro com JSON local antes de usar Firebase
4. Faça backups regulares dos seus dados


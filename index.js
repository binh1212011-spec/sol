// Sol's Stat Tracker Webhook Client
// Created by @mongoo.se
// Last edited 06/05/2025

require('dotenv').config();
const WebSocket = require('ws');
const { WebhookClient, Events, EmbedBuilder } = require('discord.js');

// lấy config từ file config.json
const { webhookURL, gatewayURL, maxReconnectInterval, overrideUsername, overrideAvatarURL, colors, emojis } = require('./config.json');

// token lấy từ .env
const token = process.env.TOKEN;

let reconnectInterval = 5_000;

const webhookClient = new WebhookClient({
    url: webhookURL
});

webhookClient.on(Events.Error, (error) => {
    console.error(`Webhook client error: ${error.message}`);
});

const connect = () => {
    const ws = new WebSocket(gatewayURL, {
        headers: { token }
    });

    ws.on('open', () => {
        console.log(`WS client connected: ${gatewayURL}`);
        reconnectInterval = 5_000;

        setTimeout(() => {
            if (ws.readyState === ws.OPEN) {
                const connectedEmbed = new EmbedBuilder()
                    .setDescription(`${emojis.success} **Sol's Stat Tracker** - Connected`)
                    .setColor(colors.success);

                webhookClient.send({ embeds: [connectedEmbed] });
            }
        }, 1_000);
    });

    ws.on('message', (rawData) => {
        try {
            rawData = JSON.parse(rawData.toString('utf8'));

            switch (rawData.action) {
                case 'enabled':
                    webhookClient.send({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(`${emojis.success} **Sol's Stat Tracker** - Enabled`)
                                .setColor(colors.success)
                        ]
                    });
                    break;

                case 'disabled':
                    webhookClient.send({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(`${emojis.error} **Sol's Stat Tracker** - Disabled`)
                                .setColor(colors.error)
                        ]
                    });
                    break;

                case 'executeWebhook':
                    rawData.data.username = overrideUsername ?? rawData.data.username;
                    rawData.data.avatarURL = overrideAvatarURL ?? rawData.data.avatarURL;
                    rawData.allowedMentions = { parse: [] };

                    webhookClient.send(rawData.data);
                    break;

                default:
                    console.error(`WS client invalid action: ${rawData.action}`);
                    break;
            }
        } catch (error) {
            console.error(`WS client message error: ${error.message}`);
        }
    });

    ws.on('close', async (code, reason) => {
        console.warn(`WS client disconnected: Code ${code}${reason ? ` - ${reason}` : ''}`);
        reason = reason.toString('utf8');

        switch (code) {
            case 1008:
                if (reason === 'Unauthorized') {
                    await webhookClient.send({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(`${emojis.error} Unauthorized`)
                                .setDescription(`The API token is invalid.`)
                                .setColor(colors.error)
                        ]
                    });
                } else if (reason === 'Duplicate connection') {
                    await webhookClient.send({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(`${emojis.error} Duplicate Connection`)
                                .setDescription(`The API token is already in-use.`)
                                .setColor(colors.error)
                        ]
                    });
                }
                break;

            case 1000:
                await webhookClient.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`${emojis.error} Deleted`)
                            .setDescription(`The API token has been deleted.`)
                            .setColor(colors.error)
                    ]
                });
                break;

            default:
                console.log(`Reconnecting WS client in ${reconnectInterval}ms...`);
                setTimeout(connect, reconnectInterval);

                await webhookClient.send({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`${emojis.none} **Sol's Stat Tracker** - Reconnecting`)
                            .setColor(colors.none)
                    ]
                });

                reconnectInterval = Math.min(maxReconnectInterval, reconnectInterval * 2);
                break;
        }
    });

    ws.on('error', async (error) => {
        console.error(`WS client error: ${error.message}`);
        ws.terminate();
    });
};

connect();

import 'dotenv/config';
import express from 'express';
import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji } from './utils.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction id, type and data
  const { id, type, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "test" command
    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              // Fetches a random emoji to send from a helper function
              content: `hello world ${getRandomEmoji()}`
            }
          ]
        },
      });
    }

    if (name === 'new-game') {
      const now = new Date();
      const defaultDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
        .replace('T', ' ');
      return res.send({
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: 'new_game_modal',
          title: 'Neues Spiel',
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.INPUT_TEXT,
                  custom_id: 'date_time',
                  style: 1,
                  label: 'Datum & Uhrzeit',
                  value: defaultDate,
                },
              ],
            },
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.STRING_SELECT,
                  custom_id: 'tier_select',
                  placeholder: 'Tier wählen',
                  options: [
                    { label: 'BT', value: 'BT' },
                    { label: 'LT', value: 'LT' },
                    { label: 'HT', value: 'HT' },
                    { label: 'ET', value: 'ET' },
                    { label: 'Alle', value: 'Alle' },
                  ],
                },
              ],
            },
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.INPUT_TEXT,
                  custom_id: 'custom_text',
                  style: 2,
                  label: 'Custom Text',
                },
              ],
            },
          ],
        },
      });
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  if (type === InteractionType.MODAL_SUBMIT) {
    const modalId = data.custom_id;
    if (modalId === 'new_game_modal') {
      const components = data.components || [];
      let dateTime = '';
      let tier = '';
      let customText = '';
      for (const row of components) {
        const input = row.components[0];
        if (input.custom_id === 'date_time') {
          dateTime = input.value;
        } else if (input.custom_id === 'tier_select') {
          tier = input.values ? input.values[0] : input.value;
        } else if (input.custom_id === 'custom_text') {
          customText = input.value;
        }
      }
      const parsed = new Date(dateTime);
      const formatted = isNaN(parsed) ? dateTime : parsed.toLocaleString('de-DE');
      const roleId = process.env.MAGIERGILDE_ROLE_ID;
      const mention = roleId ? `<@&${roleId}>` : '@magiergilde';
      const allowedMentions = roleId ? { roles: [roleId] } : undefined;
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `${tier} - ${formatted} - ${customText} - ${mention}`,
          allowed_mentions: allowedMentions,
        },
      });
    }
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});

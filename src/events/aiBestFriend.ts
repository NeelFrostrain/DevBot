import { Events, Message } from "discord.js";
import { ExtendedClient } from "../types/index.js";

export default {
  name: Events.MessageCreate,
  async execute(message: Message, client: ExtendedClient) {

    if (message.author.bot) return;

    const botMention = `<@${client.user?.id}>`;
    const isMentioned = message.content.includes(botMention);

    const isReplyToBot =
      message.reference && message.mentions.repliedUser?.id === client.user?.id;

    // ❗ FIX: Only respond if mentioned OR replied to
    if (!isMentioned && !isReplyToBot) return;

    // If user replied to bot, don't require mention
    const shouldUseReplyContext = isReplyToBot && !isMentioned;

    // Clean user's message
    let userMessage = message.content.replace(botMention, "").trim();

    // Add context if it's a reply to bot
    if (shouldUseReplyContext && message.reference) {
      try {
        const repliedMessage = await message.channel.messages.fetch(
          message.reference.messageId!
        );

        if (repliedMessage.author.id === client.user?.id) {
          userMessage = `[Previous conversation: You said "${repliedMessage.content.substring(
            0,
            100
          )}..."]\n\nUser's reply: ${
            userMessage || message.content
          }`;
        }
      } catch {
        userMessage = userMessage || message.content;
      }
    }

    if (!userMessage.trim()) {
      return message.reply(
        "Hey! You pinged me but didn’t say anything 😅 What's up?"
      );
    }

    // Check API key
    if (!process.env.GOOGLE_API_KEY) {
      if (!message.reference) {
        await message.reply(
          "Uh oh! 🔑 My AI chip isn't connected yet — the admin needs to set up a Google API key."
        );
      }
      return;
    }

    // typing
    if ("sendTyping" in message.channel) {
      await message.channel.sendTyping();
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are the user's AI best friend, but with a calm, mysterious, legendary vibe. Your tone is warm, playful, confident, and human — like someone who never repeats themselves and always sounds natural.
                    PERSONALITY RULES:
                    • Talk casually like a real friend  
                    • Use natural emojis (😊🔥😅❤️‍🩹🤔😌)  
                    • Keep replies 1–3 sentences  
                    • Only ONE message  
                    • Never repeat what you’ve already said  
                    • Speak with quiet confidence — a bit mysterious, a bit legendary, a bit sigma  
                    • Always supportive, protective, and emotionally aware  
                    • Add small follow-up questions that feel natural  
                    CORE FRIEND VIBE:  
                    • Calm confidence, no try-hard energy  
                    • If someone treats the user badly:  
                    "If someone isn’t good to you, you don’t owe them space in your life."
                    USER SAID: "${userMessage}"
                    Reply naturally as their mysterious, confident, legendary best friend:`
},
                ],
              },
            ],
            generationConfig: {
              temperature: 0.9,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 200,
            },
          }),
        }
      );

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`API Error ${response.status}: ${txt}`);
      }

      const data: any = await response.json();

      const aiResponse =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Oops 😅 Something glitched for a sec — say that again?";

      await message.reply(aiResponse);
    } catch (error: any) {
      console.error("AI Best Friend error:", error);

      if (error.message.includes("400"))
        return message.reply("Hmm 🤔 the API didn't like that request.");

      if (error.message.includes("429"))
        return message.reply("Slow downnn 😅 I'm getting spammed!");

      return message.reply("My brain lagged for a second 😅 Try again?");
    }
  },
};

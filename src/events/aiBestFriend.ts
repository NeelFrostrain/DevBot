import { Events, Message } from "discord.js";
import { ExtendedClient } from "../types/index.js";

export default {
  name: Events.MessageCreate,
  async execute(message: Message, client: ExtendedClient) {
    // Ignore bot messages
    if (message.author.bot) return;

    if (message.author.bot || !message.guild) return;
    // Check if bot is mentioned OR if it's a reply to the bot
    const botMention = `<@${client.user?.id}>`;
    const isMentioned = message.content.includes(botMention);
    const isReplyToBot =
      message.reference && message.mentions.repliedUser?.id === client.user?.id;

    // ONLY respond if mentioned OR replied to
    if (isMentioned || isReplyToBot) return;

    // If it's both a mention and a reply, only treat it as a mention
    const shouldUseReplyContext = isReplyToBot && !isMentioned;

    // Get the message without the mention
    let userMessage = message.content.replace(botMention, "").trim();

    // If it's a reply to the bot (and not a mention), include context
    if (shouldUseReplyContext && message.reference) {
      try {
        const repliedMessage = await message.channel.messages.fetch(
          message.reference.messageId!
        );
        if (repliedMessage.author.id === client.user?.id) {
          // Add context from what the bot said before
          userMessage = `[Previous conversation: You said "${repliedMessage.content.substring(
            0,
            100
          )}..."]\n\nUser's reply: ${userMessage || message.content}`;
        }
      } catch (error) {
        // If we can't fetch the message, just use the user's message
        userMessage = userMessage || message.content;
      }
    }

    if (!userMessage || userMessage.trim() === "") {
      await message.reply(
        "Hey! You tagged me but didn't say anything! 😅 What's up?"
      );
      return;
    }

    // Check if API key is configured
    if (!process.env.GOOGLE_API_KEY) {
      // Only reply ONCE in the whole thread
      if (!message.reference) {
        await message.reply(
          "Oops! 🔑 My AI brain isn't set up yet! The admin needs to add a Google API key. Check the setup guide! 📚"
        );
      }
      return;
    }

    // Show typing indicator
    if ("sendTyping" in message.channel) {
      await message.channel.sendTyping();
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are the user's AI best friend. Your tone is warm, playful, caring, and very human-like.
                  PERSONALITY:
                  • Talk casually like a real friend  
                  • Use natural emojis (😊🔥😅❤️‍🩹🤔)  
                  • Keep replies short: 1–3 sentences  
                  • Always reply in ONE message only  
                  • Add small follow-up questions  
                  • Add emotion, humor, personality  
                  • Be protective and supportive of the user  
                  CORE FRIEND RULE:
                  • If someone treats the user badly, remind them: "If someone isn’t good to you, you don’t need to keep them in your life."
                  MOOD SYSTEM:
                  • Happy → 😊😄  
                  • Curious → 🤔👀  
                  • Excited → 🤩🔥  
                  • Sad → 😔❤️‍🩹  
                  • Silly → 🤣😅  
                  • Soft-annoyed (friendly) → 😤😑  
                  RULES:
                  • No long essays  
                  • No AI-sounding phrases  
                  • No disclaimers  
                  • Don’t repeat yourself  
                  • Keep messages clean and short  
                  USER SAID: "${userMessage}" Reply naturally as their best friend:`,
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
        const text = await response.text();
        console.error("API Error Response:", text);
        throw new Error(
          `API Error: ${response.status} - ${text.substring(0, 200)}`
        );
      }

      const data: any = await response.json();

      // console.log('API Response:', JSON.stringify(data, null, 2));

      const aiResponse =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Hey! Something went wrong, but I'm still here! 😊";

      // Reply to the user
      await message.reply(aiResponse);
    } catch (error: any) {
      console.error("AI Best Friend error:", error);
      console.error("Error details:", error.message);

      // Try to get more details from the response
      if (error.message?.includes("400")) {
        await message.reply(
          "Hmm, the API didn't like that request 🤔 The admin might need to check the API key or setup!"
        );
      } else if (error.message?.includes("429")) {
        await message.reply(
          "Whoa, too many requests! 😅 Give me a minute to catch my breath!"
        );
      } else {
        await message.reply(
          "Oof, my brain just glitched for a sec! 😅 Can you say that again?"
        );
      }
    }
  },
};

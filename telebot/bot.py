import telebot
import os
from google import genai
from dotenv import load_dotenv
import functions as f


load_dotenv()
bot = telebot.TeleBot(os.environ["BOT_TOKEN"], parse_mode=None)
client = genai.Client(api_key=os.getenv("API_KEY"))
# for models in client.models.list():
#     print(models.name)


@bot.message_handler(commands=['start', 'help'])
def handle_welcome(message):
    f.send_welcome(bot, message)


@bot.message_handler(commands=['report'])
def handle_report(message):
    f.report_scam(bot, message, client)


@bot.message_handler(content_types=['text'])
def handle_message(message):
    f.send_message(bot, client, message)


@bot.message_handler(content_types=['photo', 'video', 'audio', 'file', 'document', 'sticker', 'voice'])
def handle(message):
    f.send_error_message(bot, message, message.content_type)


bot.infinity_polling()

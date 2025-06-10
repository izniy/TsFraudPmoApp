import telebot
import os
from google import genai
from dotenv import load_dotenv
import functions as f
import schedule
import time
import threading


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


@bot.message_handler(commands=['verify'])
def handle_verify(message):
    f.initiate_verify_message(bot, message, client)


@bot.message_handler(content_types=['text'])
def handle_message(message):
    f.send_message(bot, client, message)


@bot.message_handler(content_types=['photo', 'video', 'audio', 'file', 'document', 'sticker', 'voice'])
def handle(message):
    f.send_error_message(bot, message, message.content_type)


def run_scheduler():
    """Runs the scheduled tasks in a separate thread."""
    # Schedule the broadcast_popular_scams function to run every 5 minutes
    schedule.every(5).minutes.do(f.broadcast_popular_scams, bot=bot)
    # schedule.every(20).seconds.do(f.broadcast_popular_scams, bot=bot) # For testing

    print("[Scheduler] Starting scheduler...")
    while True:
        schedule.run_pending()
        time.sleep(1)


if __name__ == '__main__':
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()

    bot.infinity_polling()

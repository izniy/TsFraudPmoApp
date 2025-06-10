from google import genai
from google.genai import types
from dotenv import load_dotenv
from datetime import datetime, timezone
import telebot
import os
import requests
import io
import mimetypes
import uuid
import json
from supabase import create_client, Client as SupabaseClient

load_dotenv()
user_reports = {}
# banned_words = ["model", "models", "gemma", "gemini", "google", "gpt", "openai", "chatgpt", "llama", "meta", "mistral",
#                 "anthropic", "claude", "gex", "mistral", "prompt", "gernig", "llm"]
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
db_enabled = os.getenv("DB_ENABLED", "False").lower() == "true"
client = genai.Client(api_key=os.getenv("API_KEY"))
supabase: SupabaseClient | None = None

if db_enabled:
    if supabase_url and supabase_key:
        try:
            supabase = create_client(supabase_url, supabase_key)
            print("Supabase client initialized successfully")
        except Exception as e:
            print(f"Supabase client initialization failed: {e}")
            db_enabled = False
    else:
        print("Supabase URL or Key not found in environment variables.")
        db_enabled = False
else:
    print("Database functionality is disabled")


def send_welcome(bot, message):
    markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    start_button = telebot.types.KeyboardButton('/start')
    report_button = telebot.types.KeyboardButton('/report')
    markup.add(start_button, report_button)

    bot.reply_to(message, "Hi, I'm TsFraudPmo, your go-to bot for scam reporting and fraud awareness!"
                          "I can help you understand scams, avoid them, and report any suspicious activity.\n\n"
                          "If you'd like to report a scam, simply press the button or type /report!\n\n"
                          "Else, you can ask me anything or just chat with me!",
                 reply_markup=markup)


def send_message(bot, client, message):
    if message.chat.type in ['group', 'supergroup'] or message.text.lower().startswith('confirm'):
        bot_info = bot.get_me()
        bot_username = bot_info.username

        if f"@{bot_username}" in message.text:
            clean_text = message.text.replace(f"@{bot_username}", "").strip()
            process_message(bot, client, message, clean_text)
    else:
        # Respond to messages in a DM
        process_message(bot, client, message, message.text)


def process_message(bot, client, message, text):
    # if any(word in text.lower() for word in banned_words) or len(text) < 2:
    #     bot.send_message(message.chat.id, "Sorry, I can't respond to that content. ")
    #     return

    prompt = (
            "You are TsFraudPmo, a bot made by TeamAurora (Ryan, Nicolas, Yin Zi). "
            "You have already introduced yourself to the user. Only reintroduce yourself if the user asks. "
            "You raise awareness about scams, and help people avoid and report scams. "
            "You also regularly broadcast information about scams to users. "
            "Your task is to provide a reply (in under 5 sentences) addressing the user's following message: "
            + text
    )
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite", contents=prompt,
        )
        bot.send_message(message.chat.id, response.text)
    except Exception as e:
        bot.send_message(message.chat.id, "Oops, something went wrong! Please try again, or wait a while.")


def send_error_message(bot, message, content_type):
    if message.chat.type not in ['group', 'supergroup']:
        match content_type:
            case 'video':
                bot.send_message(
                    message.chat.id,
                    "That's a nice video! But sadly I can't interpret that. Please use text instead!"
                )
            case 'photo':
                bot.send_message(
                    message.chat.id,
                    "That's a nice photo! But sadly I can't interpret that. Please use text instead!"
                )
            case _:
                bot.send_message(
                    message.chat.id,
                    "Sorry, I'm not sure how to respond. Please use text instead!"
                )



def report_scam(bot, message, gemini_client):
    user_id = message.from_user.id
    user_reports[user_id] = { "description" : "", "evidence" : [] }

    bot.send_message(message.chat.id, "Please provide a brief description of the scam. "
                                      "Include relevant information such as:\n\n"
                                      "- Where you encountered it\n"
                                      "- The message or content of the scam\n"
                                      "- Suspicious links or contacts")

    bot.register_next_step_handler(message, get_description, bot, gemini_client)


def get_description(message, bot, gemini_client):
    if message.text.startswith('/'):
        bot.send_message(message.chat.id, "Please provide a description of the scam without a / at the start.")
        bot.register_next_step_handler(message, get_description, bot, gemini_client)
        return

    user_id = message.from_user.id
    user_reports[user_id]["description"] = message.text

    show_evidence_options(bot, message, gemini_client)


def show_evidence_options(bot, message, gemini_client):
    markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    yes_btn = telebot.types.KeyboardButton("Yes (Submit evidence)")
    no_btn = telebot.types.KeyboardButton("No (Submit report)")
    edit_btn = telebot.types.KeyboardButton("Edit description")
    view_btn = telebot.types.KeyboardButton("View report")
    markup.add(yes_btn, no_btn, edit_btn, view_btn)

    bot.send_message(message.chat.id, "Do you have any evidence to share? (Yes/No)", reply_markup=markup)
    bot.register_next_step_handler(message, request_evidence, bot, gemini_client)


def request_evidence(message, bot, gemini_client):
    text = message.text.lower()
    if text.startswith("yes"):
        bot.send_message(message.chat.id, "Please provide the evidence:")
        bot.register_next_step_handler(message, collect_evidence, bot, gemini_client)
    elif text == "edit description":
        bot.send_message(message.chat.id, "Please provide the new description:")
        bot.register_next_step_handler(message, edit_description, bot, gemini_client)
    elif text == "view report":
        show_report_preview(bot, message, gemini_client)
    else:
        show_report_preview(bot, message, gemini_client, confirm=True)


def show_report_preview(bot, message, gemini_client, confirm=False):
    user_id = message.from_user.id
    report = user_reports.get(user_id, {})
    desc = report.get("description", "(none)")
    evidence = report.get("evidence", [])
    
    evidence_items = []
    photo_evidence_file_ids = []
    
    for e in evidence:
        if e.startswith("[PHOTO]"):
            file_id = e.replace("[PHOTO] ", "")
            evidence_items.append(f"- Photo evidence #{len(photo_evidence_file_ids) + 1}")
            photo_evidence_file_ids.append(file_id)
        else:
            evidence_items.append(f"- {e}")
    
    evidence_str = "\n".join(evidence_items) if evidence_items else "(none)"
    preview = f"Here is your report so far:\n\nDescription:\n{desc}\n\nEvidence:\n{evidence_str}"
    
    bot.send_message(message.chat.id, preview)
    
    if photo_evidence_file_ids:
        media = []
        for i, file_id in enumerate(photo_evidence_file_ids[:5]):   # Limit preview to 5 images
            media.append(telebot.types.InputMediaPhoto(file_id, caption=f"Photo evidence #{i+1}" if i == 0 else None))
        try:
            if len(media) > 0:
                bot.send_media_group(message.chat.id, media)
        except Exception as ex:
            print(f"Error sending media group: {ex}")

    if confirm:
        markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
        confirm_btn = telebot.types.KeyboardButton("Confirm submission")
        edit_btn = telebot.types.KeyboardButton("Edit description")
        add_evidence_btn = telebot.types.KeyboardButton("Add more evidence")
        markup.add(confirm_btn, edit_btn, add_evidence_btn)
        bot.send_message(message.chat.id, "If everything looks good, press 'Confirm submission' to proceed.", reply_markup=markup)
        bot.register_next_step_handler(message, confirm_submission, bot, gemini_client)
    else:
        markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
        back_btn = telebot.types.KeyboardButton("Back")
        markup.add(back_btn)
        bot.send_message(message.chat.id, "Press 'Back' to return to options", reply_markup=markup)
        bot.register_next_step_handler(message, back_to_evidence_options, bot, gemini_client)


def back_to_evidence_options(message, bot, gemini_client):
    show_evidence_options(bot, message, gemini_client)


def confirm_submission(message, bot, gemini_client):
    text_lower = message.text.lower()
    if text_lower == "confirm submission" or text_lower == "confirm":
        process_full_report(bot, message, gemini_client)
        return
    elif text_lower == "edit description" or text_lower == "edit":
        bot.send_message(message.chat.id, "Please provide the new description:")
        bot.register_next_step_handler(message, edit_description, bot, gemini_client)
        return
    elif text_lower == "add more evidence" or text_lower == "add":
        bot.send_message(message.chat.id, "Please provide the evidence:")
        bot.register_next_step_handler(message, collect_evidence, bot, gemini_client)
        return
    else:
        show_report_preview(bot, message, gemini_client, confirm=True)
        return


def edit_description(message, bot, gemini_client):
    if message.text.startswith('/'):
        bot.send_message(message.chat.id, "Please provide a description without a / at the start.")
        bot.register_next_step_handler(message, edit_description, bot, gemini_client)
        return

    user_id = message.from_user.id
    user_reports[user_id]["description"] = message.text
    bot.send_message(message.chat.id, "Description updated successfully!")
    show_evidence_options(bot, message, gemini_client)


def collect_evidence(message, bot, gemini_client):
    if message.content_type == 'photo':
        handle_photo_evidence(bot, message, gemini_client)
        return

    if message.text.startswith('/'):
        bot.send_message(message.chat.id, "Please provide evidence without a / at the start.")
        bot.register_next_step_handler(message, collect_evidence, bot, gemini_client)
        return

    user_id = message.from_user.id
    user_reports[user_id]["evidence"].append(message.text + "\n")

    markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    yes_btn = telebot.types.KeyboardButton("Yes (Submit evidence)")
    no_btn = telebot.types.KeyboardButton("No (Submit report)")
    edit_btn = telebot.types.KeyboardButton("Edit description")
    view_btn = telebot.types.KeyboardButton("View report")
    markup.add(yes_btn, no_btn, edit_btn, view_btn)

    bot.send_message(message.chat.id, "Do you have any more evidence to share? (Yes/No)", reply_markup=markup)
    bot.register_next_step_handler(message, request_evidence, bot, gemini_client)


def handle_photo_evidence(bot, message, gemini_client):
    user_id = message.from_user.id
    if user_id not in user_reports:
        user_reports[user_id] = {"description": "", "evidence": []}

    photo = message.photo[-1]
    file_id = photo.file_id
    user_reports[user_id]["evidence"].append(f"[PHOTO] {file_id}")

    markup = telebot.types.ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    yes_btn = telebot.types.KeyboardButton("Yes (Submit evidence)")
    no_btn = telebot.types.KeyboardButton("No (Submit report)")
    edit_btn = telebot.types.KeyboardButton("Edit description")
    view_btn = telebot.types.KeyboardButton("View report")
    markup.add(yes_btn, no_btn, edit_btn, view_btn)

    bot.send_message(message.chat.id, "Photo evidence added. Do you have any more evidence to share?", reply_markup=markup)
    bot.register_next_step_handler(message, request_evidence, bot, gemini_client) 


def generate_embedding_py(text: str, client):
    try:
        result = client.models.embed_content(
            model="gemini-embedding-exp-03-07",
            contents=text,
            config=types.EmbedContentConfig(task_type="CLUSTERING")
        )
        embeddings = result.embeddings[0].values
        return embeddings
    except Exception as e:
        print(f"Error generating embeddings: {e}")
    return []
        

def verify_report_py(description: str, gemini_client):
    """
    Verifies if the scam description appears legitimate using Gemini.
    Returns True if likely legitimate, False otherwise or if an error occurs.
    """
    prompt = (
        f"Verify whether this scam is a legitimate incident through identifiying common scam red flags such as phishing links or other signs. "
        f"Return a single boolean (true or false) response.\\n"
        f"Incident description:\\n{description}"
    )
    print(f"{description}")
    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt,
        )
        
        text = response.text.strip().lower()
        print(f"[verify_report_py] Verification raw response: {text}")

        if text == 'true':
            return True
        if text == 'false':
            return False
        
        # Fallback for responses that might include the boolean within other text
        if 'true' in text:
            return True
        if 'false' in text:
            return False

        print(f"[verify_report_py] Unable to parse verification response: '{text}'. Assuming non-verified.")
        return False # Default to False if parsing fails
    except Exception as e:
        print(f"Error during report verification with Gemini: {e}")
        return False # Default to False on error


def process_full_report(bot, message, gemini_client):
    user_id = message.from_user.id
    if user_id not in user_reports:
        bot.send_message(message.chat.id, "No report data found to submit. Please start a new report with /report.")
        send_welcome(bot, message)
        return

    report_data = user_reports[user_id]
    description = report_data.get("description", "")
    evidence_list = report_data.get("evidence", [])

    if not description:
        bot.send_message(message.chat.id, "Report description is missing. Please edit your report before submitting.")
        show_report_preview(bot, message, gemini_client, confirm=True)
        return

    is_verified = verify_report_py(description, gemini_client)

    if not is_verified:
        bot.send_message(message.chat.id, "Your report could not be verified as a legitimate scam or appears to be a false report. Submission has been cancelled.")
        if user_id in user_reports:
            del user_reports[user_id]
        send_welcome(bot, message)
        return
    
    bot.send_message(message.chat.id, "Report verified. Now processing your report...")

    image_public_url = None
    text_evidence_items = []
    processed_photo_evidence = False

    for evidence_item in evidence_list:
        if evidence_item.startswith("[PHOTO]") and not processed_photo_evidence:
            file_id = evidence_item.replace("[PHOTO] ", "")
            if db_enabled and supabase:
                try:
                    bot.send_message(message.chat.id, "Uploading photo evidence...")
                    uploaded_file_name = upload_image_to_supabase_py(bot, file_id, supabase)
                    if uploaded_file_name:
                        image_public_url = supabase.storage.from_('images').get_public_url(uploaded_file_name)
                        bot.send_message(message.chat.id, "Photo evidence uploaded successfully.")
                        text_evidence_items.append(f"[Photo evidence link: {image_public_url}]")
                        processed_photo_evidence = True
                    else:
                        text_evidence_items.append("[Photo evidence provided but upload failed.]")
                except Exception as e:
                    print(f"Error uploading image during full report processing: {e}")
                    bot.send_message(message.chat.id, f"Could not upload photo evidence: {str(e)[:100]}. Proceeding without it.")
                    text_evidence_items.append(f"[Photo evidence upload error: {str(e)[:100]}]")
            else:
                text_evidence_items.append("[Photo evidence provided but storage is disabled.]")
        elif evidence_item.startswith("[PHOTO]") and processed_photo_evidence:
            text_evidence_items.append("[Additional photo evidence noted, but only one primary image is stored per report.]")
        else:
            text_evidence_items.append(evidence_item)
    
    # Defaults, might be overwritten by Gemini or existing report data
    report_title = description[:75] + "..." if len(description) > 75 else description 
    report_summary = description
    report_type = "General Scam"
    report_uuid = str(uuid.uuid4())
    current_timestamp_dt = datetime.now(timezone.utc)
    current_timestamp_for_db = int(current_timestamp_dt.timestamp() * 1000)
    final_embeddings = []


    if not db_enabled or not supabase:
        bot.send_message(message.chat.id, 
                         "Report processing complete (database is disabled).\n"
                         f"Thank you for your submission!\n\n"
                         f"ID: {report_uuid} (not saved)\nTitle: {report_title}\nSummary: {report_summary}\n"
                         f"Image: {'Yes' if image_public_url else 'No'}\nType: {report_type}")
        if user_id in user_reports:
            del user_reports[user_id]
        send_welcome(bot, message)
        return

    final_embeddings = generate_embedding_py(description, client)
    if not final_embeddings:
        bot.send_message(message.chat.id, "Could not generate a signature for the report. Proceeding without similarity check.")

    
    similar_report_found = False
    if final_embeddings:
        try:
            match_params = {
                'query_embedding': final_embeddings,
                'match_threshold': 0.8,
                'match_count': 1 
            }
            similar_reports_response = supabase.rpc('match_scam', match_params).execute()

            if hasattr(similar_reports_response, 'data') and similar_reports_response.data:
                # Successful response with data
                existing_report = similar_reports_response.data[0]
                existing_id = existing_report.get('id')
                bot.send_message(message.chat.id, f"Similar report found (ID: {existing_id[:8]}...). Merging information.")
                
                current_count = supabase.table('scamreports').select('*').eq('id', existing_id).single().execute().data.get('count', 1)
                print(f"Current count for existing report: {current_count}")
                current_title = existing_report.get('title', '')
                current_summary = existing_report.get('summary', '')
                existing_type = existing_report.get('type', 'General Scam')

                combined_description = f"Existing Summary:\n{current_summary}\n\n---\n\nNew Incident Description:\n{description}"
                
                merged_report_title = current_title
                merged_report_summary = combined_description
                merged_report_type = existing_type
                existing_embeddings = existing_report.get('embeddings', [])
                if existing_embeddings and final_embeddings:
                    merged_report_embeddings = [
                        (existing_embeddings[i] + final_embeddings[i]) / 2
                        for i in range(min(len(existing_embeddings), len(final_embeddings)))
                    ]
                else:
                    merged_report_embeddings = existing_embeddings or final_embeddings or []

                try:
                    combined_prompt = (
                        f"Summarise the combined scam information into a short title, scam type, and content (description of the scam, and how to avoid falling for such scams).\\n"
                        f"DO NOT include Markdown formatted content in the response. Respond ONLY with a single, valid JSON object.\\n"
                        f"The JSON object must have three keys: 'title' (string), 'type' (string), and 'content' (string).\\n"
                        f"Split the content into two segments accordingly (description and how to avoid) and separate them by two JSON escape sequences."
                        f""
                        f"Combined Information:\\n{combined_description}"
                    )
                    gemini_response = gemini_client.models.generate_content(
                        model="gemini-2.0-flash", 
                        contents=combined_prompt,
                    )

                    cleaned_text = gemini_response.text.strip()
                    if cleaned_text.startswith("```json"):
                        cleaned_text = cleaned_text[7:-3] if cleaned_text.endswith("```") else cleaned_text[7:]
                    elif cleaned_text.startswith("```"):
                        cleaned_text = cleaned_text[3:-3] if cleaned_text.endswith("```") else cleaned_text[3:]

                    combined_gemini_output = json.loads(cleaned_text)
                    
                    merged_report_title = combined_gemini_output.get("title", merged_report_title)
                    merged_report_summary = combined_gemini_output.get("content", current_summary) 
                    merged_report_type = combined_gemini_output.get("type", existing_type) 

                except json.JSONDecodeError as e_json_re:
                    bot.send_message(message.chat.id, "Could not parse AI re-summary for merging. Using existing/combined data for title, summary, type.")
                except Exception as e_gemini_re:
                    print(f"Error re-summarizing with Gemini: {e_gemini_re}")
                    bot.send_message(message.chat.id, "Could not re-summarize with AI for merging. Using existing/combined data for title, summary, type.")

                update_payload = {
                    "count": current_count + 1,
                    "title": merged_report_title,
                    "summary": merged_report_summary,
                    "type": merged_report_type,
                    "timestamp": current_timestamp_for_db,
                    "embeddings": merged_report_embeddings
                }                
                print(f"Count after merging: {update_payload['count']}")
                if image_public_url:
                    update_payload["image"] = image_public_url

                update_op = supabase.table('scamreports').update(update_payload).eq('id', existing_id).execute()
                update_error_occurred = False
                error_detail = "Unknown error during update."

                # Check for errors in the response
                if hasattr(update_op, 'data') and update_op.data is None:
                    update_error_occurred = True
                    error_detail = "Update operation returned null data"
                elif not hasattr(update_op, 'data'):
                    update_error_occurred = True
                    error_detail = "Update operation did not return expected data structure."
                
                if not update_error_occurred: # Assuming success if no error attribute or if data indicates success
                    bot.send_message(message.chat.id, "Report successfully merged and updated in the database.")
                    similar_report_found = True
                else: 
                    error_msg = "Failed to update existing report."
                    error_msg += f" Details: {error_detail}"
                    print(f"Supabase update error (merging): {error_detail}. Response: {update_op}")
                    bot.send_message(message.chat.id, error_msg + " The system will attempt to save this as a new report.")
            else:
                # Successful response, but no data (e.g., RPC returned empty list)
                bot.send_message(message.chat.id, "No similar reports found. This will be saved as a new entry.")

    
        except Exception as e_rpc: # Catch other exceptions during RPC call or initial response handling
            print(f"Error calling Supabase RPC 'match_scam' or processing its response: {e_rpc}")
            bot.send_message(message.chat.id, "Could not check for similar reports due to an unexpected error. Will proceed to save as a new report.")

    # Logic for new report or if merging failed and we fallback to new
    if not similar_report_found:
        try:
            gemini_request_contents = []
            main_prompt_text = (
                f"Summarise the scam into a short title, scam type, and content (description of the scam, and how to avoid falling for such scams).\\n"
                f"DO NOT include Markdown formatted content in the response. Respond ONLY with a single, valid JSON object.\\n"
                f"The JSON object must have three keys: 'title' (string), 'type' (string), and 'content' (string).\\n"
                f"The 'content' field should be a single string. If you need to represent separate paragraphs or line breaks within the 'content' string, use \\n for newlines. "
                f"Incident description:\\n{description}"
            )
            gemini_request_contents.append(main_prompt_text)

            if image_public_url:
                try:
                    print(f"Fetching image from {image_public_url} for Gemini prompt...")
                    image_response = requests.get(image_public_url, timeout=15)
                    image_response.raise_for_status()
                    image_bytes = image_response.content
                    content_type_header = image_response.headers.get('Content-Type')
                    guessed_mime_type = mimetypes.guess_type(image_public_url)[0]
                    final_mime_type = content_type_header or guessed_mime_type
                    if not final_mime_type:
                        if image_bytes.startswith(b'\xff\xd8\xff'): final_mime_type = 'image/jpeg'
                        elif image_bytes.startswith(b'\x89PNG\r\n\x1a\n'): final_mime_type = 'image/png'
                        else: final_mime_type = 'application/octet-stream'
                    if final_mime_type.startswith("image/"):
                        image_part = {"mime_type": final_mime_type, "data": image_bytes}
                        gemini_request_contents.append(image_part)
                    else: print(f"Skipping image for Gemini: mime_type '{final_mime_type}' not image for {image_public_url}")
                except Exception as e_img_fetch: 
                    print(f"Error fetching/processing image for new report Gemini: {e_img_fetch}")

            response = gemini_client.models.generate_content(
            model="gemini-2.0-flash", contents=gemini_request_contents,
            )   

            cleaned_response_text = response.text.strip()
            if cleaned_response_text.startswith("```json"):
                cleaned_response_text = cleaned_response_text[7:-3] if cleaned_response_text.endswith("```") else cleaned_response_text[7:]
            elif cleaned_response_text.startswith("```"):
                 cleaned_response_text = cleaned_response_text[3:-3] if cleaned_response_text.endswith("```") else cleaned_response_text[3:]
            
            gemini_output = json.loads(cleaned_response_text)
            report_title = gemini_output.get("title", report_title)
            report_type = gemini_output.get("type", report_type)
            report_summary = gemini_output.get("content", report_summary)

        except json.JSONDecodeError as e_json:
            bot.send_message(message.chat.id, "Could not parse AI summary for new report. Using defaults.")
        except Exception as e_gemini:
            print(f"Error generating summary with Gemini for new report: {e_gemini}")
            bot.send_message(message.chat.id, "Could not generate AI summary for new report. Using defaults.")

        # Database insertion for new report
        db_payload = {
            "id": report_uuid, # Fresh UUID
            "timestamp": current_timestamp_for_db,
            "title": report_title,
            "summary": report_summary,
            "image": image_public_url,
            "count": 1,
            "type": report_type,
            "embeddings": final_embeddings if final_embeddings else None # Store embeddings
        }
        
        insert_op = supabase.table('scamreports').insert(db_payload).execute()

        if hasattr(insert_op, 'data') and insert_op.data:
            bot.send_message(message.chat.id, "New report submitted successfully to the database!")
        else:
            error_msg = "Failed to save new report."
            print(f"Supabase insert error for new report: {getattr(insert_op, 'error', 'Unknown error')}")
            bot.send_message(message.chat.id, error_msg + " Please try again later.")

    # Common cleanup and final message
    if user_id in user_reports:
        del user_reports[user_id]
    send_welcome(bot, message)


def upload_image_to_supabase_py(bot: telebot.TeleBot, file_id: str, supabase_client):
    try:
        file_info = bot.get_file(file_id)
        if file_info.file_path is None:
            raise ValueError("File path is None")
            
        downloaded_file_bytes = bot.download_file(file_info.file_path)

        file_ext = os.path.splitext(file_info.file_path)[1].lower() if file_info.file_path else ".jpg"
        if not file_ext:
            file_ext = ".jpg"
        
        content_type = mimetypes.guess_type(f"file{file_ext}")[0] or 'application/octet-stream'
        
        file_name = f"{uuid.uuid4()}{file_ext}"

        upload_response = supabase_client.storage.from_('images').upload(
            path=file_name,
            file=io.BytesIO(downloaded_file_bytes),
            file_options={"content-type": content_type, "upsert": "true"}
        )
        if upload_response.status_code != 200:
            error_message = f"Failed to upload image to Supabase. Status: {upload_response.status_code}"
            try:
                error_details = json.loads(upload_response.content.decode())
                error_message += f" Details: {error_details.get('message', 'Unknown error')}"
                raise Exception(error_message)
            except json.JSONDecodeError:
                raise Exception(error_message)
                
        return file_name
    except Exception as e:
        print(f"Error uploading image to Supabase: {e}")
        return None

# Initialize Supabase client if not already done globally and db_enabled
if db_enabled and supabase_url and supabase_key and not supabase:
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("[Supabase Client] Initialized in functions.py")
    except Exception as e:
        print(f"[Supabase Client] Error initializing in functions.py: {e}")
        supabase = None # Ensure supabase is None if initialization fails
elif not supabase and db_enabled:
    print("[Supabase Client] supabase_url or supabase_key might be missing. Supabase client not initialized.")


def broadcast_popular_scams(bot: telebot.TeleBot):
    """
    Fetches scam reports with a count of at least 3 that haven't been broadcasted,
    sends them to the designated Telegram channel, and marks them as broadcasted.
    """
    if not db_enabled or not supabase:
        print("[broadcast_popular_scams] Database is not enabled or Supabase client not initialized.")
        return

    channel_id_str = os.getenv("TELEGRAM_CHANNEL_ID")
    if not channel_id_str:
        print("[broadcast_popular_scams] TELEGRAM_CHANNEL_ID not set in .env file.")
        return
    
    try:
        channel_id = int(channel_id_str)
    except ValueError:
        print(f"[broadcast_popular_scams] Invalid TELEGRAM_CHANNEL_ID: {channel_id_str}. Must be an integer.")
        return

    min_count = 3
    print(f"[broadcast_popular_scams] Checking for reports with count >= {min_count} and was_broadcasted = FALSE")

    try:
        # Fetch reports
        response = (supabase.table('scamreports')
            .select('id, title, summary, image, count, type')
            .gte('count', min_count)
            .eq('was_broadcasted', False)
            .execute())

        # supabase-py v2+ returns APIResponse; errors typically raise exceptions or are in response.error if PostgrestError
        # For simplicity, we'll check if response.data exists. If an error occurred, response.data might be None or an exception raised.
        
        if response.data:
            reports_to_broadcast = response.data
            print(f"[broadcast_popular_scams] Found {len(reports_to_broadcast)} reports to broadcast.")

            for report in reports_to_broadcast:
                report_id = report.get('id')
                title = report.get('title', 'N/A')
                summary = report.get('summary', 'N/A')
                image_filename = report.get('image') # This is the filename in Supabase storage
                scam_type = report.get('type', 'Unknown')
                current_report_count = report.get('count', 0)
                summary = summary.replace("\\ \\ ", '\n')

                message_text = (
                    f"📢 *Scam Alert!* 📢\n\n"
                    f"*Title:* {title}\n"
                    f"*Type:* {scam_type}\n"
                    f"*Reported Instances:* {current_report_count}\n\n"
                    f"*Details & How to Avoid:*\n{summary}\n\n"
                    f"#TsFraudPmo #ScamAlert #{scam_type.replace(' ', '').replace('-', '')}"
                )
                
                try:
                    photo_sent = False
                    if image_filename:
                        image_public_url = image_filename

                        print(image_public_url)
                        
                        if image_public_url:
                            print(f"[broadcast_popular_scams] Sending photo broadcast for report ID {report_id} with image URL: {image_public_url}")
                            bot.send_photo(channel_id, photo=image_public_url, caption=message_text, parse_mode="Markdown")
                            photo_sent = True
                        else:
                            print(f"[broadcast_popular_scams] Could not get public URL for image {image_filename}. Sending text only for report ID {report_id}.")
                    
                    if not photo_sent: # If no image or image URL failed
                        print(f"[broadcast_popular_scams] Sending text-only broadcast for report ID {report_id}")
                        bot.send_message(channel_id, message_text, parse_mode="Markdown")
                    
                    # Mark as broadcasted
                    update_response = (supabase.table('scamreports')
                        .update({'was_broadcasted': True})
                        .eq('id', report_id)
                        .execute())
                        
                    # Check if update was successful (supabase-py v2, data is usually a list of updated records)
                    if not update_response.data: # Or if an error attribute exists and is set, depending on exact error
                         print(f"[broadcast_popular_scams] Failed to mark report {report_id} as broadcasted. Response: {update_response}")
                    else:
                        print(f"[broadcast_popular_scams] Successfully marked report {report_id} as broadcasted.")

                except Exception as e_broadcast:
                    print(f"[broadcast_popular_scams] Error sending message for report {report_id} to channel {channel_id}: {e_broadcast}")
        elif response.data is None and hasattr(response, 'error') and response.error: # Check for explicit error if data is None
             print(f"[broadcast_popular_scams] Error fetching reports: {response.error}")
        else: # No data and no explicit error object, or data is empty list
            print("[broadcast_popular_scams] No new high-count reports to broadcast or error fetching.")

    except Exception as e:
        print(f"[broadcast_popular_scams] An unexpected error occurred: {e}")
        import traceback
        traceback.print_exc()

#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Stop hook: speaks Claude's last response via Sarvam TTS, afplay on macOS.
Falls back to macOS `say` if Sarvam is unreachable or misconfigured.
Reads hook JSON from stdin (last_assistant_message, transcript_path, etc).
"""
import sys, os, json, re, base64, subprocess, tempfile, urllib.request, urllib.error

SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY", "")
SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"
SARVAM_TRANSLATE_URL = "https://api.sarvam.ai/translate"
TARGET_LANGUAGE = os.environ.get("SARVAM_TTS_LANG", "ta-IN")
SPEAKER = os.environ.get("SARVAM_TTS_SPEAKER", "vijay")
MAX_CHARS = 480


def read_last_message():
    payload = json.load(sys.stdin)
    text = payload.get("last_assistant_message", "") or ""
    return text


def clean_for_speech(text):
    # drop fenced code blocks
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    # drop inline code
    text = re.sub(r"`[^`]*`", "", text)
    # drop markdown links, keep link text
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    # drop markdown emphasis/headers
    text = re.sub(r"[#*_>-]{1,}", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:MAX_CHARS]


def translate_to_tamil(text):
    body = json.dumps({
        "input": text,
        "source_language_code": "en-IN",
        "target_language_code": TARGET_LANGUAGE,
        "model": "mayura:v1",
        "mode": "formal",
    }).encode()
    req = urllib.request.Request(
        SARVAM_TRANSLATE_URL,
        data=body,
        headers={
            "api-subscription-key": SARVAM_API_KEY,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.load(resp)
    return data["translated_text"]


def speak_with_sarvam(text):
    if not SARVAM_API_KEY:
        raise RuntimeError("no SARVAM_API_KEY set")
    tamil_text = translate_to_tamil(text) if TARGET_LANGUAGE == "ta-IN" else text
    tamil_text = tamil_text[:MAX_CHARS]
    body = json.dumps({
        "text": tamil_text,
        "target_language_code": TARGET_LANGUAGE,
        "speaker": SPEAKER,
        "output_audio_codec": "wav",
    }).encode()
    req = urllib.request.Request(
        SARVAM_TTS_URL,
        data=body,
        headers={
            "api-subscription-key": SARVAM_API_KEY,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.load(resp)
    audio_b64 = data["audios"][0]
    audio_bytes = base64.b64decode(audio_b64)
    fd, path = tempfile.mkstemp(prefix="sarvam_tts_", suffix=".wav", dir="/tmp")
    with os.fdopen(fd, "wb") as f:
        f.write(audio_bytes)
    subprocess.Popen(["afplay", path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def speak_with_say(text):
    subprocess.Popen(["say", text], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    text = clean_for_speech(read_last_message())
    if not text:
        return
    try:
        speak_with_sarvam(text)
    except Exception as e:
        print(f"[speak_response] Sarvam TTS failed ({e}), falling back to `say`", file=sys.stderr)
        speak_with_say(text)


if __name__ == "__main__":
    main()

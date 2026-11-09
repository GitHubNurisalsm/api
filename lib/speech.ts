"use client"

let cachedVoices: SpeechSynthesisVoice[] = []

function loadVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return []
  if (!cachedVoices.length) cachedVoices = window.speechSynthesis.getVoices()
  return cachedVoices
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices()
  }
}

export function speak(text: string, lang = "ru-RU") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return
  if (!text.trim()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  const voices = loadVoices()
  const exact = voices.find((voice) => voice.lang.toLowerCase() === lang.toLowerCase())
  const loose = voices.find((voice) => voice.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()))
  if (exact ?? loose) utterance.voice = (exact ?? loose) as SpeechSynthesisVoice
  utterance.rate = 0.95
  synth.speak(utterance)
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return
  window.speechSynthesis.cancel()
}

export const LANGUAGES: { code: string; label: string }[] = [
  { code: "ru-RU", label: "Русский" },
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "de-DE", label: "Deutsch" },
  { code: "fr-FR", label: "Français" },
  { code: "es-ES", label: "Español" },
  { code: "it-IT", label: "Italiano" },
  { code: "pt-BR", label: "Português" },
  { code: "tr-TR", label: "Türkçe" },
  { code: "kk-KZ", label: "Қазақша" },
  { code: "uz-UZ", label: "Oʻzbekcha" },
  { code: "zh-CN", label: "中文" },
  { code: "ja-JP", label: "日本語" },
  { code: "ko-KR", label: "한국어" },
  { code: "ar-SA", label: "العربية" },
]

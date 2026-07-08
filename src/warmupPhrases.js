// src/warmupPhrases.js — static warm-up phrase sets, one per scenario.
// The 12 scenarios are fixed, so their key phrases are too. Shipping them in
// the repo makes the warm-up load instantly and cuts one LLM call per visit.
// goToWarmup() falls back to the /api/chat "warmup" generator ONLY for a
// scenario id that has no entry here (i.e. a future scenario added without
// phrases) — the loading/error states in the warm-up screen cover that path.
//
// Each set: 6 level-appropriate {spanish, english} pairs a learner actually
// needs for that conversation. Plain text only — these are read aloud by TTS.

export const WARMUP_PHRASES = {
  cafe: [
    { spanish: "Un café con leche, por favor", english: "A coffee with milk, please" },
    { spanish: "¿Qué me recomienda?", english: "What do you recommend?" },
    { spanish: "Para tomar aquí", english: "To have here" },
    { spanish: "Para llevar", english: "To take away" },
    { spanish: "¿Cuánto es?", english: "How much is it?" },
    { spanish: "La cuenta, por favor", english: "The bill, please" },
  ],
  groceries: [
    { spanish: "¿Cuánto cuesta?", english: "How much does it cost?" },
    { spanish: "Medio kilo de tomates", english: "Half a kilo of tomatoes" },
    { spanish: "¿Tiene pan fresco?", english: "Do you have fresh bread?" },
    { spanish: "¿Dónde está la leche?", english: "Where is the milk?" },
    { spanish: "Una bolsa, por favor", english: "A bag, please" },
    { spanish: "Nada más, gracias", english: "Nothing else, thanks" },
  ],
  introductions: [
    { spanish: "Me llamo…", english: "My name is…" },
    { spanish: "Mucho gusto", english: "Nice to meet you" },
    { spanish: "¿De dónde eres?", english: "Where are you from?" },
    { spanish: "Soy de…", english: "I'm from…" },
    { spanish: "¿A qué te dedicas?", english: "What do you do for a living?" },
    { spanish: "¿Cuánto tiempo llevas aquí?", english: "How long have you been here?" },
  ],
  directions: [
    { spanish: "Perdone, ¿dónde está…?", english: "Excuse me, where is…?" },
    { spanish: "¿Está lejos de aquí?", english: "Is it far from here?" },
    { spanish: "Todo recto", english: "Straight ahead" },
    { spanish: "A la derecha", english: "To the right" },
    { spanish: "A la izquierda", english: "To the left" },
    { spanish: "¿Me lo puede repetir?", english: "Could you repeat that for me?" },
  ],
  friend: [
    { spanish: "¡Cuánto tiempo!", english: "It's been ages!" },
    { spanish: "¿Qué tal la semana?", english: "How was your week?" },
    { spanish: "¿Qué has hecho últimamente?", english: "What have you been up to lately?" },
    { spanish: "¡No me digas!", english: "No way! / You don't say!" },
    { spanish: "Me alegro por ti", english: "I'm happy for you" },
    { spanish: "Tenemos que quedar más", english: "We should meet up more often" },
  ],
  clothing: [
    { spanish: "¿Me lo puedo probar?", english: "Can I try it on?" },
    { spanish: "¿Dónde están los probadores?", english: "Where are the fitting rooms?" },
    { spanish: "¿Lo tiene en una talla más grande?", english: "Do you have it in a bigger size?" },
    { spanish: "¿Lo tiene en otro color?", english: "Do you have it in another color?" },
    { spanish: "Me queda pequeño", english: "It's too small on me" },
    { spanish: "Me lo llevo", english: "I'll take it" },
  ],
  doctor: [
    { spanish: "Me duele la cabeza", english: "My head hurts" },
    { spanish: "Tengo fiebre desde hace dos días", english: "I've had a fever for two days" },
    { spanish: "Estoy mareado", english: "I feel dizzy" },
    { spanish: "¿Es algo grave?", english: "Is it something serious?" },
    { spanish: "Soy alérgico a la penicilina", english: "I'm allergic to penicillin" },
    { spanish: "¿Necesito receta?", english: "Do I need a prescription?" },
  ],
  interview: [
    { spanish: "Tengo experiencia en…", english: "I have experience in…" },
    { spanish: "Trabajo bien en equipo", english: "I work well in a team" },
    { spanish: "Mi punto fuerte es…", english: "My greatest strength is…" },
    { spanish: "Estoy muy motivado", english: "I'm very motivated" },
    { spanish: "¿Cómo es un día típico?", english: "What is a typical day like?" },
    { spanish: "¿Cuáles serían mis responsabilidades?", english: "What would my responsibilities be?" },
  ],
  apartment: [
    { spanish: "¿Cuánto es el alquiler al mes?", english: "How much is the rent per month?" },
    { spanish: "¿Los gastos están incluidos?", english: "Are utilities included?" },
    { spanish: "¿De cuánto es la fianza?", english: "How much is the deposit?" },
    { spanish: "¿Cuánto dura el contrato?", english: "How long is the lease?" },
    { spanish: "¿Se admiten mascotas?", english: "Are pets allowed?" },
    { spanish: "¿El precio es negociable?", english: "Is the price negotiable?" },
  ],
  complaint: [
    { spanish: "Llamo para poner una reclamación", english: "I'm calling to file a complaint" },
    { spanish: "Me han cobrado de más", english: "I've been overcharged" },
    { spanish: "No funciona desde el lunes", english: "It hasn't worked since Monday" },
    { spanish: "¿Cuándo quedará resuelto?", english: "When will it be resolved?" },
    { spanish: "Quiero hablar con un supervisor", english: "I'd like to speak with a supervisor" },
    { spanish: "Solicito un reembolso", english: "I'm requesting a refund" },
  ],
  debate: [
    { spanish: "No estoy de acuerdo en absoluto", english: "I completely disagree" },
    { spanish: "Desde mi punto de vista…", english: "From my point of view…" },
    { spanish: "Entiendo lo que dices, pero…", english: "I see what you're saying, but…" },
    { spanish: "Por un lado… por otro…", english: "On one hand… on the other…" },
    { spanish: "Eso depende de…", english: "That depends on…" },
    { spanish: "Ahí te doy la razón", english: "I'll grant you that" },
  ],
  deeper: [
    { spanish: "Llevo tiempo dándole vueltas", english: "I've been mulling it over for a while" },
    { spanish: "Es un arma de doble filo", english: "It's a double-edged sword" },
    { spanish: "Hasta cierto punto", english: "Up to a point" },
    { spanish: "A fin de cuentas", english: "At the end of the day" },
    { spanish: "Lo que está en juego es…", english: "What's at stake is…" },
    { spanish: "Yo matizaría que…", english: "I'd add the nuance that…" },
  ],
};

/**
 * Catálogo de emojis com busca bilíngue (Português do Brasil e Inglês).
 * Permite buscar emojis pelo atalho `:` no editor digitando palavras em PT ou EN.
 */

export interface EmojiItemBilingue {
  emoji: string;
  nomePt: string;
  nomeEn: string;
  aliases: string[];
  categoria?: string;
}

export const CATALOGO_EMOJIS: EmojiItemBilingue[] = [
  // Expressões & Rostos
  { emoji: "😀", nomePt: "sorriso largo", nomeEn: "grinning", aliases: ["sorriso", "feliz", "happy", "smile", "alegre"] },
  { emoji: "😃", nomePt: "sorriso com olhos abertos", nomeEn: "smiley", aliases: ["sorriso", "feliz", "happy", "smile", "contente"] },
  { emoji: "😄", nomePt: "sorriso feliz", nomeEn: "smile", aliases: ["sorriso", "feliz", "happy", "alegria", "gargalhada"] },
  { emoji: "😁", nomePt: "sorriso radiante", nomeEn: "grin", aliases: ["sorriso", "dentes", "radiante", "feliz"] },
  { emoji: "😆", nomePt: "sorriso fechado", nomeEn: "laughing", aliases: ["riso", "risada", "haha", "kkk", "laugh"] },
  { emoji: "😅", nomePt: "sorriso com suor", nomeEn: "sweat_smile", aliases: ["suor", "alivio", "quase", "nervoso", "sweat"] },
  { emoji: "😂", nomePt: "chorando de rir", nomeEn: "joy", aliases: ["rir", "choro", "gargalhada", "lol", "haha", "kkk", "engracado"] },
  { emoji: "🤣", nomePt: "rolando de rir", nomeEn: "rofl", aliases: ["rolando", "rir", "morrendo", "lol", "lmao", "engracado"] },
  { emoji: "😊", nomePt: "sorriso tímido", nomeEn: "blush", aliases: ["timido", "fofo", "sorriso", "gentil", "cute"] },
  { emoji: "😇", nomePt: "anjo", nomeEn: "innocent", aliases: ["anjo", "inocente", "santo", "angel", "halo"] },
  { emoji: "🙂", nomePt: "sorriso leve", nomeEn: "slightly_smiling_face", aliases: ["sorriso", "leve", "ok", "tranquilo", "calmo"] },
  { emoji: "😉", nomePt: "piscadinha", nomeEn: "wink", aliases: ["piscar", "piscada", "wink", "segredo", "cumplice"] },
  { emoji: "😍", nomePt: "apaixonado", nomeEn: "heart_eyes", aliases: ["amor", "apaixonado", "love", "coracao", "lindo", "perfeito"] },
  { emoji: "🥰", nomePt: "rosto com corações", nomeEn: "smiling_face_with_3_hearts", aliases: ["amor", "carinho", "fofo", "love", "afeto"] },
  { emoji: "😘", nomePt: "beijo com coração", nomeEn: "kissing_heart", aliases: ["beijo", "amor", "kiss", "carinho", "love"] },
  { emoji: "😋", nomePt: "delícia", nomeEn: "yum", aliases: ["gostoso", "delicia", "comida", "saboroso", "yummy", "tasty"] },
  { emoji: "😎", nomePt: "óculos de sol", nomeEn: "sunglasses", aliases: ["legal", "estiloso", "cool", "oculos", "boss", "top"] },
  { emoji: "🤓", nomePt: "nerd", nomeEn: "nerd_face", aliases: ["nerd", "geek", "estudioso", "oculos", "inteligente", "dev"] },
  { emoji: "🧐", nomePt: "monóculo", nomeEn: "monocle_face", aliases: ["analisando", "investigando", "duvida", "curioso", "pensando"] },
  { emoji: "🥳", nomePt: "festa", nomeEn: "partying_face", aliases: ["festa", "aniversario", "comemorar", "party", "celebrar", "parabens"] },
  { emoji: "🤩", nomePt: "estrelas nos olhos", nomeEn: "star_struck", aliases: ["impressionado", "uau", "estrela", "fantastico", "incrivel", "wow"] },
  { emoji: "🤔", nomePt: "pensando", nomeEn: "thinking", aliases: ["duvida", "hum", "refletindo", "think", "pensar"] },
  { emoji: "🤫", nomePt: "silêncio", nomeEn: "shushing_face", aliases: ["silencio", "segredo", "calado", "shh", "quiet"] },
  { emoji: "🤭", nomePt: "mão na boca", nomeEn: "hand_over_mouth", aliases: ["ops", "risinho", "segredo", "oops"] },
  { emoji: "🤐", nomePt: "boca fechada", nomeEn: "zipper_mouth_face", aliases: ["segredo", "calado", "boca", "fechada", "quiet"] },
  { emoji: "🤨", nomePt: "desconfiado", nomeEn: "raised_eyebrow", aliases: ["duvida", "desconfiado", "estranho", "suspeito", "serio"] },
  { emoji: "😐", nomePt: "neutro", nomeEn: "neutral_face", aliases: ["neutro", "sem graca", "serio", "ok", "meh"] },
  { emoji: "😑", nomePt: "inexpressivo", nomeEn: "expressionless", aliases: ["cansado", "sem reacao", "meh", "tonto"] },
  { emoji: "😶", nomePt: "sem boca", nomeEn: "no_mouth", aliases: ["sem palavras", "mudo", "chocado", "calado"] },
  { emoji: "😏", nomePt: "sorriso maroto", nomeEn: "smirk", aliases: ["maroto", "malicioso", "ironico", "esperto", "smirk"] },
  { emoji: "😒", nomePt: "aborrecido", nomeEn: "unamused", aliases: ["chateado", "tedio", "saco cheio", "bravo", "desanimado"] },
  { emoji: "🙄", nomePt: "olhos revirados", nomeEn: "rolling_eyes", aliases: ["revirar", "tedio", "de novo", "duvido", "aff"] },
  { emoji: "😬", nomePt: "careta", nomeEn: "grimacing", aliases: ["careta", "vergonha", "situacao", "tenso", "yikes"] },
  { emoji: "🤥", nomePt: "mentiroso", nomeEn: "lying_face", aliases: ["mentira", "pinocchio", "nariz", "fake"] },
  { emoji: "😌", nomePt: "aliviado", nomeEn: "relieved", aliases: ["alivio", "paz", "tranquilo", "calma", "zen"] },
  { emoji: "😔", nomePt: "pensativo e triste", nomeEn: "pensive", aliases: ["triste", "desanimado", "cabeca baixa", "chateado", "sad"] },
  { emoji: "😪", nomePt: "sonolento", nomeEn: "sleepy", aliases: ["sono", "cansado", "preguica", "dormir"] },
  { emoji: "🤤", nomePt: "babando", nomeEn: "drooling_face", aliases: ["babando", "vontade", "desejo", "fome"] },
  { emoji: "😴", nomePt: "dormindo", nomeEn: "sleeping", aliases: ["sono", "dormir", "zzz", "cama", "descanso", "sleep"] },
  { emoji: "😷", nomePt: "máscara", nomeEn: "mask", aliases: ["mascara", "doente", "covid", "medico", "saude"] },
  { emoji: "🤒", nomePt: "termômetro", nomeEn: "face_with_thermometer", aliases: ["febre", "doente", "gripe", "mal"] },
  { emoji: "🤕", nomePt: "machucado", nomeEn: "face_with_head_bandage", aliases: ["machucado", "dor", "acidente", "curativo"] },
  { emoji: "🤢", nomePt: "enjoado", nomeEn: "nauseated_face", aliases: ["enjoo", "nojo", "verde", "mal"] },
  { emoji: "🤮", nomePt: "vomitando", nomeEn: "vomiting_face", aliases: ["vomito", "nojento", "podre", "ruim"] },
  { emoji: "🥵", nomePt: "com calor", nomeEn: "hot_face", aliases: ["calor", "quente", "verao", "suando", "hot"] },
  { emoji: "🥶", nomePt: "com frio", nomeEn: "cold_face", aliases: ["frio", "congelando", "inverno", "gelado", "cold"] },
  { emoji: "🥴", nomePt: "tonto", nomeEn: "woozy_face", aliases: ["tonto", "bebado", "confuso", "estranho"] },
  { emoji: "😵", nomePt: "tonto e zonzo", nomeEn: "dizzy_face", aliases: ["tonto", "desmaiado", "chocado", "morto"] },
  { emoji: "🤯", nomePt: "cabeça explodindo", nomeEn: "exploding_head", aliases: ["mindblown", "uau", "uou", "choque", "incrivel", "bizarro"] },
  { emoji: "🤠", nomePt: "cowboy", nomeEn: "cowboy_hat_face", aliases: ["cowboy", "chapeu", "faroeste", "peao"] },
  { emoji: "🥱", nomePt: "bocejando", nomeEn: "yawning_face", aliases: ["bocejo", "tedio", "sono", "cansaco"] },
  { emoji: "😨", nomePt: "assustado", nomeEn: "fearful", aliases: ["medo", "susto", "assustado", "preocupado"] },
  { emoji: "😰", nomePt: "ansioso com suor", nomeEn: "cold_sweat", aliases: ["ansiedade", "tenso", "medo", "preocupado"] },
  { emoji: "😥", nomePt: "triste mas aliviado", nomeEn: "disappointed_relieved", aliases: ["ufa", "triste", "quase"] },
  { emoji: "😢", nomePt: "chorando", nomeEn: "cry", aliases: ["choro", "triste", "lagrima", "sad", "pena"] },
  { emoji: "😭", nomePt: "chorando muito", nomeEn: "sob", aliases: ["desespero", "choro", "triste", "lagrimas", "drama"] },
  { emoji: "😱", nomePt: "gritando de medo", nomeEn: "scream", aliases: ["panico", "grito", "medo", "choque", "terror"] },
  { emoji: "😠", nomePt: "bravo", nomeEn: "angry", aliases: ["bravo", "irritado", "raiva", "chateado", "mad"] },
  { emoji: "😡", nomePt: "furioso", nomeEn: "rage", aliases: ["furia", "raiva", "vermelho", "odio", "irritado"] },
  { emoji: "🤬", nomePt: "xingando", nomeEn: "cursing_face", aliases: ["palavrao", "raiva", "xingamento", "odio", "bravo"] },
  { emoji: "😈", nomePt: "diabinho sorrindo", nomeEn: "smiling_imp", aliases: ["diabo", "malvado", "maroto", "evil"] },
  { emoji: "👿", nomePt: "diabinho bravo", nomeEn: "imp", aliases: ["diabo", "malvado", "raiva", "evil"] },
  { emoji: "💀", nomePt: "caveira", nomeEn: "skull", aliases: ["caveira", "morte", "dead", "perigo", "morri"] },
  { emoji: "☠️", nomePt: "caveira e ossos", nomeEn: "skull_and_crossbones", aliases: ["pirata", "veneno", "perigo", "morte"] },
  { emoji: "💩", nomePt: "cocô", nomeEn: "poop", aliases: ["coco", "bosta", "merda", "poop", "engracado"] },
  { emoji: "🤡", nomePt: "palhaço", nomeEn: "clown_face", aliases: ["palhaco", "circo", "bobagem", "otario", "clown"] },
  { emoji: "👻", nomePt: "fantasma", nomeEn: "ghost", aliases: ["fantasma", "susto", "halloween", "espiritual"] },
  { emoji: "👽", nomePt: "alien", nomeEn: "alien", aliases: ["alien", "extraterrestre", "ovni", "espaco"] },
  { emoji: "🤖", nomePt: "robô", nomeEn: "robot", aliases: ["robo", "ia", "tecnologia", "bot", "automacao", "ai"] },

  // Gestos & Mãos
  { emoji: "👋", nomePt: "acenando", nomeEn: "wave", aliases: ["ola", "tchau", "aceno", "adeus", "oi", "hello", "hi", "bye"] },
  { emoji: "🤚", nomePt: "costas da mão", nomeEn: "raised_back_of_hand", aliases: ["pare", "alto", "mao"] },
  { emoji: "🖐️", nomePt: "mão aberta com dedos", nomeEn: "hand_splayed", aliases: ["cinco", "mao", "aberta"] },
  { emoji: "✋", nomePt: "mão levantada", nomeEn: "raised_hand", aliases: ["pare", "alto", "chega", "espera", "stop"] },
  { emoji: "🖖", nomePt: "saudação vulcana", nomeEn: "vulcan_salute", aliases: ["spock", "star trek", "vida longa", "paz"] },
  { emoji: "👌", nomePt: "ok com a mão", nomeEn: "ok_hand", aliases: ["ok", "certo", "perfeito", "otimo", "beleza"] },
  { emoji: "🤌", nomePt: "mão italiana", nomeEn: "pinched_fingers", aliases: ["que isso", "italiano", "calma", "gesto"] },
  { emoji: "🤏", nomePt: "pouquinho", nomeEn: "pinching_hand", aliases: ["pouco", "pequeno", "quase", "pouquinho"] },
  { emoji: "✌️", nomePt: "paz e amor", nomeEn: "v", aliases: ["paz", "amor", "vitoria", "dois", "peace"] },
  { emoji: "🤞", nomePt: "dedos cruzados", nomeEn: "crossed_fingers", aliases: ["sorte", "tomara", "fe", "esperanca", "luck"] },
  { emoji: "🤟", nomePt: "te amo", nomeEn: "love_you_gesture", aliases: ["rock", "amor", "libras", "te amo"] },
  { emoji: "🤘", nomePt: "rock and roll", nomeEn: "metal", aliases: ["rock", "metal", "show", "musica"] },
  { emoji: "🤙", nomePt: "hang loose", nomeEn: "call_me_hand", aliases: ["shaka", "beleza", "liga nois", "tranquilo"] },
  { emoji: "👈", nomePt: "apontando para esquerda", nomeEn: "point_left", aliases: ["esquerda", "apontar", "olhe", "veja"] },
  { emoji: "👉", nomePt: "apontando para direita", nomeEn: "point_right", aliases: ["direita", "apontar", "veja", "aqui", "link"] },
  { emoji: "👆", nomePt: "apontando para cima", nomeEn: "point_up_2", aliases: ["cima", "acima", "olhe", "topo"] },
  { emoji: "👇", nomePt: "apontando para baixo", nomeEn: "point_down", aliases: ["baixo", "abaixo", "veja", "clique"] },
  { emoji: "☝️", nomePt: "indicador para cima", nomeEn: "point_up", aliases: ["atencao", "um", "primeiro", "importante"] },
  { emoji: "👍", nomePt: "polegar para cima", nomeEn: "thumbsup", aliases: ["joia", "positivo", "legal", "top", "curtir", "like", "aprovado", "sim"] },
  { emoji: "👎", nomePt: "polegar para baixo", nomeEn: "thumbsdown", aliases: ["deslike", "negativo", "ruim", "desaprovado", "nao", "reprovado"] },
  { emoji: "✊", nomePt: "punho levantado", nomeEn: "fist", aliases: ["forca", "resistencia", "luta", "poder"] },
  { emoji: "👊", nomePt: "soquinho", nomeEn: "facepunch", aliases: ["soco", "parceria", "fechou", "tamojunto"] },
  { emoji: "🤛", nomePt: "punho esquerdo", nomeEn: "left_facing_fist", aliases: ["soquinho", "toque", "parceria"] },
  { emoji: "🤜", nomePt: "punho direito", nomeEn: "right_facing_fist", aliases: ["soquinho", "toque", "parceria"] },
  { emoji: "👏", nomePt: "aplausos", nomeEn: "clap", aliases: ["palmas", "parabens", "aplauso", "bravo", "conquista", "clap"] },
  { emoji: "🙌", nomePt: "mãos para o alto", nomeEn: "raised_hands", aliases: ["celebrar", "aleluia", "vitoria", "comemoracao"] },
  { emoji: "👐", nomePt: "mãos abertas", nomeEn: "open_hands", aliases: ["abraco", "acolhimento", "gentil"] },
  { emoji: "🤲", nomePt: "palmas juntas para cima", nomeEn: "palms_up_together", aliases: ["rezar", "pedir", "esperanca", "gratidao"] },
  { emoji: "🤝", nomePt: "aperto de mão", nomeEn: "handshake", aliases: ["acordo", "negocio", "parceria", "fechado", "trato", "deal"] },
  { emoji: "🙏", nomePt: "mãos postas", nomeEn: "pray", aliases: ["oracao", "por favor", "obrigado", "gratidao", "valeu", "fe", "please", "thanks"] },
  { emoji: "✍️", nomePt: "escrevendo", nomeEn: "writing_hand", aliases: ["escrever", "redacao", "autor", "nota", "texto", "write"] },
  { emoji: "💅", nomePt: "pintando as unhas", nomeEn: "nail_care", aliases: ["unhas", "estilo", "deboche", "maravilhosa"] },
  { emoji: "🤳", nomePt: "selfie", nomeEn: "selfie", aliases: ["foto", "camera", "celular", "eu"] },
  { emoji: "💪", nomePt: "braço forte", nomeEn: "muscle", aliases: ["forca", "treino", "academia", "forte", "foco", "strong"] },
  { emoji: "👀", nomePt: "olhos", nomeEn: "eyes", aliases: ["olhar", "observar", "vendo", "atencao", "de olho", "look", "see"] },
  { emoji: "🧠", nomePt: "cérebro", nomeEn: "brain", aliases: ["cerebro", "inteligencia", "mente", "klaus", "pensamento", "brain"] },

  // Corações & Sentimentos
  { emoji: "❤️", nomePt: "coração vermelho", nomeEn: "heart", aliases: ["coracao", "amor", "love", "paixao", "vermelho"] },
  { emoji: "🧡", nomePt: "coração laranja", nomeEn: "orange_heart", aliases: ["coracao", "laranja", "amizade"] },
  { emoji: "💛", nomePt: "coração amarelo", nomeEn: "yellow_heart", aliases: ["coracao", "amarelo", "luz", "ouro"] },
  { emoji: "💚", nomePt: "coração verde", nomeEn: "green_heart", aliases: ["coracao", "verde", "natureza", "esperanca"] },
  { emoji: "💙", nomePt: "coração azul", nomeEn: "blue_heart", aliases: ["coracao", "azul", "confianca", "paz"] },
  { emoji: "💜", nomePt: "coração roxo", nomeEn: "purple_heart", aliases: ["coracao", "roxo", "pdi", "metas", "criatividade"] },
  { emoji: "🖤", nomePt: "coração preto", nomeEn: "black_heart", aliases: ["coracao", "preto", "escuro", "dark"] },
  { emoji: "🤍", nomePt: "coração branco", nomeEn: "white_heart", aliases: ["coracao", "branco", "paz", "puro"] },
  { emoji: "🤎", nomePt: "coração marrom", nomeEn: "brown_heart", aliases: ["coracao", "marrom", "cafe"] },
  { emoji: "💔", nomePt: "coração partido", nomeEn: "broken_heart", aliases: ["triste", "termino", "dor", "desilusao"] },
  { emoji: "💖", nomePt: "coração brilhante", nomeEn: "sparkling_heart", aliases: ["brilho", "amor", "carinho", "especial"] },
  { emoji: "💗", nomePt: "coração crescendo", nomeEn: "heartpulse", aliases: ["pulsando", "amor", "empolgado"] },
  { emoji: "💓", nomePt: "coração batendo", nomeEn: "heartbeat", aliases: ["batimento", "vida", "emocao"] },
  { emoji: "💞", nomePt: "corações girando", nomeEn: "revolving_hearts", aliases: ["amor", "casal", "sintonia"] },
  { emoji: "💕", nomePt: "dois corações", nomeEn: "two_hearts", aliases: ["amor", "amizade", "afeto"] },
  { emoji: "🔥", nomePt: "fogo", nomeEn: "fire", aliases: ["fogo", "chama", "quente", "top", "sensacional", "urgente", "fire", "hype"] },
  { emoji: "✨", nomePt: "brilhos", nomeEn: "sparkles", aliases: ["brilho", "magia", "novo", "limpo", "ia", "estrelas", "sparkles", "clean"] },
  { emoji: "💥", nomePt: "explosão", nomeEn: "boom", aliases: ["impacto", "explosao", "boom", "destaque", "novidade"] },
  { emoji: "💯", nomePt: "cem pontos", nomeEn: "100", aliases: ["cem", "perfeito", "nota100", "top", "excelente", "cemporcento", "100"] },
  { emoji: "⚡", nomePt: "raio", nomeEn: "zap", aliases: ["energia", "eletricidade", "rapido", "velocidade", "flash", "trovao", "zap", "lightning"] },
  { emoji: "⭐", nomePt: "estrela", nomeEn: "star", aliases: ["estrela", "favorito", "destaque", "nota", "classificacao", "star"] },
  { emoji: "🌟", nomePt: "estrela brilhante", nomeEn: "star2", aliases: ["brilho", "especial", "ouro", "excelente"] },

  // Produtividade, Trabalho & Ferramentas
  { emoji: "🚀", nomePt: "foguete", nomeEn: "rocket", aliases: ["foguete", "lancamento", "crescimento", "startup", "rapido", "subir", "rocket"] },
  { emoji: "💡", nomePt: "ideia", nomeEn: "bulb", aliases: ["ideia", "lampada", "insight", "solucao", "criativo", "pensamento", "luz", "idea", "bulb"] },
  { emoji: "🎯", nomePt: "alvo", nomeEn: "target", aliases: ["alvo", "meta", "objetivo", "foco", "pdi", "resultado", "target"] },
  { emoji: "📌", nomePt: "tachinha", nomeEn: "pushpin", aliases: ["fixar", "marcar", "importante", "lembrete", "pin", "nota"] },
  { emoji: "📍", nomePt: "marcador de mapa", nomeEn: "round_pushpin", aliases: ["local", "onde", "aqui", "ponto", "mapa"] },
  { emoji: "📎", nomePt: "clipe de papel", nomeEn: "paperclip", aliases: ["anexo", "arquivo", "grampo", "clip", "anexar"] },
  { emoji: "🖇️", nomePt: "clipes interligados", nomeEn: "paperclips", aliases: ["vinculo", "ligacao", "documentos", "conexao"] },
  { emoji: "📝", nomePt: "bloco de notas e lápis", nomeEn: "memo", aliases: ["nota", "anotacao", "rascunho", "escrever", "resumo", "briefing"] },
  { emoji: "📄", nomePt: "documento", nomeEn: "page_facing_up", aliases: ["pagina", "texto", "relatorio", "arquivo", "doc"] },
  { emoji: "📑", nomePt: "páginas marcadas", nomeEn: "bookmark_tabs", aliases: ["abas", "marcadores", "documentos", "sumario"] },
  { emoji: "📁", nomePt: "pasta fechada", nomeEn: "file_folder", aliases: ["pasta", "diretorio", "categoria", "folder", "arquivos"] },
  { emoji: "📂", nomePt: "pasta aberta", nomeEn: "open_file_folder", aliases: ["abrir pasta", "documentos", "acervo"] },
  { emoji: "📊", nomePt: "gráfico de barras", nomeEn: "bar_chart", aliases: ["grafico", "estatisticas", "metricas", "dados", "resultado", "chart"] },
  { emoji: "📈", nomePt: "gráfico subindo", nomeEn: "chart_with_upwards_trend", aliases: ["alta", "crescimento", "lucro", "progresso", "evolucao"] },
  { emoji: "📉", nomePt: "gráfico descendo", nomeEn: "chart_with_downwards_trend", aliases: ["queda", "baixa", "prejuizo", "alerta"] },
  { emoji: "📅", nomePt: "calendário", nomeEn: "date", aliases: ["data", "dia", "agenda", "evento", "prazo", "calendar"] },
  { emoji: "📆", nomePt: "calendário de mesa", nomeEn: "calendar", aliases: ["agenda", "planejamento", "compromisso", "mes"] },
  { emoji: "⏰", nomePt: "despertador", nomeEn: "alarm_clock", aliases: ["alarme", "hora", "tempo", "prazo", "urgente", "horario", "clock"] },
  { emoji: "⏱️", nomePt: "cronômetro", nomeEn: "stopwatch", aliases: ["pomodoro", "tempo", "medir", "cronometro"] },
  { emoji: "⌛", nomePt: "ampulheta cheia", nomeEn: "hourglass", aliases: ["tempo", "espera", "processando", "aguardando"] },
  { emoji: "⏳", nomePt: "ampulheta escorrendo", nomeEn: "hourglass_flowing_sand", aliases: ["tempo acabando", "prazo", "andamento"] },
  { emoji: "✅", nomePt: "marca de seleção verde", nomeEn: "white_check_mark", aliases: ["concluido", "feito", "certo", "ok", "sucesso", "aprovado", "check"] },
  { emoji: "✔️", nomePt: "marca de verificação", nomeEn: "heavy_check_mark", aliases: ["correto", "sim", "pronto", "ok", "check"] },
  { emoji: "☑️", nomePt: "caixa com seleção", nomeEn: "ballot_box_with_check", aliases: ["tarefa", "checklist", "marcado"] },
  { emoji: "❌", nomePt: "marca de X", nomeEn: "x", aliases: ["erro", "cancelado", "fechar", "apagar", "reprovado", "errado", "no"] },
  { emoji: "⚠️", nomePt: "aviso", nomeEn: "warning", aliases: ["alerta", "cuidado", "atencao", "perigo", "warning", "urgente"] },
  { emoji: "🚨", nomePt: "luz de emergência", nomeEn: "rotating_light", aliases: ["urgencia", "emergencia", "sirene", "socorro", "critico"] },
  { emoji: "🏷️", nomePt: "etiqueta", nomeEn: "label", aliases: ["tag", "marcador", "categoria", "filtro"] },
  { emoji: "🔍", nomePt: "lupa para esquerda", nomeEn: "mag", aliases: ["busca", "pesquisa", "procurar", "achar", "search"] },
  { emoji: "🔎", nomePt: "lupa para direita", nomeEn: "mag_right", aliases: ["investigar", "pesquisar", "analisar"] },
  { emoji: "🔒", nomePt: "cadeado fechado", nomeEn: "lock", aliases: ["seguro", "privado", "fechado", "senha", "seguranca", "lock"] },
  { emoji: "🔓", nomePt: "cadeado aberto", nomeEn: "unlock", aliases: ["destravado", "publico", "acesso", "livre"] },
  { emoji: "🔑", nomePt: "chave", nomeEn: "key", aliases: ["acesso", "token", "segredo", "solucao", "chave", "key"] },
  { emoji: "🛠️", nomePt: "ferramentas", nomeEn: "tools", aliases: ["ajustes", "configuracao", "manutencao", "it tools", "conserto"] },
  { emoji: "⚙️", nomePt: "engrenagem", nomeEn: "gear", aliases: ["configuracoes", "opcoes", "preferencias", "ajustes", "settings"] },
  { emoji: "🔧", nomePt: "chave inglesa", nomeEn: "wrench", aliases: ["reparo", "ajuste", "ferramenta"] },
  { emoji: "🔨", nomePt: "martelo", nomeEn: "hammer", aliases: ["construir", "obra", "ferramenta"] },
  { emoji: "🗑️", nomePt: "lixeira", nomeEn: "wastebasket", aliases: ["lixeira", "apagar", "excluir", "remover", "trash"] },

  // Tecnologia, Design & Comunicação
  { emoji: "💻", nomePt: "laptop", nomeEn: "computer", aliases: ["computador", "notebook", "pc", "programacao", "dev", "trabalho", "laptop"] },
  { emoji: "🖥️", nomePt: "computador de mesa", nomeEn: "desktop_computer", aliases: ["desktop", "monitor", "tela", "estacao"] },
  { emoji: "📱", nomePt: "celular", nomeEn: "iphone", aliases: ["smartphone", "mobile", "telefone", "android", "iphone", "app"] },
  { emoji: "⌨️", nomePt: "teclado", nomeEn: "keyboard", aliases: ["digitar", "escrever", "atalhos", "computador"] },
  { emoji: "🖱️", nomePt: "mouse", nomeEn: "mouse", aliases: ["clique", "cursor", "computador"] },
  { emoji: "🎨", nomePt: "paleta de pintura", nomeEn: "art", aliases: ["design", "arte", "cores", "designer", "ilustracao", "layout", "figma"] },
  { emoji: "🖌️", nomePt: "pincel", nomeEn: "paintbrush", aliases: ["pintura", "desenho", "estilo", "arte"] },
  { emoji: "✏️", nomePt: "lápis", nomeEn: "pencil2", aliases: ["escrever", "rascunho", "editar", "designer"] },
  { emoji: "✒️", nomePt: "caneta-tinteiro", nomeEn: "black_nib", aliases: ["caneta", "assinatura", "contrato", "autor"] },
  { emoji: "📸", nomePt: "câmera fotográfica", nomeEn: "camera_flash", aliases: ["foto", "fotografia", "imagem", "registro", "camera"] },
  { emoji: "🎥", nomePt: "câmera de vídeo", nomeEn: "movie_camera", aliases: ["video", "gravacao", "filme", "cinema", "youtube"] },
  { emoji: "🎬", nomePt: "claquete", nomeEn: "clapper", aliases: ["gravacao", "acao", "producao", "video"] },
  { emoji: "🎧", nomePt: "fones de ouvido", nomeEn: "headphones", aliases: ["audio", "musica", "podcast", "ouvir", "som", "music"] },
  { emoji: "🎤", nomePt: "microfone", nomeEn: "microphone", aliases: ["voz", "fala", "gravador", "transcricao", "podcast", "mic"] },
  { emoji: "🎙️", nomePt: "microfone de estúdio", nomeEn: "studio_microphone", aliases: ["gravacao", "locucao", "podcast", "audio"] },
  { emoji: "🎵", nomePt: "nota musical", nomeEn: "musical_note", aliases: ["musica", "cancao", "ritmo", "som"] },
  { emoji: "🎶", nomePt: "várias notas musicais", nomeEn: "notes", aliases: ["musica", "melodia", "show"] },
  { emoji: "✉️", nomePt: "envelope", nomeEn: "email", aliases: ["mensagem", "email", "carta", "correio", "inbox", "mail"] },
  { emoji: "📧", nomePt: "e-mail", nomeEn: "e-mail", aliases: ["correio", "mensagem", "eletronico", "email"] },
  { emoji: "💬", nomePt: "balão de conversa", nomeEn: "speech_balloon", aliases: ["conversa", "chat", "mensagem", "comentario", "dialogo", "falar"] },
  { emoji: "🗨️", nomePt: "balão de diálogo", nomeEn: "left_speech_bubble", aliases: ["conversa", "opiniao", "fala"] },
  { emoji: "🌐", nomePt: "globo com meridianos", nomeEn: "globe_with_meridians", aliases: ["internet", "web", "site", "online", "mundo", "global"] },
  { emoji: "🌍", nomePt: "globo europa-áfrica", nomeEn: "earth_africa", aliases: ["planeta", "mundo", "terra", "internacional"] },
  { emoji: "🌎", nomePt: "globo américas", nomeEn: "earth_americas", aliases: ["brasil", "america", "mundo", "terra"] },
  { emoji: "🔗", nomePt: "elos de corrente", nomeEn: "link", aliases: ["link", "conexao", "url", "hiperlink", "referencia"] },

  // Objetos, Dia a Dia, Comida & Lugares
  { emoji: "☕", nomePt: "café", nomeEn: "coffee", aliases: ["cafe", "cafezinho", "pausa", "foco", "manha", "coffee"] },
  { emoji: "🍵", nomePt: "chá", nomeEn: "tea", aliases: ["cha", "calma", "descanso", "quente"] },
  { emoji: "🍕", nomePt: "pizza", nomeEn: "pizza", aliases: ["pizza", "lanche", "comida", "fatia", "jantar"] },
  { emoji: "🍔", nomePt: "hambúrguer", nomeEn: "hamburger", aliases: ["lanche", "hamburguer", "comida", "burger"] },
  { emoji: "🍎", nomePt: "maçã vermelha", nomeEn: "apple", aliases: ["fruta", "maca", "saude", "apple"] },
  { emoji: "📚", nomePt: "livros", nomeEn: "books", aliases: ["livro", "estudos", "leitura", "biblioteca", "aprender", "book", "books"] },
  { emoji: "📖", nomePt: "livro aberto", nomeEn: "book", aliases: ["leitura", "historia", "estudo", "pagina"] },
  { emoji: "🎓", nomePt: "chapéu de formatura", nomeEn: "mortarboard", aliases: ["estudos", "faculdade", "formado", "diploma", "educacao"] },
  { emoji: "🏆", nomePt: "troféu", nomeEn: "trophy", aliases: ["premio", "vencedor", "campeao", "sucesso", "conquista", "win", "trophy"] },
  { emoji: "🥇", nomePt: "medalha de ouro", nomeEn: "first_place_medal", aliases: ["primeiro", "ouro", "campeao", "top1"] },
  { emoji: "🥈", nomePt: "medalha de prata", nomeEn: "second_place_medal", aliases: ["segundo", "prata", "vice"] },
  { emoji: "🥉", nomePt: "medalha de bronze", nomeEn: "third_place_medal", aliases: ["terceiro", "bronze"] },
  { emoji: "🎁", nomePt: "presente", nomeEn: "gift", aliases: ["presente", "aniversario", "brinde", "surpresa", "gift"] },
  { emoji: "🎉", nomePt: "cone de festa", nomeEn: "tada", aliases: ["comemoracao", "festa", "parabens", "sucesso", "celebrar", "tada", "party"] },
  { emoji: "🎊", nomePt: "bola de confete", nomeEn: "confetti_ball", aliases: ["confete", "festa", "alegria"] },
  { emoji: "💰", nomePt: "saco de dinheiro", nomeEn: "moneybag", aliases: ["dinheiro", "grana", "financas", "pagamento", "lucro", "money", "dolar"] },
  { emoji: "💵", nomePt: "nota de dólar", nomeEn: "dollar", aliases: ["dinheiro", "nota", "moeda", "dolar", "cash"] },
  { emoji: "💳", nomePt: "cartão de crédito", nomeEn: "credit_card", aliases: ["cartao", "pagamento", "banco", "compras"] },
  { emoji: "🏠", nomePt: "casa", nomeEn: "house", aliases: ["casa", "home", "moradia", "lar", "home office"] },
  { emoji: "🏢", nomePt: "prédio de escritórios", nomeEn: "office", aliases: ["escritorio", "trabalho", "empresa", "corporativo", "predio"] },
  { emoji: "🚗", nomePt: "carro", nomeEn: "car", aliases: ["carro", "veiculo", "transporte", "auto", "viagem"] },
  { emoji: "✈️", nomePt: "avião", nomeEn: "airplane", aliases: ["aviao", "viagem", "voo", "aeroporto", "travel", "plane"] },
  { emoji: "☀️", nomePt: "sol", nomeEn: "sunny", aliases: ["sol", "dia", "claro", "verao", "calor", "sun"] },
  { emoji: "🌙", nomePt: "lua crescente", nomeEn: "crescent_moon", aliases: ["lua", "noite", "escuro", "dark", "moon"] },
  { emoji: "🌧️", nomePt: "chuva", nomeEn: "rain_cloud", aliases: ["chuva", "tempo", "chuvoso", "agua"] },
  { emoji: "🇧🇷", nomePt: "bandeira do Brasil", nomeEn: "brazil", aliases: ["brasil", "brazil", "br", "verde e amarelo", "nacional"] },
];

/** Normaliza string removendo acentos para busca flexível */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Busca emojis compatíveis com o termo fornecido em Português ou Inglês.
 */
export function buscarEmojisBilingue(
  consulta: string,
  limite = 35
): EmojiItemBilingue[] {
  const q = normalizar(consulta);
  if (!q) {
    return CATALOGO_EMOJIS.slice(0, limite);
  }

  const pontuados: { item: EmojiItemBilingue; score: number }[] = [];

  for (const item of CATALOGO_EMOJIS) {
    const nomePtNorm = normalizar(item.nomePt);
    const nomeEnNorm = normalizar(item.nomeEn);
    const aliasesNorm = item.aliases.map(normalizar);

    let score = 0;

    // Correspondência exata em nome principal ou alias
    if (nomePtNorm === q || nomeEnNorm === q) {
      score += 150;
    } else if (aliasesNorm.includes(q)) {
      score += 100;
    } else if (nomePtNorm.startsWith(q) || nomeEnNorm.startsWith(q)) {
      score += 80;
    } else if (aliasesNorm.some((a) => a.startsWith(q))) {
      score += 50;
    } else if (nomePtNorm.includes(q) || nomeEnNorm.includes(q)) {
      score += 30;
    } else if (aliasesNorm.some((a) => a.includes(q))) {
      score += 10;
    }

    if (score > 0) {
      pontuados.push({ item, score });
    }
  }

  pontuados.sort((a, b) => b.score - a.score);
  return pontuados.slice(0, limite).map((p) => p.item);
}

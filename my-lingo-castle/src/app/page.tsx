"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Float, Sparkles, useTexture, Billboard } from "@react-three/drei";
import * as THREE from "three";

// --- FIREBASE VE CONTEXT BAĞLANTISI ---
import { useAuth } from "@/context/AuthContext";

// --- TİP TANIMLAMALARI ---
type QuestionType = 
  // Eski Tipler (Geriye dönük uyumluluk için)
  | 'GRAMMAR_GAP' | 'VOCAB' | 'READING_COMP' | 'SENTENCE_INSERT' 
  | 'FIND_WRONG_LOGIC' | 'FIND_GRAMMAR_ERR' | 'CLOZE_TEST_5' 
  | 'GRAMMAR_CONTEXT' | 'IRRELEVANT_SENT' | 'CORRECT_SENTENCE'
  // YENİ Gelişmiş Tipler (Senin istediğin 10 tip):
  | 'FIX_GRAMMAR_IN_TEXT'    // 1. Tip: 4 cümle, hatayı bul ve düzelt
  | 'SYNONYM_IN_PARAGRAPH'   // 2. Tip: Paragraftaki numaralı kelimenin eş anlamlısı
  | 'AUDIO_DICTATION'        // 3. Tip: Sesi dinle ve yaz
  | 'SENTENCE_GAP_FILL'      // 4. Tip: Paragraf boşluk doldurma (Şıklı)
  | 'ORDER_SENTENCES'        // 5. Tip: Cümleleri sırala
  | 'AUDIO_QUESTION'         // 6. Tip: Sesteki soruya cevap ver
  | 'FIX_ALL_ERRORS'         // 7. Tip: 3 hatalı cümleyi düzelt
  | 'TRANSLATE_WORDS'        // 8. Tip: 10 kelimeyi çevir
  | 'IDIOM_GAP_FILL'         // 9. Tip: Deyim tamamlama
  | 'CARD_MATCH';            // 10. Tip: Kart eşleştirme

interface Chapter {
  id: number;
  type: QuestionType;
  storyText?: string;
  question: string;
  options?: string[];
  answer: string | string[];
  z: number;
  sentences?: string[];
  // audioUrl?: string;  <-- BUNU SİLİYORUZ
  audioText?: string; // <-- BUNU EKLİYORUZ (Okunacak metin)
  pairs?: {en: string, tr: string}[];
  targetWord?: string;
}

interface StoryScenario {
  id: string;
  lang: string;
  level: string;
  prisonerId: string;
  targetName: string;
  targetEmoji: string;
  title: string;
  intro: string;
  chestQuestion: string;
  chestAnswer: string;
  chestOptions: string[];  // <--- BUNU EKLEMEN GEREKİYOR (Sorun burada)
  chapters: Chapter[];
}

// --- KARAKTER VERİLERİ ---
const CHARACTERS = [
  { id: 'kral', name: 'Kral', role: 'Hükümdar', color: '#fbbf24', img: '/chars/kral.png' },
  { id: 'kralice', name: 'Kraliçe', role: 'Hükümdar', color: '#f472b6', img: '/chars/kralice.png' },
  { id: 'prens', name: 'Prens', role: 'Soylu', color: '#60a5fa', img: '/chars/prens.png' },
  { id: 'prenses', name: 'Prenses', role: 'Soylu', color: '#c084fc', img: '/chars/prenses.png' },
  { id: 'lord', name: 'Lord', role: 'Yönetici', color: '#94a3b8', img: '/chars/lord.png' },
  { id: 'buyucu', name: 'Büyücü', role: 'Alim', color: '#a855f7', img: '/chars/buyucu.png' },
  { id: 'vezir', name: 'Vezir', role: 'Danışman', color: '#14b8a6', img: '/chars/vezir.png' },
  { id: 'sovalye', name: 'Şövalye', role: 'Savaşçı', color: '#ef4444', img: '/chars/sovalye.png' },
  { id: 'casus', name: 'Casus', role: 'Gölge', color: '#22c55e', img: '/chars/casus.png' },
];

// --- HİKAYE VERİTABANI (Local Data) ---
// Not: A1 Seviye İngilizce için 9 farklı senaryo.
// Her senaryo 10 sorudan oluşur ve hikaye her soruda ilerler.
// --- HİKAYE VERİTABANI (YENİLENMİŞ - İNGİLİZCE A1) ---
// --- HİKAYE VERİTABANI (YENİLENMİŞ - GENİŞLETİLMİŞ HİKAYE & DÜZELTİLMİŞ SORULAR) ---
// --- HİKAYE VERİTABANI (YENİLENMİŞ - SORU KALIPLARI DÜZELTİLDİ) ---
// --- HİKAYE VERİTABANI (7. SORULAR HİKAYEYE UYARLANDI) ---
// --- HİKAYE VERİTABANI (1. SORULAR "AM/IS/ARE" MANTIĞINA GÖRE GÜNCELLENDİ) ---
const GAME_DATABASE: StoryScenario[] = [
  // 1. KRAL (King George)
  {
    id: "rescue_king_en_a1", lang: "İngilizce", level: "A1", prisonerId: "kral", targetName: "King George", targetEmoji: "👑",
    title: "The Golden Crown", 
    intro: "King George has been captured by the dark knights of the North. The entire kingdom is in deep chaos and fear! You must embark on a dangerous journey to find him and bring him back to his throne.",
    chestQuestion: "I have a face and hands, but no body. I tell you something, but I cannot speak. What am I?", 
    chestAnswer: "A clock",
    chestOptions: ["A clock", "The sun", "A map", "A book"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "You arrive at the massive iron gates of the dark castle. The atmosphere is foggy and dangerous.", question: "Hangi cümlede 'Tekil/Çoğul (is/are)' hatası vardır? Doğrusunu yazın.\n1. The castle is very old.\n2. The walls are strong.\n3. The guards is watching the gate.\n4. The gate is huge.", answer: "The guards are watching the gate", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "You manage to pass the gate and see the old castle walls up close. They are extremely (1)huge and totally (2)silent, casting long shadows on the ground.", question: "'Big' kelimesinin eş anlamlısı paragrafta hangisidir? Kelimeyi yazın.", answer: "huge", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Open the gate carefully", question: "Ses kaydındaki cümleyi yazınız.", answer: "Open the gate carefully", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "You enter the castle garden silently, trying not to make a sound. ____. The red flowers look like blood in the pale moonlight.", options: ["It is a very beautiful place.", "My car is red.", "I like to sleep.", "The computer is broken."], question: "Boşluğa hangisi gelmeli?", answer: "It is a very beautiful place.", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He calls his guards.", "He goes out.", "He wears his crown.", "He wakes up.", "He eats breakfast."], question: "Kralın sabah rutinini doğru sıraya koyun.", answer: "He wakes up. He wears his crown. He eats breakfast. He calls his guards. He goes out.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What color is the sky?", options: ["Blue", "Red", "Green", "Yellow", "Black"], question: "Ses kaydını dinleyin ve doğru cevabı seçin.", answer: "Blue", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Aşağıdaki 3 hatalı cümleyi düzeltip alt alta yazın:\n1. The guards sleeps at the gate.\n2. The King want to escape.\n3. We is fighting for the crown.", answer: ["The guards sleep at the gate.", "The King wants to escape.", "We are fighting for the crown."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Deep inside the castle, you find an ancient scroll with royal words written on it.", question: "Bu kelimelerin Türkçesini virgülle ayırarak (boşluksuz) sırayla yazın: 1.Castle 2.Sword 3.Shield 4.Horse 5.Crown 6.Gold 7.Gate 8.Guard 9.Wall 10.King", answer: "kale,kılıç,kalkan,at,taç,altın,kapı,muhafız,duvar,kral", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "Suddenly a storm begins. It is raining ____ outside, making your mission even harder.", options: ["cats and dogs", "fish and chips", "birds and bees", "stones and rocks", "black and white"], question: "Boşluğa hangi deyim gelmelidir?", answer: "cats and dogs", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kelime kartlarını eşleştirin.", pairs: [{en:"King",tr:"Kral"},{en:"Gold",tr:"Altın"},{en:"Gate",tr:"Kapı"},{en:"Sun",tr:"Güneş"}], answer: "DONE", z: -290 }
    ]
  },
  // 2. KRALİÇE (Queen Mary)
  {
    id: "rescue_queen_en_a1", lang: "İngilizce", level: "A1", prisonerId: "kralice", targetName: "Queen Mary", targetEmoji: "👸",
    title: "The Rose Garden", 
    intro: "Queen Mary has disappeared into the enchanted forest near the river. Follow the trail of white roses to find her before the sun sets.",
    chestQuestion: "I am red or white. I have thorns but I smell sweet. People give me to show love. What am I?", 
    chestAnswer: "A rose",
    chestOptions: ["A rose", "An apple", "A tree", "A stone"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "She walks into the dark forest alone. The wind blows through the leaves.", question: "Hangi cümlede 'Tekil/Çoğul (is/are)' hatası vardır? Doğrusunu yazın.\n1. The sky is very blue.\n2. The trees is very tall.\n3. The forest is dark.\n4. The flower is beautiful.", answer: "The trees are very tall", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "She reaches a rushing river. The water is very (1)fast and extremely (2)cold, making it dangerous to swim.", question: "'Quick' kelimesinin eş anlamlısı paragrafta hangisidir? Kelimeyi yazın.", answer: "fast", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "She is lost in the woods", question: "Ses kaydındaki cümleyi yazınız.", answer: "She is lost in the woods", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "Suddenly, she sees a grey wolf hiding behind a large oak tree. ____. She starts to run away quickly.", options: ["It is a very big animal.", "The book is interesting.", "She is happy.", "The apple is red."], question: "Boşluğa hangisi gelmeli?", answer: "It is a very big animal.", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["She enters the garden.", "She finds a path.", "She walks fast.", "She opens the gate.", "She sees the light."], question: "Olayları sıralayın.", answer: "She finds a path. She walks fast. She sees the light. She opens the gate. She enters the garden.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What color is the grass?", options: ["Green", "Blue", "Red", "White", "Black"], question: "Ses kaydını dinleyin ve doğru cevabı seçin.", answer: "Green", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltip alt alta yazın:\n1. She walk in the dark forest.\n2. The wolves is very hungry.\n3. The river look dangerous.", answer: ["She walks in the dark forest.", "The wolves are very hungry.", "The river looks dangerous."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "You find strange stones with nature words carved on them.", question: "Çevirin (virgülle ayırın): 1.Forest 2.River 3.Wolf 4.Bird 5.Flower 6.Rose 7.Tree 8.Sky 9.Sun 10.Moon", answer: "orman,nehir,kurt,kuş,çiçek,gül,ağaç,gökyüzü,güneş,ay", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "The rescue mission was easier than you thought. It was a ____.", options: ["piece of cake", "break a leg", "cold feet", "big cheese", "hot potato"], question: "Hangi deyim 'çok kolay' anlamındadır?", answer: "piece of cake", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Red",tr:"Kırmızı"},{en:"Rose",tr:"Gül"},{en:"Tree",tr:"Ağaç"},{en:"Bee",tr:"Arı"}], answer: "DONE", z: -290 }
    ]
  },
  // 3. PRENS (Prince Harry)
  {
    id: "rescue_prince_en_a1", lang: "İngilizce", level: "A1", prisonerId: "prens", targetName: "Prince Harry", targetEmoji: "🤴",
    title: "The Dark Cave", 
    intro: "Prince Harry is trapped inside a deep, dark cave guarded by a goblin. He went there to find a legendary sword but never returned.",
    chestQuestion: "I have four legs but I cannot walk. You sit on me when you are tired. What am I?", 
    chestAnswer: "A chair",
    chestOptions: ["A chair", "A horse", "A dog", "A table"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "You enter the cave. It is damp and scary. You can hear water dripping.", question: "Hangi cümlede 'Tekil/Çoğul (is/are)' hatası vardır? Doğrusunu yazın.\n1. The cave is cold.\n2. The rocks is wet.\n3. The dark is scary.\n4. The light is dim.", answer: "The rocks are wet", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "A goblin appears from the shadows. The goblin is (1)angry and very (2)small, holding a rusty dagger.", question: "'Little' kelimesinin eş anlamlısı paragrafta hangisidir? Kelimeyi yazın.", answer: "small", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Run away fast", question: "Ses kaydındaki cümleyi yazınız.", answer: "Run away fast", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "You see something shining in the corner. The golden key is hidden nearby. ____.", options: ["It is under the rock.", "The sky is blue.", "He likes apples.", "She sings a song."], question: "Boşluğa hangisi gelmeli?", answer: "It is under the rock.", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He opens the door.", "He escapes.", "He finds a key.", "He sees the light.", "He puts it in the lock."], question: "Olayları sıralayın.", answer: "He finds a key. He puts it in the lock. He opens the door. He sees the light. He escapes.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "Is the cave bright or dark?", options: ["Dark", "Bright", "Sunny", "Hot", "Pink"], question: "Ses kaydını dinleyin ve doğru cevabı seçin.", answer: "Dark", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltip alt alta yazın:\n1. The goblin live in the cave.\n2. It have a sharp knife.\n3. The Prince want to run.", answer: ["The goblin lives in the cave.", "It has a sharp knife.", "The Prince wants to run."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "The walls of the cave are covered with ancient warnings.", question: "Çevirin (virgülle ayırın): 1.Cave 2.Dark 3.Rock 4.Stone 5.Bat 6.Spider 7.Web 8.Cold 9.Wet 10.Light", answer: "mağara,karanlık,kaya,taş,yarasa,örümcek,ağ,soğuk,ıslak,ışık", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "The goblin laughs and says: 'You have a fight tomorrow? ____!'", options: ["Break a leg", "Break an arm", "Break a head", "Break a foot", "Break a hand"], question: "Hangi deyim 'İyi şanslar' anlamına gelir?", answer: "Break a leg", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Eşleştir.", pairs: [{en:"Dark",tr:"Karanlık"},{en:"Cave",tr:"Mağara"},{en:"Bat",tr:"Yarasa"},{en:"Cold",tr:"Soğuk"}], answer: "DONE", z: -290 }
    ]
  },
  // 4. PRENSES (Princess Isabella)
  {
    id: "rescue_princess_en_a1", lang: "İngilizce", level: "A1", prisonerId: "prenses", targetName: "Princess Isabella", targetEmoji: "👸",
    title: "The High Tower", 
    intro: "Princess Isabella is locked in the highest tower of the castle. She is waiting for a hero to save her from the eternal sleep spell.",
    chestQuestion: "I am round and made of gold. People wear me on their fingers. What am I?", 
    chestAnswer: "A ring",
    chestOptions: ["A ring", "A ball", "A coin", "A plate"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "You look up at the castle. The tower is very high and touches the clouds.", question: "Hangi cümlede 'Tekil/Çoğul (is/are)' hatası vardır? Doğrusunu yazın.\n1. The tower is high.\n2. The windows is small.\n3. The princess is sad.\n4. The door is locked.", answer: "The windows are small", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "You finally reach her room. The princess is (1)beautiful and very (2)smart, reading a book by the window.", question: "'Pretty' kelimesinin eş anlamlısı paragrafta hangisidir? Kelimeyi yazın.", answer: "beautiful", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Open the window please", question: "Ses kaydındaki cümleyi yazınız.", answer: "Open the window please", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "She turns around and you see her face. She has long beautiful hair. ____.", options: ["It is yellow.", "The grass is green.", "Water is cold.", "Stones are hard."], question: "Boşluğa hangisi gelmeli?", answer: "It is yellow.", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["She smiles happily.", "He climbs the wall.", "He gives a flower.", "She takes the flower.", "He reaches the window."], question: "Olayları sıralayın.", answer: "He climbs the wall. He reaches the window. He gives a flower. She takes the flower. She smiles happily.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "How does she feel?", options: ["Happy", "Sad", "Angry", "Tired", "Sick"], question: "Ses kaydını dinleyin ve doğru cevabı seçin.", answer: "Happy", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltip alt alta yazın:\n1. She wait in the tower.\n2. The door are locked tight.\n3. He climb the wall now.", answer: ["She waits in the tower.", "The door is locked tight.", "He climbs the wall now."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "The room is filled with royal objects.", question: "Çevirin (virgülle ayırın): 1.Tower 2.Window 3.Hair 4.Dress 5.Pink 6.Smile 7.Cry 8.Wait 9.Climb 10.High", answer: "kule,pencere,saç,elbise,pembe,gülümse,ağla,bekle,tırman,yüksek", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "She wipes her tears and says: 'I must stop crying and pull myself ____.'", options: ["together", "apart", "up", "down", "left"], question: "Hangi deyim 'Kendine gel/Toparlan' anlamındadır?", answer: "together", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Eşleştir.", pairs: [{en:"High",tr:"Yüksek"},{en:"Low",tr:"Alçak"},{en:"Sad",tr:"Üzgün"},{en:"Happy",tr:"Mutlu"}], answer: "DONE", z: -290 }
    ]
  },
  // 5. LORD (Lord Edward)
  {
    id: "rescue_lord_en_a1", lang: "İngilizce", level: "A1", prisonerId: "lord", targetName: "Lord Edward", targetEmoji: "🧛",
    title: "The Dungeon", 
    intro: "Lord Edward was taken to the deepest dungeon of the enemy castle. It is cold, wet, and full of rats. You are his only hope.",
    chestQuestion: "I have legs but I cannot walk. I have a back but no spine. You sit on me. What am I?", 
    chestAnswer: "A chair",
    chestOptions: ["A chair", "A bed", "A table", "A sofa"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "You descend into the dungeon. It is very cold here and water drips from the ceiling.", question: "Hangi cümlede 'Tekil/Çoğul (is/are)' hatası vardır? Doğrusunu yazın.\n1. The dungeon is cold.\n2. The water is dirty.\n3. The rats is running.\n4. The Lord is tired.", answer: "The rats are running", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "You find the Lord sitting in the corner. The stone floor is (1)hard and very (2)dirty.", question: "'Solid' kelimesinin eş anlamlısı paragrafta hangisidir? Kelimeyi yazın.", answer: "hard", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Please help me now", question: "Ses kaydındaki cümleyi yazınız.", answer: "Please help me now", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "Lord Edward looks weak and pale. He wants some fresh water. ____.", options: ["He is very thirsty.", "The chair is comfortable.", "The table is round.", "She runs fast."], question: "Boşluğa hangisi gelmeli?", answer: "He is very thirsty.", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["Open the door.", "Find the guard.", "Run out fast.", "Take the key.", "Unlock the door."], question: "Olayları sıralayın.", answer: "Find the guard. Take the key. Unlock the door. Open the door. Run out fast.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What does he want to drink?", options: ["Water", "Food", "Gold", "Silver", "Milk"], question: "Ses kaydını dinleyin ve doğru cevabı seçin.", answer: "Water", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltip alt alta yazın:\n1. The dungeon are very cold.\n2. He drink dirty water.\n3. The rats runs on the floor.", answer: ["The dungeon is very cold.", "He drinks dirty water.", "The rats run on the floor."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "The dungeon is full of scary things.", question: "Çevirin (virgülle ayırın): 1.Dungeon 2.Cold 3.Wet 4.Rat 5.Chain 6.Lock 7.Key 8.Stone 9.Dark 10.Help", answer: "zindan,soğuk,ıslak,fare,zincir,kilit,anahtar,taş,karanlık,yardım", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "He looks at you with hope. 'Don't give up! Hang in ____,' you say.", options: ["there", "here", "out", "up", "down"], question: "Hangi deyim 'Dayan/Pes etme' anlamındadır?", answer: "there", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Eşleştir.", pairs: [{en:"Stone",tr:"Taş"},{en:"Iron",tr:"Demir"},{en:"Cold",tr:"Soğuk"},{en:"Key",tr:"Anahtar"}], answer: "DONE", z: -290 }
    ]
  },
  // 6. BÜYÜCÜ (Wizard)
  {
    id: "rescue_wizard_en_a1", lang: "İngilizce", level: "A1", prisonerId: "buyucu", targetName: "The Wizard", targetEmoji: "🧙‍♂️",
    title: "The Magic Tower", 
    intro: "The wise Wizard is stuck at the top of the Magic Tower. Without his spells, the kingdom is vulnerable. Climb the stairs and free him.",
    chestQuestion: "I have many keys but I have no locks. I have space but no room. You can play me. What am I?", 
    chestAnswer: "A piano",
    chestOptions: ["A piano", "A house", "A computer", "A car"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "You enter the tower filled with strange lights. Magic is real in this world, you can feel it.", question: "Hangi cümlede 'Tekil/Çoğul (is/are)' hatası vardır? Doğrusunu yazın.\n1. The magic is real.\n2. The stars is bright.\n3. The moon is full.\n4. The tower is tall.", answer: "The stars are bright", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The Wizard is standing by his cauldron. He is very (1)smart and very (2)old, with a long white beard.", question: "'Clever' kelimesinin eş anlamlısı paragrafta hangisidir? Kelimeyi yazın.", answer: "smart", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Where is my magic wand", question: "Ses kaydındaki cümleyi yazınız.", answer: "Where is my magic wand", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "He wears a long blue robe with mysterious symbols. ____. It has stars and moons on it.", options: ["He has a pointed hat.", "The car is fast.", "The dog barks.", "The sea is blue."], question: "Boşluğa hangisi gelmeli?", answer: "He has a pointed hat.", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["Say the secret spell.", "See the bright light.", "Read the magic book.", "Open the portal.", "Wave the magic wand."], question: "Olayları sıralayın.", answer: "Read the magic book. Say the secret spell. Wave the magic wand. See the bright light. Open the portal.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What shines at night?", options: ["Star", "Sun", "Moon", "Cloud", "Rain"], question: "Ses kaydını dinleyin ve doğru cevabı seçin.", answer: "Star", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltip alt alta yazın:\n1. He know a powerful spell.\n2. The stars shines bright.\n3. We uses magic wands.", answer: ["He knows a powerful spell.", "The stars shine bright.", "We use magic wands."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "The spellbook contains powerful words.", question: "Çevirin (virgülle ayırın): 1.Magic 2.Wand 3.Hat 4.Star 5.Moon 6.Spell 7.Book 8.Old 9.Wise 10.Owl", answer: "büyü,asa,şapka,yıldız,ay,büyü,kitap,yaşlı,bilge,baykuş", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "The Wizard smiles. 'This event happens only once in a ____ moon,' he says.", options: ["blue", "red", "green", "white", "black"], question: "Hangi deyim 'Çok nadir' anlamındadır?", answer: "blue", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Eşleştir.", pairs: [{en:"Magic",tr:"Büyü"},{en:"Star",tr:"Yıldız"},{en:"Hat",tr:"Şapka"},{en:"Book",tr:"Kitap"}], answer: "DONE", z: -290 }
    ]
  },
  // 7. VEZİR (Vizier)
  {
    id: "rescue_vizier_en_a1", lang: "İngilizce", level: "A1", prisonerId: "vezir", targetName: "The Vizier", targetEmoji: "👳",
    title: "The Grand Library", 
    intro: "The Vizier is locked in the Grand Library. He was looking for an ancient map but got trapped by a spell. Help him get out.",
    chestQuestion: "I have many leaves but I am not a tree. I have a spine but no bones. You read me. What am I?", 
    chestAnswer: "A book",
    chestOptions: ["A book", "A notebook", "A newspaper", "A letter"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "You enter the library. Thousands of books surround you. Books are very good friends.", question: "Hangi cümlede 'Tekil/Çoğul (is/are)' hatası vardır? Doğrusunu yazın.\n1. The library is quiet.\n2. The books is old.\n3. The room is big.\n4. The table is brown.", answer: "The books are old", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The atmosphere is scholarly. Please be very (1)quiet and (2)calm inside. People are reading and working here.", question: "'Silent' kelimesinin eş anlamlısı paragrafta hangisidir? Kelimeyi yazın.", answer: "quiet", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Listen to me well", question: "Ses kaydındaki cümleyi yazınız.", answer: "Listen to me well", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "The Vizier sits at the desk, looking tired. ____. He writes a letter to his family.", options: ["He uses a pen.", "The spoon is silver.", "The shoe is old.", "The sky is clear."], question: "Boşluğa hangisi gelmeli?", answer: "He uses a pen.", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["Turn the page.", "Take a book.", "Close the book.", "Read the first page.", "Open the book."], question: "Olayları sıralayın.", answer: "Take a book. Open the book. Read the first page. Turn the page. Close the book.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What is a book made of?", options: ["Paper", "Glass", "Metal", "Plastic", "Wood"], question: "Ses kaydını dinleyin ve doğru cevabı seçin.", answer: "Paper", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltip alt alta yazın:\n1. He read the old map.\n2. The library are very big.\n3. We looks for the secret book.", answer: ["He reads the old map.", "The library is very big.", "We look for the secret book."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "The library indexes are written in English.", question: "Çevirin (virgülle ayırın): 1.Read 2.Write 3.Listen 4.Speak 5.Book 6.Pen 7.Paper 8.Desk 9.Quiet 10.Room", answer: "oku,yaz,dinle,konuş,kitap,kalem,kağıt,sıra,sessiz,oda", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "The Vizier advises you: 'Never judge a book by its ____.'", options: ["cover", "pages", "title", "price", "author"], question: "Deyimdeki boşluğa ne gelmelidir?", answer: "cover", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Eşleştir.", pairs: [{en:"Read",tr:"Okumak"},{en:"Write",tr:"Yazmak"},{en:"Pen",tr:"Kalem"},{en:"Paper",tr:"Kağıt"}], answer: "DONE", z: -290 }
    ]
  },
  // 8. ŞÖVALYE (Knight)
  {
    id: "rescue_knight_en_a1", lang: "İngilizce", level: "A1", prisonerId: "sovalye", targetName: "The Knight", targetEmoji: "🛡️",
    title: "The Dragon's Cave", 
    intro: "The brave Knight went to fight the dragon but he got captured. He is now in the dragon's lair. You must be brave to save him.",
    chestQuestion: "I am full of holes but I can hold water. What am I?", 
    chestAnswer: "A sponge",
    chestOptions: ["A sponge", "A bucket", "A cup", "A bottle"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "You find the Knight preparing for battle. He is a very brave man, but he looks exhausted.", question: "Hangi cümlede 'Tekil/Çoğul (is/are)' hatası vardır? Doğrusunu yazın.\n1. The knight is brave.\n2. The dragon is scary.\n3. The sword is sharp.\n4. The enemies is weak.", answer: "The enemies are weak", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "Suddenly, the dragon appears! The dragon is (1)big and very (2)scary. Everyone runs away when they see it.", question: "'Afraid' kelimesinin eş anlamlısı paragrafta hangisidir? Kelimeyi yazın.", answer: "scary", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "You must be brave", question: "Ses kaydındaki cümleyi yazınız.", answer: "You must be brave", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "The Knight calls for his loyal friend. He rides a white animal. ____. It runs very fast in the field.", options: ["It is a horse.", "It is a cat.", "It is a fish.", "It is a bird."], question: "Boşluğa hangisi gelmeli?", answer: "It is a horse.", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["Win the battle.", "Run to the enemy.", "Draw the sword.", "See the enemy.", "Fight hard."], question: "Olayları sıralayın.", answer: "See the enemy. Draw the sword. Run to the enemy. Fight hard. Win the battle.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What does a knight use to fight?", options: ["Sword", "Pen", "Book", "Flower", "Phone"], question: "Ses kaydını dinleyin ve doğru cevabı seçin.", answer: "Sword", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltip alt alta yazın:\n1. The dragon breathe fire.\n2. He fight with a sword.\n3. We is not afraid.", answer: ["The dragon breathes fire.", "He fights with a sword.", "We are not afraid."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "The Knight's shield has values written on it.", question: "Çevirin (virgülle ayırın): 1.Knight 2.Sword 3.Shield 4.Horse 5.Fight 6.Win 7.Brave 8.Strong 9.Armor 10.War", answer: "şövalye,kılıç,kalkan,at,dövüş,kazan,cesur,güçlü,zırh,savaş", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "The Knight yells at you: 'Wait a minute! Hold your ____.'", options: ["horses", "dogs", "cats", "hands", "feet"], question: "Hangi deyim 'Bekle/Acele etme' anlamındadır?", answer: "horses", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Eşleştir.", pairs: [{en:"Sword",tr:"Kılıç"},{en:"Horse",tr:"At"},{en:"Brave",tr:"Cesur"},{en:"War",tr:"Savaş"}], answer: "DONE", z: -290 }
    ]
  },
  // 9. CASUS (Spy)
  {
    id: "rescue_spy_en_a1", lang: "İngilizce", level: "A1", prisonerId: "casus", targetName: "The Spy", targetEmoji: "🕵️",
    title: "The Enemy Camp", 
    intro: "The Spy has infiltrated the enemy camp to steal secret plans. But he was caught! He is held in a tent. Be quiet and save him.",
    chestQuestion: "The more you take of me, the more you leave behind. What am I?", 
    chestAnswer: "Footsteps",
    chestOptions: ["Footsteps", "Money", "Time", "Food"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "You sneak into the camp. It is late at night and the moon is hidden.", question: "Hangi cümlede 'Tekil/Çoğul (is/are)' hatası vardır? Doğrusunu yazın.\n1. The night is dark.\n2. The guards is sleeping.\n3. The camp is silent.\n4. The spy is hidden.", answer: "The guards are sleeping", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "You find the tent. Please be (1)quiet and very (2)quick. We must not wake up the guards outside.", question: "'Silent' kelimesinin eş anlamlısı paragrafta hangisidir? Kelimeyi yazın.", answer: "quiet", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "This is a secret code", question: "Ses kaydındaki cümleyi yazınız.", answer: "This is a secret code", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "The Spy is waiting for you. He hides in the dark corner. ____. No one can see him there.", options: ["He is in the shadows.", "The sun is bright.", "The fire is hot.", "The sky is blue."], question: "Boşluğa hangisi gelmeli?", answer: "He is in the shadows.", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["Jump down carefully.", "Wait for the night.", "Run away.", "Take the paper.", "Climb the high wall."], question: "Olayları sıralayın.", answer: "Wait for the night. Climb the high wall. Take the paper. Jump down carefully. Run away.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "When do spies work best?", options: ["Night", "Day", "Morning", "Afternoon", "Noon"], question: "Ses kaydını dinleyin ve doğru cevabı seçin.", answer: "Night", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltip alt alta yazın:\n1. He hide in the tent.\n2. The guards watches the camp.\n3. We moves very silently.", answer: ["He hides in the tent.", "The guards watch the camp.", "We move very silently."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "The secret documents are written in code.", question: "Çevirin (virgülle ayırın): 1.Spy 2.Secret 3.Night 4.Dark 5.Wall 6.Climb 7.Hide 8.Shadow 9.Quiet 10.Code", answer: "casus,gizli,gece,karanlık,duvar,tırman,saklan,gölge,sessiz,şifre", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "The guards see you! Oh no! The cat is out of the ____.", options: ["bag", "box", "house", "room", "car"], question: "Hangi deyim 'Sır açığa çıktı' anlamındadır?", answer: "bag", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Eşleştir.", pairs: [{en:"Spy",tr:"Casus"},{en:"Secret",tr:"Gizli"},{en:"Night",tr:"Gece"},{en:"Wall",tr:"Duvar"}], answer: "DONE", z: -290 }
    ]
  },



// =================================================================
  // --- İNGİLİZCE A2 SEVİYESİ (PRE-INTERMEDIATE) ---
  // =================================================================

  // 1. KRAL (King George - A2)
  {
    id: "rescue_king_en_a2", lang: "İngilizce", level: "A2", prisonerId: "kral", targetName: "King George", targetEmoji: "👑",
    title: "The Stolen Throne", 
    intro: "King George went hunting in the Dark Forest last week, but he never returned. Rumors say the Shadow Knight took him prisoner to steal the throne. You must act quickly!",
    chestQuestion: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", 
    chestAnswer: "A map",
    chestOptions: ["A map", "A globe", "A book", "A painting"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "You arrived at the castle yesterday. It looked abandoned and scary.", question: "Hangi cümlede 'Geçmiş Zaman (Past Tense)' hatası vardır? Doğrusunu yazın.\n1. The King walked into the forest.\n2. He taked his sword with him.\n3. The guards shouted loudly.\n4. It started to rain.", answer: "He took his sword with him", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The castle walls are (1)ancient and covered with moss. The gate is (2)gigantic, making you feel very small.", question: "'Very old' (Çok eski) kelimesinin eş anlamlısı paragrafta hangisidir? Kelimeyi yazın.", answer: "ancient", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "He was waiting for help", question: "Ses kaydındaki cümleyi yazınız.", answer: "He was waiting for help", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "You found a letter on the ground. It was written by the King. He said he was ____ dangerous people.", options: ["afraid of", "happy about", "interested in", "good at"], question: "Boşluğa hangisi gelmeli?", answer: "afraid of", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He left the castle.", "He rode his horse.", "He saw a dark shadow.", "He fought bravely.", "He was captured."], question: "Olayları oluş sırasına göre sıralayın.", answer: "He left the castle. He rode his horse. He saw a dark shadow. He fought bravely. He was captured.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "The King disappeared last week while he was hunting.", options: ["Yesterday", "Last week", "Tomorrow", "Now", "Two days ago"], question: "Ses kaydını dinleyin: Kral ne zaman kayboldu?", answer: "Last week", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Aşağıdaki 3 hatalı cümleyi düzeltip alt alta yazın:\n1. We didn't saw the enemy.\n2. The King were very brave.\n3. They goes to the castle yesterday.", answer: ["We didn't see the enemy.", "The King was very brave.", "They went to the castle yesterday."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "The royal guards left some equipment behind.", question: "Çevirin: 1.Throne 2.Crown 3.Kingdom 4.Enemy 5.Battle 6.Soldier 7.Weapon 8.Victory 9.Peace 10.Leader", answer: "taht,taç,krallık,düşman,savaş,asker,silah,zafer,barış,lider", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "You must hurry! Time ____ when you are having fun, but now every second counts.", options: ["flies", "runs", "walks", "jumps", "swims"], question: "Hangi deyim 'Zaman hızlı geçer' anlamındadır?", answer: "flies", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Yesterday",tr:"Dün"},{en:"Last Night",tr:"Dün Gece"},{en:"Ago",tr:"Önce"},{en:"Then",tr:"O Zaman"}], answer: "DONE", z: -290 }
    ]
  },

  // 2. KRALİÇE (Queen Mary - A2)
  {
    id: "rescue_queen_en_a2", lang: "İngilizce", level: "A2", prisonerId: "kralice", targetName: "Queen Mary", targetEmoji: "👸",
    title: "The Frozen Garden", 
    intro: "An evil sorcerer has frozen the royal garden while Queen Mary was walking there. She is trapped in ice! You need to find the fire spell to melt the ice and save her.",
    chestQuestion: "The more you dry, the wetter I become. What am I?", 
    chestAnswer: "A towel",
    chestOptions: ["A towel", "A sponge", "The sun", "Water"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The garden looks beautiful but dangerous. Everything is frozen.", question: "Hangi cümlede 'Karşılaştırma (Comparative)' hatası vardır?\n1. This tree is taller than that one.\n2. The ice is colder than water.\n3. The Queen is more beautiful than the witch.\n4. Winter is badder than summer.", answer: "Winter is worse than summer", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The sorcerer is very (1)wicked. He wants to destroy the kingdom. The Queen is (2)terrified inside the ice block.", question: "'Evil/Bad' (Kötü) kelimesinin eş anlamlısı hangisidir?", answer: "wicked", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "She was walking in the garden", question: "Ses kaydındaki cümleyi yazınız.", answer: "She was walking in the garden", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "It was snowing heavily ____ the Queen went out. She didn't see the sorcerer hiding.", options: ["when", "so", "because", "but"], question: "Boşluğa hangisi gelmeli?", answer: "when", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["The sun shone brightly.", "The sorcerer appeared.", "He cast a spell.", "It started to snow.", "The Queen froze."], question: "Olayları sıralayın.", answer: "The sun shone brightly. The sorcerer appeared. He cast a spell. It started to snow. The Queen froze.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "It was a beautiful sunny day before the snow started.", options: ["Sunny", "Rainy", "Snowy", "Windy", "Cloudy"], question: "Ses kaydını dinleyin: Olay günü hava nasıldı?", answer: "Sunny", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. She didn't went inside.\n2. The sorcerer were very strong.\n3. Why was she cry?", answer: ["She didn't go inside.", "The sorcerer was very strong.", "Why was she crying?"], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Magic words are written on the ice.", question: "Çevirin: 1.Freeze 2.Melt 3.Ice 4.Fire 5.Spell 6.Witch 7.Magic 8.Cold 9.Season 10.Spring", answer: "donmak,erimek,buz,ateş,büyü,cadı,sihir,soğuk,mevsim,ilkbahar", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "The Queen is feeling a bit ____ the weather today because of the cold.", options: ["under", "over", "in", "on", "at"], question: "Hangi deyim 'Hasta hissetmek' anlamındadır?", answer: "under", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Cold",tr:"Soğuk"},{en:"Hot",tr:"Sıcak"},{en:"Winter",tr:"Kış"},{en:"Summer",tr:"Yaz"}], answer: "DONE", z: -290 }
    ]
  },

  // 3. PRENS (Prince Harry - A2)
  {
    id: "rescue_prince_en_a2", lang: "İngilizce", level: "A2", prisonerId: "prens", targetName: "Prince Harry", targetEmoji: "🤴",
    title: "The Lost Map", 
    intro: "Prince Harry was exploring the ancient ruins to find a lost treasure map. He fell into a trap and broke his leg. You must find him and help him escape.",
    chestQuestion: "What goes up but never comes down?", 
    chestAnswer: "Age",
    chestOptions: ["Age", "Rain", "A ball", "A bird"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The ruins are full of traps. You must be careful.", question: "Hangi cümlede 'Modals (Zorunluluk)' hatası vardır?\n1. You must watch your step.\n2. You should bring water.\n3. You haven't to touch anything.\n4. We have to be quiet.", answer: "You haven't to touch anything", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The tunnel is extremely (1)narrow. It is hard to walk through. The Prince shouted, but his voice was (2)faint.", question: "'Weak/Quiet' (Zayıf/Sessiz) kelimesinin eş anlamlısı hangisidir?", answer: "faint", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "I was looking for the map", question: "Ses kaydındaki cümleyi yazınız.", answer: "I was looking for the map", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "The Prince cannot walk ____ his leg is broken. You need to make a splint.", options: ["because", "but", "so", "if"], question: "Boşluğa hangisi gelmeli?", answer: "because", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He entered the ruins.", "He saw a gold coin.", "He touched the coin.", "The floor opened.", "He fell down."], question: "Olayları sıralayın.", answer: "He entered the ruins. He saw a gold coin. He touched the coin. The floor opened. He fell down.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "I went to the ruins because I wanted to find a lost map.", options: ["Gold", "A map", "A sword", "A crown", "A ring"], question: "Ses kaydını dinleyin: Prens ne arıyordu?", answer: "A map", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. He were exploring alone.\n2. Did you found him?\n3. He don't have any water.", answer: ["He was exploring alone.", "Did you find him?", "He doesn't have any water."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "You see adventure words on the walls.", question: "Çevirin: 1.Explore 2.Ruins 3.Trap 4.Treasure 5.Map 6.Compass 7.North 8.Journey 9.Dangerous 10.Safe", answer: "keşfetmek,harabeler,tuzak,hazine,harita,pusula,kuzey,yolculuk,tehlikeli,güvenli", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "Finding the Prince in this huge cave is like finding a needle in a ____.", options: ["haystack", "box", "field", "river", "room"], question: "Hangi deyim 'Samanlıkta iğne aramak' demektir?", answer: "haystack", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Better",tr:"Daha İyi"},{en:"Worse",tr:"Daha Kötü"},{en:"More",tr:"Daha Fazla"},{en:"Less",tr:"Daha Az"}], answer: "DONE", z: -290 }
    ]
  },

  // 4. PRENSES (Princess Isabella - A2)
  {
    id: "rescue_princess_en_a2", lang: "İngilizce", level: "A2", prisonerId: "prenses", targetName: "Princess Isabella", targetEmoji: "👸",
    title: "The Mysterious Letter", 
    intro: "Princess Isabella received a mysterious letter and went to the seaside to meet someone. She hasn't returned since yesterday evening. Find her!",
    chestQuestion: "I belong to you, but others use me more than you do. What am I?", 
    chestAnswer: "My name",
    chestOptions: ["My name", "My money", "My car", "My phone"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "You are asking villagers about the Princess.", question: "Hangi cümlede 'Wh- Questions' hatası vardır?\n1. Where did she go?\n2. Who she met yesterday?\n3. Why is she crying?\n4. What happened here?", answer: "Who she met yesterday?", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The sea was (1)calm in the morning, but suddenly it became (2)stormy. The waves were huge.", question: "'Peaceful/Quiet' (Sakin) kelimesinin eş anlamlısı hangisidir?", answer: "calm", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Someone was following me", question: "Ses kaydındaki cümleyi yazınız.", answer: "Someone was following me", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "She wanted to come back home, ____ the storm was too strong. She had to stay in a fisherman's hut.", options: ["but", "so", "because", "or"], question: "Boşluğa hangisi gelmeli?", answer: "but", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["She read the letter.", "She went to the beach.", "She waited for hours.", "It started to rain.", "She found a shelter."], question: "Olayları sıralayın.", answer: "She read the letter. She went to the beach. She waited for hours. It started to rain. She found a shelter.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "The Princess traveled to the seaside by boat.", options: ["By bus", "On foot", "By boat", "By horse", "By car"], question: "Ses kaydını dinleyin: Prenses oraya nasıl gitti?", answer: "By boat", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Where was you yesterday?\n2. I didn't saw anyone.\n3. She were wearing a blue dress.", answer: ["Where were you yesterday?", "I didn't see anyone.", "She was wearing a blue dress."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "You find objects on the beach.", question: "Çevirin: 1.Ocean 2.Sand 3.Ship 4.Captain 5.Storm 6.Island 7.Letter 8.Secret 9.Meet 10.Return", answer: "okyanus,kum,gemi,kaptan,fırtına,ada,mektup,sır,buluşmak,dönmek", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "Don't tell anyone about this plan. Let's keep it under ____.", options: ["wraps", "table", "chair", "water", "ground"], question: "Hangi deyim 'Gizli tutmak' anlamındadır?", answer: "wraps", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Beautiful",tr:"Güzel"},{en:"Ugly",tr:"Çirkin"},{en:"Rich",tr:"Zengin"},{en:"Poor",tr:"Fakir"}], answer: "DONE", z: -290 }
    ]
  },

  // 5. LORD (Lord Edward - A2)
  {
    id: "rescue_lord_en_a2", lang: "İngilizce", level: "A2", prisonerId: "lord", targetName: "Lord Edward", targetEmoji: "🧛",
    title: "The Betrayal", 
    intro: "Lord Edward was holding a grand feast when his own guards betrayed him. They locked him in the wine cellar. He is plotting his escape.",
    chestQuestion: "What gets broken without being held?", 
    chestAnswer: "A promise",
    chestOptions: ["A promise", "A glass", "A bone", "A stone"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The cellar is dark and smells of old wine.", question: "Hangi cümlede 'There is/There are' hatası vardır?\n1. There is a small window.\n2. There are many barrels.\n3. There is two guards outside.\n4. There are some rats.", answer: "There is two guards outside", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The guards were very (1)noisy upstairs. They were laughing. The Lord felt (2)miserable in the cold cellar.", question: "'Loud' (Gürültülü) kelimesinin eş anlamlısı hangisidir?", answer: "noisy", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "They tricked me last night", question: "Ses kaydındaki cümleyi yazınız.", answer: "They tricked me last night", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "He has a lot of money, ____ he cannot buy his freedom right now. He needs a friend.", options: ["but", "because", "or", "so"], question: "Boşluğa hangisi gelmeli?", answer: "but", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["The feast began.", "The music played.", "The guards attacked.", "They grabbed the Lord.", "They locked him up."], question: "Olayları sıralayın.", answer: "The feast began. The music played. The guards attacked. They grabbed the Lord. They locked him up.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "My own guards betrayed me and locked me here.", options: ["His brother", "His wife", "The guards", "The King", "The cook"], question: "Ses kaydını dinleyin: Lord'a kim ihanet etti?", answer: "The guards", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Who did opened the door?\n2. He didn't expected this.\n3. We was eating dinner.", answer: ["Who opened the door?", "He didn't expect this.", "We were eating dinner."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "You see feast items on the table.", question: "Çevirin: 1.Feast 2.Wine 3.Guard 4.Prisoner 5.Betray 6.Lock 7.Cellar 8.Escape 9.Plan 10.Trust", answer: "ziyafet,şarap,muhafız,mahkum,ihanet,kilit,mahzen,kaçış,plan,güven", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "The Lord is very angry. He wants to give them a taste of their own ____.", options: ["medicine", "food", "wine", "money", "water"], question: "Hangi deyim 'Kendi silahıyla vurmak' anlamındadır?", answer: "medicine", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Noisy",tr:"Gürültülü"},{en:"Quiet",tr:"Sessiz"},{en:"Dark",tr:"Karanlık"},{en:"Light",tr:"Aydınlık"}], answer: "DONE", z: -290 }
    ]
  },

  // 6. BÜYÜCÜ (Wizard - A2)
  {
    id: "rescue_wizard_en_a2", lang: "İngilizce", level: "A2", prisonerId: "buyucu", targetName: "The Wizard", targetEmoji: "🧙‍♂️",
    title: "The Vanishing Spell", 
    intro: "The Wizard tried a new vanishing spell, but it went wrong! He accidentally transported himself to the Shadow Realm. You need to find the counter-spell book.",
    chestQuestion: "I'm tall when I'm young, and I'm short when I'm old. What am I?", 
    chestAnswer: "A candle",
    chestOptions: ["A candle", "A tree", "A person", "A building"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The Wizard's lab is messy.", question: "Hangi cümlede 'Present Continuous (Şimdiki Zaman)' hatası vardır?\n1. He is reading a book.\n2. The potion is boiling.\n3. The cat is sleep on the chair.\n4. I am looking for the spell.", answer: "The cat is sleep on the chair", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "This spell is very (1)complicated. It is not easy to understand. You need to be (2)intelligent to solve it.", question: "'Difficult/Hard' (Zor) kelimesinin eş anlamlısı hangisidir?", answer: "complicated", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "I made a big mistake", question: "Ses kaydındaki cümleyi yazınız.", answer: "I made a big mistake", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "He mixed the red potion ____ the blue potion. Then, everything exploded!", options: ["with", "at", "on", "from"], question: "Boşluğa hangisi gelmeli?", answer: "with", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He opened the bottle.", "He poured the liquid.", "Smoke came out.", "He coughed loudly.", "He disappeared."], question: "Olayları sıralayın.", answer: "He opened the bottle. He poured the liquid. Smoke came out. He coughed loudly. He disappeared.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "The potion turned green and started to bubble.", options: ["Red", "Blue", "Green", "Purple", "Black"], question: "Ses kaydını dinleyin: İksir ne renkti?", answer: "Green", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. What are you doing yesterday?\n2. She didn't helped me.\n3. The spell work very well.", answer: ["What were you doing yesterday?", "She didn't help me.", "The spell worked very well."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "The magical book has strange words.", question: "Çevirin: 1.Potion 2.Cauldron 3.Fly 4.Invisible 5.Power 6.Wrong 7.Mistake 8.Learn 9.Teach 10.Realm", answer: "iksir,kazan,uçmak,görünmez,güç,yanlış,hata,öğrenmek,öğretmek,diyar", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "This puzzle is extremely difficult. It's really ____ my mind.", options: ["blowing", "breaking", "taking", "making", "doing"], question: "Hangi deyim 'Aklını başından almak/Şaşırtmak' anlamındadır?", answer: "blowing", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Visible",tr:"Görünür"},{en:"Invisible",tr:"Görünmez"},{en:"Correct",tr:"Doğru"},{en:"Incorrect",tr:"Yanlış"}], answer: "DONE", z: -290 }
    ]
  },

  // 7. VEZİR (Vizier - A2)
  {
    id: "rescue_vizier_en_a2", lang: "İngilizce", level: "A2", prisonerId: "vezir", targetName: "The Vizier", targetEmoji: "👳",
    title: "The Locked Chamber", 
    intro: "The Vizier was solving a puzzle in the Royal Archives when the door slammed shut. The ancient mechanism locked him inside. He is running out of air.",
    chestQuestion: "What has a neck but no head?", 
    chestAnswer: "A shirt",
    chestOptions: ["A shirt", "A snake", "A bottle", "A giraffe"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The archives are full of dust.", question: "Hangi cümlede 'Have got/Has got' hatası vardır?\n1. The Vizier has got a plan.\n2. We have got the keys.\n3. The door have got a lock.\n4. You have got a torch.", answer: "The door has got a lock", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The Vizier is very (1)wise. He knows all the history. The room is (2)silent, perfect for reading.", question: "'Intelligent/Smart' (Zeki) kelimesinin eş anlamlısı hangisidir?", answer: "wise", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Can you hear my voice", question: "Ses kaydındaki cümleyi yazınız.", answer: "Can you hear my voice", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "He shouted for help, ____ nobody heard him. The walls were too thick.", options: ["so", "but", "because", "or"], question: "Boşluğa hangisi gelmeli?", answer: "but", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He entered the room.", "He saw an old map.", "The wind blew.", "The door slammed.", "He was locked in."], question: "Olayları sıralayın.", answer: "He entered the room. He saw an old map. The wind blew. The door slammed. He was locked in.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "I was studying the history of the kingdom when the door locked.", options: ["History", "Math", "Science", "Art", "Music"], question: "Ses kaydını dinleyin: Vezir ne çalışıyordu?", answer: "History", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. He were reading a book.\n2. There isn't some water.\n3. Did you unlocked the door?", answer: ["He was reading a book.", "There isn't any water.", "Did you unlock the door?"], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "The archive lists are important.", question: "Çevirin: 1.History 2.Story 3.Archive 4.Paper 5.Ink 6.Write 7.Read 8.Knowledge 9.Answer 10.Question", answer: "tarih,hikaye,arşiv,kağıt,mürekkep,yazmak,okumak,bilgi,cevap,soru", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "I can't remember the password. It's on the tip of my ____.", options: ["tongue", "finger", "nose", "head", "ear"], question: "Hangi deyim 'Dilimin ucunda' demektir?", answer: "tongue", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Thick",tr:"Kalın"},{en:"Thin",tr:"İnce"},{en:"Open",tr:"Açık"},{en:"Closed",tr:"Kapalı"}], answer: "DONE", z: -290 }
    ]
  },

  // 8. ŞÖVALYE (Knight - A2)
  {
    id: "rescue_knight_en_a2", lang: "İngilizce", level: "A2", prisonerId: "sovalye", targetName: "The Knight", targetEmoji: "🛡️",
    title: "The Tournament Trap", 
    intro: "The Knight entered a grand tournament in a distant land. However, it was a trap set by the bandits! They stole his armor and tied him up in the stables.",
    chestQuestion: "What has one eye, but can't see?", 
    chestAnswer: "A needle",
    chestOptions: ["A needle", "A pirate", "A storm", "A potato"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The bandits are celebrating tonight.", question: "Hangi cümlede 'Future (Going to)' hatası vardır?\n1. We are going to escape.\n2. He is going to fight.\n3. They are go to sleep.\n4. It is going to rain.", answer: "They are go to sleep", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The Knight is extremely (1)brave. He is not afraid of anything. The bandits are (2)cowardly, they only attack in groups.", question: "'Courageous' (Cesur) kelimesinin eş anlamlısı hangisidir?", answer: "brave", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "We are going to win", question: "Ses kaydındaki cümleyi yazınız.", answer: "We are going to win", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "He needs his sword, ____ he cannot fight without it. It is hidden in the captain's tent.", options: ["because", "so", "but", "that"], question: "Boşluğa hangisi gelmeli?", answer: "because", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He trained hard.", "He traveled far.", "He entered the arena.", "The bandits attacked.", "He lost his sword."], question: "Olayları sıralayın.", answer: "He trained hard. He traveled far. He entered the arena. The bandits attacked. He lost his sword.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "The bandits entered the tent and stole his armor.", options: ["His horse", "His money", "His armor", "His boots", "His helmet"], question: "Ses kaydını dinleyin: Haydutlar ne çaldı?", answer: "His armor", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. He fighted very well.\n2. We must to go now.\n3. The horse runned fast.", answer: ["He fought very well.", "We must go now.", "The horse ran fast."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Tournament rules are posted on the wall.", question: "Çevirin: 1.Tournament 2.Arena 3.Champion 4.Loser 5.Defeat 6.Attack 7.Defend 8.Honor 9.Skill 10.Crowd", answer: "turnuva,arena,şampiyon,kaybeden,yenilgi,saldırı,savunma,onur,yetenek,kalabalık", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "I'm feeling a bit tired, so I'm going to hit the ____.", options: ["sack", "road", "books", "gym", "wall"], question: "Hangi deyim 'Uyumaya gitmek' anlamındadır?", answer: "sack", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Win",tr:"Kazanmak"},{en:"Lose",tr:"Kaybetmek"},{en:"Strong",tr:"Güçlü"},{en:"Weak",tr:"Zayıf"}], answer: "DONE", z: -290 }
    ]
  },

  // 9. CASUS (Spy - A2)
  {
    id: "rescue_spy_en_a2", lang: "İngilizce", level: "A2", prisonerId: "casus", targetName: "The Spy", targetEmoji: "🕵️",
    title: "The Double Agent", 
    intro: "The Spy discovered that there is a double agent in the castle. Before he could tell the King, he was drugged and taken to a secret ship at the harbor.",
    chestQuestion: "I have keys but no locks. I have a space but no room. You can enter, but never go outside. What am I?", 
    chestAnswer: "A keyboard",
    chestOptions: ["A keyboard", "A piano", "A map", "A house"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "You are looking for clues at the harbor.", question: "Hangi cümlede 'Present Perfect' hatası vardır?\n1. I have found a note.\n2. She has saw the ship.\n3. We have been here before.\n4. They have gone away.", answer: "She has saw the ship", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The mission is (1)top-secret. Do not tell anyone. The enemy is very (2)clever, they might catch you.", question: "'Smart' (Zeki) kelimesinin eş anlamlısı hangisidir?", answer: "clever", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Don't trust anyone here", question: "Ses kaydındaki cümleyi yazınız.", answer: "Don't trust anyone here", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "He was wearing a black coat ____ nobody could recognize him in the dark.", options: ["so", "because", "but", "if"], question: "Boşluğa hangisi gelmeli?", answer: "so", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He found the document.", "He took a photo.", "He heard a noise.", "He hid under the table.", "He escaped silently."], question: "Olayları sıralayın.", answer: "He found the document. He took a photo. He heard a noise. He hid under the table. He escaped silently.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "The spy is being held on a large ship at the harbor.", options: ["A boat", "A ship", "A car", "A plane", "A train"], question: "Ses kaydını dinleyin: Casus nerede tutuluyor?", answer: "A ship", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Did you saw the signal?\n2. He play the piano yesterday.\n3. We was walking fast.", answer: ["Did you see the signal?", "He played the piano yesterday.", "We were walking fast."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Spy equipment list.", question: "Çevirin: 1.Disguise 2.Identity 3.Fake 4.Real 5.Information 6.Steal 7.Danger 8.Risk 9.Safe 10.Agent", answer: "kılık,kimlik,sahte,gerçek,bilgi,çalmak,tehlike,risk,kasa,ajan", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "To be a good spy, you must keep your ____ to the ground and listen carefully.", options: ["ear", "eye", "nose", "hand", "foot"], question: "Hangi deyim 'Etrafı dikkatlice dinlemek/kollamak' demektir?", answer: "ear", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"True",tr:"Doğru"},{en:"False",tr:"Yanlış"},{en:"Friend",tr:"Arkadaş"},{en:"Enemy",tr:"Düşman"}], answer: "DONE", z: -290 }
    ]
  },




// =================================================================
  // --- İNGİLİZCE B1 SEVİYESİ (INTERMEDIATE) ---
  // =================================================================

  // 1. KRAL (King George - B1)
  {
    id: "rescue_king_en_b1", lang: "İngilizce", level: "B1", prisonerId: "kral", targetName: "King George", targetEmoji: "👑",
    title: "The Rebellion", 
    intro: "A rebel faction has seized control of the capital. King George was taken hostage during the negotiations. The rebels demand the royal seal, but you must rescue the King before the deadline expires.",
    chestQuestion: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", 
    chestAnswer: "An echo",
    chestOptions: ["An echo", "A cloud", "A ghost", "A shadow"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The city has been occupied by the rebels since Monday. The streets are empty.", question: "Hangi cümlede 'Passive Voice' (Edilgen Çatı) hatası vardır? Doğrusunu yazın.\n1. The gates were closed by the guards.\n2. The message was sent yesterday.\n3. The King was capturing by the rebels.\n4. The bridge is being repaired.", answer: "The King was captured by the rebels", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The rebel leader is (1)ruthless. He doesn't care about the people. The citizens are (2)exhausted from the lack of food.", question: "'Tired' (Yorgun) kelimesinin daha güçlü eş anlamlısı hangisidir?", answer: "exhausted", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "We have been waiting for hours", question: "Ses kaydındaki cümleyi yazınız.", answer: "We have been waiting for hours", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "The King will be released ____ we agree to their demands. However, we cannot trust them.", options: ["if", "unless", "although", "despite"], question: "Boşluğa hangisi gelmeli? (Anlam: ...kabul etmezsek serbest bırakılmayacak)", answer: "unless", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["The negotiations failed.", "The rebels attacked.", "The King was taken away.", "He managed to send a signal.", "We received his location."], question: "Olayları sıralayın.", answer: "The negotiations failed. The rebels attacked. The King was taken away. He managed to send a signal. We received his location.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "Where are they keeping the King?", options: ["In the tower", "In the dungeon", "On a ship", "In the forest", "Under the bridge"], question: "Ses kaydını dinleyin: Kral nerede tutuluyor?", answer: "In the tower", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. If I know the code, I would tell you.\n2. She asked me where was the King.\n3. I haven't saw him since yesterday.", answer: ["If I knew the code, I would tell you.", "She asked me where the King was.", "I haven't seen him since yesterday."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "The rebellion manifesto contains these words.", question: "Çevirin: 1.Rebellion 2.Negotiation 3.Demand 4.Hostage 5.Occupy 6.Citizen 7.Freedom 8.Justice 9.Government 10.Law", answer: "isyan,müzakere,talep,rehin,işgal etmek,vatandaş,özgürlük,adalet,hükümet,kanun", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "The situation is getting worse. We just need to ____ the bullet and attack now.", options: ["bite", "hit", "shoot", "catch", "throw"], question: "Hangi deyim 'Zor bir duruma katlanmak/Dişini sıkmak' anlamındadır?", answer: "bite", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Capture",tr:"Yakalamak"},{en:"Release",tr:"Serbest Bırakmak"},{en:"Attack",tr:"Saldırmak"},{en:"Defend",tr:"Savunmak"}], answer: "DONE", z: -290 }
    ]
  },

  // 2. KRALİÇE (Queen Mary - B1)
  {
    id: "rescue_queen_en_b1", lang: "İngilizce", level: "B1", prisonerId: "kralice", targetName: "Queen Mary", targetEmoji: "👸",
    title: "The Poisoned Apple", 
    intro: "While attending a masquerade ball, Queen Mary fainted after eating a mysterious fruit. She has fallen into a deep coma. You must find the antidote before the poison spreads.",
    chestQuestion: "I can fly without wings. I can cry without eyes. Whenever I go, darkness follows me. What am I?", 
    chestAnswer: "A cloud",
    chestOptions: ["A cloud", "A bat", "A vampire", "A plane"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The doctors are worried about her condition.", question: "Hangi cümlede 'Present Perfect Continuous' hatası vardır?\n1. She has been sleeping for two days.\n2. The doctors have been trying everything.\n3. We has been looking for a cure.\n4. It has been raining all night.", answer: "We has been looking for a cure", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The poison is very (1)lethal. It acts quickly. The Queen looks (2)pale, like a ghost.", question: "'Deadly' (Ölümcül) kelimesinin eş anlamlısı hangisidir?", answer: "lethal", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "If I were you I would hurry", question: "Ses kaydındaki cümleyi yazınız.", answer: "If I were you I would hurry", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "The antidote is hidden in a cave ____ a dragon lives. It is a dangerous journey.", options: ["where", "which", "who", "whose"], question: "Boşluğa hangisi gelmeli? (Relative Clause)", answer: "where", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["She ate the fruit.", "She felt dizzy.", "She fell to the floor.", "The guards rushed in.", "They carried her to bed."], question: "Olayları sıralayın.", answer: "She ate the fruit. She felt dizzy. She fell to the floor. The guards rushed in. They carried her to bed.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What fruit did the Queen eat?", options: ["An apple", "A pear", "A grape", "A peach", "A berry"], question: "Ses kaydını dinleyin: Kraliçe ne yedi?", answer: "An apple", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. She said that she is feeling sick.\n2. I used to played here.\n3. The letter was wrote by the witch.", answer: ["She said that she was feeling sick.", "I used to play here.", "The letter was written by the witch."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Medical terms are needed.", question: "Çevirin: 1.Poison 2.Antidote 3.Cure 4.Medicine 5.Doctor 6.Patient 7.Illness 8.Health 9.Recover 10.Treatment", answer: "zehir,panzehir,tedavi,ilaç,doktor,hasta,hastalık,sağlık,iyileşmek,tedavi", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "I'm feeling a bit under the ____ today. I think I'm getting sick.", options: ["weather", "rain", "sun", "cloud", "storm"], question: "Hangi deyim 'Rahatsız/Hasta hissetmek' anlamındadır?", answer: "weather", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Sick",tr:"Hasta"},{en:"Healthy",tr:"Sağlıklı"},{en:"Alive",tr:"Canlı"},{en:"Dead",tr:"Ölü"}], answer: "DONE", z: -290 }
    ]
  },

  // 3. PRENS (Prince Harry - B1)
  {
    id: "rescue_prince_en_b1", lang: "İngilizce", level: "B1", prisonerId: "prens", targetName: "Prince Harry", targetEmoji: "🤴",
    title: "The Ancient Curse", 
    intro: "Prince Harry opened a forbidden tomb and unleashed an ancient curse. He is now trapped in a spectral dimension. To save him, you must solve the riddles of the Sphinx.",
    chestQuestion: "I have keys but no locks. I have a space but no room. You can enter, but never go outside. What am I?", 
    chestAnswer: "A keyboard",
    chestOptions: ["A keyboard", "A piano", "A map", "A house"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The Sphinx is blocking the way.", question: "Hangi cümlede 'Second Conditional' (If Type 2) hatası vardır?\n1. If I had wings, I would fly.\n2. If he were here, he would help us.\n3. If I know the answer, I would say it.\n4. If I lived in a castle, I would be happy.", answer: "If I know the answer, I would say it", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The Prince looks (1)terrified. The ghosts are haunting him. The atmosphere is (2)gloomy and dark.", question: "'Scared/Frightened' (Korkmuş) kelimesinin eş anlamlısı hangisidir?", answer: "terrified", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "The curse can be broken", question: "Ses kaydındaki cümleyi yazınız.", answer: "The curse can be broken", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "The Prince, ____ is usually very brave, is now shaking with fear.", options: ["who", "which", "whose", "where"], question: "Boşluğa hangisi gelmeli? (Relative Clause)", answer: "who", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He found the tomb.", "He read the inscription.", "He opened the lid.", "The smoke escaped.", "The curse began."], question: "Olayları sıralayın.", answer: "He found the tomb. He read the inscription. He opened the lid. The smoke escaped. The curse began.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "Who is guarding the Prince?", options: ["A mummy", "A ghost", "A sphinx", "A demon", "A vampire"], question: "Ses kaydını dinleyin: Prensi kim koruyor?", answer: "A sphinx", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. The door was open by the wind.\n2. He has work here for ten years.\n3. While I was sleep, the phone rang.", answer: ["The door was opened by the wind.", "He has worked here for ten years.", "While I was sleeping, the phone rang."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Ancient hieroglyphs cover the walls.", question: "Çevirin: 1.Curse 2.Tomb 3.Ancient 4.Spirit 5.Ghost 6.Haunt 7.Forbidden 8.Unleash 9.Dimension 10.Soul", answer: "lanet,mezar,antik,ruh,hayalet,musallat olmak,yasak,serbest bırakmak,boyut,ruh", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "This riddle is driving me crazy. I'm at my wits' ____.", options: ["end", "start", "point", "edge", "limit"], question: "Hangi deyim 'Çaresiz kalmak/Ne yapacağını bilememek' anlamındadır?", answer: "end", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Brave",tr:"Cesur"},{en:"Cowardly",tr:"Korkak"},{en:"Ancient",tr:"Antik"},{en:"Modern",tr:"Modern"}], answer: "DONE", z: -290 }
    ]
  },

  // 4. PRENSES (Princess Isabella - B1)
  {
    id: "rescue_princess_en_b1", lang: "İngilizce", level: "B1", prisonerId: "prenses", targetName: "Princess Isabella", targetEmoji: "👸",
    title: "The Diplomatic Mission", 
    intro: "Princess Isabella went to a neighboring kingdom for a peace treaty. However, she was accused of spying and put under house arrest. You must prove her innocence.",
    chestQuestion: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", 
    chestAnswer: "A map",
    chestOptions: ["A map", "A globe", "A book", "A painting"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "You need to talk to the guards.", question: "Hangi cümlede 'Reported Speech' (Dolaylı Anlatım) hatası vardır?\n1. He said that he was busy.\n2. She asked me where I lived.\n3. He told to me to go away.\n4. They said they were tired.", answer: "He told to me to go away", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The accusation is (1)absurd. The Princess is innocent. The King is (2)furious about this situation.", question: "'Ridiculous/Silly' (Saçma) kelimesinin eş anlamlısı hangisidir?", answer: "absurd", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "She denied all the accusations", question: "Ses kaydındaki cümleyi yazınız.", answer: "She denied all the accusations", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "This is the room ____ the secret documents were stolen.", options: ["where", "which", "that", "who"], question: "Boşluğa hangisi gelmeli?", answer: "where", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["She arrived at the palace.", "She signed the treaty.", "The alarm went off.", "Guards surrounded her.", "She was arrested."], question: "Olayları sıralayın.", answer: "She arrived at the palace. She signed the treaty. The alarm went off. Guards surrounded her. She was arrested.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "Who stole the documents?", options: ["The King", "The Queen", "The Duke", "The Maid", "The Guard"], question: "Ses kaydını dinleyin: Belgeleri kim çaldı?", answer: "The Duke", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. I look forward to see you.\n2. She is interested on politics.\n3. It was such a bore movie.", answer: ["I look forward to seeing you.", "She is interested in politics.", "It was such a boring movie."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Diplomatic words are essential.", question: "Çevirin: 1.Treaty 2.Peace 3.Accuse 4.Innocent 5.Guilty 6.Spy 7.Arrest 8.Proof 9.Evidence 10.Lawyer", answer: "antlaşma,barış,suçlamak,masum,suçlu,casus,tutuklamak,kanıt,delil,avukat", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "We need to solve this problem quickly. We shouldn't beat around the ____.", options: ["bush", "tree", "house", "garden", "corner"], question: "Hangi deyim 'Lafı dolandırmak' anlamındadır?", answer: "bush", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Guilty",tr:"Suçlu"},{en:"Innocent",tr:"Masum"},{en:"Truth",tr:"Gerçek"},{en:"Lie",tr:"Yalan"}], answer: "DONE", z: -290 }
    ]
  },

  // 5. LORD (Lord Edward - B1)
  {
    id: "rescue_lord_en_b1", lang: "İngilizce", level: "B1", prisonerId: "lord", targetName: "Lord Edward", targetEmoji: "🧛",
    title: "The Haunted Manor", 
    intro: "Lord Edward bought an old manor on the hill. Locals say it is haunted. The Lord went in to renovate it but hasn't come out for days. The doors are sealed shut.",
    chestQuestion: "I am light as a feather, yet the strongest man cannot hold me for much more than a minute. What am I?", 
    chestAnswer: "Breath",
    chestOptions: ["Breath", "A bubble", "A thought", "Smoke"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "You approach the spooky house.", question: "Hangi cümlede 'Past Continuous' hatası vardır?\n1. It was raining heavily.\n2. The wind was blowing.\n3. I was walking to the door.\n4. The ghost was scream loudly.", answer: "The ghost was scream loudly", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The manor is (1)enormous. It has fifty rooms. The hallway is (2)filthy, covered in dust and cobwebs.", question: "'Very dirty' (Çok kirli) kelimesinin eş anlamlısı hangisidir?", answer: "filthy", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Something is moving upstairs", question: "Ses kaydındaki cümleyi yazınız.", answer: "Something is moving upstairs", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "You shouldn't have come here alone. If I were you, I ____ call for backup.", options: ["would", "will", "can", "shall"], question: "Boşluğa hangisi gelmeli? (Second Conditional)", answer: "would", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He bought the house.", "He moved in.", "Strange noises started.", "He saw a ghost.", "He tried to escape."], question: "Olayları sıralayın.", answer: "He bought the house. He moved in. Strange noises started. He saw a ghost. He tried to escape.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "Where are the noises coming from?", options: ["The basement", "The attic", "The kitchen", "The bedroom", "The garden"], question: "Ses kaydını dinleyin: Sesler nereden geliyor?", answer: "The attic", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Have you ever see a ghost?\n2. She has went home.\n3. We have lived here since 5 years.", answer: ["Have you ever seen a ghost?", "She has gone home.", "We have lived here for 5 years."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Ghost hunting terms.", question: "Çevirin: 1.Haunted 2.Ghost 3.Spirit 4.Scary 5.Scream 6.Shadow 7.Midnight 8.Dust 9.Cobweb 10.Escape", answer: "perili,hayalet,ruh,korkunç,çığlık,gölge,gece yarısı,toz,örümcek ağı,kaçmak", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "When I saw the ghost, I jumped out of my ____.", options: ["skin", "head", "shoes", "clothes", "bed"], question: "Hangi deyim 'Ödü kopmak' anlamındadır?", answer: "skin", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Clean",tr:"Temiz"},{en:"Dirty",tr:"Kirli"},{en:"New",tr:"Yeni"},{en:"Old",tr:"Eski"}], answer: "DONE", z: -290 }
    ]
  },

  // 6. BÜYÜCÜ (Wizard - B1)
  {
    id: "rescue_wizard_en_b1", lang: "İngilizce", level: "B1", prisonerId: "buyucu", targetName: "The Wizard", targetEmoji: "🧙‍♂️",
    title: "The Alchemy Accident", 
    intro: "The Wizard was trying to turn lead into gold, but he created a black hole instead! The lab is collapsing into itself. You must stabilize the reaction.",
    chestQuestion: "What breaks yet never falls, and what falls yet never breaks?", 
    chestAnswer: "Day and Night",
    chestOptions: ["Day and Night", "Glass and Wood", "Heart and Soul", "Water and Ice"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The experiment was dangerous.", question: "Hangi cümlede 'Modals of Deduction' (Çıkarım) hatası vardır?\n1. It must be dangerous.\n2. He can't be at home.\n3. It might rains later.\n4. She must be tired.", answer: "It might rains later", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The explosion was (1)deafening. It was so loud. The Wizard was (2)baffled, he didn't understand what went wrong.", question: "'Confused' (Şaşırmış/Kafası karışmış) kelimesinin eş anlamlısı hangisidir?", answer: "baffled", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "The experiment has failed completely", question: "Ses kaydındaki cümleyi yazınız.", answer: "The experiment has failed completely", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "The book, ____ cover is made of dragon skin, contains the formula.", options: ["whose", "who", "which", "that"], question: "Boşluğa hangisi gelmeli?", answer: "whose", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He heated the metal.", "He added the powder.", "It turned green.", "It started to shake.", "It exploded."], question: "Olayları sıralayın.", answer: "He heated the metal. He added the powder. It turned green. It started to shake. It exploded.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What was the Wizard trying to make?", options: ["Gold", "Silver", "Lead", "Iron", "Copper"], question: "Ses kaydını dinleyin: Büyücü ne üretmeye çalışıyordu?", answer: "Gold", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. I have been knowing him for years.\n2. She is boring because she talks too much.\n3. The news are good today.", answer: ["I have known him for years.", "She is boring because she talks too much.", "The news is good today."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Alchemy elements.", question: "Çevirin: 1.Lead 2.Gold 3.Experiment 4.Explosion 5.Formula 6.Liquid 7.Solid 8.Gas 9.Reaction 10.Science", answer: "kurşun,altın,deney,patlama,formül,sıvı,katı,gaz,reaksiyon,bilim", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "It's not rocket ____. It's actually quite simple.", options: ["science", "fuel", "ship", "launch", "space"], question: "Hangi deyim 'Atla deve değil/Çok zor değil' anlamındadır?", answer: "science", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Success",tr:"Başarı"},{en:"Failure",tr:"Başarısızlık"},{en:"Simple",tr:"Basit"},{en:"Complex",tr:"Karmaşık"}], answer: "DONE", z: -290 }
    ]
  },

  // 7. VEZİR (Vizier - B1)
  {
    id: "rescue_vizier_en_b1", lang: "İngilizce", level: "B1", prisonerId: "vezir", targetName: "The Vizier", targetEmoji: "👳",
    title: "The Missing Scroll", 
    intro: "The Royal Seal has been stolen, and the Vizier is the main suspect! He is imprisoned in the High Tower. You must find the real thief and the missing scroll to prove his innocence.",
    chestQuestion: "What comes once in a minute, twice in a moment, but never in a thousand years?", 
    chestAnswer: "The letter M",
    chestOptions: ["The letter M", "The letter E", "Time", "The moon"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The evidence points to someone else.", question: "Hangi cümlede 'Tag Questions' hatası vardır?\n1. You are the detective, aren't you?\n2. He didn't steal it, did he?\n3. She can help us, can she?\n4. They were there, weren't they?", answer: "She can help us, can she?", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The thief was very (1)cautious. He left no fingerprints. The investigation is (2)ongoing.", question: "'Careful' (Dikkatli) kelimesinin eş anlamlısı hangisidir?", answer: "cautious", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "The truth will come out", question: "Ses kaydındaki cümleyi yazınız.", answer: "The truth will come out", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "The scroll ____ contained the secret law was burned in the fireplace.", options: ["which", "who", "where", "whose"], question: "Boşluğa hangisi gelmeli?", answer: "which", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["The thief entered.", "He opened the safe.", "He took the scroll.", "He locked the door.", "He ran away."], question: "Olayları sıralayın.", answer: "The thief entered. He opened the safe. He took the scroll. He locked the door. He ran away.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "Where was the scroll seen last?", options: ["In the library", "In the garden", "In the kitchen", "In the bedroom", "In the stable"], question: "Ses kaydını dinleyin: Parşömen en son nerede görüldü?", answer: "In the library", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. He told me that he is busy.\n2. If it will rain, we will stay home.\n3. I enjoy to read books.", answer: ["He told me that he was busy.", "If it rains, we will stay home.", "I enjoy reading books."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Legal terms.", question: "Çevirin: 1.Suspect 2.Thief 3.Steal 4.Prison 5.Evidence 6.Judge 7.Lawyer 8.Court 9.Innocent 10.Crime", answer: "şüpheli,hırsız,çalmak,hapishane,kanıt,hakim,avukat,mahkeme,masum,suç", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "The thief was caught red-____ while stealing the jewels.", options: ["handed", "faced", "footed", "eyed", "headed"], question: "Hangi deyim 'Suçüstü yakalanmak' anlamındadır?", answer: "handed", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Safe",tr:"Güvenli"},{en:"Dangerous",tr:"Tehlikeli"},{en:"Legal",tr:"Yasal"},{en:"Illegal",tr:"Yasadışı"}], answer: "DONE", z: -290 }
    ]
  },

  // 8. ŞÖVALYE (Knight - B1)
  {
    id: "rescue_knight_en_b1", lang: "İngilizce", level: "B1", prisonerId: "sovalye", targetName: "The Knight", targetEmoji: "🛡️",
    title: "The Ghostly Army", 
    intro: "A ghostly army has risen from the old battlefield. The Knight went to stop them but was surrounded. He is fighting bravely, but he needs backup immediately.",
    chestQuestion: "What is always in front of you but can’t be seen?", 
    chestAnswer: "The future",
    chestOptions: ["The future", "The past", "The wind", "Your nose"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The battle is fierce.", question: "Hangi cümlede 'Used to' hatası vardır?\n1. I used to be a soldier.\n2. She used to live here.\n3. He use to fight well.\n4. We didn't use to like war.", answer: "He use to fight well", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The ghost warriors are (1)immortal. They cannot be killed by normal weapons. The situation is (2)hopeless.", question: "'Eternal/Undying' (Ölümsüz) kelimesinin eş anlamlısı hangisidir?", answer: "immortal", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "They are attacking from all sides", question: "Ses kaydındaki cümleyi yazınız.", answer: "They are attacking from all sides", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "The sword ____ was given to him by the King is glowing blue.", options: ["which", "who", "where", "whose"], question: "Boşluğa hangisi gelmeli?", answer: "which", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["The fog appeared.", "The ghosts rose.", "The Knight drew his sword.", "He charged at them.", "They disappeared."], question: "Olayları sıralayın.", answer: "The fog appeared. The ghosts rose. The Knight drew his sword. He charged at them. They disappeared.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What can stop the ghosts?", options: ["Silver", "Iron", "Gold", "Magic", "Wood"], question: "Ses kaydını dinleyin: Hayaletleri ne durdurabilir?", answer: "Magic", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. He is enough strong to fight.\n2. It is too cold to go out.\n3. She is beautifuler than me.", answer: ["He is strong enough to fight.", "It is too cold to go out.", "She is more beautiful than me."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "War terms.", question: "Çevirin: 1.Army 2.Soldier 3.Weapon 4.Shield 5.Attack 6.Defend 7.Victory 8.Defeat 9.Commander 10.Brave", answer: "ordu,asker,silah,kalkan,saldırı,savunma,zafer,yenilgi,komutan,cesur", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "We have to fight tooth and ____ to win this battle.", options: ["nail", "bone", "blood", "hand", "foot"], question: "Hangi deyim 'Canla başla mücadele etmek' anlamındadır?", answer: "nail", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Win",tr:"Kazanmak"},{en:"Lose",tr:"Kaybetmek"},{en:"Friend",tr:"Dost"},{en:"Foe",tr:"Düşman"}], answer: "DONE", z: -290 }
    ]
  },

  // 9. CASUS (Spy - B1)
  {
    id: "rescue_spy_en_b1", lang: "İngilizce", level: "B1", prisonerId: "casus", targetName: "The Spy", targetEmoji: "🕵️",
    title: "The Invisible Ink", 
    intro: "The Spy intercepted a coded message written in invisible ink. Before he could decode it, he was captured by the Secret Police. You must find the decoding liquid.",
    chestQuestion: "I have a tail and a head, but no body. What am I?", 
    chestAnswer: "A coin",
    chestOptions: ["A coin", "A snake", "A cat", "A lizard"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "Decoding the message is hard.", question: "Hangi cümlede 'Gerund/Infinitive' hatası vardır?\n1. I want to go home.\n2. She enjoys playing tennis.\n3. He promised helping me.\n4. We decided to stay.", answer: "He promised helping me", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The message is (1)vital. The safety of the country depends on it. The code is (2)complex.", question: "'Important/Essential' (Önemli) kelimesinin eş anlamlısı hangisidir?", answer: "vital", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Hold the paper over the candle", question: "Ses kaydındaki cümleyi yazınız.", answer: "Hold the paper over the candle", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "The agent ____ gave me this information has disappeared.", options: ["who", "which", "whose", "where"], question: "Boşluğa hangisi gelmeli?", answer: "who", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He got the letter.", "He lit a candle.", "He held the paper over it.", "Words appeared.", "He read the secret."], question: "Olayları sıralayın.", answer: "He got the letter. He lit a candle. He held the paper over it. Words appeared. He read the secret.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What is the invisible ink made of?", options: ["Lemon juice", "Water", "Milk", "Ink", "Oil"], question: "Ses kaydını dinleyin: Görünmez mürekkep neyden yapılmış?", answer: "Lemon juice", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. This is the house where I born.\n2. She asked me if I am ready.\n3. I have never been to London.", answer: ["This is the house where I was born.", "She asked me if I was ready.", "I have never been to London."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Secret agent tools.", question: "Çevirin: 1.Invisible 2.Decode 3.Message 4.Secret 5.Police 6.Capture 7.Escape 8.Disguise 9.Fake 10.Identity", answer: "görünmez,çözmek,mesaj,sır,polis,yakalamak,kaçmak,kılık değiştirmek,sahte,kimlik", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "I accidentally spilled the ____ about the surprise party.", options: ["beans", "milk", "water", "tea", "coffee"], question: "Hangi deyim 'Ağzından kaçırmak/Sırrı ifşa etmek' anlamındadır?", answer: "beans", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"True",tr:"Doğru"},{en:"False",tr:"Yanlış"},{en:"Real",tr:"Gerçek"},{en:"Fake",tr:"Sahte"}], answer: "DONE", z: -290 }
    ]
  },




// =================================================================
  // --- İNGİLİZCE B2 SEVİYESİ (UPPER INTERMEDIATE) ---
  // =================================================================

  // 1. KRAL (King George - B2)
  {
    id: "rescue_king_en_b2", lang: "İngilizce", level: "B2", prisonerId: "kral", targetName: "King George", targetEmoji: "👑",
    title: "The Silent Coup", 
    intro: "A silent coup has taken place within the palace walls. King George has been detained in the Clock Tower under false pretenses. The conspirators are planning to announce his abdication tomorrow. You must expose their plot.",
    chestQuestion: "I can be cracked, made, told, and played. What am I?", 
    chestAnswer: "A joke",
    chestOptions: ["A joke", "A game", "A secret", "A puzzle"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The conspirators have been planning this for months. They are waiting for the right moment.", question: "Hangi cümlede 'Future Perfect' hatası vardır?\n1. By tomorrow, they will have taken control.\n2. We will have saved him by noon.\n3. They will have leave the city soon.\n4. I will have finished the plan.", answer: "They will have leave the city soon", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The King's imprisonment is (1)unlawful. The people are (2)outraged by this betrayal. We need to restore justice.", question: "'Illegal' (Yasadışı) kelimesinin eş anlamlısı hangisidir?", answer: "unlawful", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "By the time you arrive it will be too late", question: "Ses kaydındaki cümleyi yazınız.", answer: "By the time you arrive it will be too late", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "The King won't sign the document ____ they threaten his family. He is stubborn.", options: ["even if", "provided that", "in case", "unless"], question: "Boşluğa hangisi gelmeli? (Zıtlık bildiren bağlaç)", answer: "even if", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["The plot was discovered.", "Evidence was gathered.", "The King was informed.", "The guards were bribed.", "The coup began."], question: "Olayları mantık sırasına koyun.", answer: "The guards were bribed. The plot was discovered. The coup began. Evidence was gathered. The King was informed.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "Who is leading the coup against the King?", options: ["The Prime Minister", "The General", "The Queen", "The Jester", "The Prince"], question: "Ses kaydını dinleyin: Darbeyi kim yönetiyor?", answer: "The General", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. If I had knew, I would have come.\n2. I wish I am rich.\n3. He admitted to steal the crown.", answer: ["If I had known, I would have come.", "I wish I were rich.", "He admitted to stealing the crown."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Political terms.", question: "Çevirin: 1.Coup 2.Conspiracy 3.Betrayal 4.Abdicate 5.Detain 6.Plot 7.Expose 8.Traitor 9.Loyalty 10.Regime", answer: "darbe,komplo,ihanet,tahttan çekilmek,alıkoymak,plan,ifşa etmek,hain,sadakat,rejim", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "We need to act now. We shouldn't put all our ____ in one basket.", options: ["eggs", "apples", "coins", "cards", "hopes"], question: "Hangi deyim 'Tüm riski tek bir yere yüklememek' anlamındadır?", answer: "eggs", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Legal",tr:"Yasal"},{en:"Illicit",tr:"Yasadışı"},{en:"Public",tr:"Halka Açık"},{en:"Private",tr:"Özel"}], answer: "DONE", z: -290 }
    ]
  },

  // 2. KRALİÇE (Queen Mary - B2)
  {
    id: "rescue_queen_en_b2", lang: "İngilizce", level: "B2", prisonerId: "kralice", targetName: "Queen Mary", targetEmoji: "👸",
    title: "The Mirror Dimension", 
    intro: "Queen Mary touched a cursed mirror and was pulled into a reflection dimension. To bring her back, you must find the shattered pieces of the original mirror and reassemble them.",
    chestQuestion: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", 
    chestAnswer: "A map",
    chestOptions: ["A map", "A painting", "A globe", "A photo"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The reflection world is strange.", question: "Hangi cümlede 'Third Conditional' (If Type 3) hatası vardır?\n1. If she hadn't touched it, she would be here.\n2. If I had seen the sign, I wouldn't have entered.\n3. If we had hurried, we would have saved her.\n4. If he had asked, I would help him.", answer: "If he had asked, I would help him", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The dimension is (1)bizarre. Everything is backwards. The Queen feels (2)disoriented and confused.", question: "'Strange/Weird' (Tuhaf) kelimesinin eş anlamlısı hangisidir?", answer: "bizarre", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "I wish I hadn't touched the mirror", question: "Ses kaydındaki cümleyi yazınız.", answer: "I wish I hadn't touched the mirror", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "She would have escaped by now ____ she known the secret code.", options: ["had", "if", "unless", "provided"], question: "Boşluğa hangisi gelmeli? (Inversion in Conditionals)", answer: "had", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["She saw her reflection.", "The glass cracked.", "A hand reached out.", "She was pulled in.", "The mirror shattered."], question: "Olayları sıralayın.", answer: "She saw her reflection. The glass cracked. A hand reached out. She was pulled in. The mirror shattered.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What did she see in the mirror?", options: ["A ghost", "Her evil twin", "A demon", "A witch", "Nothing"], question: "Ses kaydını dinleyin: Aynada ne gördü?", answer: "Her evil twin", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. I'm not used to wake up early.\n2. Despite it was raining, we went out.\n3. You had better to go now.", answer: ["I'm not used to waking up early.", "Despite the rain, we went out.", "You had better go now."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Reflection terms.", question: "Çevirin: 1.Reflection 2.Dimension 3.Shatter 4.Fragment 5.Distorted 6.Illusion 7.Reality 8.Vanish 9.Reverse 10.Trap", answer: "yansıma,boyut,parçalanmak,parça,bozulmuş,illüzyon,gerçeklik,yok olmak,ters,tuzak", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "Finding the pieces is going to be a wild ____ chase.", options: ["goose", "duck", "wolf", "cat", "dog"], question: "Hangi deyim 'Boşa kürek çekmek/Umutsuz arayış' anlamındadır?", answer: "goose", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Fragile",tr:"Kırılgan"},{en:"Tough",tr:"Dayanıklı"},{en:"Fake",tr:"Sahte"},{en:"Genuine",tr:"Gerçek"}], answer: "DONE", z: -290 }
    ]
  },

  // 3. PRENS (Prince Harry - B2)
  {
    id: "rescue_prince_en_b2", lang: "İngilizce", level: "B2", prisonerId: "prens", targetName: "Prince Harry", targetEmoji: "🤴",
    title: "The Mind Game", 
    intro: "Prince Harry has been captured by a psychic warlock. He is trapped in a maze within his own mind. You must enter his subconscious and help him distinguish reality from illusion.",
    chestQuestion: "What belongs to you but others use it more than you?", 
    chestAnswer: "Your name",
    chestOptions: ["Your name", "Your money", "Your time", "Your patience"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The warlock is manipulating his memories.", question: "Hangi cümlede 'Mixed Conditional' hatası vardır?\n1. If I hadn't eaten that, I wouldn't be sick now.\n2. If she had studied, she would pass the exam today.\n3. If he were smarter, he wouldn't have made that mistake.\n4. If I lived here, I would have seen him.", answer: "If she had studied, she would pass the exam today", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The maze is (1)perplexing. It changes constantly. The Prince is (2)anxious about losing his mind forever.", question: "'Confusing' (Kafa karıştırıcı) kelimesinin eş anlamlısı hangisidir?", answer: "perplexing", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "He must have lost his way", question: "Ses kaydındaki cümleyi yazınız.", answer: "He must have lost his way", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "It is high time he ____ the truth about his past.", options: ["learned", "learns", "has learned", "learning"], question: "Boşluğa hangisi gelmeli? (It's high time + Past Simple)", answer: "learned", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He closed his eyes.", "He heard a whisper.", "A memory surfaced.", "He realized the truth.", "The illusion broke."], question: "Olayları sıralayın.", answer: "He closed his eyes. He heard a whisper. A memory surfaced. He realized the truth. The illusion broke.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What is the warlock using against the Prince?", options: ["His father", "His childhood", "A war", "His fears", "A monster"], question: "Ses kaydını dinleyin: Warlock neyi kullanıyor?", answer: "His fears", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. I regret to inform you that he escape.\n2. Never I have seen such a thing.\n3. He denied to break the vase.", answer: ["I regret to inform you that he escaped.", "Never have I seen such a thing.", "He denied breaking the vase."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Psychological terms.", question: "Çevirin: 1.Subconscious 2.Illusion 3.Reality 4.Nightmare 5.Memory 6.Sanity 7.Madness 8.Control 9.Manipulate 10.Awake", answer: "bilinçaltı,illüzyon,gerçeklik,kabus,hafıza,akıl sağlığı,delilik,kontrol,manipüle etmek,uyanık", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "Don't let him trick you. You need to keep your ____ about you.", options: ["wits", "head", "mind", "brain", "eyes"], question: "Hangi deyim 'Soğukkanlılığını korumak/Dikkatli olmak' anlamındadır?", answer: "wits", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Remember",tr:"Hatırlamak"},{en:"Forget",tr:"Unutmak"},{en:"Real",tr:"Gerçek"},{en:"Imaginary",tr:"Hayali"}], answer: "DONE", z: -290 }
    ]
  },

  // 4. PRENSES (Princess Isabella - B2)
  {
    id: "rescue_princess_en_b2", lang: "İngilizce", level: "B2", prisonerId: "prenses", targetName: "Princess Isabella", targetEmoji: "👸",
    title: "The Covert Operation", 
    intro: "Princess Isabella is actually a secret agent. She was investigating a corrupt Duke when she was compromised. She is being held at a masquerade ball, surrounded by enemies.",
    chestQuestion: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", 
    chestAnswer: "An echo",
    chestOptions: ["An echo", "A whisper", "A ghost", "A thought"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "She needs to send a signal.", question: "Hangi cümlede 'Causative' (Ettirgen) hatası vardır?\n1. She had the letter delivered.\n2. She got the guard to help her.\n3. She made him to confess.\n4. She let him go.", answer: "She made him to confess", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The Duke is (1)corrupt. He takes bribes. The situation is (2)critical, we have no time to lose.", question: "'Dishonest' (Sahtekar/Yozlaşmış) kelimesinin eş anlamlısı hangisidir?", answer: "corrupt", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "I should have been more careful", question: "Ses kaydındaki cümleyi yazınız.", answer: "I should have been more careful", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "____ did she know that the Duke was watching her every move.", options: ["Little", "Few", "Only", "Never"], question: "Boşluğa hangisi gelmeli? (Inversion - Little did she know...)", answer: "Little", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["She wore a disguise.", "She entered the ballroom.", "She spotted the target.", "The music stopped.", "She was surrounded."], question: "Olayları sıralayın.", answer: "She wore a disguise. She entered the ballroom. She spotted the target. The music stopped. She was surrounded.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What is the Princess hiding?", options: ["A microfilm", "A key", "A letter", "A weapon", "A diamond"], question: "Ses kaydını dinleyin: Prenses ne saklıyor?", answer: "A microfilm", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. I suggest that she waits here.\n2. It is vital that he is ready.\n3. If I was you, I would leave.", answer: ["I suggest that she wait here.", "It is vital that he be ready.", "If I were you, I would leave."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Espionage terms.", question: "Çevirin: 1.Undercover 2.Mission 3.Target 4.Surveillance 5.Compromise 6.Asset 7.Extract 8.Intel 9.Cipher 10.Bribe", answer: "gizli görev,görev,hedef,gözetim,tehlikeye atmak,varlık,çıkarmak,istihbarat,şifre,rüşvet", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "We need to get to the bottom of this. Let's leave no stone ____.", options: ["unturned", "moved", "rolled", "touched", "broken"], question: "Hangi deyim 'Her yere bakmak/Araştırmak' anlamındadır?", answer: "unturned", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Friend",tr:"Dost"},{en:"Foe",tr:"Düşman"},{en:"Public",tr:"Açık"},{en:"Secret",tr:"Gizli"}], answer: "DONE", z: -290 }
    ]
  },

  // 5. LORD (Lord Edward - B2)
  {
    id: "rescue_lord_en_b2", lang: "İngilizce", level: "B2", prisonerId: "lord", targetName: "Lord Edward", targetEmoji: "🧛",
    title: "The Family Secret", 
    intro: "Lord Edward discovered a terrible secret about his lineage in the crypts. He has been missing since he went down there. The crypts are filled with ancient traps and riddles.",
    chestQuestion: "What begins with T, ends with T, and has T in it?", 
    chestAnswer: "A teapot",
    chestOptions: ["A teapot", "A tent", "A ticket", "A toast"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "He entered the crypt alone.", question: "Hangi cümlede 'Modals of Deduction (Past)' hatası vardır?\n1. He must have lost his way.\n2. He can't have opened that door.\n3. He might has seen something.\n4. He should have brought a light.", answer: "He might has seen something", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The crypt is (1)gloomy. It is very dark and depressing. The inscriptions are (2)illegible, you can't read them.", question: "'Unreadable' (Okunamaz) kelimesinin eş anlamlısı hangisidir?", answer: "illegible", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "He can't have gone far", question: "Ses kaydındaki cümleyi yazınız.", answer: "He can't have gone far", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "____ had he opened the coffin than the trap activated.", options: ["No sooner", "Hardly", "Scarcely", "Barely"], question: "Boşluğa hangisi gelmeli? (No sooner... than)", answer: "No sooner", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He lit the torch.", "He walked down.", "He found the tomb.", "He deciphered the text.", "He gasped in horror."], question: "Olayları sıralayın.", answer: "He lit the torch. He walked down. He found the tomb. He deciphered the text. He gasped in horror.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What did the Lord find?", options: ["A treasure", "A skeleton", "A diary", "A weapon", "A curse"], question: "Ses kaydını dinleyin: Lord ne buldu?", answer: "A diary", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. I prefer walk than drive.\n2. He stopped to smoke (ceased habit).\n3. I am looking forward to meet you.", answer: ["I prefer walking to driving.", "He stopped smoking.", "I am looking forward to meeting you."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Ancestral words.", question: "Çevirin: 1.Ancestor 2.Descendant 3.Lineage 4.Inherit 5.Legacy 6.Crypt 7.Bury 8.Grave 9.Secret 10.Reveal", answer: "ata,soyundan gelen,soy,miras almak,miras,mahzen mezar,gömmek,mezar,sır,ortaya çıkarmak", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "This secret must be kept. Don't let the cat out of the ____.", options: ["bag", "hat", "box", "house", "sack"], question: "Hangi deyim 'Sırrı bozmak' anlamındadır?", answer: "bag", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Past",tr:"Geçmiş"},{en:"Future",tr:"Gelecek"},{en:"Life",tr:"Hayat"},{en:"Death",tr:"Ölüm"}], answer: "DONE", z: -290 }
    ]
  },

  // 6. BÜYÜCÜ (Wizard - B2)
  {
    id: "rescue_wizard_en_b2", lang: "İngilizce", level: "B2", prisonerId: "buyucu", targetName: "The Wizard", targetEmoji: "🧙‍♂️",
    title: "The Time Loop", 
    intro: "The Wizard has trapped himself in a time loop while trying to fix a past mistake. He is reliving the same day over and over. You must enter the loop and break the cycle.",
    chestQuestion: "I have no life, but I can die. What am I?", 
    chestAnswer: "A battery",
    chestOptions: ["A battery", "A star", "A fire", "A story"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "He keeps making the same mistake.", question: "Hangi cümlede 'Wish Clause' hatası vardır?\n1. I wish I hadn't done that.\n2. I wish I know the answer.\n3. I wish it would stop raining.\n4. I wish I were home.", answer: "I wish I know the answer", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The loop is (1)monotonous. It is boring and repetitive. The Wizard is (2)frustrated because he can't escape.", question: "'Repetitive/Boring' (Tekdüze) kelimesinin eş anlamlısı hangisidir?", answer: "monotonous", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "If only I had listened", question: "Ses kaydındaki cümleyi yazınız.", answer: "If only I had listened", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "By this time tomorrow, he ____ the same day a hundred times.", options: ["will have repeated", "will repeat", "is repeating", "repeats"], question: "Boşluğa hangisi gelmeli? (Future Perfect)", answer: "will have repeated", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He woke up.", "He cast the spell.", "It failed.", "The day reset.", "He woke up again."], question: "Olayları sıralayın.", answer: "He woke up. He cast the spell. It failed. The day reset. He woke up again.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What broke the time loop?", options: ["A clock", "A crystal", "A wand", "A book", "A potion"], question: "Ses kaydını dinleyin: Döngüyü ne kırdı?", answer: "A crystal", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. It is time we go home.\n2. I'd rather you didn't stayed.\n3. Suppose you won the lottery.", answer: ["It is time we went home.", "I'd rather you didn't stay.", "Suppose you won the lottery."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Time travel words.", question: "Çevirin: 1.Future 2.Past 3.Present 4.Loop 5.Repeat 6.Mistake 7.Fix 8.Eternity 9.Moment 10.Clock", answer: "gelecek,geçmiş,şimdi,döngü,tekrar etmek,hata,düzeltmek,sonsuzluk,an,saat", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "We are running out of time. It's now or ____.", options: ["never", "later", "ever", "forever", "always"], question: "Hangi deyim 'Ya şimdi ya hiç' anlamındadır?", answer: "never", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Temporary",tr:"Geçici"},{en:"Permanent",tr:"Kalıcı"},{en:"Start",tr:"Başla"},{en:"Finish",tr:"Bitir"}], answer: "DONE", z: -290 }
    ]
  },

  // 7. VEZİR (Vizier - B2)
  {
    id: "rescue_vizier_en_b2", lang: "İngilizce", level: "B2", prisonerId: "vezir", targetName: "The Vizier", targetEmoji: "👳",
    title: "The Cipher", 
    intro: "The Vizier has been kidnapped by a secret society. They want him to decode an ancient alien artifact. He has left clues in his office, written in a complex cipher.",
    chestQuestion: "What can travel around the world while staying in a corner?", 
    chestAnswer: "A stamp",
    chestOptions: ["A stamp", "A plane", "A fly", "A letter"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The clues are hidden well.", question: "Hangi cümlede 'Inversion' (Devrik Cümle) hatası vardır?\n1. Rarely have I seen such a code.\n2. Little did he know the truth.\n3. Never I have been so confused.\n4. Under no circumstances should you open it.", answer: "Never I have been so confused", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The artifact is (1)intriguing. It fascinates everyone. Its origin is (2)obscure, nobody knows where it came from.", question: "'Unknown/Unclear' (Belirsiz/Bilinmeyen) kelimesinin eş anlamlısı hangisidir?", answer: "obscure", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "The code is unbreakable", question: "Ses kaydındaki cümleyi yazınız.", answer: "The code is unbreakable", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "He is believed ____ the smartest man in the kingdom.", options: ["to be", "being", "is", "be"], question: "Boşluğa hangisi gelmeli? (Passive + Infinitive)", answer: "to be", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He examined the artifact.", "He found a pattern.", "He wrote a note.", "He hid the note.", "He was kidnapped."], question: "Olayları sıralayın.", answer: "He examined the artifact. He found a pattern. He wrote a note. He hid the note. He was kidnapped.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What is the code about?", options: ["Mathematics", "Astronomy", "Biology", "Chemistry", "Physics"], question: "Ses kaydını dinleyin: Şifre neyle ilgili?", answer: "Astronomy", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. It's no use to cry over spilt milk.\n2. She succeeded to open the box.\n3. I suggest you to go.", answer: ["It's no use crying over spilt milk.", "She succeeded in opening the box.", "I suggest that you go."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Cryptography terms.", question: "Çevirin: 1.Cipher 2.Code 3.Decode 4.Encrypt 5.Pattern 6.Symbol 7.Language 8.Meaning 9.Secret 10.Message", answer: "şifre,kod,çözmek,şifrelemek,desen,sembol,dil,anlam,sır,mesaj", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "I can't understand this code. It's all ____ to me.", options: ["Greek", "Latin", "French", "Spanish", "German"], question: "Hangi deyim 'Hiçbir şey anlamadım/Fransız kaldım' anlamındadır?", answer: "Greek", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Hide",tr:"Saklamak"},{en:"Reveal",tr:"Göstermek"},{en:"Lost",tr:"Kayıp"},{en:"Found",tr:"Bulunmuş"}], answer: "DONE", z: -290 }
    ]
  },

  // 8. ŞÖVALYE (Knight - B2)
  {
    id: "rescue_knight_en_b2", lang: "İngilizce", level: "B2", prisonerId: "sovalye", targetName: "The Knight", targetEmoji: "🛡️",
    title: "The Last Stand", 
    intro: "The Knight is holding the bridge alone against an invading army. He promised to hold them off until reinforcements arrive. He is tired and wounded.",
    chestQuestion: "I have a head and a tail that will never meet. Having too many of me is always a treat. What am I?", 
    chestAnswer: "A coin",
    chestOptions: ["A coin", "A cat", "A dog", "A snake"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "He is waiting for help.", question: "Hangi cümlede 'Future Continuous' hatası vardır?\n1. This time tomorrow, we will be fighting.\n2. They will be arriving soon.\n3. He will be waiting for us.\n4. I will being sleeping.", answer: "I will being sleeping", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The enemy army is (1)vast. There are thousands of them. The Knight is (2)exhausted, but he refuses to give up.", question: "'Huge/Enormous' (Çok büyük) kelimesinin eş anlamlısı hangisidir?", answer: "vast", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "They must not pass", question: "Ses kaydındaki cümleyi yazınız.", answer: "They must not pass", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "____ tired he is, he will never surrender.", options: ["However", "Although", "Despite", "Whatever"], question: "Boşluğa hangisi gelmeli? (However + adj)", answer: "However", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["The enemy charged.", "He blocked the bridge.", "He fought bravely.", "His shield broke.", "Reinforcements arrived."], question: "Olayları sıralayın.", answer: "The enemy charged. He blocked the bridge. He fought bravely. His shield broke. Reinforcements arrived.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "When will the reinforcements arrive?", options: ["At dawn", "At noon", "At sunset", "At midnight", "In the afternoon"], question: "Ses kaydını dinleyin: Destek ne zaman gelecek?", answer: "At dawn", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. He denied to run away.\n2. It's no use to try.\n3. I saw him to fall.", answer: ["He denied running away.", "It's no use trying.", "I saw him fall."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Military terms.", question: "Çevirin: 1.Reinforcement 2.Invade 3.Surrender 4.Retreat 5.Hold 6.Bridge 7.Wounded 8.Casualty 9.Command 10.Duty", answer: "takviye,işgal etmek,teslim olmak,geri çekilmek,tutmak,köprü,yaralı,kayıp,emir,görev", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "He is very brave. He definitely has ____ of steel.", options: ["nerves", "bones", "muscles", "heart", "hands"], question: "Hangi deyim 'Çelik gibi sinirlere sahip olmak' anlamındadır?", answer: "nerves", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Advance",tr:"İlerlemek"},{en:"Retreat",tr:"Geri Çekilmek"},{en:"Win",tr:"Kazanmak"},{en:"Fail",tr:"Başarısız Olmak"}], answer: "DONE", z: -290 }
    ]
  },

  // 9. CASUS (Spy - B2)
  {
    id: "rescue_spy_en_b2", lang: "İngilizce", level: "B2", prisonerId: "casus", targetName: "The Spy", targetEmoji: "🕵️",
    title: "The Mole", 
    intro: "There is a mole in the agency. The Spy was about to reveal their identity when he was framed and locked in a high-security prison. You must break him out.",
    chestQuestion: "What is harder to catch the faster you run?", 
    chestAnswer: "Your breath",
    chestOptions: ["Your breath", "A train", "A cold", "Time"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "He was framed by the mole.", question: "Hangi cümlede 'Passive with Modals' hatası vardır?\n1. He could have been saved.\n2. The door must be locked.\n3. It should have been done.\n4. He might has been seen.", answer: "He might has been seen", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The prison is (1)impenetrable. No one has ever escaped. The guards are (2)vigilant, watching every move.", question: "'Impossible to enter' (Girilmez) kelimesinin eş anlamlısı hangisidir?", answer: "impenetrable", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "I was framed by him", question: "Ses kaydındaki cümleyi yazınız.", answer: "I was framed by him", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "He wouldn't be in prison now if he ____ trusted that man.", options: ["hadn't", "didn't", "hasn't", "wouldn't"], question: "Boşluğa hangisi gelmeli? (Mixed Conditional)", answer: "hadn't", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He hacked the system.", "The alarms disabled.", "He opened the cell.", "He knocked out the guard.", "He ran to the exit."], question: "Olayları sıralayın.", answer: "He hacked the system. The alarms disabled. He opened the cell. He knocked out the guard. He ran to the exit.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "Who is the mole?", options: ["The Director", "The Secretary", "The Driver", "The Janitor", "The Guard"], question: "Ses kaydını dinleyin: Köstebek kim?", answer: "The Director", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. It is believed that he is guilty.\n2. Under no circumstances you should open it.\n3. Hardly had I arrived than he left.", answer: ["It is believed that he is guilty. (Correct)", "Under no circumstances should you open it.", "Hardly had I arrived when he left."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Prison break terms.", question: "Çevirin: 1.Frame 2.Mole 3.Agency 4.Security 5.Cell 6.Alarm 7.Hack 8.System 9.Identity 10.Proof", answer: "komplo kurmak,köstebek,ajans,güvenlik,hücre,alarm,hacklemek,sistem,kimlik,kanıt", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "We need to catch him. He is as slippery as an ____.", options: ["eel", "ice", "oil", "soap", "fish"], question: "Hangi deyim 'Ele avuca sığmaz/Kaypak' anlamındadır?", answer: "eel", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Capture",tr:"Yakalamak"},{en:"Release",tr:"Serbest Bırakmak"},{en:"Lock",tr:"Kilitlemek"},{en:"Unlock",tr:"Kilit Açmak"}], answer: "DONE", z: -290 }
    ]
  },




// =================================================================
  // --- İNGİLİZCE C1 SEVİYESİ (ADVANCED) ---
  // =================================================================

  // 1. KRAL (King George - C1)
  {
    id: "rescue_king_en_c1", lang: "İngilizce", level: "C1", prisonerId: "kral", targetName: "King George", targetEmoji: "👑",
    title: "The Abdication Conspiracy", 
    intro: "A clandestine organization known as 'The Shadow Council' has manipulated the legal system to force King George's abdication. He is being held in the High Court, awaiting a sham trial. You must navigate the complex legal web to save him.",
    chestQuestion: "I turn polar bears white and I will make you cry. I make guys have to pee and girls comb their hair. What am I?", 
    chestAnswer: "No",
    chestOptions: ["No", "Time", "Water", "Life"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The trial is a farce.", question: "Hangi cümlede 'Inversion' (Devrik Cümle) hatası vardır?\n1. Not only did they lie, but they also forged the documents.\n2. Under no circumstances should you sign this.\n3. Rarely I have seen such injustice.\n4. Little did the King know about the plot.", answer: "Rarely I have seen such injustice", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The evidence against the King is (1)fabricated. The witnesses are unreliable. The whole situation is (2)preposterous.", question: "'Absurd/Ridiculous' (Akıl almaz/Saçma) kelimesinin eş anlamlısı hangisidir?", answer: "preposterous", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Had I known the truth I would have acted differently", question: "Ses kaydındaki cümleyi yazınız.", answer: "Had I known the truth I would have acted differently", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "The law dictates that the King remain on the throne ____ he is proven mentally unfit.", options: ["lest", "provided", "unless", "should"], question: "Boşluğa hangisi gelmeli?", answer: "unless", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["The council gathered.", "False accusations were made.", "The King tried to speak.", "He was silenced.", "The verdict was read."], question: "Olayları sıralayın.", answer: "The council gathered. False accusations were made. The King tried to speak. He was silenced. The verdict was read.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What crime is the King being accused of in the High Court?", options: ["Treason", "Theft", "Murder", "Corruption", "Bribery"], question: "Ses kaydını dinleyin: Kral neyle suçlanıyor?", answer: "Treason", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. It is high time we start the investigation.\n2. I'd rather you didn't say anything.\n3. Were I to refuse, what would happen?", answer: ["It is high time we started the investigation.", "I'd rather you didn't say anything. (Correct)", "Were I to refuse, what would happen? (Correct)"], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Legal and political terminology.", question: "Çevirin: 1.Abdication 2.Treason 3.Conspiracy 4.Verdict 5.Plaintiff 6.Defendant 7.Jury 8.Witness 9.Testimony 10.Constitution", answer: "feragat,ihanet,komplo,karar,davacı,sanık,jüri,tanık,ifade,anayasa", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "We need to handle this situation carefully. It's a real hot ____.", options: ["potato", "cake", "dog", "pan", "stove"], question: "Hangi deyim 'Çok hassas/tehlikeli konu' anlamındadır?", answer: "potato", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Guilty",tr:"Suçlu"},{en:"Innocent",tr:"Masum"},{en:"Prosecution",tr:"Savcılık"},{en:"Defense",tr:"Savunma"}], answer: "DONE", z: -290 }
    ]
  },

  // 2. KRALİÇE (Queen Mary - C1)
  {
    id: "rescue_queen_en_c1", lang: "İngilizce", level: "C1", prisonerId: "kralice", targetName: "Queen Mary", targetEmoji: "👸",
    title: "The Ethereal Dream", 
    intro: "Queen Mary has been trapped in a metaphysical dreamscape by a powerful illusionist. Her physical body is safe, but her consciousness is wandering in a labyrinth of abstract thoughts. You must enter her mind.",
    chestQuestion: "I am always hungry, I must always be fed. The finger I lick will soon turn red. What am I?", 
    chestAnswer: "Fire",
    chestOptions: ["Fire", "A baby", "A monster", "Love"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The dream world defies logic.", question: "Hangi cümlede 'Subjunctive Mood' hatası vardır?\n1. It is essential that she wakes up.\n2. I suggest that he be careful.\n3. It is vital that she be found.\n4. The doctor recommended that she stay in bed.", answer: "It is essential that she wakes up", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The landscape is (1)ephemeral; it changes every second. Nothing is permanent here. The colors are (2)vivid and overwhelming.", question: "'Short-lived/Temporary' (Kısa ömürlü) kelimesinin eş anlamlısı hangisidir?", answer: "ephemeral", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "It is not until you fall that you can fly", question: "Ses kaydındaki cümleyi yazınız.", answer: "It is not until you fall that you can fly", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "It was ____ her courage that she managed to survive the nightmare.", options: ["due to", "thanks to", "owing to", "because"], question: "Boşluğa hangisi gelmeli? (Positive connotation)", answer: "thanks to", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["She closed her eyes.", "The world dissolved.", "Shapes shifted wildly.", "A voice echoed.", "She realized it was a dream."], question: "Olayları sıralayın.", answer: "She closed her eyes. The world dissolved. Shapes shifted wildly. A voice echoed. She realized it was a dream.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What is the Queen struggling with in her dream?", options: ["A memory", "A fear", "A hope", "A regret", "A wish"], question: "Ses kaydını dinleyin: Kraliçe neyle yüzleşiyor?", answer: "A regret", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Not until the sun sets, we can leave.\n2. Only after seeing him did I understand.\n3. Hardly had I arrived when it began to rain.", answer: ["Not until the sun sets can we leave.", "Only after seeing him did I understand. (Correct)", "Hardly had I arrived when it began to rain. (Correct)"], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Abstract concepts.", question: "Çevirin: 1.Consciousness 2.Subconscious 3.Ephemeral 4.Eternal 5.Illusion 6.Perception 7.Reality 8.Imagination 9.Lucid 10.Abstract", answer: "bilinç,bilinçaltı,geçici,sonsuz,illüzyon,algı,gerçeklik,hayal gücü,berrak,soyut", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "This plan is just ____ in the sky. It will never work.", options: ["pie", "bird", "cloud", "sun", "castle"], question: "Hangi deyim 'Gerçekleşmesi imkansız hayal' anlamındadır?", answer: "pie", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Dream",tr:"Rüya"},{en:"Nightmare",tr:"Kabus"},{en:"Sleep",tr:"Uyku"},{en:"Awake",tr:"Uyanık"}], answer: "DONE", z: -290 }
    ]
  },

  // 3. PRENS (Prince Harry - C1)
  {
    id: "rescue_prince_en_c1", lang: "İngilizce", level: "C1", prisonerId: "prens", targetName: "Prince Harry", targetEmoji: "🤴",
    title: "The Trial of Virtue", 
    intro: "Prince Harry is not physically trapped, but morally bound. An ancient order of monks has challenged his right to rule. He must pass a series of ethical trials.",
    chestQuestion: "The more you take, the more you leave behind. What am I?", 
    chestAnswer: "Footsteps",
    chestOptions: ["Footsteps", "Fingerprints", "Memories", "Time"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The monks are testing his patience.", question: "Hangi cümlede 'Mixed Conditional' hatası vardır?\n1. If he were more patient, he would have passed the test yesterday.\n2. If I had known, I would be there now.\n3. If she studied, she would pass.\n4. If he hadn't lied, he would be King now.", answer: "If she studied, she would pass", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The outcome of this trial is (1)inevitable. He will become King. However, his methods are under (2)scrutiny.", question: "'Unavoidable' (Kaçınılmaz) kelimesinin eş anlamlısı hangisidir?", answer: "inevitable", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "It is better to be feared than loved", question: "Ses kaydındaki cümleyi yazınız.", answer: "It is better to be feared than loved", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "He was accused of cowardice, ____ he had fought in many battles.", options: ["notwithstanding", "despite", "although", "however"], question: "Boşluğa hangisi gelmeli? (Formal contrast)", answer: "although", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["The challenge was issued.", "He accepted the trial.", "He faced his fears.", "He showed compassion.", "He was declared worthy."], question: "Olayları sıralayın.", answer: "The challenge was issued. He accepted the trial. He faced his fears. He showed compassion. He was declared worthy.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What value do the monks consider most important?", options: ["Integrity", "Strength", "Wealth", "Power", "Speed"], question: "Ses kaydını dinleyin: Rahipler neye önem veriyor?", answer: "Integrity", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Scarcely had I entered when the phone rang.\n2. I object to be treated like this.\n3. It is worth to go there.", answer: ["Scarcely had I entered when the phone rang. (Correct)", "I object to being treated like this.", "It is worth going there."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Ethical concepts.", question: "Çevirin: 1.Virtue 2.Integrity 3.Morality 4.Ethics 5.Justice 6.Wisdom 7.Courage 8.Compassion 9.Honesty 10.Leadership", answer: "erdem,bütünlük,ahlak,etik,adalet,bilgelik,cesaret,şefkat,dürüstlük,liderlik", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "He is stuck between a rock and a ____ place.", options: ["hard", "soft", "high", "low", "dark"], question: "Hangi deyim 'İki arada bir derede kalmak' anlamındadır?", answer: "hard", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Right",tr:"Doğru"},{en:"Wrong",tr:"Yanlış"},{en:"Good",tr:"İyi"},{en:"Evil",tr:"Kötü"}], answer: "DONE", z: -290 }
    ]
  },

  // 4. PRENSES (Princess Isabella - C1)
  {
    id: "rescue_princess_en_c1", lang: "İngilizce", level: "C1", prisonerId: "prenses", targetName: "Princess Isabella", targetEmoji: "👸",
    title: "The Codebreaker", 
    intro: "Princess Isabella has intercepted a message that could prevent a war. However, the message is encrypted with the 'Enigma of the South'. She is in a secure bunker, running out of time to break the code.",
    chestQuestion: "What binds two people yet touches only one?", 
    chestAnswer: "A wedding ring",
    chestOptions: ["A wedding ring", "A hug", "A rope", "A promise"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The code is extremely complex.", question: "Hangi cümlede 'Future in the Past' hatası vardır?\n1. I was going to tell you.\n2. She was to have been crowned yesterday.\n3. We would have leave earlier.\n4. He promised he would come.", answer: "We would have leave earlier", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "She must be (1)meticulous in her calculations. One mistake could be fatal. The pressure is (2)immense.", question: "'Extremely careful/Precise' (Titiz) kelimesinin eş anlamlısı hangisidir?", answer: "meticulous", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "The key to the cipher is hidden", question: "Ses kaydındaki cümleyi yazınız.", answer: "The key to the cipher is hidden", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "____ intelligent she is, she cannot solve this alone.", options: ["However", "Although", "Despite", "Whatever"], question: "Boşluğa hangisi gelmeli? (However + adj)", answer: "However", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["She received the signal.", "She analyzed the data.", "She noticed a pattern.", "She applied the algorithm.", "The message was revealed."], question: "Olayları sıralayın.", answer: "She received the signal. She analyzed the data. She noticed a pattern. She applied the algorithm. The message was revealed.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What event does the secret message describe?", options: ["A nuclear launch", "A peace treaty", "An assassination", "A wedding", "A trade deal"], question: "Ses kaydını dinleyin: Mesaj ne hakkında?", answer: "An assassination", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. It was him who called me.\n2. Who did you say called?\n3. I wish I went to the party yesterday.", answer: ["It was he who called me.", "Who did you say called? (Correct)", "I wish I had gone to the party yesterday."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Cryptography words.", question: "Çevirin: 1.Encryption 2.Decryption 3.Algorithm 4.Cipher 5.Pattern 6.Sequence 7.Variable 8.Solution 9.Complex 10.Analyze", answer: "şifreleme,şifre çözme,algoritma,şifre,desen,sıra,değişken,çözüm,karmaşık,analiz etmek", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "Let's address the ____ in the room. We all know who the traitor is.", options: ["elephant", "lion", "tiger", "bear", "mouse"], question: "Hangi deyim 'Herkesin bildiği ama konuşmadığı sorun' anlamındadır?", answer: "elephant", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Complex",tr:"Karmaşık"},{en:"Simple",tr:"Basit"},{en:"Solve",tr:"Çözmek"},{en:"Create",tr:"Yaratmak"}], answer: "DONE", z: -290 }
    ]
  },

  // 5. LORD (Lord Edward - C1)
  {
    id: "rescue_lord_en_c1", lang: "İngilizce", level: "C1", prisonerId: "lord", targetName: "Lord Edward", targetEmoji: "🧛",
    title: "The Cosmic Horror", 
    intro: "Lord Edward gazed too long into the abyss. He found a forbidden book in his library that drove him to the brink of insanity. He is now trapped in the library, mumbling about 'The Old Ones'.",
    chestQuestion: "I have no voice, yet I speak to all. I have no pages, yet I contain stories. What am I?", 
    chestAnswer: "The wind",
    chestOptions: ["The wind", "A book", "A radio", "A movie"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "He has seen things no man should see.", question: "Hangi cümlede 'Participle Clause' hatası vardır?\n1. Walking down the street, I saw him.\n2. Having finished his work, he went home.\n3. Seen the danger, he ran away.\n4. Driven by fear, he hid.", answer: "Seen the danger, he ran away", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The atmosphere is (1)ominous. You feel a sense of dread. The silence is (2)palpable, you can almost touch it.", question: "'Threatening' (Tehditkar) kelimesinin eş anlamlısı hangisidir?", answer: "ominous", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Do not look into its eyes", question: "Ses kaydındaki cümleyi yazınız.", answer: "Do not look into its eyes", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "It was ____ a terrifying experience that he never spoke of it again.", options: ["such", "so", "very", "too"], question: "Boşluğa hangisi gelmeli? (Such... that)", answer: "such", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He opened the book.", "Shadows emerged.", "Whispers filled the room.", "Sanity slipped away.", "He screamed in terror."], question: "Olayları sıralayın.", answer: "He opened the book. Shadows emerged. Whispers filled the room. Sanity slipped away. He screamed in terror.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What is the forbidden book about?", options: ["Ancient gods", "Aliens", "Ghosts", "Demons", "Witches"], question: "Ses kaydını dinleyin: Kitap ne hakkında?", answer: "Ancient gods", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Had I realized the danger, I wouldn't go.\n2. Not only he is rich, but also generous.\n3. Little did he know what was coming.", answer: ["Had I realized the danger, I wouldn't have gone.", "Not only is he rich, but also generous.", "Little did he know what was coming. (Correct)"], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Horror terminology.", question: "Çevirin: 1.Abyss 2.Insanity 3.Madness 4.Forbidden 5.Ancient 6.Cosmic 7.Horror 8.Dread 9.Terror 10.Fear", answer: "uçurum,delilik,çılgınlık,yasak,antik,kozmik,korku,dehşet,terör,korku", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "He definitely bit off more than he could ____ when he opened that book.", options: ["chew", "eat", "swallow", "digest", "drink"], question: "Hangi deyim 'Boyundan büyük işe kalkışmak' anlamındadır?", answer: "chew", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Sanity",tr:"Akıl Sağlığı"},{en:"Insanity",tr:"Delilik"},{en:"Light",tr:"Işık"},{en:"Darkness",tr:"Karanlık"}], answer: "DONE", z: -290 }
    ]
  },

  // 6. BÜYÜCÜ (Wizard - C1)
  {
    id: "rescue_wizard_en_c1", lang: "İngilizce", level: "C1", prisonerId: "buyucu", targetName: "The Wizard", targetEmoji: "🧙‍♂️",
    title: "The Universal Collapse", 
    intro: "The Wizard has peered into the fabric of the multiverse and accidentally started a chain reaction. Reality is unravelling. You must help him cast the 'Grand Unification Spell' before existence ceases to be.",
    chestQuestion: "What can fill a room but takes up no space?", 
    chestAnswer: "Light",
    chestOptions: ["Light", "Air", "Sound", "Smoke"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The laws of physics are breaking.", question: "Hangi cümlede 'Inversion with Prepositional Phrase' hatası vardır?\n1. On the table stood a jar.\n2. Into the room ran the cat.\n3. Under the tree sat he.\n4. Round the corner came the bus.", answer: "Under the tree sat he", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The magic is (1)esoteric; known only to the ancients. The ritual is extremely (2)arduous, requiring immense effort.", question: "'Difficult/Strenuous' (Zorlu/Meşakkatli) kelimesinin eş anlamlısı hangisidir?", answer: "arduous", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Matter and energy are interchangeable", question: "Ses kaydındaki cümleyi yazınız.", answer: "Matter and energy are interchangeable", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "It is essential that the spell ____ pronounced correctly.", options: ["be", "is", "was", "being"], question: "Boşluğa hangisi gelmeli? (Subjunctive Mood)", answer: "be", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["Reality warped.", "Time stopped.", "He chanted the words.", "The rift sealed.", "Balance was restored."], question: "Olayları sıralayın.", answer: "Reality warped. Time stopped. He chanted the words. The rift sealed. Balance was restored.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What force is the Wizard trying to reverse?", options: ["Entropy", "Gravity", "Magnetism", "Time", "Chaos"], question: "Ses kaydını dinleyin: Büyücü neyi tersine çevirmeye çalışıyor?", answer: "Entropy", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Had it not been for the shield, we died.\n2. I wish I would have gone.\n3. Not only did he fail, but he also laughed.", answer: ["Had it not been for the shield, we would have died.", "I wish I had gone.", "Not only did he fail, but he also laughed. (Correct)"], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "High magic terms.", question: "Çevirin: 1.Omnipotent 2.Omniscient 3.Multiverse 4.Paradox 5.Singularity 6.Quantum 7.Ethereal 8.Celestial 9.Void 10.Matter", answer: "her şeye gücü yeten,her şeyi bilen,çoklu evren,paradoks,tekillik,kuantum,ruhsa,göksel,hiçlik,madde", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "There is a ____ to his madness. He knows what he is doing.", options: ["method", "reason", "rhyme", "way", "logic"], question: "Hangi deyim 'Deliliğin bir yöntemi var' anlamındadır?", answer: "method", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Create",tr:"Yaratmak"},{en:"Destroy",tr:"Yok Etmek"},{en:"Beginning",tr:"Başlangıç"},{en:"End",tr:"Son"}], answer: "DONE", z: -290 }
    ]
  },

  // 7. VEZİR (Vizier - C1)
  {
    id: "rescue_vizier_en_c1", lang: "İngilizce", level: "C1", prisonerId: "vezir", targetName: "The Vizier", targetEmoji: "👳",
    title: "The Bureaucratic Maze", 
    intro: "The Vizier is not in a dungeon, but in the Department of Infinite Paperwork. He needs a stamped Permit A-38 to leave, but the building is a logical labyrinth designed to trap intellects forever.",
    chestQuestion: "What is so fragile that saying its name breaks it?", 
    chestAnswer: "Silence",
    chestOptions: ["Silence", "Glass", "A promise", "A heart"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The rules are contradictory.", question: "Hangi cümlede 'Negative Inversion' hatası vardır?\n1. Never have I seen such chaos.\n2. Rarely do they sign the forms.\n3. Little he knew about the rules.\n4. Under no circumstances should you run.", answer: "Little he knew about the rules", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The clerk is (1)pragmatic. He only follows the rules. The system is (2)inefficient and slow.", question: "'Practical/Realistic' (Pratik) kelimesinin eş anlamlısı hangisidir?", answer: "pragmatic", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "You must fill out this form in triplicate", question: "Ses kaydındaki cümleyi yazınız.", answer: "You must fill out this form in triplicate", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "You won't get the permit ____ you bribe the official.", options: ["even if", "unless", "in case", "as long as"], question: "Boşluğa hangisi gelmeli?", answer: "unless", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He asked for a form.", "He filled it out.", "He waited in line.", "The office closed.", "He started again."], question: "Olayları sıralayın.", answer: "He asked for a form. He filled it out. He waited in line. The office closed. He started again.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "Which specific document is required to leave?", options: ["Permit A-38", "Form B-65", "Stamp C-9", "Pass D-1", "License X"], question: "Ses kaydını dinleyin: Hangi belge gerekiyor?", answer: "Permit A-38", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Not only he is late, but also rude.\n2. Had I known, I would have helped.\n3. It was him who I saw.", answer: ["Not only is he late, but also rude.", "Had I known, I would have helped. (Correct)", "It was he whom I saw."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Bureaucratic words.", question: "Çevirin: 1.Permit 2.Form 3.Signature 4.Stamp 5.Official 6.Clerk 7.Regulation 8.Deny 9.Approve 10.Wait", answer: "izin,form,imza,damga,yetkili,memur,düzenleme,reddetmek,onaylamak,beklemek", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "We need to cut through the red ____ to get things done here.", options: ["tape", "ribbon", "line", "rope", "string"], question: "Hangi deyim 'Bürokrasiyi aşmak' anlamındadır?", answer: "tape", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Accept",tr:"Kabul Etmek"},{en:"Reject",tr:"Reddetmek"},{en:"Open",tr:"Açık"},{en:"Closed",tr:"Kapalı"}], answer: "DONE", z: -290 }
    ]
  },

  // 8. ŞÖVALYE (Knight - C1)
  {
    id: "rescue_knight_en_c1", lang: "İngilizce", level: "C1", prisonerId: "sovalye", targetName: "The Knight", targetEmoji: "🛡️",
    title: "The Siege of Shadows", 
    intro: "The Knight is commanding the last bastion of humanity against the Shadow Legion. The siege has lasted for months. Supplies are low, morale is breaking. He needs a strategist.",
    chestQuestion: "I have no feet, no hands, no wings, but I can climb to the sky. What am I?", 
    chestAnswer: "Smoke",
    chestOptions: ["Smoke", "A cloud", "A ghost", "A balloon"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "If he falls, the kingdom falls.", question: "Hangi cümlede 'Inverted Conditional' hatası vardır?\n1. Were he to fail, we would all die.\n2. Had I known, I would have come.\n3. Should you see him, tell him.\n4. Did I know, I would help.", answer: "Did I know, I would help", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The walls are strong, but the soldiers are weary. The Knight is (1)resilient. He bounces back from every defeat. He is (2)dauntless.", question: "'Tough/Strong' (Dayanıklı) kelimesinin eş anlamlısı hangisidir?", answer: "resilient", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "We will never surrender to them", question: "Ses kaydındaki cümleyi yazınız.", answer: "We will never surrender to them", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "The enemy attack was ____ fierce that the walls nearly crumbled.", options: ["so", "such", "too", "very"], question: "Boşluğa hangisi gelmeli? (So... that)", answer: "so", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["The enemy advanced.", "Archers fired arrows.", "They climbed the walls.", "Soldiers fought back.", "The attack was repelled."], question: "Olayları sıralayın.", answer: "The enemy advanced. Archers fired arrows. They climbed the walls. Soldiers fought back. The attack was repelled.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "What critical supply is running low?", options: ["Food", "Water", "Arrows", "Swords", "Medicine"], question: "Ses kaydını dinleyin: Neyimiz bitiyor?", answer: "Food", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. No sooner had we eaten than they arrived.\n2. On no account you should open the gate.\n3. Only later did I realize my mistake.", answer: ["No sooner had we eaten than they arrived. (Correct)", "On no account should you open the gate.", "Only later did I realize my mistake. (Correct)"], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Siege terms.", question: "Çevirin: 1.Siege 2.Bastion 3.Legion 4.Morale 5.Strategist 6.Reinforce 7.Wall 8.Gate 9.Tower 10.Flag", answer: "kuşatma,kale,lejyon,moral,stratejist,güçlendirmek,duvar,kapı,kule,bayrak", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "We are losing. It's time to throw in the ____.", options: ["towel", "sponge", "glove", "hat", "flag"], question: "Hangi deyim 'Pes etmek' anlamındadır?", answer: "towel", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Attack",tr:"Saldırı"},{en:"Defense",tr:"Savunma"},{en:"Win",tr:"Kazanmak"},{en:"Surrender",tr:"Teslim Olmak"}], answer: "DONE", z: -290 }
    ]
  },

  // 9. CASUS (Spy - C1)
  {
    id: "rescue_spy_en_c1", lang: "İngilizce", level: "C1", prisonerId: "casus", targetName: "The Spy", targetEmoji: "🕵️",
    title: "The Double Cross", 
    intro: "The Spy has been deep undercover for years. His handler has betrayed him, and now every assassin in the city is hunting him. He needs to extract, but he doesn't know who to trust.",
    chestQuestion: "I can fill a room, but I take up no space. What am I?", 
    chestAnswer: "Light",
    chestOptions: ["Light", "Air", "Sound", "Smoke"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The conspiracy runs deep.", question: "Hangi cümlede 'Cleft Sentence' hatası vardır?\n1. It is money that rules the world.\n2. What I need is information.\n3. The place where we met was here.\n4. Who told you was John.", answer: "Who told you was John", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The agent is (1)duplicitous; he plays both sides. His motives are (2)ambiguous, you never know his true intent.", question: "'Deceitful/Two-faced' (İkiyüzlü) kelimesinin eş anlamlısı hangisidir?", answer: "duplicitous", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "My cover has been blown", question: "Ses kaydındaki cümleyi yazınız.", answer: "My cover has been blown", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "He is rumored ____ a double agent.", options: ["to be", "being", "that he is", "be"], question: "Boşluğa hangisi gelmeli? (Passive reporting verb)", answer: "to be", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He checked his phone.", "He saw the message.", "He destroyed the SIM card.", "He packed his bag.", "He left the hotel."], question: "Olayları sıralayın.", answer: "He checked his phone. He saw the message. He destroyed the SIM card. He packed his bag. He left the hotel.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "Which organization is hunting the Spy?", options: ["The Illuminati", "The Syndicate", "The Agency", "The Government", "The Shadow"], question: "Ses kaydını dinleyin: Düşman örgüt kim?", answer: "The Syndicate", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Never before have I been so scared.\n2. Had it not been for you, I would have died.\n3. She insisted on to go with me.", answer: ["Never before have I been so scared. (Correct)", "Had it not been for you, I would have died. (Correct)", "She insisted on going with me."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Betrayal words.", question: "Çevirin: 1.Handler 2.Assassin 3.Extract 4.Trust 5.Betray 6.Hunt 7.Safehouse 8.Cover 9.Identity 10.Escape", answer: "yönetici,suikastçı,çıkarmak,güven,ihanet,avlamak,güvenli ev,kılıf,kimlik,kaçış", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "They are looking for me in the north, but I'm going south. They are barking up the wrong ____.", options: ["tree", "dog", "house", "pole", "hill"], question: "Hangi deyim 'Yanlış iz sürmek' anlamındadır?", answer: "tree", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Trust",tr:"Güven"},{en:"Doubt",tr:"Şüphe"},{en:"Life",tr:"Hayat"},{en:"Death",tr:"Ölüm"}], answer: "DONE", z: -290 }
    ]
  },




// =================================================================
  // --- İNGİLİZCE C2 SEVİYESİ (PROFICIENCY) ---
  // =================================================================

  // 1. KRAL (King George - C2)
  {
    id: "rescue_king_en_c2", lang: "İngilizce", level: "C2", prisonerId: "kral", targetName: "King George", targetEmoji: "👑",
    title: "The Existential Void", 
    intro: "King George has not been kidnapped by men, but trapped within his own mind by a psychic entity. He is wandering the 'Hall of Echoes', debating the futility of power. You must enter his psyche and convince him that his reign still has meaning.",
    chestQuestion: "I have no beginning, no end, and no middle. I touch every continent but am not land. What am I?", 
    chestAnswer: "The ocean",
    chestOptions: ["The ocean", "A circle", "Time", "Space"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The hallucinations are becoming stronger.", question: "Hangi cümlede 'Inverted Conditional' (Devrik Koşul) hatası vardır?\n1. Had I known the cost, I would have refused.\n2. Should you see the ghost, do not speak.\n3. Were he to resign, chaos would ensue.\n4. Did I know the truth, I would leave.", answer: "Did I know the truth, I would leave", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The King's thoughts are (1)ephemeral, fading as soon as they appear. His grasp on reality is (2)tenuous at best.", question: "'Weak/Fragile' (Zayıf/Pamuk ipliğine bağlı) kelimesinin eş anlamlısı hangisidir?", answer: "tenuous", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Heavy is the head that wears the crown", question: "Ses kaydındaki cümleyi yazınız.", answer: "Heavy is the head that wears the crown", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "The entity will consume his mind ____ we intervene immediately.", options: ["lest", "unless", "provided", "supposing"], question: "Boşluğa hangisi gelmeli? (Korkusuyla/Olmasın diye - Rare conjunction)", answer: "lest", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He questioned his legacy.", "The void whispered back.", "Doubt consumed him.", "He sought redemption.", "Clarity finally emerged."], question: "Olayları sıralayın.", answer: "He questioned his legacy. The void whispered back. Doubt consumed him. He sought redemption. Clarity finally emerged.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "The entity grows stronger by consuming his deepest regrets.", options: ["His pride", "His fear", "His past", "His ancestors", "His regrets"], question: "Ses kaydını dinleyin: Varlık neyden besleniyor?", answer: "His regrets", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Scarcely I had arrived when he left.\n2. Not only he is a king, but also a poet.\n3. It is high time we go home.", answer: ["Scarcely had I arrived when he left.", "Not only is he a king, but also a poet.", "It is high time we went home."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Philosophical terms.", question: "Çevirin: 1.Existential 2.Nihilism 3.Legacy 4.Sovereignty 5.Abdication 6.Redemption 7.Psyche 8.Hallucination 9.Clarity 10.Futility", answer: "varoluşsal,nihilizm,miras,egemenlik,feragat,kurtuluş,ruh,halüsinasyon,berraklık,beyhudelik", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "The King has decided to throw down the ____ and challenge the entity directly.", options: ["gauntlet", "glove", "sword", "shield", "towel"], question: "Hangi deyim 'Meydan okumak' anlamındadır?", answer: "gauntlet", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Eternal",tr:"Ebedi"},{en:"Transient",tr:"Geçici"},{en:"Chaos",tr:"Kaos"},{en:"Order",tr:"Düzen"}], answer: "DONE", z: -290 }
    ]
  },

  // 2. KRALİÇE (Queen Mary - C2)
  {
    id: "rescue_queen_en_c2", lang: "İngilizce", level: "C2", prisonerId: "kralice", targetName: "Queen Mary", targetEmoji: "👸",
    title: "The Chrono-Paradox", 
    intro: "Queen Mary is trapped in a time loop, but unlike the Wizard, she is existing in multiple timelines simultaneously. She is everywhere and nowhere. You must anchor her to a single reality before she fades from existence.",
    chestQuestion: "I can be told, I can be played, I can be cracked, and I can be made. What am I?", 
    chestAnswer: "A joke",
    chestOptions: ["A joke", "A story", "A game", "A glass"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "Time is fragmenting around her.", question: "Hangi cümlede 'Future Perfect Continuous' hatası vardır?\n1. By next year, she will have been reigning for 20 years.\n2. He will have been waiting for hours.\n3. We will have been traveling all day.\n4. They will has been working hard.", answer: "They will has been working hard", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "Her presence is (1)ubiquitous; she seems to be everywhere at once. However, her physical form is (2)intangible, you cannot touch her.", question: "'Omnipresent/Everywhere' (Her yerde olan) kelimesinin eş anlamlısı hangisidir?", answer: "ubiquitous", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Time is but a stubborn illusion", question: "Ses kaydındaki cümleyi yazınız.", answer: "Time is but a stubborn illusion", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "She would have been saved by now, ____ for the interference of the timeline.", options: ["had it not been", "if it was not", "were it not", "should it not be"], question: "Boşluğa hangisi gelmeli? (If it hadn't been for...)", answer: "had it not been", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["A rift opened.", "Timelines merged.", "Past met future.", "She stepped through.", "Paradox ensued."], question: "Olayları sıralayın.", answer: "A rift opened. Timelines merged. Past met future. She stepped through. Paradox ensued.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "The anomaly was caused by a fracture in quantum physics.", options: ["Quantum physics", "Dark magic", "Alien technology", "A curse", "A machine"], question: "Ses kaydını dinleyin: Bu olayın sebebi ne?", answer: "Quantum physics", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Little she knew about the trap.\n2. I suggest that she consults a doctor.\n3. Were I rich, I would buy it.", answer: ["Little did she know about the trap.", "I suggest that she consult a doctor.", "Were I rich, I would buy it. (Correct)"], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Quantum terms.", question: "Çevirin: 1.Simultaneous 2.Paradox 3.Timeline 4.Existence 5.Infinity 6.Chronology 7.Anchor 8.Reality 9.Merge 10.Fade", answer: "eşzamanlı,paradoks,zaman çizelgesi,varoluş,sonsuzluk,kronoloji,çapa,gerçeklik,birleşmek,solmak", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "Finding the correct timeline is like looking for a needle in a ____.", options: ["haystack", "stack", "field", "barn", "pile"], question: "Hangi deyim 'Samanlıkta iğne aramak' anlamındadır?", answer: "haystack", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Past",tr:"Geçmiş"},{en:"Present",tr:"Şimdi"},{en:"Future",tr:"Gelecek"},{en:"Eternity",tr:"Sonsuzluk"}], answer: "DONE", z: -290 }
    ]
  },

  // 3. PRENS (Prince Harry - C2)
  {
    id: "rescue_prince_en_c2", lang: "İngilizce", level: "C2", prisonerId: "prens", targetName: "Prince Harry", targetEmoji: "🤴",
    title: "The Machiavellian Plot", 
    intro: "Prince Harry has been framed for a crime he didn't commit by a Machiavellian advisor. He is in a political prison where mind games are more dangerous than swords. You must outsmart the master manipulator.",
    chestQuestion: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", 
    chestAnswer: "A map",
    chestOptions: ["A map", "A globe", "A book", "A painting"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The advisor is cunning.", question: "Hangi cümlede 'Cleft Sentence' (Vurgulu Cümle) hatası vardır?\n1. It was the advisor who lied.\n2. What I need is proof.\n3. The person that called was him.\n4. All I want is justice.", answer: "The person that called was him", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The advisor's plan was (1)nefarious. It was wicked and criminal. However, his execution was (2)impeccable, without a single flaw.", question: "'Wicked/Villainous' (Hain/Kötü) kelimesinin eş anlamlısı hangisidir?", answer: "nefarious", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "The end justifies the means", question: "Ses kaydındaki cümleyi yazınız.", answer: "The end justifies the means", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "He is revered by the people, ____ in private he is a tyrant.", options: ["albeit", "whereas", "notwithstanding", "despite"], question: "Boşluğa hangisi gelmeli? (Although meaning)", answer: "whereas", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["Rumors were spread.", "Alliances shifted.", "The Prince was isolated.", "He was accused.", "He was imprisoned."], question: "Olayları sıralayın.", answer: "Rumors were spread. Alliances shifted. The Prince was isolated. He was accused. He was imprisoned.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "The advisor is driven solely by his blind ambition.", options: ["Ambition", "Revenge", "Money", "Love", "Fear"], question: "Ses kaydını dinleyin: Danışmanın motivasyonu ne?", answer: "Ambition", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Never I have been so insulted.\n2. Had I knew, I would have told you.\n3. She insisted that he leave immediately.", answer: ["Never have I been so insulted.", "Had I known, I would have told you.", "She insisted that he leave immediately. (Correct)"], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Political intrigue words.", question: "Çevirin: 1.Machiavellian 2.Manipulate 3.Scheme 4.Plot 5.Tyrant 6.Alliance 7.Betrayal 8.Strategy 9.Cunning 10.Deceit", answer: "makyavelist,manipüle etmek,entrika,komplo,zorbaca,ittifak,ihanet,strateji,kurnaz,aldatmaca", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "The advisor thinks he has won, but we will cut the Gordian ____.", options: ["knot", "rope", "tie", "string", "thread"], question: "Hangi deyim 'Karmaşık bir sorunu cesurca çözmek' anlamındadır?", answer: "knot", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"True",tr:"Doğru"},{en:"False",tr:"Yanlış"},{en:"Ally",tr:"Müttefik"},{en:"Rival",tr:"Rakip"}], answer: "DONE", z: -290 }
    ]
  },

  // 4. PRENSES (Princess Isabella - C2)
  {
    id: "rescue_princess_en_c2", lang: "İngilizce", level: "C2", prisonerId: "prenses", targetName: "Princess Isabella", targetEmoji: "👸",
    title: "The Double Agent", 
    intro: "Princess Isabella is deep undercover in a hostile empire. She has discovered a weapon of mass destruction. Her cover has been blown, and she is being hunted by the elite guard. You must extract her.",
    chestQuestion: "What has a neck but no head?", 
    chestAnswer: "A bottle",
    chestOptions: ["A bottle", "A shirt", "A guitar", "A snake"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The mission is compromised.", question: "Hangi cümlede 'Participle Phrase' hatası vardır?\n1. Waiting for the train, I read a book.\n2. Damaged in the crash, the car was useless.\n3. Having finished her work, she left.\n4. Walked down the street, the sun shone.", answer: "Walked down the street, the sun shone", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The operation must be (1)clandestine. No one must know. Any mistake could be (2)detrimental to the peace treaty.", question: "'Secret/Hidden' (Gizli) kelimesinin eş anlamlısı hangisidir?", answer: "clandestine", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "The extraction point has changed", question: "Ses kaydındaki cümleyi yazınız.", answer: "The extraction point has changed", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "Not only ____ the code, but she also destroyed the machine.", options: ["did she steal", "she stole", "stole she", "she did steal"], question: "Boşluğa hangisi gelmeli? (Inversion after Negative Adverb)", answer: "did she steal", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["She infiltrated the base.", "She copied the files.", "The alarm triggered.", "She fought her way out.", "She reached the roof."], question: "Olayları sıralayın.", answer: "She infiltrated the base. She copied the files. The alarm triggered. She fought her way out. She reached the roof.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "The weapon is a deadly cyber virus capable of shutting down the grid.", options: ["A biological weapon", "A nuclear bomb", "A cyber virus", "A mind control device", "A laser"], question: "Ses kaydını dinleyin: Silah nedir?", answer: "A cyber virus", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. No sooner had I arrived than he left.\n2. It's time we go home.\n3. I wish I would have known.", answer: ["No sooner had I arrived than he left. (Correct)", "It's time we went home.", "I wish I had known."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Spy terminology.", question: "Çevirin: 1.Espionage 2.Surveillance 3.Infiltration 4.Extraction 5.Asset 6.Compromised 7.Protocol 8.Eliminate 9.Rendezvous 10.Sabotage", answer: "casusluk,gözetim,sızma,tahliye,varlık,tehlikede,protokol,yok etmek,buluşma,sabotaj", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "Someone in our team decided to ____ the whistle on the operation.", options: ["blow", "play", "sound", "hit", "ring"], question: "Hangi deyim 'İfşa etmek/İspiyonlamak' anlamındadır?", answer: "blow", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Covert",tr:"Gizli"},{en:"Overt",tr:"Açık"},{en:"Ally",tr:"Müttefik"},{en:"Traitor",tr:"Hain"}], answer: "DONE", z: -290 }
    ]
  },

  // 5. LORD (Lord Edward - C2)
  {
    id: "rescue_lord_en_c2", lang: "İngilizce", level: "C2", prisonerId: "lord", targetName: "Lord Edward", targetEmoji: "🧛",
    title: "The Eldritch Truth", 
    intro: "Lord Edward has uncovered a truth so terrifying that it shattered his mind. He is wandering the catacombs, pursued by entities that cannot be described. You must help him regain his sanity.",
    chestQuestion: "The more of this there is, the less you see. What is it?", 
    chestAnswer: "Darkness",
    chestOptions: ["Darkness", "Fog", "Light", "Money"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "His mind is fragile.", question: "Hangi cümlede 'Subjunctive Mood' hatası vardır?\n1. If need be, we will carry him.\n2. God save the Queen.\n3. I demand that he stops.\n4. Be that as it may.", answer: "I demand that he stops", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The horror he witnessed is (1)ineffable; words cannot describe it. It is an (2)abysmal depth of darkness.", question: "'Indescribable' (Tarif edilemez) kelimesinin eş anlamlısı hangisidir?", answer: "ineffable", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "That is not dead which can eternal lie", question: "Ses kaydındaki cümleyi yazınız.", answer: "That is not dead which can eternal lie", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "____ for your timely intervention, he would have been lost forever.", options: ["But", "If", "Had", "Were"], question: "Boşluğa hangisi gelmeli? (But for...)", answer: "But", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He read the scroll.", "The walls melted.", "Geometric shapes appeared.", "He screamed.", "He ran into the dark."], question: "Olayları sıralayın.", answer: "He read the scroll. The walls melted. Geometric shapes appeared. He screamed. He ran into the dark.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "He witnessed a dark ritual, a summoning of ancient things.", options: ["A ritual", "A sacrifice", "A summoning", "A portal", "A vision"], question: "Ses kaydını dinleyin: Lord neye tanık oldu?", answer: "A summoning", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Scarcely had the clock struck when it began.\n2. Under no circumstances you must look.\n3. Were it not for you, I would be dead.", answer: ["Scarcely had the clock struck when it began. (Correct)", "Under no circumstances must you look.", "Were it not for you, I would be dead. (Correct)"], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Eldritch vocabulary.", question: "Çevirin: 1.Ineffable 2.Eldritch 3.Cosmic 4.Insanity 5.Void 6.Entity 7.Summon 8.Dimension 9.Forbidden 10.Madness", answer: "tarif edilemez,tekinsiz,kozmik,delilik,hiçlik,varlık,çağırmak,boyut,yasak,çılgınlık", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "He has a ____ in his closet that he doesn't want anyone to see.", options: ["skeleton", "ghost", "monster", "bone", "corpse"], question: "Hangi deyim 'Gizli utanç verici sır' anlamındadır?", answer: "skeleton", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Sanity",tr:"Akıl Sağlığı"},{en:"Madness",tr:"Delilik"},{en:"Light",tr:"Işık"},{en:"Darkness",tr:"Karanlık"}], answer: "DONE", z: -290 }
    ]
  },

  // 6. BÜYÜCÜ (Wizard - C2)
  {
    id: "rescue_wizard_en_c2", lang: "İngilizce", level: "C2", prisonerId: "buyucu", targetName: "The Wizard", targetEmoji: "🧙‍♂️",
    title: "The Universal Collapse", 
    intro: "The Wizard has peered into the fabric of the multiverse and accidentally started a chain reaction. Reality is unravelling. You must help him cast the 'Grand Unification Spell' before existence ceases to be.",
    chestQuestion: "What can fill a room but takes up no space?", 
    chestAnswer: "Light",
    chestOptions: ["Light", "Air", "Sound", "Smoke"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The laws of physics are breaking.", question: "Hangi cümlede 'Inversion with Prepositional Phrase' hatası vardır?\n1. On the table stood a jar.\n2. Into the room ran the cat.\n3. Under the tree sat he.\n4. Round the corner came the bus.", answer: "Under the tree sat he", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The magic is (1)esoteric; known only to the ancients. The ritual is extremely (2)arduous, requiring immense effort.", question: "'Difficult/Strenuous' (Zorlu/Meşakkatli) kelimesinin eş anlamlısı hangisidir?", answer: "arduous", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Matter and energy are interchangeable", question: "Ses kaydındaki cümleyi yazınız.", answer: "Matter and energy are interchangeable", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "It is essential that the spell ____ pronounced correctly.", options: ["be", "is", "was", "being"], question: "Boşluğa hangisi gelmeli? (Subjunctive Mood)", answer: "be", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["Reality warped.", "Time stopped.", "He chanted the words.", "The rift sealed.", "Balance was restored."], question: "Olayları sıralayın.", answer: "Reality warped. Time stopped. He chanted the words. The rift sealed. Balance was restored.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "The Wizard is attempting to reverse the flow of entropy itself.", options: ["Entropy", "Gravity", "Magnetism", "Time", "Chaos"], question: "Ses kaydını dinleyin: Büyücü neyi tersine çevirmeye çalışıyor?", answer: "Entropy", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Had it not been for the shield, we died.\n2. I wish I would have gone.\n3. Not only did he fail, but he also laughed.", answer: ["Had it not been for the shield, we would have died.", "I wish I had gone.", "Not only did he fail, but he also laughed. (Correct)"], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "High magic terms.", question: "Çevirin: 1.Omnipotent 2.Omniscient 3.Multiverse 4.Paradox 5.Singularity 6.Quantum 7.Ethereal 8.Celestial 9.Void 10.Matter", answer: "her şeye gücü yeten,her şeyi bilen,çoklu evren,paradoks,tekillik,kuantum,ruhsa,göksel,hiçlik,madde", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "There is a ____ to his madness. He knows what he is doing.", options: ["method", "reason", "rhyme", "way", "logic"], question: "Hangi deyim 'Deliliğin bir yöntemi var' anlamındadır?", answer: "method", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Create",tr:"Yaratmak"},{en:"Destroy",tr:"Yok Etmek"},{en:"Beginning",tr:"Başlangıç"},{en:"End",tr:"Son"}], answer: "DONE", z: -290 }
    ]
  },

  // 7. VEZİR (Vizier - C2)
  {
    id: "rescue_vizier_en_c2", lang: "İngilizce", level: "C2", prisonerId: "vezir", targetName: "The Vizier", targetEmoji: "👳",
    title: "The Labyrinth of Logic", 
    intro: "The Vizier is trapped in a mental construct created by a Sphinx. It is a labyrinth where every turn requires solving a philosophical paradox. One wrong answer, and he is lost in thought forever.",
    chestQuestion: "I have rivers, but no water. I have forests, but no trees. I have cities, but no people. What am I?", 
    chestAnswer: "A map",
    chestOptions: ["A map", "A dream", "A globe", "A book"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The logic is flawed.", question: "Hangi cümlede 'Future in the Past' hatası vardır?\n1. I was going to call you.\n2. She promised she would help.\n3. They were to be married next month.\n4. He said he will arrive late.", answer: "He said he will arrive late", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The labyrinth is (1)convoluted; it twists and turns unnecessarily. The Sphinx's riddles are (2)ambiguous, having multiple meanings.", question: "'Complex/Twisted' (Karmaşık) kelimesinin eş anlamlısı hangisidir?", answer: "convoluted", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "To be or not to be that is the question", question: "Ses kaydındaki cümleyi yazınız.", answer: "To be or not to be that is the question", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "You are stuck between Scylla and ____.", options: ["Charybdis", "Zeus", "Hades", "Apollo"], question: "Hangi mitolojik isim 'İki kötü seçenek arasında kalmak' deyimini tamamlar?", answer: "Charybdis", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He faced the Sphinx.", "A riddle was asked.", "He pondered the answer.", "He spoke confidently.", "The path opened."], question: "Olayları sıralayın.", answer: "He faced the Sphinx. A riddle was asked. He pondered the answer. He spoke confidently. The path opened.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "This labyrinth is governed by pure, cold logic.", options: ["Logic", "Emotion", "History", "Math", "Art"], question: "Ses kaydını dinleyin: Labirent ne ile yönetiliyor?", answer: "Logic", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Rarely I have seen such beauty.\n2. She suggested that he goes home.\n3. I wish I was there.", answer: ["Rarely have I seen such beauty.", "She suggested that he go home.", "I wish I were there."], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Philosophy words.", question: "Çevirin: 1.Logic 2.Reason 3.Fallacy 4.Premise 5.Conclusion 6.Deduction 7.Induction 8.Paradox 9.Rhetoric 10.Argument", answer: "mantık,akıl,yanılgı,öncül,sonuç,tümdengelim,tümevarım,paradoks,retorik,argüman", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "Let me play the ____ advocate for a moment and argue the opposite side.", options: ["devil's", "angel's", "king's", "god's", "judge's"], question: "Hangi deyim 'Şeytanın avukatlığını yapmak' anlamındadır?", answer: "devil's", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Thesis",tr:"Tez"},{en:"Antithesis",tr:"Antitez"},{en:"Synthesis",tr:"Sentez"},{en:"Analysis",tr:"Analiz"}], answer: "DONE", z: -290 }
    ]
  },

  // 8. ŞÖVALYE (Knight - C2)
  {
    id: "rescue_knight_en_c2", lang: "İngilizce", level: "C2", prisonerId: "sovalye", targetName: "The Knight", targetEmoji: "🛡️",
    title: "The Last Bastion", 
    intro: "The Knight is holding the 'Eternal Gate' against the forces of oblivion. If he falls, the world ends. He has been fighting for days without sleep. His will is indomitable, but his body is failing.",
    chestQuestion: "What is harder to catch the faster you run?", 
    chestAnswer: "Your breath",
    chestOptions: ["Your breath", "The wind", "A dream", "Time"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "He fights with unmatched skill.", question: "Hangi cümlede 'Subjunctive' hatası vardır?\n1. Long live the King.\n2. Be that as it may.\n3. Suffice it to say.\n4. I wish he is here.", answer: "I wish he is here", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "His spirit is (1)indomitable; it cannot be subdued. The enemy is (2)relentless, attacking without pause.", question: "'Unbeatable/Unconquerable' (Yenilmez) kelimesinin eş anlamlısı hangisidir?", answer: "indomitable", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "We shall fight on the beaches", question: "Ses kaydındaki cümleyi yazınız.", answer: "We shall fight on the beaches", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "____ for his shield, he would have been killed instantly.", options: ["Had it not been", "If it wasn't", "Were it not", "Should it not"], question: "Boşluğa hangisi gelmeli? (Past condition)", answer: "Had it not been", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["The gate shook.", "The enemy breached.", "He stood his ground.", "He struck them down.", "Silence fell."], question: "Olayları sıralayın.", answer: "The gate shook. The enemy breached. He stood his ground. He struck them down. Silence fell.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "He is fighting against the forces of pure oblivion.", options: ["Oblivion", "Darkness", "Chaos", "The Void", "Silence"], question: "Ses kaydını dinleyin: Düşman neyin gücü?", answer: "Oblivion", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. It's time we go back.\n2. I'd rather you didn't fight.\n3. Supposing you die, who will lead?", answer: ["It's time we went back.", "I'd rather you didn't fight. (Correct)", "Supposing you died, who would lead?"], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "War vocabulary.", question: "Çevirin: 1.Indomitable 2.Relentless 3.Bastion 4.Siege 5.Valor 6.Sacrifice 7.Oblivion 8.Vanguard 9.Reinforcement 10.Attrition", answer: "yenilmez,amansız,kale,kuşatma,yiğitlik,fedakarlık,unutulma,öncü,takviye,yıpratma", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "Another enemy defeated. Another one bites the ____.", options: ["dust", "sand", "dirt", "ground", "grass"], question: "Hangi deyim 'Ölmek/Yenilmek' anlamındadır?", answer: "dust", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Victory",tr:"Zafer"},{en:"Defeat",tr:"Yenilgi"},{en:"Glory",tr:"Şan"},{en:"Shame",tr:"Utanç"}], answer: "DONE", z: -290 }
    ]
  },

  // 9. CASUS (Spy - C2)
  {
    id: "rescue_spy_en_c2", lang: "İngilizce", level: "C2", prisonerId: "casus", targetName: "The Spy", targetEmoji: "🕵️",
    title: "The Shadow War", 
    intro: "The Spy has uncovered a global conspiracy that threatens the world order. He has gone rogue to expose the truth. He is being hunted by every agency on the planet. You are his only contact.",
    chestQuestion: "I can run but not walk. I have a mouth but can't talk. I have a head but can't think. What am I?", 
    chestAnswer: "A river",
    chestOptions: ["A river", "A mountain", "A road", "A map"],
    chapters: [
      { id: 1, type: "FIX_GRAMMAR_IN_TEXT", storyText: "The conspiracy runs deep.", question: "Hangi cümlede 'Cleft Sentence' hatası vardır?\n1. It is money that rules the world.\n2. What I need is information.\n3. The place where we met was here.\n4. Who told you was John.", answer: "Who told you was John", z: -20 },
      { id: 2, type: "SYNONYM_IN_PARAGRAPH", storyText: "The agent is (1)duplicitous; he plays both sides. His motives are (2)ambiguous, you never know his true intent.", question: "'Deceitful/Two-faced' (İkiyüzlü) kelimesinin eş anlamlısı hangisidir?", answer: "duplicitous", z: -50 },
      { id: 3, type: "AUDIO_DICTATION", audioText: "Trust is a luxury we cannot afford", question: "Ses kaydındaki cümleyi yazınız.", answer: "Trust is a luxury we cannot afford", z: -80 },
      { id: 4, type: "SENTENCE_GAP_FILL", storyText: "____ had I entered the room when the phone rang.", options: ["Scarcely", "No sooner", "Hardly", "Barely"], question: "Boşluğa hangisi gelmeli? (...when ile kullanılır)", answer: "Scarcely", z: -110 },
      { id: 5, type: "ORDER_SENTENCES", sentences: ["He uploaded the data.", "The connection failed.", "He bypassed the firewall.", "The upload completed.", "He destroyed the drive."], question: "Olayları sıralayın.", answer: "He bypassed the firewall. He uploaded the data. The connection failed. The upload completed. He destroyed the drive.", z: -140 },
      { id: 6, type: "AUDIO_QUESTION", audioText: "The organization hunting him is known as The Syndicate.", options: ["The Illuminati", "The Syndicate", "The Agency", "The Government", "The Shadow"], question: "Ses kaydını dinleyin: Düşman örgüt kim?", answer: "The Syndicate", z: -170 },
      { id: 7, type: "FIX_ALL_ERRORS", question: "Hataları düzeltin:\n1. Only when I slept, I could relax.\n2. Little he knows about the plan.\n3. Under no circumstances should you open the box.", answer: ["Only when I slept could I relax.", "Little does he know about the plan.", "Under no circumstances should you open the box. (Correct)"], z: -200 },
      { id: 8, type: "TRANSLATE_WORDS", storyText: "Advanced espionage.", question: "Çevirin: 1.Duplicitous 2.Clandestine 3.Surveillance 4.Espionage 5.Counterintelligence 6.Cryptography 7.Asset 8.Liability 9.Extraction 10.Protocol", answer: "ikiyüzlü,gizli,gözetim,casusluk,karşı istihbarat,kriptografi,varlık,yükümlülük,tahliye,protokol", z: -230 },
      { id: 9, type: "IDIOM_GAP_FILL", storyText: "I heard it through the ____ that you are leaving town.", options: ["grapevine", "tree", "bush", "flower", "root"], question: "Hangi deyim 'Kulağıma çalındı/Söylenti duydum' anlamındadır?", answer: "grapevine", z: -260 },
      { id: 10, type: "CARD_MATCH", question: "Kartları eşleştirin.", pairs: [{en:"Truth",tr:"Gerçek"},{en:"Lie",tr:"Yalan"},{en:"Fact",tr:"Olgu"},{en:"Fiction",tr:"Kurgu"}], answer: "DONE", z: -290 }
    ]
  }
];

// --- SABİT LİSTELER ---
const INITIAL_LANGS = [
  { id: 'İngilizce', img: '/flags/uk.png', locked: false, price: 0 },
  { id: 'Almanca', img: '/flags/germany.png', locked: false, price: 100 },
  { id: 'İspanyolca', img: '/flags/spain.png', locked: true, price: 500 },
  { id: 'Fransızca', img: '/flags/france.png', locked: true, price: 500 },
  { id: 'Rusça', img: '/flags/russia.png', locked: true, price: 700 },
  { id: 'İtalyanca', img: '/flags/italy.png', locked: true, price: 700 },
  { id: 'Çince', img: '/flags/china.png', locked: true, price: 1000 },
  { id: 'Japonca', img: '/flags/japan.png', locked: true, price: 1000 },
  { id: 'Bulgarca', img: '/flags/bulgaria.png', locked: true, price: 1500 },
  { id: 'Portekizce', img: '/flags/portugal.png', locked: true, price: 1500 },
];

const INITIAL_LEVELS = [
  { id: 'A1', name: 'Başlangıç', locked: false, price: 0 },
  { id: 'A2', name: 'Temel', locked: true, price: 100 },
  { id: 'B1', name: 'Orta', locked: true, price: 200 },
  { id: 'B2', name: 'İyi', locked: true, price: 300 },
  { id: 'C1', name: 'İleri', locked: true, price: 400 },
  { id: 'C2', name: 'Uzman', locked: true, price: 500 },
];

const FINAL_Z = -350;

// --- 3D BİLEŞENLER ---

function Player({ isWalking, charType, setPlayerZ }: { isWalking: boolean, charType: string, setPlayerZ: (z: number) => void }) {
  const playerRef = useRef<any>(null);
  const texture = useTexture(`/chars/${charType}_back.png`);
  
  useFrame((state, delta) => {
    if (!playerRef.current) return;
    if (isWalking) {
      playerRef.current.position.z -= 8 * delta;
      playerRef.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime * 15) * 0.1;
    } else {
      playerRef.current.position.y = 1.5 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
    }
    setPlayerZ(playerRef.current.position.z);

    const cameraZ = playerRef.current.position.z + 6;
    const cameraY = playerRef.current.position.y + 2;
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, cameraZ, 0.1);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, cameraY, 0.1);
    state.camera.lookAt(playerRef.current.position.x, playerRef.current.position.y, playerRef.current.position.z - 10);
  });

  return (
    <group ref={playerRef} position={[0, 1.5, 0]}>
      <mesh castShadow>
        <planeGeometry args={[2, 3]} />
        <meshBasicMaterial map={texture} transparent={true} alphaTest={0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Gate({ data, isOpen }: { data: Chapter, isOpen: boolean }) {
  const texture = useTexture('/gate.png');
  const doorRef = useRef<THREE.Group>(null);

  useEffect(() => {
      if (isOpen) {
          const audio = new Audio('/sounds/door.mp3');
          audio.volume = 0.7;
          audio.play().catch(() => {});
      }
  }, [isOpen]);

  useFrame((state, delta) => {
    if (isOpen && doorRef.current) {
        doorRef.current.rotation.y = THREE.MathUtils.lerp(doorRef.current.rotation.y, -Math.PI / 2, delta * 2);
        doorRef.current.position.x = THREE.MathUtils.lerp(doorRef.current.position.x, -4.5, delta * 2);
    }
  });

  return (
    <group position={[0, 0, data.z]}>
      <group ref={doorRef}>
          <mesh position={[0, 3.5, 0]}>
            <planeGeometry args={[10, 7]} />
            <meshBasicMaterial map={texture} transparent={true} alphaTest={0.5} side={THREE.DoubleSide} toneMapped={false} color={isOpen ? "#555" : "#fff"} />
          </mesh>
      </group>
      {!isOpen && (
        <Float speed={2} rotationIntensity={0.1} floatIntensity={0.5}>
          <group position={[0, 3.5, 0.2]}>
              <Text font="/fonts/Cinzel.ttf" fontSize={0.6} letterSpacing={0.15} color="#F2AEAF" anchorX="center" anchorY="middle" outlineWidth={0.06} outlineColor="#270B43" outlineBlur={0.2}>
                  CHAPTER {data.id}
                  <meshBasicMaterial toneMapped={false} />
              </Text>
          </group>
        </Float>
      )}
      {!isOpen && <Sparkles count={30} scale={6} size={4} speed={0.4} opacity={0.5} color="red" position={[0, 3.5, 1]} />}
    </group>
  );
}

function Chest({ isOpen }: { isOpen: boolean }) {
    const texture = useTexture('/chest.png');
    return (
        <group position={[0, 1.2, -320]}>
             <Billboard>
                 <mesh>
                     <planeGeometry args={[2.5, 2.5]} />
                     <meshBasicMaterial map={texture} transparent={true} alphaTest={0.5} side={THREE.DoubleSide} color={isOpen ? "#888" : "#fff"} />
                 </mesh>
             </Billboard>
             {!isOpen && (
                 <Float speed={3} floatIntensity={0.5}>
                     <Text position={[0, 2, 0]} font="/fonts/Cinzel.ttf" fontSize={0.6} letterSpacing={0.1} color="#F2AEAF" outlineWidth={0.06} outlineColor="#270B43" outlineBlur={0.2}>MYSTERY CHEST</Text>
                 </Float>
             )}
             {isOpen && <Sparkles count={50} scale={4} size={5} speed={0.4} opacity={1} color="gold" position={[0, 0, 0]} />}
        </group>
    );
}

function RescueTarget({ targetName, emoji }: { targetName: string, emoji: string }) {
  return (
      <group position={[0, 0, FINAL_Z]}>
          <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[2, 2, 0.2, 32]} />
              <meshStandardMaterial color="gold" metalness={1} roughness={0.2} />
          </mesh>
          <spotLight position={[0, 10, 0]} intensity={2} color="white" angle={0.5} penumbra={0.5} />
          <Sparkles count={100} scale={6} size={5} speed={0.2} opacity={0.8} color="yellow" position={[0, 2, 0]} />
      </group>
  );
}

function WallTorch({ position, side }: { position: [number, number, number], side: 'left' | 'right' }) {
  const [torchLeft, torchRight] = useTexture(['/torch_left.png', '/torch_right.png']);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      const time = state.clock.elapsedTime;
      lightRef.current.intensity = 2.5 + Math.sin(time * 10) * 0.3 + Math.cos(time * 7) * 0.2;
    }
  });

  return (
    <group position={position}>
      <Billboard>
        <mesh>
          <planeGeometry args={[1.8, 3.6]} />
          <meshBasicMaterial map={side === 'left' ? torchLeft : torchRight} transparent={true} alphaTest={0.5} />
        </mesh>
      </Billboard>
      <group position={[0, 0.8, 0.2]}>
        <pointLight ref={lightRef} intensity={2.5} distance={15} color="#ff6600" decay={2} />
        <Sparkles count={25} scale={1.2} size={4} speed={0.6} color="#ffaa00" opacity={0.8} />
      </group>
    </group>
  );
}

function Torches() {
  return (
    <>
      {Array.from({ length: 18 }).map((_, i) => {
        const z = -20 * (i + 1);
        return (
          <group key={i}>
            <WallTorch position={[-4.8, 4.2, z]} side="left" />
            <WallTorch position={[4.8, 4.2, z]} side="right" />
          </group>
        );
      })}
    </>
  );
}

function EnvironmentWrapper() {
  const stoneTexture = useTexture('/floor.jpg'); 
  const wallTexture = useTexture('/stone_wall.jpg'); 
  const ceilingTexture = useTexture('/wood_ceiling.jpg'); 
  const endBgTexture = useTexture('/final-bg.jpg'); 

  stoneTexture.wrapS = stoneTexture.wrapT = THREE.RepeatWrapping;
  stoneTexture.repeat.set(3, 60); 

  wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.repeat.set(40, 1); 

  ceilingTexture.wrapS = ceilingTexture.wrapT = THREE.RepeatWrapping;
  ceilingTexture.repeat.set(1, 20);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.6} distance={30} />
      <fog attach="fog" args={['#000', 15, 60]} />

      <Torches />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -150]}>
        <planeGeometry args={[10, 400]} />
        <meshBasicMaterial map={stoneTexture} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 7, -150]}>
        <planeGeometry args={[10, 400]} />
        <meshBasicMaterial map={ceilingTexture} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-5, 3.5, -150]}>
        <planeGeometry args={[400, 7]} />
        <meshBasicMaterial map={wallTexture} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[5, 3.5, -150]}>
        <planeGeometry args={[400, 7]} />
        <meshBasicMaterial map={wallTexture} />
      </mesh>
      <mesh position={[0, 15, FINAL_Z - 50]}>
          <planeGeometry args={[120, 80]} />
          <meshBasicMaterial map={endBgTexture} side={THREE.DoubleSide} toneMapped={false} fog={false} />
      </mesh>
    </>
  );
}

// --- ANA OYUN BİLEŞENİ ---

export default function DarkDialectRPG() {
  
  // --- AUTH HOOK (Context'ten verileri alıyoruz) ---
  const { user, userData, loginGoogle, logout, updateSoulPoints: contextUpdateSoul, unlockLanguage: contextUnlockLang, unlockLevel: contextUnlockLevel } = useAuth();

  // --- LOCAL STATES ---
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameState, setGameState] = useState<'MENU' | 'LEVEL_SELECT' | 'CHAR_SELECT' | 'STORY' | 'GAME' | 'VICTORY'>('MENU');
  
  // Verileri Context ile senkronize ediyoruz (Artık veritabanından geliyor)
  const soulPoints = userData?.soulPoints || 0; 
  
  // Kilit durumlarını kullanıcının verisine göre güncelle
  const availableLangs = INITIAL_LANGS.map(l => ({
      ...l,
      locked: userData?.unlockedLangs ? !userData.unlockedLangs.includes(l.id) : l.locked
  }));
  
  const availableLevels = INITIAL_LEVELS.map(l => ({
      ...l,
      locked: userData?.unlockedLevels ? !userData.unlockedLevels.includes(l.id) : l.locked
  }));

  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [activeStory, setActiveStory] = useState<StoryScenario | null>(null);
  

  // --- TEXT TO SPEECH (SES DOSYASI OLMADAN KONUŞMA) ---
  const playTextAudio = (text: string) => {
    if (!text) return;
    // Eğer şu an bir şey konuşuyorsa durdur
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Seçilen dile göre aksan ayarı
    utterance.lang = 'en-US'; 
    utterance.rate = 0.9; 
    utterance.pitch = 1; 

    window.speechSynthesis.speak(utterance);
};


  const [playerZ, setPlayerZ] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const [solvedGates, setSolvedGates] = useState<number[]>([]);
  const [chestOpened, setChestOpened] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [nearGateId, setNearGateId] = useState<number | null>(null);
  const [nearChest, setNearChest] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [unlockModal, setUnlockModal] = useState<{show: boolean, missing: number} | null>(null);
  const [showFlyingCoin, setShowFlyingCoin] = useState(false);
  const [scoreBump, setScoreBump] = useState(false);

  // --- YENİ EKLENEN STATE'LER (Özel Soru Tipleri İçin) ---
  const [sentenceOrder, setSentenceOrder] = useState<string[]>([]);
  const [cardPairs, setCardPairs] = useState<any[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedCards, setMatchedCards] = useState<number[]>([]);
  
  // --- REF'LER ---
  const walkAudioRef = useRef<HTMLAudioElement | null>(null);
  const unlockAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const gameMusicRef = useRef<HTMLAudioElement | null>(null);
  const howAudioRef = useRef<HTMLAudioElement | null>(null);
  const spellAudioRef = useRef<HTMLAudioElement | null>(null);
  const victoryAudioRef = useRef<HTMLAudioElement | null>(null);
  const keyAudioRef = useRef<HTMLAudioElement | null>(null);
  const lockedAudioRef = useRef<HTMLAudioElement | null>(null);
  const selectAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- SESLERİ BAŞLAT ---
  useEffect(() => {
      if (typeof window !== "undefined") {
          walkAudioRef.current = new Audio('/sounds/walk.mp3'); walkAudioRef.current.loop = true; walkAudioRef.current.volume = 0.5;
          unlockAudioRef.current = new Audio('/sounds/unlock.mp3'); unlockAudioRef.current.volume = 0.6;
          bgMusicRef.current = new Audio('/sounds/bg-music.mp3'); bgMusicRef.current.loop = true; bgMusicRef.current.volume = 0.4;
          gameMusicRef.current = new Audio('/sounds/game-music.mp3'); gameMusicRef.current.loop = true; gameMusicRef.current.volume = 0.3;
          howAudioRef.current = new Audio('/sounds/how.mp3'); howAudioRef.current.volume = 0.6;
          spellAudioRef.current = new Audio('/sounds/buyu_yap.mp3'); spellAudioRef.current.volume = 0.6;
          victoryAudioRef.current = new Audio('/sounds/victory.mp3'); victoryAudioRef.current.volume = 0.5;
          keyAudioRef.current = new Audio('/sounds/anahtar.mp3'); keyAudioRef.current.volume = 0.6;
          lockedAudioRef.current = new Audio('/sounds/kilitli.mp3'); lockedAudioRef.current.volume = 0.6;
          selectAudioRef.current = new Audio('/sounds/secenek.mp3'); selectAudioRef.current.volume = 0.5;

          const tryPlay = async () => {
              try {
                  if (bgMusicRef.current && ['MENU', 'LEVEL_SELECT', 'CHAR_SELECT'].includes(gameState)) {
                      await bgMusicRef.current.play();
                  }
              } catch (err) {
                  const playOnClick = () => {
                      if (bgMusicRef.current && ['MENU', 'LEVEL_SELECT', 'CHAR_SELECT'].includes(gameState)) {
                           bgMusicRef.current.play().catch(() => {});
                      }
                      document.removeEventListener('click', playOnClick);
                  };
                  document.addEventListener('click', playOnClick);
              }
          };
          tryPlay();
      }
  }, []); 

  // --- SES KONTROLLERİ ---
  useEffect(() => {
    if (['MENU', 'LEVEL_SELECT', 'CHAR_SELECT'].includes(gameState)) {
        if (gameMusicRef.current) { gameMusicRef.current.pause(); gameMusicRef.current.currentTime = 0; }
        if (bgMusicRef.current && bgMusicRef.current.paused) { bgMusicRef.current.play().catch(() => {}); }
    } else if (['STORY', 'GAME'].includes(gameState)) {
        if (bgMusicRef.current) { bgMusicRef.current.pause(); bgMusicRef.current.currentTime = 0; }
        if (gameMusicRef.current && gameMusicRef.current.paused) { gameMusicRef.current.play().catch(() => {}); }
    } else if (gameState === 'VICTORY') {
        if (bgMusicRef.current) bgMusicRef.current.pause();
        if (gameMusicRef.current) gameMusicRef.current.pause();
        if (victoryAudioRef.current) victoryAudioRef.current.play().catch(() => {});
    }
  }, [gameState]);

  useEffect(() => {
      if (walkAudioRef.current) {
          if (isWalking) walkAudioRef.current.play().catch(() => {});
          else { walkAudioRef.current.pause(); walkAudioRef.current.currentTime = 0; }
      }
  }, [isWalking]);

  const playUnlockSound = () => { unlockAudioRef.current?.play().catch(() => {}); };
  const playHowSound = () => { howAudioRef.current?.play().catch(() => {}); };
  const playSpellSound = () => { spellAudioRef.current?.play().catch(() => {}); };
  const playKeySound = () => { keyAudioRef.current?.play().catch(() => {}); };
  const playLockedSound = () => { lockedAudioRef.current?.play().catch(() => {}); };
  const playSelectSound = () => { selectAudioRef.current?.play().catch(() => {}); };

  // --- ACTIONS (DÜZELTİLMİŞ HALİ) ---
  const unlockLanguage = (langId: string, price: number) => {
    // Yeterli puan var mı kontrol et
    if (soulPoints >= price) {
        contextUpdateSoul(-price); // PUANI DÜŞ (Negatif değer gönderiyoruz)
        contextUnlockLang(langId); // Kilidi aç
        playUnlockSound();
    } else {
        // Yetersiz bakiye
        playLockedSound();
        setUnlockModal({ show: true, missing: price - soulPoints });
    }
  };

  const unlockLevel = (levelId: string, price: number) => {
    // Yeterli puan var mı kontrol et
    if (soulPoints >= price) {
        contextUpdateSoul(-price); // PUANI DÜŞ (Negatif değer gönderiyoruz)
        contextUnlockLevel(levelId); // Kilidi aç
        playUnlockSound();
    } else {
        // Yetersiz bakiye
        playLockedSound();
        setUnlockModal({ show: true, missing: price - soulPoints });
    }
  };

  // --- OYUNU BAŞLATMA (HİBRİT YAPI: LOCAL DATABASE'DEN ÇEKİYOR) ---
  const startGame = () => {
      // Filtreleme mantığı: Seçilen dil, seviye ve ESİR OLMAYAN karakterler
      const suitableStories = GAME_DATABASE.filter(story => 
          story.lang === (selectedLang || 'İngilizce') &&
          story.level === (selectedLevel || 'A1') &&
          story.prisonerId !== selectedChar
      );

      let chosenStory;
      if (suitableStories.length > 0) {
          const randomIndex = Math.floor(Math.random() * suitableStories.length);
          chosenStory = suitableStories[randomIndex];
      } else {
          // Eğer uygun hikaye yoksa varsayılanı kullan (Hata vermemesi için)
          chosenStory = GAME_DATABASE[0];
      }

      setActiveStory(chosenStory);
      setPlayerZ(0);
      setSolvedGates([]);
      setChestOpened(false);
      setHasKey(false);
      setNearGateId(null);
      setNearChest(false);
      setIsWalking(false);
      setGameState('STORY');
  };

  // --- MODAL AÇILINCA HAZIRLIK ---
  useEffect(() => {
      if (showModal && nearGateId !== null && activeStory) {
          const chapter = activeStory.chapters.find((c: any) => c.id === nearGateId);
          if (chapter) {
              setUserAnswer("");
              setFeedback("");
              if (chapter.type === 'ORDER_SENTENCES' && chapter.sentences) setSentenceOrder([]); 
              if (chapter.type === 'CARD_MATCH' && chapter.pairs) {
                   const cards: any[] = [];
                   chapter.pairs.forEach((pair: any, idx: number) => {
                       cards.push({ id: idx, content: pair.en, type: 'en', pairId: idx });
                       cards.push({ id: idx + 100, content: pair.tr, type: 'tr', pairId: idx });
                   });
                   for (let i = cards.length - 1; i > 0; i--) { 
                       const j = Math.floor(Math.random() * (i + 1));
                       [cards[i], cards[j]] = [cards[j], cards[i]];
                   }
                   setCardPairs(cards);
                   setFlippedCards([]);
                   setMatchedCards([]);
              }
          }
      }
  }, [showModal, nearGateId, activeStory]);

  // --- KART EŞLEŞTİRME MANTIĞI ---
  const handleCardClick = (index: number) => {
      if (flippedCards.length === 2 || flippedCards.includes(index) || matchedCards.includes(index)) return;
      const newFlipped = [...flippedCards, index];
      setFlippedCards(newFlipped);
      if (newFlipped.length === 2) {
          const card1 = cardPairs[newFlipped[0]];
          const card2 = cardPairs[newFlipped[1]];
          if (card1.pairId === card2.pairId) {
              setMatchedCards([...matchedCards, newFlipped[0], newFlipped[1]]);
              setFlippedCards([]);
          } else {
              setTimeout(() => setFlippedCards([]), 1000);
          }
      }
  };

// --- RENDER INPUT (KARTLAR AÇIK VE TERS DÖNME SORUNU YOK) ---
const renderInput = (chapter: Chapter) => {
  // 5. Tip: Cümle Sıralama
  if (chapter.type === 'ORDER_SENTENCES') {
      return (
          <div className="mb-6">
              <div className="bg-slate-900 p-4 rounded mb-4 min-h-[50px] border border-yellow-700 font-mono text-sm text-yellow-100">{sentenceOrder.join(" ")}</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {chapter.sentences?.filter(s => !sentenceOrder.includes(s)).map((s, i) => (
                  <button key={i} onClick={() => setSentenceOrder([...sentenceOrder, s])} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded text-xs text-white transition-colors">{s}</button>
              ))}</div>
              <button onClick={() => setSentenceOrder([])} className="mt-4 text-xs text-red-400 hover:text-red-300 underline">Sıfırlamak için tıkla</button>
          </div>
      )
  }
  // 10. Tip: Kart Eşleştirme (AÇIK KARTLAR)
  if (chapter.type === 'CARD_MATCH') {
      return (
          <div className="grid grid-cols-4 gap-2 mb-6">
              {cardPairs.map((card, idx) => {
                  const isSelected = flippedCards.includes(idx); // Şu an seçili mi?
                  const isMatched = matchedCards.includes(idx);  // Eşleşmiş mi?
                  
                  // Renk ayarları
                  let btnStyle = "bg-slate-800 border-slate-600 text-slate-300"; // Normal
                  if (isSelected) btnStyle = "bg-yellow-600 border-yellow-300 text-black font-bold scale-105"; // Seçili
                  if (isMatched) btnStyle = "bg-green-800 border-green-500 text-green-200 opacity-50 cursor-default"; // Eşleşmiş

                  return (
                    <button 
                        key={idx} 
                        disabled={isMatched} // Eşleşenlere tıklanmasın
                        onClick={() => handleCardClick(idx)} 
                        className={`h-20 rounded border-2 flex items-center justify-center text-xs p-1 transition-all duration-200 ${btnStyle}`}
                    >
                        {card.content}
                    </button>
                  )
              })}
          </div>
      )
  }
// 3. Tip: Audio Dictation (Sadece dinle ve yaz)
if (chapter.type === 'AUDIO_DICTATION') {
  return (
      <div className="mb-6">
          <button 
              onClick={() => playTextAudio(chapter.audioText || "")}
              className="w-full py-4 bg-yellow-700/50 border border-yellow-500 rounded-lg text-yellow-100 font-bold mb-4 hover:bg-yellow-600/50 transition-all flex items-center justify-center gap-2"
          >
              <span>🔊</span> SES KAYDINI DİNLE
          </button>
          <input type="text" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="Duyduğunuz cümleyi yazın..." className="w-full bg-black/50 text-white p-4 border-b-2 border-slate-600 focus:border-yellow-500 outline-none font-mono text-center" />
      </div>
  )
}

// 6. Tip: Audio Question (Dinle ve Seç)
if (chapter.type === 'AUDIO_QUESTION') {
return (
    <div className="mb-6">
        <button 
              onClick={() => playTextAudio(chapter.audioText || "")}
              className="w-full py-4 bg-yellow-700/50 border border-yellow-500 rounded-lg text-yellow-100 font-bold mb-4 hover:bg-yellow-600/50 transition-all flex items-center justify-center gap-2"
          >
              <span>🔊</span> SORUYU DİNLE
        </button>
        <div className="grid grid-cols-1 gap-2">
            {chapter.options?.map((opt, idx) => (
                <button key={idx} onClick={() => { setUserAnswer(opt); setTimeout(handleAnswerSubmit, 100); }} className="p-3 bg-slate-800 hover:bg-yellow-700 border border-slate-600 hover:border-yellow-500 rounded text-left transition-all text-white font-serif text-sm">
                    {opt}
                </button>
            ))}
        </div>
    </div>
)
}
  // 7. Tip: Fix All Errors
  if (chapter.type === 'FIX_ALL_ERRORS') {
      return (
          <textarea 
              value={userAnswer} 
              onChange={(e) => setUserAnswer(e.target.value)} 
              placeholder="Doğru cümleleri alt alta yazınız..." 
              className="w-full bg-black/50 text-white p-4 border rounded border-slate-600 focus:border-yellow-500 outline-none mb-6 font-mono min-h-[150px] text-sm leading-relaxed"
          />
      )
  }
  // Şıklı Sorular
  if (chapter.options) {
      return (
        <div className="grid grid-cols-1 gap-3 mb-6">
            {chapter.options.map((opt: string, idx: number) => (
                <button key={idx} onClick={() => { setUserAnswer(opt); setTimeout(handleAnswerSubmit, 100); }} className="p-4 bg-slate-800 hover:bg-yellow-700 border border-slate-600 hover:border-yellow-500 rounded text-left transition-all text-white font-serif text-sm leading-snug">{opt}</button>
            ))}
        </div>
      )
  }
  // Diğer Yazmalı Sorular
  return (
    <input type="text" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="Cevabınızı buraya yazın..." className="w-full bg-black/50 text-white p-4 text-center text-xl border-b-2 border-slate-600 focus:border-yellow-500 outline-none mb-6 font-mono transition-colors" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAnswerSubmit()} />
  )
};

  // --- CEVAP KONTROLÜ ---
  const handleAnswerSubmit = () => {
      if (nearGateId !== null && activeStory) {
          const chapter = activeStory.chapters.find((c: any) => c.id === nearGateId);
          if (!chapter) return;

          let isCorrect = false;
          const userClean = userAnswer.trim().toLowerCase();
          const answerClean = Array.isArray(chapter.answer) ? "" : chapter.answer.toLowerCase();

          // Eski tipler
          if (['GRAMMAR_GAP', 'VOCAB', 'READING_COMP', 'SENTENCE_INSERT', 'FIND_WRONG_LOGIC', 'FIND_GRAMMAR_ERR', 'CLOZE_TEST_5', 'GRAMMAR_CONTEXT', 'IRRELEVANT_SENT', 'CORRECT_SENTENCE'].includes(chapter.type)) {
               if (userClean === answerClean || userClean === answerClean.replace(/,\s*/g, ',')) isCorrect = true;
          }
          // YENİ TİPLER:
          else if (['FIX_GRAMMAR_IN_TEXT', 'SYNONYM_IN_PARAGRAPH', 'AUDIO_DICTATION', 'SENTENCE_GAP_FILL', 'AUDIO_QUESTION', 'IDIOM_GAP_FILL'].includes(chapter.type)) {
               if (userClean === answerClean || userClean === answerClean.replace(/,\s*/g, ',')) isCorrect = true;
          }
          else if (chapter.type === 'ORDER_SENTENCES') {
               if (sentenceOrder.join(" ") === (chapter.answer as string)) isCorrect = true;
          }
          else if (chapter.type === 'FIX_ALL_ERRORS') {
               const correctAnswers = chapter.answer as string[];
               if (correctAnswers.every(ans => userAnswer.toLowerCase().includes(ans.toLowerCase()))) isCorrect = true;
          }
          else if (chapter.type === 'TRANSLATE_WORDS') {
               const userWords = userAnswer.split(',').map(w => w.trim().toLowerCase());
               const correctWords = (chapter.answer as string).split(',').map(w => w.trim().toLowerCase());
               if (userWords.join(',') === correctWords.join(',')) isCorrect = true;
          }
          else if (chapter.type === 'CARD_MATCH') {
               if (matchedCards.length === chapter.pairs!.length * 2) isCorrect = true;
          }

          if (isCorrect) {
              playSpellSound();
              setSolvedGates([...solvedGates, chapter.id]);
              setShowModal(false);
              setNearGateId(null);
              setShowFlyingCoin(true);
              setTimeout(() => {
                  contextUpdateSoul(20); 
                  setShowFlyingCoin(false);
                  setScoreBump(true);
                  setTimeout(() => setScoreBump(false), 300);
              }, 800);
          } else {
              setFeedback("Wrong answer! Try again.");
          }
      } else if (nearChest && activeStory) {
          if (userAnswer.trim().toLowerCase() === activeStory.chestAnswer.toLowerCase()) {
              playKeySound();
              setChestOpened(true);
              setHasKey(true);
              setShowModal(false);
              setNearChest(false);
              setShowFlyingCoin(true);
              setTimeout(() => {
                  contextUpdateSoul(100); 
                  setShowFlyingCoin(false);
                  setScoreBump(true);
                  setTimeout(() => setScoreBump(false), 300);
              }, 800);
          } else {
              setFeedback("Locked... Wrong password.");
          }
      }
  };

  useEffect(() => {
    if (gameState !== 'GAME' || !activeStory) return;
    let foundGate = null;
    for (const chapter of activeStory.chapters) {
        if (!solvedGates.includes(chapter.id) && Math.abs(playerZ - chapter.z) < 4) {
            foundGate = chapter.id;
            break;
        }
    }
    setNearGateId(foundGate);
    if (!chestOpened && Math.abs(playerZ - (-320)) < 5) setNearChest(true);
    else setNearChest(false);
    if (hasKey && playerZ <= FINAL_Z + 5) {
        setGameState('VICTORY');
        contextUpdateSoul(500); 
    }
  }, [playerZ, solvedGates, gameState, chestOpened, hasKey, activeStory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'GAME') return;
      const canWalk = !showModal && nearGateId === null && !nearChest;
      if (e.key === "ArrowUp") setIsWalking(canWalk);
      if (e.key === " " && !showModal) {
          if (nearGateId !== null || nearChest) {
              setShowModal(true);
              setUserAnswer("");
              setFeedback("");
          }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key === "ArrowUp") setIsWalking(false); };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); };
  }, [gameState, showModal, nearGateId, nearChest]);

  // --- ÖZEL BİLEŞENLER ---
  const TopRightScore = () => (
      <div className={`absolute top-6 right-6 z-30 flex items-center gap-4 bg-black/60 px-6 py-3 rounded-full border border-yellow-600/50 backdrop-blur-sm shadow-xl transition-transform duration-300 ${scoreBump ? 'scale-125 border-yellow-400 bg-yellow-900/50' : 'scale-100'}`}>
          {user?.displayName && (
              <div className="flex flex-col items-end mr-2 border-r border-yellow-600/30 pr-4">
                  <span className="text-yellow-100 font-['Cinzel_Decorative'] text-sm tracking-widest uppercase">{user.displayName}</span>
                  <span className="text-yellow-600/70 text-[10px] uppercase tracking-wider">Oyuncu</span>
              </div>
          )}
          <div className="flex items-center gap-3">
              <img src="/gold.png" alt="gold" className="w-14 h-14 object-contain drop-shadow-md" />
              <span className="text-yellow-200 font-bold text-2xl font-['Cinzel_Decorative'] tracking-widest drop-shadow-lg">{soulPoints}</span>
          </div>
      </div>
  );

  const FlyingCoinAnimation = () => (
      <div className="fixed top-1/2 left-1/2 z-50 pointer-events-none animate-fly-coin"><img src="/gold.png" alt="Flying Gold" className="w-24 h-24 drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]" /></div>
  );

  const UnlockErrorModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-[#0f0f15] border-2 border-red-900/80 p-10 rounded-2xl max-w-md w-full text-center shadow-[0_0_50px_rgba(220,38,38,0.3)] relative">
            <div className="w-24 h-24 mx-auto mb-6 opacity-80 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]"><img src="/lock.png" alt="locked" className="w-full h-full object-contain" /></div>
            <h3 className="text-3xl text-red-600 font-['Cinzel_Decorative'] font-bold mb-4 tracking-widest drop-shadow-lg">MÜHÜRLÜ</h3>
            <p className="text-xl text-slate-300 font-serif mb-8 leading-relaxed">"Bu Geçidi Açacak Gücün Yok!"</p>
            <div className="bg-red-950/30 border border-red-900/30 p-4 rounded-lg mb-8 flex flex-col items-center gap-2">
                <span className="text-red-400 text-xs uppercase tracking-[0.2em] font-['Cinzel_Decorative']">Gereken İksir Miktarı</span>
                <div className="flex items-center gap-2"><span className="text-2xl text-yellow-500 font-bold font-mono">+{unlockModal?.missing}</span><img src="/gold.png" alt="gold" className="w-8 h-8 object-contain" /></div>
            </div>
            <button onClick={() => setUnlockModal(null)} style={{ fontFamily: "'Cinzel Decorative', serif" }} className="w-full py-4 bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-white font-bold text-lg rounded border border-red-700/50 transition-all uppercase tracking-[0.2em] shadow-lg font-['Cinzel_Decorative']">ANLAŞILDI</button>
        </div>
    </div>
  );

  const HowToPlayModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300 p-4">
        <div className="relative max-w-4xl w-full bg-[#1a0b2e] border-8 border-double border-yellow-600/60 p-8 md:p-12 rounded-xl shadow-[0_0_60px_rgba(147,51,234,0.3)] text-center flex flex-col items-center gap-6 text-slate-200 font-['Cinzel_Decorative'] overflow-y-auto max-h-[90vh]">
           <h2 className="text-4xl md:text-6xl font-bold tracking-widest border-b-4 border-yellow-600/60 pb-2 mb-4 relative text-yellow-500 drop-shadow-lg">NASIL OYNANIR?</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left w-full text-lg font-serif relative z-10">
               <div className="flex gap-4 items-start group"><span className="text-4xl filter drop-shadow-lg group-hover:scale-110 transition-transform">🏰</span><div><h3 className="font-bold text-xl mb-1 text-yellow-500 uppercase tracking-wide">Dil ve Seviye Seç</h3><p className="leading-relaxed font-medium text-slate-300">Öğrenmek istediğin dili ve zorluk seviyesini seçerek maceraya başla.</p></div></div>
               <div className="flex gap-4 items-start group"><span className="text-4xl filter drop-shadow-lg group-hover:scale-110 transition-transform">🧙‍♂️</span><div><h3 className="font-bold text-xl mb-1 text-yellow-500 uppercase tracking-wide">Karakterini Seç</h3><p className="leading-relaxed font-medium text-slate-300">Seni temsil edecek kahramanı seç. Her karakterin ruhu farklıdır.</p></div></div>
               <div className="flex gap-4 items-start group"><span className="text-4xl filter drop-shadow-lg group-hover:scale-110 transition-transform">⬆️</span><div><h3 className="font-bold text-xl mb-1 text-yellow-500 uppercase tracking-wide">İlerle ve Keşfet</h3><p className="leading-relaxed font-medium text-slate-300">Karakterini yürütmek için klavyendeki <b className="text-white">YUKARI OK</b> tuşuna basılı tut.</p></div></div>
               <div className="flex gap-4 items-start group"><span className="text-4xl filter drop-shadow-lg group-hover:scale-110 transition-transform">📜</span><div><h3 className="font-bold text-xl mb-1 text-yellow-500 uppercase tracking-wide">Kapıları Aç</h3><p className="leading-relaxed font-medium text-slate-300">Her kapıda bir soru seni bekler. <b className="text-white">SPACE</b> tuşuna bas, soruyu cevapla ve geç.</p></div></div>
               <div className="flex gap-4 items-start group"><span className="text-4xl filter drop-shadow-lg group-hover:scale-110 transition-transform">🗝️</span><div><h3 className="font-bold text-xl mb-1 text-yellow-500 uppercase tracking-wide">Sandığı Bul</h3><p className="leading-relaxed font-medium text-slate-300">Yolun sonunda gizli sandığı bul ve şifreyi çözerek anahtarı al.</p></div></div>
               <div className="flex gap-4 items-start group"><span className="text-4xl filter drop-shadow-lg group-hover:scale-110 transition-transform">🏆</span><div><h3 className="font-bold text-xl mb-1 text-yellow-500 uppercase tracking-wide">Kurtar</h3><p className="leading-relaxed font-medium text-slate-300">Anahtarı aldıktan sonra esir tutulan kişiyi kurtar ve ödülünü al!</p></div></div>
           </div>
           <button onClick={() => setShowHowToPlay(false)} className="mt-6 px-12 py-4 bg-gradient-to-r from-purple-900 to-purple-700 hover:from-purple-800 hover:to-purple-600 text-white border-2 border-purple-500/50 rounded-lg text-xl tracking-[0.2em] transition-all shadow-lg hover:shadow-purple-500/30 hover:-translate-y-1 relative z-10">ANLAŞILDI</button>
        </div>
    </div>
  );

  // --- MENÜ (GİRİŞ KONTROLÜ) ---
  if (gameState === 'MENU') {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-start flex-col pt-10 bg-black text-slate-200 overflow-hidden">
         <div className="absolute inset-0 z-0"><video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-70"><source src="/castle-bg-video.mp4" type="video/mp4" /></video><div className="absolute inset-0 bg-black/40"></div></div>
         
         {/* GİRİŞ YAPILMAMIŞSA */}
         {!user && (
             <div className="relative z-50 flex flex-col items-center justify-center h-full mt-40">
                 <h1 className="text-6xl text-yellow-500 mb-32 font-bold tracking-widest drop-shadow-lg font-['Cinzel_Decorative']">CASTLE OF THE WORDS</h1>
                 <button onClick={loginGoogle} className="mt-32 px-8 py-4 bg-white text-black font-bold rounded-full text-xl hover:scale-105 transition-transform flex items-center gap-3 shadow-lg">
                     <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-8 h-8" alt="google" />
                     Google ile Giriş Yap
                 </button>
             </div>
         )}

         {/* GİRİŞ YAPILMIŞSA */}
         {user && (
             <>
                <button onClick={() => { playHowSound(); setShowHowToPlay(true); }} className="absolute top-6 left-6 z-50 hover:scale-110 transition-transform cursor-pointer group" title="Nasıl Oynanır?">
                    <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <img src="/question-icon.png" alt="Nasıl Oynanır" className="w-28 h-28 object-contain drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                </button>

                {showHowToPlay && <HowToPlayModal />}
                <TopRightScore />
                {unlockModal && <UnlockErrorModal />}
                
                {/* ÇIKIŞ BUTONU */}
                <button 
                    onClick={logout}
                    className="absolute top-36 right-6 z-30 flex items-center gap-2 bg-red-900/40 hover:bg-red-900/80 px-4 py-2 rounded-full border border-red-500/50 backdrop-blur-sm transition-all group shadow-lg hover:shadow-red-900/50"
                >
                    <span className="text-red-200 font-bold text-sm font-['Cinzel_Decorative'] tracking-widest">ÇIKIŞ</span>
                    <span className="text-xl group-hover:rotate-12 transition-transform">🚪</span>
                </button>

                <div className="relative z-10 text-center w-full max-w-6xl px-4">
                    <h1 className="text-5xl md:text-7xl font-bold text-yellow-500 mb-52 drop-shadow-[0_10px_10px_rgba(0,0,0,1)] tracking-widest font-['Cinzel_Decorative']">CASTLE OF THE WORDS</h1>
                    <div className="h-16 w-full"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 px-8">
                    {availableLangs.map(lang => (
                        <button key={lang.id} onClick={() => lang.locked ? unlockLanguage(lang.id, lang.price) : (playSelectSound(), setSelectedLang(lang.id), setGameState('LEVEL_SELECT'))}
                        className={`relative w-full h-24 grid grid-cols-[auto_1fr_auto] items-center rounded-xl border-2 transition-all overflow-hidden group px-2 ${lang.locked ? 'bg-stone-900/80 border-yellow-900/50' : 'bg-slate-900/80 border-yellow-500/70 hover:scale-[1.02]'}`}>
                        {lang.locked && <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-24 h-24 z-20 drop-shadow-lg"><img src="/lock.png" alt="locked" className="w-full h-full object-contain" /></div>}
                        <div className={`flex items-center pl-6 pr-4 ${lang.locked ? 'opacity-40 pl-16' : ''}`}>
                            <img src={lang.img} alt={lang.id} className="w-12 h-8 object-contain mr-4 drop-shadow-md flex-shrink-0" />
                            <span className={`text-xl font-['Cinzel_Decorative'] font-bold tracking-wider text-left ${lang.locked ? 'text-stone-400' : 'text-yellow-500'} truncate`}>{lang.id}</span>
                        </div>
                        <div></div>
                        <div className="pr-6 flex items-center justify-end gap-3 w-48 flex-shrink-0 relative z-30">
                            {lang.locked ? <><span className="text-yellow-500 font-bold text-xl font-['Cinzel_Decorative']">{lang.price}</span><img src="/gold.png" className="w-10 h-10 object-contain" /></> : <span className="text-green-500 font-bold text-xs tracking-widest font-['Cinzel_Decorative'] w-full text-right">AÇIK</span>}
                        </div>
                        {lang.locked && <div className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>}
                        </button>
                    ))}
                    </div>
                </div>
             </>
         )}
      </div>
    );
  }

  // --- LEVEL SELECT (Aynen Korundu) ---
  if (gameState === 'LEVEL_SELECT') {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-start flex-col pt-20 bg-black text-slate-200 font-['Cinzel_Decorative'] overflow-hidden">
         <div className="absolute inset-0 z-0"><video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-70"><source src="/castle-bg-video.mp4" type="video/mp4" /></video><div className="absolute inset-0 bg-black/40"></div></div>
         <TopRightScore />
         {unlockModal && <UnlockErrorModal />}
         <div className="relative z-10 text-center w-full max-w-6xl px-4">
            <h2 className="text-5xl font-bold text-yellow-500 mb-4 drop-shadow-lg tracking-widest">SEVİYE SEÇ</h2>
            <div className="h-12 w-full"></div>
            <p className="text-2xl text-yellow-600/80 mb-4">Dil: <span className="text-yellow-400 font-bold">{selectedLang}</span></p>
            <div className="h-16 w-full"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 px-8">
              {availableLevels.map(lvl => (
                <button key={lvl.id} onClick={() => lvl.locked ? unlockLevel(lvl.id, lvl.price) : (playSelectSound(), setSelectedLevel(lvl.id))}
                  className={`relative w-full h-24 grid grid-cols-[auto_1fr_auto] items-center rounded-xl border-2 transition-all overflow-hidden px-6 group ${lvl.locked ? 'bg-stone-900/80 border-red-900/50' : selectedLevel === lvl.id ? 'bg-yellow-900/40 border-yellow-400 scale-[1.02]' : 'bg-slate-900/80 border-yellow-600/50 hover:scale-[1.01]'}`}>
                  {lvl.locked && <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-24 h-24 z-20"><img src="/lock.png" className="w-full h-full object-contain" /></div>}
                  <div className={`flex flex-col items-start ${lvl.locked ? 'pl-16 opacity-60' : ''}`}>
                    <span className={`text-2xl font-bold ${lvl.locked ? 'text-stone-500' : 'text-yellow-200'}`}>{lvl.id}</span>
                    <span className="text-xs text-slate-400 uppercase tracking-widest">{lvl.name}</span>
                  </div>
                  <div></div>
                  <div className="flex items-center justify-end w-40 flex-shrink-0 gap-3 relative z-30">
                    {lvl.locked ? <><span className="text-xl text-yellow-500 font-bold font-['Cinzel_Decorative']">{lvl.price}</span><img src="/gold.png" className="w-8 h-8 object-contain flex-shrink-0" /></> : <span className="text-green-500 font-bold text-xs tracking-widest uppercase text-right font-['Cinzel_Decorative']">AÇIK</span>}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-4 px-8">
                <button onClick={() => { playSelectSound(); setGameState('MENU'); }} className="flex-1 py-4 border-2 border-yellow-700/50 text-yellow-600 font-bold text-lg rounded-xl hover:bg-yellow-900/20 transition-all">GERİ</button>
                <button disabled={!selectedLevel} onClick={() => { playSelectSound(); setGameState('CHAR_SELECT'); }} className="flex-1 py-4 bg-gradient-to-r from-yellow-700 to-yellow-500 text-black font-bold text-xl rounded-xl disabled:opacity-50 shadow-lg">KARAKTER SEÇ</button>
            </div>
         </div>
      </div>
    );
  }

  if (gameState === 'CHAR_SELECT') {
    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#0f0f15] text-slate-200 font-['Cinzel_Decorative'] p-4">
            <TopRightScore />
            <h2 className="text-4xl text-slate-300 mb-4 tracking-widest uppercase">Karakterini Seç</h2>
            <div className="h-20 w-full"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-6xl w-full">
                {CHARACTERS.map(char => (
                    <button key={char.id} onClick={() => { playSelectSound(); setSelectedChar(char.id); }}
                        className={`group relative h-[600px] w-full bg-slate-900 border-2 rounded-xl flex flex-col items-center justify-end p-6 transition-all hover:-translate-y-2 overflow-hidden ${selectedChar === char.id ? 'border-yellow-500 scale-105 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'border-slate-700 hover:border-slate-500'}`}>
                        <div className="absolute inset-0 z-0"><img src={char.img} alt={char.name} className="w-full h-full object-cover opacity-95 group-hover:opacity-100 transition-opacity" /><div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div></div>
                        <div className="z-10 text-center relative"><h3 className="text-3xl font-bold text-white mb-2 drop-shadow-md">{char.name}</h3><p className="text-sm text-slate-300 uppercase tracking-widest bg-black/50 px-3 py-1 rounded-full border border-slate-600">{char.role}</p></div>
                    </button>
                ))}
            </div>
            <div className="flex gap-4 w-full max-w-4xl px-8">
                <button onClick={() => { playSelectSound(); setGameState('LEVEL_SELECT')}} className="flex-1 py-4 border-2 border-yellow-700/50 text-yellow-600 font-bold text-lg rounded-xl hover:bg-yellow-900/20 transition-all">GERİ</button>
                <button disabled={!selectedChar} onClick={() => { playSelectSound(); startGame(); }} className="flex-1 py-4 bg-gradient-to-r from-yellow-700 to-yellow-500 text-black font-bold text-xl rounded-xl disabled:opacity-50 shadow-lg">ONAYLA VE BAŞLA</button>
            </div>
        </div>
    );
  }

  if (gameState === 'STORY') {
      return (
          <div className="min-h-screen bg-black flex items-center justify-center p-8 cursor-pointer text-center font-['Cinzel_Decorative']" onClick={() => setGameState('GAME')}>
              <div className="absolute inset-0 z-0 bg-[url('/castle-bg.png')] bg-cover opacity-20"></div>
              <div className="max-w-4xl bg-black/80 p-12 rounded-2xl border-2 border-yellow-800 shadow-2xl relative z-10 animate-in zoom-in duration-700">
                  <p className="text-yellow-600 text-sm tracking-[0.5em] mb-8 uppercase">GÜNLÜK GÖREVİ</p>
                  <h2 className="text-4xl md:text-5xl text-yellow-500 mb-8 drop-shadow-lg">{activeStory?.title}</h2>
                  <p className="text-2xl text-slate-300 leading-relaxed font-serif mb-12 italic">"{activeStory?.intro}"</p>
                  <p className="text-slate-500 text-sm blink uppercase tracking-widest border-t border-slate-800 pt-8">[ MACERAYA BAŞLAMAK İÇİN TIKLA ]</p>
              </div>
          </div>
      );
  }

  if (gameState === 'VICTORY') {
    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-black text-slate-200 font-['Cinzel_Decorative'] overflow-hidden">
           <div className="absolute inset-0 z-0"><img src="/castle-bg.jpg" className="w-full h-full object-cover opacity-40" alt="background" /><div className="absolute inset-0 bg-black/60"></div></div>
           <div className="relative z-10 max-w-3xl w-full bg-[#1a1a1a]/90 border-4 border-yellow-600/60 p-12 rounded-xl shadow-[0_0_50px_rgba(234,179,8,0.2)] text-center backdrop-blur-sm flex flex-col items-center gap-8">
              <div className="mb-4">
                  <h1 className="text-7xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-700 drop-shadow-[0_2px_10px_rgba(234,179,8,0.5)] tracking-widest">ZAFER!</h1>
                  <div className="h-1 w-32 bg-gradient-to-r from-transparent via-yellow-600 to-transparent mx-auto mt-4"></div>
              </div>
              <div className="relative">
                  <div className="text-9xl animate-bounce drop-shadow-[0_0_30px_rgba(255,215,0,0.6)]">{activeStory?.targetEmoji}</div>
                  <div className="mt-6 text-2xl text-slate-300 font-serif italic">"<span className="text-yellow-500 font-bold">{activeStory?.targetName}</span> başarıyla kurtarıldı."</div>
              </div>
              <div className="bg-black/40 border border-yellow-900/50 p-6 rounded-lg w-full max-w-md transform hover:scale-105 transition-transform duration-300">
                  <p className="text-yellow-700 text-sm tracking-[0.3em] mb-2 uppercase">KAZANILAN ÖDÜL</p>
                  <div className="flex items-center justify-center gap-4"><span className="text-6xl text-yellow-400 font-bold drop-shadow-md">+500</span><img src="/gold.png" alt="gold" className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(255,215,0,0.4)]" /></div>
              </div>
              <button onClick={() => setGameState('MENU')} className="mt-4 px-12 py-4 bg-gradient-to-r from-yellow-900/80 to-yellow-700/80 hover:from-yellow-800 hover:to-yellow-600 text-yellow-100 border-2 border-yellow-500/50 rounded-lg text-xl tracking-[0.2em] transition-all shadow-lg hover:shadow-yellow-900/40 hover:-translate-y-1">ANA MENÜYE DÖN</button>
           </div>
        </div>
    );
  }

  // --- OYUN EKRANI ---
  return (
    <div className="w-full h-screen bg-black relative font-mono overflow-hidden">
      {/* Sol Üst Bilgi */}
      <div className="absolute top-6 left-6 z-10 flex gap-4 pointer-events-none font-['Cinzel_Decorative'] animate-in slide-in-from-left duration-500">
         <div className="w-20 h-20 rounded-full border-2 border-yellow-600 bg-slate-900 flex items-center justify-center text-4xl shadow-lg overflow-hidden">
            {selectedChar && <img src={CHARACTERS.find(c => c.id === selectedChar)?.img || ''} className="w-full h-full object-cover object-top" alt={selectedChar} />}
         </div>
         <div className="flex flex-col justify-center">
             <span className="text-yellow-500 font-bold text-xl uppercase tracking-wider">{CHARACTERS.find(c => c.id === selectedChar)?.name}</span>
             <div className="text-xs text-white mt-1 bg-black/50 px-2 py-1 rounded border border-slate-700">Hedef: <span className="text-white">{activeStory?.targetName}</span></div>
             <div className="text-xs text-white mt-1">Bölüm: {solvedGates.length} / 10</div>
         </div>
      </div>
      <TopRightScore />
      {showFlyingCoin && <FlyingCoinAnimation />}
      {hasKey && <div className="absolute top-24 right-6 z-10 animate-bounce"><div className="bg-yellow-900/80 p-3 rounded-full border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]"><span className="text-3xl">🗝️</span></div></div>}
      <div className="absolute bottom-10 w-full text-center pointer-events-none z-10 font-['Cinzel_Decorative']">
        {nearGateId !== null && !showModal ? <div className="animate-pulse bg-yellow-600 text-black font-bold py-3 px-8 rounded-full inline-block shadow-lg border-2 border-yellow-400">[ SPACE ] TUŞUNA BAS</div> : nearChest && !showModal ? <div className="animate-pulse bg-purple-600 text-white font-bold py-3 px-8 rounded-full inline-block shadow-lg border-2 border-purple-400">SANDIĞI AÇ [ SPACE ]</div> : <p className={`text-xl font-bold transition-all ${isWalking ? 'text-yellow-500' : 'text-white'}`}>{isWalking ? "YÜRÜYOR..." : "YÜRÜMEK İÇİN [ YUKARI OK ]"}</p>}
      </div>
      
{/* --- SORU MODALI (DÜZELTİLMİŞ HALİ) --- */}
{showModal && (
<div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md font-['Cinzel_Decorative'] animate-in zoom-in duration-200">
    <div className={`border-4 p-10 rounded-2xl max-w-2xl w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center relative ${nearChest ? 'bg-[#1a0b2e] border-purple-500 shadow-purple-900/50' : 'bg-[#1a1a2e] border-yellow-600 shadow-yellow-900/50'}`}>
        
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black px-4 text-2xl">{nearChest ? "🗝️" : "📜"}</div>
        <h3 className={`text-xl tracking-[0.3em] uppercase mb-4 ${nearChest ? 'text-purple-400' : 'text-yellow-500'}`}>{nearChest ? "KİLİTLİ SANDIK" : `BÖLÜM ${nearGateId}`}</h3>
        
        {/* --- SANDIK İSE (ŞIKLI) --- */}
        {nearChest && (
            <div className="text-center">
                <div className="text-xl text-white mb-6 font-serif italic">"{activeStory?.chestQuestion}"</div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {activeStory?.chestOptions?.map((opt, i) => (
                        <button 
                            key={i} 
                            onClick={() => { setUserAnswer(opt); setTimeout(handleAnswerSubmit, 100); }}
                            className="p-4 bg-purple-900/40 border border-purple-500/50 hover:bg-purple-800 hover:border-purple-400 rounded-lg text-white transition-all font-['Cinzel_Decorative']"
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* --- NORMAL KAPI İSE --- */}
        {!nearChest && nearGateId !== null && (
            <div className="mb-6">
                {/* Hikaye Metni */}
                <p className="text-lg text-slate-300 font-serif mb-4 leading-relaxed border-b border-slate-700 pb-4">
                    {activeStory?.chapters.find((c: any) => c.id === nearGateId)?.storyText}
                </p>
                {/* Soru Metni */}
                <p className="text-xl text-yellow-100 font-bold mb-6 whitespace-pre-line">
                    {activeStory?.chapters.find((c: any) => c.id === nearGateId)?.question}
                </p>
                
                {/* Özel Input Render Fonksiyonu */}
                {renderInput(activeStory?.chapters.find((c: any) => c.id === nearGateId)!)}
            </div>
        )}

        {feedback && <p className="text-red-400 mb-6 font-bold animate-pulse bg-red-900/20 py-2 rounded">{feedback}</p>}
        
        <div className="flex gap-4">
            <button onClick={() => setShowModal(false)} className="flex-1 py-4 border border-slate-600 text-slate-400 rounded-lg hover:bg-slate-800 transition-colors">VAZGEÇ</button>
            
        {/* Sadece şıklı olmayan durumlarda ve Sesli Soru değilse buton göster. KART EŞLEŞTİRMEDE ARTIK GÖSTERİYORUZ. */}
        {(!nearChest && nearGateId && !activeStory?.chapters.find((c: any) => c.id === nearGateId)?.options && activeStory?.chapters.find((c: any) => c.id === nearGateId)?.type !== 'AUDIO_QUESTION') && (
            <button onClick={handleAnswerSubmit} className={`flex-1 py-4 text-black font-bold rounded-lg transition-all hover:scale-105 ${nearChest ? 'bg-purple-500 hover:bg-purple-400' : 'bg-yellow-600 hover:bg-yellow-500'}`}>
                {activeStory?.chapters.find((c: any) => c.id === nearGateId)?.type === 'CARD_MATCH' ? 'TAMAMLA' : (nearChest ? "KİLİDİ KIR" : "BÜYÜ YAP")}
            </button>
        )}
        </div>
    </div>
</div>
)}

      <Canvas shadows camera={{ position: [0, 2, 5], fov: 60 }}>
        <Suspense fallback={null}>
            <EnvironmentWrapper />
            {selectedChar && <Player isWalking={isWalking} charType={selectedChar} setPlayerZ={setPlayerZ} />}
            {activeStory?.chapters.map((chapter: any) => <Gate key={chapter.id} data={chapter} isOpen={solvedGates.includes(chapter.id)} />)}
            <Chest isOpen={chestOpened} />
            <group position={[0, 0, FINAL_Z]}>
                 <mesh position={[0, 0.25, 0]} receiveShadow><boxGeometry args={[10, 0.5, 6]} /><meshStandardMaterial color="#333" roughness={0.8} metalness={0.2} /></mesh>
                 {!hasKey && <mesh position={[0, 2.5, 0]}><cylinderGeometry args={[4, 4, 5, 32]} /><meshBasicMaterial color="red" transparent opacity={0.3} side={THREE.DoubleSide} /></mesh>}
            </group>
            <RescueTarget targetName={activeStory?.targetName || ''} emoji={activeStory?.targetEmoji || ''} />
        </Suspense>
      </Canvas>
    </div>
  );
}
# Castle of the Words 🏰


**Castle of the Words**  is an immersive 3D RPG that transforms language learning into a dark fantasy adventure. Built with **Next.js** and **React Three Fiber**, players explore a mysterious castle, solve linguistic puzzles, and rescue trapped characters by mastering grammar and vocabulary.

## 🚀 Live Demo

Play the game directly in your browser:

👉 **[Launch Castle of the Words](https://castle-of-the-words.vercel.app/)**

---

## 🎮 Gameplay Features

* **Immersive 3D Exploration:** Walk through candle-lit hallways and dungeons rendered in real-time.
* **Language Puzzles:** Open locked doors (`CastleGate`) by solving grammar challenges in various global languages.
* **RPG Progression:** Rescue characters like the King, Queen, and Wizard as you advance from A1 to C2 levels.
* **Dynamic HUD:** Track your progress, collected keys, and XP via the in-game Heads-Up Display (`GameHUD`).

---

## 🗺️ Journey Guide (How to Play)


### 🏰 1. Choose Your Path
Begin your adventure by selecting the target language you wish to master and your desired difficulty level (from A1 Beginner to C2 Master).

### 🧙‍♂️ 2. Select Your Avatar
Choose the hero that will represent you in the realm. Each character carries a unique spirit suited for the challenges ahead.

### ⬆️ 3. Advance & Explore
Navigate the dark, atmospheric hallways. Press and hold the **UP ARROW** key (↑) on your keyboard to move your character forward into the unknown.

### 📜 4. Unlock the Gates
A linguistic challenge guards every door. Approach a gate and press the **SPACE** key to interact. Solve the grammar puzzle correctly to break the seal and pass through.

### 🗝️ 5. Locate the Artifact
Survive the dungeon path to find the hidden chest at the end. Solve the final cipher guarding it to obtain the mystical Key.

### 🏆 6. Rescue the Captive
Use the acquired key to free the trapped inhabitant (King, Queen, or Wizard) and claim your well-earned reward!

---

## 🕹️ Controls

| Action | Input |
| :--- | :--- |
| **Move Forward** | `Up Arrow Key` (↑) |
| **Open Door** | `Space Key` |
| **Solve Puzzle** | Click on options in the modal |

---


## 📂 Project Structure



```bash
src/
├── app/
│   ├── layout.tsx         # Global layout & fonts
│   ├── page.tsx           # Main entry point
│   ├── globals.css        # Global styles (Tailwind imports)
│   └── icon.png           # App Favicon
├── components/
│   ├── HallwayGame.tsx    # Core 3D environment & movement logic
│   ├── CastleGate.tsx     # Interactive 3D doors with puzzle triggers
│   ├── GameHUD.tsx        # 2D Overlay for stats and inventory
│   └── ChallengeModal.tsx # The language puzzle interface
├── lib/
│   ├── firebase.ts        # Firebase configuration & auth logic
│   └── utils.ts           # Helper functions
├── tailwind.config.ts     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration


```

---



## 🛠️ Tech Stack

This project uses a modern, performance-focused stack:

* **Framework:** Next.js 14 (App Router)

* **3D Engine:** React Three Fiber (Three.js for React)

* **Language:** TypeScript (Strict type safety)

* **Styling:** Tailwind CSS (For UI overlays and modals)

* **Backend:** Firebase (Authentication & Progress Saving)


---


## 🚀 Getting Started

To run this project locally, follow these steps:

Clone the repository

```bash

git clone [https://github.com/ichbinbetul/castle-of-the-words.git](https://github.com/ichbinbetul/castle-of-the-words.git)
cd castle-of-the-words

```

Install dependencies

```bash
npm install

```
Setup Environment Variables This project uses Firebase for authentication. You need to create a .env.local file in the root directory and add your Firebase configuration keys:

```bash

NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY_HERE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID

```

(Note: You can obtain these keys from your Firebase Console Project Settings.)


Run the development server

```bash

npm run dev

```

Open http://localhost:3000 to start the adventure.


---


## 🤝 Contributing

Contributions are welcome! If you'd like to add new languages, create new questions for your desired language, or design dungeon rooms:

1. Fork the Project

2. Create your Feature Branch (git checkout -b feature/NewPuzzle)

3. Commit your Changes (git commit -m 'Add French Language Support')

4. Push to the Branch (git push origin feature/NewPuzzle)

5. Open a Pull Request


---


## 📄 License
Distributed under the MIT License. See LICENSE for more information.


---


## 🌟 Show your support
Give a ⭐️ if you like this project!
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai'; 
import pg from 'pg'; 
const { Pool } = pg;
import bcrypt from 'bcrypt'; 
import jwt from 'jsonwebtoken'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Подключение к твоей базе данных (убедись, что DATABASE_URL есть в .env)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// ==========================================
// РОУТ РЕГИСТРАЦИИ
// ==========================================
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Заполните все поля" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await pool.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
            [email, hashedPassword]
        );
        
        res.json({ message: "Успешная регистрация!", user: newUser.rows[0] });
    } catch (err) {
        console.error("REGISTER ERROR:", err);
        res.status(500).json({ message: "Email уже зарегистрирован или ошибка БД" });
    }
});

// ==========================================
// РОУТ ЛОГИНА
// ==========================================
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Заполните все поля" });
        }

        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: "Пользователь не найден" });
        }
        
        const user = userResult.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: "Неверный пароль" });
        }
        
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.json({ message: "Вход выполнен!", token, userId: user.id });
    } catch (err) {
        console.error("LOGIN ERROR:", err);
        res.status(500).json({ message: "Ошибка сервера при входе" });
    }
});

// ==========================================
// ТВОЙ РОУТ ГЕНЕРАЦИИ ДИЕТЫ (ОСТАВЛЕН БЕЗ ИЗМЕНЕНИЙ)
// ==========================================
app.post('/', async (req, res) => { 
    try {
        console.log("Отримано запит:", req.body);
        const { age, height, weight, gender, bmr, protein, fat, carb, allergy, health, vitamins, language, goal, food } = req.body;

        // Проверка наличия ключа
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: "API Key не знайдено на сервері" });
        }

        // --- Формирование промпта (оставляем вашу логику) ---
        let systemInstruction = "";
        let userPrompt = "";

        if (language == 'uk') {
            systemInstruction = `
РОЛЬ ТА МЕТА:
Дій як клінічний дієтолог. Створи суворо розрахований план харчування на 7 днів на основі наведених нижче біометричних даних користувача та обмежень.

МОВНЕ ОБМЕЖЕННЯ:
ВЕСЬ ВИВІД МАЄ БУТИ ВИКЛЮЧНО УКРАЇНСЬКОЮ МОВОЮ.

КРИТИЧНІ ПРАВИЛА ВИВОДУ (СУВОРО ДОТРИМУВАТИСЬ):
1. ЖОДНИХ розмовних вставок, ЖОДНИХ привітань, ЖОДНИХ вступів (наприклад, "Звісно...", "Ось ваш план...").
2. НЕ повторювати вхідні дані користувача.
3. ПОЧИНАТИ НЕГАЙНО із заголовка "## День 1".
4. ЖОДНИХ медичних відмов від відповідальності в основному тексті.
5. Повернути ТІЛЬКИ структурований план харчування та розділ фінальних рекомендацій.
6. НЕ використовувати таблиці. Використовуй чіткий списковий формат із жирним шрифтом для кращої читабельності.

ЗМІННІ КОРИСТУВАЧА:
- Мета: ${goal || "підтримка ваги"}
- Вік: ${age} | Зріст: ${height}см | Вага: ${weight}кг | Стать: ${gender}
- Алергії (ОБОВ'ЯЗКОВО ВИКЛЮЧИТИ): ${allergy}
- Стан здоров'я: ${health}
- Продукти, яких слід уникати (ОБОВ'ЯЗКОВО ВИКЛЮЧИТИ): ${food}
- ДЕННІ ЦІЛІ (Допуск ±5%):
  - Калорії: ${bmr} ккал
  - Макронутрієнти: Білки ${protein}г | Жири ${fat}г | Вуглеводи ${carb}г
  - Мікронутрієнти: ${typeof vitamins === 'object' ? JSON.stringify(vitamins) : vitamins}

ФОРМАТ ВИВОДУ:
Використовуй наступну структуру Markdown точно для кожного дня:

## День 1
**Сніданок:** [Назва страви]
- Інгредієнти: [Список інгредієнтів з точною вагою в грамах]
- Поживна цінність: [X] ккал | Білки: [X]г | Жири: [X]г | Вуглеводи: [X]г | Вітаміни: [Ключові вітаміни]

**Обід:** [Назва страви]
- Інгредієнти: ...
- Поживна цінність: ...

**Вечеря:** [Назва страви]
- Інгредієнти: ...
- Поживна цінність: ...

**Перекус:** [Назва страви]
- Інгредієнти: ...
- Поживна цінність: ...

**Підсумок Дня 1:** Всього Ккал: [X] (Ціль: ${bmr}), Білки: [X]г, Жири: [X]г, Вуглеводи: [X]г.

[Повторити для Днів 2-7]

## Загальні Рекомендації
- **Гідратація:** ...
- **Заміни:** ...
- **Поради:** ...
`;
        } else {
            // Английская версия
            systemInstruction = `
ROLE & OBJECTIVE:
Act as a clinical nutritionist. Generate a strictly calculated 7-day meal plan based on the user's biometric data and constraints below.

LANGUAGE CONSTRAINT:
OUTPUT MUST BE STRICTLY IN ENGLISH.

CRITICAL OUTPUT RULES (STRICTLY ENFORCE):
1. NO conversational filler, NO greetings, NO introductions (e.g., "Sure...", "Here is...").
2. NO repetition of user inputs.
3. START IMMEDIATELY with the header "## Day 1".
4. NO medical disclaimers in the body text.
5. Return ONLY the structured meal plan and the final recommendations section.
6. DO NOT use tables. Use a clear list format with bold headers.

USER VARIABLES:
- Goal: ${goal || "maintenance"}
- Age: ${age} | Height: ${height}cm | Weight: ${weight}kg | Gender: ${gender}
- Allergies (MUST EXCLUDE): ${allergy}
- Health Conditions: ${health}
- Foods to Avoid (MUST EXCLUDE): ${food}
- DAILY TARGETS (Tolerance ±5%):
  - Calories: ${bmr} kcal
  - Macros: Protein ${protein}g | Fat ${fat}g | Carbs ${carb}g
  - Micronutrients: ${typeof vitamins === 'object' ? JSON.stringify(vitamins) : vitamins}

OUTPUT FORMAT:
Use the following Markdown structure exactly:

## Day 1
**Breakfast:** [Dish Name]
- Ingredients: [List of ingredients with precise weight in grams]
- Nutrition: [X] kcal | Protein: [X]g | Fat: [X]g | Carbs: [X]g | Vitamins: [Key Vitamins]

**Lunch:** [Dish Name]
- Ingredients: ...
- Nutrition: ...

**Dinner:** [Dish Name]
- Ingredients: ...
- Nutrition: ...

**Snack:** [Dish Name]
- Ingredients: ...
- Nutrition: ...

**Day 1 Summary:** Total Kcal: [X] (Target: ${bmr}), Protein: [X]g, Fat: [X]g, Carbs: [X]g.

[Repeat for Days 2-7]

## General Recommendations
- **Hydration:** ...
- **Substitutions:** ...
- **Tips:** ...
`;
        }

        console.log("Відправляємо запит до OpenAI...");

        // 3. Запрос к ChatGPT
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Или "gpt-3.5-turbo" (дешевле)
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7, // Креативность (0.7 - оптимально для диет)
        });

        // 4. Получение ответа
        const dietText = completion.choices[0].message.content;

        if (!dietText) {
            return res.status(500).json({ error: "Порожня відповідь від ШІ" });
        }

        res.json({ diet: dietText });
    } catch (err) {
        console.error("SERVER ERROR:", err);
        if (err.status === 429) return res.status(429).json({ error: "Ліміт запитів вичерпано." });
        res.status(500).json({ error: "Внутрішня помилка сервера" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущено на порту ${PORT}`);
});

/*import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/', async (req, res) => { 
    try {
        console.log("Отримано запит:", req.body);
        const { age, height, weight, gender, bmr, protein, fat, carb, allergy, health, vitamins, language, goal, food } = req.body;
        
        // --- ИЗМЕНЕНИЕ 1: Собираем ключи в массив ---
        const apiKeys = [
            process.env.GOOGLE_API_KEY_1, 
            process.env.GOOGLE_API_KEY_2,
            process.env.GOOGLE_API_KEY_3,
            process.env.GOOGLE_API_KEY_4,
            process.env.GOOGLE_API_KEY_5,
            process.env.GOOGLE_API_KEY_6,
            process.env.GOOGLE_API_KEY_7,
            process.env.GOOGLE_API_KEY_8,
            process.env.GOOGLE_API_KEY_9,
            process.env.GOOGLE_API_KEY_10
        ].filter(key => key); // Убираем пустые, если какой-то ключ не задан

        if (apiKeys.length === 0) {
            return res.status(500).json({ error: "GOOGLE_API_KEY не знайдено на сервері" });
        }

        let promptText = ``
        if (language == 'uk') {
            promptText = `
РОЛЬ ТА МЕТА:
Дій як клінічний дієтолог. Створи суворо розрахований план харчування на 7 днів на основі наведених нижче біометричних даних користувача та обмежень.

МОВНЕ ОБМЕЖЕННЯ:
ВЕСЬ ВИВІД МАЄ БУТИ ВИКЛЮЧНО УКРАЇНСЬКОЮ МОВОЮ.

КРИТИЧНІ ПРАВИЛА ВИВОДУ (СУВОРО ДОТРИМУВАТИСЬ):
1. ЖОДНИХ розмовних вставок, ЖОДНИХ привітань, ЖОДНИХ вступів (наприклад, "Звісно...", "Ось ваш план...").
2. НЕ повторювати вхідні дані користувача.
3. ПОЧИНАТИ НЕГАЙНО із заголовка "## День 1".
4. ЖОДНИХ медичних відмов від відповідальності в основному тексті.
5. Повернути ТІЛЬКИ структурований план харчування та розділ фінальних рекомендацій.
6. НЕ використовувати таблиці. Використовуй чіткий списковий формат із жирним шрифтом для кращої читабельності.

ЗМІННІ КОРИСТУВАЧА:
- Мета: ${goal || "підтримка ваги"}
- Вік: ${age} | Зріст: ${height}см | Вага: ${weight}кг | Стать: ${gender}
- Алергії (ОБОВ'ЯЗКОВО ВИКЛЮЧИТИ): ${allergy}
- Стан здоров'я: ${health}
- Продукти, яких слід уникати (ОБОВ'ЯЗКОВО ВИКЛЮЧИТИ): ${food}
- ДЕННІ ЦІЛІ (Допуск ±5%):
  - Калорії: ${bmr} ккал
  - Макронутрієнти: Білки ${protein}г | Жири ${fat}г | Вуглеводи ${carb}г
  - Мікронутрієнти: ${typeof vitamins === 'object' ? JSON.stringify(vitamins) : vitamins}

ФОРМАТ ВИВОДУ:
Використовуй наступну структуру Markdown точно для кожного дня:

## День 1
**Сніданок:** [Назва страви]
- Інгредієнти: [Список інгредієнтів з точною вагою в грамах]
- Поживна цінність: [X] ккал | Білки: [X]г | Жири: [X]г | Вуглеводи: [X]г | Вітаміни: [Ключові вітаміни]

**Обід:** [Назва страви]
- Інгредієнти: ...
- Поживна цінність: ...

**Вечеря:** [Назва страви]
- Інгредієнти: ...
- Поживна цінність: ...

**Перекус:** [Назва страви]
- Інгредієнти: ...
- Поживна цінність: ...

**Підсумок Дня 1:** Всього Ккал: [X] (Ціль: ${bmr}), Білки: [X]г, Жири: [X]г, Вуглеводи: [X]г.

[Повторити для Днів 2-7]

## Загальні Рекомендації
- **Гідратація:** ...
- **Заміни:** ...
- **Поради:** ...
`;
        } else if (language == 'en') {
            promptText = `
ROLE & OBJECTIVE:
Act as a clinical nutritionist. Generate a strictly calculated 7-day meal plan based on the user's biometric data and constraints below.

LANGUAGE CONSTRAINT:
OUTPUT MUST BE STRICTLY IN ENGLISH.

CRITICAL OUTPUT RULES (STRICTLY ENFORCE):
1. NO conversational filler, NO greetings, NO introductions (e.g., "Sure...", "Here is...").
2. NO repetition of user inputs.
3. START IMMEDIATELY with the header "## Day 1".
4. NO medical disclaimers in the body text.
5. Return ONLY the structured meal plan and the final recommendations section.
6. DO NOT use tables. Use a clear list format with bold headers.

USER VARIABLES:
- Goal: ${goal || "maintenance"}
- Age: ${age} | Height: ${height}cm | Weight: ${weight}kg | Gender: ${gender}
- Allergies (MUST EXCLUDE): ${allergy}
- Health Conditions: ${health}
- Foods to Avoid (MUST EXCLUDE): ${food}
- DAILY TARGETS (Tolerance ±5%):
  - Calories: ${bmr} kcal
  - Macros: Protein ${protein}g | Fat ${fat}g | Carbs ${carb}g
  - Micronutrients: ${typeof vitamins === 'object' ? JSON.stringify(vitamins) : vitamins}

OUTPUT FORMAT:
Use the following Markdown structure exactly:

## Day 1
**Breakfast:** [Dish Name]
- Ingredients: [List of ingredients with precise weight in grams]
- Nutrition: [X] kcal | Protein: [X]g | Fat: [X]g | Carbs: [X]g | Vitamins: [Key Vitamins]

**Lunch:** [Dish Name]
- Ingredients: ...
- Nutrition: ...

**Dinner:** [Dish Name]
- Ingredients: ...
- Nutrition: ...

**Snack:** [Dish Name]
- Ingredients: ...
- Nutrition: ...

**Day 1 Summary:** Total Kcal: [X] (Target: ${bmr}), Protein: [X]g, Fat: [X]g, Carbs: [X]g.

[Repeat for Days 2-7]

## General Recommendations
- **Hydration:** ...
- **Substitutions:** ...
- **Tips:** ...
`;
}
        let data;
        let success = false;
        let lastErrorStatus = 500;

        for (let i = 0; i < apiKeys.length; i++) {
            const currentKey = apiKeys[i];
            console.log(`Спроба запиту з ключем #${i + 1}...`);

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptText }] }]
                    })
                }
            );

            // Если статус 429 (Too Many Requests), пробуем следующий ключ
            if (response.status === 429) {
                console.warn(`Ключ #${i + 1} перевищив ліміт (429).`);
                lastErrorStatus = 429;
                continue; // Переходим к следующей итерации цикла (следующему ключу)
            }

            data = await response.json();

            if (!response.ok) {
                console.error(`Помилка з ключем #${i + 1}:`, data);
                if (response.status !== 429) break; 
            } else {
                success = true;
                break; // Успех! Выходим из цикла
            }
        }

        // --- ИЗМЕНЕНИЕ 3: Обработка результата после цикла ---
        if (!success) {
            if (lastErrorStatus === 429) {
                return res.status(429).json({ 
                    error: "Перевищено ліміт запитів на всіх ключах. Будь ласка, зачекайте хвилину." 
                });
            }
            return res.status(500).json({ error: "Помилка відповіді від Gemini (усі спроби вичерпано)." });
        }

        const dietText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!dietText) {
            return res.status(500).json({ error: "Порожня відповідь від ШІ" });
        }

        res.json({ diet: dietText });

    } catch (err) {
        console.error("SERVER ERROR:", err);
        res.status(500).json({ error: "Внутрішня помилка сервера" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущено на порту ${PORT}`);
});

app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Шифруем пароль перед сохранением
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Сохраняем в базу
        const newUser = await pool.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
            [email, hashedPassword]
        );
        
        res.json({ message: "Успешная регистрация!", user: newUser.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка регистрации (возможно email уже занят)" });
    }
});

// --- РОУТ 2: ЛОГИН ---
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: "Пользователь не найден" });
        }
        
        const user = userResult.rows[0];
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.status(401).json({ error: "Неверный пароль" });
        }
        
        // Создаем токен (используем тот самый JWT_SECRET)
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        res.json({ message: "Успешный вход!", token, userId: user.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка при входе" });
    }
});*/
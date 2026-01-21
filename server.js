import express from 'express';
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
                // Если ошибка не связана с лимитами (например, неверный запрос), нет смысла пробовать другой ключ
                // Но если вы хотите пробовать другой ключ при ЛЮБОЙ ошибке, уберите этот break
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

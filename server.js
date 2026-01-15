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
        const API_KEY = process.env.GOOGLE_API_KEY; 
        
        if (!API_KEY) {
            return res.status(500).json({ error: "GOOGLE_API_KEY не знайдено на сервері" });
        }
        let promptText = ``
        if (language == 'uk') {
            promptText = `
            НЕ пиши привітання та вступний текст! Не дублюй мої добові норми (калорії, білки тощо). Надай лише(!) сам план харчування, починаючи з першого дня.

            Вхідні дані користувача:
            Ціль: ${goal || "підтримання"}
            Вік: ${age}
            Зріст: ${height} см
            Вага: ${weight} кг
            Стать: ${gender}
            Алергії: ${allergy}
            Продукти, які потрібно виключити: ${food}
            Стан здоров'я: ${health}
            Добові норми:
            Калорії: ${bmr} ккал
            Білки: ${protein} г
            Жири: ${fat} г
            Вуглеводи: ${carb} г
            Вітаміни та мікроелементи на день: ${typeof vitamins === 'object' ? JSON.stringify(vitamins) : vitamins}

            Завдання:
            Ти є професійним дієтологом і нутриціологом. Твоє завдання — створити персональні рекомендації з харчування на основі наданих даних людини.
            На основі цих даних склади повноцінний раціон харчування на 7 днів.

            Кожен день повинен містити сніданок, обід, вечерю та за потреби 1–2 перекуси.

            Для кожної страви обов’язково вказуй:
            Назву страви.
            Склад інгредієнтів із точними вагами.
            Калорійність.
            Кількість білків, жирів і вуглеводів.
            Основні вітаміни та мінерали, які містяться у страві.

            Сумарні показники за день повинні максимально відповідати заданим нормам калорій, білків, жирів і вуглеводів. Раціон має покривати добову потребу у вітамінах без перевищення безпечних доз.

            Строго виключи всі продукти, які не можна вживати через алергії, захворювання або травми.

            Раціон повинен бути реалістичним, складатися зі звичайних продуктів, не містити екзотичних або надто дорогих інгредієнтів, бути збалансованим і різноманітним.

            Формат відповіді:
            Окремий блок для кожного дня з позначенням День 1 – День 7.
            Чітка структура або таблиця для кожного дня.
            В кінці кожного дня надай підсумок за день: калорії, білки, жири, вуглеводи.
            Після всього раціону додай короткі загальні рекомендації щодо водного режиму та можливих замін продуктів.

            Не надавай медичних порад, лише рекомендації з харчування.
            Якщо якихось даних не вистачає, явно вкажи зроблені припущення.`;
        } else if (language == 'en') {
            promptText = `
            ROLE & OBJECTIVE:
            Act as a clinical nutritionist. Generate a strictly calculated 7-day meal plan based on the user's biometric data and constraints below.

            LANGUAGE CONSTRAINT:
            The entire output must be strictly in **ENGLISH**. Do not use Ukrainian or any other language.

            CRITICAL OUTPUT RULES (STRICTLY ENFORCE):
            1. NO conversational filler, NO greetings, NO introductions (e.g., "Sure, here is...").
            2. NO explanatory preambles, "Important assumptions," or context notes before the plan.
            3. NO repetition of the provided user inputs.
            4. START IMMEDIATELY with the header "## Day 1".
            5. NO medical disclaimers in the body text.
            6. Return ONLY the structured meal plan and the final recommendations section.

            USER VARIABLES:
            - Goal: ${goal || "maintenance"}
            - Age: ${age} | Height: ${height}cm | Weight: ${weight}kg | Gender: ${gender}
            - Allergies (MUST EXCLUDE): ${allergy}
            - Health Conditions: ${health}
            - Foods to Avoid (MUST EXCLUDE): ${food}
            - DAILY TARGETS (Tolerance ±5%)
            - Calories: ${bmr} kcal
            - Protein: ${protein}g | Fat: ${fat}g | Carbs: ${carb}g
            - Micronutrients: ${typeof vitamins === 'object' ? JSON.stringify(vitamins) : vitamins}

            CONTENT REQUIREMENTS:
            1. Structure: 7 Days. Each day includes Breakfast, Lunch, Dinner, Snack(s).
            2. Meals: Must be realistic, affordable, and balanced.
            3. Data per Meal: Name, Ingredients with precise weight (g), Calories, P/F/C (g), Key Vitamins.
            4. Daily Totals: At the end of each day, provide a summary table comparing the day's total vs. the target.

            OUTPUT FORMAT:
            Use the following Markdown structure exactly:

            ## Day 1
            | Meal | Dish | Ingredients (g) | Kcal | P (g) | F (g) | C (g) | Vitamins |
            |---|---|---|---|---|---|---|---|
            | Breakfast | ... | ... | ... | ... | ... | ... | ... |
            | Lunch | ... | ... | ... | ... | ... | ... | ... |
            | ... | ... | ... | ... | ... | ... | ... | ... |

            Day 1 Summary: Total Kcal: [X] (Target: ${bmr}), P: [X]g, F: [X]g, C: [X]g.

            [Repeat for Days 2-7]

            ## General Recommendations
            - Hydration: ...
            - Substitutions: ...
            `;
        }

   const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini error:", data);
            
            if (response.status === 429) {
                return res.status(429).json({ 
                    error: "Перевищено ліміт запитів до ШІ. Будь ласка, зачекайте хвилину і спробуйте знову." 
                });
            }

            return res.status(500).json({ error: "Помилка відповіді від Gemini: " + (data.error?.message || response.statusText) });
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
});*/


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
            process.env.GOOGLE_API_KEY_2
        ].filter(key => key); // Убираем пустые, если какой-то ключ не задан

        if (apiKeys.length === 0) {
            return res.status(500).json({ error: "API ключи не найдены на сервере" });
        }

        let promptText = ``
        if (language == 'uk') {
            promptText = `
ROLE & OBJECTIVE:
Дій як клінічний дієтолог. Створи суворо розрахований план харчування на 7 днів на основі біометричних даних користувача та обмежень, наведених нижче.

LANGUAGE CONSTRAINT:
Весь вивід має бути виключно **УКРАЇНСЬКОЮ** мовою.

CRITICAL OUTPUT RULES (STRICTLY ENFORCE):
1. ЖОДНИХ розмовних заповнювачів, ЖОДНИХ привітань, ЖОДНИХ вступів (наприклад, "Звісно, ось...").
2. ЖОДНИХ пояснювальних преамбул, "Важливих припущень" або контекстних приміток перед планом.
3. НЕ повторювати надані дані користувача.
4. ПОЧИНАТИ НЕГАЙНО із заголовка "## День 1".
5. ЖОДНИХ медичних відмов від відповідальності в основному тексті.
6. Повернути ТІЛЬКИ структурований план харчування та розділ фінальних рекомендацій.

USER VARIABLES:
- Мета: ${goal || "підтримка ваги"}
- Вік: ${age} | Зріст: ${height}см | Вага: ${weight}кг | Стать: ${gender}
- Алергії (ОБОВ'ЯЗКОВО ВИКЛЮЧИТИ): ${allergy}
- Стан здоров'я: ${health}
- Продукти, яких слід уникати (ОБОВ'ЯЗКОВО ВИКЛЮЧИТИ): ${food}
- ДЕННІ ЦІЛІ (Допуск ±5%)
- Калорії: ${bmr} ккал
- Білки: ${protein}г | Жири: ${fat}г | Вуглеводи: ${carb}г
- Мікронутрієнти: ${typeof vitamins === 'object' ? JSON.stringify(vitamins) : vitamins}

CONTENT REQUIREMENTS:
1. Структура: 7 днів. Кожен день включає Сніданок, Обід, Вечерю, Перекус(и).
2. Страви: Мають бути реалістичними, доступними та збалансованими.
3. Дані про страву: Назва, Інгредієнти з точною вагою (г), Калорії, Б/Ж/В (г), Основні вітаміни.
4. Денні підсумки: В кінці кожного дня надати зведену таблицю порівняння загальних показників дня з цільовими.

OUTPUT FORMAT:
Використовуй наступну структуру Markdown точно:

## День 1
| Прийом їжі | Страва | Інгредієнти (г) | Ккал | Б (г) | Ж (г) | В (г) | Вітаміни |
|---|---|---|---|---|---|---|---|
| Сніданок | ... | ... | ... | ... | ... | ... | ... |
| Обід | ... | ... | ... | ... | ... | ... | ... |
| ... | ... | ... | ... | ... | ... | ... | ... |

Підсумок Дня 1: Всього Ккал: [X] (Ціль: ${bmr}), Б: [X]г, Ж: [X]г, В: [X]г.

[Повторити для Днів 2-7]

## Загальні Рекомендації
- Гідратація: ...
- Заміни: ...
`;
        } else if (language == 'en') {
            promptText = `
ROLE & OBJECTIVE:
Act as a clinical nutritionist. Generate a strictly calculated 7-day meal plan based on the user's biometric data and constraints below.

LANGUAGE CONSTRAINT:
The entire output must be strictly in **ENGLISH**. Do not use Ukrainian or any other language.

CRITICAL OUTPUT RULES (STRICTLY ENFORCE):
1. NO conversational filler, NO greetings, NO introductions (e.g., "Sure, here is...").
2. NO explanatory preambles, "Important assumptions," or context notes before the plan.
3. NO repetition of the provided user inputs.
4. START IMMEDIATELY with the header "## Day 1".
5. NO medical disclaimers in the body text.
6. Return ONLY the structured meal plan and the final recommendations section.

USER VARIABLES:
- Goal: ${goal || "maintenance"}
- Age: ${age} | Height: ${height}cm | Weight: ${weight}kg | Gender: ${gender}
- Allergies (MUST EXCLUDE): ${allergy}
- Health Conditions: ${health}
- Foods to Avoid (MUST EXCLUDE): ${food}
- DAILY TARGETS (Tolerance ±5%)
- Calories: ${bmr} kcal
- Protein: ${protein}g | Fat: ${fat}g | Carbs: ${carb}g
- Micronutrients: ${typeof vitamins === 'object' ? JSON.stringify(vitamins) : vitamins}

CONTENT REQUIREMENTS:
1. Structure: 7 Days. Each day includes Breakfast, Lunch, Dinner, Snack(s).
2. Meals: Must be realistic, affordable, and balanced.
3. Data per Meal: Name, Ingredients with precise weight (g), Calories, P/F/C (g), Key Vitamins.
4. Daily Totals: At the end of each day, provide a summary table comparing the day's total vs. the target.

OUTPUT FORMAT:
Use the following Markdown structure exactly:

## Day 1
| Meal | Dish | Ingredients (g) | Kcal | P (g) | F (g) | C (g) | Vitamins |
|---|---|---|---|---|---|---|---|
| Breakfast | ... | ... | ... | ... | ... | ... | ... |
| Lunch | ... | ... | ... | ... | ... | ... | ... |
| ... | ... | ... | ... | ... | ... | ... | ... |

Day 1 Summary: Total Kcal: [X] (Target: ${bmr}), P: [X]g, F: [X]g, C: [X]g.

[Repeat for Days 2-7]

## General Recommendations
- Hydration: ...
- Substitutions: ...
`;
        }

        // --- ИЗМЕНЕНИЕ 2: Логика перебора ключей ---
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

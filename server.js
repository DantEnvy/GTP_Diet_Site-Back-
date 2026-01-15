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
        const { age, height, weight, gender, bmr, protein, fat, carb, allergy, health, vitamins, language, goal } = req.body;
        const API_KEY = process.env.GOOGLE_API_KEY; 
        
        if (!API_KEY) {
            return res.status(500).json({ error: "GOOGLE_API_KEY не знайдено на сервері" });
        }
        const promptText = ``
        if (language == 'ua') {
            promptText = `
            НЕ пиши привітання та вступний текст! Не дублюй мої добові норми (калорії, білки тощо). Надай лише(!) сам план харчування, починаючи з першого дня.

            Вхідні дані користувача:
            Ціль: ${goal || "підтримання"}
            Вік: ${age}
            Зріст: ${height} см
            Вага: ${weight} кг
            Стать: ${gender}
            Алергії: ${allergy}
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
            promptText = `DO NOT write a greeting or introductory text! Do not duplicate my daily requirements (calories, protein, etc.). Provide only(!) the meal plan itself, starting from the first day.
            Goal: ${goal || "підтримання"}
            Age: ${age}
            Height: ${height} cm
            Weight: ${weight} kg
            Gender: ${gender}
            Allergies: ${allergy}
            Health: ${health}
            Daily allowance:
            Calories: ${bmr} kcal
            Protein: ${protein} g
            Fat: ${fat} g
            Carbohydrates: ${carb} g
            Vitamins and trace elements per day: ${typeof vitamins === 'object' ? JSON.stringify(vitamins) : vitamins}

            Task:
            You are a professional dietitian and nutritionist. Your task is to create personalized nutrition recommendations based on the provided personal data. 
            Based on this data, compile a complete 7-day meal plan.

            Each day must include breakfast, lunch, dinner, and 1–2 snacks if necessary.

            For each dish, you must specify:
            1. Name of the dish.
            2. List of ingredients with exact weights.
            3. Caloric content.
            4. Amount of proteins, fats, and carbohydrates.
            5. Key vitamins and minerals contained in the dish.

            Total daily metrics must closely match the specified targets for calories, proteins, fats, and carbohydrates. The diet must cover daily vitamin requirements without exceeding safe limits.

            Strictly exclude all foods that cannot be consumed due to allergies, medical conditions, or injuries.

            The meal plan must be realistic, consist of common foods, avoid exotic or overly expensive ingredients, and be balanced and varied.

            Response Format:
            - A separate block for each day labeled Day 1 – Day 7.
            - A clear structure or table for each day.
            - At the end of each day, provide a daily summary: calories, proteins, fats, carbohydrates.
            - After the entire meal plan, include brief general recommendations regarding water intake and possible food substitutions.

            Do not provide medical advice, only nutritional recommendations.
            If any data is missing, explicitly state the assumptions made.
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
});

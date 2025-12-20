import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// import fetch from 'node-fetch'; // Якщо виникає помилка "fetch is not defined" на старих нодах, розкоментуйте це (попередньо зробивши npm install node-fetch)
// Але на Node 18+ fetch вбудований.

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/', async (req, res) => { 
    try {
        console.log("Отримано запит:", req.body);
        const { bmr, protein, fat, carb, allergy, health } = req.body;
        const API_KEY = process.env.GOOGLE_API_KEY; 
        
        if (!API_KEY) {
            return res.status(500).json({ error: "GOOGLE_API_KEY не знайдено на сервері" });
        }

        const promptText = `
Ти професійний дієтолог. Створи детальний план харчування (меню) на один день українською мовою.

Дані клієнта:
- Добова норма калорій: ${bmr} ккал
- Білки: ${protein} г
- Жири: ${fat} г
- Вуглеводи: ${carb} г
- Алергії: ${allergy || "немає"}
- Особливості здоров'я: ${health || "немає"}

Завдання:
1. Сніданок, Обід, Вечеря + 1–2 перекуси
2. Вказати вагу продуктів (г)
3. Структурований Markdown
4. Врахувати алергії
        `;

        // ВИКОРИСТОВУЄМО GEMINI 1.5 FLASH (стабільніша)
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

        // Обробка помилок від Google
        if (!response.ok) {
            console.error("Gemini error:", data);
            
            // Якщо ліміт вичерпано (код 429)
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
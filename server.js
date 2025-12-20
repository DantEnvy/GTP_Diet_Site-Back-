import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // ✔ правильне читання JSON

const PORT = process.env.PORT || 3000;

// --- ГОЛОВНИЙ МАРШРУТ ---
app.post("/api/diet", async (req, res) => {
    try {
        console.log("Отримано запит:", req.body);

        const { bmr, protein, fat, carb, allergy, health } = req.body;

        if (!process.env.GOOGLE_API_KEY) {
            return res.status(500).json({
                error: "GOOGLE_API_KEY не знайдено"
            });
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

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
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
            return res.status(500).json({
                error: "Помилка відповіді від Gemini"
            });
        }

        const dietText =
            data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!dietText) {
            return res.status(500).json({
                error: "Порожня відповідь від ШІ"
            });
        }

        res.json({ diet: dietText });

    } catch (err) {
        console.error("SERVER ERROR:", err);
        res.status(500).json({
            error: "Внутрішня помилка сервера"
        });
    }
});

// --- ЗАПУСК ---
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущено на порту ${PORT}`);
});
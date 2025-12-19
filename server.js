import express from "express";
import OpenAI from "openai";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Разрешаем CORS и JSON
app.use(cors());
app.use(express.json());

// Настройка OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Убедитесь, что ключ есть в файле .env
});

// POST запрос для генерации диеты
app.post("/api/diet", async (req, res) => {
  try {
    // 1. Получаем данные от фронтенда
    const { bmr, carb, fat, protein, allergy, health } = req.body;

    console.log("Отримані дані:", req.body);

    // 2. Формируем запрос (Prompt) для GPT
    const prompt = `
      Створи детальний план харчування на один день українською мовою.
      
      Дані користувача:
      - Добова норма калорій: ${bmr} ккал.
      - Білки: ${protein} г.
      - Жири: ${fat} г.
      - Вуглеводи: ${carb} г.
      - Алергії: ${allergy ? allergy : "немає"}.
      - Стан здоров'я/обмеження: ${health ? health : "не вказано"}.

      Будь ласка, розпиши:
      1. Сніданок, Обід, Вечеря та перекуси.
      2. Приблизну вагу порцій.
      3. Враховуй вказані алергії та стан здоров'я.
      4. Формат відповіді має бути гарним та структурованим текстом.
    `;

    // 3. Отправляем запрос в OpenAI
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo", // Или "gpt-4", если доступно
    });

    // 4. Получаем текст ответа
    const botResponse = completion.choices[0].message.content;

    // 5. Отправляем ответ на фронтенд
    res.status(200).json({ diet: botResponse });

  } catch (error) {
    console.error("Помилка OpenAI:", error);
    res.status(500).json({ 
      diet: "Вибачте, сталася помилка при генерації дієти. Перевірте ключ API або спробуйте пізніше." 
    });
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
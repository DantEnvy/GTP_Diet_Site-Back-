/* import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/api/diet", async (req, res) => {
  try {
    const { age, height, weight, allergy, health, goal } = req.body;

    const prompt = `
Зроби персональні рекомендації, враховуючи дані користувача:
Вік: ${age}
Зріст: ${height}
Вага: ${weight}
Алергія: ${allergy}
Нюанси зі здоров'ям: ${health}
Ціль: ${goal}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    });

    res.json({ diet: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.listen(3000, () => {
  console.log("Сервер запущен на http://localhost:3000");
}); */

import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/api/diet", async (req, res) => {
  try {
    const { allergy, health, carb, bmr, squirrels, fat } = req.body;

    const prompt = `
Зроби персональні рекомендації, враховуючи дані користувача:
Каллорії: ${bmr}
Білки: ${squirrels}
Жири: ${fat}
Вуглеводи: ${carb}
Алергії: ${allergy}
Нюанси зі здоров'ям: ${health}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    });

    res.json({ diet: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Помилка сервера" });
  }
});

app.listen(3000, () => {
  console.log("Сервер запущено на http://localhost:3000");
});


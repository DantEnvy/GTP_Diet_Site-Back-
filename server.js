import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.send("Backend is working 🚀");
});

app.post("/api/diet", async (req, res) => {
  try {
    const { allergy, health, carb, bmr, squirrels, fat } = req.body;

    const prompt = `
Зроби персональні рекомендації:
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});

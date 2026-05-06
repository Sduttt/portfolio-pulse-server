import { GoogleGenAI } from "@google/genai";
import { Groq } from "groq-sdk/client.js";

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
const groq = new Groq(process.env.GROQ_API_KEY);

const SENTIMENT_VALUES = [
    "Rational",
    "Emotional",
    "FOMO",
    "Panic",
    "Greed",
    "Fear",
];

export const analyzeTrade = async (trade) => {
    const tradeDetails = `Trade details:
        - Asset: ${trade.assetName} (${trade.ticker})
        - Type: ${trade.tradeType}
        - Quantity: ${trade.quantity}
        - Price per unit: ${trade.pricePerUnit} ${trade.currency}
        - Trade date: ${trade.tradeDate}
        - Reason given by trader: "${trade.reason || "No reason provided"}"`;

    const prompt = `You are a financial behavior analyst. Analyze the following trade and respond ONLY with a valid JSON object — no markdown, no explanation, no extra text.

    \n\n${tradeDetails}\n\n

    Your response must be exactly this JSON structure:
    {
        "sentiment": "<one of: Rational, Emotional, FOMO, Panic, Greed, Fear>",
        "rationalityScore": <integer between 0 and 100>,
        "feedback": "<honest behavioral feedback in 150 words or fewer>"
    }`;

    const isUsingOllama = process.env.USING_OLLAMA === "true";
    const isUsingGemini = process.env.USING_GEMINI === "true";
    console.log("isUsingOllama:", isUsingOllama);

    let aiResult;

    let text;

    if (!isUsingOllama) {
        if (isUsingGemini) {
            aiResult = await genAI.models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt,
                maxTokens: 1000,
            });
            if (!aiResult || !aiResult.response || !aiResult.response.text) {
                throw new Error("Invalid response from AI model");
            }
            text = aiResult.response.text().trim();
        } else {
            console.log("using Groq");
            const groqResult = await groq.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a financial behavior analyst. Respond ONLY with valid JSON. Your response MUST perfectly match this exact structure: 
                        {
                            "sentiment": "<one of: Rational, Emotional, FOMO, Panic, Greed, Fear>",
                            "rationalityScore": <integer between 0 and 100>,
                            "feedback": "<honest behavioral feedback in 150 words or fewer>"
                        }`,
                    },
                    {
                        role: "user",
                        content: `Analyze the following trade and respond ONLY with a valid JSON object — no markdown, no explanation, no extra text.

                        \n\n${tradeDetails}\n\n`,
                    },
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.3,
                max_completion_tokens: 1024,
                top_p: 1,
                response_format: { type: "json_object" },
            });
            console.log("Groq result: ", groqResult);
            text = groqResult.choices[0].message.content;
            console.log(text);
        }
    } else {
        const ollamaResponse = await fetch(process.env.OLLAMA_HOST, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: process.env.OLLAMA_MODEL,
                prompt: prompt,
                stream: false,
            }),
        });

        if (!ollamaResponse.ok) {
            throw new Error(
                `Ollama request failed with status ${ollamaResponse.status}`,
            );
        }

        const ollamaData = await ollamaResponse.json();

        if (!ollamaData || !ollamaData.response) {
            throw new Error("Invalid response from AI model");
        }

        text = ollamaData.response.trim();
    }

    // Strip markdown code fences if model wraps the JSON
    const cleaned = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

    const parsed = JSON.parse(cleaned);

    if (!SENTIMENT_VALUES.includes(parsed.sentiment)) {
        throw new Error(
            `Invalid sentiment value returned by AI: ${parsed.sentiment}`,
        );
    }

    if (
        typeof parsed.rationalityScore !== "number" ||
        parsed.rationalityScore < 0 ||
        parsed.rationalityScore > 100
    ) {
        throw new Error(
            `Invalid rationalityScore returned by AI: ${parsed.rationalityScore}`,
        );
    }

    return {
        sentiment: parsed.sentiment,
        rationalityScore: Math.round(parsed.rationalityScore),
        feedback: parsed.feedback,
    };
};
